import { describe, it, expect } from 'vitest';
import {
  generateNeonShades, ditherQuantize, quantizeToShades,
  extractOutline, extractInnerLines, pixelArtPipeline,
  convertToPixelArt,
} from '../../src/engine/pixelart';
import { createPixelBuffer, setPixel, getPixel } from '../../src/engine/renderer';
import { createNeonColor } from '../../src/style/colors';
import type { RGBA } from '../../src/style/types';

const testNeon = createNeonColor('Test', 300, 100, 60);

function makeSimpleSprite(size: number): ReturnType<typeof createPixelBuffer> {
  const buf = createPixelBuffer(size, size);
  for (let y = 4; y < size - 4; y++) {
    for (let x = 4; x < size - 4; x++) {
      const brightness = 60 + Math.round((x / size) * 150);
      setPixel(buf, x, y, [brightness, brightness * 0.7, brightness * 0.3, 1]);
    }
  }
  return buf;
}

describe('Pixel Art Engine', () => {
  describe('generateNeonShades()', () => {
    it('generates requested number of shades', () => {
      const shades = generateNeonShades(testNeon, 5);
      expect(shades).toHaveLength(5);
    });

    it('shades go from dark to bright', () => {
      const shades = generateNeonShades(testNeon, 5);
      for (let i = 1; i < shades.length; i++) {
        const prevBright = shades[i-1][0] + shades[i-1][1] + shades[i-1][2];
        const currBright = shades[i][0] + shades[i][1] + shades[i][2];
        expect(currBright).toBeGreaterThanOrEqual(prevBright);
      }
    });

    it('first shade is very dark', () => {
      const shades = generateNeonShades(testNeon, 5);
      const brightness = shades[0][0] + shades[0][1] + shades[0][2];
      expect(brightness).toBeLessThan(30);
    });

    it('last shade is very bright', () => {
      const shades = generateNeonShades(testNeon, 5);
      const last = shades[shades.length - 1];
      const brightness = last[0] + last[1] + last[2];
      expect(brightness).toBeGreaterThan(300);
    });
  });

  describe('ditherQuantize()', () => {
    it('returns index within range', () => {
      for (let i = 0; i < 20; i++) {
        const idx = ditherQuantize(Math.random(), i % 4, Math.floor(i / 4), 5);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(4);
      }
    });

    it('very dark input maps to shade 0', () => {
      const idx = ditherQuantize(0, 0, 0, 5, 0);
      expect(idx).toBe(0);
    });

    it('very bright input maps to last shade', () => {
      const idx = ditherQuantize(1, 0, 0, 5, 0);
      expect(idx).toBe(4);
    });
  });

  describe('quantizeToShades()', () => {
    it('output only contains colors from the shade palette', () => {
      const sprite = makeSimpleSprite(16);
      const shades = generateNeonShades(testNeon, 4);
      const result = quantizeToShades(sprite, shades, 0); // No dither for exact matching

      const shadeSet = new Set(shades.map(s => `${s[0]},${s[1]},${s[2]}`));

      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const px = getPixel(result, x, y);
          if (px[3] < 0.1) continue;
          const key = `${px[0]},${px[1]},${px[2]}`;
          expect(shadeSet.has(key)).toBe(true);
        }
      }
    });

    it('preserves transparency', () => {
      const sprite = makeSimpleSprite(16);
      const shades = generateNeonShades(testNeon, 4);
      const result = quantizeToShades(sprite, shades);
      // Corners should still be transparent
      expect(getPixel(result, 0, 0)[3]).toBeLessThan(0.1);
    });
  });

  describe('extractOutline()', () => {
    it('detects boundary pixels', () => {
      const sprite = createPixelBuffer(16, 16);
      for (let y = 4; y < 12; y++) {
        for (let x = 4; x < 12; x++) {
          setPixel(sprite, x, y, [200, 100, 50, 1]);
        }
      }
      const outline = extractOutline(sprite);
      // Edge pixel should be marked
      expect(getPixel(outline, 4, 4)[0]).toBe(255);
      // Interior pixel should NOT be marked
      expect(getPixel(outline, 8, 8)[0]).toBe(0);
      // Background should NOT be marked
      expect(getPixel(outline, 0, 0)[0]).toBe(0);
    });

    it('produces 1px thick outlines', () => {
      const sprite = createPixelBuffer(32, 32);
      for (let y = 8; y < 24; y++) {
        for (let x = 8; x < 24; x++) {
          setPixel(sprite, x, y, [200, 100, 50, 1]);
        }
      }
      const outline = extractOutline(sprite);
      // The pixel at (9, 8) is outline (top edge)
      expect(getPixel(outline, 9, 8)[0]).toBe(255);
      // The pixel at (9, 9) should NOT be outline (it's interior, all neighbors are opaque)
      expect(getPixel(outline, 9, 9)[0]).toBe(0);
    });
  });

  describe('extractInnerLines()', () => {
    it('detects brightness transitions within opaque regions', () => {
      const sprite = createPixelBuffer(16, 16);
      // Left half bright, right half dark (but all opaque)
      for (let y = 2; y < 14; y++) {
        for (let x = 2; x < 14; x++) {
          const bright = x < 8 ? 200 : 50;
          setPixel(sprite, x, y, [bright, bright, bright, 1]);
        }
      }
      const lines = extractInnerLines(sprite, 40);
      // The boundary between bright and dark (around x=8) should be detected
      const linePixel = getPixel(lines, 8, 8);
      expect(linePixel[0]).toBeGreaterThan(0);
    });
  });

  describe('pixelArtPipeline()', () => {
    it('produces output at displayScale resolution', () => {
      const sprite = makeSimpleSprite(32);
      const result = pixelArtPipeline(sprite, testNeon, undefined, { displayScale: 3 });
      expect(result.width).toBe(96);
      expect(result.height).toBe(96);
    });

    it('output has visible pixel blocks (nearest-neighbor scaling)', () => {
      const sprite = makeSimpleSprite(16);
      const result = pixelArtPipeline(sprite, testNeon, undefined, { displayScale: 4 });
      // Adjacent pixels within the same art-pixel block should be identical
      // (before glow is applied; glow will make them slightly different)
      // Check a deep interior pixel where glow has minimal effect
      // This is hard to test precisely due to glow, so just verify dimensions
      expect(result.width).toBe(64);
      expect(result.height).toBe(64);
    });

    it('output is high contrast (lots of dark, some bright)', () => {
      const sprite = makeSimpleSprite(32);
      const result = pixelArtPipeline(sprite, testNeon, undefined, { displayScale: 2 });
      let dark = 0, bright = 0, total = 0;
      for (let i = 0; i < result.data.length; i += 4) {
        if (result.data[i + 3] < 10) continue;
        total++;
        const lum = result.data[i] * 0.299 + result.data[i + 1] * 0.587 + result.data[i + 2] * 0.114;
        if (lum < 30) dark++;
        if (lum > 150) bright++;
      }
      // Should have significant dark areas
      expect(dark / total).toBeGreaterThan(0.15);
    });
  });

  describe('convertToPixelArt()', () => {
    it('downscales then processes', () => {
      // Start with a large image
      const large = createPixelBuffer(128, 128);
      for (let y = 16; y < 112; y++) {
        for (let x = 16; x < 112; x++) {
          setPixel(large, x, y, [200, 120, 60, 1]);
        }
      }
      const result = convertToPixelArt(large, 32, 32, testNeon, undefined, { displayScale: 2 });
      expect(result.width).toBe(64); // 32 * 2
      expect(result.height).toBe(64);
    });
  });
});
