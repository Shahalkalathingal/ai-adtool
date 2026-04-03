import type { ReactNode } from "react";

/** Passthrough — small-screen gate lives under `studio/[projectId]/layout.tsx`. */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return children;
}
