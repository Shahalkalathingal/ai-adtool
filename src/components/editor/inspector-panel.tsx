"use client";

import { Sparkles } from "lucide-react";
import { useId, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ClipMediaType } from "@/generated/prisma/enums";
import {
  findClipIdForSceneAndLane,
  laneOf,
} from "@/lib/timeline/scene-utils";
import { headlineFromClip } from "@/lib/timeline/selectors";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export function InspectorPanel() {
  const clipId = useTimelineStore((s) => s.selectedClipId);
  const clip = useTimelineStore((s) =>
    clipId ? s.clipsById[clipId] ?? null : null,
  );
  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const updateClipProperty = useTimelineStore((s) => s.updateClipProperty);
  const updateClipTransform = useTimelineStore((s) => s.updateClipTransform);
  const uid = useId();

  const trackForClip = useMemo(() => {
    if (!clip) return null;
    return tracks.find((t) => t.id === clip.trackId) ?? null;
  }, [clip, tracks]);

  const isSceneVisualClip =
    !!clip &&
    !!trackForClip &&
    laneOf(trackForClip) === "visual" &&
    (clip.mediaType === ClipMediaType.IMAGE ||
      clip.mediaType === ClipMediaType.VIDEO);

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

  if (!clip || !clipId || !isSceneVisualClip) {
    return (
      <Card className="border-border/80 bg-card/45 shadow-none backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-muted-foreground" />
            Clip inspector
          </CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {clipId && clip && !isSceneVisualClip ? (
              <>
                Select a <span className="font-medium text-foreground">scene</span>{" "}
                on the Scenes row to edit visuals and copy. Music, voice, QR, and
                bottom banner use their Studio panels.
              </>
            ) : (
              <>
                Select a scene on the timeline (Scenes row). Brand and contact live
                under{" "}
                <span className="font-medium text-foreground">Bottom banner</span>{" "}
                in the left Studio rail.
              </>
            )}
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

  const headline = headlineTextClip
    ? headlineFromClip(headlineTextClip)
    : headlineFromClip(clip) || (typeof clip.label === "string" ? clip.label : "");

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
            Scene headline / copy
          </Label>
          <Textarea
            id={`${uid}-headline`}
            value={headline}
            onChange={(e) => {
              const v = e.target.value;
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
      </CardContent>
    </Card>
  );
}
