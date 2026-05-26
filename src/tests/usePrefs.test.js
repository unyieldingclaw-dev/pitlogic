import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrefs } from '../hooks/usePrefs';

describe('usePrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty cutPrefs when localStorage is empty', () => {
    const { result } = renderHook(() => usePrefs());
    expect(result.current.prefs.cutPrefs).toEqual({});
  });

  it('loads existing prefs from localStorage on mount', () => {
    localStorage.setItem('pitlogic-prefs-v1', JSON.stringify({ cutPrefs: { Brisket: { pit: 250, pull: 203 } } }));
    const { result } = renderHook(() => usePrefs());
    expect(result.current.prefs.cutPrefs.Brisket).toEqual({ pit: 250, pull: 203 });
  });

  it('setCutPref saves a preference and updates state', () => {
    const { result } = renderHook(() => usePrefs());
    act(() => result.current.setCutPref('Brisket', { pit: 250, pull: 205 }));
    expect(result.current.prefs.cutPrefs.Brisket).toEqual({ pit: 250, pull: 205 });
    expect(JSON.parse(localStorage.getItem('pitlogic-prefs-v1'))).toEqual({ cutPrefs: { Brisket: { pit: 250, pull: 205 } } });
  });

  it('setCutPref merges partial overrides into existing pref', () => {
    const { result } = renderHook(() => usePrefs());
    act(() => result.current.setCutPref('Brisket', { pit: 250, pull: 203 }));
    act(() => result.current.setCutPref('Brisket', { pit: 275 }));
    expect(result.current.prefs.cutPrefs.Brisket).toEqual({ pit: 275, pull: 203 });
  });

  it('resetCutPref removes a cut preference', () => {
    const { result } = renderHook(() => usePrefs());
    act(() => result.current.setCutPref('Brisket', { pit: 250, pull: 203 }));
    act(() => result.current.resetCutPref('Brisket'));
    expect(result.current.prefs.cutPrefs.Brisket).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('pitlogic-prefs-v1')).cutPrefs.Brisket).toBeUndefined();
  });

  it('hasCutPref returns true when a pref exists', () => {
    const { result } = renderHook(() => usePrefs());
    act(() => result.current.setCutPref('Brisket', { pit: 250 }));
    expect(result.current.hasCutPref('Brisket')).toBe(true);
  });

  it('hasCutPref returns false when no pref exists', () => {
    const { result } = renderHook(() => usePrefs());
    expect(result.current.hasCutPref('Brisket')).toBe(false);
  });

  it('returns empty cutPrefs when localStorage contains invalid JSON', () => {
    localStorage.setItem('pitlogic-prefs-v1', 'not-json');
    const { result } = renderHook(() => usePrefs());
    expect(result.current.prefs.cutPrefs).toEqual({});
  });
});
