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
  beginEntrance: (url?: string) => void;
  setPhase: (phase: StudioEntrancePhase) => void;
};

export const useStudioEntranceStore = create<StudioEntranceState>((set) => ({
  phase: "idle",
  isInitializing: false,
  initialUrl: "",
  beginEntrance: (url) =>
    set({
      phase: "ignition",
      isInitializing: true,
      initialUrl: url?.trim() ?? "",
    }),
  setPhase: (phase) =>
    set({
      phase,
      isInitializing:
        phase !== "idle" && phase !== "ready",
    }),
}));

export const STUDIO_EDITOR_PATH = "/studio";
export { IGNITION_MS };
