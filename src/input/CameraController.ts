import Phaser from 'phaser';
import { safeInsets } from '../ui/button';
import { isUiScreenPoint } from '../ui/layout';
interface PointerState {
  x: number;
  y: number;
  startX: number;
  startY: number;
  started: number;
  dragged: boolean;
}
/** Native pointer events keep UI-origin gestures out of the world camera. */
export class CameraController {
  private readonly pointers = new Map<number, PointerState>();
  private lastX = 0;
  private lastY = 0;
  private lastDistance = 0;
  private centerX = 0;
  private centerY = 0;
  private distance = 0;
  private readonly before = new Phaser.Math.Vector2();
  private readonly after = new Phaser.Math.Vector2();
  private readonly canvas: HTMLCanvasElement;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private rect: DOMRect;
  private enabled = true;
  private velocityX = 0;
  private velocityY = 0;
  private lastMoveAt = 0;
  constructor(
    scene: Phaser.Scene,
    private readonly bounds: Phaser.Geom.Rectangle,
    private readonly onTap: (x: number, y: number) => void,
  ) {
    this.canvas = scene.game.canvas;
    this.camera = scene.cameras.main;
    this.rect = this.canvas.getBoundingClientRect();
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onUp);
    this.canvas.addEventListener('lostpointercapture', this.onUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('blur', this.reset);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onUpdate);
    this.scene = scene;
  }
  private readonly scene: Phaser.Scene;
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.reset();
  }
  private blocked(x: number, y: number): boolean {
    const px = ((x - this.rect.left) * this.camera.width) / this.rect.width;
    const py = ((y - this.rect.top) * this.camera.height) / this.rect.height;
    return isUiScreenPoint(px, py, this.camera.width, this.camera.height, safeInsets());
  }
  private onDown = (event: PointerEvent): void => {
    this.rect = this.canvas.getBoundingClientRect();
    this.velocityX = 0; this.velocityY = 0;
    if (!this.enabled || this.blocked(event.clientX, event.clientY) || event.button > 0 || this.pointers.size >= 2)
      return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, started: performance.now(), dragged: false });
    if (this.pointers.size > 1) for (const p of this.pointers.values()) p.dragged = true;
    this.canvas.setPointerCapture(event.pointerId);
    this.rebaseline();
    this.lastMoveAt = performance.now();
  };
  private metrics(): void {
    let x = 0,
      y = 0,
      distance = 0;
    let first: PointerState | undefined;
    for (const pointer of this.pointers.values()) {
      x += pointer.x;
      y += pointer.y;
      if (first) distance = Math.hypot(pointer.x - first.x, pointer.y - first.y);
      else first = pointer;
    }
    const count = this.pointers.size || 1;
    this.centerX = x / count;
    this.centerY = y / count;
    this.distance = distance;
  }
  private rebaseline(): void {
    this.metrics();
    this.lastX = this.centerX;
    this.lastY = this.centerY;
    this.lastDistance = this.distance;
  }
  private onMove = (event: PointerEvent): void => {
    const pointer = this.pointers.get(event.pointerId);
    if (!pointer) return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (Math.hypot(pointer.x - pointer.startX, pointer.y - pointer.startY) >= 10) pointer.dragged = true;
    if (this.pointers.size === 1 && !pointer.dragged) return;
    this.metrics();
    const scaleX = this.camera.width / this.rect.width,
      scaleY = this.camera.height / this.rect.height;
    const screenX = (this.centerX - this.rect.left) * scaleX,
      screenY = (this.centerY - this.rect.top) * scaleY;
    // Pan first. Then preserve the world point at the pinch center through zoom.
    const dx = -((this.centerX - this.lastX) * scaleX) / this.camera.zoom;
    const dy = -((this.centerY - this.lastY) * scaleY) / this.camera.zoom;
    this.camera.scrollX += dx;
    this.camera.scrollY += dy;
    const now = performance.now(), dt = Math.max(8, now - this.lastMoveAt);
    this.velocityX = dx / dt; this.velocityY = dy / dt; this.lastMoveAt = now;
    if (this.pointers.size === 2 && this.lastDistance > 0 && this.distance > 0) {
      this.camera.preRender();
      this.camera.getWorldPoint(screenX, screenY, this.before);
      this.camera.setZoom(
        Phaser.Math.Clamp((this.camera.zoom * this.distance) / this.lastDistance, 0.5, 2),
      );
      this.camera.preRender();
      this.camera.getWorldPoint(screenX, screenY, this.after);
      this.camera.scrollX += this.before.x - this.after.x;
      this.camera.scrollY += this.before.y - this.after.y;
    }
    this.clamp();
    this.lastX = this.centerX;
    this.lastY = this.centerY;
    this.lastDistance = this.distance;
  };
  private onUp = (event: PointerEvent): void => {
    const pointer = this.pointers.get(event.pointerId);
    if (pointer && !pointer.dragged && performance.now() - pointer.started < 250 && this.pointers.size === 1) {
      const x = ((event.clientX - this.rect.left) * this.camera.width) / this.rect.width;
      const y = ((event.clientY - this.rect.top) * this.camera.height) / this.rect.height;
      this.onTap(x, y);
    }
    this.pointers.delete(event.pointerId);
    this.rebaseline();
  };
  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.rect = this.canvas.getBoundingClientRect();
    if (!this.enabled || this.blocked(event.clientX, event.clientY)) return;
    const x = ((event.clientX - this.rect.left) * this.camera.width) / this.rect.width;
    const y = ((event.clientY - this.rect.top) * this.camera.height) / this.rect.height;
    this.camera.preRender();
    this.camera.getWorldPoint(x, y, this.before);
    this.camera.setZoom(
      Phaser.Math.Clamp(this.camera.zoom * Math.exp(-event.deltaY * 0.001), 0.5, 2),
    );
    this.camera.preRender();
    this.camera.getWorldPoint(x, y, this.after);
    this.camera.scrollX += this.before.x - this.after.x;
    this.camera.scrollY += this.before.y - this.after.y;
    this.clamp();
  };
  private onUpdate = (_time: number, delta: number): void => {
    if (!this.enabled || this.pointers.size || Math.abs(this.velocityX) + Math.abs(this.velocityY) < .003) return;
    this.camera.scrollX += this.velocityX * delta;
    this.camera.scrollY += this.velocityY * delta;
    const decay = Math.pow(.9, delta / 16.7);
    this.velocityX *= decay; this.velocityY *= decay;
    this.clamp();
  };
  clamp(): void {
    const cx = this.camera.scrollX + this.camera.width / 2,
      cy = this.camera.scrollY + this.camera.height / 2;
    this.camera.scrollX =
      Phaser.Math.Clamp(cx, this.bounds.left, this.bounds.right) - this.camera.width / 2;
    this.camera.scrollY =
      Phaser.Math.Clamp(cy, this.bounds.top, this.bounds.bottom) - this.camera.height / 2;
  }
  private reset = (): void => {
    this.pointers.clear();
    this.lastDistance = 0;
    this.velocityX = 0; this.velocityY = 0;
  };
  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('lostpointercapture', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('blur', this.reset);
    this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.onUpdate);
    this.reset();
  }
}
