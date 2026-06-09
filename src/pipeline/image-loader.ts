import type { RGBA, ArcadeTheme, NeonColor } from '../style/types';
import { PixelBuffer, createPixelBuffer, setPixel } from '../engine/renderer';
import { neonifySprite, createNeonSprite } from '../engine/sprites';

/**
 * Image loading and conversion pipeline.
 * Handles loading images from various sources and converting them
 * into the neon arcade style.
 */

/** Load a PixelBuffer from an HTMLImageElement (browser) */
export function pixelBufferFromImage(img: HTMLImageElement | ImageBitmap): PixelBuffer {
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  return {
    width: img.width,
    height: img.height,
    data: new Uint8ClampedArray(imageData.data),
  };
}

/** Load a PixelBuffer from ImageData */
export function pixelBufferFromImageData(imageData: ImageData): PixelBuffer {
  return {
    width: imageData.width,
    height: imageData.height,
    data: new Uint8ClampedArray(imageData.data),
  };
}

/** Load an image from URL and convert to PixelBuffer (browser only) */
export async function loadImage(url: string): Promise<PixelBuffer> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(pixelBufferFromImage(img));
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Full pipeline: load image -> downscale to pixel art -> neonify -> glow.
 * This is the main entry point for converting any image into our style.
 */
export async function convertToArcadeStyle(
  source: string | HTMLImageElement | PixelBuffer,
  theme: ArcadeTheme,
  options?: {
    targetWidth?: number;
    targetHeight?: number;
    colorRole?: 'primary' | 'secondary' | 'tertiary' | 'danger';
    preserveHueVariation?: boolean;
  },
): Promise<PixelBuffer> {
  let buf: PixelBuffer;

  // Load source
  if (typeof source === 'string') {
    buf = await loadImage(source);
  } else if ('width' in source && 'data' in source) {
    buf = source;
  } else {
    buf = pixelBufferFromImage(source as HTMLImageElement);
  }

  // Downscale if target dimensions specified
  if (options?.targetWidth || options?.targetHeight) {
    buf = downscalePixelArt(
      buf,
      options.targetWidth ?? buf.width,
      options.targetHeight ?? buf.height,
    );
  }

  // Apply neon style
  return createNeonSprite(buf, theme, options?.colorRole ?? 'primary');
}

/** Downscale an image using area averaging (good for pixel art creation) */
export function downscalePixelArt(src: PixelBuffer, targetW: number, targetH: number): PixelBuffer {
  const dst = createPixelBuffer(targetW, targetH);
  const xRatio = src.width / targetW;
  const yRatio = src.height / targetH;

  for (let ty = 0; ty < targetH; ty++) {
    for (let tx = 0; tx < targetW; tx++) {
      // Average all source pixels that map to this target pixel
      const sx0 = Math.floor(tx * xRatio);
      const sy0 = Math.floor(ty * yRatio);
      const sx1 = Math.floor((tx + 1) * xRatio);
      const sy1 = Math.floor((ty + 1) * yRatio);
      const count = Math.max(1, (sx1 - sx0) * (sy1 - sy0));

      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const si = (sy * src.width + sx) * 4;
          r += src.data[si];
          g += src.data[si + 1];
          b += src.data[si + 2];
          a += src.data[si + 3];
        }
      }

      setPixel(dst, tx, ty, [
        Math.round(r / count),
        Math.round(g / count),
        Math.round(b / count),
        Math.round(a / count) / 255,
      ]);
    }
  }

  return dst;
}

/** Create a PixelBuffer from raw RGBA array data */
export function pixelBufferFromRaw(width: number, height: number, data: number[]): PixelBuffer {
  const buf = createPixelBuffer(width, height);
  for (let i = 0; i < data.length && i < buf.data.length; i++) {
    buf.data[i] = data[i];
  }
  return buf;
}
