import * as Phaser from 'phaser';
import { DEPTH } from '../config/constants';

/** The rainbow Wish Portal at the end of every level. */
export class Portal {
  readonly centerX: number;
  readonly centerY: number;
  private readonly ring: Phaser.GameObjects.Image;
  private readonly swirl: Phaser.GameObjects.Image;
  private readonly sparkles: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    groundY: number,
  ) {
    this.centerX = x;
    this.centerY = groundY - 80;
    const cy = this.centerY;

    const glow = scene.add
      .image(x, cy, 'spark')
      .setScale(9)
      .setTint(0xd29bff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.objects - 1);
    scene.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.6 }, duration: 1200, yoyo: true, repeat: -1 });

    this.ring = scene.add.image(x, cy, 'portal-ring').setDepth(DEPTH.objects);
    scene.tweens.add({ targets: this.ring, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    this.swirl = scene.add
      .image(x, cy, 'portal-swirl')
      .setScale(0.8, 1.1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.objects);

    scene.add.image(x, groundY + 6, 'portal-base').setOrigin(0.5, 1).setDepth(DEPTH.objects + 1);

    this.sparkles = scene.add
      .particles(x, cy, 'twinkle', {
        emitZone: { type: 'random', source: new Phaser.Geom.Ellipse(0, 0, 100, 130) } as Phaser.Types.GameObjects.Particles.EmitZoneData,
        lifespan: 900,
        speed: { min: 10, max: 40 },
        scale: { start: 0.7, end: 0 },
        alpha: { start: 1, end: 0 },
        frequency: 70,
        tint: [0xffffff, 0xffc6ff, 0xb5f5ff, 0xfff3b0],
        blendMode: 'ADD',
      })
      .setDepth(DEPTH.objects + 1);
  }

  update(deltaMs: number): void {
    this.swirl.rotation += deltaMs * 0.004;
  }

  celebrate(): void {
    this.sparkles.explode(40);
    this.scene.tweens.add({ targets: this.ring, scale: 1.25, duration: 200, yoyo: true, ease: 'Quad.out' });
  }
}
