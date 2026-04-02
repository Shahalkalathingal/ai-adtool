/**
 * Vibe Studio reference palette — tightened to match reference screenshots.
 * @see assets in repo for screenshots
 */
export const VIBE_STUDIO = {
  canvasBg: "#121212",
  panelBg: "#1e1e1e",
  navBg: "#121212",
  borderSubtle: "rgba(255,255,255,0.08)",
  /** Header “V” tile, nav strip, Generate, copy-link style actions */
  logoMark: "#7c3aed",
  /** Save and continue, download CTA (indigo) */
  saveCta: "#4f46e5",
  /** Slideshow row “Currently visible” + active thumb ring (reference blue) */
  slideshowActive: "#2563eb",
  /** Secondary label text */
  muted: "#9ca3af",
  /** Timeline / lane fills */
  bottomBanner: "#B00058",
  qr: "#004D40",
  music: "#003366",
  voice: "#4A148C",
  playhead: "#ef4444",
  /** Scene bottom banner: default phone number on video (readable on graded imagery) */
  sceneBannerPhone: "#ffffff",
  /** End card (bright field): default hero phone — dark for contrast */
  endCardPhone: "#0a0a0a",
} as const;
