import * as Phaser from 'phaser';

export function createAnimations(scene: Phaser.Scene): void {
  if (!scene.anims.exists('bloblet-wobble')) {
    scene.anims.create({
      key: 'bloblet-wobble',
      frames: [{ key: 'bloblet-0' }, { key: 'bloblet-1' }],
      frameRate: 4,
      repeat: -1,
    });
  }
  if (!scene.anims.exists('moth-flap')) {
    scene.anims.create({
      key: 'moth-flap',
      frames: [{ key: 'moth-0' }, { key: 'moth-1' }],
      frameRate: 12,
      repeat: -1,
    });
  }
}
