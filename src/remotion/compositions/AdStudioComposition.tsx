import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AbsoluteFill,
  Audio,
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
  getVisualClipAtSecond,
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
  /** Bottom focus card (address / phone strip). When false, only the top brand header shows. */
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
  };
  voiceoverSrc: string | null;
  /** Stretch/shrink VO so it matches final video duration. */
  voiceoverRate: number;
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
        filter: "brightness(0.8) contrast(1.1)",
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

function isEndVisual(visual: RemotionClipInput | null): boolean {
  return visual?.metadata?.isEndScene === true;
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
}: {
  value: string;
  visible: boolean;
  brandPrimary: string;
}) {
  if (!visible || !value.trim()) return null;
  const size = Math.round(72 * 1.3);
  return (
    <div
      style={{
        background: "white",
        padding: 10,
        borderRadius: 12,
        border: `5px solid ${brandPrimary}`,
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
  relFrame,
}: {
  origin: string;
  logoUrl: string;
  brandName: string;
  slogan: string;
  relFrame: number;
}) {
  const headerOpacity = interpolate(relFrame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
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
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 42%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 22,
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              flexShrink: 0,
              borderRadius: 16,
              background: "rgba(255,255,255,0.96)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
            }}
          >
            <div style={{ width: 76, height: 76 }}>
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
                color: "#fafafa",
                fontWeight: 800,
                fontSize: Math.min(34, 22 + 280 / Math.max(brandName.length, 10)),
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
                  color: "rgba(250,250,250,0.9)",
                  fontWeight: 600,
                  fontSize: 16,
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
}: EndCardProps) {
  const host = website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const headline =
    tagline.trim() ||
    (brandName.trim() ? `${brandName.trim()}.` : "Shop the drop.");
  const ctaLabel = endOutroCtaLabel(brandName || "brand");
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
                    color: "#0a0a0a",
                    background: `linear-gradient(180deg, ${brandPrimary} 0%, ${brandPrimary}dd 100%)`,
                    boxShadow: `0 0 0 1px rgba(255,255,255,0.2), 0 16px 48px ${brandPrimary}55, 0 8px 24px rgba(0,0,0,0.45)`,
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

  const visual = getVisualClipAtSecond(
    t,
    timeline.tracks,
    timeline.clipsById,
  );
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
  const endPhone =
    (brandKit.endScreenPhone && brandKit.endScreenPhone.trim()) || phone;
  const endTagline = brandKit.endScreenTagline || "";
  const brandSlogan =
    (brandKit.tagline && brandKit.tagline.trim()) ||
    metaString(metadata, "tagline") ||
    endTagline ||
    metaString(metadata, "previewSubtitle");

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
          startFrom={0}
          endAt={durationInFrames}
        />
      ) : null}
      {voiceoverSrc && voiceVol > 0 ? (
        <Audio
          key={`vo-${voiceoverSrc}`}
          src={voiceoverSrc}
          volume={voiceVol}
          playbackRate={voiceoverRate}
          startFrom={0}
          endAt={durationInFrames}
        />
      ) : null}
    </>
  );

  if (visual && isEndVisual(visual)) {
    const endClipStartF = Math.round(visual.startTime * fps);
    const endRelFrame = Math.max(0, frame - endClipStartF);
    const ctaChimeAt = endClipStartF + endOutroCtaStartFrames(fps);

    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#0a0a0a",
          fontFamily: HEADLINE_FONT,
          overflow: "hidden",
        }}
      >
        {audioLayer}
        <Sequence from={ctaChimeAt} layout="none">
          <Audio
            src={staticFile("media/sfx/cta-chime.mp3")}
            volume={0.38}
          />
        </Sequence>
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
        />
      </AbsoluteFill>
    );
  }

  const bgSrc = absUrl(origin, visual?.assetUrl ?? null);

  const clipStartF = visual ? Math.round(visual.startTime * fps) : 0;
  const clipDurF = visual
    ? Math.max(1, Math.round(visual.duration * fps))
    : durationInFrames;
  const relFrame = Math.max(0, frame - clipStartF);

  const vtp = (visual?.transformProps ?? {}) as {
    opacity?: number;
    x?: number;
    y?: number;
    scaleX?: number;
  };
  const imgOpacityMul = vtp.opacity ?? 1;

  const ken = interpolate(relFrame, [0, clipDurF], [1, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const crossInF = Math.max(
    10,
    Math.min(Math.round(0.42 * fps), Math.max(4, Math.floor(clipDurF * 0.28))),
  );
  const crossOutF = Math.max(
    10,
    Math.min(Math.round(0.45 * fps), Math.max(4, Math.floor(clipDurF * 0.3))),
  );

  const fadeIn = interpolate(relFrame, [0, crossInF], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    relFrame,
    [Math.max(0, clipDurF - crossOutF), clipDurF],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const sceneOpacity =
    Math.min(fadeIn, fadeOut) *
    (visual?.assetUrl ? 1 : 0.85) *
    imgOpacityMul;

  const panT =
    clipDurF > 1 ? relFrame / Math.max(1, clipDurF - 1) : 1;
  const panPath = visual
    ? kenBurnsPan(visual)
    : { x0: 0, y0: 0, x1: 0, y1: 0 };
  const panX =
    (vtp.x ?? 0) +
    interpolate(panT, [0, 1], [panPath.x0, panPath.x1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const panY =
    (vtp.y ?? 0) +
    interpolate(panT, [0, 1], [panPath.y0, panPath.y1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const userScale = vtp.scaleX ?? 1;

  const bannerInStart = Math.round(0.1 * fps);
  const bannerInDur = Math.round(0.24 * fps);
  const bannerOpacity = interpolate(
    relFrame,
    [bannerInStart, bannerInStart + bannerInDur],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const bannerY = interpolate(
    relFrame,
    [bannerInStart, bannerInStart + bannerInDur + 6],
    [32, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const sublineOpacity = interpolate(
    relFrame,
    [bannerInStart + 8, bannerInStart + bannerInDur + 18],
    [0, 0.75],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const captionText = headline.trim();
  const captionOpacity = interpolate(
    relFrame,
    [4, 22],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily: HEADLINE_FONT,
        overflow: "hidden",
      }}
    >
      {audioLayer}

      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        {bgSrc ? (
          <AbsoluteFill
            style={{
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
        ) : (
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(165deg, #0c0c0e 0%, #1a1a1f 45%, #09090b 100%)",
            }}
          />
        )}
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(6,6,8,0.18) 0%, rgba(6,6,8,0.42) 50%, rgba(6,6,8,0.72) 100%)",
          }}
        />
        <AbsoluteFill
          style={{
            backgroundColor: brandPrimary,
            opacity: 0.05,
            pointerEvents: "none",
          }}
        />
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 88% 78% at 50% 46%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.22) 72%, rgba(0,0,0,0.58) 100%)",
          }}
        />
      </AbsoluteFill>

      <GlobalBrandHeader
        origin={origin}
        logoUrl={logoUrl}
        brandName={brandName}
        slogan={brandSlogan}
        relFrame={relFrame}
      />

      {captionText ? (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            justifyContent: "flex-end",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: showFocusCardOverlay
                ? "calc(26vh + 14px)"
                : "max(28px, 4vh)",
              paddingLeft: "4%",
              paddingRight: "4%",
              textAlign: "center",
              opacity: captionOpacity,
            }}
          >
            <span
              style={{
                fontFamily: HEADLINE_FONT,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.93)",
                textShadow: "0 2px 14px rgba(0,0,0,0.7)",
                lineHeight: 1.4,
              }}
            >
              {captionText}
            </span>
          </div>
        </AbsoluteFill>
      ) : null}

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
        />
      </AbsoluteFill>

      {showFocusCardOverlay ? (
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
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                minHeight: "26vh",
                width: "100%",
                boxSizing: "border-box",
                padding: "22px 3.5% 26px",
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 -24px 80px rgba(0,0,0,0.35)",
                opacity: bannerOpacity,
                transform: `translateY(${bannerY}px)`,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    color: "#fafafa",
                    fontWeight: 800,
                    fontSize: 27,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  {brandName}
                </div>
                {address ? (
                  <div
                    style={{
                      color: "rgba(250,250,250,0.78)",
                      fontSize: 17,
                      marginTop: 12,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      lineHeight: 1.35,
                    }}
                  >
                    <span style={{ opacity: 0.85 }} aria-hidden>
                      📍
                    </span>
                    <span>{address}</span>
                  </div>
                ) : null}
                {website ? (
                  <div
                    style={{
                      color: "rgba(250,250,250,0.74)",
                      fontSize: 17,
                      marginTop: 8,
                    }}
                  >
                    🔗 {website.replace(/^https?:\/\//, "")}
                  </div>
                ) : null}
              </div>

              {phone ? (
                <div
                  style={{
                    color: "#fafafa",
                    fontWeight: 800,
                    fontSize: Math.min(
                      63,
                      36 + (phone.length < 15 ? 16 : 6),
                    ),
                    letterSpacing: "-0.03em",
                    textShadow: "0 6px 28px rgba(0,0,0,0.55)",
                    flexShrink: 0,
                    maxWidth: "44%",
                    textAlign: "right",
                    lineHeight: 1.05,
                    wordBreak: "break-word",
                  }}
                >
                  {phone}
                </div>
              ) : (
                <div style={{ width: 8, flexShrink: 0 }} aria-hidden />
              )}
            </div>

            <div
              style={{
                paddingTop: 12,
                paddingBottom: 12,
                textAlign: "center",
                color: brandSecondary,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                opacity: sublineOpacity,
              }}
            >
              {projectName}
            </div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
}
