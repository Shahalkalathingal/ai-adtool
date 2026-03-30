"use client";

import { forwardRef, useEffect, useMemo } from "react";
import type { PlayerRef } from "@remotion/player";
import { Player } from "@remotion/player";
import {
  AdStudioComposition,
  type AdStudioTimelineInput,
} from "@/remotion/compositions/AdStudioComposition";
import type { ClipTimelineState, TrackTimelineState } from "@/lib/types/timeline";
import { useTimelineStore } from "@/lib/stores/timeline-store";

function toRemotionTimeline(
  tracks: TrackTimelineState[],
  clipsById: Record<string, ClipTimelineState>,
): AdStudioTimelineInput {
  return {
    tracks: tracks.map((t) => ({
      index: t.index,
      metadata: t.metadata as Record<string, unknown>,
      clipIds: [...t.clipIds],
    })),
    clipsById: Object.fromEntries(
      Object.entries(clipsById).map(([id, c]) => [
        id,
        {
          startTime: c.startTime,
          duration: c.duration,
          mediaType: c.mediaType,
          assetUrl: c.assetUrl ?? null,
          content: c.content,
          label: c.label,
          transformProps: c.transformProps as Record<string, unknown>,
          animationIn: c.animationIn ?? null,
          metadata: c.metadata ?? {},
          audioProps: c.audioProps ?? null,
        },
      ]),
    ),
  };
}

function resolveVoiceoverSrc(
  origin: string,
  metadata: Record<string, unknown>,
): string | null {
  const u = metadata.voiceoverAudioUrl;
  if (typeof u !== "string" || !u.trim()) return null;
  const s = u.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}

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

    const meta = project.metadata as Record<string, unknown>;

    const bc = project.brandConfig;

    const website =
      (typeof bc.website === "string" && bc.website) ||
      (typeof meta.website === "string" ? meta.website : "") ||
      (typeof meta.websiteUrl === "string" ? meta.websiteUrl : "");
    const voiceoverSrc = resolveVoiceoverSrc(origin, meta);
    const voiceoverRate = 1;

    const inputProps = useMemo(
      () => ({
        origin,
        timeline: toRemotionTimeline(tracks, clipsById),
        projectName: project.name,
        metadata: meta,
        brandPrimary: bc.primaryColor,
        brandSecondary: bc.secondaryColor,
        showQrOverlay: meta.showQrOverlay !== false,
        showFocusCardOverlay: meta.showFocusCardOverlay !== false,
        qrValue: website.trim() || String(meta.websiteUrl ?? ""),
        brandKit: {
          companyName:
            (typeof bc.companyName === "string" && bc.companyName) ||
            project.name,
          phone: typeof bc.phone === "string" ? bc.phone : "",
          address: typeof bc.address === "string" ? bc.address : "",
          website,
          logoUrl: typeof bc.logoUrl === "string" ? bc.logoUrl : "",
          endScreenTagline:
            typeof bc.endScreenTagline === "string" ? bc.endScreenTagline : "",
          endScreenPhone:
            typeof bc.endScreenPhone === "string" ? bc.endScreenPhone : "",
          tagline: typeof bc.tagline === "string" ? bc.tagline : "",
        },
        voiceoverSrc,
        voiceoverRate,
      }),
      [
        origin,
        tracks,
        clipsById,
        project.name,
        meta,
        bc.primaryColor,
        bc.secondaryColor,
        bc.companyName,
        bc.phone,
        bc.address,
        bc.logoUrl,
        bc.endScreenTagline,
        bc.endScreenPhone,
        bc.tagline,
        website,
        voiceoverSrc,
        voiceoverRate,
      ],
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
