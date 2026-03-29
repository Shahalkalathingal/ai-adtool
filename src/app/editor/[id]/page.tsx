"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { useTimelineStore } from "@/lib/stores/timeline-store";

export default function EditorPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "draft";
  const resetForProject = useTimelineStore((s) => s.resetForProject);

  useEffect(() => {
    resetForProject(id);
  }, [id, resetForProject]);

  return <EditorWorkspace projectId={id} />;
}
