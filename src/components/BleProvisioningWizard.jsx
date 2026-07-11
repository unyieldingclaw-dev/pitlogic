import { useState } from 'react';
import { X } from 'lucide-react';
import { useBleProvisioning } from '../hooks/useBleProvisioning.js';

const STORAGE_KEY = 'pitlogic-mqtt-v1';

/**
 * Best-effort convenience prefill only. The device connects over raw MQTT/MQTTS
 * (TCP), while PitLogic's own browser tab connects over WSS (WebSocket) to the
 * same broker — schemes and ports commonly differ between the two and one can't
 * be reliably derived from the other. Username/password are transport-independent
 * and copy over exactly; URL/port are a starting guess the user should verify.
 */
function deriveMqttFieldsFromStoredConfig() {
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    stored = null;
  }
  let host;
  try {
    host = new URL(stored?.brokerUrl ?? '').hostname;
  } catch {
    host = '';
  }
  return {
    mqttBrokerUrl: host ? `mqtts://${host}` : '',
    mqttBrokerPort: '8883',
    mqttUsername: stored?.username ?? '',
    mqttPassword: stored?.password ?? '',
  };
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
};
const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 4 };

export default function BleProvisioningWizard({ open, onClose }) {
  const [phase, setPhase] = useState('idle'); // idle | connecting | form | provisioning | success | error
  const provisioner = useBleProvisioning();
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [networks, setNetworks] = useState([]);
  const [statusLog, setStatusLog] = useState([]);
  const [form, setForm] = useState({ wifiSsid: '', wifiPassword: '', ...deriveMqttFieldsFromStoredConfig() });

  if (!open) return null;

  const handleScan = async () => {
    setPhase('connecting');
    setErrorMessage('');
    try {
      const info = await provisioner.connect();
      setDeviceInfo(info);
      setForm({ wifiSsid: '', wifiPassword: '', ...deriveMqttFieldsFromStoredConfig() });
      setPhase('form');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to connect to device.');
      setPhase('error');
    }
  };

  const handleScanNetworks = async () => {
    setNetworks([]);
    await provisioner.scanWifiNetworks(network => {
      setNetworks(prev => [...prev, network]);
    });
  };

  const handleProvision = async () => {
    setPhase('provisioning');
    setStatusLog([]);
    try {
      await provisioner.provision(form, event => {
        setStatusLog(prev => [...prev, statusEventToLogLine(event)]);
      });
      setPhase('success');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to provision device.');
      setPhase('error');
    }
  };

  const handleClose = () => {
    provisioner.disconnect();
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Set up device via Bluetooth"
      style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="fadein" style={{ background: 'var(--surface)', borderRadius: '16px 16px 0 0',
        width: '100%', maxWidth: 480, padding: '1.5rem', paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
        maxHeight: '85vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>Set Up Device</div>
          <button aria-label="Close" className="btn-ghost" style={{ padding: '6px', borderRadius: 8 }} onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {phase === 'idle' && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>
              Hold the device's START button for 5–10 seconds until its display reads SETUPMODE, then scan.
            </div>
            <button className="btn-primary" onClick={handleScan} style={{ fontSize: 13, padding: '8px 16px' }}>
              Scan for Device
            </button>
          </div>
        )}

        {phase === 'connecting' && (
          <div style={{ fontSize: 13, color: 'var(--text2)' }} role="status" aria-live="polite">
            Connecting…
          </div>
        )}

        {phase === 'error' && (
          <div>
            <div role="alert" style={{ fontSize: 13, color: 'var(--red)', marginBottom: 16 }}>{errorMessage}</div>
            <button className="btn-primary" onClick={handleScan} style={{ fontSize: 13, padding: '8px 16px' }}>
              Try Again
            </button>
          </div>
        )}

        {(phase === 'form' || phase === 'provisioning') && deviceInfo && (
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, fontFamily: 'var(--mono)' }}>
              Connected to {deviceInfo.model} · Serial {deviceInfo.serial} · Firmware {deviceInfo.firmware} · Battery {deviceInfo.battery}%
            </div>

            <div style={{ marginBottom: 10 }}>
              <label htmlFor="ble-wifi-ssid" style={labelStyle}>WiFi SSID</label>
              <input id="ble-wifi-ssid" type="text" style={inputStyle}
                value={form.wifiSsid} onChange={e => setForm(f => ({ ...f, wifiSsid: e.target.value }))} />
              <button type="button" className="btn-ghost" onClick={handleScanNetworks}
                style={{ fontSize: 12, padding: '4px 10px', marginTop: 6 }}>
                Scan for networks
              </button>
              {networks.length > 0 && (
                <select aria-label="Discovered networks" style={{ ...inputStyle, marginTop: 6 }}
                  onChange={e => setForm(f => ({ ...f, wifiSsid: e.target.value }))} defaultValue="">
                  <option value="" disabled>Select a network…</option>
                  {networks.map(n => (
                    <option key={n.ssid} value={n.ssid}>{n.ssid} ({n.rssi} dBm, {n.authMode})</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ marginBottom: 10 }}>
              <label htmlFor="ble-wifi-password" style={labelStyle}>WiFi Password</label>
              <input id="ble-wifi-password" type="password" style={inputStyle}
                value={form.wifiPassword} onChange={e => setForm(f => ({ ...f, wifiPassword: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label htmlFor="ble-mqtt-url" style={labelStyle}>MQTT Broker URL</label>
              <input id="ble-mqtt-url" type="text" style={inputStyle}
                value={form.mqttBrokerUrl} onChange={e => setForm(f => ({ ...f, mqttBrokerUrl: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label htmlFor="ble-mqtt-port" style={labelStyle}>MQTT Broker Port</label>
              <input id="ble-mqtt-port" type="text" style={inputStyle}
                value={form.mqttBrokerPort} onChange={e => setForm(f => ({ ...f, mqttBrokerPort: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <label htmlFor="ble-mqtt-username" style={labelStyle}>MQTT Username</label>
              <input id="ble-mqtt-username" type="text" style={inputStyle}
                value={form.mqttUsername} onChange={e => setForm(f => ({ ...f, mqttUsername: e.target.value }))} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label htmlFor="ble-mqtt-password" style={labelStyle}>MQTT Password</label>
              <input id="ble-mqtt-password" type="password" style={inputStyle}
                value={form.mqttPassword} onChange={e => setForm(f => ({ ...f, mqttPassword: e.target.value }))} />
            </div>

            <button className="btn-primary" onClick={handleProvision} disabled={phase === 'provisioning'}
              style={{ fontSize: 13, padding: '8px 16px' }}>
              {phase === 'provisioning' ? 'Provisioning…' : 'Provision Device'}
            </button>
          </div>
        )}

        {phase === 'success' && deviceInfo && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Device provisioned!</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, fontFamily: 'var(--mono)' }}>
              Serial {deviceInfo.serial}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Once it connects, use the Live Device section in Settings to connect PitLogic to the same broker —
              from there you can edit channel labels and alarms in Device Settings.
            </div>
          </div>
        )}

        {/* Status log persists across the provisioning -> success transition: a status
            event (e.g. a wifi-error) can arrive and the provision() promise can still
            resolve normally afterward, so the log needs to stay visible on the success
            screen rather than being scoped to the provisioning phase only. */}
        {(phase === 'provisioning' || phase === 'success') && statusLog.length > 0 && (
          <ul role="log" aria-live="polite" style={{ listStyle: 'none', padding: 0, marginTop: 16,
            display: 'flex', flexDirection: 'column', gap: 4 }}>
            {statusLog.map((line, i) => (
              <li key={i} style={{ fontSize: 12, color: line.isError ? 'var(--red)' : 'var(--text2)' }}>
                {line.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function statusEventToLogLine(event) {
  switch (event.type) {
    case 'wifi': return { text: event.connected ? 'WiFi connected ✓' : 'WiFi disconnected', isError: false };
    case 'mqtt': return { text: event.connected ? 'MQTT connected ✓' : 'MQTT disconnected', isError: false };
    case 'wifi-error': return { text: `WiFi error: ${event.message}`, isError: true };
    case 'mqtt-error': return { text: `MQTT error: ${event.message}`, isError: true };
    default: return { text: 'Unknown status', isError: false };
  }
}
