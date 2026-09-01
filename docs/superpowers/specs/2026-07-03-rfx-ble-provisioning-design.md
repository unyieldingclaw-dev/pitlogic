# BLE Provisioning Wizard — Design

**Date:** 2026-07-03
**Status:** Approved, pending implementation plan

## Problem

RFX/NODE devices are provisioned (Wi-Fi + MQTT credentials) over Bluetooth Low Energy while in the device's SETUPMODE. No UI exists in PitLogic for this today — a user would need a separate tool or manual BLE interaction to set up a new device.

## Platform Constraint

Provisioning over BLE from a browser requires the Web Bluetooth API (`navigator.bluetooth`). **This is not supported on iOS Safari** (or any iOS browser, since all iOS browsers use WebKit) — only Chrome/Edge on desktop and Android support it. This caps who can use an in-app wizard.

**Decision: build the wizard, gate it by platform.** `SettingsSheet.jsx` feature-detects `navigator.bluetooth` before showing the entry point. On unsupported browsers, static text points to manual/3rd-party provisioning instead.

## Design

### New module

`src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts` — confined to the ThermoWorks adapter directory per ADR-003. This is a one-shot write flow, not a data stream, so it does not implement `TemperatureProvider`. It wraps the Web Bluetooth API directly — a standard browser API, not a ThermoWorks SDK dependency.

### Flow (single screen, not a multi-step wizard)

Decoupled two independent decisions during design: screen-flow shape (single form vs. stepper) and SSID entry method (typed vs. scanned). The stepper doesn't earn its complexity for a one-time setup screen; the SSID scan does, because a manual-entry fallback is required regardless (hidden/non-broadcasting networks never show up in a scan), so adding scan-assist doesn't introduce a separate code path — it just fills the same field a different way.

1. `navigator.bluetooth.requestDevice()` filtered by device name "NODE" or company ID `0x0B11` — triggers the browser's native device picker.
2. Connect to the GATT server. Read Device Information Service (model number, serial number, firmware revision) and Battery Service (battery level). Display as a confirmation card: "Connected to NODE · Serial T10061CE92E24 · Firmware v2.45 · Battery 87%".
3. Single form:
   - **WiFi SSID** — text field, plus a "Scan for networks" button. Scanning writes `SCAN` to the Commands characteristic (`00010874-...`), subscribes to its notify, and collects `AUTHMODE,RSSI,SSID` CSV-formatted results for ~5 seconds, populating a dropdown. Manual typing is always available and is the only option for hidden networks.
   - **WiFi Password** — text field.
   - **MQTT Broker URL, Port, Username, Password** — pre-filled from whatever is already saved in Settings' existing Live Device MQTT config, editable.
4. "Provision Device" writes every required field in one pass, per the SDK's rule to always send all fields on provisioning (so no stale values persist from a previous setup):
   - Wifi SSID (`00010174-...`), Wifi Password (`00010274-...`)
   - MQTT Broker URL (`00010D74-...`), MQTT Broker Port (`00010E74-...`), MQTT Username (`00010F74-...`), MQTT Password (`00011074-...`)
   - MQTT CA Cert (`00011174-...`), MQTT Client Cert (`00011274-...`), MQTT Client Key (`00011374-...`) — always written as **empty strings**. PitLogic does not support cert-based MQTT auth elsewhere and does not introduce it here.
5. Writes `CONNECT_START` to the Commands characteristic to trigger the device's connection attempt.
6. Subscribes to WiFi Connection Status/Error (`00010474-...` / `00010574-...`) and MQTT Connection Status/Error (`00010674-...` / `00010774-...`) notify characteristics. Renders a live log:
   - "Connecting to WiFi..." → "Connected ✓" or an error message mapped from the documented codes (e.g. `12298` → "WiFi network not found", `12299` → "WiFi password rejected", `12300` → "Connection timed out")
   - "Connecting to MQTT..." → "Connected ✓" or a mapped error (`1` → "Broker unreachable", `2` → "Broker refused connection", `3` → "Subscription failed")
7. On success: disconnects BLE, shows "Device provisioned!", and prompts for a friendly device label — feeding into the channel-label editing from the device-health and bidirectional-config designs.

## Files Touched

- New: `src/lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.ts`
- New: `src/components/BleProvisioningWizard.jsx`
- `src/components/SettingsSheet.jsx` — entry point button, platform gate, unsupported-browser messaging

## Compliance

ADR-003 8-question filter: all "no". This uses the standard, documented BLE GATT characteristics via the browser's native Web Bluetooth API — no reverse engineering, no decompilation, no proprietary SDK, no hosting/relay infrastructure. All BLE provisioning logic is confined to the one new file inside the ThermoWorks adapter directory.

## Out of Scope

- Multi-step wizard navigation (rejected — unnecessary for a one-time setup screen)
- OTA firmware updates (separate, larger protocol — not part of this spec)
- Certificate-based MQTT authentication (CA/client cert/key are always sent empty)
- Support for provisioning on iOS Safari or other browsers without Web Bluetooth
