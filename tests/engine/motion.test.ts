import { describe, it, expect, vi } from 'vitest';
import { EASE, MOTION, lerp, clamp01, animate, approach } from '../../src/engine/motion';
import { isPointInButton } from '../../src/components/canvas-button';
import { showToast } from '../../src/integration/toast';
import { showLoading } from '../../src/integration/loading';
import { showDialog } from '../../src/integration/dialog';

describe('EASE curves', () => {
  const names = Object.keys(EASE);

  it('all map 0→0 and 1→1', () => {
    for (const name of names) {
      expect(EASE[name](0)).toBeCloseTo(0, 5);
      expect(EASE[name](1)).toBeCloseTo(1, 5);
    }
  });

  it('none overshoot [0,1] — the no-bounce brand rule', () => {
    for (const name of names) {
      for (let i = 0; i <= 100; i++) {
        const v = EASE[name](i / 100);
        expect(v).toBeGreaterThanOrEqual(-1e-9);
        expect(v).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it('all are monotonically non-decreasing', () => {
    for (const name of names) {
      let prev = -1;
      for (let i = 0; i <= 100; i++) {
        const v = EASE[name](i / 100);
        expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
        prev = v;
      }
    }
  });
});

describe('motion utilities', () => {
  it('lerp and clamp01 behave', () => {
    expect(lerp(10, 20, 0.5)).toBe(15);
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(3)).toBe(1);
    expect(MOTION.state).toBeGreaterThan(0);
  });

  it('approach halves remaining distance per half-life regardless of step size', () => {
    // One 100ms step vs ten 10ms steps must land in the same place
    const oneStep = approach(0, 100, 100, 100);
    let manySteps = 0;
    for (let i = 0; i < 10; i++) manySteps = approach(manySteps, 100, 10, 100);
    expect(oneStep).toBeCloseTo(50, 5);
    expect(manySteps).toBeCloseTo(oneStep, 5);
  });

  it('animate drives from → to and completes (timer fallback path)', async () => {
    const seen: number[] = [];
    await new Promise<void>((resolve) => {
      animate({
        from: 0, to: 10, duration: 50,
        onUpdate: (v) => seen.push(v),
        onDone: resolve,
      });
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toBeCloseTo(10, 5);
  });

  it('animate cancel stops updates', async () => {
    const spy = vi.fn();
    const cancel = animate({ duration: 1000, onUpdate: spy });
    cancel();
    await new Promise((r) => setTimeout(r, 60));
    // At most the frames before cancel landed; none near completion
    expect(spy.mock.calls.every(([, t]) => t < 1)).toBe(true);
  });
});

describe('canvas button hit test', () => {
  const rect = { x: 10, y: 20, width: 100, height: 40 };
  it('inside / edges / outside', () => {
    expect(isPointInButton(rect, 50, 40)).toBe(true);
    expect(isPointInButton(rect, 10, 20)).toBe(true);
    expect(isPointInButton(rect, 110, 60)).toBe(true);
    expect(isPointInButton(rect, 9, 40)).toBe(false);
    expect(isPointInButton(rect, 50, 61)).toBe(false);
  });
});

describe('overlay components are SSR-safe', () => {
  it('showToast no-ops without a document', () => {
    expect(typeof document).toBe('undefined');
    const dismiss = showToast('hello');
    expect(() => dismiss()).not.toThrow();
  });

  it('showLoading returns an inert handle without a document', () => {
    const handle = showLoading();
    expect(() => { handle.setProgress(0.5); handle.setLabel('x'); handle.done(); }).not.toThrow();
  });

  it('showDialog rejects gracefully without a document', async () => {
    await expect(showDialog({ body: 'x' })).rejects.toThrow(/browser/);
  });
});
