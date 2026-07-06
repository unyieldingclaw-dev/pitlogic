import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsSheet from '../SettingsSheet';

const baseProps = {
  open: true,
  onClose: vi.fn(),
  cookState: { cooks: [] },
  recipes: [],
  onImportCooks: vi.fn(),
  onImportRecipes: vi.fn(),
  prefs: { theme: 'dark', cutPrefs: {} },
  resetCutPref: vi.fn(),
  setTheme: vi.fn(),
  mqttStatus: 'connected',
  mqttError: null,
  onMqttConnect: vi.fn(),
  onMqttDisconnect: vi.fn(),
  gatewayHealth: [],
};

describe('SettingsSheet — Device Health panel', () => {
  it('shows a gateway health entry with wifi, battery, firmware', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[
      { gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', unitMismatch: false, probes: [] },
    ]} />);
    expect(screen.getByText(/88%/)).toBeTruthy();
    expect(screen.getByText(/v2.45/)).toBeTruthy();
  });

  it('shows a unit mismatch warning when the gateway reports Celsius', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[
      { gatewayId: 'gw1', wifiStrength: 88, battery: null, firmware: null, units: 'C', unitMismatch: true, probes: [] },
    ]} />);
    expect(screen.getByText(/reporting Celsius/i)).toBeTruthy();
  });

  it('lists per-probe battery percentages', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[
      { gatewayId: 'gw1', wifiStrength: null, battery: null, firmware: null, units: 'F', unitMismatch: false,
        probes: [{ probeId: 'gw1-ch1', battery: 15 }] },
    ]} />);
    expect(screen.getByText(/gw1-ch1/)).toBeTruthy();
    expect(screen.getByText(/15%/)).toBeTruthy();
  });

  it('renders nothing device-health-related when gatewayHealth is empty', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[]} />);
    expect(screen.queryByText(/Device Health/i)).toBeNull();
  });
});
