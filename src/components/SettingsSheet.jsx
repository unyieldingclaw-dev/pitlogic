import { useRef, useState, useEffect } from 'react';
import { X, Download, Upload } from 'lucide-react';
import { buildExport, parseImport, mergeCooks, triggerDownload } from '../utils/dataPortability';
import DeviceSettingsCard from './DeviceSettingsCard';
import { probeStatusColor } from '../utils/helpers';

function pad2(n) { return String(n).padStart(2, '0'); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function missingMqttConfigField(parsed) {
  if (typeof parsed?.brokerUrl !== 'string') return 'brokerUrl';
  if (typeof parsed?.username !== 'string') return 'username';
  if (typeof parsed?.password !== 'string') return 'password';
  return null;
}

export default function SettingsSheet({ open, onClose, cookState, recipes, onImportCooks, onImportRecipes, prefs, resetCutPref, setTheme, mqttStatus, mqttError, onMqttConnect, onMqttDisconnect, csvStatus, csvError, onCsvReplay, onCsvReset, liveProbes, deviceState, gatewayHealth = [], onHasConfigBaseline, onUpdateDeviceConfig, onOpenBleWizard }) {
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState('merge');
  const [error, setError] = useState(null);
  const [mqttConfig, setMqttConfig] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pitlogic-mqtt-v1') ?? 'null') ?? {};
      return {
        brokerUrl: stored.brokerUrl ?? '',
        username: stored.username ?? '',
        password: stored.password ?? '',
        unit: stored.unit ?? 'F',
      };
    } catch {
      return { brokerUrl: '', username: '', password: '', unit: 'F' };
    }
  });
  const [mqttSaved, setMqttSaved] = useState(false);
  const mqttSavedTimerRef = useRef(null);
  const [mqttCopyState, setMqttCopyState] = useState('idle'); // idle | copied | error
  const mqttCopyTimerRef = useRef(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState(null);
  const [pasteConfirming, setPasteConfirming] = useState(false);

  const handleMqttSave = () => {
    localStorage.setItem('pitlogic-mqtt-v1', JSON.stringify(mqttConfig));
    if (mqttSavedTimerRef.current) clearTimeout(mqttSavedTimerRef.current);
    setMqttSaved(true);
    mqttSavedTimerRef.current = setTimeout(() => setMqttSaved(false), 2000);
  };

  const handleMqttCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(mqttConfig));
      setMqttCopyState('copied');
    } catch {
      setMqttCopyState('error');
    }
    if (mqttCopyTimerRef.current) clearTimeout(mqttCopyTimerRef.current);
    mqttCopyTimerRef.current = setTimeout(() => setMqttCopyState('idle'), 2000);
  };

  const handleMqttPasteApply = () => {
    let parsed;
    try {
      parsed = JSON.parse(pasteText);
    } catch {
      setPasteError('Invalid JSON');
      return;
    }
    const missingField = missingMqttConfigField(parsed);
    if (missingField) {
      setPasteError(`Missing or invalid "${missingField}" field`);
      return;
    }
    const hasExistingConfig = Boolean(mqttConfig.brokerUrl || mqttConfig.username || mqttConfig.password);
    if (hasExistingConfig && !pasteConfirming) {
      setPasteError(null);
      setPasteConfirming(true);
      return;
    }
    const next = {
      brokerUrl: parsed.brokerUrl,
      username: parsed.username,
      password: parsed.password,
      unit: parsed.unit === 'C' ? 'C' : 'F',
    };
    setMqttConfig(next);
    localStorage.setItem('pitlogic-mqtt-v1', JSON.stringify(next));
    setPasteError(null);
    setPasteText('');
    setPasteOpen(false);
    setPasteConfirming(false);
    if (mqttSavedTimerRef.current) clearTimeout(mqttSavedTimerRef.current);
    setMqttSaved(true);
    mqttSavedTimerRef.current = setTimeout(() => setMqttSaved(false), 2000);
  };

  useEffect(() => {
    return () => {
      // Cancel pending "Saved ✓" / "Copied ✓" flash timers to avoid setState after unmount
      if (mqttSavedTimerRef.current) clearTimeout(mqttSavedTimerRef.current);
      if (mqttCopyTimerRef.current) clearTimeout(mqttCopyTimerRef.current);
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
      const { added: newCooks, skipped: skipCooks } = mergeCooks(cookState.cooks, result.data.cooks);
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
        justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="fadein" style={{ background: 'var(--surface)', borderRadius: '16px 16px 0 0',
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

        {/* Set Up New Device */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Set Up New Device
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Provision a new RFX device's WiFi and MQTT settings over Bluetooth.
          </div>
          {typeof navigator !== 'undefined' && 'bluetooth' in navigator ? (
            <button type="button" className="btn-primary" onClick={onOpenBleWizard}
              style={{ fontSize: 13, padding: '6px 14px' }}>
              Set Up Device via Bluetooth
            </button>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>
              Bluetooth device setup isn't supported in this browser. Use Chrome or Edge on desktop or Android,
              or provision your device with a separate BLE tool, then connect below.
            </div>
          )}
        </div>

        {/* Live Device */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Live Device
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Connect to a ThermoWorks RFX Gateway via your MQTT broker.{' '}
            <span style={{ color: 'var(--amber)', fontSize: 12 }}>
              Browser compromise = MQTT credential compromise. Copied config stays on your clipboard until overwritten. Personal use only.
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
              {mqttConfig.brokerUrl && /^(ws|mqtt):\/\//i.test(mqttConfig.brokerUrl) && (
                <div role="alert" style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>
                  Non-TLS URL — credentials will be sent in plaintext. Use wss:// or mqtts://.
                </div>
              )}
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
            <div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>Temperature Unit</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  aria-pressed={mqttConfig.unit !== 'C'}
                  className={mqttConfig.unit !== 'C' ? 'btn-primary' : 'btn-ghost'}
                  style={{ fontSize: 13, padding: '5px 16px' }}
                  onClick={() => setMqttConfig(c => ({ ...c, unit: 'F' }))}>
                  °F
                </button>
                <button
                  type="button"
                  aria-pressed={mqttConfig.unit === 'C'}
                  className={mqttConfig.unit === 'C' ? 'btn-primary' : 'btn-ghost'}
                  style={{ fontSize: 13, padding: '5px 16px' }}
                  onClick={() => setMqttConfig(c => ({ ...c, unit: 'C' }))}>
                  °C
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-ghost" onClick={handleMqttSave}
              style={{ fontSize: 13, padding: '6px 14px' }}>
              {mqttSaved ? 'Saved ✓' : 'Save'}
            </button>
            <button type="button" className="btn-ghost" onClick={handleMqttCopy}
              aria-label="Copy Live Device config to clipboard, to paste on another device"
              style={{ fontSize: 13, padding: '6px 14px' }}>
              {mqttCopyState === 'copied' ? 'Copied ✓' : mqttCopyState === 'error' ? 'Copy failed' : 'Copy config'}
            </button>
            <button type="button" className="btn-ghost"
              onClick={() => { setPasteOpen(o => !o); setPasteError(null); setPasteConfirming(false); }}
              aria-expanded={pasteOpen}
              aria-label="Paste Live Device config copied from another device"
              style={{ fontSize: 13, padding: '6px 14px' }}>
              Paste config
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
          {pasteOpen && (
            <div className="fadein" style={{ marginTop: 10 }}>
              <textarea
                value={pasteText}
                onChange={e => { setPasteText(e.target.value); setPasteConfirming(false); }}
                placeholder="Paste config copied from another device here"
                rows={3}
                aria-label="Pasted Live Device config JSON"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                  fontSize: 12, fontFamily: 'var(--mono)', resize: 'vertical' }}
              />
              {pasteError && (
                <div role="alert" style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{pasteError}</div>
              )}
              {pasteConfirming && (
                <div role="alert" style={{ fontSize: 12, color: 'var(--amber)', marginTop: 4 }}>
                  This will overwrite your current Live Device config. Click Confirm overwrite to proceed.
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" className="btn-primary" onClick={handleMqttPasteApply}
                  style={{ fontSize: 13, padding: '6px 14px' }}>
                  {pasteConfirming ? 'Confirm overwrite' : 'Apply & Save'}
                </button>
                <button type="button" className="btn-ghost"
                  onClick={() => { setPasteOpen(false); setPasteText(''); setPasteError(null); setPasteConfirming(false); }}
                  style={{ fontSize: 13, padding: '6px 14px' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
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
          {deviceState?.size > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 8 }}>Device Health</div>
              {[...deviceState.values()].map(device => {
                const alarmingChannels = device.channels?.filter(ch => ch.highAlarming || ch.lowAlarming) ?? [];
                return (
                  <div key={device.deviceId} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                        {device.deviceId}
                      </span>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text3)' }}>
                        {device.battery != null && (
                          <span style={{ color: device.battery < 20 ? 'var(--red)' : 'var(--text3)' }}>
                            Bat {device.battery}%
                          </span>
                        )}
                        {device.wifiStrength != null && (
                          <span>WiFi {device.wifiStrength}</span>
                        )}
                        {device.firmware && (
                          <span>v{device.firmware}</span>
                        )}
                      </div>
                    </div>
                    {alarmingChannels.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>
                        {alarmingChannels.map(ch => (
                          <span key={String(ch.number)}>
                            {ch.label || `Ch ${ch.number}`}: {ch.highAlarming ? 'HIGH' : 'LOW'}{' '}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Replay CSV */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Replay CSV
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
            Load a ThermoWorks temperature CSV to display it in the Live Readings card.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', fontSize: 13, cursor: 'pointer',
              border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text2)',
              background: 'transparent' }}>
              <Upload size={14} /> Choose CSV
              <input
                type="file"
                accept=".csv,.txt"
                aria-label="Choose CSV file to replay"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) { onCsvReplay(e.target.files[0]); e.target.value = ''; } }}
              />
            </label>
            {csvStatus === 'done' && (
              <button type="button" onClick={onCsvReset}
                aria-label="Clear replayed CSV data"
                style={{ fontSize: 13, padding: '6px 14px', border: '1px solid var(--border)',
                  borderRadius: 8, background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
                Clear
              </button>
            )}
            <span style={{ fontSize: 12,
              color: csvStatus === 'done' ? 'var(--green)' : csvStatus === 'error' ? 'var(--red)' : 'var(--text3)' }}
              role="status" aria-live="polite">
              {csvStatus === 'replaying' && '○ Loading…'}
              {csvStatus === 'done' && '● Loaded'}
              {csvStatus === 'error' && `✕ ${csvError ?? 'Parse failed'}`}
            </span>
          </div>
        </div>

        {/* Device Health */}
        {gatewayHealth.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Device Health
            </div>
            {gatewayHealth.map(gw => (
              <div key={gw.gatewayId} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)', marginBottom: 4 }}>
                  {gw.gatewayId}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
                  {gw.wifiStrength != null && <span>Wi-Fi {gw.wifiStrength}%</span>}
                  {gw.battery != null && <span>Battery {gw.battery}</span>}
                  {gw.firmware != null && <span>Firmware {gw.firmware}</span>}
                </div>
                {gw.unitMismatch && (
                  <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 6 }}>
                    This device is reporting Celsius readings, but PitLogic displays °F. Values shown may not match what you expect.
                  </div>
                )}
                {gw.probes.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {gw.probes.map(p => (
                      <li key={p.probeId} style={{ fontSize: 12, color: p.battery <= 20 ? 'var(--red)' : 'var(--text3)',
                        fontWeight: p.battery <= 20 ? 600 : 400, fontFamily: 'var(--mono)' }}>
                        {p.probeId}: {p.battery}%{p.battery <= 20 ? ' (Low)' : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Device Settings */}
        {gatewayHealth.map(gw => (
          <DeviceSettingsCard
            // Re-key on the config content, not just gatewayId: DeviceSettingsCard's form state
            // is initialized once at mount, so a retained config update arriving while Settings
            // stays open (e.g. the device echoing back the user's own save) would otherwise never
            // reach the form. Remounting on genuine content change re-syncs the displayed baseline.
            key={`${gw.gatewayId}:${JSON.stringify(gw.editableConfig)}`}
            gw={gw}
            hasConfigBaseline={onHasConfigBaseline}
            onUpdateDeviceConfig={onUpdateDeviceConfig}
          />
        ))}

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
