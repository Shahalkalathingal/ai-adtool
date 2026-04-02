import { z } from "zod";
import {
  SCENE_VOICEOVER_MAX_WORDS,
  capWordCountWithCleanEnding,
} from "@/lib/voiceover/master-script-policy";

/** Structured brand fields — Gemini must prefer these over noisy markdown. */
export const scrapedBrandSchema = z.object({
  companyName: z.string().optional(),
  cleanAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  logoUrl: z.string().optional(),
  primaryDomain: z.string().optional(),
});

/** Single beat in a 30s+ ad — Gemini Director output. */
export const directorSceneSchema = z.object({
  index: z.number().int().min(0),
  title: z.string(),
  durationSec: z.number().positive(),
  headline: z.string(),
  subcopy: z.string().optional(),
  voiceover: z.string(),
  visualTreatment: z.string(),
  /** Optional per-scene image; otherwise productImageUrls are cycled. */
  imageUrl: z.string().optional(),
});

export const directorPlanSchema = z.object({
  adTitle: z.string(),
  totalDurationSec: z.number().min(30),
  scrapedBrand: scrapedBrandSchema.optional(),
  /** 8–10 high-quality product/lifestyle image URLs (https), from the page or markdown. */
  productImageUrls: z.array(z.string()).min(1).max(12),
  brand: z.object({
    primaryColor: z.string(),
    secondaryColor: z.string(),
    fontHeading: z.string(),
    fontBody: z.string(),
    tagline: z.string().optional(),
  }),
  scenes: z.array(directorSceneSchema).min(5).max(10),
  musicMood: z.string(),
});

export type DirectorScene = z.infer<typeof directorSceneSchema>;
export type DirectorPlan = z.infer<typeof directorPlanSchema>;
export type ScrapedBrand = z.infer<typeof scrapedBrandSchema>;

/** Single still used when no scraper/Serp image is available (sync with composition placeholder). */
export const DIRECTOR_PLAN_FALLBACK_STILL =
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1280&h=720&fit=crop&q=80";

function formatVoiceoverSingleSentence(text: string): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
  if (!cleaned) return "";

  // One spoken sentence per scene; cap length without stranded "… of your."
  const firstSentence =
    cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  return capWordCountWithCleanEnding(
    firstSentence,
    SCENE_VOICEOVER_MAX_WORDS,
    8,
  );
}

function coerceToSevenScenes(plan: DirectorPlan): DirectorScene[] {
  const scenes = plan.scenes;
  const domain =
    plan.scrapedBrand?.primaryDomain?.replace(/^https?:\/\//, "") ||
    "yourdomain.com";

  const buildCtaScene = (base?: DirectorScene): DirectorScene => ({
    ...(base ?? {
      index: 6,
      title: "Final call",
      visualTreatment: "brand lockup + CTA",
      imageUrl: undefined,
      subcopy: "Limited-time offer",
    }),
    index: 6,
    title: base?.title || "Final call",
    headline: `Visit ${domain} today`,
    voiceover:
      base?.voiceover ||
      `For this and more, visit ${domain} today and act now.`,
    durationSec: 5,
  });

  if (scenes.length === 7) {
    const normalized = scenes.map((s, i) => ({ ...s, index: i }));
    normalized[6] = buildCtaScene(normalized[6]);
    return normalized;
  }
  if (scenes.length > 7) {
    const firstSix = scenes.slice(0, 6).map((s, i) => ({ ...s, index: i }));
    const end = buildCtaScene(scenes[scenes.length - 1]);
    return [...firstSix, end];
  }
  const out = [...scenes].map((s, i) => ({ ...s, index: i }));
  while (out.length < 6) {
    const seed = out[out.length - 1] ?? scenes[0];
    out.push({
      ...seed,
      index: out.length,
      title: `Scene ${out.length + 1}`,
      headline: seed?.headline || "New scene",
      voiceover: seed?.voiceover || "Continue the story with confidence.",
      durationSec: 5,
    });
  }
  out.push(buildCtaScene());
  return out;
}

/** Normalize scene lengths; ensure every scene can resolve an image URL. */
export function normalizeDirectorPlan(plan: DirectorPlan): DirectorPlan {
  const SCENE_SEC = 5;
  const scenes = coerceToSevenScenes(plan).map((s) => ({
    ...s,
    durationSec: SCENE_SEC,
    voiceover: formatVoiceoverSingleSentence(s.voiceover),
  }));

  let urls =
    plan.productImageUrls?.filter((u) => typeof u === "string" && u.trim().length > 8) ??
    [];
  if (urls.length === 0) {
    urls = [DIRECTOR_PLAN_FALLBACK_STILL];
  }
  while (urls.length < 8) {
    urls = [...urls, ...urls];
  }
  urls = urls.slice(0, 12);

  return {
    ...plan,
    scenes,
    totalDurationSec: scenes.length * SCENE_SEC,
    productImageUrls: urls,
  };
}

function dedupeHttpsUrls(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const u = raw.trim();
    if (!u || !/^https:\/\//i.test(u) || u.includes(" ")) continue;
    const k = u.split("?")[0]?.toLowerCase() ?? u.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(u);
  }
  return out;
}

function isPlausibleSceneImageUrl(u: string): boolean {
  const s = u.trim();
  return (
    /^https:\/\//i.test(s) &&
    s.length > 16 &&
    !s.includes(" ") &&
    !/\.svg(\?|$)/i.test(s)
  );
}

/**
 * Picks a cycling still for every scene and expands `productImageUrls` so export never uses a blank visual.
 */
export function ensureDirectorPlanSceneImages(plan: DirectorPlan): DirectorPlan {
  const poolIn = dedupeHttpsUrls(plan.productImageUrls);
  const safePool =
    poolIn.length > 0 ? poolIn : [DIRECTOR_PLAN_FALLBACK_STILL];

  const scenes = plan.scenes.map((s, i) => {
    const u = s.imageUrl?.trim();
    if (u && isPlausibleSceneImageUrl(u)) return s;
    return { ...s, imageUrl: safePool[i % safePool.length] };
  });

  const merged = dedupeHttpsUrls([
    ...safePool,
    ...scenes.map((s) => s.imageUrl).filter((x): x is string => Boolean(x)),
  ]);
  let productImageUrls = merged;
  let i = 0;
  while (productImageUrls.length < 8) {
    productImageUrls = [
      ...productImageUrls,
      safePool[i % safePool.length] ?? DIRECTOR_PLAN_FALLBACK_STILL,
    ];
    i += 1;
  }
  productImageUrls = productImageUrls.slice(0, 12);

  return { ...plan, scenes, productImageUrls };
}
