import { describe, it, expect } from 'vitest';
import {
  createPixelBuffer, getPixel, setPixel, setPixelAdditive,
  clearBuffer, boxBlur, compositeAdditive, generateGlow,
  nearestNeighborScale, drawLine, drawRect, drawCircle,
  PixelBuffer,
} from '../../src/engine/renderer';
import type { RGBA } from '../../src/style/types';

describe('PixelBuffer Operations', () => {
  describe('createPixelBuffer()', () => {
    it('creates buffer with correct dimensions', () => {
      const buf = createPixelBuffer(32, 16);
      expect(buf.width).toBe(32);
      expect(buf.height).toBe(16);
      expect(buf.data.length).toBe(32 * 16 * 4);
    });
    it('initializes to zero (transparent black)', () => {
      const buf = createPixelBuffer(4, 4);
      for (let i = 0; i < buf.data.length; i++) {
        expect(buf.data[i]).toBe(0);
      }
    });
  });

  describe('getPixel() / setPixel()', () => {
    it('round-trips a pixel', () => {
      const buf = createPixelBuffer(10, 10);
      const color: RGBA = [255, 128, 64, 0.75];
      setPixel(buf, 5, 5, color);
      const result = getPixel(buf, 5, 5);
      expect(result[0]).toBe(255);
      expect(result[1]).toBe(128);
      expect(result[2]).toBe(64);
      expect(result[3]).toBeCloseTo(0.75, 1);
    });

    it('ignores out-of-bounds writes', () => {
      const buf = createPixelBuffer(4, 4);
      setPixel(buf, -1, 0, [255, 0, 0, 1]);
      setPixel(buf, 4, 0, [255, 0, 0, 1]);
      setPixel(buf, 0, -1, [255, 0, 0, 1]);
      setPixel(buf, 0, 4, [255, 0, 0, 1]);
      // Buffer should still be all zeros
      for (let i = 0; i < buf.data.length; i++) {
        expect(buf.data[i]).toBe(0);
      }
    });

    it('writes to corners correctly', () => {
      const buf = createPixelBuffer(4, 4);
      setPixel(buf, 0, 0, [255, 0, 0, 1]);
      setPixel(buf, 3, 0, [0, 255, 0, 1]);
      setPixel(buf, 0, 3, [0, 0, 255, 1]);
      setPixel(buf, 3, 3, [255, 255, 0, 1]);
      expect(getPixel(buf, 0, 0)[0]).toBe(255);
      expect(getPixel(buf, 3, 0)[1]).toBe(255);
      expect(getPixel(buf, 0, 3)[2]).toBe(255);
      expect(getPixel(buf, 3, 3)[0]).toBe(255);
    });
  });

  describe('setPixelAdditive()', () => {
    it('adds color values together', () => {
      const buf = createPixelBuffer(4, 4);
      setPixel(buf, 1, 1, [100, 50, 25, 1]);
      setPixelAdditive(buf, 1, 1, [50, 30, 20, 0.5]);
      const result = getPixel(buf, 1, 1);
      expect(result[0]).toBe(125); // 100 + 50*0.5
      expect(result[1]).toBe(65);  // 50 + 30*0.5
    });

    it('clamps at 255', () => {
      const buf = createPixelBuffer(4, 4);
      setPixel(buf, 0, 0, [200, 200, 200, 1]);
      setPixelAdditive(buf, 0, 0, [200, 200, 200, 1]);
      const result = getPixel(buf, 0, 0);
      expect(result[0]).toBe(255);
      expect(result[1]).toBe(255);
    });
  });

  describe('clearBuffer()', () => {
    it('fills buffer with specified color', () => {
      const buf = createPixelBuffer(4, 4);
      clearBuffer(buf, [128, 64, 32, 1]);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const px = getPixel(buf, x, y);
          expect(px[0]).toBe(128);
          expect(px[1]).toBe(64);
          expect(px[2]).toBe(32);
        }
      }
    });

    it('defaults to black', () => {
      const buf = createPixelBuffer(2, 2);
      setPixel(buf, 0, 0, [255, 255, 255, 1]);
      clearBuffer(buf);
      expect(getPixel(buf, 0, 0)).toEqual([0, 0, 0, 1]);
    });
  });
});

describe('Image Processing', () => {
  describe('boxBlur()', () => {
    it('returns buffer of same dimensions', () => {
      const buf = createPixelBuffer(16, 16);
      setPixel(buf, 8, 8, [255, 0, 0, 1]);
      const blurred = boxBlur(buf, 2);
      expect(blurred.width).toBe(16);
      expect(blurred.height).toBe(16);
    });

    it('spreads a single bright pixel', () => {
      const buf = createPixelBuffer(16, 16);
      setPixel(buf, 8, 8, [255, 0, 0, 1]);
      const blurred = boxBlur(buf, 2);
      // Center should still have some red
      expect(getPixel(blurred, 8, 8)[0]).toBeGreaterThan(0);
      // Neighbors should also have some red
      expect(getPixel(blurred, 7, 8)[0]).toBeGreaterThan(0);
      expect(getPixel(blurred, 9, 8)[0]).toBeGreaterThan(0);
      // Far pixels should be zero
      expect(getPixel(blurred, 0, 0)[0]).toBe(0);
    });

    it('with radius 0 still preserves center brightness on larger buffer', () => {
      const buf = createPixelBuffer(16, 16);
      setPixel(buf, 8, 8, [200, 100, 50, 1]);
      const blurred = boxBlur(buf, 0);
      // Radius 0 clamps to 1, so some spread is expected,
      // but center should retain the most brightness
      const px = getPixel(blurred, 8, 8);
      expect(px[0]).toBeGreaterThan(10);
      // Center should be brighter than far-away pixels
      expect(px[0]).toBeGreaterThan(getPixel(blurred, 0, 0)[0]);
    });
  });

  describe('compositeAdditive()', () => {
    it('adds src onto dst', () => {
      const dst = createPixelBuffer(4, 4);
      const src = createPixelBuffer(4, 4);
      clearBuffer(dst, [100, 50, 25, 1]);
      clearBuffer(src, [50, 50, 50, 1]);
      compositeAdditive(dst, src, 0.5);
      const px = getPixel(dst, 0, 0);
      expect(px[0]).toBe(125); // 100 + 50*0.5
      expect(px[1]).toBe(75);  // 50 + 50*0.5
    });
  });

  describe('generateGlow()', () => {
    it('produces a brighter result than input', () => {
      const buf = createPixelBuffer(32, 32);
      // Draw a bright dot
      setPixel(buf, 16, 16, [255, 0, 255, 1]);
      const glowed = generateGlow(buf, {
        passes: 2, innerRadius: 1, outerRadius: 4, intensity: 0.5, additive: true,
      });
      // Center should still be bright
      expect(getPixel(glowed, 16, 16)[0]).toBeGreaterThan(200);
      // Nearby pixels should have some glow
      expect(getPixel(glowed, 17, 16)[0]).toBeGreaterThan(0);
    });

    it('returns same dimensions', () => {
      const buf = createPixelBuffer(20, 30);
      const glowed = generateGlow(buf, {
        passes: 1, innerRadius: 1, outerRadius: 3, intensity: 0.5, additive: true,
      });
      expect(glowed.width).toBe(20);
      expect(glowed.height).toBe(30);
    });
  });

  describe('nearestNeighborScale()', () => {
    it('scales up correctly', () => {
      const buf = createPixelBuffer(2, 2);
      setPixel(buf, 0, 0, [255, 0, 0, 1]);
      setPixel(buf, 1, 0, [0, 255, 0, 1]);
      setPixel(buf, 0, 1, [0, 0, 255, 1]);
      setPixel(buf, 1, 1, [255, 255, 0, 1]);

      const scaled = nearestNeighborScale(buf, 3);
      expect(scaled.width).toBe(6);
      expect(scaled.height).toBe(6);

      // Top-left block should be red
      expect(getPixel(scaled, 0, 0)[0]).toBe(255);
      expect(getPixel(scaled, 1, 1)[0]).toBe(255);
      expect(getPixel(scaled, 2, 2)[0]).toBe(255); // Still red (3x scale)
      // Top-right block should be green
      expect(getPixel(scaled, 3, 0)[1]).toBe(255);
    });

    it('scale of 1 returns copy', () => {
      const buf = createPixelBuffer(4, 4);
      setPixel(buf, 2, 2, [128, 64, 32, 1]);
      const scaled = nearestNeighborScale(buf, 1);
      expect(scaled.width).toBe(4);
      expect(getPixel(scaled, 2, 2)[0]).toBe(128);
    });
  });
});

describe('Drawing Primitives', () => {
  describe('drawLine()', () => {
    it('draws a horizontal line', () => {
      const buf = createPixelBuffer(10, 10);
      drawLine(buf, 0, 5, 9, 5, [255, 0, 0, 1]);
      for (let x = 0; x <= 9; x++) {
        expect(getPixel(buf, x, 5)[0]).toBe(255);
      }
    });

    it('draws a vertical line', () => {
      const buf = createPixelBuffer(10, 10);
      drawLine(buf, 5, 0, 5, 9, [0, 255, 0, 1]);
      for (let y = 0; y <= 9; y++) {
        expect(getPixel(buf, 5, y)[1]).toBe(255);
      }
    });

    it('draws a diagonal line (at least some pixels)', () => {
      const buf = createPixelBuffer(10, 10);
      drawLine(buf, 0, 0, 9, 9, [255, 255, 255, 1]);
      // Check that at least the endpoints are drawn
      expect(getPixel(buf, 0, 0)[0]).toBe(255);
      expect(getPixel(buf, 9, 9)[0]).toBe(255);
    });
  });

  describe('drawRect()', () => {
    it('draws an outline rectangle', () => {
      const buf = createPixelBuffer(10, 10);
      drawRect(buf, 2, 2, 5, 5, [255, 0, 0, 1], false);
      // Top edge
      expect(getPixel(buf, 3, 2)[0]).toBe(255);
      // Left edge
      expect(getPixel(buf, 2, 4)[0]).toBe(255);
      // Interior should be empty
      expect(getPixel(buf, 4, 4)[0]).toBe(0);
    });

    it('draws a filled rectangle', () => {
      const buf = createPixelBuffer(10, 10);
      drawRect(buf, 2, 2, 3, 3, [0, 255, 0, 1], true);
      // All pixels in the rect should be green
      for (let y = 2; y < 5; y++) {
        for (let x = 2; x < 5; x++) {
          expect(getPixel(buf, x, y)[1]).toBe(255);
        }
      }
      // Outside should be empty
      expect(getPixel(buf, 1, 1)[1]).toBe(0);
    });
  });

  describe('drawCircle()', () => {
    it('draws a circle with correct bounds', () => {
      const buf = createPixelBuffer(20, 20);
      drawCircle(buf, 10, 10, 5, [255, 0, 0, 1], false);
      // Point on circle (top)
      expect(getPixel(buf, 10, 5)[0]).toBe(255);
      // Center should be empty for outline
      expect(getPixel(buf, 10, 10)[0]).toBe(0);
    });

    it('draws a filled circle', () => {
      const buf = createPixelBuffer(20, 20);
      drawCircle(buf, 10, 10, 3, [0, 0, 255, 1], true);
      // Center should be filled
      expect(getPixel(buf, 10, 10)[2]).toBe(255);
      // Far outside should be empty
      expect(getPixel(buf, 0, 0)[2]).toBe(0);
    });
  });
});
