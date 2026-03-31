import { secondsToFrames } from "@/lib/types/timeline";

export const MIN_VIDEO_DURATION_SEC = 32;
export const OUTRO_BUFFER_SEC = 3.5;

function validPositive(sec: number | null | undefined): number | null {
  if (typeof sec !== "number") return null;
  if (!Number.isFinite(sec) || sec <= 0) return null;
  return sec;
}

/** Shared preview/export duration policy: min 32s, else follow final VO duration. */
export function resolveVideoDurationSec(params: {
  voiceoverDurationSec?: number | null;
  fallbackDurationSec: number;
}): number {
  const voiceSec = validPositive(params.voiceoverDurationSec);
  const base = voiceSec != null ? voiceSec + OUTRO_BUFFER_SEC : Math.max(0, params.fallbackDurationSec);
  return Math.max(MIN_VIDEO_DURATION_SEC, base);
}

export function resolveVideoDurationFrames(params: {
  fps: number;
  voiceoverDurationSec?: number | null;
  fallbackDurationSec: number;
}): number {
  const sec = resolveVideoDurationSec({
    voiceoverDurationSec: params.voiceoverDurationSec,
    fallbackDurationSec: params.fallbackDurationSec,
  });
  return Math.max(1, Math.ceil(sec * params.fps));
}
