# RFX Device Health & Accuracy — Design

**Date:** 2026-07-03
**Status:** Approved, pending implementation plan

## Problem

The ThermoWorks RFX MQTT integration currently loses information the SDK already provides:

- `ThermoWorksAdapter.transformPayload` matches only `/probes/{id}/events` with a `channels` array. Battery payloads (`{"gatewayId": ..., "battery": 10}`) and firmware payloads (`{"gatewayId": ..., "firmware": "1.1.10"}`) have no `channels` array and are silently dropped (return `[]`).
- The adapter never subscribes to `/devices/{id}/state`, so gateway-level wifi strength, battery, firmware, connected SSID, serial, and per-channel labels are never surfaced anywhere in PitLogic.
- `transformPayload` hardcodes `unit: 'F'` regardless of what the device is actually configured to report.
- Channel labels configured on the physical device never flow into PitLogic's own probe naming.

None of this is visible to the user today — there's no low-battery warning, no way to see gateway wifi/firmware status, and a device reporting Celsius would silently mislabel every reading as Fahrenheit.

## Design

### New subscription

`ThermoWorksAdapter.connect()` and `_onReconnect()` subscribe to `/devices/+/state` in addition to the existing `/probes/+/events`.

### New event types

- `gateway:state` — emitted from `/devices/{id}/state` messages. Carries `wifiStrength`, `battery`, `firmware`, `units` ('F' | 'C'), and `channelLabels` (channel number → label).
- `probe:battery` — emitted when a `/probes/{id}/events` payload contains a `battery` field instead of `channels` (previously dropped).

`transformPayload` is extended to recognize both new payload shapes and continues to return `[]` only for genuinely malformed input.

### Unit handling

The adapter maintains a private `_gatewayUnits: Map<gatewayId, 'F'|'C'>` cache, updated whenever a `gateway:state` event is processed (default `'F'` if never seen). Probe reading payloads include a `gatewayId`; the adapter looks up the cached units and injects them into the emitted event. `transformPayload` accepts an optional `units` parameter so it remains a pure, testable function — the adapter instance owns the cache and passes the looked-up value in.

The app trusts whatever the device reports rather than attempting unit conversion. If a device reports `'C'`, Settings shows a mismatch warning in the Live Device section rather than silently converting values.

### TelemetryStore changes

- New field: `gatewayState: Map<gatewayId, GatewayState>`, alongside the existing probe map.
- `GatewayState` type: `{ wifiStrength?: number, battery?: number, firmware?: string, units: 'F'|'C', channelLabels: Record<channelNumber, string> }`.
- `ProbeState` gains an optional `battery?: number` field.

### Channel labels

When a `gateway:state` event's `channelLabels` includes a label for a channel PitLogic already has a probe for, the label is applied to `ProbeState.label` **only if** the current label is still the default (the raw probe ID string) — a user-renamed probe is never overwritten.

### UI

- **Inline indicator**: a 🔋 icon appears next to a probe row only when `ProbeState.battery <= 20`.
- **Settings device health panel**: new section in `SettingsSheet.jsx`'s Live Device area showing gateway wifi strength, battery, firmware, and a per-probe battery list, sourced entirely from `TelemetryStore.gatewayState` and `ProbeState.battery` — never from the adapter or event bus directly (provider firewall, ADR-001).
- **Unit mismatch warning**: shown in the same Settings section if `GatewayState.units === 'C'`.

## Files Touched

- `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` — new subscription, new event types, unit cache
- `src/lib/telemetry/normalize.ts` — handle new event shapes
- `src/lib/telemetry/TelemetryStore.ts` (or equivalent) — `gatewayState` map, `ProbeState.battery`
- New domain type for `GatewayState`
- `src/hooks/useThermoWorksProvider.js` — bridge new event types to the store
- `src/components/SettingsSheet.jsx` — device health panel, mismatch warning
- Probe row component — inline battery icon

## Compliance

ADR-003 8-question filter: all "no" — this only consumes additional fields from the already-documented, already-integrated MQTT payloads. No new protocol surface, no reverse engineering, no proprietary exposure.

## Out of Scope

- Unit conversion (F↔C) — explicitly rejected in favor of trusting the device and warning on mismatch.
- Any write path to the device (see the bidirectional-config spec for that).
