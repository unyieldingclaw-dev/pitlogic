# ThermaConnect Integration — Backlog Enhancements

**Source:** Full analysis of ThermaConnect README against current codebase.
**Created:** 2026-06-30  
**Branch:** `backlog/thermoworks-enhancements`  
**Prerequisite:** `claude/thermoworks-integration-dou7k5` merged (adapater + tests for telemetry pipeline)

---

## Summary of Gaps

The current implementation covers only telemetry ingestion (`/probes/+/events`, `/devices/+/events`).
The README defines three additional topic types and a rich metadata layer we are not consuming:

| Topic | Direction | Currently handled? |
|-------|-----------|-------------------|
| `/devices/{id}/events` | Device → App | ✅ Yes |
| `/probes/{id}/events` | Probe → App | ✅ Yes |
| `/devices/{id}/state` | Device → App | ❌ No |
| `/devices/{id}/config` | App → Device | ❌ No (write direction) |

---

## ADD — New Features

### BL-01 · State topic subscription (HIGH)

**What:** Subscribe to `/devices/+/state` and parse the state object the gateway publishes on every connect.

**Why it matters:** The state message is the single richest data source from the gateway:
```json
{
  "device": "signals",
  "label": "Kitchen Smoker",
  "firmware": "v2.45",
  "wifi_strength": 85,
  "battery": "C",
  "serial": "T10061CE92E24",
  "channels": [
    { "number": 1, "highAlarm": { "alarming": false }, "lowAlarm": { "alarming": false } }
  ]
}
```
State messages arrive once per connection (gateway), not continuously. The gateway stays connected
permanently (no sleep cycle).

**What to build:**
- `ThermoWorksAdapter.ts`: subscribe to `/devices/+/state`, add `parseStatePayload()` pure fn
- New event type `RawDeviceStateEvent` (device health, not telemetry — keep separate from `RawProviderEvent`)
- `useThermoWorksProvider.js`: expose `deviceState` alongside `status`
- `SettingsSheet.jsx`: show firmware, wifi strength, battery in the Live Device section

**ADR impact:** Device state (firmware, wifi) is metadata, not telemetry. It MUST NOT flow through
`globalEventBus → TelemetryStore`. It stays in local hook state and renders in the Settings UI only.
No ADR-001 violation if done correctly.

**Files:**
- `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`
- `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`
- `src/hooks/useThermoWorksProvider.js`
- `src/components/SettingsSheet.jsx`

---

### BL-02 · RFX probe battery level (MEDIUM)

**What:** Parse battery messages from RFX probes (`{"gatewayId": "T10061CE92E24", "battery": 10}`)
and surface battery % in the Live Readings card and probe list.

**Why it matters:** Battery drain is silent without this. Users won't know a probe is about to die
mid-cook.

**What to build:**
- `ThermoWorksAdapter.ts`: detect battery payload (has `battery` key, no `channels`), emit
  a separate battery event via a dedicated callback or second subscribe channel
- `useThermoWorksProvider.js`: collect battery readings per probeId, expose `probeBatteries` map
- `DashboardTab.jsx`: show battery icon + % next to probe reading when below threshold (e.g., ≤ 20%)

**Note:** Battery messages arrive on `/probes/{probeId}/events` — same topic, different payload shape.
The topic's probeId IS the probe identifier for battery level mapping.

**Files:**
- `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`
- `src/hooks/useThermoWorksProvider.js`
- `src/components/DashboardTab.jsx`

---

### BL-03 · Device config publishing (LOW–MEDIUM, advanced)

**What:** Publish a retained config JSON to `/devices/{deviceId}/config` from the Settings UI.

**Why it matters:** This is the only way to:
- Set RFX probe `readInterval`, `heartbeatInterval`, `temperatureDeltaTrigger` (affects battery life)
- Set per-channel alarm thresholds on the hardware (complement to PitLogic software alerts)
- Set device `label` and `transmitIntervalInSeconds`

**Config shape:**
```json
{
  "label": "My Pit",
  "transmitIntervalInSeconds": 60,
  "recordingIntervalInSeconds": 60,
  "units": "F",
  "displayUnits": "F",
  "channels": [{ "number": 1, "label": "Meat Probe", "enabled": true, "alarmHigh": {...}, "alarmLow": {...} }],
  "rfxDeviceConfigs": [{ "id": "M123456789012", "temperatureDeltaTrigger": 5, "readInterval": 60, "heartbeatInterval": 3600 }]
}
```

**Important:** Config must be published as a **retained** message (`retain: true` in mqtt.js publish).
Device picks it up on next subscribe. Always send the **full** config — partial updates not supported.

**ADR-003 check:** Publishing config over the open documented MQTT protocol with user-owned credentials
passes all 8 questions (no reverse engineering, no SDK redistribution, no proprietary behavior).

**Files:**
- `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts` — add `publishConfig(deviceId, config)`
- `src/hooks/useThermoWorksProvider.js` — expose `publishDeviceConfig(deviceId, config)`
- `src/components/SettingsSheet.jsx` — "Device Config" expandable section

---

### BL-04 · Channel labels from device state (LOW)

**What:** When the state message arrives, read per-channel `label` fields and display them instead of
`ch1`, `ch2` in the Live Readings card.

**State channel example:**
```json
"channels": [{ "number": 1, "reading": { "value": 75.2, "type": "T" } }]
```
The full channel label comes from the device config, not telemetry. Requires BL-01 first (state subscription)
or BL-03 (config publishing) to have label data available.

**Files:** `src/components/DashboardTab.jsx`, `src/hooks/useThermoWorksProvider.js`

---

### BL-05 · Hardware alarm state display (LOW)

**What:** The state message carries `highAlarm.alarming` and `lowAlarm.alarming` per channel.
Show a hardware-alarm badge in the Live Readings card alongside PitLogic's own software alerts.

**Why:** Useful diagnostic — lets user know if the ThermoWorks device itself is alarming,
independent of PitLogic's alert thresholds.

**Requires:** BL-01 (state subscription).

**Files:** `src/components/DashboardTab.jsx`, `src/components/SettingsSheet.jsx`

---

## MODIFY — Improvements to Existing Code

### BL-06 · Dynamic temperature unit (MEDIUM)

**What:** `transformPayload` currently hardcodes `unit: 'F'`. The README shows the gateway can be
configured for Celsius (`"units": "C"`). RFX telemetry readings have no unit field inline —
the unit is a device-level config setting.

**Options:**
1. Keep `'F'` hardcoded and document it as an assumption (acceptable for typical US BBQ use case)
2. Read unit from state message (requires BL-01) and cache it per deviceId
3. Add optional unit override to `ThermoWorksConfig`

**Recommendation:** Option 3 is the simplest — add `unit?: 'F' | 'C'` to `ThermoWorksConfig`,
default to `'F'`, expose in Settings UI as a selector. Users who configured their gateway
for Celsius can set this to match.

**Files:**
- `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`
- `src/hooks/useThermoWorksProvider.js`
- `src/components/SettingsSheet.jsx`
- `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`

---

### BL-07 · Firmware message handling (LOW)

**What:** RFX probes emit firmware version messages: `{"gatewayId": "T10061CE92E24", "firmware": "1.1.10"}`.
Currently these arrive and are discarded (no `channels` key → transformPayload returns `[]`).

**What to do:** Capture firmware version per gatewayId, surface in SettingsSheet "Live Device" section.
Similar to battery (BL-02) — same payload structure, different key.

**Files:** Same as BL-02.

---

### BL-08 · Settings sheet: broker URL validation (MEDIUM)

**What:** Current settings form accepts any string for broker URL. Should validate:
- Starts with `wss://` or `mqtts://` (TLS required for non-local brokers)
- Warn if non-TLS (`ws://` or `mqtt://`) — acceptable for local Mosquitto test, not production
- Format: `wss://hostname:port/mqtt` for HiveMQ Cloud

**Files:** `src/components/SettingsSheet.jsx`

---

### BL-09 · Reconnect: resubscribe includes state topic (LOW)

**What:** If BL-01 is implemented, the reconnect handler in `ThermoWorksAdapter._onReconnect()`
must also resubscribe to `/devices/+/state` when `sessionPresent = false`.

**Files:** `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`

---

### BL-10 · Memory bank: update stale `activeContext.md` reference (HOUSEKEEPING)

**What:** `activeContext.md` Key Files table still says the adapter uses `sensors[]` format
and `{deviceId}-s{sensorId}` probeId. These are wrong — now `channels[]` / `{topicId}-ch{n}`.

**Files:** `memory-bank/activeContext.md`

---

## DELETE / REMOVE

Nothing to remove from current production code. The adapter is clean post-rewrite.

---

## OUT OF SCOPE (README documents these, do NOT implement)

| Feature | Reason |
|---------|--------|
| BLE device provisioning | User provisions via ThermoWorks's own tool; explicitly out of scope in spec |
| OTA firmware updates | ADR-003: redistribution of firmware is prohibited |
| Client cert MQTT auth | ThermoWorks README warns it's currently broken/unavailable on NODE |
| Self-hosted broker setup | User manages their own broker; PitLogic is client-only |
| Google IoT Core legacy BLE characteristics | Deprecated, shutdown, irrelevant |
| Multi-tenant / SaaS relay | Commercialization boundary — legal review required before any such change |
| Billows fan controller | Out of scope for BBQ temperature logging use case |

---

## Implementation Priority Order

1. BL-10 (housekeeping — 5 min, do now)
2. BL-06 (unit config — unblocks correctness for Celsius users, easy)
3. BL-08 (settings validation — UX win, easy)
4. BL-01 (state subscription — unlocks BL-04, BL-05, BL-07)
5. BL-02 (battery level — high user value, cook-safety feature)
6. BL-03 (config publishing — most complex, most powerful)
7. BL-04, BL-05, BL-07 (dependent on BL-01)
8. BL-09 (dependent on BL-01)
