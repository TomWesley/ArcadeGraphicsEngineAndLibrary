import { describe, it, expect, vi } from 'vitest';
import { setupHiDPICanvas } from '../../src/engine/canvas-utils';
import { ThemeProvider } from '../../src/integration/theme-provider';

function stubCanvas(clientWidth = 400, clientHeight = 300) {
  const ctx = { setTransform: vi.fn() };
  const canvas = {
    clientWidth, clientHeight,
    width: 0, height: 0,
    style: {} as Record<string, string>,
    getContext: vi.fn(() => ctx),
  };
  return { canvas, ctx };
}

describe('setupHiDPICanvas', () => {
  it('scales the backing store by dpr and pins CSS size', () => {
    const { canvas, ctx } = stubCanvas(400, 300);
    const result = setupHiDPICanvas(canvas as unknown as HTMLCanvasElement, undefined, undefined, 2);

    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(canvas.style.width).toBe('400px');
    expect(canvas.style.height).toBe('300px');
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(result.width).toBe(400);
    expect(result.height).toBe(300);
    expect(result.dpr).toBe(2);
  });

  it('accepts explicit CSS dimensions', () => {
    const { canvas } = stubCanvas();
    const result = setupHiDPICanvas(canvas as unknown as HTMLCanvasElement, 200, 100, 3);
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(300);
    expect(result.width).toBe(200);
  });

  it('defaults dpr to 1 outside a browser', () => {
    const { canvas } = stubCanvas(120, 80);
    const result = setupHiDPICanvas(canvas as unknown as HTMLCanvasElement);
    expect(result.dpr).toBe(1);
    expect(canvas.width).toBe(120);
  });
});

describe('ThemeProvider hardening', () => {
  it('lowPower collapses the glow system to one cheap pass', () => {
    const normal = ThemeProvider.create('NEON_INFERNO');
    const low = ThemeProvider.create('NEON_INFERNO', { lowPower: true });
    expect(low.theme.glow.passes).toBe(1);
    expect(low.theme.glow.outerRadius).toBeLessThan(normal.theme.glow.outerRadius);
    expect(low.theme.animation.glowPulseAmplitude).toBe(0);
  });

  it('lowPower works with custom palettes', () => {
    const p = ThemeProvider.custom('X', 10, 100, 200, 0, { lowPower: true });
    expect(p.theme.glow.passes).toBe(1);
  });

  it('injectCSS/removeCSS are SSR-safe (no document in this test env)', () => {
    const p = ThemeProvider.create('ELECTRIC_OCEAN');
    expect(typeof document).toBe('undefined');
    expect(() => p.injectCSS()).not.toThrow();
    expect(() => p.removeCSS()).not.toThrow();
  });
});
