"use client";

import {
  Film,
  Mic2,
  Music2,
  PanelBottom,
  Pause,
  Play,
  QrCode,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClipMediaType } from "@/generated/prisma/enums";
import {
  findClipsForSceneIndex,
  getEndSceneVisualClip,
  isEndSceneClip,
  listSceneVisualClips,
} from "@/lib/timeline/scene-utils";
import { framesToSeconds } from "@/lib/types/timeline";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { VIBE_STUDIO } from "@/lib/ui/vibe-studio-tokens";
import { MASTER_VOICEOVER_MIN_WORDS } from "@/lib/voiceover/master-script-policy";
import { cn } from "@/lib/utils";

function formatTimecode(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function vibeLaneLabel(lane: string, trackName: string | null | undefined): string {
  switch (lane) {
    case "music":
      return "MUSIC";
    case "voice":
      return "VOICE & SCRIPT";
    default:
      return (trackName ?? lane).toUpperCase();
  }
}

function laneBorderStyle(lane: string): CSSProperties {
  switch (lane) {
    case "music":
      return { borderLeftColor: VIBE_STUDIO.music };
    case "voice":
      return { borderLeftColor: VIBE_STUDIO.voice };
    default:
      return { borderLeftColor: "rgba(255,255,255,0.22)" };
  }
}

function ClipThumb({
  clip,
  lane,
}: {
  clip: {
    assetUrl?: string | null;
    mediaType: ClipMediaType;
    label?: string | null;
  };
  lane: string;
}) {
  const url = clip.assetUrl?.trim();
  if (
    url &&
    (clip.mediaType === ClipMediaType.VIDEO ||
      clip.mediaType === ClipMediaType.IMAGE)
  ) {
    return (
      <div className="relative size-7 shrink-0 overflow-hidden rounded-sm border border-border/60 bg-muted/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          className="size-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }
  if (lane === "voice" || clip.mediaType === ClipMediaType.VOICEOVER) {
    return (
      <div
        className="flex size-7 shrink-0 items-center justify-center rounded-sm border bg-white/[0.06]"
        style={{ borderColor: `${VIBE_STUDIO.voice}66` }}
      >
        <Mic2 className="size-3.5 text-white/90" />
      </div>
    );
  }
  if (lane === "text" || clip.mediaType === ClipMediaType.TEXT) {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-sky-500/35 bg-sky-500/10 text-[9px] font-bold text-sky-100">
        T
      </div>
    );
  }
  if (lane === "music") {
    return (
      <div
        className="flex size-7 shrink-0 items-center justify-center rounded-sm border bg-white/[0.06]"
        style={{ borderColor: `${VIBE_STUDIO.music}88` }}
      >
        <Music2 className="size-3.5 text-white/90" />
      </div>
    );
  }
  return (
    <div className="size-7 shrink-0 rounded-sm border border-border/50 bg-muted/30" />
  );
}

function laneIcon(lane: string) {
  switch (lane) {
    case "visual":
      return Film;
    case "music":
      return Music2;
    case "voice":
      return Mic2;
    case "audio":
      return Music2;
    default:
      return Film;
  }
}

type TimelineClipProps = {
  clipId: string;
  totalSec: number;
  lane: string;
  projectId: string;
};

function voiceScriptFillRatio(clip: {
  duration: number;
  content: Record<string, unknown> | null;
}): number {
  const script =
    clip.content && typeof clip.content.script === "string"
      ? clip.content.script
      : "";
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  const estSec = Math.max(0.15, words / 2.35);
  return Math.min(1, estSec / Math.max(0.15, clip.duration));
}

function TimelineClipBar({ clipId, totalSec, lane, projectId }: TimelineClipProps) {
  const clip = useTimelineStore((s) => s.clipsById[clipId]);
  const selectClipWithStudioTab = useTimelineStore(
    (s) => s.selectClipWithStudioTab,
  );
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);

  if (!clip) return null;

  const left = (clip.startTime / totalSec) * 100;
  const width = (clip.duration / totalSec) * 100;
  const selected = selectedClipId === clipId;
  const isVoice =
    lane === "voice" || clip.mediaType === ClipMediaType.VOICEOVER;
  const fillRatio = isVoice ? voiceScriptFillRatio(clip) : 0;

  const laneBarTint =
    lane === "music"
      ? { backgroundColor: `${VIBE_STUDIO.music}2e`, borderColor: `${VIBE_STUDIO.music}88` }
      : isVoice
        ? { backgroundColor: `${VIBE_STUDIO.voice}2e`, borderColor: `${VIBE_STUDIO.voice}88` }
        : { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.14)" };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "absolute top-1 bottom-1 flex rounded-md border text-left shadow-sm",
            "ring-1 ring-white/[0.05] transition-colors",
            selected && "ring-2 ring-white/35",
            "overflow-hidden",
            "group",
          )}
          style={{
            left: `calc(${left}% + 1px)`,
            width: `calc(${Math.max(width, 1.1)}% - 2px)`,
            ...laneBarTint,
          }}
          onPointerDown={() => selectClipWithStudioTab(clipId)}
        >
          <div className="relative flex min-w-0 flex-1 items-center gap-1 px-1 py-0.5">
            <ClipThumb clip={clip} lane={lane} />
            {isVoice ? (
              <>
                <div
                  className="pointer-events-none absolute inset-y-1 left-1 overflow-hidden rounded-sm"
                  style={{
                    width: `calc(${fillRatio * 100}% - 4px)`,
                    backgroundColor: `${VIBE_STUDIO.voice}44`,
                  }}
                />
                <div
                  className="pointer-events-none absolute inset-y-1 left-1 right-1 rounded-sm opacity-40"
                  style={{
                    backgroundImage: `repeating-linear-gradient(90deg, ${VIBE_STUDIO.voice}99 0px, ${VIBE_STUDIO.voice}99 2px, transparent 2px, transparent 6px)`,
                  }}
                />
              </>
            ) : null}
            <span className="relative line-clamp-2 text-[10px] font-medium leading-tight text-white/85">
              {clip.label ?? clip.mediaType}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs border-border/80 bg-popover/95 text-xs leading-relaxed backdrop-blur-md"
      >
        <p className="font-semibold">{clip.label}</p>
        <p className="text-muted-foreground">
          {clip.startTime.toFixed(2)}s · {clip.duration.toFixed(2)}s
        </p>
        {projectId ? (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/90">
            {clipId}
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

type MultiTrackTimelineProps = {
  projectId: string;
};

type SceneStripBarProps = {
  visualClipId: string;
  totalSec: number;
  projectId: string;
};

function SceneStripBar({ visualClipId, totalSec, projectId }: SceneStripBarProps) {
  const clip = useTimelineStore((s) => s.clipsById[visualClipId]);
  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const selectClipWithStudioTab = useTimelineStore(
    (s) => s.selectClipWithStudioTab,
  );
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);

  if (!clip) return null;

  const left = (clip.startTime / totalSec) * 100;
  const width = (clip.duration / totalSec) * 100;
  const isEnd = isEndSceneClip(clip);
  const si = clip.content?.sceneIndex;
  const selected =
    !!selectedClipId &&
    (selectedClipId === clip.id ||
      (typeof si === "number" &&
        selectedClipId in
          findClipsForSceneIndex(tracks, clipsById, si, VISUAL_ALIGN_LANES)));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "absolute top-1 bottom-1 flex rounded-md border text-left shadow-sm",
            "border-white/12 bg-white/[0.07] ring-1 ring-white/[0.06] transition-colors",
            selected && "ring-2 ring-white/35",
            isEnd && "border-amber-400/40 bg-amber-950/20",
            "overflow-hidden",
          )}
          style={{
            left: `calc(${left}% + 1px)`,
            width: `calc(${Math.max(width, 0.8)}% - 2px)`,
          }}
          onPointerDown={() => {
            selectClipWithStudioTab(clip.id);
          }}
        >
          <div className="relative flex min-w-0 flex-1 items-center gap-1 px-1.5 py-0.5">
            <ClipThumb clip={clip} lane="visual" />
            <span className="relative line-clamp-2 text-[10px] font-medium leading-tight text-white/85">
              {isEnd ? "End screen" : (clip.label ?? "Scene")}
            </span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs border-border/80 bg-popover/95 text-xs leading-relaxed backdrop-blur-md"
      >
        <p className="font-semibold">{clip.label}</p>
        <p className="text-muted-foreground">
          {clip.startTime.toFixed(2)}s · {clip.duration.toFixed(2)}s
        </p>
        {projectId ? (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/90">
            {visualClipId}
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

const VISUAL_ALIGN_LANES = ["visual", "text", "voice"] as const;

export function MultiTrackTimeline({ projectId }: MultiTrackTimelineProps) {
  const fps = useTimelineStore((s) => s.fps);
  const durationInFrames = useTimelineStore((s) => s.durationInFrames);
  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const setPlayheadFrame = useTimelineStore((s) => s.setPlayheadFrame);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const togglePlayback = useTimelineStore((s) => s.togglePlayback);
  const setStudioPanel = useTimelineStore((s) => s.setStudioPanel);
  const setSelectedClipId = useTimelineStore((s) => s.setSelectedClipId);
  const project = useTimelineStore((s) => s.project);
  const [voiceLaneFlash, setVoiceLaneFlash] = useState(false);
  const [musicLaneFlash, setMusicLaneFlash] = useState(false);

  const totalSec = framesToSeconds(durationInFrames, fps);
  const playheadSec = framesToSeconds(playheadFrame, fps);
  const playheadPct = totalSec > 0 ? (playheadSec / totalSec) * 100 : 0;
  const masterScript =
    typeof project.metadata.masterVoiceoverScript === "string"
      ? project.metadata.masterVoiceoverScript
      : "";
  const words = masterScript.trim().split(/\s+/).filter(Boolean).length;
  const minWords = MASTER_VOICEOVER_MIN_WORDS;
  const voiceoverFlashAt =
    typeof project.metadata.voiceoverFlashAt === "number"
      ? project.metadata.voiceoverFlashAt
      : 0;
  const musicFlashAt =
    typeof project.metadata.musicFlashAt === "number"
      ? project.metadata.musicFlashAt
      : 0;

  useEffect(() => {
    if (!voiceoverFlashAt) return;
    setVoiceLaneFlash(true);
    const id = window.setTimeout(() => setVoiceLaneFlash(false), 900);
    return () => window.clearTimeout(id);
  }, [voiceoverFlashAt]);

  useEffect(() => {
    if (!musicFlashAt) return;
    setMusicLaneFlash(true);
    const id = window.setTimeout(() => setMusicLaneFlash(false), 700);
    return () => window.clearTimeout(id);
  }, [musicFlashAt]);

  const sorted = [...tracks].sort((a, b) => a.index - b.index);
  const regularScenes = useMemo(
    () => listSceneVisualClips(tracks, clipsById),
    [tracks, clipsById],
  );
  const endSceneVis = useMemo(
    () => getEndSceneVisualClip(tracks, clipsById),
    [tracks, clipsById],
  );
  const sceneBlocksForStrip = useMemo(
    () => (endSceneVis ? [...regularScenes, endSceneVis] : regularScenes),
    [regularScenes, endSceneVis],
  );

  const timelineTracks = useMemo(
    () =>
      sorted.filter((t) => {
        const lane =
          typeof t.metadata?.lane === "string" ? t.metadata.lane : "";
        // Visual + text are represented by the Scene lane above.
        return lane !== "visual" && lane !== "text";
      }),
    [sorted],
  );

  return (
    <div className="relative space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
            Timeline
          </span>
          <Badge
            variant="secondary"
            className="border-white/10 bg-white/[0.06] font-mono text-[9px] text-white/55"
          >
            {totalSec.toFixed(1)}s · {fps} fps
          </Badge>
        </div>
      </div>
      {words < minWords ? (
        <p className="text-[11px] leading-relaxed text-amber-300/85">
          Add at least {minWords} words for voiceover. Open{" "}
          <span className="font-medium text-white/90">Voice &amp; script</span> — narration
          generates automatically when the timeline loads.
        </p>
      ) : null}

      <div
        className="flex max-h-[280px] min-h-0 w-full overflow-hidden rounded-lg border"
        style={{ borderColor: VIBE_STUDIO.borderSubtle }}
      >
        <div
          className="flex w-[56px] shrink-0 flex-col items-center gap-2 border-r py-3"
          style={{
            borderColor: VIBE_STUDIO.borderSubtle,
            backgroundColor: VIBE_STUDIO.panelBg,
          }}
        >
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="size-11 shrink-0 rounded-full border-0 bg-white text-black shadow-none hover:bg-white/90"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => togglePlayback()}
          >
            {isPlaying ? (
              <Pause className="size-5 text-black" fill="currentColor" />
            ) : (
              <Play className="size-5 pl-0.5 text-black" fill="currentColor" />
            )}
          </Button>
          <span className="font-mono text-[11px] tabular-nums text-[#b3b3b3]">
            {formatTimecode(playheadSec)}
          </span>
        </div>

        <ScrollArea className="min-h-0 min-w-0 flex-1">
          <div className="min-w-[720px] space-y-0 pr-3">
            <div
              className="flex border-b border-l-[3px] border-solid"
              style={{
                borderBottomColor: VIBE_STUDIO.borderSubtle,
                borderLeftColor: "rgba(255,255,255,0.18)",
                backgroundColor: VIBE_STUDIO.panelBg,
              }}
            >
              <div
                className="flex w-[148px] shrink-0 items-center gap-2 border-r px-2.5 py-2"
                style={{
                  borderColor: VIBE_STUDIO.borderSubtle,
                  backgroundColor: VIBE_STUDIO.panelBg,
                }}
              >
                <Film className="size-3.5 text-[#b3b3b3]" />
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b3b3b3]">
                  Slideshow
                </span>
              </div>
              <div
                className="timeline-row-area relative min-h-11 flex-1 touch-none select-none"
                style={{ backgroundColor: VIBE_STUDIO.canvasBg }}
              >
                {sceneBlocksForStrip.map((c) => (
                  <SceneStripBar
                    key={c.id}
                    visualClipId={c.id}
                    totalSec={totalSec}
                    projectId={projectId}
                  />
                ))}
                <div
                  className="pointer-events-none absolute z-30"
                  style={{
                    left: `${playheadPct}%`,
                    top: -6,
                    transform: "translateX(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: `7px solid ${VIBE_STUDIO.playhead}`,
                  }}
                />
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-20 w-px"
                  style={{
                    left: `${playheadPct}%`,
                    backgroundColor: VIBE_STUDIO.playhead,
                    boxShadow: `0 0 12px ${VIBE_STUDIO.playhead}`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedClipId(null);
                setStudioPanel("bottomBanner");
              }}
              className="flex w-full border-b border-l-[3px] border-solid text-left transition-colors hover:brightness-110"
              style={{
                borderBottomColor: VIBE_STUDIO.borderSubtle,
                borderLeftColor: VIBE_STUDIO.bottomBanner,
                backgroundColor: VIBE_STUDIO.panelBg,
              }}
            >
              <div
                className="flex w-[148px] shrink-0 items-center gap-2 border-r px-2.5 py-2"
                style={{
                  borderColor: VIBE_STUDIO.borderSubtle,
                  backgroundColor: VIBE_STUDIO.panelBg,
                }}
              >
                <PanelBottom className="size-3.5 text-[#b3b3b3]" />
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b3b3b3]">
                  Bottom banner
                </span>
              </div>
              <div
                className="timeline-row-area relative min-h-7 flex-1 touch-none select-none"
                style={{ backgroundColor: VIBE_STUDIO.canvasBg }}
              >
                <div
                  className="absolute top-1 bottom-1 left-px right-px rounded-sm opacity-90"
                  style={{ backgroundColor: VIBE_STUDIO.bottomBanner }}
                />
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-20 w-px"
                  style={{
                    left: `${playheadPct}%`,
                    backgroundColor: VIBE_STUDIO.playhead,
                    boxShadow: `0 0 12px ${VIBE_STUDIO.playhead}`,
                  }}
                />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedClipId(null);
                setStudioPanel("qr");
              }}
              className="flex w-full border-b border-l-[3px] border-solid text-left transition-colors hover:brightness-110"
              style={{
                borderBottomColor: VIBE_STUDIO.borderSubtle,
                borderLeftColor: VIBE_STUDIO.qr,
                backgroundColor: VIBE_STUDIO.panelBg,
              }}
            >
              <div
                className="flex w-[148px] shrink-0 items-center gap-2 border-r px-2.5 py-2"
                style={{
                  borderColor: VIBE_STUDIO.borderSubtle,
                  backgroundColor: VIBE_STUDIO.panelBg,
                }}
              >
                <QrCode className="size-3.5 text-[#b3b3b3]" />
                <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b3b3b3]">
                  QR code
                </span>
              </div>
              <div
                className="timeline-row-area relative min-h-7 flex-1 touch-none select-none"
                style={{ backgroundColor: VIBE_STUDIO.canvasBg }}
              >
                <div
                  className="absolute top-1 bottom-1 left-px right-px rounded-sm opacity-90"
                  style={{ backgroundColor: VIBE_STUDIO.qr }}
                />
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-20 w-px"
                  style={{
                    left: `${playheadPct}%`,
                    backgroundColor: VIBE_STUDIO.playhead,
                    boxShadow: `0 0 12px ${VIBE_STUDIO.playhead}`,
                  }}
                />
              </div>
            </button>

            {timelineTracks.map((track) => {
              const lane =
                typeof track.metadata?.lane === "string"
                  ? track.metadata.lane
                  : track.type.toLowerCase();
              const Icon = laneIcon(lane);
              const stripe = laneBorderStyle(lane);

              const isAnimatedLane = lane === "voice" || lane === "music";
              const RowComp = isAnimatedLane ? motion.div : "div";
              const displayLabel = vibeLaneLabel(lane, track.name);

              return (
                <RowComp
                  key={track.id}
                  className={cn(
                    "flex border-b border-l-[3px] border-solid",
                    lane === "voice" &&
                      voiceLaneFlash &&
                      "shadow-[0_0_0_1px_rgba(93,27,179,0.55),0_0_20px_rgba(93,27,179,0.35)]",
                    lane === "music" &&
                      musicLaneFlash &&
                      "shadow-[0_0_0_1px_rgba(0,77,77,0.55),0_0_18px_rgba(0,77,77,0.35)]",
                  )}
                  style={{
                    borderBottomColor: VIBE_STUDIO.borderSubtle,
                    ...stripe,
                    backgroundColor: VIBE_STUDIO.panelBg,
                  }}
                  {...(isAnimatedLane
                    ? {
                        initial: false,
                        animate:
                          lane === "voice" && voiceLaneFlash
                            ? {
                                scale: [1, 1.01, 1],
                                backgroundColor: [
                                  "rgba(93,27,179,0.05)",
                                  "rgba(93,27,179,0.12)",
                                  "rgba(93,27,179,0.05)",
                                ],
                              }
                            : lane === "music" && musicLaneFlash
                              ? {
                                  scale: [1, 1.008, 1],
                                  backgroundColor: [
                                    "rgba(0,77,77,0.06)",
                                    "rgba(0,77,77,0.14)",
                                    "rgba(0,77,77,0.06)",
                                  ],
                                }
                              : { scale: 1 },
                        transition: { duration: 0.45, ease: "easeOut" },
                      }
                    : {})}
                >
                  <div
                    className="flex w-[148px] shrink-0 items-center gap-2 border-r px-2.5 py-2"
                    style={{
                      borderColor: VIBE_STUDIO.borderSubtle,
                      backgroundColor: VIBE_STUDIO.panelBg,
                    }}
                  >
                    <Icon className="size-3.5 text-[#b3b3b3]" />
                    <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#b3b3b3]">
                      {displayLabel}
                    </span>
                  </div>
                  <div
                    className="timeline-row-area relative min-h-9 flex-1 touch-none select-none"
                    style={{ backgroundColor: VIBE_STUDIO.canvasBg }}
                  >
                    {lane === "music" ? (
                      <div
                        className="pointer-events-none absolute top-1 bottom-1 left-px right-px rounded-sm opacity-[0.35]"
                        style={{ backgroundColor: VIBE_STUDIO.music }}
                      />
                    ) : null}
                    {lane === "voice" ? (
                      <div
                        className="pointer-events-none absolute top-1 bottom-1 left-px right-px rounded-sm opacity-[0.3]"
                        style={{ backgroundColor: VIBE_STUDIO.voice }}
                      />
                    ) : null}
                    {track.clipIds.map((cid) => (
                      <TimelineClipBar
                        key={cid}
                        clipId={cid}
                        totalSec={totalSec}
                        lane={lane}
                        projectId={projectId}
                      />
                    ))}
                    <div
                      className="pointer-events-none absolute top-0 bottom-0 z-20 w-px"
                      style={{
                        left: `${playheadPct}%`,
                        backgroundColor: VIBE_STUDIO.playhead,
                        boxShadow: `0 0 12px ${VIBE_STUDIO.playhead}`,
                      }}
                    />
                  </div>
                </RowComp>
              );
            })}
          </div>
          <ScrollBar orientation="vertical" />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="space-y-1 px-0.5 pt-0">
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-white/40">
          <span>Playhead</span>
          <span>Scrub</span>
        </div>
        <Slider
          min={0}
          max={Math.max(0, durationInFrames - 1)}
          step={1}
          value={[playheadFrame]}
          onValueChange={(v) => {
            setIsPlaying(false);
            setPlayheadFrame(v[0] ?? 0);
          }}
        />
      </div>
    </div>
  );
}
