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
