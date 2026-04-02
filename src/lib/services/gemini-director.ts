import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  directorPlanSchema,
  normalizeDirectorPlan,
  type DirectorPlan,
} from "@/lib/types/director-plan";
import type { ScrapedPageIntel } from "@/lib/services/firecrawl-scrape";
import { getGeminiModelId } from "@/lib/services/gemini-model";
import { logGeminiRequest } from "@/lib/services/gemini-request-log";

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
- productImageUrls: MUST include 8 to 10 DISTINCT https URLs of sharp product/lifestyle stills suitable for 16:9. The "Image URL candidates" list is ordered by the server: **high-resolution, category-appropriate stock (often Unsplash) may appear first when on-page grabs are weak** — prefer those over tiny, blurry, or irrelevant blog/nav images even if they came from the site. Use on-page URLs only when they look like real product or brand photography (not icons, thumbs, or random editorial). Do NOT invent domains. If fewer than 8 distinct winners exist, repeat the best URLs to reach 8 (still list 8–10 strings).
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

/**
 * Gemini — turns scraped brand context into a frame-ready DirectorPlan.
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
  const model = genAI.getGenerativeModel({
    model: getGeminiModelId(),
    generationConfig: {
      temperature: 0.55,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  logGeminiRequest("director-plan", {
    model: getGeminiModelId(),
  });
  const result = await model.generateContent(buildPrompt(input));
  const text = result.response.text();
  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    // Include only a tiny snippet to keep payloads manageable.
    const snippet = text.trim().slice(0, 240).replace(/\s+/g, " ");
    throw new Error(
      `Gemini returned non-JSON. Try again or shorten the page. Snippet: ${snippet}`,
    );
  }

  const parsed = JSON.parse(jsonText) as unknown;

  const checked = directorPlanSchema.safeParse(parsed);
  if (!checked.success) {
    throw new Error(
      `Director JSON failed validation: ${checked.error.flatten().formErrors.join("; ")}`,
    );
  }

  return normalizeDirectorPlan(checked.data);
}
