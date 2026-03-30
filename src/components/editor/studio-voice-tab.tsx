"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Mic } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { generateVoiceoverFromTimelineJson } from "@/app/actions/voiceover-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { serializeTimelineState } from "@/lib/timeline/serialize";
import { framesToSeconds } from "@/lib/types/timeline";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { voiceVolumePctFromAudioProps } from "@/lib/audio/volume-pct";
import { playSuccessChime } from "@/lib/ui/sfx";

export function StudioVoiceTab() {
  const project = useTimelineStore((s) => s.project);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const fps = useTimelineStore((s) => s.fps);
  const durationInFrames = useTimelineStore((s) => s.durationInFrames);
  const setMasterVoiceoverScript = useTimelineStore((s) => s.setMasterVoiceoverScript);
  const setVoiceoverAsset = useTimelineStore((s) => s.setVoiceoverAsset);
  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const updateClipProperty = useTimelineStore((s) => s.updateClipProperty);
  const [busy, setBusy] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  const masterScript =
    typeof project.metadata.masterVoiceoverScript === "string"
      ? project.metadata.masterVoiceoverScript
      : "";
  const hasVoiceoverAudio =
    typeof project.metadata.voiceoverAudioUrl === "string" &&
    project.metadata.voiceoverAudioUrl.trim().length > 0;
  const brandPrimary =
    (typeof project.brandConfig.primaryColor === "string" &&
      project.brandConfig.primaryColor) ||
    "#f43f5e";
  const voiceTrack = useMemo(
    () =>
      tracks.find(
        (t) => typeof t.metadata?.lane === "string" && t.metadata.lane === "voice",
      ),
    [tracks],
  );
  const voiceClipId =
    voiceTrack?.clipIds.find((id) => clipsById[id]?.mediaType === "VOICEOVER") ?? null;
  const voicePct = voiceClipId
    ? voiceVolumePctFromAudioProps(
        clipsById[voiceClipId]?.audioProps as Record<string, unknown> | null,
      )
    : 100;
  const statuses = useMemo(
    () => [
      "🎙️ Synthesizing Natural Inflections...",
      "🧠 Aligning Script to Scene Pacing...",
      "✨ Polishing Audio Clarity...",
    ],
    [],
  );

  const chars = masterScript.length;
  const words = masterScript.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSec = words > 0 ? Math.max(2, words / 2.4) : 0;
  const maxWords = 90;
  const minWords = 75;

  const sentences = useMemo(() => {
    return masterScript
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [masterScript]);

  const activeSentenceIdx = useMemo(() => {
    if (sentences.length === 0) return -1;
    const playheadSec = framesToSeconds(playheadFrame, fps);
    const totalSec = Math.max(0.1, framesToSeconds(durationInFrames, fps));
    const idx = Math.floor((playheadSec / totalSec) * sentences.length);
    return Math.min(sentences.length - 1, Math.max(0, idx));
  }, [durationInFrames, fps, playheadFrame, sentences.length]);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % statuses.length);
    }, 1500);
    return () => window.clearInterval(id);
  }, [busy, statuses.length]);

  async function onGenerateFullVoiceover() {
    setBusy(true);
    setStatusIndex(0);
    try {
      const state = useTimelineStore.getState();
      const json = JSON.stringify(serializeTimelineState(state));
      const res = await generateVoiceoverFromTimelineJson(project.id ?? "draft", json);
      if (!res.ok) {
        toast.error("Voiceover failed", { description: res.error });
        return;
      }
      setVoiceoverAsset(res.publicUrl, res.durationSecEstimate);
      toast.success("Full voiceover generated");
      playSuccessChime();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/40 shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Mic className="size-4 text-primary" />
          Voice &amp; script
        </CardTitle>
        <CardDescription className="text-[11px] leading-relaxed">
          Master script mode: one premium script block powers a single full-length
          voiceover track.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {chars} chars
          </Badge>
          <Badge
            variant={words > maxWords ? "destructive" : "secondary"}
            className="text-[10px]"
          >
            {words} words (target {minWords}-{maxWords})
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            Est. {estimatedSec.toFixed(1)}s
          </Badge>
        </div>
        <Progress value={Math.min(100, (words / maxWords) * 100)} className="h-1.5" />
        <div className="space-y-2">
          <Label className="text-[11px] uppercase">Master script</Label>
          <Textarea
            value={masterScript}
            onChange={(e) => {
              const raw = e.target.value;
              const clipped = raw
                .split(/\s+/)
                .slice(0, maxWords)
                .join(" ")
                .replace(/\s+([,.;!?])/g, "$1");
              setMasterVoiceoverScript(clipped);
            }}
            rows={11}
            placeholder="Write one immersive sentence per scene flow (hook, problem, solution, benefit, proof, CTA)..."
            className="resize-none border-border/80 bg-background/40 text-sm leading-relaxed backdrop-blur-sm"
          />
        </div>
        <Button
          type="button"
          className="w-full gap-2"
          disabled={busy || words < minWords}
          onClick={() => void onGenerateFullVoiceover()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
          {hasVoiceoverAudio ? "Update Full Voiceover" : "Generate Full Voiceover"}
        </Button>
        <div className="space-y-2 rounded-lg border border-border/70 bg-background/35 p-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-foreground/90">Voiceover volume</p>
            <Badge variant="secondary" className="text-[10px]">
              {voicePct}%
            </Badge>
          </div>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[voicePct]}
            disabled={!voiceClipId}
            onValueChange={(v) => {
              const val = Math.max(0, Math.min(100, v[0] ?? 100));
              if (!voiceClipId) return;
              updateClipProperty(voiceClipId, {
                audioProps: { volumePct: val, duckUnderMusicDb: -12 },
              });
            }}
          />
          <p className="text-[10px] text-muted-foreground">
            0% = muted · 100% = maximum narration level in the mix.
          </p>
        </div>
        {words < minWords ? (
          <p className="text-[11px] text-amber-300/90">
            Add at least {minWords} words so voiceover covers full timeline, including end screen.
          </p>
        ) : null}
        {sentences.length > 0 ? (
          <div className="space-y-2 rounded-md border border-border/60 bg-background/30 p-3">
            <Label className="text-[11px] uppercase">Now speaking</Label>
            <div className="space-y-1.5 text-xs leading-relaxed">
              {sentences.map((s, i) => (
                <p
                  key={`${i}-${s.slice(0, 20)}`}
                  className={
                    i === activeSentenceIdx
                      ? "rounded bg-amber-500/15 px-2 py-1 text-amber-100"
                      : "px-2 py-1 text-muted-foreground"
                  }
                >
                  {s}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
      <AnimatePresence>
        {busy ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-background/20 backdrop-blur-md"
          >
            <div className="flex items-end gap-1.5">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <motion.span
                  key={i}
                  className="w-1.5 rounded-full"
                  style={{
                    backgroundColor: brandPrimary,
                    boxShadow: `0 0 10px ${brandPrimary}`,
                  }}
                  animate={{
                    height: [10, 26 + (i % 3) * 6, 14],
                    opacity: [0.45, 1, 0.55],
                  }}
                  transition={{
                    duration: 0.9 + i * 0.08,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
            <motion.p
              key={statusIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-center text-xs font-medium text-foreground/90"
            >
              {statuses[statusIndex]}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
