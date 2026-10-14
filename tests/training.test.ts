import { describe, expect, it } from 'vitest';
import { generateMap } from '../src/sim/MapGenerator';
import { World } from '../src/sim/World';

describe('training command flow', () => {
  it('builds, trains, rallies, and refunds through commands', () => {
    const world = new World(generateMap(64, 'training-test'), false);
    const start = world.map.starts[0]!;
    const villager = world.units[0]!;
    world.dispatch({ type: 'build', builderId: villager.id, kind: 'barracks', x: start.x + 5, y: start.y });
    const barracks = world.buildings[1]!;
    expect(world.stock.wood).toBe(680);
    expect(barracks.progress).toBe(0);
    for (let i = 0; i < 450; i++) world.tick(1 / 15);
    expect(barracks.progress).toBe(1);
    world.dispatch({ type: 'rally', buildingId: barracks.id, x: start.x + 7, y: start.y + 1 });
    world.dispatch({ type: 'train', buildingId: barracks.id, kind: 'clubman' });
    expect(world.stock.food).toBe(1150);
    expect(barracks.queue).toHaveLength(1);
    world.dispatch({ type: 'cancelTrain', buildingId: barracks.id, slot: 0 });
    expect(world.stock.food).toBe(1200);
    expect(barracks.queue).toHaveLength(0);
    world.dispatch({ type: 'train', buildingId: barracks.id, kind: 'clubman' });
    for (let i = 0; i < 190; i++) world.tick(1 / 15);
    expect(barracks.queue).toHaveLength(0);
    expect(world.units.at(-1)?.kind).toBe('clubman');
    expect(world.units.at(-1)?.target).toEqual(barracks.rally);
  });
  it('enforces age, cost, population, and queue rules', () => {
    const world = new World(generateMap(64, 'limits'), false);
    const center = world.buildings[0]!;
    expect(world.trainReason(center, 'villager')).toBeUndefined();
    world.popCap = 1;
    expect(world.trainReason(center, 'villager')).toBe('Population full');
    world.popCap = 20;
    world.stock.food = 0;
    expect(world.trainReason(center, 'villager')).toBe('Need 50 Food');
    world.dispatch({ type: 'train', buildingId: center.id, kind: 'villager' });
    expect(center.queue).toHaveLength(0);
    world.stock.food = 300;
    expect(world.ageReason()).toBeUndefined();
    world.dispatch({ type: 'advanceAge' });
    expect(world.age).toBe('Bronze');
  });
  it('trains villagers, archers, and cavalry from their own buildings', () => {
    const world = new World(generateMap(64, 'all-buildings'), true);
    const start = world.map.starts[0]!;
    world.dispatch({ type: 'debugInstant' });
    const villager = world.units[0]!;
    world.dispatch({ type: 'build', builderId: villager.id, kind: 'archery-range', x: start.x + 5, y: start.y });
    world.dispatch({ type: 'build', builderId: villager.id, kind: 'stable', x: start.x, y: start.y + 5 });
    expect(world.buildings).toHaveLength(3);
    const requests = [
      { buildingId: world.buildings[0]!.id, kind: 'villager' as const },
      { buildingId: world.buildings[1]!.id, kind: 'archer' as const },
      { buildingId: world.buildings[2]!.id, kind: 'cavalry' as const },
    ];
    for (const request of requests) world.dispatch({ type: 'train', ...request });
    world.tick(1 / 15);
    expect(world.units.map(u => u.kind)).toEqual(['villager', 'villager', 'archer', 'cavalry']);
  });
});
