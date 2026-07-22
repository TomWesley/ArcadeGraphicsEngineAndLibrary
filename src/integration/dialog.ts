/**
 * Dialogs — modal confirm/alert overlays styled by the injected theme CSS.
 * Requires ThemeProvider.injectCSS() to have run (the .arcade-dialog-*
 * classes live there).
 *
 *   const ok = await showDialog({ title: 'End turn', body: 'Two units still have moves.', danger: false });
 *   await showAlert('Research complete: Robotics');
 */

import { warnIfThemeCSSMissing } from './css-check';

export interface DialogOptions {
  title?: string;
  body?: string;
  /** Confirm button label (default CONFIRM) */
  confirmLabel?: string;
  /** Cancel button label (default CANCEL). Pass null for single-button alerts. */
  cancelLabel?: string | null;
  /** Style the confirm action in the palette danger color */
  danger?: boolean;
}

/**
 * Show a modal dialog. Resolves true on confirm, false on cancel /
 * Escape / backdrop click. Enter confirms; focus is moved into the
 * dialog and restored afterwards.
 */
export function showDialog(options: DialogOptions = {}): Promise<boolean> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('showDialog requires a browser environment'));
  }
  warnIfThemeCSSMissing('showDialog');

  return new Promise<boolean>((resolve) => {
    const previousFocus = document.activeElement as HTMLElement | null;

    const backdrop = document.createElement('div');
    backdrop.className = 'arcade-dialog-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'arcade-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');

    if (options.title) {
      const title = document.createElement('div');
      title.className = 'arcade-dialog-title';
      title.textContent = options.title;
      dialog.appendChild(title);
    }
    if (options.body) {
      const body = document.createElement('div');
      body.className = 'arcade-dialog-body';
      body.textContent = options.body;
      dialog.appendChild(body);
    }

    const actions = document.createElement('div');
    actions.className = 'arcade-dialog-actions';

    const close = (result: boolean): void => {
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      previousFocus?.focus?.();
      resolve(result);
    };

    if (options.cancelLabel !== null) {
      const cancel = document.createElement('button');
      cancel.className = 'arcade-btn';
      cancel.textContent = options.cancelLabel ?? 'CANCEL';
      cancel.addEventListener('click', () => close(false));
      actions.appendChild(cancel);
    }

    const confirm = document.createElement('button');
    confirm.className = 'arcade-btn' + (options.danger ? ' arcade-btn-danger' : '');
    confirm.textContent = options.confirmLabel ?? 'CONFIRM';
    confirm.addEventListener('click', () => close(true));
    actions.appendChild(confirm);

    dialog.appendChild(actions);
    backdrop.appendChild(dialog);

    backdrop.addEventListener('mousedown', (e) => {
      if (e.target === backdrop) close(false);
    });

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.stopPropagation(); close(false); }
      if (e.key === 'Enter') { e.stopPropagation(); close(true); }
    };
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(backdrop);
    confirm.focus();
  });
}

/** Single-button informational dialog. */
export async function showAlert(body: string, title?: string): Promise<void> {
  await showDialog({ title, body, confirmLabel: 'OK', cancelLabel: null });
}
