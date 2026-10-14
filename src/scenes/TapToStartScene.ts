import Phaser from 'phaser';
import { enterFullscreen } from '../ui/fullscreen';
export class TapToStartScene extends Phaser.Scene {
  constructor() {
    super('TapToStart');
  }
  create(): void {
    const overlay = document.getElementById('start-screen');
    const button = document.getElementById('start-button');
    const start = (): void => {
      overlay?.setAttribute('hidden', '');
      // These calls happen synchronously inside the user's gesture; Safari/Chrome
      // may reject them, so none of them is a prerequisite for starting the game.
      if (this.sound instanceof Phaser.Sound.WebAudioSoundManager)
        void this.sound.context.resume().catch(() => undefined);
      void enterFullscreen(false);
      this.scene.start('MainMenu');
    };
    button?.addEventListener('click', start, { once: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      button?.removeEventListener('click', start),
    );
  }
}
