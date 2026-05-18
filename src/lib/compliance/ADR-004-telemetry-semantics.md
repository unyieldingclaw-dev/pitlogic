# ADR-004: Canonical Telemetry Semantics

**Status:** Accepted
**Date:** 2026-05-18

## Context

Telemetry semantics — what a timestamp means, who owns staleness, when a disconnect is emitted, how temperatures are stored — tend to be decided implicitly and inconsistently. This ADR is the single canonical reference. Any ambiguity in the codebase defers to this document.

## Timestamp Authority

```ts
interface TelemetryTimestamp {
  capturedAt:   number;  // device/provider observation — authoritative cook timeline
  receivedAt:   number;  // adapter ingress (wall clock at the PitLogic process)
  normalizedAt: number;  // normalization completion (wall clock)
  persistedAt?: number;  // optional: wall clock at store commit
}
```

**`capturedAt` is the authoritative cook timeline.** All time-series analysis (stall detection, ETA, climb rate) uses `capturedAt`. The other fields are observability/debugging metadata.

Providers MUST supply `capturedAt`. If the device does not emit a timestamp, the adapter sets `capturedAt = receivedAt` and documents this fallback in the adapter's README.

## Temperature Unit Normalization

**All temperatures are stored internally as °F (Fahrenheit).** This is the canonical unit throughout the pipeline.

- `NormalizedTemperature.valueF` — canonical value, always °F
- `NormalizedTemperature.providerUnit` — original unit from provider ('F' or 'C')
- `NormalizedTemperature.providerValue` — original value (preserved for provenance/debugging)
- `NormalizedTemperature.normalizedBy` — `'provider'` if the provider already sends °F, `'normalizer'` if conversion was applied

`displayUnitPreference` lives in user prefs and controls UI rendering only. It never affects storage or analytics.

## Staleness Derivation

**`ProbeState.status = 'stale'` is derived exclusively by `TelemetryStore`.** Providers MUST NOT emit staleness. The Store runs on its own timer, compares the last `ActiveReading.timestamp.capturedAt` against the current clock, and transitions probe status to `'stale'` when the delta exceeds a configurable threshold.

Staleness is not a telemetry event. It is a derived view model property.

## Disconnect Semantics

**Disconnected probes SHOULD emit `ProbeDisconnectedEvent` when transport semantics support it.** This is a SHOULD, not a MUST:

- Live providers (BLE, WebSocket, USB) SHOULD emit explicit disconnect events
- CSV, import, and replay sources are **exempt** — they have no live connection concept
- Manual/synthetic sources are exempt

When a `ProbeDisconnectedEvent` is received, the Store transitions that probe to `status: 'disconnected'`. When the same probe subsequently emits a `ProbeReadingEvent` (ActiveReading), the Store transitions back to `status: 'active'`. No explicit reconnect event is required.

## Out-of-Order Event Tolerance

**Providers SHOULD emit readings in chronological `capturedAt` order when possible.**

**Normalizer and Store MUST tolerate limited out-of-order events.** "Limited" means: events arriving slightly out of order due to transport jitter or buffering. The system does not need to handle arbitrary reordering or historical replay (that is a separate replay feature concern).

Out-of-order events are accepted and appended. Analytics algorithms must not assume strict monotonic `capturedAt` ordering in probe timelines.

## Deduplication Scope

Deduplication is a normalization-layer concern, applied per-provider context. There is no universal deduplication rule. CSV rows may require dedup by row hash; a live BLE stream may not require dedup at all. The normalizer decides per-provider.

The EventBus does not deduplicate.

## Rejected Payload Policy

**Malformed ingress always produces `NormalizationRejectedEvent` — never silent drop.**

```ts
interface RejectedPayloadMetadata {
  providerId:        string;
  eventType?:        string;   // if parseable from payload
  receivedAt:        number;
  payloadHash?:      string;   // for correlation without storing the full payload
  truncatedPayload?: unknown;  // optional, bounded — not a full data dump
}
```

Rejection is observable (logs, metrics) but never fatal to app startup or active cooks. The app continues operating with the last known good state.

## Provider Trust Assumptions

**Providers are authoritative about ingress events only.** The pipeline does not trust providers to:
- Know when sessions start or end
- Know whether a probe is stale
- Know the canonical identity of a probe across sessions
- Deduplicate events across providers

The normalizer validates and canonicalizes. The store builds truth.

## Event Schema Versioning

**Current state:** Event schemas are not versioned. This is acceptable while no replay or migration feature exists.

**Before implementing any replay or long-lived event persistence feature:** Add a `schemaVersion` field to persisted `NormalizedTelemetryEvent` records. Telemetry contracts are not assumed stable across releases. Omitting schema versioning on persisted events will make future migrations painful.

This is a forward-looking constraint, not a current blocker.

## Rationale

Centralizing these rules prevents semantic drift across the codebase. When a new engineer (or a future AI session) encounters an ambiguous situation — "should I use capturedAt or receivedAt here?" — they should find the answer in this document, not by reading code and guessing.
