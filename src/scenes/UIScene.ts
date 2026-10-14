import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { clickFeedback, safeInsets } from '../ui/button';
import { events } from '../utils/EventBus';
import { drawCallMeter } from '../render/DrawCallMeter';
import { buildings, resources, units, type BuildingKind, type Cost, type Resource, type UnitKind } from '../sim/Domain';
import { fullscreenActive, toggleFullscreen } from '../ui/fullscreen';
import { fullscreenButtonY } from '../ui/layout';

const font = 'Nunito, system-ui, sans-serif';
const icons: Record<Resource, string> = { food: '●', wood: '▥', gold: '◆', stone: '⬟' };
function costText(cost: Cost): string { return resources.filter(r => cost[r]).map(r => `${icons[r]}${cost[r]}`).join('  '); }
export class UIScene extends Phaser.Scene {
  private lastRevision = -1;
  private lastDraw = 0;
  private pausePanel?: Phaser.GameObjects.Container;
  constructor() { super('UI'); }
  create(): void {
    this.draw(); this.scale.on(Phaser.Scale.Events.RESIZE, this.draw, this);
    document.addEventListener('fullscreenchange', this.draw);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.draw, this);
      document.removeEventListener('fullscreenchange', this.draw);
    });
  }
  private label(x: number, y: number, value: string, size = 14, color = '#f7eac9'): Phaser.GameObjects.Text {
    return this.add.text(x, y, value, { fontFamily: font, fontSize: `${size}px`, color, fontStyle: 'bold' }).setScrollFactor(0);
  }
  private action(x: number, y: number, width: number, height: number, title: string, subtitle: string, enabled: boolean, onTap: () => void): void {
    const bg = this.add.nineslice(x, y, 'world-atlas', 'ui-button', width, height, 10, 10, 10, 10).setScrollFactor(0);
    if (!enabled) bg.setTint(0x87918a);
    this.label(x - width / 2 + 9, y - height / 2 + 5, title, 13, enabled ? '#fff1c7' : '#a4aaa3');
    this.label(x - width / 2 + 9, y + 5, subtitle, 10, enabled ? '#bfd9ba' : '#c3aaa0');
    bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    bg.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => { event.stopPropagation(); bg.setScale(.95); });
    bg.on('pointerout', () => bg.setScale(1));
    bg.on('pointerup', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation(); bg.setScale(1); if (enabled) { clickFeedback(this); onTap(); }
    });
  }
  private draw = (): void => {
    const game = this.scene.get('Game') as GameScene;
    if (!game.world) return;
    this.children.removeAll(true); this.pausePanel = undefined;
    const w = this.scale.width, h = this.scale.height, s = safeInsets();
    const panelTop = h - 190 - s.bottom;
    this.add.rectangle(w / 2, (68 + s.top) / 2, w, 68 + s.top, 0x193c35, .96).setScrollFactor(0);
    this.add.rectangle(w / 2, (panelTop + h) / 2, w, h - panelTop, 0x193c35, .97).setScrollFactor(0);
    this.add.rectangle(w / 2, panelTop + 1, w, 2, 0xc7ab6b).setScrollFactor(0);
    this.label(s.left + 12, s.top + 5, 'DOMINION', 18, '#f5ce83');
    this.label(s.left + 12, s.top + 30, `${game.world.age.toUpperCase()} AGE · ${Math.floor(game.clock.elapsedSeconds / 60).toString().padStart(2, '0')}:${Math.floor(game.clock.elapsedSeconds % 60).toString().padStart(2, '0')}`, 10, '#c2d1bd');
    const resourceX = Math.max(180, w * .26), resourceWidth = Math.max(48, (w - resourceX - 120 - s.right) / 4);
    resources.forEach((r, i) => this.label(resourceX + resourceWidth * i, s.top + 20, `${icons[r]} ${Math.floor(game.world.stock[r])}`, 13, r === 'gold' ? '#f8db8d' : '#e6efda'));
    this.label(w - s.right - 82, s.top + 6, `${game.world.population}/${game.world.popCap} pop`, 11);
    this.action(w - s.right - 42, s.top + 41, 76, 42, 'Ⅱ Pause', '', true, () => { events.emit('pauseRequested', true); this.showPause(); });
    this.action(w - s.right - 48, fullscreenButtonY(h, s), 84, 48, document.fullscreenElement ? '⛶ Exit' : fullscreenActive() ? '⛶ App' : '⛶ Full', '', true, () => { void toggleFullscreen(); });
    const selected = game.selected;
    const building = selected?.type === 'building' ? game.world.getBuilding(selected.id) : undefined;
    const unit = selected?.type === 'unit' ? game.world.getUnit(selected.id) : undefined;
    const title = game.placing ? `Place ${buildings[game.placing].name}` : building ? buildings[building.kind].name : unit ? units[unit.kind].name : 'Choose a villager or building';
    this.label(s.left + 12, panelTop + 9, title, 17, '#f5ce83');
    this.label(s.left + 12, panelTop + 35, game.world.message || (building ? 'Tap ground to set rally point' : 'Tap a unit to command it'), 11, '#c7d7bf');
    const available = w - s.left - s.right - 22;
    if (game.placing) {
      const tile = game.ghostTile;
      const reason = tile ? game.world.buildReason(game.placing, tile.x, tile.y) : 'Tap ground for a site';
      this.label(s.left + 12, panelTop + 58, reason ?? 'Site ready', 12, reason ? '#e8aaa0' : '#a9e5aa');
      this.action(s.left + available * .25, panelTop + 124, available * .45, 62, '✔ Confirm', tile ? `${tile.x}, ${tile.y}` : 'Choose site', !reason, () => game.confirmPlacement());
      this.action(s.left + available * .75, panelTop + 124, available * .45, 62, '✖ Cancel', '', true, () => game.cancelPlacement());
    } else if (unit?.kind === 'villager') {
      const kinds: BuildingKind[] = ['barracks', 'archery-range', 'stable'];
      const gap = 8, bw = (available - gap * 2) / 3;
      kinds.forEach((kind, i) => {
        const reason = game.world.costReason(buildings[kind].cost);
        this.action(s.left + bw / 2 + i * (bw + gap) + 10, panelTop + 112, bw, 80, `${buildings[kind].icon} ${buildings[kind].name}`, reason ?? costText(buildings[kind].cost), !reason, () => game.startPlacement(kind));
      });
    } else if (building) {
      if (building.progress < 1) this.label(s.left + 12, panelTop + 81, `Construction ${Math.floor(building.progress * 100)}%`, 16);
      else {
        const options = (Object.keys(units) as UnitKind[]).filter(kind => units[kind].building === building.kind);
        const gap = 8, bw = Math.min(154, (available - gap * (options.length - 1)) / options.length);
        options.forEach((kind, i) => {
          const reason = game.world.trainReason(building, kind);
          this.action(s.left + 10 + bw / 2 + i * (bw + gap), panelTop + 89, bw, 62, `${units[kind].icon} ${units[kind].name}`, reason ?? costText(units[kind].cost), !reason, () => game.dispatch({ type: 'train', buildingId: building.id, kind }));
        });
        if (building.kind === 'town-center' && game.world.age !== 'Iron') {
          const next = game.world.age === 'Stone' ? 'Bronze' : 'Iron';
          const cost = game.world.age === 'Stone' ? { food: 300, gold: 100 } : { food: 500, gold: 250 };
          const reason = game.world.ageReason();
          this.action(w - s.right - 93, panelTop + 98, 176, 60, `↑ ${next} Age`, reason ?? costText(cost), !reason, () => game.dispatch({ type: 'advanceAge' }));
        }
        building.queue.forEach((item, i) => {
          const x = s.left + 37 + i * 58, y = panelTop + 154;
          const progress = 1 - item.remaining / item.total;
          const ring = this.add.graphics().setScrollFactor(0);
          ring.lineStyle(4, 0x53665d).strokeCircle(x, y, 19);
          ring.lineStyle(4, 0xf5ce83).beginPath().arc(x, y, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress, false).strokePath();
          const icon = this.label(x - 7, y - 11, units[item.kind].icon, 17);
          icon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 44, 42), Phaser.Geom.Rectangle.Contains).on('pointerup', () => game.dispatch({ type: 'cancelTrain', buildingId: building.id, slot: i }));
        });
        if (building.queue.length) this.label(s.left + 302, panelTop + 146, 'Tap queue slot to cancel + refund', 10, '#c3d3bd');
      }
    } else this.label(s.left + 12, panelTop + 83, 'Drag to pan · Pinch to zoom · Tap to select', 13);
    if (game.world.debug) {
      this.action(w - s.right - 245, panelTop + 33, 150, 46, '+1000 all resources', '', true, () => game.dispatch({ type: 'debugResources' }));
      this.action(w - s.right - 84, panelTop + 33, 150, 46, 'Instant build/train', game.world.instant ? 'ON' : 'OFF', true, () => game.dispatch({ type: 'debugInstant' }));
      this.label(w - s.right - 170, s.top + 72, `FPS ${Math.round(this.game.loop.actualFps)} · ${game.world.units.length} units · ${drawCallMeter.lastFrame ?? '?'} calls`, 11);
    }
    this.lastRevision = game.world.revision; this.lastDraw = this.time.now;
    if (game.paused) this.showPause();
  };
  private showPause(): void {
    if (this.pausePanel) return;
    const w = this.scale.width, h = this.scale.height;
    const shade = this.add.rectangle(w / 2, h / 2, w, h, 0x071b18, .85).setInteractive().setScrollFactor(0);
    const title = this.label(w / 2 - 116, h / 2 - 64, 'A moment to plan', 25);
    const resume = this.add.rectangle(w / 2, h / 2, 230, 56, 0x315e51).setInteractive().setScrollFactor(0);
    const resumeText = this.label(w / 2 - 66, h / 2 - 12, 'Resume game', 17);
    resume.on('pointerup', () => { events.emit('pauseRequested', false); this.pausePanel?.destroy(true); this.pausePanel = undefined; });
    const menu = this.add.rectangle(w / 2, h / 2 + 67, 230, 56, 0x315e51).setInteractive().setScrollFactor(0);
    const menuText = this.label(w / 2 - 80, h / 2 + 54, 'Main menu', 17);
    menu.on('pointerup', () => { this.scene.stop('Game'); this.scene.start('MainMenu'); });
    this.pausePanel = this.add.container(0, 0, [shade, title, resume, resumeText, menu, menuText]).setDepth(100);
  }
  update(time: number): void {
    const game = this.scene.get('Game') as GameScene;
    if (game.world && !this.input.activePointer.isDown && time - this.lastDraw > 200 && (game.world.revision !== this.lastRevision || game.world.debug)) this.draw();
  }
}
