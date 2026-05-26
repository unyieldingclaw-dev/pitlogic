# ADR-001: Provider Firewall

**Status:** Accepted
**Date:** 2026-05-18

## Context

PitLogic may integrate ThermoWorks hardware via an officially licensed SDK governed by a Software License Agreement that requires clear separation between proprietary provider code and core analytics. The agreement prohibits reverse engineering, redistribution, and derivative SDK work.

Architecturally, allowing provider logic to leak into analytics or UI creates vendor entanglement that is difficult to reverse and increases contractual risk surface area over time.

## Decision

The analytics engine and all UI components **MUST NOT** import from `src/lib/providers/` or `src/lib/telemetry/eventBus/` directly. All provider communication crosses the domain boundary as materialized state from `TelemetryStore` only.

```
ALLOWED:   UI → TelemetryStore (reads materialized ProbeState, CookSession)
ALLOWED:   Analytics → TelemetryStore (reads probe timelines, session data)
FORBIDDEN: UI → providers/
FORBIDDEN: UI → telemetry/eventBus/
FORBIDDEN: Analytics → providers/
FORBIDDEN: Analytics → telemetry/eventBus/
```

The `TelemetryStore` is the only sanctioned crossing point from the provider pipeline into application domain code.

## Rationale

- **Vendor containment**: Provider-specific logic cannot contaminate analytics or UI regardless of what the provider emits.
- **Contractual risk isolation**: SDK agreement obligations are scoped to `src/lib/providers/`. A compliance issue in the provider cannot propagate to independently open-sourceable code.
- **Portability**: Swapping or removing a provider (ThermoWorks → another vendor, or stub → real SDK) requires no changes outside `src/lib/providers/`.
- **Testability**: Analytics and UI can be tested against any `ProbeState` without a provider present.

## Enforcement

**PR review**: Any import of `src/lib/providers/` or `src/lib/telemetry/eventBus/` from outside `src/lib/` is grounds to reject the PR.

**Future**: ESLint `import/no-restricted-paths` or `dependency-cruiser` rules to automate detection.

## Consequences

- The `TelemetryStore` interface must be expressive enough that consumers never need direct provider access.
- `SessionStore` lifecycle events (`SessionStartedEvent`, `SessionEndedEvent`) are also mediated through the Store, not emitted directly into UI.
