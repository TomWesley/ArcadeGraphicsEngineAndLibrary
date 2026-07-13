/**
 * Toasts — transient notifications ("Research complete", "Achievement
 * unlocked"). Stack top-right, slide in, auto-dismiss. Styled by the
 * injected theme CSS (.arcade-toast-*).
 *
 *   showToast('Research complete: Robotics', { kind: 'success' });
 *   const dismiss = showToast('Enemy fleet detected', { kind: 'warning', duration: 0 }); // sticky
 */

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  kind?: ToastKind;
  /** Auto-dismiss after ms. 0 = sticky until dismissed. Default 3500. */
  duration?: number;
  /** Optional bold lead-in before the message */
  title?: string;
}

const MAX_STACK = 5;

/**
 * Show a toast. Returns a dismiss function (safe to call more than once).
 * No-op outside a browser.
 */
export function showToast(message: string, options: ToastOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {};

  const kind = options.kind ?? 'info';
  const duration = options.duration ?? 3500;

  let container = document.getElementById('arcade-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'arcade-toast-container';
    document.body.appendChild(container);
  }

  // Bound the stack — retire the oldest
  while (container.children.length >= MAX_STACK) {
    container.firstElementChild?.remove();
  }

  const toast = document.createElement('div');
  toast.className = `arcade-toast arcade-toast--${kind}`;
  toast.setAttribute('role', kind === 'error' || kind === 'warning' ? 'alert' : 'status');

  if (options.title) {
    const title = document.createElement('div');
    title.className = 'arcade-toast-title';
    title.textContent = options.title;
    toast.appendChild(title);
  }
  const body = document.createElement('div');
  body.className = 'arcade-toast-body';
  body.textContent = message;
  toast.appendChild(body);

  container.appendChild(toast);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const dismiss = (): void => {
    if (timer) clearTimeout(timer);
    if (!toast.isConnected) return;
    toast.classList.add('arcade-toast--leaving');
    // Matches the CSS leave transition; falls back to instant removal
    setTimeout(() => toast.remove(), 240);
  };

  toast.addEventListener('click', dismiss);
  if (duration > 0) timer = setTimeout(dismiss, duration);

  return dismiss;
}
