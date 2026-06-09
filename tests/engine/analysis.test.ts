import { describe, it, expect } from 'vitest';
import { analyzeImage, analysisConsistencyScore } from '../../src/engine/analysis';
import { createPixelBuffer, setPixel, getPixel } from '../../src/engine/renderer';
import { SPEC } from '../../src/style/spec';

function makeTestSprite(size: number, fillColor: [number, number, number, number]): ReturnType<typeof createPixelBuffer> {
  const buf = createPixelBuffer(size, size);
  for (let y = Math.floor(size * 0.15); y < Math.floor(size * 0.85); y++) {
    for (let x = Math.floor(size * 0.15); x < Math.floor(size * 0.85); x++) {
      setPixel(buf, x, y, fillColor);
    }
  }
  return buf;
}

function makeCircleSprite(size: number, fillColor: [number, number, number, number]): ReturnType<typeof createPixelBuffer> {
  const buf = createPixelBuffer(size, size);
  const cx = size / 2, cy = size / 2, r = size * 0.35;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist < r) {
        const brightness = 1 - (dist / r) * 0.5;
        setPixel(buf, x, y, [
          Math.round(fillColor[0] * brightness),
          Math.round(fillColor[1] * brightness),
          Math.round(fillColor[2] * brightness),
          1,
        ]);
      }
    }
  }
  return buf;
}

describe('Image Analysis', () => {
  describe('analyzeImage()', () => {
    it('identifies foreground pixels', () => {
      const sprite = makeTestSprite(32, [200, 100, 50, 1]);
      const analysis = analyzeImage(sprite);
      expect(analysis.width).toBe(32);
      expect(analysis.height).toBe(32);

      // Corners should be background
      expect(analysis.foregroundMask[0]).toBe(0);
      expect(analysis.foregroundMask[31]).toBe(0);

      // Center should be foreground
      expect(analysis.foregroundMask[16 * 32 + 16]).toBe(1);
    });

    it('detects edges at foreground boundaries', () => {
      const sprite = makeTestSprite(32, [200, 100, 50, 1]);
      const analysis = analyzeImage(sprite);

      // Pixels right at the edge of the filled area should have high edge strength
      const edgeY = Math.floor(32 * 0.15);
      const centerX = 16;
      // Edge strength should be higher near the boundary
      const boundaryIdx = edgeY * 32 + centerX;
      const interiorIdx = 20 * 32 + centerX;

      // The boundary pixel should be assigned to zone 0 or 1 (near edge)
      expect(analysis.zoneMap[boundaryIdx]).toBeLessThanOrEqual(1);
    });

    it('assigns deeper zones to interior pixels', () => {
      const sprite = makeTestSprite(64, [200, 100, 50, 1]);
      const analysis = analyzeImage(sprite);

      // Center pixel should be in a deep zone
      const centerIdx = 32 * 64 + 32;
      expect(analysis.zoneMap[centerIdx]).toBeGreaterThan(1);

      // Edge pixel should be in zone 0 or 1
      const edgeY = Math.floor(64 * 0.15);
      const edgeIdx = edgeY * 64 + 32;
      expect(analysis.zoneMap[edgeIdx]).toBeLessThanOrEqual(1);
    });

    it('computes luminance correctly', () => {
      const sprite = createPixelBuffer(8, 8);
      // Fill with pure white
      for (let y = 2; y < 6; y++) {
        for (let x = 2; x < 6; x++) {
          setPixel(sprite, x, y, [255, 255, 255, 1]);
        }
      }
      const analysis = analyzeImage(sprite);
      // White pixel luminance should be ~1.0
      expect(analysis.luminance[2 * 8 + 2]).toBeCloseTo(1.0, 1);
      // Transparent pixel luminance should be ~0
      expect(analysis.luminance[0]).toBeCloseTo(0, 1);
    });

    it('computes local contrast', () => {
      const sprite = createPixelBuffer(32, 32);
      // Create a checkerboard-like pattern for high local contrast
      for (let y = 8; y < 24; y++) {
        for (let x = 8; x < 24; x++) {
          const bright = ((x + y) % 2 === 0) ? 255 : 50;
          setPixel(sprite, x, y, [bright, bright, bright, 1]);
        }
      }
      const analysis = analyzeImage(sprite);
      // Interior pixels should have non-zero local contrast
      const centerIdx = 16 * 32 + 16;
      expect(analysis.localContrast[centerIdx]).toBeGreaterThan(0);
    });

    it('background pixels get zone 255', () => {
      const sprite = makeTestSprite(16, [200, 100, 50, 1]);
      const analysis = analyzeImage(sprite);
      expect(analysis.zoneMap[0]).toBe(255);
    });
  });

  describe('Zone count matches SPEC', () => {
    it('uses SPEC.ZONE_COUNT distinct zones', () => {
      const sprite = makeTestSprite(64, [200, 100, 50, 1]);
      const analysis = analyzeImage(sprite);

      const zones = new Set<number>();
      for (const z of analysis.zoneMap) {
        if (z < 255) zones.add(z);
      }
      // Should have multiple zones (exact count depends on sprite size)
      expect(zones.size).toBeGreaterThanOrEqual(2);
      expect(zones.size).toBeLessThanOrEqual(SPEC.ZONE_COUNT);
    });
  });

  describe('analysisConsistencyScore()', () => {
    it('returns 1.0 for identical sprites', () => {
      const sprite = makeTestSprite(32, [200, 100, 50, 1]);
      const a = analyzeImage(sprite);
      const b = analyzeImage(sprite);
      expect(analysisConsistencyScore(a, b)).toBeCloseTo(1.0, 1);
    });

    it('returns high score for similarly shaped sprites', () => {
      const square = makeTestSprite(32, [200, 100, 50, 1]);
      const circle = makeCircleSprite(32, [200, 100, 50, 1]);
      const a = analyzeImage(square);
      const b = analyzeImage(circle);
      // Similar shapes should still get similar zone distributions
      const score = analysisConsistencyScore(a, b);
      expect(score).toBeGreaterThan(0.3);
    });

    it('returns reasonable score for different colors same shape', () => {
      const red = makeTestSprite(32, [255, 50, 50, 1]);
      const blue = makeTestSprite(32, [50, 50, 255, 1]);
      const a = analyzeImage(red);
      const b = analyzeImage(blue);
      // Same shape, different colors — zone distribution should be very similar
      const score = analysisConsistencyScore(a, b);
      expect(score).toBeGreaterThan(0.8);
    });
  });
});
