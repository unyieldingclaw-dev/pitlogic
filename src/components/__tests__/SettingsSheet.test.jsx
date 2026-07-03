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
