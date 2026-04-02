"use server";

import { synthesizeKokoroTts } from "@/lib/services/kokoro-tts";
import { savePublicMedia } from "@/lib/storage/public-media";
import {
  SCENE_VOICEOVER_MAX_WORDS,
  capWordCountWithCleanEnding,
  normalizeMasterScriptWhitespace,
} from "@/lib/voiceover/master-script-policy";
import { normalizeKokoroVoiceId } from "@/lib/voiceover/kokoro-voices";

export type GenerateVoiceoverResult =
  | { ok: true; publicUrl: string; durationSecEstimate: number }
  | { ok: false; error: string };

function isValidProjectId(projectId: string): boolean {
  return /^[a-zA-Z0-9_-]{6,80}$/.test(projectId);
}

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
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] || cleaned;
  return capWordCountWithCleanEnding(
    firstSentence,
    SCENE_VOICEOVER_MAX_WORDS,
    8,
  );
}

function normalizeMasterScript(script: string): string {
  return normalizeMasterScriptWhitespace(script);
}

function makeUniqueVoiceFilename(projectId: string): string {
  const safe = projectId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "project";
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `voice-${safe}-${stamp}-${rand}.wav`;
}

/**
 * Concatenate voiceover scripts from the client timeline JSON and synthesize one WAV via Kokoro (local TTS).
 */
export async function generateVoiceoverFromTimelineJson(
  projectId: string,
  timelineJson: string,
): Promise<GenerateVoiceoverResult> {
  if (!isValidProjectId(projectId)) {
    return { ok: false, error: "Invalid project id." };
  }
  let clipsById: Record<string, ClipJson> = {};
  let websiteUrl = "";
  let masterScript = "";
  let kokoroVoiceRaw: unknown;
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
    kokoroVoiceRaw = parsed.project?.metadata?.kokoroTtsVoice;
  } catch {
    return { ok: false, error: "Invalid timeline JSON." };
  }

  const kokoroVoiceId = normalizeKokoroVoiceId(kokoroVoiceRaw);

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

  // Single audio file for whole timeline; keep concatenation seamless (no paragraph pauses).
  const text = voScripts.join(" ");
  if (text.length < 2) {
    return {
      ok: false,
      error: "No voiceover scripts found on the timeline (VO clips).",
    };
  }

  try {
    const buffer = await synthesizeKokoroTts(text, { voice: kokoroVoiceId });

    const filename = makeUniqueVoiceFilename(projectId);
    const saved = await savePublicMedia({
      projectId,
      filename,
      buffer,
      contentType: "audio/wav",
    });
    if (!saved.ok) {
      return { ok: false, error: saved.error };
    }
    return {
      ok: true,
      publicUrl: saved.publicUrl,
      durationSecEstimate: estimateDurationFromText(text),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "TTS failed";
    return { ok: false, error: message };
  }
}
