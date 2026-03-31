import type { AdStudioExportInputProps } from "@/remotion/compositions/AdStudioComposition";

/** Bundle-time defaults; real values come from `inputProps` on each render. */
export const defaultAdStudioExportInputProps: AdStudioExportInputProps = {
  origin: "http://localhost:3000",
  timeline: { tracks: [], clipsById: {} },
  projectName: "Export",
  metadata: {},
  brandPrimary: "#9333ea",
  brandSecondary: "#0ea5e9",
  showQrOverlay: true,
  showFocusCardOverlay: false,
  qrValue: "",
  brandKit: {
    companyName: "",
    phone: "",
    address: "",
    website: "",
    logoUrl: "",
    endScreenTagline: "",
    endScreenPhone: "",
    tagline: "",
  },
  voiceoverSrc: null,
  voiceoverRate: 1,
  __compositionDurationInFrames: 300,
  __compositionFps: 30,
};
