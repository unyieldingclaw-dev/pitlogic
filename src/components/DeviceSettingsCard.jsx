import { useState } from 'react';

const CHANNEL_NUMBERS = [1, 2, 3, 4];

function buildInitialFormState(editableConfig) {
  const channelLabels = {};
  const alarms = {};
  for (const num of CHANNEL_NUMBERS) {
    channelLabels[num] = editableConfig?.channelLabels?.[num] ?? '';
    alarms[num] = {
      high: editableConfig?.alarms?.[num]?.high != null ? String(editableConfig.alarms[num].high) : '',
      low: editableConfig?.alarms?.[num]?.low != null ? String(editableConfig.alarms[num].low) : '',
    };
  }
  return {
    channelLabels,
    alarms,
    transmitIntervalInSeconds: editableConfig?.transmitIntervalInSeconds != null
      ? String(editableConfig.transmitIntervalInSeconds) : '',
    recordingIntervalInSeconds: editableConfig?.recordingIntervalInSeconds != null
      ? String(editableConfig.recordingIntervalInSeconds) : '',
  };
}

// Number('') is 0, not NaN — callers must skip blank strings before calling this.
// A non-numeric committed value (stray "-"/"."/paste, unenforced in jsdom) must not
// silently become NaN (which JSON.stringify serializes to null) in the MQTT payload.
function parseNumberOrUndefined(str) {
  const n = Number(str);
  return Number.isNaN(n) ? undefined : n;
}

function buildEdits(formState) {
  const channelLabels = {};
  const alarms = {};
  for (const num of CHANNEL_NUMBERS) {
    const label = formState.channelLabels[num].trim();
    if (label !== '') channelLabels[num] = label;

    const high = formState.alarms[num].high.trim();
    const low = formState.alarms[num].low.trim();
    const entry = {};
    const highNum = high !== '' ? parseNumberOrUndefined(high) : undefined;
    const lowNum = low !== '' ? parseNumberOrUndefined(low) : undefined;
    if (highNum !== undefined) entry.high = highNum;
    if (lowNum !== undefined) entry.low = lowNum;
    if (Object.keys(entry).length > 0) alarms[num] = entry;
  }
  const edits = { channelLabels, alarms };
  const transmit = formState.transmitIntervalInSeconds.trim();
  const recording = formState.recordingIntervalInSeconds.trim();
  const transmitNum = transmit !== '' ? parseNumberOrUndefined(transmit) : undefined;
  const recordingNum = recording !== '' ? parseNumberOrUndefined(recording) : undefined;
  if (transmitNum !== undefined) edits.transmitIntervalInSeconds = transmitNum;
  if (recordingNum !== undefined) edits.recordingIntervalInSeconds = recordingNum;
  return edits;
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12,
};
const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text3)', marginBottom: 2 };

export default function DeviceSettingsCard({ gw, hasConfigBaseline, onUpdateDeviceConfig }) {
  const [formState, setFormState] = useState(() => buildInitialFormState(gw.editableConfig));
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' });

  const setChannelLabel = (num, value) => {
    setFormState(s => ({ ...s, channelLabels: { ...s.channelLabels, [num]: value } }));
  };
  const setAlarm = (num, key, value) => {
    setFormState(s => ({ ...s, alarms: { ...s.alarms, [num]: { ...s.alarms[num], [key]: value } } }));
  };

  const handleSave = async () => {
    setSaveState({ status: 'saving', message: '' });
    try {
      await onUpdateDeviceConfig(gw.gatewayId, buildEdits(formState));
      setSaveState({ status: 'saved', message: 'Settings sent — device applies on next check-in.' });
    } catch (err) {
      setSaveState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to send settings.' });
    }
  };

  const initializing = !hasConfigBaseline(gw.gatewayId);

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
        {initializing ? 'Initialize Configuration' : 'Device Settings'}
      </div>
      <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)', marginBottom: 8 }}>
        {gw.gatewayId}
      </div>
      {initializing && (
        <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 8 }}>
          No configuration has been seen from this device yet. Fields below are pre-filled from the last known
          settings on this device, if any.
        </div>
      )}

      {CHANNEL_NUMBERS.map(num => (
        <div key={num} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 120px' }}>
            <label htmlFor={`ch-${gw.gatewayId}-${num}-label`} style={labelStyle}>Channel {num} Label</label>
            <input id={`ch-${gw.gatewayId}-${num}-label`} type="text" style={inputStyle}
              value={formState.channelLabels[num]}
              onChange={e => setChannelLabel(num, e.target.value)} />
          </div>
          <div style={{ flex: '1 1 70px' }}>
            <label htmlFor={`ch-${gw.gatewayId}-${num}-high`} style={labelStyle}>Channel {num} High Alarm</label>
            <input id={`ch-${gw.gatewayId}-${num}-high`} type="number" style={inputStyle}
              value={formState.alarms[num].high}
              onChange={e => setAlarm(num, 'high', e.target.value)} />
          </div>
          <div style={{ flex: '1 1 70px' }}>
            <label htmlFor={`ch-${gw.gatewayId}-${num}-low`} style={labelStyle}>Channel {num} Low Alarm</label>
            <input id={`ch-${gw.gatewayId}-${num}-low`} type="number" style={inputStyle}
              value={formState.alarms[num].low}
              onChange={e => setAlarm(num, 'low', e.target.value)} />
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 120px' }}>
          <label htmlFor={`transmit-${gw.gatewayId}`} style={labelStyle}>Transmit Interval (sec)</label>
          <input id={`transmit-${gw.gatewayId}`} type="number" style={inputStyle}
            value={formState.transmitIntervalInSeconds}
            onChange={e => setFormState(s => ({ ...s, transmitIntervalInSeconds: e.target.value }))} />
        </div>
        <div style={{ flex: '1 1 120px' }}>
          <label htmlFor={`recording-${gw.gatewayId}`} style={labelStyle}>Recording Interval (sec)</label>
          <input id={`recording-${gw.gatewayId}`} type="number" style={inputStyle}
            value={formState.recordingIntervalInSeconds}
            onChange={e => setFormState(s => ({ ...s, recordingIntervalInSeconds: e.target.value }))} />
        </div>
      </div>

      <button type="button" className="btn-primary" onClick={handleSave}
        disabled={saveState.status === 'saving'} style={{ fontSize: 13, padding: '6px 14px' }}>
        {saveState.status === 'saving' ? 'Saving…' : 'Save'}
      </button>

      {saveState.status === 'saved' && (
        <div role="status" style={{ fontSize: 12, color: 'var(--green)', marginTop: 8 }}>{saveState.message}</div>
      )}
      {saveState.status === 'error' && (
        <div role="alert" style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{saveState.message}</div>
      )}
    </div>
  );
}
