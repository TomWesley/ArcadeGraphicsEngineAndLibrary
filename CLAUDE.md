# Arcade Graphics Engine

## What This Is
A sleek futuristic graphics engine for browser-based arcade games. Provides a unified visual identity — icons, menus, HUD components, asset conversion — so that every game using it looks like it belongs in the same universe.

**Style reference**: Think Halo HUD, Elite Dangerous cockpit, 2001: A Space Odyssey interfaces. Clean, geometric, adult, military-grade. NOT pixel art, NOT retro, NOT cute.

**BRANDING.md is the definitive brand reference** (identity, color roles,
typography kit, shape language, glow rules, motion, voice). This file is the
integration manual; when generating anything user-visible, follow BRANDING.md.
Living specimen page: `npm run test:brand`.

## Installation
Always pin to a release tag (see CHANGELOG.md for versions) — unpinned
installs float to whatever `main` is on the day of the install:
```bash
npm install github:TomWesley/ArcadeGraphicsEngineAndLibrary#v0.5.0
```
The package builds itself on install (`prepare` script). Import from
`@tomwesley/arcade-graphics-engine` (root) or the subpaths `/style`, `/engine`,
`/components`, `/pipeline`, `/integration`.

## Quickstart — reskinning a game
```javascript
import {
  ThemeProvider,                       // CSS injection + palette
  drawIcon, drawFramedIcon,            // built-in icon library
  drawPanel, drawBarGauge, drawRadialGauge, drawRadarDisplay,  // HUD
  drawAmbientParticles, drawScanLines, // effects
  renderMenu,                          // full menu renderer
} from '@tomwesley/arcade-graphics-engine';

// 1. Pick a palette (or ThemeProvider.custom(name, h1, h2, h3, h4) for your own hues)
const provider = ThemeProvider.create('ELECTRIC_OCEAN');

// 2. Inject CSS — adds CSS custom properties (--arcade-primary, --arcade-font-display, …),
//    loads the Google Fonts automatically, and defines ready-to-use classes:
//    .arcade-btn, .arcade-panel, .arcade-panel-title, .arcade-input,
//    .arcade-glow, .arcade-divider, .arcade-success/warning/error
provider.injectCSS();
document.body.classList.add('arcade-theme');  // opt <body> into themed bg/font

// 3. Draw on canvas with the theme
const theme = provider.theme;
drawIcon(ctx, 'target', 50, 50, 64, provider.palette.primary.core);
drawBarGauge(ctx, theme, { x: 10, y: 10, width: 200, height: 24, value: 0.7, label: 'HULL' });
```
See `tests/fake-game-home/index.html` for a complete home page built this way,
and `tests/components-lab/index.html` (npm run test:components) for the
interactive component reference.

### Universal game components
```javascript
// Modal dialogs (HTML overlay; Enter confirms, Escape cancels, focus managed)
const ok = await showDialog({ title: 'End Turn', body: '...', confirmLabel: 'END TURN', danger: false });
await showAlert('Research complete: Robotics');

// Toasts — stack top-right, auto-dismiss, click to dismiss
showToast('Research complete', { kind: 'success', title: 'Research' });  // info|success|warning|error
const dismiss = showToast('Enemy detected', { kind: 'warning', duration: 0 });  // sticky

// Loading — boot overlay + in-game canvas spinner
const loader = showLoading({ label: 'Loading sector', progress: true });
loader.setProgress(0.5); loader.setLabel('Compiling'); loader.done();
drawLoadingArc(ctx, theme, { cx, cy, radius: 20, t: elapsedSeconds });

// Canvas buttons — for pure-canvas UIs; game owns input, engine draws
const state = isPointInButton(btn, mx, my) ? (down ? 'active' : 'hover') : 'idle';
drawCanvasButton(ctx, theme, { ...btn, label: 'Launch Mission', state, accent: true });

// Motion — the brand's motion rules as code (no bounce easings exist)
animate({ from: v, to: target, duration: MOTION.state, ease: EASE.outCubic, onUpdate: ... });
value = approach(value, target, dtMs, 90);  // frame-rate-independent smoothing
```

## Fonts
`ThemeProvider.injectCSS()` loads these automatically. For pages not using the
ThemeProvider, include:
```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```
- **Orbitron** — titles, headings, emphasis (bold, geometric, futuristic)
- **Rajdhani** — body text, labels, buttons (clean, readable)
- **Share Tech Mono** — data readouts, stats, version info (monospace, technical)

Font constants are exported from the engine: `FONT_DISPLAY`, `FONT_BODY`, `FONT_MONO`.

### Typography kit
Seven fixed type roles (see BRANDING.md §3 for the full spec table):
`display, title, heading, label, body, data, micro`. Use them via:
- **CSS**: classes `.arcade-display` … `.arcade-micro` (after `injectCSS()`)
- **Canvas**: `applyType(ctx, 'label')` sets font + letter-spacing;
  `canvasFont('data', 16)` returns a font string; `typeCase('label', text)`
  applies the role's casing. `TYPE_SCALE` exposes the raw spec.
Only `body` is sentence case — everything else renders uppercase.

## Visual Style Rules

### Core Principles
- **Dark backgrounds** with subtle depth (radial gradients, not flat black)
- **Thin line UI** with selective glow (1-2px strokes, canvas shadowBlur for bloom)
- **Gradient fills** on shapes (linear or radial, never flat monotone)
- **Translucent panels** with clipped corners
- **Color is an accent**, not a flood — most of the screen is dark
- **High contrast** between UI elements and background
- **No pure black** for outlines — use very dark versions of the theme color
- **Clean geometry** — circles, hexagons, angular shapes. No organic noise.
- **Everything feels like a spacecraft instrument panel**
- **Instruments, not primitives** — a radar isn't a circle with dots: it has
  bearing ticks, range rings, a phosphor sweep that reveals contacts, degree
  labels. A gauge isn't a filled rect: it has segments, scale ticks, end-cap
  brackets, a sheen. Detail and texture are what separate an instrument from
  a wireframe — every component earns 2-3 layers of supporting detail.

### Color System
Each game picks its own two-color palette:
- **Primary** — main UI color (buttons, borders, text, icons)
- **Secondary** — accent color (highlights, status indicators, glowing elements)

Colors are defined as RGB arrays and passed through helper functions. The engine never hardcodes a specific color — it uses `pc(opacity)` and `sc(opacity)` functions that reference the game's palette.

### What to AVOID
- Stars, hearts, crowns with gems — too childish/gamey
- Pixel art, retro aesthetics, chunky blocks
- Bright backgrounds or large colored areas
- Decorative noise, organic textures
- Thick outlines (use thin strokes with glow instead)
- Flat monotone fills (use gradients)

---

## Icons

### Built-in icon library (use these first)
The engine ships the approved icon set — import and draw, no custom code needed:
```javascript
import { drawIcon, drawFramedIcon, getIconNames } from '@tomwesley/arcade-graphics-engine';
drawIcon(ctx, 'target', cx, cy, size, colorRGBA);       // icon only
drawFramedIcon(ctx, 'energy', x, y, size, colorRGBA);   // icon in dark clipped panel
```
Available names: `play, pause, stop, arrow-up, arrow-down, arrow-left, arrow-right,
forward, back, fullscreen, info, refresh, quest, search, energy, settings, error,
download, upload, plus, minus, diamond, star, craft, inventory, heart, skull,
target, warning, comms, timer, map, scan` plus HUD-styled game icons `leaderboard`
(ranking readout), `shield` (defense matrix), `sword` (energy blade), `home`
(base + antenna), `potion` (faceted flask), `coin`, `crown` (command wings), and
aliases `gear`→settings, `lightning`→energy, `trophy`→leaderboard.
Unknown names log a console warning. `heart` renders as an EKG vitals line,
`skull` as a radiation trefoil, `star` as a constellation — spacecraft
instrument reinterpretations, never literal cute shapes.

## Generating New Icons

When a game needs an icon that is NOT in the built-in library, generate it with
the recipe below. NOTE: these helpers (`drawFrame`, `bold`, `solid`, `det`, `hi`,
`thin`, `G`, `N`, `u`, `pc`, `sc`) are **inline recipes to paste into your game's
icon code** — they are intentionally not exported by the engine. Follow these
rules precisely.

### Icon Canvas Setup
```javascript
const SZ = 100; // icon canvas size
function u(n) { return n * SZ / 100; } // unit function for resolution-independence

// Every icon sits in a dark framed panel:
function drawFrame(ctx) {
  const m = 3, s = SZ - m*2, cs = 8;
  ctx.fillStyle = 'rgba(12,11,20,0.95)';
  ctx.beginPath();
  ctx.moveTo(m+cs, m); ctx.lineTo(m+s-cs, m); ctx.lineTo(m+s, m+cs);
  ctx.lineTo(m+s, m+s-cs); ctx.lineTo(m+s-cs, m+s); ctx.lineTo(m+cs, m+s);
  ctx.lineTo(m, m+s-cs); ctx.lineTo(m, m+cs); ctx.closePath(); ctx.fill();
  // Border
  ctx.strokeStyle = pc(0.25); ctx.lineWidth = 1; ctx.stroke();
  // Corner accent dots
  ctx.fillStyle = pc(0.5);
  [[m+1,m+1],[m+s-1,m+1],[m+1,m+s-1],[m+s-1,m+s-1]].forEach(([x,y]) => {
    ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2); ctx.fill();
  });
}
```

### Drawing Helpers
```javascript
// Bold stroke with glow (primary shape outlines)
function bold(ctx, opacity=0.85, width=2) {
  ctx.shadowColor = `rgba(${P[0]},${P[1]},${P[2]},0.35)`;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = pc(opacity);
  ctx.lineWidth = u(width);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

// Solid fill for silhouette shapes
function solid(ctx, opacity=0.7) { ctx.fillStyle = pc(opacity); }

// Fill with lower opacity
function fill(ctx, opacity=0.5) { ctx.fillStyle = pc(opacity); }

// Dark detail lines drawn ON TOP of solid fills
function det(ctx, opacity=0.35, width=1) {
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(15,12,22,${opacity})`;
  ctx.lineWidth = u(width);
}

// Bright highlight lines
function hi(ctx, opacity=0.95, width=0.7) {
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.strokeStyle = pc(opacity);
  ctx.lineWidth = u(width);
}

// Thin accent line
function thin(ctx, opacity=0.3, width=0.8) {
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  ctx.strokeStyle = pc(opacity);
  ctx.lineWidth = u(width);
}

// Glow effect
function G(ctx, color, blur, opacity=0.5) {
  ctx.shadowColor = `rgba(${color[0]},${color[1]},${color[2]},${opacity})`;
  ctx.shadowBlur = blur;
}

// Clear glow
function N(ctx) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; }
```

### Icon Design Rules

1. **2-4 visual elements** per icon. Not 1 (too simple), not 6+ (too busy).
2. **Use gradient fills**, not flat fills. `createLinearGradient` or `createRadialGradient`.
3. **Bold outlines** at 0.7-0.9 opacity, 1.2-2.5u width, with `shadowBlur` glow.
4. **Internal detail lines** using `det()` — dark lines ON TOP of fills showing structure.
5. **One highlight accent** per icon — but it must be SEMANTIC, never decorative.
   A glowing dot is only correct when it *means* something: a status lamp, a
   radar contact, a beacon, an active cell. If the dot answers no question
   ("what is lit? what was found? what is active?"), use an edge glint, a
   bright facet line, or the brightest stroke of the shape instead. A dot
   pasted on for visual interest is a formula tell — avoid it.
6. **Think spacecraft instrument**, not illustration. A trophy is rank bars, not a cup. A heart is an EKG monitor, not a valentine. A skull is a radiation trefoil, not a cartoon skull.
7. **Solid filled shapes** for the primary form, not just stroked outlines.
8. **The icon should be recognizable from silhouette alone.**

### Example: Generating a "Shield" Icon
```javascript
I('shield', (x, cx, cy) => {
  // 1. Primary shape — solid filled angular silhouette with gradient
  const sg = x.createLinearGradient(cx-u(18), cy-u(22), cx+u(14), cy+u(22));
  sg.addColorStop(0, pc(0.4));
  sg.addColorStop(0.5, pc(0.12));
  sg.addColorStop(1, pc(0.35));
  x.fillStyle = sg;
  x.beginPath();
  // Angular shield shape (not rounded — this is military)
  x.moveTo(cx, cy-u(22));
  x.lineTo(cx+u(18), cy-u(10));
  x.lineTo(cx+u(16), cy+u(6));
  x.lineTo(cx, cy+u(22));
  x.lineTo(cx-u(16), cy+u(6));
  x.lineTo(cx-u(18), cy-u(10));
  x.closePath();
  x.fill();

  // 2. Bold outline with glow
  bold(x, 0.8, 2);
  x.stroke();
  N(x);

  // 3. Internal structure (sector dividers)
  thin(x, 0.35, 1);
  x.beginPath(); x.moveTo(cx, cy-u(22)); x.lineTo(cx, cy+u(22)); x.stroke();
  x.beginPath(); x.moveTo(cx-u(18), cy-u(2)); x.lineTo(cx+u(18), cy-u(2)); x.stroke();

  // 4. Highlight accent (center status dot with glow)
  G(x, P, 5, 0.5);
  fill(x, 0.75);
  x.beginPath(); x.arc(cx, cy-u(2), u(3), 0, Math.PI*2); x.fill();
  N(x);
});
```

### Approved Icon Concepts (Reference)
These have been approved and establish the visual vocabulary:

| Icon | Concept | Key Elements |
|------|---------|-------------|
| play | Gradient-filled triangle with edge highlight | Triangle + inner echo line |
| pause | Two gradient bars with vertical highlight lines | Paired bars |
| stop | Gradient square with corner highlight | Single shape |
| forward/back | Double solid filled chevrons | Thick arrow shapes |
| arrows | Single solid filled chevrons | Directional indicators |
| heart | EKG monitor waveform (clinical vitals line) | Jagged pulse line, no filled heart shape |
| star | Constellation of 5 connected dots in pentagram | Nodes + connection lines |
| skull | Radiation trefoil symbol | Three sectors + rings |
| target | TIE fighter targeting brackets | Angular V-brackets + diamond reticle |
| energy | Progress arc with lightning bolt | Thick arc + end dot + bolt |
| settings | Interconnected atom/node network | Central node + orbital nodes + ring |
| diamond | Concentric diamonds with center dot | Nested angular shapes |
| craft | Hexagonal schematic with component nodes | Framework + center assembly point |
| inventory | 3x3 cargo manifest grid with status dots | Data grid + active cell |
| info | Circle with dot and line (i) | Classic but bold |
| warning | Triangle with exclamation | Angular, not rounded |
| quest | Circle with bold exclamation | Clean and punchy |
| plus/minus | Bold cross/line in circle frame | Geometric |

---

## Generating Menus

Menus use HTML/CSS with the engine's fonts and style:
- Dark background with starfield (animated canvas behind)
- Thin-line borders on buttons with hover glow
- Corner bracket decorations
- Gradient text for titles (primary → secondary)
- Scan-line overlay (subtle CSS repeating-gradient)
- Ambient floating particles in background

See `tests/main-menu/index.html` for the complete reference implementation.

---

## Asset Conversion Pipeline

For complex assets (characters, objects, environments):

1. **Generate** source image (AI or artist)
2. **Convert** through the pipeline:
   - Background isolation (auto-detected from edge sampling)
   - Contrast enhancement
   - Warm/cool color grading
   - Atmospheric edge darkening
   - Edge-aware rim lighting
   - Selective bloom on bright areas
   - Depth vignette
3. **Validate** against style guide (automated checks for contrast, color variety, brightness distribution)
4. If validation fails → adjust parameters → reconvert

See `tests/convert/index.html` for the conversion pipeline and `src/style/validator.ts` for the automated checks.

---

## Architecture
- `src/style/` — Types, colors, themes, **fonts**, **validator**; `spec.ts` holds the
  legacy sprite-conversion constants (pixel pipeline only — NOT the UI style contract)
- `src/engine/` — Renderer, analysis, sprites, particles; `pixelart.ts` is the legacy
  sprite conversion pipeline (kept for asset conversion, not for UI)
- `src/components/` — Icons (built-in library), menus, panels, gauges/charts/radar, effects
- `src/pipeline/` — Image loading, sprite sheets
- `src/integration/` — ThemeProvider (CSS injection, fonts, palette)
- `src/eval/` — Vision evaluator (internal dev tooling; needs ANTHROPIC_API_KEY in .env,
  scores assets 0-100 against the style guide via `npm run eval <file.svg|.png>`)

## Test Pages
- `npm run test:homepage` — Fake game home page (HELIOS PROTOCOL) — full integration reference
- `npm run test:mainmenu` — Full game main menu (VOID SECTOR)
- `npm run test:iconlib` — icon review/approve workflow (design source for the built-in set)
- `npm run test:convert` — Asset conversion pipeline
- `npm run test:space` — Animated space scene
- `npm run test:hud` — HUD dashboard with charts and gauges
