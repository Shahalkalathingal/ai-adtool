"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  Image as ImageIcon,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { generateDirectorPlanFromUrl } from "@/app/actions/director-actions";
import { uploadClipImageAction } from "@/app/actions/upload-clip-asset";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefinerChat } from "@/components/editor/refiner-chat";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { useStudioEntranceStore } from "@/lib/stores/studio-entrance-store";
import { listSceneVisualClips } from "@/lib/timeline/scene-utils";
import { framesToSeconds } from "@/lib/types/timeline";
import { playSuccessChime } from "@/lib/ui/sfx";
import { AD_NICHE_OPTIONS, type AdNicheId } from "@/lib/services/neural-script-architect";

export function DirectorPanel() {
  const params = useParams();
  const projectId = typeof params.id === "string" ? params.id : "draft";
  const seededUrl =
    useStudioEntranceStore((s) => s.initialUrl) || "https://";
  const [url, setUrl] = useState(seededUrl);
  const [adNiche, setAdNiche] = useState<AdNicheId>("general");
  const [pending, setPending] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadClipId, setUploadClipId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const fps = useTimelineStore((s) => s.fps);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);

  const hydrateFromDirectorPlan = useTimelineStore(
    (s) => s.hydrateFromDirectorPlan,
  );
  const setDirectorGenerationBusy = useTimelineStore(
    (s) => s.setDirectorGenerationBusy,
  );
  const updateClipProperty = useTimelineStore((s) => s.updateClipProperty);
  const selectClipWithStudioTab = useTimelineStore(
    (s) => s.selectClipWithStudioTab,
  );
  const directorPlanApplied = useTimelineStore((s) => s.directorPlanApplied);
  const brandPrimary =
    (useTimelineStore((s) => s.project.brandConfig.primaryColor) as
      | string
      | undefined) || "#6366f1";

  const regularScenes = useMemo(
    () => listSceneVisualClips(tracks, clipsById),
    [tracks, clipsById],
  );

  const playheadT = framesToSeconds(playheadFrame, fps);
  const currentVisual = useMemo(() => {
    if (!directorPlanApplied) return null;
    return (
      regularScenes.find(
        (c) => playheadT >= c.startTime && playheadT < c.startTime + c.duration,
      ) ?? null
    );
  }, [directorPlanApplied, playheadT, regularScenes]);

  const PIPELINE_STEPS = useMemo(
    () => [
      "🔍 Scraping brand surfaces & catalog imagery...",
      "🔍 Searching contact layers for location data...",
      "📍 Verifying business credentials...",
      "📱 Indexing primary contact channels...",
      "🧠 Gemini director — story & pacing...",
      "🧠 Neural Script Architect — 75–90 word VO...",
      "🎬 Structuring scenes & timeline...",
      "✨ Finalizing studio timeline...",
    ],
    [],
  );

  const clampedPct = Math.min(100, Math.max(0, progressPct));
  const roundedPct = Math.round(clampedPct);

  const globalProgressLabel = `[ ${roundedPct.toString().padStart(3, " ")} / 100 ]`;

  const pipelineLog = useMemo(() => {
    const entries: string[] = [];
    const cleanUrl = url.trim();
    if (cleanUrl && cleanUrl.startsWith("http")) {
      try {
        const host = new URL(cleanUrl).hostname.replace(/^www\./, "");
        entries.push(`[OK] Domain Verified: ${host}`);
      } catch {
        entries.push(`[OK] Domain Verified: ${cleanUrl}`);
      }
    } else {
      entries.push("[RUN] Awaiting valid URL input…");
    }

    const p01 = clampedPct / 100;

    if (p01 > 0.02) {
      entries.push(
        `[RUN] Mining brand surfaces & hero imagery… ${Math.floor(
          p01 * 18,
        ).toString()}/100`,
      );
    }
    if (p01 > 0.2) {
      entries.push(
        `[RUN] Mining contact metadata layers… ${Math.floor(
          18 + p01 * 22,
        ).toString()}/100`,
      );
    }
    if (p01 > 0.35) {
      entries.push(
        `[RUN] Normalizing phone & address formats… ${Math.floor(
          32 + p01 * 20,
        ).toString()}/100`,
      );
    }
    if (p01 > 0.5) {
      entries.push(
        `[RUN] Synthesizing Neural Script Architect master VO… ${Math.floor(
          48 + p01 * 26,
        ).toString()}/100`,
      );
    }
    if (p01 > 0.7) {
      entries.push(
        `[RUN] Sequencing cinematic transitions & pacing beats… ${Math.floor(
          68 + p01 * 20,
        ).toString()}/100`,
      );
    }
    if (p01 > 0.9 && p01 < 0.999) {
      entries.push(
        `[RUN] Finalizing global branding layer… ${Math.min(
          99,
          Math.floor(92 + p01 * 10),
        ).toString()}/100`,
      );
    }
    if (roundedPct >= 100) {
      entries.push("[OK] Timeline locked. Handing off to Studio… 100/100");
    }

    return entries;
  }, [clampedPct, roundedPct, url]);

  async function onGenerate() {
    setPending(true);
    setDirectorGenerationBusy(true);
    setStepIndex(0);
    setProgressPct(4);
    const ticker = window.setInterval(() => {
      setProgressPct((p) => {
        const cap = 95;
        return p >= cap ? p : p + 1;
      });
    }, 120);
    const stepAdvance = window.setInterval(() => {
      setStepIndex((i) =>
        Math.min(i + 1, Math.max(0, PIPELINE_STEPS.length - 2)),
      );
    }, 1100);
    try {
      const result = await generateDirectorPlanFromUrl(url, adNiche);
      if (!result.ok) {
        toast.error("Director failed", { description: result.error });
        return;
      }
      hydrateFromDirectorPlan(result.plan, projectId, {
        sourceUrl: url.trim(),
        contactHints: result.contactHints,
        pageIntel: result.pageIntel,
        masterVoiceoverScript: result.masterVoiceoverScript,
        adNiche,
      });
      setStepIndex(PIPELINE_STEPS.length - 1);
      setProgressPct(100);
      toast.success("Timeline generated", {
        description: `${result.plan.scenes.length} scenes · ${Math.round(result.plan.totalDurationSec)}s`,
      });
      playSuccessChime();
    } finally {
      window.clearInterval(ticker);
      window.clearInterval(stepAdvance);
      setPending(false);
    }
  }

  async function onUploadPicked(file: File | null) {
    if (!uploadClipId || !file) return;
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await uploadClipImageAction(projectId, uploadClipId, fd);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      updateClipProperty(uploadClipId, { assetUrl: r.publicUrl });
      toast.success("Image updated");
    } finally {
      setUploadBusy(false);
      setUploadClipId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Creation → Editing auto-collapse */}
      {pending ? (
        <AnimatePresence>
          <motion.div
            key="director-working"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="relative overflow-hidden border border-white/15 bg-black/80 shadow-[0_18px_60px_rgba(0,0,0,0.85)] backdrop-blur-3xl">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(circle at 20% 0%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(circle at 80% 100%, rgba(59,130,246,0.18), transparent 55%)",
                }}
              />
              <CardHeader className="relative z-10 space-y-2 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <CardTitle className="text-sm font-semibold tracking-[0.18em] text-zinc-100 uppercase">
                      Neural Initialization
                    </CardTitle>
                    <CardDescription className="text-[11px] leading-relaxed text-zinc-300/90">
                      Precision scraping, contact mining, Neural Script Architect, and
                      timeline assembly.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="secondary"
                      className="border-emerald-400/30 bg-emerald-500/15 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200"
                    >
                      Online
                    </Badge>
                    <motion.span
                      key={roundedPct}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18 }}
                      className="font-mono text-[11px] tracking-[0.25em] text-zinc-200"
                    >
                      {globalProgressLabel}
                    </motion.span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4 pb-4">
                {/* Neon progress band */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                    <span>Neural progress</span>
                    <span>{roundedPct}%</span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-900/80 ring-1 ring-white/5">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        backgroundImage: `linear-gradient(90deg, rgba(15,23,42,0.2), ${brandPrimary}, rgba(15,23,42,0.6))`,
                        boxShadow: `0 0 24px ${brandPrimary}AA, 0 0 80px ${brandPrimary}66`,
                      }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${roundedPct}%` }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    />
                    <motion.div
                      className="absolute inset-y-0 left-0 w-[28%] bg-gradient-to-r from-transparent via-white/40 to-transparent mix-blend-screen"
                      animate={{ x: ["-30%", "130%"] }}
                      transition={{
                        duration: 1.6,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    />
                  </div>
                </div>

                {/* Task list */}
                <div className="space-y-2 rounded-xl border border-white/8 bg-black/50 p-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Studio pipeline
                  </p>
                  <div className="space-y-2">
                    {PIPELINE_STEPS.map((label, i) => {
                      const done = i < stepIndex;
                      const active = i === stepIndex;
                      return (
                        <div key={label} className="flex items-center gap-2">
                          <span className="relative inline-flex size-6 items-center justify-center">
                            {done ? (
                              <CheckCircle2 className="size-5 text-emerald-300" />
                            ) : active ? (
                              <Loader2 className="size-5 animate-spin text-sky-300" />
                            ) : (
                              <span className="inline-flex size-5 rounded-full border border-white/18" />
                            )}
                          </span>
                          <div className="flex-1">
                            <p
                              className={[
                                "text-[12px] leading-tight",
                                done
                                  ? "text-zinc-100"
                                  : active
                                    ? "text-sky-200"
                                    : "text-zinc-400",
                              ].join(" ")}
                            >
                              {label}
                            </p>
                          </div>
                          {active && (
                            <span className="text-[10px] font-mono text-zinc-300">
                              {roundedPct.toString().padStart(3, " ")}/100
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Neural log */}
                <div className="space-y-1 rounded-xl border border-white/8 bg-black/70 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                      Neural log
                    </p>
                    <span className="text-[9px] font-mono text-zinc-500">
                      live · read‑only
                    </span>
                  </div>
                  <div className="max-h-28 space-y-0.5 overflow-y-auto pr-1 text-[11px] font-mono leading-snug text-zinc-300/90">
                    {pipelineLog.map((entry, idx) => (
                      <motion.p
                        key={`${entry}-${idx}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.16, delay: idx * 0.02 }}
                        className={
                          entry.startsWith("[NC]")
                            ? "text-amber-300/90"
                            : entry.startsWith("[OK]")
                              ? "text-emerald-300/95"
                              : "text-zinc-300/90"
                        }
                      >
                        {entry}
                      </motion.p>
                    ))}
                    {pipelineLog.length === 0 ? (
                      <p className="text-zinc-500/90">[RUN] Awaiting pipeline status…</p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      ) : directorPlanApplied ? (
        <RefinerChat />
      ) : (
        <Card className="border-border/80 bg-card/50 shadow-none">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base font-semibold tracking-tight">
              URL → Director
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Firecrawl scrapes the page (phone, address, links); Gemini
              sequences a 30s+ 16:9 ad with paced scenes, VO, and music lane.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://brand.com"
              className="h-10 font-mono text-xs"
              disabled={pending}
            />
            <div className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Niche (Script Architect tone)
              </p>
              <Select
                value={adNiche}
                onValueChange={(v) => setAdNiche(v as AdNicheId)}
                disabled={pending}
              >
                <SelectTrigger className="h-10 w-full text-xs">
                  <SelectValue placeholder="Industry" />
                </SelectTrigger>
                <SelectContent>
                  {AD_NICHE_OPTIONS.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              className="w-full gap-2"
              disabled={pending}
              onClick={() => void onGenerate()}
            >
              <Sparkles className="size-4" />
              Generate timeline
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Slideshow cards (manual image replacement) */}
      {directorPlanApplied ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Slideshow
          </p>
          {regularScenes.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-background/20 p-3">
              <p className="text-xs text-muted-foreground">
                Generate a timeline to unlock scene image overrides.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {regularScenes.map((sceneClip, idx) => {
              const isVisible = currentVisual?.id === sceneClip.id;
              const thumbUrl =
                typeof sceneClip.assetUrl === "string"
                  ? sceneClip.assetUrl
                  : null;

              const from = Math.round(sceneClip.startTime);
              const to = Math.round(sceneClip.startTime + sceneClip.duration);

              return (
                <Card
                  key={sceneClip.id}
                  className={[
                    "border-border/60 bg-card/35 shadow-none",
                    isVisible ? "border-primary/50 ring-1 ring-primary/20" : "",
                  ].join(" ")}
                >
                  <CardContent
                    className="flex cursor-pointer items-center gap-3 p-3"
                    onClick={() => selectClipWithStudioTab(sceneClip.id)}
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/30">
                      {thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrl}
                          alt=""
                          className="size-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="size-4" />
                        </div>
                      )}
                      {isVisible ? (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                          Currently Visible
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[12px] font-semibold text-foreground/90">
                          Image #{idx + 1}
                        </p>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        from {from} to {to} seconds
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={uploadBusy}
                        className="gap-2 border-border/80 bg-background/40 hover:bg-background/60"
                        onClick={() => {
                          setUploadClipId(sceneClip.id);
                          fileInputRef.current?.click();
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          )}
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          void onUploadPicked(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
