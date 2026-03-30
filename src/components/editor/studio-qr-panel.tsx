"use client";

import { QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export function StudioQrPanel() {
  const project = useTimelineStore((s) => s.project);
  const updateProject = useTimelineStore((s) => s.updateProject);
  const bc = project.brandConfig;
  const meta = project.metadata as Record<string, unknown>;

  const website =
    (typeof bc.website === "string" && bc.website) ||
    (typeof meta.website === "string" ? meta.website : "") ||
    (typeof meta.websiteUrl === "string" ? meta.websiteUrl : "");

  const show = meta.showQrOverlay !== false;

  return (
    <Card className="border-border/60 bg-card/40 shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <QrCode className="size-4 text-primary" />
          QR code
        </CardTitle>
        <CardDescription className="text-[11px] leading-relaxed">
          Encodes your website URL and appears on the top-right of scene
          previews (and on the end card).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-2.5">
          <div className="min-w-0">
            <Label className="text-[11px] font-medium text-foreground">
              Show QR overlay
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Top-right scan code in the 16:9 preview.
            </p>
          </div>
          <input
            type="checkbox"
            className="size-4 shrink-0 accent-primary"
            checked={show}
            onChange={(e) => {
              updateProject({ metadata: { showQrOverlay: e.target.checked } });
            }}
            aria-label="Show QR overlay in preview"
          />
        </label>

        <div className="rounded-lg border border-border/60 bg-background/20 p-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Live preview
          </p>
          {website.trim() ? (
            <div className="flex justify-center rounded-md bg-white p-3">
              <QRCodeSVG value={website.trim()} size={120} level="M" />
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Add a website in{" "}
              <span className="font-medium text-foreground">Bottom banner</span>{" "}
              to generate a code.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
