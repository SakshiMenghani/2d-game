import * as Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PHYSICS } from './constants';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';
import { LevelCompleteScene } from '../scenes/LevelCompleteScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene';
import { PauseScene } from '../scenes/PauseScene';

const debug = new URLSearchParams(window.location.search).has('debug');

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#7ec8ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.gravity },
      debug,
    },
  },
  render: { antialias: true },
  // Sound is synthesized by src/audio/AudioEngine, so Phaser's own audio system isn't needed.
  audio: { noAudio: true },
  scene: [BootScene, MenuScene, CharacterSelectScene, GameScene, UIScene, PauseScene, LevelCompleteScene, GameOverScene],
};
