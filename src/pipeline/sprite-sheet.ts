import type { ArcadeTheme, NeonColor } from '../style/types';
import { PixelBuffer, createPixelBuffer, getPixel, setPixel } from '../engine/renderer';
import { neonifySprite } from '../engine/sprites';

/**
 * Sprite sheet generation and slicing utilities.
 */

export interface SpriteSheetFrame {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpriteSheetConfig {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  frames: SpriteSheetFrame[];
}

/** Slice a sprite sheet into individual frames */
export function sliceSpriteSheet(
  sheet: PixelBuffer,
  frameWidth: number,
  frameHeight: number,
): PixelBuffer[] {
  const cols = Math.floor(sheet.width / frameWidth);
  const rows = Math.floor(sheet.height / frameHeight);
  const frames: PixelBuffer[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const frame = createPixelBuffer(frameWidth, frameHeight);
      for (let y = 0; y < frameHeight; y++) {
        for (let x = 0; x < frameWidth; x++) {
          const sx = col * frameWidth + x;
          const sy = row * frameHeight + y;
          setPixel(frame, x, y, getPixel(sheet, sx, sy));
        }
      }
      frames.push(frame);
    }
  }

  return frames;
}

/** Combine individual frames back into a sprite sheet */
export function assembleSpriteSheet(
  frames: PixelBuffer[],
  columns: number,
): PixelBuffer {
  if (frames.length === 0) throw new Error('No frames to assemble');

  const fw = frames[0].width;
  const fh = frames[0].height;
  const rows = Math.ceil(frames.length / columns);
  const sheet = createPixelBuffer(fw * columns, fh * rows);

  for (let i = 0; i < frames.length; i++) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const frame = frames[i];

    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        setPixel(sheet, col * fw + x, row * fh + y, getPixel(frame, x, y));
      }
    }
  }

  return sheet;
}

/** Neonify an entire sprite sheet frame by frame */
export function neonifySpriteSheet(
  sheet: PixelBuffer,
  frameWidth: number,
  frameHeight: number,
  neonColor: NeonColor,
): PixelBuffer {
  const frames = sliceSpriteSheet(sheet, frameWidth, frameHeight);
  const neonFrames = frames.map(frame =>
    neonifySprite(frame, { neonColor })
  );
  return assembleSpriteSheet(neonFrames, Math.floor(sheet.width / frameWidth));
}

/** Generate a sprite sheet manifest (JSON config for game consumption) */
export function generateManifest(
  name: string,
  frames: SpriteSheetFrame[],
  frameWidth: number,
  frameHeight: number,
  animationFps: number = 12,
): SpriteSheetConfig & { name: string; animationFps: number } {
  return {
    name,
    frameWidth,
    frameHeight,
    columns: Math.ceil(Math.sqrt(frames.length)),
    rows: Math.ceil(frames.length / Math.ceil(Math.sqrt(frames.length))),
    frames,
    animationFps,
  };
}
