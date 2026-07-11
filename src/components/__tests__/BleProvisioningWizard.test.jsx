import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BleProvisioningWizard from '../BleProvisioningWizard';

const { mockConnect, mockScanWifiNetworks, mockProvision, mockDisconnect } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockScanWifiNetworks: vi.fn().mockResolvedValue(undefined),
  mockProvision: vi.fn().mockResolvedValue(undefined),
  mockDisconnect: vi.fn(),
}));

vi.mock('../../hooks/useBleProvisioning.js', () => ({
  useBleProvisioning: () => ({
    connect: mockConnect,
    scanWifiNetworks: mockScanWifiNetworks,
    provision: mockProvision,
    disconnect: mockDisconnect,
  }),
}));

const lsMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    _clear: () => { store = {}; },
    _seed: (key, val) => { store[key] = val; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: lsMock, writable: true });

const DEVICE_INFO = { model: 'NODE', serial: 'T10061CE92E24', firmware: 'v2.45', battery: 87 };

describe('BleProvisioningWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lsMock._clear();
    mockConnect.mockResolvedValue(DEVICE_INFO);
    mockScanWifiNetworks.mockResolvedValue(undefined);
    mockProvision.mockResolvedValue(undefined);
  });

  it('shows the idle Scan for Device button when opened', () => {
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /scan for device/i })).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(<BleProvisioningWizard open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /scan for device/i })).toBeNull();
  });

  it('shows the device confirmation and form after a successful connect', async () => {
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));

    await waitFor(() => {
      expect(screen.getByText(/T10061CE92E24/)).toBeTruthy();
    });
    expect(screen.getByText(/v2\.45/)).toBeTruthy();
    expect(screen.getByText(/87%/)).toBeTruthy();
    expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^provision device$/i })).toBeTruthy();
  });

  it('shows an error and a retry option when connect() rejects', async () => {
    mockConnect.mockRejectedValue(new Error('User cancelled the requestDevice() chooser.'));
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));

    expect(await screen.findByText(/user cancelled/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });

  it('pre-fills MQTT username/password from stored config, but not brokerUrl verbatim', async () => {
    lsMock._seed('pitlogic-mqtt-v1', JSON.stringify({ brokerUrl: 'wss://broker.example.com:8884/mqtt', username: 'pitlogic', password: 'secret' }));
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    expect(screen.getByLabelText(/mqtt username/i).value).toBe('pitlogic');
    expect(screen.getByLabelText(/mqtt password/i).value).toBe('secret');
    // Host is carried over; scheme/port are not copied verbatim from the browser's wss:// value.
    expect(screen.getByLabelText(/mqtt broker url/i).value).toBe('mqtts://broker.example.com');
    expect(screen.getByLabelText(/mqtt broker port/i).value).toBe('8883');
  });

  it('runs the SCAN flow and populates the network dropdown on "Scan for networks"', async () => {
    mockScanWifiNetworks.mockImplementation(async onNetwork => {
      onNetwork({ authMode: 'WPA2', rssi: -45, ssid: 'HomeNetwork' });
    });
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    fireEvent.click(screen.getByRole('button', { name: /scan for networks/i }));
    await waitFor(() => { expect(screen.getByText(/HomeNetwork/)).toBeTruthy(); });
  });

  it('calls provision() with form values and shows a live status log', async () => {
    mockProvision.mockImplementation(async (_fields, onStatus) => {
      onStatus({ type: 'wifi', connected: true });
      onStatus({ type: 'mqtt', connected: true });
    });
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    fireEvent.change(screen.getByLabelText(/wifi ssid/i), { target: { value: 'HomeNetwork' } });
    fireEvent.change(screen.getByLabelText(/wifi password/i), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByRole('button', { name: /^provision device$/i }));

    await waitFor(() => {
      expect(mockProvision).toHaveBeenCalledWith(
        expect.objectContaining({ wifiSsid: 'HomeNetwork', wifiPassword: 'hunter2' }),
        expect.any(Function),
      );
    });
    expect(screen.getByText(/wifi connected/i)).toBeTruthy();
    expect(screen.getByText(/mqtt connected/i)).toBeTruthy();
  });

  it('shows the success screen with the device serial after provision() resolves', async () => {
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });
    fireEvent.click(screen.getByRole('button', { name: /^provision device$/i }));

    expect(await screen.findByText(/device provisioned/i)).toBeTruthy();
    expect(screen.getByText(/T10061CE92E24/)).toBeTruthy();
  });

  it('shows a wifi/mqtt error message from a status event without treating it as fatal to the whole flow', async () => {
    mockProvision.mockImplementation(async (_fields, onStatus) => {
      onStatus({ type: 'wifi-error', code: 12299, message: 'WiFi password rejected' });
    });
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });
    fireEvent.click(screen.getByRole('button', { name: /^provision device$/i }));

    expect(await screen.findByText(/wifi password rejected/i)).toBeTruthy();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<BleProvisioningWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
