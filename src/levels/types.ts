import type { ThemeKey } from '../art/themes';

export type TerrainCell = 'empty' | 'ground' | 'platform';

export type EntityKind =
  | 'player'
  | 'coin'
  | 'gem'
  | 'bigCoin'
  | 'star'
  | 'heart'
  | 'bloblet'
  | 'fluffmoth'
  | 'thorns'
  | 'checkpoint'
  | 'portal'
  | 'moverH'
  | 'moverV'
  | 'chest';

export interface LevelDefinition {
  id: string;
  /** Short label shown in the HUD banner, e.g. "1-1". */
  label: string;
  name: string;
  theme: ThemeKey;
  /**
   * Level layout as ASCII chunks joined left-to-right. Each chunk is an array of rows (top → bottom).
   * See `legend.ts` for the characters. Chunks let us build (or AI-generate) levels from reusable pieces.
   */
  chunks: string[][];
  movers?: {
    /** Tiles a horizontal platform travels to the right of its spawn. */
    horizontalRange?: number;
    /** Tiles a vertical platform travels upward from its spawn. */
    verticalRange?: number;
    speed?: number;
  };
}

export interface EntitySpawn {
  kind: EntityKind;
  col: number;
  row: number;
  /** Center of the cell, in pixels. */
  x: number;
  y: number;
  /** Bottom edge of the cell, in pixels – handy for things that stand on the ground. */
  bottom: number;
}

export interface ParsedLevel {
  def: LevelDefinition;
  cols: number;
  rows: number;
  widthPx: number;
  heightPx: number;
  raw: string[];
  terrain: TerrainCell[][];
  entities: EntitySpawn[];
  spawn: EntitySpawn;
  starCount: number;
}
