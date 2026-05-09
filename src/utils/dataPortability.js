export function buildExport(cookState, recipes) {
  return {
    version: 1,
    exportedAt: Date.now(),
    cooks: cookState.cooks,
    activeCooks: cookState.activeCooks,
    recipes,
  };
}

export function parseImport(jsonString) {
  let parsed;
  try { parsed = JSON.parse(jsonString); } catch { return { ok: false, error: 'Invalid JSON' }; }
  if (!parsed || parsed.version !== 1) return { ok: false, error: 'Unknown backup version' };
  if (!Array.isArray(parsed.cooks)) return { ok: false, error: 'Missing cooks array' };
  if (!Array.isArray(parsed.recipes)) return { ok: false, error: 'Missing recipes array' };
  return { ok: true, data: parsed };
}

export function mergeCooks(existing, incoming) {
  const ids = new Set(existing.map(c => c.id));
  const added = incoming.filter(c => !ids.has(c.id));
  return { merged: [...existing, ...added], added: added.length, skipped: incoming.length - added.length };
}

export function triggerDownload(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
