import * as Phaser from 'phaser';
import { DEPTH, TILE } from '../config/constants';
import { EMPTY_CHAR } from '../levels/legend';
import type { ParsedLevel, TerrainCell } from '../levels/types';

const PLATFORM_THICKNESS = 16;

/** Draws ground/platform tiles, builds merged collision bodies, and sprinkles decorations. */
export class Terrain {
  readonly colliders: Phaser.GameObjects.Zone[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly level: ParsedLevel,
  ) {
    this.drawTiles();
    this.buildColliders();
    this.decorate();
  }

  cell(col: number, row: number): TerrainCell {
    if (row < 0 || row >= this.level.rows || col < 0 || col >= this.level.cols) return 'empty';
    return this.level.terrain[row][col];
  }

  isSolidAt(x: number, y: number): boolean {
    return this.cell(Math.floor(x / TILE), Math.floor(y / TILE)) !== 'empty';
  }

  private drawTiles(): void {
    const { rows, cols } = this.level;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = this.cell(col, row);
        let key: string | undefined;
        if (cell === 'ground') {
          key = this.cell(col, row - 1) === 'ground' ? 'tile-dirt' : 'tile-grass';
        } else if (cell === 'platform') {
          const left = this.cell(col - 1, row) === 'platform';
          const right = this.cell(col + 1, row) === 'platform';
          key = !left && !right ? 'plat-s' : !left ? 'plat-l' : !right ? 'plat-r' : 'plat-m';
        }
        if (key) this.scene.add.image(col * TILE, row * TILE, key).setOrigin(0).setDepth(DEPTH.terrain);
      }
    }
  }

  /** Merges horizontal runs into single bodies so Lumi glides over tile seams. */
  private buildColliders(): void {
    const { rows, cols } = this.level;
    for (let row = 0; row < rows; row++) {
      let col = 0;
      while (col < cols) {
        const cell = this.cell(col, row);
        if (cell === 'empty') {
          col++;
          continue;
        }
        let end = col;
        while (end + 1 < cols && this.cell(end + 1, row) === cell) end++;

        const width = (end - col + 1) * TILE;
        const height = cell === 'ground' ? TILE : PLATFORM_THICKNESS;
        const zone = this.scene.add.zone(col * TILE + width / 2, row * TILE + height / 2, width, height);
        this.scene.physics.add.existing(zone, true);
        if (cell === 'platform') {
          const body = zone.body as Phaser.Physics.Arcade.StaticBody;
          body.checkCollision.down = false;
          body.checkCollision.left = false;
          body.checkCollision.right = false;
        }
        this.colliders.push(zone);
        col = end + 1;
      }
    }
  }

  private decorate(): void {
    const rng = new Phaser.Math.RandomDataGenerator([this.level.def.id]);
    // No crystals here: they would look too much like the prickle-crystal hazard.
    const smallDecor = ['flower-0', 'flower-1', 'flower-2', 'tuft', 'tuft'];
    const { rows, cols, raw } = this.level;

    for (let row = 1; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isGroundTop = this.cell(col, row) === 'ground' && this.cell(col, row - 1) === 'empty';
        if (!isGroundTop || raw[row - 1][col] !== EMPTY_CHAR) continue;

        if (rng.frac() < 0.12) {
          this.scene.add
            .image(col * TILE + TILE / 2, row * TILE + 14, 'bush')
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.decorBack);
        }
        if (rng.frac() < 0.32) {
          const key = rng.pick(smallDecor);
          const img = this.scene.add
            .image(col * TILE + rng.between(10, 38), row * TILE + 8, key)
            .setOrigin(0.5, 1)
            .setDepth(DEPTH.decor);
          if (key.startsWith('flower')) {
            this.scene.tweens.add({
              targets: img,
              angle: { from: -6, to: 6 },
              duration: rng.between(1400, 2200),
              yoyo: true,
              repeat: -1,
              ease: 'Sine.inOut',
              delay: rng.between(0, 1000),
            });
          }
        }
      }
    }
  }
}
