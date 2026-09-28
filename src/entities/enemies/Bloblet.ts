import type * as Phaser from 'phaser';
import type { Terrain } from '../../world/Terrain';
import { Enemy } from './Enemy';

const SPEED = 55;

/** A sleepy jelly that patrols back and forth, turning at walls and ledges. */
export class Bloblet extends Enemy {
  private direction: 1 | -1 = -1;

  constructor(
    scene: Phaser.Scene,
    x: number,
    groundY: number,
    private readonly terrain: Terrain,
  ) {
    super(scene, x, groundY - 22, 'bloblet-0', true);
    this.body.setSize(40, 28).setOffset(8, 16);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.play({ key: 'bloblet-wobble', startFrame: Math.floor(Math.random() * 2) });
  }

  update(): void {
    if (!this.alive) return;
    const b = this.body;
    if (b.blocked.left) this.direction = 1;
    else if (b.blocked.right) this.direction = -1;
    else if (b.blocked.down) {
      const aheadX = this.direction > 0 ? b.right + 2 : b.left - 2;
      if (!this.terrain.isSolidAt(aheadX, b.bottom + 4)) this.direction = this.direction > 0 ? -1 : 1;
    }
    b.setVelocityX(this.direction * SPEED);
    this.sprite.setFlipX(this.direction > 0);
  }
}
