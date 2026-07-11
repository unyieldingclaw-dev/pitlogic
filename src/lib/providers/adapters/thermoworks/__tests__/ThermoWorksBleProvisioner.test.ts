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
