import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// vi.hoisted() runs before vi.mock() which runs before top-level imports.
// These mock fns are defined here so they can be referenced inside the vi.mock() factories below.
// Modifying vi.hoisted() or vi.mock() blocks requires keeping them in sync — they are intentionally coupled.
const { mockConnect, mockSubscribe, mockDisconnect, mockPublish, mockNormalize } = vi.hoisted(() => ({
  mockConnect: vi.fn().mockResolvedValue(undefined),
  mockSubscribe: vi.fn().mockReturnValue(() => {}),
  mockDisconnect: vi.fn().mockResolvedValue(undefined),
  mockPublish: vi.fn(),
  mockNormalize: vi.fn().mockReturnValue({ type: 'probe:reading', reading: {} }),
}));

vi.mock('../../lib/providers/adapters/thermoworks/ThermoWorksAdapter.js', () => {
  const ThermoWorksAdapter = class {
    constructor() {
      this.id = 'thermoworks';
      this.connect = mockConnect;
      this.subscribe = mockSubscribe;
      this.disconnect = mockDisconnect;
    }
  };
  return { ThermoWorksAdapter };
});

vi.mock('../../lib/telemetry/eventBus/EventBus.js', () => ({
  globalEventBus: { publish: mockPublish },
}));

vi.mock('../../lib/telemetry/normalization/normalize.js', () => ({
  normalizeProviderEvent: mockNormalize,
}));

// localStorage mock
const lsMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    _clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: lsMock, writable: true });

const VALID_CONFIG = JSON.stringify({
  brokerUrl: 'wss://test.hivemq.cloud:8884/mqtt',
  username: 'user',
  password: 'pass',
});

import { useThermoWorksProvider } from '../useThermoWorksProvider.js';

describe('useThermoWorksProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lsMock._clear();
    mockConnect.mockResolvedValue(undefined);
    mockSubscribe.mockReturnValue(() => {});
    mockDisconnect.mockResolvedValue(undefined);
  });

  it('starts with status disconnected and no error', () => {
    const { result } = renderHook(() => useThermoWorksProvider());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.error).toBeNull();
  });

  it('connect() transitions to connected when config is valid', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    expect(result.current.status).toBe('connected');
    expect(result.current.error).toBeNull();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('connect() sets error status when config is missing', async () => {
    lsMock.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/broker/i);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('connect() sets error status when adapter.connect() throws', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('ECONNREFUSED');
  });

  it('disconnect() transitions back to disconnected', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    await act(async () => { await result.current.disconnect(); });
    expect(result.current.status).toBe('disconnected');
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('calls adapter.disconnect() on unmount when connected', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    const { result, unmount } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    unmount();
    await act(async () => {});
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('wires adapter subscribe → normalizeProviderEvent → globalEventBus.publish', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    // Capture the handler passed to subscribe
    let capturedHandler;
    mockSubscribe.mockImplementation(handler => {
      capturedHandler = handler;
      return () => {};
    });

    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });

    const fakeRaw = { probeId: 'p1', capturedAt: 2_000_000_000_000, temperature: 225, unit: 'F', source: 'live' };
    const fakeNormalized = { type: 'probe:reading', reading: {} };
    mockNormalize.mockReturnValue(fakeNormalized);

    act(() => { capturedHandler(fakeRaw); });

    expect(mockNormalize).toHaveBeenCalledWith(fakeRaw, 'thermoworks');
    expect(mockPublish).toHaveBeenCalledWith(fakeNormalized);
    // Note: individual handler failure isolation (one handler error doesn't block others)
    // is tested at the ThermoWorksAdapter layer — see ThermoWorksAdapter.test.ts.
  });
});
