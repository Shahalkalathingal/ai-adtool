"use server";

import { runGeminiDirector } from "@/lib/services/gemini-director";
import type {
  ContactHints,
  ScrapedPageIntel,
} from "@/lib/services/firecrawl-scrape";
import { scrapeMarketingPage } from "@/lib/services/firecrawl-scrape";
import {
  enrichPageIntelCandidatesWithSerp,
  finalizeDirectorPlanImages,
} from "@/lib/services/director-image-enrichment";
import type { DirectorPlan } from "@/lib/types/director-plan";
import {
  runNeuralScriptArchitect,
  joinPlanSceneVoiceovers,
  ensureMasterVoiceoverWordBudget,
  countMasterScriptWords,
  MASTER_VOICEOVER_MIN_WORDS,
} from "@/lib/services/neural-script-architect";

export type DirectorActionResult =
  | {
      ok: true;
      plan: DirectorPlan;
      contactHints?: ContactHints;
      pageIntel: ScrapedPageIntel;
      /** Full master VO (≥75 words when possible; architect + length recovery). */
      masterVoiceoverScript?: string;
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
  nicheId?: string,
): Promise<DirectorActionResult> {
  const trimmed = url.trim();
  if (!isValidHttpUrl(trimmed)) {
    return { ok: false, error: "Enter a valid http(s) URL." };
  }

  try {
    const scraped = await scrapeMarketingPage(trimmed);
    const expandedCandidates = await enrichPageIntelCandidatesWithSerp(
      scraped.pageIntel.productImageCandidates,
      scraped.pageIntel.companyName,
      scraped.title,
    );
    const pageIntel = {
      ...scraped.pageIntel,
      productImageCandidates: expandedCandidates,
    };
    const planRaw = await runGeminiDirector({
      url: trimmed,
      markdown: scraped.markdown,
      title: scraped.title,
      pageIntel,
    });
    const plan: DirectorPlan = await finalizeDirectorPlanImages(planRaw);
    const joinedSeed = joinPlanSceneVoiceovers(plan);
    let masterVoiceoverScript: string | undefined;
    try {
      masterVoiceoverScript = await runNeuralScriptArchitect({
        url: trimmed,
        title: scraped.title,
        markdown: scraped.markdown,
        pageIntel,
        plan,
        nicheId,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      console.warn("[Neural Script Architect]", message);
    }

    if (
      !masterVoiceoverScript?.trim() ||
      countMasterScriptWords(masterVoiceoverScript) < MASTER_VOICEOVER_MIN_WORDS
    ) {
      try {
        masterVoiceoverScript = await ensureMasterVoiceoverWordBudget({
          url: trimmed,
          title: scraped.title,
          markdown: scraped.markdown,
          pageIntel,
          plan,
          nicheId,
          seedScript:
            masterVoiceoverScript?.trim() && masterVoiceoverScript.trim().length > 0
              ? masterVoiceoverScript
              : joinedSeed,
        });
      } catch (e2) {
        const message = e2 instanceof Error ? e2.message : "Unknown error";
        console.warn("[Master VO length recovery]", message);
        masterVoiceoverScript =
          joinedSeed.length > 0 ? joinedSeed : masterVoiceoverScript;
      }
    }

    return {
      ok: true,
      plan,
      contactHints: scraped.contact,
      pageIntel,
      ...(masterVoiceoverScript?.trim()
        ? { masterVoiceoverScript: masterVoiceoverScript.trim() }
        : {}),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}
