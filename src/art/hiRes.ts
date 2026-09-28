import type * as Phaser from 'phaser';
import { cssColor, lighten, makeCanvasTexture } from './drawUtils';

/**
 * Hi-res canvas textures are drawn at HI_RES× so they stay crisp when shown big in menus.
 * Draw code uses logical units; display them at `1 / HI_RES` scale.
 */
export const HI_RES = 2;
export const OUTLINE = '#2a1650';
export const TAU = Math.PI * 2;

export type Ctx = CanvasRenderingContext2D;

const hiResKeys = new Set<string>();

/** Display scale that shows a texture at its logical size, whether or not it's hi-res. */
export function baseScale(key: string): number {
  return hiResKeys.has(key) ? 1 / HI_RES : 1;
}

export function hiResTexture(scene: Phaser.Scene, key: string, width: number, height: number, draw: (ctx: Ctx) => void): void {
  hiResKeys.add(key);
  makeCanvasTexture(scene, key, width * HI_RES, height * HI_RES, (ctx) => {
    ctx.scale(HI_RES, HI_RES);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    draw(ctx);
  });
}

/** Fills the current path, then strokes it with the cartoon outline. */
export function fillOutlined(ctx: Ctx, fill: string | CanvasGradient, lineWidth = 2.6): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

export function ellipsePath(ctx: Ctx, x: number, y: number, rx: number, ry: number, rotation = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
}

export function starPath(ctx: Ctx, cx: number, cy: number, points: number, outer: number, inner: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Soft 3D look: light from the top-left. */
export function shadedFill(ctx: Ctx, cx: number, cy: number, radius: number, light: number, base: number, dark: number): CanvasGradient {
  const g = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.45, radius * 0.1, cx, cy, radius * 1.25);
  g.addColorStop(0, cssColor(light));
  g.addColorStop(0.5, cssColor(base));
  g.addColorStop(1, cssColor(dark));
  return g;
}

export function verticalFill(ctx: Ctx, y0: number, y1: number, top: number, bottom: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, cssColor(top));
  g.addColorStop(1, cssColor(bottom));
  return g;
}

export function gloss(ctx: Ctx, x: number, y: number, rx: number, ry: number, rotation = -0.5, alpha = 0.65): void {
  ellipsePath(ctx, x, y, rx, ry, rotation);
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fill();
}

export { cssColor, lighten };
