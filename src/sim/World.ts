import { ageOrder, buildings, resources, units, type Age, type BuildingKind, type Cost, type Resource, type UnitKind } from './Domain';
import type { MapData } from './MapGenerator';
import { isWalkable } from './MapGenerator';
import type { Point } from '../utils/iso';

export interface Unit { id: number; kind: UnitKind; x: number; y: number; target?: Point; hp: number; builderOf?: number }
export interface QueueItem { id: number; kind: UnitKind; remaining: number; total: number }
export interface Building { id: number; kind: BuildingKind; x: number; y: number; progress: number; hp: number; queue: QueueItem[]; rally: Point }
export type Command =
  | { type: 'build'; builderId: number; kind: BuildingKind; x: number; y: number }
  | { type: 'train'; buildingId: number; kind: UnitKind }
  | { type: 'cancelTrain'; buildingId: number; slot: number }
  | { type: 'rally'; buildingId: number; x: number; y: number }
  | { type: 'move'; unitId: number; x: number; y: number }
  | { type: 'debugResources' }
  | { type: 'debugInstant' }
  | { type: 'advanceAge' };
export class World {
  readonly units: Unit[] = [];
  readonly buildings: Building[] = [];
  readonly stock: Record<Resource, number> = { food: 1200, wood: 800, gold: 400, stone: 300 };
  age: Age = 'Stone';
  popCap = 20;
  revision = 0;
  message = '';
  instant = false;
  private nextId = 1;
  private readonly commands: Command[] = [];
  constructor(readonly map: MapData, readonly debug: boolean) {
    const start = map.starts[0];
    if (!start) throw new Error('Map has no player spawn');
    this.buildings.push({ id: this.nextId++, kind: 'town-center', x: start.x, y: start.y, progress: 1, hp: 1, queue: [], rally: { x: start.x + 3, y: start.y + 2 } });
    this.units.push({ id: this.nextId++, kind: 'villager', x: start.x + 1, y: start.y - 2, hp: 1 });
  }
  get population(): number { return this.units.length + this.buildings.reduce((n, b) => n + b.queue.length, 0); }
  getUnit(id: number): Unit | undefined { return this.units.find(u => u.id === id); }
  getBuilding(id: number): Building | undefined { return this.buildings.find(b => b.id === id); }
  costReason(cost: Cost): string | undefined {
    for (const r of resources) if ((cost[r] ?? 0) > this.stock[r]) return `Need ${cost[r]} ${r[0]?.toUpperCase()}${r.slice(1)}`;
    return undefined;
  }
  buildReason(kind: BuildingKind, x: number, y: number): string | undefined {
    if (kind === 'town-center') return 'Town Center already built';
    if (!isWalkable(this.map, x, y)) return 'Choose clear ground';
    if (this.buildings.some(b => Math.hypot(b.x - x, b.y - y) < 3)) return 'Too close to a building';
    return this.costReason(buildings[kind].cost);
  }
  trainReason(building: Building, kind: UnitKind): string | undefined {
    const def = units[kind];
    if (building.progress < 1) return 'Finish construction';
    if (def.building !== building.kind) return 'Wrong building';
    if (ageOrder.indexOf(this.age) < ageOrder.indexOf(def.age)) return `Requires ${def.age} Age`;
    if (building.queue.length >= 5) return 'Queue full';
    if (this.population >= this.popCap) return 'Population full';
    return this.costReason(def.cost);
  }
  ageReason(): string | undefined {
    if (this.age === 'Iron') return 'Maximum age';
    return this.costReason(this.age === 'Stone' ? { food: 300, gold: 100 } : { food: 500, gold: 250 });
  }
  dispatch(command: Command): void { this.commands.push(command); this.flush(); }
  private pay(cost: Cost, sign: 1 | -1): void { for (const r of resources) this.stock[r] += sign * (cost[r] ?? 0); }
  private flush(): void {
    for (const c of this.commands.splice(0)) {
      if (c.type === 'build') {
        const builder = this.getUnit(c.builderId), reason = this.buildReason(c.kind, c.x, c.y);
        if (!builder || builder.kind !== 'villager' || reason) { this.message = reason ?? 'Select a villager'; continue; }
        this.pay(buildings[c.kind].cost, -1);
        const b: Building = { id: this.nextId++, kind: c.kind, x: c.x, y: c.y, progress: this.instant ? 1 : 0, hp: 1, queue: [], rally: { x: c.x + 2, y: c.y + 1 } };
        this.buildings.push(b);
        if (!this.instant) { builder.builderOf = b.id; builder.target = { x: c.x + 1, y: c.y }; }
        this.message = `Building ${buildings[c.kind].name}`;
      } else if (c.type === 'train') {
        const b = this.getBuilding(c.buildingId), reason = b ? this.trainReason(b, c.kind) : 'Building unavailable';
        if (!b || reason) { this.message = reason ?? ''; continue; }
        this.pay(units[c.kind].cost, -1);
        b.queue.push({ id: this.nextId++, kind: c.kind, remaining: this.instant ? 0 : units[c.kind].trainTime, total: units[c.kind].trainTime });
        this.message = `${units[c.kind].name} queued`;
      } else if (c.type === 'cancelTrain') {
        const b = this.getBuilding(c.buildingId), item = b?.queue[c.slot];
        if (!b || !item) continue;
        this.pay(units[item.kind].cost, 1);
        b.queue.splice(c.slot, 1);
        this.message = `${units[item.kind].name} cancelled · refunded`;
      } else if (c.type === 'rally') {
        const b = this.getBuilding(c.buildingId);
        if (b && isWalkable(this.map, c.x, c.y)) { b.rally = { x: c.x, y: c.y }; this.message = 'Rally point set'; }
      } else if (c.type === 'move') {
        const u = this.getUnit(c.unitId);
        if (u && isWalkable(this.map, c.x, c.y)) { u.target = { x: c.x, y: c.y }; u.builderOf = undefined; }
      } else if (c.type === 'debugResources' && this.debug) {
        for (const r of resources) this.stock[r] += 1000;
        this.message = '+1000 all resources';
      } else if (c.type === 'debugInstant' && this.debug) {
        this.instant = !this.instant;
        if (this.instant) for (const b of this.buildings) { b.progress = 1; for (const item of b.queue) item.remaining = 0; }
        this.message = `Instant build/train ${this.instant ? 'on' : 'off'}`;
      } else if (c.type === 'advanceAge') {
        const reason = this.ageReason();
        if (reason) { this.message = reason; continue; }
        this.pay(this.age === 'Stone' ? { food: 300, gold: 100 } : { food: 500, gold: 250 }, -1);
        this.age = this.age === 'Stone' ? 'Bronze' : 'Iron';
        this.message = `${this.age} Age reached`;
      }
    }
    this.revision++;
  }
  tick(dt: number): void {
    let changed = false;
    for (const u of this.units) {
      if (!u.target) continue;
      const dx = u.target.x - u.x, dy = u.target.y - u.y, distance = Math.hypot(dx, dy);
      if (distance < 0.06) { u.x = u.target.x; u.y = u.target.y; u.target = undefined; continue; }
      const step = Math.min(distance, dt * (u.kind === 'cavalry' ? 2.1 : 1.3));
      u.x += dx / distance * step; u.y += dy / distance * step; changed = true;
    }
    for (const b of this.buildings) {
      if (b.progress < 1) {
        if (this.units.some(u => u.builderOf === b.id && Math.hypot(u.x - b.x - 1, u.y - b.y) < 0.5)) {
          b.progress = Math.min(1, b.progress + dt / buildings[b.kind].buildTime); changed = true;
          if (b.progress === 1) { for (const u of this.units) if (u.builderOf === b.id) u.builderOf = undefined; this.message = `${buildings[b.kind].name} complete`; }
        }
      }
      const item = b.queue[0];
      if (b.progress === 1 && item) {
        item.remaining -= dt; changed = true;
        if (item.remaining <= 0) {
          b.queue.shift();
          const u: Unit = { id: this.nextId++, kind: item.kind, x: b.x + 1, y: b.y + 1, hp: 1, target: { ...b.rally } };
          this.units.push(u);
          this.message = `${units[item.kind].name} ready`;
        }
      }
    }
    if (changed) this.revision++;
  }
}
