"use client";

import {
  Film,
  Loader2,
  Mic2,
  Music2,
  PanelBottom,
  QrCode,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { generateVoiceoverFromTimelineJson } from "@/app/actions/voiceover-actions";
import { ClipMediaType } from "@/generated/prisma/enums";
import { serializeTimelineState } from "@/lib/timeline/serialize";
import {
  findClipsForSceneIndex,
  getEndSceneVisualClip,
  isEndSceneClip,
  listSceneVisualClips,
} from "@/lib/timeline/scene-utils";
import { framesToSeconds } from "@/lib/types/timeline";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { playSuccessChime } from "@/lib/ui/sfx";
import { cn } from "@/lib/utils";

const laneAccent: Record<string, string> = {
  visual: "border-l-violet-500/90",
  text: "border-l-sky-500/90",
  music: "border-l-emerald-500/90",
  voice: "border-l-amber-500/90",
};

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
      <div className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-amber-500/40 bg-amber-500/10">
        <Mic2 className="size-3.5 text-amber-200/90" />
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
      <div className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-emerald-500/35 bg-emerald-500/10">
        <Music2 className="size-3.5 text-emerald-200/90" />
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

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "absolute top-1 bottom-1 flex rounded-md border text-left",
            "border-border/90 bg-background/55 shadow-sm backdrop-blur-md",
            "ring-1 ring-white/5 transition-colors",
            selected && "ring-2 ring-primary/80",
            "overflow-hidden",
            "group",
          )}
          style={{
            left: `calc(${left}% + 1px)`,
            width: `calc(${Math.max(width, 1.1)}% - 2px)`,
          }}
          onPointerDown={() => selectClipWithStudioTab(clipId)}
        >
          <div className="relative flex min-w-0 flex-1 items-center gap-1 px-1 py-0.5">
            <ClipThumb clip={clip} lane={lane} />
            {isVoice ? (
              <>
                <div
                  className="pointer-events-none absolute inset-y-1 left-1 overflow-hidden rounded-sm bg-amber-500/15"
                  style={{ width: `calc(${fillRatio * 100}% - 4px)` }}
                />
                <div
                  className="pointer-events-none absolute inset-y-1 left-1 right-1 rounded-sm opacity-45"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, rgba(251,191,36,0.55) 0px, rgba(251,191,36,0.55) 2px, transparent 2px, transparent 6px)",
                  }}
                />
              </>
            ) : null}
            <span className="relative line-clamp-2 text-[10px] font-medium leading-tight text-foreground/95">
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
            "absolute top-1 bottom-1 flex rounded-md border text-left",
            "border-border/90 bg-background/55 shadow-sm backdrop-blur-md",
            "ring-1 ring-white/5 transition-colors",
            selected && "ring-2 ring-primary/80",
            isEnd && "border-amber-500/35 bg-amber-950/15",
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
            <span className="relative line-clamp-2 text-[10px] font-medium leading-tight text-foreground/95">
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
  const setStudioPanel = useTimelineStore((s) => s.setStudioPanel);
  const project = useTimelineStore((s) => s.project);
  const setVoiceoverAsset = useTimelineStore((s) => s.setVoiceoverAsset);
  const [voBusy, setVoBusy] = useState(false);
  const [voiceLaneFlash, setVoiceLaneFlash] = useState(false);
  const [musicLaneFlash, setMusicLaneFlash] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  const totalSec = framesToSeconds(durationInFrames, fps);
  const playheadSec = framesToSeconds(playheadFrame, fps);
  const masterScript =
    typeof project.metadata.masterVoiceoverScript === "string"
      ? project.metadata.masterVoiceoverScript
      : "";
  const words = masterScript.trim().split(/\s+/).filter(Boolean).length;
  const minWords = 75;
  const hasVoiceoverAudio =
    typeof project.metadata.voiceoverAudioUrl === "string" &&
    project.metadata.voiceoverAudioUrl.trim().length > 0;
  const brandPrimary =
    (typeof project.brandConfig.primaryColor === "string" &&
      project.brandConfig.primaryColor) ||
    "#f43f5e";
  const statuses = useMemo(
    () => [
      "🎙️ Synthesizing Natural Inflections...",
      "🧠 Aligning Script to Scene Pacing...",
      "✨ Polishing Audio Clarity...",
    ],
    [],
  );
  const voiceoverFlashAt =
    typeof project.metadata.voiceoverFlashAt === "number"
      ? project.metadata.voiceoverFlashAt
      : 0;
  const musicFlashAt =
    typeof project.metadata.musicFlashAt === "number"
      ? project.metadata.musicFlashAt
      : 0;

  useEffect(() => {
    if (!voBusy) return;
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % statuses.length);
    }, 1500);
    return () => window.clearInterval(id);
  }, [voBusy, statuses.length]);

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

  async function onGenerateFullVoiceover() {
    setVoBusy(true);
    setStatusIndex(0);
    try {
      const state = useTimelineStore.getState();
      const json = JSON.stringify(serializeTimelineState(state));
      const res = await generateVoiceoverFromTimelineJson(projectId, json);
      if (!res.ok) {
        toast.error("Voiceover failed", { description: res.error });
        return;
      }
      setVoiceoverAsset(res.publicUrl, res.durationSecEstimate);
      toast.success("Full voiceover generated");
      playSuccessChime();
    } finally {
      setVoBusy(false);
    }
  }

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
    <div className="relative space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Timeline
          </span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {totalSec.toFixed(1)}s · {fps} fps
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 border-border/80 bg-background/40 text-[11px] backdrop-blur-sm"
            disabled={voBusy || words < minWords}
            onClick={() => void onGenerateFullVoiceover()}
          >
            {voBusy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Mic2 className="size-3.5" />
            )}
            {hasVoiceoverAudio ? "Update Full Voiceover" : "Generate Full Voiceover"}
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[238px] w-full">
        <div className="min-w-[720px] space-y-0 pr-4">
          <div
            className={cn(
              "flex border-b border-border/60 bg-muted/10",
              "border-l-2",
              laneAccent.visual,
            )}
          >
            <div className="flex w-36 shrink-0 items-center gap-2 border-r border-border/60 bg-sidebar/35 px-2 py-2 backdrop-blur-sm">
              <Film className="size-3.5 text-muted-foreground" />
              <span className="truncate text-[11px] font-medium text-foreground/90">
                Scenes
              </span>
            </div>
            <div className="timeline-row-area relative min-h-11 flex-1 touch-none select-none">
              {sceneBlocksForStrip.map((c) => (
                <SceneStripBar
                  key={c.id}
                  visualClipId={c.id}
                  totalSec={totalSec}
                  projectId={projectId}
                />
              ))}
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-rose-500/90 shadow-[0_0_18px_rgba(244,63,94,0.75)]"
                style={{
                  left: `${totalSec > 0 ? (playheadSec / totalSec) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Static overlay lanes (Bottom banner + QR code) to match the Studio reference. */}
          <button
            type="button"
            onClick={() => setStudioPanel("bottomBanner")}
            className={cn(
              "flex w-full border-b border-border/60 bg-muted/10 text-left",
              "border-l-2",
              "border-l-violet-500/90",
              "hover:bg-violet-500/10",
            )}
          >
            <div className="flex w-36 shrink-0 items-center gap-2 border-r border-border/60 bg-sidebar/35 px-2 py-2 backdrop-blur-sm">
              <PanelBottom className="size-3.5 text-muted-foreground" />
              <span className="truncate text-[11px] font-medium text-foreground/90">
                Bottom banner
              </span>
            </div>
            <div className="timeline-row-area relative min-h-7 flex-1 touch-none select-none">
              <div className="absolute top-1 bottom-1 left-[1px] right-[1px] rounded-sm border border-border/50 bg-violet-500/10" />
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-rose-500/90 shadow-[0_0_18px_rgba(244,63,94,0.75)]"
                style={{
                  left: `${totalSec > 0 ? (playheadSec / totalSec) * 100 : 0}%`,
                }}
              />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStudioPanel("qr")}
            className={cn(
              "flex w-full border-b border-border/60 bg-muted/10 text-left",
              "border-l-2",
              "border-l-sky-500/90",
              "hover:bg-sky-500/10",
            )}
          >
            <div className="flex w-36 shrink-0 items-center gap-2 border-r border-border/60 bg-sidebar/35 px-2 py-2 backdrop-blur-sm">
              <QrCode className="size-3.5 text-muted-foreground" />
              <span className="truncate text-[11px] font-medium text-foreground/90">
                QR code
              </span>
            </div>
            <div className="timeline-row-area relative min-h-7 flex-1 touch-none select-none">
              <div className="absolute top-1 bottom-1 left-[1px] right-[1px] rounded-sm border border-border/50 bg-sky-500/10" />
              <div
                className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-rose-500/90 shadow-[0_0_18px_rgba(244,63,94,0.75)]"
                style={{
                  left: `${totalSec > 0 ? (playheadSec / totalSec) * 100 : 0}%`,
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
            const accent = laneAccent[lane] ?? "border-l-primary/60";

            const isAnimatedLane = lane === "voice" || lane === "music";
            const RowComp = isAnimatedLane ? motion.div : "div";
            return (
              <RowComp
                key={track.id}
                className={cn(
                  "flex border-b border-border/60 bg-muted/10",
                  "border-l-2",
                  accent,
                  lane === "voice" &&
                    voiceLaneFlash &&
                    "shadow-[0_0_0_1px_rgba(251,191,36,0.55),0_0_20px_rgba(251,191,36,0.35)]",
                  lane === "music" &&
                    musicLaneFlash &&
                    "shadow-[0_0_0_1px_rgba(16,185,129,0.5),0_0_18px_rgba(16,185,129,0.28)]",
                )}
                {...(isAnimatedLane
                  ? {
                      initial: false,
                      animate:
                        lane === "voice" && voiceLaneFlash
                          ? {
                              scale: [1, 1.01, 1],
                              backgroundColor: [
                                "rgba(245,158,11,0.04)",
                                "rgba(245,158,11,0.14)",
                                "rgba(245,158,11,0.04)",
                              ],
                            }
                          : lane === "music" && musicLaneFlash
                            ? {
                                scale: [1, 1.008, 1],
                                backgroundColor: [
                                  "rgba(16,185,129,0.04)",
                                  "rgba(16,185,129,0.12)",
                                  "rgba(16,185,129,0.04)",
                                ],
                              }
                            : { scale: 1 },
                      transition: { duration: 0.45, ease: "easeOut" },
                    }
                  : {})}
              >
                <div className="flex w-36 shrink-0 items-center gap-2 border-r border-border/60 bg-sidebar/35 px-2 py-2 backdrop-blur-sm">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="truncate text-[11px] font-medium text-foreground/90">
                    {track.name ?? track.type}
                  </span>
                </div>
                <div className="timeline-row-area relative min-h-9 flex-1 touch-none select-none">
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
                    className="pointer-events-none absolute top-0 bottom-0 z-20 w-[2px] bg-rose-500/90 shadow-[0_0_18px_rgba(244,63,94,0.75)]"
                    style={{
                      left: `${totalSec > 0 ? (playheadSec / totalSec) * 100 : 0}%`,
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

      <div className="space-y-1 px-0.5 pt-0">
        <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>Playhead</span>
          <span>scrub</span>
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
      <AnimatePresence>
        {voBusy ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded-xl bg-background/20 backdrop-blur-md"
          >
            <div className="flex items-end gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 rounded-full"
                  style={{
                    backgroundColor: brandPrimary,
                    boxShadow: `0 0 10px ${brandPrimary}`,
                  }}
                  animate={{
                    height: [10, 26 + (i % 3) * 6, 14],
                    opacity: [0.45, 1, 0.55],
                  }}
                  transition={{
                    duration: 0.9 + i * 0.08,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-center text-xs font-medium text-foreground/90"
            >
              {statuses[statusIndex]}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
