# ADR-003: ThermoWorks SDK Boundaries

**Status:** Accepted
**Date:** 2026-05-18

## Context

PitLogic may integrate ThermoWorks hardware via a Software License Agreement that imposes specific constraints on how SDK/API access may be used. These constraints must be operationalized as engineering guardrails, not just legal text.

## Decision

Before implementing any ThermoWorks-related feature, run this 8-question filter. Any "yes" answer means **stop, redesign, or escalate** — do not proceed.

### 8-Question Engineering Decision Filter

1. **Does this require undocumented behavior?**
   Inferring undocumented protocol details, inspecting traffic to guess API formats, or relying on behavior not in official documentation — all prohibited.

2. **Does this involve reverse engineering?**
   Decompiling, deobfuscating, packet analysis to reconstruct logic, binary inspection, firmware extraction — all prohibited regardless of technical feasibility.

3. **Does this expose proprietary functionality?**
   Wrapping SDK methods in a public API, creating a compatibility layer other apps could use, or re-exporting SDK capabilities — prohibited.

4. **Does this redistribute proprietary components?**
   Bundling SDK binaries in npm packages, embedding SDK assets in open-source distributions, or including SDK artifacts in GitHub releases — prohibited.

5. **Does this create a substitute SDK ecosystem?**
   Building protocol clone libraries, "unofficial SDKs", or any artifact that could function as a replacement for the official SDK — prohibited.

6. **Does this increase hosting/commercialization exposure?**
   Adding cloud relay, multi-tenant telemetry infrastructure, hosted bridges, or any SaaS layer over the ThermoWorks integration — escalate to legal review before implementation.

7. **Does this blur ownership boundaries?**
   Allowing ThermoWorks-specific logic to leak into analytics, storage models, or UI in ways that would survive removing the ThermoWorks provider — violates ADR-001 and ADR-002.

8. **Does this create trademark/branding confusion?**
   Naming or positioning that implies official ThermoWorks affiliation, endorsement, or partnership — violates project branding policy.

## Approved Integration Model

```
ThermoWorks Device
↓
Official SDK / Official documented API
↓
ThermoWorksAdapter (src/lib/providers/adapters/thermoworks/)
↓ RawProviderEvent (untyped boundary)
Telemetry Normalizer
↓ NormalizedTelemetryEvent
[rest of pipeline — no ThermoWorks-specific code beyond adapter]
```

Only `src/lib/providers/adapters/thermoworks/` may contain ThermoWorks-specific code. That directory is the full extent of the proprietary footprint in this codebase.

## Current Status

`ThermoWorksAdapter` is a documented stub. No SDK is currently integrated. Implementation requires:
1. Official SDK access obtained
2. This 8-question filter passed for every feature
3. All ThermoWorks-specific code contained within `src/lib/providers/adapters/thermoworks/`

## Rationale

The filter operationalizes the license agreement's prohibitions into engineering decisions that can be applied without reading the full legal document. Each question maps to one or more contractual constraints.

## Enforcement

CLAUDE.md. Code review. The `ThermoWorksAdapter` stub is annotated with references to this ADR. Any implementation work on the adapter must explicitly pass all 8 questions in the PR description.
