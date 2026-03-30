"use client";

import { forwardRef, useEffect, useMemo } from "react";
import type { PlayerRef } from "@remotion/player";
import { Player } from "@remotion/player";
import { AdStudioComposition } from "@/remotion/compositions/AdStudioComposition";
import { buildAdStudioInputProps } from "@/lib/remotion/build-ad-studio-input-props";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export const EditorRemotionPlayer = forwardRef<PlayerRef, object>(
  function EditorRemotionPlayer(_props, ref) {
    const durationInFrames = useTimelineStore((s) => s.durationInFrames);
    const fps = useTimelineStore((s) => s.fps);
    const playheadFrame = useTimelineStore((s) => s.playheadFrame);
    const isPlaying = useTimelineStore((s) => s.isPlaying);
    const project = useTimelineStore((s) => s.project);
    const tracks = useTimelineStore((s) => s.tracks);
    const clipsById = useTimelineStore((s) => s.clipsById);
    const setStudioPanel = useTimelineStore((s) => s.setStudioPanel);

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    const inputProps = useMemo(
      () => buildAdStudioInputProps(origin, project, tracks, clipsById),
      [origin, project, tracks, clipsById],
    );

    useEffect(() => {
      const player =
        ref && typeof ref !== "function"
          ? (ref as React.MutableRefObject<PlayerRef | null>).current
          : null;
      if (!isPlaying) player?.seekTo(playheadFrame);
    }, [playheadFrame, ref, isPlaying]);

    useEffect(() => {
      const player =
        ref && typeof ref !== "function"
          ? (ref as React.MutableRefObject<PlayerRef | null>).current
          : null;
      if (!isPlaying) {
        player?.pause();
      } else {
        player?.play();
      }
    }, [isPlaying, ref]);

    return (
      <div className="relative h-full w-full">
        <Player
          ref={ref}
          component={AdStudioComposition}
          durationInFrames={durationInFrames}
          compositionWidth={1280}
          compositionHeight={720}
          fps={fps}
          controls={false}
          spaceKeyToPlayOrPause={false}
          acknowledgeRemotionLicense
          inputProps={inputProps}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            boxShadow:
              "0 25px 50px -12px rgb(0 0 0 / 0.65), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        />

        <button
          type="button"
          className="absolute right-[2.2%] top-[3.4%] h-[12%] w-[10%] rounded-md border border-transparent bg-transparent hover:border-white/30"
          aria-label="Edit QR code"
          onClick={() => setStudioPanel("qr")}
        />
        <button
          type="button"
          className="absolute bottom-[2.5%] left-[2.8%] h-[20%] w-[94.4%] rounded-md border border-transparent bg-transparent hover:border-white/25"
          aria-label="Edit bottom banner"
          onClick={() => setStudioPanel("bottomBanner")}
        />
      </div>
    );
  },
);
