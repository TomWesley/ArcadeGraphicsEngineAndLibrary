import { describe, it, expect } from 'vitest';
import {
  rgba, hslToRgba, rgbaToHsl, lerpColor, withAlpha,
  brighten, darken, rgbaToCss, rgbaToHex,
  createNeonColor, recolorNeon,
  PALETTE_NEON_INFERNO, PALETTE_ELECTRIC_OCEAN,
  PALETTE_TOXIC_JUNGLE, PALETTE_SOLAR_STORM,
  createPalette, remapPalette, ALL_PALETTES,
} from '../../src/style/colors';
import type { RGBA, NeonColor, ColorPalette } from '../../src/style/types';

describe('Color Utilities', () => {
  describe('rgba()', () => {
    it('creates an RGBA tuple with default alpha', () => {
      expect(rgba(255, 128, 0)).toEqual([255, 128, 0, 1]);
    });
    it('creates an RGBA tuple with custom alpha', () => {
      expect(rgba(255, 128, 0, 0.5)).toEqual([255, 128, 0, 0.5]);
    });
  });

  describe('hslToRgba()', () => {
    it('converts pure red', () => {
      const [r, g, b] = hslToRgba(0, 100, 50);
      expect(r).toBe(255);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });
    it('converts pure green', () => {
      const [r, g, b] = hslToRgba(120, 100, 50);
      expect(r).toBe(0);
      expect(g).toBe(255);
      expect(b).toBe(0);
    });
    it('converts pure blue', () => {
      const [r, g, b] = hslToRgba(240, 100, 50);
      expect(r).toBe(0);
      expect(g).toBe(0);
      expect(b).toBe(255);
    });
    it('converts white', () => {
      const [r, g, b] = hslToRgba(0, 0, 100);
      expect(r).toBe(255);
      expect(g).toBe(255);
      expect(b).toBe(255);
    });
    it('converts black', () => {
      const [r, g, b] = hslToRgba(0, 0, 0);
      expect(r).toBe(0);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });
    it('preserves alpha', () => {
      const color = hslToRgba(0, 100, 50, 0.5);
      expect(color[3]).toBe(0.5);
    });
  });

  describe('rgbaToHsl()', () => {
    it('round-trips primary colors', () => {
      const red = hslToRgba(0, 100, 50);
      const [h, s, l] = rgbaToHsl(red);
      expect(h).toBe(0);
      expect(s).toBe(100);
      expect(l).toBe(50);
    });
    it('handles achromatic (gray)', () => {
      const [h, s, l] = rgbaToHsl([128, 128, 128, 1]);
      expect(s).toBe(0);
      expect(l).toBe(50);
    });
  });

  describe('lerpColor()', () => {
    it('returns start at t=0', () => {
      const a: RGBA = [0, 0, 0, 1];
      const b: RGBA = [255, 255, 255, 1];
      expect(lerpColor(a, b, 0)).toEqual([0, 0, 0, 1]);
    });
    it('returns end at t=1', () => {
      const a: RGBA = [0, 0, 0, 1];
      const b: RGBA = [255, 255, 255, 1];
      expect(lerpColor(a, b, 1)).toEqual([255, 255, 255, 1]);
    });
    it('returns midpoint at t=0.5', () => {
      const a: RGBA = [0, 0, 0, 0];
      const b: RGBA = [200, 100, 50, 1];
      const mid = lerpColor(a, b, 0.5);
      expect(mid[0]).toBe(100);
      expect(mid[1]).toBe(50);
      expect(mid[2]).toBe(25);
      expect(mid[3]).toBeCloseTo(0.5);
    });
  });

  describe('withAlpha()', () => {
    it('changes alpha without mutating original', () => {
      const c: RGBA = [255, 128, 0, 1];
      const result = withAlpha(c, 0.5);
      expect(result).toEqual([255, 128, 0, 0.5]);
      expect(c[3]).toBe(1); // original unchanged
    });
  });

  describe('brighten() / darken()', () => {
    it('brightens a color', () => {
      const result = brighten([100, 100, 100, 1], 50);
      expect(result).toEqual([150, 150, 150, 1]);
    });
    it('clamps brighten at 255', () => {
      const result = brighten([250, 200, 100, 1], 50);
      expect(result[0]).toBe(255);
    });
    it('darkens a color', () => {
      const result = darken([100, 100, 100, 1], 50);
      expect(result).toEqual([50, 50, 50, 1]);
    });
    it('clamps darken at 0', () => {
      const result = darken([20, 100, 200, 1], 50);
      expect(result[0]).toBe(0);
    });
  });

  describe('rgbaToCss()', () => {
    it('formats correctly', () => {
      expect(rgbaToCss([255, 128, 0, 0.5])).toBe('rgba(255, 128, 0, 0.5)');
    });
  });

  describe('rgbaToHex()', () => {
    it('formats correctly', () => {
      expect(rgbaToHex([255, 128, 0, 1])).toBe('#ff8000');
    });
    it('zero-pads', () => {
      expect(rgbaToHex([0, 0, 0, 1])).toBe('#000000');
    });
  });
});

describe('Neon Color System', () => {
  describe('createNeonColor()', () => {
    it('creates a neon color with core, glow, and dim variants', () => {
      const neon = createNeonColor('Test', 300);
      expect(neon.name).toBe('Test');
      expect(neon.core).toHaveLength(4);
      expect(neon.glow).toHaveLength(4);
      expect(neon.dim).toHaveLength(4);
    });

    it('glow alpha is less than 1', () => {
      const neon = createNeonColor('Test', 180);
      expect(neon.glow[3]).toBeLessThan(1);
    });

    it('dim is darker than core', () => {
      const neon = createNeonColor('Test', 120);
      const coreBright = neon.core[0] + neon.core[1] + neon.core[2];
      const dimBright = neon.dim[0] + neon.dim[1] + neon.dim[2];
      expect(dimBright).toBeLessThan(coreBright);
    });
  });

  describe('recolorNeon()', () => {
    it('changes the hue while preserving structure', () => {
      const original = createNeonColor('Original', 300);
      const recolored = recolorNeon(original, 120);
      // Should still have 3 variants
      expect(recolored.core).toHaveLength(4);
      expect(recolored.glow).toHaveLength(4);
      expect(recolored.dim).toHaveLength(4);
      // Core hue should be different
      const origHue = rgbaToHsl(original.core)[0];
      const newHue = rgbaToHsl(recolored.core)[0];
      expect(Math.abs(origHue - newHue)).toBeGreaterThan(10);
    });
  });
});

describe('Palettes', () => {
  const palettes = [
    PALETTE_NEON_INFERNO,
    PALETTE_ELECTRIC_OCEAN,
    PALETTE_TOXIC_JUNGLE,
    PALETTE_SOLAR_STORM,
  ];

  it('ALL_PALETTES contains all 4 built-in palettes', () => {
    expect(ALL_PALETTES).toHaveLength(4);
  });

  palettes.forEach(palette => {
    describe(`${palette.name}`, () => {
      it('has all required color roles', () => {
        expect(palette.primary).toBeDefined();
        expect(palette.secondary).toBeDefined();
        expect(palette.tertiary).toBeDefined();
        expect(palette.danger).toBeDefined();
      });

      it('has black background', () => {
        expect(palette.background).toEqual([0, 0, 0, 1]);
      });

      it('has a background tint', () => {
        expect(palette.backgroundTint).toHaveLength(4);
        // Tint should be very dark
        const brightness = palette.backgroundTint[0] + palette.backgroundTint[1] + palette.backgroundTint[2];
        expect(brightness).toBeLessThan(50);
      });

      it('each color has valid core/glow/dim variants', () => {
        const roles: (keyof ColorPalette)[] = ['primary', 'secondary', 'tertiary', 'danger'];
        for (const role of roles) {
          const color = palette[role] as NeonColor;
          // All channels 0-255
          for (const variant of [color.core, color.glow, color.dim]) {
            expect(variant[0]).toBeGreaterThanOrEqual(0);
            expect(variant[0]).toBeLessThanOrEqual(255);
            expect(variant[1]).toBeGreaterThanOrEqual(0);
            expect(variant[1]).toBeLessThanOrEqual(255);
            expect(variant[2]).toBeGreaterThanOrEqual(0);
            expect(variant[2]).toBeLessThanOrEqual(255);
          }
        }
      });
    });
  });

  describe('createPalette()', () => {
    it('creates a valid palette from 4 hue values', () => {
      const custom = createPalette('Custom', 0, 90, 180, 270);
      expect(custom.name).toBe('Custom');
      expect(custom.primary.core).toHaveLength(4);
      expect(custom.secondary.core).toHaveLength(4);
      expect(custom.tertiary.core).toHaveLength(4);
      expect(custom.danger.core).toHaveLength(4);
    });
  });

  describe('remapPalette()', () => {
    it('shifts all hues consistently', () => {
      const remapped = remapPalette(PALETTE_NEON_INFERNO, 60);
      expect(remapped.name).toContain('shifted 60');
      // All colors should still be valid
      expect(remapped.primary.core[0]).toBeGreaterThanOrEqual(0);
      expect(remapped.primary.core[0]).toBeLessThanOrEqual(255);
    });
  });
});
