const KEY = 'rfx-v5';

export const save = data => {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
};

export const load = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    // Migrate legacy activeCookId (string) → activeCooks (array)
    if (d && typeof d.aid === 'string' && !d.activeCooks) {
      d.activeCooks = d.aid ? [d.aid] : [];
      delete d.aid;
      localStorage.setItem(KEY, JSON.stringify(d));
    }
    return d;
  } catch(e) { return null; }
};
