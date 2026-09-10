import { useEffect, useRef } from 'react';

/** Keep keyboard focus in the active dialog and restore it to its trigger. */
export default function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = ref.current;
    dialog?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,[tabindex="0"]')].filter(el => el.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    function keepFocus(event: FocusEvent) {
      if (dialog && !dialog.contains(event.target as Node)) dialog.focus();
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('focusin', keepFocus);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('focusin', keepFocus);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);
  return ref;
}
