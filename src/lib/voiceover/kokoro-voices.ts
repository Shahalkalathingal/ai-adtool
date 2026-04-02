/**
 * Voice presets for ad narration (stored as `kokoroTtsVoice` in project metadata).
 * Server maps each id to an Unreal Speech VoiceId (Scarlett, Dan, Liv, Will, Amy).
 */
export const KOKORO_VOICE_OPTIONS = [
  { id: "am_michael", label: "Michael — warm US male (default)", group: "US · Male" },
  { id: "am_puck", label: "Puck — upbeat US male", group: "US · Male" },
  { id: "am_fenrir", label: "Fenrir — deep US male", group: "US · Male" },
  { id: "am_onyx", label: "Onyx — smooth US male", group: "US · Male" },
  { id: "af_bella", label: "Bella — premium US female", group: "US · Female" },
  { id: "af_heart", label: "Heart — expressive US female", group: "US · Female" },
  { id: "af_nicole", label: "Nicole — conversational US female", group: "US · Female" },
  { id: "bf_emma", label: "Emma — UK female", group: "UK · English" },
  { id: "bm_george", label: "George — UK male", group: "UK · English" },
] as const;

export type KokoroTtsVoiceId = (typeof KOKORO_VOICE_OPTIONS)[number]["id"];

export const DEFAULT_KOKORO_TTS_VOICE: KokoroTtsVoiceId = "am_michael";

const ALLOWED = new Set<string>(KOKORO_VOICE_OPTIONS.map((o) => o.id));

export function normalizeKokoroVoiceId(raw: unknown): KokoroTtsVoiceId {
  if (typeof raw === "string" && ALLOWED.has(raw)) {
    return raw as KokoroTtsVoiceId;
  }
  return DEFAULT_KOKORO_TTS_VOICE;
}

/** Group order in the Voice & script dropdown. */
export const KOKORO_VOICE_GROUPS: readonly string[] = [
  "US · Male",
  "US · Female",
  "UK · English",
];
