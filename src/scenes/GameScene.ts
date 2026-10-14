import Phaser from 'phaser';
import { matchConfig } from '../data/match';
import { generateMap, type MapData } from '../sim/MapGenerator';
import { SimulationClock } from '../sim/SimulationClock';
import { tileToWorld, worldToTile } from '../utils/iso';
import { events } from '../utils/EventBus';
import { CameraController } from '../input/CameraController';
import { MapView } from '../render/MapView';
import { World, type Building, type Command, type Unit } from '../sim/World';
import type { BuildingKind } from '../sim/Domain';
import { palette } from '../render/palette';
import { safeInsets } from '../ui/button';

export class GameScene extends Phaser.Scene {
  readonly clock = new SimulationClock();
  map!: MapData;
  world!: World;
  paused = false;
  selected?: { type: 'unit' | 'building'; id: number };
  placing?: BuildingKind;
  ghostTile?: { x: number; y: number };
  private controller?: CameraController;
  private mapView?: MapView;
  private subscriptions: (() => void)[] = [];
  private lastScrollX = NaN;
  private lastScrollY = NaN;
  private lastZoom = NaN;
  private renderedTick = 0;
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private bars = new Map<number, { back: Phaser.GameObjects.Rectangle; fill: Phaser.GameObjects.Rectangle }>();
  private ring?: Phaser.GameObjects.Ellipse;
  private flag?: Phaser.GameObjects.Image;
  private ghost?: Phaser.GameObjects.Image;
  private dust: Phaser.GameObjects.Image[] = [];
  private dustCursor = 0;
  private lastDust = 0;
  private smoke: Phaser.GameObjects.Image[] = [];
  private smokeCursor = 0;
  private lastSmoke = 0;
  private readonly point = new Phaser.Math.Vector2();
  private safe = safeInsets();
  constructor() { super('Game'); }
  create(): void {
    this.clock.reset(); this.paused = false; this.lastZoom = NaN; this.renderedTick = 0;
    this.selected = undefined; this.placing = undefined; this.ghostTile = undefined;
    this.sprites.clear(); this.bars.clear();
    this.map = generateMap(matchConfig.size, matchConfig.seed);
    this.world = new World(this.map, new URLSearchParams(location.search).get('debug') === '1');
    this.cameras.main.setBackgroundColor('#163b32');
    this.mapView = new MapView(this, this.map);
    this.dust = Array.from({ length: 24 }, () => this.add.image(0, 0, 'world-atlas', 'dust').setVisible(false));
    this.smoke = Array.from({ length: 12 }, () => this.add.image(0, 0, 'world-atlas', 'smoke').setVisible(false));
    const spawn = this.map.starts[0];
    if (!spawn) throw new Error('Map has no player spawn');
    const p = tileToWorld(spawn.x, spawn.y);
    this.cameras.main.setZoom(1); this.cameras.main.centerOn(p.x, p.y + 80);
    this.controller = new CameraController(this, new Phaser.Geom.Rectangle(-this.map.size * 32, 0, this.map.size * 64, this.map.size * 32), this.onWorldTap);
    this.input.on('pointermove', this.onPointerMove, this);
    this.subscriptions = [
      events.on('pauseRequested', paused => { this.paused = paused; this.controller?.setEnabled(!paused); }),
      events.on('homeRequested', () => { this.cameras.main.centerOn(p.x, p.y + 80); this.controller?.clamp(); }),
      events.on('zoomRequested', factor => { const camera = this.cameras.main; camera.setZoom(Phaser.Math.Clamp(camera.zoom * factor, .5, 2)); this.controller?.clamp(); }),
    ];
    this.scene.launch('UI'); this.scene.bringToTop('UI');
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.controller?.destroy(); this.input.off('pointermove', this.onPointerMove, this);
      for (const unsub of this.subscriptions) unsub(); this.subscriptions = [];
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this); this.scene.stop('UI');
    });
    this.syncSprites();
  }
  private onResize = (): void => { this.safe = safeInsets(); this.controller?.clamp(); this.lastZoom = NaN; };
  private worldTile(screenX: number, screenY: number): { x: number; y: number } {
    this.cameras.main.preRender(); this.cameras.main.getWorldPoint(screenX, screenY, this.point);
    return worldToTile(this.point.x, this.point.y);
  }
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.placing || pointer.y < 68 + this.safe.top || pointer.y > this.scale.height - 190 - this.safe.bottom) return;
    this.ghostTile = this.worldTile(pointer.x, pointer.y); this.syncGhost();
  }
  private onWorldTap = (screenX: number, screenY: number): void => {
    if (this.paused) return;
    const tile = this.worldTile(screenX, screenY);
    if (this.placing) { this.ghostTile = tile; this.syncGhost(); return; }
    let nearest: { type: 'unit' | 'building'; id: number; distance: number } | undefined;
    for (const b of this.world.buildings) {
      const q = tileToWorld(b.x, b.y), d = Math.hypot(q.x - this.point.x, q.y - this.point.y) / 45;
      if (d < 1.5 && (!nearest || d < nearest.distance)) nearest = { type: 'building', id: b.id, distance: d };
    }
    for (const u of this.world.units) {
      const q = tileToWorld(u.x, u.y), d = Math.hypot(q.x - this.point.x, q.y - this.point.y) / 23;
      if (d < 1 && (!nearest || d < nearest.distance)) nearest = { type: 'unit', id: u.id, distance: d };
    }
    if (nearest) this.selected = { type: nearest.type, id: nearest.id };
    else if (this.selected?.type === 'building') this.dispatch({ type: 'rally', buildingId: this.selected.id, ...tile });
    else if (this.selected?.type === 'unit') this.dispatch({ type: 'move', unitId: this.selected.id, ...tile });
    this.syncSelection(); this.world.revision++;
  };
  dispatch(command: Command): void {
    this.world.dispatch(command); this.syncSprites();
    if (command.type === 'debugResources') {
      const center = this.world.buildings[0];
      if (center) {
        const p = tileToWorld(center.x, center.y);
        const label = this.add.text(p.x, p.y - 65, '+1000 resources', { fontFamily: 'Nunito, system-ui', fontSize: '17px', color: '#ffe09b', fontStyle: 'bold' }).setOrigin(.5).setDepth(100001);
        this.tweens.add({ targets: label, y: label.y - 45, alpha: 0, duration: 1100, onComplete: () => label.destroy() });
      }
    }
  }
  startPlacement(kind: BuildingKind): void {
    this.placing = kind;
    const u = this.selected?.type === 'unit' ? this.world.getUnit(this.selected.id) : undefined;
    if (u) this.ghostTile = { x: Math.round(u.x + 4), y: Math.round(u.y) };
    this.syncGhost(); this.world.revision++;
  }
  cancelPlacement(): void { this.placing = undefined; this.ghostTile = undefined; this.ghost?.destroy(); this.ghost = undefined; this.world.revision++; }
  confirmPlacement(): void {
    if (!this.placing || !this.ghostTile || this.selected?.type !== 'unit') return;
    const reason = this.world.buildReason(this.placing, this.ghostTile.x, this.ghostTile.y);
    if (reason) { this.world.message = reason; this.world.revision++; return; }
    this.dispatch({ type: 'build', builderId: this.selected.id, kind: this.placing, ...this.ghostTile });
    this.cancelPlacement();
  }
  private syncGhost(): void {
    if (!this.placing || !this.ghostTile) return;
    const q = tileToWorld(this.ghostTile.x, this.ghostTile.y);
    if (!this.ghost) this.ghost = this.add.image(q.x, q.y + 16, 'world-atlas', `${this.placing}-finished`).setOrigin(.5, .87).setAlpha(.6).setDepth(100000);
    this.ghost.setTexture('world-atlas', `${this.placing}-finished`).setPosition(q.x, q.y + 16).setTint(this.world.buildReason(this.placing, this.ghostTile.x, this.ghostTile.y) ? 0xff7777 : 0xaaffaa);
  }
  private syncSelection(): void {
    this.ring?.destroy(); this.ring = undefined; this.flag?.destroy(); this.flag = undefined;
    if (!this.selected) return;
    const entity = this.selected.type === 'building' ? this.world.getBuilding(this.selected.id) : this.world.getUnit(this.selected.id);
    if (!entity) return;
    const q = tileToWorld(entity.x, entity.y);
    this.ring = this.add.ellipse(q.x, q.y + 18, this.selected.type === 'building' ? 75 : 28, 18).setStrokeStyle(2, palette.players[0]!).setFillStyle(palette.players[0]!, .12).setDepth(q.y + 3);
    if (this.selected.type === 'building') {
      const b = entity as Building, r = tileToWorld(b.rally.x, b.rally.y);
      this.flag = this.add.image(r.x, r.y + 10, 'world-atlas', 'rally-flag').setOrigin(.5, 1).setDepth(r.y + 30);
    }
  }
  private syncSprites(): void {
    for (const b of this.world.buildings) this.syncEntity(b, b.progress < 1 ? `${b.kind}-site` : `${b.kind}-finished`, true);
    for (const u of this.world.units) this.syncEntity(u, `unit-${u.kind}`, false);
    if (this.selected?.type === 'unit') {
      const u = this.world.getUnit(this.selected.id);
      if (u && this.ring) { const q = tileToWorld(u.x, u.y); this.ring.setPosition(q.x, q.y + 18).setDepth(q.y + 3); }
    }
  }
  private syncEntity(entity: Building | Unit, texture: string, building: boolean): void {
    const q = tileToWorld(entity.x, entity.y), y = q.y + (building ? 16 : 18);
    let sprite = this.sprites.get(entity.id);
    if (!sprite) { sprite = this.add.image(q.x, y, 'world-atlas', texture).setOrigin(.5, building ? .87 : 1); this.sprites.set(entity.id, sprite); }
    const moving = !building && !!(entity as Unit).target;
    const bob = moving ? Math.sin(this.time.now * .018 + entity.id) * 1.5 : 0;
    sprite.setTexture('world-atlas', texture).setPosition(q.x, y + bob).setDepth(q.y + (building ? 12 : 20));
    if (moving) {
      const target = (entity as Unit).target!;
      const t = tileToWorld(target.x, target.y);
      sprite.setFlipX(t.x < q.x).setRotation(Math.sin(this.time.now * .018 + entity.id) * .025);
    } else sprite.setRotation(0);
    if (building) {
      const b = entity as Building;
      if (b.progress < 1) {
        let bar = this.bars.get(b.id);
        if (!bar) { bar = { back: this.add.rectangle(q.x, q.y - 58, 66, 8, 0x263c35), fill: this.add.rectangle(q.x - 32, q.y - 58, 62, 5, 0xf2cb68).setOrigin(0, .5) }; this.bars.set(b.id, bar); }
        bar.back.setPosition(q.x, q.y - 58).setDepth(q.y + 100);
        bar.fill.setPosition(q.x - 31, q.y - 58).setScale(Math.max(.01, b.progress), 1).setDepth(q.y + 101);
      } else { const bar = this.bars.get(b.id); bar?.back.destroy(); bar?.fill.destroy(); this.bars.delete(b.id); }
    }
  }
  update(_time: number, delta: number): void {
    this.mapView?.animate(_time);
    if (!this.paused) {
      this.clock.advance(delta);
      while (this.renderedTick < this.clock.tick) { this.world.tick(1 / 15); this.renderedTick++; }
      this.syncSprites();
      if (_time - this.lastDust > 120) {
        this.lastDust = _time;
        for (const u of this.world.units) {
          if (!u.target) continue;
          const q = tileToWorld(u.x, u.y), particle = this.dust[this.dustCursor++ % this.dust.length];
          particle?.setPosition(q.x, q.y + 18).setAlpha(.5).setScale(.5).setDepth(q.y + 4).setVisible(true);
          if (this.dustCursor % 5 === 0) break;
        }
      }
      for (const particle of this.dust) if (particle.visible) {
        particle.alpha -= delta / 500;
        particle.y -= delta * .006;
        if (particle.alpha <= 0) particle.setVisible(false);
      }
      if (_time - this.lastSmoke > 450) {
        this.lastSmoke = _time;
        const center = this.world.buildings[0];
        if (center) {
          const q = tileToWorld(center.x, center.y), puff = this.smoke[this.smokeCursor++ % this.smoke.length];
          puff?.setPosition(q.x + 29, q.y - 67).setAlpha(.6).setScale(.55).setDepth(q.y + 20).setVisible(true);
        }
      }
      for (const puff of this.smoke) if (puff.visible) {
        puff.alpha -= delta / 1300; puff.y -= delta * .012; puff.x += delta * .004;
        puff.setScale(puff.scaleX + delta * .0003);
        if (puff.alpha <= 0) puff.setVisible(false);
      }
    }
    const camera = this.cameras.main;
    if (camera.scrollX !== this.lastScrollX || camera.scrollY !== this.lastScrollY || camera.zoom !== this.lastZoom) {
      camera.preRender(); this.mapView?.cull(camera);
      this.lastScrollX = camera.scrollX; this.lastScrollY = camera.scrollY; this.lastZoom = camera.zoom;
    }
  }
}
