"use client";

import { Music2 } from "lucide-react";
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
import { MUSIC_PRESETS } from "@/lib/audio/music-presets";
import { getTrackByLane } from "@/lib/timeline/scene-utils";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { ClipMediaType } from "@/generated/prisma/enums";

export function StudioMusicTab() {
  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const project = useTimelineStore((s) => s.project);
  const updateProject = useTimelineStore((s) => s.updateProject);
  const updateClipProperty = useTimelineStore((s) => s.updateClipProperty);

  const meta = project.metadata as Record<string, unknown>;
  const selected =
    typeof meta.selectedMusicPresetId === "string"
      ? meta.selectedMusicPresetId
      : "none";

  const musicTr = getTrackByLane(tracks, "music");
  const musicClipId =
    musicTr?.clipIds.find((id) => {
      const c = clipsById[id];
      return c?.mediaType === ClipMediaType.MUSIC;
    }) ?? null;

  return (
    <Card className="border-border/60 bg-card/40 shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Music2 className="size-4 text-primary" />
          Music
        </CardTitle>
        <CardDescription className="text-[11px] leading-relaxed">
          Pick a background bed for the full timeline. The clip spans the
          entire edit and plays under voiceover.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase">Background track</Label>
          <Select
            value={selected}
            disabled={!musicClipId}
            onValueChange={(id) => {
              const preset = MUSIC_PRESETS.find((p) => p.id === id);
              if (!preset || !musicClipId) return;
              updateProject({ metadata: { selectedMusicPresetId: id } });
              updateClipProperty(musicClipId, {
                assetUrl: preset.url,
                label: `Music · ${preset.label}`,
              });
            }}
          >
            <SelectTrigger className="border-border/80 bg-background/40 text-sm backdrop-blur-sm">
              <SelectValue placeholder="Select a track" />
            </SelectTrigger>
            <SelectContent>
              {MUSIC_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!musicClipId ? (
          <p className="text-[11px] text-amber-200/80">
            No music lane found — generate a timeline from the Director first.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
