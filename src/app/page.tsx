"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Clapperboard,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  STUDIO_EDITOR_PATH,
  buildStudioEditorPath,
  makeProjectId,
  useStudioEntranceStore,
} from "@/lib/stores/studio-entrance-store";

const TICKER_ITEMS = [
  "REAL ESTATE",
  "LUXURY AUTO",
  "SAAS",
  "LEGAL",
  "HEALTHCARE",
  "DTC",
  "HOSPITALITY",
];

const PINGS = [
  "> PINGING TOKYO NODES...",
  "> LOCATING BRAND ASSETS...",
  "> MAPPING GEO CONVERSION CLUSTERS...",
  "> PREPARING SCENE INFERENCE GRID...",
  "> CALIBRATING VIDEO RENDER PIPELINE...",
];

function DarkMatterField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let running = true;

    const particles = Array.from({ length: 72 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.00018,
      vy: (Math.random() - 0.5) * 0.00014,
      r: 0.6 + Math.random() * 1.8,
      a: 0.18 + Math.random() * 0.5,
    }));

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (t: number) => {
      if (!running) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const waveA = 16 * Math.sin(t * 0.00025);
      const waveB = 11 * Math.cos(t * 0.0002);

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "rgba(24,24,27,0.55)");
      grad.addColorStop(0.5, "rgba(13,16,24,0.25)");
      grad.addColorStop(1, "rgba(24,24,27,0.62)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 1) p.vx *= -1;
        if (p.y < 0 || p.y > 1) p.vy *= -1;
        const x = p.x * w + waveA * Math.sin((p.y * h + t * 0.04) * 0.01);
        const y = p.y * h + waveB * Math.cos((p.x * w + t * 0.03) * 0.01);
        ctx.beginPath();
        ctx.arc(x, y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(170,190,255,${p.a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 opacity-70" />;
}

export default function Home() {
  const router = useRouter();
  const beginEntrance = useStudioEntranceStore((s) => s.beginEntrance);
  const [url, setUrl] = useState("");
  const [hoverLaunch, setHoverLaunch] = useState(false);
  const [launchZoom, setLaunchZoom] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [pingIndex, setPingIndex] = useState(0);
  const magneticRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setCursor({ x: e.clientX, y: e.clientY });
      const btn = magneticRef.current;
      if (!btn || launchZoom) return;
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const threshold = 180;
      if (dist > threshold) {
        btn.style.transform = "translate3d(0px,0px,0px)";
        return;
      }
      const force = (1 - dist / threshold) * 18;
      btn.style.transform = `translate3d(${(dx / threshold) * force}px, ${(dy / threshold) * force}px, 0px)`;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
    };
  }, [launchZoom]);

  useEffect(() => {
    void router.prefetch(STUDIO_EDITOR_PATH);
  }, [router]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPingIndex((v) => (v + 1) % PINGS.length);
    }, 1100);
    return () => clearInterval(id);
  }, []);

  const spotlightStyle = useMemo(
    () => ({
      background: `radial-gradient(420px at ${cursor.x}px ${cursor.y}px, rgba(109,170,255,0.15), transparent 68%)`,
    }),
    [cursor],
  );
  const showNeuralScan = hoverLaunch || url.trim().length > 0;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-zinc-950 text-zinc-100">
      <DarkMatterField />
      <div className="pointer-events-none fixed inset-0 z-10 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="pointer-events-none fixed inset-0 z-10" style={spotlightStyle} />
      <div className="pointer-events-none fixed inset-0 z-10 bg-[radial-gradient(circle_at_50%_20%,rgba(59,130,246,0.16),transparent_45%)]" />

      {showNeuralScan ? (
        <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden">
          <motion.div
            className="absolute inset-0 opacity-20 [background-image:repeating-linear-gradient(180deg,rgba(173,216,255,0.35)_0px,rgba(173,216,255,0.35)_1px,transparent_1px,transparent_6px)]"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          />
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-[1px] w-full bg-cyan-200/35"
              style={{ top: `${(i + 1) * 7}%` }}
              animate={{ opacity: [0, 0.85, 0], x: [-24, 24, -24] }}
              transition={{ duration: 1.2 + i * 0.06, repeat: Number.POSITIVE_INFINITY, delay: i * 0.04 }}
            />
          ))}
        </div>
      ) : null}

      <motion.div
        className="relative z-30"
        animate={
          launchZoom
            ? { scale: 1.14, y: -80, opacity: 0, filter: "blur(6px)" }
            : { scale: 1, y: 0, opacity: 1, filter: "blur(0px)" }
        }
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="flex justify-center px-4 py-4">
          <div className="flex w-full max-w-6xl items-center justify-between rounded-full border border-white/15 bg-zinc-900/50 px-4 py-2.5 backdrop-blur-2xl">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
              <Clapperboard className="size-4" />
              AI Ad Studio
            </div>
            <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
              [DEV: SHAHAL_K]
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 pb-16 pt-6">
          <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.03] px-8 py-14 backdrop-blur-xl md:px-12">
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-5xl text-center text-balance font-[var(--font-montserrat)] text-4xl font-extrabold tracking-tight text-white md:text-6xl"
            >
              Enterprise Ad Intelligence
              <span className="block bg-gradient-to-r from-zinc-100 via-cyan-200 to-zinc-400 bg-clip-text text-transparent">
                In The First Frame
              </span>
            </motion.h1>
            <p className="mx-auto mt-5 max-w-3xl text-center text-base text-zinc-300 md:text-lg">
              Deploy premium campaign videos from a single URL with cinematic motion, neural sequencing, and social-first export quality.
            </p>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-[1.6fr_1fr]">
              <div className="relative rounded-2xl border border-cyan-200/20 bg-zinc-900/45 p-3 backdrop-blur-3xl">
                <motion.div
                  className="pointer-events-none absolute -inset-[1px] rounded-2xl"
                  animate={{ opacity: [0.45, 0.95, 0.45] }}
                  transition={{ duration: 2.1, repeat: Number.POSITIVE_INFINITY }}
                  style={{
                    boxShadow: "0 0 0 1px rgba(143,238,255,0.35), 0 0 40px rgba(56,189,248,0.28)",
                  }}
                />
                <div className="flex items-center gap-2 rounded-xl bg-black/20 px-2.5 py-2">
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-brand-site.com"
                    className="w-full bg-transparent px-1 text-sm text-zinc-100 outline-none placeholder:text-zinc-400"
                  />
                  <button
                    ref={magneticRef}
                    type="button"
                    onMouseEnter={() => setHoverLaunch(true)}
                    onMouseLeave={() => setHoverLaunch(false)}
                    onClick={() => {
                      setLaunchZoom(true);
                      const trimmed = url.trim();
                      const projectId = makeProjectId();
                      void router.prefetch(buildStudioEditorPath(projectId));
                      setTimeout(
                        () => beginEntrance(trimmed || "https://", projectId),
                        520,
                      );
                    }}
                    className="relative inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan-200 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-[0_8px_30px_rgba(34,211,238,0.45)] transition-transform duration-150"
                  >
                    Launch
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-white/15 bg-black/45 p-3 font-mono text-[11px] leading-5 text-zinc-300 backdrop-blur-2xl">
                <p className="mb-2 flex items-center gap-2 text-zinc-100">
                  <ShieldCheck className="size-3.5 text-emerald-300" />
                  LIVE GLOBAL PINGS
                </p>
                <div className="space-y-1.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <motion.p
                      key={i}
                      animate={{ opacity: i === 0 ? [0.55, 1, 0.55] : [0.35, 0.75, 0.35] }}
                      transition={{ duration: 1.4 + i * 0.18, repeat: Number.POSITIVE_INFINITY }}
                    >
                      {PINGS[(pingIndex + i) % PINGS.length]}
                    </motion.p>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </motion.div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-black/40 py-2 backdrop-blur-md">
        <div className="relative overflow-hidden">
          <motion.div
            className="flex gap-10 whitespace-nowrap px-4 text-[11px] font-semibold tracking-[0.18em] text-zinc-300/65"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 24, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          >
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
              <span key={`${item}-${i}`}>
                {item} · OPTIMIZED FOR HIGH-CONVERSION AD ARCHITECTURES
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
