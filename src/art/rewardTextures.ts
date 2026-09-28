import type * as Phaser from 'phaser';
import { GEM_COLORS } from './palette';
import { Ctx, OUTLINE, cssColor, ellipsePath, fillOutlined, gloss, hiResTexture, shadedFill, starPath, verticalFill } from './hiRes';

export function generateRewardTextures(scene: Phaser.Scene): void {
  generateChests(scene);
  generateStars(scene);
  generateIcons(scene);
  generateMoney(scene);
  generateSoundIcons(scene);
}

function coinFace(ctx: Ctx, cx: number, cy: number, r: number, fontSize: number): void {
  ellipsePath(ctx, cx, cy, r, r);
  fillOutlined(ctx, shadedFill(ctx, cx, cy, r, 0xfff6b0, 0xffc933, 0xd98a0b), r > 15 ? 3 : 2.4);
  ellipsePath(ctx, cx, cy, r * 0.74, r * 0.74);
  ctx.lineWidth = r > 15 ? 2.2 : 1.5;
  ctx.strokeStyle = 'rgba(170, 95, 0, 0.65)';
  ctx.stroke();
  ctx.font = `${fontSize}px "Lilita One", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b36800';
  ctx.fillText('$', cx + fontSize * 0.04, cy + fontSize * 0.1);
  ctx.fillStyle = '#fff4b0';
  ctx.fillText('$', cx, cy + fontSize * 0.04);
  gloss(ctx, cx - r * 0.42, cy - r * 0.45, r * 0.3, r * 0.15, -0.7, 0.85);
}

function generateMoney(scene: Phaser.Scene): void {
  hiResTexture(scene, 'soft-glow', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });

  hiResTexture(scene, 'coin', 28, 28, (ctx) => coinFace(ctx, 14, 14, 11.5, 15));

  hiResTexture(scene, 'coin-big', 56, 56, (ctx) => {
    const glow = ctx.createRadialGradient(28, 28, 12, 28, 28, 28);
    glow.addColorStop(0, 'rgba(255, 236, 140, 0.9)');
    glow.addColorStop(1, 'rgba(255, 236, 140, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 56, 56);
    coinFace(ctx, 28, 28, 19, 26);
    starPath(ctx, 44, 12, 4, 6, 1.6);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  });

  hiResTexture(scene, 'cash', 48, 32, (ctx) => {
    const bill = (x: number, y: number, rot: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.roundRect(-20, -11, 40, 22, 3);
      fillOutlined(ctx, verticalFill(ctx, -11, 11, 0x9be89a, 0x3fae5a), 2.2);
      ctx.beginPath();
      ctx.roundRect(-16.5, -7.5, 33, 15, 2);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(20, 90, 40, 0.6)';
      ctx.stroke();
      ellipsePath(ctx, 0, 0, 6, 6);
      ctx.fillStyle = '#d8f7cf';
      ctx.fill();
      ctx.font = '11px "Lilita One", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#1f7a3a';
      ctx.fillText('$', 0, 0.8);
      ctx.restore();
    };
    bill(22, 18, -0.12);
    bill(26, 14, 0.08);
  });

  hiResTexture(scene, 'icon-gift', 64, 64, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(9, 29, 46, 30, 5);
    fillOutlined(ctx, verticalFill(ctx, 29, 59, 0xff8cc6, 0xd9357f), 3);
    ctx.beginPath();
    ctx.roundRect(5, 19, 54, 13, 4);
    fillOutlined(ctx, verticalFill(ctx, 19, 32, 0xffb0d8, 0xf0529a), 3);
    ctx.beginPath();
    ctx.rect(27, 19.5, 10, 39);
    fillOutlined(ctx, verticalFill(ctx, 19, 59, 0xfff27a, 0xf0a818), 2);
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(32, 19);
      ctx.bezierCurveTo(32 + side * 6, 4, 32 + side * 22, 6, 32 + side * 14, 18);
      ctx.closePath();
      fillOutlined(ctx, verticalFill(ctx, 5, 19, 0xfff27a, 0xf0a818), 2.4);
    }
    ellipsePath(ctx, 32, 18, 4, 3.5);
    fillOutlined(ctx, '#ffd84a', 2);
    gloss(ctx, 16, 34, 4, 2, -0.3, 0.5);
  });
}

function generateSoundIcons(scene: Phaser.Scene): void {
  const speaker = (ctx: Ctx) => {
    ctx.beginPath();
    ctx.moveTo(3, 9);
    ctx.lineTo(8, 9);
    ctx.lineTo(14, 3.5);
    ctx.lineTo(14, 22.5);
    ctx.lineTo(8, 17);
    ctx.lineTo(3, 17);
    ctx.closePath();
    fillOutlined(ctx, '#ffffff', 2.2);
  };
  hiResTexture(scene, 'icon-sound-on', 30, 26, (ctx) => {
    speaker(ctx);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#ffffff';
    for (const r of [5, 9.5]) {
      ctx.beginPath();
      ctx.arc(15, 13, r, -0.8, 0.8);
      ctx.stroke();
    }
  });
  hiResTexture(scene, 'icon-sound-off', 30, 26, (ctx) => {
    speaker(ctx);
    ctx.beginPath();
    ctx.moveTo(18, 8.5);
    ctx.lineTo(26, 17.5);
    ctx.moveTo(26, 8.5);
    ctx.lineTo(18, 17.5);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff8fa3';
    ctx.stroke();
  });
  hiResTexture(scene, 'icon-music', 26, 26, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(9, 19);
    ctx.lineTo(9, 5);
    ctx.lineTo(21, 3);
    ctx.lineTo(21, 17);
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ellipsePath(ctx, 6.5, 19.5, 3.6, 3, -0.4);
    fillOutlined(ctx, '#ffffff', 1.6);
    ellipsePath(ctx, 18.5, 17.5, 3.6, 3, -0.4);
    fillOutlined(ctx, '#ffffff', 1.6);
  });
}

function chestBox(ctx: Ctx, top: number): void {
  ctx.beginPath();
  ctx.roundRect(6, top, 48, 26, 5);
  fillOutlined(ctx, verticalFill(ctx, top, top + 26, 0xd68a45, 0x8a4a20), 3);
  for (const x of [13, 40]) {
    ctx.beginPath();
    ctx.rect(x, top + 1.5, 7, 23);
    fillOutlined(ctx, verticalFill(ctx, top, top + 26, 0xffe27a, 0xe0a219), 1.6);
  }
}

function generateChests(scene: Phaser.Scene): void {
  hiResTexture(scene, 'chest-closed', 60, 50, (ctx) => {
    chestBox(ctx, 22);
    ctx.beginPath();
    ctx.moveTo(4, 25);
    ctx.lineTo(4, 16);
    ctx.quadraticCurveTo(30, -3, 56, 16);
    ctx.lineTo(56, 25);
    ctx.closePath();
    fillOutlined(ctx, verticalFill(ctx, 3, 25, 0xe8a060, 0xa85a26), 3);
    for (const x of [16.5, 43.5]) {
      ctx.beginPath();
      ctx.moveTo(x - 3.5, 24);
      ctx.lineTo(x - 3.5, x < 30 ? 11 : 11);
      ctx.lineTo(x + 3.5, 10);
      ctx.lineTo(x + 3.5, 24);
      ctx.closePath();
      fillOutlined(ctx, '#ffd84a', 1.6);
    }
    ctx.beginPath();
    ctx.roundRect(24.5, 18, 11, 14, 3);
    fillOutlined(ctx, verticalFill(ctx, 18, 32, 0xfff1a8, 0xf0b020), 2);
    ellipsePath(ctx, 30, 23.5, 1.9, 1.9);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
    ctx.fillRect(29.2, 24, 1.6, 4.5);
    gloss(ctx, 18, 10, 7, 2.5, -0.25, 0.45);
  });

  hiResTexture(scene, 'chest-open', 60, 64, (ctx) => {
    const glow = ctx.createRadialGradient(30, 36, 2, 30, 30, 34);
    glow.addColorStop(0, 'rgba(255, 245, 170, 0.95)');
    glow.addColorStop(1, 'rgba(255, 245, 170, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 60, 64);

    ctx.beginPath();
    ctx.moveTo(7, 26);
    ctx.lineTo(10, 7);
    ctx.quadraticCurveTo(30, -1, 50, 7);
    ctx.lineTo(53, 26);
    ctx.closePath();
    fillOutlined(ctx, verticalFill(ctx, 3, 26, 0xa85a26, 0x6a3312), 3);
    ctx.beginPath();
    ctx.moveTo(12, 24);
    ctx.lineTo(14, 10);
    ctx.quadraticCurveTo(30, 5, 46, 10);
    ctx.lineTo(48, 24);
    ctx.closePath();
    ctx.fillStyle = '#4a220b';
    ctx.fill();

    ellipsePath(ctx, 30, 36, 23, 6);
    ctx.fillStyle = '#3a1a08';
    ctx.fill();
    const pile: Array<[number, number, number]> = [
      [16, 33, 0],
      [24, 30, 1],
      [33, 29, 2],
      [41, 32, 3],
      [29, 34, 4],
    ];
    for (const [x, y, i] of pile) {
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x, y + 6);
      ctx.lineTo(x - 5, y);
      ctx.closePath();
      fillOutlined(ctx, cssColor(GEM_COLORS[i]), 1.5);
    }
    for (const [x, y] of [
      [20, 37],
      [37, 37],
      [11, 36],
      [47, 36],
    ]) {
      ellipsePath(ctx, x, y, 4, 2.6);
      fillOutlined(ctx, '#ffd84a', 1.4);
    }
    chestBox(ctx, 36);
  });
}

function generateStars(scene: Phaser.Scene): void {
  hiResTexture(scene, 'star-big', 84, 84, (ctx) => {
    const glow = ctx.createRadialGradient(42, 44, 10, 42, 44, 42);
    glow.addColorStop(0, 'rgba(255, 240, 150, 0.8)');
    glow.addColorStop(1, 'rgba(255, 240, 150, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 84, 84);
    starPath(ctx, 42, 45, 5, 36, 17);
    fillOutlined(ctx, verticalFill(ctx, 9, 78, 0xfff27a, 0xff9d1e), 4);
    starPath(ctx, 42, 45, 5, 27, 12.5);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();
    gloss(ctx, 31, 27, 7, 4, -0.5, 0.75);
    ctx.fillStyle = OUTLINE;
    ellipsePath(ctx, 35, 45, 3.4, 5);
    ctx.fill();
    ellipsePath(ctx, 49, 45, 3.4, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(36, 43, 1.4, 0, Math.PI * 2);
    ctx.arc(50, 43, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 110, 150, 0.6)';
    ellipsePath(ctx, 29, 51, 4, 2.4);
    ctx.fill();
    ellipsePath(ctx, 55, 51, 4, 2.4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(42, 50, 4, Math.PI * 0.15, Math.PI * 0.85);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  });

  hiResTexture(scene, 'star-big-empty', 84, 84, (ctx) => {
    starPath(ctx, 42, 45, 5, 36, 17);
    fillOutlined(ctx, '#23124d', 4);
    starPath(ctx, 42, 45, 5, 30, 14);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4b2e94';
    ctx.stroke();
  });
}

function generateIcons(scene: Phaser.Scene): void {
  hiResTexture(scene, 'icon-lock', 40, 46, (ctx) => {
    ctx.beginPath();
    ctx.arc(20, 18, 10, Math.PI, 0);
    ctx.lineTo(30, 24);
    ctx.lineWidth = 9;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(20, 18, 10, Math.PI, 0);
    ctx.lineTo(30, 24);
    ctx.moveTo(10, 18);
    ctx.lineTo(10, 24);
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#d9dce8';
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(5, 22, 30, 21, 5);
    fillOutlined(ctx, verticalFill(ctx, 22, 43, 0xffe27a, 0xe09a17), 3);
    ellipsePath(ctx, 20, 30, 3, 3);
    ctx.fillStyle = OUTLINE;
    ctx.fill();
    ctx.fillRect(18.6, 30, 2.8, 7);
    gloss(ctx, 13, 26, 5, 1.8, 0, 0.5);
  });

  hiResTexture(scene, 'icon-clock', 26, 26, (ctx) => {
    ellipsePath(ctx, 13, 13, 10.5, 10.5);
    fillOutlined(ctx, '#ffffff', 2.6);
    ctx.beginPath();
    ctx.moveTo(13, 13);
    ctx.lineTo(13, 6.5);
    ctx.moveTo(13, 13);
    ctx.lineTo(17.5, 15);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
  });

  hiResTexture(scene, 'icon-bolt', 24, 28, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(4, 16);
    ctx.lineTo(11, 16);
    ctx.lineTo(9, 26);
    ctx.lineTo(20, 11);
    ctx.lineTo(13, 11);
    ctx.closePath();
    fillOutlined(ctx, verticalFill(ctx, 2, 26, 0xfff27a, 0xffa51e), 2.2);
  });

  hiResTexture(scene, 'icon-jump', 24, 28, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(12, 2);
    ctx.lineTo(22, 13);
    ctx.lineTo(16, 13);
    ctx.lineTo(16, 25);
    ctx.lineTo(8, 25);
    ctx.lineTo(8, 13);
    ctx.lineTo(2, 13);
    ctx.closePath();
    fillOutlined(ctx, verticalFill(ctx, 2, 25, 0x9dfca8, 0x2fb85a), 2.2);
  });

  hiResTexture(scene, 'icon-gem', 28, 32, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.lineTo(26, 12);
    ctx.lineTo(14, 30);
    ctx.lineTo(2, 12);
    ctx.closePath();
    fillOutlined(ctx, verticalFill(ctx, 2, 30, 0x9fe8ff, 0x2f8fe0), 2.4);
    ctx.beginPath();
    ctx.moveTo(14, 4.5);
    ctx.lineTo(23, 12);
    ctx.lineTo(5, 12);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
    gloss(ctx, 10, 9, 2.5, 1.5, -0.6, 0.9);
  });
}
