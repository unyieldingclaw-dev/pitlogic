import { beforeEach, describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDeviceConnectionConfig } from '../useDeviceConnectionConfig';

describe('device connection configuration', () => {
  beforeEach(() => localStorage.clear());
  it('loads only the known string fields and a supported unit', () => {
    localStorage.setItem('pitlogic-mqtt-v1', JSON.stringify({ brokerUrl: 12, username: [], password: {}, unit: 'invalid', unexpected: 'discard' }));
    const { result } = renderHook(() => useDeviceConnectionConfig());
    expect(result.current.config).toEqual({ brokerUrl: '', username: '', password: '', unit: 'F' });
  });
  it('explains that the browser needs WebSockets rather than a gateway MQTT endpoint', () => {
    const { result } = renderHook(() => useDeviceConnectionConfig());
    expect(() => result.current.saveConfig({ brokerUrl: 'mqtts://fixture.example', username: 'fixture', password: 'fixture' })).toThrow(/WebSocket/);
    expect(localStorage.getItem('pitlogic-mqtt-v1')).toBeNull();
  });
});
