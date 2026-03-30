"use client";

export function playSuccessChime(): void {
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
  master.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
  master.connect(ctx.destination);

  const o1 = ctx.createOscillator();
  o1.type = "sine";
  o1.frequency.setValueAtTime(740, now);
  o1.frequency.exponentialRampToValueAtTime(988, now + 0.22);
  o1.connect(master);
  o1.start(now);
  o1.stop(now + 0.24);

  const o2 = ctx.createOscillator();
  o2.type = "triangle";
  o2.frequency.setValueAtTime(1244, now + 0.08);
  o2.frequency.exponentialRampToValueAtTime(1480, now + 0.28);
  o2.connect(master);
  o2.start(now + 0.08);
  o2.stop(now + 0.3);

  window.setTimeout(() => {
    void ctx.close();
  }, 450);
}
