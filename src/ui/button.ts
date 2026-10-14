import Phaser from 'phaser';
export function clickFeedback(scene: Phaser.Scene): void {
  navigator.vibrate?.(8);
  if (!(scene.sound instanceof Phaser.Sound.WebAudioSoundManager)) return;
  const context = scene.sound.context;
  if (context.state !== 'running') return;
  const oscillator = context.createOscillator(), gain = context.createGain();
  oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(620, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(420, context.currentTime + .045);
  gain.gain.setValueAtTime(.045, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .06);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(); oscillator.stop(context.currentTime + .06);
}
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  label: string,
  onTap: () => void,
): Phaser.GameObjects.Container {
  const bg = scene.add.nineslice(0, 0, 'world-atlas', 'ui-button', width, 48, 10, 10, 10, 10).setScrollFactor(0);
  const text = scene.add
    .text(0, 0, label, {
      fontFamily: 'Nunito, system-ui, sans-serif',
      fontSize: '14px',
      color: '#f6dfac',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);
  bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, 48), Phaser.Geom.Rectangle.Contains);
  bg.on('pointerdown', () => bg.setScale(0.95));
  bg.on('pointerout', () => bg.setScale(1));
  bg.on('pointerup', () => {
    bg.setScale(1);
    clickFeedback(scene);
    onTap();
  });
  return container;
}
export function safeInsets(): { top: number; bottom: number; left: number; right: number } {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);
  const css = getComputedStyle(probe);
  const result = {
    top: parseFloat(css.paddingTop) || 0,
    bottom: parseFloat(css.paddingBottom) || 0,
    left: parseFloat(css.paddingLeft) || 0,
    right: parseFloat(css.paddingRight) || 0,
  };
  probe.remove();
  return result;
}
