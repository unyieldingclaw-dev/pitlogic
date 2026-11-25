import { describe, it, expect } from 'vitest';
import { mergeDeviceConfig } from '../deviceConfigMerge.js';

describe('mergeDeviceConfig', () => {
  it('sets a channel label onto an existing channel, preserving its other fields', () => {
    const baseline = {
      label: 'My Device',
      channels: [{ number: 1, label: 'Old Label', enabled: true, units: 'F' }],
    };
    const merged = mergeDeviceConfig(baseline, { channelLabels: { 1: 'Brisket' } });
    expect(merged).toEqual({
      label: 'My Device',
      channels: [{ number: 1, label: 'Brisket', enabled: true, units: 'F' }],
    });
  });

  it('sets alarm high/low values, preserving other alarm sub-fields', () => {
    const baseline = {
      channels: [{ number: 1, alarmHigh: { value: 200, units: 'F', enabled: true, muted: false } }],
    };
    const merged = mergeDeviceConfig(baseline, { alarms: { 1: { high: 225 } } });
    expect(merged.channels[0].alarmHigh).toEqual({ value: 225, units: 'F', enabled: true, muted: false });
  });

  it('adds a new channel entry when editing a channel absent from the baseline', () => {
    const baseline = { channels: [{ number: 1, label: 'Brisket' }] };
    const merged = mergeDeviceConfig(baseline, { channelLabels: { 2: 'Ribs' } });
    expect(merged.channels).toEqual([
      { number: 1, label: 'Brisket' },
      { number: 2, label: 'Ribs' },
    ]);
  });

  it('sets transmit and recording intervals', () => {
    const baseline = { transmitIntervalInSeconds: 60, recordingIntervalInSeconds: 60 };
    const merged = mergeDeviceConfig(baseline, { transmitIntervalInSeconds: 30 });
    expect(merged.transmitIntervalInSeconds).toBe(30);
    expect(merged.recordingIntervalInSeconds).toBe(60);
  });

  it('passes through unknown top-level fields untouched', () => {
    const baseline = { fan: { setTemp: 225 }, rfxDeviceConfigs: [{ id: 'p1', readInterval: 60 }] };
    const merged = mergeDeviceConfig(baseline, { channelLabels: { 1: 'Brisket' } });
    expect(merged.fan).toEqual({ setTemp: 225 });
    expect(merged.rfxDeviceConfigs).toEqual([{ id: 'p1', readInterval: 60 }]);
  });

  it('starts from an empty object when the baseline has no channels at all', () => {
    const merged = mergeDeviceConfig({}, { channelLabels: { 1: 'Brisket' }, alarms: { 1: { high: 200, low: 50 } } });
    expect(merged.channels).toEqual([
      { number: 1, label: 'Brisket', alarmHigh: { value: 200 }, alarmLow: { value: 50 } },
    ]);
  });

  it('applies edits to no channels when edits has no channelLabels or alarms', () => {
    const baseline = { channels: [{ number: 1, label: 'Brisket' }] };
    const merged = mergeDeviceConfig(baseline, {});
    expect(merged.channels).toEqual([{ number: 1, label: 'Brisket' }]);
  });
});
