import { SeededRandom } from '../utils/SeededRandom';
export enum Terrain {
  Grass,
  Forest,
  Water,
}
export type MapSize = 64 | 96;
export interface TilePosition {
  x: number;
  y: number;
}
export interface MapData {
  size: MapSize;
  seed: string;
  terrain: Uint8Array;
  starts: readonly TilePosition[];
}
export function generateMap(size: MapSize, seed: string): MapData {
  const rng = new SeededRandom(seed);
  const terrain = new Uint8Array(size * size);
  const margin = Math.floor(size * 0.2);
  const starts = [
    { x: margin, y: margin },
    { x: size - 1 - margin, y: size - 1 - margin },
    { x: size - 1 - margin, y: margin },
    { x: margin, y: size - 1 - margin },
  ];
  // Central lake leaves a broad perimeter route between every spawn.
  const lakeX = size / 2 + rng.integer(-4, 4),
    lakeY = size / 2 + rng.integer(-4, 4);
  const rx = size * 0.11,
    ry = size * 0.08;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (x - lakeX) / rx,
        dy = (y - lakeY) / ry;
      if (dx * dx + dy * dy < 1) terrain[y * size + x] = Terrain.Water;
    }
  for (let cluster = 0; cluster < size; cluster++) {
    const cx = rng.integer(3, size - 4),
      cy = rng.integer(3, size - 4),
      radius = rng.integer(2, 4);
    for (let y = cy - radius; y <= cy + radius; y++)
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const i = y * size + x;
        if (
          (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius &&
          terrain[i] !== Terrain.Water &&
          rng.next() > 0.25
        )
          terrain[i] = Terrain.Forest;
      }
  }
  // Identical safe clearings and nearby wood patches for all four future players.
  for (const start of starts) {
    for (let dy = -7; dy <= 7; dy++)
      for (let dx = -7; dx <= 7; dx++)
        terrain[(start.y + dy) * size + start.x + dx] = Terrain.Grass;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        terrain[(start.y + dy) * size + start.x + 10 + dx] = Terrain.Forest;
  }
  return { size, seed, terrain, starts };
}
export function isWalkable(map: MapData, x: number, y: number): boolean {
  return (
    x >= 0 &&
    y >= 0 &&
    x < map.size &&
    y < map.size &&
    map.terrain[y * map.size + x] === Terrain.Grass
  );
}
