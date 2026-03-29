import type { ClipTimelineState, TrackTimelineState } from "@/lib/types/timeline";
import { framesToSeconds } from "@/lib/types/timeline";

/** Prefer text, then visual, for preview headline at a frame. */
export function getPreviewClipAtFrame(
  frame: number,
  fps: number,
  tracks: TrackTimelineState[],
  clipsById: Record<string, ClipTimelineState>,
): ClipTimelineState | null {
  const t = framesToSeconds(frame, fps);
  const ordered = [...tracks].sort((a, b) => a.index - b.index);
  const candidates: ClipTimelineState[] = [];

  for (const tr of ordered) {
    const lane =
      typeof tr.metadata?.lane === "string" ? tr.metadata.lane : "";
    if (lane !== "text" && lane !== "visual") continue;
    for (const cid of tr.clipIds) {
      const c = clipsById[cid];
      if (!c) continue;
      if (t >= c.startTime && t < c.startTime + c.duration) {
        candidates.push(c);
      }
    }
  }

  const text = candidates.find((c) => c.content && "text" in (c.content as object));
  if (text) return text;
  return candidates[0] ?? null;
}

export function headlineFromClip(clip: ClipTimelineState | null): string {
  if (!clip?.content) return "";
  const c = clip.content as Record<string, unknown>;
  if (typeof c.text === "string") return c.text;
  if (typeof c.headline === "string") return c.headline;
  return "";
}
