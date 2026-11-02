import { useEffect, useRef } from 'react';

export function useDialogFocus(open, onClose) {
  const ref = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open || !ref.current) return;
    const dialog = ref.current;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () => [...dialog.querySelectorAll('button, input, select, textarea, a[href], summary, [tabindex]')].filter(el => {
      const closed = el.closest('details:not([open])');
      return !el.matches(':disabled') && el.tabIndex >= 0 && getComputedStyle(el).display !== 'none' && !el.closest('[hidden]') && (!closed || closed.querySelector('summary')?.contains(el));
    });
    (focusable()[0] ?? dialog).focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current?.(); }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0] ?? dialog, last = items.at(-1) ?? dialog;
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return ref;
}
