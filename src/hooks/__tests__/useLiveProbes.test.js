import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// vi.hoisted() runs before vi.mock() which runs before top-level imports.
const { mockGetProbes, mockSubscribe, mockStartStaleCheck, mockStopStaleCheck, mockUnsub } = vi.hoisted(() => ({
  mockGetProbes: vi.fn(),
  mockSubscribe: vi.fn(),
  mockStartStaleCheck: vi.fn(),
  mockStopStaleCheck: vi.fn(),
  mockUnsub: vi.fn(),
}));

vi.mock('../../lib/telemetry/store/globalStore.js', () => ({
  globalStore: {
    getProbes: mockGetProbes,
    subscribe: mockSubscribe,
    startStaleCheck: mockStartStaleCheck,
    stopStaleCheck: mockStopStaleCheck,
  },
}));

import { useLiveProbes } from '../useLiveProbes.js';

describe('useLiveProbes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(mockUnsub);
  });

  it('initializes state from globalStore.getProbes() snapshot', () => {
    const snapshot = new Map([['probe-1', { probeId: 'probe-1', status: 'active' }]]);
    mockGetProbes.mockReturnValue(snapshot);

    const { result } = renderHook(() => useLiveProbes());

    expect(result.current).toEqual(snapshot);
    expect(result.current).not.toBe(snapshot);
  });

  it('calls subscribe() and updates state on notification', () => {
    mockGetProbes.mockReturnValue(new Map());
    let notify;
    mockSubscribe.mockImplementation(listener => { notify = listener; return mockUnsub; });

    const { result } = renderHook(() => useLiveProbes());
    expect(result.current.size).toBe(0);

    const updated = new Map([['probe-1', { probeId: 'probe-1', status: 'stale' }]]);
    act(() => { notify(updated); });

    expect(result.current).toEqual(updated);
  });

  it('calls unsub() and stopStaleCheck() on unmount', () => {
    mockGetProbes.mockReturnValue(new Map());

    const { unmount } = renderHook(() => useLiveProbes());
    expect(mockStartStaleCheck).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockUnsub).toHaveBeenCalledTimes(1);
    expect(mockStopStaleCheck).toHaveBeenCalledTimes(1);
  });
});
