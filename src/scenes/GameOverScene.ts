import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENES } from '../config/constants';
import { CharacterRig } from '../art/CharacterRig';
import { getCharacter } from '../characters/characters';
import { runState } from '../state/RunState';
import { audio } from '../audio/AudioEngine';
import { formatMoney, save } from '../state/SaveData';
import { createButton, panel, titleText, UI } from '../ui/kit';
import { headingStyle, textStyle } from '../ui/textStyle';

interface GameOverData {
  levelIndex: number;
}

export class GameOverScene extends Phaser.Scene {
  private hero!: CharacterRig;
  private leaving = false;

  constructor() {
    super(SCENES.GAME_OVER);
  }

  create(data: GameOverData): void {
    this.leaving = false;
    this.scene.bringToTop();
    audio.stopMusic();
    audio.play('gameOver');
    const cx = GAME_WIDTH / 2;
    const character = getCharacter(save.selected);

    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x12072e, 0.7).setOrigin(0);
    panel(this, cx - 250, 110, 500, 330);
    const title = titleText(this, cx, 116, 'OH NO!', 64, ['#ffd1e6', '#ff5f8f']).setScale(0);
    this.tweens.add({ targets: title, scale: 1, duration: 450, ease: 'Back.out' });

    this.add.ellipse(cx - 120, 332, 100, 16, 0x12072e, 0.4);
    this.hero = new CharacterRig(this, cx - 120, 330, character).setScale(character.ears === 'long' ? 1.5 : 1.8);

    this.add
      .text(cx + 80, 218, `${character.name} needs a\nlittle rest!`, { ...headingStyle(26), align: 'center' })
      .setOrigin(0.5);
    this.add
      .text(cx + 80, 282, `Score: ${runState.score.toLocaleString()}`, headingStyle(22, '#ffe066'))
      .setOrigin(0.5);
    this.add
      .text(cx + 80, 314, `Cash found: ${formatMoney(runState.money)}`, textStyle(16, '#d8ccff'))
      .setOrigin(0.5);

    const retry = () => {
      if (this.leaving) return;
      this.leaving = true;
      runState.retryLevel();
      this.scene.stop(SCENES.UI);
      this.scene.start(SCENES.GAME, { levelIndex: data.levelIndex });
    };
    const menu = () => {
      if (this.leaving) return;
      this.leaving = true;
      this.scene.stop(SCENES.GAME);
      this.scene.stop(SCENES.UI);
      this.scene.start(SCENES.MENU);
    };
    createButton(this, cx - 110, 400, 'Try Again', retry, { color: UI.green, width: 210, height: 58 });
    createButton(this, cx + 120, 400, 'Menu', menu, { color: UI.purple, width: 170, height: 58 });

    this.input.keyboard?.once('keydown-SPACE', retry);
    this.input.keyboard?.once('keydown-ENTER', retry);
  }

  update(_time: number, delta: number): void {
    this.hero.animate(delta, 'hurt', 0, 0);
  }
}
