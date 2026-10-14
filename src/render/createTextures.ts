import Phaser from 'phaser';
import { palette as p } from './palette';
import { buildings, units, type BuildingKind, type UnitKind } from '../sim/Domain';
type G = Phaser.GameObjects.Graphics;
function poly(g: G, color: number, points: number[]): void {
  g.fillStyle(color).fillPoints(Array.from({ length: points.length / 2 }, (_, i) => ({ x: points[i * 2] ?? 0, y: points[i * 2 + 1] ?? 0 })), true);
}
function tile(g: G, color: number): void {
  const r = (color >> 16) & 255, green = (color >> 8) & 255, b = color & 255;
  const edge = Phaser.Display.Color.GetColor(Math.floor(r * .92), Math.floor(green * .92), Math.floor(b * .92));
  poly(g, edge, [32, 0, 64, 16, 32, 32, 0, 16]);
  poly(g, color, [32, 1, 62, 16, 32, 30, 2, 16]);
}
function shadow(g: G, x: number, y: number, w: number): void { g.fillStyle(0x203829, .22).fillEllipse(x, y, w, 12); }
export function createTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 });
  const keys: string[] = [];
  for (let i = 0; i < 4; i++) {
    g.clear(); tile(g, p.grass[i] ?? p.grass[0]!);
    g.lineStyle(1, 0x497d43, .65).lineBetween(15 + i * 5, 15, 17 + i * 5, 12).lineBetween(18 + i * 5, 15, 17 + i * 5, 12);
    g.lineBetween(42 - i * 3, 19, 43 - i * 3, 16);
    if (i % 2 === 0) { g.fillStyle(0xf2e7a1).fillCircle(38, 13, 1.4); g.fillStyle(0xffffff).fillCircle(24, 20, 1); }
    g.generateTexture(`grass-${i}`, 64, 32);
    keys.push(`grass-${i}`);
  }
  g.clear(); tile(g, p.sand); g.fillStyle(0xbda268, .7).fillCircle(24, 17, 2); g.generateTexture('sand', 64, 32); keys.push('sand');
  for (let i = 0; i < 3; i++) {
    g.clear(); tile(g, p.water);
    g.lineStyle(2, p.waterLight, .55).lineBetween(14 + i * 5, 15, 29 + i * 5, 15).lineBetween(35 - i * 3, 21, 48 - i * 3, 21);
    g.generateTexture(`water-${i}`, 64, 32);
    keys.push(`water-${i}`);
  }
  for (let i = 0; i < 3; i++) {
    g.clear(); shadow(g, 32, 55, 42);
    g.fillStyle(p.woodDark).fillRect(29, 30, 8, 26);
    g.fillStyle(p.woodLight).fillRect(29, 30, 3, 24);
    for (const [x, y, r] of [[23, 24, 16], [42, 25, 15], [32, 14, 18]] as const) {
      g.fillStyle(0x244b35).fillCircle(x + i - 1, y + 2, r + 2);
      g.fillStyle(i === 1 ? 0x3e8050 : 0x3b7548).fillCircle(x + i, y, r);
      g.fillStyle(0x68a763, .8).fillEllipse(x - 4 + i, y - 5, r, r * .55);
    }
    g.generateTexture(`tree-${i}`, 64, 64);
    keys.push(`tree-${i}`);
  }
  g.clear(); shadow(g, 32, 43, 39);
  g.fillStyle(0x315235).fillCircle(24, 31, 12).fillCircle(40, 31, 12).fillCircle(32, 23, 13);
  g.fillStyle(0x57914e).fillCircle(22, 28, 10).fillCircle(39, 28, 10).fillCircle(31, 20, 11);
  g.fillStyle(0xc9443f).fillCircle(17, 28, 3).fillCircle(30, 17, 3).fillCircle(41, 26, 3).fillCircle(33, 34, 3);
  g.fillStyle(0xf6a082).fillCircle(16, 27, 1).fillCircle(29, 16, 1);
  g.generateTexture('berries', 64, 48); keys.push('berries');
  for (const kind of ['gold', 'stone'] as const) {
    g.clear(); shadow(g, 32, 41, 40);
    g.fillStyle(0x48524e).fillTriangle(8, 38, 19, 14, 34, 40).fillTriangle(22, 40, 39, 9, 55, 40);
    g.fillStyle(kind === 'gold' ? 0x8f7950 : 0x89938f).fillTriangle(10, 36, 20, 15, 31, 36).fillTriangle(26, 37, 40, 11, 52, 37);
    g.fillStyle(kind === 'gold' ? 0xe8be52 : 0xc1c9c4).fillTriangle(19, 15, 26, 22, 17, 28).fillTriangle(40, 11, 46, 21, 36, 20);
    if (kind === 'gold') { g.fillStyle(0xfff3ac).fillCircle(47, 7, 2); g.lineStyle(1, 0xfff3ac).lineBetween(47, 2, 47, 12).lineBetween(42, 7, 52, 7); }
    g.generateTexture(kind, 64, 48); keys.push(kind);
  }
  const kinds = Object.keys(buildings) as BuildingKind[];
  for (const kind of kinds) for (const stage of ['finished', 'site'] as const) {
    g.clear(); shadow(g, 64, 100, 100);
    poly(g, p.outline, [18, 57, 64, 76, 112, 55, 112, 87, 64, 112, 18, 88]);
    poly(g, p.wall, [20, 57, 64, 77, 64, 109, 20, 87]);
    poly(g, p.wallDark, [64, 77, 110, 56, 110, 86, 64, 109]);
    g.lineStyle(2, p.woodDark).lineBetween(20, 57, 20, 87).lineBetween(64, 77, 64, 109).lineBetween(110, 56, 110, 86);
    if (stage === 'finished') {
      poly(g, p.woodDark, [11, 53, 59, 17, 119, 51, 64, 82]);
      poly(g, p.woodLight, [13, 52, 59, 20, 64, 77]);
      poly(g, kind === 'town-center' ? p.players[0]! : 0x9a5c43, [59, 20, 116, 51, 64, 77]);
      poly(g, p.woodDark, [40, 87, 52, 92, 52, 106, 40, 100]);
      g.fillStyle(0xf9db80).fillRect(81, 79, 9, 7); g.lineStyle(2, p.woodDark).strokeRect(81, 79, 9, 7);
      if (kind === 'town-center') { g.fillStyle(p.woodDark).fillRect(87, 17, 11, 17); g.fillStyle(0xb6b2a0, .8).fillCircle(94, 12, 5); }
      if (kind === 'stable') { g.fillStyle(p.woodDark).fillRect(71, 88, 24, 13); g.lineStyle(2, p.woodLight).lineBetween(83, 88, 83, 101); }
      if (kind === 'archery-range') g.lineStyle(3, p.woodDark).strokeCircle(31, 79, 8);
    } else {
      g.lineStyle(4, p.woodLight).lineBetween(18, 49, 64, 68).lineBetween(64, 68, 111, 48).lineBetween(18, 49, 18, 90).lineBetween(111, 48, 111, 88);
      g.lineStyle(2, p.woodDark).lineBetween(18, 49, 64, 108).lineBetween(111, 48, 64, 108);
    }
    g.generateTexture(`${kind}-${stage}`, 128, 116);
    keys.push(`${kind}-${stage}`);
  }
  const unitKinds = Object.keys(units) as UnitKind[];
  for (const kind of unitKinds) {
    g.clear(); shadow(g, 20, 41, kind === 'cavalry' ? 31 : 20);
    if (kind === 'cavalry') { g.fillStyle(p.woodDark).fillEllipse(20, 26, 24, 12).fillRect(12, 30, 3, 10).fillRect(27, 30, 3, 10); g.fillStyle(p.woodLight).fillEllipse(30, 22, 8, 7); }
    else g.fillStyle(0x453d39).fillRect(14, 32, 4, 8).fillRect(22, 32, 4, 8);
    g.fillStyle(kind === 'villager' ? 0x9b6a43 : p.players[0]!).fillEllipse(20, 25, 13, 18);
    g.fillStyle(0xf0c493).fillCircle(20, 13, 6); g.fillStyle(p.woodDark).fillEllipse(20, 9, 13, 5);
    if (kind === 'villager') { g.lineStyle(2, p.woodDark).lineBetween(29, 19, 32, 35); g.fillStyle(0xb3b8ab).fillTriangle(26, 17, 34, 15, 32, 23); }
    if (kind === 'spearman') g.lineStyle(2, p.woodDark).lineBetween(31, 5, 31, 38);
    if (kind === 'archer') g.lineStyle(2, p.woodDark).strokeCircle(30, 24, 9);
    if (kind === 'clubman' || kind === 'swordsman') g.lineStyle(3, kind === 'clubman' ? p.woodDark : 0xbecbd0).lineBetween(29, 13, 33, 34);
    g.generateTexture(`unit-${kind}`, 40, 44);
    keys.push(`unit-${kind}`);
  }
  g.clear(); g.fillStyle(p.players[0]!).fillTriangle(8, 3, 28, 10, 8, 20); g.lineStyle(2, 0xf5e8c3).lineBetween(8, 3, 8, 34); g.generateTexture('rally-flag', 36, 36); keys.push('rally-flag');
  g.clear(); g.fillStyle(0x315e51).fillRoundedRect(1, 1, 46, 46, 9); g.lineStyle(2, 0x8db795).strokeRoundedRect(1, 1, 46, 46, 9); g.generateTexture('ui-button', 48, 48); keys.push('ui-button');
  g.clear(); g.fillStyle(0xd9c6a2, .6).fillCircle(6, 6, 5); g.generateTexture('dust', 12, 12); keys.push('dust');
  g.clear(); g.fillStyle(0xe2e7da, .48).fillCircle(9, 9, 8); g.fillStyle(0xffffff, .22).fillCircle(6, 6, 4); g.generateTexture('smoke', 18, 18); keys.push('smoke');
  g.destroy();
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 384;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable for texture atlas');
  const atlas = scene.textures.addCanvas('world-atlas', canvas);
  if (!atlas) throw new Error('Could not create texture atlas');
  let x = 0, y = 0, rowHeight = 0;
  for (const key of keys) {
    const source = scene.textures.get(key).getSourceImage() as HTMLCanvasElement;
    if (x + source.width > canvas.width) { x = 0; y += rowHeight; rowHeight = 0; }
    if (y + source.height > canvas.height) throw new Error('Texture atlas overflow');
    ctx.drawImage(source, x, y);
    atlas.add(key, 0, x, y, source.width, source.height);
    x += source.width; rowHeight = Math.max(rowHeight, source.height);
    scene.textures.remove(key);
  }
  atlas.refresh();
}
