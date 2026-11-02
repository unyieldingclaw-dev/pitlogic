import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useDialogFocus } from '../useDialogFocus';

function Dialog() {
  const ref = useDialogFocus(true, vi.fn());
  return <><button>Outside</button><div ref={ref} tabIndex={-1} role="dialog"><button>Close</button><fieldset disabled><input aria-label="Disabled by fieldset" /></fieldset></div></>;
}

describe('dialog keyboard recovery', () => {
  it('traps Tab on the remaining enabled control while a fieldset is disabled', () => {
    render(<Dialog />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });
});
