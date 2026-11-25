# Bidirectional Device Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let PitLogic read a ThermoWorks gateway's current device config (channel labels, alarm thresholds, transmit/recording intervals) and write edits back, via the RFX SDK's retained `/devices/{id}/config` MQTT topic, without ever silently wiping settings PitLogic has no UI for.

**Architecture:** `ThermoWorksAdapter` subscribes to `/devices/+/config` alongside its existing subscriptions, keeps a session-scoped `_configCache` of the last-seen full vendor config per gateway (the authoritative merge baseline), and exposes `publishConfig(gatewayId, edits, fallbackBaseline?)` which merges edits onto the cached baseline and republishes the complete object as a retained message. `useThermoWorksProvider.js` persists the last-seen config per gateway to `localStorage` as a convenience fallback for devices that have never had a config published this session, and exposes `hasConfigBaseline`/`updateDeviceConfig` to the UI. `TelemetryStore` narrows the raw vendor config into a small `editableConfig` shape on `GatewayState`, so the UI never touches vendor JSON directly (ADR-001). A new `DeviceSettingsCard.jsx` component renders one editable form per connected gateway in the Settings panel.

**Tech Stack:** TypeScript (`src/lib/`), Zod, `mqtt` v5 (`publishAsync`/`subscribeAsync`), React JSX (components/hooks), Vitest + `@testing-library/react`.

---

## Before You Start

This plan builds directly on the already-shipped Device Health & Accuracy feature (`docs/superpowers/plans/2026-07-05-device-health-settings-panel.md`, merged into `backlog/rfx-sdk-capabilities`). It assumes the current state of these files (read them if anything below looks unfamiliar):

- `src/lib/telemetry/domain/GatewayState.ts` — has `gatewayId`, `wifiStrength`, `battery`, `firmware`, `units`. This plan adds `editableConfig`.
- `src/lib/telemetry/domain/TelemetryEvents.ts` — `NormalizedTelemetryEvent` union includes `GatewayStateEvent`/`ProbeBatteryEvent`. This plan adds `GatewayConfigEvent`.
- `src/lib/telemetry/store/TelemetryStore.ts` — has `applyGatewayState`/`applyProbeBattery` handling those two event types. This plan adds `applyGatewayConfig`.
- `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` — `transformPayload` handles `/devices/{id}/state` and `/probes/{id}/events`; the class subscribes to `/probes/+/events` and `/devices/+/state`, caches per-gateway units in `_gatewayUnits`. This plan adds a third topic and a `_configCache`.
- `src/hooks/useThermoWorksProvider.js` — the sole ADR-001-permitted bridge from provider events to the normalized event bus. This plan adds config-cache persistence and two new exposed functions.
- `src/components/SettingsSheet.jsx` — has "Live Device" and "Device Health" cards already. This plan adds a "Device Settings" card, rendered via a new child component.

**A critical constraint from the RFX SDK** (do not violate in any task below): publishing to `/devices/{id}/config` REPLACES the device's entire configuration. A partial publish silently wipes every field not included — this is why the merge-then-republish design exists. Never publish anything to that topic without first merging onto a full baseline object.

---

## Task 1: Domain types — `EditableDeviceConfig`, `GatewayState.editableConfig`, `GatewayConfigEvent`

**Files:**
- Modify: `src/lib/telemetry/domain/GatewayState.ts`
- Modify: `src/lib/telemetry/domain/TelemetryEvents.ts`
- Modify: `src/lib/telemetry/store/TelemetryStore.ts`
- Modify: `src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`

- [ ] **Step 1: Add `EditableDeviceConfig` and extend `GatewayState`**

Replace the full contents of `src/lib/telemetry/domain/GatewayState.ts` with:

```typescript
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
```

- [ ] **Step 2: Add `GatewayConfigEvent` to the normalized event union**

Edit `src/lib/telemetry/domain/TelemetryEvents.ts`. Add this interface after `ProbeBatteryEvent`:

```typescript
interface GatewayConfigEvent {
  type: 'gateway:config';
  gatewayId: string;
  /** Full, unvalidated vendor DeviceConfig JSON — never exposed to the UI. Only TelemetryStore narrows this. */
  raw: Record<string, unknown>;
  timestamp: number;
}
```

Update the `NormalizedTelemetryEvent` union to include it:

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
  | ProbeBatteryEvent
  | GatewayConfigEvent;
```

- [ ] **Step 3: Fix the compile-time fallout — `applyGatewayState` must set `editableConfig`**

Adding a required field to `GatewayState` breaks the one existing place that constructs a `GatewayState` object literal: `applyGatewayState` in `src/lib/telemetry/store/TelemetryStore.ts`. This is the same kind of whole-program-typecheck fallout the Device Health plan hit with `ProbeState.battery` — fix it now, in this task, not later.

Edit `src/lib/telemetry/store/TelemetryStore.ts`. In `applyGatewayState`, change:

```typescript
    const state: GatewayState = {
      gatewayId: event.gatewayId,
      wifiStrength: event.wifiStrength ?? existing?.wifiStrength ?? null,
      battery: event.battery ?? existing?.battery ?? null,
      firmware: event.firmware ?? existing?.firmware ?? null,
      // no null-fallback: every gateway:state payload carries a resolved unit, unlike the sensor fields above
      units: event.units,
    };
```

to:

```typescript
    const state: GatewayState = {
      gatewayId: event.gatewayId,
      wifiStrength: event.wifiStrength ?? existing?.wifiStrength ?? null,
      battery: event.battery ?? existing?.battery ?? null,
      firmware: event.firmware ?? existing?.firmware ?? null,
      // no null-fallback: every gateway:state payload carries a resolved unit, unlike the sensor fields above
      units: event.units,
      editableConfig: existing?.editableConfig ?? null,
    };
```

- [ ] **Step 4: Fix the two existing tests this breaks**

Adding `editableConfig` to every constructed `GatewayState` means the two existing `toEqual(...)` assertions on `getGatewayState()` in `src/lib/telemetry/store/__tests__/TelemetryStore.test.ts` now fail (`toEqual` requires an exact match, and the actual object now has an extra field). Find these two lines and update them:

```typescript
    expect(gw).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F' });
```

→

```typescript
    expect(gw).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', editableConfig: null });
```

and:

```typescript
    expect(store.getGatewayState().get('gw1')).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: null, units: 'F' });
```

→

```typescript
    expect(store.getGatewayState().get('gw1')).toEqual({ gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: null, units: 'F', editableConfig: null });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`
Expected: PASS — all 12 existing tests, including the 2 you just updated.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no errors (pre-existing unrelated errors in `src/lib/providers/adapters/csv/CsvProvider.ts` are expected and not your concern).

- [ ] **Step 7: Commit**

```bash
git add src/lib/telemetry/domain/GatewayState.ts src/lib/telemetry/domain/TelemetryEvents.ts src/lib/telemetry/store/TelemetryStore.ts src/lib/telemetry/store/__tests__/TelemetryStore.test.ts
git commit -m "feat: add EditableDeviceConfig domain type and gateway:config event"
```

---

## Task 2: Normalization — `RawGatewayConfigSchema` and cascade ordering

**Files:**
- Modify: `src/lib/telemetry/normalization/schemas.ts`
- Modify: `src/lib/telemetry/normalization/normalize.ts`
- Test: `src/lib/telemetry/normalization/__tests__/normalize.test.ts`

**Why cascade order matters here, specifically:** Zod object schemas are non-strict by default — unknown keys are silently dropped, not rejected. `RawGatewayStateSchema` only requires `gatewayId` and `capturedAt`; every other field is optional. A raw config event shaped `{ gatewayId, capturedAt, raw: {...} }` would ALSO successfully parse against `RawGatewayStateSchema` if that check ran first — the `raw` field would just be silently dropped, and every config event would incorrectly become a `gateway:state` event. The new `RawGatewayConfigSchema` check MUST run before `RawGatewayStateSchema` in the cascade. A regression test below proves this doesn't go the other way (a genuine state event must NOT get swallowed by the new config schema either — verify by requiring `raw` and making it non-optional).

- [ ] **Step 1: Write the failing tests**

Read the existing test file first to match its style, then append:

```typescript
describe('normalizeProviderEvent — gateway config', () => {
  it('normalizes a gateway-config raw event, preserving the raw vendor JSON untouched', () => {
    const rawConfig = { label: 'My Device', firmware: 'v2.45', channels: [{ number: 1, label: 'Brisket' }] };
    const raw = { gatewayId: 'M123456789012', capturedAt: 2_000_000_000_000, raw: rawConfig };
    const result = normalizeProviderEvent(raw, 'thermoworks');
    expect(result).toEqual({
      type: 'gateway:config',
      gatewayId: 'M123456789012',
      raw: rawConfig,
      timestamp: 2_000_000_000_000,
    });
  });

  it('does not let a gateway-config event get misrouted as gateway:state', () => {
    const raw = { gatewayId: 'M123456789012', capturedAt: 2_000_000_000_000, raw: { label: 'My Device' } };
    const result = normalizeProviderEvent(raw, 'thermoworks');
    expect(result.type).toBe('gateway:config');
  });

  it('a genuine gateway-state event (no raw field) still normalizes as gateway:state, not gateway:config', () => {
    const raw = { gatewayId: 'M123456789012', capturedAt: 2_000_000_000_000, wifiStrength: 88, units: 'F' };
    const result = normalizeProviderEvent(raw, 'thermoworks');
    expect(result.type).toBe('gateway:state');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/telemetry/normalization/__tests__/normalize.test.ts`
Expected: the first two new cases FAIL (no schema recognizes `raw` yet, so they fall through to `normalization:rejected`); the third case already PASSES today (nothing has broken it yet — it's here to catch a regression once you add the config schema).

- [ ] **Step 3: Add `RawGatewayConfigSchema`**

Edit `src/lib/telemetry/normalization/schemas.ts` — add at the end:

```typescript
export const RawGatewayConfigSchema = z.object({
  gatewayId: z.string().min(1),
  capturedAt: z.number().int().positive(),
  raw: z.record(z.string(), z.unknown()),
});
```

- [ ] **Step 4: Insert the cascade check BEFORE the gateway-state check**

Edit `src/lib/telemetry/normalization/normalize.ts`. Update the import line:

```typescript
import {
  RawActiveReadingSchema,
  RawDisconnectedReadingSchema,
  RawGatewayConfigSchema,
  RawGatewayStateSchema,
  RawProbeBatterySchema,
} from './schemas.js';
```

Insert the new check immediately after the `activeResult` block and BEFORE the existing `gatewayStateResult` block:

```typescript
  const gatewayConfigResult = RawGatewayConfigSchema.safeParse(raw);
  if (gatewayConfigResult.success) {
    const g = gatewayConfigResult.data;
    return { type: 'gateway:config', gatewayId: g.gatewayId, raw: g.raw, timestamp: g.capturedAt };
  }

```

(This goes directly above the existing `const gatewayStateResult = RawGatewayStateSchema.safeParse(raw);` line — do not reorder anything else in the cascade.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/telemetry/normalization/__tests__/normalize.test.ts`
Expected: PASS — all cases, including the 3 new ones and every pre-existing case (12 gateway-state/probe-battery tests from the prior feature, plus the original active/disconnected-reading tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/telemetry/normalization/schemas.ts src/lib/telemetry/normalization/normalize.ts src/lib/telemetry/normalization/__tests__/normalize.test.ts
git commit -m "feat: normalize gateway-config raw events, ordered before gateway-state in the cascade"
```

---

## Task 3: `ThermoWorksAdapter` — config topic recognition, subscription, `_configCache`

**Files:**
- Modify: `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`
- Test: `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`

- [ ] **Step 1: Write the failing `transformPayload` test**

Add to the top `describe('transformPayload', ...)` block:

```typescript
  it('wraps a device config topic payload as a raw gateway-config event', () => {
    const configBody = { label: 'My Device', firmware: 'v2.45', channels: [{ number: 1, label: 'Brisket' }] };
    const payload = Buffer.from(JSON.stringify(configBody));
    const events = transformPayload('/devices/M123456789012/config', payload, { now: 5_000 });
    expect(events).toEqual([
      { gatewayId: 'M123456789012', capturedAt: 5_000, raw: configBody },
    ]);
  });

  it('returns empty array for malformed JSON on the config topic', () => {
    expect(transformPayload('/devices/M123456789012/config', Buffer.from('not json'))).toHaveLength(0);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
Expected: FAIL — `/devices/.../config` isn't matched by any topic regex yet (falls through to the `return []` at the top).

- [ ] **Step 3: Extend `transformPayload` to recognize the config topic**

Edit `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`. Update the topic-match section at the top of `transformPayload`:

```typescript
  const deviceStateMatch = topic.match(/^\/devices\/([^/]+)\/state$/);
  const deviceConfigMatch = topic.match(/^\/devices\/([^/]+)\/config$/);
  const probeEventsMatch = topic.match(/^\/probes\/([^/]+)\/events$/);
  if (!deviceStateMatch && !deviceConfigMatch && !probeEventsMatch) return [];
```

Immediately after the existing `if (deviceStateMatch) { ... return [event]; }` block, and before the `const probeTopicId = probeEventsMatch![1]!;` line, add:

```typescript
  if (deviceConfigMatch) {
    const gatewayId = deviceConfigMatch[1];
    return [{ gatewayId, capturedAt: now, raw: body }];
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
Expected: PASS — all `transformPayload` cases, old and new.

- [ ] **Step 5: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts
git commit -m "feat: recognize device-config topic payloads in transformPayload"
```

- [ ] **Step 6: Write the failing subscription + cache tests**

The existing test `reconnect with sessionPresent=false resubscribes to both topics` (asserting `callsBefore + 2`) will become factually wrong once this step adds a third topic — the adapter will resubscribe to THREE topics on reconnect, not two. Find that test and REPLACE it (do not leave both the old and new assertion — they contradict each other on the same reconnect call, exactly like the `+1`→`+2` fix from the Device Health feature):

```typescript
  it('connect() also subscribes to /devices/+/config', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    expect(mockSubscribeAsync).toHaveBeenCalledWith('/devices/+/config');
  });

  it('reconnect with sessionPresent=false resubscribes to all three topics', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    const callsBefore = mockSubscribeAsync.mock.calls.length;
    simulateReconnect(false);
    await Promise.resolve();
    expect(mockSubscribeAsync.mock.calls.length).toBe(callsBefore + 3);
  });

  it('caches the full raw config from a device-config message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    const received: unknown[] = [];
    adapter.subscribe(e => received.push(e));
    await adapter.connect();
    const configBody = { label: 'My Device', channels: [{ number: 1, label: 'Brisket' }] };
    simulateMessage('/devices/M123456789012/config', Buffer.from(JSON.stringify(configBody)));
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ gatewayId: 'M123456789012', capturedAt: expect.any(Number), raw: configBody });
  });
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
Expected: FAIL — `connect()` only subscribes to two topics today; the old `+2` assertion (now replaced) would have passed, the new `+3` one fails.

- [ ] **Step 8: Wire the subscription into the adapter class**

Edit `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`. Replace `connect()`:

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
    await client.subscribeAsync('/devices/+/config');
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
    await this._client.subscribeAsync('/devices/+/config');
  }
```

Add a private field alongside `_gatewayUnits`:

```typescript
  private readonly _configCache = new Map<string, Record<string, unknown>>();
```

Replace `_onMessage` to populate the cache whenever an event carries a `raw` object alongside a `gatewayId`:

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
      if (typeof event.gatewayId === 'string' && event.raw !== undefined && typeof event.raw === 'object' && event.raw !== null) {
        this._configCache.set(event.gatewayId, event.raw as Record<string, unknown>);
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
git commit -m "feat: subscribe to /devices/+/config and cache the full raw config per gateway"
```

---

## Task 4: `mergeDeviceConfig` pure function + `ThermoWorksAdapter.publishConfig`

**Files:**
- Create: `src/lib/providers/adapters/thermoworks/deviceConfigMerge.ts`
- Test: `src/lib/providers/adapters/thermoworks/__tests__/deviceConfigMerge.test.ts`
- Modify: `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`
- Test: `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`

**Why a separate file:** `ThermoWorksAdapter.ts` is transport-layer (MQTT connect/subscribe/publish). The merge logic — deciding how per-channel edits combine with a baseline vendor config — is pure, has several edge cases worth testing in isolation (unknown-field passthrough, partial per-channel edits, empty baseline), and doesn't need any MQTT machinery to test. Keeping it in its own file matches this codebase's pattern of small, single-responsibility files.

- [ ] **Step 1: Write the failing tests for `mergeDeviceConfig`**

Create `src/lib/providers/adapters/thermoworks/__tests__/deviceConfigMerge.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mergeDeviceConfig } from '../deviceConfigMerge.js';

describe('mergeDeviceConfig', () => {
  it('sets a channel label onto an existing channel, preserving its other fields', () => {
    const baseline = {
      label: 'My Device',
      channels: [{ number: 1, label: 'Old Label', enabled: true, units: 'F' }],
    };
    const merged = mergeDeviceConfig(baseline, { channelLabels: { 1: 'Brisket' } });
    expect(merged).toEqual({
      label: 'My Device',
      channels: [{ number: 1, label: 'Brisket', enabled: true, units: 'F' }],
    });
  });

  it('sets alarm high/low values, preserving other alarm sub-fields', () => {
    const baseline = {
      channels: [{ number: 1, alarmHigh: { value: 200, units: 'F', enabled: true, muted: false } }],
    };
    const merged = mergeDeviceConfig(baseline, { alarms: { 1: { high: 225 } } });
    expect(merged.channels[0].alarmHigh).toEqual({ value: 225, units: 'F', enabled: true, muted: false });
  });

  it('adds a new channel entry when editing a channel absent from the baseline', () => {
    const baseline = { channels: [{ number: 1, label: 'Brisket' }] };
    const merged = mergeDeviceConfig(baseline, { channelLabels: { 2: 'Ribs' } });
    expect(merged.channels).toEqual([
      { number: 1, label: 'Brisket' },
      { number: 2, label: 'Ribs' },
    ]);
  });

  it('sets transmit and recording intervals', () => {
    const baseline = { transmitIntervalInSeconds: 60, recordingIntervalInSeconds: 60 };
    const merged = mergeDeviceConfig(baseline, { transmitIntervalInSeconds: 30 });
    expect(merged.transmitIntervalInSeconds).toBe(30);
    expect(merged.recordingIntervalInSeconds).toBe(60);
  });

  it('passes through unknown top-level fields untouched', () => {
    const baseline = { fan: { setTemp: 225 }, rfxDeviceConfigs: [{ id: 'p1', readInterval: 60 }] };
    const merged = mergeDeviceConfig(baseline, { channelLabels: { 1: 'Brisket' } });
    expect(merged.fan).toEqual({ setTemp: 225 });
    expect(merged.rfxDeviceConfigs).toEqual([{ id: 'p1', readInterval: 60 }]);
  });

  it('starts from an empty object when the baseline has no channels at all', () => {
    const merged = mergeDeviceConfig({}, { channelLabels: { 1: 'Brisket' }, alarms: { 1: { high: 200, low: 50 } } });
    expect(merged.channels).toEqual([
      { number: 1, label: 'Brisket', alarmHigh: { value: 200 }, alarmLow: { value: 50 } },
    ]);
  });

  it('applies edits to no channels when edits has no channelLabels or alarms', () => {
    const baseline = { channels: [{ number: 1, label: 'Brisket' }] };
    const merged = mergeDeviceConfig(baseline, {});
    expect(merged.channels).toEqual([{ number: 1, label: 'Brisket' }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/deviceConfigMerge.test.ts`
Expected: FAIL — the module doesn't exist yet.

- [ ] **Step 3: Implement `mergeDeviceConfig`**

Create `src/lib/providers/adapters/thermoworks/deviceConfigMerge.ts`:

```typescript
export interface ConfigEdits {
  channelLabels?: Record<number, string>;
  alarms?: Record<number, { high?: number; low?: number }>;
  transmitIntervalInSeconds?: number;
  recordingIntervalInSeconds?: number;
}

export type DeviceConfigJson = Record<string, unknown>;

interface ChannelJson {
  number: number;
  [key: string]: unknown;
}

/**
 * Merges user edits onto a full vendor DeviceConfig baseline, producing a complete
 * object safe to publish. Unknown top-level fields and unknown per-channel fields
 * are passed through untouched — the RFX SDK replaces the ENTIRE config on publish,
 * so anything dropped here would be silently wiped from the device.
 */
export function mergeDeviceConfig(baseline: DeviceConfigJson, edits: ConfigEdits): DeviceConfigJson {
  const baseChannels: ChannelJson[] = Array.isArray(baseline.channels)
    ? (baseline.channels as ChannelJson[])
    : [];

  const channelNumbers = new Set<number>(baseChannels.map(c => c.number));
  if (edits.channelLabels) {
    for (const num of Object.keys(edits.channelLabels)) channelNumbers.add(Number(num));
  }
  if (edits.alarms) {
    for (const num of Object.keys(edits.alarms)) channelNumbers.add(Number(num));
  }

  const mergedChannels = Array.from(channelNumbers)
    .sort((a, b) => a - b)
    .map(num => {
      const existing = baseChannels.find(c => c.number === num) ?? { number: num };
      const label = edits.channelLabels?.[num];
      const alarmEdit = edits.alarms?.[num];
      const merged: ChannelJson = { ...existing, number: num };
      if (label !== undefined) merged.label = label;
      if (alarmEdit?.high !== undefined) {
        merged.alarmHigh = { ...(existing.alarmHigh as object ?? {}), value: alarmEdit.high };
      }
      if (alarmEdit?.low !== undefined) {
        merged.alarmLow = { ...(existing.alarmLow as object ?? {}), value: alarmEdit.low };
      }
      return merged;
    });

  const merged: DeviceConfigJson = { ...baseline, channels: mergedChannels };
  if (edits.transmitIntervalInSeconds !== undefined) merged.transmitIntervalInSeconds = edits.transmitIntervalInSeconds;
  if (edits.recordingIntervalInSeconds !== undefined) merged.recordingIntervalInSeconds = edits.recordingIntervalInSeconds;
  return merged;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/deviceConfigMerge.test.ts`
Expected: PASS — all 7 cases.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no new errors (pre-existing `CsvProvider.ts` errors are unrelated).

- [ ] **Step 6: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/deviceConfigMerge.ts src/lib/providers/adapters/thermoworks/__tests__/deviceConfigMerge.test.ts
git commit -m "feat: add mergeDeviceConfig pure function for device config edits"
```

- [ ] **Step 7: Write the failing `publishConfig` tests**

Add a new `describe` block to `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`. First, extend the hoisted mock client to include `publishAsync` — find the `vi.hoisted(() => { ... })` block near the bottom of the file and add `publishAsync` to `mockClient` and to the returned object:

```typescript
    const mockClient = {
      on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = [...(listeners[event] ?? []), cb];
      }),
      subscribeAsync: vi.fn().mockResolvedValue(undefined),
      endAsync: vi.fn().mockResolvedValue(undefined),
      publishAsync: vi.fn().mockResolvedValue(undefined),
    };
    return {
      mockConnectAsync: vi.fn().mockResolvedValue(mockClient),
      mockSubscribeAsync: mockClient.subscribeAsync,
      mockEndAsync: mockClient.endAsync,
      mockPublishAsync: mockClient.publishAsync,
      mockClientOn: mockClient.on,
```

(Keep every other property in that returned object as-is — this only adds `publishAsync`/`mockPublishAsync`.) Also add `mockPublishAsync` to the destructured import line at the top:

```typescript
const { mockConnectAsync, mockSubscribeAsync, mockEndAsync, mockPublishAsync, mockClientOn, simulateMessage, simulateReconnect, clearListeners } =
  vi.hoisted(() => {
```

And add `publishAsync: mockPublishAsync` to the `mockConnectAsync.mockResolvedValue({...})` call inside `beforeEach`:

```typescript
    mockConnectAsync.mockResolvedValue({
      on: mockClientOn,
      subscribeAsync: mockSubscribeAsync,
      endAsync: mockEndAsync,
      publishAsync: mockPublishAsync,
    });
```

Now add the new test block at the end of the `describe('ThermoWorksAdapter — connection lifecycle', ...)` body:

```typescript
  it('publishConfig merges edits onto the cached baseline and publishes a retained message', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    simulateMessage(
      '/devices/M123456789012/config',
      Buffer.from(JSON.stringify({ label: 'My Device', channels: [{ number: 1, label: 'Old Label' }] })),
    );
    await adapter.publishConfig('M123456789012', { channelLabels: { 1: 'Brisket' } });
    expect(mockPublishAsync).toHaveBeenCalledWith(
      '/devices/M123456789012/config',
      JSON.stringify({ label: 'My Device', channels: [{ number: 1, label: 'Brisket' }] }),
      { retain: true, qos: 1 },
    );
  });

  it('publishConfig uses fallbackBaseline when no config has been cached yet', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    await adapter.publishConfig('M999', { channelLabels: { 1: 'Ribs' } }, { label: 'Fallback Device', channels: [] });
    expect(mockPublishAsync).toHaveBeenCalledWith(
      '/devices/M999/config',
      JSON.stringify({ label: 'Fallback Device', channels: [{ number: 1, label: 'Ribs' }] }),
      { retain: true, qos: 1 },
    );
  });

  it('publishConfig starts from an empty object when there is no cache and no fallback', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await adapter.connect();
    await adapter.publishConfig('M999', { channelLabels: { 1: 'Ribs' } });
    expect(mockPublishAsync).toHaveBeenCalledWith(
      '/devices/M999/config',
      JSON.stringify({ channels: [{ number: 1, label: 'Ribs' }] }),
      { retain: true, qos: 1 },
    );
  });

  it('publishConfig rejects when not connected', async () => {
    const adapter = new ThermoWorksAdapter(VALID_CONFIG);
    await expect(adapter.publishConfig('M999', {})).rejects.toThrow(/not connected/i);
  });
```

- [ ] **Step 8: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
Expected: FAIL — `publishConfig` doesn't exist on the adapter yet.

- [ ] **Step 9: Implement `publishConfig`**

Edit `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`. Add the import at the top:

```typescript
import { mergeDeviceConfig, type ConfigEdits, type DeviceConfigJson } from './deviceConfigMerge.js';
```

Add the new public method to the `ThermoWorksAdapter` class (after `disconnect`):

```typescript
  async publishConfig(gatewayId: string, edits: ConfigEdits, fallbackBaseline?: DeviceConfigJson): Promise<void> {
    if (!this._client) throw new Error('Cannot publish config: not connected');
    const baseline = this._configCache.get(gatewayId) ?? fallbackBaseline ?? {};
    const merged = mergeDeviceConfig(baseline, edits);
    await this._client.publishAsync(`/devices/${gatewayId}/config`, JSON.stringify(merged), { retain: true, qos: 1 });
  }
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npx vitest run src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
Expected: PASS — full file, all tests.

- [ ] **Step 11: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no new errors.

- [ ] **Step 12: Commit**

```bash
git add src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts
git commit -m "feat: add publishConfig to ThermoWorksAdapter, merging edits onto the cached baseline"
```

---

## Task 5: `TelemetryStore` — materialize `gateway:config` into `editableConfig`

**Files:**
- Modify: `src/lib/telemetry/store/TelemetryStore.ts`
- Test: `src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`

**Why this logic lives in `TelemetryStore`, not the hook:** the design spec describes the mapping from raw vendor JSON to the narrow `editableConfig` shape as something "the hook" does, but every other raw→domain narrowing in this codebase (`applyGatewayState`, `applyProbeBattery`) already lives in `TelemetryStore`'s `apply*` methods — that's the established, reviewed pattern for "this class owns turning normalized events into queryable domain state." Putting it here instead keeps that pattern consistent and keeps the hook a thin transport bridge. This is an intentional, justified deviation from the spec's literal wording, not a gap — the end result (UI never touches raw vendor JSON) is identical either way.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`:

```typescript
  it('extracts editableConfig from a gateway:config event', () => {
    const { bus, store } = makeStore();
    const raw = {
      transmitIntervalInSeconds: 60,
      recordingIntervalInSeconds: 30,
      channels: [
        { number: 1, label: 'Brisket', alarmHigh: { value: 200 }, alarmLow: { value: 50 } },
        { number: 2, label: 'Ribs' },
      ],
    };
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw, timestamp: Date.now() });
    expect(store.getGatewayState().get('gw1')?.editableConfig).toEqual({
      channelLabels: { 1: 'Brisket', 2: 'Ribs' },
      alarms: { 1: { high: 200, low: 50 } },
      transmitIntervalInSeconds: 60,
      recordingIntervalInSeconds: 30,
    });
  });

  it('applying gateway:config to an unknown gateway creates a gateway entry with null sensor fields', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw: { channels: [] }, timestamp: Date.now() });
    const gw = store.getGatewayState().get('gw1');
    expect(gw?.wifiStrength).toBeNull();
    expect(gw?.battery).toBeNull();
    expect(gw?.firmware).toBeNull();
    expect(gw?.units).toBe('F');
  });

  it('preserves existing sensor fields when a gateway:config event arrives for a known gateway', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'gateway:state', gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', timestamp: Date.now() });
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw: { channels: [] }, timestamp: Date.now() });
    const gw = store.getGatewayState().get('gw1');
    expect(gw?.wifiStrength).toBe(88);
    expect(gw?.battery).toBe('C');
  });

  it('handles a config with no channels array (empty editableConfig)', () => {
    const { bus, store } = makeStore();
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw: {}, timestamp: Date.now() });
    expect(store.getGatewayState().get('gw1')?.editableConfig).toEqual({
      channelLabels: {},
      alarms: {},
      transmitIntervalInSeconds: null,
      recordingIntervalInSeconds: null,
    });
  });

  it('notifies listeners on gateway:config', () => {
    const { bus, store } = makeStore();
    const calls: number[] = [];
    store.subscribe(() => calls.push(1));
    bus.publish({ type: 'gateway:config', gatewayId: 'gw1', raw: {}, timestamp: Date.now() });
    expect(calls).toHaveLength(1);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`
Expected: FAIL — `gateway:config` isn't handled by `handleEvent` yet.

- [ ] **Step 3: Add the `handleEvent` branch and `applyGatewayConfig`**

Edit `src/lib/telemetry/store/TelemetryStore.ts`. Update `handleEvent`:

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
    } else if (event.type === 'gateway:config') {
      this.applyGatewayConfig(event);
    }
  }
```

Add the import for `EditableDeviceConfig` alongside the existing `GatewayState` import:

```typescript
import type { GatewayState, EditableDeviceConfig } from '../domain/GatewayState.js';
```

Add `applyGatewayConfig` and its helper (place after `applyProbeBattery`):

```typescript
  private applyGatewayConfig(event: Extract<NormalizedTelemetryEvent, { type: 'gateway:config' }>): void {
    const existing = this.gatewayStateMap.get(event.gatewayId);
    const state: GatewayState = existing ?? {
      gatewayId: event.gatewayId,
      wifiStrength: null,
      battery: null,
      firmware: null,
      units: 'F',
      editableConfig: null,
    };
    this.gatewayStateMap.set(event.gatewayId, { ...state, editableConfig: extractEditableConfig(event.raw) });
    this.notify();
  }
```

Add `extractEditableConfig` as a module-level (non-exported) function at the bottom of the file:

```typescript
function extractEditableConfig(raw: Record<string, unknown>): EditableDeviceConfig {
  const channels = Array.isArray(raw.channels) ? (raw.channels as Record<string, unknown>[]) : [];
  const channelLabels: Record<number, string> = {};
  const alarms: Record<number, { high?: number; low?: number }> = {};

  for (const ch of channels) {
    const num = ch.number;
    if (typeof num !== 'number') continue;
    if (typeof ch.label === 'string') channelLabels[num] = ch.label;

    const alarmHigh = ch.alarmHigh as Record<string, unknown> | undefined;
    const alarmLow = ch.alarmLow as Record<string, unknown> | undefined;
    const entry: { high?: number; low?: number } = {};
    if (alarmHigh && typeof alarmHigh.value === 'number') entry.high = alarmHigh.value;
    if (alarmLow && typeof alarmLow.value === 'number') entry.low = alarmLow.value;
    if (entry.high !== undefined || entry.low !== undefined) alarms[num] = entry;
  }

  return {
    channelLabels,
    alarms,
    transmitIntervalInSeconds: typeof raw.transmitIntervalInSeconds === 'number' ? raw.transmitIntervalInSeconds : null,
    recordingIntervalInSeconds: typeof raw.recordingIntervalInSeconds === 'number' ? raw.recordingIntervalInSeconds : null,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/telemetry/store/__tests__/TelemetryStore.test.ts`
Expected: PASS — full file.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.lib.json`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/telemetry/store/TelemetryStore.ts src/lib/telemetry/store/__tests__/TelemetryStore.test.ts
git commit -m "feat: materialize gateway:config events into GatewayState.editableConfig"
```

---

## Task 6: `useThermoWorksProvider.js` — config-cache persistence, `hasConfigBaseline`, `updateDeviceConfig`

**Files:**
- Modify: `src/hooks/useThermoWorksProvider.js`
- Test: `src/hooks/__tests__/useThermoWorksProvider.test.js`

**A note on the existing test file's localStorage mock:** every existing test in this file calls `lsMock.getItem.mockReturnValue(VALID_CONFIG)`, which makes `getItem` return the SAME value regardless of which key is requested. Once this task adds a SECOND localStorage key (the config cache), that blanket mock would make config-cache reads return the (unrelated) MQTT connection JSON. The new tests below use `lsMock.getItem.mockImplementation(key => ...)` instead, keyed by the actual key strings, to avoid this — don't use `mockReturnValue` for any new test that touches both keys in the same test.

- [ ] **Step 1: Write the failing tests**

Add to `src/hooks/__tests__/useThermoWorksProvider.test.js`. First, extend the mocked `ThermoWorksAdapter` class to include `publishConfig` — find the `vi.mock('../../lib/providers/adapters/thermoworks/ThermoWorksAdapter.js', ...)` block and add it:

```typescript
vi.mock('../../lib/providers/adapters/thermoworks/ThermoWorksAdapter.js', () => {
  const ThermoWorksAdapter = class {
    constructor() {
      this.id = 'thermoworks';
      this.connect = mockConnect;
      this.subscribe = mockSubscribe;
      this.disconnect = mockDisconnect;
      this.publishConfig = mockPublishConfig;
    }
  };
  return { ThermoWorksAdapter };
});
```

Add `mockPublishConfig` to the `vi.hoisted(() => ({...}))` block:

```typescript
const { mockConnect, mockSubscribe, mockDisconnect, mockPublish, mockNormalize, mockPublishConfig } = vi.hoisted(() => ({
  mockConnect: vi.fn().mockResolvedValue(undefined),
  mockSubscribe: vi.fn().mockReturnValue(() => {}),
  mockDisconnect: vi.fn().mockResolvedValue(undefined),
  mockPublish: vi.fn(),
  mockNormalize: vi.fn().mockReturnValue({ type: 'probe:reading', reading: {} }),
  mockPublishConfig: vi.fn().mockResolvedValue(undefined),
}));
```

Add `mockPublishConfig.mockResolvedValue(undefined);` to the `beforeEach` block alongside the other `.mockResolvedValue` resets.

Now add the new test suite at the end of the file, before the final closing `});`:

```typescript
describe('useThermoWorksProvider — config cache and updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lsMock._clear();
    mockConnect.mockResolvedValue(undefined);
    mockSubscribe.mockReturnValue(() => {});
    mockDisconnect.mockResolvedValue(undefined);
    mockPublishConfig.mockResolvedValue(undefined);
  });

  it('hasConfigBaseline is false before any gateway:config event has been seen', async () => {
    lsMock.getItem.mockImplementation(key => (key === 'pitlogic-mqtt-v1' ? VALID_CONFIG : null));
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    expect(result.current.hasConfigBaseline('gw1')).toBe(false);
  });

  it('hasConfigBaseline becomes true after a gateway:config event is seen, and persists it to localStorage', async () => {
    lsMock.getItem.mockImplementation(key => (key === 'pitlogic-mqtt-v1' ? VALID_CONFIG : null));
    let capturedHandler;
    mockSubscribe.mockImplementation(handler => { capturedHandler = handler; return () => {}; });
    mockNormalize.mockReturnValue({ type: 'gateway:config', gatewayId: 'gw1', raw: { label: 'My Device' }, timestamp: 1 });

    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    act(() => { capturedHandler({}); });

    expect(result.current.hasConfigBaseline('gw1')).toBe(true);
    expect(lsMock.setItem).toHaveBeenCalledWith(
      'pitlogic-thermoworks-config-cache-v1',
      JSON.stringify({ gw1: { label: 'My Device' } }),
    );
  });

  it('updateDeviceConfig calls adapter.publishConfig with no fallback once a baseline has been seen', async () => {
    lsMock.getItem.mockImplementation(key => (key === 'pitlogic-mqtt-v1' ? VALID_CONFIG : null));
    let capturedHandler;
    mockSubscribe.mockImplementation(handler => { capturedHandler = handler; return () => {}; });
    mockNormalize.mockReturnValue({ type: 'gateway:config', gatewayId: 'gw1', raw: { label: 'My Device' }, timestamp: 1 });

    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });
    act(() => { capturedHandler({}); });

    await act(async () => { await result.current.updateDeviceConfig('gw1', { channelLabels: { 1: 'Brisket' } }); });
    expect(mockPublishConfig).toHaveBeenCalledWith('gw1', { channelLabels: { 1: 'Brisket' } }, undefined);
  });

  it('updateDeviceConfig passes the localStorage fallback when no baseline has been seen this session', async () => {
    lsMock.getItem.mockImplementation(key => {
      if (key === 'pitlogic-mqtt-v1') return VALID_CONFIG;
      if (key === 'pitlogic-thermoworks-config-cache-v1') return JSON.stringify({ gw1: { label: 'Cached Device' } });
      return null;
    });
    const { result } = renderHook(() => useThermoWorksProvider());
    await act(async () => { await result.current.connect(); });

    await act(async () => { await result.current.updateDeviceConfig('gw1', { channelLabels: { 1: 'Brisket' } }); });
    expect(mockPublishConfig).toHaveBeenCalledWith('gw1', { channelLabels: { 1: 'Brisket' } }, { label: 'Cached Device' });
  });

  it('updateDeviceConfig throws when not connected', async () => {
    const { result } = renderHook(() => useThermoWorksProvider());
    await expect(result.current.updateDeviceConfig('gw1', {})).rejects.toThrow(/not connected/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/__tests__/useThermoWorksProvider.test.js`
Expected: FAIL — `hasConfigBaseline` and `updateDeviceConfig` don't exist on the hook's return value yet.

- [ ] **Step 3: Implement the config-cache persistence and new functions**

Replace the full contents of `src/hooks/useThermoWorksProvider.js`:

```javascript
// This hook is the sole bridge between the provider boundary and the telemetry pipeline.
// It is the only non-lib file permitted to import from src/lib/providers/ and
// src/lib/telemetry/eventBus/ — see ADR-001 and the design spec.
import { useState, useEffect, useRef, useCallback } from 'react';
import { ThermoWorksAdapter } from '../lib/providers/adapters/thermoworks/ThermoWorksAdapter.js';
import { normalizeProviderEvent } from '../lib/telemetry/normalization/normalize.js';
import { globalEventBus } from '../lib/telemetry/eventBus/EventBus.js';

const STORAGE_KEY = 'pitlogic-mqtt-v1';
export const CONFIG_CACHE_KEY = 'pitlogic-thermoworks-config-cache-v1';

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // JSON corruption → treat as missing config; connect() will surface a user-readable error
  }
}

function loadConfigCache() {
  try {
    const raw = localStorage.getItem(CONFIG_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveConfigCacheEntry(gatewayId, rawConfig) {
  const cache = loadConfigCache();
  cache[gatewayId] = rawConfig;
  try {
    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Quota errors or private-mode restrictions are non-fatal — this cache is a convenience
    // fallback only, never a source of truth (see design spec).
  }
}

export function useThermoWorksProvider() {
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const sessionRef = useRef(null); // { adapter, unsub }
  const seenConfigRef = useRef(new Set()); // gatewayIds with a live retained config seen this session

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
      // Raw events cross the provider boundary here: normalize validates shape (Zod),
      // then publish delivers to TelemetryStore via the eventBus. Normalization happens
      // in the hook, not in the adapter, to keep the adapter purely transport-layer.
      const unsub = adapter.subscribe(rawEvent => {
        const normalized = normalizeProviderEvent(rawEvent, adapter.id);
        if (normalized.type === 'gateway:config') {
          seenConfigRef.current.add(normalized.gatewayId);
          saveConfigCacheEntry(normalized.gatewayId, normalized.raw);
        }
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

  const hasConfigBaseline = useCallback(gatewayId => seenConfigRef.current.has(gatewayId), []);

  const updateDeviceConfig = useCallback(async (gatewayId, edits) => {
    if (!sessionRef.current) throw new Error('Not connected');
    const fallbackBaseline = hasConfigBaseline(gatewayId) ? undefined : loadConfigCache()[gatewayId];
    await sessionRef.current.adapter.publishConfig(gatewayId, edits, fallbackBaseline);
  }, [hasConfigBaseline]);

  useEffect(() => {
    // Clean up adapter on unmount — prevents event delivery to unmounted components
    return () => {
      const session = sessionRef.current;
      if (session) {
        session.unsub();
        void session.adapter.disconnect();
        sessionRef.current = null;
      }
    };
  }, []);

  return { status, error, connect, disconnect, hasConfigBaseline, updateDeviceConfig };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/__tests__/useThermoWorksProvider.test.js`
Expected: PASS — all tests, old and new.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — no regressions elsewhere.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useThermoWorksProvider.js src/hooks/__tests__/useThermoWorksProvider.test.js
git commit -m "feat: add config-cache persistence, hasConfigBaseline, and updateDeviceConfig to useThermoWorksProvider"
```

---

## Task 7: Wire `hasConfigBaseline`/`updateDeviceConfig` through `App.jsx`

**Files:**
- Modify: `src/App.jsx`

`gatewayHealth` (from `src/utils/deviceHealth.js`) already spreads the full `GatewayState` object per gateway (`...gw`), so `editableConfig` will flow through to `SettingsSheet` automatically once `TelemetryStore` starts populating it — no change needed there. This task only wires the two new hook functions down as props.

- [ ] **Step 1: Pass the two new props into `<SettingsSheet>`**

Read the current `<SettingsSheet ... />` invocation in `src/App.jsx` first to confirm exact prop ordering/indentation (it was last touched by the Device Health feature — the props may have shifted slightly). Add these two lines alongside the existing `mqtt*` props and `gatewayHealth`:

```javascript
        onHasConfigBaseline={mqttProvider.hasConfigBaseline}
        onUpdateDeviceConfig={mqttProvider.updateDeviceConfig}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: PASS — no test currently asserts on these new props, so this step is a smoke check that nothing else broke.

- [ ] **Step 3: Typecheck / lint sanity (JS file, no tsc needed)**

Run: `npm run build`
Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire hasConfigBaseline and updateDeviceConfig into App.jsx"
```

---

## Task 8: "Device Settings" panel — `DeviceSettingsCard.jsx` + `SettingsSheet.jsx`

**Files:**
- Create: `src/components/DeviceSettingsCard.jsx`
- Test: `src/components/__tests__/DeviceSettingsCard.test.jsx`
- Modify: `src/components/SettingsSheet.jsx`
- Modify: `src/components/__tests__/SettingsSheet.test.jsx`

**Why a separate component file:** each gateway's edit form needs its own local state (channel labels, alarm values, save status), which is awkward to manage correctly inside a `.map()` in `SettingsSheet.jsx` — React expects list items with their own state to be their own components, keyed by `gw.gatewayId`. This also keeps `SettingsSheet.jsx` (already ~390 lines) from growing further.

**Scope decision — 4 fixed channel slots:** the RFX SDK's own `DeviceConfig` sample shows up to 4 channels, and RFX Signals/BlueDOT gateways top out at 4 physical probe channels. Rather than deriving the editable channel list dynamically from whatever `editableConfig` happens to already contain (which would show 0 fields for a freshly-provisioned device with no config yet), this panel always renders exactly 4 channel-label + alarm-high/low mini-forms per gateway, pre-filled from `editableConfig` where data exists and blank otherwise. This is a deliberate v1 simplification — a future enhancement could derive the channel count from `rfxDeviceConfigs`/actual connected probes, but that's out of scope here.

- [ ] **Step 1: Write the failing tests for `DeviceSettingsCard`**

Create `src/components/__tests__/DeviceSettingsCard.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeviceSettingsCard from '../DeviceSettingsCard';

const baseGw = {
  gatewayId: 'gw1',
  editableConfig: null,
};

describe('DeviceSettingsCard', () => {
  it('pre-fills channel labels and alarm values from editableConfig', () => {
    const gw = {
      gatewayId: 'gw1',
      editableConfig: {
        channelLabels: { 1: 'Brisket' },
        alarms: { 1: { high: 200, low: 50 } },
        transmitIntervalInSeconds: 60,
        recordingIntervalInSeconds: 30,
      },
    };
    render(<DeviceSettingsCard gw={gw} hasConfigBaseline={() => true} onUpdateDeviceConfig={vi.fn()} />);
    expect(screen.getByLabelText(/channel 1 label/i).value).toBe('Brisket');
    expect(screen.getByLabelText(/channel 1 high alarm/i).value).toBe('200');
    expect(screen.getByLabelText(/channel 1 low alarm/i).value).toBe('50');
    expect(screen.getByLabelText(/transmit interval/i).value).toBe('60');
    expect(screen.getByLabelText(/recording interval/i).value).toBe('30');
  });

  it('shows an "Initialize configuration" heading when there is no baseline yet', () => {
    render(<DeviceSettingsCard gw={baseGw} hasConfigBaseline={() => false} onUpdateDeviceConfig={vi.fn()} />);
    expect(screen.getByText(/initialize configuration/i)).toBeTruthy();
  });

  it('shows a normal "Device Settings" heading when a baseline exists', () => {
    render(<DeviceSettingsCard gw={baseGw} hasConfigBaseline={() => true} onUpdateDeviceConfig={vi.fn()} />);
    expect(screen.getByText(/^device settings$/i)).toBeTruthy();
  });

  it('calls onUpdateDeviceConfig with the edited fields on Save, and flashes a success message', async () => {
    const onUpdateDeviceConfig = vi.fn().mockResolvedValue(undefined);
    render(<DeviceSettingsCard gw={baseGw} hasConfigBaseline={() => true} onUpdateDeviceConfig={onUpdateDeviceConfig} />);

    fireEvent.change(screen.getByLabelText(/channel 1 label/i), { target: { value: 'Ribs' } });
    fireEvent.change(screen.getByLabelText(/channel 1 high alarm/i), { target: { value: '225' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await vi.waitFor(() => {
      expect(onUpdateDeviceConfig).toHaveBeenCalledWith('gw1', {
        channelLabels: { 1: 'Ribs' },
        alarms: { 1: { high: 225 } },
      });
    });
    expect(await screen.findByText(/settings sent/i)).toBeTruthy();
  });

  it('shows a flash error when onUpdateDeviceConfig rejects', async () => {
    const onUpdateDeviceConfig = vi.fn().mockRejectedValue(new Error('MQTT disconnected'));
    render(<DeviceSettingsCard gw={baseGw} hasConfigBaseline={() => true} onUpdateDeviceConfig={onUpdateDeviceConfig} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/mqtt disconnected/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/DeviceSettingsCard.test.jsx`
Expected: FAIL — the component doesn't exist yet.

- [ ] **Step 3: Implement `DeviceSettingsCard.jsx`**

Create `src/components/DeviceSettingsCard.jsx`:

```jsx
import { useState } from 'react';

const CHANNEL_NUMBERS = [1, 2, 3, 4];

function buildInitialFormState(editableConfig) {
  const channelLabels = {};
  const alarms = {};
  for (const num of CHANNEL_NUMBERS) {
    channelLabels[num] = editableConfig?.channelLabels?.[num] ?? '';
    alarms[num] = {
      high: editableConfig?.alarms?.[num]?.high != null ? String(editableConfig.alarms[num].high) : '',
      low: editableConfig?.alarms?.[num]?.low != null ? String(editableConfig.alarms[num].low) : '',
    };
  }
  return {
    channelLabels,
    alarms,
    transmitIntervalInSeconds: editableConfig?.transmitIntervalInSeconds != null
      ? String(editableConfig.transmitIntervalInSeconds) : '',
    recordingIntervalInSeconds: editableConfig?.recordingIntervalInSeconds != null
      ? String(editableConfig.recordingIntervalInSeconds) : '',
  };
}

function buildEdits(formState) {
  const channelLabels = {};
  const alarms = {};
  for (const num of CHANNEL_NUMBERS) {
    const label = formState.channelLabels[num].trim();
    if (label !== '') channelLabels[num] = label;

    const high = formState.alarms[num].high.trim();
    const low = formState.alarms[num].low.trim();
    const entry = {};
    if (high !== '') entry.high = Number(high);
    if (low !== '') entry.low = Number(low);
    if (Object.keys(entry).length > 0) alarms[num] = entry;
  }
  const edits = { channelLabels, alarms };
  const transmit = formState.transmitIntervalInSeconds.trim();
  const recording = formState.recordingIntervalInSeconds.trim();
  if (transmit !== '') edits.transmitIntervalInSeconds = Number(transmit);
  if (recording !== '') edits.recordingIntervalInSeconds = Number(recording);
  return edits;
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12,
};
const labelStyle = { display: 'block', fontSize: 11, color: 'var(--text3)', marginBottom: 2 };

export default function DeviceSettingsCard({ gw, hasConfigBaseline, onUpdateDeviceConfig }) {
  const [formState, setFormState] = useState(() => buildInitialFormState(gw.editableConfig));
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' });

  const setChannelLabel = (num, value) => {
    setFormState(s => ({ ...s, channelLabels: { ...s.channelLabels, [num]: value } }));
  };
  const setAlarm = (num, key, value) => {
    setFormState(s => ({ ...s, alarms: { ...s.alarms, [num]: { ...s.alarms[num], [key]: value } } }));
  };

  const handleSave = async () => {
    setSaveState({ status: 'saving', message: '' });
    try {
      await onUpdateDeviceConfig(gw.gatewayId, buildEdits(formState));
      setSaveState({ status: 'saved', message: 'Settings sent — device applies on next check-in.' });
    } catch (err) {
      setSaveState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to send settings.' });
    }
  };

  const initializing = !hasConfigBaseline(gw.gatewayId);

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>
        {initializing ? 'Initialize Configuration' : 'Device Settings'}
      </div>
      <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)', marginBottom: 8 }}>
        {gw.gatewayId}
      </div>
      {initializing && (
        <div style={{ fontSize: 12, color: 'var(--amber)', marginBottom: 8 }}>
          No configuration has been seen from this device yet. Fields below are pre-filled from the last known
          settings on this device, if any.
        </div>
      )}

      {CHANNEL_NUMBERS.map(num => (
        <div key={num} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 120px' }}>
            <label htmlFor={`ch-${gw.gatewayId}-${num}-label`} style={labelStyle}>Channel {num} Label</label>
            <input id={`ch-${gw.gatewayId}-${num}-label`} type="text" style={inputStyle}
              value={formState.channelLabels[num]}
              onChange={e => setChannelLabel(num, e.target.value)} />
          </div>
          <div style={{ flex: '1 1 70px' }}>
            <label htmlFor={`ch-${gw.gatewayId}-${num}-high`} style={labelStyle}>Channel {num} High Alarm</label>
            <input id={`ch-${gw.gatewayId}-${num}-high`} type="number" style={inputStyle}
              value={formState.alarms[num].high}
              onChange={e => setAlarm(num, 'high', e.target.value)} />
          </div>
          <div style={{ flex: '1 1 70px' }}>
            <label htmlFor={`ch-${gw.gatewayId}-${num}-low`} style={labelStyle}>Channel {num} Low Alarm</label>
            <input id={`ch-${gw.gatewayId}-${num}-low`} type="number" style={inputStyle}
              value={formState.alarms[num].low}
              onChange={e => setAlarm(num, 'low', e.target.value)} />
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 120px' }}>
          <label htmlFor={`transmit-${gw.gatewayId}`} style={labelStyle}>Transmit Interval (sec)</label>
          <input id={`transmit-${gw.gatewayId}`} type="number" style={inputStyle}
            value={formState.transmitIntervalInSeconds}
            onChange={e => setFormState(s => ({ ...s, transmitIntervalInSeconds: e.target.value }))} />
        </div>
        <div style={{ flex: '1 1 120px' }}>
          <label htmlFor={`recording-${gw.gatewayId}`} style={labelStyle}>Recording Interval (sec)</label>
          <input id={`recording-${gw.gatewayId}`} type="number" style={inputStyle}
            value={formState.recordingIntervalInSeconds}
            onChange={e => setFormState(s => ({ ...s, recordingIntervalInSeconds: e.target.value }))} />
        </div>
      </div>

      <button type="button" className="btn-primary" onClick={handleSave}
        disabled={saveState.status === 'saving'} style={{ fontSize: 13, padding: '6px 14px' }}>
        {saveState.status === 'saving' ? 'Saving…' : 'Save'}
      </button>

      {saveState.status === 'saved' && (
        <div role="status" style={{ fontSize: 12, color: 'var(--green)', marginTop: 8 }}>{saveState.message}</div>
      )}
      {saveState.status === 'error' && (
        <div role="alert" style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>{saveState.message}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/DeviceSettingsCard.test.jsx`
Expected: PASS — all 5 cases.

- [ ] **Step 5: Wire `DeviceSettingsCard` into `SettingsSheet.jsx`**

Add the failing test first. Append to `src/components/__tests__/SettingsSheet.test.jsx`:

```jsx
describe('SettingsSheet — Device Settings panel', () => {
  it('renders a DeviceSettingsCard for each gateway with editableConfig data', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[
      { gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', unitMismatch: false,
        editableConfig: { channelLabels: {}, alarms: {}, transmitIntervalInSeconds: null, recordingIntervalInSeconds: null },
        probes: [] },
    ]} onHasConfigBaseline={() => true} onUpdateDeviceConfig={vi.fn()} />);
    expect(screen.getByText(/^device settings$/i)).toBeTruthy();
  });

  it('renders nothing device-settings-related when gatewayHealth is empty', () => {
    render(<SettingsSheet {...baseProps} gatewayHealth={[]} onHasConfigBaseline={() => true} onUpdateDeviceConfig={vi.fn()} />);
    expect(screen.queryByText(/device settings/i)).toBeNull();
  });
});
```

Also add `onHasConfigBaseline: () => false, onUpdateDeviceConfig: vi.fn(),` to the `baseProps` object at the top of the file, alongside the existing `gatewayHealth: []` line.

**Why this matters for tests you are not otherwise touching:** every existing "Device Health" test in this same file spreads `{...baseProps}` and then overrides `gatewayHealth` with 1+ entries. Once `SettingsSheet.jsx` unconditionally renders a `DeviceSettingsCard` per gateway (Step 7 below), those pre-existing tests will also render one — and `DeviceSettingsCard` calls `hasConfigBaseline(gw.gatewayId)` unconditionally. If `baseProps` doesn't supply a real function for `onHasConfigBaseline`, every pre-existing Device Health test will crash with "hasConfigBaseline is not a function," not just the two new tests above. Adding it to the shared `baseProps` object fixes this for all of them at once — do not skip this or scope it to only the new tests.

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run src/components/__tests__/SettingsSheet.test.jsx`
Expected: FAIL — `SettingsSheet` doesn't render `DeviceSettingsCard` yet.

- [ ] **Step 7: Add the import and the Device Settings card block**

Edit `src/components/SettingsSheet.jsx`. Add the import at the top:

```javascript
import DeviceSettingsCard from './DeviceSettingsCard';
```

Update the function signature to accept the two new props:

```javascript
export default function SettingsSheet({ open, onClose, cookState, recipes, onImportCooks, onImportRecipes, prefs, resetCutPref, setTheme, mqttStatus, mqttError, onMqttConnect, onMqttDisconnect, gatewayHealth = [], onHasConfigBaseline, onUpdateDeviceConfig }) {
```

Insert this block immediately after the closing `)}` of the "Device Health" card block, before the `{/* Export */}` comment:

```jsx
        {/* Device Settings */}
        {gatewayHealth.map(gw => (
          <DeviceSettingsCard
            key={gw.gatewayId}
            gw={gw}
            hasConfigBaseline={onHasConfigBaseline}
            onUpdateDeviceConfig={onUpdateDeviceConfig}
          />
        ))}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/components/__tests__/SettingsSheet.test.jsx`
Expected: PASS — all cases, old and new. Then run the full suite:

Run: `npm test`
Expected: PASS — all tests project-wide.

- [ ] **Step 9: Commit**

```bash
git add src/components/DeviceSettingsCard.jsx src/components/__tests__/DeviceSettingsCard.test.jsx src/components/SettingsSheet.jsx src/components/__tests__/SettingsSheet.test.jsx
git commit -m "feat: add Device Settings panel for editing channel labels, alarms, and intervals"
```

---

## Task 9: Manual verification

**Files:** none — this task runs the app.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: server starts with no console errors.

- [ ] **Step 2: Open Settings and confirm empty-state behavior with no gateway connected**

Open the app in a browser, open Settings. Neither "Device Health" nor any "Device Settings"/"Initialize Configuration" card should render — confirms the empty-state guards hold against real app state, not just mocked test props.

- [ ] **Step 3: Confirm build passes**

Run: `npm run build`
Expected: build succeeds with no TypeScript or bundling errors.

- [ ] **Step 4: Update memory bank**

Add a line to `memory-bank/activeContext.md` under "What's Working" noting bidirectional device config ships. Follow the existing frontmatter/structure in that file — do not rewrite the whole file.

- [ ] **Step 5: Commit**

```bash
git add memory-bank/activeContext.md
git commit -m "docs: update activeContext — bidirectional device config shipped"
```
