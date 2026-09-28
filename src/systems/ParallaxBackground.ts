import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { BG_SIZES, ensureThemeTextures } from '../art/backgrounds';
import type { Theme } from '../art/themes';

interface Layer {
  sprite: Phaser.GameObjects.TileSprite;
  factor: number;
  drift: number;
  offset: number;
}

/** Screen-space background layers that scroll slower than the camera for depth. */
export class ParallaxBackground {
  private readonly layers: Layer[] = [];

  constructor(scene: Phaser.Scene, theme: Theme) {
    ensureThemeTextures(scene, theme);
    const k = theme.key;

    scene.add.image(0, 0, `bg-sky-${k}`).setOrigin(0).setScrollFactor(0).setDepth(-100);
    this.addLayer(scene, `bg-clouds-${k}`, 10, BG_SIZES.clouds, -90, 0.08, 8).setAlpha(0.9);
    this.addLayer(scene, `bg-far-${k}`, GAME_HEIGHT - BG_SIZES.far, BG_SIZES.far, -80, 0.18, 0);
    this.addLayer(scene, `bg-mid-${k}`, GAME_HEIGHT - BG_SIZES.mid, BG_SIZES.mid, -70, 0.4, 0);

    scene.add
      .particles(0, 0, 'spark', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 60, max: GAME_HEIGHT },
        lifespan: 5000,
        speedX: { min: -10, max: 10 },
        speedY: { min: -18, max: -6 },
        scale: { start: 0.45, end: 0.1 },
        alpha: { start: 0.9, end: 0 },
        frequency: 260,
        tint: theme.motes,
        blendMode: 'ADD',
      })
      .setScrollFactor(0)
      .setDepth(-60);
  }

  private addLayer(
    scene: Phaser.Scene,
    key: string,
    y: number,
    height: number,
    depth: number,
    factor: number,
    drift: number,
  ): Phaser.GameObjects.TileSprite {
    const sprite = scene.add.tileSprite(0, y, GAME_WIDTH, height, key).setOrigin(0).setScrollFactor(0).setDepth(depth);
    this.layers.push({ sprite, factor, drift, offset: 0 });
    return sprite;
  }

  update(scrollX: number, deltaMs: number): void {
    for (const layer of this.layers) {
      layer.offset += (layer.drift * deltaMs) / 1000;
      layer.sprite.tilePositionX = scrollX * layer.factor + layer.offset;
    }
  }
}
