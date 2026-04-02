"use client";

import { MonitorPlay } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { VIBE_STUDIO } from "@/lib/ui/vibe-studio-tokens";
import { cn } from "@/lib/utils";

/** Outro card (Pic 2 ref): logo, hero phone, tagline — uses brand name & address from Bottom banner. */
export function StudioEndScreen() {
  const project = useTimelineStore((s) => s.project);
  const setBrandKit = useTimelineStore((s) => s.setBrandKit);
  const setStudioPanel = useTimelineStore((s) => s.setStudioPanel);
  const bc = project.brandConfig;
  const uid = "end-screen";

  const tagline =
    typeof bc.endScreenTagline === "string" ? bc.endScreenTagline : "";
  const endPhone =
    typeof bc.endScreenPhone === "string" ? bc.endScreenPhone : "";
  const endCtaText =
    typeof bc.endScreenCtaText === "string" ? bc.endScreenCtaText : "";
  const endCtaBg1 =
    typeof bc.endScreenCtaBg1 === "string" && bc.endScreenCtaBg1
      ? bc.endScreenCtaBg1
      : bc.primaryColor;
  const endCtaBg2 =
    typeof bc.endScreenCtaBg2 === "string" && bc.endScreenCtaBg2
      ? bc.endScreenCtaBg2
      : bc.primaryColor;
  const endCtaTextColor =
    typeof bc.endScreenCtaTextColor === "string" && bc.endScreenCtaTextColor
      ? bc.endScreenCtaTextColor
      : "#0a0a0a";
  const endScreenPhoneColor =
    typeof bc.endScreenPhoneColor === "string" && bc.endScreenPhoneColor
      ? bc.endScreenPhoneColor
      : VIBE_STUDIO.endCardPhone;

  return (
    <Card
      className={cn("border shadow-none")}
      style={{
        borderColor: VIBE_STUDIO.borderSubtle,
        backgroundColor: "rgba(0,0,0,0.15)",
      }}
    >
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white">
          <MonitorPlay className="size-4" style={{ color: VIBE_STUDIO.logoMark }} />
          End screen
        </CardTitle>
        <CardDescription className="text-[11px] leading-relaxed text-[#9ca3af]">
          Full-frame white outro (entire 16:9 video area): logo and wordmark up
          top, QR top-right, hero phone centered, then name, details, optional CTA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-phone`} className="text-[11px] uppercase text-[#9ca3af]">
            Outro phone (CTA)
          </Label>
          <Input
            id={`${uid}-phone`}
            value={endPhone}
            onChange={(e) => setBrandKit({ endScreenPhone: e.target.value })}
            placeholder="(703) 729-2333"
            className="h-9 border-white/10 bg-black/30 font-mono text-sm text-white placeholder:text-white/35"
          />
          <p className="text-[10px] text-[#9ca3af]">
            Falls back to the main banner phone if left empty in the preview.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-phone-color`} className="text-[11px] uppercase text-[#9ca3af]">
            Hero phone color
          </Label>
          <Input
            id={`${uid}-phone-color`}
            type="color"
            value={endScreenPhoneColor}
            onChange={(e) =>
              setBrandKit({ endScreenPhoneColor: e.target.value })
            }
            className="h-9 w-full max-w-[8rem] p-1"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-tag`} className="text-[11px] uppercase text-[#9ca3af]">
            Tagline / CTA line
          </Label>
          <Textarea
            id={`${uid}-tag`}
            value={tagline}
            onChange={(e) => setBrandKit({ endScreenTagline: e.target.value })}
            rows={2}
            placeholder="Call us today — we’re here to help."
            className="resize-none border-white/10 bg-black/30 text-sm text-white placeholder:text-white/35"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-cta-text`} className="text-[11px] uppercase text-[#9ca3af]">
            Button text (optional — hides button if empty)
          </Label>
          <Input
            id={`${uid}-cta-text`}
            value={endCtaText}
            onChange={(e) => setBrandKit({ endScreenCtaText: e.target.value })}
            placeholder="Leave empty for contact-only outro"
            className="h-9 border-white/10 bg-black/30 text-sm text-white placeholder:text-white/35"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-cta-bg1`} className="text-[11px] uppercase">
              Button color A
            </Label>
            <Input
              id={`${uid}-cta-bg1`}
              type="color"
              value={endCtaBg1}
              onChange={(e) => setBrandKit({ endScreenCtaBg1: e.target.value })}
              className="h-9 w-full p-1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${uid}-cta-bg2`} className="text-[11px] uppercase">
              Button color B
            </Label>
            <Input
              id={`${uid}-cta-bg2`}
              type="color"
              value={endCtaBg2}
              onChange={(e) => setBrandKit({ endScreenCtaBg2: e.target.value })}
              className="h-9 w-full p-1"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-cta-fg`} className="text-[11px] uppercase">
            Button text color
          </Label>
          <Input
            id={`${uid}-cta-fg`}
            type="color"
            value={endCtaTextColor}
            onChange={(e) => setBrandKit({ endScreenCtaTextColor: e.target.value })}
            className="h-9 w-full p-1"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase">Logo</Label>
          <p className="text-[11px] leading-relaxed text-[#9ca3af]">
            Uses the same logo as{" "}
            <button
              type="button"
              className="font-medium text-white underline-offset-2 hover:underline"
              onClick={() => setStudioPanel("bottomBanner")}
            >
              Bottom banner
            </button>
            . Upload there for quick swaps.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase">Company &amp; address</Label>
          <p className="text-[11px] text-[#9ca3af]">
            {(typeof bc.companyName === "string" && bc.companyName) ||
              project.name}{" "}
            · edit in Bottom banner.
          </p>
          <button
            type="button"
            className="text-[11px] font-medium text-white underline-offset-2 hover:underline"
            onClick={() => setStudioPanel("bottomBanner")}
          >
            Open Bottom banner
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
