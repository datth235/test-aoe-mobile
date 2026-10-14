import { describe, it, expect } from 'vitest';
import { generateMap, isWalkable, Terrain } from '../src/sim/MapGenerator';
import { SimulationClock } from '../src/sim/SimulationClock';
import { tileToWorld, worldToTile } from '../src/utils/iso';
describe('seeded map', () => {
  for (const size of [64, 96] as const) {
    it(`${size}: reproducible, bounded, safe equal starts`, () => {
      const a = generateMap(size, 'test-1'),
        b = generateMap(size, 'test-1');
      expect(a.terrain).toEqual(b.terrain);
      expect(a.terrain.length).toBe(size * size);
      expect(a.terrain.some((cell) => cell === Terrain.Water)).toBe(true);
      for (const spawn of a.starts) {
        for (let dy = -7; dy <= 7; dy++)
          for (let dx = -7; dx <= 7; dx++)
            expect(isWalkable(a, spawn.x + dx, spawn.y + dy)).toBe(true);
        expect(a.terrain[spawn.y * size + spawn.x + 10]).toBe(Terrain.Forest);
      }
      expect(isWalkable(a, -1, 0)).toBe(false);
      expect(isWalkable(a, size, 0)).toBe(false);
    });
  }
  it('different seeds differ', () =>
    expect(generateMap(64, 'a').terrain).not.toEqual(generateMap(64, 'b').terrain));
});
describe('isometric coordinates', () => {
  it('all tile centers round-trip including negative world x', () => {
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++) {
        const p = tileToWorld(x, y);
        expect(worldToTile(p.x, p.y)).toEqual({ x, y });
      }
  });
});
describe('fixed simulation clock', () => {
  it('one second yields 15 ticks', () => {
    const clock = new SimulationClock();
    for (let i = 0; i < 60; i++) clock.advance(1000 / 60);
    expect(clock.tick).toBe(15);
  });
  it('caps stalls, preserving interpolation range', () => {
    const clock = new SimulationClock();
    clock.advance(60000);
    expect(clock.tick).toBe(3);
    expect(clock.alpha).toBeGreaterThanOrEqual(0);
    expect(clock.alpha).toBeLessThan(1);
  });
});
