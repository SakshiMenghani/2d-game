import type * as Phaser from 'phaser';
import { TILE } from '../../config/constants';
import { Enemy } from './Enemy';

/** A fluffy flyer that drifts side-to-side in a gentle wave. */
export class Fluffmoth extends Enemy {
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(
    scene: Phaser.Scene,
    private readonly baseX: number,
    private readonly baseY: number,
    private readonly range = TILE * 2,
  ) {
    super(scene, baseX, baseY, 'moth-0', false);
    this.body.moves = false;
    this.body.setCircle(16, 10, 12);
    this.sprite.play('moth-flap');
  }

  update(_deltaMs: number, timeMs: number): void {
    if (!this.alive) return;
    const t = timeMs / 1000;
    const p = t * 0.9 + this.phase;
    this.sprite.setPosition(this.baseX + Math.sin(p) * this.range, this.baseY + Math.sin(t * 3.1 + this.phase) * 10);
    this.sprite.setFlipX(Math.cos(p) > 0);
  }
}
