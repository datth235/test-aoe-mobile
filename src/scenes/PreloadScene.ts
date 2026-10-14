import Phaser from 'phaser';
import { createTextures } from '../render/createTextures';
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }
  preload(): void {
    const w = this.scale.width, h = this.scale.height;
    this.add.text(w / 2, h / 2 - 38, 'Preparing the world', { fontFamily: 'system-ui', fontSize: '22px', color: '#f5ce83' }).setOrigin(.5);
    this.add.rectangle(w / 2, h / 2 + 5, Math.min(300, w * .6), 12, 0x315e51);
    const fill = this.add.rectangle(w / 2 - Math.min(300, w * .6) / 2, h / 2 + 5, Math.min(296, w * .6 - 4), 8, 0xf5ce83).setOrigin(0, .5).setScale(0, 1);
    this.load.on('progress', (value: number) => fill.setScale(value, 1));
    this.load.binary('nunito-font', 'assets/Nunito.ttf');
  }
  async create(): Promise<void> {
    const data = this.cache.binary.get('nunito-font') as ArrayBuffer | undefined;
    if (data) {
      try { const font = new FontFace('Nunito', data, { weight: '200 1000' }); await font.load(); document.fonts.add(font); }
      catch (error) { console.warn('Font load failed', error); }
    }
    createTextures(this);
    this.scene.start('TapToStart');
  }
}
