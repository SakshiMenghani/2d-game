/**
 * Original chiptune-style loops. Each bar is 8 eighth-notes: a note name, '-' to hold the previous
 * note, or '.' for a rest. Drum patterns are 16 sixteenth-note steps ('x' = hit) repeated every bar.
 */
export interface SongDef {
  bpm: number;
  lead: string[];
  bass: string[];
  /** One chord per bar, played as soft off-beat stabs. */
  chords: string[];
  drums: { kick: string; snare: string; hat: string };
  leadVoice: 'pulse' | 'bell';
  volume: number;
}

export const SONGS = {
  meadow: {
    bpm: 128,
    leadVoice: 'pulse',
    volume: 1,
    lead: [
      'E5 G5 C6 G5 A5 G5 E5 .',
      'C5 E5 A5 G5 E5 - . .',
      'F5 A5 C6 A5 G5 F5 E5 D5',
      'D5 - G5 - B4 - . .',
      'E5 G5 C6 D6 E6 D6 C6 .',
      'B5 G5 E5 G5 B5 - . .',
      'A5 C6 A5 F5 G5 A5 G5 F5',
      'D5 E5 F5 D5 G5 - . .',
    ],
    bass: [
      'C3 . G3 . C3 . G3 E3',
      'A2 . E3 . A2 . E3 C3',
      'F2 . C3 . F2 . C3 A2',
      'G2 . D3 . G2 . B2 D3',
      'C3 . G3 . C3 . G3 E3',
      'E2 . B2 . E2 . B2 G2',
      'F2 . C3 . F2 . C3 A2',
      'G2 . D3 . G2 B2 D3 .',
    ],
    chords: ['C4 E4 G4', 'A3 C4 E4', 'F3 A3 C4', 'G3 B3 D4', 'C4 E4 G4', 'E3 G3 B3', 'F3 A3 C4', 'G3 B3 D4'],
    drums: {
      kick: 'x.......x.x.....',
      snare: '....x.......x...',
      hat: '..x...x...x...x.',
    },
  },
  menu: {
    bpm: 100,
    leadVoice: 'bell',
    volume: 0.9,
    lead: [
      'A4 - C5 - F5 - E5 C5',
      'D5 - - A4 F4 - . .',
      'D5 - F5 - Bb5 - A5 F5',
      'G5 - - - E5 - C5 .',
      'A4 C5 F5 A5 G5 - F5 .',
      'E5 F5 D5 - A4 - . .',
      'Bb4 D5 F5 - E5 D5 C5 -',
      'E5 - G5 - F5 - - .',
    ],
    bass: [
      'F2 . C3 . F2 . C3 .',
      'D2 . A2 . D2 . A2 .',
      'Bb1 . F2 . Bb1 . F2 .',
      'C2 . G2 . C2 . G2 .',
      'F2 . C3 . F2 . C3 .',
      'D2 . A2 . D2 . A2 .',
      'Bb1 . F2 . Bb1 . F2 .',
      'C2 . G2 . C2 E2 G2 .',
    ],
    chords: ['F3 A3 C4', 'D3 F3 A3', 'Bb2 D3 F3', 'C3 E3 G3', 'F3 A3 C4', 'D3 F3 A3', 'Bb2 D3 F3', 'C3 E3 G3'],
    drums: {
      kick: 'x.......x.......',
      snare: '................',
      hat: 'x...x...x...x...',
    },
  },
} satisfies Record<string, SongDef>;

export type SongName = keyof typeof SONGS;
