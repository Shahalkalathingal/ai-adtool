"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download, DownloadCloud } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportFilenameForBrand } from "@/lib/remotion/build-ad-studio-input-props";
import { useTimelineStore } from "@/lib/stores/timeline-store";

type Phase = "processing" | "delivery" | "error";

type ExportSsePayload =
  | { type: "phase"; phase: string; progress: number; subtitle?: string }
  | { type: "done"; url: string; size: number }
  | { type: "error"; message: string };

async function consumeExportSse(
  res: Response,
  signal: AbortSignal,
  onPhase: (phase: string, progress: number, subtitle?: string) => void,
): Promise<{ url: string; size: number }> {
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("No response body from export.");
  }
  const decoder = new TextDecoder();
  let buf = "";
  let donePayload: { url: string; size: number } | null = null;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (signal.aborted) {
        await reader.cancel();
        throw new DOMException("Aborted", "AbortError");
      }
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      for (;;) {
        const sep = buf.indexOf("\n\n");
        if (sep < 0) break;
        const block = buf.slice(0, sep);
        buf = buf.slice(sep + 2);
        const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
        if (!dataLine) continue;
        const data = JSON.parse(dataLine.slice(6)) as ExportSsePayload;
        if (data.type === "phase") {
          onPhase(data.phase, data.progress, data.subtitle);
        } else if (data.type === "error") {
          throw new Error(data.message);
        } else if (data.type === "done") {
          donePayload = { url: data.url, size: data.size };
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }

  if (!donePayload) {
    throw new Error("Export ended without a video URL. Check server logs.");
  }
  return donePayload;
}

const STATUS_STEPS = [
  { until: 0.28, text: "🎬 Assembling Cinematic Transitions..." },
  { until: 0.52, text: "🎙️ Mastering Voiceover Frequencies..." },
  { until: 0.78, text: "✨ Applying Global Branding Layer..." },
  { until: 1.01, text: "📦 Compiling MP4 Enterprise Asset..." },
] as const;

function statusLabel(progress01: number): string {
  const p = Math.min(1, Math.max(0, progress01));
  for (const step of STATUS_STEPS) {
    if (p < step.until) return step.text;
  }
  return STATUS_STEPS[STATUS_STEPS.length - 1].text;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "").trim();
  if (h.length === 6) {
    const r = Number.parseInt(h.slice(0, 2), 16);
    const g = Number.parseInt(h.slice(2, 4), 16);
    const b = Number.parseInt(h.slice(4, 6), 16);
    if (!Number.isNaN(r + g + b)) return `rgba(${r},${g},${b},${alpha})`;
  }
  return `rgba(147, 51, 234, ${alpha})`;
}

function NeuralOrb() {
  return (
    <div className="relative mx-auto size-36 md:size-44">
      <motion.div
        className="absolute inset-0 rounded-full opacity-90"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(139,92,246,0.65), rgba(56,189,248,0.5), rgba(244,114,182,0.55), rgba(139,92,246,0.65))",
          filter: "blur(14px)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-[18%] rounded-full border border-white/25 bg-white/[0.07]"
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-dashed border-white/20"
        animate={{ rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />
      <div
        className="absolute inset-[28%] rounded-full bg-gradient-to-br from-white/25 to-transparent"
        style={{ boxShadow: "inset 0 0 40px rgba(255,255,255,0.12)" }}
      />
    </div>
  );
}

function ExportConfetti({ active }: { active: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 220,
        y: -40 - Math.random() * 80,
        rot: (Math.random() - 0.5) * 720,
        delay: Math.random() * 0.12,
        w: 6 + Math.random() * 8,
        h: 10 + Math.random() * 14,
        hue: [265, 200, 330, 145, 190][i % 5],
      })),
    [],
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-[42%] -translate-x-1/2 rounded-[2px] bg-white"
          style={{
            width: p.w,
            height: p.h,
            backgroundColor: `hsla(${p.hue}, 85%, 62%, 0.95)`,
            boxShadow: `0 0 12px hsla(${p.hue}, 90%, 55%, 0.7)`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: [1, 1, 0],
            rotate: p.rot,
            scale: [1, 1.15, 0.6],
          }}
          transition={{
            duration: 1.25,
            delay: p.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.14),transparent_58%)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.85, 0] }}
        transition={{ duration: 0.85, ease: "easeOut" }}
      />
    </div>
  );
}

type ExportStudioModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ExportStudioModal({ open, onClose }: ExportStudioModalProps) {
  const project = useTimelineStore((s) => s.project);
  const tracks = useTimelineStore((s) => s.tracks);
  const clipsById = useTimelineStore((s) => s.clipsById);
  const durationInFrames = useTimelineStore((s) => s.durationInFrames);
  const fps = useTimelineStore((s) => s.fps);
  const directorPlanApplied = useTimelineStore((s) => s.directorPlanApplied);

  const [phase, setPhase] = useState<Phase>("processing");
  const [progress01, setProgress01] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [statusPhase, setStatusPhase] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const brandPrimary = project.brandConfig.primaryColor || "#9333ea";
  const filename = useMemo(() => exportFilenameForBrand(project), [project]);
  const glowShadow = `0 0 20px ${hexToRgba(brandPrimary, 0.45)}, 0 0 42px ${hexToRgba(brandPrimary, 0.22)}`;

  const runExport = useCallback(async (): Promise<void> => {
    if (!directorPlanApplied || durationInFrames < 1) {
      toast.error("Generate your timeline before exporting.");
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setPhase("processing");
    setProgress01(0);
    setErrorMessage(null);
    setVideoBlob(null);
    setStatusPhase("");
    setCelebrate(false);

    try {
      const res = await fetch("/api/export-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          origin,
          durationInFrames,
          fps,
          project,
          tracks,
          clipsById,
        }),
      });

      if (ac.signal.aborted) return;

      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          errJson?.message ?? `Export failed (${res.status}).`,
        );
      }

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/event-stream")) {
        throw new Error("Unexpected response from export API.");
      }

      const { url } = await consumeExportSse(
        res,
        ac.signal,
        (phase, progress, subtitle) => {
          setProgress01(Math.min(1, Math.max(0, progress)));
          setStatusPhase(
            subtitle ? `${phase} — ${subtitle}` : phase,
          );
        },
      );

      if (ac.signal.aborted) return;

      const videoRes = await fetch(url, { signal: ac.signal });
      if (!videoRes.ok) {
        throw new Error("Could not download rendered video from storage.");
      }
      const blob = await videoRes.blob();

      setVideoBlob(blob);
      setProgress01(1);
      setPhase("delivery");
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 1400);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      const msg =
        e instanceof Error
          ? e.message
          : "Export failed.";
      setErrorMessage(msg);
      setPhase("error");
      toast.error("Could not export MP4 (Vercel Sandbox).");
    }
  }, [
    directorPlanApplied,
    durationInFrames,
    fps,
    origin,
    project,
    tracks,
    clipsById,
  ]);

  const runExportRef = useRef(runExport);
  runExportRef.current = runExport;

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      return;
    }
    void runExportRef.current();
    return () => {
      abortRef.current?.abort();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPhase("processing");
      setProgress01(0);
      setErrorMessage(null);
      setVideoBlob(null);
      setStatusPhase("");
      setCelebrate(false);
    }
  }, [open]);

  const onDownload = () => {
    if (!videoBlob) return;
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast.success("Download started");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-studio-title"
    >
      <motion.div
        className="absolute inset-0 bg-black/90 backdrop-blur-3xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="presentation"
        onClick={() => {
          abortRef.current?.abort();
          onClose();
        }}
      />

      <motion.div
        className="relative z-10 w-[60%] min-w-[min(100%,20rem)] max-w-[60rem] rounded-2xl border border-white/10 bg-zinc-950/55 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.65)] backdrop-blur-2xl md:p-10"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
      >
        <ExportConfetti active={celebrate} />

        <h2
          id="export-studio-title"
          className="text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-white/50"
        >
          Neural processing
        </h2>

        <AnimatePresence mode="wait">
          {phase === "processing" ? (
            <motion.div
              key="proc"
              className="mt-8 flex flex-col items-center gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <NeuralOrb />

              <div className="w-full max-w-md space-y-3">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-[length:200%_100%]"
                    style={{
                      width: `${Math.round(progress01 * 100)}%`,
                      boxShadow: "0 0 24px rgba(167,139,250,0.45)",
                    }}
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      backgroundPosition: {
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "linear",
                      },
                    }}
                  />
                </div>
                <p className="min-h-[3.25rem] text-center text-sm font-medium leading-relaxed text-white/85">
                  {statusPhase || statusLabel(progress01)}
                </p>
                <p className="text-center font-mono text-xs tabular-nums text-white/40">
                  {Math.round(progress01 * 100)}%
                </p>
              </div>
            </motion.div>
          ) : null}

          {phase === "delivery" ? (
            <motion.div
              key="del"
              className="mt-8 flex flex-col items-center gap-8"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.04, 1],
                  filter: [
                    "drop-shadow(0 0 28px rgba(167,139,250,0.55))",
                    "drop-shadow(0 0 44px rgba(56,189,248,0.5))",
                    "drop-shadow(0 0 28px rgba(167,139,250,0.55))",
                  ],
                }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <DownloadCloud
                  className="size-24 text-white md:size-28"
                  strokeWidth={1.15}
                />
              </motion.div>

              <div className="flex w-full max-w-md flex-col gap-3">
                <Button
                  type="button"
                  size="lg"
                  className="h-14 w-full border-0 text-sm font-bold uppercase tracking-[0.14em] text-black shadow-lg md:text-base"
                  style={{
                    backgroundColor: brandPrimary,
                    boxShadow: glowShadow,
                  }}
                  onClick={onDownload}
                >
                  <Download className="mr-2 size-5" aria-hidden />
                  Download AD (MP4)
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 w-full border border-white/20 bg-white/[0.04] text-white/90 hover:bg-white/10"
                  onClick={onClose}
                >
                  Back to studio
                </Button>
              </div>
              <p className="max-w-sm text-center text-xs text-white/45">{filename}</p>
            </motion.div>
          ) : null}

          {phase === "error" ? (
            <motion.div
              key="err"
              className="mt-8 space-y-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm text-red-200/90">
                {errorMessage ?? "Export failed."}
              </p>
              <p className="text-xs leading-relaxed text-white/50">
                Export uses{" "}
                <a
                  className="text-violet-300 underline underline-offset-2 hover:text-violet-200"
                  href="https://www.remotion.dev/docs/vercel-sandbox"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Remotion + Vercel Sandbox
                </a>
                . Set{" "}
                <span className="font-mono text-white/70">BLOB_READ_WRITE_TOKEN</span>
                , and on Vercel run{" "}
                <span className="font-mono text-white/70">
                  {`npm run vercel:remotion-snapshot && npm run build`}
                </span>
                . See <span className="font-mono text-white/70">.env.example</span>.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button type="button" onClick={() => void runExport()}>
                  Retry
                </Button>
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
