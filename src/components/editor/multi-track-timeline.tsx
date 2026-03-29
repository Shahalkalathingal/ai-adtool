"use client";

import {
  Film,
  Loader2,
  Lock,
  Mic2,
  Music2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { generateVoiceoverFromTimelineJson } from "@/app/actions/voiceover-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

type DragMode = "move" | "resize-left" | "resize-right";

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
  const setClipTiming = useTimelineStore((s) => s.setClipTiming);
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);

  const dragRef = useRef<{
    mode: DragMode;
    startClientX: number;
    origStart: number;
    origDur: number;
    widthPx: number;
  } | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (!useTimelineStore.getState().clipsById[clipId]) return;
      const dx = e.clientX - d.startClientX;
      const deltaSec = (dx / d.widthPx) * totalSec;

      if (d.mode === "move") {
        setClipTiming(clipId, { startTime: d.origStart + deltaSec });
      } else if (d.mode === "resize-right") {
        setClipTiming(clipId, { duration: d.origDur + deltaSec });
      } else if (d.mode === "resize-left") {
        const nextStart = d.origStart + deltaSec;
        const nextDur = d.origDur - deltaSec;
        setClipTiming(clipId, { startTime: nextStart, duration: nextDur });
      }
    },
    [clipId, setClipTiming, totalSec],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  const startDrag = (
    e: React.PointerEvent,
    mode: DragMode,
    widthPx: number,
  ) => {
    if (!useTimelineStore.getState().clipsById[clipId]) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      mode,
      startClientX: e.clientX,
      origStart: clip.startTime,
      origDur: clip.duration,
      widthPx: Math.max(1, widthPx),
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
    };
  }, [endDrag, onPointerMove]);

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
            "group",
          )}
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 1.1)}%`,
          }}
          onPointerDown={(e) => {
            if (
              (e.target as HTMLElement).closest("[data-resize-handle]")
            ) {
              return;
            }
            selectClipWithStudioTab(clipId);
            const row = (e.currentTarget as HTMLElement).parentElement;
            const w = row?.getBoundingClientRect().width ?? 1;
            startDrag(e, "move", w);
          }}
        >
          <button
            type="button"
            data-resize-handle="left"
            aria-label="Trim start"
            className="relative z-10 w-2 shrink-0 cursor-ew-resize rounded-l-[inherit] border-r border-border/60 bg-muted/40 hover:bg-muted/70"
            onPointerDown={(e) => {
              selectClipWithStudioTab(clipId);
              const row = (e.currentTarget as HTMLElement).closest(
                ".timeline-row-area",
              );
              const w = row?.getBoundingClientRect().width ?? 1;
              startDrag(e, "resize-left", w);
            }}
          />
          <div className="relative flex min-w-0 flex-1 items-center gap-1 px-1 py-0.5">
            <ClipThumb clip={clip} lane={lane} />
            {isVoice && (
              <div
                className="pointer-events-none absolute inset-y-1 left-1 overflow-hidden rounded-sm bg-amber-500/15"
                style={{ width: `calc(${fillRatio * 100}% - 4px)` }}
              />
            )}
            <span className="relative line-clamp-2 text-[10px] font-medium leading-tight text-foreground/95">
              {clip.label ?? clip.mediaType}
            </span>
          </div>
          <button
            type="button"
            data-resize-handle="right"
            aria-label="Trim end"
            className="relative z-10 w-2 shrink-0 cursor-ew-resize rounded-r-[inherit] border-l border-border/60 bg-muted/40 hover:bg-muted/70"
            onPointerDown={(e) => {
              selectClipWithStudioTab(clipId);
              const row = (e.currentTarget as HTMLElement).closest(
                ".timeline-row-area",
              );
              const w = row?.getBoundingClientRect().width ?? 1;
              startDrag(e, "resize-right", w);
            }}
          />
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
  const moveSceneGroupByVisualClipId = useTimelineStore(
    (s) => s.moveSceneGroupByVisualClipId,
  );
  const selectedClipId = useTimelineStore((s) => s.selectedClipId);

  const dragRef = useRef<{
    startClientX: number;
    origStart: number;
    widthPx: number;
  } | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || !clip || isEndSceneClip(clip)) return;
      const dx = e.clientX - d.startClientX;
      const deltaSec = (dx / d.widthPx) * totalSec;
      moveSceneGroupByVisualClipId(clip.id, d.origStart + deltaSec);
    },
    [clip, moveSceneGroupByVisualClipId, totalSec],
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  const startDrag = (e: React.PointerEvent, widthPx: number) => {
    if (!clip || isEndSceneClip(clip)) return;
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = {
      startClientX: e.clientX,
      origStart: clip.startTime,
      widthPx: Math.max(1, widthPx),
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
    };
  }, [endDrag, onPointerMove]);

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
            isEnd && "cursor-default border-amber-500/35 bg-amber-950/15",
            !isEnd && "cursor-grab active:cursor-grabbing",
          )}
          style={{
            left: `${left}%`,
            width: `${Math.max(width, 0.8)}%`,
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
            selectClipWithStudioTab(clip.id);
            if (isEnd) return;
            const row = (e.currentTarget as HTMLElement).parentElement;
            const w = row?.getBoundingClientRect().width ?? 1;
            startDrag(e, w);
          }}
        >
          <div className="relative flex min-w-0 flex-1 items-center gap-1 px-1.5 py-0.5">
            {isEnd ? (
              <div
                data-no-drag
                className="flex size-7 shrink-0 items-center justify-center rounded-sm border border-amber-500/40 bg-amber-500/10"
              >
                <Lock className="size-3.5 text-amber-200/90" />
              </div>
            ) : (
              <ClipThumb clip={clip} lane="visual" />
            )}
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
          {isEnd ? " · locked outro" : ""}
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
  const [voBusy, setVoBusy] = useState(false);

  const totalSec = framesToSeconds(durationInFrames, fps);
  const playheadSec = framesToSeconds(playheadFrame, fps);

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
        return lane !== "visual" && lane !== "text" && lane !== "voice";
      }),
    [sorted],
  );

  const hasVoiceLane = sorted.some(
    (t) =>
      (typeof t.metadata?.lane === "string" && t.metadata.lane === "voice") ||
      t.name?.toLowerCase().includes("voice"),
  );

  const setVoiceoverAsset = useTimelineStore((s) => s.setVoiceoverAsset);

  async function onGenerateVoice() {
    setVoBusy(true);
    try {
      const state = useTimelineStore.getState();
      const json = JSON.stringify(serializeTimelineState(state));
      const res = await generateVoiceoverFromTimelineJson(projectId, json);
      if (!res.ok) {
        toast.error("Voiceover failed", { description: res.error });
        return;
      }
      setVoiceoverAsset(res.publicUrl, res.durationSecEstimate);
      toast.success("Voiceover synthesized", {
        description: "Saved to public/media.",
      });
    } finally {
      setVoBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Timeline
          </span>
          <Badge variant="secondary" className="font-mono text-[10px]">
            {totalSec.toFixed(1)}s · {fps} fps
          </Badge>
          {hasVoiceLane ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-border/80 bg-background/40 text-[11px] backdrop-blur-sm"
              disabled={voBusy}
              onClick={() => void onGenerateVoice()}
            >
              {voBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Mic2 className="size-3.5" />
              )}
              Generate voiceover
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="w-full pb-1">
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
                className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-primary shadow-[0_0_14px_rgba(250,250,250,0.45)]"
                style={{
                  left: `${totalSec > 0 ? (playheadSec / totalSec) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {timelineTracks.map((track) => {
            const lane =
              typeof track.metadata?.lane === "string"
                ? track.metadata.lane
                : track.type.toLowerCase();
            const Icon = laneIcon(lane);
            const accent = laneAccent[lane] ?? "border-l-primary/60";

            return (
              <div
                key={track.id}
                className={cn(
                  "flex border-b border-border/60 bg-muted/10",
                  "border-l-2",
                  accent,
                )}
              >
                <div className="flex w-36 shrink-0 items-center gap-2 border-r border-border/60 bg-sidebar/35 px-2 py-2 backdrop-blur-sm">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="truncate text-[11px] font-medium text-foreground/90">
                    {track.name ?? track.type}
                  </span>
                </div>
                <div
                  className="timeline-row-area relative min-h-11 flex-1 touch-none select-none"
                >
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
                    className="pointer-events-none absolute top-0 bottom-0 z-20 w-px bg-primary shadow-[0_0_14px_rgba(250,250,250,0.45)]"
                    style={{
                      left: `${totalSec > 0 ? (playheadSec / totalSec) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Separator className="bg-border/80" />

      <div className="space-y-1.5 px-0.5">
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
    </div>
  );
}
