# BLE Provisioning Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a PitLogic user provision a brand-new, unprovisioned RFX/NODE device (WiFi + MQTT credentials) over Bluetooth Low Energy, from inside the app, without needing a separate tool.

**Architecture:** A new `ThermoWorksBleProvisioner` class wraps the raw Web Bluetooth API (`navigator.bluetooth`) — connect to the device, read its identity (serial/firmware/battery), scan nearby WiFi networks, write every provisioning field in one pass (never a partial write — an RFX device treats a provisioning write as authoritative and wipes anything not sent), and monitor the device's own WiFi/MQTT connection attempt via BLE notifications. Per ADR-001 (the provider firewall — "all UI components MUST NOT import from `src/lib/providers/`"), a new `useBleProvisioning.js` hook is the sole permitted crossing point, following the exact same pattern as the existing `useThermoWorksProvider.js`. A new `BleProvisioningWizard.jsx` consumes that hook (never the lib class directly) and drives it through a single-screen flow (not a multi-step wizard — there's no benefit to stepper navigation for a one-time setup form). `SettingsSheet.jsx` gets a small entry-point card that feature-detects `navigator.bluetooth` and gates the wizard behind that (BLE from a browser is Chrome/Edge desktop/Android only — no iOS Safari).

**Tech Stack:** TypeScript (`src/lib/`) for the BLE-wrapping class, React JSX for the wizard UI, Vitest + `@testing-library/react`, raw Web Bluetooth GATT API (no npm package — it's a standard browser API).

---

## Before You Start

This plan implements the already-approved design in `docs/superpowers/specs/2026-07-03-rfx-ble-provisioning-design.md`. Read that file first if anything below is unclear on the *why*. It builds on nothing from the two prior RFX SDK features (Device Health, Bidirectional Config) — BLE provisioning is a one-shot write flow to a device that isn't on MQTT yet, so it doesn't touch `TelemetryStore`, the event bus, or `ThermoWorksAdapter.ts` at all.

**Two deliberate, documented deviations from the spec's literal wording** (both driven by protocol/architecture realities discovered while researching this plan — read them now, they shape Tasks 1 and 5):

1. **The "Model Number" characteristic (`0x2A24`) is Write-only per the protocol docs, not Read** (`docs/RFX-README.md` lines 757-767 — the Read column is blank for that row, only Write is checked). The device's model is therefore taken from `device.name` (the BLE-advertised local name, e.g. `"NODE"`) returned by `navigator.bluetooth.requestDevice()`, not from reading that characteristic. The doc's own prose confirms this is intentional: "Model number will be the device name."

2. **The spec's step 7 ("prompts for a friendly device label — feeding into the channel-label editing from the device-health and bidirectional-config designs") doesn't map onto anything that exists.** `EditableDeviceConfig` (from the Bidirectional Config feature) only has *per-channel* labels (`channelLabels: Record<number, string>`), populated from a live `gateway:config` MQTT event — and a device that was *just* BLE-provisioned hasn't sent one yet (PitLogic's own browser tab isn't even connected to the broker at that point; connecting is a separate, existing step in the "Live Device" card). There is no gateway-level label field anywhere in the current domain model, and inventing new persistent storage for one is out of scope for this plan. **Task 5 replaces the label prompt with a simple success screen** that shows the device's serial number and points the user to the existing "Live Device" MQTT connect flow in Settings — once connected, the already-shipped Device Settings panel (`DeviceSettingsCard.jsx`) is where channel-level editing happens. This preserves the spec's intent (get the user from "just provisioned" to "using the existing config UI") without inventing new architecture.

**A third necessary addition not explicit in the spec, required for the code to actually compile:** `tsconfig.lib.json` only includes `"lib": ["ES2022"]` — no `"DOM"` — so `navigator`, `DataView`'s BLE-specific consumers, and Web Bluetooth's interfaces (`BluetoothDevice`, `BluetoothRemoteGATTServer`, etc.) aren't ambiently typed, and this project has no `@types/web-bluetooth` dependency. Rather than widen `tsconfig.lib.json`'s `lib` array (which risks changing global type resolution — e.g. `setInterval`'s return type — for every other file already compiling cleanly under `src/lib/`), Task 1 adds one small, scoped ambient declaration file containing only the handful of interfaces this plan actually uses. This is a surgical, contained fix — it does not touch the shared tsconfig.

**A fourth necessary addition not explicit in the spec, required for ADR-001 compliance:** the spec's own "Files Touched" list pairs `BleProvisioningWizard.jsx` directly with `ThermoWorksBleProvisioner.ts`, with no intermediate hook. But `src/lib/compliance/ADR-001-provider-firewall.md` states unconditionally: "The analytics engine and all UI components **MUST NOT** import from `src/lib/providers/`... directly" — worded as a hard invariant, not scoped only to the streaming-telemetry pipeline, and CLAUDE.md calls violating it "grounds to reject a PR." `BleProvisioningWizard.jsx` is a UI component; importing `ThermoWorksBleProvisioner` from `src/lib/providers/adapters/thermoworks/` directly would violate this literally, regardless of BLE provisioning being a one-shot write rather than a data stream. **Task 4 (new, not in the original spec) adds `src/hooks/useBleProvisioning.js`** — a thin wrapper around `ThermoWorksBleProvisioner`, following the exact same "only non-lib file permitted to import from `src/lib/providers/`" pattern already established by `useThermoWorksProvider.js`. The wizard (now Task 5) consumes the hook, never the lib class. This keeps the firewall intact without inventing any new architecture — it's the same pattern the codebase already uses for the MQTT adapter.

**Current state (verified immediately before this plan was written):**

- No BLE-related code exists anywhere in `src/` — this is a clean addition, not a modification of existing BLE logic.
- `src/components/SettingsSheet.jsx`'s "Live Device" card (around line 183) has the MQTT broker connection form. This plan adds a new, separate card for BLE provisioning, placed immediately before it (provisioning logically precedes connecting).
- `src/hooks/useThermoWorksProvider.js` and `src/components/SettingsSheet.jsx` both read the same `localStorage['pitlogic-mqtt-v1']` key (shape `{ brokerUrl, username, password }`) for the existing MQTT broker config. This plan's wizard pre-fills its MQTT username/password fields from this, verbatim. It does **not** naively copy `brokerUrl` — see Task 5's `deriveMqttFieldsFromStoredConfig` note for why (the device connects over raw `mqtt://`/`mqtts://` TCP, while PitLogic's own browser tab connects over `ws://`/`wss://`; the two commonly use different schemes and ports against the same broker, and one can't be reliably derived from the other).
- `src/App.jsx` has a `mqttProvider = useThermoWorksProvider()` and a `showSettings` boolean state, wired to `<SettingsSheet>`. This plan follows the exact same pattern for a new `showBleWizard` boolean.

---

## Task 1: Web Bluetooth ambient types + `ThermoWorksBleProvisioner.connect()`

**Files:**
- Create: `src/lib/providers/adapters/thermoworks/webBluetooth.d.ts`
- Create: `src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts`
- Test: `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`

- [ ] **Step 1: Add the minimal ambient Web Bluetooth types**

Create `src/lib/providers/adapters/thermoworks/webBluetooth.d.ts`:

```typescript
// Minimal ambient Web Bluetooth types.
//
// tsconfig.lib.json's "lib" is ES2022-only (no "DOM"), and this project has no
// @types/web-bluetooth dependency, so the real Web Bluetooth interfaces aren't
// available. This declares only the subset of the spec actually used by
// ThermoWorksBleProvisioner. Deliberately does NOT extend EventTarget/Event
// (both DOM-lib-only) — addEventListener/removeEventListener are typed directly
// against the one event shape this file needs.
//
// This file has no imports/exports, so TypeScript treats it as a global script:
// every interface below merges into the global scope for the whole `src/lib/`
// compilation unit, not just this directory.

interface BluetoothCharacteristicChangedEvent {
  target: BluetoothRemoteGATTCharacteristic;
}

interface BluetoothRemoteGATTCharacteristic {
  readonly value: DataView | undefined;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: BluetoothCharacteristicChangedEvent) => void,
  ): void;
  removeEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: BluetoothCharacteristicChangedEvent) => void,
  ): void;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: number | string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: number | string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothDevice {
  readonly name: string | undefined;
  readonly gatt: BluetoothRemoteGATTServer | undefined;
}

interface BluetoothManufacturerDataFilter {
  companyIdentifier: number;
}

interface BluetoothRequestDeviceFilter {
  namePrefix?: string;
  manufacturerData?: BluetoothManufacturerDataFilter[];
}

interface RequestDeviceOptions {
  filters: BluetoothRequestDeviceFilter[];
  optionalServices?: (number | string)[];
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface Navigator {
  readonly bluetooth: Bluetooth;
}
```

- [ ] **Step 2: Write the failing test for `connect()`**

Create `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function textToDataView(text: string): DataView {
  const bytes = new TextEncoder().encode(text);
  return new DataView(bytes.buffer);
}

function byteToDataView(n: number): DataView {
  const buf = new ArrayBuffer(1);
  new DataView(buf).setUint8(0, n);
  return new DataView(buf);
}

function makeMockCharacteristic(readValueResult?: DataView) {
  return {
    value: undefined as DataView | undefined,
    readValue: vi.fn().mockResolvedValue(readValueResult),
    writeValue: vi.fn().mockResolvedValue(undefined),
    startNotifications: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

describe('ThermoWorksBleProvisioner — connect', () => {
  let mockRequestDevice: ReturnType<typeof vi.fn>;
  let mockGattConnect: ReturnType<typeof vi.fn>;
  let mockGetPrimaryService: ReturnType<typeof vi.fn>;
  let serialChar: ReturnType<typeof makeMockCharacteristic>;
  let firmwareChar: ReturnType<typeof makeMockCharacteristic>;
  let batteryChar: ReturnType<typeof makeMockCharacteristic>;

  beforeEach(() => {
    serialChar = makeMockCharacteristic(textToDataView('T10061CE92E24'));
    firmwareChar = makeMockCharacteristic(textToDataView('v2.45'));
    batteryChar = makeMockCharacteristic(byteToDataView(87));

    const deviceInfoService = { getCharacteristic: vi.fn(async (uuid: number | string) => {
      if (uuid === 0x2a25) return serialChar;
      if (uuid === 0x2a26) return firmwareChar;
      throw new Error(`unexpected characteristic ${uuid}`);
    }) };
    const batteryService = { getCharacteristic: vi.fn(async () => batteryChar) };
    const wifiIotService = { getCharacteristic: vi.fn() };

    mockGetPrimaryService = vi.fn(async (uuid: number | string) => {
      if (uuid === 0x180a) return deviceInfoService;
      if (uuid === 0x180f) return batteryService;
      if (uuid === '00010074-6865-726d-6f77-6f726b730d0a') return wifiIotService;
      throw new Error(`unexpected service ${uuid}`);
    });

    mockGattConnect = vi.fn().mockResolvedValue({
      connect: vi.fn(),
      disconnect: vi.fn(),
      getPrimaryService: mockGetPrimaryService,
    });

    mockRequestDevice = vi.fn().mockResolvedValue({
      name: 'NODE',
      gatt: { connect: mockGattConnect },
    });

    vi.stubGlobal('navigator', { bluetooth: { requestDevice: mockRequestDevice } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests a device filtered by name prefix and company ID, with all three services as optional', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    await provisioner.connect();

    expect(mockRequestDevice).toHaveBeenCalledWith({
      filters: [
        { namePrefix: 'NODE' },
        { manufacturerData: [{ companyIdentifier: 0x0b11 }] },
      ],
      optionalServices: [0x180a, 0x180f, '00010074-6865-726d-6f77-6f726b730d0a'],
    });
  });

  it('resolves device info using device.name for model (not a characteristic read)', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    const info = await provisioner.connect();

    expect(info).toEqual({
      model: 'NODE',
      serial: 'T10061CE92E24',
      firmware: 'v2.45',
      battery: 87,
    });
  });

  it('reads battery level as a raw byte, not a decoded string', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    const info = await provisioner.connect();
    expect(typeof info.battery).toBe('number');
    expect(info.battery).toBe(87);
  });

  it('connects to the GATT server via device.gatt.connect()', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    await provisioner.connect();
    expect(mockGattConnect).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`
Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 4: Implement `ThermoWorksBleProvisioner.connect()`**

Create `src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts`:

```typescript
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`
Expected: PASS — all 4 cases.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no errors (pre-existing unrelated errors in `src/lib/providers/adapters/csv/CsvProvider.ts` no longer exist — that file was deleted in a prior feature; any other pre-existing unrelated errors are not your concern).

- [ ] **Step 7: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/webBluetooth.d.ts src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts
git commit -m "feat: add ThermoWorksBleProvisioner.connect() with minimal Web Bluetooth ambient types"
```

---

## Task 2: `ThermoWorksBleProvisioner.scanWifiNetworks()`

**Files:**
- Modify: `src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts`
- Test: `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`

**Protocol recap:** writing `"SCAN"` to the Commands characteristic (`00010874-...`) triggers the device to broadcast one BLE notification per discovered SSID on that same characteristic, each formatted as the CSV string `"AUTHMODE,RSSI,SSID"`. The scan runs for a few seconds on the device, then it returns to its previous state — there's no explicit "scan complete" signal, so the caller times out after a fixed duration.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts` (new `describe` block; reuses `makeMockCharacteristic`/`textToDataView` from Task 1's setup — extract them to file-level scope if not already, and extend the `beforeEach` to also stub a `commandsChar` on the mocked `wifiIotService`):

```typescript
describe('ThermoWorksBleProvisioner — scanWifiNetworks', () => {
  let mockRequestDevice: ReturnType<typeof vi.fn>;
  let commandsChar: ReturnType<typeof makeMockCharacteristic>;
  let changeListener: ((event: { target: { value: DataView } }) => void) | undefined;

  beforeEach(() => {
    commandsChar = makeMockCharacteristic();
    commandsChar.addEventListener.mockImplementation((_type: string, listener: typeof changeListener) => {
      changeListener = listener;
    });

    const wifiIotService = { getCharacteristic: vi.fn(async (uuid: string) => {
      if (uuid === '00010874-6865-726d-6f77-6f726b730d0a') return commandsChar;
      throw new Error(`unexpected characteristic ${uuid}`);
    }) };
    const deviceInfoService = { getCharacteristic: vi.fn(async () => makeMockCharacteristic(textToDataView('x'))) };
    const batteryService = { getCharacteristic: vi.fn(async () => makeMockCharacteristic(byteToDataView(50))) };

    const server = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getPrimaryService: vi.fn(async (uuid: number | string) => {
        if (uuid === 0x180a) return deviceInfoService;
        if (uuid === 0x180f) return batteryService;
        return wifiIotService;
      }),
    };
    mockRequestDevice = vi.fn().mockResolvedValue({ name: 'NODE', gatt: { connect: vi.fn().mockResolvedValue(server) } });
    vi.stubGlobal('navigator', { bluetooth: { requestDevice: mockRequestDevice } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes SCAN to the Commands characteristic and collects notified networks', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    await provisioner.connect();

    const found: { authMode: string; rssi: number; ssid: string }[] = [];
    const scanPromise = provisioner.scanWifiNetworks(n => found.push(n), 0);

    // Simulate the device notifying scan results before the (zero-length) timeout fires.
    changeListener?.({ target: { value: textToDataView('WPA2,-45,HomeNetwork') } });
    changeListener?.({ target: { value: textToDataView('OPEN,-70,CoffeeShop') } });

    await scanPromise;

    expect(commandsChar.writeValue).toHaveBeenCalledWith(encodeText('SCAN'));
    expect(found).toEqual([
      { authMode: 'WPA2', rssi: -45, ssid: 'HomeNetwork' },
      { authMode: 'OPEN', rssi: -70, ssid: 'CoffeeShop' },
    ]);
  });

  it('removes the notification listener after the scan window closes', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    await provisioner.connect();
    await provisioner.scanWifiNetworks(() => {}, 0);
    expect(commandsChar.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
```

Also add this import at the top of the test file if not already present from Task 1: `import { encodeText } from '../ThermoWorksBleProvisioner.js';` (adjust the existing import line to include it rather than adding a duplicate import).

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`
Expected: FAIL — `scanWifiNetworks` doesn't exist yet.

- [ ] **Step 3: Implement `scanWifiNetworks`**

Edit `src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts`. Add this interface near `DeviceInfo`:

```typescript
export interface WifiNetwork {
  authMode: string;
  rssi: number;
  ssid: string;
}
```

Add this method to the `ThermoWorksBleProvisioner` class, after `connect`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`
Expected: PASS — all cases (Task 1's 4 + Task 2's 2).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts
git commit -m "feat: add scanWifiNetworks to ThermoWorksBleProvisioner"
```

---

## Task 3: `ThermoWorksBleProvisioner.provision()`

**Files:**
- Modify: `src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts`
- Test: `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`

**Protocol recap:** writes every provisioning field (WiFi SSID/password, MQTT URL/port/username/password, and CA/client cert/key — always sent as empty strings, since PitLogic doesn't support certificate-based MQTT auth anywhere else and the docs explicitly warn certs are "currently unavailable and will cause issues with NODE"), THEN subscribes to the WiFi/MQTT status and error notify characteristics (subscribing *before* triggering the connection attempt, so no early notification is missed), THEN writes `"CONNECT_START"` to the Commands characteristic to trigger the device's connection attempt. Status characteristics are 1-character ASCII strings (`"0"`/`"1"`), decoded the same way as everything else in this service (see the WHY-comment on `decodeText` in Task 1). Error codes of `0` mean "no error" and are not reported as status events — only non-zero codes are.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`:

```typescript
describe('ThermoWorksBleProvisioner — provision', () => {
  let mockRequestDevice: ReturnType<typeof vi.fn>;
  let chars: Record<string, ReturnType<typeof makeMockCharacteristic>>;
  let listeners: Record<string, (event: { target: { value: DataView } }) => void>;

  const WIFI_IOT_CHAR_UUIDS = [
    '00010174-6865-726d-6f77-6f726b730d0a', // ssid
    '00010274-6865-726d-6f77-6f726b730d0a', // wifi password
    '00010d74-6865-726d-6f77-6f726b730d0a', // mqtt url
    '00010e74-6865-726d-6f77-6f726b730d0a', // mqtt port
    '00010f74-6865-726d-6f77-6f726b730d0a', // mqtt username
    '00011074-6865-726d-6f77-6f726b730d0a', // mqtt password
    '00011174-6865-726d-6f77-6f726b730d0a', // ca cert
    '00011274-6865-726d-6f77-6f726b730d0a', // client cert
    '00011374-6865-726d-6f77-6f726b730d0a', // client key
    '00010874-6865-726d-6f77-6f726b730d0a', // commands
    '00010474-6865-726d-6f77-6f726b730d0a', // wifi status
    '00010574-6865-726d-6f77-6f726b730d0a', // wifi error
    '00010674-6865-726d-6f77-6f726b730d0a', // mqtt status
    '00010774-6865-726d-6f77-6f726b730d0a', // mqtt error
  ];

  beforeEach(() => {
    chars = {};
    listeners = {};
    for (const uuid of WIFI_IOT_CHAR_UUIDS) {
      const c = makeMockCharacteristic();
      c.addEventListener.mockImplementation((_type: string, listener: typeof listeners[string]) => {
        listeners[uuid] = listener;
      });
      chars[uuid] = c;
    }

    const wifiIotService = { getCharacteristic: vi.fn(async (uuid: string) => {
      const c = chars[uuid];
      if (!c) throw new Error(`unexpected characteristic ${uuid}`);
      return c;
    }) };
    const deviceInfoService = { getCharacteristic: vi.fn(async () => makeMockCharacteristic(textToDataView('x'))) };
    const batteryService = { getCharacteristic: vi.fn(async () => makeMockCharacteristic(byteToDataView(50))) };

    const server = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      getPrimaryService: vi.fn(async (uuid: number | string) => {
        if (uuid === 0x180a) return deviceInfoService;
        if (uuid === 0x180f) return batteryService;
        return wifiIotService;
      }),
    };
    mockRequestDevice = vi.fn().mockResolvedValue({ name: 'NODE', gatt: { connect: vi.fn().mockResolvedValue(server) } });
    vi.stubGlobal('navigator', { bluetooth: { requestDevice: mockRequestDevice } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const FIELDS = {
    wifiSsid: 'HomeNetwork',
    wifiPassword: 'hunter2',
    mqttBrokerUrl: 'mqtts://broker.example.com',
    mqttBrokerPort: '8883',
    mqttUsername: 'pitlogic',
    mqttPassword: 'secret',
  };

  it('writes every field, including empty-string certs, before writing CONNECT_START', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    await provisioner.connect();
    await provisioner.provision(FIELDS, () => {});

    expect(chars['00010174-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText('HomeNetwork'));
    expect(chars['00010274-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText('hunter2'));
    expect(chars['00010d74-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText('mqtts://broker.example.com'));
    expect(chars['00010e74-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText('8883'));
    expect(chars['00010f74-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText('pitlogic'));
    expect(chars['00011074-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText('secret'));
    expect(chars['00011174-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText(''));
    expect(chars['00011274-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText(''));
    expect(chars['00011374-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText(''));
    expect(chars['00010874-6865-726d-6f77-6f726b730d0a'].writeValue).toHaveBeenCalledWith(encodeText('CONNECT_START'));
  });

  it('subscribes to status/error notifications before writing CONNECT_START', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    await provisioner.connect();

    const commandsWriteOrder: string[] = [];
    chars['00010474-6865-726d-6f77-6f726b730d0a'].startNotifications.mockImplementation(async () => {
      commandsWriteOrder.push('wifi-status-subscribed');
    });
    chars['00010874-6865-726d-6f77-6f726b730d0a'].writeValue.mockImplementation(async () => {
      commandsWriteOrder.push('connect-start-written');
    });

    await provisioner.provision(FIELDS, () => {});
    expect(commandsWriteOrder).toEqual(['wifi-status-subscribed', 'connect-start-written']);
  });

  it('reports wifi and mqtt connection status as they arrive', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    await provisioner.connect();

    const events: unknown[] = [];
    await provisioner.provision(FIELDS, e => events.push(e));

    listeners['00010474-6865-726d-6f77-6f726b730d0a']({ target: { value: textToDataView('1') } });
    listeners['00010674-6865-726d-6f77-6f726b730d0a']({ target: { value: textToDataView('1') } });

    expect(events).toEqual([
      { type: 'wifi', connected: true },
      { type: 'mqtt', connected: true },
    ]);
  });

  it('maps known wifi/mqtt error codes to human-readable messages, ignoring code 0', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    await provisioner.connect();

    const events: unknown[] = [];
    await provisioner.provision(FIELDS, e => events.push(e));

    listeners['00010574-6865-726d-6f77-6f726b730d0a']({ target: { value: textToDataView('0') } });
    listeners['00010574-6865-726d-6f77-6f726b730d0a']({ target: { value: textToDataView('12299') } });
    listeners['00010774-6865-726d-6f77-6f726b730d0a']({ target: { value: textToDataView('2') } });

    expect(events).toEqual([
      { type: 'wifi-error', code: 12299, message: 'WiFi password rejected' },
      { type: 'mqtt-error', code: 2, message: 'Broker refused connection' },
    ]);
  });

  it('throws when provision is called before connect', async () => {
    const { ThermoWorksBleProvisioner } = await import('../ThermoWorksBleProvisioner.js');
    const provisioner = new ThermoWorksBleProvisioner();
    await expect(provisioner.provision(FIELDS, () => {})).rejects.toThrow(/not connected/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`
Expected: FAIL — `provision` doesn't exist yet.

- [ ] **Step 3: Implement `provision`**

Edit `src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts`. Add these types near `WifiNetwork`:

```typescript
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
```

Add this method to the `ThermoWorksBleProvisioner` class, after `scanWifiNetworks`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts`
Expected: PASS — full file, all cases (Task 1's 4 + Task 2's 2 + Task 3's 6 = 12).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksBleProvisioner.test.ts
git commit -m "feat: add provision() to ThermoWorksBleProvisioner, writing all fields and monitoring connection status"
```

---

## Task 4: `useBleProvisioning` hook — the ADR-001 crossing point

**Files:**
- Create: `src/hooks/useBleProvisioning.js`
- Test: `src/hooks/__tests__/useBleProvisioning.test.js`

**Why this task exists (see "Before You Start"):** `ThermoWorksBleProvisioner` lives in `src/lib/providers/adapters/thermoworks/` — ADR-001 forbids UI components from importing anything under `src/lib/providers/` directly. This hook is the one permitted crossing point, exactly mirroring the existing `useThermoWorksProvider.js` pattern. Unlike that hook, this one does **not** touch the event bus, `normalizeProviderEvent`, or `TelemetryStore` — BLE provisioning is a one-shot configuration write, not a telemetry stream, so there's nothing to normalize or materialize. It's a thin pass-through that exists solely to satisfy the firewall.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/useBleProvisioning.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockConnect, mockScanWifiNetworks, mockProvision, mockDisconnect } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockScanWifiNetworks: vi.fn(),
  mockProvision: vi.fn(),
  mockDisconnect: vi.fn(),
}));

vi.mock('../../lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.js', () => ({
  ThermoWorksBleProvisioner: class {
    connect = mockConnect;
    scanWifiNetworks = mockScanWifiNetworks;
    provision = mockProvision;
    disconnect = mockDisconnect;
  },
}));

import { useBleProvisioning } from '../useBleProvisioning.js';

describe('useBleProvisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns connect, scanWifiNetworks, provision, and disconnect functions', () => {
    const { result } = renderHook(() => useBleProvisioning());
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.scanWifiNetworks).toBe('function');
    expect(typeof result.current.provision).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
  });

  it('delegates connect() to the underlying provisioner instance', async () => {
    mockConnect.mockResolvedValue({ model: 'NODE', serial: 'T1', firmware: 'v1', battery: 50 });
    const { result } = renderHook(() => useBleProvisioning());
    const info = await result.current.connect();
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(info).toEqual({ model: 'NODE', serial: 'T1', firmware: 'v1', battery: 50 });
  });

  it('delegates scanWifiNetworks(onNetwork) to the underlying provisioner instance', async () => {
    const onNetwork = vi.fn();
    mockScanWifiNetworks.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBleProvisioning());
    await result.current.scanWifiNetworks(onNetwork);
    expect(mockScanWifiNetworks).toHaveBeenCalledWith(onNetwork);
  });

  it('delegates provision(fields, onStatus) to the underlying provisioner instance', async () => {
    const fields = { wifiSsid: 'x', wifiPassword: 'y', mqttBrokerUrl: 'z', mqttBrokerPort: '1', mqttUsername: 'u', mqttPassword: 'p' };
    const onStatus = vi.fn();
    mockProvision.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBleProvisioning());
    await result.current.provision(fields, onStatus);
    expect(mockProvision).toHaveBeenCalledWith(fields, onStatus);
  });

  it('reuses the same provisioner instance across re-renders (does not reconnect on every render)', () => {
    const { result, rerender } = renderHook(() => useBleProvisioning());
    const firstConnect = result.current.connect;
    rerender();
    expect(result.current.connect).toBe(firstConnect);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useBleProvisioning.test.js`
Expected: FAIL — the hook doesn't exist yet.

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useBleProvisioning.js`:

```javascript
// This hook is the sole bridge between the provider boundary and UI for BLE device
// provisioning. It is permitted to import from src/lib/providers/ — see ADR-001.
// Unlike useThermoWorksProvider.js, this is a one-shot configuration write, not a
// telemetry stream: it never touches the event bus or TelemetryStore, so there is
// nothing to normalize or materialize here — it's a thin pass-through that exists
// solely to satisfy the firewall.
import { useState, useCallback } from 'react';
import { ThermoWorksBleProvisioner } from '../lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.js';

export function useBleProvisioning() {
  const [provisioner] = useState(() => new ThermoWorksBleProvisioner());

  const connect = useCallback(() => provisioner.connect(), [provisioner]);
  const scanWifiNetworks = useCallback(onNetwork => provisioner.scanWifiNetworks(onNetwork), [provisioner]);
  const provision = useCallback((fields, onStatus) => provisioner.provision(fields, onStatus), [provisioner]);
  const disconnect = useCallback(() => provisioner.disconnect(), [provisioner]);

  return { connect, scanWifiNetworks, provision, disconnect };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useBleProvisioning.test.js`
Expected: PASS — all 5 cases.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no regressions elsewhere.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useBleProvisioning.js src/hooks/__tests__/useBleProvisioning.test.js
git commit -m "feat: add useBleProvisioning hook as the ADR-001 crossing point for BLE provisioning"
```

---

## Task 5: `BleProvisioningWizard.jsx`

**Files:**
- Create: `src/components/BleProvisioningWizard.jsx`
- Test: `src/components/__tests__/BleProvisioningWizard.test.jsx`

**Flow (single screen, phase-driven, not a multi-step wizard):**

1. `idle` — "Scan for Device" button.
2. `connecting` — mid `provisioner.connect()` (the browser shows its own native device picker; this phase just reflects the awaited promise).
3. `form` — connected: shows the device confirmation line ("Connected to NODE · Serial T10061CE92E24 · Firmware v2.45 · Battery 87%"), then the SSID (+ "Scan for networks" + results dropdown)/password/MQTT fields, pre-filled per `deriveMqttFieldsFromStoredConfig` below, and a "Provision Device" button.
4. `provisioning` — mid `provisioner.provision(...)`, showing a live status log built from each `ProvisioningStatusEvent`.
5. `success` — final state: "Device provisioned!" plus the device's serial number and a pointer to the existing "Live Device" MQTT connect flow (see the "Before You Start" note on why this replaces the spec's device-label prompt).
6. `error` — any failure in `connect()` or `provision()` (including the user cancelling the browser's device picker), with a "Try Again" button back to `idle`.

- [ ] **Step 1: Write the failing tests**

Create `src/components/__tests__/BleProvisioningWizard.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BleProvisioningWizard from '../BleProvisioningWizard';

const { mockConnect, mockScanWifiNetworks, mockProvision, mockDisconnect } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockScanWifiNetworks: vi.fn().mockResolvedValue(undefined),
  mockProvision: vi.fn().mockResolvedValue(undefined),
  mockDisconnect: vi.fn(),
}));

vi.mock('../../hooks/useBleProvisioning.js', () => ({
  useBleProvisioning: () => ({
    connect: mockConnect,
    scanWifiNetworks: mockScanWifiNetworks,
    provision: mockProvision,
    disconnect: mockDisconnect,
  }),
}));

const lsMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    _clear: () => { store = {}; },
    _seed: (key, val) => { store[key] = val; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: lsMock, writable: true });

const DEVICE_INFO = { model: 'NODE', serial: 'T10061CE92E24', firmware: 'v2.45', battery: 87 };

describe('BleProvisioningWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lsMock._clear();
    mockConnect.mockResolvedValue(DEVICE_INFO);
    mockScanWifiNetworks.mockResolvedValue(undefined);
    mockProvision.mockResolvedValue(undefined);
  });

  it('shows the idle Scan for Device button when opened', () => {
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /scan for device/i })).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(<BleProvisioningWizard open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /scan for device/i })).toBeNull();
  });

  it('shows the device confirmation and form after a successful connect', async () => {
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));

    await waitFor(() => {
      expect(screen.getByText(/T10061CE92E24/)).toBeTruthy();
    });
    expect(screen.getByText(/v2\.45/)).toBeTruthy();
    expect(screen.getByText(/87%/)).toBeTruthy();
    expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^provision device$/i })).toBeTruthy();
  });

  it('shows an error and a retry option when connect() rejects', async () => {
    mockConnect.mockRejectedValue(new Error('User cancelled the requestDevice() chooser.'));
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));

    expect(await screen.findByText(/user cancelled/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });

  it('pre-fills MQTT username/password from stored config, but not brokerUrl verbatim', async () => {
    lsMock._seed('pitlogic-mqtt-v1', JSON.stringify({ brokerUrl: 'wss://broker.example.com:8884/mqtt', username: 'pitlogic', password: 'secret' }));
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    expect(screen.getByLabelText(/mqtt username/i).value).toBe('pitlogic');
    expect(screen.getByLabelText(/mqtt password/i).value).toBe('secret');
    // Host is carried over; scheme/port are not copied verbatim from the browser's wss:// value.
    expect(screen.getByLabelText(/mqtt broker url/i).value).toBe('mqtts://broker.example.com');
    expect(screen.getByLabelText(/mqtt broker port/i).value).toBe('8883');
  });

  it('runs the SCAN flow and populates the network dropdown on "Scan for networks"', async () => {
    mockScanWifiNetworks.mockImplementation(async onNetwork => {
      onNetwork({ authMode: 'WPA2', rssi: -45, ssid: 'HomeNetwork' });
    });
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    fireEvent.click(screen.getByRole('button', { name: /scan for networks/i }));
    await waitFor(() => { expect(screen.getByText(/HomeNetwork/)).toBeTruthy(); });
  });

  it('calls provision() with form values and shows a live status log', async () => {
    mockProvision.mockImplementation(async (_fields, onStatus) => {
      onStatus({ type: 'wifi', connected: true });
      onStatus({ type: 'mqtt', connected: true });
    });
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });

    fireEvent.change(screen.getByLabelText(/wifi ssid/i), { target: { value: 'HomeNetwork' } });
    fireEvent.change(screen.getByLabelText(/wifi password/i), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByRole('button', { name: /^provision device$/i }));

    await waitFor(() => {
      expect(mockProvision).toHaveBeenCalledWith(
        expect.objectContaining({ wifiSsid: 'HomeNetwork', wifiPassword: 'hunter2' }),
        expect.any(Function),
      );
    });
    expect(screen.getByText(/wifi connected/i)).toBeTruthy();
    expect(screen.getByText(/mqtt connected/i)).toBeTruthy();
  });

  it('shows the success screen with the device serial after provision() resolves', async () => {
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });
    fireEvent.click(screen.getByRole('button', { name: /^provision device$/i }));

    expect(await screen.findByText(/device provisioned/i)).toBeTruthy();
    expect(screen.getByText(/T10061CE92E24/)).toBeTruthy();
  });

  it('shows a wifi/mqtt error message from a status event without treating it as fatal to the whole flow', async () => {
    mockProvision.mockImplementation(async (_fields, onStatus) => {
      onStatus({ type: 'wifi-error', code: 12299, message: 'WiFi password rejected' });
    });
    render(<BleProvisioningWizard open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /scan for device/i }));
    await waitFor(() => { expect(screen.getByLabelText(/wifi ssid/i)).toBeTruthy(); });
    fireEvent.click(screen.getByRole('button', { name: /^provision device$/i }));

    expect(await screen.findByText(/wifi password rejected/i)).toBeTruthy();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(<BleProvisioningWizard open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/BleProvisioningWizard.test.jsx`
Expected: FAIL — the component doesn't exist yet.

- [ ] **Step 3: Implement `BleProvisioningWizard.jsx`**

Create `src/components/BleProvisioningWizard.jsx`:

```jsx
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
  let stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    stored = null;
  }
  let host = '';
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

            {statusLog.length > 0 && (
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/BleProvisioningWizard.test.jsx`
Expected: PASS — all 10 cases.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no regressions elsewhere.

- [ ] **Step 6: Commit**

```bash
git add src/components/BleProvisioningWizard.jsx src/components/__tests__/BleProvisioningWizard.test.jsx
git commit -m "feat: add BleProvisioningWizard for single-screen BLE device setup"
```

---

## Task 6: `SettingsSheet.jsx` — entry point card, platform gate

**Files:**
- Modify: `src/components/SettingsSheet.jsx`
- Test: `src/components/__tests__/SettingsSheet.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to `src/components/__tests__/SettingsSheet.test.jsx` (new `describe` block; check the current `baseProps` object first and do NOT modify it for this task — the new prop this task adds, `onOpenBleWizard`, is only asserted in these new tests, not required by any pre-existing test, since it's a plain callback the entry-point button calls and nothing else in the component depends on it being present):

```jsx
describe('SettingsSheet — BLE provisioning entry point', () => {
  const originalBluetooth = Object.getOwnPropertyDescriptor(window.navigator, 'bluetooth');

  afterEach(() => {
    if (originalBluetooth) {
      Object.defineProperty(window.navigator, 'bluetooth', originalBluetooth);
    } else {
      delete window.navigator.bluetooth;
    }
  });

  it('shows the Set Up Device via Bluetooth button when navigator.bluetooth is supported', () => {
    Object.defineProperty(window.navigator, 'bluetooth', { value: {}, configurable: true });
    render(<SettingsSheet {...baseProps} onOpenBleWizard={vi.fn()} />);
    expect(screen.getByRole('button', { name: /set up device via bluetooth/i })).toBeTruthy();
  });

  it('calls onOpenBleWizard when the entry point button is clicked', () => {
    Object.defineProperty(window.navigator, 'bluetooth', { value: {}, configurable: true });
    const onOpenBleWizard = vi.fn();
    render(<SettingsSheet {...baseProps} onOpenBleWizard={onOpenBleWizard} />);
    fireEvent.click(screen.getByRole('button', { name: /set up device via bluetooth/i }));
    expect(onOpenBleWizard).toHaveBeenCalledTimes(1);
  });

  it('shows unsupported-browser messaging instead of the button when navigator.bluetooth is absent', () => {
    if ('bluetooth' in window.navigator) delete window.navigator.bluetooth;
    render(<SettingsSheet {...baseProps} onOpenBleWizard={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /set up device via bluetooth/i })).toBeNull();
    expect(screen.getByText(/isn't supported in this browser/i)).toBeTruthy();
  });
});
```

The current top of `src/components/__tests__/SettingsSheet.test.jsx` is:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsSheet from '../SettingsSheet';
```

Neither `afterEach` nor `fireEvent` is imported yet, and this task's new tests use both. Update these two lines:

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
```

(Re-check the file first in case it has drifted further since this plan was written — add whichever of `afterEach`/`fireEvent` is missing without duplicating anything already present.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/SettingsSheet.test.jsx`
Expected: FAIL — no BLE entry point exists in `SettingsSheet.jsx` yet.

- [ ] **Step 3: Add the entry point card**

Edit `src/components/SettingsSheet.jsx`. Update the function signature to accept the new prop:

```javascript
export default function SettingsSheet({ open, onClose, cookState, recipes, onImportCooks, onImportRecipes, prefs, resetCutPref, setTheme, mqttStatus, mqttError, onMqttConnect, onMqttDisconnect, gatewayHealth = [], onHasConfigBaseline, onUpdateDeviceConfig, onOpenBleWizard }) {
```

Insert this block immediately before the `{/* Live Device */}` card (i.e., right after the closing `</div>` of the "Appearance" section and before the `{/* Live Device */}` comment):

```jsx
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

```

(This goes directly above the existing `{/* Live Device */}` comment — do not reorder or modify the Live Device card itself.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/SettingsSheet.test.jsx`
Expected: PASS — all cases, old and new.

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — all tests project-wide.

- [ ] **Step 6: Commit**

```bash
git add src/components/SettingsSheet.jsx src/components/__tests__/SettingsSheet.test.jsx
git commit -m "feat: add BLE provisioning entry point to Settings, gated by navigator.bluetooth support"
```

---

## Task 7: Wire `BleProvisioningWizard` into `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add wizard open/close state and render the wizard**

Read the current `src/App.jsx` first to confirm the exact current state of the `showSettings` declaration and the `<SettingsSheet>` invocation (both may have shifted slightly since this plan was written).

Add the import near the existing `SettingsSheet` import:

```javascript
import BleProvisioningWizard from './components/BleProvisioningWizard';
```

Add new state alongside the existing `showSettings` declaration:

```javascript
  const [showBleWizard, setShowBleWizard] = useState(false);
```

Add `onOpenBleWizard={() => setShowBleWizard(true)}` to the existing `<SettingsSheet ...>` invocation, alongside the other props.

Render the wizard as a sibling to `<SettingsSheet>` (immediately after its closing `/>`):

```jsx
      <BleProvisioningWizard open={showBleWizard} onClose={() => setShowBleWizard(false)} />
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: PASS — no test currently asserts on this new wiring, so this is a smoke check that nothing else broke.

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire BleProvisioningWizard open/close state into App.jsx"
```

---

## Task 8: Manual verification

**Files:** none — this task runs the app.

**A hard constraint on this task:** Web Bluetooth requires a real BLE-capable device in SETUPMODE and a Chrome/Edge browser with the feature enabled — there is no way to exercise the actual GATT connection end-to-end without physical hardware, and this plan's own author has no such hardware available during implementation. This task verifies everything that *can* be verified without hardware: the entry point's platform gating, the wizard's `idle`/`error` states (which don't require a real device), and that nothing regressed.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts with no console errors.

- [ ] **Step 2: Verify the entry point in a Web-Bluetooth-capable browser context**

Open the app, open Settings. Confirm the "Set Up New Device" card appears with a "Set Up Device via Bluetooth" button (the dev browser environment should report `navigator.bluetooth` support in Chrome/Edge). Click it — confirm the wizard dialog opens showing the `idle` phase ("Scan for Device" button and SETUPMODE instructions), and that clicking the browser's native device chooser (or cancelling it, since no real device is available) transitions to the `error` phase with a retry option, without crashing.

- [ ] **Step 3: Verify the platform-gated fallback text**

Using the browser's devtools console, run `delete navigator.bluetooth` (or use a browser without Web Bluetooth support, e.g. Firefox or Safari) and reload. Confirm Settings now shows the unsupported-browser message instead of the button, and no wizard entry point is reachable.

- [ ] **Step 4: Confirm build passes**

Run: `npm run build`
Expected: build succeeds with no TypeScript or bundling errors.

- [ ] **Step 5: Update memory bank**

Add a line to `memory-bank/activeContext.md` under "What's Working" noting the BLE provisioning wizard ships, and a line under a relevant section (or a new "Known Limitations" note) that it has not been verified against real hardware — this should be flagged for a follow-up manual test with an actual RFX/NODE device before considering it fully production-verified. Follow the existing frontmatter/structure in that file — do not rewrite the whole file.

- [ ] **Step 6: Commit**

```bash
git add memory-bank/activeContext.md
git commit -m "docs: update activeContext — BLE provisioning wizard shipped (pending real-hardware verification)"
```
