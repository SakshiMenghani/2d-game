export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const TILE = 48;

export const PHYSICS = {
  gravity: 1600,
} as const;

/** Movement tuning for Lumi. Tweak here to change game feel. */
export const PLAYER = {
  hitboxWidth: 30,
  hitboxHeight: 40,
  runSpeed: 290,
  groundAccel: 2600,
  groundDecel: 3000,
  airAccel: 1700,
  jumpVelocity: 720,
  doubleJumpVelocity: 640,
  jumpCutMultiplier: 0.45,
  coyoteMs: 100,
  jumpBufferMs: 130,
  maxFallSpeed: 900,
  stompBounce: 560,
  hurtLockMs: 380,
  invulnerableMs: 1400,
  maxHealth: 3,
  startingLives: 3,
} as const;

export const SCORE = {
  coin: 10,
  gem: 50,
  bigCoin: 200,
  star: 250,
  heartBonus: 50,
  enemy: 100,
  chest: 500,
  comboPerPickup: 10,
  levelComplete: 1000,
} as const;

/** In-game dollars. */
export const MONEY = {
  coin: 1,
  gem: 5,
  bigCoin: 10,
  /** Coins that burst out of every treasure chest. */
  chest: 25,
  /** Paid into the wallet per Wish Star at the end of a level. */
  starBonus: 10,
  perfectBonus: 25,
} as const;

export const REWARDS = {
  /** Pickups between combo celebrations. */
  comboStep: 5,
  /** Max gap between pickups that keeps a combo alive. */
  comboWindowMs: 900,
} as const;

export const SCENES = {
  BOOT: 'boot',
  MENU: 'menu',
  CHARACTER_SELECT: 'character-select',
  GAME: 'game',
  UI: 'ui',
  PAUSE: 'pause',
  LEVEL_COMPLETE: 'level-complete',
  GAME_OVER: 'game-over',
} as const;

export const EVENTS = {
  HUD_CHANGED: 'hud-changed',
  BANNER: 'hud-banner',
  /** (kind: 'money' | 'star', screenX, screenY, amount, starIndex?) – reward flies into the HUD. */
  COLLECT: 'hud-collect',
  STAR_BANNER: 'hud-star-banner',
  COMBO: 'hud-combo',
  TOAST: 'hud-toast',
} as const;

export const DEPTH = {
  background: -100,
  decorBack: 1,
  terrain: 2,
  decor: 3,
  objects: 5,
  enemies: 8,
  player: 10,
  effects: 20,
} as const;
