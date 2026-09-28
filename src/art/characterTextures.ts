import type * as Phaser from 'phaser';
import { CHARACTERS, CharacterDef, EarStyle, TailStyle } from '../characters/characters';
import {
  Ctx,
  OUTLINE,
  cssColor,
  ellipsePath,
  fillOutlined,
  gloss,
  hiResTexture,
  lighten,
  shadedFill,
  starPath,
  verticalFill,
} from './hiRes';

/** Logical sizes of each part texture (they're stored at HI_RES×). */
export const PART_SIZE = {
  body: [54, 50],
  eye: [18, 22],
  foot: [20, 13],
  neck: [42, 14],
  cheek: [12, 8],
  mouthSmile: [16, 10],
  mouthOpen: [12, 12],
  mouthGrin: [18, 12],
  ear: { long: [22, 46], pointy: [24, 26], round: [22, 20] } as Record<EarStyle, [number, number]>,
  tail: { scarf: [30, 16], cat: [34, 26], cape: [36, 32] } as Record<TailStyle, [number, number]>,
} as const;

/** Where each ear style attaches to the head, and how floppy it is. */
export const EAR_LAYOUT: Record<EarStyle, { x: number; y: number; flop: number }> = {
  long: { x: 9, y: -20, flop: 1 },
  pointy: { x: 11, y: -15, flop: 0.3 },
  round: { x: 14, y: -16, flop: 0.15 },
};

/** Tail attach point, texture origin, and how strongly it follows the scarf-style swing. */
export const TAIL_LAYOUT: Record<TailStyle, { x: number; y: number; ox: number; oy: number; swing: number; rest: number }> = {
  scarf: { x: -13, y: 8, ox: 1, oy: 0.45, swing: 1, rest: 0 },
  cat: { x: -17, y: 12, ox: 32 / 34, oy: 17 / 26, swing: 0.45, rest: 1.1 },
  cape: { x: -9, y: 5, ox: 34 / 36, oy: 4 / 32, swing: 0.35, rest: 1.1 },
};

/** Where the face parts sit, in logical units relative to the rig's center (the body is drawn at y = -3). */
export const FACE = {
  eyeL: [-6, -11],
  eyeR: [12.5, -11],
  eyeScale: 0.92,
  mouth: [3.5, 1],
  cheekL: [-14, 0],
  cheekR: [20, 0],
  neckY: 10,
} as const;

export function generateCharacterTextures(scene: Phaser.Scene): void {
  generateSharedFace(scene);
  for (const c of CHARACTERS) {
    generateCharacter(scene, c);
    composeIcon(scene, c);
    generatePortrait(scene, c);
  }
}

/** Card background for the hero select screen. */
function generatePortrait(scene: Phaser.Scene, c: CharacterDef): void {
  hiResTexture(scene, `portrait-${c.id}`, 256, 170, (ctx) => {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 170, 16);
    ctx.clip();
    ctx.fillStyle = verticalFill(ctx, 0, 170, c.colors.portraitTop, c.colors.portraitBottom);
    ctx.fillRect(0, 0, 256, 170);
    const spot = ctx.createRadialGradient(128, 110, 10, 128, 110, 130);
    spot.addColorStop(0, 'rgba(255,255,255,0.55)');
    spot.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, 256, 170);
    for (let i = 0; i < 14; i++) {
      const x = (i * 97) % 256;
      const y = 12 + ((i * 53) % 110);
      starPath(ctx, x, y, 4, 3.5, 1.2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
    }
    ellipsePath(ctx, 128, 158, 70, 12);
    ctx.fillStyle = 'rgba(42, 22, 80, 0.28)';
    ctx.fill();
    ctx.restore();
  });
}

function generateSharedFace(scene: Phaser.Scene): void {
  hiResTexture(scene, 'face-eye-hurt', 18, 22, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(4, 5);
    ctx.lineTo(14, 11);
    ctx.lineTo(4, 17);
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  });
  hiResTexture(scene, 'face-eye-happy', 18, 22, (ctx) => {
    ctx.beginPath();
    ctx.arc(9, 14, 5.5, Math.PI * 1.05, Math.PI * 1.95);
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  });
  hiResTexture(scene, 'face-mouth-smile', 16, 10, (ctx) => {
    ctx.beginPath();
    ctx.arc(8, 1.5, 5.5, Math.PI * 0.18, Math.PI * 0.82);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  });
  hiResTexture(scene, 'face-mouth-open', 12, 12, (ctx) => {
    ellipsePath(ctx, 6, 6, 4.2, 4.8);
    fillOutlined(ctx, '#5a1b3a', 1.8);
    ellipsePath(ctx, 6, 8.4, 2.6, 1.6);
    ctx.fillStyle = '#ff7aa2';
    ctx.fill();
  });
  hiResTexture(scene, 'face-mouth-grin', 18, 12, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(2, 2);
    ctx.quadraticCurveTo(9, 3.5, 16, 2);
    ctx.quadraticCurveTo(15, 11, 9, 11);
    ctx.quadraticCurveTo(3, 11, 2, 2);
    ctx.closePath();
    fillOutlined(ctx, '#5a1b3a', 1.8);
    ellipsePath(ctx, 9, 8.5, 3.6, 1.8);
    ctx.fillStyle = '#ff7aa2';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5, 2.6, 8, 2);
  });
  hiResTexture(scene, 'face-cheek', 12, 8, (ctx) => {
    ellipsePath(ctx, 6, 4, 5.4, 3.4);
    ctx.fillStyle = 'rgba(255, 110, 150, 0.55)';
    ctx.fill();
  });
}

function generateCharacter(scene: Phaser.Scene, c: CharacterDef): void {
  const col = c.colors;
  const id = c.id;

  hiResTexture(scene, `${id}-body`, 54, 50, (ctx) => {
    ellipsePath(ctx, 27, 26, 23, 21.5);
    fillOutlined(ctx, shadedFill(ctx, 27, 26, 23, col.bodyLight, col.body, col.bodyDark), 3);
    ellipsePath(ctx, 28, 35, 12.5, 9);
    ctx.fillStyle = cssColor(col.belly);
    ctx.fill();
    if (c.markings === 'stripes') {
      ctx.strokeStyle = cssColor(col.bodyDark);
      ctx.lineWidth = 2.6;
      for (const dx of [-5, 0, 5]) {
        ctx.beginPath();
        ctx.moveTo(29 + dx, 6.5);
        ctx.lineTo(29 + dx * 1.15, 11.5);
        ctx.stroke();
      }
    } else if (c.markings === 'muzzle') {
      ellipsePath(ctx, 30.5, 31, 8.5, 6.2);
      ctx.fillStyle = cssColor(col.belly);
      ctx.fill();
      ellipsePath(ctx, 30.5, 27.8, 2.8, 2);
      ctx.fillStyle = OUTLINE;
      ctx.fill();
    }
    gloss(ctx, 16, 13, 7, 4);
  });

  hiResTexture(scene, `${id}-eye`, 18, 22, (ctx) => {
    ellipsePath(ctx, 9, 11, 7.3, 9.3);
    fillOutlined(ctx, '#ffffff', 2.2);
    const iris = ctx.createRadialGradient(10.5, 11, 1, 10.3, 12.8, 7);
    iris.addColorStop(0, cssColor(lighten(col.iris, 30)));
    iris.addColorStop(1, cssColor(col.iris));
    ellipsePath(ctx, 10.3, 12.6, 5.2, 6.5);
    ctx.fillStyle = iris;
    ctx.fill();
    ellipsePath(ctx, 10.6, 13.2, 2.8, 3.6);
    ctx.fillStyle = '#1a0f33';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12.4, 9.4, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8.3, 15.8, 1.2, 0, Math.PI * 2);
    ctx.fill();
  });

  hiResTexture(scene, `${id}-foot`, 20, 13, (ctx) => {
    ellipsePath(ctx, 10, 6.5, 8.5, 5.2);
    fillOutlined(ctx, verticalFill(ctx, 1, 12, col.body, col.bodyDark), 2.2);
    gloss(ctx, 7.5, 4.5, 3, 1.4, 0, 0.5);
  });

  hiResTexture(scene, `${id}-neck`, 42, 14, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(2, 2.5, 38, 9, 4.5);
    fillOutlined(ctx, verticalFill(ctx, 2, 12, lighten(col.accent, 12), col.accentDark), 2.2);
    drawPin(ctx, c, 29, 7);
  });

  drawEar(scene, c);
  drawTail(scene, c);
}

function drawPin(ctx: Ctx, c: CharacterDef, x: number, y: number): void {
  if (c.pin === 'star') {
    starPath(ctx, x, y, 5, 5.5, 2.5);
    fillOutlined(ctx, cssColor(c.colors.tip), 1.5);
  } else if (c.pin === 'bell') {
    ellipsePath(ctx, x, y + 1, 4.2, 4.2);
    fillOutlined(ctx, '#ffd23f', 1.5);
    ctx.fillStyle = OUTLINE;
    ctx.fillRect(x - 2.5, y + 1.2, 5, 1.2);
  } else {
    ellipsePath(ctx, x, y, 5, 3, -0.5);
    fillOutlined(ctx, cssColor(lighten(c.colors.accent, 20)), 1.5);
  }
}

function drawEar(scene: Phaser.Scene, c: CharacterDef): void {
  const col = c.colors;
  const [w, h] = PART_SIZE.ear[c.ears];
  hiResTexture(scene, `${c.id}-ear`, w, h, (ctx) => {
    if (c.ears === 'long') {
      const glow = ctx.createRadialGradient(11, 10, 1, 11, 10, 11);
      glow.addColorStop(0, cssColor(col.tip, 0.75));
      glow.addColorStop(1, cssColor(col.tip, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 22, 22);
      ellipsePath(ctx, 11, 31, 6.5, 14);
      fillOutlined(ctx, verticalFill(ctx, 17, 45, lighten(col.ear, 15), col.bodyDark));
      ellipsePath(ctx, 11, 33, 2.8, 9);
      ctx.fillStyle = cssColor(col.earInner);
      ctx.fill();
      starPath(ctx, 11, 10, 5, 8.5, 4);
      fillOutlined(ctx, cssColor(col.tip), 2.2);
      gloss(ctx, 9, 7.5, 2.4, 1.4, -0.4, 0.8);
    } else if (c.ears === 'pointy') {
      ctx.beginPath();
      ctx.moveTo(2.5, 25);
      ctx.quadraticCurveTo(3, 6, 12, 1.5);
      ctx.quadraticCurveTo(21, 6, 21.5, 25);
      ctx.closePath();
      fillOutlined(ctx, verticalFill(ctx, 1, 25, lighten(col.ear, 15), col.bodyDark));
      ctx.beginPath();
      ctx.moveTo(7, 23);
      ctx.quadraticCurveTo(7.5, 10, 12, 6.5);
      ctx.quadraticCurveTo(16.5, 10, 17, 23);
      ctx.closePath();
      ctx.fillStyle = cssColor(col.earInner);
      ctx.fill();
    } else {
      ellipsePath(ctx, 11, 10.5, 8.5, 8.5);
      fillOutlined(ctx, shadedFill(ctx, 11, 10.5, 8.5, col.bodyLight, col.ear, col.bodyDark));
      ellipsePath(ctx, 11, 11.5, 4.5, 4.5);
      ctx.fillStyle = cssColor(col.earInner);
      ctx.fill();
    }
  });
}

function drawTail(scene: Phaser.Scene, c: CharacterDef): void {
  const col = c.colors;
  const [w, h] = PART_SIZE.tail[c.tail];
  hiResTexture(scene, `${c.id}-tail`, w, h, (ctx) => {
    if (c.tail === 'scarf') {
      ctx.beginPath();
      ctx.moveTo(29, 3);
      ctx.lineTo(29, 12);
      ctx.quadraticCurveTo(16, 14, 3, 14);
      ctx.lineTo(9, 8.5);
      ctx.lineTo(2, 3);
      ctx.quadraticCurveTo(16, 1.5, 29, 3);
      ctx.closePath();
      fillOutlined(ctx, verticalFill(ctx, 2, 14, lighten(col.accent, 10), col.accentDark), 2.2);
    } else if (c.tail === 'cat') {
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(32, 17);
        ctx.bezierCurveTo(22, 21, 10, 19, 7, 7);
      };
      path();
      ctx.lineWidth = 9.5;
      ctx.strokeStyle = OUTLINE;
      ctx.stroke();
      path();
      ctx.lineWidth = 5.5;
      ctx.strokeStyle = cssColor(col.body);
      ctx.stroke();
      const glow = ctx.createRadialGradient(7, 6, 1, 7, 6, 8);
      glow.addColorStop(0, cssColor(col.tip, 0.8));
      glow.addColorStop(1, cssColor(col.tip, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 16, 16);
      ellipsePath(ctx, 7, 6, 4.3, 4.3);
      fillOutlined(ctx, cssColor(col.accent), 2);
    } else {
      ctx.beginPath();
      ctx.moveTo(34, 3);
      ctx.quadraticCurveTo(12, 0, 3, 22);
      ctx.quadraticCurveTo(18, 31, 34, 12);
      ctx.closePath();
      fillOutlined(ctx, verticalFill(ctx, 0, 30, lighten(col.accent, 15), col.accentDark), 2.2);
      ctx.beginPath();
      ctx.moveTo(33, 6);
      ctx.quadraticCurveTo(18, 10, 8, 21);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = cssColor(col.accentDark);
      ctx.stroke();
    }
  });
}

/** Builds a small portrait for the HUD by stamping the already-drawn parts onto one canvas. */
function composeIcon(scene: Phaser.Scene, c: CharacterDef): void {
  const ear = EAR_LAYOUT[c.ears];
  const [earW, earH] = PART_SIZE.ear[c.ears];
  const s = c.ears === 'long' ? 0.48 : 0.62;
  const cx = 22;
  const cy = c.ears === 'long' ? 30 : 26;
  const src = (key: string) => scene.textures.get(key).getSourceImage() as HTMLCanvasElement;

  hiResTexture(scene, `${c.id}-icon`, 44, 44, (ctx) => {
    const place = (key: string, w: number, h: number, px: number, py: number, ox = 0.5, oy = 0.5, rot = 0) => {
      ctx.save();
      ctx.translate(cx + px * s, cy + py * s);
      ctx.rotate(rot);
      ctx.drawImage(src(key), -w * ox * s, -h * oy * s, w * s, h * s);
      ctx.restore();
    };
    place(`${c.id}-ear`, earW, earH, -ear.x, ear.y, 0.5, 1, -0.3);
    place(`${c.id}-ear`, earW, earH, ear.x, ear.y, 0.5, 1, 0.3);
    place(`${c.id}-body`, 54, 50, 0, -3);
    place('face-cheek', 12, 8, FACE.cheekL[0], FACE.cheekL[1]);
    place('face-cheek', 12, 8, FACE.cheekR[0], FACE.cheekR[1]);
    const eyeW = 18 * FACE.eyeScale;
    const eyeH = 22 * FACE.eyeScale;
    place(`${c.id}-eye`, eyeW, eyeH, FACE.eyeL[0], FACE.eyeL[1]);
    place(`${c.id}-eye`, eyeW, eyeH, FACE.eyeR[0], FACE.eyeR[1]);
    place('face-mouth-smile', 16, 10, FACE.mouth[0], FACE.mouth[1]);
  });
}