import type {
  AdStudioCompositionProps,
  AdStudioTimelineInput,
} from "@/remotion/compositions/AdStudioComposition";
import type {
  ClipTimelineState,
  ProjectTimelineMeta,
  TrackTimelineState,
} from "@/lib/types/timeline";

export function toRemotionTimeline(
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

export function resolveVoiceoverSrc(
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

export function buildAdStudioInputProps(
  origin: string,
  project: ProjectTimelineMeta,
  tracks: TrackTimelineState[],
  clipsById: Record<string, ClipTimelineState>,
): AdStudioCompositionProps {
  const meta = project.metadata as Record<string, unknown>;
  const bc = project.brandConfig;

  const website =
    (typeof bc.website === "string" && bc.website) ||
    (typeof meta.website === "string" ? meta.website : "") ||
    (typeof meta.websiteUrl === "string" ? meta.websiteUrl : "");
  const voiceoverSrc = resolveVoiceoverSrc(origin, meta);
  const voiceoverRate = 1;

  return {
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
      endScreenCtaText:
        typeof bc.endScreenCtaText === "string" ? bc.endScreenCtaText : "",
      endScreenCtaBg1:
        typeof bc.endScreenCtaBg1 === "string" ? bc.endScreenCtaBg1 : "",
      endScreenCtaBg2:
        typeof bc.endScreenCtaBg2 === "string" ? bc.endScreenCtaBg2 : "",
      endScreenCtaTextColor:
        typeof bc.endScreenCtaTextColor === "string"
          ? bc.endScreenCtaTextColor
          : "#0a0a0a",
      tagline: typeof bc.tagline === "string" ? bc.tagline : "",
    },
    voiceoverSrc,
    voiceoverRate,
  };
}

export function exportFilenameForBrand(project: ProjectTimelineMeta): string {
  const bc = project.brandConfig;
  const raw =
    (typeof bc.companyName === "string" && bc.companyName.trim()) ||
    project.name.trim() ||
    "Brand";
  const slug = raw
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 48);
  const safe = slug || "Brand";
  return `${safe}_AI_Ad_Premium.mp4`;
}
