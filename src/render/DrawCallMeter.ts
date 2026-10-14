import Phaser from 'phaser';
/** Debug-only WebGL instrumentation; no overhead unless ?debug=1. */
export const drawCallMeter: { lastFrame: number | null } = { lastFrame: null };
export function installDrawCallMeter(game: Phaser.Game): void {
  if (new URLSearchParams(location.search).get('debug') !== '1') return;
  const renderer = game.renderer;
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return;
  const gl = renderer.gl,
    drawArrays = gl.drawArrays,
    drawElements = gl.drawElements;
  let current = 0;
  try {
    gl.drawArrays = function (mode: number, first: number, count: number): void {
      current++;
      drawArrays.call(gl, mode, first, count);
    };
    gl.drawElements = function (mode: number, count: number, type: number, offset: number): void {
      current++;
      drawElements.call(gl, mode, count, type, offset);
    };
    game.events.on(Phaser.Core.Events.PRE_RENDER, () => {
      current = 0;
    });
    game.events.on(Phaser.Core.Events.POST_RENDER, () => {
      drawCallMeter.lastFrame = current;
    });
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      gl.drawArrays = drawArrays;
      gl.drawElements = drawElements;
      drawCallMeter.lastFrame = null;
    });
  } catch {
    gl.drawArrays = drawArrays;
    gl.drawElements = drawElements;
  }
}
