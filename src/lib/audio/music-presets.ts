/** Background bed options — URLs must be CORS-friendly for Remotion preview. */
export type MusicPreset = {
  id: string;
  label: string;
  /** Absolute https URL or null for silence. */
  url: string | null;
  /** Default sidebar fader 0–100 when this preset is chosen (ad-friendly bed). */
  defaultVolumePct?: number;
};

export const MUSIC_PRESETS: MusicPreset[] = [
  { id: "none", label: "None (silent)", url: null, defaultVolumePct: 0 },
  {
    id: "acoustic-light",
    label: "Acoustic Light",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    defaultVolumePct: 58,
  },
  {
    id: "chill-soft",
    label: "Chill Soft",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    defaultVolumePct: 60,
  },
  {
    id: "afrobeat-smooth",
    label: "Afrobeat Smooth",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    defaultVolumePct: 58,
  },
  {
    id: "christmas-warm",
    label: "Christmas Warm",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    defaultVolumePct: 56,
  },
  {
    id: "corporate-clean",
    label: "Corporate Clean",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    defaultVolumePct: 62,
  },
  {
    id: "electro-soft",
    label: "Electro Soft",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    defaultVolumePct: 55,
  },
  {
    id: "latin-breeze",
    label: "Latin Breeze",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    defaultVolumePct: 58,
  },
  {
    id: "uplifting-pop",
    label: "Uplifting Pop",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    defaultVolumePct: 60,
  },
];

export function musicPresetById(id: string | undefined): MusicPreset | undefined {
  return MUSIC_PRESETS.find((p) => p.id === id);
}
