"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { generateVoiceoverFromTimelineJson } from "@/app/actions/voiceover-actions";
import { readAudioDurationSec } from "@/lib/audio/read-audio-duration";
import { serializeTimelineState } from "@/lib/timeline/serialize";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { playSuccessChime } from "@/lib/ui/sfx";
import { MASTER_VOICEOVER_MIN_WORDS } from "@/lib/voiceover/master-script-policy";

/**
 * After Director hydrates the timeline, generates full voiceover once if there is
 * no VO audio yet and the master script meets the minimum word count.
 */
export function useAutoVoiceoverOnTimeline(projectId: string) {
  const directorPlanApplied = useTimelineStore((s) => s.directorPlanApplied);
  const directorHydrateVersion = useTimelineStore((s) => s.directorHydrateVersion);
  const project = useTimelineStore((s) => s.project);
  const beginVoiceoverSwap = useTimelineStore((s) => s.beginVoiceoverSwap);
  const setVoiceoverSyncBusy = useTimelineStore((s) => s.setVoiceoverSyncBusy);
  const setVoiceoverAsset = useTimelineStore((s) => s.setVoiceoverAsset);

  const handledVersionRef = useRef<number | null>(null);

  const masterScript =
    typeof project.metadata.masterVoiceoverScript === "string"
      ? project.metadata.masterVoiceoverScript
      : "";
  const words = masterScript.trim().split(/\s+/).filter(Boolean).length;
  const hasVoiceoverAudio =
    typeof project.metadata.voiceoverAudioUrl === "string" &&
    project.metadata.voiceoverAudioUrl.trim().length > 0;

  useEffect(() => {
    if (!directorPlanApplied || directorHydrateVersion < 1) return;
    if (hasVoiceoverAudio) {
      handledVersionRef.current = directorHydrateVersion;
      return;
    }
    if (words < MASTER_VOICEOVER_MIN_WORDS) return;
    if (handledVersionRef.current === directorHydrateVersion) return;

    handledVersionRef.current = directorHydrateVersion;
    const id = projectId.trim() || "draft";

    void (async () => {
      beginVoiceoverSwap();
      toast.message("Generating voiceover…", {
        description: "Rendering your full narration for the timeline.",
      });
      try {
        const state = useTimelineStore.getState();
        const json = JSON.stringify(serializeTimelineState(state));
        const res = await generateVoiceoverFromTimelineJson(id, json);
        if (!res.ok) {
          setVoiceoverSyncBusy(false);
          handledVersionRef.current = null;
          toast.error("Voiceover failed", { description: res.error });
          return;
        }
        const measuredSec = await readAudioDurationSec(res.publicUrl);
        setVoiceoverAsset(res.publicUrl, measuredSec ?? res.durationSecEstimate);
        toast.success("Voiceover ready");
        playSuccessChime();
      } catch (e) {
        handledVersionRef.current = null;
        const msg = e instanceof Error ? e.message : "Voiceover error";
        toast.error("Voiceover failed", { description: msg });
      } finally {
        setVoiceoverSyncBusy(false);
      }
    })();
  }, [
    beginVoiceoverSwap,
    directorHydrateVersion,
    directorPlanApplied,
    hasVoiceoverAudio,
    projectId,
    setVoiceoverAsset,
    setVoiceoverSyncBusy,
    words,
  ]);
}
