/* Studio entry route — redirects to an isolated per-launch project path. */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { buildStudioEditorPath } from "@/lib/stores/studio-entrance-store";

export default function StudioEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const pid = `prj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    router.replace(buildStudioEditorPath(pid));
  }, [router]);

  return null;
}

