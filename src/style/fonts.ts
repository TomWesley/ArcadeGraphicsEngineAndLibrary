/**
 * FONT SYSTEM — single source of truth for typography.
 *
 * The engine's visual identity uses three Google Fonts. Consuming games
 * must include this link tag in their HTML (the engine cannot load fonts
 * from canvas code):
 *
 *   <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
 *
 * Roles:
 * - Orbitron        — titles, headings, emphasis (bold, geometric, futuristic)
 * - Rajdhani        — body text, labels, buttons (clean, readable)
 * - Share Tech Mono — data readouts, stats, version info (monospace, technical)
 */

/** Display font for titles and headings. */
export const FONT_DISPLAY = '"Orbitron", "Rajdhani", sans-serif';

/** Body font for labels, buttons, and general UI text. */
export const FONT_BODY = '"Rajdhani", "Segoe UI", sans-serif';

/** Monospace font for data readouts, stats, and technical text. */
export const FONT_MONO = '"Share Tech Mono", "Courier New", monospace';

/** Google Fonts stylesheet URL that loads all three families. */
export const FONT_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap';

/**
 * Inject the Google Fonts stylesheet into the document head.
 * Call once at startup (ThemeProvider.injectCSS does this automatically).
 * Safe to call multiple times — deduplicates by id.
 */
export function injectFonts(doc: Document = document): void {
  const ID = 'arcade-engine-fonts';
  if (doc.getElementById(ID)) return;
  const link = doc.createElement('link');
  link.id = ID;
  link.rel = 'stylesheet';
  link.href = FONT_STYLESHEET_URL;
  doc.head.appendChild(link);
}
