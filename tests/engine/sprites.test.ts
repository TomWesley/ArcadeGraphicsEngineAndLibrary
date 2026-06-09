import { describe, it, expect } from 'vitest';
import {
  neonifySprite, createNeonSprite, spriteFromGrid, recolorSprite,
} from '../../src/engine/sprites';
import { createPixelBuffer, setPixel, getPixel } from '../../src/engine/renderer';
import { createNeonColor, PALETTE_NEON_INFERNO } from '../../src/style/colors';
import { DEFAULT_THEME, createTheme } from '../../src/style/theme';
import type { RGBA, NeonColor } from '../../src/style/types';

function makeTestSprite(size: number = 16): ReturnType<typeof createPixelBuffer> {
  const buf = createPixelBuffer(size, size);
  // Draw a solid colored square in the center with border
  for (let y = 2; y < size - 2; y++) {
    for (let x = 2; x < size - 2; x++) {
      const isEdge = x === 2 || x === size - 3 || y === 2 || y === size - 3;
      const color: RGBA = isEdge
        ? [255, 200, 100, 1]
        : [180, 120, 60, 1];
      setPixel(buf, x, y, color);
    }
  }
  return buf;
}

describe('Sprite Neonify', () => {
  describe('neonifySprite()', () => {
    it('returns a buffer of the same dimensions', () => {
      const src = makeTestSprite(16);
      const neonColor = createNeonColor('Test', 300);
      const result = neonifySprite(src, { neonColor });
      expect(result.width).toBe(16);
      expect(result.height).toBe(16);
    });

    it('transparent pixels remain transparent', () => {
      const src = makeTestSprite(16);
      const neonColor = createNeonColor('Test', 300);
      const result = neonifySprite(src, { neonColor });
      // Corner (0,0) was never written to, should be transparent/black
      const px = getPixel(result, 0, 0);
      expect(px[3]).toBeLessThan(0.1);
    });

    it('edge pixels get the core neon color', () => {
      const src = makeTestSprite(16);
      const neonColor = createNeonColor('Test', 300);
      const result = neonifySprite(src, { neonColor });
      // Edge pixel (2, 2) should be close to neon core
      const px = getPixel(result, 2, 2);
      expect(px[3]).toBeGreaterThan(0.5);
      // At least one channel should be significantly colored
      expect(Math.max(px[0], px[1], px[2])).toBeGreaterThan(50);
    });

    it('interior pixels are darker than edge pixels', () => {
      const src = makeTestSprite(32);
      const neonColor = createNeonColor('Test', 120);
      const result = neonifySprite(src, { neonColor });
      const edge = getPixel(result, 2, 2);
      const interior = getPixel(result, 16, 16);
      const edgeBright = edge[0] + edge[1] + edge[2];
      const intBright = interior[0] + interior[1] + interior[2];
      expect(edgeBright).toBeGreaterThan(intBright);
    });

    it('different neon colors produce different results', () => {
      const src = makeTestSprite(16);
      const magenta = createNeonColor('Magenta', 300);
      const cyan = createNeonColor('Cyan', 180);
      const r1 = neonifySprite(src, { neonColor: magenta });
      const r2 = neonifySprite(src, { neonColor: cyan });
      // Edge pixels should have different dominant channels
      const px1 = getPixel(r1, 2, 8);
      const px2 = getPixel(r2, 2, 8);
      // They should not be identical
      const diff = Math.abs(px1[0] - px2[0]) + Math.abs(px1[1] - px2[1]) + Math.abs(px1[2] - px2[2]);
      expect(diff).toBeGreaterThan(20);
    });
  });

  describe('createNeonSprite()', () => {
    it('applies neonify + glow pipeline', () => {
      const src = makeTestSprite(16);
      const result = createNeonSprite(src, DEFAULT_THEME, 'primary');
      expect(result.width).toBe(16);
      expect(result.height).toBe(16);
      // Should have glow spillover near edges
      const nearEdge = getPixel(result, 1, 8);
      // Glow should cause some color to appear near the sprite edge
      expect(nearEdge[0] + nearEdge[1] + nearEdge[2]).toBeGreaterThan(0);
    });

    it('works with all color roles', () => {
      const src = makeTestSprite(8);
      const roles = ['primary', 'secondary', 'tertiary', 'danger'] as const;
      for (const role of roles) {
        const result = createNeonSprite(src, DEFAULT_THEME, role);
        expect(result.width).toBe(8);
        expect(result.height).toBe(8);
        // Some pixels should be non-zero
        let hasContent = false;
        for (let i = 0; i < result.data.length; i += 4) {
          if (result.data[i] > 0 || result.data[i+1] > 0 || result.data[i+2] > 0) {
            hasContent = true;
            break;
          }
        }
        expect(hasContent).toBe(true);
      }
    });
  });
});

describe('spriteFromGrid()', () => {
  it('creates correct dimensions from grid', () => {
    const grid = [
      '00FF00',
      'FF00FF',
      '00FF00',
    ];
    const neonColor = createNeonColor('Test', 120);
    const buf = spriteFromGrid(grid, neonColor);
    expect(buf.width).toBe(3);
    expect(buf.height).toBe(3);
  });

  it('transparent pixels for 00 values', () => {
    const grid = [
      '00FF',
      'FF00',
    ];
    const neonColor = createNeonColor('Test', 180);
    const buf = spriteFromGrid(grid, neonColor);
    expect(getPixel(buf, 0, 0)[3]).toBe(0);
    expect(getPixel(buf, 1, 0)[3]).toBe(1);
    expect(getPixel(buf, 0, 1)[3]).toBe(1);
    expect(getPixel(buf, 1, 1)[3]).toBe(0);
  });

  it('brighter hex values produce brighter pixels', () => {
    const grid = ['40C0'];
    const neonColor = createNeonColor('Test', 0, 100, 60);
    const buf = spriteFromGrid(grid, neonColor);
    const dark = getPixel(buf, 0, 0);
    const bright = getPixel(buf, 1, 0);
    const darkSum = dark[0] + dark[1] + dark[2];
    const brightSum = bright[0] + bright[1] + bright[2];
    expect(brightSum).toBeGreaterThan(darkSum);
  });
});

describe('recolorSprite()', () => {
  it('shifts the hue of all pixels', () => {
    const src = createPixelBuffer(4, 4);
    const fromColor = createNeonColor('From', 300);
    // Fill with magenta-ish
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        setPixel(src, x, y, fromColor.core);
      }
    }

    const toColor = createNeonColor('To', 120);
    const result = recolorSprite(src, fromColor, toColor);
    expect(result.width).toBe(4);
    expect(result.height).toBe(4);

    // Result should be greenish, not magenta
    const px = getPixel(result, 2, 2);
    expect(px[1]).toBeGreaterThan(px[0]); // green dominant
  });

  it('preserves transparent pixels', () => {
    const src = createPixelBuffer(4, 4);
    // Leave (0,0) transparent
    setPixel(src, 1, 1, [255, 0, 255, 1]);
    const fromColor = createNeonColor('From', 300);
    const toColor = createNeonColor('To', 60);
    const result = recolorSprite(src, fromColor, toColor);
    expect(getPixel(result, 0, 0)[3]).toBeLessThan(0.01);
  });
});
