/**
 * Unreal Speech HTTP TTS (no heavy local models — keeps Vercel functions under size limits).
 * @see https://docs.unrealspeech.com/reference/speech
 */

import {
  DEFAULT_KOKORO_TTS_VOICE,
  type KokoroTtsVoiceId,
} from "@/lib/voiceover/kokoro-voices";

const DEFAULT_API_BASE = "https://api.v7.unrealspeech.com";

type SpeechApiResponse = {
  TaskStatus?: string;
  OutputUri?: string;
  VoiceId?: string;
  TaskId?: string;
};

/** UnrealSpeech /speech VoiceId values (capitalized). */
const KOKORO_TO_UNREAL: Record<KokoroTtsVoiceId, string> = {
  am_michael: "Will",
  am_puck: "Dan",
  am_fenrir: "Will",
  am_onyx: "Dan",
  af_bella: "Scarlett",
  af_heart: "Liv",
  af_nicole: "Amy",
  bf_emma: "Scarlett",
  bm_george: "Will",
};

export function isUnrealSpeechConfigured(): boolean {
  return Boolean(process.env.UNREALSPEECH_API_KEY?.trim());
}

function apiBase(): string {
  const b = process.env.UNREALSPEECH_API_BASE?.trim() || DEFAULT_API_BASE;
  return b.replace(/\/$/, "");
}

function resolveVoiceId(kokoroVoice: KokoroTtsVoiceId): string {
  const override = process.env.UNREALSPEECH_VOICE_ID?.trim();
  if (override) return override;
  return KOKORO_TO_UNREAL[kokoroVoice] ?? "Will";
}

const MAX_CHARS_PER_REQUEST = 2900;

function chunkTextForSpeech(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= MAX_CHARS_PER_REQUEST) return [t];

  const parts: string[] = [];
  let start = 0;
  while (start < t.length) {
    let end = Math.min(start + MAX_CHARS_PER_REQUEST, t.length);
    if (end < t.length) {
      const window = t.slice(start, end);
      const rel = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
        window.lastIndexOf("… "),
      );
      if (rel > 200) end = start + rel + 1;
    }
    const piece = t.slice(start, end).trim();
    if (piece) parts.push(piece);
    start = end;
  }
  return parts;
}

/**
 * Returns one MP3 buffer (concatenated if input required multiple /speech calls).
 */
export async function synthesizeUnrealSpeechToMp3(
  text: string,
  options?: { kokoroVoice?: KokoroTtsVoiceId },
): Promise<Buffer> {
  const key = process.env.UNREALSPEECH_API_KEY?.trim();
  if (!key) {
    throw new Error("UNREALSPEECH_API_KEY is not configured.");
  }
  const trimmed = text.trim();
  if (trimmed.length < 1) {
    throw new Error("UnrealSpeech: empty text.");
  }

  const kokoroVoice = options?.kokoroVoice ?? DEFAULT_KOKORO_TTS_VOICE;
  const resolvedVoice = resolveVoiceId(kokoroVoice);

  const pieces = chunkTextForSpeech(trimmed);
  const buffers: Buffer[] = [];

  for (const piece of pieces) {
    const res = await fetch(`${apiBase()}/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        Text: piece,
        VoiceId: resolvedVoice,
        Bitrate: "192k",
        Speed: "0",
        Pitch: "1",
        TimestampType: "sentence",
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(
        `UnrealSpeech /speech failed (${res.status}): ${err.slice(0, 240)}`,
      );
    }

    const json = (await res.json()) as SpeechApiResponse;
    if (json.TaskStatus !== "completed" || !json.OutputUri) {
      throw new Error(
        `UnrealSpeech: synthesis not completed (status=${json.TaskStatus}).`,
      );
    }

    const audioRes = await fetch(json.OutputUri);
    if (!audioRes.ok) {
      throw new Error(
        `UnrealSpeech: could not download audio (${audioRes.status}).`,
      );
    }
    buffers.push(Buffer.from(await audioRes.arrayBuffer()));
  }

  return Buffer.concat(buffers);
}
