import * as Phaser from 'phaser';
import { gameConfig } from './config/gameConfig';

async function boot(): Promise<void> {
  // Phaser text is rasterized once, so wait briefly for the web font before creating any text.
  try {
    await Promise.race([
      Promise.all([document.fonts.load('700 24px "Fredoka"'), document.fonts.load('24px "Lilita One"')]),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // Fall back to system fonts.
  }
  const game = new Phaser.Game(gameConfig);
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
}

void boot();
