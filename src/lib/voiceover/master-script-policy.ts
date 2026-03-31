/** Single source for master VO length rules (client-safe: no Gemini imports). */
export const MASTER_VOICEOVER_MIN_WORDS = 75;
export const MASTER_VOICEOVER_MAX_WORDS = 90;

export function countMasterScriptWords(script: string): number {
  return script.trim().split(/\s+/).filter(Boolean).length;
}

export function normalizeMasterScriptWhitespace(script: string): string {
  return script
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;!?])/g, "$1")
    .trim();
}
