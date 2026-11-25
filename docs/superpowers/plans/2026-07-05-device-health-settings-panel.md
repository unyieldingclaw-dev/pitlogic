# Device Health & Accuracy (Settings Panel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface ThermoWorks gateway/probe health (wifi strength, battery, firmware, unit mismatch) in a new Settings panel, sourced entirely from `TelemetryStore` — currently-dropped battery/firmware payloads stop being silently discarded.

**Architecture:** Extend `ThermoWorksAdapter` to subscribe to `/devices/+/state` alongside the existing `/probes/+/events`, recognize the two payload shapes it previously dropped (battery-only, gateway state), and emit two new normalized event types (`gateway:state`, `probe:battery`). `TelemetryStore` gains a `gatewayState` map and `ProbeState.battery`. A `TelemetryStore` singleton is wired into the running app for the first time (it currently exists only in its own test suite) via a new `useTelemetryStore` hook, which `SettingsSheet` reads to render a new "Device Health" panel.

**Tech Stack:** TypeScript (`src/lib/`), React 19 JSX, Zod, Vitest.

**Scope note:** The originally-approved design also called for an inline 🔋 icon next to cook-probe rows in `ActiveTab`. That requires a cook-probe ↔ live-gateway-probe linkage that doesn't exist in the codebase today and wasn't part of the reviewed design — it's deliberately out of scope here and will get its own brainstorm-then-plan cycle. This plan also drops `channelLabels` from `GatewayState`: the RFX SDK's State Object (what `/devices/{id}/state` actually sends) does not document per-channel labels — those live in the separate Config Object (`/devices/{id}/config`), which belongs to the bidirectional-config plan, not this one.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/telemetry/domain/GatewayState.ts` | **New.** `GatewayState` type — gateway-level health snapshot. |
| `src/lib/telemetry/domain/ProbeSemantics.ts` | **Modify.** Add `battery: number \| null` to `ProbeState`. |
| `src/lib/telemetry/domain/TelemetryEvents.ts` | **Modify.** Add `GatewayStateEvent` and `ProbeBatteryEvent` to the `NormalizedTelemetryEvent` union. |
| `src/lib/telemetry/normalization/schemas.ts` | **Modify.** Add `RawGatewayStateSchema`, `RawProbeBatterySchema`. |
| `src/lib/telemetry/normalization/normalize.ts` | **Modify.** Recognize the two new raw shapes, emit the two new event types. |
| `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` | **Modify.** Subscribe to `/devices/+/state`; extend `transformPayload` with a `TransformOptions` param (`now`, `getUnitsForGateway`); track a per-gateway units cache. |
| `src/lib/telemetry/store/StoreTypes.ts` | **Modify.** Add `gatewayState: Map<string, GatewayState>` to `TelemetryStoreState`. |
| `src/lib/telemetry/store/TelemetryStore.ts` | **Modify.** Handle `gateway:state` and `probe:battery` events; expose `getGatewayState()`. |
| `src/lib/telemetry/store/globalStore.ts` | **New.** `globalTelemetryStore` singleton (mirrors `globalEventBus` in `EventBus.ts`). |
| `src/hooks/useTelemetryStore.js` | **New.** React bridge — subscribes a component to `globalTelemetryStore`, returns `{ probes, gatewayState }`. This is the second file (with `useThermoWorksProvider.js`) permitted to import from `src/lib/telemetry/` per ADR-001; it does not import from `src/lib/providers/`. |
| `src/components/SettingsSheet.jsx` | **Modify.** New "Device Health" card in the Live Device section. |

---

## Task 1: Domain types

**Files:**
- Create: `src/lib/telemetry/domain/GatewayState.ts`
- Modify: `src/lib/telemetry/domain/ProbeSemantics.ts`
- Modify: `src/lib/telemetry/domain/TelemetryEvents.ts`

- [ ] **Step 1: Create the `GatewayState` domain type**

```typescript
// src/lib/telemetry/domain/GatewayState.ts
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
```

- [ ] **Step 2: Add `battery` to `ProbeState`**

Edit `src/lib/telemetry/domain/ProbeSemantics.ts`:

```typescript
import type { ActiveReading } from './TelemetryModels.js';

export interface ProbeState {
  probeId: string;
  label: string;
  /** Inventory/config metadata — not telemetry-derived. */
  occupancy: 'occupied' | 'empty';
  /** Derived by TelemetryStore from capturedAt delta and readings. */
  status: 'active' | 'disconnected' | 'stale';
  lastReading: ActiveReading | null;
  targetTemp: number | null;
  /** Percent (0-100) from the probe's own battery event. Null until first reported. */
  battery: number | null;
}
```

- [ ] **Step 3: Add the two new event types**

Edit `src/lib/telemetry/domain/TelemetryEvents.ts` — add after `ProbeErrorEvent`:

```typescript
interface GatewayStateEvent {
  type: 'gateway:state';
  gatewayId: string;
  wifiStrength: number | null;
  battery: string | null;
  firmware: string | null;
  units: 'F' | 'C';
  timestamp: number;
}

interface ProbeBatteryEvent {
  type: 'probe:battery';
  probeId: string;
  battery: number;
  timestamp: number;
}
```

And add both to the exported union:

```typescript
export type NormalizedTelemetryEvent =
  | ProviderConnectedEvent
  | ProviderDisconnectedEvent
  | ProviderErrorEvent
  | ProbeReadingEvent
  | ProbeDisconnectedEvent
  | SessionStartedEvent
  | SessionEndedEvent
  | ProbeErrorEvent
  | NormalizationRejectedEvent
  | GatewayStateEvent
  | ProbeBatteryEvent;
```

- [ ] **Step 4: Fix the two `ProbeState` construction sites that predate `battery`**

Making `battery` a required field breaks the whole-program typecheck immediately: `TelemetryStore.ts` already constructs two `ProbeState` object literals (in `applyActiveReading` and `applyDisconnect`) that don't set it. This is a required fixup for Task 1 to compile — not new behavior, and not the same as Task 4's later additions (new event handling, new methods).

Edit `src/lib/telemetry/store/TelemetryStore.ts`. In `applyActiveReading`, add one field to the object literal:

```typescript
      targetTemp: existing?.targetTemp ?? null,
      battery: existing?.battery ?? null,
```

(i.e. add `battery: existing?.battery ?? null,` immediately after the existing `targetTemp` line — same pattern, preserves any previously-known value.)

Do the same in `applyDisconnect`'s object literal.

Do not add anything else to this file in this task — no new methods, no new event handling. That's Task 4.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/telemetry/domain/GatewayState.ts src/lib/telemetry/domain/ProbeSemantics.ts src/lib/telemetry/domain/TelemetryEvents.ts src/lib/telemetry/store/TelemetryStore.ts
git commit -m "feat: add GatewayState domain type and gateway/probe-battery events"
```

---

## Task 2: Normalization — raw schemas and `normalizeProviderEvent`

**Files:**
- Modify: `src/lib/telemetry/normalization/schemas.ts`
- Modify: `src/lib/telemetry/normalization/normalize.ts`
- Test: `src/lib/telemetry/normalization/__tests__/normalize.test.ts`

- [ ] **Step 1: Write the failing tests**

Read the existing test file first to match its style:

```bash
cat src/lib/telemetry/normalization/__tests__/normalize.test.ts
```

Append these cases (adjust the `import` line if the existing file doesn't already import `normalizeProviderEvent` from `'../normalize.js'`):

```typescript
describe('normalizeProviderEvent — gateway state', () => {
  it('normalizes a gateway-state raw event', () => {
    const raw = {
      gatewayId: 'M123456789012',
      capturedAt: 2_000_000_000_000,
      wifiStrength: 88,
      battery: 'C',
      firmware: 'v2.45',
      units: 'F',
    };
    const result = normalizeProviderEvent(raw, 'thermoworks');
    expect(result).toEqual({
      type: 'gateway:state',
      gatewayId: 'M123456789012',
      wifiStrength: 88,
      battery: 'C',
      firmware: 'v2.45',
      units: 'F',
      timestamp: 2_000_000_000_000,
    });
  });

  it('defaults missing optional fields to null on a gateway-state event', () => {
    const raw = { gatewayId: 'M123456789012', capturedAt: 2_000_000_000_000 };
    const result = normalizeProviderEvent(raw, 'thermoworks');
    expect(result).toEqual({
      type: 'gateway:state',
      gatewayId: 'M123456789012',
      wifiStrength: null,
      battery: null,
      firmware: null,
      units: 'F',
      timestamp: 2_000_000_000_000,
    });
  });
});

describe('normalizeProviderEvent — probe battery', () => {
  it('normalizes a probe-battery raw event', () => {
    const raw = { probeId: 'M123456789012-ch1', capturedAt: 2_000_000_000_000, battery: 42 };
    const result = normalizeProviderEvent(raw, 'thermoworks');
    expect(result).toEqual({
      type: 'probe:battery',
      probeId: 'M123456789012-ch1',
      battery: 42,
      timestamp: 2_000_000_000_000,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/telemetry/normalization/__tests__/normalize.test.ts`
Expected: FAIL — the three new cases produce `{ type: 'normalization:rejected', ... }` instead of the expected shapes, because no schema recognizes these raw shapes yet.

- [ ] **Step 3: Add the two new raw schemas**

Edit `src/lib/telemetry/normalization/schemas.ts` — add at the end:

```typescript
export const RawGatewayStateSchema = z.object({
  gatewayId: z.string().min(1),
  capturedAt: z.number().int().positive(),
  wifiStrength: z.number().optional(),
  battery: z.string().optional(),
  firmware: z.string().optional(),
  units: z.enum(['F', 'C']).optional(),
});

export const RawProbeBatterySchema = z.object({
  probeId: z.string().min(1),
  capturedAt: z.number().int().positive(),
  battery: z.number(),
});
```

- [ ] **Step 4: Extend `normalizeProviderEvent` to recognize them**

Edit `src/lib/telemetry/normalization/normalize.ts`. Update the import line:

```typescript
import { RawActiveReadingSchema, RawDisconnectedReadingSchema, RawGatewayStateSchema, RawProbeBatterySchema } from './schemas.js';
```

Insert two new checks after the `activeResult` block and before the final `normalization:rejected` fallback:

```typescript
  const gatewayStateResult = RawGatewayStateSchema.safeParse(raw);
  if (gatewayStateResult.success) {
    const g = gatewayStateResult.data;
    return {
      type: 'gateway:state',
      gatewayId: g.gatewayId,
      wifiStrength: g.wifiStrength ?? null,
      battery: g.battery ?? null,
      firmware: g.firmware ?? null,
      units: g.units ?? 'F',
      timestamp: g.capturedAt,
    };
  }

  const probeBatteryResult = RawProbeBatterySchema.safeParse(raw);
  if (probeBatteryResult.success) {
    const b = probeBatteryResult.data;
    return { type: 'probe:battery', probeId: b.probeId, battery: b.battery, timestamp: b.capturedAt };
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/telemetry/normalization/__tests__/normalize.test.ts`
Expected: PASS, all cases including the 3 new ones and every pre-existing case.

- [ ] **Step 6: Commit**

```bash
git add src/lib/telemetry/normalization/schemas.ts src/lib/telemetry/normalization/normalize.ts src/lib/telemetry/normalization/__tests__/normalize.test.ts
git commit -m "feat: normalize gateway-state and probe-battery raw events"
```

---

## Task 3: `ThermoWorksAdapter` — new subscription, extended `transformPayload`, units cache

**Files:**
- Modify: `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`
- Test: `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`

- [ ] **Step 1: Write the failing `transformPayload` tests**

Add to the top `describe('transformPayload', ...)` block in the test file:

```typescript
  it('emits a gateway:state-shaped raw event for a device state topic', () => {
    const payload = Buffer.from(JSON.stringify({
      wifi_strength: 88, battery: 'C', firmware: 'v2.45', units: 'F',
    }));
    const events = transformPayload('/devices/M123456789012/state', payload, { now: 5_000 });
    expect(events).toEqual([
      { gatewayId: 'M123456789012', capturedAt: 5_000, wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F' },
    ]);
  });

  it('gateway:state raw event omits fields absent from the payload', () => {
    const payload = Buffer.from(JSON.stringify({ wifi_strength: 50 }));
    const events = transformPayload('/devices/M123456789012/state', payload, { now: 5_000 });
    expect(events).toEqual([
      { gatewayId: 'M123456789012', capturedAt: 5_000, wifiStrength: 50 },
    ]);
  });

  it('emits a probe-battery raw event when a probe payload has battery but no channels', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'M123456789012', battery: 42 }));
    const events = transformPayload('/probes/M123456789012/events', payload, { now: 5_000 });
    expect(events).toEqual([
      { probeId: 'M123456789012-ch1', capturedAt: 5_000, battery: 42 },
    ]);
  });

  it('still returns empty array for a probe payload with neither channels nor battery', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'M123456789012', firmware: '1.1.10' }));
    expect(transformPayload('/probes/M123456789012/events', payload)).toHaveLength(0);
  });

  it('injects gateway units into channel readings via getUnitsForGateway', () => {
    const payload = Buffer.from(JSON.stringify({
      gatewayId: 'M123456789012',
      channels: [{ number: 1, ts: 2_000_000_000_000, readings: [{ value: 100.0, type: 'T' }] }],
    }));
    const events = transformPayload('/probes/M123456789012/events', payload, {
      getUnitsForGateway: () => 'C',
    });
    expect(events[0]).toMatchObject({ unit: 'C' });
  });

  it('defaults to F units when getUnitsForGateway is not provided', () => {
    const payload = Buffer.from(JSON.stringify({
      gatewayId: 'M123456789012',
      channels: [{ number: 1, ts: 2_000_000_000_000, readings: [{ value: 100.0, type: 'T' }] }],
    }));
    const events = transformPayload('/probes/M123456789012/events', payload);
    expect(events[0]).toMatchObject({ unit: 'F' });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
Expected: FAIL — `/devices/.../state` isn't matched by any topic regex yet, battery-only probe payloads still return `[]`, and `unit` is hardcoded to `'F'` regardless of `getUnitsForGateway`.

- [ ] **Step 3: Extend `transformPayload`**

Replace the whole `transformPayload` function in `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` with:

```typescript
export interface TransformOptions {
  now?: number;
  getUnitsForGateway?: (gatewayId: string) => 'F' | 'C';
}

export function transformPayload(topic: string, rawPayload: Buffer | string, opts: TransformOptions = {}): RawProviderEvent[] {
  const now = opts.now ?? Date.now();
  const getUnits = opts.getUnitsForGateway ?? (() => 'F' as const);

  const deviceStateMatch = topic.match(/^\/devices\/([^/]+)\/state$/);
  const probeEventsMatch = topic.match(/^\/probes\/([^/]+)\/events$/);
  if (!deviceStateMatch && !probeEventsMatch) return [];

  let parsed: unknown;
  try {
    const str = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');
    parsed = JSON.parse(str);
  } catch {
    console.warn('[thermoworks] malformed JSON payload', { topic });
    return [];
  }

  if (typeof parsed !== 'object' || parsed === null) {
    console.warn('[thermoworks] unexpected payload structure', { topic });
    return [];
  }
  const body = parsed as Record<string, unknown>;

  if (deviceStateMatch) {
    const gatewayId = deviceStateMatch[1];
    const event: RawProviderEvent = { gatewayId, capturedAt: now };
    if (typeof body.wifi_strength === 'number') event.wifiStrength = body.wifi_strength;
    if (typeof body.battery === 'string') event.battery = body.battery;
    if (typeof body.firmware === 'string') event.firmware = body.firmware;
    if (body.units === 'F' || body.units === 'C') event.units = body.units;
    return [event];
  }

  const probeTopicId = probeEventsMatch![1];

  if (!Array.isArray(body.channels)) {
    if (typeof body.battery === 'number') {
      // WHY ch1: RFX probes are single-channel devices (see RFX Probe Information in the
      // SDK docs) — the battery sub-payload has no per-channel breakdown, so it applies to
      // the probe's sole channel.
      return [{ probeId: `${probeTopicId}-ch1`, capturedAt: now, battery: body.battery }];
    }
    console.warn('[thermoworks] unexpected payload structure', { topic });
    return [];
  }

  const gatewayUnits = getUnits(probeTopicId);
  const events: RawProviderEvent[] = [];
  for (const channel of body.channels as unknown[]) {
    const ch = channel as Record<string, unknown>;
    if (!Number.isInteger(ch.ts) || (ch.ts as number) < 1e10) continue;
    if (!Array.isArray(ch.readings)) continue;
    for (const reading of ch.readings as Record<string, unknown>[]) {
      if (reading.type !== 'T') continue;
      events.push({
        probeId: `${probeTopicId}-ch${ch.number}`,
        capturedAt: ch.ts as number,
        temperature: reading.value as number,
        unit: gatewayUnits,
        source: 'live',
      });
    }
  }
  return events;
}
```

**WHY `probeTopicId` used as the gateway-units lookup key, not `gatewayId`:** the probe-events payload's `gatewayId` field and the topic's probe ID are the same value in every documented sample (a gateway forwards one probe's channels under that probe's own topic ID) — using the already-extracted `probeTopicId` avoids a second JSON field read for something already in hand from the topic match.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
Expected: PASS — all new cases plus every pre-existing `transformPayload` case (the class-lifecycle tests further down the file aren't touched by this step).

- [ ] **Step 5: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts
git commit -m "feat: recognize device-state and probe-battery payloads in transformPayload"
```

- [ ] **Step 6: Write the failing subscription test**

Add to the `describe('ThermoWorksAdapter — connection lifecycle', ...)` block:

```typescript
  it('connect() also subscribes to /devices/+/state', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    expect(mockSubscribeAsync).toHaveBeenCalledWith('/devices/+/state');
  });

  it('reconnect with sessionPresent=false resubscribes to both topics', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const callsBefore = mockSubscribeAsync.mock.calls.length;
    simulateReconnect(false);
    await Promise.resolve();
    expect(mockSubscribeAsync.mock.calls.length).toBe(callsBefore + 2);
  });

  it('caches gateway units from a device-state message and applies them to subsequent probe readings', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    simulateMessage('/devices/M123456789012/state', Buffer.from(JSON.stringify({ units: 'C' })));
    simulateMessage(
      '/probes/M123456789012/events',
      Buffer.from(JSON.stringify({
        gatewayId: 'M123456789012',
        channels: [{ number: 1, ts: 2_000_000_000_000, readings: [{ value: 100.0, type: 'T' }] }],
      })),
    );
    const readingEvent = received.find(e => (e as Record<string, unknown>).temperature !== undefined);
    expect(readingEvent).toMatchObject({ unit: 'C' });
  });
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
Expected: FAIL — `connect()` only subscribes to `/probes/+/events` today; there is no units cache.

- [ ] **Step 8: Wire the subscription and units cache into the adapter class**

In `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`, add a private field and update `connect`, `_onReconnect`, and `_onMessage`:

```typescript
  private readonly _gatewayUnits = new Map<string, 'F' | 'C'>();
```

Replace `connect()`:

```typescript
  async connect(): Promise<void> {
    if (this._client) return;
    const client = await mqtt.connectAsync(this._config.brokerUrl, {
      username: this._config.username,
      password: this._config.password,
    });
    this._client = client;
    await client.subscribeAsync('/probes/+/events');
    await client.subscribeAsync('/devices/+/state');
    this._registerMessageHandler();
    client.on('connect', (connack: IConnackPacket) => { void this._onReconnect(connack); });
  }
```

Replace `_onReconnect`:

```typescript
  private async _onReconnect(connack: IConnackPacket): Promise<void> {
    if (connack.sessionPresent || !this._client) return;
    await this._client.subscribeAsync('/probes/+/events');
    await this._client.subscribeAsync('/devices/+/state');
  }
```

Replace `_onMessage`:

```typescript
  private _onMessage(topic: string, payload: Buffer): void {
    const events = transformPayload(topic, payload, {
      now: Date.now(),
      getUnitsForGateway: (gatewayId) => this._gatewayUnits.get(gatewayId) ?? 'F',
    });
    for (const event of events) {
      if (typeof event.gatewayId === 'string' && typeof event.units === 'string') {
        this._gatewayUnits.set(event.gatewayId, event.units as 'F' | 'C');
      }
      for (const handler of this._handlers) {
        try { handler(event); } catch { /* isolate handler failures — user code must not block other handlers */ }
      }
    }
  }
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
Expected: PASS — full file, all tests (old and new).

- [ ] **Step 10: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts
git commit -m "feat: subscribe to /devices/+/state and cache per-gateway units"
```

---

## Task 4: `TelemetryStore` — handle the new events

**Files:**
- Modify: `src/lib/telemetry/store/StoreTypes.ts`
- Modify: `src/lib/telemetry/store/TelemetryStore.ts`
- Test: `src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`:

```typescript
  it('registers gateway state on gateway:state', () => {
    const { bus, store } = makeStore();
    bus.publish({
      type: 'gateway:state', gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', timestamp: Date.now(),
    });
    const gw = store.getGatewayState().get('gw1');
    expect(gw).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F' });
  });

  it('merges partial gateway:state updates onto the existing entry', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: 88, battery: null, firmware: null, units: 'F', timestamp: Date.now() });
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: null, battery: 'C', firmware: null, units: 'F', timestamp: Date.now() });
    expect(store.getGatewayState().get('gw1')).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: null, units: 'F' });
  });

  it('sets battery on the matching probe when probe:battery arrives', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'probe:reading', reading: fakeActiveReading('p1', 200) });
    bus.publish({ type: 'probe:battery', probeId: 'p1', battery: 15, timestamp: Date.now() });
    expect(store.getProbes().get('p1')?.battery).toBe(15);
  });

  it('creates a probe entry from probe:battery alone if the probe is unknown', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'probe:battery', probeId: 'new-probe', battery: 15, timestamp: Date.now() });
    const probe = store.getProbes().get('new-probe');
    expect(probe?.battery).toBe(15);
    expect(probe?.status).toBe('disconnected');
  });

  it('notifies listeners on gateway:state and probe:battery', () => {
    const { bus, store } = makeStore();
    const calls: number[] = [];
    store.subscribe(() => calls.push(1));
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: 1, battery: null, firmware: null, units: 'F', timestamp: Date.now() });
    bus.publish({ type: 'probe:battery', probeId: 'p1', battery: 15, timestamp: Date.now() });
    expect(calls).toHaveLength(2);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`
Expected: FAIL — `store.getGatewayState` doesn't exist yet; `gateway:state`/`probe:battery` events aren't handled by `handleEvent`.

- [ ] **Step 3: Add `gatewayState` to `StoreTypes.ts`**

```typescript
// src/lib/telemetry/store/StoreTypes.ts
import type { ProbeState } from '../domain/ProbeSemantics.js';
import type { GatewayState } from '../domain/GatewayState.js';

export const STALE_THRESHOLD_MS = 30_000;

export interface TelemetryStoreState {
  probes: Map<string, ProbeState>;
  gatewayState: Map<string, GatewayState>;
}
```

- [ ] **Step 4: Extend `TelemetryStore`**

Edit `src/lib/telemetry/store/TelemetryStore.ts`. Update imports:

```typescript
import type { NormalizedTelemetryEvent } from '../domain/TelemetryEvents.js';
import type { ProbeState } from '../domain/ProbeSemantics.js';
import type { GatewayState } from '../domain/GatewayState.js';
import type { ActiveReading } from '../domain/TelemetryModels.js';
import type { IEventBus } from '../eventBus/types.js';
import { STALE_THRESHOLD_MS } from './StoreTypes.js';
```

Add a private field alongside `probes`:

```typescript
  private readonly gatewayStateMap = new Map<string, GatewayState>();
```

Add a public getter alongside `getProbes`:

```typescript
  getGatewayState(): ReadonlyMap<string, GatewayState> {
    return this.gatewayStateMap;
  }
```

Update `handleEvent` to dispatch the two new event types:

```typescript
  private handleEvent(event: NormalizedTelemetryEvent): void {
    if (event.type === 'probe:reading') {
      this.applyActiveReading(event.reading);
    } else if (event.type === 'probe:disconnected') {
      this.applyDisconnect(event.reading.probeId);
    } else if (event.type === 'gateway:state') {
      this.applyGatewayState(event);
    } else if (event.type === 'probe:battery') {
      this.applyProbeBattery(event.probeId, event.battery);
    }
  }
```

Add the two new private handlers (place after `applyDisconnect`):

```typescript
  private applyGatewayState(event: Extract<NormalizedTelemetryEvent, { type: 'gateway:state' }>): void {
    const existing = this.gatewayStateMap.get(event.gatewayId);
    const state: GatewayState = {
      gatewayId: event.gatewayId,
      wifiStrength: event.wifiStrength ?? existing?.wifiStrength ?? null,
      battery: event.battery ?? existing?.battery ?? null,
      firmware: event.firmware ?? existing?.firmware ?? null,
      units: event.units,
    };
    this.gatewayStateMap.set(event.gatewayId, state);
    this.notify();
  }

  private applyProbeBattery(probeId: string, battery: number): void {
    const existing = this.probes.get(probeId);
    const probe: ProbeState = {
      probeId,
      label: existing?.label ?? probeId,
      occupancy: existing?.occupancy ?? 'occupied',
      status: existing?.status ?? 'disconnected',
      lastReading: existing?.lastReading ?? null,
      targetTemp: existing?.targetTemp ?? null,
      battery,
    };
    this.probes.set(probeId, probe);
    this.notify();
  }
```

`applyActiveReading` and `applyDisconnect` should already preserve `battery: existing?.battery ?? null` — Task 1 fixed this as a compile-error prerequisite (adding the required `battery` field to `ProbeState` broke these two construction sites immediately). Run `git log -p -- src/lib/telemetry/store/TelemetryStore.ts` if you want to confirm; if for any reason that fix isn't present, add `battery: existing?.battery ?? null` to both object literals now before proceeding.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`
Expected: PASS — full file.

- [ ] **Step 6: Typecheck the whole lib**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/telemetry/store/StoreTypes.ts src/lib/telemetry/store/TelemetryStore.ts src/lib/telemetry/store/__tests__/TelemetryStore.test.ts
git commit -m "feat: handle gateway:state and probe:battery events in TelemetryStore"
```

---

## Task 5: Wire `TelemetryStore` into the running app

**Files:**
- Create: `src/lib/telemetry/store/globalStore.ts`
- Create: `src/hooks/useTelemetryStore.js`

This is new — `TelemetryStore` is currently instantiated only inside its own test suite. Nothing in the running app reads from it yet, so none of Task 1-4's work is observable without this.

- [ ] **Step 1: Create the singleton**

```typescript
// src/lib/telemetry/store/globalStore.ts
import { TelemetryStore } from './TelemetryStore.js';
import { globalEventBus } from '../eventBus/EventBus.js';

export const globalTelemetryStore = new TelemetryStore(globalEventBus);
```

- [ ] **Step 2: Create the React bridge hook**

```javascript
// src/hooks/useTelemetryStore.js
// Second file (with useThermoWorksProvider.js) permitted to import from src/lib/telemetry/ per ADR-001.
// Does not import from src/lib/providers/ — read-only consumer of already-materialized store state.
import { useEffect, useState } from 'react';
import { globalTelemetryStore } from '../lib/telemetry/store/globalStore.js';

export function useTelemetryStore() {
  const [probes, setProbes] = useState(() => globalTelemetryStore.getProbes());
  const [gatewayState, setGatewayState] = useState(() => globalTelemetryStore.getGatewayState());

  useEffect(() => {
    globalTelemetryStore.startStaleCheck();
    const unsub = globalTelemetryStore.subscribe(nextProbes => {
      setProbes(nextProbes);
      setGatewayState(globalTelemetryStore.getGatewayState());
    });
    return unsub;
  }, []);

  return { probes, gatewayState };
}
```

- [ ] **Step 3: Verify it builds**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no errors. (No test file for this step — it's a thin wiring layer with no branching logic; Task 4's `TelemetryStore` tests and Task 6's component test cover its behavior end-to-end.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/telemetry/store/globalStore.ts src/hooks/useTelemetryStore.js
git commit -m "feat: wire a TelemetryStore singleton into the running app"
```

---

## Task 6: Settings "Device Health" panel

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/SettingsSheet.jsx`
- Test: `src/components/__tests__/SettingsSheet.test.jsx` (create if it doesn't exist — check first)

- [ ] **Step 1: Confirm the component-test environment works, since none exists yet**

This project has zero existing `.test.jsx` files, and `@testing-library/jest-dom` (the library providing `.toBeInTheDocument()`) is not a dependency — only `@testing-library/react` and `@testing-library/user-event` are installed. `vite.config.js` already sets `test: { environment: 'jsdom' }`, so `render()` itself works; the tests below stick to plain `@testing-library/react` query methods and vitest's built-in `expect` (`.toBeTruthy()`, `.toBeNull()`) instead of jest-dom matchers, so no new dependency is needed.

Run: `ls src/components/__tests__/ 2>/dev/null | grep -i settings`
Expected: no output — confirms there's no existing file whose conventions this must match.

- [ ] **Step 2: Write the failing test**

Create `src/components/__tests__/SettingsSheet.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsSheet from '../SettingsSheet';

const baseProps = {
  open: true,
  onClose: vi.fn(),
  cookState: { cooks: [] },
  recipes: [],
  onImportCooks: vi.fn(),
  onImportRecipes: vi.fn(),
  prefs: { theme: 'dark', cutPrefs: {} },
  resetCutPref: vi.fn(),
  setTheme: vi.fn(),
  mqttStatus: 'connected',
  mqttError: null,
  onMqttConnect: vi.fn(),
  onMqttDisconnect: vi.fn(),
  gatewayHealth: [],
};

describe('SettingsSheet — Device Health panel', () => {
  it('shows a gateway health entry with wifi, battery, firmware', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[
      { gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', unitMismatch: false, probes: [] },
    ]} />);
    expect(screen.getByText(/88%/)).toBeTruthy();
    expect(screen.getByText(/v2.45/)).toBeTruthy();
  });

  it('shows a unit mismatch warning when the gateway reports Celsius', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[
      { gatewayId: 'gw1', wifiStrength: 88, battery: null, firmware: null, units: 'C', unitMismatch: true, probes: [] },
    ]} />);
    expect(screen.getByText(/reporting Celsius/i)).toBeTruthy();
  });

  it('lists per-probe battery percentages', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[
      { gatewayId: 'gw1', wifiStrength: null, battery: null, firmware: null, units: 'F', unitMismatch: false,
        probes: [{ probeId: 'gw1-ch1', battery: 15 }] },
    ]} />);
    expect(screen.getByText(/gw1-ch1/)).toBeTruthy();
    expect(screen.getByText(/15%/)).toBeTruthy();
  });

  it('renders nothing device-health-related when gatewayHealth is empty', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[]} />);
    expect(screen.queryByText(/Device Health/i)).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/SettingsSheet.test.jsx`
Expected: FAIL — `SettingsSheet` doesn't accept a `gatewayHealth` prop or render anything from it yet.

- [ ] **Step 4: Compute `gatewayHealth` in `App.jsx`**

`SettingsSheet` takes a plain, pre-shaped array rather than reading `TelemetryStore` itself, keeping the provider firewall intact (SettingsSheet stays a dumb prop-driven component; only the hook layer touches telemetry).

In `src/App.jsx`, add the import:

```javascript
import { useTelemetryStore } from './hooks/useTelemetryStore.js';
```

Add the hook call near the existing `mqttProvider` line (~line 40):

```javascript
  const { probes: telemetryProbes, gatewayState } = useTelemetryStore();
```

Add this derived value near where `SettingsSheet` is rendered (find the `<SettingsSheet` JSX block, ~line 530):

```javascript
  const gatewayHealth = Array.from(gatewayState.values()).map(gw => ({
    ...gw,
    unitMismatch: gw.units === 'C',
    probes: Array.from(telemetryProbes.values())
      .filter(p => p.probeId.startsWith(gw.gatewayId) && p.battery !== null)
      .map(p => ({ probeId: p.probeId, battery: p.battery })),
  }));
```

Pass it into `SettingsSheet`:

```javascript
        mqttStatus={mqttProvider.status}
        mqttError={mqttProvider.error}
        onMqttConnect={mqttProvider.connect}
        onMqttDisconnect={mqttProvider.disconnect}
        gatewayHealth={gatewayHealth}
```

(Add `gatewayHealth={gatewayHealth}` as a new line alongside the existing `mqtt*` props — read the surrounding JSX first since exact prop ordering/indentation must match the file's current state.)

- [ ] **Step 5: Add the Device Health card to `SettingsSheet.jsx`**

Add `gatewayHealth = []` to the function's prop destructuring (edit the existing signature line):

```javascript
export default function SettingsSheet({ open, onClose, cookState, recipes, onImportCooks, onImportRecipes, prefs, resetCutPref, setTheme, mqttStatus, mqttError, onMqttConnect, onMqttDisconnect, gatewayHealth = [] }) {
```

Insert this block immediately after the closing `</div>` of the "Live Device" card (after line 270, before the `{/* Export */}` comment):

```jsx
        {/* Device Health */}
        {gatewayHealth.length > 0 && (
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
              Device Health
            </div>
            {gatewayHealth.map(gw => (
              <div key={gw.gatewayId} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)', marginBottom: 4 }}>
                  {gw.gatewayId}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
                  {gw.wifiStrength != null && <span>Wi-Fi {gw.wifiStrength}%</span>}
                  {gw.battery != null && <span>Battery {gw.battery}</span>}
                  {gw.firmware != null && <span>Firmware {gw.firmware}</span>}
                </div>
                {gw.unitMismatch && (
                  <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 6 }}>
                    This device is reporting Celsius readings, but PitLogic displays °F. Values shown may not match what you expect.
                  </div>
                )}
                {gw.probes.length > 0 && (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {gw.probes.map(p => (
                      <li key={p.probeId} style={{ fontSize: 12, color: p.battery <= 20 ? 'var(--red)' : 'var(--text3)', fontFamily: 'var(--mono)' }}>
                        {p.probeId}: {p.battery}%
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/SettingsSheet.test.jsx`
Expected: PASS — all 4 new cases. Then run the full suite to check nothing else broke:

Run: `npm test`
Expected: PASS — all tests project-wide.

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx src/components/SettingsSheet.jsx src/components/__tests__/SettingsSheet.test.jsx
git commit -m "feat: add Device Health panel to Settings, sourced from TelemetryStore"
```

---

## Task 7: Manual verification

**Files:** none — this task runs the app.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts at `http://localhost:5173/pitlogic/` with no console errors.

- [ ] **Step 2: Open Settings and confirm the panel is absent with no gateway connected**

Open the app in a browser, open Settings. The "Device Health" card must not render (no gateway data yet) — confirms the empty-state guard from Task 6 works against real app state, not just the test's mocked props.

- [ ] **Step 3: Confirm build passes**

Run: `npm run build`
Expected: build succeeds with no TypeScript or bundling errors.

- [ ] **Step 4: Update memory bank**

Add a line to `memory-bank/activeContext.md` under "What's Working" noting the Device Health panel ships, and remove/update the corresponding "Immediate Next Steps" entry if one referenced this work. Follow the existing frontmatter/structure in that file — do not rewrite the whole file.

- [ ] **Step 5: Commit**

```bash
git add memory-bank/activeContext.md
git commit -m "docs: update activeContext — Device Health panel shipped"
```
