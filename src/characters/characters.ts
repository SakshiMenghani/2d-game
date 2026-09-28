export type EarStyle = 'long' | 'pointy' | 'round';
export type TailStyle = 'scarf' | 'cat' | 'cape';
export type PinStyle = 'star' | 'bell' | 'leaf';
export type Markings = 'none' | 'stripes' | 'muzzle';

export interface CharacterColors {
  body: number;
  bodyLight: number;
  bodyDark: number;
  belly: number;
  ear: number;
  earInner: number;
  accent: number;
  accentDark: number;
  iris: number;
  tip: number;
  portraitTop: number;
  portraitBottom: number;
}

export interface CharacterStats {
  /** Multiplier on run speed. */
  speed: number;
  /** Multiplier on jump strength. */
  jump: number;
  hearts: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  description: string;
  /** Gems needed to unlock. 0 = free. */
  cost: number;
  ears: EarStyle;
  tail: TailStyle;
  pin: PinStyle;
  markings: Markings;
  colors: CharacterColors;
  stats: CharacterStats;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'lumi',
    name: 'Lumi',
    title: 'Star Sprite',
    description: 'A cheerful star-sprite whose glowing ears light the way. A great all-rounder!',
    cost: 0,
    ears: 'long',
    tail: 'scarf',
    pin: 'star',
    markings: 'none',
    colors: {
      body: 0x4fd1c5,
      bodyLight: 0xb4f7ee,
      bodyDark: 0x1f9489,
      belly: 0xe2fffa,
      ear: 0x45c4b8,
      earInner: 0xbdf6ee,
      accent: 0xff6b81,
      accentDark: 0xd63a57,
      iris: 0x3f63d8,
      tip: 0xffd84a,
      portraitTop: 0x6fd0ff,
      portraitBottom: 0xd4fbf3,
    },
    stats: { speed: 1, jump: 1, hearts: 3 },
  },
  {
    id: 'nova',
    name: 'Nova',
    title: 'Space Kitten',
    description: 'A curious kitten from the Moon Gardens with a comet tail. Jumps extra high!',
    cost: 120,
    ears: 'pointy',
    tail: 'cat',
    pin: 'bell',
    markings: 'stripes',
    colors: {
      body: 0xa78bfa,
      bodyLight: 0xe6dcff,
      bodyDark: 0x6a4bd6,
      belly: 0xf6f1ff,
      ear: 0x9a7cf2,
      earInner: 0xffa8d2,
      accent: 0x38d6ff,
      accentDark: 0x178fc4,
      iris: 0x22b866,
      tip: 0x7ff0ff,
      portraitTop: 0x3b2a8f,
      portraitBottom: 0xb9a3ff,
    },
    stats: { speed: 0.95, jump: 1.12, hearts: 3 },
  },
  {
    id: 'bo',
    name: 'Bo',
    title: 'Honey Bear',
    description: 'A brave little bear cub with a leafy cape. Tough and speedy, with an extra heart!',
    cost: 250,
    ears: 'round',
    tail: 'cape',
    pin: 'leaf',
    markings: 'muzzle',
    colors: {
      body: 0xffa94d,
      bodyLight: 0xffe0ad,
      bodyDark: 0xcf6a17,
      belly: 0xfff3dc,
      ear: 0xf59a3c,
      earInner: 0xffd9b0,
      accent: 0x5fd068,
      accentDark: 0x2c9444,
      iris: 0x8a4f22,
      tip: 0x5fd068,
      portraitTop: 0xffc54d,
      portraitBottom: 0xfff4cc,
    },
    stats: { speed: 1.08, jump: 0.96, hearts: 4 },
  },
];

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
