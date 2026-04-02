"use client";

import { useMemo } from "react";
import {
  Image as ImageIcon,
  Mic,
  MonitorPlay,
  Music2,
  PanelBottom,
  QrCode,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DirectorPanel } from "@/components/editor/director-panel";
import { RefinerChat } from "@/components/editor/refiner-chat";
import { StudioBottomBanner } from "@/components/editor/studio-bottom-banner";
import { StudioEndScreen } from "@/components/editor/studio-end-screen";
import { StudioMusicTab } from "@/components/editor/studio-music-tab";
import { StudioQrPanel } from "@/components/editor/studio-qr-panel";
import { StudioVoiceTab } from "@/components/editor/studio-voice-tab";
import { Button } from "@/components/ui/button";
import type { StudioPanelId } from "@/lib/types/studio-panel";
import { VIBE_STUDIO } from "@/lib/ui/vibe-studio-tokens";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { cn } from "@/lib/utils";

const NAV: {
  id: StudioPanelId;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "slideshow", label: "Slideshow", icon: ImageIcon },
  { id: "bottomBanner", label: "Bottom banner", icon: PanelBottom },
  { id: "endScreen", label: "End screen", icon: MonitorPlay },
  { id: "qr", label: "QR code", icon: QrCode },
  { id: "music", label: "Music", icon: Music2 },
  { id: "voice", label: "Voice & script", icon: Mic },
  { id: "aiSettings", label: "AI Input Settings", icon: Settings2 },
];

type StudioShellProps = {
  projectId: string;
};

export function StudioShell({ projectId }: StudioShellProps) {
  const studioPanel = useTimelineStore((s) => s.studioPanel);
  const setStudioPanel = useTimelineStore((s) => s.setStudioPanel);
  const directorPlanApplied = useTimelineStore((s) => s.directorPlanApplied);
  const navItems = useMemo(
    () => (directorPlanApplied ? NAV : NAV.filter((n) => n.id === "slideshow")),
    [directorPlanApplied],
  );

  return (
    <div
      className="flex h-full min-h-0 min-w-0 w-full"
      style={{ backgroundColor: VIBE_STUDIO.canvasBg }}
    >
      <nav
        className="flex w-[78px] shrink-0 flex-col items-stretch gap-0.5 border-r py-3 px-1"
        style={{
          backgroundColor: VIBE_STUDIO.navBg,
          borderColor: VIBE_STUDIO.borderSubtle,
        }}
        aria-label="Studio sections"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = studioPanel === item.id;
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              size="sm"
              title={item.label}
              aria-label={item.label}
              aria-pressed={active}
              onClick={() => setStudioPanel(item.id)}
              className={cn(
                "relative !h-auto min-h-[52px] w-full flex-col items-center !justify-center gap-1.5 rounded-lg border border-transparent !px-0.5 !py-2 text-center whitespace-normal transition-colors",
                active
                  ? "border-white/[0.12] bg-white/[0.06] text-white shadow-none"
                  : "text-slate-400 shadow-none hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-full"
                  style={{ backgroundColor: VIBE_STUDIO.logoMark }}
                  aria-hidden
                />
              ) : null}
              <Icon
                className="relative z-[1] size-5 shrink-0"
                strokeWidth={active ? 2 : 1.5}
              />
              <span
                className={cn(
                  "relative z-[1] block w-full max-w-[72px] text-pretty text-[11px] leading-[1.28] tracking-[-0.015em]",
                  active ? "font-semibold text-white" : "font-medium",
                )}
              >
                {item.label}
              </span>
            </Button>
          );
        })}
      </nav>

      <div
        className="studio-scrollbar min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden overscroll-y-contain border-r"
        style={{
          backgroundColor: VIBE_STUDIO.panelBg,
          borderColor: VIBE_STUDIO.borderSubtle,
        }}
        role="region"
        aria-label="Studio panel"
      >
        <div className="min-w-0 space-y-4 p-4 pb-24">
          {studioPanel === "slideshow" && (
            <>
              <h2 className="text-base font-bold text-white">Slideshow</h2>
              <DirectorPanel />
            </>
          )}

          {directorPlanApplied && studioPanel === "bottomBanner" && (
            <StudioBottomBanner projectId={projectId} />
          )}

          {directorPlanApplied && studioPanel === "endScreen" && <StudioEndScreen />}

          {directorPlanApplied && studioPanel === "qr" && <StudioQrPanel />}

          {directorPlanApplied && studioPanel === "music" && <StudioMusicTab />}

          {directorPlanApplied && studioPanel === "voice" && <StudioVoiceTab />}

          {directorPlanApplied && studioPanel === "aiSettings" && (
            <>
              <h2 className="text-base font-bold text-white">AI Input Settings</h2>
              <RefinerChat />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
