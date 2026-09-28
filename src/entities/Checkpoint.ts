import * as Phaser from 'phaser';
import { DEPTH } from '../config/constants';

/** A Glow Bloom: a closed bud that blossoms when Lumi touches it and becomes the respawn point. */
export class Checkpoint {
  activated = false;
  private readonly image: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly x: number,
    readonly groundY: number,
  ) {
    this.glow = scene.add
      .image(x, groundY - 60, 'spark')
      .setScale(0)
      .setTint(0xfff3b0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.objects - 1);
    this.image = scene.add.image(x, groundY + 4, 'checkpoint-off').setOrigin(0.5, 1).setDepth(DEPTH.objects);
    scene.tweens.add({
      targets: this.image,
      angle: { from: -3, to: 3 },
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  get flowerY(): number {
    return this.groundY - 60;
  }

  activate(): void {
    this.activated = true;
    this.image.setTexture('checkpoint-on').setScale(0.6);
    this.scene.tweens.add({ targets: this.image, scale: 1, duration: 450, ease: 'Back.out' });
    this.scene.tweens.add({
      targets: this.glow,
      scale: 5,
      duration: 400,
      ease: 'Back.out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.glow,
          scale: { from: 4.4, to: 5.4 },
          alpha: { from: 0.5, to: 0.8 },
          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        });
      },
    });
  }
}
