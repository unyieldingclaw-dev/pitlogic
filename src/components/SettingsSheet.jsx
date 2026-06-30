import { useEffect, useRef, useState } from 'react';
import { X, Download, Upload } from 'lucide-react';
import { buildExport, parseImport, mergeCooks, triggerDownload } from '../utils/dataPortability';
import { probeStatusColor } from '../utils/helpers';

function pad2(n) { return String(n).padStart(2, '0'); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function SettingsSheet({ open, onClose, cookState, recipes, onImportCooks, onImportRecipes, prefs, resetCutPref, setTheme, mqttStatus, mqttError, onMqttConnect, onMqttDisconnect, liveProbes }) {
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('merge');
  const [error, setError] = useState(null);
  const [mqttConfig, setMqttConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pitlogic-mqtt-v1') ?? 'null') ??
        { brokerUrl: '', username: '', password: '' };
    } catch {
      return { brokerUrl: '', username: '', password: '' };
    }
  });
  const [mqttSaved, setMqttSaved] = useState(false);
  const mqttSavedTimerRef = useRef(null);
  // Tracks whether the mousedown that preceded a click started inside the sheet,
  // so dragging to select password-field text (mouseup lands on the backdrop)
  // doesn't get treated as a backdrop click and close the sheet.
  const mouseDownInsideSheet = useRef(false);

  const handleMqttSave = () => {
    localStorage.setItem('pitlogic-mqtt-v1', JSON.stringify(mqttConfig));
    if (mqttSavedTimerRef.current) clearTimeout(mqttSavedTimerRef.current);
    setMqttSaved(true);
    mqttSavedTimerRef.current = setTimeout(() => setMqttSaved(false), 2000);
  };

  useEffect(() => {
    return () => {
      // Cancel pending "Saved ✓" flash timer to avoid setState after unmount
      if (mqttSavedTimerRef.current) clearTimeout(mqttSavedTimerRef.current);
    };
  }, []);

  if (!open) return null;

  const savedCuts = Object.entries(prefs?.cutPrefs || {});
  const totalCooks = cookState.cooks.length;
  const totalRecipes = recipes.length;

  const handleExport = () => {
    const data = buildExport(cookState, recipes);
    triggerDownload(`pitlogic-backup-${todayStr()}.json`, data);
  };

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = parseImport(ev.target.result);
      if (!result.ok) { setError(result.error); setPreview(null); return; }
      setError(null);
      const { merged: _m, added: newCooks, skipped: skipCooks } = mergeCooks(cookState.cooks, result.data.cooks);
      const existingNames = new Set(recipes.map(r => r.name.toLowerCase()));
      const newRecipes = result.data.recipes.filter(r => !existingNames.has(r.name.toLowerCase())).length;
      const skipRecipes = result.data.recipes.length - newRecipes;
      setPreview({ data: result.data, newCooks, skipCooks, newRecipes, skipRecipes });
      setMode('merge');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = () => {
    if (!preview) return;
    onImportCooks({ cooks: preview.data.cooks, activeCooks: preview.data.activeCooks ?? [], mode });
    onImportRecipes({ recipes: preview.data.recipes, mode });
    setPreview(null);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Settings"
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget && !mouseDownInsideSheet.current) onClose(); mouseDownInsideSheet.current = false; }}>
      <div className="fadein" onMouseDown={() => { mouseDownInsideSheet.current = true; }} style={{ background: 'var(--surface)', borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: 480, padding: '1.5rem', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        maxHeight: '85vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Settings</div>
          <button aria-label="Close settings" className="btn-ghost"
            style={{ padding: '6px', borderRadius: 8 }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Data summary */}
        <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: '1.25rem' }}>
          {totalCooks} cook{totalCooks !== 1 ? 's' : ''} · {totalRecipes} recipe{totalRecipes !== 1 ? 's' : ''}
        </div>

        {/* My Defaults */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            My Defaults
          </div>
          {savedCuts.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text3)', margin: 0 }}>
              No custom defaults saved yet. Change pit or pull temps in the new cook form and tap &ldquo;Save as default&rdquo; to store your preferences here.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {savedCuts.map(([cut, pref]) => (
                <li key={cut} style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{cut}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                      {pref.pit != null && `Pit ${pref.pit}°F`}
                      {pref.pit != null && pref.pull != null && '  ·  '}
                      {pref.pull != null && `Pull ${pref.pull}°F`}
                    </div>
                  </div>
                  <button
                    aria-label={`Reset ${cut} defaults`}
                    onClick={() => resetCutPref(cut)}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '4px 10px',
                      color: 'var(--text3)',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Reset
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Appearance */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
            Appearance
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Theme</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={prefs.theme !== 'light' ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '5px 14px', fontSize: 12 }}
                aria-pressed={prefs.theme !== 'light'}
                onClick={() => setTheme('dark')}>
                Dark
              </button>
              <button
                className={prefs.theme === 'light' ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '5px 14px', fontSize: 12 }}
                aria-pressed={prefs.theme === 'light'}
                onClick={() => setTheme('light')}>
                Light
              </button>
            </div>
          </div>
        </div>

        {/* Live Device */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Live Device
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Connect to a ThermoWorks RFX Gateway via your MQTT broker.{' '}
            <span style={{ color: 'var(--amber)', fontSize: 12 }}>
              Browser compromise = MQTT credential compromise. Personal use only.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <div>
              <label htmlFor="mqtt-broker-url" style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
                Broker URL
              </label>
              <input
                id="mqtt-broker-url"
                type="text"
                value={mqttConfig.brokerUrl}
                onChange={e => setMqttConfig(c => ({ ...c, brokerUrl: e.target.value }))}
                placeholder="wss://your-cluster.hivemq.cloud:8884/mqtt"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  fontSize: 13, fontFamily: 'var(--mono)' }}
              />
            </div>
            <div>
              <label htmlFor="mqtt-username" style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
                Username
              </label>
              <input
                id="mqtt-username"
                type="text"
                value={mqttConfig.username}
                onChange={e => setMqttConfig(c => ({ ...c, username: e.target.value }))}
                placeholder="pitlogic"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  fontSize: 13 }}
              />
            </div>
            <div>
              <label htmlFor="mqtt-password" style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
                Password
              </label>
              <input
                id="mqtt-password"
                type="password"
                value={mqttConfig.password}
                onChange={e => setMqttConfig(c => ({ ...c, password: e.target.value }))}
                placeholder="••••••••"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  fontSize: 13 }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-ghost" onClick={handleMqttSave}
              style={{ fontSize: 13, padding: '6px 14px' }}>
              {mqttSaved ? 'Saved ✓' : 'Save'}
            </button>
            {mqttStatus === 'connected' ? (
              <button type="button" className="btn-ghost" onClick={onMqttDisconnect}
                aria-label="Disconnect from MQTT broker"
                style={{ fontSize: 13, padding: '6px 14px', color: 'var(--red)', borderColor: 'var(--red)' }}>
                Disconnect
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={onMqttConnect}
                disabled={mqttStatus === 'connecting'}
                aria-label="Connect to MQTT broker"
                style={{ fontSize: 13, padding: '6px 14px' }}>
                {mqttStatus === 'connecting' ? 'Connecting…' : 'Connect'}
              </button>
            )}
            <span style={{ fontSize: 12, color: mqttStatus === 'connected' ? 'var(--green)' :
              mqttStatus === 'error' ? 'var(--red)' : 'var(--text3)' }}
              role="status" aria-live="polite">
              {mqttStatus === 'connected' && '● Connected'}
              {mqttStatus === 'connecting' && '○ Connecting…'}
              {mqttStatus === 'disconnected' && '○ Disconnected'}
              {mqttStatus === 'error' && `✕ ${mqttError ?? 'Error'}`}
            </span>
          </div>
          {liveProbes?.size > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 6 }}>Live Probes</div>
              {[...liveProbes.values()].map(probe => (
                <div key={probe.probeId} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '4px 0', fontSize: 13 }}>
                  <span style={{ color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                    {probe.label}
                  </span>
                  <span style={{
                    color: probeStatusColor(probe.status),
                    fontFamily: 'var(--mono)', fontSize: 13,
                  }}>
                    {probe.lastReading ? `${probe.lastReading.temp.valueF.toFixed(1)}°F` : '—'}
                    {probe.status === 'stale' && ' (stale)'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Backup</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Download all your cooks and recipes as a JSON file.
          </div>
          <button className="btn-primary" onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={15} /> Download backup
          </button>
        </div>

        {/* Import */}
        <div className="card">
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Restore</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Import a backup file. Existing data is preserved by default.
          </div>

          {error && (
            <div role="alert" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {!preview ? (
            <>
              <button className="btn-ghost" onClick={() => fileRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <Upload size={15} /> Choose backup file
              </button>
              <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFile} />
            </>
          ) : (
            <div className="fadein">
              <div style={{ background: 'var(--surface-raised)', borderRadius: 8, padding: '10px 14px',
                fontSize: 13, marginBottom: 12 }}>
                <div style={{ fontFamily: 'var(--mono)', marginBottom: 4 }}>
                  {preview.data.cooks.length} cook{preview.data.cooks.length !== 1 ? 's' : ''}
                  {' '}({preview.newCooks} new, {preview.skipCooks} existing)
                </div>
                <div style={{ fontFamily: 'var(--mono)' }}>
                  {preview.data.recipes.length} recipe{preview.data.recipes.length !== 1 ? 's' : ''}
                  {' '}({preview.newRecipes} new, {preview.skipRecipes} existing)
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  fontSize: 13, marginBottom: 8 }}>
                  <input type="radio" name="import-mode" value="merge"
                    checked={mode === 'merge'} onChange={() => setMode('merge')} />
                  Add new items only
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                  <input type="radio" name="import-mode" value="replace"
                    checked={mode === 'replace'} onChange={() => setMode('replace')} />
                  Replace everything
                </label>
                {mode === 'replace' && (
                  <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 6, marginLeft: 22 }}>
                    This will overwrite all current cooks and recipes.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" onClick={handleImport}>Import</button>
                <button className="btn-ghost" onClick={() => { setPreview(null); setError(null); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
