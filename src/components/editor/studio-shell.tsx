"use client";

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
  { id: "aiSettings", label: "AI settings", icon: Settings2 },
];

type StudioShellProps = {
  projectId: string;
};

export function StudioShell({ projectId }: StudioShellProps) {
  const studioPanel = useTimelineStore((s) => s.studioPanel);
  const setStudioPanel = useTimelineStore((s) => s.setStudioPanel);
  const directorPlanApplied = useTimelineStore((s) => s.directorPlanApplied);
  const navItems = directorPlanApplied ? NAV : NAV.filter((n) => n.id === "slideshow");

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full bg-sidebar/20">
      <nav
        className="flex w-[50px] shrink-0 flex-col items-stretch gap-0.5 border-r border-border/60 bg-zinc-950/90 py-2 pl-1 pr-1"
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
              size="icon"
              title={item.label}
              aria-label={item.label}
              aria-pressed={active}
              onClick={() => setStudioPanel(item.id)}
              className={cn(
                "relative mx-auto size-9 shrink-0 rounded-md border border-transparent text-muted-foreground transition-colors",
                "hover:border-border/50 hover:bg-white/5 hover:text-foreground",
                active &&
                  "border-white/12 bg-white/10 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
              )}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
              <Icon className="relative z-[1] size-[17px]" />
            </Button>
          );
        })}
      </nav>

      <div
        className="studio-scrollbar min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden overscroll-y-contain"
        role="region"
        aria-label="Studio panel"
      >
        <div className="min-w-0 space-y-4 p-3 pb-14">
          {studioPanel === "slideshow" && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Slideshow
              </p>
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
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                AI input
              </p>
              <RefinerChat />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
