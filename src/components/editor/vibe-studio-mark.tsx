import { VIBE_STUDIO } from "@/lib/ui/vibe-studio-tokens";

/** Purple “V” mark + Studio wordmark — Vibe Studio header. */
export function VibeStudioMark({ className }: { className?: string }) {
  return (
    <div className={["inline-flex items-center gap-3", className].filter(Boolean).join(" ")}>
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg shadow-[0_4px_14px_rgba(124,58,237,0.42)]"
        style={{ backgroundColor: VIBE_STUDIO.logoMark }}
      >
        <span className="font-[var(--font-montserrat)] text-xl font-bold leading-none text-white">
          V
        </span>
      </div>
      <span className="text-lg font-bold tracking-tight text-white">Studio</span>
    </div>
  );
}
