import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/constants';
import { cssColor } from '../art/drawUtils';
import { getCharacter } from '../characters/characters';
import { LEVELS } from '../levels';
import { formatTime, runState } from '../state/RunState';
import { audio } from '../audio/AudioEngine';
import { formatMoney, save } from '../state/SaveData';
import { audioToggle, createButton, icon, panel, pill, statBar, titleText, UI } from '../ui/kit';
import { headingStyle, textStyle } from '../ui/textStyle';

interface PauseData {
  levelIndex: number;
}

const MAX_STAT = 1.2;

export class PauseScene extends Phaser.Scene {
  private levelIndex = 0;

  constructor() {
    super(SCENES.PAUSE);
  }

  create(data: PauseData): void {
    this.levelIndex = data.levelIndex;
    this.scene.bringToTop();
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x12072e, 0.6).setOrigin(0);

    this.buildMenu();
    this.buildStats();

    this.input.keyboard?.once('keydown-ESC', () => this.resume());
    this.input.keyboard?.once('keydown-P', () => this.resume());
  }

  private buildMenu(): void {
    const def = LEVELS[this.levelIndex];
    const x = 40;
    const w = 320;
    const cx = x + w / 2;
    panel(this, x, 36, w, 468);

    titleText(this, cx, 88, 'PAUSED', 58);
    this.add.text(cx, 134, `${def.label}  •  ${def.name}`, headingStyle(17, '#bfe9ff')).setOrigin(0.5);
    pill(this, cx - 62, 152, 124, 34);
    icon(this, cx - 38, 169, 'icon-clock', 0.75);
    this.add.text(cx - 18, 169, formatTime(runState.timeMs), headingStyle(20)).setOrigin(0, 0.5);

    createButton(this, cx, 236, 'Resume', () => this.resume(), { width: 260, height: 58, color: UI.green });
    createButton(this, cx, 308, 'Restart', () => this.restart(), { width: 260, height: 58, color: UI.purple });
    createButton(this, cx, 380, 'Quit to Menu', () => this.quit(), { width: 260, height: 58, color: UI.red, fontSize: 26 });

    audioToggle(this, cx - 66, 446, 'music', 124);
    audioToggle(this, cx + 66, 446, 'sfx', 124);
    this.add.text(cx, 486, 'ESC to resume', textStyle(12, '#bfb3e6')).setOrigin(0.5);
  }

  private buildStats(): void {
    const character = getCharacter(save.selected);
    const x = 392;
    const w = 528;
    panel(this, x, 36, w, 468);

    const ring = this.add.graphics();
    ring.fillStyle(UI.ink);
    ring.fillCircle(x + 56, 92, 36);
    ring.fillStyle(character.colors.portraitTop);
    ring.fillCircle(x + 56, 92, 32);
    icon(this, x + 56, 94, `${character.id}-icon`, 1.25);
    titleText(this, x + 104, 80, character.name.toUpperCase(), 36).setOrigin(0, 0.5);
    this.add.text(x + 106, 112, character.title, headingStyle(17, cssColor(character.colors.tip))).setOrigin(0, 0.5);

    this.sectionTitle(x + 28, 150, 'HERO STATS');
    const barX = x + 150;
    const barW = w - 190;
    this.statLabel(x + 28, 180, 'icon-bolt', 'Speed');
    statBar(this, barX, 174, barW, character.stats.speed / MAX_STAT, UI.yellow);
    this.statLabel(x + 28, 208, 'icon-jump', 'Jump');
    statBar(this, barX, 202, barW, character.stats.jump / MAX_STAT, UI.green);
    this.statLabel(x + 28, 236, 'heart', 'Hearts', 0.55);
    for (let i = 0; i < character.stats.hearts; i++) {
      this.add.image(barX + 10 + i * 26, 236, 'heart').setScale(0.6);
    }

    this.sectionTitle(x + 28, 276, 'LEVEL PROGRESS');
    const record = save.levelRecord(LEVELS[this.levelIndex].id);
    const rows: [string, string, string, number][] = [
      ['coin', 'Cash', `${formatMoney(runState.money)} / ${formatMoney(runState.totalMoney)}`, 0.8],
      ['star-slot-full', 'Wish Stars', `${runState.starsCollected} / ${runState.stars.length}`, 0.6],
      ['bloblet-0', 'Friends bopped', `${runState.enemiesBopped}`, 0.5],
      ['chest-closed', 'Treasure', `${runState.chestsOpened} / ${runState.totalChests}`, 0.45],
      ['twinkle', 'Best combo', `x${runState.bestCombo}`, 1],
      ['icon-clock', 'Best score', record.bestScore ? record.bestScore.toLocaleString() : '—', 0.7],
    ];
    const colW = (w - 68) / 2;
    rows.forEach(([key, label, value, scale], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const rx = x + 28 + col * (colW + 12);
      const ry = 300 + row * 44;
      const g = this.add.graphics();
      g.fillStyle(UI.panelDark);
      g.fillRoundedRect(rx, ry, colW, 36, 10);
      icon(this, rx + 22, ry + 18, key, scale);
      this.add.text(rx + 42, ry + 18, label, textStyle(14, '#d8ccff')).setOrigin(0, 0.5);
      this.add.text(rx + colW - 12, ry + 18, value, headingStyle(18)).setOrigin(1, 0.5);
    });

    const score = this.add.text(x + w / 2, 460, `SCORE  ${runState.score.toLocaleString()}`, headingStyle(26, '#ffe066'));
    score.setOrigin(0.5);
  }

  private sectionTitle(x: number, y: number, text: string): void {
    this.add.text(x, y, text, headingStyle(18, '#7fdcff')).setOrigin(0, 0.5);
  }

  private statLabel(x: number, y: number, key: string, label: string, scale = 0.8): void {
    icon(this, x + 10, y, key, scale);
    this.add.text(x + 30, y, label, headingStyle(17)).setOrigin(0, 0.5);
  }

  private resume(): void {
    audio.duck(false);
    this.scene.resume(SCENES.GAME);
    this.scene.stop();
  }

  private restart(): void {
    runState.restartLevel();
    this.scene.stop(SCENES.UI);
    this.scene.start(SCENES.GAME, { levelIndex: this.levelIndex });
  }

  private quit(): void {
    this.scene.stop(SCENES.GAME);
    this.scene.stop(SCENES.UI);
    this.scene.start(SCENES.MENU);
  }
}
