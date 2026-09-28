import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { cssColor, darken, makeCanvasTexture } from './drawUtils';
import { Theme } from './themes';

const TAU = Math.PI * 2;

export const BG_SIZES = {
  clouds: 240,
  far: 320,
  mid: 260,
} as const;

/** Builds the parallax layers for a theme. Every layer tiles seamlessly horizontally. */
export function ensureThemeTextures(scene: Phaser.Scene, theme: Theme): void {
  const k = theme.key;
  const rng = new Phaser.Math.RandomDataGenerator([k]);

  makeCanvasTexture(scene, `bg-sky-${k}`, GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, cssColor(theme.skyTop));
    grad.addColorStop(1, cssColor(theme.skyBottom));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const sx = w * 0.8;
    const sy = h * 0.2;
    const glow = ctx.createRadialGradient(sx, sy, 20, sx, sy, 170);
    glow.addColorStop(0, cssColor(theme.sun, 0.9));
    glow.addColorStop(1, cssColor(theme.sun, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = cssColor(theme.sun);
    ctx.beginPath();
    ctx.arc(sx, sy, 44, 0, TAU);
    ctx.fill();
  });

  makeCanvasTexture(scene, `bg-clouds-${k}`, GAME_WIDTH, BG_SIZES.clouds, (ctx) => {
    for (let i = 0; i < 6; i++) {
      const x = 80 + i * 150 + rng.between(-20, 20);
      const y = rng.between(50, 170);
      const s = rng.realInRange(0.6, 1.05);
      ctx.fillStyle = '#ffffff';
      const puffs: Array<[number, number, number]> = [
        [0, 0, 28],
        [30, -14, 34],
        [64, 0, 26],
        [-26, 6, 20],
        [88, 8, 16],
      ];
      ctx.beginPath();
      for (const [dx, dy, r] of puffs) {
        ctx.moveTo(x + dx * s + r * s, y + dy * s);
        ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
      }
      ctx.fill();
      ctx.fillRect(x - 26 * s, y + 4 * s, 114 * s, 22 * s);
    }
  });

  makeCanvasTexture(scene, `bg-far-${k}`, GAME_WIDTH, BG_SIZES.far, (ctx, w, h) => {
    const ridge = (x: number) =>
      150 - (55 * Math.sin((TAU * 2 * x) / w + 0.6) + 30 * Math.sin((TAU * 5 * x) / w + 1.7) + 12 * Math.sin((TAU * 11 * x) / w));
    const shape = (offset: number) => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 4) ctx.lineTo(x, ridge(x) + offset);
      ctx.lineTo(w, h);
      ctx.closePath();
    };
    ctx.fillStyle = cssColor(theme.farRim);
    shape(0);
    ctx.fill();
    const grad = ctx.createLinearGradient(0, 40, 0, h);
    grad.addColorStop(0, cssColor(theme.far));
    grad.addColorStop(1, cssColor(theme.skyBottom));
    ctx.fillStyle = grad;
    shape(7);
    ctx.fill();
  });

  makeCanvasTexture(scene, `bg-mid-${k}`, GAME_WIDTH, BG_SIZES.mid, (ctx, w, h) => {
    const hill = (x: number) => 120 - (28 * Math.sin((TAU * 3 * x) / w) + 14 * Math.sin((TAU * 7 * x) / w + 2));

    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, hill(x));
    ctx.lineTo(w, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 60, 0, h);
    grad.addColorStop(0, cssColor(theme.mid));
    grad.addColorStop(1, cssColor(darken(theme.mid, 18)));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = cssColor(theme.midRim);
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      if (x === 0) ctx.moveTo(x, hill(x) + 2);
      else ctx.lineTo(x, hill(x) + 2);
    }
    ctx.stroke();

    for (let i = 0; i < 9; i++) {
      const tx = 50 + i * 100 + rng.between(-20, 20);
      const ty = hill(tx) + 6;
      const color = theme.trees[i % theme.trees.length];
      const size = rng.realInRange(0.8, 1.15);
      ctx.fillStyle = cssColor(theme.trunk);
      ctx.fillRect(tx - 4 * size, ty - 42 * size, 8 * size, 44 * size);
      ctx.fillStyle = cssColor(darken(color, 12));
      ctx.beginPath();
      ctx.arc(tx, ty - 52 * size, 25 * size, 0, TAU);
      ctx.arc(tx - 17 * size, ty - 40 * size, 16 * size, 0, TAU);
      ctx.arc(tx + 17 * size, ty - 40 * size, 16 * size, 0, TAU);
      ctx.fill();
      ctx.fillStyle = cssColor(color);
      ctx.beginPath();
      ctx.arc(tx - 3 * size, ty - 56 * size, 19 * size, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(tx - 10 * size, ty - 66 * size, 7 * size, 4 * size, -0.4, 0, TAU);
      ctx.fill();
    }
  });
}
