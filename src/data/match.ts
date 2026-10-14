import type { MapSize } from '../sim/MapGenerator';
export interface MatchConfig {
  size: MapSize;
  seed: string;
}
export const matchConfig: MatchConfig = { size: 64, seed: 'dominion-01' };
