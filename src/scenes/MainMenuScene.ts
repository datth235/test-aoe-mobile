import Phaser from 'phaser';
import { button, safeInsets } from '../ui/button';
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }
  create(): void {
    this.cameras.main.setBackgroundColor('#102b29');
    this.draw();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.draw, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.draw, this),
    );
  }
  private draw = (): void => {
    this.children.removeAll(true);
    const w = this.scale.width,
      h = this.scale.height,
      safe = safeInsets();
    const x = Math.max(48, safe.left + 24);
    this.add.text(x, Math.max(25, safe.top + 16), 'AGES OF DOMINION', {
      fontFamily: 'Nunito, system-ui, sans-serif',
      fontSize: '30px',
      color: '#f5ce83',
    });
    this.add.text(x, 85, 'BUILD · TRAIN · CONQUER', {
      fontFamily: 'Nunito, system-ui, sans-serif',
      fontSize: '11px',
      color: '#95b29e',
      letterSpacing: 3,
    });
    this.add.image(w * 0.73, h * 0.53, 'world-atlas', 'town-center-finished').setScale(Math.min(2.5, h / 150));
    this.add.text(x, h * 0.45, 'Choose your land.\nMake room for an empire.', {
      fontFamily: 'Nunito, system-ui, sans-serif',
      fontSize: '22px',
      color: '#e9efdc',
      lineSpacing: 5,
    });
    button(this, x + 120, h - safe.bottom - 48, 240, 'Explore a new map  →', () =>
      this.scene.start('Setup'),
    );
  };
}
