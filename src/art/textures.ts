import * as Phaser from 'phaser';
import { TILE } from '../config/constants';
import { darken, Graphics, lighten, makeTexture, Point, starPoints } from './drawUtils';
import { GEM_COLORS, INK, WORLD } from './palette';

const OUTLINE = 0x2a1650;

/** Generates every runtime texture. All art is procedural so the game ships with zero image assets. */
export function generateTextures(scene: Phaser.Scene): void {
  generateTiles(scene);
  generatePickups(scene);
  generateEnemies(scene);
  generateObjects(scene);
  generateParticles(scene);
  generateDecorations(scene);
}

const p = (x: number, y: number): Point => ({ x, y });

// ---------------------------------------------------------------------------
// Terrain
// ---------------------------------------------------------------------------

function drawDirt(g: Graphics, seed: string): void {
  g.fillStyle(WORLD.dirt);
  g.fillRect(0, 0, TILE, TILE);
  const rng = new Phaser.Math.RandomDataGenerator([seed]);
  for (let i = 0; i < 8; i++) {
    g.fillStyle(i % 3 === 0 ? WORLD.dirtLight : WORLD.dirtDark, 0.9);
    g.fillCircle(rng.between(5, 43), rng.between(18, 43), rng.realInRange(1.5, 3.5));
  }
}

function generateTiles(scene: Phaser.Scene): void {
  makeTexture(scene, 'tile-grass', TILE, TILE, (g) => {
    drawDirt(g, 'grass');
    g.fillStyle(WORLD.grassDark);
    g.fillRect(0, 0, TILE, 16);
    for (const x of [6, 18, 30, 42]) g.fillCircle(x, 16, 6.5);
    g.fillStyle(WORLD.grass);
    g.fillRect(0, 0, TILE, 13);
    for (const x of [6, 18, 30, 42]) g.fillCircle(x, 13, 5.5);
    g.fillStyle(WORLD.grassLight);
    g.fillRect(0, 0, TILE, 4);
    g.fillCircle(11, 8, 1.6);
    g.fillCircle(35, 9, 1.6);
  });

  makeTexture(scene, 'tile-dirt', TILE, TILE, (g) => {
    drawDirt(g, 'dirt');
    g.fillStyle(WORLD.dirtDark, 0.9);
    g.fillCircle(12, 8, 2.5);
    g.fillCircle(38, 6, 2);
  });

  // One-way floating platforms: mossy lilac stone, with end caps.
  const variants: Array<[string, boolean, boolean]> = [
    ['plat-s', true, true],
    ['plat-l', true, false],
    ['plat-m', false, false],
    ['plat-r', false, true],
  ];
  for (const [key, roundLeft, roundRight] of variants) {
    makeTexture(scene, key, TILE, 26, (g) => {
      const r = (round: boolean, size: number) => (round ? size : 0);
      g.fillStyle(WORLD.stoneDark);
      g.fillRoundedRect(0, 3, TILE, 22, { tl: r(roundLeft, 8), bl: r(roundLeft, 8), tr: r(roundRight, 8), br: r(roundRight, 8) });
      g.fillStyle(WORLD.stone);
      g.fillRoundedRect(0, 3, TILE, 16, { tl: r(roundLeft, 8), bl: r(roundLeft, 8), tr: r(roundRight, 8), br: r(roundRight, 8) });
      g.fillStyle(lighten(WORLD.stone, 12));
      g.fillCircle(14, 15, 2);
      g.fillCircle(33, 17, 1.6);
      g.fillStyle(WORLD.moss);
      g.fillRoundedRect(0, 0, TILE, 9, { tl: r(roundLeft, 6), tr: r(roundRight, 6), bl: 0, br: 0 });
      for (const x of [8, 24, 40]) g.fillCircle(x, 9, 3.5);
      g.fillStyle(WORLD.mossLight);
      const inset = 5;
      g.fillRect(roundLeft ? inset : 0, 1, TILE - (roundLeft ? inset : 0) - (roundRight ? inset : 0), 3);
    });
  }

  const moverTexture = (key: string, width: number) =>
    makeTexture(scene, key, width, 26, (g) => {
      g.fillStyle(0x2f6fd6);
      g.fillRoundedRect(0, 3, width, 22, 10);
      g.fillStyle(0x5ab8ff);
      g.fillRoundedRect(0, 2, width, 16, 8);
      g.fillStyle(0xbfe6ff);
      g.fillRect(10, 9, width - 20, 3);
      g.fillStyle(0xffd23f);
      g.fillRoundedRect(0, 0, width, 6, { tl: 6, tr: 6, bl: 0, br: 0 });
      for (let x = 24; x < width; x += 48) {
        g.fillStyle(0xffffff, 0.95);
        g.fillPoints(starPoints(x, 15, 4, 5.5, 2), true);
      }
    });
  moverTexture('mover-h', TILE * 3);
  moverTexture('mover-v', TILE * 2);

  // Prickle crystals – the level hazard.
  makeTexture(scene, 'thorns', TILE, 30, (g) => {
    for (let i = 0; i < 4; i++) {
      const cx = 6 + i * 12;
      g.fillStyle(0x6a2c91);
      g.fillTriangle(cx - 6, 25, cx + 6, 25, cx, 2);
      g.lineStyle(2, OUTLINE);
      g.strokeTriangle(cx - 6, 25, cx + 6, 25, cx, 2);
      g.fillStyle(0xc77dff);
      g.fillTriangle(cx - 2.5, 23, cx + 1, 23, cx - 0.5, 7);
    }
    g.fillStyle(WORLD.leaf);
    g.fillRoundedRect(0, 22, TILE, 8, 4);
    g.fillStyle(WORLD.moss);
    g.fillRect(2, 23, TILE - 4, 2);
  });
}

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

function drawHeart(g: Graphics, scale: number, outline: number, fill: number, fillAlpha = 1): void {
  const s = scale;
  g.fillStyle(outline);
  g.fillCircle(9 * s, 10 * s, 8.5 * s);
  g.fillCircle(21 * s, 10 * s, 8.5 * s);
  g.fillTriangle(1.2 * s, 12.5 * s, 28.8 * s, 12.5 * s, 15 * s, 27.5 * s);
  g.fillStyle(fill, fillAlpha);
  g.fillCircle(9 * s, 10 * s, 6.5 * s);
  g.fillCircle(21 * s, 10 * s, 6.5 * s);
  g.fillTriangle(3.5 * s, 12 * s, 26.5 * s, 12 * s, 15 * s, 24.5 * s);
}

function generatePickups(scene: Phaser.Scene): void {
  GEM_COLORS.forEach((color, i) => {
    makeTexture(scene, `gem-${i}`, 28, 32, (g) => {
      g.fillStyle(darken(color, 30));
      g.fillPoints([p(14, 1), p(27, 12), p(14, 31), p(1, 12)], true);
      g.fillStyle(color);
      g.fillPoints([p(14, 4), p(24, 12), p(14, 27), p(4, 12)], true);
      g.fillStyle(lighten(color, 20));
      g.fillPoints([p(14, 4), p(24, 12), p(4, 12)], true);
      g.fillStyle(darken(color, 10));
      g.fillPoints([p(14, 12), p(24, 12), p(14, 27)], true);
      g.fillStyle(0xffffff, 0.9);
      g.fillPoints([p(9, 9), p(13, 6), p(11, 12)], true);
      g.lineStyle(2, OUTLINE);
      g.strokePoints([p(14, 1.5), p(26.5, 12), p(14, 30.5), p(1.5, 12)], true, true);
    });
  });

  // Wish Star – the big collectible (three per level), with a happy face.
  makeTexture(scene, 'wish-star', 52, 52, (g) => {
    g.fillStyle(0xfff3b0, 0.35);
    g.fillCircle(26, 26, 25);
    g.fillStyle(0xf08c00);
    g.fillPoints(starPoints(26, 27, 5, 23, 11), true);
    g.lineStyle(2.5, OUTLINE);
    g.strokePoints(starPoints(26, 27, 5, 23, 11), true, true);
    g.fillStyle(0xffd23f);
    g.fillPoints(starPoints(26, 27, 5, 19, 9), true);
    g.fillStyle(0xffffff, 0.6);
    g.fillEllipse(19, 17, 6, 3.5);
    g.fillStyle(INK);
    g.fillEllipse(21, 27, 4, 6);
    g.fillEllipse(31, 27, 4, 6);
    g.fillStyle(0xffffff);
    g.fillCircle(21.8, 25.5, 1.2);
    g.fillCircle(31.8, 25.5, 1.2);
    g.fillStyle(0xff8fab, 0.8);
    g.fillEllipse(17, 31, 5, 3);
    g.fillEllipse(35, 31, 5, 3);
    g.lineStyle(2, INK);
    g.beginPath();
    g.arc(26, 30, 3.5, Math.PI * 0.15, Math.PI * 0.85);
    g.strokePath();
  });

  makeTexture(scene, 'star-slot-empty', 30, 30, (g) => {
    const pts = starPoints(15, 16, 5, 14, 6.5);
    g.fillStyle(0x000000, 0.2);
    g.fillPoints(pts, true);
    g.lineStyle(2, 0xffffff, 0.85);
    g.strokePoints(pts, true, true);
  });

  makeTexture(scene, 'star-slot-full', 30, 30, (g) => {
    g.fillStyle(0xf08c00);
    g.fillPoints(starPoints(15, 16, 5, 14.5, 7), true);
    g.fillStyle(0xffd23f);
    g.fillPoints(starPoints(15, 16, 5, 11.5, 5.5), true);
    g.fillStyle(0xffffff, 0.6);
    g.fillEllipse(11, 10, 4, 2.5);
  });

  makeTexture(scene, 'heart', 30, 28, (g) => {
    drawHeart(g, 1, 0xc9184a, 0xff4d6d);
    g.fillStyle(0xffffff, 0.65);
    g.fillEllipse(8, 8, 5, 3.5);
  });

  makeTexture(scene, 'heart-empty', 30, 28, (g) => {
    drawHeart(g, 1, 0x4a3b6b, 0x8f82b0, 0.6);
  });

  makeTexture(scene, 'heart-particle', 15, 14, (g) => {
    drawHeart(g, 0.5, 0xffffff, 0xffffff);
  });
}

// ---------------------------------------------------------------------------
// Friendly foes
// ---------------------------------------------------------------------------

function drawBloblet(g: Graphics, w: number, h: number): void {
  const W = 56;
  const H = 44;
  const x0 = (W - w) / 2;
  const y0 = H - h;
  const r = Math.min(w, h) * 0.48;
  g.fillStyle(0xd6457f);
  g.fillRoundedRect(x0, y0, w, h, { tl: r, tr: r, bl: 9, br: 9 });
  g.fillStyle(0xff8fc7);
  g.fillRoundedRect(x0 + 3, y0 + 3, w - 6, h - 6, { tl: r - 3, tr: r - 3, bl: 7, br: 7 });
  g.lineStyle(2.5, OUTLINE);
  g.strokeRoundedRect(x0 + 1, y0 + 1, w - 2, h - 2, { tl: r - 1, tr: r - 1, bl: 8, br: 8 });
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(x0 + w * 0.28, y0 + h * 0.28, w * 0.2, h * 0.14);

  const cx = W / 2 - 3;
  const ey = y0 + h * 0.52;
  g.fillStyle(INK);
  g.fillEllipse(cx - 7, ey, 5.5, 7.5);
  g.fillEllipse(cx + 7, ey, 5.5, 7.5);
  g.fillStyle(0xffffff);
  g.fillCircle(cx - 6, ey - 2, 1.6);
  g.fillCircle(cx + 8, ey - 2, 1.6);
  g.fillStyle(0xff5c9d, 0.6);
  g.fillEllipse(cx - 13, ey + 5, 6, 3.5);
  g.fillEllipse(cx + 13, ey + 5, 6, 3.5);
  g.lineStyle(2, INK);
  g.beginPath();
  g.arc(cx, ey + 4, 3, Math.PI * 0.15, Math.PI * 0.85);
  g.strokePath();

  g.lineStyle(3, WORLD.leaf);
  g.lineBetween(W / 2, y0 + 3, W / 2 + 2, y0 - 4);
  g.fillStyle(WORLD.moss);
  g.fillEllipse(W / 2 + 7, y0 - 3, 10, 5);
}

function drawMoth(g: Graphics, wingsUp: boolean): void {
  const cx = 26;
  const cy = 28;
  g.fillStyle(0xbdf0ff, 0.8);
  g.lineStyle(2, 0x7fc8e8, 0.9);
  if (wingsUp) {
    g.fillEllipse(12, 14, 18, 24);
    g.fillEllipse(40, 14, 18, 24);
    g.strokeEllipse(12, 14, 18, 24);
    g.strokeEllipse(40, 14, 18, 24);
  } else {
    g.fillEllipse(8, 27, 22, 14);
    g.fillEllipse(44, 27, 22, 14);
    g.strokeEllipse(8, 27, 22, 14);
    g.strokeEllipse(44, 27, 22, 14);
  }

  g.fillStyle(OUTLINE);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    g.fillCircle(cx + Math.cos(a) * 12.5, cy + Math.sin(a) * 12.5, 8.5);
  }
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    g.fillStyle(0x9b7fe0);
    g.fillCircle(cx + Math.cos(a) * 12.5, cy + Math.sin(a) * 12.5, 7);
  }
  g.fillStyle(0xd3c1ff);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    g.fillCircle(cx + Math.cos(a) * 11.5, cy + Math.sin(a) * 11.5, 5.5);
  }
  g.fillCircle(cx, cy, 13);

  g.fillStyle(0xffffff);
  g.fillEllipse(cx - 6, cy - 1, 9, 11);
  g.fillEllipse(cx + 6, cy - 1, 9, 11);
  g.fillStyle(INK);
  g.fillEllipse(cx - 5, cy, 5.5, 7.5);
  g.fillEllipse(cx + 7, cy, 5.5, 7.5);
  g.fillStyle(0xffffff);
  g.fillCircle(cx - 4, cy - 2, 1.6);
  g.fillCircle(cx + 8, cy - 2, 1.6);
  g.lineStyle(2, INK);
  g.beginPath();
  g.arc(cx + 1, cy + 6, 2.5, Math.PI * 0.15, Math.PI * 0.85);
  g.strokePath();

  g.lineStyle(2, INK);
  g.lineBetween(cx - 5, cy - 12, cx - 9, cy - 21);
  g.lineBetween(cx + 5, cy - 12, cx + 9, cy - 21);
  g.fillStyle(0xffd23f);
  g.fillCircle(cx - 9, cy - 21, 3);
  g.fillCircle(cx + 9, cy - 21, 3);
}

function generateEnemies(scene: Phaser.Scene): void {
  makeTexture(scene, 'bloblet-0', 56, 44, (g) => drawBloblet(g, 44, 36));
  makeTexture(scene, 'bloblet-1', 56, 44, (g) => drawBloblet(g, 50, 31));
  makeTexture(scene, 'moth-0', 52, 48, (g) => drawMoth(g, true));
  makeTexture(scene, 'moth-1', 52, 48, (g) => drawMoth(g, false));
}

// ---------------------------------------------------------------------------
// Level objects
// ---------------------------------------------------------------------------

function drawStem(g: Graphics, cx: number): void {
  g.fillStyle(WORLD.leaf);
  g.fillRoundedRect(cx - 2.5, 34, 5, 56, 2);
  g.fillStyle(WORLD.moss);
  g.fillEllipse(cx - 9, 66, 16, 7);
  g.fillEllipse(cx + 9, 56, 16, 7);
}

function generateObjects(scene: Phaser.Scene): void {
  makeTexture(scene, 'checkpoint-off', 44, 90, (g) => {
    const cx = 22;
    drawStem(g, cx);
    g.fillStyle(0x7a6aa8);
    g.fillEllipse(cx, 24, 22, 30);
    g.fillStyle(0xb7a8e0);
    g.fillEllipse(cx, 23, 17, 25);
    g.fillStyle(0xffffff, 0.4);
    g.fillEllipse(cx - 4, 16, 5, 8);
    g.fillStyle(WORLD.moss);
    g.fillTriangle(cx - 9, 33, cx + 9, 33, cx, 40);
  });

  makeTexture(scene, 'checkpoint-on', 60, 90, (g) => {
    const cx = 30;
    const cy = 26;
    g.fillStyle(0xfff3b0, 0.4);
    g.fillCircle(cx, cy, 26);
    drawStem(g, cx);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(0xff5fa2);
      g.fillCircle(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, 9);
    }
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle(0xff9ec7);
      g.fillCircle(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, 6.5);
    }
    g.fillStyle(0xffb703);
    g.fillCircle(cx, cy, 9.5);
    g.fillStyle(0xffe066);
    g.fillCircle(cx, cy, 7.5);
    g.fillStyle(INK);
    g.fillCircle(cx - 3, cy - 1, 1.5);
    g.fillCircle(cx + 3, cy - 1, 1.5);
    g.lineStyle(1.5, INK);
    g.beginPath();
    g.arc(cx, cy + 1.5, 2.5, Math.PI * 0.15, Math.PI * 0.85);
    g.strokePath();
  });

  makeTexture(scene, 'portal-ring', 124, 156, (g) => {
    const rings: Array<[number, number, number, number]> = [
      [0xff6bd6, 124, 156, 1],
      [0xffd23f, 112, 144, 1],
      [0x6bd6ff, 100, 132, 1],
      [0xa66bff, 88, 120, 1],
      [0x2b1055, 76, 108, 1],
      [0x4b1d8f, 60, 92, 1],
      [0x7b3fe4, 40, 68, 0.8],
    ];
    for (const [color, w, h, alpha] of rings) {
      g.fillStyle(color, alpha);
      g.fillEllipse(62, 78, w, h);
    }
  });

  makeTexture(scene, 'portal-swirl', 84, 84, (g) => {
    g.lineStyle(4, 0xffffff, 0.7);
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.arc(42, 42, 34 - k * 10, k * 2.1, k * 2.1 + 3.6);
      g.strokePath();
    }
    g.lineStyle(3, 0xffc6ff, 0.6);
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.arc(42, 42, 30 - k * 10, k * 2.1 + Math.PI, k * 2.1 + Math.PI + 3.2);
      g.strokePath();
    }
  });

  makeTexture(scene, 'portal-base', 140, 30, (g) => {
    g.fillStyle(WORLD.stoneDark);
    g.fillRoundedRect(0, 6, 140, 24, 12);
    g.fillStyle(WORLD.stone);
    g.fillRoundedRect(0, 4, 140, 18, 9);
    g.fillStyle(WORLD.moss);
    g.fillRoundedRect(6, 0, 128, 8, 4);
    GEM_COLORS.forEach((color, i) => {
      g.fillStyle(color);
      g.fillPoints(starPoints(22 + i * 24, 15, 4, 5, 2), true);
    });
  });
}

// ---------------------------------------------------------------------------
// Particles
// ---------------------------------------------------------------------------

function generateParticles(scene: Phaser.Scene): void {
  makeTexture(scene, 'px', 4, 4, (g) => {
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 4, 4);
  });
  makeTexture(scene, 'spark', 20, 20, (g) => {
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(10, 10, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 10, 3);
  });
  makeTexture(scene, 'twinkle', 18, 18, (g) => {
    g.fillStyle(0xffffff);
    g.fillPoints(starPoints(9, 9, 4, 9, 2.2), true);
  });
  makeTexture(scene, 'dust', 16, 16, (g) => {
    g.fillStyle(0xffffff);
    g.fillCircle(8, 8, 8);
  });
  makeTexture(scene, 'confetti', 10, 6, (g) => {
    g.fillStyle(0xffffff);
    g.fillRect(0, 0, 10, 6);
  });
  makeTexture(scene, 'ring', 72, 72, (g) => {
    g.lineStyle(5, 0xffffff, 1);
    g.strokeCircle(36, 36, 32);
  });
}

// ---------------------------------------------------------------------------
// Decorations
// ---------------------------------------------------------------------------

function generateDecorations(scene: Phaser.Scene): void {
  const flowerColors = [0xff7eb6, 0x8ec5ff, 0xffd166];
  flowerColors.forEach((color, i) => {
    makeTexture(scene, `flower-${i}`, 22, 30, (g) => {
      g.lineStyle(2.5, WORLD.leaf);
      g.lineBetween(11, 30, 11, 12);
      g.fillStyle(WORLD.moss);
      g.fillEllipse(15, 22, 8, 4);
      g.fillStyle(color);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
        g.fillCircle(11 + Math.cos(a) * 5, 10 + Math.sin(a) * 5, 4.5);
      }
      g.fillStyle(i === 2 ? 0xffffff : 0xffe066);
      g.fillCircle(11, 10, 3);
    });
  });

  makeTexture(scene, 'tuft', 26, 14, (g) => {
    g.fillStyle(WORLD.grassDark);
    g.fillTriangle(2, 14, 8, 14, 4, 3);
    g.fillTriangle(7, 14, 14, 14, 11, 0);
    g.fillTriangle(13, 14, 20, 14, 17, 4);
    g.fillTriangle(18, 14, 25, 14, 23, 6);
    g.fillStyle(WORLD.grassLight);
    g.fillTriangle(9, 14, 12, 14, 11, 3);
    g.fillTriangle(15, 14, 18, 14, 17, 7);
  });

  makeTexture(scene, 'bush', 90, 44, (g) => {
    g.fillStyle(WORLD.grassDark);
    g.fillCircle(22, 28, 17);
    g.fillCircle(45, 21, 21);
    g.fillCircle(68, 28, 17);
    g.fillRect(6, 28, 78, 16);
    g.fillStyle(WORLD.grass);
    g.fillCircle(22, 26, 13);
    g.fillCircle(45, 19, 17);
    g.fillCircle(68, 26, 13);
    g.fillStyle(WORLD.grassLight, 0.8);
    g.fillEllipse(38, 11, 12, 6);
    g.fillStyle(0xff7eb6);
    g.fillCircle(30, 25, 3);
    g.fillCircle(57, 18, 3);
    g.fillCircle(52, 31, 2.5);
  });

  makeTexture(scene, 'crystal', 26, 32, (g) => {
    g.fillStyle(0x8f6ad6);
    g.fillPoints([p(5, 32), p(3, 18), p(7, 12), p(10, 20), p(10, 32)], true);
    g.fillPoints([p(17, 32), p(18, 16), p(22, 12), p(25, 20), p(23, 32)], true);
    g.fillStyle(0x4cb8e0);
    g.fillPoints([p(8, 32), p(7, 9), p(13, 0), p(19, 9), p(18, 32)], true);
    g.fillStyle(0x9be7ff);
    g.fillPoints([p(10, 30), p(9, 10), p(13, 3), p(17, 10), p(16, 30)], true);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(11, 9, 2, 14);
  });
}
