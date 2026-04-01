/* Studio entry route — redirects to an isolated per-launch project path. */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  buildStudioEditorPath,
  makeProjectId,
} from "@/lib/stores/studio-entrance-store";

export default function StudioEntryPage() {
  const router = useRouter();

  useEffect(() => {
    const pid = makeProjectId();
    router.replace(buildStudioEditorPath(pid));
  }, [router]);

  return null;
}

