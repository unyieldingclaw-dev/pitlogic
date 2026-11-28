# RFX/MQTT telemetry and data integrity

**2026-10-28 follow-up:** QA-001/002 fixes are locally integrated at `1b4253c` and passed 326 tests plus a build. A controlled local MQTT 3.1.1 WebSocket fixture [reproduced QA-005](evidence/controlled-broker-qa005.json): Settings remained `● Connected` for a 37-second broker outage while the last 182°F reading became `Stale · 34s ago`; a new 190°F reading arrived after recovery. The fixture used synthetic topics and credentials, with one subscription packet on each accepted connection and no page errors. The original audit tables below describe the pre-fix `c7b3674` baseline. Cloud broker, RFX hardware, ACLs, and sustained-session behavior remain untested.

**2026-10-29 follow-up:** The QA-005 correction on isolated branch `codex/broker-reconnect-status` (`1fad7a5`) passed a [rerun of the controlled local scenario](evidence/controlled-broker-qa005-after-fix.json). Settings reported `○ Reconnecting…` during the 37-second outage and `● Connected` after a subscribed recovery; the 182°F probe became stale before a fresh 190°F reading arrived. The fixture recorded one subscription packet per accepted connection and no page errors. The branch passed 336 tests and a build; it is not merged or deployed. Cloud broker, hardware, ACL, and long-cook behavior remain unverified.

**2026-10-30 follow-up:** The QA-005 commits are locally integrated at `1fad7a5`; the combined checkout passed 336 tests and a production build. No push or deployment occurred. Cloud broker, RFX hardware, ACL, and sustained-session behavior remain unverified.

## Verified data path

1. [ThermoWorksAdapter.ts](../../src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts) subscribes to `/probes/+/events`, `/devices/+/events`, `/devices/+/state`, and `/devices/+/config` after MQTT connection. Temperature messages are parsed from `channels[]`; only `type: 'T'`, numeric values, and millisecond integer timestamps from `1e10` through `now + 60 s` become raw events. Malformed JSON is ignored with a topic-only warning. The adapter is also responsible for retained device configuration publication, which was **not** invoked here.
2. [useThermoWorksProvider.js](../../src/hooks/useThermoWorksProvider.js) reads local broker config, subscribes to adapter events, calls [normalizeProviderEvent](../../src/lib/telemetry/normalization/normalize.ts), and publishes to the global event bus. The normalizer uses Zod and converts Celsius to canonical Fahrenheit.
3. [TelemetryStore.ts](../../src/lib/telemetry/store/TelemetryStore.ts) keeps the latest reading and connectivity state per probe in memory. A five-second interval marks an active reading stale after 30 seconds based on `capturedAt`. [useLiveProbes.js](../../src/hooks/useLiveProbes.js) clones the map for React. The Dashboard and Settings render it differently.
4. Manual cook data follows [App.jsx](../../src/App.jsx) → [useStorage.js](../../src/hooks/useStorage.js) → `pitlogic-v5` localStorage. Live telemetry does **not** call this persistence path. `SessionStore` and `LocalStorageAdapter` exist in the library but are not instantiated by the app; no automatic live-probe-to-cook association was found. This is a verified capability boundary, not evidence of corrupted cook history.

## Controlled results

The browser tests injected normalized synthetic events into the local event bus. They never connected to a real broker or production topic. [Browser results](evidence/browser-results.json) and [script](evidence/browser-audit.mjs) provide the values and steps.

| Scenario | Result | Evidence/limit |
| --- | --- | --- |
| Valid reading | 177.3°F appeared in the store and Dashboard | `telemetry.injectedStore/initialCard`; normalized injection, not MQTT ingress |
| Missing fields / malformed JSON | Adapter and normalizer unit tests passed within 313-test suite | No end-to-end broker event run |
| Duplicate events | Event bus/store have no timestamp/id deduplication; same event would notify again | Code-reviewed; effect in live broker not tested |
| Out-of-order events | **Fail:** 182°F at T followed by 160°F at T−20 s left 160°F as latest and on Dashboard; the independent challenge repeated this through the app's actual module instance | QA-002, [adversarial results](evidence/adversarial-results.json) |
| Delayed telemetry | 31-second-old reading became stale after sweep | Store status verified through Settings text |
| Freshness presentation | **Fail:** The only probe was already 31 s old but entered as `active` until the next sweep. Dashboard kept green “Live Readings” and no stale text afterward; Settings showed `(stale)`, then dropped the suffix on disconnect while retaining the last value | QA-001, [adversarial results](evidence/adversarial-results.json), [screenshot](evidence/stale-live-1440x900.png) |
| Unexpected units | Normalizer unit tests cover C→F. Adapter defaults to F when no matching unit cache/config | No gateway/probe identity integration test; see unit-mapping risk below |
| Rapid changes | Latest map updates per event | High-rate latency and event accumulation not measured |
| Multiple probes | Adapter and mock provider unit tests cover multiple channels/probes | Real simultaneous hardware not tested |
| Active cook during live event | Store gained synthetic probe; persisted cook remained at one manual reading; active view had no live card | `telemetry.activeCookLive` |
| Session end during live event | Not run | No live session association found |
| Device/probe disconnect and reconnect | Store unit tests cover explicit `probe:disconnected` then reading | Broker/device lifecycle not run |
| Broker outage / internet loss / ingestion interruption | **Blocked** | No controlled broker or credentials; adapter status propagation gap QA-005 source-reviewed |
| Retained/out-of-order replay on reconnect | **Broker test blocked**; synthetic 40-second-old event after explicit disconnect immediately restored `active` and replaced the value | [adversarial results](evidence/adversarial-results.json); actual MQTT retained delivery untested |
| Historical data consistency | Manual 155°F probe and 225°F smoker values survived refresh and completion in `pitlogic-v5` | `workflow.logged/reloaded/ended`; live history persistence unsupported |
| Extended no-reading interval | One stale sweep verified after 31 s | No real 30-minute to 12-hour idle/reconnect run |

## Findings and unresolved questions

- **QA-001 / QA-002 are confirmed P1s.** `applyActiveReading` does not compare `capturedAt` with the current value or derive stale state on arrival. The Dashboard header dot is always green when the live card exists, and Settings only adds text for `stale`, not `disconnected`. An old synthetic replay after disconnect reactivated the probe until the next stale sweep. Actual MQTT retained delivery remains untested.
- **QA-005 is a P1 integration concern, not a proven outage reproduction.** The adapter listens for MQTT `connect` to resubscribe, while UI status is only changed after initial connect, explicit disconnect, or initial error. `offline`, `close`, and `reconnect` are not forwarded to Settings. No reconnect count, recovery time, or backoff bound was measured; defaults of MQTT.js were not assumed.
- **Potential unit association risk:** Gateway units are cached under `/devices/{gatewayId}/state`, but `/probes/{probeId}/events` lookup passes the probe-topic ID to `getUnitsForGateway`. If those IDs differ and broker config says/defaults F while the gateway emits C, conversion may be wrong. A controlled fixture with distinct gateway and probe IDs, and real protocol confirmation, is required before calling this a confirmed defect.
- **Identity and topic authorization:** The adapter takes probe identity from the MQTT topic, not payload. That is helpful against payload spoofing, but broker ACLs and topic isolation were not available to inspect. The wildcard subscriptions rely on broker-side authorization. Do not run test payloads on production topics.
- **Persistence boundary:** There is no replay-safe historical telemetry stream in the app. `TelemetryStore` holds one current reading per probe; manual/CSV cook records are separately persisted. The release owner should explicitly decide whether live values must be associated with a cook and retained in history before release. If required, define identity, time ordering, session boundary, and duplicate semantics first.

## Next controlled telemetry gate

Use a local, isolated MQTT broker with deterministic `/devices/qa-gw/state` and `/probes/qa-probe/events` fixtures, including C/F and distinct IDs. Publish valid, missing, malformed, duplicate, delayed, out-of-order, retained, disconnect/reconnect, multiple probe, and post-session-end cases. Record source timestamps, UI text/status, localStorage changes, message counts, and reconnection timing. Never use production cook history or broker topics.
