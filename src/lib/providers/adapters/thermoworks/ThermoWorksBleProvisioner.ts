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

export interface WifiNetwork {
  authMode: string;
  rssi: number;
  ssid: string;
}

export interface ProvisioningFields {
  wifiSsid: string;
  wifiPassword: string;
  mqttBrokerUrl: string;
  mqttBrokerPort: string;
  mqttUsername: string;
  mqttPassword: string;
}

export type ProvisioningStatusEvent =
  | { type: 'wifi'; connected: boolean }
  | { type: 'wifi-error'; code: number; message: string }
  | { type: 'mqtt'; connected: boolean }
  | { type: 'mqtt-error'; code: number; message: string };

const WIFI_ERROR_MESSAGES: Record<number, string> = {
  12298: 'WiFi network not found',
  12299: 'WiFi password rejected',
  12300: 'Connection timed out',
};

const MQTT_ERROR_MESSAGES: Record<number, string> = {
  1: 'Broker unreachable',
  2: 'Broker refused connection',
  3: 'Subscription failed',
};

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

  async scanWifiNetworks(onNetwork: (network: WifiNetwork) => void, scanDurationMs = 5000): Promise<void> {
    if (!this.wifiIotService) throw new Error('Not connected');
    const commandsChar = await this.wifiIotService.getCharacteristic(CHAR_COMMANDS);

    const handleNotification = (event: BluetoothCharacteristicChangedEvent) => {
      if (!event.target.value) return;
      const raw = decodeText(event.target.value);
      const [authMode, rssiStr, ssid] = raw.split(',');
      if (!ssid) return;
      onNetwork({ authMode: authMode ?? '', rssi: Number(rssiStr), ssid });
    };

    await commandsChar.startNotifications();
    commandsChar.addEventListener('characteristicvaluechanged', handleNotification);

    await commandsChar.writeValue(encodeText('SCAN'));
    await new Promise(resolve => setTimeout(resolve, scanDurationMs));

    commandsChar.removeEventListener('characteristicvaluechanged', handleNotification);
  }

  async provision(fields: ProvisioningFields, onStatus: (event: ProvisioningStatusEvent) => void): Promise<void> {
    if (!this.wifiIotService) throw new Error('Not connected');
    const svc = this.wifiIotService;

    const [
      ssidChar, wifiPasswordChar, urlChar, portChar, usernameChar, mqttPasswordChar,
      caCertChar, clientCertChar, clientKeyChar, commandsChar,
      wifiStatusChar, wifiErrorChar, mqttStatusChar, mqttErrorChar,
    ] = await Promise.all([
      svc.getCharacteristic(CHAR_WIFI_SSID),
      svc.getCharacteristic(CHAR_WIFI_PASSWORD),
      svc.getCharacteristic(CHAR_MQTT_URL),
      svc.getCharacteristic(CHAR_MQTT_PORT),
      svc.getCharacteristic(CHAR_MQTT_USERNAME),
      svc.getCharacteristic(CHAR_MQTT_PASSWORD),
      svc.getCharacteristic(CHAR_MQTT_CA_CERT),
      svc.getCharacteristic(CHAR_MQTT_CLIENT_CERT),
      svc.getCharacteristic(CHAR_MQTT_CLIENT_KEY),
      svc.getCharacteristic(CHAR_COMMANDS),
      svc.getCharacteristic(CHAR_WIFI_STATUS),
      svc.getCharacteristic(CHAR_WIFI_ERROR),
      svc.getCharacteristic(CHAR_MQTT_STATUS),
      svc.getCharacteristic(CHAR_MQTT_ERROR),
    ]);

    // Always send every field, including empty certs — a partial write leaves stale
    // values from a previous provisioning attempt on the device.
    await ssidChar.writeValue(encodeText(fields.wifiSsid));
    await wifiPasswordChar.writeValue(encodeText(fields.wifiPassword));
    await urlChar.writeValue(encodeText(fields.mqttBrokerUrl));
    await portChar.writeValue(encodeText(fields.mqttBrokerPort));
    await usernameChar.writeValue(encodeText(fields.mqttUsername));
    await mqttPasswordChar.writeValue(encodeText(fields.mqttPassword));
    await caCertChar.writeValue(encodeText(''));
    await clientCertChar.writeValue(encodeText(''));
    await clientKeyChar.writeValue(encodeText(''));

    const handleWifiStatus = (event: BluetoothCharacteristicChangedEvent) => {
      if (!event.target.value) return;
      onStatus({ type: 'wifi', connected: decodeText(event.target.value) === '1' });
    };
    const handleWifiError = (event: BluetoothCharacteristicChangedEvent) => {
      if (!event.target.value) return;
      const code = Number(decodeText(event.target.value));
      if (code === 0) return;
      onStatus({ type: 'wifi-error', code, message: WIFI_ERROR_MESSAGES[code] ?? `Unknown error ${code}` });
    };
    const handleMqttStatus = (event: BluetoothCharacteristicChangedEvent) => {
      if (!event.target.value) return;
      onStatus({ type: 'mqtt', connected: decodeText(event.target.value) === '1' });
    };
    const handleMqttError = (event: BluetoothCharacteristicChangedEvent) => {
      if (!event.target.value) return;
      const code = Number(decodeText(event.target.value));
      if (code === 0) return;
      onStatus({ type: 'mqtt-error', code, message: MQTT_ERROR_MESSAGES[code] ?? `Unknown error ${code}` });
    };

    // Subscribe before triggering the connection attempt, so no early notification is missed.
    await wifiStatusChar.startNotifications();
    wifiStatusChar.addEventListener('characteristicvaluechanged', handleWifiStatus);
    await wifiErrorChar.startNotifications();
    wifiErrorChar.addEventListener('characteristicvaluechanged', handleWifiError);
    await mqttStatusChar.startNotifications();
    mqttStatusChar.addEventListener('characteristicvaluechanged', handleMqttStatus);
    await mqttErrorChar.startNotifications();
    mqttErrorChar.addEventListener('characteristicvaluechanged', handleMqttError);

    await commandsChar.writeValue(encodeText('CONNECT_START'));
  }

  disconnect(): void {
    this.server?.disconnect();
    this.server = null;
    this.wifiIotService = null;
  }
}
