import { z } from "zod";

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
  scenes: z.array(directorSceneSchema).min(6).max(8),
  musicMood: z.string(),
});

export type DirectorScene = z.infer<typeof directorSceneSchema>;
export type DirectorPlan = z.infer<typeof directorPlanSchema>;
export type ScrapedBrand = z.infer<typeof scrapedBrandSchema>;

const FALLBACK_PRODUCT_STILL =
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1280&h=720&fit=crop&q=80";

/** Normalize scene lengths; ensure every scene can resolve an image URL. */
export function normalizeDirectorPlan(plan: DirectorPlan): DirectorPlan {
  const sum = plan.scenes.reduce((a, s) => a + s.durationSec, 0);
  const target = plan.totalDurationSec;
  let scenes = plan.scenes;
  if (Math.abs(sum - target) >= 0.25) {
    const scale = target / sum;
    const scaled = plan.scenes.map((s) => ({
      ...s,
      durationSec: Math.max(2, s.durationSec * scale),
    }));
    const sum2 = scaled.reduce((a, s) => a + s.durationSec, 0);
    const drift = target - sum2;
    if (scaled.length > 0) {
      scaled[scaled.length - 1] = {
        ...scaled[scaled.length - 1],
        durationSec: Math.max(
          2,
          scaled[scaled.length - 1].durationSec + drift,
        ),
      };
    }
    scenes = scaled;
  }

  let urls =
    plan.productImageUrls?.filter((u) => typeof u === "string" && u.trim().length > 8) ??
    [];
  if (urls.length === 0) {
    urls = [FALLBACK_PRODUCT_STILL];
  }
  while (urls.length < 8) {
    urls = [...urls, ...urls];
  }
  urls = urls.slice(0, 12);

  return {
    ...plan,
    scenes,
    totalDurationSec: target,
    productImageUrls: urls,
  };
}
