import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  getMusicClipAtSecond,
  getTextClipAtSecond,
  getVisualClipAtSecond,
  headlineFromRemotionClip,
  type RemotionClipInput,
  type RemotionTrackInput,
} from "@/remotion/lib/active-clip";

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
  };
  voiceoverSrc: string | null;
};

const PLACEHOLDER_STILL =
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1280&h=720&fit=crop&q=80";

const ACCENT = "#00aedf";
const HEADLINE_FONT =
  'var(--font-montserrat, "Montserrat"), system-ui, sans-serif';

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
    <img src={url} alt="" style={style} onError={() => setBad(true)} />
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

function QrCorner({
  value,
  visible,
}: {
  value: string;
  visible: boolean;
}) {
  if (!visible || !value.trim()) return null;
  return (
    <div
      style={{
        background: "white",
        padding: 6,
        borderRadius: 8,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      <QRCodeSVG value={value.trim()} size={72} level="M" marginSize={0} />
    </div>
  );
}

type HeadlineLayerProps = {
  headline: string;
  textClip: RemotionClipInput | null;
  relFrame: number;
  fps: number;
  accentColor: string;
};

function HeadlineLayer({
  headline,
  textClip,
  relFrame,
  fps,
  accentColor,
}: HeadlineLayerProps) {
  const animIn = textClip?.animationIn as {
    preset?: string;
    durationSec?: number;
    direction?: string;
  } | null;
  const preset = animIn?.preset ?? "fade";
  const durSec =
    typeof animIn?.durationSec === "number" ? animIn.durationSec : 0.45;
  const inF = Math.max(2, Math.round(durSec * fps));
  const tp = (textClip?.transformProps ?? {}) as {
    opacity?: number;
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
  };
  const baseOp = tp.opacity ?? 1;

  let opacity = baseOp;
  let translateY = 0;
  let scale = tp.scaleX ?? 1;
  let text = headline;

  if (preset === "none") {
    opacity = baseOp;
  } else if (preset === "fade") {
    opacity =
      interpolate(relFrame, [0, inF], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }) * baseOp;
  } else if (preset === "slide") {
    const dir = animIn?.direction === "down" ? 1 : -1;
    opacity =
      interpolate(relFrame, [0, inF], [0, 1], {
        extrapolateRight: "clamp",
      }) * baseOp;
    translateY = interpolate(relFrame, [0, inF], [28 * dir, 0], {
      extrapolateRight: "clamp",
    });
  } else if (preset === "zoom") {
    opacity =
      interpolate(relFrame, [0, inF], [0, 1], {
        extrapolateRight: "clamp",
      }) * baseOp;
    scale = interpolate(relFrame, [0, inF], [0.92, 1], {
      extrapolateRight: "clamp",
    });
  } else if (preset === "typewriter") {
    opacity = baseOp;
    const n = headline.length;
    const twF = Math.max(1, Math.round(fps * 0.9));
    const chars = Math.max(
      0,
      Math.ceil(n * Math.min(1, relFrame / twF)),
    );
    text = headline.slice(0, chars);
  } else {
    opacity =
      interpolate(relFrame, [0, inF], [0, 1], {
        extrapolateRight: "clamp",
      }) * baseOp;
  }

  return (
    <div
      style={{
        opacity,
        transform: `translate(${(tp.x ?? 0)}px, ${(tp.y ?? 0) + translateY}px) scale(${scale})`,
      }}
    >
      <div
        style={{
          display: "inline-block",
          maxWidth: "min(88%, 920px)",
          padding: "12px 22px",
          borderRadius: 999,
          background: "rgba(6,6,8,0.55)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <span
          style={{
            color: accentColor,
            fontFamily: HEADLINE_FONT,
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: "-0.03em",
            textAlign: "center",
            display: "block",
            textShadow: "0 4px 24px rgba(0,0,0,0.75)",
          }}
        >
          {text}
        </span>
      </div>
    </div>
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
}: EndCardProps) {
  const displayPhone = phone.trim() || " ";
  const host = website.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        fontFamily: 'var(--font-montserrat, "Montserrat"), Inter, sans-serif',
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: 48,
        }}
      >
        <div
          style={{
            position: "relative",
            width: "min(92%, 640px)",
            background: "#ffffff",
            borderRadius: 20,
            padding: "36px 40px 40px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 20,
              right: 20,
            }}
          >
            {qrValue.trim() ? (
              <QRCodeSVG value={qrValue.trim()} size={88} level="M" />
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SafeBrandLogo src={logoUrl} origin={origin} letter={brandName} />
            </div>

            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: ACCENT,
                letterSpacing: "-0.02em",
                lineHeight: 1.05,
              }}
            >
              {displayPhone}
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "#111111",
              }}
            >
              {brandName}
            </div>

            {tagline.trim() ? (
              <div style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>
                {tagline}
              </div>
            ) : null}

            {address.trim() ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 14,
                  color: "#222",
                  maxWidth: 460,
                  lineHeight: 1.45,
                  textAlign: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ color: ACCENT, flexShrink: 0 }} aria-hidden>
                  📍
                </span>
                <span>{address}</span>
              </div>
            ) : null}

            {host ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  color: "#222",
                }}
              >
                <span style={{ color: ACCENT }} aria-hidden>
                  🔗
                </span>
                <span>{host}</span>
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
  qrValue,
  brandKit,
  voiceoverSrc,
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

  const qrData =
    (qrValue && qrValue.trim()) ||
    website.trim() ||
    metaString(metadata, "websiteUrl");

  const musicClip = getMusicClipAtSecond(t, timeline.tracks, timeline.clipsById);
  const musicSrc = musicClip?.assetUrl
    ? absUrl(origin, musicClip.assetUrl)
    : null;
  const musicGain =
    (musicClip?.audioProps as { gainDb?: number } | null)?.gainDb ?? -8;
  const musicVol = Math.pow(10, (musicGain + 18) / 40);

  if (isEndVisual(visual)) {
    return (
      <>
        {musicSrc ? (
          <Audio src={musicSrc} volume={Math.min(1, Math.max(0.05, musicVol))} />
        ) : null}
        {voiceoverSrc ? <Audio src={voiceoverSrc} volume={0.92} /> : null}
        <EndCard
          origin={origin}
          brandName={brandName}
          phone={endPhone}
          address={address}
          website={website}
          logoUrl={logoUrl}
          tagline={endTagline}
          qrValue={qrData}
        />
      </>
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

  const ken = interpolate(relFrame, [0, clipDurF], [1, 1.07], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const fadeIn = interpolate(
    relFrame,
    [0, Math.min(12, clipDurF / 3)],
    [0, 1],
    { extrapolateRight: "clamp" },
  );
  const fadeOut = interpolate(
    relFrame,
    [
      Math.max(0, clipDurF - Math.min(14, clipDurF / 3)),
      clipDurF,
    ],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const sceneOpacity =
    Math.min(fadeIn, fadeOut) *
    (visual?.assetUrl ? 1 : 0.85) *
    imgOpacityMul;

  const centerNudgeX = interpolate(
    relFrame,
    [0, clipDurF],
    [-12, 12],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  const panX = (vtp.x ?? 0) + centerNudgeX * 0.15;
  const panY = (vtp.y ?? 0) + centerNudgeX * 0.08;
  const userScale = vtp.scaleX ?? 1;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        fontFamily: HEADLINE_FONT,
        overflow: "hidden",
      }}
    >
      {musicSrc ? (
        <Audio src={musicSrc} volume={Math.min(1, Math.max(0.05, musicVol))} />
      ) : null}
      {voiceoverSrc ? <Audio src={voiceoverSrc} volume={0.92} /> : null}

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
              "linear-gradient(180deg, rgba(6,6,8,0.25) 0%, rgba(6,6,8,0.55) 55%, rgba(6,6,8,0.88) 100%)",
          }}
        />
      </AbsoluteFill>

      {headline ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: "18%",
            paddingLeft: 48,
            paddingRight: 48,
            pointerEvents: "none",
          }}
        >
          <HeadlineLayer
            headline={headline}
            textClip={textClip}
            relFrame={relFrame}
            fps={fps}
            accentColor={brandPrimary}
          />
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
        <QrCorner value={qrData} visible={showQrOverlay} />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "stretch",
          padding: "2.5% 3%",
          boxSizing: "border-box",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            width: "100%",
            maxWidth: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              maxWidth: "58%",
              padding: "14px 18px",
              borderRadius: 14,
              background: "rgba(12,12,14,0.55)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                background: "#0a0a0a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              <SafeBrandLogo
                src={logoUrl}
                origin={origin}
                letter={brandName}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#fafafa",
                  fontWeight: 700,
                  fontSize: 17,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.25,
                }}
              >
                {brandName}
              </div>
              {address ? (
                <div
                  style={{
                    color: "rgba(250,250,250,0.82)",
                    fontSize: 12,
                    marginTop: 6,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 6,
                    lineHeight: 1.35,
                  }}
                >
                  <span style={{ opacity: 0.9 }} aria-hidden>
                    📍
                  </span>
                  <span>{address}</span>
                </div>
              ) : null}
              {website ? (
                <div
                  style={{
                    color: "rgba(250,250,250,0.78)",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  🔗 {website.replace(/^https?:\/\//, "")}
                </div>
              ) : null}
            </div>
          </div>

          {phone ? (
            <div
              style={{
                color: "#fafafa",
                fontWeight: 800,
                fontSize: Math.min(28, 18 + (phone.length < 14 ? 8 : 0)),
                letterSpacing: "-0.03em",
                textShadow: "0 8px 32px rgba(0,0,0,0.55)",
                flexShrink: 0,
                maxWidth: "42%",
                textAlign: "right",
                lineHeight: 1.05,
                wordBreak: "break-word",
              }}
            >
              {phone}
            </div>
          ) : (
            <div style={{ width: 1, flexShrink: 0 }} aria-hidden />
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            textAlign: "center",
            color: brandSecondary,
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            opacity: 0.75,
          }}
        >
          {projectName}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
