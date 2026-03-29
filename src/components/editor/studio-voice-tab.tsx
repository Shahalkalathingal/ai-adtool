"use client";

import { Mic } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  findVoiceClipForScene,
  getEndSceneVisualClip,
  isEndSceneClip,
  listSceneVisualClips,
} from "@/lib/timeline/scene-utils";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export function StudioVoiceTab() {
  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const updateClipProperty = useTimelineStore((s) => s.updateClipProperty);

  const regular = listSceneVisualClips(tracks, clipsById);
  const endVis = getEndSceneVisualClip(tracks, clipsById);
  const scenes = endVis ? [...regular, endVis] : regular;

  return (
    <Card className="border-border/60 bg-card/40 shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Mic className="size-4 text-primary" />
          Voice &amp; script
        </CardTitle>
        <CardDescription className="text-[11px] leading-relaxed">
          Edit VO script per scene. Use{" "}
          <span className="font-medium text-foreground">Generate voiceover</span>{" "}
          on the timeline to synthesize audio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {scenes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No scenes yet — run the Director or add clips on the timeline.
          </p>
        ) : null}
        {scenes.map((vis) => {
          const si = vis.content?.sceneIndex;
          if (typeof si !== "number") return null;
          const vo = findVoiceClipForScene(tracks, clipsById, si);
          if (!vo) return null;
          const end = isEndSceneClip(vis);
          const script =
            vo.content && typeof vo.content.script === "string"
              ? vo.content.script
              : "";
          return (
            <div key={vis.id} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-[11px] uppercase">
                  {end ? "End screen" : String(vis.label ?? `Scene ${si + 1}`)}
                </Label>
                {end ? (
                  <Badge variant="secondary" className="text-[9px]">
                    Locked outro
                  </Badge>
                ) : null}
              </div>
              <Textarea
                value={script}
                onChange={(e) => {
                  const v = e.target.value;
                  updateClipProperty(vo.id, {
                    content: { ...(vo.content ?? {}), script: v },
                    label:
                      end || !v.trim()
                        ? vo.label
                        : `VO · ${v.slice(0, 48)}${v.length > 48 ? "…" : ""}`,
                  });
                }}
                rows={end ? 2 : 4}
                placeholder={
                  end ? "Optional closing line…" : "Spoken line for this scene…"
                }
                className="resize-none border-border/80 bg-background/40 text-sm backdrop-blur-sm"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
