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

/** Weight by spoken words so scene length tracks master VO “beats”. */
function voiceoverSpeechWeight(vo: string): number {
  const n = vo
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(4, n);
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
  const totalDuration = plan.totalDurationSec;
  const durationInFrames = secondsToFrames(totalDuration, fps);
  const totalFramesTarget = Math.max(1, durationInFrames);
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

  const masterVoiceover = plan.scenes
    .map((s) => (typeof s.voiceover === "string" ? s.voiceover.trim() : ""))
    .filter(Boolean)
    .join(" ");

  const speechWeights = plan.scenes.map((s) =>
    voiceoverSpeechWeight(
      typeof s.voiceover === "string" ? s.voiceover : "",
    ),
  );

  let cursorFrames = 0;
  for (const [i, scene] of plan.scenes.entries()) {
    const isLastScene = i === plan.scenes.length - 1;
    let durFrames: number;
    if (isLastScene) {
      durFrames = Math.max(1, totalFramesTarget - cursorFrames);
    } else {
      const remainingFrames = totalFramesTarget - cursorFrames;
      const remainingWeight = speechWeights
        .slice(i)
        .reduce((a, b) => a + b, 0);
      const share = speechWeights[i] / remainingWeight;
      durFrames = Math.max(1, Math.round(remainingFrames * share));
      const minTail = plan.scenes.length - i - 1;
      durFrames = Math.min(durFrames, Math.max(1, remainingFrames - minTail));
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
        ...(isLastScene ? { isEndScene: true } : {}),
      },
      content: {
        sceneIndex: scene.index,
        headline: scene.headline,
        subcopy: scene.subcopy,
      },
      audioProps: null,
      animationIn: { preset: "fade", durationSec: 0.35 },
      animationOut: null,
      metadata: isLastScene ? { isEndScene: true } : {},
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
      clipProperties: {
        role: isLastScene ? "end" : "headline",
        sceneIndex: scene.index,
        ...(isLastScene ? { isEndScene: true } : {}),
      },
      content: {
        sceneIndex: scene.index,
        text: scene.headline,
        subcopy: scene.subcopy,
      },
      audioProps: null,
      animationIn: { preset: "slide", direction: "up", durationSec: 0.4 },
      animationOut: null,
      metadata: isLastScene ? { isEndScene: true } : {},
    };

    cursorFrames += durFrames;
  }

  const voiceClipId = uid("cl");
  voiceClipIds.push(voiceClipId);
  clipsById[voiceClipId] = {
    id: voiceClipId,
    trackId: voiceTrackId,
    startTime: 0,
    duration: totalDurationSecSnapped,
    mediaType: ClipMediaType.VOICEOVER,
    assetUrl: null,
    label: "Master voiceover",
    transformProps: {},
    clipProperties: { mode: "masterScript" },
    content: { script: masterVoiceover },
      audioProps: { volumePct: 100, duckUnderMusicDb: -12 },
    animationIn: null,
    animationOut: null,
    metadata: { mode: "masterScript" },
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
    audioProps: { volumePct: 62 },
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
      sceneCount: plan.scenes.length,
      showQrOverlay: true,
      showFocusCardOverlay: true,
      musicMood: plan.musicMood,
      directorModel: "gemini-2.0-flash",
      sourceUrl: options?.sourceUrl,
      previewSubtitle: `${plan.scenes.length} scenes · ${plan.musicMood}`,
      masterVoiceoverScript: masterVoiceover,
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
