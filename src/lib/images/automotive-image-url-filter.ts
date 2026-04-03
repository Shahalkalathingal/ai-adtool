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
 * Unsplash `photo-{id}` segments that belong to footwear / gym / generic ecommerce
 * hero shots — inappropriate when the inferred vertical is automotive (dealerships, OEM).
 */
const BLOCKED_UNSPLASH_IDS_FOR_AUTOMOTIVE = new Set([
  "1542291026", // classic sneaker on orange — often pulled into ecommerce pools
  "1571019614242", // gym / training
  "1534438327276", // dumbbells
  "1540497077202", // gym equipment
  "1593079831268", // gym interior
  "1523275335684", // wristwatch product (non-automotive product hero)
  "1505740420928", // headphone product
]);

export function unsplashPhotoId(url: string): string | null {
  const m = url.match(/photo-(\d+)/i);
  return m?.[1] ?? null;
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
  if (niche !== "automotive") return urls;
  const filtered = filterUrlsForAutomotiveVertical(urls);
  if (filtered.length >= 6) return filtered;
  return dedupeUrls([...filtered, ...getNicheStockImagePool("automotive")]);
}
