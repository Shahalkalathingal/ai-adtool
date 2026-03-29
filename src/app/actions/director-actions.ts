"use server";

import { runGeminiDirector } from "@/lib/services/gemini-director";
import type {
  ContactHints,
  ScrapedPageIntel,
} from "@/lib/services/firecrawl-scrape";
import { scrapeMarketingPage } from "@/lib/services/firecrawl-scrape";
import type { DirectorPlan } from "@/lib/types/director-plan";

export type DirectorActionResult =
  | {
      ok: true;
      plan: DirectorPlan;
      contactHints?: ContactHints;
      pageIntel: ScrapedPageIntel;
    }
  | { ok: false; error: string };

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Scrape the brand URL with Firecrawl, then run Gemini as creative director
 * to produce a 30s+ multi-scene plan with images and structured brand fields.
 */
export async function generateDirectorPlanFromUrl(
  url: string,
): Promise<DirectorActionResult> {
  const trimmed = url.trim();
  if (!isValidHttpUrl(trimmed)) {
    return { ok: false, error: "Enter a valid http(s) URL." };
  }

  try {
    const scraped = await scrapeMarketingPage(trimmed);
    const plan = await runGeminiDirector({
      url: trimmed,
      markdown: scraped.markdown,
      title: scraped.title,
      pageIntel: scraped.pageIntel,
    });
    return {
      ok: true,
      plan,
      contactHints: scraped.contact,
      pageIntel: scraped.pageIntel,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}
