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

  it('disables the WiFi/MQTT fields and the scan button while provisioning', async () => {
    let resolveProvision;
    mockProvision.mockImplementation(() => new Promise(resolve => { resolveProvision = resolve; }));
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    fireEvent.click(screen.getByRole('button', { name: /^provision device$/i }));

    // jsdom doesn't implement the native browser behavior where a disabled <fieldset>
    // cascades .disabled to its descendant form controls, so assert on the fieldset
    // itself (implicit role="group") rather than the individual inputs/buttons inside it.
    await waitFor(() => { expect(screen.getByRole('group').disabled).toBe(true); });

    resolveProvision();
  });

  it('surfaces a scan failure as a scoped error without moving to the fatal error phase', async () => {
    mockScanWifiNetworks.mockRejectedValue(new Error('Scan timed out'));
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    fireEvent.click(screen.getByRole('button', { name: /scan for networks/i }));

    expect(await screen.findByText(/scan timed out/i)).toBeTruthy();
    // Form fields remain visible/usable — the user was not kicked into the fatal error phase.
    expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('ignores a second "Scan for networks" click while a scan is already in flight', async () => {
    let resolveScan;
    mockScanWifiNetworks.mockImplementation(() => new Promise(resolve => { resolveScan = resolve; }));
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    fireEvent.click(screen.getByRole('button', { name: /scan for networks/i }));
    await waitFor(() => { expect(screen.getByRole('button', { name: /scanning/i }).disabled).toBe(true); });
    fireEvent.click(screen.getByRole('button', { name: /scanning/i }));

    expect(mockScanWifiNetworks).toHaveBeenCalledTimes(1);
    resolveScan();
  });

  it('resets to a fresh idle phase after closing mid-provisioning, even if the interrupted provision() rejects late', async () => {
    let rejectProvision;
    mockProvision.mockImplementation(() => new Promise((_resolve, reject) => { rejectProvision = reject; }));
    const onClose = vi.fn();
    const { rerender } = render(<BleProvisioningWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });
    fireEvent.click(screen.getByRole('button', { name: /^provision device$/i }));
    await waitFor(() => { expect(screen.getByRole('group').disabled).toBe(true); });

    // User closes mid-flight (e.g. clicks the X while the device is still connecting).
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<BleProvisioningWizard open={false} onClose={onClose} />);

    // The interrupted provision() now rejects late (e.g. the GATT server disconnect
    // triggered by handleClose surfaces as a write/notify rejection).
    rejectProvision(new Error('GATT Server disconnected'));
    await Promise.resolve();

    // Reopening the still-mounted wizard should show a fresh idle phase, not a stale
    // error phase clobbered in by the late-arriving rejection.
    rerender(<BleProvisioningWizard open={true} onClose={onClose} />);
    expect(screen.getByRole('button', { name: /scan for device/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('resets the network list and scan error after closing mid-scan, even if the interrupted scan resolves late', async () => {
    let capturedOnNetwork;
    let resolveScan;
    mockScanWifiNetworks.mockImplementation(onNetwork => {
      capturedOnNetwork = onNetwork;
      return new Promise(resolve => { resolveScan = resolve; });
    });
    const onClose = vi.fn();
    const { rerender } = render(<BleProvisioningWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    fireEvent.click(screen.getByRole('button', { name: /scan for networks/i }));
    await waitFor(() => { expect(screen.getByRole('button', { name: /scanning/i }).disabled).toBe(true); });

    // User closes mid-scan.
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<BleProvisioningWizard open={false} onClose={onClose} />);

    // The interrupted scan keeps running after close: a late network notification arrives,
    // then the scan resolves — neither should touch the (already-reset) wizard state.
    capturedOnNetwork({ authMode: 'WPA2', rssi: -50, ssid: 'LateNetwork' });
    resolveScan();
    await Promise.resolve();

    // Reconnecting shouldn't resurface the stale network from the interrupted scan.
    rerender(<BleProvisioningWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });
    expect(screen.queryByText(/LateNetwork/)).toBeNull();
  });

  it('does not resurface a stale error phase after closing mid-connect, even if the interrupted connect() rejects late', async () => {
    let rejectConnect;
    mockConnect.mockImplementation(() => new Promise((_resolve, reject) => { rejectConnect = reject; }));
    const onClose = vi.fn();
    const { rerender } = render(<BleProvisioningWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByText(/connecting/i)).toBeTruthy(); });

    // User closes while still connecting.
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<BleProvisioningWizard open={false} onClose={onClose} />);

    // The interrupted connect() rejects late (e.g. the user cancels the native device
    // chooser after the wizard was already closed).
    rejectConnect(new Error('User cancelled the requestDevice() chooser.'));
    await Promise.resolve();

    // Reopening should show a fresh idle phase, not a stale error phase clobbered in by
    // the late-arriving rejection.
    rerender(<BleProvisioningWizard open={true} onClose={onClose} />);
    expect(screen.getByRole('button', { name: /scan for device/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('disconnects an in-flight connection that resolves after closing mid-connect, instead of leaving it orphaned', async () => {
    let resolveConnect;
    mockConnect.mockImplementation(() => new Promise(resolve => { resolveConnect = resolve; }));
    const onClose = vi.fn();
    const { rerender } = render(<BleProvisioningWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByText(/connecting/i)).toBeTruthy(); });

    // User closes while still connecting — at this point provisioner.disconnect() is a no-op
    // inside ThermoWorksBleProvisioner, since connect() hasn't resolved and there's no GATT
    // server yet to tear down.
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    rerender(<BleProvisioningWizard open={false} onClose={onClose} />);

    // The interrupted connect() resolves late — a real GATT connection now exists and must be
    // torn down rather than left orphaned.
    resolveConnect(DEVICE_INFO);
    await Promise.resolve();

    expect(mockDisconnect).toHaveBeenCalledTimes(2);

    // Reopening should still show a fresh idle phase, not the now-stale connected device's form.
    rerender(<BleProvisioningWizard open={true} onClose={onClose} />);
    expect(screen.getByRole('button', { name: /scan for device/i })).toBeTruthy();
  });
});
