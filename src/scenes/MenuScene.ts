import * as Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH, SCENES, TILE } from '../config/constants';
import { CharacterRig, RigPose } from '../art/CharacterRig';
import { THEMES } from '../art/themes';
import { audio } from '../audio/AudioEngine';
import { CHARACTERS, getCharacter } from '../characters/characters';
import { LEVELS } from '../levels';
import { runState } from '../state/RunState';
import { save } from '../state/SaveData';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { DailyGift } from '../ui/DailyGift';
import { audioToggle, countUp, createButton, icon, pill, titleText, UI, Wallet, walletPill } from '../ui/kit';
import { headingStyle, textStyle } from '../ui/textStyle';

const GROUND_Y = GAME_HEIGHT - TILE * 2;
const HOP_GRAVITY = 1400;
const HERO_X = 720;

export class MenuScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private hero!: CharacterRig;
  private hopY = 0;
  private hopVy = 0;
  private nextHop = 0;
  private leaving = false;
  private wallet!: Wallet;
  private heroBadge?: Phaser.GameObjects.Container;

  constructor() {
    super(SCENES.MENU);
  }

  create(): void {
    this.leaving = false;
    this.hopY = 0;
    this.hopVy = 0;
    this.nextHop = 1200;
    this.parallax = new ParallaxBackground(this, THEMES.meadow);

    for (let x = 0; x < GAME_WIDTH; x += TILE) {
      this.add.image(x, GROUND_Y, 'tile-grass').setOrigin(0).setDepth(DEPTH.terrain);
      this.add.image(x, GROUND_Y + TILE, 'tile-dirt').setOrigin(0).setDepth(DEPTH.terrain);
    }
    [60, 470, 600, 880].forEach((x, i) => {
      this.add.image(x, GROUND_Y + 14, 'bush').setOrigin(0.5, 1).setDepth(DEPTH.decorBack);
      this.add.image(x + 50, GROUND_Y + 8, `flower-${i % 3}`).setOrigin(0.5, 1).setDepth(DEPTH.decor);
    });

    this.heroBadge = undefined;
    this.buildLogo();
    this.buildButtons();
    this.buildHero();
    this.buildWallet();
    this.updateHeroBadge();
    audioToggle(this, 42, 38, 'music');
    audioToggle(this, 104, 38, 'sfx');
    audio.playMusic('menu');

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 22, '← → move   •   SPACE jump   •   jump again in the air to double-jump!', textStyle(15))
      .setOrigin(0.5)
      .setDepth(DEPTH.effects);

    this.input.keyboard?.once('keydown-SPACE', () => this.play());
    this.input.keyboard?.once('keydown-ENTER', () => this.play());
    this.cameras.main.fadeIn(400, 255, 255, 255);
  }

  private buildLogo(): void {
    const x = 270;
    const line1 = titleText(this, x, 62, "LUMI'S", 50, ['#fff27a', '#ff9d1e']).setAngle(-3);
    const line2 = titleText(this, x, 122, 'STARLIGHT QUEST', 60, ['#c4f5ff', '#2f9bff']);
    this.tweens.add({ targets: [line1, line2], y: '-=6', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    pill(this, x - 170, 166, 340, 32, UI.pink);
    this.add.text(x, 182, '★ MAGICAL PLATFORM ADVENTURE ★', headingStyle(17)).setOrigin(0.5);
  }

  private buildButtons(): void {
    const x = 270;
    const play = createButton(this, x, 256, '▶  Play', () => this.play(), { width: 320, height: 72, color: UI.yellow, fontSize: 38 });
    this.tweens.add({ targets: play, scale: 1.04, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    createButton(this, x, 340, 'Heroes', () => this.goTo(SCENES.CHARACTER_SELECT), {
      width: 280,
      height: 58,
      color: UI.blue,
      fontSize: 28,
    });

    const record = save.levelRecord(LEVELS[0].id);
    if (record.cleared) {
      this.add
        .text(x, 400, `Best: ${record.bestScore.toLocaleString()}  •  ${'★'.repeat(record.bestStars)}${'☆'.repeat(3 - record.bestStars)}`, headingStyle(18, '#ffe066'))
        .setOrigin(0.5);
    }
  }

  private buildHero(): void {
    const character = getCharacter(save.selected);
    const shadow = this.add.ellipse(HERO_X, GROUND_Y + 4, 120, 22, 0x2a1650, 0.25).setDepth(DEPTH.player - 1);
    this.tweens.add({ targets: shadow, scaleX: 0.95, duration: 900, yoyo: true, repeat: -1 });
    this.hero = new CharacterRig(this, HERO_X, GROUND_Y, character).setScale(2.4).setDepth(DEPTH.player);

    pill(this, HERO_X - 90, GROUND_Y + 20, 180, 46, UI.panel).setDepth(DEPTH.effects);
    titleText(this, HERO_X, GROUND_Y + 38, character.name.toUpperCase(), 26).setDepth(DEPTH.effects);
    this.add
      .text(HERO_X, GROUND_Y + 58, character.title, textStyle(12, '#e9ddff'))
      .setOrigin(0.5)
      .setDepth(DEPTH.effects);
  }

  private buildWallet(): void {
    this.wallet = walletPill(this, GAME_WIDTH - 18, 18, save.money);
    new DailyGift(this, 548, 300, (amount, x, y) => this.payOut(amount, x, y));
  }

  /** Coins fly from the gift into the wallet, which counts up. */
  private payOut(amount: number, x: number, y: number): void {
    const target = this.wallet.coin;
    const before = save.money - amount;
    const pieces = 14;
    for (let i = 0; i < pieces; i++) {
      const coin = icon(this, x, y, 'coin', 1).setDepth(18);
      this.tweens.chain({
        targets: coin,
        tweens: [
          { x: x + Phaser.Math.Between(-90, 90), y: y - Phaser.Math.Between(40, 130), duration: 350, delay: 250 + i * 35, ease: 'Quad.out' },
          { x: target.x, y: target.y, duration: 450, ease: 'Cubic.in' },
        ],
        onComplete: () => {
          coin.destroy();
          this.pop(target);
        },
      });
    }
    countUp(this, before, save.money, {
      delay: 1000,
      duration: 900,
      onUpdate: (v) => this.wallet.set(v),
      onComplete: () => {
        audio.play('cashRegister');
        this.pop(this.wallet.text);
        this.updateHeroBadge();
      },
    });
  }

  private pop(target: Phaser.GameObjects.Image | Phaser.GameObjects.Text): void {
    const base = (target.getData('baseScale') as number | undefined) ?? target.scale;
    target.setData('baseScale', base);
    this.tweens.killTweensOf(target);
    this.tweens.add({ targets: target, scale: { from: base * 1.4, to: base }, duration: 220, ease: 'Back.out' });
  }

  /** Red "!" on the HEROES button when the wallet can buy someone new. */
  private updateHeroBadge(): void {
    const affordable = CHARACTERS.some((c) => !save.isUnlocked(c.id) && c.cost <= save.money);
    if (!affordable || this.heroBadge) return;
    const badge = this.add.container(400, 316).setDepth(DEPTH.effects);
    const g = this.add.graphics();
    g.fillStyle(UI.ink);
    g.fillCircle(0, 0, 17);
    g.fillStyle(UI.red);
    g.fillCircle(0, 0, 14);
    badge.add([g, this.add.text(0, 0, '!', headingStyle(22)).setOrigin(0.5)]);
    this.tweens.add({ targets: badge, scale: 1.25, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.heroBadge = badge;
  }

  private play(): void {
    runState.newGame();
    this.goTo(SCENES.GAME, { levelIndex: 0 });
  }

  private goTo(key: string, data?: object): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 255, 255, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(key, data));
  }

  update(time: number, delta: number): void {
    this.parallax.update(time * 0.04, delta);

    const dt = delta / 1000;
    this.nextHop -= delta;
    if (this.hopY === 0 && this.nextHop <= 0) {
      this.hopVy = -520;
      this.nextHop = Phaser.Math.Between(1600, 2600);
      this.hero.stretch();
      if (Math.random() < 0.5) this.time.delayedCall(260, () => this.hero.spin());
    }
    if (this.hopY < 0 || this.hopVy < 0) {
      this.hopVy += HOP_GRAVITY * dt;
      this.hopY += this.hopVy * dt;
      if (this.hopY >= 0) {
        this.hopY = 0;
        this.hopVy = 0;
        this.hero.squash(0.6);
      }
    }
    const pose: RigPose = this.hopY < 0 ? (this.hopVy < 0 ? 'jump' : 'fall') : 'idle';
    this.hero.y = GROUND_Y + this.hopY * 1.6;
    this.hero.animate(delta, pose, 0, this.hopVy);
  }
}
