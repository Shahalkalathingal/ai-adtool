import type { TimelineState } from "@/lib/types/timeline";

/** JSON snapshot for Gemini Refiner (no functions, stable for patching). */
export function serializeTimelineState(state: TimelineState): Record<string, unknown> {
  return {
    fps: state.fps,
    durationInFrames: state.durationInFrames,
    playheadFrame: state.playheadFrame,
    selectedClipId: state.selectedClipId,
    project: state.project,
    tracks: state.tracks,
    clipsById: state.clipsById,
  };
}
