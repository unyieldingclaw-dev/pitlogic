import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProbeAlert } from '../useProbeAlert';

const mockNotification = vi.fn();
mockNotification.permission = 'granted';
mockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
global.Notification = mockNotification;

function makeCook(id, probes) {
  return { id, probes };
}

function makeProbe(id, name, target, readings) {
  return { id, name, target, readings };
}

describe('useProbeAlert', () => {
  beforeEach(() => {
    mockNotification.mockClear();
    mockNotification.permission = 'granted';
  });

  it('fires notification when probe reaches target', () => {
    const cook = makeCook('c1', [
      makeProbe(0, 'Brisket', 203, [{ temp: 205 }]),
    ]);
    renderHook(() => useProbeAlert(cook));
    expect(mockNotification).toHaveBeenCalledWith(
      'PitLogic — Brisket at target!',
      expect.objectContaining({ body: 'Brisket reached 203°F' }),
    );
  });

  it('does not fire when probe is below target', () => {
    const cook = makeCook('c1', [
      makeProbe(0, 'Brisket', 203, [{ temp: 185 }]),
    ]);
    renderHook(() => useProbeAlert(cook));
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('fires only once per probe even when readings grow', () => {
    const cook = makeCook('c1', [
      makeProbe(0, 'Brisket', 203, [{ temp: 205 }]),
    ]);
    const { rerender } = renderHook(({ c }) => useProbeAlert(c), {
      initialProps: { c: cook },
    });
    const cook2 = makeCook('c1', [
      makeProbe(0, 'Brisket', 203, [{ temp: 205 }, { temp: 207 }]),
    ]);
    rerender({ c: cook2 });
    expect(mockNotification).toHaveBeenCalledTimes(1);
  });

  it('resets and re-fires when cook id changes', () => {
    const cook1 = makeCook('c1', [makeProbe(0, 'Brisket', 203, [{ temp: 205 }])]);
    const cook2 = makeCook('c2', [makeProbe(0, 'Brisket', 203, [{ temp: 205 }])]);
    const { rerender } = renderHook(({ c }) => useProbeAlert(c), {
      initialProps: { c: cook1 },
    });
    rerender({ c: cook2 });
    expect(mockNotification).toHaveBeenCalledTimes(2);
  });

  it('skips notification when permission is not granted', () => {
    mockNotification.permission = 'denied';
    const cook = makeCook('c1', [makeProbe(0, 'Brisket', 203, [{ temp: 205 }])]);
    renderHook(() => useProbeAlert(cook));
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('does not fire for probes with no target set', () => {
    const cook = makeCook('c1', [makeProbe(0, 'Brisket', 0, [{ temp: 205 }])]);
    renderHook(() => useProbeAlert(cook));
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('fires separate notifications for each probe that hits target', () => {
    const cook = makeCook('c1', [
      makeProbe(0, 'Flat', 203, [{ temp: 205 }]),
      makeProbe(1, 'Point', 210, [{ temp: 212 }]),
    ]);
    renderHook(() => useProbeAlert(cook));
    expect(mockNotification).toHaveBeenCalledTimes(2);
  });
});
