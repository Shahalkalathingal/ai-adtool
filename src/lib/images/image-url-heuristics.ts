/**
 * URL-only heuristics for product / ad stills (no network).
 * Shared by Firecrawl extraction and director enrichment.
 */

export function isLowResOrGenericImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (
    /thumb|thumbnail|avatars?|favicon|1x1|spacer|pixel|sprite|emoji|icon_/.test(
      u,
    )
  ) {
    return true;
  }
  if (
    /\/[/_-](50|64|80|96|100|120)x(50|64|80|96|100|120)([/_-]|[.?]|$)/.test(u)
  ) {
    return true;
  }
  if (/\bw_\d{2,3}\b/.test(u)) return true;
  if (/\/cdn-cgi\/image\//.test(u) && /\bw[=_]\d{1,3}\b/.test(u)) return true;
  if (/[?&]s=\d{1,3}x\d{1,3}\b/.test(u)) return true;
  if (/[?&]resize=w\d{1,3}\b/.test(u)) return true;
  if (/logo|wordmark|brandmark|watermark/.test(u)) return true;
  if (/\/icons?\//.test(u)) return true;
  if (/\.(svg|gif)(\?|$)/.test(u)) return true;
  if (/\.(ico)(\?|$)/.test(u)) return true;
  if (/[?&](w|width)=\d{1,2}\b/.test(u)) return true;
  if (/[?&]h=\d{1,2}\b/.test(u)) return true;
  return false;
}

/** Social avatars / CDNs that rarely produce usable ad stills. */
export function isSocialOrAvatarImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  if (/gravatar\.com\b/.test(u)) return true;
  if (/fbcdn\.net\b|\.facebook\.com\//.test(u)) return true;
  if (/twimg\.com\b|pbs\.twimg\.com\b/.test(u)) return true;
  if (/googleusercontent\.com\b/.test(u)) return true;
  if (/ytimg\.com\b/.test(u)) return true;
  if (/\/avatar[s]?\//.test(u)) return true;
  if (/profile[_-]?(pic|photo)|user[_-]?photo/.test(u)) return true;
  return false;
}

/**
 * Paths or filenames that embed small derived dimensions (common WP / CDN thumbs).
 */
export function isLikelyTinyDimensionsInUrl(url: string): boolean {
  const u = url.toLowerCase();
  const rx = /\b(\d{2,4})x(\d{2,4})\b/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(u)) !== null) {
    const a = parseInt(m[1] ?? "0", 10);
    const b = parseInt(m[2] ?? "0", 10);
    if (a >= 16 && b >= 16 && a <= 400 && b <= 400) return true;
  }
  return false;
}

/** Drop obvious junk before enrichment / Gemini — stricter than https-only. */
export function isProblematicImageUrlForAds(url: string): boolean {
  return (
    isLowResOrGenericImageUrl(url) ||
    isSocialOrAvatarImageUrl(url) ||
    isLikelyTinyDimensionsInUrl(url)
  );
}

export function nicheStockPathKey(url: string): string {
  try {
    const x = new URL(url);
    const host = x.hostname.toLowerCase();
    const path = x.pathname.toLowerCase().replace(/\/+$/, "");
    if (host.includes("unsplash")) return `unsplash:${path}`;
    return `${host}${path}`;
  } catch {
    return url.toLowerCase().split("?")[0];
  }
}
