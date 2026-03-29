/** Model id for @google/generative-ai (see https://ai.google.dev/gemini-api/docs/models/gemini). */
export function getGeminiModelId(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}
