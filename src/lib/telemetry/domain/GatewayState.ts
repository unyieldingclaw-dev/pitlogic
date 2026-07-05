export interface GatewayState {
  gatewayId: string;
  /** Wi-Fi signal strength in percent, per the RFX State Object. */
  wifiStrength: number | null;
  /** Battery status code reported by the gateway (e.g. "C") — the SDK documents this as a string, not a percentage. */
  battery: string | null;
  firmware: string | null;
  /** Defaults to 'F' when the device never reports units. */
  units: 'F' | 'C';
}
