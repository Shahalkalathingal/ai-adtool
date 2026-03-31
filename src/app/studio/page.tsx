/* Studio entry route — keeps the /studio URL while mounting the shared editor workspace. */
"use client";

import { useEffect } from "react";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export default function StudioEntryPage() {
  const resetForProject = useTimelineStore((s) => s.resetForProject);

  useEffect(() => {
    resetForProject("demo");
  }, [resetForProject]);

  return <EditorWorkspace projectId="demo" />;
}

