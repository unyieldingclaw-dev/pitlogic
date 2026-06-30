import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSmokerAlert } from '../useSmokerAlert';

const mockNotification = vi.fn();
mockNotification.permission = 'granted';
mockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
globalThis.Notification = mockNotification;

function makeCook(id, smokerReadings, alarm) {
  return { id, smokerReadings, smokerLowAlarm: alarm };
}

describe('useSmokerAlert', () => {
  beforeEach(() => {
    mockNotification.mockClear();
    mockNotification.permission = 'granted';
  });

  it('fires notification when smoker drops below threshold', () => {
    const cook = makeCook('c1', [{ temp: 185 }], { enabled: true, threshold: 200 });
    renderHook(() => useSmokerAlert(cook));
    expect(mockNotification).toHaveBeenCalledWith(
      'PitLogic — Smoker temp low!',
      expect.objectContaining({ body: 'Pit dropped to 185°F (alarm: 200°F)' }),
    );
  });

  it('returns true when smoker is below threshold', () => {
    const cook = makeCook('c1', [{ temp: 185 }], { enabled: true, threshold: 200 });
    const { result } = renderHook(() => useSmokerAlert(cook));
    expect(result.current).toBe(true);
  });

  it('returns false when smoker is above threshold', () => {
    const cook = makeCook('c1', [{ temp: 220 }], { enabled: true, threshold: 200 });
    const { result } = renderHook(() => useSmokerAlert(cook));
    expect(result.current).toBe(false);
  });

  it('does not fire when alarm is disabled', () => {
    const cook = makeCook('c1', [{ temp: 185 }], { enabled: false, threshold: 200 });
    renderHook(() => useSmokerAlert(cook));
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('does not fire when no smoker readings exist', () => {
    const cook = makeCook('c1', [], { enabled: true, threshold: 200 });
    renderHook(() => useSmokerAlert(cook));
    expect(mockNotification).not.toHaveBeenCalled();
  });

  it('fires only once per drop event (hysteresis)', () => {
    const cook1 = makeCook('c1', [{ temp: 185 }], { enabled: true, threshold: 200 });
    const cook2 = makeCook('c1', [{ temp: 185 }, { temp: 183 }], { enabled: true, threshold: 200 });
    const { rerender } = renderHook(({ c }) => useSmokerAlert(c), {
      initialProps: { c: cook1 },
    });
    rerender({ c: cook2 });
    expect(mockNotification).toHaveBeenCalledTimes(1);
  });

  it('re-fires after temp recovers then drops again', () => {
    const low = makeCook('c1', [{ temp: 185 }], { enabled: true, threshold: 200 });
    const recovered = makeCook('c1', [{ temp: 185 }, { temp: 215 }], { enabled: true, threshold: 200 });
    const dropsAgain = makeCook('c1', [{ temp: 185 }, { temp: 215 }, { temp: 190 }], { enabled: true, threshold: 200 });
    const { rerender } = renderHook(({ c }) => useSmokerAlert(c), {
      initialProps: { c: low },
    });
    rerender({ c: recovered });
    rerender({ c: dropsAgain });
    expect(mockNotification).toHaveBeenCalledTimes(2);
  });

  it('does not fire when permission is denied', () => {
    mockNotification.permission = 'denied';
    const cook = makeCook('c1', [{ temp: 185 }], { enabled: true, threshold: 200 });
    renderHook(() => useSmokerAlert(cook));
    expect(mockNotification).not.toHaveBeenCalled();
  });
});
