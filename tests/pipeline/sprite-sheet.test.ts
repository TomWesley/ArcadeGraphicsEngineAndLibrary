import { describe, it, expect } from 'vitest';
import {
  sliceSpriteSheet, assembleSpriteSheet, neonifySpriteSheet, generateManifest,
} from '../../src/pipeline/sprite-sheet';
import { createPixelBuffer, setPixel, getPixel } from '../../src/engine/renderer';
import { createNeonColor } from '../../src/style/colors';

function makeTestSheet(cols: number, rows: number, frameW: number, frameH: number) {
  const buf = createPixelBuffer(cols * frameW, rows * frameH);
  // Fill each frame with a unique color based on its index
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const r = (idx * 37) % 256;
      const g = (idx * 73) % 256;
      const b = (idx * 113) % 256;
      for (let y = 0; y < frameH; y++) {
        for (let x = 0; x < frameW; x++) {
          setPixel(buf, col * frameW + x, row * frameH + y, [r, g, b, 1]);
        }
      }
    }
  }
  return buf;
}

describe('Sprite Sheet Operations', () => {
  describe('sliceSpriteSheet()', () => {
    it('slices into correct number of frames', () => {
      const sheet = makeTestSheet(4, 3, 16, 16);
      const frames = sliceSpriteSheet(sheet, 16, 16);
      expect(frames).toHaveLength(12);
    });

    it('each frame has correct dimensions', () => {
      const sheet = makeTestSheet(3, 2, 32, 24);
      const frames = sliceSpriteSheet(sheet, 32, 24);
      for (const frame of frames) {
        expect(frame.width).toBe(32);
        expect(frame.height).toBe(24);
      }
    });

    it('preserves pixel data per frame', () => {
      const sheet = makeTestSheet(2, 2, 8, 8);
      const frames = sliceSpriteSheet(sheet, 8, 8);

      // Frame 0 should have its unique color
      const px0 = getPixel(frames[0], 0, 0);
      const px1 = getPixel(frames[1], 0, 0);
      // Different frames should have different colors
      expect(px0[0] !== px1[0] || px0[1] !== px1[1] || px0[2] !== px1[2]).toBe(true);
    });
  });

  describe('assembleSpriteSheet()', () => {
    it('round-trips with sliceSpriteSheet', () => {
      const original = makeTestSheet(3, 2, 16, 16);
      const frames = sliceSpriteSheet(original, 16, 16);
      const reassembled = assembleSpriteSheet(frames, 3);

      expect(reassembled.width).toBe(original.width);
      expect(reassembled.height).toBe(original.height);

      // Spot check some pixels
      for (let y = 0; y < original.height; y += 8) {
        for (let x = 0; x < original.width; x += 8) {
          const orig = getPixel(original, x, y);
          const reasm = getPixel(reassembled, x, y);
          expect(reasm[0]).toBe(orig[0]);
          expect(reasm[1]).toBe(orig[1]);
          expect(reasm[2]).toBe(orig[2]);
        }
      }
    });

    it('throws on empty frames array', () => {
      expect(() => assembleSpriteSheet([], 4)).toThrow();
    });

    it('handles non-square layouts', () => {
      const frames = [
        createPixelBuffer(8, 8),
        createPixelBuffer(8, 8),
        createPixelBuffer(8, 8),
      ];
      // 2 columns = 2 rows (3 frames, last cell empty)
      const sheet = assembleSpriteSheet(frames, 2);
      expect(sheet.width).toBe(16);
      expect(sheet.height).toBe(16);
    });
  });

  describe('neonifySpriteSheet()', () => {
    it('neonifies all frames without changing dimensions', () => {
      const sheet = makeTestSheet(2, 2, 16, 16);
      const neonColor = createNeonColor('Test', 300);
      const result = neonifySpriteSheet(sheet, 16, 16, neonColor);
      expect(result.width).toBe(sheet.width);
      expect(result.height).toBe(sheet.height);
    });
  });

  describe('generateManifest()', () => {
    it('generates valid manifest', () => {
      const frames = [
        { name: 'idle_0', x: 0, y: 0, width: 32, height: 32 },
        { name: 'idle_1', x: 32, y: 0, width: 32, height: 32 },
        { name: 'walk_0', x: 0, y: 32, width: 32, height: 32 },
      ];
      const manifest = generateManifest('player', frames, 32, 32, 10);
      expect(manifest.name).toBe('player');
      expect(manifest.frameWidth).toBe(32);
      expect(manifest.frameHeight).toBe(32);
      expect(manifest.frames).toHaveLength(3);
      expect(manifest.animationFps).toBe(10);
      expect(manifest.columns).toBeGreaterThan(0);
      expect(manifest.rows).toBeGreaterThan(0);
    });
  });
});
