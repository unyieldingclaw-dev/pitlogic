export interface ConfigEdits {
  channelLabels?: Record<number, string>;
  alarms?: Record<number, { high?: number; low?: number }>;
  transmitIntervalInSeconds?: number;
  recordingIntervalInSeconds?: number;
}

export type DeviceConfigJson = Record<string, unknown>;

interface ChannelJson {
  number: number;
  [key: string]: unknown;
}

/**
 * Merges user edits onto a full vendor DeviceConfig baseline, producing a complete
 * object safe to publish. Unknown top-level fields and unknown per-channel fields
 * are passed through untouched — the RFX SDK replaces the ENTIRE config on publish,
 * so anything dropped here would be silently wiped from the device.
 */
export function mergeDeviceConfig(baseline: DeviceConfigJson, edits: ConfigEdits): DeviceConfigJson {
  const baseChannels: ChannelJson[] = Array.isArray(baseline.channels)
    ? (baseline.channels as ChannelJson[])
    : [];

  const channelNumbers = new Set<number>(baseChannels.map(c => c.number));
  if (edits.channelLabels) {
    for (const num of Object.keys(edits.channelLabels)) channelNumbers.add(Number(num));
  }
  if (edits.alarms) {
    for (const num of Object.keys(edits.alarms)) channelNumbers.add(Number(num));
  }

  const mergedChannels = Array.from(channelNumbers)
    .sort((a, b) => a - b)
    .map(num => {
      const existing = baseChannels.find(c => c.number === num) ?? { number: num };
      const label = edits.channelLabels?.[num];
      const alarmEdit = edits.alarms?.[num];
      const merged: ChannelJson = { ...existing, number: num };
      if (label !== undefined) merged.label = label;
      if (alarmEdit?.high !== undefined) {
        merged.alarmHigh = { ...(existing.alarmHigh as object ?? {}), value: alarmEdit.high };
      }
      if (alarmEdit?.low !== undefined) {
        merged.alarmLow = { ...(existing.alarmLow as object ?? {}), value: alarmEdit.low };
      }
      return merged;
    });

  const merged: DeviceConfigJson = { ...baseline, channels: mergedChannels };
  if (edits.transmitIntervalInSeconds !== undefined) merged.transmitIntervalInSeconds = edits.transmitIntervalInSeconds;
  if (edits.recordingIntervalInSeconds !== undefined) merged.recordingIntervalInSeconds = edits.recordingIntervalInSeconds;
  return merged;
}
