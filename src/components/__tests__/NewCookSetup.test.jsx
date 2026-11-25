import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NewCookSetup from '../NewCookSetup.jsx';

describe('essential manual cook setup', () => {
  it('puts food and targets before optional details, without requiring devices', () => {
    const onStart = vi.fn();
    render(<NewCookSetup form={{ name: '', meat: 'Beef', cut: 'Brisket', smokerTarget: 225, probes: [{ name: 'Probe 1', target: 203 }], mop: { enabled: false }, smokerLowAlarm: { enabled: false }, weight: '', pellet: '', equipment: '' }} onChange={vi.fn()} onStart={onStart} onOpenDevices={vi.fn()} prefs={{}} setCutPref={vi.fn()} onGoGuide={vi.fn()} />);
    expect(screen.getByLabelText('Smoker target °F')).toBeTruthy();
    expect(screen.getByLabelText('Food probe 1 name')).toBeTruthy();
    const optional = screen.getByText('Optional cook details').closest('details');
    expect(optional.open).toBe(false);
    expect(optional.contains(screen.getByLabelText('Cook name (optional)'))).toBe(true);
    const start = screen.getByRole('button', { name: 'Start Cook', exact: true });
    expect(start.disabled).toBe(false);
    fireEvent.click(start);
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
