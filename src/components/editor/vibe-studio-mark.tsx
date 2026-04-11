/** Header wordmark — matches studio landing (Ai Ad Tool). */
export function AiAdToolMark({ className }: { className?: string }) {
  return (
    <div
      className={["inline-flex items-center gap-2.5", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-700 text-[11px] font-extrabold uppercase tracking-[0.06em] text-white shadow-[0_4px_24px_rgba(124,58,237,0.35)] ring-1 ring-inset ring-white/15"
      >
        Ai
      </span>
      <span className="font-[var(--font-montserrat)] text-[16px] font-bold leading-tight tracking-[-0.04em] text-white md:text-[17px]">
        <span className="bg-gradient-to-r from-white via-white to-violet-200/90 bg-clip-text text-transparent">
          Ai Ad Tool
        </span>
      </span>
    </div>
  );
}

/** @deprecated Use AiAdToolMark */
export const VibeStudioMark = AiAdToolMark;
