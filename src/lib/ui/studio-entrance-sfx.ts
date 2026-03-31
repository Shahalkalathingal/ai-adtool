"use client";

/** Subtle “system lock-in” when the studio UI finishes assembling (after cinematic entrance). */
export function playStudioLockInSfx(): void {
  if (typeof window === "undefined") return;
  const Ctx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;

  const ctx = new Ctx();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  master.connect(ctx.destination);

  // Low “power-up” hum
  const hum = ctx.createOscillator();
  hum.type = "sine";
  hum.frequency.setValueAtTime(72, now);
  hum.frequency.exponentialRampToValueAtTime(105, now + 0.35);
  hum.connect(master);
  hum.start(now);
  hum.stop(now + 0.38);

  // Short digital click / transient
  const clickOsc = ctx.createOscillator();
  clickOsc.type = "square";
  clickOsc.frequency.setValueAtTime(2200, now + 0.32);
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.0001, now + 0.32);
  clickGain.gain.exponentialRampToValueAtTime(0.035, now + 0.324);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
  clickOsc.connect(clickGain);
  clickGain.connect(master);
  clickOsc.start(now + 0.32);
  clickOsc.stop(now + 0.39);

  window.setTimeout(() => {
    void ctx.close();
  }, 520);
}
