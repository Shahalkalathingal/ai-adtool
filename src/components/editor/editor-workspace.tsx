"use client";

import type { PlayerRef } from "@remotion/player";
import { motion } from "framer-motion";
import { Clapperboard, Maximize2, Minimize2, Pause, Play, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExportStudioModal } from "@/components/editor/export-studio-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditorRemotionPlayer } from "@/components/editor/editor-remotion-player";
import { InspectorPanel } from "@/components/editor/inspector-panel";
import { MultiTrackTimeline } from "@/components/editor/multi-track-timeline";
import { StudioShell } from "@/components/editor/studio-shell";
import { framesToSeconds } from "@/lib/types/timeline";
import {
  STUDIO_ASSEMBLY_MS,
  useStudioEntranceStore,
} from "@/lib/stores/studio-entrance-store";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const playerRef = useRef<PlayerRef>(null);
  const previewShellRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const transportRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [showGoBackPrompt, setShowGoBackPrompt] = useState(false);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [previewMaxHeightPx, setPreviewMaxHeightPx] = useState(560);
  const entrancePhase = useStudioEntranceStore((s) => s.phase);
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

  const assemblySec = STUDIO_ASSEMBLY_MS / 1000;
  const assemblyEase = [0.22, 1, 0.36, 1] as const;
  const instant = { duration: 0 } as const;
  const shouldBootHide =
    entrancePhase === "boot" || entrancePhase === "ignition";
  const cinematicIdle = entrancePhase === "idle";

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

  const onConfirmGoBack = () => {
    setShowGoBackPrompt(false);
    router.push("/");
  };

  const togglePreviewFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      const node = previewShellRef.current;
      if (!node) return;
      await node.requestFullscreen();
    } catch {
      // Fullscreen may fail on browser restrictions; ignore gracefully.
    }
  };

  useEffect(() => {
    const clamp = (n: number, min: number, max: number) =>
      Math.max(min, Math.min(max, n));

    const recalc = () => {
      const viewportH = window.innerHeight;
      const headerH = headerRef.current?.offsetHeight ?? 0;
      const transportH = transportRef.current?.offsetHeight ?? 0;
      const timelineH = timelineRef.current?.offsetHeight ?? 0;
      // Safety buffer covers paddings/borders/gaps to prevent overlap at high zoom.
      const chromeBuffer = 46;
      const available = viewportH - headerH - transportH - timelineH - chromeBuffer;
      const next = clamp(Math.floor(available * 0.94), 260, 720);
      setPreviewMaxHeightPx(next);
    };

    recalc();
    const ro = new ResizeObserver(() => recalc());
    if (headerRef.current) ro.observe(headerRef.current);
    if (transportRef.current) ro.observe(transportRef.current);
    if (timelineRef.current) ro.observe(timelineRef.current);
    window.addEventListener("resize", recalc);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, [directorPlanApplied]);

  useEffect(() => {
    const onFs = () => {
      setIsPreviewFullscreen(document.fullscreenElement === previewShellRef.current);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

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
        <motion.header
          ref={headerRef}
          className="flex shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-background/80 px-5 py-3 backdrop-blur-md"
          initial={false}
          animate={
            cinematicIdle
              ? { y: 0, opacity: 1 }
              : shouldBootHide
                ? { y: -28, opacity: 0 }
                : { y: 0, opacity: 1 }
          }
          transition={
            cinematicIdle || shouldBootHide
              ? instant
              : { duration: assemblySec, ease: assemblyEase }
          }
        >
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
          <div className="flex shrink-0 items-center gap-3">
            <Badge
              variant="outline"
              className="border-border/80 bg-card/40 font-mono text-[10px] backdrop-blur-sm"
            >
              {headerBadgeLabel}
            </Badge>
            {directorPlanApplied ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-9 shrink-0 border-amber-200/20 bg-amber-50/5 px-4 text-xs font-semibold tracking-tight text-amber-100",
                    "shadow-[0_6px_18px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]",
                    "transition-[transform,filter] hover:scale-[1.02] hover:bg-amber-100/10",
                  )}
                  onClick={() => setShowGoBackPrompt(true)}
                >
                  Go Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={cn(
                    "export-save-shimmer relative h-9 shrink-0 border border-white/[0.14] px-4 text-xs font-semibold tracking-tight text-white",
                    "bg-gradient-to-b from-[oklch(0.58_0.14_264)] via-[oklch(0.51_0.15_262)] to-[oklch(0.43_0.14_260)]",
                    "shadow-[0_0_22px_rgba(59,130,246,0.4),0_4px_18px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.16)]",
                    "transition-[transform,filter,box-shadow] hover:scale-[1.02] hover:brightness-[1.05]",
                    "hover:shadow-[0_0_30px_rgba(96,165,250,0.48),0_6px_22px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]",
                  )}
                  onClick={() => setExportOpen(true)}
                >
                  Save &amp; Continue
                </Button>
              </>
            ) : null}
          </div>
        </motion.header>

        <div className="flex min-h-0 flex-1">
          <motion.aside
            className="flex h-full min-h-0 w-[min(100%,400px)] shrink-0 overflow-hidden"
            initial={false}
            animate={
              cinematicIdle
                ? { x: 0, opacity: 1 }
                : shouldBootHide
                  ? { x: -52, opacity: 0 }
                  : { x: 0, opacity: 1 }
            }
            transition={
              cinematicIdle || shouldBootHide
                ? instant
                : {
                    type: "spring",
                    stiffness: 380,
                    damping: 28,
                    mass: 0.78,
                  }
            }
          >
            <StudioShell projectId={projectId} />
          </motion.aside>

          <div className="flex min-w-0 min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {/* Letterboxed 16:9 stage — fixed max height so timeline never overlaps preview */}
              <div className="relative flex min-h-0 flex-1 flex-col bg-black">
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-3">
                  <div className="mx-auto w-full max-w-[1040px] shrink-0 px-1">
                    <motion.div
                      ref={previewShellRef}
                      className="relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/10"
                      style={{
                        aspectRatio: "16 / 9",
                        maxHeight: `${previewMaxHeightPx}px`,
                      }}
                      initial={false}
                      animate={
                        cinematicIdle
                          ? {
                              scale: 1,
                              opacity: 1,
                              filter: "blur(0px)",
                            }
                          : shouldBootHide
                            ? {
                                scale: 0.9,
                                opacity: 0.65,
                                filter: "blur(12px)",
                              }
                            : {
                                scale: 1,
                                opacity: 1,
                                filter: "blur(0px)",
                              }
                      }
                      transition={
                        cinematicIdle || shouldBootHide
                          ? instant
                          : {
                              duration: assemblySec,
                              ease: assemblyEase,
                            }
                      }
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
                      {directorPlanApplied ? (
                        <button
                          type="button"
                          onClick={() => void togglePreviewFullscreen()}
                          className="absolute bottom-3 right-3 z-40 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:border-white/35 hover:bg-black/70"
                          aria-label={
                            isPreviewFullscreen
                              ? "Exit fullscreen preview"
                              : "Enter fullscreen preview"
                          }
                          title={
                            isPreviewFullscreen
                              ? "Exit fullscreen"
                              : "Fullscreen"
                          }
                        >
                          {isPreviewFullscreen ? (
                            <Minimize2 className="size-3.5" />
                          ) : (
                            <Maximize2 className="size-3.5" />
                          )}
                          {isPreviewFullscreen ? "Exit" : "Fullscreen"}
                        </button>
                      ) : null}
                    </motion.div>
                  </div>
                </div>
              </div>

              {directorPlanApplied ? (
                <motion.div
                  ref={transportRef}
                  className="flex shrink-0 items-center justify-center gap-3 border-y border-border/70 bg-card/50 px-4 py-2.5 backdrop-blur-md"
                  initial={false}
                  animate={
                    cinematicIdle
                      ? { opacity: 1, y: 0 }
                      : shouldBootHide
                        ? { opacity: 0, y: 14 }
                        : { opacity: 1, y: 0 }
                  }
                  transition={
                    cinematicIdle || shouldBootHide
                      ? instant
                      : { duration: assemblySec, ease: assemblyEase }
                  }
                >
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
                </motion.div>
              ) : null}
            </div>

            {directorPlanApplied ? (
              <motion.div
                ref={timelineRef}
                className="shrink-0 border-t border-border/80 bg-card/70 px-4 py-3 backdrop-blur-lg"
                initial={false}
                animate={
                  cinematicIdle
                    ? { y: 0, opacity: 1 }
                    : shouldBootHide
                      ? { y: 48, opacity: 0 }
                      : { y: 0, opacity: 1 }
                }
                transition={
                  cinematicIdle || shouldBootHide
                    ? instant
                    : { duration: assemblySec, ease: assemblyEase }
                }
              >
                <MultiTrackTimeline projectId={projectId} />
              </motion.div>
            ) : (
              <motion.div
                ref={timelineRef}
                className="shrink-0 border-t border-border/80 bg-card/60 px-4 py-4 backdrop-blur-lg"
                initial={false}
                animate={
                  cinematicIdle
                    ? { y: 0, opacity: 1 }
                    : shouldBootHide
                      ? { y: 40, opacity: 0 }
                      : { y: 0, opacity: 1 }
                }
                transition={
                  cinematicIdle || shouldBootHide
                    ? instant
                    : { duration: assemblySec, ease: assemblyEase }
                }
              >
                <p className="text-center text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Timeline editor unlocks after generation
                </p>
              </motion.div>
            )}
          </div>

          {directorPlanApplied ? (
            <motion.aside
              className="hidden w-[min(100%,360px)] shrink-0 overflow-y-auto border-l border-border/80 bg-sidebar/20 p-4 backdrop-blur-md lg:flex lg:flex-col"
              initial={false}
              animate={
                cinematicIdle
                  ? { x: 0, opacity: 1 }
                  : shouldBootHide
                    ? { x: 56, opacity: 0 }
                    : { x: 0, opacity: 1 }
              }
              transition={
                cinematicIdle || shouldBootHide
                  ? instant
                  : {
                      duration: assemblySec,
                      ease: assemblyEase,
                      delay: 0.06,
                    }
              }
            >
              <InspectorPanel />
            </motion.aside>
          ) : null}
        </div>

        <ExportStudioModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
        />
      </div>
      {showGoBackPrompt ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md rounded-2xl border border-white/15 bg-neutral-950/95 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.6)]"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-200/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100">
              <TriangleAlert className="size-3.5" />
              Unsaved Progress
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-white">
              Your progress is not saved.
            </h3>
            <p className="mt-1.5 text-sm text-zinc-300">
              Do you want to go back? Any unsaved timeline edits may be lost.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-700 bg-zinc-900/60 text-zinc-100 hover:bg-zinc-800"
                onClick={() => setShowGoBackPrompt(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-amber-600 text-white hover:bg-amber-500"
                onClick={onConfirmGoBack}
              >
                Go Back
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </>
  );
}
