"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { EditorWorkspace } from "@/components/editor/editor-workspace";
import { makeProjectId } from "@/lib/stores/studio-entrance-store";
import { useStudioEntranceStore } from "@/lib/stores/studio-entrance-store";
import { StudioScrapeScreen } from "@/components/studio/studio-scrape-screen";
import { useTimelineStore } from "@/lib/stores/timeline-store";

/** Max wait if generation never toggles busy (edge cases); normal success hides overlay via directorPlanApplied. */
const SCRAPE_OVERLAY_FALLBACK_MS = 90_000;

export default function StudioProjectPage() {
  const params = useParams();
  const resetForProject = useTimelineStore((s) => s.resetForProject);
  const directorPlanApplied = useTimelineStore((s) => s.directorPlanApplied);
  const directorGenerationBusy = useTimelineStore(
    (s) => s.directorGenerationBusy,
  );
  const seededUrl = useStudioEntranceStore((s) => s.initialUrl);

  const [scrapeDismissed, setScrapeDismissed] = useState(false);
  const wasGenerationBusyRef = useRef(false);

  const projectId =
    typeof params.projectId === "string" && params.projectId.trim()
      ? params.projectId
      : makeProjectId();

  useEffect(() => {
    resetForProject(projectId);
  }, [projectId, resetForProject]);

  useEffect(() => {
    setScrapeDismissed(false);
    wasGenerationBusyRef.current = false;
  }, [projectId]);

  const hasSeededLaunch = Boolean(seededUrl?.trim());

  useEffect(() => {
    if (directorGenerationBusy) wasGenerationBusyRef.current = true;
  }, [directorGenerationBusy]);

  useEffect(() => {
    if (!hasSeededLaunch) return;
    if (directorPlanApplied) return;
    if (!wasGenerationBusyRef.current) return;
    if (directorGenerationBusy) return;
    setScrapeDismissed(true);
  }, [directorGenerationBusy, directorPlanApplied, hasSeededLaunch]);

  useEffect(() => {
    if (!hasSeededLaunch) return;
    const t = window.setTimeout(
      () => setScrapeDismissed(true),
      SCRAPE_OVERLAY_FALLBACK_MS,
    );
    return () => window.clearTimeout(t);
  }, [hasSeededLaunch, projectId]);

  const showScrapeOverlay =
    hasSeededLaunch && !directorPlanApplied && !scrapeDismissed;

  return (
    <>
      <EditorWorkspace projectId={projectId} />
      {showScrapeOverlay ? (
        <div
          className="fixed inset-0 z-[100] bg-black"
          aria-busy="true"
          aria-live="polite"
        >
          <StudioScrapeScreen />
        </div>
      ) : null}
    </>
  );
}
