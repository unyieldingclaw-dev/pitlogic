# ADR-002: Semantic Authority Hierarchy

**Status:** Accepted
**Date:** 2026-05-18

## Context

A telemetry pipeline has multiple processing stages. Without explicit authority assignment, layers tend to duplicate responsibility: providers start making staleness judgments, analytics layers start managing sessions, UI layers start caching probe state. This creates conflicting sources of truth and makes compliance boundaries impossible to enforce structurally.

## Decision

Each layer has exclusive authority over a defined semantic domain. No layer claims authority outside its boundary.

| Layer | Authority | Examples |
|---|---|---|
| Provider adapters | Ingress events only | connect, ingest raw bytes, emit `RawProviderEvent` |
| Normalizer | Validity + canonical representation | Zod validation, °F conversion, timestamp assignment |
| Store | State, timelines, derived status | stale derivation, reconnect detection, session lifecycle |
| Analytics | Interpretation + prediction | stall detection, ETA, climb rate, quality scoring |
| UI | Presentation + interaction state | display formatting, user input, aria state |

## Session Lifecycle Authority

**Session lifecycle is owned exclusively by `SessionStore`.** Providers MUST NOT:
- Infer when a session has started or ended
- Emit `SessionStartedEvent` or `SessionEndedEvent`
- Create or terminate `CookSession` records
- Store session IDs or reference session state

`SessionStore` observes the probe timeline from `TelemetryStore` and emits session events when it determines a session boundary has occurred.

## Derived Status Authority

**`ProbeState.status` is owned exclusively by `TelemetryStore`.** Providers MUST NOT:
- Emit staleness judgments
- Determine when a probe has "timed out"
- Report `status: 'stale'`

`TelemetryStore` derives `stale` by comparing `capturedAt` of the last `ActiveReading` against the current clock. This derivation runs on the Store's own timer, not on provider emissions.

**Reconnect detection** is also Store-derived: when a probe with `status: 'disconnected'` receives a new `ProbeReadingEvent` (ActiveReading), the Store transitions it back to `active`. No explicit `ProbeReconnectedEvent` is required from the provider.

## Deduplication Authority

Deduplication is a normalization-layer concern, applied per-provider context. The EventBus MUST NOT deduplicate. There is no universal deduplication rule — dedup semantics depend on provider transport characteristics.

## Rationale

Clear authority prevents:
- Provider semantics from leaking into domain models
- Session management logic from being scattered across layers
- Conflicting staleness judgments from provider vs. store

## Enforcement

Code review. Any PR that places session management in a provider, or staleness derivation in a normalizer, violates this ADR and should be rejected.
