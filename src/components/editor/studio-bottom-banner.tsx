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
import { VIBE_STUDIO } from "@/lib/ui/vibe-studio-tokens";

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
  const showCardBackgroundOverlay = meta.showFocusCardOverlay === true;
  const highProtectionOn = meta.highProtectionWatermark === true;
  const showHeaderOverlay = meta.showHeaderOverlay !== false;
  const headerOverlayStrength =
    typeof meta.headerOverlayStrength === "number"
      ? Math.max(0, Math.min(1, meta.headerOverlayStrength as number))
      : 1;
  const showSceneVignetteOverlay = meta.showSceneVignetteOverlay !== false;
  const sceneVignetteStrength =
    typeof meta.sceneVignetteStrength === "number"
      ? Math.max(0, Math.min(1, meta.sceneVignetteStrength as number))
      : 1;
  const bannerOverlayStrength =
    typeof meta.bannerOverlayStrength === "number"
      ? Math.max(0, Math.min(1, meta.bannerOverlayStrength as number))
      : 1;

  const bannerBrandNameColor =
    typeof bc.bannerBrandNameColor === "string" && bc.bannerBrandNameColor
      ? (bc.bannerBrandNameColor as string)
      : "#fafafa";
  const bannerDetailColor =
    typeof bc.bannerDetailColor === "string" && bc.bannerDetailColor
      ? (bc.bannerDetailColor as string)
      : "#fafafa";
  const bannerPhoneColor =
    typeof bc.bannerPhoneColor === "string" && bc.bannerPhoneColor
      ? (bc.bannerPhoneColor as string)
      : VIBE_STUDIO.sceneBannerPhone;
  const bannerPhoneScale =
    typeof bc.bannerPhoneScale === "number" &&
    Number.isFinite(bc.bannerPhoneScale as number)
      ? Math.max(0.8, Math.min(1.4, bc.bannerPhoneScale as number))
      : 1;
  const headerBrandNameColor =
    typeof bc.headerBrandNameColor === "string" && bc.headerBrandNameColor
      ? (bc.headerBrandNameColor as string)
      : "#fafafa";
  const headerSloganColor =
    typeof bc.headerSloganColor === "string" && bc.headerSloganColor
      ? (bc.headerSloganColor as string)
      : "#fafafa";
  const headerBrandScale =
    typeof bc.headerBrandScale === "number" &&
    Number.isFinite(bc.headerBrandScale as number)
      ? Math.max(0.8, Math.min(1.4, bc.headerBrandScale as number))
      : 1;
  const headerLogoScale =
    typeof bc.headerLogoScale === "number" &&
    Number.isFinite(bc.headerLogoScale as number)
      ? Math.max(0.8, Math.min(1.4, bc.headerLogoScale as number))
      : 1;

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

  const resetStyleDefaults = () => {
    setBrandKit({
      bannerBrandNameColor: "#fafafa",
      bannerDetailColor: "#fafafa",
      bannerPhoneColor: VIBE_STUDIO.sceneBannerPhone,
      bannerPhoneScale: 1,
      headerBrandNameColor: "#fafafa",
      headerSloganColor: "#fafafa",
      headerBrandScale: 1,
      headerLogoScale: 1,
    });
    updateProject({
      metadata: {
        showFocusCardOverlay: false,
        bannerOverlayStrength: 1,
        showHeaderOverlay: true,
        headerOverlayStrength: 1,
        showSceneVignetteOverlay: true,
        sceneVignetteStrength: 1,
      },
    });
  };

  return (
    <Card className="border-border/60 bg-card/40 py-0 shadow-none">
      <CardHeader className="space-y-1 px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" />
            Bottom banner
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={resetStyleDefaults}
          >
            Reset style
          </Button>
        </div>
        <CardDescription className="text-[11px] leading-relaxed">
          Lower-third brand block and CTA — updates the preview live.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-6">
        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-foreground">
              Logo from scrape
            </p>
            <p className="text-[10px] leading-relaxed text-muted-foreground break-words">
              Use the URL Firecrawl found, or upload your own.
            </p>
          </div>
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-primary"
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

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <Label className="text-[11px] font-medium text-foreground">
              Card background overlay
            </Label>
            <p className="text-[10px] leading-relaxed text-muted-foreground break-words">
              Off hides only the banner background; name, phone & address stay.
            </p>
          </div>
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-primary"
            checked={showCardBackgroundOverlay}
            onChange={(e) => {
              updateProject({
                metadata: { showFocusCardOverlay: e.target.checked },
              });
            }}
            aria-label="Card background overlay in preview"
          />
        </label>

        {showCardBackgroundOverlay ? (
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase">Overlay intensity</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(bannerOverlayStrength * 100)}
                onChange={(e) =>
                  updateProject({
                    metadata: {
                      bannerOverlayStrength: Math.max(
                        0,
                        Math.min(1, Number(e.target.value) / 100),
                      ),
                    },
                  })
                }
                className="h-1.5 w-full cursor-pointer rounded-full bg-muted accent-primary"
              />
              <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
                {Math.round(bannerOverlayStrength * 100)}%
              </span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase">Brand name color</Label>
            <Input
              type="color"
              value={bannerBrandNameColor}
              onChange={(e) =>
                setBrandKit({ bannerBrandNameColor: e.target.value })
              }
              className="h-9 w-full p-1"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase">Detail text color</Label>
            <Input
              type="color"
              value={bannerDetailColor}
              onChange={(e) =>
                setBrandKit({ bannerDetailColor: e.target.value })
              }
              className="h-9 w-full p-1"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase">Phone color</Label>
            <Input
              type="color"
              value={bannerPhoneColor}
              onChange={(e) =>
                setBrandKit({ bannerPhoneColor: e.target.value })
              }
              className="h-9 w-full p-1"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase">Phone size</Label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={80}
              max={140}
              value={Math.round(bannerPhoneScale * 100)}
              onChange={(e) =>
                setBrandKit({
                  bannerPhoneScale: Math.max(
                    0.8,
                    Math.min(1.4, Number(e.target.value) / 100),
                  ),
                })
              }
              className="h-1.5 w-full cursor-pointer rounded-full bg-muted accent-primary"
            />
            <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
              {bannerPhoneScale.toFixed(2)}x
            </span>
          </div>
        </div>

        <div className="my-1 h-px bg-border/60" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
            Top banner
          </p>
          <p className="text-[10px] text-muted-foreground">
            Control the header overlay, logo scale, and title colors.
          </p>
        </div>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <Label className="text-[11px] font-medium text-foreground">
              Header background overlay
            </Label>
            <p className="text-[10px] leading-relaxed text-muted-foreground break-words">
              Turn off for an ultra-clean top banner over raw footage.
            </p>
          </div>
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-primary"
            checked={showHeaderOverlay}
            onChange={(e) =>
              updateProject({
                metadata: { showHeaderOverlay: e.target.checked },
              })
            }
            aria-label="Show top header overlay"
          />
        </label>

        {showHeaderOverlay ? (
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase">Header intensity</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(headerOverlayStrength * 100)}
                onChange={(e) =>
                  updateProject({
                    metadata: {
                      headerOverlayStrength: Math.max(
                        0,
                        Math.min(1, Number(e.target.value) / 100),
                      ),
                    },
                  })
                }
                className="h-1.5 w-full cursor-pointer rounded-full bg-muted accent-primary"
              />
              <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
                {Math.round(headerOverlayStrength * 100)}%
              </span>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase">Header title color</Label>
            <Input
              type="color"
              value={headerBrandNameColor}
              onChange={(e) =>
                setBrandKit({ headerBrandNameColor: e.target.value })
              }
              className="h-9 w-full p-1"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase">Header slogan color</Label>
            <Input
              type="color"
              value={headerSloganColor}
              onChange={(e) => setBrandKit({ headerSloganColor: e.target.value })}
              className="h-9 w-full p-1"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase">Header text scale</Label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={80}
              max={140}
              value={Math.round(headerBrandScale * 100)}
              onChange={(e) =>
                setBrandKit({
                  headerBrandScale: Math.max(
                    0.8,
                    Math.min(1.4, Number(e.target.value) / 100),
                  ),
                })
              }
              className="h-1.5 w-full cursor-pointer rounded-full bg-muted accent-primary"
            />
            <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
              {headerBrandScale.toFixed(2)}x
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase">Header logo scale</Label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={80}
              max={140}
              value={Math.round(headerLogoScale * 100)}
              onChange={(e) =>
                setBrandKit({
                  headerLogoScale: Math.max(
                    0.8,
                    Math.min(1.4, Number(e.target.value) / 100),
                  ),
                })
              }
              className="h-1.5 w-full cursor-pointer rounded-full bg-muted accent-primary"
            />
            <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
              {headerLogoScale.toFixed(2)}x
            </span>
          </div>
        </div>

        <div className="my-1 h-px bg-border/60" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
            Scene overlays
          </p>
          <p className="text-[10px] text-muted-foreground">
            Keep background clean, or add subtle cinematic edge vignette.
          </p>
        </div>

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <Label className="text-[11px] font-medium text-foreground">
              Scene vignette overlay
            </Label>
            <p className="text-[10px] leading-relaxed text-muted-foreground break-words">
              Subtle dark edge for cinematic focus. Turn off for fully raw image.
            </p>
          </div>
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-primary"
            checked={showSceneVignetteOverlay}
            onChange={(e) =>
              updateProject({
                metadata: { showSceneVignetteOverlay: e.target.checked },
              })
            }
            aria-label="Show scene vignette overlay"
          />
        </label>

        {showSceneVignetteOverlay ? (
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase">Vignette strength</Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(sceneVignetteStrength * 100)}
                onChange={(e) =>
                  updateProject({
                    metadata: {
                      sceneVignetteStrength: Math.max(
                        0,
                        Math.min(1, Number(e.target.value) / 100),
                      ),
                    },
                  })
                }
                className="h-1.5 w-full cursor-pointer rounded-full bg-muted accent-primary"
              />
              <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
                {Math.round(sceneVignetteStrength * 100)}%
              </span>
            </div>
          </div>
        ) : null}

        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border/70 bg-background/30 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <Label className="text-[11px] font-medium text-foreground">
              High protection
            </Label>
            <p className="text-[10px] leading-relaxed text-muted-foreground break-words">
              Tiled logo watermark at low opacity over the scene (requires a
              logo).
            </p>
          </div>
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-primary"
            checked={highProtectionOn}
            onChange={(e) => {
              updateProject({
                metadata: { highProtectionWatermark: e.target.checked },
              });
            }}
            aria-label="High protection watermark on video"
          />
        </label>
      </CardContent>
    </Card>
  );
}
