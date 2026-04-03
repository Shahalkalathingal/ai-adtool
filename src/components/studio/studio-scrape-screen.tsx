"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useTimelineStore } from "@/lib/stores/timeline-store";

const DEMO_VIDEO_SRC = "https://cdn.vibe.co/assets/demo.mp4";

/** Expected ad creation window — progress maps linearly 0% → 100% over this duration (slower = calmer UX if jobs vary). */
const AD_CREATION_DURATION_MS = 60_000;

const TICK_MS = 80;

export function StudioScrapeScreen() {
  const directorPlanApplied = useTimelineStore((s) => s.directorPlanApplied);

  const [generationPct, setGenerationPct] = useState(0);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const v = previewVideoRef.current;
    if (!v) return;
    const onReady = () => {
      void v.play().catch(() => {});
    };
    v.addEventListener("canplay", onReady);
    return () => v.removeEventListener("canplay", onReady);
  }, []);

  useEffect(() => {
    if (directorPlanApplied) {
      setGenerationPct(100);
      return;
    }
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
    }
    const start = startedAtRef.current;

    const tick = () => {
      const elapsed = Date.now() - start;
      const linear = Math.min(
        100,
        (elapsed / AD_CREATION_DURATION_MS) * 100,
      );
      setGenerationPct(linear);
    };
    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [directorPlanApplied]);

  const pctRounded = Math.round(Math.min(100, Math.max(0, generationPct)));
  const showShimmer = !directorPlanApplied && pctRounded < 100;

  return (
    <div className="min-h-dvh bg-[#000000] font-sans text-white antialiased">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1440px] items-stretch px-4 py-6 md:px-8 md:py-8">
        <div className="grid min-h-[calc(100dvh-3rem)] w-full grid-cols-1 gap-4 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-2 lg:gap-6">
          <section className="flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#0a0a0a] px-8 py-12 md:px-12 md:py-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
              Vibe studio
            </p>
            <h1 className="mt-5 max-w-[420px] font-[var(--font-montserrat)] text-[32px] font-bold leading-[1.15] tracking-[-0.02em] text-white md:text-[38px]">
              We&apos;re creating your video.
              <br />
              It usually takes about a minute.
            </h1>
            <div className="mt-10 h-1.5 w-full max-w-[320px] overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-300"
                animate={{ x: ["-100%", "280%"] }}
                transition={{
                  duration: 1.4,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                }}
              />
            </div>

            <div
              className="mt-10 w-full max-w-[420px] rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 py-3.5 shadow-[0_0_0_1px_rgba(139,92,246,0.25),0_0_0_1px_rgba(56,189,248,0.12),0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm md:px-4 md:py-4"
              role="progressbar"
              aria-live="polite"
              aria-valuenow={pctRounded}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Ad creation progress"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
                  Progress
                </p>
                <span className="font-[var(--font-montserrat)] text-[22px] font-bold tabular-nums tracking-tight md:text-2xl">
                  <span className="bg-gradient-to-br from-violet-200 via-white to-cyan-200/90 bg-clip-text text-transparent">
                    {pctRounded}
                  </span>
                  <span className="text-[14px] font-semibold text-white/50 md:text-base">
                    %
                  </span>
                </span>
              </div>
              <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-white/[0.06]">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-300"
                  style={{
                    boxShadow:
                      "0 0 16px rgba(167,139,250,0.45), 0 0 28px rgba(56,189,248,0.18)",
                  }}
                  initial={false}
                  animate={{ width: `${pctRounded}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 28,
                  }}
                />
                {showShimmer ? (
                  <motion.div
                    className="pointer-events-none absolute inset-y-0 w-[38%] bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["-25%", "125%"] }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  />
                ) : null}
              </div>
            </div>
          </section>

          <section className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0a] lg:min-h-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(124,58,237,0.12),transparent),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.1),transparent)]" />
            <div className="relative z-10 flex h-full min-h-[320px] flex-col p-4 md:p-6">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.1] bg-[#111] shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
                <div className="flex items-center gap-2 border-b border-white/[0.08] bg-[#1a1a1c] px-3 py-2.5">
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-2.5 rounded-full bg-[#febc2e]" />
                  <span className="size-2.5 rounded-full bg-[#28c840]" />
                  <div className="ml-3 flex min-w-0 flex-1 items-center rounded-md border border-white/[0.08] bg-black/40 px-3 py-1">
                    <span className="truncate text-[11px] text-white/45">
                      platform.vibe.co/studio
                    </span>
                  </div>
                </div>
                <div className="relative min-h-0 flex-1 bg-gradient-to-br from-violet-950/40 via-[#0c0c0f] to-sky-950/30">
                  <div className="absolute inset-0 flex min-h-0 flex-col p-3 sm:p-4 md:p-5 lg:p-6">
                    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-black/45 p-3 backdrop-blur-sm sm:p-4">
                      <p className="shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 md:text-[11px]">
                        Social Media Ad Campaigns
                      </p>
                      <div className="relative mt-2 min-h-0 flex-1 overflow-hidden rounded-md bg-black ring-1 ring-white/10 md:mt-3">
                        <video
                          ref={previewVideoRef}
                          className="absolute inset-0 h-full w-full object-contain"
                          src={DEMO_VIDEO_SRC}
                          autoPlay
                          muted
                          playsInline
                          loop
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
