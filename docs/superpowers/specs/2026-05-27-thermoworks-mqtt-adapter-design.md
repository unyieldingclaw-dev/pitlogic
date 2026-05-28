# ThermoWorks MQTT Adapter Design

**Date:** 2026-05-27
**Feature:** Live ThermoWorks RFX integration via ThermaConnect MQTT protocol
**Status:** Approved for implementation

---

## Overview

Implement a live temperature feed from a ThermoWorks RFX Gateway into PitLogic using the open ThermaConnect MQTT protocol. The integration is browser-only (no backend). Data flows from the gateway through a user-managed MQTT broker (HiveMQ Cloud recommended) into PitLogic's existing telemetry pipeline.

---

## Architecture

```
[RFX Gateway] ──MQTT/WSS──► [HiveMQ Cloud broker]
                                      │
                              mqtt.js (browser WebSocket)
                                      │
                          ThermoWorksAdapter.ts
                          (src/lib/providers/adapters/thermoworks/)
                                      │
                          raw payload transform
                                      │
                          useThermoWorksProvider (src/hooks/)
                                      │
                          normalizeProviderEvent()
                                      │
                          globalEventBus.publish()
                                      │
                          TelemetryStore (existing consumer, unchanged)
                                      │
                                   UI
```

**Critical invariant (ADR-001):** The existing `eventBus → TelemetryStore` ingestion path is preserved. The hook does NOT write to TelemetryStore directly. No parallel ingestion path is created.

---

## Component Responsibilities

### `ThermoWorksAdapter.ts`

**File:** `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`

**Owns:**
- `mqtt.js` client lifecycle (create, connect, reconnect, destroy)
- Topic subscription to `/probes/+/events`
- Raw payload transform: ThermaConnect RFX format → `RawProviderEvent`
- Exactly-one message listener enforcement
- Cleanup on disconnect

**Does NOT own:** normalization, localStorage, React state, eventBus, session state

**Constructor signature:**
```ts
constructor(config: { brokerUrl: string; username: string; password: string })
```

Config is injected at construction time. The adapter never reads localStorage.

**Interface compliance:** Implements `TemperatureProvider` exactly as defined. Do NOT add `getStatus()`, observable streams, retry APIs, or event buses to the interface.

---

### `useThermoWorksProvider` hook

**File:** `src/hooks/useThermoWorksProvider.js`

**Owns:**
- Reading MQTT config from `pitlogic-mqtt-v1` localStorage key
- Constructing and disposing adapter on mount/unmount
- Wiring adapter output → `normalizeProviderEvent(rawEvent, adapter.id)` → `globalEventBus.publish()`
- Exposing `{ status, error, connect, disconnect }` to callers

**Does NOT own:** payload interpretation, probe state, TelemetryStore writes

**Status values:** `'disconnected' | 'connecting' | 'connected' | 'error'`

**Note on `connect` / `disconnect` exposure:** The hook exposes these as functions so the Settings UI can trigger lifecycle changes without containing transport logic. The button handler calls `hook.connect()` — transport decisions remain inside the hook and adapter.

---

### Settings UI

**File:** `src/components/SettingsSheet.jsx` — new "Live Device" section

**Owns:**
- Config form: broker URL, username, password fields
- Save button: writes to `pitlogic-mqtt-v1` localStorage on explicit save only
- Connect / Disconnect button: calls `hook.connect()` or `hook.disconnect()`
- Status display: passive read of `{ status, error }` from hook

**Constraint:** SettingsSheet edits config only. No connection logic lives inside button handlers. The hook reacts to config changes; the UI does not orchestrate transport directly. No auto-reconnect on field edit.

---

## Adapter Invariants (Implementation Contract)

### `connect()` — idempotent

```ts
async connect(): Promise<void> {
  if (this._client) return;
  this._client = await mqtt.connectAsync(this._config.brokerUrl, {
    username: this._config.username,
    password: this._config.password,
  });
  this._registerMessageHandler(); // exactly once, guarded
  this._client.on('connect', (connack) => this._onReconnect(connack));
}
```

Second call is a no-op if client already exists.

### `disconnect()` — forced teardown

```ts
async disconnect(): Promise<void> {
  if (!this._client) return;
  await this._client.endAsync(/* force= */ true);
  this._client = null;
  this._messageHandlerRegistered = false;
}
```

`endAsync(true)` stops the mqtt.js reconnect loop. Without `force`, the client may continue reconnecting after React unmount, creating a hidden background transport leak.

### Reconnect — session-aware resubscription

```ts
private async _onReconnect(connack: mqtt.IConnackPacket): Promise<void> {
  if (connack.sessionPresent) return; // broker retained subscriptions
  await this._client!.subscribeAsync('/probes/+/events');
}
```

Use `connack.sessionPresent` as the authoritative signal for whether broker-side subscriptions survived. Local boolean bookkeeping is unsafe because it assumes local state equals broker state across session loss.

If `sessionPresent` is unavailable: always resubscribe on reconnect — duplicate topic subscriptions are harmless with MQTT brokers. The real risk is duplicate message listeners, not duplicate subscribes.

### Message listener — exactly one per client instance

```ts
private _registerMessageHandler(): void {
  if (this._messageHandlerRegistered) return;
  this._client!.on('message', (topic, payload) => this._onMessage(topic, payload));
  this._messageHandlerRegistered = true;
}
```

Stacking `client.on('message', ...)` across reconnects is the most common real-world MQTT duplication bug. Guard this explicitly.

---

## Payload Transform

### ThermaConnect RFX format (input)

```json
{
  "gatewayId": "M123456789012",
  "channels": [
    {
      "number": 1,
      "ts": 1716825600000,
      "readings": [
        { "value": 225.4, "type": "T" }
      ]
    }
  ]
}
```

### Transform rules

For each channel in `channels`:
1. Filter readings where `type === 'T'` (temperature)
2. Emit one `RawProviderEvent` per temperature reading:

```ts
{
  probeId:     `${probeTopicId}-ch${channel.number}`,
  capturedAt:  channel.ts,
  temperature: reading.value,
  unit:        'F',
  source:      'live',
}
```

`probeTopicId` is extracted from the MQTT topic string (e.g., topic `/probes/M123456789012/events` → `M123456789012`).

**One MQTT message may produce zero, one, or multiple `RawProviderEvent`s.** `subscribe(handler)` is invoked once per emitted reading, not once per MQTT message.

### Timestamp rule

`channel.ts` MUST be epoch milliseconds. IoT payloads commonly drift between seconds, milliseconds, and ISO strings. If `channel.ts` is not a positive integer, the event is discarded (not emitted). Heuristic: values < 1e10 are likely seconds-epoch and should be rejected as ambiguous.

### Malformed payload policy

If the MQTT payload fails to parse as valid JSON, or does not match expected ThermaConnect structure:
- Log a warning (structured: `{ adapter: 'thermoworks', topic, reason }`)
- Discard the message
- Do NOT disconnect the client
- Do NOT emit a partial or invalid event

MQTT streams are operationally noisy. Malformed messages must not crash the adapter or poison the normalization pipeline.

---

## Probe Identity

`probeId = ${probeTopicId}-ch${channelNumber}` (e.g., `M123456789012-ch1`)

Probe identity is **transport-derived, not hardware-persistent.** Gateway replacement, channel renumbering, or device swap will change probe IDs and break cook history continuity. This is acceptable at current scale. Cook history association is opportunistic, not guaranteed.

---

## Provider ID

Always reference provider identity via `adapter.id`, never as a string literal:

```ts
// correct
normalizeProviderEvent(rawEvent, adapter.id)

// wrong
normalizeProviderEvent(rawEvent, 'thermoworks')
```

`ThermoWorksAdapter.readonly id = 'thermoworks'` is the single source of truth.

---

## Broker / Topic Isolation

The wildcard subscription `/probes/+/events` requires that the MQTT broker enforces ACL-based topic namespace isolation per authenticated user. Before shipping:

- Verify HiveMQ ACL restricts each username to its own device namespace
- If ACL is permissive, all broker traffic is visible client-side (unacceptable for multi-household use)
- For single-household deployment: document this assumption explicitly in UI

Default recommendation: HiveMQ Cloud free tier with per-user ACL rules. User must configure ACL in HiveMQ Cloud console before connecting.

---

## Credential Security

MQTT credentials are stored in localStorage (`pitlogic-mqtt-v1`). This is acceptable because PitLogic is a personal, single-user, browser-local tool — not a multi-user SaaS.

**Risk boundary:** Browser compromise equals MQTT credential compromise. Document this in the Settings UI adjacent to the credential fields.

Do not add encrypted vault abstractions at this scale.

---

## localStorage Schema

Key: `pitlogic-mqtt-v1`

```ts
{
  brokerUrl: string;  // e.g. "wss://abc123.hivemq.cloud:8884/mqtt"
  username:  string;
  password:  string;
}
```

---

## Dependencies

- `mqtt` (npm) — browser-compatible, WebSocket transport built in. No backend required.
- No new build tooling.

---

## What Does NOT Change

- `TemperatureProvider` interface — no new methods
- `TelemetryStore` — no direct writes from hook
- `EventBus` — existing `globalEventBus.publish()` API used as-is
- Normalization schemas — `RawActiveReadingSchema` consumed unchanged
- All existing providers (CsvProvider, MockProvider) — unaffected

---

## Test Plan

| Test | What it verifies |
|------|-----------------|
| Payload transform: single channel | ThermaConnect RFX → correct `RawProviderEvent` shape |
| Payload transform: multiple channels | Each channel emits a separate event |
| Payload transform: no temperature readings | Zero events emitted when no `type === 'T'` readings |
| Schema validation | Adapter output passes `RawActiveReadingSchema` |
| `connect()` idempotency | Second call does not create a second client |
| Message listener deduplication | `_messageHandlerRegistered` guard prevents stacking |
| Reconnect deduplication | One normalized event emitted per reading after reconnect cycle, not two |
| `disconnect()` teardown | Handler not called after disconnect; client nulled |
| Malformed payload discard | Invalid JSON/structure logs warning and emits zero events |
| Invalid timestamp discard | `ts < 1e10` discards event |
| Hook lifecycle | `connect()` called on mount, `disconnect()` on unmount |

---

## Out of Scope

- BLE provisioning (user provisions device via ThermoWorks's own tool at `thermoworks-iot-provisioning.web.app`)
- `TelemetryStore` stale-check lifecycle (pre-existing concern, separate issue)
- Multi-broker or ProviderRegistry-driven switching (ProviderRegistry not yet wired to UI)
