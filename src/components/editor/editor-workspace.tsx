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
  const directorPlanApplied = useTimelineStore((s) => s.directorPlanApplied);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const durationInFrames = useTimelineStore((s) => s.durationInFrames);
  const fps = useTimelineStore((s) => s.fps);

  const currentSec = framesToSeconds(playheadFrame, fps);
  const totalSec = framesToSeconds(durationInFrames, fps);
  const headerBadgeLabel =
    projectId.toLowerCase() === "demo" ? "demo by Shahal K" : projectId;

  useEffect(() => {
    if (!isPlaying) return;
    const player = playerRef.current;
    player?.play();
    let rafId = 0;

    const tick = () => {
      const state = useTimelineStore.getState();
      const maxF = Math.max(0, state.durationInFrames - 1);
      const current = Math.floor(player?.getCurrentFrame?.() ?? state.playheadFrame);

      if (current >= maxF) {
        state.setPlayheadFrame(maxF);
        state.setIsPlaying(false);
        player?.pause();
        return;
      }

      state.setPlayheadFrame(current);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
    };
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
    <>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background lg:hidden">
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(120,119,198,0.2),transparent_40%),radial-gradient(circle_at_80%_85%,rgba(16,185,129,0.14),transparent_42%)]" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-black/35 p-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              AI Ad Studio
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
              Bigger Screen Required
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You need to be on a bigger screen to use AI AD STUDIO.
            </p>
          </div>
        </div>
      </div>

      <div className="hidden h-[100dvh] flex-col overflow-hidden bg-background lg:flex">
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
            {headerBadgeLabel}
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
                      {directorPlanApplied ? (
                        <div className="absolute inset-0">
                          <EditorRemotionPlayer ref={playerRef} />
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_20%_15%,rgba(120,119,198,0.2),transparent_40%),radial-gradient(circle_at_80%_85%,rgba(16,185,129,0.14),transparent_42%)]">
                          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/35 p-6 text-center shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                              Studio Preview
                            </p>
                            <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                              Generate Timeline First
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                              Create your first timeline from URL to unlock live
                              playback controls and the multi-track editor.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {directorPlanApplied ? (
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
              ) : null}
            </div>

            {directorPlanApplied ? (
              <div className="shrink-0 border-t border-border/80 bg-card/70 px-4 py-3 backdrop-blur-lg">
                <MultiTrackTimeline projectId={projectId} />
              </div>
            ) : (
              <div className="shrink-0 border-t border-border/80 bg-card/60 px-4 py-4 backdrop-blur-lg">
                <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Timeline editor unlocks after generation
                </p>
              </div>
            )}
          </div>

          {directorPlanApplied ? (
            <aside className="hidden w-[min(100%,360px)] shrink-0 overflow-y-auto border-l border-border/80 bg-sidebar/20 p-4 backdrop-blur-md lg:flex lg:flex-col">
              <InspectorPanel projectId={projectId} />
            </aside>
          ) : null}
        </div>
      </div>
    </>
  );
}
