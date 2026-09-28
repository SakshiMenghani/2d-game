import * as Phaser from 'phaser';

type Key = Phaser.Input.Keyboard.Key;

/** Keyboard input mapped to game actions. Touch/gamepad can plug in here later. */
export class Controls {
  private readonly leftKeys: Key[];
  private readonly rightKeys: Key[];
  private readonly jumpKeys: Key[];

  /** True only on the frame a jump key went down. */
  jumpPressed = false;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.leftKeys = [kb.addKey(K.LEFT), kb.addKey(K.A)];
    this.rightKeys = [kb.addKey(K.RIGHT), kb.addKey(K.D)];
    this.jumpKeys = [kb.addKey(K.SPACE), kb.addKey(K.UP), kb.addKey(K.W), kb.addKey(K.Z)];
  }

  update(): void {
    // Check every key so none keeps a stale "just down" flag into the next frame.
    this.jumpPressed = this.jumpKeys.map((k) => Phaser.Input.Keyboard.JustDown(k)).some(Boolean);
  }

  get left(): boolean {
    return this.leftKeys.some((k) => k.isDown);
  }

  get right(): boolean {
    return this.rightKeys.some((k) => k.isDown);
  }

  get jumpHeld(): boolean {
    return this.jumpKeys.some((k) => k.isDown);
  }
}
