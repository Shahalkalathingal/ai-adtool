"use client";

import { ImagePlus, Sparkles } from "lucide-react";
import { useId, useMemo, useRef } from "react";
import { uploadClipImageAction } from "@/app/actions/upload-clip-asset";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ClipMediaType } from "@/generated/prisma/enums";
import { findClipIdForSceneAndLane } from "@/lib/timeline/scene-utils";
import { headlineFromClip } from "@/lib/timeline/selectors";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { toast } from "sonner";

const PRESETS = ["fade", "slide", "zoom", "typewriter", "none"] as const;

type InspectorPanelProps = {
  projectId: string;
};

export function InspectorPanel({ projectId }: InspectorPanelProps) {
  const clipId = useTimelineStore((s) => s.selectedClipId);
  const clip = useTimelineStore((s) =>
    clipId ? s.clipsById[clipId] ?? null : null,
  );
  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const updateClipProperty = useTimelineStore((s) => s.updateClipProperty);
  const updateClipTransform = useTimelineStore((s) => s.updateClipTransform);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const pairedTextId = useMemo(() => {
    if (!clip || !clipId) return null;
    if (clip.mediaType === ClipMediaType.TEXT) return clipId;
    const si = clip.content?.sceneIndex;
    if (typeof si !== "number") return null;
    if (
      clip.mediaType === ClipMediaType.VIDEO ||
      clip.mediaType === ClipMediaType.IMAGE
    ) {
      return findClipIdForSceneAndLane(tracks, clipsById, si, "text");
    }
    return null;
  }, [clip, clipId, tracks, clipsById]);

  if (!clip || !clipId) {
    return (
      <Card className="border-border/80 bg-card/45 shadow-none backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-muted-foreground" />
            Clip inspector
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Select a clip on the timeline. Brand and contact live under{" "}
            <span className="font-medium text-foreground">Bottom banner</span>{" "}
            in the left Studio rail.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const tp = clip.transformProps;
  const scale = ((tp.scaleX ?? 1) + (tp.scaleY ?? 1)) / 2;
  const posX = tp.x ?? 0;
  const posY = tp.y ?? 0;
  const opacity = tp.opacity ?? 1;
  const headlineTextClip =
    pairedTextId && clipsById[pairedTextId] ? clipsById[pairedTextId] : null;

  const animClip = headlineTextClip ?? clip;
  const preset =
    (animClip.animationIn as { preset?: string } | null)?.preset ?? "fade";
  const headline =
    clip.mediaType === ClipMediaType.VOICEOVER
      ? typeof clip.content?.script === "string"
        ? clip.content.script
        : ""
      : headlineTextClip
        ? headlineFromClip(headlineTextClip)
        : headlineFromClip(clip) ||
          (typeof clip.label === "string" ? clip.label : "");
  const canImage =
    clip.mediaType === ClipMediaType.VIDEO ||
    clip.mediaType === ClipMediaType.IMAGE;

  function applyTransform(
    patch: Partial<{
      scaleX: number;
      scaleY: number;
      x: number;
      y: number;
      opacity: number;
    }>,
  ) {
    if (!clipId || !clip) return;
    updateClipTransform(clipId, patch);
    const isVisual =
      clip.mediaType === ClipMediaType.VIDEO ||
      clip.mediaType === ClipMediaType.IMAGE;
    if (pairedTextId && isVisual) {
      updateClipTransform(pairedTextId, patch);
    }
  }

  return (
    <Card className="border-border/80 bg-card/50 shadow-none backdrop-blur-md">
      <CardHeader className="space-y-1 pb-3">
        <CardTitle className="text-sm font-semibold tracking-tight">
          Clip inspector
        </CardTitle>
        <CardDescription className="line-clamp-2 font-mono text-[10px] text-muted-foreground">
          {clipId}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Scale
            </Label>
            <span className="font-mono text-[11px] text-muted-foreground">
              {scale.toFixed(2)}×
            </span>
          </div>
          <Slider
            min={0.5}
            max={2}
            step={0.01}
            value={[scale]}
            onValueChange={([v]) =>
              applyTransform({
                scaleX: v,
                scaleY: v,
              })
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label
              htmlFor={`${uid}-x`}
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Position X
            </Label>
            <Slider
              id={`${uid}-x`}
              min={-420}
              max={420}
              step={1}
              value={[posX]}
              onValueChange={([v]) => applyTransform({ x: v })}
            />
            <p className="font-mono text-[10px] text-muted-foreground">
              {posX}px
            </p>
          </div>
          <div className="space-y-2">
            <Label
              htmlFor={`${uid}-y`}
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Position Y
            </Label>
            <Slider
              id={`${uid}-y`}
              min={-800}
              max={800}
              step={1}
              value={[posY]}
              onValueChange={([v]) => applyTransform({ y: v })}
            />
            <p className="font-mono text-[10px] text-muted-foreground">
              {posY}px
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Opacity
            </Label>
            <span className="font-mono text-[11px] text-muted-foreground">
              {opacity.toFixed(2)}
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[opacity]}
            onValueChange={([v]) => applyTransform({ opacity: v })}
          />
        </div>

        <Separator className="bg-border/70" />

        <div className="space-y-2">
          <Label
            htmlFor={`${uid}-headline`}
            className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            {clip.mediaType === ClipMediaType.VOICEOVER
              ? "Voiceover script"
              : "Headline / copy"}
          </Label>
          <Textarea
            id={`${uid}-headline`}
            value={headline}
            onChange={(e) => {
              const v = e.target.value;
              if (clip.mediaType === ClipMediaType.VOICEOVER) {
                updateClipProperty(clipId, {
                  content: { ...(clip.content ?? {}), script: v },
                  label: v.slice(0, 72) || clip.label,
                });
                return;
              }
              const target = pairedTextId ?? clipId;
              const tclip = clipsById[target] ?? clip;
              updateClipProperty(target, {
                content: {
                  ...(tclip.content ?? {}),
                  text: v,
                  headline: v,
                },
                label: v.slice(0, 80) || tclip.label,
              });
              if (pairedTextId && clipId !== pairedTextId) {
                updateClipProperty(clipId, {
                  content: { ...(clip.content ?? {}), headline: v },
                  label: v.slice(0, 80) || clip.label,
                });
              }
            }}
            rows={4}
            className="resize-none border-border/80 bg-background/40 text-sm backdrop-blur-sm"
          />
        </div>

        {canImage ? (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.set("file", file);
                void (async () => {
                  const r = await uploadClipImageAction(projectId, clipId, fd);
                  if (r.ok) {
                    updateClipProperty(clipId, { assetUrl: r.publicUrl });
                    toast.success("Image replaced");
                  } else {
                    toast.error(r.error);
                  }
                })();
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-full gap-2 border border-border/80 bg-background/40 backdrop-blur-sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="size-4" />
              Replace image
            </Button>
          </div>
        ) : null}

        {clip.mediaType !== ClipMediaType.VOICEOVER &&
        clip.mediaType !== ClipMediaType.MUSIC ? (
          <div className="space-y-2">
            <Label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Entry animation (headline)
            </Label>
            <Select
              value={preset}
              onValueChange={(v) => {
                const target = pairedTextId ?? clipId;
                updateClipProperty(target, {
                  animationIn:
                    v === "none"
                      ? { preset: "none" }
                      : { preset: v, durationSec: 0.45 },
                });
              }}
            >
              <SelectTrigger className="border-border/80 bg-background/40 backdrop-blur-sm">
                <SelectValue placeholder="Preset" />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p === "typewriter"
                      ? "Typewriter"
                      : p.charAt(0).toUpperCase() + p.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
