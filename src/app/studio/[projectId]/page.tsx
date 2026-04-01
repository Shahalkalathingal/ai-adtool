"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { makeProjectId } from "@/lib/stores/studio-entrance-store";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export default function StudioProjectPage() {
  const params = useParams();
  const resetForProject = useTimelineStore((s) => s.resetForProject);
  const projectId =
    typeof params.projectId === "string" && params.projectId.trim()
      ? params.projectId
      : makeProjectId();

  useEffect(() => {
    resetForProject(projectId);
  }, [projectId, resetForProject]);

  return <EditorWorkspace projectId={projectId} />;
}

