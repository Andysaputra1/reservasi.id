import { useEffect, useRef } from 'react';
const dialogStack: HTMLElement[] = [];
let unlockedOverflow = '';

/** Keep keyboard focus in the active dialog and restore it to its trigger. */
export default function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    if (!dialogStack.length) unlockedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = ref.current;
    if (dialog) dialogStack.push(dialog);
    dialog?.focus();
    function handleKey(event: KeyboardEvent) {
      if (dialogStack.at(-1) !== dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el => el.getClientRects().length > 0 && !el.matches(':disabled') && el.tabIndex >= 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function keepFocus(event: FocusEvent) {
      if (dialogStack.at(-1) !== dialog) return;
      if (dialog && !dialog.contains(event.target as Node)) dialog.focus();
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', keepFocus);
    return () => {
      const index = dialog ? dialogStack.indexOf(dialog) : -1;
      if (index !== -1) dialogStack.splice(index, 1);
      if (!dialogStack.length) document.body.style.overflow = unlockedOverflow;
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('focusin', keepFocus);
      if (trigger?.isConnected && (!dialogStack.length || dialogStack.at(-1)?.contains(trigger))) trigger.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
