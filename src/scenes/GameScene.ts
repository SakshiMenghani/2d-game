import * as Phaser from 'phaser';
import { DEPTH, EVENTS, MONEY, PLAYER, REWARDS, SCENES, SCORE, TILE } from '../config/constants';
import { THEMES } from '../art/themes';
import { audio } from '../audio/AudioEngine';
import { getCharacter } from '../characters/characters';
import { LEVELS } from '../levels';
import { parseLevel } from '../levels/parser';
import type { EntitySpawn, LevelDefinition, ParsedLevel } from '../levels/types';
import { Controls } from '../input/Controls';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { Bloblet } from '../entities/enemies/Bloblet';
import { Fluffmoth } from '../entities/enemies/Fluffmoth';
import { Collectible } from '../entities/Collectible';
import { Checkpoint } from '../entities/Checkpoint';
import { Chest } from '../entities/Chest';
import { Portal } from '../entities/Portal';
import { MovingPlatform } from '../entities/MovingPlatform';
import { Effects } from '../systems/Effects';
import { ParallaxBackground } from '../systems/ParallaxBackground';
import { Terrain } from '../world/Terrain';
import { runState } from '../state/RunState';
import { save } from '../state/SaveData';

type PlayState = 'playing' | 'respawning' | 'complete';

export interface GameSceneData {
  levelIndex?: number;
}

const RESPAWN_OFFSET_Y = PLAYER.hitboxHeight / 2 + 2;

export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private level!: ParsedLevel;
  private terrain!: Terrain;
  private parallax!: ParallaxBackground;
  private effects!: Effects;
  private controls!: Controls;
  private player!: Player;
  private portal?: Portal;
  private enemies: Enemy[] = [];
  private collectibles: Collectible[] = [];
  private checkpoints: Checkpoint[] = [];
  private chests: Chest[] = [];
  private movers: MovingPlatform[] = [];
  private hazards: Phaser.Geom.Rectangle[] = [];
  private readonly respawnPoint = new Phaser.Math.Vector2();
  private playState: PlayState = 'playing';
  private combo = 0;
  private comboTimerMs = 0;

  constructor() {
    super(SCENES.GAME);
  }

  init(data: GameSceneData): void {
    this.levelIndex = data.levelIndex ?? 0;
    this.enemies = [];
    this.collectibles = [];
    this.checkpoints = [];
    this.chests = [];
    this.movers = [];
    this.hazards = [];
    this.portal = undefined;
    this.playState = 'playing';
    this.combo = 0;
    this.comboTimerMs = 0;
  }

  create(): void {
    const def = LEVELS[this.levelIndex];
    const character = getCharacter(save.selected);
    this.level = parseLevel(def);
    const count = (kind: string) => this.level.entities.filter((e) => e.kind === kind).length;
    runState.startLevel(this.levelIndex, {
      starCount: this.level.starCount,
      totalMoney:
        count('coin') * MONEY.coin + count('gem') * MONEY.gem + count('bigCoin') * MONEY.bigCoin + count('chest') * MONEY.chest,
      totalChests: count('chest'),
      maxHealth: character.stats.hearts,
    });

    this.parallax = new ParallaxBackground(this, THEMES[def.theme]);
    this.terrain = new Terrain(this, this.level);
    this.effects = new Effects(this);
    this.controls = new Controls(this);

    const { widthPx, heightPx, spawn } = this.level;
    this.physics.world.setBounds(0, -TILE * 4, widthPx, heightPx + TILE * 8);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.respawnPoint.set(spawn.x, spawn.bottom - RESPAWN_OFFSET_Y);
    this.player = new Player(this, this.respawnPoint.x, this.respawnPoint.y, this.controls, character);
    this.wirePlayerEffects();

    let starIndex = 0;
    for (const entity of this.level.entities) {
      this.spawnEntity(entity, def, entity.kind === 'star' ? starIndex++ : 0);
    }

    this.setupCollisions();
    this.setupCamera();

    this.input.keyboard?.on('keydown-ESC', () => this.openPause());
    this.input.keyboard?.on('keydown-P', () => this.openPause());

    this.scene.launch(SCENES.UI);
    this.scene.bringToTop(SCENES.UI);
    this.time.delayedCall(300, () => this.game.events.emit(EVENTS.BANNER, def.label, def.name));
    audio.playMusic(THEMES[def.theme].music);
  }

  private spawnEntity(e: EntitySpawn, def: LevelDefinition, starIndex: number): void {
    const moverSpeed = def.movers?.speed ?? 85;
    switch (e.kind) {
      case 'coin':
      case 'gem':
      case 'bigCoin':
        this.collectibles.push(new Collectible(this, e.kind, e.x, e.y, e.col));
        break;
      case 'star':
        this.collectibles.push(new Collectible(this, 'star', e.x, e.y, starIndex));
        break;
      case 'heart':
        this.collectibles.push(new Collectible(this, 'heart', e.x, e.y, 0));
        break;
      case 'chest':
        this.chests.push(new Chest(this, e.x, e.bottom));
        break;
      case 'bloblet':
        this.enemies.push(new Bloblet(this, e.x, e.bottom, this.terrain));
        break;
      case 'fluffmoth':
        this.enemies.push(new Fluffmoth(this, e.x, e.y));
        break;
      case 'thorns':
        this.add.image(e.col * TILE, e.bottom, 'thorns').setOrigin(0, 1).setDepth(DEPTH.objects);
        this.hazards.push(new Phaser.Geom.Rectangle(e.col * TILE + 6, e.bottom - 20, TILE - 12, 20));
        break;
      case 'checkpoint':
        this.checkpoints.push(new Checkpoint(this, e.x, e.bottom));
        break;
      case 'portal':
        this.portal = new Portal(this, e.x, e.bottom);
        break;
      case 'moverH':
        this.movers.push(
          new MovingPlatform(this, e.col * TILE, e.row * TILE, 'h', (def.movers?.horizontalRange ?? 4) * TILE, moverSpeed),
        );
        break;
      case 'moverV':
        this.movers.push(
          new MovingPlatform(this, e.col * TILE, e.row * TILE, 'v', (def.movers?.verticalRange ?? 4) * TILE, moverSpeed * 0.8),
        );
        break;
      case 'player':
        break;
    }
  }

  private setupCollisions(): void {
    const player = this.player.sprite;
    this.physics.add.collider(player, this.terrain.colliders);
    this.physics.add.collider(
      player,
      this.movers.map((m) => m.sprite),
    );

    const walkers = this.enemies.filter((e) => e.usesGravity).map((e) => e.sprite);
    this.physics.add.collider(walkers, this.terrain.colliders);

    this.physics.add.overlap(
      player,
      this.enemies.map((e) => e.sprite),
      (_player, other) => {
        const enemy = (other as Phaser.Types.Physics.Arcade.GameObjectWithBody).getData('enemy') as Enemy | undefined;
        if (enemy) this.handleEnemyContact(enemy);
      },
    );
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.level.widthPx, this.level.heightPx);
    cam.startFollow(this.player.sprite, false, 0.12, 0.12);
    cam.fadeIn(400, 255, 255, 255);
  }

  private wirePlayerEffects(): void {
    this.player.on('jump', (x: number, y: number) => {
      this.effects.dust(x, y, 6);
      audio.play('jump');
    });
    this.player.on('doubleJump', (x: number, y: number) => {
      this.effects.ring(x, y, 0xfff3b0);
      this.effects.burst(x, y + 10, [0xfff3b0, 0xffc6ff, 0xb5f5ff], 8);
      audio.play('doubleJump');
    });
    this.player.on('land', (x: number, y: number, strength: number) => {
      this.effects.dust(x, y, Math.round(4 + strength * 8));
      if (strength > 0.3) audio.play('land');
    });
    this.player.on('step', (x: number, y: number) => this.effects.dust(x, y, 1));
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50);
    this.controls.update();
    this.movers.forEach((m) => m.update());
    this.player.update(dt);
    this.enemies.forEach((e) => e.update(dt, this.time.now));
    this.portal?.update(dt);
    this.parallax.update(this.cameras.main.scrollX, dt);
    this.updateCameraLookahead(dt);

    if (this.playState !== 'playing') return;
    runState.timeMs += dt;
    this.updateCombo(dt);
    this.checkCollectibles();
    this.checkChests();
    this.checkHazards();
    this.checkCheckpoints();
    this.checkPortal();
    this.checkFall();
  }

  private updateCameraLookahead(deltaMs: number): void {
    const cam = this.cameras.main;
    const target = -this.player.facingDirection * 70;
    cam.followOffset.x = Phaser.Math.Linear(cam.followOffset.x, target, Math.min(1, (deltaMs / 1000) * 2.5));
  }

  private openPause(): void {
    if (this.playState !== 'playing' || !this.scene.isActive()) return;
    this.scene.pause();
    this.scene.launch(SCENES.PAUSE, { levelIndex: this.levelIndex });
    audio.duck(true);
    audio.play('click');
  }

  /** World position → screen position (the HUD lives in screen space). */
  private toScreen(x: number, y: number): { x: number; y: number } {
    const view = this.cameras.main.worldView;
    return { x: x - view.x, y: y - view.y };
  }

  // --- Interactions --------------------------------------------------------

  private handleEnemyContact(enemy: Enemy): void {
    if (!enemy.alive || this.playState !== 'playing') return;
    const pb = this.player.body;
    const eb = enemy.body;
    const previousBottom = pb.prev.y + pb.height;
    const stomped = pb.velocity.y > 0 && previousBottom <= eb.top + 14;

    if (stomped) {
      enemy.defeat();
      this.player.bounce();
      runState.addScore(enemy.scoreValue);
      runState.enemiesBopped += 1;
      audio.play('stomp');
      this.effects.burst(eb.center.x, eb.center.y, [0xff8fc7, 0xfff3b0, 0xb5f5ff], 14);
      this.effects.ring(eb.center.x, eb.center.y, 0xffc6ff);
      this.effects.floatText(eb.center.x, eb.top - 10, `BOP! +${enemy.scoreValue}`, '#ffe066', 22);
      this.hudChanged();
    } else {
      this.hurtPlayer(eb.center.x);
    }
  }

  private updateCombo(deltaMs: number): void {
    if (this.combo === 0) return;
    this.comboTimerMs -= deltaMs;
    if (this.comboTimerMs <= 0) this.combo = 0;
  }

  /** Returns the combo count after this pickup. */
  private registerCombo(x: number, y: number): number {
    this.combo += 1;
    this.comboTimerMs = REWARDS.comboWindowMs;
    runState.bestCombo = Math.max(runState.bestCombo, this.combo);
    if (this.combo % REWARDS.comboStep === 0) {
      const bonus = this.combo * SCORE.comboPerPickup;
      runState.addScore(bonus);
      this.effects.ring(x, y, 0xffd23f);
      this.game.events.emit(EVENTS.COMBO, this.combo, bonus);
      audio.play('combo', Math.min(this.combo / REWARDS.comboStep - 1, 6) * 2);
    }
    return this.combo;
  }

  private collectMoney(x: number, y: number, amount: number, score: number): number {
    const screen = this.toScreen(x, y);
    this.game.events.emit(EVENTS.COLLECT, 'money', screen.x, screen.y, amount);
    runState.addMoney(amount);
    runState.addScore(score);
    return this.registerCombo(x, y);
  }

  private checkCollectibles(): void {
    const pc = this.player.center;
    for (const c of this.collectibles) {
      if (c.collected) continue;
      if (Phaser.Math.Distance.Between(pc.x, pc.y, c.x, c.y) > c.radius + 20) continue;
      c.collect();
      const screen = this.toScreen(c.x, c.y);
      switch (c.kind) {
        case 'coin': {
          const combo = this.collectMoney(c.x, c.y, MONEY.coin, SCORE.coin);
          this.effects.burst(c.x, c.y, [0xffd23f, 0xfff3b0], 5);
          audio.play('coin', Math.min(combo - 1, 12));
          break;
        }
        case 'gem':
          this.collectMoney(c.x, c.y, MONEY.gem, SCORE.gem);
          this.effects.burst(c.x, c.y, [c.tint, 0xffffff], 12);
          this.effects.floatText(c.x, c.y - 24, `+$${MONEY.gem}`, '#9ff3ff', 22);
          audio.play('gem');
          break;
        case 'bigCoin':
          this.collectMoney(c.x, c.y, MONEY.bigCoin, SCORE.bigCoin);
          this.effects.burst(c.x, c.y, [0xffd23f, 0xfff3b0, 0xffffff], 26);
          this.effects.ring(c.x, c.y, 0xffd23f);
          this.effects.floatText(c.x, c.y - 30, `JACKPOT! +$${MONEY.bigCoin}`, '#ffe066', 28);
          this.cameras.main.flash(160, 255, 240, 170);
          audio.play('bigCoin');
          break;
        case 'star':
          this.game.events.emit(EVENTS.COLLECT, 'star', screen.x, screen.y, 1, c.index);
          runState.collectStar(c.index);
          runState.addScore(SCORE.star);
          this.effects.burst(c.x, c.y, [0xffd23f, 0xfff3b0, 0xffffff], 30);
          this.effects.ring(c.x, c.y, 0xffd23f);
          this.cameras.main.flash(220, 255, 250, 210);
          this.game.events.emit(EVENTS.STAR_BANNER, runState.starsCollected, runState.stars.length);
          audio.play('star');
          break;
        case 'heart':
          if (runState.health < runState.maxHealth) {
            runState.heal(1);
            this.effects.floatText(c.x, c.y - 24, '+1 ♥', '#ff8fab');
          } else {
            runState.addScore(SCORE.heartBonus);
            this.effects.floatText(c.x, c.y - 24, `+${SCORE.heartBonus}`);
          }
          this.effects.heartBurst(c.x, c.y, 8);
          audio.play('heart');
          break;
      }
      this.hudChanged();
    }
  }

  private checkChests(): void {
    const pc = this.player.center;
    for (const chest of this.chests) {
      if (chest.opened) continue;
      if (Math.abs(pc.x - chest.x) > 34 || Math.abs(pc.y - chest.centerY) > 40) continue;
      chest.open();
      runState.chestsOpened += 1;
      runState.addMoney(MONEY.chest);
      runState.addScore(SCORE.chest);
      const screen = this.toScreen(chest.x, chest.centerY);
      this.game.events.emit(EVENTS.COLLECT, 'money', screen.x, screen.y - 10, MONEY.chest);
      this.coinFountain(chest.x, chest.centerY - 10);
      this.effects.burst(chest.x, chest.centerY, [0xffd23f, 0xff5fa2, 0x4cc9f0, 0x80ed99], 36);
      this.effects.floatText(chest.x, chest.centerY - 50, `TREASURE! +$${MONEY.chest}`, '#ffe066', 30);
      this.cameras.main.shake(200, 0.004);
      audio.play('chest');
      this.hudChanged();
    }
  }

  /** Decorative spray of spinning coins (the real reward flies to the HUD). */
  private coinFountain(x: number, y: number): void {
    const emitter = this.add.particles(x, y, 'coin', {
      emitting: false,
      lifespan: { min: 700, max: 1100 },
      speed: { min: 260, max: 480 },
      angle: { min: 235, max: 305 },
      gravityY: 1100,
      scaleX: { start: 0.5, end: 0.1, ease: 'Sine.inOut' },
      scaleY: 0.5,
      alpha: { start: 1, end: 0.3 },
    });
    emitter.setDepth(DEPTH.effects);
    emitter.explode(22);
    this.time.delayedCall(1300, () => emitter.destroy());
  }

  private checkHazards(): void {
    const bounds = this.player.bounds;
    for (const hazard of this.hazards) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, hazard)) {
        this.hurtPlayer(hazard.centerX);
        return;
      }
    }
  }

  private checkCheckpoints(): void {
    const pc = this.player.center;
    for (const cp of this.checkpoints) {
      if (cp.activated) continue;
      if (Math.abs(pc.x - cp.x) < 30 && pc.y > cp.groundY - 110 && pc.y < cp.groundY + 10) {
        cp.activate();
        this.respawnPoint.set(cp.x, cp.groundY - RESPAWN_OFFSET_Y);
        runState.restoreHealth();
        this.effects.burst(cp.x, cp.flowerY, [0xff9ec7, 0xffe066, 0xffffff], 20);
        this.effects.floatText(cp.x, cp.flowerY - 40, 'CHECKPOINT!', '#ffe066', 24);
        audio.play('checkpoint');
        this.hudChanged();
      }
    }
  }

  private checkPortal(): void {
    if (!this.portal) return;
    const pc = this.player.center;
    if (Phaser.Math.Distance.Between(pc.x, pc.y, this.portal.centerX, this.portal.centerY) < 50) this.completeLevel();
  }

  private checkFall(): void {
    if (this.player.body.top <= this.level.heightPx + 60) return;
    runState.damage(1);
    this.combo = 0;
    this.hudChanged();
    audio.play('hurt');
    if (runState.health <= 0) this.loseLife(false);
    else this.respawn();
  }

  private hurtPlayer(sourceX: number): void {
    if (this.player.isInvulnerable || this.playState !== 'playing') return;
    runState.damage(1);
    this.combo = 0;
    this.hudChanged();
    this.cameras.main.shake(160, 0.006);
    const pc = this.player.center;
    this.effects.heartBurst(pc.x, pc.y - 10, 5);
    audio.play('hurt');
    if (runState.health <= 0) {
      this.loseLife(true);
      return;
    }
    this.player.hurt(sourceX);
  }

  private loseLife(animate: boolean): void {
    this.playState = 'respawning';
    runState.loseLife();
    this.hudChanged();
    if (animate) this.player.faint();
    if (runState.lives > 0) audio.play('lose');
    else audio.stopMusic();
    this.time.delayedCall(animate ? 1300 : 400, () => {
      if (runState.lives <= 0) {
        this.scene.pause();
        this.scene.launch(SCENES.GAME_OVER, { levelIndex: this.levelIndex });
        return;
      }
      runState.restoreHealth();
      this.hudChanged();
      this.respawn();
    });
  }

  private respawn(): void {
    this.playState = 'respawning';
    const cam = this.cameras.main;
    cam.fadeOut(220, 255, 255, 255);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.player.respawnAt(this.respawnPoint.x, this.respawnPoint.y);
      cam.startFollow(this.player.sprite, false, 0.12, 0.12);
      cam.fadeIn(300, 255, 255, 255);
      this.playState = 'playing';
    });
  }

  private completeLevel(): void {
    if (!this.portal) return;
    this.playState = 'complete';
    runState.addScore(SCORE.levelComplete);
    this.hudChanged();
    this.portal.celebrate();
    audio.stopMusic();
    audio.play('portal');
    this.effects.floatText(this.portal.centerX, this.portal.centerY - 100, 'HOORAY!', '#ffe066', 40);
    this.player.enterPortal(this.portal.centerX, this.portal.centerY, () => {
      this.time.delayedCall(350, () => {
        this.scene.pause();
        this.scene.launch(SCENES.LEVEL_COMPLETE, { levelIndex: this.levelIndex });
      });
    });
  }

  private hudChanged(): void {
    this.game.events.emit(EVENTS.HUD_CHANGED);
  }
}
