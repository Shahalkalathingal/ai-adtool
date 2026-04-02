/** Single source for master VO length rules (client-safe: no Gemini imports). */
export const MASTER_VOICEOVER_MIN_WORDS = 75;
export const MASTER_VOICEOVER_MAX_WORDS = 90;

/** ~5s read — high Director cap risks TTS clip overlap; soften via dangling-tail trim, not ultra-short cuts. */
export const SCENE_VOICEOVER_MAX_WORDS = 26;

const DANGLING_TAIL_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "for",
  "and",
  "or",
  "nor",
  "but",
  "your",
  "you",
  "our",
  "my",
  "their",
  "its",
  "his",
  "her",
  "from",
  "with",
  "in",
  "on",
  "at",
  "by",
  "as",
  "if",
  "that",
  "what",
  "which",
  "who",
  "whom",
  "this",
  "these",
  "those",
  "when",
  "where",
  "how",
  "why",
  "all",
  "any",
  "each",
  "every",
  "no",
  "not",
  "so",
  "than",
  "too",
  "very",
  "more",
  "most",
  "less",
  "such",
  "only",
  "just",
  "even",
]);

function stripTokenForComparison(token: string): string {
  return token
    .replace(/^[("'“‘`]+/, "")
    .replace(/[.,;:!?'”’")\]]+$/g, "")
    .trim();
}

/**
 * Hard cap word count without ending on "… of your." / "… what you." (legacy bug:
 * naive slice + period).
 */
export function trimWordListToMaxRemovingDanglingTail(
  words: string[],
  maxWords: number,
  minWordsToKeep = 6,
): string[] {
  if (maxWords < minWordsToKeep) minWordsToKeep = Math.max(1, maxWords);
  if (words.length <= maxWords) {
    let out = [...words];
    while (
      out.length > minWordsToKeep &&
      DANGLING_TAIL_WORDS.has(
        stripTokenForComparison(out[out.length - 1]!).toLowerCase(),
      )
    ) {
      out = out.slice(0, -1);
    }
    return out;
  }
  let out = words.slice(0, maxWords);
  while (
    out.length > minWordsToKeep &&
    DANGLING_TAIL_WORDS.has(
      stripTokenForComparison(out[out.length - 1]!).toLowerCase(),
    )
  ) {
    out = out.slice(0, -1);
  }
  return out;
}

export function capWordCountWithCleanEnding(
  text: string,
  maxWords: number,
  minWordsToKeep = 6,
): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const trimmed = trimWordListToMaxRemovingDanglingTail(
    words,
    maxWords,
    minWordsToKeep,
  );
  let s = trimmed.join(" ");
  s = normalizeMasterScriptWhitespace(s);
  if (!s) return "";
  if (!/[.!?]$/.test(s)) s = `${s}.`;
  return s;
}

export function countMasterScriptWords(script: string): number {
  return script.trim().split(/\s+/).filter(Boolean).length;
}

export function normalizeMasterScriptWhitespace(script: string): string {
  return script
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
}
