import * as Phaser from 'phaser';
import type { CharacterDef } from '../characters/characters';
import { EAR_LAYOUT, FACE, TAIL_LAYOUT } from './characterTextures';
import { HI_RES } from './hiRes';

export type RigPose = 'idle' | 'run' | 'jump' | 'fall' | 'hurt' | 'celebrate';

interface Spring {
  value: number;
  velocity: number;
}

const spring = (value: number): Spring => ({ value, velocity: 0 });

function stepSpring(s: Spring, target: number, dt: number, stiffness: number, damping: number): void {
  const accel = (target - s.value) * stiffness - s.velocity * damping;
  s.velocity += accel * dt;
  s.value += s.velocity * dt;
}

const CENTER_Y = 24;
const SPIN_DURATION = 0.4;
const PART_SCALE = 1 / HI_RES;
const EYE_Y = FACE.eyeL[1];
const EYE_SCALE = PART_SCALE * FACE.eyeScale;

/**
 * A hero drawn as a puppet of separate parts rather than a sprite sheet, so squash/stretch,
 * floppy ears, swishing tails and facial expressions all come from code.
 * The container's origin is at the character's feet.
 *
 * Hierarchy: root (position, free for tweens) → flipper (facing) → spinner (squash, lean, flips) → parts
 */
export class CharacterRig extends Phaser.GameObjects.Container {
  private readonly flipper: Phaser.GameObjects.Container;
  private readonly spinner: Phaser.GameObjects.Container;
  private readonly parts: Phaser.GameObjects.Image[] = [];
  private readonly earL: Phaser.GameObjects.Image;
  private readonly earR: Phaser.GameObjects.Image;
  private readonly footL: Phaser.GameObjects.Image;
  private readonly footR: Phaser.GameObjects.Image;
  private readonly eyeL: Phaser.GameObjects.Image;
  private readonly eyeR: Phaser.GameObjects.Image;
  private readonly mouth: Phaser.GameObjects.Image;
  private readonly tail: Phaser.GameObjects.Image;

  private readonly scaleXSpring = spring(1);
  private readonly scaleYSpring = spring(1);
  private readonly earLSpring = spring(-0.28);
  private readonly earRSpring = spring(0.28);
  private readonly tailSpring = spring(-1.1);

  private readonly eyeKey: string;
  private readonly earFlop: number;
  private readonly tailLayout: (typeof TAIL_LAYOUT)[keyof typeof TAIL_LAYOUT];

  private facing = 1;
  private flip = 1;
  private elapsed = Math.random() * 10;
  private runPhase = 0;
  private blinkIn = 2;
  private blinkLeft = 0;
  private spinLeft = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly character: CharacterDef,
  ) {
    super(scene, x, y);
    this.flipper = new Phaser.GameObjects.Container(scene, 0, 0);
    this.spinner = new Phaser.GameObjects.Container(scene, 0, -CENTER_Y);
    this.add(this.flipper);
    this.flipper.add(this.spinner);

    const id = character.id;
    const ear = EAR_LAYOUT[character.ears];
    this.earFlop = ear.flop;
    this.tailLayout = TAIL_LAYOUT[character.tail];
    this.eyeKey = `${id}-eye`;

    const part = (key: string, px: number, py: number, ox = 0.5, oy = 0.5) => {
      const img = new Phaser.GameObjects.Image(scene, px, py, key).setOrigin(ox, oy).setScale(PART_SCALE);
      this.spinner.add(img);
      this.parts.push(img);
      return img;
    };

    const t = this.tailLayout;
    // The cat tail sits behind everything; the scarf/cape wraps over the ears' base.
    this.tail = part(`${id}-tail`, t.x, t.y, t.ox, t.oy);
    this.earL = part(`${id}-ear`, -ear.x, ear.y, 0.5, 1);
    this.earR = part(`${id}-ear`, ear.x, ear.y, 0.5, 1);
    part(`${id}-body`, 0, -3);
    part(`${id}-neck`, 1, FACE.neckY);
    this.footL = part(`${id}-foot`, -9, 18);
    this.footR = part(`${id}-foot`, 10, 18);
    part('face-cheek', FACE.cheekL[0], FACE.cheekL[1]);
    part('face-cheek', FACE.cheekR[0], FACE.cheekR[1]);
    this.eyeL = part(this.eyeKey, FACE.eyeL[0], EYE_Y);
    this.eyeR = part(this.eyeKey, FACE.eyeR[0], EYE_Y);
    this.mouth = part('face-mouth-smile', FACE.mouth[0], FACE.mouth[1]);

    scene.add.existing(this);
  }

  setFacing(direction: number): this {
    this.facing = direction < 0 ? -1 : 1;
    return this;
  }

  /** Turns the hero into a dark mystery silhouette (for locked characters). */
  setSilhouette(on: boolean): this {
    for (const p of this.parts) {
      if (p.texture.key === 'face-cheek') p.setVisible(!on);
      else if (on) p.setTintFill(0x2a1650);
      else p.clearTint();
    }
    return this;
  }

  /** Landing impact – the springs bounce back for a jelly wobble. */
  squash(strength: number): void {
    this.scaleXSpring.value = 1 + 0.35 * strength;
    this.scaleYSpring.value = 1 - 0.3 * strength;
    this.scaleXSpring.velocity = 0;
    this.scaleYSpring.velocity = 0;
  }

  stretch(): void {
    this.scaleXSpring.value = 0.8;
    this.scaleYSpring.value = 1.22;
  }

  spin(): void {
    this.spinLeft = Math.PI * 2;
    this.scaleXSpring.value = 0.9;
    this.scaleYSpring.value = 1.1;
  }

  animate(deltaMs: number, pose: RigPose, vx: number, vy: number): void {
    const dt = Math.min(deltaMs, 40) / 1000;
    this.elapsed += dt;
    const t = this.elapsed;

    let sx = 1;
    let sy = 1;
    let lean = 0;
    let bob = 0;
    let spread = 0.28;
    let tilt = 0;
    let tail = -1.1;
    let eyeKey = this.eyeKey;
    let mouthKey = 'face-mouth-smile';
    let footLX = -9;
    let footLY = 18;
    let footRX = 10;
    let footRY = 18;

    switch (pose) {
      case 'idle': {
        const breathe = Math.sin(t * 3.2) * 0.03;
        sy = 1 + breathe;
        sx = 1 - breathe;
        tilt = Math.sin(t * 1.7) * 0.08;
        tail = -1.15 + Math.sin(t * 2.4) * 0.12;
        break;
      }
      case 'run': {
        this.runPhase += dt * (6 + Math.abs(vx) * 0.04);
        const s = Math.sin(this.runPhase);
        const c = Math.cos(this.runPhase);
        footLX = -9 + c * 6;
        footLY = 18 - Math.max(0, s) * 6;
        footRX = 10 - c * 6;
        footRY = 18 - Math.max(0, -s) * 6;
        bob = -Math.abs(s) * 3;
        lean = 0.12;
        tilt = -0.45;
        spread = 0.2;
        tail = -0.2 + Math.sin(t * 22) * 0.15;
        break;
      }
      case 'jump':
        sx = 0.9;
        sy = 1.1;
        tilt = -0.35;
        spread = 0.12;
        tail = -1.35;
        footLX = -11;
        footRX = 12;
        footLY = footRY = 14;
        mouthKey = 'face-mouth-open';
        break;
      case 'fall':
        sx = 0.97;
        sy = 1.04;
        spread = 0.6 + Math.sin(t * 24) * 0.08;
        tail = 0.5 + Math.sin(t * 16) * 0.2;
        footLY = footRY = 20;
        mouthKey = 'face-mouth-open';
        break;
      case 'hurt':
        sx = 1.08;
        sy = 0.94;
        spread = 0.95;
        tail = -0.6;
        eyeKey = 'face-eye-hurt';
        mouthKey = 'face-mouth-open';
        break;
      case 'celebrate':
        spread = 0.45 + Math.sin(t * 12) * 0.2;
        bob = -Math.abs(Math.sin(t * 8)) * 6;
        tail = Math.sin(t * 14) * 0.4 - 0.4;
        eyeKey = 'face-eye-happy';
        mouthKey = 'face-mouth-grin';
        break;
    }

    const flop = this.earFlop;
    stepSpring(this.scaleXSpring, sx, dt, 260, 14);
    stepSpring(this.scaleYSpring, sy, dt, 260, 14);
    stepSpring(this.earLSpring, (-spread + tilt) * flop - 0.28 * (1 - flop), dt, 140, 9);
    stepSpring(this.earRSpring, (spread + tilt) * flop + 0.28 * (1 - flop), dt, 140, 9);
    stepSpring(this.tailSpring, tail, dt, 110, 8);

    let spinRotation = 0;
    if (this.spinLeft > 0) {
      this.spinLeft = Math.max(0, this.spinLeft - (dt * Math.PI * 2) / SPIN_DURATION);
      spinRotation = this.spinLeft > 0 ? Math.PI * 2 - this.spinLeft : 0;
    }

    const scaleY = this.scaleYSpring.value;
    this.spinner.setScale(this.scaleXSpring.value, scaleY);
    this.spinner.y = -CENTER_Y * scaleY + bob;
    this.spinner.rotation = lean + spinRotation;

    this.earL.rotation = this.earLSpring.value;
    this.earR.rotation = this.earRSpring.value;
    this.tail.rotation = (this.tailSpring.value + this.tailLayout.rest) * this.tailLayout.swing;
    this.footL.setPosition(footLX, footLY);
    this.footR.setPosition(footRX, footRY);

    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkLeft = 0.13;
      this.blinkIn = Phaser.Math.FloatBetween(1.8, 4.5);
    }
    this.blinkLeft -= dt;
    const blinking = eyeKey === this.eyeKey && this.blinkLeft > 0;
    const look = Phaser.Math.Clamp(vy * 0.004, -2, 2.5);
    for (const eye of [this.eyeL, this.eyeR]) {
      if (eye.texture.key !== eyeKey) eye.setTexture(eyeKey);
      eye.setScale(EYE_SCALE, EYE_SCALE * (blinking ? 0.15 : 1));
      eye.y = EYE_Y + look;
    }
    this.eyeR.setFlipX(eyeKey === 'face-eye-hurt');
    if (this.mouth.texture.key !== mouthKey) this.mouth.setTexture(mouthKey);

    this.flip = Phaser.Math.Linear(this.flip, this.facing, Math.min(1, dt * 22));
    this.flipper.scaleX = this.flip;
  }
}
