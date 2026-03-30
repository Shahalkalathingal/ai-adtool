import type { DirectorPlan, DirectorScene } from "@/lib/types/director-plan";
import {
  DIRECTOR_PLAN_FALLBACK_STILL,
  ensureDirectorPlanSceneImages,
} from "@/lib/types/director-plan";
import { isLikelyProductImage } from "@/lib/services/firecrawl-scrape";
import { fetchGoogleImageUrls, isSerpImageSearchConfigured } from "@/lib/services/serpapi-google-images";

export function isLowResOrGenericImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (
    /thumb|thumbnail|avatars?|favicon|1x1|spacer|pixel|sprite|emoji|icon_/.test(
      u,
    )
  ) {
    return true;
  }
  if (/[?&](w|width)=\d{1,2}\b/.test(u)) return true;
  if (/[?&]h=\d{1,2}\b/.test(u)) return true;
  return false;
}

export function countHighQualityImageUrls(urls: string[]): number {
  return urls.filter(
    (u) =>
      typeof u === "string" &&
      isLikelyProductImage(u) &&
      !isLowResOrGenericImageUrl(u),
  ).length;
}

export function shouldSerpEnrichImageCandidates(urls: string[]): boolean {
  const uniq = [...new Set(urls.filter(Boolean).map((u) => u.trim()))];
  if (uniq.length < 5) return true;
  if (countHighQualityImageUrls(uniq) < 5) return true;
  return false;
}

export function buildBrandNicheImageQuery(
  companyName: string | undefined,
  pageTitle: string | undefined,
): string {
  const name =
    (companyName?.trim() || pageTitle?.split(/[|–—-]/)[0]?.trim() || "brand")
      .replace(/\s+/g, " ")
      .slice(0, 80) || "brand";
  return `${name} interior products store lifestyle photography`;
}

const VO_STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "your",
  "our",
  "we",
  "you",
  "is",
  "are",
  "with",
  "this",
  "that",
  "it",
  "at",
  "be",
  "as",
  "by",
  "from",
  "get",
  "has",
  "have",
  "just",
  "more",
  "now",
  "out",
  "us",
]);

export function buildVoiceoverKeywordImageQuery(
  scenes: DirectorScene[],
): string {
  const text = scenes
    .map((s) => s.voiceover || "")
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z]/g, ""))
    .filter((w) => w.length > 3 && !VO_STOP.has(w));
  const uniq = [...new Set(words)].slice(0, 7);
  if (uniq.length === 0) return "premium retail lifestyle photography";
  return `${uniq.join(" ")} high quality professional photography`;
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of list) {
    const k = u.trim().split("?")[0].toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(u.trim());
  }
  return out;
}

export function mergeSerpUrlsIntoPlan(
  plan: DirectorPlan,
  extraUrls: string[],
): DirectorPlan {
  const merged = dedupe([
    ...plan.productImageUrls,
    ...extraUrls.filter((u) => isLikelyProductImage(u)),
  ]);
  let productImageUrls =
    merged.length > 0 ? merged : [DIRECTOR_PLAN_FALLBACK_STILL];
  while (productImageUrls.length < 8) {
    productImageUrls = [...productImageUrls, DIRECTOR_PLAN_FALLBACK_STILL];
  }
  return { ...plan, productImageUrls: productImageUrls.slice(0, 12) };
}

/**
 * Expands page candidates before Gemini when Firecrawl is sparse or low-res.
 */
export async function enrichPageIntelCandidatesWithSerp(
  candidates: string[],
  companyName: string | undefined,
  pageTitle: string | undefined,
): Promise<string[]> {
  if (!isSerpImageSearchConfigured()) return candidates;
  if (!shouldSerpEnrichImageCandidates(candidates)) return candidates;
  try {
    const q = buildBrandNicheImageQuery(companyName, pageTitle);
    const found = await fetchGoogleImageUrls(q, 14);
    return dedupe([...candidates, ...found]);
  } catch {
    return candidates;
  }
}

/**
 * After Gemini: second Serp pass from VO keywords if the plan pool is still weak, then hard-assign scene stills.
 */
export async function finalizeDirectorPlanImages(
  plan: DirectorPlan,
): Promise<DirectorPlan> {
  let next = plan;

  if (isSerpImageSearchConfigured()) {
    const pool = next.productImageUrls;
    const weak =
      shouldSerpEnrichImageCandidates(pool) ||
      countHighQualityImageUrls(pool) < 5;
    if (weak) {
      try {
        const q = buildVoiceoverKeywordImageQuery(next.scenes);
        const found = await fetchGoogleImageUrls(q, 14);
        next = mergeSerpUrlsIntoPlan(next, found);
      } catch {
        /* keep plan */
      }
    }
  }

  return ensureDirectorPlanSceneImages(next);
}
