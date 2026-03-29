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
  content?: Record<string, unknown> | null;
};

/**
 * Concatenate voiceover scripts from the client timeline JSON and synthesize one MP3 via Edge TTS.
 */
export async function generateVoiceoverFromTimelineJson(
  projectId: string,
  timelineJson: string,
): Promise<GenerateVoiceoverResult> {
  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "project";

  let clipsById: Record<string, ClipJson> = {};
  try {
    const parsed = JSON.parse(timelineJson) as {
      clipsById?: Record<string, ClipJson>;
    };
    clipsById = parsed.clipsById ?? {};
  } catch {
    return { ok: false, error: "Invalid timeline JSON." };
  }

  const vo = Object.entries(clipsById)
    .filter(([, c]) => c.mediaType === "VOICEOVER")
    .sort((a, b) => (a[1].startTime ?? 0) - (b[1].startTime ?? 0));

  const voScripts: string[] = [];
  for (const [, clip] of vo) {
    const c = clip.content;
    const script =
      c && typeof c.script === "string"
        ? c.script
        : c && typeof (c as { voiceover?: string }).voiceover === "string"
          ? (c as { voiceover: string }).voiceover
          : "";
    if (script.trim()) {
      voScripts.push(script.trim());
    }
  }

  const text = voScripts.join("\n\n");
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
