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

  return (
    <Card className="border-border/60 bg-card/40 shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <MonitorPlay className="size-4 text-primary" />
          End screen
        </CardTitle>
        <CardDescription className="text-[11px] leading-relaxed">
          The final scene is always last and can&apos;t be deleted. Edit the
          outro card: large phone, tagline, and logo follow your brand kit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-phone`} className="text-[11px] uppercase">
            Outro phone (CTA)
          </Label>
          <Input
            id={`${uid}-phone`}
            value={endPhone}
            onChange={(e) => setBrandKit({ endScreenPhone: e.target.value })}
            placeholder="(703) 729-2333"
            className="h-9 font-mono text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            Falls back to the main banner phone if left empty in the preview.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-tag`} className="text-[11px] uppercase">
            Tagline / CTA line
          </Label>
          <Textarea
            id={`${uid}-tag`}
            value={tagline}
            onChange={(e) => setBrandKit({ endScreenTagline: e.target.value })}
            rows={2}
            placeholder="Call us today — we’re here to help."
            className="resize-none text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase">Logo</Label>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Uses the same logo as{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setStudioPanel("bottomBanner")}
            >
              Bottom banner
            </button>
            . Upload there for quick swaps.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase">Company &amp; address</Label>
          <p className="text-[11px] text-muted-foreground">
            {(typeof bc.companyName === "string" && bc.companyName) ||
              project.name}{" "}
            · edit in Bottom banner.
          </p>
          <button
            type="button"
            className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
            onClick={() => setStudioPanel("bottomBanner")}
          >
            Open Bottom banner
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
