export interface ChannelAlarm {
  high?: number;
  low?: number;
}

/**
 * The narrow, vendor-agnostic subset of a device's full config that PitLogic
 * lets the user edit. Never the raw vendor JSON — see ADR-001.
 */
export interface EditableDeviceConfig {
  /** Keyed by channel number (1-4). */
  channelLabels: Record<number, string>;
  /** Keyed by channel number (1-4). */
  alarms: Record<number, ChannelAlarm>;
  transmitIntervalInSeconds: number | null;
  recordingIntervalInSeconds: number | null;
}

export interface GatewayState {
  gatewayId: string;
  /** Wi-Fi signal strength in percent, per the RFX State Object. */
  wifiStrength: number | null;
  /** Battery status code reported by the gateway (e.g. "C") — the SDK documents this as a string, not a percentage. */
  battery: string | null;
  firmware: string | null;
  /** Defaults to 'F' when the device never reports units. */
  units: 'F' | 'C';
  /** Null until the adapter has seen at least one retained config message for this gateway. */
  editableConfig: EditableDeviceConfig | null;
}
