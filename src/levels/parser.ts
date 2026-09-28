import { TILE } from '../config/constants';
import { EMPTY_CHAR, ENTITY_LEGEND, TERRAIN_LEGEND } from './legend';
import type { EntitySpawn, LevelDefinition, ParsedLevel, TerrainCell } from './types';

/** Joins chunks left-to-right. Shorter chunks are bottom-aligned and ragged rows are padded. */
export function joinChunks(chunks: string[][]): string[] {
  const height = Math.max(...chunks.map((c) => c.length));
  const rows = Array.from({ length: height }, () => '');
  for (const chunk of chunks) {
    const width = Math.max(...chunk.map((r) => r.length));
    const pad = height - chunk.length;
    for (let r = 0; r < height; r++) {
      const src = r - pad >= 0 ? chunk[r - pad] : '';
      rows[r] += src.padEnd(width, EMPTY_CHAR);
    }
  }
  return rows;
}

export function parseLevel(def: LevelDefinition): ParsedLevel {
  const raw = joinChunks(def.chunks);
  const rows = raw.length;
  const cols = Math.max(...raw.map((r) => r.length));
  const terrain: TerrainCell[][] = [];
  const entities: EntitySpawn[] = [];

  for (let row = 0; row < rows; row++) {
    const line: TerrainCell[] = [];
    for (let col = 0; col < cols; col++) {
      const ch = raw[row][col] ?? EMPTY_CHAR;
      const cell = TERRAIN_LEGEND[ch];
      line.push(cell ?? 'empty');
      const kind = ENTITY_LEGEND[ch];
      if (kind) {
        entities.push({
          kind,
          col,
          row,
          x: col * TILE + TILE / 2,
          y: row * TILE + TILE / 2,
          bottom: (row + 1) * TILE,
        });
      } else if (!cell && ch !== EMPTY_CHAR && ch !== ' ') {
        console.warn(`[level ${def.id}] Unknown tile '${ch}' at ${col},${row}`);
      }
    }
    terrain.push(line);
  }

  const players = entities.filter((e) => e.kind === 'player');
  if (players.length !== 1) throw new Error(`[level ${def.id}] needs exactly one 'P' (found ${players.length})`);
  if (!entities.some((e) => e.kind === 'portal')) throw new Error(`[level ${def.id}] needs an exit portal 'E'`);

  return {
    def,
    cols,
    rows,
    widthPx: cols * TILE,
    heightPx: rows * TILE,
    raw,
    terrain,
    entities,
    spawn: players[0],
    starCount: entities.filter((e) => e.kind === 'star').length,
  };
}
