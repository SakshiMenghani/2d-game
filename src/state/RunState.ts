import { PLAYER } from '../config/constants';

export interface LevelStartInfo {
  starCount: number;
  totalMoney: number;
  totalChests: number;
  maxHealth: number;
}

/** Progress for the current play session. Scenes read from it; GameScene writes to it. */
export class RunState {
  score: number = 0;
  lives: number = PLAYER.startingLives;
  maxHealth: number = 3;
  health: number = 3;
  /** Dollars picked up in this level. */
  money: number = 0;
  stars: boolean[] = [];
  levelIndex: number = 0;
  scoreAtLevelStart: number = 0;
  totalMoney: number = 0;
  totalChests: number = 0;
  chestsOpened: number = 0;
  enemiesBopped: number = 0;
  bestCombo: number = 0;
  timeMs: number = 0;

  newGame(): void {
    this.score = 0;
    this.lives = PLAYER.startingLives;
    this.levelIndex = 0;
  }

  startLevel(index: number, info: LevelStartInfo): void {
    this.levelIndex = index;
    this.scoreAtLevelStart = this.score;
    this.money = 0;
    this.stars = new Array<boolean>(info.starCount).fill(false);
    this.totalMoney = info.totalMoney;
    this.totalChests = info.totalChests;
    this.maxHealth = info.maxHealth;
    this.health = info.maxHealth;
    this.chestsOpened = 0;
    this.enemiesBopped = 0;
    this.bestCombo = 0;
    this.timeMs = 0;
  }

  /** Restart from the pause menu: undo this level's score, keep lives. */
  restartLevel(): void {
    this.score = this.scoreAtLevelStart;
  }

  /** Retry after game over: undo this level's score and refill lives. */
  retryLevel(): void {
    this.score = this.scoreAtLevelStart;
    this.lives = PLAYER.startingLives;
  }

  addScore(amount: number): void {
    this.score += amount;
  }

  addMoney(amount: number): void {
    this.money += amount;
  }

  collectStar(index: number): void {
    this.stars[index] = true;
  }

  damage(amount = 1): void {
    this.health = Math.max(0, this.health - amount);
  }

  heal(amount = 1): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  restoreHealth(): void {
    this.health = this.maxHealth;
  }

  loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
  }

  get starsCollected(): number {
    return this.stars.filter(Boolean).length;
  }
}

export const runState = new RunState();

export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
