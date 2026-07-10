# Arcade Graphics Engine — Branding Guide

The definitive design-system reference for every game built on this engine.
CLAUDE.md tells a Claude instance *how to generate assets*; this document
defines *what the brand is*. When the two disagree, this document wins.

**Live specimen page:** `npm run test:brand` renders this guide visually,
straight from the engine's shipped code.

---

## 1. Identity

**One sentence:** Every surface looks like an instrument on a military
spacecraft — precise, powered, and engineered, never decorated.

**Personality:** adult · military-grade · precise · quietly confident

**Reference points:** Halo HUD, Elite Dangerous cockpit, *2001: A Space
Odyssey* interfaces.

**Never:** pixel art, retro arcade, cute/cartoon, fantasy parchment,
bright-and-friendly mobile.

The test for any new asset: *could this plausibly be a readout on a
spacecraft bridge?* If it reads as decoration rather than instrumentation,
it fails.

---

## 2. Color System

Color is structural, not decorative. Every game picks a palette; the engine
applies it through fixed **roles** so two games with different palettes
still feel like siblings.

### Roles

| Role | Use | Share of screen |
|---|---|---|
| **Background** | Near-black field with a hue undertone — never pure `#000` | ~85% |
| **Primary** | UI chrome: borders, text, icons, gauges | ~10% |
| **Secondary** | Accents: highlights, status, sweep beams | ~4% |
| **Tertiary** | Rare third accent | <1% |
| **Danger** | Alerts, damage, reserve zones only | on demand |

Each color role carries three intensities: `core` (full strength), `glow`
(for shadowBlur/bloom), and `dim` (borders at rest, disabled states).

### The ratio rule

Dark dominates. Color is an accent that *earns* attention — a screen that
is mostly colored is off-brand regardless of which colors are used. If a
layout feels flat, add structure (lines, ticks, panels), not more color.

### Built-in palettes

| Palette | Primary hue | Character |
|---|---|---|
| `NEON_INFERNO` | scarlet 350° | aggressive, combat |
| `ELECTRIC_OCEAN` | cyan 190° | cool, exploratory |
| `TOXIC_JUNGLE` | green 110° | hazardous, organic-tech |
| `SOLAR_STORM` | amber 40° | industrial, warm |

Custom palettes: `ThemeProvider.custom(name, primaryHue, secondaryHue,
tertiaryHue, dangerHue)` — pick any hues; the engine derives core/glow/dim
and background undertones so the ratios hold.

### Don't

- Pure black backgrounds or pure white text
- Flooding a panel with a fill at >0.2 opacity
- Using danger color for emphasis (it means *danger*)
- More than two accent hues visible at once

---

## 3. Typography

Three faces, seven roles, zero per-game decisions. Loaded automatically by
`ThemeProvider.injectCSS()`; constants in `style/fonts.ts`; the kit in
`style/typography.ts`.

### Faces

| Face | Feel | Carries |
|---|---|---|
| **Orbitron** | geometric, futuristic | identity (titles, headings) |
| **Rajdhani** | clean, condensed, readable | interaction (labels, body) |
| **Share Tech Mono** | technical, tabular | data (readouts, stats) |

### Roles (the kit)

| Role | Spec | Use for |
|---|---|---|
| `display` | Orbitron 900 · 56px · +0.18em · UPPER | game title |
| `title` | Orbitron 700 · 26px · +0.14em · UPPER | screen titles |
| `heading` | Orbitron 600 · 13px · +0.24em · UPPER | panel titles |
| `label` | Rajdhani 600 · 14px · +0.14em · UPPER | buttons, menu items |
| `body` | Rajdhani 400 · 15px · +0.02em · Sentence | descriptions, tooltips |
| `data` | Share Tech Mono · 13px · +0.10em · UPPER | stats, readouts |
| `micro` | Share Tech Mono · 10px · +0.20em · UPPER | versions, footnotes |

Usage: CSS classes `.arcade-display` … `.arcade-micro` (after
`injectCSS()`), or on canvas via `applyType(ctx, 'label')` /
`canvasFont('data', 16)` / `typeCase('label', text)`.

### Rules

- Only `body` is sentence case. Everything else is uppercase — set casing
  via the kit, don't type capitals into strings.
- Tracking is part of the voice: wide on small uppercase text
  (stencil-plate feel), tighter as size grows. The kit encodes this.
- Never mix roles within a line. A stat line is all `data`.
- Sizes may scale with layout; every other attribute of a role is fixed.

---

## 4. Shape Language

- **Clipped corners**, not rounded: panels and buttons cut their corners at
  45° (8–12px). Rounded rectangles read as consumer software.
- **Hexagons** are the signature container for emblems and cores.
- **Corner brackets** frame important zones (targeting-reticle vocabulary).
- **Thin lines** (1–2px) with selective glow — never thick outlines.
- **Angular over organic**: if a curve isn't a circle/arc/ellipse, it
  should probably be two straight lines.

---

## 5. Glow & Bloom

Glow says *powered*, not *pretty*.

- Glow attaches to meaning: active elements, energy, the current selection.
  A resting border glows faintly or not at all.
- Layered bloom for hero elements: tight bright core + wide soft halo
  (see the title treatment on the reference home page).
- **The semantic-highlight rule:** one bright accent per component, and it
  must answer a question — what is lit (status lamp), what was found
  (contact), what is active (live cell). A glowing dot added for visual
  interest is the house style's most common failure mode. If it means
  nothing, use an edge glint or the shape's brightest stroke instead.

---

## 6. Iconography

- **Instruments, not primitives**: a radar has bearing ticks, range rings,
  and a phosphor sweep — not a circle with dots. Every icon earns 2–4
  elements: gradient-filled silhouette, bold glowing outline, dark internal
  detail lines, one semantic highlight.
- **Recognizable from silhouette alone** at 16px.
- **Reinterpret, don't illustrate**: heart → EKG waveform, skull →
  radiation trefoil, trophy → ranking readout. But when four
  reinterpretations fail, a literal silhouette with premium execution
  beats a clever one nobody can read.
- The shipped library (40 icons) is the vocabulary reference — new icons
  are drawn with the same pen helpers (see CLAUDE.md → Generating New
  Icons) and should sit indistinguishably in that grid.

---

## 7. Motion

Instruments move like instruments:

- **Slow and continuous** — radar sweeps, gauge needles easing, particle
  drift. Nothing bounces, springs, or overshoots.
- **State changes are crisp** (150–200ms) with a glow swell, not a scale pop.
- Ambient animation is quiet: twinkle, drift, and sweep at low amplitude.
  The screen should feel *on*, not busy.

---

## 8. Voice & Copy

UI text is transmission-terse:

- Labels: verbs or nouns, 1–3 words — `LAUNCH MISSION`, `LOADOUT`.
- Data readouts speak in system voice: `SYS NOMINAL`, `UPLINK STABLE`,
  `SECTOR 7`, `CR 48,220` — mono face, uppercase, `//` as a separator.
- No exclamation points, no friendly filler ("Welcome back!"), no emoji.
- Numbers get units and monospace: `14.2 LY`, `87%`, `v2.4.1`.

---

## 9. Quick Reference

```javascript
import {
  ThemeProvider,                          // palette + CSS + fonts
  TYPE_SCALE, applyType, canvasFont,      // typography kit
  drawIcon, drawFramedIcon,               // icon library
  drawPanel, drawBarGauge, drawRadialGauge, drawRadarDisplay,
  drawAmbientParticles, drawScanLines,
} from '@tomwesley/arcade-graphics-engine';

const provider = ThemeProvider.create('ELECTRIC_OCEAN');
provider.injectCSS();                     // fonts + CSS vars + classes
document.body.classList.add('arcade-theme');
```

CSS classes after `injectCSS()`: `.arcade-display/title/heading/label/body/
data/micro`, `.arcade-btn`, `.arcade-panel`, `.arcade-panel-title`,
`.arcade-input`, `.arcade-glow`, `.arcade-divider`,
`.arcade-success/warning/error`.

CSS variables: `--arcade-bg`, `--arcade-primary[-glow|-dim]`,
`--arcade-secondary[-glow|-dim]`, `--arcade-tertiary[-glow|-dim]`,
`--arcade-danger[-glow|-dim]`, `--arcade-font-display/body/mono`,
`--arcade-glow-radius`, `--arcade-glow-intensity`.
