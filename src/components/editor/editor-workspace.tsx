"use client";

import type { PlayerRef } from "@remotion/player";
import { Clapperboard, Pause, Play } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditorRemotionPlayer } from "@/components/editor/editor-remotion-player";
import { InspectorPanel } from "@/components/editor/inspector-panel";
import { MultiTrackTimeline } from "@/components/editor/multi-track-timeline";
import { StudioShell } from "@/components/editor/studio-shell";
import { framesToSeconds } from "@/lib/types/timeline";
import { useTimelineStore } from "@/lib/stores/timeline-store";

type EditorWorkspaceProps = {
  projectId: string;
};

function formatTimecode(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function EditorWorkspace({ projectId }: EditorWorkspaceProps) {
  const playerRef = useRef<PlayerRef>(null);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const togglePlayback = useTimelineStore((s) => s.togglePlayback);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const durationInFrames = useTimelineStore((s) => s.durationInFrames);
  const fps = useTimelineStore((s) => s.fps);

  const currentSec = framesToSeconds(playheadFrame, fps);
  const totalSec = framesToSeconds(durationInFrames, fps);

  useEffect(() => {
    if (!isPlaying) return;

    let acc = useTimelineStore.getState().playheadFrame;
    let last = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const state = useTimelineStore.getState();
      const maxF = Math.max(0, state.durationInFrames - 1);
      const deltaSec = (now - last) / 1000;
      last = now;
      acc += deltaSec * state.fps;

      if (acc >= maxF) {
        state.setPlayheadFrame(maxF);
        playerRef.current?.seekTo(maxF);
        state.setIsPlaying(false);
        return;
      }

      const f = Math.floor(acc);
      state.setPlayheadFrame(f);
      playerRef.current?.seekTo(f);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " ") return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      togglePlayback();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [togglePlayback]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-background/80 px-5 py-3 backdrop-blur-md">
        <div className="min-w-0 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            AI Ad Studio
          </p>
          <div className="flex items-center gap-2">
            <Clapperboard className="size-5 text-muted-foreground" />
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
              Studio
            </h1>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-border/80 bg-card/40 font-mono text-[10px] backdrop-blur-sm"
        >
          {projectId}
        </Badge>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex h-full min-h-0 w-[min(100%,400px)] shrink-0 overflow-hidden">
          <StudioShell projectId={projectId} />
        </aside>

        <div className="flex min-w-0 min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {/* Letterboxed 16:9 stage — fixed max height so timeline never overlaps preview */}
            <div className="relative flex min-h-0 flex-1 flex-col bg-black">
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-3">
                <div className="mx-auto w-full max-w-[1040px] shrink-0 px-1">
                  <div
                    className="relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10"
                    style={{
                      aspectRatio: "16 / 9",
                      maxHeight: "min(56vh, calc(100dvh - 300px))",
                    }}
                  >
                    <div className="absolute inset-0">
                      <EditorRemotionPlayer ref={playerRef} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-center gap-3 border-y border-border/70 bg-card/50 px-4 py-2.5 backdrop-blur-md">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="size-10 shrink-0 rounded-full shadow-sm"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="size-5" fill="currentColor" />
                ) : (
                  <Play className="size-5 pl-0.5" fill="currentColor" />
                )}
              </Button>
              <span className="min-w-[8.5rem] text-center font-mono text-xs tabular-nums text-foreground/90">
                {formatTimecode(currentSec)} / {formatTimecode(totalSec)}
              </span>
            </div>
          </div>

          <div className="shrink-0 border-t border-border/80 bg-card/70 px-4 py-3 backdrop-blur-lg max-h-[min(44vh,320px)] overflow-y-auto">
            <MultiTrackTimeline projectId={projectId} />
          </div>
        </div>

        <aside className="hidden w-[min(100%,360px)] shrink-0 overflow-y-auto border-l border-border/80 bg-sidebar/20 p-4 backdrop-blur-md lg:flex lg:flex-col">
          <InspectorPanel projectId={projectId} />
        </aside>
      </div>
    </div>
  );
}
