import * as Phaser from 'phaser';
import { DEPTH, PLAYER } from '../config/constants';
import { CharacterRig, RigPose } from '../art/CharacterRig';
import type { CharacterDef } from '../characters/characters';
import type { Controls } from '../input/Controls';

type SpecialState = 'none' | 'faint' | 'portal';

const RIG_SCALE = 1.12;

function approach(value: number, target: number, step: number): number {
  return value < target ? Math.min(value + step, target) : Math.max(value - step, target);
}

/**
 * The hero's physics and controls. The invisible arcade sprite is the hitbox; `rig` is the visual puppet.
 *
 * Emits: 'jump' (x, y), 'doubleJump' (x, y), 'land' (x, y, strength), 'step' (x, y)
 */
export class Player extends Phaser.Events.EventEmitter {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly rig: CharacterRig;

  private facing: 1 | -1 = 1;
  private coyoteMs = 0;
  private jumpBufferMs = 0;
  private airJumpAvailable = true;
  private jumpCutAvailable = false;
  private wasGrounded = false;
  private lastAirVy = 0;
  private hurtMs = 0;
  private invulnerableMs = 0;
  private stepMs = 0;
  private special: SpecialState = 'none';
  private readonly runSpeed: number;
  private readonly jumpVelocity: number;
  private readonly doubleJumpVelocity: number;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    y: number,
    private readonly controls: Controls,
    readonly character: CharacterDef,
  ) {
    super();
    this.sprite = scene.physics.add.sprite(x, y, 'px').setVisible(false);
    this.body.setSize(PLAYER.hitboxWidth, PLAYER.hitboxHeight);
    this.body.setMaxVelocityY(PLAYER.maxFallSpeed);
    this.sprite.setCollideWorldBounds(true);

    this.runSpeed = PLAYER.runSpeed * character.stats.speed;
    this.jumpVelocity = PLAYER.jumpVelocity * character.stats.jump;
    this.doubleJumpVelocity = PLAYER.doubleJumpVelocity * character.stats.jump;
    this.rig = new CharacterRig(scene, x, y + PLAYER.hitboxHeight / 2, character).setScale(RIG_SCALE).setDepth(DEPTH.player);
  }

  get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  get center(): Phaser.Math.Vector2 {
    return this.body.center;
  }

  get facingDirection(): number {
    return this.facing;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableMs > 0 || this.special !== 'none';
  }

  get bounds(): Phaser.Geom.Rectangle {
    const b = this.body;
    return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
  }

  update(deltaMs: number): void {
    this.invulnerableMs = Math.max(0, this.invulnerableMs - deltaMs);
    this.hurtMs = Math.max(0, this.hurtMs - deltaMs);
    if (this.special === 'none') this.updateMovement(deltaMs);
    this.updateRig(deltaMs);
  }

  private updateMovement(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const body = this.body;
    const grounded = body.blocked.down || body.touching.down;

    if (grounded) {
      if (!this.wasGrounded && this.lastAirVy > 150) {
        const strength = Phaser.Math.Clamp(this.lastAirVy / PLAYER.maxFallSpeed, 0.2, 1);
        this.rig.squash(strength);
        this.emit('land', body.center.x, body.bottom, strength);
      }
      this.coyoteMs = PLAYER.coyoteMs;
      this.airJumpAvailable = true;
    } else {
      this.coyoteMs -= deltaMs;
      this.lastAirVy = body.velocity.y;
    }
    this.wasGrounded = grounded;

    const canControl = this.hurtMs <= 0;
    const input = canControl ? Number(this.controls.right) - Number(this.controls.left) : 0;
    if (input !== 0) this.facing = input > 0 ? 1 : -1;

    if (canControl) {
      const target = input * this.runSpeed;
      const accel = grounded ? (input !== 0 ? PLAYER.groundAccel : PLAYER.groundDecel) : PLAYER.airAccel;
      body.setVelocityX(approach(body.velocity.x, target, accel * dt));
    }

    if (this.controls.jumpPressed) this.jumpBufferMs = PLAYER.jumpBufferMs;
    else this.jumpBufferMs -= deltaMs;

    if (canControl && this.jumpBufferMs > 0) {
      if (this.coyoteMs > 0) this.jump(false);
      else if (this.airJumpAvailable) this.jump(true);
    }

    // Releasing jump early gives a shorter hop.
    if (this.jumpCutAvailable && !this.controls.jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * PLAYER.jumpCutMultiplier);
      this.jumpCutAvailable = false;
    }
    if (body.velocity.y >= 0) this.jumpCutAvailable = false;

    if (grounded && Math.abs(body.velocity.x) > 160) {
      this.stepMs -= deltaMs;
      if (this.stepMs <= 0) {
        this.stepMs = 150;
        this.emit('step', body.center.x - this.facing * 8, body.bottom);
      }
    }
  }

  private jump(isAirJump: boolean): void {
    const body = this.body;
    this.jumpBufferMs = 0;
    this.coyoteMs = 0;
    this.jumpCutAvailable = true;
    this.wasGrounded = false;
    if (isAirJump) {
      this.airJumpAvailable = false;
      body.setVelocityY(-this.doubleJumpVelocity);
      this.rig.spin();
      this.emit('doubleJump', body.center.x, body.center.y);
    } else {
      body.setVelocityY(-this.jumpVelocity);
      this.rig.stretch();
      this.emit('jump', body.center.x, body.bottom);
    }
  }

  private updateRig(deltaMs: number): void {
    const body = this.body;
    const grounded = body.blocked.down || body.touching.down;
    // Brief grace keeps the run cycle stable on bumpy or moving ground.
    const groundedPose = grounded || (this.coyoteMs > 40 && body.velocity.y >= 0);

    let pose: RigPose;
    if (this.special === 'portal') pose = 'celebrate';
    else if (this.special === 'faint' || this.hurtMs > 0) pose = 'hurt';
    else if (groundedPose) pose = Math.abs(body.velocity.x) > 25 ? 'run' : 'idle';
    else pose = body.velocity.y < 0 ? 'jump' : 'fall';

    this.rig.setFacing(this.facing);
    this.rig.animate(deltaMs, pose, body.velocity.x, body.velocity.y);
    if (this.special !== 'portal') this.rig.setPosition(body.center.x, body.bottom);

    const flicker = this.invulnerableMs > 0 && this.special === 'none' && Math.floor(this.invulnerableMs / 90) % 2 === 0;
    this.rig.setAlpha(flicker ? 0.35 : 1);
  }

  bounce(): void {
    const boost = this.controls.jumpHeld ? 1.15 : 1;
    this.body.setVelocityY(-PLAYER.stompBounce * boost);
    this.airJumpAvailable = true;
    this.jumpCutAvailable = false;
    this.rig.stretch();
  }

  hurt(sourceX: number): void {
    this.hurtMs = PLAYER.hurtLockMs;
    this.invulnerableMs = PLAYER.invulnerableMs;
    this.jumpCutAvailable = false;
    const dir = this.body.center.x < sourceX ? -1 : 1;
    this.body.setVelocity(dir * 260, -380);
  }

  /** Out of hearts: pop up, spin and tumble off-screen. */
  faint(): void {
    this.special = 'faint';
    this.body.checkCollision.none = true;
    this.body.setVelocity(0, -560);
    this.scene.tweens.add({ targets: this.rig, angle: 720, duration: 1200 });
  }

  enterPortal(x: number, y: number, onDone: () => void): void {
    this.special = 'portal';
    this.body.setVelocity(0, 0);
    this.body.setAllowGravity(false);
    this.body.checkCollision.none = true;
    this.scene.tweens.add({
      targets: this.rig,
      x,
      y: y + 24,
      scale: 0,
      angle: 720,
      duration: 1000,
      ease: 'Back.easeIn',
      onComplete: onDone,
    });
  }

  respawnAt(x: number, y: number): void {
    this.special = 'none';
    this.scene.tweens.killTweensOf(this.rig);
    this.rig.setScale(RIG_SCALE).setAngle(0).setAlpha(1);
    this.body.checkCollision.none = false;
    this.body.setAllowGravity(true);
    this.body.reset(x, y);
    this.facing = 1;
    this.hurtMs = 0;
    this.invulnerableMs = 1200;
    this.wasGrounded = false;
    this.lastAirVy = 0;
  }
}
