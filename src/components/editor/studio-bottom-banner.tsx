"use client";

import { ImagePlus, Sparkles } from "lucide-react";
import { useId, useRef } from "react";
import { toast } from "sonner";
import { uploadBrandLogoAction } from "@/app/actions/upload-clip-asset";
import { Button } from "@/components/ui/button";
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

type StudioBottomBannerProps = {
  projectId: string;
};

export function StudioBottomBanner({ projectId }: StudioBottomBannerProps) {
  const project = useTimelineStore((s) => s.project);
  const updateProject = useTimelineStore((s) => s.updateProject);
  const setBrandKit = useTimelineStore((s) => s.setBrandKit);
  const fileRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  const meta = project.metadata as Record<string, unknown>;
  const bc = project.brandConfig;

  const companyName =
    (typeof bc.companyName === "string" && bc.companyName) ||
    project.name ||
    "";
  const phone = typeof bc.phone === "string" ? bc.phone : "";
  const address = typeof bc.address === "string" ? bc.address : "";
  const website = typeof bc.website === "string" ? bc.website : "";
  const logoUrl =
    (typeof bc.logoUrl === "string" && bc.logoUrl) ||
    (typeof meta.logoUrl === "string" ? meta.logoUrl : "") ||
    "";
  const logoFromScrape = bc.logoFromScrape === true;

  return (
    <Card className="border-border/60 bg-card/40 shadow-none">
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" />
          Bottom banner
        </CardTitle>
        <CardDescription className="text-[11px] leading-relaxed">
          Lower-third brand block and CTA — updates the preview live.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground">
              Logo from scrape
            </p>
            <p className="text-[10px] text-muted-foreground">
              Use the URL Firecrawl found, or upload your own.
            </p>
          </div>
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={logoFromScrape}
            onChange={(e) => {
              const on = e.target.checked;
              setBrandKit({ logoFromScrape: on });
              const scraped =
                typeof meta.scrapedLogoUrl === "string"
                  ? meta.scrapedLogoUrl
                  : "";
              if (on && scraped) {
                setBrandKit({ logoUrl: scraped });
                updateProject({
                  metadata: { logoUrl: scraped },
                  brandConfig: { logoUrl: scraped },
                });
              }
            }}
            aria-label="Logo from scrape"
          />
        </label>

        <div className="flex items-center gap-3">
          <div
            className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border/80 bg-muted/40"
            style={{
              backgroundImage: logoUrl ? `url(${logoUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.set("file", file);
              void (async () => {
                const r = await uploadBrandLogoAction(projectId, fd);
                if (r.ok) {
                  setBrandKit({ logoUrl: r.publicUrl, logoFromScrape: false });
                  updateProject({
                    metadata: { logoUrl: r.publicUrl },
                    brandConfig: { logoUrl: r.publicUrl, logoFromScrape: false },
                  });
                  toast.success("Logo uploaded");
                } else {
                  toast.error(r.error);
                }
              })();
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Upload logo
          </Button>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-co`} className="text-[11px] uppercase">
            Company name
          </Label>
          <Input
            id={`${uid}-co`}
            value={companyName}
            onChange={(e) => {
              const v = e.target.value;
              updateProject({
                name: v,
                metadata: { brandDisplayName: v },
                brandConfig: { companyName: v },
              });
            }}
            placeholder="Nike Factory Store - Leesburg"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-ad`} className="text-[11px] uppercase">
            Address
          </Label>
          <Textarea
            id={`${uid}-ad`}
            value={address}
            onChange={(e) =>
              updateProject({
                metadata: { address: e.target.value },
                brandConfig: { address: e.target.value },
              })
            }
            rows={3}
            placeholder="241 Fort Evans Rd NE Suite 510, Leesburg, VA 20176"
            className="resize-none text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-ph`} className="text-[11px] uppercase">
            Phone number
          </Label>
          <Input
            id={`${uid}-ph`}
            value={phone}
            onChange={(e) =>
              updateProject({
                metadata: { phone: e.target.value },
                brandConfig: { phone: e.target.value },
              })
            }
            placeholder="(703) 771-3060"
            className="h-9 font-mono text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-web`} className="text-[11px] uppercase">
            Website URL
          </Label>
          <Input
            id={`${uid}-web`}
            value={website}
            onChange={(e) => {
              const v = e.target.value;
              updateProject({
                metadata: { website: v, websiteUrl: v },
                brandConfig: { website: v },
              });
            }}
            placeholder="https://www.nike.com/retail/..."
            className="h-9 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
