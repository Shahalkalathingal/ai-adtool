"use server";

import { runGeminiRefiner } from "@/lib/services/gemini-refiner";
import type { RefinementPatch } from "@/lib/types/refinement";

export type RefineTimelineResult =
  | { ok: true; patch: RefinementPatch }
  | { ok: false; error: string };

export async function refineTimelineAction(
  timelineJson: string,
  prompt: string,
): Promise<RefineTimelineResult> {
  const trimmed = prompt.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "Enter a longer instruction." };
  }

  try {
    const patch = await runGeminiRefiner({ timelineJson, prompt: trimmed });
    return { ok: true, patch };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}
