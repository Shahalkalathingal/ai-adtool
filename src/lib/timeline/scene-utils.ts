import { ClipMediaType } from "@/generated/prisma/enums";
import type { ClipTimelineState, TrackTimelineState } from "@/lib/types/timeline";

export function isEndSceneClip(clip: ClipTimelineState | undefined): boolean {
  if (!clip) return false;
  return clip.metadata?.isEndScene === true;
}

export function laneOf(track: TrackTimelineState): string {
  const m = track.metadata;
  return typeof m?.lane === "string" ? m.lane : "";
}

export function getTrackByLane(
  tracks: TrackTimelineState[],
  lane: string,
): TrackTimelineState | undefined {
  return [...tracks]
    .sort((a, b) => a.index - b.index)
    .find((t) => laneOf(t) === lane);
}

export function findClipsForSceneIndex(
  tracks: TrackTimelineState[],
  clipsById: Record<string, ClipTimelineState>,
  sceneIndex: number,
  lanes: readonly ("visual" | "text" | "voice")[],
): Record<string, ClipTimelineState> {
  const out: Record<string, ClipTimelineState> = {};
  for (const lane of lanes) {
    const tr = getTrackByLane(tracks, lane);
    if (!tr) continue;
    for (const cid of tr.clipIds) {
      const c = clipsById[cid];
      if (!c) continue;
      const si = c.content?.sceneIndex;
      if (typeof si === "number" && si === sceneIndex) {
        out[cid] = c;
      }
    }
  }
  return out;
}

export function listSceneVisualClips(
  tracks: TrackTimelineState[],
  clipsById: Record<string, ClipTimelineState>,
): ClipTimelineState[] {
  const tr = getTrackByLane(tracks, "visual");
  if (!tr) return [];
  return tr.clipIds
    .map((id) => clipsById[id])
    .filter(Boolean)
    .filter((c) => !isEndSceneClip(c))
    .sort((a, b) => a.startTime - b.startTime);
}

export function getEndSceneVisualClip(
  tracks: TrackTimelineState[],
  clipsById: Record<string, ClipTimelineState>,
): ClipTimelineState | undefined {
  const tr = getTrackByLane(tracks, "visual");
  if (!tr) return undefined;
  for (const cid of tr.clipIds) {
    const c = clipsById[cid];
    if (c && isEndSceneClip(c)) return c;
  }
  return undefined;
}

/** Tail time where regular (non-end) visual content ends. */
export function maxEndOfRegularScenes(
  tracks: TrackTimelineState[],
  clipsById: Record<string, ClipTimelineState>,
): number {
  let m = 0;
  const tr = getTrackByLane(tracks, "visual");
  if (!tr) return 0;
  for (const cid of tr.clipIds) {
    const c = clipsById[cid];
    if (!c || isEndSceneClip(c)) continue;
    m = Math.max(m, c.startTime + c.duration);
  }
  return m;
}

export function findClipIdForSceneAndLane(
  tracks: TrackTimelineState[],
  clipsById: Record<string, ClipTimelineState>,
  sceneIndex: number,
  lane: "visual" | "text" | "voice",
): string | null {
  const tr = getTrackByLane(tracks, lane);
  if (!tr) return null;
  for (const cid of tr.clipIds) {
    const c = clipsById[cid];
    if (!c) continue;
    const si = c.content?.sceneIndex;
    if (typeof si === "number" && si === sceneIndex) return cid;
  }
  return null;
}

export function findVoiceClipForScene(
  tracks: TrackTimelineState[],
  clipsById: Record<string, ClipTimelineState>,
  sceneIndex: number,
): ClipTimelineState | null {
  const tr = getTrackByLane(tracks, "voice");
  if (!tr) return null;
  for (const cid of tr.clipIds) {
    const c = clipsById[cid];
    if (!c || c.mediaType !== ClipMediaType.VOICEOVER) continue;
    const si = c.content?.sceneIndex ?? c.clipProperties?.sceneIndex;
    if (typeof si === "number" && si === sceneIndex) return c;
  }
  return null;
}
