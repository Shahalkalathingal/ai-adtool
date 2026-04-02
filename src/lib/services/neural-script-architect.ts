import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DirectorPlan } from "@/lib/types/director-plan";
import type { ScrapedPageIntel } from "@/lib/services/firecrawl-scrape";
import { getGeminiModelId } from "@/lib/services/gemini-model";
import { logGeminiRequest } from "@/lib/services/gemini-request-log";
import {
  MASTER_VOICEOVER_MAX_WORDS,
  MASTER_VOICEOVER_MIN_WORDS,
  capWordCountWithCleanEnding,
  countMasterScriptWords,
  normalizeMasterScriptWhitespace,
} from "@/lib/voiceover/master-script-policy";

export {
  MASTER_VOICEOVER_MAX_WORDS,
  MASTER_VOICEOVER_MIN_WORDS,
  countMasterScriptWords,
  normalizeMasterScriptWhitespace,
} from "@/lib/voiceover/master-script-policy";

/** Niche selector → industry tone for the Neural Script Architect. */
export const AD_NICHE_IDS = [
  "general",
  "legal",
  "real_estate",
  "saas_tech",
  "ecommerce_product",
  "healthcare",
  "food_hospitality",
  "finance",
  "home_services",
  "fitness",
  "education",
] as const;

export type AdNicheId = (typeof AD_NICHE_IDS)[number];

/** UI labels for the niche selector (values must stay in sync with `AD_NICHE_IDS`). */
export const AD_NICHE_OPTIONS: { id: AdNicheId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "legal", label: "Legal" },
  { id: "real_estate", label: "Real estate" },
  { id: "saas_tech", label: "SaaS / Tech" },
  { id: "ecommerce_product", label: "E-commerce / Product" },
  { id: "healthcare", label: "Healthcare" },
  { id: "food_hospitality", label: "Food & hospitality" },
  { id: "finance", label: "Finance" },
  { id: "home_services", label: "Home services" },
  { id: "fitness", label: "Fitness" },
  { id: "education", label: "Education" },
];

const DEFAULT_NICHE: AdNicheId = "general";

export function sanitizeAdNicheId(raw: string | undefined | null): AdNicheId {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (AD_NICHE_IDS.includes(s as AdNicheId)) return s as AdNicheId;
  return DEFAULT_NICHE;
}

function nicheToneBlock(niche: AdNicheId): string {
  const map: Record<AdNicheId, string> = {
    general:
      "Confident, clear, conversion-focused. Sound human and specific—never generic.",
    legal:
      "Tone: trustworthy, authoritative, serious. Emphasize credentials, clarity, and protection—no hype, no slang.",
    real_estate:
      "Tone: aspiring, luxury, inviting. Paint lifestyle and location emotion; polished but warm.",
    saas_tech:
      "Tone: modern, fast-paced, problem-solving. Lead with outcomes and speed to value; crisp sentences.",
    ecommerce_product:
      "Tone: sensory, benefit-led, urgent-but-credible. Focus on what the buyer feels and gains; strong product stakes.",
    healthcare:
      "Tone: calm, competent, compassionate. Reassuring and precise; avoid fear-mongering or miraculous claims.",
    food_hospitality:
      "Tone: crave-worthy, warm, experiential. Vivid sensory words; hospitable energy.",
    finance:
      "Tone: steady, expert, security-minded. Clarity over jargon; instill confidence without overpromising.",
    home_services:
      "Tone: reliable, neighborly, no-nonsense. Stress speed, workmanship, and trust.",
    fitness:
      "Tone: energetic, motivating, results-driven. Action verbs; keep it disciplined, not cheesy.",
    education:
      "Tone: encouraging, clear, outcome-focused. Emphasize transformation and clarity of path.",
  };
  return map[niche] ?? map.general;
}

function stripLeadingTrailingQuotes(text: string): string {
  let t = text.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("\u201c") && t.endsWith("\u201d"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** Infer CTA flavor from URL path/host (no network). */
export function describeUrlForCta(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    const path = `${u.pathname} ${u.search}`.toLowerCase();
    const blob = `${host} ${path}`;
    const hints: string[] = [];

    if (/(law|legal|attorney|lawyer|injury|counsel|esq)/i.test(blob)) {
      hints.push(
        "Legal-style site: CTA may favor phone or consultation; if web, use the firm/brand name in speech, not the URL.",
      );
    }
    if (/(shop|store|cart|checkout|product|collection|buy)/i.test(blob)) {
      hints.push(
        "Commerce signals: prefer shop/online framing using the brand name in speech—not reading the hostname—when both phone and site exist.",
      );
    }
    if (/(app|saas|software|platform|cloud|api|login|signup|trial|demo)/i.test(blob)) {
      hints.push("Tech/SaaS signals: trial, demo, or “see it live” language fits if natural.");
    }
    if (/(clinic|med|health|dental|care|wellness)/i.test(blob)) {
      hints.push("Healthcare signals: reassuring booking or call framing.");
    }
    if (/(finance|bank|invest|mortgage|loan|wealth)/i.test(blob)) {
      hints.push("Finance signals: steady, clear next step—call or secure visit.");
    }
    if (/(restaurant|menu|cafe|food|dining)/i.test(blob)) {
      hints.push(
        "Hospitality signals: reserve, order, or visit using the brand name in speech—not the raw URL.",
      );
    }

    return hints.length > 0
      ? hints.join(" ")
      : "General brand URL: if both phone and website are known, pick the stronger action; for web, say the brand name aloud, not the domain string.";
  } catch {
    return "URL parse failed—use phone or brand name for web CTA as provided.";
  }
}

function sceneBenefitHints(plan: DirectorPlan): string {
  return plan.scenes
    .filter((_, i) => i < plan.scenes.length - 1)
    .slice(0, 6)
    .map(
      (s) =>
        `- Headline: ${s.headline}${s.subcopy ? ` · Sub: ${s.subcopy}` : ""}`,
    )
    .join("\n");
}

const MIN_WORDS = MASTER_VOICEOVER_MIN_WORDS;
const MAX_WORDS = MASTER_VOICEOVER_MAX_WORDS;

const ARCHITECT_SYSTEM = `You are the Neural Script Architect for high-performing 16:9 video ads (~32–37.5s / ~35s spoken at natural pace).

CONSTRAINT ENGINE (mandatory):
- Output exactly one continuous voiceover paragraph in plain text (no labels, no bullets, no stage directions, no quotes).
- Word count MUST be between 75 and 90 words inclusive. Count before you answer.

STRUCTURE (Hook–Body–CTA), woven naturally in speech:
- Opening (≈ first 0–5s of read): one stop-scrolling hook tied to the viewer’s niche/problem.
- Middle (≈ next ~20s of read): three distinct benefits or proof points grounded ONLY in provided source material and scene hints—not invented facts.
- Close (≈ final ~10s): one strong CTA. Prefer the phone number OR steering people to the brand online—follow CTA PRIORITY rules in the user message. When the site is the CTA, name the company/brand only (e.g. "head to Acme" or "shop Northline today")—never read the URL, hostname, or "dot com" aloud. Mention at most one phone; do not spell out domains.

STYLE:
- Use vivid “power words” and concrete outcomes.
- Ban empty corporate fluff (e.g. never “we provide excellent services”—instead “get the [specific outcome] you need”).
- Vary sentence length; sound like a professional VO read, not a brochure.

GRAMMAR (non-negotiable):
- Every sentence must be a complete, grammatical thought for speech. Never end on a stranded article, conjunction, or possessive (e.g. forbidden: “…of your.” “…what you.” “…comforts from.” “…enhance your.”)—always finish the clause or object (e.g. “…enhance your day.” “…every aspect of your life.”).`;

const LENGTH_RECOVERY_SYSTEM = `You fix video ad voiceovers that are too short or too long.
Output ONLY one continuous paragraph in plain English: no labels, no bullets, no quotes.
The paragraph MUST be between 75 and 90 words inclusive—count carefully before answering.
Ground every claim in the facts and page excerpt provided; do not invent awards or guarantees.
Fix any broken tail-off phrases: every sentence must end complete—never “…of your.” or “…what you.” without a following object or predicate.`;

async function generateRaw(
  genAI: GoogleGenerativeAI,
  userPayload: string,
  systemBlock: string = ARCHITECT_SYSTEM,
  logPhase = "master-voiceover",
): Promise<string> {
  logGeminiRequest(logPhase, { model: getGeminiModelId() });
  const model = genAI.getGenerativeModel({
    model: getGeminiModelId(),
    generationConfig: {
      temperature: 0.62,
      maxOutputTokens: 2048,
    },
  });
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemBlock}\n\n---\n${userPayload}` }],
      },
    ],
  });
  return result.response.text();
}

/** Join normalized per-scene voiceovers (short) — used as seed when architect fails. */
export function joinPlanSceneVoiceovers(plan: DirectorPlan): string {
  return normalizeMasterScriptWhitespace(
    plan.scenes
      .map((s) => (typeof s.voiceover === "string" ? s.voiceover.trim() : ""))
      .filter(Boolean)
      .join(" "),
  );
}

function buildLengthRecoveryPayload(input: {
  seed: string;
  url: string;
  title?: string;
  markdownExcerpt: string;
  pageIntel: ScrapedPageIntel;
  plan: DirectorPlan;
  niche: AdNicheId;
}): string {
  const wc = countMasterScriptWords(input.seed);
  const base = buildUserPayload({
    url: input.url,
    title: input.title,
    markdownExcerpt: input.markdownExcerpt,
    pageIntel: input.pageIntel,
    plan: input.plan,
    niche: input.niche,
  });
  return `${base}

LENGTH FIX:
The draft below is only ${wc} words but MUST become ${MIN_WORDS}-${MAX_WORDS} words in ONE flowing paragraph.
Expand with concrete detail from PAGE EXCERPT and scene hints. Keep hook–three benefits–CTA. Do not repeat the draft verbatim if it is thin—substantially develop it.

DRAFT:
${input.seed}

Output ONLY the final single paragraph (${MIN_WORDS}-${MAX_WORDS} words).`;
}

function deterministicFallbackMasterScript(input: {
  plan: DirectorPlan;
  pageIntel: ScrapedPageIntel;
  url: string;
}): string {
  const sb = input.plan.scrapedBrand ?? {};
  const company =
    sb.companyName ?? input.pageIntel.companyName ?? input.plan.adTitle;
  const phone = sb.phoneNumber ?? input.pageIntel.phoneNumber ?? "";
  const dom =
    sb.primaryDomain?.replace(/^https?:\/\//, "") ??
    input.pageIntel.primaryDomain ??
    "";
  const parts: string[] = [];
  parts.push(
    `If you have been looking for a better way to work with ${company}, this is your moment to see what actually changes outcomes for customers like you.`,
  );
  for (const s of input.plan.scenes) {
    if (typeof s.headline === "string" && s.headline.trim())
      parts.push(s.headline.trim());
    if (typeof s.subcopy === "string" && s.subcopy.trim())
      parts.push(s.subcopy.trim());
  }
  if (input.plan.brand.tagline?.trim()) parts.push(input.plan.brand.tagline.trim());
  let text = normalizeMasterScriptWhitespace(parts.join(" "));
  if (phone) {
    text = normalizeMasterScriptWhitespace(
      `${text} When you are ready, call ${phone} and a real person will help you take the next step.`,
    );
  } else if (dom) {
    text = normalizeMasterScriptWhitespace(
      `${text} Visit ${company} online today to learn more and move forward with confidence.`,
    );
  } else {
    text = normalizeMasterScriptWhitespace(
      `${text} Reach out today and take the next step with ${company}.`,
    );
  }
  let guard = 0;
  while (countMasterScriptWords(text) < MIN_WORDS && guard < 8) {
    text = normalizeMasterScriptWhitespace(
      `${text} ${company} makes it straightforward to get answers fast and move ahead without guesswork.`,
    );
    guard += 1;
  }
  if (countMasterScriptWords(text) > MAX_WORDS) {
    text = capWordCountWithCleanEnding(text, MAX_WORDS, 20);
  }
  return text;
}

function buildUserPayload(input: {
  url: string;
  title?: string;
  markdownExcerpt: string;
  pageIntel: ScrapedPageIntel;
  plan: DirectorPlan;
  niche: AdNicheId;
}): string {
  const sb = input.plan.scrapedBrand ?? {};
  const company =
    sb.companyName ?? input.pageIntel.companyName ?? input.plan.adTitle;
  const phone =
    sb.phoneNumber ?? input.pageIntel.phoneNumber ?? "(not provided)";
  const domain =
    sb.primaryDomain?.replace(/^https?:\/\//, "") ??
    input.pageIntel.primaryDomain ??
    "(not provided)";
  const websiteLine =
    domain !== "(not provided)" ? `https://${domain.replace(/\/+$/, "")}` : "(not provided)";

  const ctaAnalysis = describeUrlForCta(input.url);
  const ctaPriority =
    phone !== "(not provided)" && websiteLine !== "(not provided)"
      ? `Both phone and site exist. ${ctaAnalysis} Choose ONE primary CTA plus optional short secondary only if it fits word budget. In spoken copy say the brand (“${company}”) or “online” / “their site”—never read ${websiteLine} or any hostname aloud.`
      : phone !== "(not provided)"
        ? `Primary CTA: call ${phone}.`
        : websiteLine !== "(not provided)"
          ? `Primary CTA: send people to ${company} online—do not speak the URL ${websiteLine} or “dot com”.`
          : `No phone or domain—end with a generic “learn more” style line without inventing numbers or URLs.`;

  return `INDUSTRY TONE (apply throughout):
${nicheToneBlock(input.niche)}

BRAND FACTS:
- Company / ad title (say this name in VO for web CTAs): ${company}
- Source URL (context only—do NOT read aloud): ${input.url}
- Title tag: ${input.title ?? "(none)"}
- Phone (use verbatim if used): ${phone}
- Website (for your reasoning only—spoken line must use "${company}", not this URL): ${websiteLine}

CTA PRIORITY:
${ctaPriority}

SCENE / VALUE HINTS (turn three of these into core benefits; do not contradict source):
${sceneBenefitHints(input.plan)}

PAGE EXCERPT (ground claims here; do not invent awards or guarantees):
${input.markdownExcerpt}

Output ONLY the voiceover paragraph (${MIN_WORDS}-${MAX_WORDS} words).`;
}

function buildPolishPayload(
  previous: string,
  wordCount: number,
  phone: string,
  domainLine: string,
): string {
  return `Your previous script was ${wordCount} words. It MUST be ${MIN_WORDS}-${MAX_WORDS} words.

Rewrite it: keep the same hook intent, the same three benefits (may tighten wording), and the same CTA intent (phone: ${phone}; web: refer to the brand by name only—do not speak ${domainLine} aloud). Do not add new factual claims.

Previous script:
${previous}

Output ONLY the rewritten single paragraph (${MIN_WORDS}-${MAX_WORDS} words).`;
}

type ArchitectRunInput = {
  url: string;
  title?: string;
  markdownExcerpt: string;
  pageIntel: ScrapedPageIntel;
  plan: DirectorPlan;
  niche: AdNicheId;
};

async function runLengthRecoveryPasses(
  genAI: GoogleGenerativeAI,
  seed: string,
  ctx: ArchitectRunInput,
  maxPasses: number,
): Promise<string> {
  let text = normalizeMasterScriptWhitespace(seed);
  for (let i = 0; i < maxPasses; i++) {
    if (countMasterScriptWords(text) >= MIN_WORDS) break;
    text = stripLeadingTrailingQuotes(
      normalizeMasterScriptWhitespace(
        await generateRaw(
          genAI,
          buildLengthRecoveryPayload({
            seed: text,
            url: ctx.url,
            title: ctx.title,
            markdownExcerpt: ctx.markdownExcerpt,
            pageIntel: ctx.pageIntel,
            plan: ctx.plan,
            niche: ctx.niche,
          }),
          LENGTH_RECOVERY_SYSTEM,
          "master-voiceover-length-recovery",
        ),
      ),
    );
  }
  return text;
}

/**
 * Ensures a master script is 75–90 words (Gemini expansion + deterministic fallback).
 * Use when the architect fails or returns joined short scene VOs.
 */
export async function ensureMasterVoiceoverWordBudget(input: {
  url: string;
  title?: string;
  markdown: string;
  pageIntel: ScrapedPageIntel;
  plan: DirectorPlan;
  nicheId?: string | null;
  seedScript: string;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  const niche = sanitizeAdNicheId(input.nicheId);
  const markdownExcerpt = input.markdown.slice(0, 10_000);
  const ctx: ArchitectRunInput = {
    url: input.url,
    title: input.title,
    markdownExcerpt,
    pageIntel: input.pageIntel,
    plan: input.plan,
    niche,
  };

  let text = normalizeMasterScriptWhitespace(input.seedScript);
  if (countMasterScriptWords(text) >= MIN_WORDS && countMasterScriptWords(text) <= MAX_WORDS) {
    return text;
  }

  if (key?.trim()) {
    const genAI = new GoogleGenerativeAI(key);
    text = await runLengthRecoveryPasses(genAI, text, ctx, 5);
    if (countMasterScriptWords(text) > MAX_WORDS) {
      text = capWordCountWithCleanEnding(text, MAX_WORDS, 20);
    }
  }

  if (countMasterScriptWords(text) < MIN_WORDS) {
    text = deterministicFallbackMasterScript({
      plan: input.plan,
      pageIntel: input.pageIntel,
      url: input.url,
    });
  }

  if (countMasterScriptWords(text) > MAX_WORDS) {
    text = capWordCountWithCleanEnding(text, MAX_WORDS, 20);
  }

  return text;
}

/**
 * Produces a single master voiceover block for ~35s ads; validates length and re-polishes if needed.
 */
export async function runNeuralScriptArchitect(input: {
  url: string;
  title?: string;
  markdown: string;
  pageIntel: ScrapedPageIntel;
  plan: DirectorPlan;
  nicheId?: string | null;
}): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }

  const niche = sanitizeAdNicheId(input.nicheId);
  const markdownExcerpt = input.markdown.slice(0, 10_000);
  const genAI = new GoogleGenerativeAI(key);
  const ctx: ArchitectRunInput = {
    url: input.url,
    title: input.title,
    markdownExcerpt,
    pageIntel: input.pageIntel,
    plan: input.plan,
    niche,
  };

  let text = stripLeadingTrailingQuotes(
    normalizeMasterScriptWhitespace(
      await generateRaw(
        genAI,
        buildUserPayload({
          url: input.url,
          title: input.title,
          markdownExcerpt,
          pageIntel: input.pageIntel,
          plan: input.plan,
          niche,
        }),
        ARCHITECT_SYSTEM,
        "master-voiceover-initial",
      ),
    ),
  );

  let words = countMasterScriptWords(text);
  const sb = input.plan.scrapedBrand ?? {};
  const phone =
    sb.phoneNumber ?? input.pageIntel.phoneNumber ?? "not provided";
  const dom =
    sb.primaryDomain?.replace(/^https?:\/\//, "") ??
    input.pageIntel.primaryDomain ??
    "not provided";
  const domainLine =
    dom !== "not provided" ? `https://${dom.replace(/\/+$/, "")}` : "not provided";

  const maxPolishPasses = 3;
  for (let pass = 0; pass < maxPolishPasses; pass++) {
    if (words >= MIN_WORDS && words <= MAX_WORDS) break;
    if (words < MIN_WORDS) {
      text = stripLeadingTrailingQuotes(
        normalizeMasterScriptWhitespace(
          await generateRaw(
            genAI,
            buildLengthRecoveryPayload({ ...ctx, seed: text }),
            LENGTH_RECOVERY_SYSTEM,
            "master-voiceover-expand",
          ),
        ),
      );
    } else {
      text = stripLeadingTrailingQuotes(
        normalizeMasterScriptWhitespace(
          await generateRaw(
            genAI,
            buildPolishPayload(text, words, phone, domainLine),
            ARCHITECT_SYSTEM,
            "master-voiceover-trim",
          ),
        ),
      );
    }
    words = countMasterScriptWords(text);
  }

  if (words > MAX_WORDS) {
    text = capWordCountWithCleanEnding(text, MAX_WORDS, 20);
    words = countMasterScriptWords(text);
  }

  if (words < MIN_WORDS) {
    text = await runLengthRecoveryPasses(genAI, text, ctx, 5);
    words = countMasterScriptWords(text);
  }

  if (words > MAX_WORDS) {
    text = capWordCountWithCleanEnding(text, MAX_WORDS, 20);
    words = countMasterScriptWords(text);
  }

  if (words < MIN_WORDS) {
    text = deterministicFallbackMasterScript({
      plan: input.plan,
      pageIntel: input.pageIntel,
      url: input.url,
    });
  }

  return text;
}
