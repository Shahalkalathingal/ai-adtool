import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { ClipMediaType, TrackType } from "@/generated/prisma/enums";
import { buildTimelineFromDirectorPlan } from "@/lib/timeline/build-from-director";
import type {
  ContactHints,
  ScrapedPageIntel,
} from "@/lib/services/firecrawl-scrape";
import type { DirectorPlan } from "@/lib/types/director-plan";
import type { StudioPanelId } from "@/lib/types/studio-panel";
import type { RefinementPatch } from "@/lib/types/refinement";
import {
  findClipsForSceneIndex,
  getEndSceneVisualClip,
  isEndSceneClip,
  listSceneVisualClips,
  maxEndOfRegularScenes,
  getTrackByLane,
} from "@/lib/timeline/scene-utils";
import {
  framesToSeconds,
  secondsToFrames,
  type ClipTimelineState,
  type TimelineState,
  type TrackTimelineState,
} from "@/lib/types/timeline";

const DEFAULT_FPS = 30;

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function sortTracks(tracks: TrackTimelineState[]): TrackTimelineState[] {
  return [...tracks].sort((a, b) => a.index - b.index);
}

function recomputeTimelineDuration(state: TimelineState) {
  let maxEnd = 0;
  for (const c of Object.values(state.clipsById)) {
    maxEnd = Math.max(maxEnd, c.startTime + c.duration);
  }
  state.durationInFrames = secondsToFrames(maxEnd, state.fps);
  state.project.metadata = {
    ...state.project.metadata,
    targetDurationSec: maxEnd,
  };
  const musicTr = getTrackByLane(state.tracks, "music");
  if (musicTr) {
    for (const cid of musicTr.clipIds) {
      const mc = state.clipsById[cid];
      if (mc?.mediaType === ClipMediaType.MUSIC) {
        mc.startTime = 0;
        mc.duration = maxEnd;
      }
    }
  }
}

function relayoutEndScreen(state: TimelineState) {
  const endVis = getEndSceneVisualClip(state.tracks, state.clipsById);
  if (!endVis) {
    recomputeTimelineDuration(state);
    return;
  }
  const tail = maxEndOfRegularScenes(state.tracks, state.clipsById);
  const si = endVis.content?.sceneIndex;
  if (typeof si !== "number") {
    recomputeTimelineDuration(state);
    return;
  }
  const grouped = findClipsForSceneIndex(state.tracks, state.clipsById, si, [
    "visual",
    "text",
    "voice",
  ]);
  for (const c of Object.values(grouped)) {
    c.startTime = tail;
  }
  recomputeTimelineDuration(state);
}

const HERO_SEC = 26;
const END_SCENE_SEC = 4;

/** Seed timeline for editor boot — replace with `hydrateFromApi` when projects load from Postgres. */
export function createInitialTimeline(projectId: string): TimelineState {
  const fps = DEFAULT_FPS;
  const totalSec = HERO_SEC + END_SCENE_SEC;
  const durationInFrames = secondsToFrames(totalSec, fps);

  const visualId = uid("tr");
  const textId = uid("tr");
  const musicId = uid("tr");
  const voiceId = uid("tr");

  const clipVisHero = uid("cl");
  const clipVisEnd = uid("cl");
  const clipTextHero = uid("cl");
  const clipTextEnd = uid("cl");
  const clipVoHero = uid("cl");
  const clipVoEnd = uid("cl");
  const clipMusic = uid("cl");

  const tracks: TrackTimelineState[] = sortTracks([
    {
      id: visualId,
      projectId,
      type: TrackType.VISUAL,
      index: 0,
      name: "Scenes",
      metadata: { lane: "visual" },
      clipIds: [clipVisHero, clipVisEnd],
    },
    {
      id: textId,
      projectId,
      type: TrackType.TEXT,
      index: 1,
      name: "Headlines",
      metadata: { lane: "text" },
      clipIds: [clipTextHero, clipTextEnd],
    },
    {
      id: musicId,
      projectId,
      type: TrackType.AUDIO,
      index: 2,
      name: "Music",
      metadata: { lane: "music" },
      clipIds: [clipMusic],
    },
    {
      id: voiceId,
      projectId,
      type: TrackType.AUDIO,
      index: 3,
      name: "Voiceover",
      metadata: { lane: "voice" },
      clipIds: [clipVoHero, clipVoEnd],
    },
  ]);

  const clipsById: Record<string, ClipTimelineState> = {
    [clipVisHero]: {
      id: clipVisHero,
      trackId: visualId,
      startTime: 0,
      duration: HERO_SEC,
      mediaType: ClipMediaType.VIDEO,
      assetUrl: null,
      label: "Scene 1",
      transformProps: {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
      },
      clipProperties: { sceneIndex: 0 },
      content: {
        sceneIndex: 0,
        headline: "Your headline",
        scriptBeat: "Hook",
      },
      audioProps: null,
      animationIn: { preset: "fade", durationSec: 0.4 },
      animationOut: null,
      metadata: {},
    },
    [clipVisEnd]: {
      id: clipVisEnd,
      trackId: visualId,
      startTime: HERO_SEC,
      duration: END_SCENE_SEC,
      mediaType: ClipMediaType.VIDEO,
      assetUrl: null,
      label: "End screen",
      transformProps: { opacity: 1, scaleX: 1, scaleY: 1 },
      clipProperties: { sceneIndex: 1, isEndScene: true },
      content: { sceneIndex: 1, headline: "" },
      audioProps: null,
      animationIn: null,
      animationOut: null,
      metadata: { isEndScene: true },
    },
    [clipTextHero]: {
      id: clipTextHero,
      trackId: textId,
      startTime: 0,
      duration: HERO_SEC,
      mediaType: ClipMediaType.TEXT,
      assetUrl: null,
      label: "Your headline",
      transformProps: { opacity: 1 },
      clipProperties: { sceneIndex: 0 },
      content: { sceneIndex: 0, text: "Your headline" },
      audioProps: null,
      animationIn: { preset: "slide", direction: "up", durationSec: 0.45 },
      animationOut: null,
      metadata: {},
    },
    [clipTextEnd]: {
      id: clipTextEnd,
      trackId: textId,
      startTime: HERO_SEC,
      duration: END_SCENE_SEC,
      mediaType: ClipMediaType.TEXT,
      assetUrl: null,
      label: "End screen",
      transformProps: { opacity: 1 },
      clipProperties: { sceneIndex: 1 },
      content: { sceneIndex: 1, text: "" },
      audioProps: null,
      animationIn: null,
      animationOut: null,
      metadata: { isEndScene: true },
    },
    [clipVoHero]: {
      id: clipVoHero,
      trackId: voiceId,
      startTime: 0,
      duration: HERO_SEC,
      mediaType: ClipMediaType.VOICEOVER,
      assetUrl: null,
      label: "VO · Scene 1",
      transformProps: {},
      clipProperties: { sceneIndex: 0 },
      content: { sceneIndex: 0, script: "" },
      audioProps: { gainDb: 0, duckUnderMusicDb: -12 },
      animationIn: null,
      animationOut: null,
      metadata: {},
    },
    [clipVoEnd]: {
      id: clipVoEnd,
      trackId: voiceId,
      startTime: HERO_SEC,
      duration: END_SCENE_SEC,
      mediaType: ClipMediaType.VOICEOVER,
      assetUrl: null,
      label: "VO · End",
      transformProps: {},
      clipProperties: { sceneIndex: 1 },
      content: { sceneIndex: 1, script: "" },
      audioProps: { gainDb: 0, duckUnderMusicDb: -12 },
      animationIn: null,
      animationOut: null,
      metadata: { isEndScene: true },
    },
    [clipMusic]: {
      id: clipMusic,
      trackId: musicId,
      startTime: 0,
      duration: totalSec,
      mediaType: ClipMediaType.MUSIC,
      assetUrl: null,
      label: "Music bed",
      transformProps: {},
      clipProperties: { loudnessLUFS: -14 },
      content: null,
      audioProps: { gainDb: -8 },
      animationIn: null,
      animationOut: null,
      metadata: {},
    },
  };

  return {
    fps,
    durationInFrames,
    project: {
      id: projectId,
      name: "Untitled ad",
      description: undefined,
      metadata: {
        targetDurationSec: totalSec,
        aspectRatio: "16:9",
        previewSubtitle: "Remotion preview · 16:9",
        phone: "",
        address: "",
        website: "",
        websiteUrl: "",
        brandDisplayName: "",
        logoUrl: "",
        showQrOverlay: true,
        selectedMusicPresetId: "none",
      },
      brandConfig: {
        primaryColor: "#fafafa",
        secondaryColor: "#a1a1aa",
        fontHeading: "Geist Sans",
        fontBody: "Geist Sans",
        companyName: "Untitled ad",
        logoFromScrape: false,
        endScreenTagline: "Call us today",
        endScreenPhone: "",
      },
    },
    tracks,
    clipsById,
    playheadFrame: 0,
    isPlaying: false,
    selectedClipId: null,
    studioPanel: "slideshow",
 };
}

type TimelineActions = {
  setIsPlaying: (playing: boolean) => void;
  togglePlayback: () => void;
  setPlayheadFrame: (frame: number) => void;
  setDurationSeconds: (seconds: number) => void;
  setFps: (fps: number) => void;
  updateClip: (clipId: string, patch: Partial<ClipTimelineState>) => void;
  updateClipTransform: (
    clipId: string,
    patch: Partial<ClipTimelineState["transformProps"]>,
  ) => void;
  updateClipProperties: (
    clipId: string,
    patch: Record<string, unknown>,
  ) => void;
  /** Alias for merge-style updates (used by inspector / refiner). */
  updateClipProperty: (clipId: string, patch: Partial<ClipTimelineState>) => void;
  setBrandKit: (patch: Partial<TimelineState["project"]["brandConfig"]>) => void;
  /** Merge project name / description / metadata / brand (inspector + scrape). */
  updateProject: (patch: {
    name?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    brandConfig?: Partial<TimelineState["project"]["brandConfig"]>;
  }) => void;
  setStudioPanel: (panel: StudioPanelId) => void;
  /** Select clip and switch Studio contextual tab to match lane. */
  selectClipWithStudioTab: (clipId: string) => void;
  /** Move visual + headline + VO for one scene together (non–end scenes). */
  moveSceneGroupByVisualClipId: (
    visualClipId: string,
    newStartTime: number,
  ) => void;
  setSelectedClipId: (clipId: string | null) => void;
  /** Move / trim with min duration; extends timeline if clip end exceeds total. */
  setClipTiming: (
    clipId: string,
    timing: { startTime?: number; duration?: number },
  ) => void;
  /** Moves clip to a new start time (seconds), clamped to timeline length. */
  moveClip: (clipId: string, startTime: number) => void;
  applyRefinementPatch: (patch: RefinementPatch) => void;
  /** Set generated VO asset URL on all voiceover clips + project metadata. */
  setVoiceoverAsset: (publicUrl: string, estimateSec?: number) => void;
  resetForProject: (projectId: string) => void;
  /** Replace timeline with a Gemini + Firecrawl director plan (30s+ multi-track). */
  hydrateFromDirectorPlan: (
    plan: DirectorPlan,
    projectId: string,
    options?: {
      sourceUrl?: string;
      contactHints?: ContactHints;
      pageIntel?: ScrapedPageIntel;
    },
  ) => void;
};

export type TimelineStore = TimelineState & TimelineActions;

export const useTimelineStore = create<TimelineStore>()(
  immer((set) => ({
    ...createInitialTimeline("draft"),

    setIsPlaying: (playing) =>
      set((state) => {
        state.isPlaying = playing;
      }),

    togglePlayback: () =>
      set((state) => {
        state.isPlaying = !state.isPlaying;
      }),

    setPlayheadFrame: (frame) =>
      set((state) => {
        const max = Math.max(0, state.durationInFrames - 1);
        state.playheadFrame = Math.min(Math.max(0, frame), max);
      }),

    setDurationSeconds: (seconds) =>
      set((state) => {
        const s = Math.max(1, seconds);
        state.durationInFrames = secondsToFrames(s, state.fps);
        state.project.metadata = {
          ...state.project.metadata,
          targetDurationSec: s,
        };
      }),

    setFps: (fps) =>
      set((state) => {
        const next = Math.max(1, Math.round(fps));
        const seconds = framesToSeconds(state.durationInFrames, state.fps);
        state.fps = next;
        state.durationInFrames = secondsToFrames(seconds, next);
      }),

    updateClip: (clipId, patch) =>
      set((state) => {
        const clip = state.clipsById[clipId];
        if (!clip) return;
        Object.assign(clip, patch);
      }),

    updateClipTransform: (clipId, patch) =>
      set((state) => {
        const clip = state.clipsById[clipId];
        if (!clip) return;
        clip.transformProps = { ...clip.transformProps, ...patch };
      }),

    updateClipProperties: (clipId, patch) =>
      set((state) => {
        const clip = state.clipsById[clipId];
        if (!clip) return;
        clip.clipProperties = { ...clip.clipProperties, ...patch };
      }),

    updateClipProperty: (clipId, patch) =>
      set((state) => {
        const clip = state.clipsById[clipId];
        if (!clip) return;
        Object.assign(clip, patch);
      }),

    setSelectedClipId: (clipId) =>
      set((state) => {
        state.selectedClipId = clipId;
      }),

    setClipTiming: (clipId, timing) =>
      set((state) => {
        const clip = state.clipsById[clipId];
        if (!clip) return;
        const minDur = 0.35;
        let nextStart = timing.startTime ?? clip.startTime;
        let nextDur = timing.duration ?? clip.duration;
        nextDur = Math.max(minDur, nextDur);
        nextStart = Math.max(0, nextStart);
        const end = nextStart + nextDur;
        let timelineSec = framesToSeconds(state.durationInFrames, state.fps);
        if (end > timelineSec) {
          state.durationInFrames = secondsToFrames(end, state.fps);
          state.project.metadata = {
            ...state.project.metadata,
            targetDurationSec: end,
          };
          timelineSec = end;
        }
        const maxStart = Math.max(0, timelineSec - nextDur);
        clip.startTime = Math.min(nextStart, maxStart);
        clip.duration = Math.min(nextDur, timelineSec - clip.startTime);
        relayoutEndScreen(state);
      }),

    moveSceneGroupByVisualClipId: (visualClipId, newStartTime) =>
      set((state) => {
        const clip = state.clipsById[visualClipId];
        if (!clip || isEndSceneClip(clip)) return;
        const si = clip.content?.sceneIndex;
        if (typeof si !== "number") return;
        const regular = listSceneVisualClips(state.tracks, state.clipsById);
        const idx = regular.findIndex((c) => c.id === visualClipId);
        if (idx < 0) return;
        const endVis = getEndSceneVisualClip(state.tracks, state.clipsById);
        const endStart = endVis?.startTime ?? Infinity;
        const prev = regular[idx - 1];
        const next = regular[idx + 1];
        const minStart = prev ? prev.startTime + prev.duration : 0;
        const maxStart = Math.min(
          next ? next.startTime - clip.duration : endStart - clip.duration,
          endStart - clip.duration,
        );
        const clamped = Math.min(Math.max(minStart, newStartTime), maxStart);
        const delta = clamped - clip.startTime;
        if (Math.abs(delta) < 1e-6) return;
        const grouped = findClipsForSceneIndex(
          state.tracks,
          state.clipsById,
          si,
          ["visual", "text", "voice"],
        );
        for (const c of Object.values(grouped)) {
          c.startTime = Math.max(0, c.startTime + delta);
        }
        relayoutEndScreen(state);
      }),

    setBrandKit: (patch) =>
      set((state) => {
        state.project.brandConfig = { ...state.project.brandConfig, ...patch };
      }),

    updateProject: (patch) =>
      set((state) => {
        if (patch.name !== undefined) state.project.name = patch.name;
        if (patch.description !== undefined) {
          state.project.description = patch.description;
        }
        if (patch.metadata) {
          state.project.metadata = {
            ...state.project.metadata,
            ...patch.metadata,
          };
        }
        if (patch.brandConfig) {
          state.project.brandConfig = {
            ...state.project.brandConfig,
            ...patch.brandConfig,
          };
        }
      }),

    setStudioPanel: (panel) =>
      set((state) => {
        state.studioPanel = panel;
      }),

    selectClipWithStudioTab: (clipId) =>
      set((state) => {
        state.selectedClipId = clipId;
        const clip = state.clipsById[clipId];
        if (!clip) return;
        if (isEndSceneClip(clip)) {
          state.studioPanel = "endScreen";
          return;
        }
        const track = state.tracks.find((t) => t.id === clip.trackId);
        const lane =
          typeof track?.metadata?.lane === "string"
            ? track.metadata.lane
            : "";
        if (lane === "visual") state.studioPanel = "slideshow";
        else if (lane === "text") state.studioPanel = "slideshow";
        else if (lane === "music") state.studioPanel = "music";
        else if (lane === "voice") state.studioPanel = "voice";
        else state.studioPanel = "slideshow";
      }),

    moveClip: (clipId, startTime) =>
      set((state) => {
        const clip = state.clipsById[clipId];
        if (!clip) return;
        const timelineSec = framesToSeconds(state.durationInFrames, state.fps);
        const maxStart = Math.max(0, timelineSec - clip.duration);
        clip.startTime = Math.min(Math.max(0, startTime), maxStart);
        relayoutEndScreen(state);
      }),

    setVoiceoverAsset: (publicUrl, estimateSec) =>
      set((state) => {
        state.project.metadata = {
          ...state.project.metadata,
          voiceoverAudioUrl: publicUrl,
          ...(estimateSec != null
            ? { voiceoverEstimateSec: estimateSec }
            : {}),
        };
        for (const c of Object.values(state.clipsById)) {
          if (c.mediaType === ClipMediaType.VOICEOVER) {
            c.assetUrl = publicUrl;
          }
        }
      }),

    applyRefinementPatch: (patch) =>
      set((state) => {
        if (patch.durationInFrames != null) {
          state.durationInFrames = Math.max(1, patch.durationInFrames);
        }
        if (patch.project) {
          const p = patch.project as Record<string, unknown>;
          if (typeof p.name === "string") state.project.name = p.name;
          if ("description" in p) {
            state.project.description =
              typeof p.description === "string" ? p.description : undefined;
          }
          if (p.metadata && typeof p.metadata === "object") {
            state.project.metadata = {
              ...state.project.metadata,
              ...(p.metadata as Record<string, unknown>),
            };
          }
          if (p.brandConfig && typeof p.brandConfig === "object") {
            state.project.brandConfig = {
              ...state.project.brandConfig,
              ...(p.brandConfig as Record<string, unknown>),
            };
          }
        }
        if (patch.clips) {
          for (const [id, raw] of Object.entries(patch.clips)) {
            const clip = state.clipsById[id];
            if (!clip) continue;
            const c = raw as Record<string, unknown>;
            if (typeof c.startTime === "number") clip.startTime = c.startTime;
            if (typeof c.duration === "number") clip.duration = c.duration;
            if ("label" in c) {
              clip.label =
                typeof c.label === "string" || c.label === null ? c.label : clip.label;
            }
            if ("assetUrl" in c) {
              clip.assetUrl =
                typeof c.assetUrl === "string" || c.assetUrl === null
                  ? c.assetUrl
                  : clip.assetUrl;
            }
            if (c.transformProps && typeof c.transformProps === "object") {
              clip.transformProps = {
                ...clip.transformProps,
                ...(c.transformProps as ClipTimelineState["transformProps"]),
              };
            }
            if (c.clipProperties && typeof c.clipProperties === "object") {
              clip.clipProperties = {
                ...clip.clipProperties,
                ...(c.clipProperties as Record<string, unknown>),
              };
            }
            if ("content" in c) {
              if (c.content === null) clip.content = null;
              else if (c.content && typeof c.content === "object") {
                clip.content = {
                  ...(clip.content ?? {}),
                  ...(c.content as Record<string, unknown>),
                };
              }
            }
            if (c.audioProps && typeof c.audioProps === "object") {
              clip.audioProps = {
                ...(clip.audioProps ?? {}),
                ...(c.audioProps as Record<string, unknown>),
              };
            }
            if ("animationIn" in c) {
              clip.animationIn =
                c.animationIn === null
                  ? null
                  : ({
                      ...(clip.animationIn ?? {}),
                      ...(c.animationIn as object),
                    } as ClipTimelineState["animationIn"]);
            }
            if ("animationOut" in c) {
              clip.animationOut =
                c.animationOut === null
                  ? null
                  : ({
                      ...(clip.animationOut ?? {}),
                      ...(c.animationOut as object),
                    } as ClipTimelineState["animationOut"]);
            }
            if (c.metadata && typeof c.metadata === "object") {
              clip.metadata = {
                ...clip.metadata,
                ...(c.metadata as Record<string, unknown>),
              };
            }
          }
        }
        relayoutEndScreen(state);
      }),

    resetForProject: (projectId) =>
      set((state) => {
        const next = createInitialTimeline(projectId);
        state.fps = next.fps;
        state.durationInFrames = next.durationInFrames;
        state.project = next.project;
        state.tracks = next.tracks;
        state.clipsById = next.clipsById;
        state.playheadFrame = 0;
        state.isPlaying = false;
        state.selectedClipId = next.selectedClipId;
        state.studioPanel = next.studioPanel;
      }),

    hydrateFromDirectorPlan: (plan, projectId, options) =>
      set((state) => {
        const built = buildTimelineFromDirectorPlan(
          plan,
          projectId,
          state.fps,
          options,
        );
        state.durationInFrames = built.durationInFrames;
        state.project = built.project;
        state.tracks = built.tracks;
        state.clipsById = built.clipsById;
        state.playheadFrame = 0;
        state.isPlaying = false;
        state.selectedClipId = null;
        state.studioPanel = "bottomBanner";
        relayoutEndScreen(state);
      }),
  })),
);
