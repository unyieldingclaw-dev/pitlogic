# ThermoWorks MQTT Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ThermoWorksAdapter stub with a live MQTT implementation using the ThermaConnect open protocol, wire it through the existing telemetry pipeline, and expose settings UI for broker configuration.

**Architecture:** Browser-only mqtt.js connects to a user-managed MQTT broker (HiveMQ Cloud) and subscribes to `/probes/+/events`. A `useThermoWorksProvider` hook owns the adapter lifecycle and wires raw events through `normalizeProviderEvent → globalEventBus`, preserving the existing `eventBus → TelemetryStore` ingestion path. SettingsSheet gets a new "Live Device" section for credentials.

**Tech Stack:** `mqtt` npm package (v5, browser WebSocket support built-in), Vitest + `@testing-library/react` (already installed), TypeScript (adapter only), React JSX (hook + UI)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` | Replace stub — mqtt client lifecycle, payload transform, exactly-one listener guard |
| Create | `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts` | All adapter unit tests — transform, connect/disconnect, reconnect |
| Create | `src/hooks/useThermoWorksProvider.js` | Lifecycle hook — reads config, constructs adapter, wires to eventBus |
| Create | `src/hooks/__tests__/useThermoWorksProvider.test.js` | Hook unit tests — lifecycle, connect/disconnect, cleanup on unmount |
| Modify | `src/components/SettingsSheet.jsx` | Add "Live Device" section — broker URL, credentials, connect/disconnect button |
| Modify | `src/App.jsx` | Call `useThermoWorksProvider`, pass `{ mqttStatus, mqttError, onMqttConnect, onMqttDisconnect }` to SettingsSheet |

**Do NOT modify:** `TemperatureProvider.ts`, `EventBus.ts`, `TelemetryStore`, `normalize.ts`, any existing schemas, CsvProvider, MockProvider.

---

## Task 1: Install mqtt dependency

**Files:**
- Modify: `package.json` (handled by npm)

- [ ] **Step 1: Install the mqtt package**

```bash
npm install mqtt
```

Expected: `added N packages` with no peer dependency errors.

- [ ] **Step 2: Verify build still passes**

```bash
npm run build
```

Expected: Build completes without errors. mqtt is browser-compatible; no polyfills required.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add mqtt dependency for ThermaConnect integration"
```

---

## Task 2: TDD — `transformPayload` pure function

**Why a separate exported function:** The payload transform is pure (topic string + Buffer → RawProviderEvent[]) and testable without any mqtt connection mock. Exporting it lets Task 2's tests run without a mock broker.

**Files:**
- Create: `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
- Modify: `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` (export `transformPayload`, keep rest as stub for now)

- [ ] **Step 1: Create the test file with failing transform tests**

Create `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { transformPayload } from '../ThermoWorksAdapter.js';

const TOPIC = '/probes/M123456789012/events';

function makePayload(channels: unknown[]): Buffer {
  return Buffer.from(JSON.stringify({ gatewayId: 'M123456789012', channels }));
}

describe('transformPayload', () => {
  it('emits one event per temperature reading in a single channel', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 225.4, type: 'T' }] },
    ]);
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      probeId: 'M123456789012-ch1',
      capturedAt: 2_000_000_000_000,
      temperature: 225.4,
      unit: 'F',
      source: 'live',
    });
  });

  it('emits one event per channel when multiple channels are present', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 200.0, type: 'T' }] },
      { number: 2, ts: 2_000_000_000_000, readings: [{ value: 165.0, type: 'T' }] },
    ]);
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(2);
    expect(events[0].probeId).toBe('M123456789012-ch1');
    expect(events[1].probeId).toBe('M123456789012-ch2');
  });

  it('emits zero events when no readings have type T', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 50.0, type: 'H' }] },
    ]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('discards events with ts < 1e10 (seconds-epoch detection)', () => {
    const payload = makePayload([
      { number: 1, ts: 1_716_825_600, readings: [{ value: 200.0, type: 'T' }] },
    ]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('discards events with non-integer ts', () => {
    const payload = makePayload([
      { number: 1, ts: '2024-05-01T00:00:00Z', readings: [{ value: 200.0, type: 'T' }] },
    ]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array for malformed JSON payload', () => {
    expect(transformPayload(TOPIC, Buffer.from('not json'))).toHaveLength(0);
  });

  it('returns empty array when payload has no channels array', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'M123456789012' }));
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array for an unrecognised topic pattern', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 200.0, type: 'T' }] },
    ]);
    expect(transformPayload('/something/else', payload)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to confirm tests fail (function not yet exported)**

```bash
npm test -- --run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts
```

Expected: All 8 tests fail with import error (function doesn't exist yet).

- [ ] **Step 3: Add `transformPayload` export to `ThermoWorksAdapter.ts`**

Replace the entire content of `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` with:

```ts
/**
 * ThermoWorks RFX adapter — ThermaConnect open MQTT protocol.
 *
 * COMPLIANCE NOTICE (ADR-003): All 8 questions answered "no" for this implementation.
 * Protocol: github.com/ThermoWorks-Integrations/ThermaConnect (open, documented).
 *
 * PROHIBITED in this file:
 * - Accessing localStorage, domain state, or UI state
 * - Emitting session events (SessionStore owns session lifecycle)
 * - Inferring staleness (TelemetryStore owns stale derivation)
 * - Any analytics logic
 */

import { connectAsync } from 'mqtt';
import type { IConnackPacket, MqttClient } from 'mqtt';
import type { TemperatureProvider } from '../../core/TemperatureProvider.js';
import type { RawProviderEvent } from '../../core/ProviderTypes.js';

export interface ThermoWorksConfig {
  brokerUrl: string;
  username: string;
  password: string;
}

/**
 * Transforms a raw ThermaConnect RFX MQTT message into zero or more RawProviderEvents.
 * Pure function — exported for unit testing without a mock broker.
 */
export function transformPayload(topic: string, rawPayload: Buffer | string): RawProviderEvent[] {
  const match = topic.match(/^\/probes\/([^/]+)\/events$/);
  if (!match) return [];
  const probeTopicId = match[1];

  let parsed: unknown;
  try {
    const str = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');
    parsed = JSON.parse(str);
  } catch {
    console.warn('[thermoworks] malformed JSON payload', { topic });
    return [];
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).channels)
  ) {
    console.warn('[thermoworks] unexpected payload structure', { topic });
    return [];
  }

  const events: RawProviderEvent[] = [];
  for (const channel of (parsed as { channels: unknown[] }).channels) {
    const ch = channel as Record<string, unknown>;
    if (!Number.isInteger(ch.ts) || (ch.ts as number) < 1e10) continue;
    if (!Array.isArray(ch.readings)) continue;
    for (const reading of ch.readings as Record<string, unknown>[]) {
      if (reading.type !== 'T') continue;
      events.push({
        probeId: `${probeTopicId}-ch${ch.number}`,
        capturedAt: ch.ts as number,
        temperature: reading.value as number,
        unit: 'F',
        source: 'live',
      });
    }
  }
  return events;
}

export class ThermoWorksAdapter implements TemperatureProvider {
  readonly id = 'thermoworks';
  private readonly _config: ThermoWorksConfig;
  private _client: MqttClient | null = null;
  private _messageHandlerRegistered = false;
  private readonly _handlers = new Set<(event: RawProviderEvent) => void>();

  constructor(config: ThermoWorksConfig) {
    this._config = config;
  }

  async connect(): Promise<void> {
    if (this._client) return;
    const client = await connectAsync(this._config.brokerUrl, {
      username: this._config.username,
      password: this._config.password,
    });
    this._client = client;
    await client.subscribeAsync('/probes/+/events');
    this._registerMessageHandler();
    client.on('connect', (connack: IConnackPacket) => { void this._onReconnect(connack); });
  }

  subscribe(handler: (event: RawProviderEvent) => void): () => void {
    this._handlers.add(handler);
    return () => { this._handlers.delete(handler); };
  }

  async disconnect(): Promise<void> {
    if (!this._client) return;
    await this._client.endAsync(true);
    this._client = null;
    this._messageHandlerRegistered = false;
  }

  private _registerMessageHandler(): void {
    if (this._messageHandlerRegistered) return;
    this._client!.on('message', (topic: string, payload: Buffer) => {
      this._onMessage(topic, payload);
    });
    this._messageHandlerRegistered = true;
  }

  private async _onReconnect(connack: IConnackPacket): Promise<void> {
    if (connack.sessionPresent) return;
    await this._client!.subscribeAsync('/probes/+/events');
  }

  private _onMessage(topic: string, payload: Buffer): void {
    const events = transformPayload(topic, payload);
    for (const event of events) {
      for (const handler of this._handlers) {
        try { handler(event); } catch { /* isolate handler failures */ }
      }
    }
  }
}
```

- [ ] **Step 4: Run transform tests — expect all 8 to pass**

```bash
npm test -- --run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts
```

Expected: 8/8 pass.

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
npm test -- --run
```

Expected: All previously passing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts \
        src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts
git commit -m "feat: implement transformPayload + TDD tests (adapter core logic)"
```

---

## Task 3: TDD — `ThermoWorksAdapter` connection lifecycle

**Files:**
- Modify: `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts` (add describe block)
- No changes to the adapter itself — implementation is already written; tests verify it.

The tests use a mock `mqtt` module. `vi.mock` is hoisted by Vitest, so the mock runs before the adapter import.

- [ ] **Step 1: Add connection lifecycle tests to the existing test file**

Append this to `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts` (after the `transformPayload` describe block):

```ts
import { beforeEach, vi } from 'vitest';
import { ThermoWorksAdapter } from '../ThermoWorksAdapter.js';

// Hoisted mock values — must be defined before vi.mock() runs
const { mockConnectAsync, mockSubscribeAsync, mockEndAsync, mockClientOn, simulateMessage, simulateReconnect } =
  vi.hoisted(() => {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const mockClient = {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = [...(listeners[event] ?? []), cb];
      }),
      subscribeAsync: vi.fn().mockResolvedValue(undefined),
      endAsync: vi.fn().mockResolvedValue(undefined),
    };
    return {
      mockConnectAsync: vi.fn().mockResolvedValue(mockClient),
      mockSubscribeAsync: mockClient.subscribeAsync,
      mockEndAsync: mockClient.endAsync,
      mockClientOn: mockClient.on,
      simulateMessage: (topic: string, payload: Buffer) => {
        (listeners['message'] ?? []).forEach(cb => cb(topic, payload));
      },
      simulateReconnect: (sessionPresent: boolean) => {
        (listeners['connect'] ?? []).forEach(cb => cb({ sessionPresent }));
      },
    };
  });

vi.mock('mqtt', () => ({ connectAsync: mockConnectAsync }));

const VALID_CONFIG = { brokerUrl: 'wss://test.hivemq.cloud:8884/mqtt', username: 'u', password: 'p' };

describe('ThermoWorksAdapter — connection lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectAsync.mockResolvedValue({
      on: mockClientOn,
      subscribeAsync: mockSubscribeAsync,
      endAsync: mockEndAsync,
    });
  });

  it('connect() creates client and subscribes to /probes/+/events', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    expect(mockConnectAsync).toHaveBeenCalledWith(VALID_CONFIG.brokerUrl, {
      username: VALID_CONFIG.username,
      password: VALID_CONFIG.password,
    });
    expect(mockSubscribeAsync).toHaveBeenCalledWith('/probes/+/events');
  });

  it('connect() is idempotent — second call does not create a second client', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    await adapter.connect();
    expect(mockConnectAsync).toHaveBeenCalledTimes(1);
  });

  it('message listener is registered exactly once across connect cycles', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    // Simulate a reconnect that would naively re-register if unguarded
    simulateReconnect(false);
    const messageListenerCalls = mockClientOn.mock.calls.filter(([event]) => event === 'message');
    expect(messageListenerCalls).toHaveLength(1);
  });

  it('disconnect() calls endAsync(true) and nulls the client', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    await adapter.disconnect();
    expect(mockEndAsync).toHaveBeenCalledWith(true);
    // After disconnect, connect() should be able to create a new client
    await adapter.connect();
    expect(mockConnectAsync).toHaveBeenCalledTimes(2);
  });

  it('handler is not called after disconnect()', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    await adapter.disconnect();
    simulateMessage(
      '/probes/M123/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'M123',
        channels: [{ number: 1, ts: 2_000_000_000_000, readings: [{ value: 200, type: 'T' }] }],
      })),
    );
    expect(received).toHaveLength(0);
  });

  it('emits one normalized event per channel reading on message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage(
      '/probes/M123456789012/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'M123456789012',
        channels: [
          { number: 1, ts: 2_000_000_000_000, readings: [{ value: 225.4, type: 'T' }] },
          { number: 2, ts: 2_000_000_000_000, readings: [{ value: 165.0, type: 'T' }] },
        ],
      })),
    );
    expect(received).toHaveLength(2);
    expect(received[0]).toMatchObject({ probeId: 'M123456789012-ch1', temperature: 225.4 });
    expect(received[1]).toMatchObject({ probeId: 'M123456789012-ch2', temperature: 165.0 });
  });

  it('reconnect with sessionPresent=true does NOT resubscribe', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const callsBefore = mockSubscribeAsync.mock.calls.length;
    simulateReconnect(true);
    expect(mockSubscribeAsync.mock.calls.length).toBe(callsBefore);
  });

  it('reconnect with sessionPresent=false resubscribes once', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const callsBefore = mockSubscribeAsync.mock.calls.length;
    simulateReconnect(false);
    // Give async _onReconnect a tick
    await Promise.resolve();
    expect(mockSubscribeAsync.mock.calls.length).toBe(callsBefore + 1);
  });
});
```

- [ ] **Step 2: Run new tests — expect them to pass (implementation already written)**

```bash
npm test -- --run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts
```

Expected: All tests pass (15 total: 8 transform + 7 lifecycle).

- [ ] **Step 3: Run full suite**

```bash
npm test -- --run
```

Expected: All tests pass with no regressions.

- [ ] **Step 4: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts
git commit -m "test: add ThermoWorksAdapter lifecycle + reconnect tests"
```

---

## Task 4: TDD — `useThermoWorksProvider` hook

**Files:**
- Create: `src/hooks/__tests__/useThermoWorksProvider.test.js`
- Create: `src/hooks/useThermoWorksProvider.js`

- [ ] **Step 1: Create the test file**

Create `src/hooks/__tests__/useThermoWorksProvider.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hoisted mocks — must exist before vi.mock() runs
const { mockConnect, mockSubscribe, mockDisconnect, mockPublish, mockNormalize } = vi.hoisted(() => ({
  mockConnect: vi.fn().mockResolvedValue(undefined),
  mockSubscribe: vi.fn().mockReturnValue(() => {}),
  mockDisconnect: vi.fn().mockResolvedValue(undefined),
  mockPublish: vi.fn(),
  mockNormalize: vi.fn().mockReturnValue({ type: 'probe:reading', reading: {} }),
}));

vi.mock('../../lib/providers/adapters/thermoworks/ThermoWorksAdapter.js', () => ({
  ThermoWorksAdapter: vi.fn().mockImplementation(() => ({
    id: 'thermoworks',
    connect: mockConnect,
    subscribe: mockSubscribe,
    disconnect: mockDisconnect,
  })),
}));

vi.mock('../../lib/telemetry/eventBus/EventBus.js', () => ({
  globalEventBus: { publish: mockPublish },
}));

vi.mock('../../lib/telemetry/normalization/normalize.js', () => ({
  normalizeProviderEvent: mockNormalize,
}));

// localStorage mock
const lsMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] ?? null),
    setItem: vi.fn((key, val) => { store[key] = val; }),
    _clear: () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: lsMock, writable: true });

const VALID_CONFIG = JSON.stringify({
  brokerUrl: 'wss://test.hivemq.cloud:8884/mqtt',
  username: 'user',
  password: 'pass',
});

import { useThermoWorksProvider } from '../useThermoWorksProvider.js';

describe('useThermoWorksProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lsMock._clear();
    mockConnect.mockResolvedValue(undefined);
    mockSubscribe.mockReturnValue(() => {});
    mockDisconnect.mockResolvedValue(undefined);
  });

  it('starts with status disconnected and no error', () => {
    const { result } = renderHook(() => useThermoWorksProvider());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.error).toBeNull();
  });

  it('connect() transitions to connected when config is valid', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    expect(result.current.status).toBe('connected');
    expect(result.current.error).toBeNull();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('connect() sets error status when config is missing', async () => {
    lsMock.getItem.mockReturnValue(null);
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/broker/i);
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('connect() sets error status when adapter.connect() throws', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('ECONNREFUSED');
  });

  it('disconnect() transitions back to disconnected', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    await act(async () => { await result.current.disconnect(); });
    expect(result.current.status).toBe('disconnected');
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('calls adapter.disconnect() on unmount when connected', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    const { result, unmount } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    unmount();
    await act(async () => {});
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('wires adapter subscribe → normalizeProviderEvent → globalEventBus.publish', async () => {
    lsMock.getItem.mockReturnValue(VALID_CONFIG);
    // Capture the handler passed to subscribe
    let capturedHandler;
    mockSubscribe.mockImplementation(handler => {
      capturedHandler = handler;
      return () => {};
    });

    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });

    const fakeRaw = { probeId: 'p1', capturedAt: 2_000_000_000_000, temperature: 225, unit: 'F', source: 'live' };
    const fakeNormalized = { type: 'probe:reading', reading: {} };
    mockNormalize.mockReturnValue(fakeNormalized);

    act(() => { capturedHandler(fakeRaw); });

    expect(mockNormalize).toHaveBeenCalledWith(fakeRaw, 'thermoworks');
    expect(mockPublish).toHaveBeenCalledWith(fakeNormalized);
  });
});
```

- [ ] **Step 2: Run to confirm all tests fail (hook not yet created)**

```bash
npm test -- --run src/hooks/__tests__/useThermoWorksProvider.test.js
```

Expected: All 7 tests fail with module not found error.

- [ ] **Step 3: Create `src/hooks/useThermoWorksProvider.js`**

```js
// This hook is the sole bridge between the provider boundary and the telemetry pipeline.
// It is the only non-lib file permitted to import from src/lib/providers/ and
// src/lib/telemetry/eventBus/ — see ADR-001 and the design spec.
import { useState, useEffect, useRef, useCallback } from 'react';
import { ThermoWorksAdapter } from '../lib/providers/adapters/thermoworks/ThermoWorksAdapter.js';
import { normalizeProviderEvent } from '../lib/telemetry/normalization/normalize.js';
import { globalEventBus } from '../lib/telemetry/eventBus/EventBus.js';

const STORAGE_KEY = 'pitlogic-mqtt-v1';

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useThermoWorksProvider() {
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const sessionRef = useRef(null); // { adapter, unsub }

  const connect = useCallback(async () => {
    const config = loadConfig();
    if (!config?.brokerUrl || !config?.username || !config?.password) {
      setError('Missing broker configuration. Set broker URL, username, and password first.');
      setStatus('error');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const adapter = new ThermoWorksAdapter(config);
      const unsub = adapter.subscribe(rawEvent => {
        const normalized = normalizeProviderEvent(rawEvent, adapter.id);
        globalEventBus.publish(normalized);
      });
      await adapter.connect();
      sessionRef.current = { adapter, unsub };
      setStatus('connected');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!sessionRef.current) return;
    const { adapter, unsub } = sessionRef.current;
    unsub();
    await adapter.disconnect();
    sessionRef.current = null;
    setStatus('disconnected');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      if (session) {
        session.unsub();
        void session.adapter.disconnect();
        sessionRef.current = null;
      }
    };
  }, []);

  return { status, error, connect, disconnect };
}
```

- [ ] **Step 4: Run hook tests — expect all 7 to pass**

```bash
npm test -- --run src/hooks/__tests__/useThermoWorksProvider.test.js
```

Expected: 7/7 pass.

- [ ] **Step 5: Run full suite**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useThermoWorksProvider.js src/hooks/__tests__/useThermoWorksProvider.test.js
git commit -m "feat: implement useThermoWorksProvider hook with lifecycle + eventBus wiring"
```

---

## Task 5: Wire hook into `App.jsx`

**Files:**
- Modify: `src/App.jsx`

The hook is called once at the App level (parallel to `usePrefs`, `useSmokerAlert`, etc.) and its return values are passed as props to SettingsSheet.

- [ ] **Step 1: Add import to App.jsx**

In `src/App.jsx`, find the existing hook imports (around line 4–10, near `import { usePrefs }`) and add:

```js
import { useThermoWorksProvider } from './hooks/useThermoWorksProvider.js';
```

- [ ] **Step 2: Call the hook inside the App component**

In `src/App.jsx`, find where other hooks are called (near `const { prefs, setCutPref, resetCutPref, setTheme } = usePrefs();`) and add immediately after:

```js
const mqttProvider = useThermoWorksProvider();
```

- [ ] **Step 3: Pass props to SettingsSheet**

In `src/App.jsx`, find the `<SettingsSheet` JSX (around line 523) and add four new props:

```jsx
<SettingsSheet
  open={showSettings}
  onClose={() => setShowSettings(false)}
  cookState={cookState}
  recipes={recipes}
  onImportCooks={handleImportCooks}
  onImportRecipes={handleImportRecipes}
  prefs={prefs}
  resetCutPref={resetCutPref}
  setTheme={setTheme}
  mqttStatus={mqttProvider.status}
  mqttError={mqttProvider.error}
  onMqttConnect={mqttProvider.connect}
  onMqttDisconnect={mqttProvider.disconnect}
/>
```

(Keep all existing props. Only add the four `mqtt*` ones.)

- [ ] **Step 4: Verify the build compiles**

```bash
npm run build
```

Expected: Build succeeds. SettingsSheet will not yet render the new section — that's fine.

- [ ] **Step 5: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire useThermoWorksProvider into App.jsx and pass to SettingsSheet"
```

---

## Task 6: Add "Live Device" section to `SettingsSheet.jsx`

**Files:**
- Modify: `src/components/SettingsSheet.jsx`

- [ ] **Step 1: Update the component signature and add state**

In `src/components/SettingsSheet.jsx`, replace the existing function signature line:

```jsx
export default function SettingsSheet({ open, onClose, cookState, recipes, onImportCooks, onImportRecipes, prefs, resetCutPref, setTheme }) {
```

with:

```jsx
export default function SettingsSheet({ open, onClose, cookState, recipes, onImportCooks, onImportRecipes, prefs, resetCutPref, setTheme, mqttStatus, mqttError, onMqttConnect, onMqttDisconnect }) {
```

Then, inside the component body (after the existing `const [error, setError] = useState(null);` line), add:

```jsx
const [mqttConfig, setMqttConfig] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('pitlogic-mqtt-v1') ?? 'null') ??
      { brokerUrl: '', username: '', password: '' };
  } catch {
    return { brokerUrl: '', username: '', password: '' };
  }
});
const [mqttSaved, setMqttSaved] = useState(false);

const handleMqttSave = () => {
  localStorage.setItem('pitlogic-mqtt-v1', JSON.stringify(mqttConfig));
  setMqttSaved(true);
  setTimeout(() => setMqttSaved(false), 2000);
};
```

- [ ] **Step 2: Add the "Live Device" section JSX**

In `src/components/SettingsSheet.jsx`, find the closing of the `{/* Export */}` card (the `<div className="card" style={{ marginBottom: '1rem' }}>` that contains the Backup section). Add the new Live Device section BEFORE the Backup card:

```jsx
{/* Live Device */}
<div className="card" style={{ marginBottom: '1rem' }}>
  <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
    Live Device
  </div>
  <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12 }}>
    Connect to a ThermoWorks RFX Gateway via your MQTT broker.{' '}
    <span style={{ color: 'var(--amber)', fontSize: 12 }}>
      Browser compromise = MQTT credential compromise. Personal use only.
    </span>
  </div>

  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
    <div>
      <label htmlFor="mqtt-broker-url" style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
        Broker URL
      </label>
      <input
        id="mqtt-broker-url"
        type="text"
        value={mqttConfig.brokerUrl}
        onChange={e => setMqttConfig(c => ({ ...c, brokerUrl: e.target.value }))}
        placeholder="wss://your-cluster.hivemq.cloud:8884/mqtt"
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
          fontSize: 13, fontFamily: 'var(--mono)' }}
      />
    </div>
    <div>
      <label htmlFor="mqtt-username" style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
        Username
      </label>
      <input
        id="mqtt-username"
        type="text"
        value={mqttConfig.username}
        onChange={e => setMqttConfig(c => ({ ...c, username: e.target.value }))}
        placeholder="pitlogic"
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
          fontSize: 13 }}
      />
    </div>
    <div>
      <label htmlFor="mqtt-password" style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
        Password
      </label>
      <input
        id="mqtt-password"
        type="password"
        value={mqttConfig.password}
        onChange={e => setMqttConfig(c => ({ ...c, password: e.target.value }))}
        placeholder="••••••••"
        style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
          fontSize: 13 }}
      />
    </div>
  </div>

  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    <button className="btn-ghost" onClick={handleMqttSave}
      style={{ fontSize: 13, padding: '6px 14px' }}>
      {mqttSaved ? 'Saved ✓' : 'Save'}
    </button>
    {mqttStatus === 'connected' ? (
      <button className="btn-ghost" onClick={onMqttDisconnect}
        aria-label="Disconnect from MQTT broker"
        style={{ fontSize: 13, padding: '6px 14px', color: 'var(--red)', borderColor: 'var(--red)' }}>
        Disconnect
      </button>
    ) : (
      <button className="btn-primary" onClick={onMqttConnect}
        disabled={mqttStatus === 'connecting'}
        aria-label="Connect to MQTT broker"
        style={{ fontSize: 13, padding: '6px 14px' }}>
        {mqttStatus === 'connecting' ? 'Connecting…' : 'Connect'}
      </button>
    )}
    <span style={{ fontSize: 12, color: mqttStatus === 'connected' ? 'var(--green)' :
      mqttStatus === 'error' ? 'var(--red)' : 'var(--text3)' }}
      role="status" aria-live="polite">
      {mqttStatus === 'connected' && '● Connected'}
      {mqttStatus === 'connecting' && '○ Connecting…'}
      {mqttStatus === 'disconnected' && '○ Disconnected'}
      {mqttStatus === 'error' && `✕ ${mqttError ?? 'Error'}`}
    </span>
  </div>
</div>
```

- [ ] **Step 3: Verify build succeeds**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test -- --run
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsSheet.jsx
git commit -m "feat: add Live Device section to SettingsSheet for MQTT broker config"
```

---

## Task 7: Final verification and push

- [ ] **Step 1: Run full test suite one more time**

```bash
npm test -- --run
```

Expected: All tests pass. Test count should be 146 + 15 (adapter) + 7 (hook) = 168 or more.

- [ ] **Step 2: Start dev server and manually test the feature**

```bash
npm run dev
```

Open http://localhost:5173/pitlogic/ in a browser, open Settings, verify:
- "Live Device" section is visible
- Broker URL, Username, Password fields render correctly
- Save button writes to localStorage (check DevTools → Application → Local Storage → `pitlogic-mqtt-v1`)
- Connect button is enabled, Disconnect button is not shown when disconnected
- Status indicator shows "○ Disconnected"

**Without a real broker:** Enter `wss://nonexistent.hivemq.cloud:8884/mqtt` and click Connect. Verify status shows "✕ Error" with a readable message.

- [ ] **Step 3: Update memory-bank/progress.md**

Update the ThermoWorks section in `memory-bank/progress.md`:

```markdown
### ThermoWorks Real-Time Integration
- [x] Design spec complete — `docs/superpowers/specs/2026-05-27-thermoworks-mqtt-adapter-design.md`
- [x] Implementation plan — `docs/superpowers/plans/2026-05-27-thermoworks-mqtt-adapter.md`
- [x] `ThermoWorksAdapter` — ThermaConnect MQTT implementation with full test coverage
- [x] `useThermoWorksProvider` hook — lifecycle orchestration + eventBus wiring
- [x] "Live Device" section in SettingsSheet
- [ ] Verify HiveMQ Cloud ACL topic isolation before first live use
- [ ] End-to-end test with real RFX Gateway + HiveMQ Cloud broker
```

- [ ] **Step 4: Commit the progress update**

```bash
git add memory-bank/progress.md
git commit -m "chore: update progress.md — ThermoWorks MQTT adapter implementation complete"
```

- [ ] **Step 5: Push to origin/main**

```bash
git push origin main
```

Expected: Push succeeds, CI runs (tests pass, build passes, file size gate passes), GitHub Pages auto-deploys.

---

## Broker Setup Reference (for end-to-end testing)

Before connecting a real RFX Gateway:

1. Create a free HiveMQ Cloud cluster at `hivemq.com/mqtt-cloud-broker/`
2. In the cluster console, create a credential (username + password)
3. In Access Management → Default permissions, verify topic ACL restricts to `/probes/#` for that credential
4. In ThermoWorks provisioning tool, set broker to `wss://your-cluster.hivemq.cloud:8884/mqtt` with the same credentials
5. In PitLogic Settings → Live Device, enter the same broker URL + credentials → Save → Connect

The wildcard subscription `/probes/+/events` will auto-discover all probes published by the gateway.
