import { describe, it, expect } from 'vitest';
import { SPEC, validateStyleCompliance, generateMaterialShading } from '../../src/style/spec';
import { createPixelBuffer, setPixel, clearBuffer } from '../../src/engine/renderer';

describe('Style Spec v2', () => {
  describe('SPEC constants', () => {
    it('has colored background (not pure black)', () => {
      const brightness = SPEC.BACKGROUND[0] + SPEC.BACKGROUND[1] + SPEC.BACKGROUND[2];
      expect(brightness).toBeGreaterThan(0);
      expect(brightness).toBeLessThan(300); // muted, not bright
    });

    it('has dark alternative background', () => {
      const brightness = SPEC.BACKGROUND_DARK[0] + SPEC.BACKGROUND_DARK[1] + SPEC.BACKGROUND_DARK[2];
      expect(brightness).toBeGreaterThan(0);
      expect(brightness).toBeLessThan(100);
    });

    it('outline mode is dark (not neon)', () => {
      expect(SPEC.OUTLINE_COLOR_MODE).toBe('dark');
      expect(SPEC.OUTLINE_DARKNESS).toBeGreaterThan(0.5);
    });

    it('requires rich color palettes per element', () => {
      expect(SPEC.MIN_COLORS_PER_ELEMENT).toBeGreaterThanOrEqual(10);
    });

    it('shading levels are reasonable', () => {
      expect(SPEC.SHADING_LEVELS_METAL).toBeGreaterThanOrEqual(4);
      expect(SPEC.SHADING_LEVELS_FABRIC).toBeGreaterThanOrEqual(4);
    });

    it('has warm highlight and cool shadow parameters', () => {
      expect(SPEC.HIGHLIGHT_WARMTH).toBeGreaterThan(0);
      expect(SPEC.SHADOW_COOLNESS).toBeGreaterThan(0);
    });

    it('glow radii are in ascending order (tactical glow)', () => {
      expect(SPEC.GLOW_INNER_RADIUS).toBeLessThan(SPEC.GLOW_MID_RADIUS);
      expect(SPEC.GLOW_MID_RADIUS).toBeLessThan(SPEC.GLOW_OUTER_RADIUS);
    });

    it('glow intensities decrease with distance', () => {
      expect(SPEC.GLOW_INNER_INTENSITY).toBeGreaterThan(SPEC.GLOW_MID_INTENSITY);
      expect(SPEC.GLOW_MID_INTENSITY).toBeGreaterThan(SPEC.GLOW_OUTER_INTENSITY);
    });

    it('glow threshold is high (tactical only, not base style)', () => {
      expect(SPEC.GLOW_THRESHOLD).toBeGreaterThanOrEqual(150);
    });
  });

  describe('generateMaterialShading()', () => {
    it('generates requested number of shade levels', () => {
      const shades = generateMaterialShading(300, 70, 50, 6);
      expect(shades).toHaveLength(6);
    });

    it('shades go from dark to bright', () => {
      const shades = generateMaterialShading(200, 60, 45, 6);
      for (let i = 1; i < shades.length; i++) {
        expect(shades[i].l).toBeGreaterThanOrEqual(shades[i - 1].l);
      }
    });

    it('shadow shades shift hue toward cool (blue)', () => {
      const shades = generateMaterialShading(30, 80, 50, 6); // orange base
      // Darkest shade should have hue shifted toward blue (lower or wrapped)
      const darkHue = shades[0].h;
      const midHue = shades[3].h;
      // The dark shade should have a different hue than mid due to cool shift
      expect(Math.abs(darkHue - midHue)).toBeGreaterThan(3);
    });

    it('highlight shades shift hue toward warm (yellow)', () => {
      const shades = generateMaterialShading(200, 70, 50, 6); // blue base
      const brightHue = shades[shades.length - 1].h;
      const midHue = shades[3].h;
      expect(Math.abs(brightHue - midHue)).toBeGreaterThan(3);
    });

    it('darkest shade has minimum lightness from SPEC', () => {
      const shades = generateMaterialShading(0, 80, 50, 6);
      expect(shades[0].l).toBeCloseTo(SPEC.SHADOW_MIN_LIGHTNESS, 0);
    });
  });

  describe('validateStyleCompliance()', () => {
    it('passes for a multi-color image', () => {
      const sprite = createPixelBuffer(32, 32);
      // Create a multi-hue, multi-brightness image
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const r = Math.round((x / 31) * 200 + 30);
          const g = Math.round((y / 31) * 150 + 50);
          const b = Math.round(100 + Math.sin(x * 0.3) * 50);
          setPixel(sprite, x, y, [r, g, b, 1]);
        }
      }
      const violations = validateStyleCompliance(sprite);
      expect(violations.length).toBe(0);
    });

    it('flags monochromatic images', () => {
      const mono = createPixelBuffer(32, 32);
      for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
          const v = 50 + Math.round((y / 31) * 150);
          setPixel(mono, x, y, [v, 0, 0, 1]); // pure red, no other hues
        }
      }
      const violations = validateStyleCompliance(mono);
      expect(violations.some(v => v.includes('color variety') || v.includes('hue'))).toBe(true);
    });
  });
});
