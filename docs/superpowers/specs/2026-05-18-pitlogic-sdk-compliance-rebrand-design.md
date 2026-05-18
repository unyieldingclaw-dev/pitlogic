# Design Spec: PitLogic — SDK Compliance, Rebrand & Telemetry Architecture

**Date:** 2026-05-18
**Status:** Approved
**Branch:** `claude/frosty-hellman-9c2f1d`

---

## Overview

This spec delivers three interlocked workstreams as a single compliance + identity milestone:

1. **Full rebrand** — rename the project from "RFX Cook Tracker" to "PitLogic" across all surfaces
2. **Telemetry architecture** — introduce a vendor-agnostic provider abstraction layer that structurally enforces the contractual boundary between proprietary SDK code and core application logic
3. **Compliance codification** — embed SDK agreement constraints as ADRs, guardrail docs, and CLAUDE.md rules enforced in every future session

---

## Core Architectural Principle

PitLogic is an independent cook analytics platform. ThermoWorks is an integration provider, not the project identity.

**Architectural invariant (appears verbatim in ADRs and CLAUDE.md):**
> The analytics engine and all UI components MUST NOT import from `src/lib/providers/` or `src/lib/telemetry/eventBus/` directly. All provider communication crosses the domain boundary as materialized state from TelemetryStore only.

---

## Data Flow Pipeline

```
ThermoWorksAdapter (stub) | CsvAdapter | MockAdapter
         ↓ RawProviderEvent (untyped at boundary)
Telemetry Normalizer  ← Zod validation
         ↓ NormalizedTelemetryEvent (typed)
EventBus  (transport buffering only — dumb pipe)
         ↓ domain events
Telemetry Store / Session Store  ← authoritative state
         ↓ materialized ProbeState, CookSession
Cook Analytics Engine  (existing analytics.js — zero provider imports)
         ↓ view models
UI / Components  (existing JSX — unchanged)
```

---

## Semantic Authority Hierarchy (ADR-002)

| Layer | Authority |
|---|---|
| Provider adapters | Ingress events only |
| Normalizer | Validity + canonical representation |
| Store | State, timelines, derived status (stale, reconnect, session lifecycle) |
| Analytics | Interpretation + prediction |
| UI | Presentation + interaction state |

No layer claims authority outside its boundary. Session lifecycle is owned by Store — providers MUST NOT infer, create, or terminate sessions.

---

## Domain Contracts

### Timestamp Semantics

```ts
interface TelemetryTimestamp {
  capturedAt:   number;  // device/provider observation — authoritative cook timeline
  receivedAt:   number;  // adapter ingress
  normalizedAt: number;  // normalization completion
  persistedAt?: number;  // optional store commit
}
```

### NormalizedReading — Discriminated Union

```ts
interface BaseReading {
  probeId:   string;
  source:    ReadingSource;
  timestamp: TelemetryTimestamp;
}

interface ActiveReading extends BaseReading {
  status: 'active';
  temp:   NormalizedTemperature;  // never null
}

interface DisconnectedReading extends BaseReading {
  status: 'disconnected';  // provider-emitted explicit disconnect
  // no temp field
}

type NormalizedReading = ActiveReading | DisconnectedReading;
// AbsentReading removed — occupancy is ProbeState inventory metadata, not telemetry

interface NormalizedTemperature {
  valueF:        number;          // canonical internal storage
  providerUnit:  'F' | 'C';
  providerValue: number;
  normalizedBy:  'provider' | 'normalizer';
}

type ReadingSource = 'live' | 'csv-import' | 'manual' | 'replay' | 'synthetic';
```

### ProbeState

```ts
interface ProbeState {
  probeId:     string;
  label:       string;
  occupancy:   'occupied' | 'empty';        // inventory/config — not telemetry
  status:      'active' | 'disconnected' | 'stale';  // derived by Store
  lastReading: ActiveReading | null;
  targetTemp:  number | null;
}
// status is derived: occupancy='empty' → no status; Store computes stale from capturedAt delta
```

### Event Taxonomy

```ts
// Provider lifecycle
ProviderConnectedEvent    { type: 'provider:connected';    providerId; timestamp }
ProviderDisconnectedEvent { type: 'provider:disconnected'; providerId; timestamp }
ProviderErrorEvent        { type: 'provider:error';        providerId; error; timestamp }

// Probe events
ProbeReadingEvent         { type: 'probe:reading';      reading: ActiveReading }
ProbeDisconnectedEvent    { type: 'probe:disconnected'; reading: DisconnectedReading }
// ProbeReconnectedEvent removed — Store derives reconnect when disconnected probe emits ActiveReading

// Session events (owned by Store, not providers)
SessionStartedEvent       { type: 'session:started'; sessionId; timestamp }
SessionEndedEvent         { type: 'session:ended';   sessionId; timestamp }

// Error/observability
ProbeErrorEvent            { type: 'probe:error';               probeId; error; timestamp }
NormalizationRejectedEvent { type: 'normalization:rejected';    payload: RejectedPayloadMetadata; timestamp }

type NormalizedTelemetryEvent = 
  | ProviderConnectedEvent | ProviderDisconnectedEvent | ProviderErrorEvent
  | ProbeReadingEvent | ProbeDisconnectedEvent
  | SessionStartedEvent | SessionEndedEvent
  | ProbeErrorEvent | NormalizationRejectedEvent;

interface RejectedPayloadMetadata {
  providerId:        string;
  eventType?:        string;
  receivedAt:        number;
  payloadHash?:      string;
  truncatedPayload?: unknown;  // optional, bounded — not a full data dump
}
```

### Normalization Invariants

```
- All temperatures stored as °F (canonical). displayUnitPreference lives in user prefs.
- All timestamps are epoch milliseconds.
- capturedAt is the authoritative cook timeline.
- Providers SHOULD emit readings in chronological capturedAt order when possible.
- Normalizer, Store, and analytics MUST tolerate limited out-of-order events.
- Deduplication is normalization-layer concern, applied per provider context.
  No universal duplicate rule assumed globally.
- Stale status is Store-derived from capturedAt delta. Providers MUST NOT emit it.
- Disconnected probes SHOULD emit ProbeDisconnectedEvent when transport semantics support it.
  (CSV/import/replay sources are exempt from explicit disconnect events.)
- Malformed ingress always produces NormalizationRejectedEvent — never silent drop.
- Providers MAY manage transport-level reconnection. MUST NOT persist, mutate domain state,
  or bypass normalization.
```

### Provider Responsibility Boundary

```
MUST:     connect to source, ingest raw data, emit RawProviderEvent,
          manage transport-level reconnection
MUST NOT: persist telemetry, mutate domain state, bypass normalization,
          contain analytics, access UI state, emit staleness judgments,
          infer or create sessions, deduplicate domain events,
          buffer beyond transport-level dispatch
```

### Buffering Distinction

| Type | Where | Scope |
|---|---|---|
| Transport buffering | EventBus | Short-lived async fanout/dispatch queues |
| Persistence buffering | Store / TelemetryPersistenceAdapter | Offline replay, recovery, long-lived |

### Persistence Abstraction

```ts
interface TelemetryPersistenceAdapter {
  read(key: string): unknown;
  write(key: string, value: unknown): void;
  delete(key: string): void;
}
// LocalStorageAdapter today. IndexedDbAdapter later.
```

### Provider Interface

```ts
interface TemperatureProvider {
  readonly id: string;
  connect(): Promise<void>;
  subscribe(handler: (event: RawProviderEvent) => void): () => void;
  disconnect(): Promise<void>;
}

type RawProviderEvent = Record<string, unknown>;
```

---

## Directory Structure

```
src/lib/
├── migrations/
│   ├── MigrationRunner.ts                   ← idempotent runner
│   ├── types.ts                             ← MigrationRecord, MigrationResult
│   ├── storage/
│   │   └── LocalStorageMigrationRunner.ts
│   └── versions/
│       └── v1-rfx-key-rename.ts             ← rfx-v5→pitlogic-v5 etc.
│
├── providers/
│   ├── core/
│   │   ├── TemperatureProvider.ts           ← interface: connect/subscribe/disconnect
│   │   ├── ProviderRegistry.ts              ← register/resolve by id
│   │   └── ProviderTypes.ts                 ← RawProviderEvent = Record<string, unknown>
│   ├── adapters/
│   │   ├── csv/
│   │   │   ├── CsvProvider.ts               ← TemperatureProvider impl (wraps existing CSV)
│   │   │   └── csvSchemas.ts                ← Zod schemas for CSV row validation
│   │   ├── thermoworks/
│   │   │   ├── ThermoWorksAdapter.ts        ← STUB — documented, no SDK
│   │   │   └── README.md                    ← compliance notices, prohibited patterns
│   │   └── mock/
│   │       └── MockProvider.ts              ← deterministic synthetic telemetry for tests
│   └── testing/
│       ├── fakeTelemetry.ts
│       └── providerFixtures.ts
│
├── telemetry/
│   ├── domain/
│   │   ├── TelemetryModels.ts               ← NormalizedReading discriminated union
│   │   ├── TelemetryEvents.ts               ← NormalizedTelemetryEvent taxonomy
│   │   ├── TimestampSemantics.ts            ← TelemetryTimestamp (4 fields)
│   │   ├── ProbeSemantics.ts                ← ProbeState (derived status, occupancy)
│   │   ├── SessionModels.ts                 ← CookSession, session authority
│   │   └── RejectedPayload.ts               ← RejectedPayloadMetadata
│   ├── normalization/
│   │   ├── normalize.ts                     ← Zod validation → NormalizedTelemetryEvent
│   │   ├── schemas.ts                       ← Zod schemas
│   │   └── temperatureUtils.ts              ← unit conversion + normalizedBy tracking
│   ├── eventBus/
│   │   ├── EventBus.ts                      ← typed pub/sub, transport buffering only
│   │   └── types.ts
│   ├── store/
│   │   ├── TelemetryStore.ts                ← authoritative state, derives stale/reconnect
│   │   ├── SessionStore.ts                  ← owns session lifecycle
│   │   └── StoreTypes.ts
│   ├── persistence/
│   │   ├── TelemetryPersistenceAdapter.ts   ← interface
│   │   └── LocalStorageAdapter.ts           ← pitlogic-v5 keys via useStorage
│   └── buffering/
│       └── TransportBuffer.ts               ← EventBus async fanout queue
│
└── compliance/
    ├── ADR-001-provider-firewall.md
    ├── ADR-002-semantic-authority.md
    ├── ADR-003-sdk-boundaries.md
    ├── ADR-004-telemetry-semantics.md
    └── providerGuardrails.md
```

---

## localStorage Key Migration

One-time idempotent migration at app startup (`src/main.jsx` before React renders):

| Old Key | New Key |
|---|---|
| `rfx-v5` | `pitlogic-v5` |
| `rfx-recipes-v1` | `pitlogic-recipes-v1` |
| `rfx-prefs-v1` | `pitlogic-prefs-v1` |

Migration state tracked in `pitlogic-migrations-v1`. Never overwrites newer data.

**6 regression test cases:**
1. Fresh install (no old keys, no new keys) — no-op, marks complete
2. Successful migration (old keys present) — migrates correctly
3. Corrupted legacy data (invalid JSON) — skips, logs error, does not block app startup
4. Partially migrated state (one key done, one not) — resumes safely
5. Duplicate execution (runner called twice) — idempotent, no double-write
6. New key already exists — keeps new data, does not overwrite

---

## Rebrand Surface Area

| File | Change |
|---|---|
| `package.json` | `name: "rfx-cook-tracker"` → `"pitlogic"` |
| `public/manifest.json` | `name`, `short_name`, `start_url` |
| `public/sw.js` | Cache version key |
| `index.html` | `<title>` |
| `src/App.jsx` | Logo text "RFX" → "PitLogic" (3 places) |
| `src/components/ShareCard.jsx` | "RFX" logo text |
| `src/hooks/useMopTimer.js` | Notification text |
| `src/components/SettingsSheet.jsx` | Export filename |
| `src/utils/shareCard.js` | Download filename |
| `src/components/GuideTab.jsx` | "RFX graph", "RFX probe placement" |
| `src/data/cuts.js` | "RFX alert" ×8 |
| `README.md` | Project name, description, URLs |
| `memory-bank/` | All RFX refs |

**Branding language:** "PitLogic supports ThermoWorks devices" / "PitLogic integrates with compatible temperature providers"

**Avoid:** "Official RFX Dashboard", "ThermoWorks Control Center", "RFX PitLogic"

---

## Compliance Architecture

Four ADRs with governance language:

- **ADR-001 — Provider Firewall**: Analytics and UI MUST NOT import from `src/lib/providers/` or eventBus. Violation is grounds to reject a PR.
- **ADR-002 — Semantic Authority**: Five-layer authority hierarchy. Session lifecycle owned by Store exclusively.
- **ADR-003 — SDK Boundaries**: 8-question engineering decision filter. Any "yes" = stop + escalate before implementation.
- **ADR-004 — Canonical Telemetry Semantics**: Single reference for all telemetry semantic rules. Covers timestamp authority, stale derivation, disconnect semantics, unit normalization, replay behavior, and event schema versioning note.

**`providerGuardrails.md`**: MUST/MUST NOT rules for provider adapters, prohibited patterns list, approved integration model, commercialization risk escalation triggers.

**Schema versioning note** (in ADR-004): A `schemaVersion` field SHOULD be added to persisted events before any replay/migration feature ships. Telemetry contracts are not assumed stable.

---

## Verification Checklist

1. `npm test` — all existing tests green + new lib/ tests pass
2. `npm run build` — clean build, no TypeScript errors in lib/
3. Manual: fresh browser, import ThermoWorks CSV → data flows through new pipeline into dashboard
4. Manual: check localStorage — keys are `pitlogic-v5`, `pitlogic-recipes-v1`, `pitlogic-prefs-v1`
5. Manual: `pitlogic-migrations-v1` key exists with `v1-rfx-key-rename` in completed[]
6. Manual: reopen app — migration does not run again (idempotent)
7. Visual: app shows "PitLogic" branding everywhere, no "RFX" visible in UI
8. Grep check: `grep -r "rfx" src/ --include="*.js" --include="*.jsx" --include="*.ts"` returns zero hits in non-migration code

---

## Implementation Phases

| Phase | Description | Risk |
|---|---|---|
| 0 | This spec doc | None |
| 1 | Compliance ADRs + CLAUDE.md + memory-bank | None (docs only) |
| 2 | TypeScript/Zod setup | Low (build config) |
| 3 | Migration system + tests | Medium (touches storage keys) |
| 4 | Full rebrand | Low-medium (mechanical, high surface area) |
| 5–9 | src/lib/ domain types → normalizer → EventBus → Store → providers | Medium |
| 10 | Wire + verify CSV end-to-end | Medium |
| 11 | Tests for new lib/ code | Low |
| 12 | Memory/docs cleanup | None |
