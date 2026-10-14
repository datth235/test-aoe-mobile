export interface GameEvents {
  pauseRequested: boolean;
  homeRequested: undefined;
  zoomRequested: number;
}
type Handler<T> = (payload: T) => void;
class EventBus {
  private readonly handlers: { [K in keyof GameEvents]: Set<Handler<GameEvents[K]>> } = {
    pauseRequested: new Set(),
    homeRequested: new Set(),
    zoomRequested: new Set(),
  };
  on<K extends keyof GameEvents>(key: K, handler: Handler<GameEvents[K]>): () => void {
    const set = this.handlers[key] as Set<Handler<GameEvents[K]>>;
    set.add(handler);
    return () => set.delete(handler);
  }
  emit<K extends keyof GameEvents>(key: K, payload: GameEvents[K]): void {
    const set = this.handlers[key] as Set<Handler<GameEvents[K]>>;
    for (const handler of set) handler(payload);
  }
}
export const events = new EventBus();
