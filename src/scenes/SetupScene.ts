import Phaser from 'phaser';
import { matchConfig } from '../data/match';
import { button, safeInsets } from '../ui/button';
export class SetupScene extends Phaser.Scene {
  constructor() {
    super('Setup');
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
      safe = safeInsets(),
      cx = w / 2;
    this.add
      .text(cx, safe.top + 24, 'Your first dominion', {
        fontFamily: 'Nunito, system-ui, sans-serif',
        fontSize: '28px',
        color: '#f5ce83',
      })
      .setOrigin(0.5, 0);
    this.add
      .text(cx, safe.top + 64, 'Build your base and train an army', {
        fontFamily: 'Nunito, system-ui, sans-serif',
        fontSize: '12px',
        color: '#aec5b5',
      })
      .setOrigin(0.5, 0);
    button(
      this,
      cx - 108,
      h * 0.43,
      200,
      `${matchConfig.size === 64 ? '●' : '○'}  Small · 64 × 64`,
      () => {
        matchConfig.size = 64;
        this.draw();
      },
    );
    button(
      this,
      cx + 108,
      h * 0.43,
      200,
      `${matchConfig.size === 96 ? '●' : '○'}  Medium · 96 × 96`,
      () => {
        matchConfig.size = 96;
        this.draw();
      },
    );
    button(this, cx, h * 0.65, 280, `Seed: ${matchConfig.seed}  ↻`, () => {
      matchConfig.seed = `dominion-${Date.now().toString(36)}`;
      this.draw();
    });
    button(this, safe.left + 64, h - safe.bottom - 36, 96, '← Back', () =>
      this.scene.start('MainMenu'),
    );
    button(this, w - safe.right - 120, h - safe.bottom - 36, 208, 'Begin exploration  →', () =>
      this.scene.start('Game'),
    );
  };
}
