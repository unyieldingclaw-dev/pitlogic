import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DevicesPanel from '../DevicesPanel';

const props = () => ({ mqttStatus: 'connected', onMqttConnect: vi.fn(), onMqttDisconnect: vi.fn(), csvStatus: 'idle', liveProbes: new Map(), deviceState: new Map(), gatewayHealth: [], onHasConfigBaseline: () => false, onUpdateDeviceConfig: vi.fn(), onOpenBleWizard: vi.fn() });
describe('Devices guided state', () => {
  beforeEach(() => localStorage.clear());
  it('keeps setup and advanced tools secondary and discloses the recording boundary', () => {
    render(<DevicesPanel {...props()} />);
    expect(screen.getByText('Advanced connection tools').closest('details').open).toBe(false);
    expect(screen.getByText('Set up a new gateway').closest('details').open).toBe(false);
    expect(screen.getByText(/Device readings — not recorded in a cook/)).toBeTruthy();
    expect(screen.getByText('Connected — waiting for fresh device readings.')).toBeTruthy();
    expect(screen.getByText('Connection settings', { exact: true }).closest('details').open).toBe(false);
    expect(screen.getByLabelText('Broker URL').matches(':disabled')).toBe(true);
  });
  it('reopens editable connection settings after an error', () => {
    const base = props();
    const { rerender } = render(<DevicesPanel {...base} />);
    rerender(<DevicesPanel {...base} mqttStatus="error" mqttError="Connection failed" />);
    expect(screen.getByText('Connection settings', { exact: true }).closest('details').open).toBe(true);
    expect(screen.getByLabelText('Broker URL').matches(':disabled')).toBe(false);
  });
  it('does not treat CSV replay or stale samples as verified fresh device readings', () => {
    const base = props();
    const sample = { probeId: 'fixture-ch1', label: 'Fixture', status: 'active', lastReading: { source: 'replay', timestamp: { capturedAt: Date.now() }, temp: { valueF: 182 } } };
    const { rerender } = render(<DevicesPanel {...base} liveProbes={new Map([[sample.probeId, sample]])} />);
    expect(screen.getByText('Connected — waiting for fresh device readings.')).toBeTruthy();
    const live = { ...sample, lastReading: { ...sample.lastReading, source: 'live' } };
    rerender(<DevicesPanel {...base} liveProbes={new Map([[live.probeId, live]])} />);
    expect(screen.getByText('Fresh device readings received.')).toBeTruthy();
    rerender(<DevicesPanel {...base} liveProbes={new Map([[live.probeId, { ...live, status: 'stale' }]])} />);
    expect(screen.getByText('Connected — waiting for fresh device readings.')).toBeTruthy();
    expect(base.onUpdateDeviceConfig).not.toHaveBeenCalled();
    expect(localStorage.getItem('pitlogic-v5')).toBeNull();
  });
});
