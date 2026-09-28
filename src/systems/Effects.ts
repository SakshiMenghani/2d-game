import * as Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import { textStyle } from '../ui/textStyle';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/** One-shot juice: sparkles, dust, rings and floating score text. */
export class Effects {
  private readonly sparks: Emitter;
  private readonly twinkles: Emitter;
  private readonly hearts: Emitter;
  private readonly dustPuffs: Emitter;
  private tints: number[] = [0xffffff];

  constructor(private readonly scene: Phaser.Scene) {
    const tint = { onEmit: () => Phaser.Utils.Array.GetRandom(this.tints) as number };

    this.sparks = scene.add
      .particles(0, 0, 'spark', {
        emitting: false,
        lifespan: { min: 300, max: 650 },
        speed: { min: 60, max: 240 },
        scale: { start: 0.8, end: 0 },
        alpha: { start: 1, end: 0 },
        gravityY: 250,
        blendMode: 'ADD',
        tint,
      })
      .setDepth(DEPTH.effects);

    this.twinkles = scene.add
      .particles(0, 0, 'twinkle', {
        emitting: false,
        lifespan: 700,
        speed: { min: 40, max: 170 },
        scale: { start: 1, end: 0 },
        rotate: { min: 0, max: 360 },
        blendMode: 'ADD',
        tint,
      })
      .setDepth(DEPTH.effects);

    this.hearts = scene.add
      .particles(0, 0, 'heart-particle', {
        emitting: false,
        lifespan: 800,
        speed: { min: 60, max: 150 },
        angle: { min: 200, max: 340 },
        gravityY: 200,
        scale: { start: 1.2, end: 0.2 },
        alpha: { start: 1, end: 0 },
        tint: [0xff4d6d, 0xff8fab, 0xffc6d9],
      })
      .setDepth(DEPTH.effects);

    this.dustPuffs = scene.add
      .particles(0, 0, 'dust', {
        emitting: false,
        lifespan: 420,
        speedX: { min: -70, max: 70 },
        speedY: { min: -45, max: -5 },
        scale: { start: 0.55, end: 0 },
        alpha: { start: 0.75, end: 0 },
        tint: 0xfff4e0,
      })
      .setDepth(DEPTH.player - 1);
  }

  burst(x: number, y: number, tints: number[], count = 12): void {
    this.tints = tints;
    this.sparks.explode(count, x, y);
    this.twinkles.explode(Math.ceil(count / 2), x, y);
  }

  heartBurst(x: number, y: number, count = 6): void {
    this.hearts.explode(count, x, y);
  }

  dust(x: number, y: number, count = 5): void {
    this.dustPuffs.explode(count, x, y);
  }

  ring(x: number, y: number, tint = 0xffffff): void {
    const ring = this.scene.add
      .image(x, y, 'ring')
      .setTint(tint)
      .setScale(0.2)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.effects);
    this.scene.tweens.add({
      targets: ring,
      scale: 1.1,
      alpha: 0,
      duration: 320,
      ease: 'Cubic.out',
      onComplete: () => ring.destroy(),
    });
  }

  floatText(x: number, y: number, text: string, color = '#ffffff', size = 22): void {
    const label = this.scene.add
      .text(x, y, text, textStyle(size, color))
      .setOrigin(0.5)
      .setDepth(DEPTH.effects + 1);
    this.scene.tweens.add({
      targets: label,
      y: y - 44,
      alpha: { from: 1, to: 0 },
      duration: 850,
      ease: 'Cubic.out',
      onComplete: () => label.destroy(),
    });
  }
}
