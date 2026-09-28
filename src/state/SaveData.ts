import { CHARACTERS } from '../characters/characters';

const STORAGE_KEY = 'lumi-quest-save-v1';

export interface LevelRecord {
  bestScore: number;
  bestStars: number;
  cleared: boolean;
}

interface SaveShape {
  /** Wallet, in in-game dollars. */
  money: number;
  unlocked: string[];
  selected: string;
  levels: Record<string, LevelRecord>;
  musicOn: boolean;
  sfxOn: boolean;
  /** Local date (YYYY-MM-DD) the daily gift was last opened. */
  giftDay: string;
  giftStreak: number;
}

const DEFAULT_SAVE: SaveShape = {
  money: 0,
  unlocked: CHARACTERS.filter((c) => c.cost === 0).map((c) => c.id),
  selected: CHARACTERS[0].id,
  levels: {},
  musicOn: true,
  sfxOn: true,
  giftDay: '',
  giftStreak: 0,
};

const GIFT_BASE = 20;
const GIFT_STEP = 10;
const GIFT_MAX_STREAK = 6;

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Progress that survives between sessions (localStorage). */
class SaveData {
  private data: SaveShape;

  constructor() {
    this.data = this.load();
  }

  get money(): number {
    return this.data.money;
  }

  get selected(): string {
    return this.data.selected;
  }

  set selected(id: string) {
    if (!this.isUnlocked(id)) return;
    this.data.selected = id;
    this.persist();
  }

  get musicOn(): boolean {
    return this.data.musicOn;
  }

  set musicOn(on: boolean) {
    this.data.musicOn = on;
    this.persist();
  }

  get sfxOn(): boolean {
    return this.data.sfxOn;
  }

  set sfxOn(on: boolean) {
    this.data.sfxOn = on;
    this.persist();
  }

  addMoney(amount: number): void {
    this.data.money += amount;
    this.persist();
  }

  isUnlocked(id: string): boolean {
    return this.data.unlocked.includes(id);
  }

  /** Spends money to unlock. Returns false if the player can't afford it. */
  unlock(id: string, cost: number): boolean {
    if (this.isUnlocked(id)) return true;
    if (this.data.money < cost) return false;
    this.data.money -= cost;
    this.data.unlocked.push(id);
    this.persist();
    return true;
  }

  levelRecord(levelId: string): LevelRecord {
    return this.data.levels[levelId] ?? { bestScore: 0, bestStars: 0, cleared: false };
  }

  /** Stores a level result. Returns true if it's a new best score. */
  recordLevel(levelId: string, score: number, stars: number): boolean {
    const previous = this.levelRecord(levelId);
    const newBest = score > previous.bestScore;
    this.data.levels[levelId] = {
      bestScore: Math.max(previous.bestScore, score),
      bestStars: Math.max(previous.bestStars, stars),
      cleared: true,
    };
    this.persist();
    return newBest;
  }

  // --- Daily gift ----------------------------------------------------------------

  giftReady(now = new Date()): boolean {
    return this.data.giftDay !== dayKey(now);
  }

  /** The streak the next gift would count as (resets if a day was missed). */
  private nextStreak(now: Date): number {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return this.data.giftDay === dayKey(yesterday) ? this.data.giftStreak + 1 : 1;
  }

  giftPreview(now = new Date()): { amount: number; streak: number } {
    const streak = this.giftReady(now) ? this.nextStreak(now) : this.data.giftStreak;
    return { amount: GIFT_BASE + GIFT_STEP * (Math.min(streak, GIFT_MAX_STREAK) - 1), streak };
  }

  /** Opens today's gift. Returns the dollars won, or 0 if it was already opened. */
  claimGift(now = new Date()): number {
    if (!this.giftReady(now)) return 0;
    const { amount, streak } = this.giftPreview(now);
    this.data.giftStreak = streak;
    this.data.giftDay = dayKey(now);
    this.data.money += amount;
    this.persist();
    return amount;
  }

  private load(): SaveShape {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const parsed = JSON.parse(raw) as Partial<SaveShape> & { gems?: number };
      return {
        ...structuredClone(DEFAULT_SAVE),
        ...parsed,
        money: parsed.money ?? parsed.gems ?? 0,
        unlocked: Array.from(new Set([...DEFAULT_SAVE.unlocked, ...(parsed.unlocked ?? [])])),
      };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Private mode or storage full: progress just won't persist.
    }
  }
}

export const save = new SaveData();

export function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString()}`;
}
