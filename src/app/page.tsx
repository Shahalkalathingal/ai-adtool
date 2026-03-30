"use client";

import { motion } from "framer-motion";
import {
  Clapperboard,
  ScanSearch,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [cursor, setCursor] = useState({ x: 50, y: 20 });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    const onMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setCursor({ x, y });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  const spotlightStyle = useMemo(
    () => ({
      background: `radial-gradient(480px at ${cursor.x}% ${cursor.y}%, rgba(255,255,255,0.12), transparent 60%)`,
    }),
    [cursor],
  );

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="pointer-events-none fixed inset-0" style={spotlightStyle} />

      <header className="sticky top-0 z-40 flex justify-center px-4 py-4">
        <motion.div
          initial={false}
          animate={{
            backdropFilter: scrolled ? "blur(14px)" : "blur(0px)",
            backgroundColor: scrolled
              ? "rgba(24,24,27,0.62)"
              : "rgba(24,24,27,0.0)",
            borderColor: scrolled
              ? "rgba(255,255,255,0.14)"
              : "rgba(255,255,255,0.0)",
          }}
          className="flex w-full max-w-6xl items-center justify-between rounded-full border px-4 py-2.5"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
            <Clapperboard className="size-4" />
            AI Ad Studio
          </div>
          <div className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
            demo by Shahal K
          </div>
        </motion.div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-16 pt-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-16 text-center backdrop-blur-xl md:px-16">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl text-balance bg-gradient-to-b from-zinc-100 to-zinc-500 bg-clip-text text-4xl font-semibold tracking-tight text-transparent md:text-6xl"
          >
            Transform URLs into Cinematic Ads
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-5 max-w-2xl text-balance text-base text-zinc-300 md:text-lg"
          >
            AI-driven scraping, frame-accurate control, and Meta-ready exports.
            All in one studio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-10 flex justify-center"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="group relative"
            >
              <motion.div
                className="absolute -inset-[2px] rounded-full bg-[conic-gradient(from_0deg,rgba(244,244,245,0.7),rgba(113,113,122,0.35),rgba(244,244,245,0.7))]"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 4.5,
                  ease: "linear",
                  repeat: Number.POSITIVE_INFINITY,
                }}
              />
              <motion.div
                className="absolute -inset-2 rounded-full bg-white/20 blur-xl"
                animate={{ opacity: [0.35, 0.6, 0.35] }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }}
              />
              <Link
                href="/studio"
                prefetch
                className="relative inline-flex items-center gap-2 rounded-full bg-zinc-100 px-8 py-3.5 text-base font-semibold text-zinc-950 shadow-2xl"
              >
                <Sparkles className="size-4" />
                Launch Studio
              </Link>
            </motion.div>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 32, rotateX: 14, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="perspective-[1400px]"
        >
          <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-2">
              <Image
                src="/landing/editor-preview.png"
                alt="AI Ad Studio Editor Preview"
                width={1400}
                height={840}
                className="h-auto w-full rounded-xl"
                priority
              />
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ScanSearch,
              title: "Smart Scraper",
              body: "One click to pull brand assets from any URL.",
            },
            {
              icon: WandSparkles,
              title: "Scene Director",
              body: "AI-sequenced storytelling with frame-accurate timing.",
            },
            {
              icon: Sparkles,
              title: "Meta-Ready Exports",
              body: "High-fidelity video with automated QR and Outros.",
            },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{
                  delay: 0.08 * (i + 1),
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
              >
                <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-zinc-900/70 p-2">
                  <Icon className="size-5 text-zinc-200" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-100">{card.title}</h3>
                <p className="mt-2 text-sm text-zinc-300">{card.body}</p>
              </motion.article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
