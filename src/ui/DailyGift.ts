import * as Phaser from 'phaser';
import { audio } from '../audio/AudioEngine';
import { save } from '../state/SaveData';
import { confettiBurst, icon, pill, titleText, UI } from './kit';
import { headingStyle, textStyle } from './textStyle';

function untilMidnight(now = new Date()): string {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const mins = Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 60000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${mins % 60}m` : `${mins}m`;
}

/**
 * A free gift box on the title screen, once per day. Coming back on consecutive days grows the prize.
 * `onClaim` receives the dollars won and where the box is, so the scene can fly coins to its wallet.
 */
export class DailyGift {
  private readonly root: Phaser.GameObjects.Container;
  private opening = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly x: number,
    private readonly y: number,
    private readonly onClaim: (amount: number, x: number, y: number) => void,
  ) {
    this.root = scene.add.container(x, y).setDepth(15);
    this.build();
  }

  private build(): void {
    const scene = this.scene;
    this.root.removeAll(true);
    scene.tweens.killTweensOf(this.root.list);

    if (save.giftReady()) {
      const glow = icon(scene, 0, 0, 'soft-glow', 1.9).setTint(0xffe27a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
      scene.tweens.add({ targets: glow, scale: glow.scale * 1.2, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });
      const box = icon(scene, 0, 0, 'icon-gift', 1.15);
      const base = box.scale;
      scene.tweens.chain({
        targets: box,
        loop: -1,
        loopDelay: 1400,
        tweens: [
          { angle: -12, scale: base * 1.1, duration: 90 },
          { angle: 12, duration: 90, yoyo: true, repeat: 2 },
          { angle: 0, scale: base, duration: 120 },
        ],
      });
      const tag = pill(scene, -62, 42, 124, 30, UI.pink);
      const label = scene.add.text(0, 57, 'FREE GIFT!', headingStyle(18)).setOrigin(0.5);
      scene.tweens.add({ targets: label, scale: 1.08, duration: 450, yoyo: true, repeat: -1 });
      const hint = scene.add.text(0, -48, 'tap to open', textStyle(13, '#ffffff')).setOrigin(0.5);
      this.root.add([glow, box, tag, label, hint]);

      box.setInteractive({ useHandCursor: true }).on('pointerup', () => this.open(box));
      return;
    }

    const box = icon(scene, 0, 0, 'icon-gift', 0.9).setTint(0xb8aed6).setAlpha(0.85);
    const streak = save.giftPreview().streak;
    const tag = pill(scene, -78, 36, 156, 42, UI.panelDark);
    const next = scene.add.text(0, 49, `Next gift in ${untilMidnight()}`, headingStyle(13)).setOrigin(0.5);
    const days = scene.add.text(0, 66, `${streak}-day streak!`, textStyle(12, '#ffcf6b')).setOrigin(0.5);
    this.root.add([box, tag, next, days]);
    scene.time.delayedCall(60000, () => this.root.active && this.build());
  }

  private open(box: Phaser.GameObjects.Image): void {
    if (this.opening) return;
    this.opening = true;
    box.disableInteractive();
    this.scene.tweens.killTweensOf(box);
    audio.play('whoosh');
    const base = box.scale;
    this.scene.tweens.add({
      targets: box,
      angle: { from: -14, to: 14 },
      duration: 60,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        this.scene.tweens.add({ targets: box, scale: base * 1.7, alpha: 0, duration: 220, ease: 'Back.in' });
        this.burst();
      },
    });
  }

  private burst(): void {
    const scene = this.scene;
    const amount = save.claimGift();
    audio.play('gift');
    scene.cameras.main.flash(200, 255, 245, 200);
    confettiBurst(scene, this.x, this.y, 70);
    const coins = scene.add.particles(this.x, this.y, 'coin', {
      emitting: false,
      lifespan: 900,
      speed: { min: 200, max: 420 },
      angle: { min: 200, max: 340 },
      gravityY: 800,
      scaleX: { start: 0.5, end: 0.1 },
      scaleY: 0.5,
    });
    coins.setDepth(16);
    coins.explode(24);
    scene.time.delayedCall(1100, () => coins.destroy());

    const prize = titleText(scene, this.x, this.y - 20, `+$${amount}`, 54).setDepth(17).setScale(0);
    scene.tweens.add({ targets: prize, scale: 1, y: this.y - 60, duration: 450, ease: 'Back.out' });
    scene.tweens.add({ targets: prize, alpha: 0, y: this.y - 90, delay: 1500, duration: 400, onComplete: () => prize.destroy() });

    this.onClaim(amount, this.x, this.y);
    scene.time.delayedCall(1900, () => {
      this.opening = false;
      this.build();
    });
  }
}
