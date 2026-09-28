import { save } from '../state/SaveData';
import { noteFreq, transpose } from './notes';
import { SONGS, SongDef, SongName } from './songs';

type Wave = OscillatorType;

interface ToneOptions {
  freq: number;
  /** Glide to this frequency over the note. */
  to?: number;
  type?: Wave;
  dur: number;
  vol?: number;
  attack?: number;
  /** Seconds from now (ignored when `at` is set). */
  delay?: number;
  /** Absolute AudioContext time. */
  at?: number;
  vibrato?: { rate: number; depth: number };
  bus?: AudioNode;
}

interface NoiseOptions {
  dur: number;
  vol: number;
  filter: BiquadFilterType;
  freq: number;
  to?: number;
  q?: number;
  delay?: number;
  at?: number;
  bus?: AudioNode;
}

export type SfxName =
  | 'jump'
  | 'doubleJump'
  | 'land'
  | 'coin'
  | 'bigCoin'
  | 'gem'
  | 'star'
  | 'heart'
  | 'chest'
  | 'stomp'
  | 'hurt'
  | 'lose'
  | 'checkpoint'
  | 'portal'
  | 'fanfare'
  | 'gameOver'
  | 'click'
  | 'hover'
  | 'combo'
  | 'starSlam'
  | 'tick'
  | 'cashRegister'
  | 'unlock'
  | 'gift'
  | 'whoosh'
  | 'denied';

interface MusicEvent {
  voice: 'lead' | 'bass' | 'chord' | 'kick' | 'snare' | 'hat';
  freqs: number[];
  steps: number;
}

interface CompiledSong {
  def: SongDef;
  stepSeconds: number;
  totalSteps: number;
  events: MusicEvent[][];
}

const MIN_GAP_MS: Partial<Record<SfxName, number>> = { tick: 45, coin: 25, land: 80, hover: 60 };
const MUSIC_LEVEL = 0.42;
const SFX_LEVEL = 0.8;

function compile(def: SongDef): CompiledSong {
  const stepsPerBar = 16;
  const bars = def.lead.length;
  const events: MusicEvent[][] = Array.from({ length: bars * stepsPerBar }, () => []);

  const addLine = (voice: 'lead' | 'bass', lines: string[]) => {
    lines.forEach((line, bar) => {
      const tokens = line.trim().split(/\s+/);
      tokens.forEach((token, i) => {
        if (token === '-' || token === '.') return;
        let length = 1;
        while (tokens[i + length] === '-') length++;
        events[bar * stepsPerBar + i * 2].push({ voice, freqs: [noteFreq(token)], steps: length * 2 });
      });
    });
  };
  addLine('lead', def.lead);
  addLine('bass', def.bass);

  def.chords.forEach((chord, bar) => {
    const freqs = chord.split(/\s+/).map(noteFreq);
    for (const step of [2, 6, 10, 14]) events[bar * stepsPerBar + step].push({ voice: 'chord', freqs, steps: 1 });
  });

  for (let bar = 0; bar < bars; bar++) {
    for (let s = 0; s < stepsPerBar; s++) {
      const at = events[bar * stepsPerBar + s];
      if (def.drums.kick[s] === 'x') at.push({ voice: 'kick', freqs: [], steps: 1 });
      if (def.drums.snare[s] === 'x') at.push({ voice: 'snare', freqs: [], steps: 1 });
      if (def.drums.hat[s] === 'x') at.push({ voice: 'hat', freqs: [], steps: 1 });
    }
  }

  return { def, stepSeconds: 60 / def.bpm / 4, totalSteps: bars * stepsPerBar, events };
}

/**
 * Procedural sound: every effect and song is synthesized with the Web Audio API, so the game ships
 * without audio files. Browsers only allow audio after a user gesture, so the context unlocks on the
 * first key press / tap.
 */
class AudioEngine {
  private ctx?: AudioContext;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private noiseBuffer!: AudioBuffer;
  private readonly lastPlayed = new Map<SfxName, number>();
  private readonly songs = new Map<SongName, CompiledSong>();

  private song?: CompiledSong;
  private songName?: SongName;
  private step = 0;
  private nextStepTime = 0;
  private timer?: number;

  init(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 4;
    compressor.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 1.4;
    this.master.connect(compressor);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = save.sfxOn ? SFX_LEVEL : 0;
    this.sfxBus.connect(this.master);

    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 18000;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = save.musicOn ? MUSIC_LEVEL : 0;
    this.musicFilter.connect(this.musicBus);
    this.musicBus.connect(this.master);

    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const unlock = () => {
      void ctx.resume().then(() => {
        if (ctx.state !== 'running') return;
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      });
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void ctx.suspend();
      else void ctx.resume();
    });
  }

  get musicOn(): boolean {
    return save.musicOn;
  }

  get sfxOn(): boolean {
    return save.sfxOn;
  }

  setMusic(on: boolean): void {
    save.musicOn = on;
    this.ramp(this.musicBus?.gain, on ? MUSIC_LEVEL : 0, 0.2);
  }

  setSfx(on: boolean): void {
    save.sfxOn = on;
    this.ramp(this.sfxBus?.gain, on ? SFX_LEVEL : 0, 0.05);
  }

  // --- Music ------------------------------------------------------------------

  playMusic(name: SongName): void {
    this.init();
    this.duck(false);
    if (!this.ctx || this.songName === name) return;
    this.stopMusic();
    let song = this.songs.get(name);
    if (!song) {
      song = compile(SONGS[name]);
      this.songs.set(name, song);
    }
    this.song = song;
    this.songName = name;
    this.step = 0;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer);
    this.timer = undefined;
    this.song = undefined;
    this.songName = undefined;
  }

  /** Muffles the music (pause menu). */
  duck(on: boolean): void {
    if (!this.ctx) return;
    this.ramp(this.musicFilter.frequency, on ? 700 : 18000, 0.25);
  }

  private schedule(): void {
    const ctx = this.ctx;
    const song = this.song;
    if (!ctx || !song) return;
    if (this.nextStepTime < ctx.currentTime - 0.5) this.nextStepTime = ctx.currentTime + 0.05;
    while (this.nextStepTime < ctx.currentTime + 0.15) {
      for (const e of song.events[this.step]) this.playMusicEvent(e, this.nextStepTime, song);
      this.nextStepTime += song.stepSeconds;
      this.step = (this.step + 1) % song.totalSteps;
    }
  }

  private playMusicEvent(e: MusicEvent, at: number, song: CompiledSong): void {
    const bus = this.musicFilter;
    const dur = e.steps * song.stepSeconds;
    const v = song.def.volume;
    switch (e.voice) {
      case 'lead':
        if (song.def.leadVoice === 'bell') {
          this.tone({ freq: e.freqs[0], type: 'sine', dur: dur + 0.35, vol: 0.2 * v, at, bus });
          this.tone({ freq: e.freqs[0] * 2, type: 'sine', dur: 0.25, vol: 0.05 * v, at, bus });
        } else {
          this.tone({ freq: e.freqs[0], type: 'square', dur: dur * 0.95, vol: 0.06 * v, at, bus, attack: 0.008 });
          this.tone({ freq: e.freqs[0], type: 'triangle', dur: dur, vol: 0.12 * v, at, bus, vibrato: dur > 0.3 ? { rate: 6, depth: 6 } : undefined });
        }
        break;
      case 'bass':
        this.tone({ freq: e.freqs[0], type: 'triangle', dur: dur * 0.9, vol: 0.3 * v, at, bus, attack: 0.004 });
        break;
      case 'chord':
        for (const f of e.freqs) this.tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.045 * v, at, bus, attack: 0.004 });
        break;
      case 'kick':
        this.tone({ freq: 150, to: 45, type: 'sine', dur: 0.16, vol: 0.5 * v, at, bus, attack: 0.002 });
        break;
      case 'snare':
        this.noise({ dur: 0.12, vol: 0.16 * v, filter: 'highpass', freq: 1800, at, bus });
        this.tone({ freq: 220, to: 160, type: 'triangle', dur: 0.07, vol: 0.1 * v, at, bus });
        break;
      case 'hat':
        this.noise({ dur: 0.035, vol: 0.06 * v, filter: 'highpass', freq: 7500, at, bus });
        break;
    }
  }

  // --- Sound effects ------------------------------------------------------------

  /** `pitch` shifts the effect in semitones (e.g. coins climb during a combo). */
  play(name: SfxName, pitch = 0): void {
    this.init();
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !save.sfxOn) return;
    const now = performance.now();
    const gap = MIN_GAP_MS[name];
    if (gap && now - (this.lastPlayed.get(name) ?? -Infinity) < gap) return;
    this.lastPlayed.set(name, now);
    const p = (f: number) => transpose(f, pitch);

    switch (name) {
      case 'jump':
        this.tone({ freq: 280, to: 620, type: 'square', dur: 0.14, vol: 0.06 });
        this.tone({ freq: 280, to: 620, type: 'triangle', dur: 0.16, vol: 0.18 });
        break;
      case 'doubleJump':
        this.tone({ freq: 480, to: 1100, type: 'triangle', dur: 0.16, vol: 0.18 });
        this.tone({ freq: 1320, type: 'sine', dur: 0.18, vol: 0.09, delay: 0.05 });
        this.tone({ freq: 1760, type: 'sine', dur: 0.2, vol: 0.08, delay: 0.1 });
        break;
      case 'land':
        this.noise({ dur: 0.08, vol: 0.22, filter: 'lowpass', freq: 500 });
        this.tone({ freq: 140, to: 70, type: 'sine', dur: 0.09, vol: 0.18 });
        break;
      case 'coin': {
        const f = p(1567.98);
        this.tone({ freq: f, type: 'sine', dur: 0.12, vol: 0.2 });
        this.tone({ freq: f * 1.26, type: 'sine', dur: 0.38, vol: 0.22, delay: 0.055 });
        this.tone({ freq: f * 2.76, type: 'sine', dur: 0.12, vol: 0.04, delay: 0.055 });
        this.tone({ freq: f * 2, type: 'square', dur: 0.03, vol: 0.03 });
        break;
      }
      case 'bigCoin':
        [0, 4, 7, 12].forEach((s, i) => this.tone({ freq: transpose(1046.5, s), type: 'square', dur: 0.1, vol: 0.05, delay: i * 0.05 }));
        [0, 4, 7, 12, 16].forEach((s, i) => this.tone({ freq: transpose(1046.5, s), type: 'sine', dur: 0.4, vol: 0.16, delay: i * 0.05 }));
        this.shimmer(0.25, 0.6);
        break;
      case 'gem':
        [0, 4, 7, 12, 16].forEach((s, i) => this.tone({ freq: p(transpose(1174.66, s)), type: 'sine', dur: 0.22, vol: 0.13, delay: i * 0.035 }));
        this.shimmer(0.05, 0.35);
        break;
      case 'star':
        ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) => {
          this.tone({ freq: noteFreq(n), type: 'triangle', dur: 0.3, vol: 0.18, delay: i * 0.07 });
          this.tone({ freq: noteFreq(n) * 2, type: 'sine', dur: 0.2, vol: 0.05, delay: i * 0.07 });
        });
        ['C6', 'E6', 'G6'].forEach((n) => this.tone({ freq: noteFreq(n), type: 'sine', dur: 0.9, vol: 0.09, delay: 0.36, attack: 0.02 }));
        this.shimmer(0.35, 0.8);
        break;
      case 'heart':
        this.tone({ freq: 659.25, type: 'sine', dur: 0.2, vol: 0.2, attack: 0.02 });
        this.tone({ freq: 880, type: 'sine', dur: 0.35, vol: 0.2, attack: 0.02, delay: 0.12 });
        break;
      case 'cashRegister':
        this.noise({ dur: 0.05, vol: 0.25, filter: 'bandpass', freq: 3000, q: 2 });
        this.noise({ dur: 0.06, vol: 0.2, filter: 'bandpass', freq: 1800, q: 3, delay: 0.07 });
        this.tone({ freq: 2637, type: 'sine', dur: 0.7, vol: 0.2, delay: 0.1 });
        this.tone({ freq: 3520, type: 'sine', dur: 0.6, vol: 0.12, delay: 0.1 });
        this.tone({ freq: 5274, type: 'sine', dur: 0.3, vol: 0.04, delay: 0.1 });
        break;
      case 'chest':
        this.noise({ dur: 0.18, vol: 0.12, filter: 'bandpass', freq: 500, to: 900, q: 4 });
        this.play('cashRegister');
        this.coinStream(12, 0.25);
        break;
      case 'gift':
        this.noise({ dur: 0.4, vol: 0.12, filter: 'bandpass', freq: 400, to: 4000, q: 1.5 });
        ['C5', 'G5', 'C6', 'E6', 'G6', 'C7'].forEach((n, i) => this.tone({ freq: noteFreq(n), type: 'triangle', dur: 0.3, vol: 0.14, delay: 0.1 + i * 0.06 }));
        this.coinStream(20, 0.35);
        break;
      case 'stomp':
        this.tone({ freq: 620, to: 170, type: 'sine', dur: 0.16, vol: 0.32 });
        this.tone({ freq: 200, to: 600, type: 'triangle', dur: 0.12, vol: 0.12, delay: 0.08 });
        this.noise({ dur: 0.06, vol: 0.15, filter: 'lowpass', freq: 900 });
        break;
      case 'hurt':
        this.tone({ freq: 520, to: 200, type: 'square', dur: 0.3, vol: 0.07, vibrato: { rate: 28, depth: 30 } });
        this.tone({ freq: 260, to: 100, type: 'triangle', dur: 0.32, vol: 0.2 });
        break;
      case 'lose':
        ['G4', 'E4', 'C4'].forEach((n, i) => this.tone({ freq: noteFreq(n), type: 'triangle', dur: 0.2, vol: 0.2, delay: i * 0.15 }));
        this.tone({ freq: noteFreq('C4'), to: noteFreq('A3'), type: 'triangle', dur: 0.6, vol: 0.18, delay: 0.45, vibrato: { rate: 6, depth: 8 } });
        break;
      case 'checkpoint':
        ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => {
          this.tone({ freq: noteFreq(n), type: 'triangle', dur: 0.25, vol: 0.12, delay: i * 0.08 });
          this.tone({ freq: noteFreq(n), type: 'sine', dur: 0.5, vol: 0.08, delay: i * 0.08 });
        });
        break;
      case 'portal':
        this.noise({ dur: 0.9, vol: 0.14, filter: 'bandpass', freq: 300, to: 4000, q: 2 });
        ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6'].forEach((n, i) =>
          this.tone({ freq: noteFreq(n), type: 'sine', dur: 0.25, vol: 0.12, delay: i * 0.06 }),
        );
        break;
      case 'fanfare': {
        const lead: [string, number, number][] = [
          ['G5', 0, 0.12],
          ['C6', 0.14, 0.12],
          ['E6', 0.28, 0.12],
          ['G6', 0.42, 0.3],
          ['E6', 0.76, 0.12],
          ['G6', 0.9, 0.9],
        ];
        for (const [n, d, len] of lead) {
          this.tone({ freq: noteFreq(n), type: 'square', dur: len + 0.05, vol: 0.06, delay: d });
          this.tone({ freq: noteFreq(n), type: 'triangle', dur: len + 0.1, vol: 0.16, delay: d, vibrato: len > 0.5 ? { rate: 6, depth: 10 } : undefined });
        }
        for (const [n, d] of [['C3', 0], ['G3', 0.42], ['C4', 0.9]] as const) {
          this.tone({ freq: noteFreq(n), type: 'triangle', dur: 0.4, vol: 0.28, delay: d });
        }
        for (const n of ['C5', 'E5', 'G5']) this.tone({ freq: noteFreq(n), type: 'sine', dur: 1.2, vol: 0.07, delay: 0.9, attack: 0.03 });
        this.shimmer(0.9, 1.2);
        break;
      }
      case 'gameOver':
        ['B4', 'Bb4', 'A4'].forEach((n, i) => this.tone({ freq: noteFreq(n), type: 'triangle', dur: 0.28, vol: 0.2, delay: i * 0.3 }));
        this.tone({ freq: noteFreq('Ab4'), to: noteFreq('G4'), type: 'triangle', dur: 1.1, vol: 0.2, delay: 0.9, vibrato: { rate: 5, depth: 12 } });
        this.tone({ freq: noteFreq('Ab4'), to: noteFreq('G4'), type: 'square', dur: 1.0, vol: 0.04, delay: 0.9, vibrato: { rate: 5, depth: 12 } });
        break;
      case 'click':
        this.tone({ freq: 520, to: 900, type: 'sine', dur: 0.08, vol: 0.25 });
        this.tone({ freq: 1040, type: 'triangle', dur: 0.05, vol: 0.06 });
        break;
      case 'hover':
        this.tone({ freq: 1400, type: 'sine', dur: 0.035, vol: 0.05 });
        break;
      case 'combo':
        [0, 4, 7, 12].forEach((s, i) => this.tone({ freq: p(transpose(784, s)), type: 'square', dur: 0.08, vol: 0.05, delay: i * 0.045 }));
        this.tone({ freq: p(1568), type: 'sine', dur: 0.4, vol: 0.14, delay: 0.18 });
        break;
      case 'starSlam':
        this.tone({ freq: 130, to: 45, type: 'sine', dur: 0.32, vol: 0.45 });
        this.noise({ dur: 0.18, vol: 0.25, filter: 'lowpass', freq: 700 });
        this.tone({ freq: p(1568), type: 'sine', dur: 0.6, vol: 0.14, delay: 0.02 });
        this.tone({ freq: p(2093), type: 'sine', dur: 0.5, vol: 0.08, delay: 0.02 });
        break;
      case 'tick':
        this.tone({ freq: p(2093), type: 'sine', dur: 0.04, vol: 0.07 });
        break;
      case 'unlock':
        this.play('fanfare');
        this.play('cashRegister');
        break;
      case 'whoosh':
        this.noise({ dur: 0.3, vol: 0.14, filter: 'bandpass', freq: 600, to: 2600, q: 1.2 });
        break;
      case 'denied':
        this.tone({ freq: 220, type: 'square', dur: 0.12, vol: 0.06 });
        this.tone({ freq: 185, type: 'square', dur: 0.18, vol: 0.06, delay: 0.13 });
        break;
    }
  }

  private coinStream(count: number, delay: number): void {
    for (let i = 0; i < count; i++) {
      const f = 1568 * 2 ** (Math.floor(Math.random() * 8) / 12);
      this.tone({ freq: f, type: 'sine', dur: 0.14, vol: 0.07, delay: delay + i * 0.05 + Math.random() * 0.02 });
    }
  }

  private shimmer(delay: number, dur: number): void {
    this.noise({ dur, vol: 0.04, filter: 'highpass', freq: 7000, delay });
  }

  // --- Synth primitives -----------------------------------------------------------

  private tone(o: ToneOptions): void {
    const ctx = this.ctx!;
    const t = o.at ?? ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);

    const gain = ctx.createGain();
    const attack = o.attack ?? 0.005;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(gain).connect(o.bus ?? this.sfxBus);

    if (o.vibrato) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = o.vibrato.rate;
      depth.gain.value = o.vibrato.depth;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + o.dur + 0.05);
    }
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  private noise(o: NoiseOptions): void {
    const ctx = this.ctx!;
    const t = o.at ?? ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = o.filter;
    filter.frequency.setValueAtTime(o.freq, t);
    if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    if (o.q) filter.Q.value = o.q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(o.vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(filter).connect(gain).connect(o.bus ?? this.sfxBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + o.dur + 0.02);
  }

  private ramp(param: AudioParam | undefined, value: number, seconds: number): void {
    if (!param || !this.ctx) return;
    const now = this.ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }
}

export const audio = new AudioEngine();
