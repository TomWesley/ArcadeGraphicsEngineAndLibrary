/**
 * Overlay components (dialogs, toasts, loading) are styled entirely by the
 * CSS that ThemeProvider.injectCSS() installs. If a game calls an overlay
 * before injecting, everything still works — it just renders as unstyled
 * browser-default markup, which looks like a bug. Warn once so the fix is
 * obvious in the console instead of a styling mystery.
 */

let warned = false;

export function warnIfThemeCSSMissing(component: string): void {
  if (warned || typeof document === 'undefined') return;
  if (document.getElementById('arcade-engine-theme')) return;
  warned = true;
  console.warn(
    `[arcade-gfx] ${component} was called before ThemeProvider.injectCSS() — ` +
    `overlays will render unstyled. Call ThemeProvider.injectCSS() during game setup.`,
  );
}
