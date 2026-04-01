"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export default function StudioProjectPage() {
  const params = useParams();
  const resetForProject = useTimelineStore((s) => s.resetForProject);
  const projectId =
    typeof params.projectId === "string" && params.projectId.trim()
      ? params.projectId
      : "demo";

  useEffect(() => {
    resetForProject(projectId);
  }, [projectId, resetForProject]);

  return <EditorWorkspace projectId={projectId} />;
}

