import { useState } from "react";
import { Globe, MapPin, Phone } from "lucide-react";
import { Audio } from "@remotion/media";
import { QRCodeSVG } from "qrcode.react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  getMusicClipAtSecond,
  getVoiceoverClipAtSecond,
  getTextClipAtSecond,
  headlineFromRemotionClip,
  type RemotionClipInput,
  type RemotionTrackInput,
} from "@/remotion/lib/active-clip";
import {
  musicLinearVolume,
  musicVolumePctFromAudioProps,
  voiceLinearVolume,
  voiceVolumePctFromAudioProps,
} from "@/lib/audio/volume-pct";
import { HEADLINE_FONT } from "@/remotion/components/HeadlineLayer";

const LUX_DETAIL_FONT =
  'var(--font-geist-sans, "Geist Sans"), Inter, ui-sans-serif, system-ui, sans-serif';

export type AdStudioTimelineInput = {
  tracks: RemotionTrackInput[];
  clipsById: Record<string, RemotionClipInput>;
};

export type AdStudioCompositionProps = {
  origin: string;
  timeline: AdStudioTimelineInput;
  projectName: string;
  metadata: Record<string, unknown>;
  brandPrimary: string;
  brandSecondary: string;
  showQrOverlay: boolean;
  /** Bottom banner card background overlay. OFF hides only the background (content stays). */
  showFocusCardOverlay: boolean;
  /** URL encoded into the QR (typically website). */
  qrValue: string;
  brandKit: {
    companyName: string;
    phone: string;
    address: string;
    website: string;
    logoUrl: string;
    endScreenTagline: string;
    endScreenPhone: string;
    tagline: string;
    endScreenCtaText?: string;
    endScreenCtaBg1?: string;
    endScreenCtaBg2?: string;
    endScreenCtaTextColor?: string;
    bannerBrandNameColor?: string;
    bannerDetailColor?: string;
    bannerPhoneColor?: string;
    bannerPhoneScale?: number;
    headerBrandNameColor?: string;
    headerSloganColor?: string;
    headerBrandScale?: number;
    headerLogoScale?: number;
    qrOutlineColor?: string;
    qrOutlineWidth?: number;
  };
  voiceoverSrc: string | null;
  /** Stretch/shrink VO so it matches final video duration. */
  voiceoverRate: number;
};

/** Server export: `calculateMetadata` reads `__*` keys; composition ignores them. */
export type AdStudioExportInputProps = AdStudioCompositionProps & {
  __compositionDurationInFrames: number;
  __compositionFps: number;
};

const PLACEHOLDER_STILL =
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1280&h=720&fit=crop&q=80";

function sceneMotionFingerprint(visual: RemotionClipInput): number {
  const si =
    typeof visual.content?.sceneIndex === "number"
      ? visual.content.sceneIndex
      : 0;
  return Math.round(visual.startTime * 10000) + si * 73856093;
}

/** Per-scene Ken Burns pan vectors (stable for the whole clip). */
function kenBurnsPan(visual: RemotionClipInput): {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
} {
  const seed = sceneMotionFingerprint(visual) >>> 0;
  const u1 = (seed % 10007) / 10007;
  const u2 = ((seed >>> 3) % 10009) / 10009;
  const u3 = ((seed >>> 6) % 10037) / 10037;
  const u4 = ((seed >>> 9) % 10039) / 10039;
  const mag = 28;
  const x0 = (u1 - 0.5) * 2 * mag;
  const y0 = (u2 - 0.5) * mag * 0.88;
  const x1 = x0 + (u3 - 0.38) * mag * 1.05;
  const y1 = y0 + (u4 - 0.42) * mag * 0.82;
  return { x0, y0, x1, y1 };
}

function SafeSceneImg({
  src,
  style,
}: {
  src: string | null;
  style: React.CSSProperties;
}) {
  const [bad, setBad] = useState(false);
  const url = !src || bad ? PLACEHOLDER_STILL : src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      style={{
        ...style,
      }}
      onError={() => setBad(true)}
    />
  );
}

function SafeBrandLogo({
  src,
  origin,
  letter,
}: {
  src: string;
  origin: string;
  letter: string;
}) {
  const [bad, setBad] = useState(false);
  const u = absUrl(origin, src) ?? src;
  if (!src.trim() || bad) {
    return (
      <span style={{ color: "#1a1a1a", fontWeight: 800, fontSize: 22 }}>
        {letter.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={u}
      alt=""
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
      onError={() => setBad(true)}
    />
  );
}

function absUrl(origin: string, url: string | null | undefined): string | null {
  if (!url || typeof url !== "string" || !url.trim()) return null;
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const path = u.startsWith("/") ? u : `/${u}`;
  return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}

function metaString(m: Record<string, unknown>, key: string): string {
  const v = m[key];
  return typeof v === "string" ? v : "";
}

function metaBool(m: Record<string, unknown>, key: string): boolean {
  return m[key] === true;
}

function metaNumber(m: Record<string, unknown>, key: string): number | null {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function BrandWatermarkTile({
  origin,
  logoUrl,
}: {
  origin: string;
  logoUrl: string;
}) {
  const u = absUrl(origin, logoUrl);
  if (!u) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        overflow: "hidden",
        opacity: 0.1,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-25%",
          backgroundImage: `url(${u})`,
          backgroundSize: "min(22vw, 200px) auto",
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
          transform: "rotate(-12deg)",
        }}
        aria-hidden
      />
    </AbsoluteFill>
  );
}

function laneOf(track: RemotionTrackInput): string {
  const m = track.metadata;
  return typeof m?.lane === "string" ? m.lane : "";
}

function listNonEndVisualClips(
  tracks: RemotionTrackInput[],
  clipsById: Record<string, RemotionClipInput>,
): RemotionClipInput[] {
  const ordered = [...tracks].sort((a, b) => a.index - b.index);
  const out: RemotionClipInput[] = [];
  for (const tr of ordered) {
    if (laneOf(tr) !== "visual") continue;
    for (const cid of tr.clipIds) {
      const c = clipsById[cid];
      if (!c) continue;
      if (c.mediaType !== "VIDEO" && c.mediaType !== "IMAGE") continue;
      if (c.metadata?.isEndScene === true) continue;
      out.push(c);
    }
  }
  out.sort((a, b) => a.startTime - b.startTime);
  return out;
}

function findEndSceneStartSec(
  tracks: RemotionTrackInput[],
  clipsById: Record<string, RemotionClipInput>,
): number | null {
  const ordered = [...tracks].sort((a, b) => a.index - b.index);
  for (const tr of ordered) {
    if (laneOf(tr) !== "visual") continue;
    for (const cid of tr.clipIds) {
      const c = clipsById[cid];
      if (!c) continue;
      if (c.metadata?.isEndScene === true) return c.startTime;
    }
  }
  return null;
}

const INTERP_CLAMP = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};

/** Cross-dissolve weights; pairwise uses bottom=A opacity 1, top=B opacity u. */
function getCrossfadeLayers(
  t: number,
  clips: RemotionClipInput[],
  crossSec: number,
  endStart: number,
): { clip: RemotionClipInput; weight: number }[] {
  if (!clips.length || t < 0 || t >= endStart) return [];

  for (let i = 0; i < clips.length - 1; i++) {
    const a = clips[i];
    const b = clips[i + 1];
    const cut = b.startTime;
    const aEnd = a.startTime + a.duration;
    if (Math.abs(cut - aEnd) > 0.03) continue;

    if (t >= cut - crossSec / 2 && t <= cut + crossSec / 2) {
      const u = interpolate(
        t,
        [cut - crossSec / 2, cut + crossSec / 2],
        [0, 1],
        INTERP_CLAMP,
      );
      return [
        { clip: a, weight: 1 - u },
        { clip: b, weight: u },
      ];
    }
  }

  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const S = c.startTime;
    const E = c.startTime + c.duration;
    if (t >= S && t < E) {
      let w = 1;
      if (i === 0) {
        w *= interpolate(t, [S, S + crossSec], [0, 1], INTERP_CLAMP);
      }
      if (i === clips.length - 1 && endStart < Infinity) {
        w *= interpolate(t, [endStart - crossSec, endStart], [1, 0], INTERP_CLAMP);
      }
      if (w > 0.005) return [{ clip: c, weight: w }];
      return [];
    }
  }

  return [];
}

function SceneKenBurnsImage({
  clip,
  frame,
  fps,
  origin,
}: {
  clip: RemotionClipInput;
  frame: number;
  fps: number;
  origin: string;
}) {
  const clipStartF = Math.round(clip.startTime * fps);
  const clipDurF = Math.max(1, Math.round(clip.duration * fps));
  const relFrame = frame - clipStartF;

  const vtp = (clip.transformProps ?? {}) as {
    opacity?: number;
    x?: number;
    y?: number;
    scaleX?: number;
  };
  const imgOpacityMul = vtp.opacity ?? 1;
  const assetDim = clip.assetUrl ? 1 : 0.85;

  const ken = interpolate(relFrame, [0, clipDurF], [1, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });
  const panPath = kenBurnsPan(clip);
  const panSpan = Math.max(1, clipDurF - 1);
  const panT = interpolate(relFrame, [0, panSpan], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "extend",
  });
  const panX =
    (vtp.x ?? 0) +
    interpolate(panT, [0, 1], [panPath.x0, panPath.x1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "extend",
    });
  const panY =
    (vtp.y ?? 0) +
    interpolate(panT, [0, 1], [panPath.y0, panPath.y1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "extend",
    });
  const userScale = vtp.scaleX ?? 1;

  const bgSrc = absUrl(origin, clip.assetUrl ?? null);

  if (!bgSrc) {
    return (
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(165deg, #0c0c0e 0%, #1a1a1f 45%, #09090b 100%)",
          opacity: imgOpacityMul * assetDim,
        }}
      />
    );
  }

  return (
    <AbsoluteFill
      style={{
        opacity: imgOpacityMul * assetDim,
        transform: `scale(${ken * userScale}) translate(${panX}px, ${panY}px)`,
        transformOrigin: "50% 40%",
      }}
    >
      <SafeSceneImg
        src={bgSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
}

function SceneCrossfadeStack({
  frame,
  fps,
  clips,
  origin,
  crossSec,
  endStartSec,
}: {
  frame: number;
  fps: number;
  clips: RemotionClipInput[];
  origin: string;
  crossSec: number;
  endStartSec: number;
}) {
  const t = frame / fps;
  const layers = getCrossfadeLayers(t, clips, crossSec, endStartSec);

  if (layers.length === 0) {
    return (
      <AbsoluteFill
        style={{ backgroundColor: "#0a0a0a" }}
      />
    );
  }

  if (layers.length === 1) {
    const { clip, weight } = layers[0];
    return (
      <AbsoluteFill style={{ opacity: weight }}>
        <SceneKenBurnsImage clip={clip} frame={frame} fps={fps} origin={origin} />
      </AbsoluteFill>
    );
  }

  const [x, y] =
    layers[0].clip.startTime <= layers[1].clip.startTime
      ? [layers[0], layers[1]]
      : [layers[1], layers[0]];
  const uBlend = y.weight;

  return (
    <>
      <AbsoluteFill style={{ opacity: 1 }}>
        <SceneKenBurnsImage clip={x.clip} frame={frame} fps={fps} origin={origin} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: uBlend }}>
        <SceneKenBurnsImage clip={y.clip} frame={frame} fps={fps} origin={origin} />
      </AbsoluteFill>
    </>
  );
}

/** Relative frame when CTA + QR appear (must match `EndCard` animation). */
function endOutroCtaStartFrames(fps: number): number {
  const logoDelay = Math.round(0.1 * fps);
  const logoIn = Math.round(0.3 * fps);
  const headlineDelay = Math.round(0.16 * fps);
  const headlineTw = Math.max(10, Math.round(0.88 * fps));
  const gap = Math.round(0.1 * fps);
  return logoDelay + logoIn + headlineDelay + headlineTw + gap;
}

function endOutroCtaLabel(brandName: string): "BUY NOW" | "SHOP THE DEAL" {
  let h = 0;
  for (let i = 0; i < brandName.length; i++) h = (h + brandName.charCodeAt(i)) % 2;
  return h === 0 ? "SHOP THE DEAL" : "BUY NOW";
}

function QrCorner({
  value,
  visible,
  brandPrimary,
  outlineColor,
  outlineWidth,
}: {
  value: string;
  visible: boolean;
  brandPrimary: string;
  outlineColor?: string;
  outlineWidth?: number;
}) {
  if (!visible || !value.trim()) return null;
  const size = Math.round(72 * 1.3);
  const strokeColor = outlineColor || brandPrimary;
  const strokeWidth = Math.max(0, Math.min(16, outlineWidth ?? 5));
  return (
    <div
      style={{
        background: "white",
        padding: 10,
        borderRadius: 12,
        border: `${strokeWidth}px solid ${strokeColor}`,
        boxShadow:
          "0 0 0 2px rgba(255,255,255,0.95), 0 14px 40px rgba(0,0,0,0.5)",
      }}
    >
      <QRCodeSVG value={value.trim()} size={size} level="M" marginSize={0} />
    </div>
  );
}

function GlobalBrandHeader({
  origin,
  logoUrl,
  brandName,
  slogan,
  globalFrame,
  handoffOpacity = 1,
  showHeaderOverlay,
  headerOverlayStrength,
  headerBrandNameColor,
  headerSloganColor,
  headerBrandScale,
  headerLogoScale,
}: {
  origin: string;
  logoUrl: string;
  brandName: string;
  slogan: string;
  globalFrame: number;
  handoffOpacity?: number;
  showHeaderOverlay: boolean;
  headerOverlayStrength: number;
  headerBrandNameColor: string;
  headerSloganColor: string;
  headerBrandScale: number;
  headerLogoScale: number;
}) {
  const headerOpacity =
    interpolate(globalFrame, [0, 14], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) * handoffOpacity;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        justifyContent: "flex-start",
        alignItems: "stretch",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: 22,
          paddingBottom: 26,
          paddingLeft: "3.5%",
          paddingRight: "3.5%",
          boxSizing: "border-box",
          opacity: headerOpacity,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: showHeaderOverlay
              ? `linear-gradient(90deg, rgba(0,0,0,${0.82 * headerOverlayStrength}) 0%, rgba(0,0,0,${
                  0.5 * headerOverlayStrength
                }) 42%, rgba(0,0,0,${0.08 * headerOverlayStrength}) 72%, rgba(0,0,0,0) 100%)`
              : "transparent",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 104 * headerLogoScale,
              height: 104 * headerLogoScale,
              flexShrink: 0,
              borderRadius: 18,
              background: "rgba(255,255,255,0.96)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              boxShadow:
                "0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ width: 90 * headerLogoScale, height: 90 * headerLogoScale }}>
              <SafeBrandLogo
                src={logoUrl}
                origin={origin}
                letter={brandName}
              />
            </div>
          </div>
          <div style={{ minWidth: 0, flex: 1, maxWidth: "72%" }}>
            <div
              style={{
                color: headerBrandNameColor,
                fontWeight: 800,
                fontSize:
                  Math.min(34, 22 + 280 / Math.max(brandName.length, 10)) *
                  headerBrandScale,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                textShadow: "0 4px 24px rgba(0,0,0,0.75)",
              }}
            >
              {brandName}
            </div>
            {slogan.trim() ? (
              <div
                style={{
                  marginTop: 6,
                  color: headerSloganColor,
                  fontWeight: 600,
                  fontSize: 16 * headerBrandScale,
                  letterSpacing: "0.02em",
                  lineHeight: 1.35,
                  textShadow: "0 2px 16px rgba(0,0,0,0.65)",
                }}
              >
                {slogan.trim()}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

type EndCardProps = {
  origin: string;
  brandName: string;
  phone: string;
  address: string;
  website: string;
  logoUrl: string;
  tagline: string;
  qrValue: string;
  relFrame: number;
  fps: number;
  brandPrimary: string;
  endCtaText?: string;
  endCtaBg1?: string;
  endCtaBg2?: string;
  endCtaTextColor?: string;
};

function EndCard({
  origin,
  brandName,
  phone,
  address,
  website,
  logoUrl,
  tagline,
  qrValue,
  relFrame,
  fps,
  brandPrimary,
  endCtaText,
  endCtaBg1,
  endCtaBg2,
  endCtaTextColor,
}: EndCardProps) {
  const host = website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const headline =
    tagline.trim() ||
    (brandName.trim() ? `${brandName.trim()}.` : "Shop the drop.");
  const withAlpha = (hex: string, alpha: string) => {
    const h = hex.trim();
    if (/^#[0-9a-f]{6}$/i.test(h) && /^[0-9a-f]{2}$/i.test(alpha.trim())) {
      return `${h}${alpha.trim()}`;
    }
    return h;
  };

  const btnBg1 = (endCtaBg1?.trim() || brandPrimary).trim();
  const btnBg2 =
    (endCtaBg2?.trim() ||
      (btnBg1.startsWith("#") && btnBg1.length === 7
        ? `${btnBg1}dd`
        : btnBg1)).trim();
  const btnFg = (endCtaTextColor?.trim() || "#0a0a0a").trim();
  const btnBg1Shadow55 = withAlpha(btnBg1, "55");

  const ctaLabel = endCtaText?.trim()
    ? endCtaText.trim()
    : endOutroCtaLabel(brandName || "brand");

  const ctaStart = endOutroCtaStartFrames(fps);
  const cardInF = Math.max(8, Math.round(0.42 * fps));
  const logoDelay = Math.round(0.1 * fps);
  const logoInF = Math.max(6, Math.round(0.3 * fps));
  const headlineDelay = Math.round(0.16 * fps);
  const headlineTw = Math.max(10, Math.round(0.88 * fps));
  const logoStart = logoDelay;
  const headlineStart = logoDelay + logoInF + headlineDelay;

  const cardY = interpolate(
    relFrame,
    [0, cardInF],
    [110, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const cardOpacity = interpolate(
    relFrame,
    [0, Math.min(cardInF, Math.round(0.18 * fps))],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const logoOpacity = interpolate(
    relFrame,
    [logoStart, logoStart + logoInF],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const glowPulse =
    0.55 +
    0.45 *
      (0.5 +
        0.5 * Math.sin((relFrame / Math.max(fps, 1)) * Math.PI * 1.85));

  const twChars = Math.max(
    0,
    Math.ceil(headline.length * Math.min(1, (relFrame - headlineStart) / headlineTw)),
  );
  const headlineShown = headline.slice(0, twChars);

  const rowInF = Math.round(0.22 * fps);
  const rowOpacity = interpolate(
    relFrame,
    [ctaStart, ctaStart + rowInF],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const rowY = interpolate(
    relFrame,
    [ctaStart, ctaStart + rowInF],
    [18, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const btnPulse =
    1 +
    0.032 *
      Math.sin((Math.max(0, relFrame - ctaStart) / Math.max(fps, 1)) * Math.PI * 2.4);

  const footerBits = [phone.trim(), brandName.trim(), address.trim(), host]
    .filter(Boolean)
    .join(" · ");

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(120% 90% at 50% 120%, rgba(255,255,255,0.06) 0%, #050506 45%, #020203 100%)",
        fontFamily: HEADLINE_FONT,
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "5% 6%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "min(94%, 900px)",
            minHeight: "62vh",
            transform: `translateY(${cardY}px)`,
            opacity: cardOpacity,
            borderRadius: 32,
            padding: "48px 40px 40px",
            boxSizing: "border-box",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow:
              "0 28px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 32,
            }}
          >
            <div
              style={{
                width: 168,
                height: 168,
                borderRadius: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: logoOpacity,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: `0 0 ${32 + glowPulse * 48}px ${brandPrimary}66, 0 0 ${14 + glowPulse * 18}px ${brandPrimary}44`,
              }}
            >
              <div style={{ width: 138, height: 138 }}>
                <SafeBrandLogo src={logoUrl} origin={origin} letter={brandName} />
              </div>
            </div>

            <div
              style={{
                fontSize: Math.min(
                  76,
                  52 + Math.floor(720 / Math.max(headline.length, 8)),
                ),
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: "-0.045em",
                color: "#fafafa",
                textTransform: "uppercase",
                textShadow: "0 6px 40px rgba(0,0,0,0.65)",
                padding: "0 4px",
                minHeight: "1.1em",
              }}
            >
              {headlineShown}
              {relFrame > headlineStart && twChars < headline.length ? (
                <span style={{ opacity: 0.5 }}>|</span>
              ) : null}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 18,
                width: "100%",
                marginTop: 4,
                opacity: rowOpacity,
                transform: `translateY(${rowY}px)`,
              }}
            >
              <button
                type="button"
                style={{
                    transform: `scale(${btnPulse})`,
                    padding: "22px 40px",
                    borderRadius: 999,
                    border: "none",
                    fontFamily: HEADLINE_FONT,
                    fontSize: 28,
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: btnFg,
                    background: `linear-gradient(180deg, ${btnBg1} 0%, ${btnBg2} 100%)`,
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.2), 0 16px 48px ${btnBg1Shadow55}, 0 8px 24px rgba(0,0,0,0.45)`,
                    whiteSpace: "nowrap",
                  }}
              >
                {ctaLabel}
              </button>
              {qrValue.trim() ? (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.96)",
                    border: `6px solid ${brandPrimary}`,
                    boxShadow: `0 0 0 2px rgba(255,255,255,0.4) inset, 0 16px 40px rgba(0,0,0,0.4)`,
                    flexShrink: 0,
                  }}
                >
                  <QRCodeSVG
                    value={qrValue.trim()}
                    size={118}
                    level="M"
                    marginSize={0}
                  />
                </div>
              ) : null}
            </div>

            {footerBits ? (
              <div
                style={{
                  marginTop: 14,
                  fontSize: 13,
                  lineHeight: 1.45,
                  color: "rgba(250,250,250,0.38)",
                  fontWeight: 600,
                  maxWidth: "100%",
                }}
              >
                {footerBits}
              </div>
            ) : null}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** Lower-third: animates once at t≈0; persists across scenes; fades for end card. */
function PersistentBottomBanner({
  globalFrame,
  fps,
  handoffOpacity,
  showFocusCardOverlay,
  bannerOverlayStrength,
  brandNameColor,
  brandDetailColor,
  brandPhoneColor,
  brandPhoneScale,
  brandName,
  address,
  website,
  phone,
  brandSecondary,
  projectName,
}: {
  globalFrame: number;
  fps: number;
  handoffOpacity: number;
  showFocusCardOverlay: boolean;
  bannerOverlayStrength: number;
  brandNameColor: string;
  brandDetailColor: string;
  brandPhoneColor: string;
  brandPhoneScale: number;
  brandName: string;
  address: string;
  website: string;
  phone: string;
  brandSecondary: string;
  projectName: string;
}) {
  const luxDetailFs = 20;
  const luxPhoneFs = Math.round(luxDetailFs * 1.2);
  const luxIconPx = 21;
  const luxIconColor = "rgba(255,255,255,0.6)";

  const bannerInStart = Math.round(0.08 * fps);
  const bannerSlideBlurDur = Math.round(0.8 * fps);
  const bannerOpacityIntro = interpolate(
    globalFrame,
    [bannerInStart, bannerInStart + bannerSlideBlurDur],
    [0, 1],
    INTERP_CLAMP,
  );
  const bannerY = interpolate(
    globalFrame,
    [bannerInStart, bannerInStart + bannerSlideBlurDur],
    [20, 0],
    INTERP_CLAMP,
  );
  const bannerBlurPx = interpolate(
    globalFrame,
    [bannerInStart, bannerInStart + bannerSlideBlurDur],
    [10, 0],
    INTERP_CLAMP,
  );
  const sublineOpacity = interpolate(
    globalFrame,
    [
      bannerInStart + Math.round(0.45 * fps),
      bannerInStart + bannerSlideBlurDur,
    ],
    [0, 0.75],
    INTERP_CLAMP,
  );

  const bannerOpacity = bannerOpacityIntro * handoffOpacity;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "stretch",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          width: "100%",
          paddingBottom: "max(12px, 1.1%)",
        }}
      >
        <div
          style={{
            opacity: bannerOpacity,
            transform: `translateY(${bannerY}px)`,
            filter: `blur(${bannerBlurPx}px)`,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 24,
              width: "100%",
              boxSizing: "border-box",
              paddingTop: "min(6vh, 58px)",
              paddingRight: "3.5%",
              paddingBottom: "max(14px, 1.2%)",
              paddingLeft: "3.5%",
              background: showFocusCardOverlay
                ? `linear-gradient(180deg, rgba(0,0,0,${0.32 * bannerOverlayStrength}) 0%, rgba(0,0,0,${
                    0.26 * bannerOverlayStrength
                  }) 38%, rgba(0,0,0,${
                    0.18 * bannerOverlayStrength
                  }) 72%, rgba(0,0,0,0) 100%)`
                : "transparent",
              backdropFilter: showFocusCardOverlay ? "blur(64px)" : "none",
              WebkitBackdropFilter: showFocusCardOverlay ? "blur(64px)" : "none",
              boxShadow: showFocusCardOverlay
                ? "0 -52px 160px rgba(0,0,0,0.58), 0 -18px 64px rgba(0,0,0,0.4)"
                : "none",
            }}
          >
            <div
              style={{
                minWidth: 0,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  color: brandNameColor,
                  fontWeight: 800,
                  fontSize: 28 * brandPhoneScale,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                  fontFamily: HEADLINE_FONT,
                }}
              >
                {brandName}
              </div>
              {address ? (
                <div
                  style={{
                    color: brandDetailColor,
                    fontSize: luxDetailFs,
                    fontFamily: LUX_DETAIL_FONT,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    lineHeight: 1.4,
                  }}
                >
                  <span
                    style={{
                      color: luxIconColor,
                      flexShrink: 0,
                      display: "flex",
                    }}
                    aria-hidden
                  >
                    <MapPin size={luxIconPx} strokeWidth={1.5} />
                  </span>
                  <span>{address}</span>
                </div>
              ) : null}
              {website ? (
                <div
                  style={{
                    color: brandDetailColor,
                    fontSize: luxDetailFs,
                    fontFamily: LUX_DETAIL_FONT,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    marginTop: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    lineHeight: 1.4,
                  }}
                >
                  <span
                    style={{
                      color: luxIconColor,
                      flexShrink: 0,
                      display: "flex",
                    }}
                    aria-hidden
                  >
                    <Globe size={luxIconPx} strokeWidth={1.5} />
                  </span>
                  <span>{website.replace(/^https?:\/\//, "")}</span>
                </div>
              ) : null}
            </div>

            {phone ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 11,
                  flexShrink: 0,
                  maxWidth: "44%",
                  alignSelf: "flex-end",
                }}
              >
                <span
                  style={{
                    color: luxIconColor,
                    flexShrink: 0,
                    display: "flex",
                  }}
                  aria-hidden
                >
                  <Phone size={luxIconPx} strokeWidth={1.5} />
                </span>
                <div
                  style={{
                      color: brandPhoneColor,
                    fontWeight: 900,
                      fontSize: luxPhoneFs * brandPhoneScale,
                    fontFamily: LUX_DETAIL_FONT,
                    letterSpacing: "0.04em",
                    textShadow: "0 6px 28px rgba(0,0,0,0.55)",
                    textAlign: "right",
                    lineHeight: 1.15,
                    wordBreak: "break-word",
                  }}
                >
                  {phone}
                </div>
              </div>
            ) : (
              <div style={{ width: 8, flexShrink: 0 }} aria-hidden />
            )}
          </div>
        </div>

        <div
          style={{
            paddingTop: 4,
            paddingBottom: "max(6px, 0.5%)",
            textAlign: "center",
            color: brandSecondary,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: sublineOpacity * handoffOpacity,
          }}
        >
          {projectName}
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function AdStudioComposition({
  origin,
  timeline,
  projectName,
  metadata,
  brandPrimary,
  brandSecondary,
  showQrOverlay,
  showFocusCardOverlay,
  qrValue,
  brandKit,
  voiceoverSrc,
  voiceoverRate,
}: AdStudioCompositionProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  const textClip = getTextClipAtSecond(
    t,
    timeline.tracks,
    timeline.clipsById,
  );

  const headline = headlineFromRemotionClip(textClip);

  const phone = brandKit.phone || metaString(metadata, "phone");
  const address = brandKit.address || metaString(metadata, "address") || "";
  const website = brandKit.website || metaString(metadata, "website") || "";
  const brandName =
    brandKit.companyName ||
    metaString(metadata, "brandDisplayName") ||
    projectName ||
    "Brand";
  const logoUrl = brandKit.logoUrl || metaString(metadata, "logoUrl");
  const highProtectionWatermark =
    metaBool(metadata, "highProtectionWatermark") &&
    logoUrl.trim().length > 0;
  const endPhone =
    (brandKit.endScreenPhone && brandKit.endScreenPhone.trim()) || phone;
  const endTagline = brandKit.endScreenTagline || "";
  const endCtaText = brandKit.endScreenCtaText || "";
  const endCtaBg1 = brandKit.endScreenCtaBg1 || "";
  const endCtaBg2 = brandKit.endScreenCtaBg2 || "";
  const endCtaTextColor = brandKit.endScreenCtaTextColor || "#0a0a0a";
  const brandSlogan =
    (brandKit.tagline && brandKit.tagline.trim()) ||
    metaString(metadata, "tagline") ||
    endTagline ||
    metaString(metadata, "previewSubtitle");

  const bannerOverlayStrength = Math.max(
    0,
    Math.min(1, metaNumber(metadata, "bannerOverlayStrength") ?? 1),
  );
  const brandNameColor = brandKit.bannerBrandNameColor || "#fafafa";
  const brandDetailColor = brandKit.bannerDetailColor || "rgba(250,250,250,0.78)";
  const brandPhoneColor = brandKit.bannerPhoneColor || brandSecondary;
  const brandPhoneScale = Math.max(
    0.8,
    Math.min(1.4, brandKit.bannerPhoneScale ?? 1),
  );
  const showHeaderOverlay = metadata.showHeaderOverlay !== false;
  const headerOverlayStrength = Math.max(
    0,
    Math.min(1, metaNumber(metadata, "headerOverlayStrength") ?? 1),
  );
  const headerBrandNameColor = brandKit.headerBrandNameColor || "#fafafa";
  const headerSloganColor = brandKit.headerSloganColor || "rgba(250,250,250,0.9)";
  const headerBrandScale = Math.max(
    0.8,
    Math.min(1.4, brandKit.headerBrandScale ?? 1),
  );
  const headerLogoScale = Math.max(0.8, Math.min(1.4, brandKit.headerLogoScale ?? 1));
  const qrOutlineColor = brandKit.qrOutlineColor || brandPrimary;
  const qrOutlineWidth = Math.max(0, Math.min(16, brandKit.qrOutlineWidth ?? 5));
  const showSceneVignetteOverlay = metadata.showSceneVignetteOverlay !== false;
  const sceneVignetteStrength = Math.max(
    0,
    Math.min(1, metaNumber(metadata, "sceneVignetteStrength") ?? 1),
  );

  const qrData =
    (qrValue && qrValue.trim()) ||
    website.trim() ||
    metaString(metadata, "websiteUrl");

  const musicClip = getMusicClipAtSecond(t, timeline.tracks, timeline.clipsById);
  const musicSrc = musicClip?.assetUrl
    ? absUrl(origin, musicClip.assetUrl)
    : null;
  const musicPct = musicVolumePctFromAudioProps(musicClip?.audioProps ?? null);
  const musicVol = musicLinearVolume(musicPct);

  const voClip = getVoiceoverClipAtSecond(
    t,
    timeline.tracks,
    timeline.clipsById,
  );
  const voicePct = voClip
    ? voiceVolumePctFromAudioProps(voClip.audioProps ?? null)
    : 100;
  const voiceVol = voiceLinearVolume(voicePct);
  const audioLayer = (
    <>
      {musicSrc && musicVol > 0 ? (
        <Audio
          src={musicSrc}
          volume={musicVol}
          trimAfter={durationInFrames}
        />
      ) : null}
      {voiceoverSrc && voiceVol > 0 ? (
        <Audio
          key={`vo-${voiceoverSrc}`}
          src={voiceoverSrc}
          volume={voiceVol}
          playbackRate={voiceoverRate}
          trimAfter={durationInFrames}
        />
      ) : null}
    </>
  );

  const endStartSec = findEndSceneStartSec(timeline.tracks, timeline.clipsById);
  const endStartF =
    endStartSec !== null ? Math.round(endStartSec * fps) : durationInFrames + 1;
  const onEndCard = frame >= endStartF && endStartSec !== null;
  const endRelFrame = onEndCard ? frame - endStartF : 0;
  const ctaChimeAt = endStartF + endOutroCtaStartFrames(fps);

  const nonEndClips = listNonEndVisualClips(timeline.tracks, timeline.clipsById);
  const crossSec = 0.48;

  const endHandoffOpacity = interpolate(
    endRelFrame,
    [0, Math.round(0.58 * fps)],
    [1, 0],
    INTERP_CLAMP,
  );
  const bannerHandoffFade = onEndCard ? endHandoffOpacity : 1;
  const headerHandoffFade = bannerHandoffFade;

  const textClipStartF = textClip ? Math.round(textClip.startTime * fps) : 0;
  const textRelFrame = Math.max(0, frame - textClipStartF);
  const captionText = headline.trim();
  const captionOpacity = interpolate(
    textRelFrame,
    [4, 22],
    [0, 1],
    INTERP_CLAMP,
  );
  const endStartForScenes = endStartSec ?? Infinity;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily: HEADLINE_FONT,
        overflow: "hidden",
      }}
    >
      {audioLayer}
      {onEndCard ? (
        <Sequence from={ctaChimeAt} layout="none">
          <Audio
            src={staticFile("media/sfx/cta-chime.mp3")}
            volume={0.38}
          />
        </Sequence>
      ) : null}

      {!onEndCard ? (
        <AbsoluteFill>
          <SceneCrossfadeStack
            frame={frame}
            fps={fps}
            clips={nonEndClips}
            origin={origin}
            crossSec={crossSec}
            endStartSec={endStartForScenes}
          />
          {showSceneVignetteOverlay ? (
            <AbsoluteFill
              style={{
                pointerEvents: "none",
                background: `radial-gradient(ellipse 88% 78% at 50% 46%, rgba(0,0,0,0) 45%, rgba(0,0,0,${
                  0.08 * sceneVignetteStrength
                }) 75%, rgba(0,0,0,${0.22 * sceneVignetteStrength}) 100%)`,
              }}
            />
          ) : null}
          {highProtectionWatermark ? (
            <BrandWatermarkTile origin={origin} logoUrl={logoUrl} />
          ) : null}
        </AbsoluteFill>
      ) : null}

      {onEndCard ? (
        <EndCard
          origin={origin}
          brandName={brandName}
          phone={endPhone}
          address={address}
          website={website}
          logoUrl={logoUrl}
          tagline={endTagline}
          qrValue={qrData}
          relFrame={endRelFrame}
          fps={fps}
          brandPrimary={brandPrimary}
          endCtaText={endCtaText}
          endCtaBg1={endCtaBg1}
          endCtaBg2={endCtaBg2}
          endCtaTextColor={endCtaTextColor}
        />
      ) : null}

      <GlobalBrandHeader
        origin={origin}
        logoUrl={logoUrl}
        brandName={brandName}
        slogan={brandSlogan}
        globalFrame={frame}
        handoffOpacity={headerHandoffFade}
        showHeaderOverlay={showHeaderOverlay}
        headerOverlayStrength={headerOverlayStrength}
        headerBrandNameColor={headerBrandNameColor}
        headerSloganColor={headerSloganColor}
        headerBrandScale={headerBrandScale}
        headerLogoScale={headerLogoScale}
      />

      {!onEndCard ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            alignItems: "flex-end",
            paddingTop: 28,
            paddingRight: 28,
            pointerEvents: "none",
          }}
        >
          <QrCorner
            value={qrData}
            visible={showQrOverlay}
            brandPrimary={brandPrimary}
            outlineColor={qrOutlineColor}
            outlineWidth={qrOutlineWidth}
          />
        </AbsoluteFill>
      ) : null}

      <PersistentBottomBanner
        globalFrame={frame}
        fps={fps}
        handoffOpacity={bannerHandoffFade}
        showFocusCardOverlay={showFocusCardOverlay}
        bannerOverlayStrength={bannerOverlayStrength}
        brandNameColor={brandNameColor}
        brandDetailColor={brandDetailColor}
        brandPhoneColor={brandPhoneColor}
        brandPhoneScale={brandPhoneScale}
        brandName={brandName}
        address={address}
        website={website}
        phone={phone}
        brandSecondary={brandSecondary}
        projectName={projectName}
      />
    </AbsoluteFill>
  );
}
