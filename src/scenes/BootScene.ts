import * as Phaser from 'phaser';
import { SCENES } from '../config/constants';
import { createAnimations } from '../art/animations';
import { generateCharacterTextures } from '../art/characterTextures';
import { generateRewardTextures } from '../art/rewardTextures';
import { generateTextures } from '../art/textures';
import { LEVELS } from '../levels';
import { runState } from '../state/RunState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create(): void {
    generateTextures(this);
    generateCharacterTextures(this);
    generateRewardTextures(this);
    createAnimations(this);

    const params = new URLSearchParams(window.location.search);
    if (import.meta.env.DEV && params.has('heroes')) {
      this.scene.start(SCENES.CHARACTER_SELECT);
      return;
    }

    // Dev shortcut: ?level=1 skips the title screen.
    const level = Number(params.get('level'));
    if (level >= 1 && level <= LEVELS.length) {
      runState.newGame();
      this.scene.start(SCENES.GAME, { levelIndex: level - 1 });
      return;
    }
    this.scene.start(SCENES.MENU);
  }
}
