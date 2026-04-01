import { create } from "zustand";

/** Cinematic landing → studio transition (“Ignition” → “Boot” → “Assemble”). */
export type StudioEntrancePhase =
  | "idle"
  | "ignition"
  | "boot"
  | "assembling"
  | "ready";

const IGNITION_MS = 480;
export const STUDIO_BOOT_MS = 2000;
export const STUDIO_ASSEMBLY_MS = 800;

type StudioEntranceState = {
  phase: StudioEntrancePhase;
  /** True while overlay is covering the app (user is in cinematic flow). */
  isInitializing: boolean;
  /** URL the user entered on the landing page (used to seed Director URL). */
  initialUrl: string;
  /** Per-launch project id so each session writes isolated media. */
  initialProjectId: string;
  beginEntrance: (url?: string, projectId?: string) => void;
  setPhase: (phase: StudioEntrancePhase) => void;
};

export const useStudioEntranceStore = create<StudioEntranceState>((set) => ({
  phase: "idle",
  isInitializing: false,
  initialUrl: "",
  initialProjectId: "",
  beginEntrance: (url, projectId) =>
    set({
      phase: "ignition",
      isInitializing: true,
      initialUrl: url?.trim() ?? "",
      initialProjectId: projectId?.trim() ?? "",
    }),
  setPhase: (phase) =>
    set({
      phase,
      isInitializing:
        phase !== "idle" && phase !== "ready",
    }),
}));

export const STUDIO_EDITOR_PATH = "/studio";
export function buildStudioEditorPath(projectId: string): string {
  const safe = projectId.replace(/[^a-zA-Z0-9_-]/g, "") || "demo";
  return `${STUDIO_EDITOR_PATH}/${safe}`;
}
export { IGNITION_MS };
