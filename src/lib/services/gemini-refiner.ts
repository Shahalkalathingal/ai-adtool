import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  refinementPatchSchema,
  type RefinementPatch,
} from "@/lib/types/refinement";
import { getGeminiModelId } from "@/lib/services/gemini-model";

function buildPrompt(timelineJson: string, userPrompt: string): string {
  return `You are an expert video editor AI inside a professional ad timeline tool.

You receive:
1) The user's natural-language instruction.
2) A JSON snapshot of the current timeline (fps, durationInFrames, project, tracks, clipsById).

Rules:
- Output ONLY valid JSON. No markdown fences, no commentary.
- Prefer a PATCH, not a full rewrite. Only include keys that must change.
- You MUST preserve existing clip ids when editing clips — use the exact "id" keys already present in clipsById.
- Durations are in seconds (float). Timeline duration is durationInFrames at fps.
- You may change durationInFrames if the user lengthens or shortens the ad; keep it consistent with clip spans.
- For animationIn, use objects like { "preset": "fade" | "slide" | "zoom" | "none" } — use "none" for no animation.
- For brand colors use hex strings like "#e4e4e7".

Output JSON shape (all top-level keys optional except you must return a patch):
{
  "durationInFrames": number?,
  "project": { "name"?: string, "description"?: string, "metadata"?: object, "brandConfig"?: object },
  "clips": {
     "<clipId>": {
        "startTime"?: number,
        "duration"?: number,
        "label"?: string,
        "transformProps"?: object,
        "content"?: object,
        "animationIn"?: object,
        "clipProperties"?: object,
        "metadata"?: object
     }
  }
}

User instruction:
${userPrompt}

Current timeline JSON:
${timelineJson}`;
}

export async function runGeminiRefiner(input: {
  timelineJson: string;
  prompt: string;
}): Promise<RefinementPatch> {
  const key = process.env.GEMINI_API_KEY;
  if (!key?.trim()) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: getGeminiModelId(),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(
    buildPrompt(input.timelineJson, input.prompt),
  );
  const text = result.response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Refiner returned non-JSON.");
  }

  const checked = refinementPatchSchema.safeParse(parsed);
  if (!checked.success) {
    throw new Error(
      `Refiner JSON invalid: ${checked.error.flatten().formErrors.join("; ")}`,
    );
  }

  return checked.data;
}
