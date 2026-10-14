export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export interface Point {
  x: number;
  y: number;
}
export function tileToWorld(x: number, y: number): Point {
  return { x: ((x - y) * TILE_WIDTH) / 2, y: ((x + y) * TILE_HEIGHT) / 2 };
}
export function worldToTile(x: number, y: number): Point {
  return {
    x: Math.floor(x / TILE_WIDTH + y / TILE_HEIGHT + 0.5),
    y: Math.floor(y / TILE_HEIGHT - x / TILE_WIDTH + 0.5),
  };
}
