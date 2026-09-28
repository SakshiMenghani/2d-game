import * as Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import { baseScale } from '../art/hiRes';

const SCALE = 1.05;

/** Treasure chest that wiggles to get attention and bursts open with gems when touched. */
export class Chest {
  opened = false;
  private readonly image: Phaser.GameObjects.Image;
  private readonly glint: Phaser.GameObjects.Image;
  private readonly wiggle: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly x: number,
    readonly groundY: number,
  ) {
    this.image = scene.add
      .image(x, groundY + 2, 'chest-closed')
      .setOrigin(0.5, 1)
      .setScale(SCALE * baseScale('chest-closed'))
      .setDepth(DEPTH.objects);

    this.wiggle = scene.tweens.add({
      targets: this.image,
      angle: { from: -4, to: 4 },
      duration: 90,
      yoyo: true,
      repeat: 3,
      repeatDelay: 0,
      loop: -1,
      loopDelay: 1600,
    });

    this.glint = scene.add
      .image(x + 16, groundY - 40, 'twinkle')
      .setTint(0xfff3b0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.objects + 1);
    scene.tweens.add({
      targets: this.glint,
      scale: { from: 0.2, to: 1.3 },
      alpha: { from: 1, to: 0 },
      angle: 90,
      duration: 900,
      repeat: -1,
      repeatDelay: 700,
    });
  }

  get centerY(): number {
    return this.groundY - 24;
  }

  open(): void {
    this.opened = true;
    this.wiggle.stop();
    this.glint.destroy();
    const base = SCALE * baseScale('chest-open');
    this.image.setTexture('chest-open').setAngle(0).setScale(base * 0.6);
    this.scene.tweens.add({ targets: this.image, scale: base, duration: 500, ease: 'Back.out' });

    const beam = this.scene.add
      .image(this.x, this.centerY - 10, 'spark')
      .setTint(0xfff3b0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.objects - 1)
      .setScale(1);
    this.scene.tweens.add({ targets: beam, scale: 9, alpha: { from: 1, to: 0 }, duration: 800, onComplete: () => beam.destroy() });
  }
}
