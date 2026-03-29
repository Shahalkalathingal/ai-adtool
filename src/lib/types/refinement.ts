import { z } from "zod";

/** Partial timeline update from Gemini Refiner — only include fields that change. */
export const refinementPatchSchema = z.object({
  durationInFrames: z.number().int().min(1).optional(),
  project: z.record(z.string(), z.unknown()).optional(),
  clips: z.record(z.string(), z.any()).optional(),
});

export type RefinementPatch = z.infer<typeof refinementPatchSchema>;
