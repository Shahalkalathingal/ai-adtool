"use client";

/**
 * Reads browser-decoded audio duration from a URL.
 * Returns null on timeout / metadata failure.
 */
export async function readAudioDurationSec(
  src: string,
  timeoutMs = 10000,
): Promise<number | null> {
  if (typeof window === "undefined") return null;
  const input = src.trim();
  if (!input) return null;

  return new Promise((resolve) => {
    const audio = new Audio();
    let done = false;
    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      audio.removeAttribute("src");
      audio.load();
      resolve(value);
    };

    const to = window.setTimeout(() => finish(null), timeoutMs);
    const cleanup = () => window.clearTimeout(to);

    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      cleanup();
      const d = audio.duration;
      finish(Number.isFinite(d) && d > 0 ? d : null);
    };
    audio.onerror = () => {
      cleanup();
      finish(null);
    };
    audio.src = input;
  });
}
