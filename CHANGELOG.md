# Changelog

All notable changes to the Arcade Graphics Engine.
Consumers should pin installs to a tag: `github:TomWesley/ArcadeGraphicsEngineAndLibrary#v0.5.0`.

## v0.5.0 — 2026-07-22

Production-hardening release for user-facing deployment.

### Added
- `ENGINE_VERSION` export (kept in sync with package.json by a unit test) —
  log it in game diagnostics so bug reports pin to an exact engine release.
- Console warning (once) when showDialog/showToast/showLoading run before
  `ThemeProvider.injectCSS()` — unstyled overlays now explain themselves.
- README browser-support matrix.
- `npm run release:verify` — typecheck + build + unit + integration in one gate.
- `"sideEffects": false` so bundlers can tree-shake unused engine modules.

### Fixed
- Radar sweep crashed Safari < 16.2 (`createConicGradient` unsupported) —
  now feature-detected with a stepped-wedge fallback.
- `NaN`/`Infinity` gauge values slipped through the 0–1 clamps and rendered
  garbage (including a "NaN%" readout) — inputs are now sanitized to 0.

## v0.4.0 — 2026-07-12

### Added — Tier-3 universal components
- **Dialogs**: showDialog / showAlert — modal overlays with keyboard
  handling (Enter/Escape), focus management, backdrop dismiss, and a
  danger variant. Styled by injected theme CSS.
- **Toasts**: showToast — top-right stack (cap 5), info/success/warning/
  error kinds, auto- or click-dismiss, sticky option, aria roles.
- **Loading**: showLoading overlay (spinner + determinate progress bar,
  fade-out) and drawLoadingArc canvas spinner primitive.
- **Canvas buttons**: drawCanvasButton (idle/hover/active/disabled,
  accent treatment, typography-kit label) + isPointInButton hit test —
  the themed control for pure-canvas UIs.
- **Motion module**: EASE curves (deliberately no bounce/overshoot),
  MOTION duration constants, animate(), lerp/clamp01, and approach()
  frame-rate-independent smoothing. BRANDING.md §7 as code.
- Components lab page: npm run test:components.
- All overlays SSR-safe; reduced-motion honored (spinner slows, slides
  and fades disabled).

## v0.3.0 — 2026-07-12

### Added
- **Brand system**: BRANDING.md (definitive brand guide) + living specimen
  page (`npm run test:brand`).
- **Typography kit**: seven fixed type roles (`display`…`micro`) with CSS
  classes, canvas helpers (`applyType`, `canvasFont`, `typeCase`), and
  `TYPE_SCALE` spec export.
- **Icons**: library finalized at 40 icons + 3 aliases after five review
  rounds (comms, timer, map, scan added; sword, potion, star, inventory,
  settings, search, refresh, crown, leaderboard, diamond redesigned;
  semantic-highlight rule applied across the set).
- **Instrument detail**: radar gained sweep-revealed contacts with phosphor
  decay, bearing ticks, and degree labels; bar gauges gained segments,
  sheen, and scale ticks; radial gauges gained numerals and danger arcs.
- **Hardening**: SSR-safe CSS/font injection; `lowPower` theme option
  (single-pass glow); `prefers-reduced-motion` support; keyboard
  focus-visible states; `setupHiDPICanvas` helper.
- README, LICENSE (MIT), CHANGELOG, CI workflow.

### Fixed
- Gauge label/value text contrast (was same-color-on-same-color).
- Radial gauge needle visibility and micro-text legibility.
- `hslToRgba` hue wrap and saturation/lightness clamping.
- Particle emitter spawn-burst after pool saturation.
- Ambient particles drifting permanently off-screen.
- `getPixel` out-of-bounds reads returning NaN alpha.
- `CanvasAdapter` width/height staleness after canvas resize.
- Division-by-zero guards in shade generators.

## v0.2.0 — 2026-07-02

### Fixed (breaking install bugs)
- **The npm install path**: exports map referenced `.mjs` files that were
  never emitted; `require` targets were ESM. Corrected to `.js` (ESM) /
  `.cjs` (CJS) with `types` conditions on every subpath.
- Added `prepare` script so git installs build `dist/` automatically.
- Moved puppeteer/@anthropic-ai/sdk/dotenv to devDependencies (consumers
  no longer download Chromium).

### Changed
- All components switched from "Press Start 2P" to the
  Orbitron/Rajdhani/Share Tech Mono stack; `src/style/fonts.ts` added.
- Icon library rebuilt in the approved sleek-futuristic vocabulary.
- Vision evaluator moved to a 0–100 scale.

## v0.1.0 — 2026-06

Initial engine: style system (palettes/themes/validator), pixel-art sprite
pipeline, components (menus, panels, gauges, radar), ThemeProvider CSS
injection, icon set, test pages, vision evaluator.
