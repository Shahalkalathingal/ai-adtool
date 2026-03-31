import type { DirectorPlan, DirectorScene } from "@/lib/types/director-plan";
import {
  DIRECTOR_PLAN_FALLBACK_STILL,
  ensureDirectorPlanSceneImages,
} from "@/lib/types/director-plan";
import { isLikelyProductImage } from "@/lib/services/firecrawl-scrape";
import { fetchGoogleImageUrls, isSerpImageSearchConfigured } from "@/lib/services/serpapi-google-images";

const PREMIUM_STOCK_FALLBACKS = [
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1920&h=1080&fit=crop&q=85",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&h=1080&fit=crop&q=85",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1920&h=1080&fit=crop&q=85",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop&q=85",
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop&q=85",
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1920&h=1080&fit=crop&q=85",
];

export function isLowResOrGenericImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (
    /thumb|thumbnail|avatars?|favicon|1x1|spacer|pixel|sprite|emoji|icon_/.test(
      u,
    )
  ) {
    return true;
  }
  if (/logo|wordmark|brandmark|watermark/.test(u)) return true;
  if (/\/icons?\//.test(u)) return true;
  if (/\.(svg|gif)(\?|$)/.test(u)) return true;
  if (/\.(ico)(\?|$)/.test(u)) return true;
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

function rankImageUrls(urls: string[]): string[] {
  const withScore = urls.map((u) => {
    const s = u.toLowerCase();
    let score = 0;
    if (!isLowResOrGenericImageUrl(u)) score += 5;
    if (/(\?|&)w=(1[2-9]\d{2}|[2-9]\d{3,})\b/.test(s)) score += 2;
    if (/(\?|&)h=(7\d{2}|[8-9]\d{2,})\b/.test(s)) score += 2;
    if (/\.(jpg|jpeg|webp)(\?|$)/.test(s)) score += 1;
    if (/unsplash|pexels|pixabay|cdn|cloudfront|images\./.test(s)) score += 1;
    if (/logo|icon|sprite|thumb|thumbnail/.test(s)) score -= 4;
    return { u, score };
  });
  return withScore.sort((a, b) => b.score - a.score).map((x) => x.u);
}

function highQualityOnly(urls: string[]): string[] {
  return dedupe(urls).filter(
    (u) => isLikelyProductImage(u) && !isLowResOrGenericImageUrl(u),
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
): DirectorPlan {
  const merged = highQualityOnly([
    ...plan.productImageUrls,
    ...extraUrls,
  ]);
  let productImageUrls =
    merged.length > 0 ? merged : [...PREMIUM_STOCK_FALLBACKS];
  while (productImageUrls.length < 8) {
    productImageUrls = [...productImageUrls, ...PREMIUM_STOCK_FALLBACKS];
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
  const base = highQualityOnly(candidates);
  if (!isSerpImageSearchConfigured()) {
    return rankImageUrls(dedupe([...base, ...PREMIUM_STOCK_FALLBACKS])).slice(0, 24);
  }
  if (!shouldSerpEnrichImageCandidates(base) && base.length >= 8) {
    return rankImageUrls(base).slice(0, 24);
  }
  try {
    const brandQuery = buildBrandNicheImageQuery(companyName, pageTitle);
    const nicheQueries = deriveNicheTerms(companyName, pageTitle).map(
      (q) => `${q} high quality social media ad photography`,
    );
    const [q1, q2, q3] = await Promise.all([
      fetchGoogleImageUrls(brandQuery, 18),
      fetchGoogleImageUrls(nicheQueries[0] ?? brandQuery, 14),
      fetchGoogleImageUrls(nicheQueries[1] ?? brandQuery, 14),
    ]);
    const merged = highQualityOnly([
      ...base,
      ...q1,
      ...q2,
      ...q3,
      ...PREMIUM_STOCK_FALLBACKS,
    ]);
    return rankImageUrls(merged).slice(0, 24);
  } catch {
    return rankImageUrls(dedupe([...base, ...PREMIUM_STOCK_FALLBACKS])).slice(0, 24);
  }
}

/**
 * After Gemini: second Serp pass from VO keywords if the plan pool is still weak, then hard-assign scene stills.
 */
export async function finalizeDirectorPlanImages(
  plan: DirectorPlan,
): Promise<DirectorPlan> {
  let next = { ...plan, productImageUrls: highQualityOnly(plan.productImageUrls) };

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
        next = mergeSerpUrlsIntoPlan(next, highQualityOnly([...foundA, ...foundB]));
      } catch {
        /* keep plan */
      }
    }
  }

  const hardenedPool = highQualityOnly([
    ...next.productImageUrls,
    ...PREMIUM_STOCK_FALLBACKS,
  ]);
  return ensureDirectorPlanSceneImages({
    ...next,
    productImageUrls: rankImageUrls(hardenedPool).slice(0, 12),
  });
}
