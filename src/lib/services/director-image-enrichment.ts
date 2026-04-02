import type { DirectorPlan, DirectorScene } from "@/lib/types/director-plan";
import {
  DIRECTOR_PLAN_FALLBACK_STILL,
  ensureDirectorPlanSceneImages,
} from "@/lib/types/director-plan";
import {
  isLowResOrGenericImageUrl,
  isProblematicImageUrlForAds,
  nicheStockPathKey,
} from "@/lib/images/image-url-heuristics";
import {
  getNicheSerpBoostQueries,
  getNicheStockImagePool,
  resolveStockNicheId,
} from "@/lib/images/niche-stock-images";
import { isLikelyProductImage } from "@/lib/services/firecrawl-scrape";
import type { AdNicheId } from "@/lib/services/neural-script-architect";
import { sanitizeAdNicheId } from "@/lib/services/neural-script-architect";
import { fetchGoogleImageUrls, isSerpImageSearchConfigured } from "@/lib/services/serpapi-google-images";

export {
  isLowResOrGenericImageUrl,
  isProblematicImageUrlForAds,
} from "@/lib/images/image-url-heuristics";

const MAX_PLAN_PRODUCT_IMAGES = 12;
const MIN_PLAN_PRODUCT_IMAGES = 8;

export function parsePreferredHostname(sourceUrl?: string | null): string | null {
  if (!sourceUrl?.trim()) return null;
  try {
    const h = new URL(sourceUrl.trim()).hostname.replace(/^www\./i, "").toLowerCase();
    return h || null;
  } catch {
    return null;
  }
}

function imageUrlHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function hostMatchesPreferredImageUrl(
  imageUrl: string,
  preferred: string | null,
): boolean {
  if (!preferred) return false;
  const h = imageUrlHostname(imageUrl);
  if (!h) return false;
  if (h === preferred) return true;
  return h.endsWith(`.${preferred}`);
}

function padProductImageUrls(
  urls: string[],
  minLen: number,
  maxLen: number,
): string[] {
  if (urls.length === 0) return [];
  const out: string[] = [];
  let i = 0;
  while (out.length < minLen) {
    out.push(urls[i % urls.length]);
    i += 1;
  }
  return out.slice(0, maxLen);
}

export function countHighQualityImageUrls(urls: string[]): number {
  return urls.filter(
    (u) =>
      typeof u === "string" &&
      isLikelyProductImage(u) &&
      !isProblematicImageUrlForAds(u),
  ).length;
}

export function shouldSerpEnrichImageCandidates(urls: string[]): boolean {
  const uniq = [...new Set(urls.filter(Boolean).map((u) => u.trim()))];
  if (uniq.length < 5) return true;
  if (countHighQualityImageUrls(uniq) < 5) return true;
  return false;
}

function rankImageUrls(
  urls: string[],
  preferredHost: string | null = null,
  nicheStockKeys: Set<string> | null = null,
): string[] {
  const withScore = urls.map((u) => {
    const s = u.toLowerCase();
    let score = 0;
    if (!isLowResOrGenericImageUrl(u)) score += 5;
    if (nicheStockKeys?.has(nicheStockPathKey(u))) score += 8;
    if (/images\.unsplash\.com\/photo-/.test(s)) {
      score += 4;
      if (
        /[?&]w=(1[2-9]\d{2}|[2-9]\d{3,})\b/.test(s) ||
        /[?&]h=(7\d{2}|[8-9]\d{2,})\b/.test(s) ||
        /fit=crop/.test(s)
      ) {
        score += 3;
      }
    } else if (/pexels\.com|pixabay\.com/.test(s)) {
      score += 3;
    }
    if (preferredHost && hostMatchesPreferredImageUrl(u, preferredHost)) {
      score += 8;
    } else if (
      preferredHost &&
      !/images\.unsplash\.com|pexels\.com|pixabay\.com/.test(s) &&
      !/(shopifycdn|cdn\.shopify|cloudinary|imgix|cloudfront)\b/.test(s)
    ) {
      score -= 2;
    }
    if (/(\?|&)w=(1[2-9]\d{2}|[2-9]\d{3,})\b/.test(s)) score += 2;
    if (/(\?|&)h=(7\d{2}|[8-9]\d{2,})\b/.test(s)) score += 2;
    if (/\.(jpg|jpeg|webp)(\?|$)/.test(s)) score += 1;
    if (/cdn|cloudfront|images\./.test(s)) score += 1;
    if (/logo|icon|sprite|thumb|thumbnail/.test(s)) score -= 4;
    return { u, score };
  });
  return withScore.sort((a, b) => b.score - a.score).map((x) => x.u);
}

function nicheStockKeySetFor(niche: AdNicheId): Set<string> {
  return new Set(getNicheStockImagePool(niche).map(nicheStockPathKey));
}

function highQualityOnly(urls: string[]): string[] {
  return dedupe(urls).filter(
    (u) => isLikelyProductImage(u) && !isProblematicImageUrlForAds(u),
  );
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

function buildSiteImageQuery(
  host: string,
  companyName: string | undefined,
  pageTitle: string | undefined,
): string {
  const seed =
    (companyName?.trim() || pageTitle?.split(/[|–—-]/)[0]?.trim() || "product")
      .replace(/\s+/g, " ")
      .slice(0, 60);
  return `site:${host} ${seed} photo`.trim();
}

function deriveNicheTerms(companyName?: string, pageTitle?: string): string[] {
  const text = `${companyName ?? ""} ${pageTitle ?? ""}`.toLowerCase();
  if (/law|attorney|legal|injury|litigation/.test(text)) {
    return ["law office", "legal consultation", "professional attorney"];
  }
  if (/real estate|realtor|property|homes?/.test(text)) {
    return ["luxury home interior", "real estate listing", "modern house"];
  }
  if (/saas|software|ai|tech|platform/.test(text)) {
    return ["technology workspace", "software team", "modern office"];
  }
  if (/clinic|medical|dental|health|wellness/.test(text)) {
    return ["medical clinic", "healthcare office", "doctor consultation"];
  }
  if (/restaurant|cafe|food|kitchen|bakery/.test(text)) {
    return ["restaurant interior", "food photography", "chef kitchen"];
  }
  if (/jewel|jewelry|diamond|gold chain|wristwatch luxury/.test(text)) {
    return ["luxury jewelry photography", "fine jewelry product", "watch lifestyle ad"];
  }
  return ["premium lifestyle product", "professional brand photography"];
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
  preferredHost: string | null = null,
  stockNiche: AdNicheId,
): DirectorPlan {
  const merged = highQualityOnly([
    ...plan.productImageUrls,
    ...extraUrls,
  ]);
  let productImageUrls =
    merged.length > 0 ? merged : [...getNicheStockImagePool(stockNiche)];
  productImageUrls = rankImageUrls(
    productImageUrls,
    preferredHost,
    nicheStockKeySetFor(stockNiche),
  );
  productImageUrls = padProductImageUrls(
    productImageUrls,
    MIN_PLAN_PRODUCT_IMAGES,
    MAX_PLAN_PRODUCT_IMAGES,
  );
  return { ...plan, productImageUrls };
}

/**
 * Expands page candidates before Gemini when Firecrawl is sparse or low-res.
 */
export async function enrichPageIntelCandidatesWithSerp(
  candidates: string[],
  companyName: string | undefined,
  pageTitle: string | undefined,
  nicheId?: string | null,
  sourceUrl?: string | null,
): Promise<string[]> {
  const preferredHost = parsePreferredHostname(sourceUrl);
  const explicitNiche = sanitizeAdNicheId(nicheId);
  const effectiveNiche = resolveStockNicheId(explicitNiche, {
    companyName,
    pageTitle,
    sourceUrl,
  });
  const nicheBoost = getNicheSerpBoostQueries(effectiveNiche).map(
    (q) => `${q} high quality social media ad photography`,
  );
  const base = highQualityOnly(candidates);
  const nichePool = getNicheStockImagePool(effectiveNiche);

  const stockKeys = nicheStockKeySetFor(effectiveNiche);
  const rankCandidatePool = (urls: string[], cap: number): string[] => {
    const cleaned = highQualityOnly(dedupe(urls));
    if (cleaned.length === 0) {
      return rankImageUrls(
        [...getNicheStockImagePool(effectiveNiche)],
        preferredHost,
        stockKeys,
      ).slice(0, cap);
    }
    return rankImageUrls(cleaned, preferredHost, stockKeys).slice(0, cap);
  };

  const weakScrape =
    countHighQualityImageUrls(candidates) < 4 ||
    shouldSerpEnrichImageCandidates(candidates);
  const candidateMergeOrder = weakScrape
    ? [...nichePool, ...base]
    : [...base, ...nichePool];

  if (!isSerpImageSearchConfigured()) {
    return rankCandidatePool(dedupe([...candidateMergeOrder]), 24);
  }
  if (!shouldSerpEnrichImageCandidates(base) && base.length >= 8) {
    return rankCandidatePool([...candidateMergeOrder], 24);
  }
  try {
    const brandQuery = buildBrandNicheImageQuery(companyName, pageTitle);
    const nicheQueries = deriveNicheTerms(companyName, pageTitle).map(
      (q) => `${q} high quality social media ad photography`,
    );
    const boostA = nicheBoost[0] ?? brandQuery;
    const boostB = nicheBoost[1] ?? nicheQueries[2] ?? brandQuery;
    const siteQueryStr = preferredHost
      ? buildSiteImageQuery(preferredHost, companyName, pageTitle)
      : null;
    const [q1, q2, q3, q4, qSite] = await Promise.all([
      fetchGoogleImageUrls(brandQuery, 16),
      fetchGoogleImageUrls(nicheQueries[0] ?? brandQuery, 12),
      fetchGoogleImageUrls(nicheQueries[1] ?? brandQuery, 12),
      fetchGoogleImageUrls(boostA, 12),
      siteQueryStr
        ? fetchGoogleImageUrls(siteQueryStr, 14)
        : Promise.resolve<string[]>([]),
    ]);
    const extra = boostB !== boostA ? await fetchGoogleImageUrls(boostB, 10) : [];
    const head = weakScrape ? [...nichePool, ...base] : [...base, ...nichePool];
    const merged = highQualityOnly([
      ...head,
      ...q1,
      ...q2,
      ...q3,
      ...q4,
      ...qSite,
      ...extra,
    ]);
    if (merged.length === 0) {
      return rankCandidatePool([...getNicheStockImagePool(effectiveNiche)], 28);
    }
    return rankImageUrls(merged, preferredHost, stockKeys).slice(0, 28);
  } catch {
    return rankCandidatePool(dedupe([...candidateMergeOrder]), 24);
  }
}

/**
 * After Gemini: second Serp pass from VO keywords if the plan pool is still weak, then hard-assign scene stills.
 */
export async function finalizeDirectorPlanImages(
  plan: DirectorPlan,
  nicheId?: string | null,
  sourceUrl?: string | null,
): Promise<DirectorPlan> {
  const preferredHost = parsePreferredHostname(sourceUrl);
  const explicitNiche = sanitizeAdNicheId(nicheId);
  const effectiveNiche = resolveStockNicheId(explicitNiche, {
    companyName: plan.scrapedBrand?.companyName,
    pageTitle: plan.adTitle,
    sourceUrl,
  });
  const nicheStock = getNicheStockImagePool(effectiveNiche);
  const finalizeKeys = nicheStockKeySetFor(effectiveNiche);
  let next = {
    ...plan,
    productImageUrls: rankImageUrls(
      highQualityOnly([...plan.productImageUrls, ...nicheStock]),
      preferredHost,
      finalizeKeys,
    ),
  };

  if (isSerpImageSearchConfigured()) {
    const pool = next.productImageUrls;
    const weak =
      shouldSerpEnrichImageCandidates(pool) ||
      countHighQualityImageUrls(pool) < 5;
    if (weak) {
      try {
        const q = buildVoiceoverKeywordImageQuery(next.scenes);
        const [foundA, foundB] = await Promise.all([
          fetchGoogleImageUrls(q, 18),
          fetchGoogleImageUrls(`${q} social media campaign`, 14),
        ]);
        next = mergeSerpUrlsIntoPlan(
          next,
          highQualityOnly([...foundA, ...foundB]),
          preferredHost,
          effectiveNiche,
        );
      } catch {
        /* keep plan */
      }
    }
  }

  let hardenedPool = highQualityOnly(next.productImageUrls);
  if (hardenedPool.length === 0) {
    hardenedPool = highQualityOnly(getNicheStockImagePool(effectiveNiche));
  }
  let productImageUrls = rankImageUrls(
    hardenedPool,
    preferredHost,
    finalizeKeys,
  ).slice(0, MAX_PLAN_PRODUCT_IMAGES);
  productImageUrls = padProductImageUrls(
    productImageUrls,
    MIN_PLAN_PRODUCT_IMAGES,
    MAX_PLAN_PRODUCT_IMAGES,
  );
  return ensureDirectorPlanSceneImages({
    ...next,
    productImageUrls,
  });
}
