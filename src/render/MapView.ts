import Phaser from 'phaser';
import { Terrain, type MapData } from '../sim/MapGenerator';
import { tileToWorld } from '../utils/iso';
export class MapView {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly water: Phaser.GameObjects.Image[] = [];
  private readonly trees: Phaser.GameObjects.Image[] = [];
  private lastAnimation = -1;
  constructor(scene: Phaser.Scene, map: MapData) {
    for (let y = 0; y < map.size; y++)
      for (let x = 0; x < map.size; x++) {
        const i = y * map.size + x,
          type = map.terrain[i],
          p = tileToWorld(x, y);
        const texture =
          type === Terrain.Water
            ? `water-${(x + y) % 3}`
            : type === Terrain.Grass && [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([nx, ny]) => nx !== undefined && ny !== undefined && nx >= 0 && ny >= 0 && nx < map.size && ny < map.size && map.terrain[ny * map.size + nx] === Terrain.Water)
              ? 'sand' : `grass-${(x * 13 + y * 7) % 4}`;
        // Terrain is always below entities; tree bases use world-y depth.
        const tile = scene.add.image(p.x, p.y, 'world-atlas', texture).setDepth(-10000 + p.y);
        this.images.push(tile);
        if (type === Terrain.Water) this.water.push(tile);
        if (type === Terrain.Forest && (x + y) % 2 === 0)
          {
            const tree = scene.add
              .image(p.x, p.y + 12, 'world-atlas', `tree-${(x + y) % 3}`)
              .setOrigin(0.5, 0.9)
              .setDepth(p.y + 12);
            this.images.push(tree); this.trees.push(tree);
          }
        if (type === Terrain.Grass && map.starts.every(start => Math.hypot(start.x - x, start.y - y) > 8)) {
          const hash = (x * 97 + y * 173 + x * y * 13) % 307;
          const resource = hash === 1 ? 'berries' : hash === 2 ? 'gold' : hash === 3 ? 'stone' : undefined;
          if (resource) this.images.push(scene.add.image(p.x, p.y + 11, 'world-atlas', resource).setOrigin(.5, .85).setDepth(p.y + 11));
        }
      }
  }
  animate(time: number): void {
    const frame = Math.floor(time / 350);
    if (frame === this.lastAnimation) return;
    this.lastAnimation = frame;
    for (const tile of this.water) if (tile.visible) tile.setFrame(`water-${(frame + Math.floor(tile.x / 64)) % 3}`);
    for (const tree of this.trees) if (tree.visible) tree.setRotation(Math.sin(time / 1300 + tree.x / 100) * .014);
  }
  cull(camera: Phaser.Cameras.Scene2D.Camera): void {
    const rect = camera.worldView;
    for (let i = 0; i < this.images.length; i++) {
      const image = this.images[i];
      if (image)
        image.visible =
          image.x > rect.left - 100 &&
          image.x < rect.right + 100 &&
          image.y > rect.top - 100 &&
          image.y < rect.bottom + 100;
    }
  }
}
