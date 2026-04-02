/**
 * Sequential Gemini HTTP request logging (server process lifetime).
 * Helps verify how many generateContent calls a flow triggers.
 */
let geminiRequestCount = 0;

export function logGeminiRequest(
  phase: string,
  extra?: Record<string, string | number | boolean | undefined>,
): void {
  geminiRequestCount += 1;
  const suffix =
    extra && Object.keys(extra).length > 0 ? ` ${JSON.stringify(extra)}` : "";
  console.log(`[Gemini] #${geminiRequestCount} ${phase}${suffix}`);
}

/** For tests or long-lived dev servers if you need a fresh sequence. */
export function resetGeminiRequestCountForTests(): void {
  geminiRequestCount = 0;
}
