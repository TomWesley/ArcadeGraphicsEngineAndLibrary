# Arcade Graphics Engine

## What This Is
A sleek futuristic graphics engine for browser-based arcade games. Provides a unified visual identity — icons, menus, HUD components, asset conversion — so that every game using it looks like it belongs in the same universe.

**Style reference**: Think Halo HUD, Elite Dangerous cockpit, 2001: A Space Odyssey interfaces. Clean, geometric, adult, military-grade. NOT pixel art, NOT retro, NOT cute.

## Installation
```bash
npm install github:TomWesley/ArcadeGraphicsEngineAndLibrary
```

## Fonts
```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
```
- **Orbitron** — titles, headings, emphasis (bold, geometric, futuristic)
- **Rajdhani** — body text, labels, buttons (clean, readable)
- **Share Tech Mono** — data readouts, stats, version info (monospace, technical)

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

## Generating Icons

When a game needs a new icon, follow these rules precisely.

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
5. **One highlight accent** per icon — a bright dot, edge, or line that draws the eye.
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
- `src/style/` — Types, colors, themes, spec, **validator**
- `src/engine/` — Renderer, analysis, sprites, pixel art pipeline, particles
- `src/components/` — Icons, menus, panels, gauges, charts, radar, effects
- `src/pipeline/` — Image loading, sprite sheets
- `src/integration/` — ThemeProvider, CSS injection

## Test Pages
- `npm run test:mainmenu` — Full game main menu (VOID SECTOR)
- `npm run test:iconlib` — 50-icon library with review/approve workflow
- `npm run test:convert` — Asset conversion pipeline
- `npm run test:space` — Animated space scene
- `npm run test:style-match` — Reference image style comparison
- `npm run test:hud` — HUD dashboard with charts and gauges
