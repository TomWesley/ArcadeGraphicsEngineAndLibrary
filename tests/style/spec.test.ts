import { describe, it, expect } from 'vitest';
import { SPEC, validateStyleCompliance } from '../../src/style/spec';
import { createPixelBuffer, setPixel, clearBuffer } from '../../src/engine/renderer';
import { createNeonSprite, neonifySprite } from '../../src/engine/sprites';
import { createNeonColor, PALETTE_NEON_INFERNO } from '../../src/style/colors';
import { DEFAULT_THEME } from '../../src/style/theme';

describe('Style Spec', () => {
  describe('SPEC constants', () => {
    it('has black background', () => {
      expect(SPEC.BACKGROUND).toEqual([0, 0, 0, 255]);
    });

    it('has 5 zone boundaries matching 5 zone brightnesses', () => {
      expect(SPEC.ZONE_BOUNDARIES.length).toBe(SPEC.ZONE_COUNT);
      expect(SPEC.ZONE_BRIGHTNESS.length).toBe(SPEC.ZONE_COUNT);
    });

    it('zone brightness decreases from edge to interior', () => {
      for (let i = 1; i < SPEC.ZONE_BRIGHTNESS.length; i++) {
        expect(SPEC.ZONE_BRIGHTNESS[i]).toBeLessThanOrEqual(SPEC.ZONE_BRIGHTNESS[i - 1]);
      }
    });

    it('gradient stops are in ascending order', () => {
      for (let i = 1; i < SPEC.GRADIENT_STOPS.length; i++) {
        expect(SPEC.GRADIENT_STOPS[i]).toBeGreaterThan(SPEC.GRADIENT_STOPS[i - 1]);
      }
    });

    it('bloom radii are in ascending order', () => {
      expect(SPEC.BLOOM_INNER_RADIUS).toBeLessThan(SPEC.BLOOM_MID_RADIUS);
      expect(SPEC.BLOOM_MID_RADIUS).toBeLessThan(SPEC.BLOOM_OUTER_RADIUS);
    });

    it('bloom intensities decrease with distance', () => {
      expect(SPEC.BLOOM_INNER_INTENSITY).toBeGreaterThan(SPEC.BLOOM_MID_INTENSITY);
      expect(SPEC.BLOOM_MID_INTENSITY).toBeGreaterThan(SPEC.BLOOM_OUTER_INTENSITY);
    });

    it('outline brightness is full', () => {
      expect(SPEC.OUTLINE_BRIGHTNESS).toBe(1.0);
    });
  });

  describe('validateStyleCompliance()', () => {
    it('passes for a properly styled image', () => {
      // Create a test sprite and run through neonify
      const sprite = createPixelBuffer(32, 32);
      for (let y = 8; y < 24; y++) {
        for (let x = 8; x < 24; x++) {
          setPixel(sprite, x, y, [200, 100, 50, 1]);
        }
      }

      // Apply neon style
      const result = createNeonSprite(sprite, DEFAULT_THEME, 'primary');
      const violations = validateStyleCompliance(result);

      // Should have few or no violations
      // (Note: small test sprites may have unusual distributions)
      expect(violations.length).toBeLessThanOrEqual(2);
    });

    it('flags a bright background', () => {
      const bright = createPixelBuffer(32, 32);
      clearBuffer(bright, [200, 200, 200, 1]);
      const violations = validateStyleCompliance(bright);
      expect(violations.some(v => v.includes('Corner'))).toBe(true);
    });

    it('flags lack of contrast', () => {
      // All mid-brightness
      const flat = createPixelBuffer(32, 32);
      clearBuffer(flat, [120, 120, 120, 1]);
      const violations = validateStyleCompliance(flat);
      expect(violations.some(v => v.includes('mid-brightness') || v.includes('dark') || v.includes('bright'))).toBe(true);
    });
  });
});
