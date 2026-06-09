import type { RGBA, HSL, NeonColor, ColorPalette } from './types';

// ── Color Utility Functions ──────────────────────────────────────────

export function rgba(r: number, g: number, b: number, a: number = 1): RGBA {
  return [r, g, b, a];
}

export function hslToRgba(h: number, s: number, l: number, a: number = 1): RGBA {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
    a,
  ];
}

export function rgbaToHsl(color: RGBA): HSL {
  const r = color[0] / 255;
  const g = color[1] / 255;
  const b = color[2] / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }

  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

export function lerpColor(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    a[3] + (b[3] - a[3]) * t,
  ];
}

export function withAlpha(color: RGBA, alpha: number): RGBA {
  return [color[0], color[1], color[2], alpha];
}

export function brighten(color: RGBA, amount: number): RGBA {
  return [
    Math.min(255, color[0] + amount),
    Math.min(255, color[1] + amount),
    Math.min(255, color[2] + amount),
    color[3],
  ];
}

export function darken(color: RGBA, amount: number): RGBA {
  return [
    Math.max(0, color[0] - amount),
    Math.max(0, color[1] - amount),
    Math.max(0, color[2] - amount),
    color[3],
  ];
}

export function rgbaToCss(color: RGBA): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`;
}

export function rgbaToHex(color: RGBA): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(color[0])}${hex(color[1])}${hex(color[2])}`;
}

// ── Neon Color Factory ───────────────────────────────────────────────

export function createNeonColor(name: string, hue: number, saturation: number = 100, lightness: number = 60): NeonColor {
  return {
    name,
    core: hslToRgba(hue, saturation, lightness),
    glow: hslToRgba(hue, saturation, lightness + 15, 0.6),
    dim: hslToRgba(hue, saturation - 30, lightness - 35),
  };
}

export function recolorNeon(base: NeonColor, newHue: number): NeonColor {
  const coreHsl = rgbaToHsl(base.core);
  const glowHsl = rgbaToHsl(base.glow);
  const dimHsl = rgbaToHsl(base.dim);
  return {
    name: base.name,
    core: hslToRgba(newHue, coreHsl[1], coreHsl[2], base.core[3]),
    glow: hslToRgba(newHue, glowHsl[1], glowHsl[2], base.glow[3]),
    dim: hslToRgba(newHue, dimHsl[1], dimHsl[2], base.dim[3]),
  };
}

// ── Pre-built Palettes ───────────────────────────────────────────────

/** The default arcade palette derived from the reference image */
export const PALETTE_NEON_INFERNO: ColorPalette = {
  name: 'Neon Inferno',
  primary: createNeonColor('Magenta', 300, 100, 60),
  secondary: createNeonColor('Cyan Ice', 195, 100, 65),
  tertiary: createNeonColor('Amber Fire', 30, 100, 55),
  danger: createNeonColor('Crimson', 350, 100, 50),
  backgroundTint: rgba(10, 2, 15, 1),
  background: rgba(0, 0, 0, 1),
};

export const PALETTE_ELECTRIC_OCEAN: ColorPalette = {
  name: 'Electric Ocean',
  primary: createNeonColor('Electric Blue', 220, 100, 60),
  secondary: createNeonColor('Seafoam', 160, 90, 55),
  tertiary: createNeonColor('Gold', 45, 100, 55),
  danger: createNeonColor('Coral', 15, 100, 55),
  backgroundTint: rgba(2, 5, 18, 1),
  background: rgba(0, 0, 0, 1),
};

export const PALETTE_TOXIC_JUNGLE: ColorPalette = {
  name: 'Toxic Jungle',
  primary: createNeonColor('Acid Green', 120, 100, 55),
  secondary: createNeonColor('Violet', 270, 90, 60),
  tertiary: createNeonColor('Yellow', 55, 100, 60),
  danger: createNeonColor('Hot Pink', 330, 100, 55),
  backgroundTint: rgba(2, 10, 5, 1),
  background: rgba(0, 0, 0, 1),
};

export const PALETTE_SOLAR_STORM: ColorPalette = {
  name: 'Solar Storm',
  primary: createNeonColor('Solar Orange', 25, 100, 58),
  secondary: createNeonColor('Plasma Blue', 210, 100, 60),
  tertiary: createNeonColor('White Hot', 50, 80, 75),
  danger: createNeonColor('Deep Red', 0, 100, 48),
  backgroundTint: rgba(12, 5, 2, 1),
  background: rgba(0, 0, 0, 1),
};

export const ALL_PALETTES: ColorPalette[] = [
  PALETTE_NEON_INFERNO,
  PALETTE_ELECTRIC_OCEAN,
  PALETTE_TOXIC_JUNGLE,
  PALETTE_SOLAR_STORM,
];

/** Create a custom palette by specifying 4 hue values */
export function createPalette(
  name: string,
  primaryHue: number,
  secondaryHue: number,
  tertiaryHue: number,
  dangerHue: number,
): ColorPalette {
  return {
    name,
    primary: createNeonColor('Primary', primaryHue),
    secondary: createNeonColor('Secondary', secondaryHue),
    tertiary: createNeonColor('Tertiary', tertiaryHue),
    danger: createNeonColor('Danger', dangerHue),
    backgroundTint: rgba(5, 2, 8, 1),
    background: rgba(0, 0, 0, 1),
  };
}

/** Remap a palette to new hues while preserving saturation/lightness relationships */
export function remapPalette(base: ColorPalette, hueShift: number): ColorPalette {
  const shift = (color: NeonColor): NeonColor => {
    const hue = (rgbaToHsl(color.core)[0] + hueShift) % 360;
    return recolorNeon(color, hue);
  };
  return {
    ...base,
    name: `${base.name} (shifted ${hueShift})`,
    primary: shift(base.primary),
    secondary: shift(base.secondary),
    tertiary: shift(base.tertiary),
    danger: shift(base.danger),
  };
}
