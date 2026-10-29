# Broker reconnect status

QA-005: During a controlled 37-second MQTT transport outage, Settings continued to say Connected. Probe age later became Stale and a fresh reading arrived after reconnect. The user needs broker status to reflect the transport separately from probe freshness.

## Behavior

- After the initial subscription succeeds, Settings says Connected.
- On MQTT offline, close, or reconnect, Settings promptly says Reconnecting and keeps Disconnect available.
- After a recovered connection has restored subscriptions, Settings says Connected again.
- A manual disconnect says Disconnected and cannot be reversed by a late client event.
- Last probe values continue to use the existing per-probe Live/Stale/Disconnected age display; broker state does not manufacture probe readings.

## Design

The ThermoWorks adapter exposes a small connection-state subscription. It forwards MQTT lifecycle events and reports Connected only after initial or recovered subscriptions are ready. The existing hook translates that state into its `status` prop; Settings renders the additional Reconnecting state. No new package or state store is needed.

The adapter boundary is chosen over reading MQTT directly in React. Inferring broker state from probe age would confuse a quiet but healthy probe with a broken transport. Reconnect subscription failure must leave the UI out of Connected. Tests cover transition order, cleanup, and the controlled local broker scenario.

## Verification and limits

Run focused adapter/hook/Settings tests, the full suite, build, changed-file lint, and the local synthetic MQTT/Chrome outage fixture. Cloud broker behavior, hardware, ACLs, and long cook sessions remain separate release checks.
