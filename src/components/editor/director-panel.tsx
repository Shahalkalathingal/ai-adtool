"use client";

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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefinerChat } from "@/components/editor/refiner-chat";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { listSceneVisualClips } from "@/lib/timeline/scene-utils";
import { framesToSeconds } from "@/lib/types/timeline";

export function DirectorPanel() {
  const params = useParams();
  const projectId = typeof params.id === "string" ? params.id : "draft";
  const [url, setUrl] = useState("https://");
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
  const updateClipProperty = useTimelineStore((s) => s.updateClipProperty);
  const selectClipWithStudioTab = useTimelineStore(
    (s) => s.selectClipWithStudioTab,
  );
  const directorPlanApplied = useTimelineStore((s) => s.directorPlanApplied);

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

  const STEPS = useMemo(
    () => [
      "🔍 Scraping Brand Assets...",
      "🧠 Gemini Analyzing Content...",
      "🎬 Structuring Scenes & Scripts...",
      "✨ Finalizing Studio Timeline...",
    ],
    [],
  );

  async function onGenerate() {
    setPending(true);
    setStepIndex(0);
    setProgressPct(4);
    const t1 = window.setTimeout(() => setStepIndex(1), 700);
    const t2 = window.setTimeout(() => setStepIndex(2), 1500);
    const t3 = window.setTimeout(() => setStepIndex(3), 2200);
    const ticker = window.setInterval(() => {
      setProgressPct((p) => {
        const cap = 95;
        return p >= cap ? p : p + 1;
      });
    }, 120);
    try {
      const result = await generateDirectorPlanFromUrl(url);
      if (!result.ok) {
        toast.error("Director failed", { description: result.error });
        return;
      }
      hydrateFromDirectorPlan(result.plan, projectId, {
        sourceUrl: url.trim(),
        contactHints: result.contactHints,
        pageIntel: result.pageIntel,
      });
      setStepIndex(3);
      setProgressPct(100);
      toast.success("Timeline generated", {
        description: `${result.plan.scenes.length} scenes · ${Math.round(result.plan.totalDurationSec)}s`,
      });
    } finally {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearInterval(ticker);
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
        <Card className="border-border/80 bg-card/50 shadow-none">
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base font-semibold tracking-tight">
              Director generation
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Building the studio timeline in 4 phases.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border/70 bg-background/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Studio pipeline
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-primary/15 border-primary/20 text-primary"
                  >
                    Working
                  </Badge>
                  <span className="min-w-[3ch] text-right font-mono text-xs text-foreground/90">
                    {Math.min(100, Math.max(0, Math.round(progressPct)))}%
                  </span>
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background/70">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                  style={{
                    width: `${Math.min(100, Math.max(0, Math.round(progressPct)))}%`,
                  }}
                />
              </div>
              <div className="mt-3 space-y-2">
                {STEPS.map((label, i) => {
                  const done = i < stepIndex;
                  const active = i === stepIndex;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <span className="relative inline-flex size-6 items-center justify-center">
                        {done ? (
                          <CheckCircle2 className="size-5 text-emerald-300" />
                        ) : active ? (
                          <Loader2 className="size-5 animate-spin text-primary" />
                        ) : (
                          <span className="inline-flex size-5 rounded-full border border-border/80" />
                        )}
                      </span>
                      <p
                        className={[
                          "text-[12px] leading-tight",
                          done
                            ? "text-foreground/90"
                            : active
                              ? "text-primary"
                              : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
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
