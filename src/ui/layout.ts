export interface Insets { top: number; right: number; bottom: number; left: number }

export function fullscreenButtonY(height: number, safe: Insets): number {
  return Math.min(safe.top + 112, height - 190 - safe.bottom - 27);
}

export function isUiScreenPoint(x: number, y: number, width: number, height: number, safe: Insets): boolean {
  const panelTop = height - 190 - safe.bottom;
  if (y < 68 + safe.top || y > panelTop) return true;
  const buttonX = width - safe.right - 48;
  const buttonY = fullscreenButtonY(height, safe);
  return Math.abs(x - buttonX) <= 42 && Math.abs(y - buttonY) <= 24;
}
