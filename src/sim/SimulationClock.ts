/** Fixed 15 Hz simulation clock. Rendering never changes the authoritative tick. */
export class SimulationClock {
  static readonly StepMs = 1000 / 15;
  tick = 0;
  private accumulator = 0;
  get alpha(): number {
    return this.accumulator / SimulationClock.StepMs;
  }
  get elapsedSeconds(): number {
    return this.tick / 15;
  }
  reset(): void {
    this.tick = 0;
    this.accumulator = 0;
  }
  advance(deltaMs: number): void {
    // Do not try to replay minutes of background time or a stalled frame.
    this.accumulator += Math.max(0, Math.min(deltaMs, 250));
    while (this.accumulator >= SimulationClock.StepMs) {
      this.accumulator -= SimulationClock.StepMs;
      this.tick++;
    }
  }
}
