import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encodeText } from '../ThermoWorksBleProvisioner.js';

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

    // The device notifies scan results asynchronously after receiving the SCAN
    // command. Firing from writeValue's mock guarantees the listener is already
    // registered (addEventListener runs before writeValue in the implementation),
    // avoiding a race on microtask ordering.
    commandsChar.writeValue.mockImplementation(async () => {
      changeListener?.({ target: { value: textToDataView('WPA2,-45,HomeNetwork') } });
      changeListener?.({ target: { value: textToDataView('OPEN,-70,CoffeeShop') } });
    });

    await provisioner.scanWifiNetworks(n => found.push(n), 0);

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
