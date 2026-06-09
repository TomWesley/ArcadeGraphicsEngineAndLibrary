import { describe, it, expect } from 'vitest';
import {
  createPixelBuffer, setPixel, getPixel,
  generateGlow, nearestNeighborScale, clearBuffer,
} from '../../src/engine/renderer';
import { neonifySprite, createNeonSprite, spriteFromGrid, recolorSprite } from '../../src/engine/sprites';
import { sliceSpriteSheet, assembleSpriteSheet, neonifySpriteSheet } from '../../src/pipeline/sprite-sheet';
import { downscalePixelArt, pixelBufferFromRaw } from '../../src/pipeline/image-loader';
import { ParticleSystem, createFireEmitter } from '../../src/engine/particles';
import {
  createNeonColor, createPalette, remapPalette,
  PALETTE_NEON_INFERNO, PALETTE_ELECTRIC_OCEAN,
  rgba, withAlpha, rgbaToCss, rgbaToHex,
} from '../../src/style/colors';
import { createTheme, DEFAULT_THEME, LITE_THEME } from '../../src/style/theme';
import type { RGBA, ArcadeTheme } from '../../src/style/types';

describe('Full Pipeline Integration', () => {
  it('end-to-end: create sprite -> neonify -> glow -> scale', () => {
    // 1. Create a small test sprite
    const grid = [
      '00FF0000',
      'FFFFFFFF',
      'FF8080FF',
      '00FF0000',
    ];
    const neonColor = createNeonColor('Magenta', 300);
    const sprite = spriteFromGrid(grid, neonColor);
    expect(sprite.width).toBe(4);
    expect(sprite.height).toBe(4);

    // 2. Apply full neon treatment
    const neonSprite = createNeonSprite(sprite, DEFAULT_THEME, 'primary');
    expect(neonSprite.width).toBe(4);
    expect(neonSprite.height).toBe(4);

    // 3. Scale up for display
    const scaled = nearestNeighborScale(neonSprite, 4);
    expect(scaled.width).toBe(16);
    expect(scaled.height).toBe(16);

    // 4. Verify content exists
    let hasContent = false;
    for (let i = 0; i < scaled.data.length; i += 4) {
      if (scaled.data[i] > 0 || scaled.data[i+1] > 0 || scaled.data[i+2] > 0) {
        hasContent = true;
        break;
      }
    }
    expect(hasContent).toBe(true);
  });

  it('end-to-end: palette swap across games', () => {
    // Simulate creating a sprite for Game A, then reskinning for Game B
    const sprite = createPixelBuffer(8, 8);
    for (let y = 1; y < 7; y++) {
      for (let x = 1; x < 7; x++) {
        setPixel(sprite, x, y, [200, 120, 60, 1]);
      }
    }

    // Game A: Neon Inferno theme
    const gameA = createNeonSprite(sprite, DEFAULT_THEME, 'primary');

    // Game B: Electric Ocean theme
    const gameBTheme = createTheme('Game B', PALETTE_ELECTRIC_OCEAN);
    const gameB = createNeonSprite(sprite, gameBTheme, 'primary');

    // They should produce different colors
    const pxA = getPixel(gameA, 4, 4);
    const pxB = getPixel(gameB, 4, 4);
    const diff = Math.abs(pxA[0] - pxB[0]) + Math.abs(pxA[1] - pxB[1]) + Math.abs(pxA[2] - pxB[2]);
    expect(diff).toBeGreaterThan(10);
  });

  it('end-to-end: sprite sheet pipeline', () => {
    // 1. Create a multi-frame sprite sheet
    const sheet = createPixelBuffer(32, 16);
    // Frame 1: red square
    for (let y = 2; y < 14; y++) {
      for (let x = 2; x < 14; x++) {
        setPixel(sheet, x, y, [220, 80, 40, 1]);
      }
    }
    // Frame 2: blue square
    for (let y = 2; y < 14; y++) {
      for (let x = 18; x < 30; x++) {
        setPixel(sheet, x, y, [40, 80, 220, 1]);
      }
    }

    // 2. Neonify the whole sheet
    const neonColor = createNeonColor('Test', 300);
    const neonSheet = neonifySpriteSheet(sheet, 16, 16, neonColor);
    expect(neonSheet.width).toBe(32);
    expect(neonSheet.height).toBe(16);

    // 3. Slice into frames
    const frames = sliceSpriteSheet(neonSheet, 16, 16);
    expect(frames).toHaveLength(2);

    // 4. Reassemble
    const reassembled = assembleSpriteSheet(frames, 2);
    expect(reassembled.width).toBe(32);
    expect(reassembled.height).toBe(16);
  });

  it('end-to-end: downscale -> neonify pipeline', () => {
    // Simulate loading a high-res image and converting to pixel art style
    const hiRes = createPixelBuffer(64, 64);
    // Draw a gradient
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const r = Math.round((x / 63) * 255);
        const g = Math.round((y / 63) * 255);
        setPixel(hiRes, x, y, [r, g, 100, 1]);
      }
    }

    // Downscale to pixel art size
    const pixelArt = downscalePixelArt(hiRes, 16, 16);
    expect(pixelArt.width).toBe(16);
    expect(pixelArt.height).toBe(16);

    // Apply neon style
    const neonified = createNeonSprite(pixelArt, DEFAULT_THEME, 'secondary');
    expect(neonified.width).toBe(16);
    expect(neonified.height).toBe(16);

    // Verify it has content
    let totalBrightness = 0;
    for (let i = 0; i < neonified.data.length; i += 4) {
      totalBrightness += neonified.data[i] + neonified.data[i+1] + neonified.data[i+2];
    }
    expect(totalBrightness).toBeGreaterThan(0);
  });

  it('end-to-end: custom theme creation for new game', () => {
    // A game developer creates their own theme
    const customPalette = createPalette('Space Pirates', 200, 30, 280, 0);
    const customTheme = createTheme('Space Pirates Theme', customPalette, {
      glow: { passes: 4, intensity: 0.8 },
      pixel: { pixelScale: 2 },
      particles: { shape: 'diamond', trailLength: 8 },
      edges: { type: 'jagged', sharpness: 0.9 },
    });

    expect(customTheme.name).toBe('Space Pirates Theme');
    expect(customTheme.glow.passes).toBe(4);
    expect(customTheme.pixel.pixelScale).toBe(2);
    expect(customTheme.particles.shape).toBe('diamond');
    expect(customTheme.edges.type).toBe('jagged');

    // Use it to create a sprite
    const sprite = createPixelBuffer(8, 8);
    for (let y = 1; y < 7; y++) {
      for (let x = 1; x < 7; x++) {
        setPixel(sprite, x, y, [180, 180, 180, 1]);
      }
    }
    const result = createNeonSprite(sprite, customTheme, 'primary');
    expect(result.width).toBe(8);

    // Verify it looks different from default theme
    const defaultResult = createNeonSprite(sprite, DEFAULT_THEME, 'primary');
    const px1 = getPixel(result, 4, 4);
    const px2 = getPixel(defaultResult, 4, 4);
    const diff = Math.abs(px1[0] - px2[0]) + Math.abs(px1[1] - px2[1]) + Math.abs(px1[2] - px2[2]);
    expect(diff).toBeGreaterThan(5);
  });

  it('end-to-end: particle system with sprite scene', () => {
    // Create a particle system and verify it updates correctly
    const color: RGBA = PALETTE_NEON_INFERNO.tertiary.core;
    const emitter = createFireEmitter(100, 200, color);
    const sys = new ParticleSystem(emitter);

    // Simulate 2 seconds
    for (let t = 0; t < 120; t++) {
      sys.update(1 / 60);
    }

    // Should have active particles
    expect(sys.particles.length).toBeGreaterThan(0);

    // Particles should be within reasonable bounds
    for (const p of sys.particles) {
      expect(p.life).toBeGreaterThan(0);
      expect(p.life).toBeLessThanOrEqual(1);
      expect(p.color[3]).toBeGreaterThanOrEqual(0);
      expect(p.color[3]).toBeLessThanOrEqual(1);
    }
  });

  it('color utilities are consistent throughout pipeline', () => {
    const color = rgba(128, 64, 32, 0.8);
    expect(rgbaToCss(color)).toBe('rgba(128, 64, 32, 0.8)');
    expect(rgbaToHex(color)).toBe('#804020');
    expect(withAlpha(color, 0.5)).toEqual([128, 64, 32, 0.5]);
    expect(color[3]).toBe(0.8); // Original not mutated
  });

  it('lite theme is a valid subset of default theme for mobile', () => {
    // Ensure LITE_THEME still works through the full pipeline
    const sprite = createPixelBuffer(8, 8);
    for (let y = 1; y < 7; y++) {
      for (let x = 1; x < 7; x++) {
        setPixel(sprite, x, y, [200, 100, 50, 1]);
      }
    }

    const defaultResult = createNeonSprite(sprite, DEFAULT_THEME, 'primary');
    const liteResult = createNeonSprite(sprite, LITE_THEME, 'primary');

    // Both should produce valid output
    expect(defaultResult.width).toBe(8);
    expect(liteResult.width).toBe(8);

    // Lite should still have content
    let liteBrightness = 0;
    for (let i = 0; i < liteResult.data.length; i += 4) {
      liteBrightness += liteResult.data[i] + liteResult.data[i+1] + liteResult.data[i+2];
    }
    expect(liteBrightness).toBeGreaterThan(0);
  });
});
