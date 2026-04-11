import type { ReactNode } from "react";

/**
 * Editor route only — timeline/preview need a minimum viewport. `/studio` landing stays mobile-friendly.
 * CSS breakpoint (Tailwind lg) avoids hydration mismatch.
 */
export default function StudioProjectLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-black">
      <div
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black px-6 lg:hidden"
        role="alert"
        aria-live="polite"
      >
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/90">
          Ai Ad Tool
        </p>
        <h1 className="mt-5 max-w-[320px] text-center font-[var(--font-montserrat)] text-[26px] font-bold leading-snug tracking-[-0.02em] text-white">
          You need a bigger screen to use the editor
        </h1>
        <p className="mt-4 max-w-[340px] text-center text-[14px] leading-relaxed text-white/65">
          Switch to a computer or a large tablet (landscape). The editor doesn&apos;t
          work on small screens.
        </p>
      </div>
      <div className="max-lg:pointer-events-none max-lg:select-none lg:pointer-events-auto min-h-dvh">
        {children}
      </div>
    </div>
  );
}
