import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/constants';
import { CharacterRig, RigPose } from '../art/CharacterRig';
import { cssColor } from '../art/drawUtils';
import { THEMES } from '../art/themes';
import { CHARACTERS, CharacterDef } from '../characters/characters';
import { audio } from '../audio/AudioEngine';
import { formatMoney, save } from '../state/SaveData';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { coinRain, confettiBurst, countUp, createButton, drawPanel, icon, statBar, titleText, UI, Wallet, walletPill } from '../ui/kit';
import { headingStyle, textStyle } from '../ui/textStyle';

const CARD_W = 280;
const CARD_H = 410;
const CARD_TOP = 92;
const MAX_STAT = 1.2;

interface Card {
  character: CharacterDef;
  rig: CharacterRig;
  lock?: Phaser.GameObjects.Image;
  hovered: boolean;
}

export class CharacterSelectScene extends Phaser.Scene {
  private parallax!: ParallaxBackground;
  private cards: Card[] = [];
  private wallet!: Wallet;
  private busy = false;

  constructor() {
    super(SCENES.CHARACTER_SELECT);
  }

  create(): void {
    this.cards = [];
    this.busy = false;
    this.parallax = new ParallaxBackground(this, THEMES.meadow);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x1b0d40, 0.55).setOrigin(0);

    createButton(this, 84, 40, '◀ Back', () => this.back(), { width: 130, height: 46, color: UI.purple, fontSize: 20 });
    titleText(this, GAME_WIDTH / 2, 42, 'CHOOSE YOUR HERO', 42);
    this.wallet = walletPill(this, GAME_WIDTH - 18, 20, save.money);
    audio.playMusic('menu');

    CHARACTERS.forEach((c, i) => this.buildCard(c, GAME_WIDTH / 2 + (i - 1) * 306));

    this.input.keyboard?.on('keydown-ESC', () => this.back());
    this.cameras.main.fadeIn(250, 255, 255, 255);
  }

  private buildCard(character: CharacterDef, cx: number): void {
    const left = cx - CARD_W / 2;
    const top = CARD_TOP;
    const selected = save.selected === character.id;
    const unlocked = save.isUnlocked(character.id);

    const g = this.add.graphics();
    if (selected) {
      g.fillStyle(UI.yellow);
      g.fillRoundedRect(left - 9, top - 9, CARD_W + 18, CARD_H + 18, 32);
    }
    drawPanel(g, left, top, CARD_W, CARD_H, UI.panel, 24);

    this.add.image(cx, top + 12 + 85, `portrait-${character.id}`).setScale(0.5 * (CARD_W - 24) / 256);

    const rigScale = character.ears === 'long' ? 1.75 : 2.1;
    const rig = new CharacterRig(this, cx, top + 170, character).setScale(rigScale);
    let lock: Phaser.GameObjects.Image | undefined;
    if (!unlocked) {
      rig.setSilhouette(true);
      lock = icon(this, cx, top + 96, 'icon-lock', 1.3);
    }
    const card: Card = { character, rig, lock, hovered: false };
    this.cards.push(card);

    titleText(this, cx, top + 212, character.name.toUpperCase(), 36);
    this.add
      .text(cx, top + 242, character.title, headingStyle(17, cssColor(character.colors.tip)))
      .setOrigin(0.5);
    this.add
      .text(cx, top + 276, character.description, {
        ...textStyle(13, '#e9ddff'),
        align: 'center',
        wordWrap: { width: CARD_W - 36 },
      })
      .setOrigin(0.5);

    const barX = left + 58;
    const barW = CARD_W - 84;
    icon(this, left + 34, top + 318, 'icon-bolt', 0.8);
    statBar(this, barX, top + 312, barW, character.stats.speed / MAX_STAT, UI.yellow);
    icon(this, left + 34, top + 344, 'icon-jump', 0.8);
    statBar(this, barX, top + 338, barW, character.stats.jump / MAX_STAT, UI.green);
    for (let i = 0; i < character.stats.hearts; i++) {
      this.add.image(barX + 10 + i * 26, top + 370, 'heart').setScale(0.6);
    }

    const button = selected
      ? createButton(this, cx, top + CARD_H + 2, 'Selected', () => this.back(), { width: 200, height: 52, color: UI.green, fontSize: 24 })
      : unlocked
        ? createButton(this, cx, top + CARD_H + 2, 'Select', () => this.choose(character), { width: 200, height: 52, color: UI.blue, fontSize: 24 })
        : createButton(this, cx, top + CARD_H + 2, `Unlock ${formatMoney(character.cost)}`, () => this.unlock(character, cx, button), {
            width: 210,
            height: 52,
            color: save.money >= character.cost ? UI.green : UI.yellow,
            fontSize: 22,
            icon: 'coin',
          });
    if (!unlocked && save.money >= character.cost) {
      this.tweens.add({ targets: button, scale: 1.07, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    const zone = this.add.zone(cx, top + CARD_H / 2, CARD_W, CARD_H - 30).setInteractive({ useHandCursor: unlocked && !selected });
    zone.on('pointerover', () => (card.hovered = true));
    zone.on('pointerout', () => (card.hovered = false));
    zone.on('pointerup', () => {
      if (unlocked && !selected) this.choose(character);
    });
    button.setDepth(1);
  }

  private choose(character: CharacterDef): void {
    if (this.busy) return;
    this.busy = true;
    save.selected = character.id;
    const card = this.cards.find((c) => c.character.id === character.id);
    if (card) {
      card.rig.spin();
      confettiBurst(this, card.rig.x, card.rig.y - 60, 40);
    }
    audio.play('checkpoint');
    this.time.delayedCall(450, () => this.scene.restart());
  }

  private unlock(character: CharacterDef, cx: number, button: Phaser.GameObjects.Container): void {
    if (this.busy) return;
    if (!save.unlock(character.id, character.cost)) {
      this.tweens.add({ targets: button, x: cx + 8, duration: 50, yoyo: true, repeat: 3, onComplete: () => (button.x = cx) });
      audio.play('denied');
      const need = character.cost - save.money;
      const msg = this.add
        .text(cx, button.y - 44, `Need ${formatMoney(need)} more!`, headingStyle(18, '#ffe066'))
        .setOrigin(0.5)
        .setDepth(5);
      this.tweens.add({ targets: msg, y: msg.y - 24, alpha: 0, delay: 700, duration: 500, onComplete: () => msg.destroy() });
      return;
    }
    this.busy = true;
    save.selected = character.id;
    const card = this.cards.find((c) => c.character.id === character.id);
    audio.play('unlock');
    countUp(this, save.money + character.cost, save.money, { duration: 700, onUpdate: (v) => this.wallet.set(v) });
    coinRain(this, 30, 900);
    card?.rig.setSilhouette(false);
    card?.rig.spin();
    if (card?.lock) {
      this.tweens.add({ targets: card.lock, y: card.lock.y - 40, alpha: 0, angle: 30, duration: 400, ease: 'Back.in' });
    }
    confettiBurst(this, cx, CARD_TOP + 100, 90);
    this.cameras.main.flash(250, 255, 255, 255);
    const banner = titleText(this, cx, CARD_TOP + 150, 'UNLOCKED!', 40, ['#ffffff', '#ffd23f']).setDepth(5).setScale(0);
    this.tweens.add({ targets: banner, scale: 1, angle: -6, duration: 400, ease: 'Back.out' });
    this.time.delayedCall(1500, () => this.scene.restart());
  }

  private back(): void {
    if (this.busy) return;
    this.busy = true;
    this.cameras.main.fadeOut(250, 255, 255, 255);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start(SCENES.MENU));
  }

  update(time: number, delta: number): void {
    this.parallax.update(time * 0.03, delta);
    for (const card of this.cards) {
      const pose: RigPose = card.hovered && save.isUnlocked(card.character.id) ? 'celebrate' : 'idle';
      card.rig.animate(delta, pose, 0, 0);
    }
  }
}
