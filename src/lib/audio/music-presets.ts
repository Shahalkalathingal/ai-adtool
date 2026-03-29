/** Background bed options — URLs must be CORS-friendly for Remotion preview. */
export type MusicPreset = {
  id: string;
  label: string;
  /** Absolute https URL or null for silence. */
  url: string | null;
};

export const MUSIC_PRESETS: MusicPreset[] = [
  { id: "none", label: "None (silent)", url: null },
  {
    id: "studio-demo",
    label: "Studio demo bed",
    url: "https://upload.wikimedia.org/wikipedia/commons/0/03/Blizzard_%28musical_sample%29.mp3",
  },
  {
    id: "pulse-ambient",
    label: "Soft pulse",
    url: "https://upload.wikimedia.org/wikipedia/commons/e/e8/Debussy_-_arabesque_1.mp3",
  },
];

export function musicPresetById(id: string | undefined): MusicPreset | undefined {
  return MUSIC_PRESETS.find((p) => p.id === id);
}
