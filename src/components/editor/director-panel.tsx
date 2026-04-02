"use client";

import {
  ChevronDown,
  GripVertical,
  MoreVertical,
  Pencil,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { generateDirectorPlanFromUrl } from "@/app/actions/director-actions";
import { uploadClipImageAction } from "@/app/actions/upload-clip-asset";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { useStudioEntranceStore } from "@/lib/stores/studio-entrance-store";
import { listSceneVisualClips } from "@/lib/timeline/scene-utils";
import { framesToSeconds } from "@/lib/types/timeline";
import type { AdNicheId } from "@/lib/services/neural-script-architect";
import { playSuccessChime } from "@/lib/ui/sfx";
import { VIBE_STUDIO } from "@/lib/ui/vibe-studio-tokens";
import { cn } from "@/lib/utils";

export function DirectorPanel() {
  const params = useParams();
  const projectId =
    typeof params.projectId === "string" && params.projectId.trim()
      ? params.projectId
      : typeof params.id === "string"
        ? params.id
        : "draft";
  const seededUrl = useStudioEntranceStore((s) => s.initialUrl?.trim() ?? "");
  const [url, setUrl] = useState(seededUrl);
  const adNiche: AdNicheId = "general";
  const [pending, setPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadClipId, setUploadClipId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const autoTriggeredRef = useRef(false);

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

  const onGenerate = useCallback(async () => {
    setPending(true);
    setDirectorGenerationBusy(true);
    try {
      const result = await generateDirectorPlanFromUrl(url, adNiche);
      if (!result.ok) {
        autoTriggeredRef.current = false;
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
      toast.success("Timeline generated", {
        description: `${result.plan.scenes.length} scenes · ${Math.round(result.plan.totalDurationSec)}s`,
      });
      playSuccessChime();
    } catch {
      autoTriggeredRef.current = false;
      toast.error("Director failed", { description: "Unexpected error while generating." });
    } finally {
      setPending(false);
      setDirectorGenerationBusy(false);
    }
  }, [
    adNiche,
    hydrateFromDirectorPlan,
    projectId,
    setDirectorGenerationBusy,
    url,
  ]);

  useEffect(() => {
    if (!seededUrl || !seededUrl.startsWith("http")) return;
    try {
      if (!new URL(seededUrl).hostname) return;
    } catch {
      return;
    }
    setUrl(seededUrl);
  }, [seededUrl]);

  useEffect(() => {
    if (autoTriggeredRef.current) return;
    if (directorPlanApplied || pending) return;
    const u = url.trim();
    try {
      const parsed = new URL(u);
      if (!parsed.hostname) return;
    } catch {
      return;
    }
    autoTriggeredRef.current = true;
    void onGenerate();
  }, [directorPlanApplied, onGenerate, pending, url]);

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
      {/* Slideshow — URL is captured on the studio home; scrape overlay covers generation */}
      {directorPlanApplied ? (
        <div className="space-y-3">
          {regularScenes.length === 0 ? (
            <div
              className="rounded-lg border p-3"
              style={{
                borderColor: VIBE_STUDIO.borderSubtle,
                backgroundColor: "rgba(0,0,0,0.2)",
              }}
            >
              <p className="text-xs text-[#b3b3b3]">
                Generate a timeline to unlock scene image overrides.
              </p>
            </div>
          ) : (
            <>
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
                      className={cn(
                        "rounded-lg border shadow-none",
                        isVisible ? "ring-2" : "border-white/10",
                      )}
                      style={{
                        backgroundColor: VIBE_STUDIO.panelBg,
                        ...(isVisible
                          ? {
                              borderColor: VIBE_STUDIO.slideshowActive,
                              boxShadow: `0 0 0 1px ${VIBE_STUDIO.slideshowActive}66`,
                            }
                          : {}),
                      }}
                    >
                      <CardContent
                        className="flex cursor-pointer items-stretch gap-3 p-3"
                        onClick={() => selectClipWithStudioTab(sceneClip.id)}
                      >
                        <div className="relative h-16 w-[104px] shrink-0 overflow-hidden rounded-md bg-black/40">
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
                            <div className="flex size-full items-center justify-center text-white/35">
                              <ImageIcon className="size-5" />
                            </div>
                          )}
                          <button
                            type="button"
                            disabled={uploadBusy}
                            className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-1 text-[10px] font-medium text-white transition hover:bg-black/85"
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadClipId(sceneClip.id);
                              fileInputRef.current?.click();
                            }}
                          >
                            <Pencil className="size-3 shrink-0" />
                            Change
                          </button>
                        </div>

                        <div className="min-w-0 flex-1 space-y-0.5 py-0.5">
                          <p className="text-[13px] font-semibold text-white">
                            Image #{idx + 1}
                          </p>
                          {isVisible ? (
                            <p
                              className="text-[11px] font-semibold"
                              style={{ color: VIBE_STUDIO.slideshowActive }}
                            >
                              Currently visible
                            </p>
                          ) : null}
                          <p className="text-[12px] tabular-nums text-[#b3b3b3]">
                            from {from} to {to} seconds
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col items-center justify-between py-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-[#b3b3b3] hover:bg-white/10 hover:text-white"
                            aria-label="More options"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                          <GripVertical
                            className="size-5 text-[#666666]"
                            aria-hidden
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div
                className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-3"
                style={{ borderColor: VIBE_STUDIO.borderSubtle }}
              >
                <p className="text-[13px] text-[#b3b3b3]">
                  Need more images or videos?
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1 rounded-md border border-white/10 bg-[#2a2a2a] text-white hover:bg-[#333333]"
                  onClick={() =>
                    toast.message("Discover", {
                      description: "Media discovery is not wired in this build.",
                    })
                  }
                >
                  Discover
                  <ChevronDown className="size-4 opacity-70" />
                </Button>
              </div>
            </>
          )}
        </div>
      ) : pending ? (
        <div
          className="rounded-lg border px-3 py-5 text-center"
          style={{
            borderColor: VIBE_STUDIO.borderSubtle,
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        >
          <p className="text-[13px] font-medium text-white/90">
            Creating your video…
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
            This usually takes under a minute. A full-screen progress view appears
            when you launch from the studio home.
          </p>
        </div>
      ) : (
        <div
          className="rounded-lg border px-3 py-5 text-center"
          style={{
            borderColor: VIBE_STUDIO.borderSubtle,
            backgroundColor: "rgba(0,0,0,0.2)",
          }}
        >
          <p className="text-[13px] leading-relaxed text-white/80">
            Enter a URL or choose a business on the{" "}
            <span className="font-medium text-white">studio home</span> to generate
            your timeline.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4 rounded-full border border-white/15 bg-white/[0.08] text-white hover:bg-white/[0.12]"
            asChild
          >
            <Link href="/studio">Open studio home</Link>
          </Button>
        </div>
      )}

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
