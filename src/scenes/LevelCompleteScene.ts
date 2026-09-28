import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MONEY, SCENES } from '../config/constants';
import { CharacterRig } from '../art/CharacterRig';
import { audio } from '../audio/AudioEngine';
import { CHARACTERS, getCharacter } from '../characters/characters';
import { LEVELS } from '../levels';
import { formatTime, runState } from '../state/RunState';
import { formatMoney, save } from '../state/SaveData';
import { coinRain, confettiBurst, countUp, createButton, icon, panel, pill, titleText, UI } from '../ui/kit';
import { headingStyle, textStyle } from '../ui/textStyle';

interface LevelCompleteData {
  levelIndex: number;
}

const STAR_SPOTS = [
  { x: 370, y: 150, scale: 0.9, angle: -12 },
  { x: 480, y: 128, scale: 1.1, angle: 0 },
  { x: 590, y: 150, scale: 0.9, angle: 12 },
];

export class LevelCompleteScene extends Phaser.Scene {
  private hero!: CharacterRig;
  private rays!: Phaser.GameObjects.Graphics;
  private levelIndex = 0;
  private leaving = false;

  constructor() {
    super(SCENES.LEVEL_COMPLETE);
  }

  create(data: LevelCompleteData): void {
    this.levelIndex = data.levelIndex;
    this.leaving = false;
    this.scene.bringToTop();
    const def = LEVELS[this.levelIndex];
    const stars = runState.starsCollected;
    const allStars = stars === runState.stars.length && stars > 0;
    const reward = runState.money + stars * MONEY.starBonus + (allStars ? MONEY.perfectBonus : 0);
    const newBest = save.recordLevel(def.id, runState.score, stars);
    save.addMoney(reward);
    audio.play('fanfare');
    this.time.delayedCall(4200, () => audio.playMusic('menu'));

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x12072e, 0.72).setOrigin(0);
    this.rays = this.add.graphics({ x: 480, y: 140 });
    this.drawRays();
    this.rays.setAlpha(0);
    this.tweens.add({ targets: this.rays, alpha: 1, duration: 600 });

    const title = titleText(this, GAME_WIDTH / 2, 52, 'LEVEL CLEAR!', 62).setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.out' });
    this.time.delayedCall(250, () => {
      confettiBurst(this, 200, 40, 50);
      confettiBurst(this, 760, 40, 50);
    });

    this.buildStars(stars);
    panel(this, 120, 208, 720, 228);
    this.buildHero();
    this.buildStatRows();
    this.buildScore(newBest);
    this.buildReward(reward, allStars);
    this.buildButtons();
  }

  private drawRays(): void {
    const g = this.rays;
    const count = 16;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const b = a + Math.PI / count;
      g.fillStyle(i % 2 ? 0xffd23f : 0xff9d1e, 0.14);
      g.fillTriangle(0, 0, Math.cos(a) * 420, Math.sin(a) * 420, Math.cos(b) * 420, Math.sin(b) * 420);
    }
  }

  private buildStars(collected: number): void {
    STAR_SPOTS.forEach((spot, i) => {
      this.add.image(spot.x, spot.y, 'star-big-empty').setScale(spot.scale * 0.5).setAngle(spot.angle);
      if (i >= collected) return;
      const star = this.add
        .image(spot.x, spot.y, 'star-big')
        .setScale(spot.scale * 1.6)
        .setAngle(spot.angle - 40)
        .setAlpha(0);
      this.tweens.add({
        targets: star,
        scale: spot.scale * 0.5,
        angle: spot.angle,
        alpha: 1,
        delay: 600 + i * 380,
        duration: 320,
        ease: 'Back.in',
        onComplete: () => {
          audio.play('starSlam', i * 3);
          this.cameras.main.shake(120, 0.006);
          confettiBurst(this, spot.x, spot.y, 24);
          const burst = this.add.particles(spot.x, spot.y, 'twinkle', {
            emitting: false,
            lifespan: 600,
            speed: { min: 120, max: 260 },
            scale: { start: 1.2, end: 0 },
            tint: 0xffe066,
          });
          burst.explode(14);
          this.tweens.add({ targets: star, scale: spot.scale * 0.56, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        },
      });
    });
  }

  private buildHero(): void {
    const character = getCharacter(save.selected);
    this.add.ellipse(214, 414, 110, 18, 0x12072e, 0.4);
    this.hero = new CharacterRig(this, 214, 412, character).setScale(character.ears === 'long' ? 1.6 : 1.9);
  }

  private buildStatRows(): void {
    const rows: [string, string, string, number][] = [
      ['coin', 'Cash found', `${formatMoney(runState.money)} / ${formatMoney(runState.totalMoney)}`, 0.8],
      ['bloblet-0', 'Friends bopped', `${runState.enemiesBopped}`, 0.5],
      ['chest-closed', 'Treasure', `${runState.chestsOpened} / ${runState.totalChests}`, 0.42],
      ['icon-clock', 'Time', formatTime(runState.timeMs), 0.7],
      ['twinkle', 'Best combo', `x${runState.bestCombo}`, 1],
    ];
    const x = 318;
    const w = 272;
    rows.forEach(([key, label, value, scale], i) => {
      const y = 230 + i * 34;
      const row = this.add.container(x - 30, y).setAlpha(0);
      const g = this.add.graphics();
      g.fillStyle(UI.panelDark);
      g.fillRoundedRect(0, -14, w, 28, 9);
      row.add([
        g,
        icon(this, 18, 0, key, scale),
        this.add.text(36, 0, label, textStyle(14, '#d8ccff')).setOrigin(0, 0.5),
        this.add.text(w - 10, 0, value, headingStyle(17)).setOrigin(1, 0.5),
      ]);
      this.tweens.add({ targets: row, x, alpha: 1, delay: 500 + i * 110, duration: 260, ease: 'Cubic.out' });
    });
  }

  private buildScore(newBest: boolean): void {
    this.add.text(318, 412, 'SCORE', headingStyle(20, '#7fdcff')).setOrigin(0, 0.5);
    const value = this.add.text(590, 412, '0', headingStyle(30, '#ffe066')).setOrigin(1, 0.5);
    const counter = { v: runState.scoreAtLevelStart };
    this.tweens.add({
      targets: counter,
      v: runState.score,
      delay: 1100,
      duration: 1200,
      ease: 'Cubic.out',
      onUpdate: () => value.setText(Math.round(counter.v).toLocaleString()),
    });
    value.setText(runState.scoreAtLevelStart.toLocaleString());

    if (!newBest) return;
    const badge = this.add.container(560, 200).setScale(0).setAngle(-8);
    const g = this.add.graphics();
    g.fillStyle(UI.ink);
    g.fillRoundedRect(-68, -17, 136, 34, 17);
    g.fillStyle(UI.pink);
    g.fillRoundedRect(-65, -14, 130, 28, 14);
    badge.add([g, this.add.text(0, 0, 'NEW BEST!', headingStyle(18)).setOrigin(0.5)]);
    this.tweens.add({
      targets: badge,
      scale: 1,
      delay: 2300,
      duration: 350,
      ease: 'Back.out',
      onComplete: () => this.tweens.add({ targets: badge, scale: 1.08, duration: 500, yoyo: true, repeat: -1 }),
    });
  }

  private buildReward(reward: number, allStars: boolean): void {
    const cx = 720;
    const g = this.add.graphics();
    g.fillStyle(UI.panelInner);
    g.fillRoundedRect(cx - 100, 224, 200, 196, 18);
    g.lineStyle(3, UI.yellow, 0.8);
    g.strokeRoundedRect(cx - 100, 224, 200, 196, 18);
    this.add.text(cx, 246, 'REWARD', headingStyle(20, '#ffe066')).setOrigin(0.5);

    const glow = icon(this, cx, 318, 'soft-glow', 2).setTint(0xffd23f).setAlpha(0.5);
    this.tweens.add({ targets: glow, scale: glow.scale * 1.2, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
    const chest = icon(this, cx, 318, 'chest-closed', 1.3);
    this.time.delayedCall(1700, () => {
      chest.setTexture('chest-open');
      audio.play('chest');
      this.tweens.add({ targets: chest, scaleX: chest.scaleX * 1.15, scaleY: chest.scaleY * 0.9, duration: 90, yoyo: true });
      for (const [key, count] of [
        ['coin', 16],
        ['cash', 6],
      ] as const) {
        const burst = this.add.particles(cx, 300, key, {
          emitting: false,
          lifespan: 1000,
          speed: { min: 180, max: 340 },
          angle: { min: 235, max: 305 },
          gravityY: 700,
          rotate: key === 'cash' ? { min: -40, max: 40 } : 0,
          scaleX: key === 'coin' ? { start: 0.5, end: 0.1 } : 0.55,
          scaleY: key === 'coin' ? 0.5 : 0.55,
        });
        burst.explode(count);
      }
    });
    this.time.delayedCall(2900, () => {
      if (reward >= 25) coinRain(this, Math.min(60, reward), 1600);
    });

    const amount = this.add.text(cx + 12, 382, '+$0', headingStyle(34, '#ffe066')).setOrigin(0.5);
    const coinIcon = icon(this, cx - 44, 382, 'coin', 1.2);
    countUp(this, 0, reward, {
      delay: 1800,
      duration: 1100,
      onUpdate: (v) => {
        amount.setText(`+${formatMoney(v)}`);
        coinIcon.x = amount.x - amount.width / 2 - 20;
      },
      onComplete: () => {
        audio.play('cashRegister');
        this.tweens.add({ targets: amount, scale: 1.25, duration: 140, yoyo: true });
      },
    });
    const detail = allStars ? `Perfect! +${formatMoney(MONEY.perfectBonus)} bonus` : `Wallet: ${formatMoney(save.money)}`;
    this.add.text(cx, 408, detail, textStyle(12, allStars ? '#ffe066' : '#d8ccff')).setOrigin(0.5);

    const affordable = CHARACTERS.find((c) => !save.isUnlocked(c.id) && c.cost <= save.money);
    if (affordable) {
      const hint = this.add.container(GAME_WIDTH / 2, 452).setAlpha(0);
      const bg = pill(this, -170, -13, 340, 26, UI.pink);
      hint.add([bg, this.add.text(0, 0, `✨ You can unlock ${affordable.name} in HEROES! ✨`, headingStyle(15)).setOrigin(0.5)]);
      this.tweens.add({ targets: hint, alpha: 1, delay: 3000, duration: 300 });
      this.tweens.add({ targets: hint, scale: 1.05, delay: 3300, duration: 600, yoyo: true, repeat: -1 });
    }
  }

  private buildButtons(): void {
    const hasNext = this.levelIndex + 1 < LEVELS.length;
    const primary = () => (hasNext ? this.goToLevel(this.levelIndex + 1) : this.playAgain());
    createButton(this, 280, 500, hasNext ? 'Next ▶' : 'Play Again', primary, { width: 240, height: 54, color: UI.green });
    createButton(this, 510, 500, 'Heroes', () => this.leaveTo(SCENES.CHARACTER_SELECT), { width: 190, height: 54, color: UI.blue });
    createButton(this, 710, 500, 'Menu', () => this.leaveTo(SCENES.MENU), { width: 170, height: 54, color: UI.purple });

    this.input.keyboard?.once('keydown-SPACE', primary);
    this.input.keyboard?.once('keydown-ENTER', primary);
  }

  update(_time: number, delta: number): void {
    this.hero.animate(delta, 'celebrate', 0, 0);
    this.rays.rotation += delta * 0.00015;
  }

  private goToLevel(index: number): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop(SCENES.UI);
    this.scene.start(SCENES.GAME, { levelIndex: index });
  }

  private playAgain(): void {
    runState.newGame();
    this.goToLevel(0);
  }

  private leaveTo(key: string): void {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.stop(SCENES.GAME);
    this.scene.stop(SCENES.UI);
    this.scene.start(key);
  }
}
