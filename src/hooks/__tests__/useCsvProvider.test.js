import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { mockConnect, mockSubscribe, mockDisconnect, mockLoad, mockPublish, mockNormalize } = vi.hoisted(() => ({
  mockConnect: vi.fn().mockResolvedValue(undefined),
  mockSubscribe: vi.fn().mockReturnValue(() => {}),
  mockDisconnect: vi.fn().mockResolvedValue(undefined),
  mockLoad: vi.fn(),
  mockPublish: vi.fn(),
  mockNormalize: vi.fn().mockReturnValue({ type: 'probe:reading', reading: {} }),
}));

vi.mock('../../lib/providers/adapters/csv/CsvProvider.js', () => {
  const CsvProvider = class {
    constructor(id) {
      this.id = id ?? 'csv';
      this.connect = mockConnect;
      this.subscribe = mockSubscribe;
      this.disconnect = mockDisconnect;
      this.load = mockLoad;
    }
  };
  return { CsvProvider };
});

vi.mock('../../lib/telemetry/eventBus/EventBus.js', () => ({
  globalEventBus: { publish: mockPublish },
}));

vi.mock('../../lib/telemetry/normalization/normalize.js', () => ({
  normalizeProviderEvent: mockNormalize,
}));

function makeFile(text = 'Time,Probe 1\n2024-01-01T00:00:00,150') {
  return { text: vi.fn().mockResolvedValue(text) };
}

import { useCsvProvider } from '../useCsvProvider.js';

describe('useCsvProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
    mockSubscribe.mockReturnValue(() => {});
    mockDisconnect.mockResolvedValue(undefined);
  });

  it('starts with status idle and no error', () => {
    const { result } = renderHook(() => useCsvProvider());
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('replay() transitions to done after provider connects', async () => {
    const { result } = renderHook(() => useCsvProvider());
    await act(async () => { await result.current.replay(makeFile()); });
    expect(result.current.status).toBe('done');
    expect(result.current.error).toBeNull();
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('replay() sets error status when provider.connect() throws', async () => {
    mockConnect.mockRejectedValue(new Error('parse error'));
    const { result } = renderHook(() => useCsvProvider());
    await act(async () => { await result.current.replay(makeFile()); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('parse error');
  });

  it('reset() returns to idle from done', async () => {
    const { result } = renderHook(() => useCsvProvider());
    await act(async () => { await result.current.replay(makeFile()); });
    expect(result.current.status).toBe('done');
    await act(async () => { await result.current.reset(); });
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(mockDisconnect).toHaveBeenCalledTimes(1); // reset() disconnects the active session
  });

  it('calls provider.disconnect() on unmount when active', async () => {
    const { result, unmount } = renderHook(() => useCsvProvider());
    await act(async () => { await result.current.replay(makeFile()); });
    unmount();
    await act(async () => {});
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('wires subscribe handler → normalizeProviderEvent → globalEventBus.publish', async () => {
    let capturedHandler;
    mockSubscribe.mockImplementation(handler => {
      capturedHandler = handler;
      return () => {};
    });

    const { result } = renderHook(() => useCsvProvider());
    await act(async () => { await result.current.replay(makeFile()); });

    const fakeRaw = { probeId: 'probe-0', capturedAt: 2_000_000_000_000, temperature: 150, unit: 'F', source: 'csv-import', status: 'active' };
    const fakeNormalized = { type: 'probe:reading', reading: {} };
    mockNormalize.mockReturnValue(fakeNormalized);

    act(() => { capturedHandler(fakeRaw); });

    expect(mockNormalize).toHaveBeenCalledWith(fakeRaw, expect.stringMatching(/^csv-/));
    expect(mockPublish).toHaveBeenCalledWith(fakeNormalized);
  });
});
