# Broker Reconnect Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show truthful MQTT interruption and recovery state in Settings.

**Architecture:** The adapter owns MQTT lifecycle events and exposes a connection-state subscription. The existing hook bridges that state into React; Settings renders it alongside the independent probe freshness display.

**Tech Stack:** TypeScript adapter, React hook and JSX, Vitest, local MQTT/Chrome fixture.

**Spec:** `docs/specs/2026-10-29-broker-reconnect-status.md`

## Global Constraints

- Keep ThermoWorks transport logic inside `src/lib/providers/adapters/thermoworks/`.
- Keep probe freshness derivation in `TelemetryStore` and preserve existing cook data.
- Use no new dependency or production broker topic.

## Review Focus

- A transport closes while a probe is fresh: broker status must change immediately.
- A reconnect occurs with `sessionPresent` false: Connected waits until subscription recovery completes.
- Subscription recovery rejects: Connected must not appear.
- A user presses Disconnect during retry: late MQTT events cannot restore Connected.
- A listener unsubscribes or the hook unmounts: no later state update occurs.

### Task 1: Adapter lifecycle

**Files:** Modify `src/lib/providers/adapters/thermoworks/ThermoWorksAdapter.ts`; test `src/lib/providers/adapters/thermoworks/__tests__/ThermoWorksAdapter.test.ts`.

**Interface:** `subscribeConnectionState(handler: (state: 'connected' | 'reconnecting') => void): () => void`.

- [x] Write tests for initial Connected, offline/close/reconnect, recovery after subscription, failed recovery, and unsubscribe/disconnect cleanup.
- [x] Run focused tests and confirm failures from absent lifecycle reporting.
- [x] Implement the adapter subscription and MQTT event forwarding; emit Connected after subscriptions succeed.
- [x] Rerun focused tests and confirm they pass.

### Task 2: Hook and Settings

**Files:** Modify `src/hooks/useThermoWorksProvider.js` and `src/components/SettingsSheet.jsx`; test `src/hooks/__tests__/useThermoWorksProvider.test.js` and `src/components/__tests__/SettingsSheet.test.jsx`.

- [x] Write tests for Reconnecting and Connected transitions, manual disconnect cleanup, and Settings text/button state.
- [x] Run focused tests and confirm failures.
- [x] Subscribe in the hook, clean up on manual disconnect/unmount, and render Reconnecting with Disconnect available.
- [x] Rerun focused tests, then run the full suite, build, changed-file lint, and controlled local broker fixture.
- [x] Review the diff for simplicity and security; commit this isolated branch.
