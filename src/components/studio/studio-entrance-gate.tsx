"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  IGNITION_MS,
  STUDIO_ASSEMBLY_MS,
  STUDIO_BOOT_MS,
  STUDIO_EDITOR_PATH,
  useStudioEntranceStore,
} from "@/lib/stores/studio-entrance-store";
import { playStudioLockInSfx } from "@/lib/ui/studio-entrance-sfx";

const BOOT_LINES = [
  "> INITIALIZING NEURAL ENGINE...",
  "> LOADING AD-STUDIO ASSETS...",
  "> CALIBRATING REMOTION TIMELINE...",
  "> ESTABLISHING SECURE CLOUD BRIDGE...",
] as const;

function AiCorePulse() {
  return (
    <div className="relative flex size-28 items-center justify-center">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-cyan-400/50 bg-cyan-400/5 shadow-[0_0_40px_rgba(34,211,238,0.25)]"
          style={{
            width: `${44 + i * 28}%`,
            height: `${44 + i * 28}%`,
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.15 + i * 0.12, 0.45 + i * 0.08, 0.15 + i * 0.12],
          }}
          transition={{
            duration: 1.6 + i * 0.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: i * 0.12,
          }}
        />
      ))}
      <motion.div
        className="relative z-10 size-5 rounded-full bg-gradient-to-br from-cyan-200 to-blue-500 shadow-[0_0_24px_rgba(34,211,238,0.9),0_0_60px_rgba(59,130,246,0.45)]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.85, 1, 0.85],
        }}
        transition={{
          duration: 0.9,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

export function StudioEntranceGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const phase = useStudioEntranceStore((s) => s.phase);
  const setPhase = useStudioEntranceStore((s) => s.setPhase);
  const navigatedRef = useRef(false);
  const lockSoundRef = useRef(false);

  useEffect(() => {
    if (phase !== "ignition") return;
    navigatedRef.current = false;
    const t = window.setTimeout(() => {
      setPhase("boot");
      if (!navigatedRef.current) {
        navigatedRef.current = true;
        router.push(STUDIO_EDITOR_PATH);
      }
    }, IGNITION_MS);
    return () => window.clearTimeout(t);
  }, [phase, router, setPhase]);

  useEffect(() => {
    if (phase !== "boot") return;
    const t = window.setTimeout(() => {
      setPhase("assembling");
    }, STUDIO_BOOT_MS);
    return () => window.clearTimeout(t);
  }, [phase, setPhase]);

  useEffect(() => {
    if (phase !== "assembling") return;
    lockSoundRef.current = false;
    const t = window.setTimeout(() => {
      if (!lockSoundRef.current) {
        lockSoundRef.current = true;
        playStudioLockInSfx();
      }
      setPhase("ready");
    }, STUDIO_ASSEMBLY_MS);
    return () => window.clearTimeout(t);
  }, [phase, setPhase]);

  const showOverlay = phase === "ignition" || phase === "boot" || phase === "assembling";
  const showBootUi = phase === "boot";

  return (
    <>
      {children}
      <AnimatePresence>
        {showOverlay ? (
          <motion.div
            key="studio-entrance-overlay"
            className={[
              "fixed inset-0 z-[100]",
              phase === "assembling" ? "pointer-events-none" : "pointer-events-auto",
            ].join(" ")}
            initial={{ opacity: 1 }}
            animate={{
              opacity: phase === "assembling" ? 0 : 1,
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: phase === "assembling" ? STUDIO_ASSEMBLY_MS / 1000 : 0.2,
              ease: phase === "assembling" ? "easeOut" : "linear",
            }}
          >
            {/* Flash bloom → black */}
            <AnimatePresence mode="sync">
              {phase === "ignition" ? (
                <motion.div
                  key="flash"
                  className="absolute inset-0 bg-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.88, 0] }}
                  transition={{
                    duration: 0.55,
                    times: [0, 0.12, 0.35, 1],
                    ease: "easeOut",
                  }}
                />
              ) : null}
            </AnimatePresence>

            <div className="absolute inset-0 bg-black">
              {/* Brand-tint wash after flash */}
              <motion.div
                className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(59,130,246,0.12),transparent_55%)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase === "ignition" ? 1 : 0.6 }}
                transition={{ duration: 0.4 }}
              />

              {(phase === "ignition" || phase === "boot") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <AiCorePulse />
                </div>
              )}

              {showBootUi ? (
                <>
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                    initial={{ top: "10%" }}
                    animate={{ top: ["10%", "88%", "10%"] }}
                    transition={{
                      duration: 2,
                      ease: "easeInOut",
                      times: [0, 0.5, 1],
                    }}
                  />
                  <div className="absolute bottom-[18%] left-0 right-0 flex flex-col items-center gap-2 px-6">
                    {BOOT_LINES.map((line, i) => (
                      <motion.p
                        key={line}
                        className="max-w-xl text-center text-[11px] font-medium tracking-[0.08em] text-zinc-300/90 md:text-xs"
                        style={{
                          fontFamily: "var(--font-studio-mono), var(--font-geist-mono), monospace",
                          opacity: 0.4,
                        }}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 0.4, x: 0 }}
                        transition={{
                          delay: 0.06 * i,
                          duration: 0.2,
                        }}
                      >
                        {line}
                      </motion.p>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
