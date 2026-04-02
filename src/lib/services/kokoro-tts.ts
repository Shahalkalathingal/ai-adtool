import type { GenerateOptions } from "kokoro-js";
import { DEFAULT_KOKORO_TTS_VOICE } from "@/lib/voiceover/kokoro-voices";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

const SAMPLE_RATE = 24_000;

let ttsSingleton: Promise<import("kokoro-js").KokoroTTS> | null = null;

async function getKokoro(): Promise<import("kokoro-js").KokoroTTS> {
  if (!ttsSingleton) {
    ttsSingleton = (async () => {
      const { KokoroTTS } = await import("kokoro-js");
      return KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: "q8",
        device: "cpu",
      });
    })();
  }
  return ttsSingleton;
}

function resolveVoice(override?: string): NonNullable<GenerateOptions["voice"]> {
  const fromEnv = process.env.KOKORO_TTS_VOICE?.trim();
  const v = ((override ?? fromEnv) || DEFAULT_KOKORO_TTS_VOICE) as NonNullable<
    GenerateOptions["voice"]
  >;
  return v;
}

/**
 * Kokoro truncates long inputs at the tokenizer; split into speakable pieces and merge PCM.
 */
function speechChunks(text: string, maxLen = 380): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  let cur = "";
  const pushCur = () => {
    const t = cur.trim();
    if (t) out.push(t);
    cur = "";
  };

  for (const s of sentences) {
    if (s.length <= maxLen) {
      const next = cur ? `${cur} ${s}` : s;
      if (next.length <= maxLen) {
        cur = next;
      } else {
        pushCur();
        cur = s;
      }
    } else {
      pushCur();
      for (let i = 0; i < s.length; i += maxLen) {
        out.push(s.slice(i, i + maxLen).trim());
      }
    }
  }
  pushCur();
  return out;
}

export type KokoroTtsOptions = {
  voice?: string;
  speed?: number;
};

/**
 * Returns a WAV file buffer (RIFF) suitable for `audio/wav` uploads and browser playback.
 */
export async function synthesizeKokoroTts(
  text: string,
  options?: KokoroTtsOptions,
): Promise<Buffer> {
  const trimmed = text.trim();
  if (trimmed.length < 1) {
    throw new Error("Kokoro TTS: empty text.");
  }

  const tts = await getKokoro();
  const voice = resolveVoice(options?.voice);
  const speed = options?.speed ?? 1;

  const chunks = speechChunks(trimmed);
  if (chunks.length === 0) {
    throw new Error("Kokoro TTS: no speakable text.");
  }

  const floatParts: Float32Array[] = [];
  for (const piece of chunks) {
    const raw = await tts.generate(piece, { voice, speed });
    floatParts.push(raw.audio);
  }

  const totalSamples = floatParts.reduce((n, a) => n + a.length, 0);
  const merged = new Float32Array(totalSamples);
  let offset = 0;
  for (const part of floatParts) {
    merged.set(part, offset);
    offset += part.length;
  }

  const { RawAudio } = await import("@huggingface/transformers");
  const wav = new RawAudio(merged, SAMPLE_RATE).toWav();
  return Buffer.from(wav);
}
