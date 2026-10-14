export type Resource = 'food' | 'wood' | 'gold' | 'stone';
export type Age = 'Stone' | 'Bronze' | 'Iron';
export type UnitKind = 'villager' | 'clubman' | 'spearman' | 'swordsman' | 'archer' | 'cavalry';
export type BuildingKind = 'town-center' | 'barracks' | 'archery-range' | 'stable';
export type Cost = Partial<Record<Resource, number>>;
export interface UnitDef { name: string; icon: string; cost: Cost; trainTime: number; age: Age; building: BuildingKind }
export interface BuildingDef { name: string; icon: string; cost: Cost; buildTime: number }
export const units: Record<UnitKind, UnitDef> = {
  villager: { name: 'Villager', icon: '⚒', cost: { food: 50 }, trainTime: 12, age: 'Stone', building: 'town-center' },
  clubman: { name: 'Clubman', icon: '⚔', cost: { food: 50 }, trainTime: 12, age: 'Stone', building: 'barracks' },
  spearman: { name: 'Spearman', icon: '♜', cost: { food: 60, wood: 20 }, trainTime: 16, age: 'Bronze', building: 'barracks' },
  swordsman: { name: 'Swordsman', icon: '⚔', cost: { food: 70, gold: 30 }, trainTime: 20, age: 'Iron', building: 'barracks' },
  archer: { name: 'Archer', icon: '➶', cost: { food: 40, wood: 40 }, trainTime: 16, age: 'Stone', building: 'archery-range' },
  cavalry: { name: 'Cavalry', icon: '♞', cost: { food: 80, gold: 40 }, trainTime: 22, age: 'Stone', building: 'stable' },
};
export const buildings: Record<BuildingKind, BuildingDef> = {
  'town-center': { name: 'Town Center', icon: '⌂', cost: { wood: 250, stone: 100 }, buildTime: 28 },
  barracks: { name: 'Barracks', icon: '⚔', cost: { wood: 120 }, buildTime: 14 },
  'archery-range': { name: 'Archery Range', icon: '➶', cost: { wood: 140 }, buildTime: 16 },
  stable: { name: 'Stable', icon: '♞', cost: { wood: 160, stone: 40 }, buildTime: 18 },
};
export const resources: Resource[] = ['food', 'wood', 'gold', 'stone'];
export const ageOrder: Age[] = ['Stone', 'Bronze', 'Iron'];
