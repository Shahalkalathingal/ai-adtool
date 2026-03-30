import { ClipMediaType, TrackType } from "@/generated/prisma/enums";
import type {
  ContactHints,
  ScrapedPageIntel,
} from "@/lib/services/firecrawl-scrape";
import type { DirectorPlan } from "@/lib/types/director-plan";
import {
  framesToSeconds,
  secondsToFrames,
  type ClipTimelineState,
  type ProjectTimelineMeta,
  type TrackTimelineState,
} from "@/lib/types/timeline";

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

function sortTracks(tracks: TrackTimelineState[]): TrackTimelineState[] {
  return [...tracks].sort((a, b) => a.index - b.index);
}

export type BuiltDirectorTimeline = {
  durationInFrames: number;
  project: ProjectTimelineMeta;
  tracks: TrackTimelineState[];
  clipsById: Record<string, ClipTimelineState>;
};

/**
 * Maps a Gemini Director plan onto multi-track editor state (visual, text, music, VO).
 */
export function buildTimelineFromDirectorPlan(
  plan: DirectorPlan,
  projectId: string,
  fps: number,
  options?: {
    sourceUrl?: string;
    contactHints?: ContactHints;
    pageIntel?: ScrapedPageIntel;
  },
): BuiltDirectorTimeline {
  const END_SCENE_SEC = 4;
  const bodyDuration = plan.totalDurationSec;
  const totalDuration = bodyDuration + END_SCENE_SEC;
  const durationInFrames = secondsToFrames(totalDuration, fps);

  const endDurFrames = secondsToFrames(END_SCENE_SEC, fps);
  const endDurSec = framesToSeconds(endDurFrames, fps);
  const bodyFramesTarget = Math.max(0, durationInFrames - endDurFrames);
  const totalDurationSecSnapped = framesToSeconds(durationInFrames, fps);

  const visualTrackId = uid("tr");
  const textTrackId = uid("tr");
  const musicTrackId = uid("tr");
  const voiceTrackId = uid("tr");

  const clipsById: Record<string, ClipTimelineState> = {};
  const visualClipIds: string[] = [];
  const textClipIds: string[] = [];
  const voiceClipIds: string[] = [];

  const pool = plan.productImageUrls.filter(
    (u) => typeof u === "string" && u.startsWith("http"),
  );
  const sb = plan.scrapedBrand;

  let cursorFrames = 0;
  for (const [i, scene] of plan.scenes.entries()) {
    let durFrames = secondsToFrames(scene.durationSec, fps);
    const isLastScene = i === plan.scenes.length - 1;
    if (isLastScene) {
      // Ensure body scenes end exactly on the last frame before the outro.
      durFrames = Math.max(1, bodyFramesTarget - cursorFrames);
    } else {
      const remaining = bodyFramesTarget - cursorFrames;
      durFrames = Math.max(1, Math.min(durFrames, remaining));
    }
    const startTime = framesToSeconds(cursorFrames, fps);
    const dur = framesToSeconds(durFrames, fps);

    const explicit =
      scene.imageUrl && scene.imageUrl.startsWith("http")
        ? scene.imageUrl
        : undefined;
    const cycled = pool.length ? pool[scene.index % pool.length] : undefined;
    const assetUrl = explicit ?? cycled ?? null;

    const vId = uid("cl");
    visualClipIds.push(vId);
    clipsById[vId] = {
      id: vId,
      trackId: visualTrackId,
      startTime,
      duration: dur,
      mediaType: ClipMediaType.VIDEO,
      assetUrl,
      label: scene.title,
      transformProps: { opacity: 1, scaleX: 1, scaleY: 1 },
      clipProperties: {
        visualTreatment: scene.visualTreatment,
        sceneIndex: scene.index,
      },
      content: {
        sceneIndex: scene.index,
        headline: scene.headline,
        subcopy: scene.subcopy,
      },
      audioProps: null,
      animationIn: { preset: "fade", durationSec: 0.35 },
      animationOut: null,
      metadata: {},
    };

    const tId = uid("cl");
    textClipIds.push(tId);
    clipsById[tId] = {
      id: tId,
      trackId: textTrackId,
      startTime,
      duration: dur,
      mediaType: ClipMediaType.TEXT,
      assetUrl: null,
      label: scene.headline,
      transformProps: { opacity: 1 },
      clipProperties: { role: "headline", sceneIndex: scene.index },
      content: {
        sceneIndex: scene.index,
        text: scene.headline,
        subcopy: scene.subcopy,
      },
      audioProps: null,
      animationIn: { preset: "slide", direction: "up", durationSec: 0.4 },
      animationOut: null,
      metadata: {},
    };

    const voId = uid("cl");
    voiceClipIds.push(voId);
    clipsById[voId] = {
      id: voId,
      trackId: voiceTrackId,
      startTime,
      duration: dur,
      mediaType: ClipMediaType.VOICEOVER,
      assetUrl: null,
      label: `VO · ${scene.title}`,
      transformProps: {},
      clipProperties: { sceneIndex: scene.index },
      content: { script: scene.voiceover },
      audioProps: { gainDb: 0, duckUnderMusicDb: -12 },
      animationIn: null,
      animationOut: null,
      metadata: {},
    };

    cursorFrames += durFrames;
  }

  const endSceneIndex = plan.scenes.length;
  const endStart = framesToSeconds(cursorFrames, fps);
  const vEnd = uid("cl");
  const tEnd = uid("cl");
  const voEnd = uid("cl");
  visualClipIds.push(vEnd);
  textClipIds.push(tEnd);
  voiceClipIds.push(voEnd);

  clipsById[vEnd] = {
    id: vEnd,
    trackId: visualTrackId,
    startTime: endStart,
    duration: endDurSec,
    mediaType: ClipMediaType.VIDEO,
    assetUrl: null,
    label: "End screen",
    transformProps: { opacity: 1, scaleX: 1, scaleY: 1 },
    clipProperties: { sceneIndex: endSceneIndex, isEndScene: true },
    content: { sceneIndex: endSceneIndex, headline: "" },
    audioProps: null,
    animationIn: null,
    animationOut: null,
    metadata: { isEndScene: true },
  };
  clipsById[tEnd] = {
    id: tEnd,
    trackId: textTrackId,
    startTime: endStart,
    duration: endDurSec,
    mediaType: ClipMediaType.TEXT,
    assetUrl: null,
    label: "End screen",
    transformProps: { opacity: 1 },
    clipProperties: { role: "end", sceneIndex: endSceneIndex },
    content: { sceneIndex: endSceneIndex, text: "" },
    audioProps: null,
    animationIn: null,
    animationOut: null,
    metadata: { isEndScene: true },
  };
  clipsById[voEnd] = {
    id: voEnd,
    trackId: voiceTrackId,
    startTime: endStart,
    duration: endDurSec,
    mediaType: ClipMediaType.VOICEOVER,
    assetUrl: null,
    label: "VO · End",
    transformProps: {},
    clipProperties: { sceneIndex: endSceneIndex },
    content: { sceneIndex: endSceneIndex, script: "" },
    audioProps: { gainDb: 0, duckUnderMusicDb: -12 },
    animationIn: null,
    animationOut: null,
    metadata: { isEndScene: true },
  };

  const musicClipId = uid("cl");
  clipsById[musicClipId] = {
    id: musicClipId,
    trackId: musicTrackId,
    startTime: 0,
    duration: totalDurationSecSnapped,
    mediaType: ClipMediaType.MUSIC,
    assetUrl: null,
    label: `Music · ${plan.musicMood}`,
    transformProps: {},
    clipProperties: { mood: plan.musicMood },
    content: { mood: plan.musicMood },
    audioProps: { gainDb: -8 },
    animationIn: null,
    animationOut: null,
    metadata: {},
  };

  const tracks = sortTracks([
    {
      id: visualTrackId,
      projectId,
      type: TrackType.VISUAL,
      index: 0,
      name: "Scenes",
      metadata: { lane: "visual" },
      clipIds: visualClipIds,
    },
    {
      id: textTrackId,
      projectId,
      type: TrackType.TEXT,
      index: 1,
      name: "Headlines",
      metadata: { lane: "text" },
      clipIds: textClipIds,
    },
    {
      id: musicTrackId,
      projectId,
      type: TrackType.AUDIO,
      index: 2,
      name: "Music",
      metadata: { lane: "music" },
      clipIds: [musicClipId],
    },
    {
      id: voiceTrackId,
      projectId,
      type: TrackType.AUDIO,
      index: 3,
      name: "Voice & Script",
      metadata: { lane: "voice" },
      clipIds: voiceClipIds,
    },
  ]);

  const ch = options?.contactHints;
  const pi = options?.pageIntel;
  const company =
    sb?.companyName ?? pi?.companyName ?? plan.adTitle;
  const phone = sb?.phoneNumber ?? ch?.phone ?? "";
  const address =
    sb?.cleanAddress ??
    ch?.address ??
    "";
  const website =
    sb?.primaryDomain
      ? `https://${sb.primaryDomain.replace(/^https?:\/\//, "")}`
      : ch?.website ?? "";
  const logoUrl =
    sb?.logoUrl ??
    pi?.logoUrl ??
    "";

  const project: ProjectTimelineMeta = {
    id: projectId,
    name: company,
    description: plan.brand.tagline,
    metadata: {
      targetDurationSec: totalDurationSecSnapped,
      aspectRatio: "16:9",
      sceneCount: plan.scenes.length + 1,
      showQrOverlay: true,
      musicMood: plan.musicMood,
      directorModel: "gemini-2.0-flash",
      sourceUrl: options?.sourceUrl,
      previewSubtitle: `${plan.scenes.length} scenes · ${plan.musicMood}`,
      brandDisplayName: company,
      phone,
      address,
      website,
      websiteUrl: website,
      ...(logoUrl
        ? { logoUrl, scrapedLogoUrl: logoUrl }
        : {}),
      ...(ch?.socialLinks?.length
        ? { socialLinks: ch.socialLinks }
        : {}),
    },
    brandConfig: {
      primaryColor: plan.brand.primaryColor,
      secondaryColor: plan.brand.secondaryColor,
      fontHeading: plan.brand.fontHeading,
      fontBody: plan.brand.fontBody,
      tagline: plan.brand.tagline,
      companyName: company,
      phone,
      address,
      website,
      ...(logoUrl ? { logoUrl } : {}),
      logoFromScrape: Boolean(logoUrl),
      endScreenTagline: plan.brand.tagline ?? "Call us today",
      endScreenPhone: phone,
    },
  };

  return {
    durationInFrames,
    project,
    tracks,
    clipsById,
  };
}
