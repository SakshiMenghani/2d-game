import * as Phaser from 'phaser';
import { EVENTS, GAME_WIDTH, SCENES } from '../config/constants';
import { getCharacter } from '../characters/characters';
import { baseScale } from '../art/hiRes';
import { audio } from '../audio/AudioEngine';
import { formatTime, runState } from '../state/RunState';
import { formatMoney, save } from '../state/SaveData';
import { icon, panel, pill, titleText } from '../ui/kit';
import { headingStyle } from '../ui/textStyle';

type Scalable = Phaser.GameObjects.Image | Phaser.GameObjects.Text;

const MONEY_TARGET = { x: 680, y: 38 };
const MAX_FLYING_COINS = 12;

/** HUD overlay. Runs on top of GameScene and reacts to game events. */
export class UIScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private starSlots: Phaser.GameObjects.Image[] = [];
  private livesText!: Phaser.GameObjects.Text;
  private moneyText!: Phaser.GameObjects.Text;
  private moneyIcon!: Phaser.GameObjects.Image;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private portrait!: Phaser.GameObjects.Image;
  private pendingMoney = 0;
  private pendingStars = new Set<number>();
  private lastSecond = -1;
  private last = { health: 0, score: 0, lives: 0 };

  constructor() {
    super(SCENES.UI);
  }

  create(): void {
    this.hearts = [];
    this.starSlots = [];
    this.pendingMoney = 0;
    this.pendingStars = new Set();
    this.lastSecond = -1;

    const character = getCharacter(save.selected);
    const heartsWidth = runState.maxHealth * 32;
    panel(this, 14, 14, 100 + Math.max(heartsWidth, runState.stars.length * 32), 84, undefined, 20);

    const ring = this.add.graphics();
    ring.fillStyle(0x2a1650);
    ring.fillCircle(52, 54, 33);
    ring.fillStyle(character.colors.portraitTop);
    ring.fillCircle(52, 54, 30);
    ring.fillStyle(0xffffff, 0.25);
    ring.fillCircle(46, 44, 14);
    this.portrait = icon(this, 52, 54, `${character.id}-icon`, 1.25);
    pill(this, 30, 86, 44, 22, 0xff5fa2);
    this.livesText = this.add.text(52, 97, '', headingStyle(16)).setOrigin(0.5);

    for (let i = 0; i < runState.maxHealth; i++) this.hearts.push(this.add.image(106 + i * 32, 38, 'heart'));
    for (let i = 0; i < runState.stars.length; i++) this.starSlots.push(this.add.image(106 + i * 32, 74, 'star-slot-empty'));

    pill(this, 520, 18, 124, 40);
    icon(this, 546, 38, 'icon-clock');
    this.timerText = this.add.text(566, 38, '00:00', headingStyle(22)).setOrigin(0, 0.5);

    pill(this, 658, 18, 124, 40);
    this.moneyIcon = icon(this, MONEY_TARGET.x, MONEY_TARGET.y, 'coin', 1.05);
    this.moneyText = this.add.text(702, 38, '$0', headingStyle(22, '#ffe066')).setOrigin(0, 0.5);

    pill(this, 796, 18, 150, 40);
    this.add.text(812, 38, 'SCORE', headingStyle(14, '#ffe066')).setOrigin(0, 0.5);
    this.scoreText = this.add.text(934, 38, '0', headingStyle(22)).setOrigin(1, 0.5);

    this.last = { health: runState.health, score: runState.score, lives: runState.lives };
    this.refresh();

    const events = this.game.events;
    events.on(EVENTS.HUD_CHANGED, this.refresh, this);
    events.on(EVENTS.BANNER, this.showBanner, this);
    events.on(EVENTS.COLLECT, this.onCollect, this);
    events.on(EVENTS.STAR_BANNER, this.showStarBanner, this);
    events.on(EVENTS.COMBO, this.showCombo, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      events.off(EVENTS.HUD_CHANGED, this.refresh, this);
      events.off(EVENTS.BANNER, this.showBanner, this);
      events.off(EVENTS.COLLECT, this.onCollect, this);
      events.off(EVENTS.STAR_BANNER, this.showStarBanner, this);
      events.off(EVENTS.COMBO, this.showCombo, this);
    });
  }

  update(): void {
    const second = Math.floor(runState.timeMs / 1000);
    if (second !== this.lastSecond) {
      this.lastSecond = second;
      this.timerText.setText(formatTime(runState.timeMs));
    }
  }

  private refresh(): void {
    const { health, lives, score, stars } = runState;

    this.hearts.forEach((heart, i) => {
      heart.setTexture(i < health ? 'heart' : 'heart-empty');
      const lost = i >= health && i < this.last.health;
      const gained = i < health && i >= this.last.health;
      if (lost || gained) this.pop(heart, 1.6);
    });
    if (health < this.last.health) this.pop(this.portrait, 1.3);

    this.livesText.setText(`×${lives}`);
    this.scoreText.setText(score.toLocaleString());
    if (lives !== this.last.lives) this.pop(this.livesText);
    if (score !== this.last.score) this.pop(this.scoreText, 1.2);

    this.starSlots.forEach((slot, i) => {
      const filled = stars[i] && !this.pendingStars.has(i);
      if (filled && slot.texture.key !== 'star-slot-full') {
        slot.setTexture('star-slot-full');
        this.pop(slot, 2);
      }
    });

    this.updateMoneyText();
    this.last = { health, score, lives };
  }

  private updateMoneyText(): void {
    this.moneyText.setText(formatMoney(Math.max(0, runState.money - this.pendingMoney)));
  }

  private pop(target: Scalable, from = 1.35): void {
    const base = (target.getData('baseScale') as number | undefined) ?? target.scale;
    target.setData('baseScale', base);
    this.tweens.killTweensOf(target);
    this.tweens.add({ targets: target, scale: { from: base * from, to: base }, duration: 280, ease: 'Back.out' });
  }

  // --- Rewards flying into the HUD -----------------------------------------

  private onCollect(kind: 'money' | 'star', sx: number, sy: number, amount: number, starIndex = 0): void {
    if (kind === 'star') {
      this.flyStar(sx, sy, starIndex);
      return;
    }
    const pieces = Math.min(amount, MAX_FLYING_COINS);
    const coinScale = baseScale('coin');
    this.pendingMoney += amount;
    this.updateMoneyText();
    for (let i = 0; i < pieces; i++) {
      const value = Math.floor(amount / pieces) + (i < amount % pieces ? 1 : 0);
      const coin = this.add.image(sx, sy, 'coin').setScale(coinScale);
      this.tweens.add({ targets: coin, scaleX: coinScale * 0.2, duration: 160, yoyo: true, repeat: -1 });
      const arrive = () => {
        this.tweens.killTweensOf(coin);
        coin.destroy();
        this.pendingMoney = Math.max(0, this.pendingMoney - value);
        this.updateMoneyText();
        this.pop(this.moneyIcon, 1.5);
        this.pop(this.moneyText, 1.3);
        if (pieces > 1) audio.play('tick', (i % 8) * 1.5);
      };
      const flyHome = () =>
        this.tweens.add({
          targets: coin,
          x: MONEY_TARGET.x,
          y: MONEY_TARGET.y,
          duration: 480,
          ease: 'Cubic.in',
          onComplete: arrive,
        });

      if (pieces > 1) {
        this.tweens.add({
          targets: coin,
          x: sx + Phaser.Math.Between(-110, 110),
          y: sy - Phaser.Math.Between(50, 150),
          duration: 380,
          delay: i * 40,
          ease: 'Quad.out',
          onComplete: flyHome,
        });
      } else {
        flyHome();
      }
    }
  }

  private flyStar(sx: number, sy: number, index: number): void {
    const slot = this.starSlots[index];
    if (!slot) return;
    this.pendingStars.add(index);
    const star = this.add.image(sx, sy, 'star-big').setScale(0.3).setDepth(10);
    this.tweens.chain({
      targets: star,
      tweens: [
        { scale: 0.9, angle: 360, duration: 450, ease: 'Back.out' },
        { x: slot.x, y: slot.y, scale: 0.36, angle: 720, duration: 650, delay: 700, ease: 'Cubic.in' },
      ],
      onComplete: () => {
        star.destroy();
        this.pendingStars.delete(index);
        this.refresh();
      },
    });
  }

  // --- Celebrations ----------------------------------------------------------

  private sunburst(x: number, y: number, radius: number, color = 0xfff3b0): Phaser.GameObjects.Graphics {
    const rays = this.add.graphics({ x, y });
    rays.fillStyle(color, 0.28);
    const count = 14;
    for (let i = 0; i < count; i++) {
      const a0 = (i / count) * Math.PI * 2;
      const a1 = a0 + Math.PI / count;
      rays.fillTriangle(0, 0, Math.cos(a0) * radius, Math.sin(a0) * radius, Math.cos(a1) * radius, Math.sin(a1) * radius);
    }
    this.tweens.add({ targets: rays, angle: 360, duration: 6000, repeat: -1 });
    return rays;
  }

  private showStarBanner(collected: number, total: number): void {
    const cx = GAME_WIDTH / 2;
    const all = collected >= total;
    const rays = this.sunburst(cx, 200, 190).setScale(0);
    const title = titleText(this, cx, 300, all ? 'ALL WISH STARS!' : 'WISH STAR!', 54, all ? ['#ffd1f0', '#ff5fa2'] : undefined);
    const count = this.add.text(cx, 348, `${collected} / ${total}`, headingStyle(30)).setOrigin(0.5);
    const items = [rays, title, count];
    title.setScale(0);
    count.setScale(0);
    this.tweens.add({ targets: rays, scale: 1, duration: 400, ease: 'Back.out' });
    this.tweens.add({ targets: [title, count], scale: 1, duration: 450, ease: 'Back.out', delay: 80 });
    this.tweens.add({
      targets: items,
      alpha: 0,
      delay: 1500,
      duration: 400,
      onComplete: () => items.forEach((item) => item.destroy()),
    });
  }

  private showCombo(combo: number, bonus: number): void {
    const cx = GAME_WIDTH / 2;
    const title = titleText(this, cx, 130, `COMBO x${combo}!`, 40, ['#ffffff', '#ff5fa2']).setScale(0).setAngle(-6);
    const sub = this.add.text(cx, 170, `+${bonus}`, headingStyle(24, '#ffe066')).setOrigin(0.5).setScale(0);
    this.tweens.add({ targets: [title, sub], scale: 1, duration: 300, ease: 'Back.out' });
    this.tweens.add({
      targets: [title, sub],
      y: '-=30',
      alpha: 0,
      delay: 700,
      duration: 400,
      onComplete: () => {
        title.destroy();
        sub.destroy();
      },
    });
  }

  private showBanner(label: string, name: string): void {
    const cx = GAME_WIDTH / 2;
    const top = this.add.text(cx, 160, label.toUpperCase(), headingStyle(24, '#ffe066')).setOrigin(0.5);
    const main = titleText(this, cx, 210, name.toUpperCase(), 56, ['#ffffff', '#9fe6ff']);
    const items = [top, main];
    items.forEach((item) => item.setScale(0));
    this.tweens.add({ targets: items, scale: 1, duration: 450, ease: 'Back.out' });
    this.tweens.add({
      targets: items,
      alpha: 0,
      y: '-=20',
      delay: 2000,
      duration: 500,
      onComplete: () => items.forEach((item) => item.destroy()),
    });
  }
}