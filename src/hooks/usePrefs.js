import { useState, useCallback } from 'react';

const KEY = 'rfx-prefs-v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { cutPrefs: {}, ...parsed };
  } catch {
    return { cutPrefs: {} };
  }
}

export function usePrefs() {
  const [prefs, setPrefs] = useState(load);

  const setCutPref = useCallback((cut, overrides) => {
    setPrefs(p => {
      const next = {
        ...p,
        cutPrefs: {
          ...p.cutPrefs,
          [cut]: { ...p.cutPrefs?.[cut], ...overrides }
        }
      };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetCutPref = useCallback((cut) => {
    setPrefs(p => {
      const { [cut]: _removed, ...rest } = p.cutPrefs || {};
      const next = { ...p, cutPrefs: rest };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const hasCutPref = useCallback((cut) => {
    return Boolean(prefs.cutPrefs?.[cut]);
  }, [prefs.cutPrefs]);

  return { prefs, setCutPref, resetCutPref, hasCutPref };
}
