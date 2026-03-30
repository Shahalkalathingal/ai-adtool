/**
 * SerpApi Google Images — optional enrichment when Firecrawl yields sparse/low-res URLs.
 * @see https://serpapi.com/google-images-api
 */

const SERP_ENDPOINT = "https://serpapi.com/search.json";

type SerpImageHit = {
  original?: string;
  link?: string;
  thumbnail?: string;
};

function hasApiKey(): boolean {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}

export async function fetchGoogleImageUrls(
  query: string,
  num = 12,
): Promise<string[]> {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key || !query.trim()) return [];

  const params = new URLSearchParams({
    engine: "google_images",
    q: query.trim(),
    api_key: key,
    num: String(Math.min(20, Math.max(4, num))),
  });

  const res = await fetch(`${SERP_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `SerpApi images failed (${res.status}): ${text.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as {
    images_results?: SerpImageHit[];
    error?: string;
  };

  if (typeof json.error === "string" && json.error) {
    throw new Error(`SerpApi: ${json.error}`);
  }

  const rows = json.images_results ?? [];
  const urls: string[] = [];
  for (const row of rows) {
    const u = row.original ?? row.link ?? row.thumbnail;
    if (typeof u === "string" && u.startsWith("https://")) urls.push(u);
  }
  return urls;
}

export function isSerpImageSearchConfigured(): boolean {
  return hasApiKey();
}
