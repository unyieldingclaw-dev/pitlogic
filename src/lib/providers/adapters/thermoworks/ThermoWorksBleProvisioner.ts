/**
 * ThermoWorks BLE provisioning — ThermaConnect open BLE GATT protocol.
 *
 * COMPLIANCE NOTICE (ADR-003): All 8 questions answered "no" for this implementation.
 * Uses the standard, documented BLE GATT characteristics via the browser's native
 * Web Bluetooth API — no reverse engineering, no decompilation, no proprietary SDK.
 *
 * PROHIBITED in this file:
 * - Accessing localStorage, domain state, or UI state
 * - Emitting telemetry events (this is a one-shot write flow, not a data stream —
 *   it does not implement TemperatureProvider and never touches the event bus)
 */

const SERVICE_DEVICE_INFO = 0x180a;
const SERVICE_BATTERY = 0x180f;
const SERVICE_WIFI_IOT = '00010074-6865-726d-6f77-6f726b730d0a';

const CHAR_SERIAL_NUMBER = 0x2a25;
const CHAR_FIRMWARE_REVISION = 0x2a26;
const CHAR_BATTERY_LEVEL = 0x2a19;

export const CHAR_WIFI_SSID = '00010174-6865-726d-6f77-6f726b730d0a';
export const CHAR_WIFI_PASSWORD = '00010274-6865-726d-6f77-6f726b730d0a';
export const CHAR_WIFI_STATUS = '00010474-6865-726d-6f77-6f726b730d0a';
export const CHAR_WIFI_ERROR = '00010574-6865-726d-6f77-6f726b730d0a';
export const CHAR_MQTT_STATUS = '00010674-6865-726d-6f77-6f726b730d0a';
export const CHAR_MQTT_ERROR = '00010774-6865-726d-6f77-6f726b730d0a';
export const CHAR_COMMANDS = '00010874-6865-726d-6f77-6f726b730d0a';
export const CHAR_MQTT_URL = '00010d74-6865-726d-6f77-6f726b730d0a';
export const CHAR_MQTT_PORT = '00010e74-6865-726d-6f77-6f726b730d0a';
export const CHAR_MQTT_USERNAME = '00010f74-6865-726d-6f77-6f726b730d0a';
export const CHAR_MQTT_PASSWORD = '00011074-6865-726d-6f77-6f726b730d0a';
export const CHAR_MQTT_CA_CERT = '00011174-6865-726d-6f77-6f726b730d0a';
export const CHAR_MQTT_CLIENT_CERT = '00011274-6865-726d-6f77-6f726b730d0a';
export const CHAR_MQTT_CLIENT_KEY = '00011374-6865-726d-6f77-6f726b730d0a';

/**
 * The Wifi/IoT Information Service (custom ThermoWorks service, all UUIDs above
 * prefixed 0001*74) is entirely string-encoded — including the 1-byte-length
 * Wifi/MQTT Connection Status characteristics ("0"/"1" as ASCII text, not a raw
 * byte). This is confirmed by the sibling Error characteristics in the same
 * service, whose codes (e.g. 12298, 12299) exceed a single byte's range and must
 * be decimal-string text. Battery Level (0x2A19) is a DIFFERENT, standard
 * Bluetooth SIG service (0x180F) with its own spec-mandated raw-byte encoding —
 * do not apply string decoding there.
 */
export function decodeText(value: DataView): string {
  return new TextDecoder().decode(value.buffer);
}

export function encodeText(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export interface DeviceInfo {
  model: string;
  serial: string;
  firmware: string;
  battery: number;
}

export class ThermoWorksBleProvisioner {
  private server: BluetoothRemoteGATTServer | null = null;
  private wifiIotService: BluetoothRemoteGATTService | null = null;

  async connect(): Promise<DeviceInfo> {
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'NODE' },
        { manufacturerData: [{ companyIdentifier: 0x0b11 }] },
      ],
      optionalServices: [SERVICE_DEVICE_INFO, SERVICE_BATTERY, SERVICE_WIFI_IOT],
    });

    if (!device.gatt) throw new Error('Device does not support GATT');
    const server = await device.gatt.connect();
    this.server = server;

    const deviceInfoService = await server.getPrimaryService(SERVICE_DEVICE_INFO);
    const batteryService = await server.getPrimaryService(SERVICE_BATTERY);
    this.wifiIotService = await server.getPrimaryService(SERVICE_WIFI_IOT);

    const [serialChar, firmwareChar, batteryChar] = await Promise.all([
      deviceInfoService.getCharacteristic(CHAR_SERIAL_NUMBER),
      deviceInfoService.getCharacteristic(CHAR_FIRMWARE_REVISION),
      batteryService.getCharacteristic(CHAR_BATTERY_LEVEL),
    ]);

    const [serialValue, firmwareValue, batteryValue] = await Promise.all([
      serialChar.readValue(),
      firmwareChar.readValue(),
      batteryChar.readValue(),
    ]);

    return {
      // Model Number (0x2A24) is Write-only per the protocol docs — the BLE-advertised
      // device name is the documented source for model identification instead.
      model: device.name ?? 'Unknown device',
      serial: decodeText(serialValue),
      firmware: decodeText(firmwareValue),
      battery: batteryValue.getUint8(0),
    };
  }

  disconnect(): void {
    this.server?.disconnect();
    this.server = null;
    this.wifiIotService = null;
  }
}
