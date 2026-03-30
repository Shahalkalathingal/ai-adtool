import { interpolate } from "remotion";
import type { RemotionClipInput } from "@/remotion/lib/active-clip";

export const HEADLINE_FONT =
  'var(--font-montserrat, "Montserrat"), system-ui, sans-serif';

export type HeadlineLayerProps = {
  headline: string;
  textClip: RemotionClipInput | null;
  relFrame: number;
  fps: number;
  accentColor: string;
};

/** Staggered spring-like scale: 0.8 → 1.1 → 1.0 for hero emphasis */
function cinematicHeadlineScale(relFrame: number, fps: number): number {
  const delay = Math.round(0.06 * fps);
  const d = Math.max(0, relFrame - delay);
  const rise = Math.max(5, Math.round(0.12 * fps));
  const settle = Math.max(6, Math.round(0.2 * fps));
  if (d <= rise) {
    return interpolate(d, [0, rise], [0.8, 1.1], { extrapolateRight: "clamp" });
  }
  return interpolate(d, [rise, rise + settle], [1.1, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

export function HeadlineLayer({
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

  const heroScale = cinematicHeadlineScale(relFrame, fps);

  let opacity = baseOp;
  let translateY = 0;
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
    translateY = interpolate(relFrame, [0, inF], [20 * dir, 0], {
      extrapolateRight: "clamp",
    });
  } else if (preset === "zoom") {
    opacity =
      interpolate(relFrame, [0, inF], [0, 1], {
        extrapolateRight: "clamp",
      }) * baseOp;
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
        transform: `translate(${(tp.x ?? 0)}px, ${(tp.y ?? 0) + translateY}px) scale(${heroScale})`,
        transformOrigin: "50% 50%",
      }}
    >
      <div
        style={{
          display: "inline-block",
          maxWidth: "min(88%, 920px)",
          padding: "14px 28px",
          borderRadius: 999,
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow:
            "0 14px 44px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
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
            textShadow: "0px 4px 15px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}
