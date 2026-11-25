# Bidirectional Device Config — Design

**Date:** 2026-07-03
**Status:** Approved, pending implementation plan

## Problem

`ThermoWorksAdapter` only reads telemetry — there is no path for PitLogic to write settings back to a device (alarm thresholds, channel labels, transmit/recording intervals). The RFX SDK supports this via a retained MQTT message on `/devices/{id}/config` (Broker → Device), but it comes with a hard constraint documented in the SDK:

> Always publish the **complete** config object. The device replaces its entire configuration with whatever is received — partial updates are not supported.

Any write path must therefore always know (or reconstruct) the full `DeviceConfig` object, not just the fields the user is editing, or it will silently wipe out every other setting on the device (including things PitLogic has no UI for, like Billows fan config).

## Scope

User-editable from PitLogic: **alarm thresholds (high/low per channel), channel labels, and transmit/recording intervals.** Explicitly out of scope: fan/Billows setpoint (user doesn't own a Billows controller), firmware target version, `rfxDeviceConfigs` per-probe intervals.

## Design

### Read path: retained config as source of truth

`ThermoWorksAdapter` subscribes to `/devices/+/config` alongside its existing subscriptions (`/devices/+/state`, `/probes/+/events`). MQTT retained messages deliver immediately to a new subscriber, so this subscription gives the adapter a live baseline of whatever config currently exists on the device — including configs published by other tools, and echoes of PitLogic's own publishes.

A new event type, `gateway:config`, carries `{ gatewayId, raw: DeviceConfigJson }` — the full vendor config object — emitted on every message received on this topic.

The adapter keeps a private, session-scoped cache: `_configCache: Map<gatewayId, DeviceConfigJson>`, updated on every `gateway:config` event. This cache is the authoritative baseline for merges — it reflects reality on the broker, not just what PitLogic itself has written.

### Write path: merge-then-republish

New adapter method: `publishConfig(gatewayId, edits, fallbackBaseline?)`.

- Baseline = `_configCache.get(gatewayId) ?? fallbackBaseline ?? {}`.
- `edits` (channel labels, per-channel alarm high/low, transmit/recording intervals) are merged into the baseline. Channels are merged by `number`; unrecognized top-level fields (e.g. `fan`, `rfxDeviceConfigs`, `firmware`) are passed through untouched.
- The merged object is published to `/devices/{gatewayId}/config` as a **retained** message.
- The adapter never touches localStorage or any domain/UI state, consistent with its existing constraints — the `fallbackBaseline` is supplied by the caller (the hook), not looked up internally.

### Fallback baseline: localStorage as a convenience cache, not a source of truth

If a device has never had a config published (fresh device, or freshly re-provisioned), `_configCache` will be empty and there's no retained message to read. Rather than starting from a blank slate, `useThermoWorksProvider.js` persists the last successfully-seen full config per `gatewayId` to `localStorage['pitlogic-thermoworks-config-cache-v1']` on every `gateway:config` event, and supplies it as `fallbackBaseline` when calling `publishConfig` if `hasConfigBaseline(gatewayId)` is false.

This is strictly a convenience — it only fills the gap when nothing authoritative exists yet. It is never used to override a live retained config, so it can't cause the silent-revert problem a pure "PitLogic owns the config" model would have if some other tool changed a setting out of band.

### Materialized state for UI

The hook maps each `gateway:config` event into a narrow, vendor-agnostic `editableConfig` shape — `{ channelLabels, alarms: Record<channelNumber, {high?, low?}>, transmitIntervalInSeconds?, recordingIntervalInSeconds? }` — stored on `TelemetryStore.gatewayState[gatewayId].editableConfig` (extending the `GatewayState` type from the device-health design). The UI never sees the raw vendor JSON — only this materialized subset, preserving the provider firewall (ADR-001).

### UI

New "Device Settings" panel in `SettingsSheet.jsx`'s Live Device section, per connected gateway:

- Editable fields for channel labels, alarm high/low per channel, transmit/recording intervals — reading from `TelemetryStore.gatewayState[...].editableConfig`.
- If `hasConfigBaseline(gatewayId)` is false: shows "Initialize configuration" pre-filled from the localStorage fallback (or blank) instead of a normal edit form.
- Save calls `updateDeviceConfig(gatewayId, edits)`; on success, flashes "Settings sent — device applies on next check-in." No live round-trip confirmation in v1 — a natural future enhancement once `gatewayState` reflects the change (already wired by the device-health design), but not required now.
- Publish failures (e.g. MQTT disconnected) surface as a flash error.

## Files Touched

- `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` — new subscription, `gateway:config` event, `_configCache`, `publishConfig`
- `src/lib/telemetry/TelemetryStore.ts` — extend `GatewayState` with `editableConfig`
- `src/hooks/useThermoWorksProvider.js` — localStorage fallback cache, `updateDeviceConfig`, `hasConfigBaseline`
- `src/components/SettingsSheet.jsx` — Device Settings panel

## Compliance

ADR-003 8-question filter: all "no". Writing to a documented, already-integrated MQTT topic on the user's own broker. No reverse engineering, no proprietary functionality exposed, no new hosting/relay infrastructure. All vendor-specific merge logic stays inside `ThermoWorksAdapter.ts`.

## Out of Scope

- Fan/Billows configuration, firmware target version, `rfxDeviceConfigs` per-probe settings — passed through untouched, never edited by PitLogic
- Live confirmation that the device applied a config change (relies on next `/devices/{id}/state` update, not built as a dedicated feature here)
