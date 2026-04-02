"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Download, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportFilenameForBrand } from "@/lib/remotion/build-ad-studio-input-props";
import { useTimelineStore } from "@/lib/stores/timeline-store";
import { framesToSeconds } from "@/lib/types/timeline";
import { VIBE_STUDIO } from "@/lib/ui/vibe-studio-tokens";
import { resolveVideoDurationFrames } from "@/lib/voiceover/video-duration-policy";

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

type ExportStudioModalProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
};

export function ExportStudioModal({
  open,
  onClose,
  projectId,
}: ExportStudioModalProps) {
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
  const abortRef = useRef<AbortController | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  const filename = useMemo(() => exportFilenameForBrand(project), [project]);

  const shareUrl = useMemo(() => {
    if (!origin) return "";
    const id = projectId.trim();
    if (id && id !== "draft") return `${origin}/studio/${id}`;
    return `${origin}/studio`;
  }, [origin, projectId]);

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

    const metadata = project.metadata as Record<string, unknown>;
    const voiceoverDurationSec =
      typeof metadata.voiceoverDurationSec === "number"
        ? metadata.voiceoverDurationSec
        : null;
    const computedDurationInFrames = resolveVideoDurationFrames({
      fps,
      voiceoverDurationSec,
      fallbackDurationSec: framesToSeconds(durationInFrames, fps),
    });

    try {
      const res = await fetch("/api/export-ad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ac.signal,
        body: JSON.stringify({
          origin,
          durationInFrames: computedDurationInFrames,
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
        (phaseName, progress, subtitle) => {
          setProgress01(Math.min(1, Math.max(0, progress)));
          setStatusPhase(
            subtitle ? `${phaseName} — ${subtitle}` : phaseName,
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
    fps,
    origin,
    project,
    tracks,
    clipsById,
    durationInFrames,
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

  const onCopyShareLink = async () => {
    const url = shareUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const closeModal = () => {
    abortRef.current?.abort();
    onClose();
  };

  if (!open) return null;

  const primaryIndigoBtn =
    "h-12 w-full rounded-lg border-0 text-sm font-semibold text-white shadow-[0_12px_36px_rgba(79,70,229,0.38)] hover:opacity-[0.96]";
  const accentVioletBtn =
    "h-12 w-full rounded-lg border-0 text-sm font-semibold text-white shadow-[0_12px_36px_rgba(124,58,237,0.4)] hover:opacity-[0.96]";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-studio-title"
    >
      <motion.div
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="presentation"
        onClick={closeModal}
      />

      <motion.div
        className="relative z-10 w-full max-w-lg rounded-xl border p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:p-10"
        style={{
          backgroundColor: VIBE_STUDIO.canvasBg,
          borderColor: VIBE_STUDIO.borderSubtle,
        }}
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-4 top-4 rounded-md p-1.5 text-[#b3b3b3] transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Close"
          onClick={closeModal}
        >
          <X className="size-5" strokeWidth={1.5} />
        </button>

        <p id="export-studio-title" className="sr-only">
          {phase === "processing"
            ? "Your video is being prepared"
            : phase === "delivery"
              ? "Your video is ready"
              : "Export error"}
        </p>
        <span className="sr-only" aria-live="polite">
          {phase === "processing"
            ? `${statusPhase || "Preparing video"} ${Math.round(progress01 * 100)}%`
            : ""}
        </span>

        <AnimatePresence mode="wait">
          {phase === "processing" ? (
            <motion.div
              key="proc"
              className="flex flex-col items-center gap-6 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="mx-auto size-14 shrink-0 rounded-full border-2 border-white/20 border-t-white animate-spin"
                role="status"
                aria-label="Preparing video"
              />
              <h2 className="text-center text-lg font-bold leading-snug tracking-tight text-white md:text-xl">
                Your video is being prepared! While you wait, share it with your
                team or on social media using this link.
              </h2>
              <p className="max-w-md text-center text-sm leading-relaxed text-[#b3b3b3]">
                Share your video to gather feedback, refine it with valuable
                external perspectives, and attract potential new customers.
              </p>
              <Button
                type="button"
                className={accentVioletBtn}
                style={{ backgroundColor: VIBE_STUDIO.logoMark }}
                onClick={() => void onCopyShareLink()}
              >
                Copy sharing link
              </Button>
            </motion.div>
          ) : null}

          {phase === "delivery" ? (
            <motion.div
              key="del"
              className="flex flex-col items-center gap-6 pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="flex size-16 items-center justify-center rounded-full border-2 border-white"
                aria-hidden
              >
                <Check className="size-8 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-center text-xl font-bold tracking-tight text-white">
                Your video is ready
              </h2>
              <p className="max-w-md text-center text-sm leading-relaxed text-[#b3b3b3]">
                Download your video and upload it on the platform to kickstart
                your campaign
              </p>
              <Button
                type="button"
                className={`${primaryIndigoBtn} flex items-center justify-center gap-2`}
                style={{ backgroundColor: VIBE_STUDIO.saveCta }}
                onClick={onDownload}
              >
                <span>Download video</span>
                <Download className="size-5 shrink-0" aria-hidden />
              </Button>
              <p className="max-w-sm text-center text-[10px] text-[#b3b3b3]/80">
                {filename}
              </p>
            </motion.div>
          ) : null}

          {phase === "error" ? (
            <motion.div
              key="err"
              className="space-y-6 pt-2 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm font-medium text-red-300/95">
                {errorMessage ?? "Export failed."}
              </p>
              <p className="text-xs leading-relaxed text-[#b3b3b3]">
                Export uses{" "}
                <a
                  className="text-white underline underline-offset-2 hover:text-white/80"
                  href="https://www.remotion.dev/docs/vercel-sandbox"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Remotion + Vercel Sandbox
                </a>
                . You need{" "}
                <span className="font-mono text-white/80">
                  BLOB_READ_WRITE_TOKEN
                </span>{" "}
                for Blob, and for{" "}
                <strong className="text-white/90">local dev</strong> also{" "}
                <span className="font-mono text-white/80">
                  VERCEL_OIDC_TOKEN
                </span>{" "}
                from{" "}
                <span className="font-mono text-white/80">
                  npx vercel link
                </span>{" "}
                +{" "}
                <span className="font-mono text-white/80">
                  npx vercel env pull
                </span>
                . On Vercel, use{" "}
                <span className="font-mono text-white/80">
                  {`npm run vercel:remotion-snapshot && npm run build`}
                </span>
                . See <span className="font-mono text-white/80">.env.example</span>.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  className="rounded-lg text-white"
                  style={{ backgroundColor: VIBE_STUDIO.logoMark }}
                  onClick={() => void runExport()}
                >
                  Retry
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg border-white/15 bg-transparent text-white hover:bg-white/[0.06]"
                  onClick={closeModal}
                >
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
