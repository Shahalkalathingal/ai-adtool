"use client";

import { Music2 } from "lucide-react";
import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MUSIC_PRESETS } from "@/lib/audio/music-presets";
import { musicVolumePctFromAudioProps } from "@/lib/audio/volume-pct";
import { getTrackByLane } from "@/lib/timeline/scene-utils";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { ClipMediaType } from "@/generated/prisma/enums";
import { playSuccessChime } from "@/lib/ui/sfx";

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
  const selectedPreset = useMemo(
    () => MUSIC_PRESETS.find((p) => p.id === selected),
    [selected],
  );
  const musicPct = musicClipId
    ? musicVolumePctFromAudioProps(
        clipsById[musicClipId]?.audioProps as Record<string, unknown> | null,
      )
    : 0;

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
              updateProject({
                metadata: { selectedMusicPresetId: id, musicFlashAt: Date.now() },
              });
              updateClipProperty(musicClipId, {
                assetUrl: preset.url,
                label: `Music · ${preset.label}`,
                audioProps: {
                  volumePct: preset.defaultVolumePct ?? 60,
                },
              });
              playSuccessChime();
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
        <div className="space-y-2 rounded-md border border-border/70 bg-background/35 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-foreground/90">Music volume</p>
            <Label className="text-[10px] text-muted-foreground">{musicPct}%</Label>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[musicPct]}
            disabled={!musicClipId || selected === "none"}
            onValueChange={(v) => {
              if (!musicClipId) return;
              const val = Math.max(0, Math.min(100, v[0] ?? 0));
              updateClipProperty(musicClipId, {
                audioProps: { volumePct: val },
              });
    }}
          />
          <p className="text-[10px] text-muted-foreground">
            {selected === "none"
              ? "Muted — choose a track to adjust level."
              : "0% = muted · 100% = maximum bed level in the mix."}
          </p>
          {selectedPreset?.url ? (
            <p className="text-[10px] text-muted-foreground">
              Track active in main timeline preview.
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground">Silent mode selected.</p>
          )}
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
