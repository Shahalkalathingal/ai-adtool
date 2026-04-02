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
import { readAudioDurationSec } from "@/lib/audio/read-audio-duration";
import { playSuccessChime } from "@/lib/ui/sfx";
import {
  MASTER_VOICEOVER_MAX_WORDS,
  MASTER_VOICEOVER_MIN_WORDS,
} from "@/lib/voiceover/master-script-policy";
import {
  KOKORO_VOICE_GROUPS,
  KOKORO_VOICE_OPTIONS,
  normalizeKokoroVoiceId,
  type KokoroTtsVoiceId,
} from "@/lib/voiceover/kokoro-voices";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function StudioVoiceTab() {
  const project = useTimelineStore((s) => s.project);
  const playheadFrame = useTimelineStore((s) => s.playheadFrame);
  const fps = useTimelineStore((s) => s.fps);
  const durationInFrames = useTimelineStore((s) => s.durationInFrames);
  const setMasterVoiceoverScript = useTimelineStore((s) => s.setMasterVoiceoverScript);
  const setKokoroTtsVoice = useTimelineStore((s) => s.setKokoroTtsVoice);
  const setVoiceoverAsset = useTimelineStore((s) => s.setVoiceoverAsset);
  const beginVoiceoverSwap = useTimelineStore((s) => s.beginVoiceoverSwap);
  const setVoiceoverSyncBusy = useTimelineStore((s) => s.setVoiceoverSyncBusy);
  const voiceoverSyncBusy = useTimelineStore((s) => s.voiceoverSyncBusy);
  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const updateClipProperty = useTimelineStore((s) => s.updateClipProperty);
  const [busy, setBusy] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const directorGenerationBusy = useTimelineStore((s) => s.directorGenerationBusy);
  const [optimizerIdx, setOptimizerIdx] = useState(0);
  const [updatePulse, setUpdatePulse] = useState(false);

  const masterScript =
    typeof project.metadata.masterVoiceoverScript === "string"
      ? project.metadata.masterVoiceoverScript
      : "";
  const kokoroVoiceId = normalizeKokoroVoiceId(project.metadata.kokoroTtsVoice);
  const hasVoiceoverAudio =
    typeof project.metadata.voiceoverAudioUrl === "string" &&
    project.metadata.voiceoverAudioUrl.trim().length > 0;
  const voiceoverSwapPulseAt =
    typeof project.metadata.voiceoverSwapPulseAt === "number"
      ? project.metadata.voiceoverSwapPulseAt
      : 0;
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
  const scriptOptimizerStatuses = useMemo(
    () => [
      "🧠 Analyzing brand sentiment...",
      "⚖️ Balancing word count for 35s playback...",
      "✍️ Crafting high-conversion hooks...",
    ],
    [],
  );

  const chars = masterScript.length;
  const words = masterScript.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSec = words > 0 ? Math.max(2, words / 2.4) : 0;
  const maxWords = MASTER_VOICEOVER_MAX_WORDS;
  const minWords = MASTER_VOICEOVER_MIN_WORDS;

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

  useEffect(() => {
    if (!directorGenerationBusy) return;
    setOptimizerIdx(0);
    const id = window.setInterval(() => {
      setOptimizerIdx((i) => (i + 1) % scriptOptimizerStatuses.length);
    }, 1600);
    return () => window.clearInterval(id);
  }, [directorGenerationBusy, scriptOptimizerStatuses.length]);

  useEffect(() => {
    if (!voiceoverSwapPulseAt) return;
    setUpdatePulse(true);
    const id = window.setTimeout(() => setUpdatePulse(false), 700);
    return () => window.clearTimeout(id);
  }, [voiceoverSwapPulseAt]);

  async function onGenerateFullVoiceover() {
    setBusy(true);
    beginVoiceoverSwap();
    setStatusIndex(0);
    try {
      const state = useTimelineStore.getState();
      const json = JSON.stringify(serializeTimelineState(state));
      const res = await generateVoiceoverFromTimelineJson(project.id ?? "draft", json);
      if (!res.ok) {
        setVoiceoverSyncBusy(false);
        toast.error("Voiceover failed", { description: res.error });
        return;
      }
      const measuredSec = await readAudioDurationSec(res.publicUrl);
      setVoiceoverAsset(res.publicUrl, measuredSec ?? res.durationSecEstimate);
      toast.success("Full voiceover generated");
      playSuccessChime();
    } finally {
      setVoiceoverSyncBusy(false);
      setBusy(false);
    }
  }

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/40 shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Mic className="size-4 text-primary" />
          Voice &amp; script
          {directorGenerationBusy ? (
            <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
              Script Optimizer
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription className="text-[11px] leading-relaxed">
          Full narration is generated automatically when your timeline opens (toast:
          “Generating voiceover…”). Edit the master script here, then use{" "}
          <span className="font-medium text-foreground/90">Update</span> to re-render audio after
          changes. If the first run fails, use Regenerate below.
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
          <Label className="text-[11px] uppercase">Narrator voice</Label>
          <Select
            value={kokoroVoiceId}
            disabled={directorGenerationBusy}
            onValueChange={(v) => setKokoroTtsVoice(v as KokoroTtsVoiceId)}
          >
            <SelectTrigger
              size="default"
              className="h-9 w-full max-w-none border-border/80 bg-background/40 text-left text-sm shadow-none backdrop-blur-sm"
            >
              <SelectValue placeholder="Voice" />
            </SelectTrigger>
            <SelectContent position="popper" className="max-h-72">
              {KOKORO_VOICE_GROUPS.map((group) => (
                <SelectGroup key={group}>
                  <SelectLabel>{group}</SelectLabel>
                  {KOKORO_VOICE_OPTIONS.filter((o) => o.group === group).map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Unreal Speech TTS (cloud). Each option maps to a dashboard voice; default is a US-leaning male read.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] uppercase">Master script</Label>
          <Textarea
            value={masterScript}
            disabled={directorGenerationBusy}
            onChange={(e) => {
              setMasterVoiceoverScript(e.target.value);
            }}
            rows={11}
            placeholder="Write one immersive sentence per scene flow (hook, problem, solution, benefit, proof, CTA)..."
            className="resize-none border-border/80 bg-background/40 text-sm leading-relaxed backdrop-blur-sm disabled:opacity-60"
          />
        </div>
        <Button
          type="button"
          className={[
            "w-full gap-2 transition-[box-shadow,border-color] duration-200",
            updatePulse
              ? "border-emerald-300/70 shadow-[0_0_0_1px_rgba(134,239,172,0.7),0_0_24px_rgba(74,222,128,0.55)]"
              : "",
          ].join(" ")}
          disabled={busy || voiceoverSyncBusy || directorGenerationBusy || words < minWords}
          onClick={() => void onGenerateFullVoiceover()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
          {hasVoiceoverAudio ? "Update full voiceover" : "Regenerate voiceover"}
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
          <p className="text-[11px] leading-relaxed text-amber-300/90">
            Add at least {minWords} words so voiceover covers the full timeline, including the
            end screen.
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
        {directorGenerationBusy || busy || voiceoverSyncBusy ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/20 backdrop-blur-md"
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
            {directorGenerationBusy ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Script Optimizer
              </p>
            ) : voiceoverSyncBusy ? (
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Voiceover
              </p>
            ) : null}
            <motion.p
              key={
                directorGenerationBusy
                  ? `opt-${optimizerIdx}`
                  : voiceoverSyncBusy
                    ? "vo-sync"
                    : `vo-${statusIndex}`
              }
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="max-w-[240px] text-center text-xs font-medium text-foreground/90"
            >
              {directorGenerationBusy
                ? scriptOptimizerStatuses[optimizerIdx]
                : voiceoverSyncBusy
                  ? "Adding your voiceover and lining it up with the scenes—almost ready."
                : statuses[statusIndex]}
            </motion.p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
