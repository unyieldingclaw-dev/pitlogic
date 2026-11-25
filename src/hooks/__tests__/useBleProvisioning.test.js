import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockConnect, mockScanWifiNetworks, mockProvision, mockDisconnect } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockScanWifiNetworks: vi.fn(),
  mockProvision: vi.fn(),
  mockDisconnect: vi.fn(),
}));

vi.mock('../../lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.js', () => ({
  ThermoWorksBleProvisioner: class {
    connect = mockConnect;
    scanWifiNetworks = mockScanWifiNetworks;
    provision = mockProvision;
    disconnect = mockDisconnect;
  },
}));

import { useBleProvisioning } from '../useBleProvisioning.js';

describe('useBleProvisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns connect, scanWifiNetworks, provision, and disconnect functions', () => {
    const { result } = renderHook(() => useBleProvisioning());
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.scanWifiNetworks).toBe('function');
    expect(typeof result.current.provision).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  it('delegates connect() to the underlying provisioner instance', async () => {
    mockConnect.mockResolvedValue({ model: 'NODE', serial: 'T1', firmware: 'v1', battery: 50 });
    const { result } = renderHook(() => useBleProvisioning());
    const info = await result.current.connect();
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(info).toEqual({ model: 'NODE', serial: 'T1', firmware: 'v1', battery: 50 });
  });

  it('delegates scanWifiNetworks(onNetwork) to the underlying provisioner instance', async () => {
    const onNetwork = vi.fn();
    mockScanWifiNetworks.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBleProvisioning());
    await result.current.scanWifiNetworks(onNetwork);
    expect(mockScanWifiNetworks).toHaveBeenCalledWith(onNetwork);
  });

  it('delegates provision(fields, onStatus) to the underlying provisioner instance', async () => {
    const fields = { wifiSsid: 'x', wifiPassword: 'y', mqttBrokerUrl: 'z', mqttBrokerPort: '1', mqttUsername: 'u', mqttPassword: 'p' };
    const onStatus = vi.fn();
    mockProvision.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBleProvisioning());
    await result.current.provision(fields, onStatus);
    expect(mockProvision).toHaveBeenCalledWith(fields, onStatus);
  });

  it('reuses the same provisioner instance across re-renders (does not reconnect on every render)', () => {
    const { result, rerender } = renderHook(() => useBleProvisioning());
    const firstConnect = result.current.connect;
    rerender();
    expect(result.current.connect).toBe(firstConnect);
  });
});
