import { describe, it, expect } from 'vitest';
import { validateStyle, suggestAdjustments, DEFAULT_STYLE_GUIDE } from '../../src/style/validator';

function makeImage(w: number, h: number, fillFn: (x: number, y: number) => [number, number, number, number]): { width: number; height: number; data: Uint8ClampedArray } {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = fillFn(x, y);
      const i = (y * w + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    }
  }
  return { width: w, height: h, data };
}

describe('Style Validator', () => {
  it('passes a well-balanced image', () => {
    // Dark-dominant with good color variety and mid-tones
    const img = makeImage(100, 100, (x, y) => {
      const lum = (x / 100) * 200 + 20;
      const hue = (y / 100) * 360;
      const s = 50;
      // Simple HSL to RGB approximation
      const h = hue / 60;
      const c = (1 - Math.abs(2 * (lum / 255) - 1)) * (s / 100);
      const m = lum / 255 - c / 2;
      let r = m, g = m, b = m;
      if (h < 1) { r = c + m; g = h * c + m; }
      else if (h < 2) { r = (2 - h) * c + m; g = c + m; }
      else if (h < 3) { g = c + m; b = (h - 2) * c + m; }
      else if (h < 4) { g = (4 - h) * c + m; b = c + m; }
      else if (h < 5) { r = (h - 4) * c + m; b = c + m; }
      else { r = c + m; b = (6 - h) * c + m; }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255), 255];
    });
    const result = validateStyle(img);
    expect(result.score).toBeGreaterThan(40);
    expect(result.checks.length).toBeGreaterThan(4);
  });

  it('fails an all-black image', () => {
    const img = makeImage(50, 50, () => [2, 2, 2, 255]);
    const result = validateStyle(img);
    expect(result.passed).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('fails an all-white image', () => {
    const img = makeImage(50, 50, () => [250, 250, 250, 255]);
    const result = validateStyle(img);
    expect(result.passed).toBe(false);
  });

  it('flags monochromatic images', () => {
    const img = makeImage(50, 50, (x) => [100 + x, 0, 0, 255]);
    const result = validateStyle(img);
    const hueCheck = result.checks.find(c => c.name === 'Color variety');
    expect(hueCheck).toBeDefined();
    // Pure red only = 1 hue bucket, should flag as low variety
  });

  it('handles mostly transparent images', () => {
    const img = makeImage(50, 50, (x, y) => {
      if (x > 20 && x < 30 && y > 20 && y < 30) return [150, 80, 40, 255];
      return [0, 0, 0, 0];
    });
    const result = validateStyle(img);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('handles empty images gracefully', () => {
    const img = makeImage(10, 10, () => [0, 0, 0, 0]);
    const result = validateStyle(img);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  describe('suggestAdjustments()', () => {
    it('suggests contrast increase for flat images', () => {
      const result = {
        passed: false, score: 50, suggestions: [],
        checks: [{ name: 'Contrast', passed: false, score: 30, detail: 'looks flat' }],
      };
      const adj = suggestAdjustments(result);
      expect(adj.contrast).toBeGreaterThan(0);
    });

    it('returns empty for passing results', () => {
      const result = {
        passed: true, score: 95, suggestions: [],
        checks: [{ name: 'Contrast', passed: true, score: 95, detail: 'good' }],
      };
      const adj = suggestAdjustments(result);
      expect(Object.keys(adj).length).toBe(0);
    });
  });
});
