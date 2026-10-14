/** Mulberry32: independent of Phaser and never uses Math.random. */
export class SeededRandom {
  private state: number;
  constructor(seed: string) {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
    this.state = hash >>> 0;
  }
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  integer(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }
}
