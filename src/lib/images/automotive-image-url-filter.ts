import { getNicheStockImagePool } from "@/lib/images/niche-stock-images";
import type { AdNicheId } from "@/lib/services/neural-script-architect";

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const k = u.trim().split("?")[0].toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(u.trim());
  }
  return out;
}

/**
 * Unsplash `photo-{id}` — stock that must not appear as generic filler for arbitrary scraped sites
 * (cars, clinics, legal, etc.). Applied on every plan + scene `imageUrl`.
 */
const BLOCKED_UNSPLASH_IDS_GLOBAL = new Set([
  "1542291026", // iconic sneaker on orange — often pulled into ecommerce pools
  "1571019614242", // gym / training
  "1534438327276", // dumbbells
  "1540497077202", // gym equipment
  "1593079831268", // gym interior
]);

/**
 * Extra product-hero clutter — inappropriate for **automotive** vertical only.
 */
const BLOCKED_UNSPLASH_IDS_FOR_AUTOMOTIVE_ONLY = new Set([
  "1523275335684", // wristwatch product hero
  "1505740420928", // headphone product
]);

const BLOCKED_UNSPLASH_IDS_FOR_AUTOMOTIVE = new Set([
  ...BLOCKED_UNSPLASH_IDS_GLOBAL,
  ...BLOCKED_UNSPLASH_IDS_FOR_AUTOMOTIVE_ONLY,
]);

export function unsplashPhotoId(url: string): string | null {
  const m = url.match(/photo-(\d+)/i);
  return m?.[1] ?? null;
}

export function isGloballyBlockedImageUrl(url: string): boolean {
  const id = unsplashPhotoId(url);
  if (!id) return false;
  return BLOCKED_UNSPLASH_IDS_GLOBAL.has(id);
}

/** Drop globally blocked Unsplash IDs (sneaker/gym heroes, etc.) for any vertical. */
export function filterGlobalBlockedUnsplashUrls(urls: string[]): string[] {
  return urls.filter((u) => {
    const id = unsplashPhotoId(u);
    if (!id) return true;
    return !BLOCKED_UNSPLASH_IDS_GLOBAL.has(id);
  });
}

export function filterUrlsForAutomotiveVertical(urls: string[]): string[] {
  return urls.filter((u) => {
    const id = unsplashPhotoId(u);
    if (!id) return true;
    return !BLOCKED_UNSPLASH_IDS_FOR_AUTOMOTIVE.has(id);
  });
}

/** Drop known cross-category stock when the plan is for cars / dealerships. */
export function filterProductImageUrlsForNiche(
  urls: string[],
  niche: AdNicheId,
): string[] {
  let next = filterGlobalBlockedUnsplashUrls(urls);
  if (niche !== "automotive") return next;
  const filtered = filterUrlsForAutomotiveVertical(next);
  if (filtered.length >= 6) return filtered;
  return dedupeUrls([...filtered, ...getNicheStockImagePool("automotive")]);
}
