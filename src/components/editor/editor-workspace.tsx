"use client";

import type { PlayerRef } from "@remotion/player";
import { motion } from "framer-motion";
import { Maximize2, Minimize2, Play, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ExportStudioModal } from "@/components/editor/export-studio-modal";
import { Button } from "@/components/ui/button";
import { EditorRemotionPlayer } from "@/components/editor/editor-remotion-player";
import { InspectorPanel } from "@/components/editor/inspector-panel";
import { MultiTrackTimeline } from "@/components/editor/multi-track-timeline";
import { StudioShell } from "@/components/editor/studio-shell";
import { AiAdToolMark } from "@/components/editor/vibe-studio-mark";
import {
  STUDIO_ASSEMBLY_MS,
  useStudioEntranceStore,
} from "@/lib/stores/studio-entrance-store";
import { useAutoVoiceoverOnTimeline } from "@/hooks/use-auto-voiceover-on-timeline";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { VIBE_STUDIO } from "@/lib/ui/vibe-studio-tokens";

type EditorWorkspaceProps = {
  projectId: string;
};

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

  useAutoVoiceoverOnTimeline(projectId);

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
    router.push("/studio");
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
      const timelineH = timelineRef.current?.offsetHeight ?? 0;
      // Safety buffer covers paddings/borders/gaps to prevent overlap at high zoom.
      const chromeBuffer = 46;
      const available = viewportH - headerH - timelineH - chromeBuffer;
      const next = clamp(Math.floor(available * 0.94), 260, 720);
      setPreviewMaxHeightPx(next);
    };

    recalc();
    const ro = new ResizeObserver(() => recalc());
    if (headerRef.current) ro.observe(headerRef.current);
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

      <div
        className="hidden h-[100dvh] flex-col overflow-hidden lg:flex"
        style={{ backgroundColor: VIBE_STUDIO.canvasBg }}
      >
        <motion.header
          ref={headerRef}
          className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-2.5 md:px-5"
          style={{
            backgroundColor: VIBE_STUDIO.navBg,
            borderColor: VIBE_STUDIO.borderSubtle,
          }}
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
          <AiAdToolMark />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 shrink-0 rounded-lg text-white/70 hover:bg-white/[0.08] hover:text-white"
            aria-label="Close studio"
            onClick={() => setShowGoBackPrompt(true)}
          >
            <X className="size-5" strokeWidth={1.5} />
          </Button>
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
              <div
                className="relative flex min-h-0 flex-1 flex-col"
                style={{ backgroundColor: VIBE_STUDIO.canvasBg }}
              >
                <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 py-3">
                  <div className="mx-auto w-full max-w-[1040px] shrink-0 px-1">
                    <motion.div
                      ref={previewShellRef}
                      className="relative w-full overflow-hidden rounded-lg bg-black ring-1 ring-white/[0.08]"
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
                        <>
                          <div className="absolute inset-0">
                            <EditorRemotionPlayer ref={playerRef} />
                          </div>
                          {!isPlaying ? (
                            <button
                              type="button"
                              className="absolute inset-0 z-30 flex items-center justify-center bg-black/25 transition hover:bg-black/35"
                              aria-label="Play preview"
                              onClick={() => setIsPlaying(true)}
                            >
                              <span className="flex size-[68px] items-center justify-center rounded-full bg-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
                                <Play
                                  className="ml-1 size-7 text-black"
                                  fill="currentColor"
                                  strokeWidth={0}
                                />
                              </span>
                            </button>
                          ) : null}
                        </>
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

            </div>

            {directorPlanApplied ? (
              <motion.div
                ref={timelineRef}
                className="shrink-0 border-t px-2 py-2 md:px-3"
                style={{
                  backgroundColor: VIBE_STUDIO.panelBg,
                  borderColor: VIBE_STUDIO.borderSubtle,
                }}
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
                className="shrink-0 border-t px-4 py-4"
                style={{
                  backgroundColor: VIBE_STUDIO.panelBg,
                  borderColor: VIBE_STUDIO.borderSubtle,
                }}
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
                <p className="text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Timeline unlocks after generation
                </p>
              </motion.div>
            )}
          </div>

          {directorPlanApplied ? (
            <motion.aside
              className="hidden w-[min(100%,340px)] shrink-0 overflow-y-auto border-l p-3 md:p-4 lg:flex lg:flex-col"
              style={{
                backgroundColor: VIBE_STUDIO.panelBg,
                borderColor: VIBE_STUDIO.borderSubtle,
              }}
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
          projectId={projectId}
        />

        {directorPlanApplied ? (
          <div className="pointer-events-none fixed bottom-5 right-5 z-[120] flex flex-wrap items-center justify-end gap-2 md:bottom-6 md:right-6">
            <Button
              type="button"
              className="pointer-events-auto h-10 rounded-lg px-6 text-xs font-semibold text-white shadow-[0_14px_40px_rgba(79,70,229,0.42)] hover:opacity-95"
              style={{ backgroundColor: VIBE_STUDIO.saveCta }}
              onClick={() => setExportOpen(true)}
            >
              Save and continue
            </Button>
          </div>
        ) : null}
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
