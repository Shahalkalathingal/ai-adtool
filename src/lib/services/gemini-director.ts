import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ZodError } from "zod";
import {
  directorPlanSchema,
  normalizeDirectorPlan,
  type DirectorPlan,
} from "@/lib/types/director-plan";
import type { ScrapedPageIntel } from "@/lib/services/firecrawl-scrape";
import { getGeminiModelId } from "@/lib/services/gemini-model";
import { logGeminiRequest } from "@/lib/services/gemini-request-log";

/** Lower than legacy 0.55 — fewer malformed JSON / schema misses; repair pass handles the rest. */
const DIRECTOR_TEMP_PRIMARY = 0.42;
const DIRECTOR_TEMP_REPAIR = 0.22;
const API_RETRY_DELAY_MS = 700;
const MAX_API_RETRIES = 2;
const REPAIR_JSON_MAX_CHARS = 20_000;

function buildPrompt(input: {
  url: string;
  markdown: string;
  title?: string;
  pageIntel: ScrapedPageIntel;
}): string {
  const brandBlock = [
    input.pageIntel.companyName
      ? `Suggested companyName: ${input.pageIntel.companyName}`
      : null,
    input.pageIntel.cleanAddress
      ? `Suggested cleanAddress (single line, no markdown): ${input.pageIntel.cleanAddress}`
      : null,
    input.pageIntel.phoneNumber
      ? `Suggested phoneNumber: ${input.pageIntel.phoneNumber}`
      : null,
    input.pageIntel.logoUrl
      ? `Suggested logoUrl (https): ${input.pageIntel.logoUrl}`
      : null,
    input.pageIntel.primaryDomain
      ? `Site primaryDomain (hostname only): ${input.pageIntel.primaryDomain}`
      : null,
    input.pageIntel.productImageCandidates.length
      ? `Image URL candidates from page (prefer these for productImageUrls): ${input.pageIntel.productImageCandidates.slice(0, 14).join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const brandContext = [
    input.title ? `Page title: ${input.title}` : null,
    `Source URL: ${input.url}`,
    "--- STRUCTURED HINTS ---",
    brandBlock || "(no hints)",
    "--- MARKDOWN (truncated) ---",
    input.markdown.slice(0, 22_000),
  ]
    .filter(Boolean)
    .join("\n");

  const autoSignals =
    `${input.pageIntel.companyName ?? ""} ${input.title ?? ""} ${input.url}`.toLowerCase();
  const automotiveVertical =
    /\b(cadillac|chevrolet|chevy|ford|lincoln|toyota|lexus|dealership|dealer|automotive|motors\b|bmw|mercedes|audi|inventory|new vehicles|used cars|pre-?owned)\b/.test(
      autoSignals,
    );
  const automotiveImageRule = automotiveVertical
    ? `
- AUTOMOTIVE / VEHICLE RETAILER (detected from brand or URL): productImageUrls and any scene imageUrl must show vehicles, dealership/showroom, or car-lifestyle imagery appropriate to this seller. Do NOT use athletic footwear, gym, or unrelated fashion/ecommerce hero shots.`
    : "";

  return `You are a senior performance marketing director. Output ONLY valid JSON.

RULES:
- Return a single JSON object (no markdown fences, no backticks).
- Do not wrap it in any text (no "Sure" / no explanations).
- Use double quotes for ALL JSON strings.
- No trailing commas.

Goal: design a 16:9 (landscape) video ad of at least 30 seconds total, with confident pacing.

Strict rules:
- totalDurationSec must be 35.
- exactly 7 scenes; each scene durationSec must be 5.
- scene index 6 (the LAST scene) is the end screen CTA scene, with ad-style direct response copy (e.g. urgency + clear next step + act now).
- last scene headline and voiceover must include a strong call-to-action. Headlines may imply the website; voiceover is SPOKEN—use the brand or company name for online CTAs, not a raw URL or hostname.
- voiceover for EACH scene must be exactly ONE sentence (no line breaks, no paragraph), designed to fit ~5 seconds at normal speech speed.
- Each voiceover sentence MUST be grammatically complete for TTS. Never end mid-phrase on words like "your", "you", "from", "the", "what", "of" without finishing the thought (forbidden: "...every aspect of your." "...what you." "...comforts from." — use a full object or predicate, e.g. "...every aspect of your routine.").
- SPOKEN COPY (every scene voiceover): never say full URLs, paths, "www", or TLDs like "dot com"—say the natural brand name (e.g. "Amazon" not "Amazon.com"; "Nike" not "nike.com"). Phone numbers may be spoken verbatim if included.
- keep it punchy and high-CTR friendly; last scene voiceover should drive action using the brand name (and phone if relevant), not reading the domain string.
- 16:9 framing — headlines are lower-third safe; visuals are product/lifestyle.
- scrapedBrand must contain ONLY these fields when known from hints (no markdown, no random URLs in address):
  companyName, cleanAddress (one line street/city/state/zip), phoneNumber (formatted), logoUrl (https image), primaryDomain (hostname only, no path).
- productImageUrls: MUST include 8 to 10 DISTINCT https URLs of sharp product/lifestyle stills suitable for 16:9. The "Image URL candidates" list is ordered by the server: **high-resolution, category-appropriate stock (often Unsplash) may appear first when on-page grabs are weak** — prefer those over tiny, blurry, or irrelevant blog/nav images even if they came from the site. Use on-page URLs only when they look like real product or brand photography (not icons, thumbs, or random editorial). Do NOT invent domains. If fewer than 8 distinct winners exist, repeat the best URLs to reach 8 (still list 8–10 strings).${automotiveImageRule}
- Each scene may set imageUrl to pin a specific still, or omit to cycle productImageUrls by scene index.

JSON shape (strict field names):
{
  "adTitle": string,
  "totalDurationSec": number,
  "scrapedBrand": {
    "companyName"?: string,
    "cleanAddress"?: string,
    "phoneNumber"?: string,
    "logoUrl"?: string,
    "primaryDomain"?: string
  },
  "productImageUrls": string[],
  "brand": {
    "primaryColor": "#RRGGBB",
    "secondaryColor": "#RRGGBB",
    "fontHeading": string,
    "fontBody": string,
    "tagline"?: string
  },
  "scenes": [
    {
      "index": number,
      "title": string,
      "durationSec": number,
      "headline": string,
      "subcopy"?: string,
      "voiceover": string,
      "visualTreatment": string,
      "imageUrl"?: string
    }
  ],
  "musicMood": string
}

Brand / page context:
${brandContext}`;
}

function extractJsonObject(text: string): string | null {
  const t = text.trim();
  if (!t) return null;

  // Remove code fences if the model wraps JSON in ```json ... ```
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced?.[1]?.trim() ?? t;

  try {
    // If it's already valid, return as-is.
    JSON.parse(candidate);
    return candidate;
  } catch {
    // fallthrough
  }

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const obj = candidate.slice(start, end + 1).trim();
    try {
      JSON.parse(obj);
      return obj;
    } catch {
      return null;
    }
  }
  return null;
}

function formatZodIssues(err: ZodError): string {
  return err.issues
    .map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

function buildRepairPrompt(invalidJson: string, zodIssues: string): string {
  return `You output JSON that failed schema validation. Output ONLY a single fixed JSON object (no markdown, no prose, no code fences). Use double quotes for all strings. No trailing commas.

Validation errors to fix:
${zodIssues}

Hard requirements (must all be true):
- totalDurationSec must be 35
- exactly 7 scenes; each scene must have durationSec 5 and index 0 through 6 in order
- productImageUrls: array of 8–10 strings, each a plausible https image URL
- brand.primaryColor and brand.secondaryColor as #RRGGBB hex strings
- Every scene: title, headline, voiceover, visualTreatment (strings); voiceover = one complete spoken sentence
- musicMood: string

Preserve the ad concept and copy where possible; fix structure and invalid fields only.

Invalid JSON to repair (may be truncated — keep fields consistent):
${invalidJson}`;
}

type ValidateOutcome =
  | { ok: true; plan: DirectorPlan }
  | {
      ok: false;
      reason: "no_json";
      snippet: string;
    }
  | { ok: false; reason: "zod"; data: unknown; error: ZodError };

function validateDirectorResponse(text: string): ValidateOutcome {
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    const snippet = text.trim().slice(0, 240).replace(/\s+/g, " ");
    return { ok: false, reason: "no_json", snippet };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    const snippet = text.trim().slice(0, 240).replace(/\s+/g, " ");
    return { ok: false, reason: "no_json", snippet };
  }
  const checked = directorPlanSchema.safeParse(parsed);
  if (!checked.success) {
    return { ok: false, reason: "zod", data: parsed, error: checked.error };
  }
  return { ok: true, plan: normalizeDirectorPlan(checked.data) };
}

async function generateDirectorRaw(
  genAI: GoogleGenerativeAI,
  prompt: string,
  logLabel: string,
  temperature: number,
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: getGeminiModelId(),
    generationConfig: {
      temperature,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_API_RETRIES; attempt++) {
    try {
      logGeminiRequest(logLabel, { model: getGeminiModelId() });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_API_RETRIES - 1) {
        await new Promise((r) =>
          setTimeout(r, API_RETRY_DELAY_MS * (attempt + 1)),
        );
      }
    }
  }
  const message =
    lastErr instanceof Error ? lastErr.message : String(lastErr ?? "unknown");
  throw new Error(`Gemini request failed after retries: ${message}`);
}

/**
 * Gemini — turns scraped brand context into a frame-ready DirectorPlan.
 * Uses retries + a repair pass to cut flaky JSON / schema failures.
 */
export async function runGeminiDirector(input: {
  url: string;
  markdown: string;
  title?: string;
  pageIntel: ScrapedPageIntel;
}): Promise<DirectorPlan> {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }

  const genAI = new GoogleGenerativeAI(key);
  const primaryPrompt = buildPrompt(input);

  const text1 = await generateDirectorRaw(
    genAI,
    primaryPrompt,
    "director-plan",
    DIRECTOR_TEMP_PRIMARY,
  );
  const v1 = validateDirectorResponse(text1);
  if (v1.ok) return v1.plan;

  let v2: ValidateOutcome | null = null;
  if (v1.reason === "zod") {
    const repairPrompt = buildRepairPrompt(
      JSON.stringify(v1.data).slice(0, REPAIR_JSON_MAX_CHARS),
      formatZodIssues(v1.error),
    );
    const text2 = await generateDirectorRaw(
      genAI,
      repairPrompt,
      "director-plan-repair",
      DIRECTOR_TEMP_REPAIR,
    );
    v2 = validateDirectorResponse(text2);
    if (v2.ok) return v2.plan;
  }

  const text3 = await generateDirectorRaw(
    genAI,
    primaryPrompt,
    "director-plan-retry",
    DIRECTOR_TEMP_PRIMARY,
  );
  const v3 = validateDirectorResponse(text3);
  if (v3.ok) return v3.plan;

  throw new Error(buildDirectorFailureMessage(v1, v2, v3));
}

function buildDirectorFailureMessage(
  first: ValidateOutcome,
  second: ValidateOutcome | null,
  last: ValidateOutcome,
): string {
  const bits: string[] = [
    "Director could not produce a valid plan after retries.",
  ];
  if (!first.ok) {
    if (first.reason === "no_json") {
      bits.push(`First: non-JSON. Snippet: ${first.snippet}`);
    } else {
      bits.push(`First: ${formatZodIssues(first.error)}`);
    }
  }
  if (second && !second.ok) {
    if (second.reason === "no_json") {
      bits.push(`Repair: non-JSON. Snippet: ${second.snippet}`);
    } else {
      bits.push(`Repair: ${formatZodIssues(second.error)}`);
    }
  }
  if (!last.ok) {
    if (last.reason === "no_json") {
      bits.push(`Final: non-JSON. Snippet: ${last.snippet}`);
    } else {
      bits.push(`Final: ${formatZodIssues(last.error)}`);
    }
  }
  return bits.join(" ");
}
