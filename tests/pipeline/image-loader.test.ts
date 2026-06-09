import { describe, it, expect } from 'vitest';
import { downscalePixelArt, pixelBufferFromRaw } from '../../src/pipeline/image-loader';
import { createPixelBuffer, setPixel, getPixel } from '../../src/engine/renderer';

describe('Image Pipeline', () => {
  describe('downscalePixelArt()', () => {
    it('reduces dimensions correctly', () => {
      const src = createPixelBuffer(32, 32);
      const dst = downscalePixelArt(src, 8, 8);
      expect(dst.width).toBe(8);
      expect(dst.height).toBe(8);
    });

    it('averages pixel colors', () => {
      const src = createPixelBuffer(4, 4);
      // Fill entire source with same color
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          setPixel(src, x, y, [200, 100, 50, 1]);
        }
      }
      const dst = downscalePixelArt(src, 2, 2);
      // Each dest pixel averages 4 source pixels of the same color
      const px = getPixel(dst, 0, 0);
      expect(px[0]).toBeCloseTo(200, -1);
      expect(px[1]).toBeCloseTo(100, -1);
      expect(px[2]).toBeCloseTo(50, -1);
    });

    it('handles non-power-of-2 scaling', () => {
      const src = createPixelBuffer(30, 20);
      const dst = downscalePixelArt(src, 7, 5);
      expect(dst.width).toBe(7);
      expect(dst.height).toBe(5);
    });

    it('1:1 scale preserves pixels', () => {
      const src = createPixelBuffer(8, 8);
      setPixel(src, 4, 4, [255, 0, 0, 1]);
      const dst = downscalePixelArt(src, 8, 8);
      const px = getPixel(dst, 4, 4);
      expect(px[0]).toBe(255);
    });
  });

  describe('pixelBufferFromRaw()', () => {
    it('creates buffer from raw array', () => {
      const raw = [
        255, 0, 0, 255,   // Red pixel
        0, 255, 0, 255,   // Green pixel
        0, 0, 255, 255,   // Blue pixel
        255, 255, 0, 255,  // Yellow pixel
      ];
      const buf = pixelBufferFromRaw(2, 2, raw);
      expect(buf.width).toBe(2);
      expect(buf.height).toBe(2);
      expect(buf.data[0]).toBe(255); // Red channel of first pixel
      expect(buf.data[5]).toBe(255); // Green channel of second pixel
    });
  });
});
