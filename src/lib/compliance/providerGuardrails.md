# Provider Guardrails

Rules for implementing `TemperatureProvider` adapters in `src/lib/providers/adapters/`.

---

## What a Provider MUST Do

- Implement the `TemperatureProvider` interface (`connect`, `subscribe`, `disconnect`)
- Emit `RawProviderEvent` objects — untyped `Record<string, unknown>` at the boundary
- Include `capturedAt` in every emitted event (if the device does not provide a timestamp, set `capturedAt = Date.now()` and document this clearly)
- Manage transport-level reconnection (exponential backoff, socket reconnect, BLE re-pairing)
- Emit `ProviderConnectedEvent` and `ProviderDisconnectedEvent` via the registry when connection state changes

## What a Provider MUST NOT Do

- Persist telemetry to localStorage, IndexedDB, or any storage system
- Access or mutate `TelemetryStore`, `SessionStore`, or any store
- Import from `src/lib/telemetry/` (except `ProviderTypes.ts` for `RawProviderEvent`)
- Import from `src/utils/analytics.js` or any analytics module
- Access React state, hooks, or component state
- Emit `status: 'stale'` — staleness is derived by `TelemetryStore`
- Emit `SessionStartedEvent` or `SessionEndedEvent` — session lifecycle is owned by `SessionStore`
- Infer or create cook sessions
- Deduplicate domain events (normalization layer handles this)
- Buffer events beyond transport-level dispatch queues
- Bypass the normalizer (raw provider events MUST flow through `normalize.ts`)

---

## Prohibited Implementation Patterns

The following patterns are explicitly prohibited in all provider adapters:

```ts
// PROHIBITED: accessing storage
localStorage.setItem(...)
localStorage.getItem(...)

// PROHIBITED: importing analytics
import { detectStall } from '../../utils/analytics';

// PROHIBITED: importing stores
import { TelemetryStore } from '../../telemetry/store/TelemetryStore';

// PROHIBITED: emitting staleness
emit({ type: 'probe:stale', probeId, ... });

// PROHIBITED: emitting session events
emit({ type: 'session:started', ... });

// PROHIBITED: calling normalizer directly
const normalized = normalize(rawEvent);  // normalizer is called by the pipeline, not the provider

// PROHIBITED: reverse engineering
// Any code that decompiles, decrypts, or reconstructs undocumented behavior
```

---

## Approved Integration Model for ThermoWorks

```
RFX Gateway
↓ ThermaConnect open MQTT protocol (WSS)
User-managed MQTT broker (e.g. HiveMQ Cloud)
↓ mqtt.js WebSocket (browser-only, no backend)
ThermoWorksAdapter.ts (src/lib/providers/adapters/thermoworks/)
↓ RawProviderEvent { probeId, capturedAt, temperature, unit, source }
normalizeProviderEvent() → globalEventBus → TelemetryStore
[rest of pipeline]
```

Protocol: ThermaConnect (open, documented — github.com/ThermoWorks-Integrations/ThermaConnect). No proprietary SDK bundled or redistributed.

`ThermoWorksAdapter` is the **only** file that may contain ThermoWorks-specific code. The adapter boundary is the full extent of the proprietary footprint.

Before adding any ThermoWorks-specific behavior, run the 8-question filter in ADR-003. Any "yes" = stop.

---

## Commercialization Risk Escalation Triggers

The current low-risk posture depends on local-only architecture. **Stop and escalate to legal review before implementing any of the following:**

- Cloud relay or hosted telemetry infrastructure
- Multi-tenant processing of ThermoWorks data
- Subscription/SaaS features that process ThermoWorks telemetry server-side
- Redistribution of ThermoWorks SDK artifacts
- Any feature that requires ThermoWorks contractual review

Escalation means: do not implement, do not merge, raise the question explicitly before proceeding.

---

## ThermoWorks-Specific Branding Rules

When referring to ThermoWorks integration in user-facing text:

- **Use:** "PitLogic supports ThermoWorks devices"
- **Use:** "PitLogic integrates with compatible temperature providers"
- **Avoid:** "Official RFX Dashboard", "ThermoWorks Control Center", "ThermoWorks-powered"
- **Avoid:** Any name or phrase that implies PitLogic is an official ThermoWorks product

PitLogic is an independent analytics platform. ThermoWorks is a supported provider.
