import type { EntityKind, TerrainCell } from './types';

export const EMPTY_CHAR = '.';

export const TERRAIN_LEGEND: Record<string, TerrainCell> = {
  '#': 'ground',
  '=': 'platform',
};

export const ENTITY_LEGEND: Record<string, EntityKind> = {
  P: 'player',
  '*': 'coin',
  D: 'gem',
  G: 'bigCoin',
  S: 'star',
  H: 'heart',
  b: 'bloblet',
  f: 'fluffmoth',
  '^': 'thorns',
  C: 'checkpoint',
  E: 'portal',
  M: 'moverH',
  V: 'moverV',
  T: 'chest',
};
