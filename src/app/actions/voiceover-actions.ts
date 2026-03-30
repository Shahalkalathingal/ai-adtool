"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { synthesizeMicrosoftEdgeTts } from "@/lib/services/microsoft-edge-tts";

export type GenerateVoiceoverResult =
  | { ok: true; publicUrl: string; durationSecEstimate: number }
  | { ok: false; error: string };

function estimateDurationFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, words / 2.4);
}

type ClipJson = {
  mediaType?: string;
  startTime?: number;
  label?: string | null;
  metadata?: Record<string, unknown> | null;
  content?: Record<string, unknown> | null;
};

function compactScriptForFiveSec(script: string): string {
  const cleaned = script
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
  if (!cleaned) return "";
  // Keep exactly one sentence for immersive VO.
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  const words = firstSentence.split(" ").filter(Boolean);
  const maxWords = 16;
  const trimmed =
    words.length <= maxWords ? firstSentence : `${words.slice(0, maxWords).join(" ")}.`;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function normalizeMasterScript(script: string): string {
  return script
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
}

/**
 * Concatenate voiceover scripts from the client timeline JSON and synthesize one MP3 via Edge TTS.
 */
export async function generateVoiceoverFromTimelineJson(
  projectId: string,
  timelineJson: string,
): Promise<GenerateVoiceoverResult> {
  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "project";

  let clipsById: Record<string, ClipJson> = {};
  let websiteUrl = "";
  let masterScript = "";
  try {
    const parsed = JSON.parse(timelineJson) as {
      clipsById?: Record<string, ClipJson>;
      project?: { metadata?: Record<string, unknown> };
    };
    clipsById = parsed.clipsById ?? {};
    const rawWebsite = parsed.project?.metadata?.websiteUrl;
    websiteUrl =
      typeof rawWebsite === "string" && rawWebsite.trim()
        ? rawWebsite.trim()
        : "";
    const rawMaster = parsed.project?.metadata?.masterVoiceoverScript;
    masterScript =
      typeof rawMaster === "string" && rawMaster.trim()
        ? normalizeMasterScript(rawMaster)
        : "";
  } catch {
    return { ok: false, error: "Invalid timeline JSON." };
  }

  const vo = Object.entries(clipsById)
    .filter(([, c]) => c.mediaType === "VOICEOVER")
    .sort((a, b) => (a[1].startTime ?? 0) - (b[1].startTime ?? 0));

  const voScripts: string[] = [];
  if (masterScript) {
    voScripts.push(masterScript);
  }

  if (!masterScript) {
  for (const [idx, [, clip]] of vo.entries()) {
    const c = clip.content;
    const script =
      c && typeof c.script === "string"
        ? c.script
        : c && typeof (c as { voiceover?: string }).voiceover === "string"
          ? (c as { voiceover: string }).voiceover
          : "";
    const concise = compactScriptForFiveSec(script);
    if (concise) {
      voScripts.push(concise);
      continue;
    }
    // Guarantee final scene (outro/end card) has audible CTA voice.
    if (idx === vo.length - 1) {
      const host = websiteUrl
        .replace(/^https?:\/\//, "")
        .replace(/\/.*$/, "")
        .trim();
      voScripts.push(
        host
          ? `For this and more, visit ${host} today.`
          : "For this and more, visit us today.",
      );
    }
  }
  }

  // Single MP3 for whole timeline; keep concatenation seamless (no paragraph pauses).
  const text = voScripts.join(" ");
  if (text.length < 2) {
    return {
      ok: false,
      error: "No voiceover scripts found on the timeline (VO clips).",
    };
  }

  try {
    const buffer = await synthesizeMicrosoftEdgeTts(text, {
      voice: "en-US-GuyNeural",
    });

    const dir = path.join(process.cwd(), "public", "media", safeProject);
    await mkdir(dir, { recursive: true });
    const filename = "voice.mp3";
    const full = path.join(dir, filename);
    await writeFile(full, buffer);

    const publicUrl = `/media/${safeProject}/${filename}`;
    return {
      ok: true,
      publicUrl,
      durationSecEstimate: estimateDurationFromText(text),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "TTS failed";
    return { ok: false, error: message };
  }
}
