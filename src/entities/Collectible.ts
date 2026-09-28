import * as Phaser from 'phaser';
import { DEPTH } from '../config/constants';
import { baseScale } from '../art/hiRes';
import { GEM_COLORS } from '../art/palette';

export type CollectibleKind = 'coin' | 'gem' | 'bigCoin' | 'star' | 'heart';

const GLOW: Partial<Record<CollectibleKind, { scale: number; tint: number }>> = {
  star: { scale: 4, tint: 0xfff3b0 },
  heart: { scale: 2.6, tint: 0xffc6d9 },
  gem: { scale: 2.2, tint: 0xd8f4ff },
  bigCoin: { scale: 4.2, tint: 0xffe27a },
};

export class Collectible {
  collected = false;
  readonly radius: number;
  readonly tint: number;
  private readonly image: Phaser.GameObjects.Image;
  private readonly glow?: Phaser.GameObjects.Image;
  private twinkleTimer?: Phaser.Time.TimerEvent;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly kind: CollectibleKind,
    readonly x: number,
    readonly y: number,
    /** Gems: color variant. Stars: which of the level's Wish Stars this is. Coins: spin offset. */
    readonly index: number,
  ) {
    const gemColor = index % GEM_COLORS.length;
    const key = { coin: 'coin', gem: `gem-${gemColor}`, bigCoin: 'coin-big', star: 'wish-star', heart: 'heart' }[kind];
    this.tint = kind === 'gem' ? GEM_COLORS[gemColor] : kind === 'heart' ? 0xff4d6d : 0xffd23f;
    this.radius = kind === 'star' || kind === 'bigCoin' ? 22 : 13;

    const glow = GLOW[kind];
    if (glow) {
      this.glow = scene.add
        .image(x, y, 'soft-glow')
        .setScale(glow.scale * 0.3 * baseScale('soft-glow'))
        .setAlpha(0.5)
        .setTint(glow.tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.objects - 1);
      scene.tweens.add({
        targets: this.glow,
        alpha: { from: 0.35, to: 0.75 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }

    const scale = baseScale(key);
    this.image = scene.add.image(x, y, key).setScale(scale).setDepth(DEPTH.objects);
    scene.tweens.add({
      targets: this.glow ? [this.image, this.glow] : this.image,
      y: y - 6,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: (index * 90) % 1000,
    });

    if (kind === 'coin' || kind === 'bigCoin') {
      // A flat coin "spins" by squashing horizontally.
      scene.tweens.add({
        targets: this.image,
        scaleX: scale * 0.12,
        duration: kind === 'coin' ? 420 : 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        delay: (index * 70) % 840,
      });
    } else if (kind === 'gem') {
      scene.tweens.add({
        targets: this.image,
        scaleX: scale * 0.7,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        delay: (index * 60) % 700,
      });
      this.twinkle();
    } else if (kind === 'star') {
      scene.tweens.add({
        targets: this.image,
        angle: { from: -8, to: 8 },
        duration: 1300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    }
  }

  /** Occasional sparkle so rarer pickups catch the eye. */
  private twinkle(): void {
    this.twinkleTimer = this.scene.time.addEvent({
      delay: Phaser.Math.Between(900, 1600),
      loop: true,
      callback: () => {
        const s = this.scene.add
          .image(this.x + Phaser.Math.Between(-8, 8), this.image.y + Phaser.Math.Between(-10, 6), 'twinkle')
          .setDepth(DEPTH.objects + 1)
          .setScale(0);
        this.scene.tweens.add({ targets: s, scale: 1, angle: 90, duration: 250, yoyo: true, onComplete: () => s.destroy() });
      },
    });
  }

  collect(): void {
    this.collected = true;
    this.twinkleTimer?.remove();
    const targets = this.glow ? [this.image, this.glow] : [this.image];
    this.scene.tweens.killTweensOf(targets);
    const big = this.kind === 'star' || this.kind === 'bigCoin';
    const base = baseScale(this.image.texture.key);
    this.image.setScale(base);
    this.scene.tweens.add({
      targets,
      y: this.image.y - 24,
      scale: (target: Phaser.GameObjects.Image) => target.scale * (big ? 2 : 1.6),
      alpha: 0,
      duration: big ? 420 : 260,
      ease: 'Quad.out',
      onComplete: () => targets.forEach((t) => t.destroy()),
    });
  }
}
