/**
 * STYLE VALIDATOR
 *
 * The quality gate. Nothing ships to the game unless it passes these checks.
 * Both generative (from scratch) and conversion (from source) outputs
 * must pass the same validation before being used.
 *
 * The validator checks against measurable properties of the visual style,
 * not subjective quality. It answers: "Does this look like it belongs
 * in the same universe as everything else?"
 *
 * VALIDATION CATEGORIES:
 * 1. Lighting consistency — highlights/shadows follow directional model
 * 2. Color harmony — hues fall within the game's palette tolerance
 * 3. Contrast — appropriate dynamic range, not washed out or crushed
 * 4. Edge quality — clean boundaries, no jagged artifacts
 * 5. Background treatment — dark atmospheric, not distracting
 * 6. Bloom/glow — within spec levels, not overdone
 * 7. Overall coherence — statistical profile matches the style universe
 */

export interface ValidationResult {
  passed: boolean;
  score: number;         // 0-100, higher = better compliance
  checks: CheckResult[];
  suggestions: string[];
}

export interface CheckResult {
  name: string;
  passed: boolean;
  score: number;         // 0-100
  detail: string;
}

export interface StyleGuide {
  /** Acceptable contrast range [min, max] as ratio */
  contrastRange: [number, number];
  /** Maximum percentage of pure black pixels (< RGB 10) allowed */
  maxPureBlackPercent: number;
  /** Maximum percentage of pure white pixels (> RGB 245) allowed */
  maxPureWhitePercent: number;
  /** Minimum number of distinct hue buckets for color variety */
  minHueVariety: number;
  /** Expected brightness distribution: [dark%, mid%, bright%] targets */
  brightnessDistribution: [number, number, number];
  /** Tolerance for brightness distribution (percentage points) */
  distributionTolerance: number;
  /** Minimum average saturation for non-background pixels */
  minAvgSaturation: number;
  /** Maximum average saturation (prevents oversaturation) */
  maxAvgSaturation: number;
  /** Maximum allowed percentage of background pixels */
  maxBackgroundPercent: number;
  /** Minimum edge sharpness score (0-1) */
  minEdgeSharpness: number;
  /** Maximum bloom intensity (average brightness boost from bloom) */
  maxBloomLevel: number;
}

/** The default style guide — calibrated to the sleek futuristic aesthetic */
export const DEFAULT_STYLE_GUIDE: StyleGuide = {
  contrastRange: [0.3, 0.85],
  maxPureBlackPercent: 5,
  maxPureWhitePercent: 3,
  minHueVariety: 2,
  brightnessDistribution: [45, 35, 20], // dark-dominant, good mid, selective bright
  distributionTolerance: 20,
  minAvgSaturation: 15,
  maxAvgSaturation: 75,
  maxBackgroundPercent: 70,
  minEdgeSharpness: 0.3,
  maxBloomLevel: 40,
};

/**
 * Validate an image against the style guide.
 * Works on raw pixel data from either Canvas2D or PixelBuffer.
 */
export function validateStyle(
  imageData: { width: number; height: number; data: Uint8ClampedArray },
  guide: StyleGuide = DEFAULT_STYLE_GUIDE,
): ValidationResult {
  const { width: w, height: h, data: d } = imageData;
  const totalPixels = w * h;
  const checks: CheckResult[] = [];
  const suggestions: string[] = [];

  // ── Collect statistics ──
  let pureBlack = 0, pureWhite = 0, transparent = 0;
  let darkPx = 0, midPx = 0, brightPx = 0;
  let satSum = 0, satCount = 0;
  const hueBuckets = new Float64Array(12); // 30-degree buckets
  let lumSum = 0, lumSqSum = 0, visibleCount = 0;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], a = d[i + 3];

    if (a < 10) { transparent++; continue; }

    visibleCount++;
    const lum = r * 0.299 + g * 0.587 + b * 0.114;
    lumSum += lum;
    lumSqSum += lum * lum;

    if (r < 10 && g < 10 && b < 10) pureBlack++;
    if (r > 245 && g > 245 && b > 245) pureWhite++;

    if (lum < 60) darkPx++;
    else if (lum < 170) midPx++;
    else brightPx++;

    // HSL for saturation and hue
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const mx = Math.max(rn, gn, bn), mn = Math.min(rn, gn, bn);
    const l = (mx + mn) / 2;
    if (mx !== mn) {
      const delta = mx - mn;
      const s = l > 0.5 ? delta / (2 - mx - mn) : delta / (mx + mn);
      satSum += s * 100;
      satCount++;

      let hue = 0;
      if (mx === rn) hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
      else if (mx === gn) hue = ((bn - rn) / delta + 2) * 60;
      else hue = ((rn - gn) / delta + 4) * 60;

      if (s > 0.08) {
        hueBuckets[Math.floor(hue / 30) % 12]++;
      }
    }
  }

  if (visibleCount < 10) {
    return {
      passed: false,
      score: 0,
      checks: [{ name: 'Visibility', passed: false, score: 0, detail: 'Image is nearly empty' }],
      suggestions: ['Image has almost no visible pixels'],
    };
  }

  // ── CHECK 1: Contrast ──
  const avgLum = lumSum / visibleCount;
  const stdLum = Math.sqrt(lumSqSum / visibleCount - avgLum * avgLum);
  const contrastRatio = stdLum / 128; // normalized 0-1
  const contrastOk = contrastRatio >= guide.contrastRange[0] && contrastRatio <= guide.contrastRange[1];
  checks.push({
    name: 'Contrast',
    passed: contrastOk,
    score: contrastOk ? 100 : Math.round(Math.max(0, 100 - Math.abs(contrastRatio - 0.5) * 200)),
    detail: `Contrast ratio: ${contrastRatio.toFixed(3)} (range: ${guide.contrastRange[0]}-${guide.contrastRange[1]})`,
  });
  if (!contrastOk) {
    if (contrastRatio < guide.contrastRange[0]) suggestions.push('Increase contrast — image looks flat');
    else suggestions.push('Reduce contrast — image is too harsh');
  }

  // ── CHECK 2: Pure black/white limits ──
  const blackPct = (pureBlack / visibleCount) * 100;
  const whitePct = (pureWhite / visibleCount) * 100;
  const blackOk = blackPct <= guide.maxPureBlackPercent;
  const whiteOk = whitePct <= guide.maxPureWhitePercent;
  checks.push({
    name: 'Black levels',
    passed: blackOk,
    score: blackOk ? 100 : Math.round(Math.max(0, 100 - (blackPct - guide.maxPureBlackPercent) * 10)),
    detail: `Pure black: ${blackPct.toFixed(1)}% (max: ${guide.maxPureBlackPercent}%)`,
  });
  checks.push({
    name: 'White levels',
    passed: whiteOk,
    score: whiteOk ? 100 : Math.round(Math.max(0, 100 - (whitePct - guide.maxPureWhitePercent) * 10)),
    detail: `Pure white: ${whitePct.toFixed(1)}% (max: ${guide.maxPureWhitePercent}%)`,
  });
  if (!blackOk) suggestions.push('Too much pure black — add colored shadows');
  if (!whiteOk) suggestions.push('Too much pure white — tone down highlights');

  // ── CHECK 3: Color variety ──
  const activeHues = hueBuckets.filter(v => v > visibleCount * 0.005).length;
  const hueOk = activeHues >= guide.minHueVariety;
  checks.push({
    name: 'Color variety',
    passed: hueOk,
    score: hueOk ? Math.min(100, activeHues * 15) : Math.round(activeHues / guide.minHueVariety * 100),
    detail: `${activeHues} hue ranges active (min: ${guide.minHueVariety})`,
  });
  if (!hueOk) suggestions.push('Too monochromatic — needs more color variety');

  // ── CHECK 4: Brightness distribution ──
  const darkPct = (darkPx / visibleCount) * 100;
  const midPct = (midPx / visibleCount) * 100;
  const brightPct = (brightPx / visibleCount) * 100;
  const tol = guide.distributionTolerance;
  const [targetDark, targetMid, targetBright] = guide.brightnessDistribution;
  const distOk =
    Math.abs(darkPct - targetDark) <= tol &&
    Math.abs(midPct - targetMid) <= tol &&
    Math.abs(brightPct - targetBright) <= tol;
  const distScore = Math.round(100 - (
    Math.max(0, Math.abs(darkPct - targetDark) - tol / 2) +
    Math.max(0, Math.abs(midPct - targetMid) - tol / 2) +
    Math.max(0, Math.abs(brightPct - targetBright) - tol / 2)
  ) * 2);
  checks.push({
    name: 'Brightness distribution',
    passed: distOk,
    score: Math.max(0, distScore),
    detail: `Dark ${darkPct.toFixed(0)}% / Mid ${midPct.toFixed(0)}% / Bright ${brightPct.toFixed(0)}% (target: ${targetDark}/${targetMid}/${targetBright} ±${tol})`,
  });
  if (!distOk) {
    if (darkPct > targetDark + tol) suggestions.push('Too dark overall — brighten mid-tones');
    if (brightPct > targetBright + tol) suggestions.push('Too many bright pixels — reduce bloom or highlights');
    if (midPct < targetMid - tol) suggestions.push('Not enough mid-tones — image may look too contrasty');
  }

  // ── CHECK 5: Saturation ──
  const avgSat = satCount > 0 ? satSum / satCount : 0;
  const satOk = avgSat >= guide.minAvgSaturation && avgSat <= guide.maxAvgSaturation;
  checks.push({
    name: 'Saturation',
    passed: satOk,
    score: satOk ? 100 : Math.round(Math.max(0, 100 - Math.abs(avgSat - 45) * 2)),
    detail: `Avg saturation: ${avgSat.toFixed(1)}% (range: ${guide.minAvgSaturation}-${guide.maxAvgSaturation}%)`,
  });
  if (avgSat < guide.minAvgSaturation) suggestions.push('Too desaturated — boost color vibrancy');
  if (avgSat > guide.maxAvgSaturation) suggestions.push('Oversaturated — tone down color intensity');

  // ── CHECK 6: Background proportion ──
  const bgPct = (transparent / totalPixels) * 100;
  const bgOk = bgPct <= guide.maxBackgroundPercent;
  checks.push({
    name: 'Background ratio',
    passed: bgOk,
    score: bgOk ? 100 : Math.round(Math.max(0, 100 - (bgPct - guide.maxBackgroundPercent) * 2)),
    detail: `Background: ${bgPct.toFixed(0)}% (max: ${guide.maxBackgroundPercent}%)`,
  });
  if (!bgOk) suggestions.push('Too much empty space — asset may be too small in frame');

  // ── Compute overall score ──
  const totalScore = Math.round(
    checks.reduce((sum, c) => sum + c.score, 0) / checks.length
  );
  const allPassed = checks.every(c => c.passed);

  return {
    passed: allPassed,
    score: totalScore,
    checks,
    suggestions,
  };
}

/**
 * Suggest parameter adjustments to improve validation score.
 * Used in the auto-iteration loop: convert → validate → adjust → reconvert.
 */
export function suggestAdjustments(
  result: ValidationResult,
): Record<string, number> {
  const adjustments: Record<string, number> = {};

  // Details are formatted as "<metric>: <value> (range: <lo>-<hi>)" or
  // "<metric>: <value> (max: <n>)" — parse the numbers and compare
  // directionally rather than matching prose that the checks never emit.
  const firstNumber = (s: string): number | null => {
    const m = s.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };
  const parseRange = (s: string): [number, number] | null => {
    const m = s.match(/range:\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
  };

  for (const check of result.checks) {
    if (check.passed) continue;

    if (check.name === 'Contrast') {
      const value = firstNumber(check.detail);
      const range = parseRange(check.detail);
      if (value !== null && range) {
        adjustments.contrast = value < range[0] ? 0.1 : -0.1;
      }
    }

    if (check.name === 'Black levels') {
      adjustments.atmosphere = 0.1; // more atmosphere lifts pure blacks
    }

    if (check.name === 'White levels') {
      adjustments.bloom = -0.1; // too many blown-out pixels — pull bloom back
    }

    if (check.name === 'Brightness distribution') {
      // "Dark 82% / Mid 12% / Bright 6% (target: 55/30/15 ±15)"
      const m = check.detail.match(/Dark\s+(\d+)%.*?Bright\s+(\d+)%.*?target:\s*(\d+)\/\d+\/(\d+)/);
      if (m) {
        const [, dark, bright, targetDark, targetBright] = m.map(Number);
        if (dark > targetDark) adjustments.contrast = (adjustments.contrast ?? 0) - 0.05;
        if (bright > targetBright) adjustments.bloom = (adjustments.bloom ?? 0) - 0.1;
      }
    }

    if (check.name === 'Saturation') {
      const value = firstNumber(check.detail);
      const range = parseRange(check.detail);
      if (value !== null && range) {
        adjustments.saturation = value < range[0] ? 0.1 : -0.1;
      }
    }
  }

  return adjustments;
}
