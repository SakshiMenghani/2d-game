import * as Phaser from 'phaser';
import { DEPTH, SCORE } from '../../config/constants';

/** Base for anything Lumi can bop on the head. */
export abstract class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly scoreValue: number = SCORE.enemy;
  alive = true;

  constructor(
    protected readonly scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    readonly usesGravity: boolean,
  ) {
    this.sprite = scene.physics.add.sprite(x, y, texture).setDepth(DEPTH.enemies);
    this.sprite.setData('enemy', this);
    this.body.setAllowGravity(usesGravity);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  abstract update(deltaMs: number, timeMs: number): void;

  /** Squish, then pop into sparkles (the sparkles are spawned by GameScene). */
  defeat(): void {
    this.alive = false;
    this.body.enable = false;
    this.sprite.anims.stop();
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.5,
      scaleY: 0.35,
      y: this.sprite.y + this.sprite.height * 0.3,
      duration: 110,
      ease: 'Quad.out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.sprite,
          scale: 0,
          alpha: 0,
          duration: 220,
          ease: 'Back.in',
          onComplete: () => this.sprite.destroy(),
        });
      },
    });
  }
}
