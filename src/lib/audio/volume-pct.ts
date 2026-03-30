/** Sidebar / timeline volume as 0–100% (Premiere-style). Remotion maps to linear gain per track. */

/** Legacy voice fader mapped approx. −24 dB…0 dB to 0–100%. */
const VOICE_DB_LEGACY_MIN = -24;
/** Legacy music fader in UI was −30 dB…−6 dB → 0–100%. */
const MUSIC_DB_LEGACY_MIN = -30;
const MUSIC_DB_LEGACY_MAX = -6;

export function voiceVolumePctFromAudioProps(
  audioProps: Record<string, unknown> | null | undefined,
): number {
  if (!audioProps) return 100;
  if (
    typeof audioProps.volumePct === "number" &&
    Number.isFinite(audioProps.volumePct)
  ) {
    return clampPct(audioProps.volumePct);
  }
  if (
    typeof audioProps.gainDb === "number" &&
    Number.isFinite(audioProps.gainDb)
  ) {
    const g = audioProps.gainDb;
    if (g <= VOICE_DB_LEGACY_MIN) return 0;
    const pct = ((g - VOICE_DB_LEGACY_MIN) / (0 - VOICE_DB_LEGACY_MIN)) * 100;
    return clampPct(pct);
  }
  return 100;
}

export function musicVolumePctFromAudioProps(
  audioProps: Record<string, unknown> | null | undefined,
): number {
  if (!audioProps) {
    return pctFromMusicGainDb(-15);
  }
  if (
    typeof audioProps.volumePct === "number" &&
    Number.isFinite(audioProps.volumePct)
  ) {
    return clampPct(audioProps.volumePct);
  }
  if (
    typeof audioProps.gainDb === "number" &&
    Number.isFinite(audioProps.gainDb)
  ) {
    return pctFromMusicGainDb(audioProps.gainDb);
  }
  return pctFromMusicGainDb(-15);
}

function pctFromMusicGainDb(gainDb: number): number {
  if (gainDb <= MUSIC_DB_LEGACY_MIN) return 0;
  const span = MUSIC_DB_LEGACY_MAX - MUSIC_DB_LEGACY_MIN;
  const pct =
    ((gainDb - MUSIC_DB_LEGACY_MIN) / span) * 100;
  return clampPct(pct);
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/** Max Remotion `volume` for voice at 100% fader. */
export const VOICE_LINEAR_MAX = 0.92;
/** Max Remotion `volume` for music bed at 100% fader (stays under VO). */
export const MUSIC_LINEAR_MAX = 0.38;

export function voiceLinearVolume(pct: number): number {
  if (pct <= 0) return 0;
  return (clampPct(pct) / 100) * VOICE_LINEAR_MAX;
}

export function musicLinearVolume(pct: number): number {
  if (pct <= 0) return 0;
  return (clampPct(pct) / 100) * MUSIC_LINEAR_MAX;
}
