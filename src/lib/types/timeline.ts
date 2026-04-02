import type { ClipMediaType, TrackType } from "@/generated/prisma/enums";
import type { StudioPanelId } from "@/lib/types/studio-panel";

/** Seconds → frames at a given FPS (floor to align with Remotion integer frames). */
export function secondsToFrames(seconds: number, fps: number): number {
  return Math.max(0, Math.round(seconds * fps));
}

export function framesToSeconds(frames: number, fps: number): number {
  return frames / fps;
}

/** Mirrors `Project` + nested tracks for editor state; ids optional until persisted. */
export type BrandKitState = {
  primaryColor: string;
  secondaryColor: string;
  fontHeading: string;
  fontBody: string;
  logoUrl?: string;
  /** Display name for lower-third (may match project.name). */
  companyName?: string;
  phone?: string;
  address?: string;
  website?: string;
  /** Logo discovered by scrape vs user upload. */
  logoFromScrape?: boolean;
  /** Outro card: optional CTA line under logo. */
  endScreenTagline?: string;
  /** Outro card: large phone (falls back to `phone` when empty). */
  endScreenPhone?: string;
  /** Outro card: hero phone color (Vibe-style burnt orange default in composition). */
  endScreenPhoneColor?: string;
  /** Outro card CTA customization. */
  endScreenCtaText?: string;
  /** CTA button gradient start (expects `#RRGGBB`). */
  endScreenCtaBg1?: string;
  /** CTA button gradient end (expects `#RRGGBB`). */
  endScreenCtaBg2?: string;
  /** CTA button text color (expects `#RRGGBB`). */
  endScreenCtaTextColor?: string;
  /** Brand slogan / tagline (header + trust layer). */
  tagline?: string;
  /** Bottom banner: primary brand name color. */
  bannerBrandNameColor?: string;
  /** Bottom banner: detail line color (address / website). */
  bannerDetailColor?: string;
  /** Bottom banner: phone number color. */
  bannerPhoneColor?: string;
  /** Bottom banner: phone scale multiplier (0.8–1.4). */
  bannerPhoneScale?: number;
  /** Header banner: brand name color. */
  headerBrandNameColor?: string;
  /** Header banner: slogan color. */
  headerSloganColor?: string;
  /** Header banner: text scale multiplier. */
  headerBrandScale?: number;
  /** Header banner: logo size scale multiplier. */
  headerLogoScale?: number;
  /** QR overlay: outline color. */
  qrOutlineColor?: string;
  /** QR overlay: outline stroke width in px. */
  qrOutlineWidth?: number;
};

export type ProjectTimelineMeta = {
  id?: string;
  name: string;
  description?: string;
  metadata: Record<string, unknown>;
  brandConfig: BrandKitState & Record<string, unknown>;
};

export type ClipTransformProps = {
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
  blur?: number;
  width?: number;
  height?: number;
  anchorX?: number;
  anchorY?: number;
  keyframes?: Record<string, unknown>;
};

/** Open-ended bucket for advanced / future-facing clip fields (filters, blend mode, captions, etc.). */
export type ClipPropertiesBag = Record<string, unknown>;

export type ClipTimelineState = {
  id: string;
  trackId: string;
  startTime: number;
  duration: number;
  mediaType: ClipMediaType;
  assetUrl?: string | null;
  label?: string | null;
  transformProps: ClipTransformProps;
  clipProperties: ClipPropertiesBag;
  content: Record<string, unknown> | null;
  audioProps: Record<string, unknown> | null;
  animationIn: Record<string, unknown> | null;
  animationOut: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
};

export type TrackTimelineState = {
  id: string;
  projectId?: string;
  type: TrackType;
  index: number;
  name?: string | null;
  metadata: Record<string, unknown>;
  clipIds: string[];
};

export type TimelineState = {
  fps: number;
  /** Total timeline length in frames (e.g. 30s × 30fps = 900). */
  durationInFrames: number;
  project: ProjectTimelineMeta;
  tracks: TrackTimelineState[];
  clipsById: Record<string, ClipTimelineState>;
  /** Frame position for playhead / scrubber. */
  playheadFrame: number;
  /** Transport: timeline playback (drives playhead + Remotion preview). */
  isPlaying: boolean;
  /** Inspector selection (one clip at a time). */
  selectedClipId: string | null;
  /** Set to true once Director successfully hydrates the timeline. */
  directorPlanApplied: boolean;
  /** True while director generation is running (scrape + plan from the URL captured on studio home). */
  directorGenerationBusy: boolean;
  /** True while voiceover audio is being applied and clips are remapped to match. */
  voiceoverSyncBusy: boolean;
  /** Incremented on each Director hydrate — drives one-shot auto voiceover. */
  directorHydrateVersion: number;
  /** Studio left rail: contextual panel. */
  studioPanel: StudioPanelId;
};
