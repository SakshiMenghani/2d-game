import * as Phaser from 'phaser';
import { darken, lighten } from '../art/drawUtils';
import { baseScale } from '../art/hiRes';
import { audio } from '../audio/AudioEngine';
import { formatMoney } from '../state/SaveData';
import { headingStyle, INK_CSS, TITLE_FONT } from './textStyle';

export const UI = {
  ink: 0x2a1650,
  shadow: 0x0d0524,
  panel: 0x3a2470,
  panelDark: 0x2a1856,
  panelInner: 0x4a2f8c,
  yellow: 0xffc933,
  green: 0x4fd36b,
  blue: 0x3fa7ff,
  purple: 0x9b6bff,
  red: 0xff5a6e,
  pink: 0xff5fa2,
  orange: 0xff9f2e,
} as const;

/** Rounded panel with a thick dark outline, drop shadow and a soft inner rim. */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number = UI.panel,
  radius = 22,
): void {
  g.fillStyle(UI.shadow, 0.45);
  g.fillRoundedRect(x, y + 7, w, h, radius);
  g.fillStyle(UI.ink);
  g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, radius + 3);
  g.fillStyle(color);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(2, lighten(color, 10), 0.9);
  g.strokeRoundedRect(x + 4, y + 4, w - 8, h - 8, Math.max(4, radius - 4));
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color?: number, radius?: number) {
  const g = scene.add.graphics();
  drawPanel(g, x, y, w, h, color, radius);
  return g;
}

/** Small dark capsule used for HUD counters. */
export function pill(scene: Phaser.Scene, x: number, y: number, w: number, h: number, color: number = UI.panelDark) {
  const g = scene.add.graphics();
  g.fillStyle(UI.ink);
  g.fillRoundedRect(x - 3, y - 3, w + 6, h + 6, (h + 6) / 2);
  g.fillStyle(color);
  g.fillRoundedRect(x, y, w, h, h / 2);
  g.lineStyle(2, lighten(color, 14), 0.9);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, (h - 6) / 2);
  return g;
}

/** Big glossy title with a vertical gradient fill, thick outline and a drop shadow. */
export function titleText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  colors: [string, string] = ['#fff27a', '#ff9d1e'],
): Phaser.GameObjects.Text {
  const t = scene.add.text(x, y, text, headingStyle(size)).setOrigin(0.5);
  const grad = t.context.createLinearGradient(0, 0, 0, t.height);
  grad.addColorStop(0.25, colors[0]);
  grad.addColorStop(0.8, colors[1]);
  t.setFill(grad);
  t.setShadow(0, Math.round(size * 0.09), '#150834', 0, true, true);
  return t;
}

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  icon?: string;
  fontSize?: number;
}

export type Button = Phaser.GameObjects.Container & { setLabel(text: string): void };

/** Chunky 3D button: outline, darker lip, glossy top. Presses down on click. */
export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  { width = 260, height = 60, color = UI.green, icon, fontSize = 28 }: ButtonOptions = {},
): Button {
  const bg = scene.add.graphics();
  const draw = (state: 'idle' | 'hover' | 'down') => {
    const r = 16;
    const lip = state === 'down' ? 2 : 7;
    const top = state === 'down' ? 5 : 0;
    const w = width;
    const h = height;
    bg.clear();
    bg.fillStyle(UI.shadow, 0.4);
    bg.fillRoundedRect(-w / 2, -h / 2 + 9, w, h, r);
    bg.fillStyle(UI.ink);
    bg.fillRoundedRect(-w / 2 - 3, -h / 2 - 3 + top, w + 6, h + 6 - top, r + 3);
    bg.fillStyle(darken(color, 28));
    bg.fillRoundedRect(-w / 2, -h / 2 + top, w, h - top, r);
    bg.fillStyle(state === 'hover' ? lighten(color, 8) : color);
    bg.fillRoundedRect(-w / 2, -h / 2 + top, w, h - lip - top, r);
    bg.fillStyle(0xffffff, 0.3);
    bg.fillRoundedRect(-w / 2 + 10, -h / 2 + top + 6, w - 20, (h - lip) * 0.3, 8);
  };
  draw('idle');

  const content = scene.add.container(0, -3);
  const text = scene.add
    .text(0, 0, label.toUpperCase(), {
      fontFamily: TITLE_FONT,
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      stroke: INK_CSS,
      strokeThickness: Math.round(fontSize * 0.2),
      resolution: 2,
    })
    .setOrigin(0.5);
  content.add(text);

  let iconImage: Phaser.GameObjects.Image | undefined;
  if (icon) {
    iconImage = scene.add.image(0, 0, icon).setScale(baseScale(icon));
    content.add(iconImage);
  }
  const layout = () => {
    if (!iconImage) return;
    const gap = text.width > 0 ? 8 : 0;
    const total = iconImage.displayWidth + gap + text.width;
    iconImage.x = -total / 2 + iconImage.displayWidth / 2;
    text.x = iconImage.x + iconImage.displayWidth / 2 + gap + text.width / 2;
  };
  layout();

  const button = scene.add.container(x, y, [bg, content]) as Button;
  button.setSize(width + 6, height + 6).setInteractive({ useHandCursor: true });
  button.setLabel = (value: string) => {
    text.setText(value.toUpperCase());
    layout();
  };

  button.on('pointerover', () => {
    draw('hover');
    audio.play('hover');
    scene.tweens.add({ targets: button, scale: 1.05, duration: 120, ease: 'Back.out' });
  });
  button.on('pointerout', () => {
    draw('idle');
    content.y = -3;
    scene.tweens.add({ targets: button, scale: 1, duration: 120 });
  });
  button.on('pointerdown', () => {
    draw('down');
    content.y = 2;
  });
  button.on('pointerup', () => {
    draw('hover');
    content.y = -3;
    audio.play('click');
    onClick();
  });
  return button;
}

/** Music or sound-effects on/off button. Narrow buttons show only the icon. */
export function audioToggle(scene: Phaser.Scene, x: number, y: number, kind: 'music' | 'sfx', width = 56): void {
  let button: Button | undefined;
  const build = () => {
    button?.destroy();
    const on = kind === 'music' ? audio.musicOn : audio.sfxOn;
    const iconKey = kind === 'music' ? 'icon-music' : on ? 'icon-sound-on' : 'icon-sound-off';
    const label = width > 80 ? `${kind === 'music' ? 'Music' : 'Sound'} ${on ? 'on' : 'off'}` : '';
    const toggle = () => {
      if (kind === 'music') audio.setMusic(!on);
      else audio.setSfx(!on);
      scene.time.delayedCall(0, build);
    };
    button = createButton(scene, x, y, label, toggle, { width, height: 48, color: on ? UI.blue : 0x8a7fa8, icon: iconKey, fontSize: 18 });
  };
  build();
}

export interface Wallet {
  coin: Phaser.GameObjects.Image;
  text: Phaser.GameObjects.Text;
  set(amount: number): void;
}

/** "$123" counter pill anchored by its right edge. */
export function walletPill(scene: Phaser.Scene, right: number, y: number, amount: number): Wallet {
  pill(scene, right - 150, y, 150, 42);
  const coin = icon(scene, right - 125, y + 21, 'coin', 1.15);
  const text = scene.add.text(right - 104, y + 21, formatMoney(amount), headingStyle(24, '#ffe066')).setOrigin(0, 0.5);
  return {
    coin,
    text,
    set: (value: number) => text.setText(formatMoney(value)),
  };
}

/** Animates a number from `from` to `to`, ticking like a cash counter. */
export function countUp(
  scene: Phaser.Scene,
  from: number,
  to: number,
  { duration = 1000, delay = 0, onUpdate, onComplete }: { duration?: number; delay?: number; onUpdate: (v: number) => void; onComplete?: () => void },
): void {
  const counter = { v: from };
  let last = Math.round(from);
  onUpdate(last);
  scene.tweens.add({
    targets: counter,
    v: to,
    duration,
    delay,
    ease: 'Cubic.out',
    onUpdate: () => {
      const value = Math.round(counter.v);
      if (value === last) return;
      last = value;
      onUpdate(value);
      audio.play('tick', Math.min(12, ((value - from) / Math.max(1, to - from)) * 12));
    },
    onComplete: () => {
      onUpdate(to);
      onComplete?.();
    },
  });
}

/** Coins falling from the top of the screen, for big payouts. */
export function coinRain(scene: Phaser.Scene, count = 40, duration = 1800) {
  const emitter = scene.add.particles(0, -20, 'coin', {
    x: { min: 0, max: scene.scale.width },
    lifespan: 2600,
    speedY: { min: 220, max: 420 },
    speedX: { min: -40, max: 40 },
    gravityY: 300,
    scaleX: { start: 0.55, end: 0.1, ease: 'Sine.inOut' },
    scaleY: 0.55,
    rotate: { min: -30, max: 30 },
    frequency: duration / count,
  });
  scene.time.delayedCall(duration, () => emitter.stop());
  scene.time.delayedCall(duration + 2800, () => emitter.destroy());
  return emitter;
}

/** Rounded progress bar for character stats. */
export function statBar(scene: Phaser.Scene, x: number, y: number, w: number, fraction: number, color: number) {
  const g = scene.add.graphics();
  const h = 12;
  g.fillStyle(UI.ink);
  g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, (h + 4) / 2);
  g.fillStyle(UI.panelDark);
  g.fillRoundedRect(x, y, w, h, h / 2);
  const fill = Math.max(h, w * Phaser.Math.Clamp(fraction, 0, 1));
  g.fillStyle(color);
  g.fillRoundedRect(x, y, fill, h, h / 2);
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(x + 3, y + 2, fill - 6, 3, 1.5);
  return g;
}

/** An image displayed at its logical size (times `scale`), hi-res or not. */
export function icon(scene: Phaser.Scene, x: number, y: number, key: string, scale = 1) {
  return scene.add.image(x, y, key).setScale(scale * baseScale(key));
}

export function confettiBurst(scene: Phaser.Scene, x: number, y: number, count = 60) {
  const emitter = scene.add.particles(x, y, 'confetti', {
    emitting: false,
    lifespan: { min: 1400, max: 2400 },
    speed: { min: 220, max: 520 },
    angle: { min: 220, max: 320 },
    gravityY: 520,
    rotate: { start: 0, end: 720 },
    scaleX: { start: 1, end: 0.4 },
    scaleY: { min: 0.6, max: 1.2 },
    tint: [0xff5fa2, 0xffd23f, 0x4cc9f0, 0x80ed99, 0xb388ff, 0xff9f2e],
  });
  emitter.explode(count);
  scene.time.delayedCall(2600, () => emitter.destroy());
  return emitter;
}
