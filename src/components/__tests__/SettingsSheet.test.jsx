import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SettingsSheet from '../SettingsSheet.jsx';

const STORAGE_KEY = 'pitlogic-mqtt-v1';

function baseProps(overrides = {}) {
  return {
    open: true,
    onClose: vi.fn(),
    cookState: { cooks: [], activeCooks: [] },
    recipes: [],
    onImportCooks: vi.fn(),
    onImportRecipes: vi.fn(),
    prefs: { theme: 'dark', cutPrefs: {} },
    resetCutPref: vi.fn(),
    setTheme: vi.fn(),
    mqttStatus: 'disconnected',
    mqttError: null,
    onMqttConnect: vi.fn(),
    onMqttDisconnect: vi.fn(),
    csvStatus: 'idle',
    csvError: null,
    onCsvReplay: vi.fn(),
    onCsvReset: vi.fn(),
    liveProbes: new Map(),
    deviceState: new Map(),
    gatewayHealth: [],
    onHasConfigBaseline: () => false,
    onUpdateDeviceConfig: vi.fn(),
    ...overrides,
  };
}

function fillMqttFields({ brokerUrl = 'wss://cluster.hivemq.cloud:8884/mqtt', username = 'pitlogic', password = 'secret' } = {}) {
  fireEvent.change(screen.getByLabelText('Broker URL'), { target: { value: brokerUrl } });
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
}

describe('SettingsSheet — Live Device config copy/paste', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('copies the current MQTT config to the clipboard as JSON and flashes "Copied ✓"', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<SettingsSheet {...baseProps()} />);
    fillMqttFields();

    await vi.waitFor(() => fireEvent.click(screen.getByRole('button', { name: /copy live device config/i })));

    expect(writeText).toHaveBeenCalledWith(JSON.stringify({
      brokerUrl: 'wss://cluster.hivemq.cloud:8884/mqtt',
      username: 'pitlogic',
      password: 'secret',
      unit: 'F',
    }));
    const copyBtn = await screen.findByRole('button', { name: /copy live device config/i });
    expect(copyBtn.textContent).toBe('Copied ✓');

    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByRole('button', { name: /copy live device config/i }).textContent).toBe('Copy config');
  });

  it('shows "Copy failed" when the clipboard write is rejected', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<SettingsSheet {...baseProps()} />);

    await vi.waitFor(() => fireEvent.click(screen.getByRole('button', { name: /copy live device config/i })));

    const copyBtn = await screen.findByRole('button', { name: /copy live device config/i });
    expect(copyBtn.textContent).toBe('Copy failed');
  });

  it('applies a pasted valid config to the fields and localStorage', async () => {
    render(<SettingsSheet {...baseProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /paste live device config/i }));
    const textarea = screen.getByLabelText('Pasted Live Device config JSON');
    fireEvent.change(textarea, {
      target: {
        value: JSON.stringify({ brokerUrl: 'wss://from-laptop:8884/mqtt', username: 'pit', password: 'pw123', unit: 'C' }),
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply & save/i }));

    expect(screen.getByLabelText('Broker URL').value).toBe('wss://from-laptop:8884/mqtt');
    expect(screen.getByLabelText('Username').value).toBe('pit');
    expect(screen.getByLabelText('Password').value).toBe('pw123');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({
      brokerUrl: 'wss://from-laptop:8884/mqtt',
      username: 'pit',
      password: 'pw123',
      unit: 'C',
    });
    // Paste box closes and the Save flash fires on successful apply
    expect(screen.queryByLabelText('Pasted Live Device config JSON')).toBeNull();
    expect(screen.getByRole('button', { name: 'Saved ✓' })).toBeTruthy();
  });

  it('requires a second confirmation click before overwriting an existing config', () => {
    render(<SettingsSheet {...baseProps()} />);
    fillMqttFields();

    fireEvent.click(screen.getByRole('button', { name: /paste live device config/i }));
    fireEvent.change(screen.getByLabelText('Pasted Live Device config JSON'), {
      target: {
        value: JSON.stringify({ brokerUrl: 'wss://new-device:8884/mqtt', username: 'new', password: 'newpw' }),
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /apply & save/i }));
    // First click only warns — nothing applied yet
    expect(screen.getByRole('alert').textContent).toContain('overwrite');
    expect(screen.getByLabelText('Broker URL').value).toBe('wss://cluster.hivemq.cloud:8884/mqtt');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /confirm overwrite/i }));
    expect(screen.getByLabelText('Broker URL').value).toBe('wss://new-device:8884/mqtt');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).username).toBe('new');
  });

  it('rejects invalid JSON without touching saved config', () => {
    render(<SettingsSheet {...baseProps()} />);
    fillMqttFields();

    fireEvent.click(screen.getByRole('button', { name: /paste live device config/i }));
    fireEvent.change(screen.getByLabelText('Pasted Live Device config JSON'), { target: { value: '{not valid json' } });
    fireEvent.click(screen.getByRole('button', { name: /apply & save/i }));

    expect(screen.getByRole('alert').textContent).toBe('Invalid JSON');
    expect(screen.getByLabelText('Broker URL').value).toBe('wss://cluster.hivemq.cloud:8884/mqtt');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('names the specific missing field when a required field is absent', () => {
    render(<SettingsSheet {...baseProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /paste live device config/i }));
    fireEvent.change(screen.getByLabelText('Pasted Live Device config JSON'), {
      target: { value: JSON.stringify({ brokerUrl: 'wss://x:8884/mqtt', username: 'u' }) },
    });
    fireEvent.click(screen.getByRole('button', { name: /apply & save/i }));

    expect(screen.getByRole('alert').textContent).toContain('"password"');
  });

  it('clears the paste box and discards changes on Cancel', () => {
    render(<SettingsSheet {...baseProps()} />);

    fireEvent.click(screen.getByRole('button', { name: /paste live device config/i }));
    fireEvent.change(screen.getByLabelText('Pasted Live Device config JSON'), { target: { value: 'garbage' } });
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByLabelText('Pasted Live Device config JSON')).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe('SettingsSheet — Device Health panel', () => {
  it('shows a gateway health entry with wifi, battery, firmware', () => {
    render(<SettingsSheet {...baseProps({ gatewayHealth: [
      { gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', unitMismatch: false, probes: [] },
    ] })} />);
    expect(screen.getByText(/88%/)).toBeTruthy();
    expect(screen.getByText(/v2.45/)).toBeTruthy();
  });

  it('shows a unit mismatch warning when the gateway reports Celsius', () => {
    render(<SettingsSheet {...baseProps({ gatewayHealth: [
      { gatewayId: 'gw1', wifiStrength: 88, battery: null, firmware: null, units: 'C', unitMismatch: true, probes: [] },
    ] })} />);
    expect(screen.getByText(/reporting Celsius/i)).toBeTruthy();
  });

  it('lists per-probe battery percentages', () => {
    render(<SettingsSheet {...baseProps({ gatewayHealth: [
      { gatewayId: 'gw1', wifiStrength: null, battery: null, firmware: null, units: 'F', unitMismatch: false,
        probes: [{ probeId: 'gw1-ch1', battery: 15 }] },
    ] })} />);
    expect(screen.getByText(/gw1-ch1/)).toBeTruthy();
    expect(screen.getByText(/15%/)).toBeTruthy();
  });

  it('renders nothing device-health-related when gatewayHealth is empty', () => {
    render(<SettingsSheet {...baseProps({ gatewayHealth: [] })} />);
    expect(screen.queryByText(/Device Health/i)).toBeNull();
  });
});

describe('SettingsSheet — Device Settings panel', () => {
  it('renders a DeviceSettingsCard for each gateway with editableConfig data', () => {
    render(<SettingsSheet {...baseProps({
      gatewayHealth: [
        { gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', unitMismatch: false,
          editableConfig: { channelLabels: {}, alarms: {}, transmitIntervalInSeconds: null, recordingIntervalInSeconds: null },
          probes: [] },
      ],
      onHasConfigBaseline: () => true,
      onUpdateDeviceConfig: vi.fn(),
    })} />);
    expect(screen.getByText(/^device settings$/i)).toBeTruthy();
  });

  it('renders nothing device-settings-related when gatewayHealth is empty', () => {
    render(<SettingsSheet {...baseProps({ gatewayHealth: [], onHasConfigBaseline: () => true, onUpdateDeviceConfig: vi.fn() })} />);
    expect(screen.queryByText(/device settings/i)).toBeNull();
  });

  it('re-syncs the form when a new retained config arrives for an already-rendered gateway', () => {
    const gw = gatewayId => ({
      gatewayId, wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', unitMismatch: false, probes: [],
    });
    const { rerender } = render(<SettingsSheet {...baseProps({
      gatewayHealth: [
        { ...gw('gw1'), editableConfig: { channelLabels: { 1: 'Brisket' }, alarms: {}, transmitIntervalInSeconds: null, recordingIntervalInSeconds: null } },
      ],
      onHasConfigBaseline: () => true,
      onUpdateDeviceConfig: vi.fn(),
    })} />);
    expect(screen.getByLabelText(/channel 1 label/i).value).toBe('Brisket');

    rerender(<SettingsSheet {...baseProps({
      gatewayHealth: [
        { ...gw('gw1'), editableConfig: { channelLabels: { 1: 'Ribs' }, alarms: {}, transmitIntervalInSeconds: null, recordingIntervalInSeconds: null } },
      ],
      onHasConfigBaseline: () => true,
      onUpdateDeviceConfig: vi.fn(),
    })} />);
    expect(screen.getByLabelText(/channel 1 label/i).value).toBe('Ribs');
  });
});

describe('SettingsSheet — BLE provisioning entry point', () => {
  const originalBluetooth = Object.getOwnPropertyDescriptor(window.navigator, 'bluetooth');

  afterEach(() => {
    if (originalBluetooth) {
      Object.defineProperty(window.navigator, 'bluetooth', originalBluetooth);
    } else {
      delete window.navigator.bluetooth;
    }
  });

  it('shows the Set Up Device via Bluetooth button when navigator.bluetooth is supported', () => {
    Object.defineProperty(window.navigator, 'bluetooth', { value: {}, configurable: true });
    render(<SettingsSheet {...baseProps({ onOpenBleWizard: vi.fn() })} />);
    expect(screen.getByRole('button', { name: /set up device via bluetooth/i })).toBeTruthy();
  });

  it('calls onOpenBleWizard when the entry point button is clicked', () => {
    Object.defineProperty(window.navigator, 'bluetooth', { value: {}, configurable: true });
    const onOpenBleWizard = vi.fn();
    render(<SettingsSheet {...baseProps({ onOpenBleWizard })} />);
    fireEvent.click(screen.getByRole('button', { name: /set up device via bluetooth/i }));
    expect(onOpenBleWizard).toHaveBeenCalledTimes(1);
  });

  it('shows unsupported-browser messaging instead of the button when navigator.bluetooth is absent', () => {
    if ('bluetooth' in window.navigator) delete window.navigator.bluetooth;
    render(<SettingsSheet {...baseProps({ onOpenBleWizard: vi.fn() })} />);
    expect(screen.queryByRole('button', { name: /set up device via bluetooth/i })).toBeNull();
    expect(screen.getByText(/isn't supported in this browser/i)).toBeTruthy();
  });
});
