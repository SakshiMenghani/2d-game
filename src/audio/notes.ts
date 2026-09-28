const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#5" / "Bb3" → frequency in Hz. */
export function noteFreq(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new Error(`Bad note: ${name}`);
  const [, letter, accidental, octave] = match;
  const semis = SEMITONES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  const midi = (Number(octave) + 1) * 12 + semis;
  return 440 * 2 ** ((midi - 69) / 12);
}

export function transpose(freq: number, semitones: number): number {
  return freq * 2 ** (semitones / 12);
}
