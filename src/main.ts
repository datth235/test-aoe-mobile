import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import './style.css';
import { installDrawCallMeter } from './render/DrawCallMeter';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TapToStartScene } from './scenes/TapToStartScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { SetupScene } from './scenes/SetupScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

const viewport = window.visualViewport;
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#102b29',
  width: Math.round(viewport?.width ?? innerWidth),
  height: Math.round(viewport?.height ?? innerHeight),
  // Phaser 3.90 uses a 1× backing buffer: deliberately below the DPR ≤ 2 cap.
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { antialias: true, roundPixels: false, powerPreference: 'high-performance' },
  input: { activePointers: 3 },
  fps: { target: 60 },
  scene: [BootScene, PreloadScene, TapToStartScene, MainMenuScene, SetupScene, GameScene, UIScene],
});

let suspended = false;
function syncViewport(): void {
  const width = Math.round(viewport?.width ?? innerWidth),
    height = Math.round(viewport?.height ?? innerHeight);
  const host = document.getElementById('game');
  if (host) {
    host.style.width = `${width}px`;
    host.style.height = `${height}px`;
  }
  game.scale.resize(width, height);
  const portrait = height > width;
  document.getElementById('rotate-screen')?.toggleAttribute('hidden', !portrait);
  const shouldSuspend = document.hidden || portrait;
  if (shouldSuspend !== suspended) {
    suspended = shouldSuspend;
    if (suspended) game.loop.sleep();
    else game.loop.wake();
  }
}
window.addEventListener('resize', syncViewport);
document.addEventListener('fullscreenchange', syncViewport);
viewport?.addEventListener('resize', syncViewport);
document.addEventListener('visibilitychange', syncViewport);
game.events.once(Phaser.Core.Events.READY, () => {
  game.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  installDrawCallMeter(game);
  queueMicrotask(syncViewport);
});
window.addEventListener('error', () =>
  document.getElementById('fatal-error')?.removeAttribute('hidden'),
);
const toast = document.getElementById('update-toast');
const updateSW = registerSW({
  onNeedRefresh() {
    toast?.removeAttribute('hidden');
  },
  onRegisterError(error: unknown) {
    console.warn('Offline registration unavailable:', error);
  },
  onRegisteredSW(_url, registration) {
    if (registration) {
      window.setInterval(
        () => {
          if (!document.hidden) void registration.update().catch(() => undefined);
        },
        60 * 60 * 1000,
      );
    }
  },
});
toast?.addEventListener('click', () => {
  void updateSW(true);
});
