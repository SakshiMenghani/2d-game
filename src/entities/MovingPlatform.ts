import type * as Phaser from 'phaser';
import { DEPTH } from '../config/constants';

export type MoveAxis = 'h' | 'v';

const COLLISION_THICKNESS = 18;

/** One-way platform that ping-pongs along an axis. Horizontal ones travel right, vertical ones travel up. */
export class MovingPlatform {
  readonly sprite: Phaser.Physics.Arcade.Image;
  private direction: 1 | -1;
  private readonly min: number;
  private readonly max: number;

  constructor(
    scene: Phaser.Scene,
    left: number,
    top: number,
    private readonly axis: MoveAxis,
    rangePx: number,
    private readonly speed: number,
  ) {
    const key = axis === 'h' ? 'mover-h' : 'mover-v';
    const width = scene.textures.get(key).getSourceImage().width;
    this.sprite = scene.physics.add.image(left + width / 2, top + 13, key).setDepth(DEPTH.terrain + 1);
    this.sprite.setImmovable(true);

    const body = this.body;
    body.setAllowGravity(false);
    body.setSize(width, COLLISION_THICKNESS, false);
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;

    if (axis === 'h') {
      this.min = body.x;
      this.max = body.x + rangePx;
      this.direction = 1;
    } else {
      this.min = body.y - rangePx;
      this.max = body.y;
      this.direction = -1;
    }
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  update(): void {
    const body = this.body;
    const pos = this.axis === 'h' ? body.x : body.y;
    if (pos >= this.max) this.direction = -1;
    else if (pos <= this.min) this.direction = 1;
    if (this.axis === 'h') body.setVelocityX(this.direction * this.speed);
    else body.setVelocityY(this.direction * this.speed);
  }
}
