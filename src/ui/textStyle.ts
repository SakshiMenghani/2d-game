import type * as Phaser from 'phaser';

export const FONT_FAMILY = '"Fredoka", "Arial Rounded MT Bold", "Trebuchet MS", sans-serif';
export const TITLE_FONT = '"Lilita One", "Fredoka", "Arial Rounded MT Bold", sans-serif';
export const INK_CSS = '#2a1650';

export function textStyle(size: number, color = '#ffffff', stroke = INK_CSS): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_FAMILY,
    fontSize: `${size}px`,
    fontStyle: 'bold',
    color,
    stroke,
    strokeThickness: Math.max(3, Math.round(size / 5)),
    resolution: 2,
  };
}

/** Chunky display font for headings, buttons and HUD numbers. */
export function headingStyle(size: number, color = '#ffffff', stroke = INK_CSS): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: TITLE_FONT,
    fontSize: `${size}px`,
    color,
    stroke,
    strokeThickness: Math.max(4, Math.round(size * 0.18)),
    resolution: 2,
    padding: { x: 4, y: 4 },
  };
}
