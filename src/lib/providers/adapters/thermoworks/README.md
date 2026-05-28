# ThermoWorks Adapter — Compliance Notices

This directory contains the ThermoWorks integration via the **ThermaConnect open MQTT protocol**.

## Status

**IMPLEMENTATION PENDING** — Spec written (`docs/superpowers/specs/2026-05-27-thermoworks-mqtt-adapter-design.md`). Current file is a stub; implementation plan in progress.

**Protocol:** ThermaConnect (open, documented MQTT protocol published by ThermoWorks-Integrations). No proprietary SDK — browser-only `mqtt.js` over WebSocket.

## Before Modifying

Run the 8-question engineering decision filter from ADR-003:

1. Does this require undocumented behavior?
2. Does this involve reverse engineering?
3. Does this expose proprietary functionality?
4. Does this redistribute proprietary components?
5. Does this create a substitute SDK ecosystem?
6. Does this increase hosting/commercialization exposure?
7. Does this blur ownership boundaries?
8. Does this create trademark/branding confusion?

**Any "yes" = stop and escalate before writing any code.**

## Approved Integration Model

```
RFX Gateway
  ↓ ThermaConnect MQTT (open protocol, WSS)
User-managed MQTT broker (e.g. HiveMQ Cloud)
  ↓ mqtt.js WebSocket (browser)
ThermoWorksAdapter (this directory)
  ↓ RawProviderEvent (Record<string, unknown>)
Normalization Layer (normalizeProviderEvent)
  ↓ NormalizedTelemetryEvent
globalEventBus → TelemetryStore
  ↓ materialized state
Analytics / UI
```

## Prohibited Patterns

- Reverse-engineering Bluetooth packets or proprietary protocols
- Accessing localStorage, React state, or UI hooks from this file
- Emitting `session:started` / `session:ended` — only `SessionStore` may do this
- Inferring or emitting staleness — only `TelemetryStore` does that
- Redistributing ThermoWorks SDK binaries or extracted protocol logic

## Commercialization Risk

Current low-risk posture depends on local-only architecture and no SDK redistribution.
Adding cloud hosting, multi-tenant telemetry, or SaaS components changes this materially —
perform a legal review before any such change.
