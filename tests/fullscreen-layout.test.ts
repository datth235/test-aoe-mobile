import { describe, expect, it } from 'vitest';
import { fullscreenButtonY, isUiScreenPoint } from '../src/ui/layout';

describe('fullscreen control hit area', () => {
  it('keeps the floating control separate from world taps on a phone', () => {
    const safe = { top: 0, right: 0, bottom: 0, left: 0 };
    const y = fullscreenButtonY(390, safe);
    expect(isUiScreenPoint(844 - 48, y, 844, 390, safe)).toBe(true);
    expect(isUiScreenPoint(700, y, 844, 390, safe)).toBe(false);
    expect(isUiScreenPoint(700, 20, 844, 390, safe)).toBe(true);
    expect(isUiScreenPoint(700, 350, 844, 390, safe)).toBe(true);
  });

  it('tracks the safe inset on a notched phone', () => {
    const safe = { top: 0, right: 34, bottom: 10, left: 0 };
    const y = fullscreenButtonY(390, safe);
    expect(isUiScreenPoint(844 - 34 - 48, y, 844, 390, safe)).toBe(true);
    expect(isUiScreenPoint(690, y, 844, 390, safe)).toBe(false);
  });
});
