/** Plain shapes for Remotion (no Prisma imports). */

export type RemotionTrackInput = {
  index: number;
  metadata?: Record<string, unknown>;
  clipIds: string[];
};

export type RemotionClipInput = {
  startTime: number;
  duration: number;
  mediaType: string;
  assetUrl: string | null;
  content: Record<string, unknown> | null;
  label?: string | null;
  transformProps?: Record<string, unknown>;
  animationIn?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  audioProps?: Record<string, unknown> | null;
};

function laneOf(track: RemotionTrackInput): string {
  const m = track.metadata;
  return typeof m?.lane === "string" ? m.lane : "";
}

export function getVisualClipAtSecond(
  t: number,
  tracks: RemotionTrackInput[],
  clipsById: Record<string, RemotionClipInput>,
): RemotionClipInput | null {
  const ordered = [...tracks].sort((a, b) => a.index - b.index);
  for (const tr of ordered) {
    if (laneOf(tr) !== "visual") continue;
    for (const cid of tr.clipIds) {
      const c = clipsById[cid];
      if (!c) continue;
      if (c.mediaType !== "VIDEO" && c.mediaType !== "IMAGE") continue;
      if (t >= c.startTime && t < c.startTime + c.duration) return c;
    }
  }
  return null;
}

export function getMusicClipAtSecond(
  t: number,
  tracks: RemotionTrackInput[],
  clipsById: Record<string, RemotionClipInput>,
): RemotionClipInput | null {
  const ordered = [...tracks].sort((a, b) => a.index - b.index);
  for (const tr of ordered) {
    if (laneOf(tr) !== "music") continue;
    for (const cid of tr.clipIds) {
      const c = clipsById[cid];
      if (!c) continue;
      if (c.mediaType !== "MUSIC") continue;
      if (t >= c.startTime && t < c.startTime + c.duration) return c;
    }
  }
  return null;
}

export function getVoiceoverClipAtSecond(
  t: number,
  tracks: RemotionTrackInput[],
  clipsById: Record<string, RemotionClipInput>,
): RemotionClipInput | null {
  const ordered = [...tracks].sort((a, b) => a.index - b.index);
  for (const tr of ordered) {
    if (laneOf(tr) !== "voice") continue;
    for (const cid of tr.clipIds) {
      const c = clipsById[cid];
      if (!c) continue;
      if (c.mediaType !== "VOICEOVER") continue;
      if (t >= c.startTime && t < c.startTime + c.duration) return c;
    }
  }
  return null;
}

export function getTextClipAtSecond(
  t: number,
  tracks: RemotionTrackInput[],
  clipsById: Record<string, RemotionClipInput>,
): RemotionClipInput | null {
  const ordered = [...tracks].sort((a, b) => a.index - b.index);
  for (const tr of ordered) {
    if (laneOf(tr) !== "text") continue;
    for (const cid of tr.clipIds) {
      const c = clipsById[cid];
      if (!c) continue;
      if (c.mediaType !== "TEXT") continue;
      if (t >= c.startTime && t < c.startTime + c.duration) return c;
    }
  }
  return null;
}

export function headlineFromRemotionClip(
  clip: RemotionClipInput | null,
): string {
  if (!clip?.content) return "";
  const c = clip.content;
  if (typeof c.text === "string") return c.text;
  if (typeof c.headline === "string") return c.headline;
  return typeof clip.label === "string" ? clip.label : "";
}
