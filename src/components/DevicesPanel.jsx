import { useRef, useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import DeviceSettingsCard from './DeviceSettingsCard';
import ProbeFreshness from './ProbeFreshness';
import { probeStatusColor } from '../utils/helpers';
import { useDeviceConnectionConfig } from '../hooks/useDeviceConnectionConfig';

function missingMqttConfigField(parsed) {
  if (typeof parsed?.brokerUrl !== 'string') return 'brokerUrl';
  if (typeof parsed?.username !== 'string') return 'username';
  if (typeof parsed?.password !== 'string') return 'password';
  return null;
}


export default function DevicesPanel({ onBack, backLabel = "Back", mqttStatus, mqttError, onMqttConnect, onMqttDisconnect, csvStatus, csvError, onCsvReplay, onCsvReset, liveProbes, deviceState, gatewayHealth = [], onHasConfigBaseline, onUpdateDeviceConfig, onOpenBleWizard }) {
  const { config: mqttConfig, setConfig: setMqttConfig, saveConfig } = useDeviceConnectionConfig();
  const [configError, setConfigError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const busy = submitting || ['connecting', 'connected', 'reconnecting'].includes(mqttStatus);
  const [now, setNow] = useState(() => Date.now());
  const errorRef = useRef(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (configError) errorRef.current?.focus(); }, [configError]);
  const [mqttSaved, setMqttSaved] = useState(false);
  const mqttSavedTimerRef = useRef(null);
  const [mqttCopyState, setMqttCopyState] = useState('idle'); // idle | copied | error
  const mqttCopyTimerRef = useRef(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState(null);
  const [pasteConfirming, setPasteConfirming] = useState(false);

  const handleMqttSave = () => {
    try { saveConfig(mqttConfig); setConfigError(null); }
    catch (error) {
      if (mqttSavedTimerRef.current) clearTimeout(mqttSavedTimerRef.current);
      setMqttSaved(false);
      setConfigError(error.message);
      return false;
    }
    if (mqttSavedTimerRef.current) clearTimeout(mqttSavedTimerRef.current);
    setMqttSaved(true);
    mqttSavedTimerRef.current = setTimeout(() => setMqttSaved(false), 2000);
    return true;
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
    try { saveConfig(next); } catch (error) { setPasteError(error.message); return; }
    setMqttConfig(next);
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

  const handleConnect = async () => {
    if (busy || !handleMqttSave()) return;
    setSubmitting(true);
    try { await onMqttConnect(mqttConfig); }
    catch { setConfigError('Could not connect. Check the address and credentials, then try again.'); }
    finally { setSubmitting(false); }
  };

  const fresh = [...(liveProbes?.values() ?? [])].some(probe => probe.status === 'active' && probe.lastReading?.source === 'live' && now - probe.lastReading.timestamp.capturedAt <= 30000);
  return (
    <section className="fadein devices-panel">
      <h1 className="flow-title">Devices</h1>
      {onBack && <button type="button" className="btn flow-device-link" onClick={onBack}>{backLabel}</button>}
      <p className="flow-help">Use a configured gateway, or expand setup to connect a new gateway to Wi-Fi.</p>
      <details className="flow-options"><summary>Set up a new gateway</summary>
        {/* Set Up New Device */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Set Up New Device
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
            Set up the gateway's Wi-Fi and broker connection over Bluetooth. Then connect PitLogic below.
          </div>
          {typeof navigator !== 'undefined' && 'bluetooth' in navigator ? (
            <button type="button" className="btn-primary" onClick={onOpenBleWizard}
              style={{ fontSize: 13, padding: '6px 14px' }}>
              Set Up Device via Bluetooth
            </button>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              Bluetooth device setup isn't supported in this browser. Use Chrome or Edge on desktop or Android,
              or provision your device with a separate BLE tool, then connect below.
            </div>
          )}
        </div>


      </details>
      <p className="flow-help" role="status">{mqttStatus === 'connected' ? (fresh ? 'Fresh device readings received.' : 'Connected — waiting for fresh device readings.') : 'Connect to check incoming device readings.'}</p>
      <p className="flow-help">Device readings — not recorded in a cook. Log temperatures manually in your cook to save them.</p>
        {/* Live Device */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Connect PitLogic
          </div>
          <p className="flow-help">Use an already configured gateway. Enter your broker's WebSocket address and credentials to receive readings in PitLogic. The gateway's MQTT address is a separate connection.</p>
          {configError && <p ref={errorRef} tabIndex={-1} role="alert" className="flow-error">{configError}</p>}
          <details className="flow-options" open={!busy}>
          <summary>Connection settings</summary>
          {busy && <p className="flow-help">Disconnect before editing these settings.</p>}
          <fieldset disabled={busy} className="connection-fields"><legend className="sr-only">Broker connection settings</legend>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <div>
              <label htmlFor="mqtt-broker-url" style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
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
              <label htmlFor="mqtt-username" style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
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
              <label htmlFor="mqtt-password" style={{ display: 'block', fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>
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
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>Temperature Unit</div>
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

          </fieldset>
          </details>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {mqttStatus === 'connected' || mqttStatus === 'reconnecting' ? (
              <button type="button" className="btn-ghost" onClick={onMqttDisconnect}
                aria-label="Disconnect from MQTT broker"
                style={{ fontSize: 13, padding: '6px 14px', color: 'var(--red)', borderColor: 'var(--red)' }}>
                Disconnect
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={handleConnect}
                disabled={mqttStatus === 'connecting' || submitting}
                aria-label="Save and connect"
                style={{ fontSize: 13, padding: '6px 14px' }}>
                {mqttStatus === 'connecting' || submitting ? 'Connecting…' : 'Save and connect'}
              </button>
            )}
            <span style={{ fontSize: 12, color: mqttStatus === 'connected' ? 'var(--green)' :
              mqttStatus === 'reconnecting' ? 'var(--amber)' :
              mqttStatus === 'error' ? 'var(--red)' : 'var(--text2)' }}
              role="status" aria-live="polite">
              {mqttStatus === 'connected' && '● Connected'}
              {mqttStatus === 'reconnecting' && '○ Reconnecting…'}
              {mqttStatus === 'connecting' && '○ Connecting…'}
              {mqttStatus === 'disconnected' && '○ Disconnected'}
              {mqttStatus === 'error' && `✕ ${mqttError ?? 'Error'}`}
            </span>
          </div>
          {liveProbes?.size > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 6 }}>Probe Readings</div>
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
                    <ProbeFreshness key={`${probe.status}-${probe.lastReading?.timestamp.capturedAt ?? 'none'}`}
                      probe={probe} style={{ display: 'block', fontSize: 11, color: 'var(--text2)', textAlign: 'right' }} />
                  </span>
                </div>
              ))}
            </div>
          )}
          {deviceState?.size > 0 && (
            <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: 8 }}>Device Health</div>
              {[...deviceState.values()].map(device => {
                const alarmingChannels = device.channels?.filter(ch => ch.highAlarming || ch.lowAlarming) ?? [];
                return (
                  <div key={device.deviceId} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
                        {device.deviceId}
                      </span>
                      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text2)' }}>
                        {device.battery != null && (
                          <span style={{ color: device.battery < 20 ? 'var(--red)' : 'var(--text2)' }}>
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


      <details className="flow-options"><summary>Advanced connection tools</summary>
        <p className="flow-help">Browser compromise = MQTT credential compromise. Copied config stays on your clipboard until overwritten. Personal use only.</p>
        <div className="connection-tools">            <button type="button" className="btn-ghost" onClick={handleMqttSave} disabled={busy}
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
              aria-expanded={pasteOpen} disabled={busy}
              aria-label="Paste Live Device config copied from another device"
              style={{ fontSize: 13, padding: '6px 14px' }}>
              Paste config
            </button>
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

        {/* Replay CSV */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
            Replay CSV
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>
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
                  borderRadius: 8, background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>
                Clear
              </button>
            )}
            <span style={{ fontSize: 12,
              color: csvStatus === 'done' ? 'var(--green)' : csvStatus === 'error' ? 'var(--red)' : 'var(--text2)' }}
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
                      <li key={p.probeId} style={{ fontSize: 12, color: p.battery <= 20 ? 'var(--red)' : 'var(--text2)',
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


      </details>
    </section>
  );
}
