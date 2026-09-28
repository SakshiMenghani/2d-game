import type { SongName } from '../audio/songs';

/** Look and sound of a world. Add a new entry to create a new world (e.g. crystal caves, candy clouds). */
export interface Theme {
  key: string;
  music: SongName;
  skyTop: number;
  skyBottom: number;
  sun: number;
  far: number;
  farRim: number;
  mid: number;
  midRim: number;
  trees: number[];
  trunk: number;
  motes: number[];
}

export const THEMES = {
  meadow: {
    key: 'meadow',
    music: 'meadow',
    skyTop: 0x62b8ff,
    skyBottom: 0xffd9f2,
    sun: 0xfff6d6,
    far: 0xa5a8f0,
    farRim: 0xdcdcff,
    mid: 0x7fd8a6,
    midRim: 0xc2f7d2,
    trees: [0x4fbf7f, 0xff9ec7, 0xffc75f, 0x7ad3ff],
    trunk: 0x9c6b4e,
    motes: [0xfff3b0, 0xffc6ff, 0xb5f5ff],
  },
} satisfies Record<string, Theme>;

export type ThemeKey = keyof typeof THEMES;
