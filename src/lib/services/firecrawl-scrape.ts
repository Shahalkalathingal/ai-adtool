import { isProblematicImageUrlForAds } from "@/lib/images/image-url-heuristics";

export type ContactHints = {
  phone?: string;
  address?: string;
  website?: string;
  socialLinks?: string[];
};

/** Tight fields for Gemini + UI — ignore random nav links. */
export type ScrapedPageIntel = {
  companyName?: string;
  cleanAddress?: string;
  phoneNumber?: string;
  logoUrl?: string;
  primaryDomain?: string;
  /** Candidate product images from markdown / metadata (https). */
  productImageCandidates: string[];
};

export type FirecrawlScrapeResult = {
  markdown: string;
  title?: string;
  description?: string;
  sourceUrl: string;
  contact?: ContactHints;
  /** Structured extraction for Director + hydration. */
  pageIntel: ScrapedPageIntel;
};

const PHONE_RE =
  /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g;

const MARKDOWN_IMG_RE = /!\[[^\]]*]\((https?:[^)\s]+)\)/gi;
const BARE_IMG_RE = /\((https?:[^)\s]+\.(?:jpg|jpeg|png|webp)(?:\?[^)]*)?)\)/gi;

const SKIP_SUBSTR = [
  "favicon",
  "icon",
  "logo.svg",
  "pixel",
  "tracking",
  "1x1",
  "spacer",
];

function normalizeUrl(u: string): string {
  return u.replace(/[),."'"]+$/, "").trim();
}

export function isLikelyProductImage(url: string): boolean {
  const lower = url.toLowerCase();
  if (SKIP_SUBSTR.some((s) => lower.includes(s))) return false;
  if (lower.endsWith(".svg")) return false;
  return lower.startsWith("http://") || lower.startsWith("https://");
}

/**
 * Extract https image URLs from markdown (product photography candidates).
 */
export function extractImageUrlsFromMarkdown(markdown: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const md = markdown.replace(/\r\n/g, "\n");
  const re1 = new RegExp(MARKDOWN_IMG_RE);
  while ((m = re1.exec(md)) !== null) {
    const u = normalizeUrl(m[1] ?? "");
    if (isLikelyProductImage(u) && !isProblematicImageUrlForAds(u)) found.add(u);
  }
  const re2 = new RegExp(BARE_IMG_RE);
  while ((m = re2.exec(md)) !== null) {
    const u = normalizeUrl(m[1] ?? "");
    if (isLikelyProductImage(u) && !isProblematicImageUrlForAds(u)) found.add(u);
  }
  return [...found].slice(0, 24);
}

function stripMarkdownNoise(line: string): string {
  return line
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_`#>]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAddressLine(line: string): string {
  return line
    .replace(/\s*\|\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,+/g, ", ")
    .trim();
}

function isLikelyPhysicalAddress(line: string): boolean {
  const l = normalizeAddressLine(line);
  if (!l || l.length < 14 || l.length > 220) return false;

  // Reject URLs / link-like junk / social handles.
  if (/(https?:\/\/|www\.|@|\.com\b|\.net\b|\.org\b)/i.test(l)) return false;
  if (/[<>{}[\]]/.test(l)) return false;

  // Needs a street number + street suffix.
  const hasStreetNumber = /\b\d{1,6}\b/.test(l);
  const hasStreetSuffix =
    /\b(street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?|court|ct\.?|circle|cir\.?|way|place|pl\.?|parkway|pkwy\.?|highway|hwy\.?|suite|ste\.?|unit|floor|fl\.?)\b/i.test(
      l,
    );
  if (!hasStreetNumber || !hasStreetSuffix) return false;

  // Needs region marker: US state code + zip OR common region keywords.
  const hasStateZip = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(l);
  const hasPostalCode = /\b\d{5}(?:-\d{4})?\b/.test(l);
  const hasRegionWord =
    /\b(usa|united states|canada|uk|united kingdom|australia)\b/i.test(l);
  if (!(hasStateZip || (hasPostalCode && /,/.test(l)) || hasRegionWord)) {
    return false;
  }

  return true;
}

function extractPrimaryDomain(sourceUrl: string): string | undefined {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function inferLogoFromMetadata(
  metadata: Record<string, unknown> | undefined,
): string | undefined {
  if (!metadata) return undefined;
  const candidates: unknown[] = [];
  for (const key of Object.keys(metadata)) {
    if (/logo/i.test(key)) {
      candidates.push(metadata[key]);
    }
  }
  const flat = candidates
    .flatMap((v) => {
      if (typeof v === "string") return [v];
      if (Array.isArray(v)) return v;
      return [];
    })
    .filter((v): v is string => typeof v === "string" && v.trim().length > 8);
  const https = flat.find((u) => /^https?:\/\//i.test(u.trim()));
  return https ?? flat[0];
}

function fallbackLogoForDomain(sourceUrl: string): string | undefined {
  try {
    const u = new URL(sourceUrl);
    const origin = `${u.protocol}//${u.host}`;
    // Prefer a common logo path over bare favicon when possible.
    return `${origin}/favicon.ico`;
  } catch {
    return undefined;
  }
}

/**
 * Heuristic single-line address (US-style) without markdown debris.
 */
function extractCleanAddress(markdown: string): string | undefined {
  const lines = markdown.split("\n").map((l) => stripMarkdownNoise(l));
  for (const line of lines) {
    const normalized = normalizeAddressLine(line);
    if (!isLikelyPhysicalAddress(normalized)) continue;
    return normalized;
  }

  // Some sites split street and city/state/zip across two lines.
  for (let i = 0; i < lines.length - 1; i += 1) {
    const pair = normalizeAddressLine(`${lines[i]}, ${lines[i + 1]}`);
    if (!isLikelyPhysicalAddress(pair)) continue;
    return pair;
  }
  return undefined;
}

/**
 * Best-effort legacy contact hints (kept for compatibility).
 */
export function extractContactHints(markdown: string): ContactHints {
  const text = markdown.replace(/\r\n/g, "\n");
  const hints: ContactHints = {};

  const phones = text.match(PHONE_RE);
  if (phones?.length) {
    const best = phones.sort((a, b) => b.length - a.length)[0];
    hints.phone = best?.trim();
  }

  const addr = extractCleanAddress(text);
  if (addr) hints.address = addr;

  const urls = text.match(/\(?https?:\/\/[^\s)\]>"']+/gi) ?? [];
  const normalized = urls
    .map((u) => u.replace(/^[("]+/, "").replace(/[")\],.]+$/, ""))
    .filter((u) => u.startsWith("http"));

  try {
    const host = normalized[0] ? new URL(normalized[0]).hostname : "";
    if (host && !/instagram|facebook|twitter|tiktok/i.test(host)) {
      hints.website = normalized[0];
    }
  } catch {
    /* ignore */
  }

  return hints;
}

function dedupeHttpsImageUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const u = raw.trim();
    if (!u) continue;
    const k = u.split("?")[0]?.toLowerCase() ?? u.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(u);
  }
  return out;
}

function buildPageIntel(
  markdown: string,
  sourceUrl: string,
  metadata?: Record<string, unknown>,
): ScrapedPageIntel {
  const contact = extractContactHints(markdown);
  const fromMarkdown = extractImageUrlsFromMarkdown(markdown);

  const ogImage =
    typeof metadata?.ogImage === "string"
      ? metadata.ogImage
      : typeof metadata?.["og:image"] === "string"
        ? (metadata["og:image"] as string)
        : undefined;

  const title =
    typeof metadata?.title === "string" ? metadata.title : undefined;

  const ogAsCandidate =
    ogImage &&
    isLikelyProductImage(ogImage) &&
    !isProblematicImageUrlForAds(ogImage)
      ? [ogImage]
      : [];
  const candidates = dedupeHttpsImageUrls([...ogAsCandidate, ...fromMarkdown]);

  let logoUrl: string | undefined;
  const metaLogo = inferLogoFromMetadata(metadata);
  if (metaLogo && /^https?:\/\//i.test(metaLogo)) {
    logoUrl = metaLogo;
  } else if (ogImage) {
    // Prefer og:image even if it might be a hero — better something brand-related than nothing.
    logoUrl = ogImage;
  }
  if (!logoUrl) {
    const fromBody = candidates.find((u) =>
      /logo|mark|symbol|brand/i.test(u.toLowerCase()),
    );
    logoUrl = fromBody ?? candidates[0] ?? fallbackLogoForDomain(sourceUrl);
  }

  const primaryDomain = extractPrimaryDomain(sourceUrl);
  const websiteFromContact = contact.website
    ? (() => {
        try {
          return new URL(contact.website).hostname.replace(/^www\./, "");
        } catch {
          return primaryDomain;
        }
      })()
    : primaryDomain;

  return {
    companyName: title?.split(/[|\-–]/)[0]?.trim(),
    cleanAddress: contact.address ?? extractCleanAddress(markdown),
    phoneNumber: contact.phone,
    logoUrl,
    primaryDomain: websiteFromContact,
    productImageCandidates: candidates,
  };
}

const CONTACT_PATHS = [
  "/contact",
  "/contact-us",
  "/about",
  "/about-us",
  "/location",
  "/locations",
  "/visit",
  "/stores",
  "/store-locator",
];

function stripTrailingSlash(u: string): string {
  return u.replace(/\/+$/, "") || "/";
}

async function firecrawlFetchMarkdown(
  targetUrl: string,
  apiKey: string,
): Promise<{
  markdown: string;
  title?: string;
  metadata?: Record<string, unknown>;
} | null> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url: targetUrl,
      formats: ["markdown"],
    }),
    cache: "no-store",
  });

  const raw = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (!res.ok || json.success !== true) return null;

  const data = json.data as Record<string, unknown> | undefined;
  const markdown =
    (typeof data?.markdown === "string" ? data.markdown : null) ??
    (typeof json.markdown === "string" ? json.markdown : "") ??
    "";

  const metadata = (data?.metadata ?? json.metadata) as
    | Record<string, unknown>
    | undefined;
  const title =
    typeof metadata?.title === "string" ? metadata.title : undefined;

  return {
    markdown: markdown.trim(),
    title,
    metadata,
  };
}

function assertPrimaryScrapeOk(
  res: Response,
  json: Record<string, unknown>,
  raw: string,
): void {
  if (!res.ok) {
    throw new Error(
      `Firecrawl scrape failed (${res.status}): ${typeof json.message === "string" ? json.message : raw.slice(0, 300)}`,
    );
  }
  if (json.success !== true) {
    throw new Error(
      `Firecrawl reported failure: ${typeof json.error === "string" ? json.error : JSON.stringify(json)}`,
    );
  }
}

/**
 * Deep scrape a marketing URL via Firecrawl (markdown for Gemini Director).
 * Crawls common contact/about paths when phone or address is missing.
 * @see https://docs.firecrawl.dev/api-reference/v1-endpoint/scrape
 */
export async function scrapeMarketingPage(
  url: string,
): Promise<FirecrawlScrapeResult> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key?.trim()) {
    throw new Error("FIRECRAWL_API_KEY is not configured in the environment.");
  }

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
    }),
    cache: "no-store",
  });

  const raw = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Firecrawl returned non-JSON (${res.status}): ${raw.slice(0, 200)}`);
  }

  assertPrimaryScrapeOk(res, json, raw);

  const data = json.data as Record<string, unknown> | undefined;
  const markdown =
    (typeof data?.markdown === "string" ? data.markdown : null) ??
    (typeof json.markdown === "string" ? json.markdown : "") ??
    "";

  const metadata = (data?.metadata ?? json.metadata) as
    | Record<string, unknown>
    | undefined;
  const title =
    typeof metadata?.title === "string" ? metadata.title : undefined;
  const description =
    typeof metadata?.description === "string"
      ? metadata.description
      : undefined;

  let aggregated = markdown.trim() || "(empty page)";

  const recompute = () => {
    const contact = extractContactHints(aggregated);
    const pageIntel = buildPageIntel(aggregated, url, metadata);
    if (title && !pageIntel.companyName) {
      pageIntel.companyName = title.split(/[|\-–]/)[0]?.trim();
    }
    return { contact, pageIntel };
  };

  let { contact, pageIntel } = recompute();
  const missingPhone = !pageIntel.phoneNumber && !contact.phone;
  const missingAddress = !pageIntel.cleanAddress && !contact.address;

  if (missingPhone || missingAddress) {
    let origin: URL;
    try {
      origin = new URL(url);
    } catch {
      origin = new URL("https://invalid.local/");
    }
    const home = stripTrailingSlash(`${origin.origin}${origin.pathname || "/"}`);

    for (const path of CONTACT_PATHS) {
      const subUrl = stripTrailingSlash(
        new URL(path, `${origin.protocol}//${origin.host}`).href,
      );
      if (subUrl === home) continue;

      const sub = await firecrawlFetchMarkdown(subUrl, key);
      if (!sub?.markdown?.trim()) continue;

      aggregated += `\n\n---\n\n## ${path}\n\n${sub.markdown}`;
      ({ contact, pageIntel } = recompute());

      const stillPhone = !pageIntel.phoneNumber && !contact.phone;
      const stillAddr = !pageIntel.cleanAddress && !contact.address;
      if (!stillPhone && !stillAddr) break;
    }
  }

  const md = aggregated.trim() || "(empty page)";
  const finalContact = extractContactHints(md);
  const finalIntel = buildPageIntel(md, url, metadata);
  if (title && !finalIntel.companyName) {
    finalIntel.companyName = title.split(/[|\-–]/)[0]?.trim();
  }

  return {
    markdown: md,
    title,
    description,
    sourceUrl: url,
    contact: finalContact,
    pageIntel: finalIntel,
  };
}
