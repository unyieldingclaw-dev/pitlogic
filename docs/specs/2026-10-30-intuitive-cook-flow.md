# PitLogic cooking flow — draft for review

Status: user approved the equal-manual/RFX flow and navigation on 2026-10-31, then approved revising implementation into two separately reviewed stages after adversarial findings. Active review targets are [plan revision 2](../superpowers/plans/2026-10-31-intuitive-cook-flow-v2.md) and [storage revision 2](2026-10-31-cook-recording-storage-v2.md). Revision work is authorized; implementation and the storage-rule exception are not yet approved.

## Intent

The user wants PitLogic to be friendly and intuitive, avoiding the confusion they experience in ThermoWorks' own app. ThermoWorks' app has not been inspected in this review. This proposal is based on PitLogic source and a local Chrome walkthrough at 390×844, using synthetic browser storage and no hardware.

Keep the existing React app, brand, theme, local storage, and provider boundaries. Every main screen should answer: what is happening, what should I do next, and are these readings current and recorded?

Confirmed user decision: **support RFX recording and manual entry equally**. Neither mode is a prerequisite for the other. A manual cook must work without a gateway, broker credentials, or a device setup step.

## Current friction, verified in PitLogic

1. **Device discovery is hidden.** Empty Home shows three empty statistics and Start New Cook, but no route to connect probes. Setup is inside a long Settings sheet after defaults and appearance.
2. **Two setup actions look unrelated.** Settings offers Set Up New Device and Live Device. Bluetooth provisioning configures the hardware; connecting PitLogic to its broker is a second step. The provisioning success screen sends the user back to Settings rather than guiding the next step.
3. **Save and Connect are separate and misleading.** Settings keeps edited broker values in component state; Connect calls a hook that reads previously saved local storage. Filling fields and pressing Connect without Save can therefore use missing or old values. Advanced transport and clipboard controls compete with the main action.
4. **Starting a cook is interrupted by reference material.** The mobile form places pellet recommendations and cook stages before probe setup and the Start Cook button. In the walkthrough, Start Cook began at y=1284 in an 844px viewport, with six input/select fields and additional toggles/actions above it.
5. **Live monitoring and cook records are separate.** App passes live probes to Dashboard; ActiveTab's readings, charts, and alerts derive from saved cook data. Manual Log Reading and CSV import update that data. The current path does not associate incoming live readings with the active cook or persist their history. A friendly-looking recording indicator must not conceal this boundary.
6. **The main labels vary across surfaces.** Dashboard/Home, Analytics/Stats, and New Cook/Cook make navigation harder to learn. Six mobile destinations give guides and recipes the same prominence as the immediate cooking task.

Evidence: [walkthrough data](../qa/evidence/ux-flow-walkthrough.json), [Home](../qa/evidence/ux-home-390.png), [device setup](../qa/evidence/ux-device-390.png), [new cook](../qa/evidence/ux-new-cook-390.png), [active cook](../qa/evidence/ux-active-cook-390.png).

## Approaches considered

| Approach | Benefit | Limitation |
| --- | --- | --- |
| Labels and help text only | Small, quick improvement | Leaves hidden setup and the live/cook data split |
| Guided setup and task-focused screens | Makes each next action visible with limited structural change | Must clearly disclose current logging mode until live recording exists |
| One connected cooking journey | Connect probes, choose which belong to the cook, record, monitor, finish | Requires explicit session association and reliable persisted telemetry, beyond a layout change |

Recommendation: adopt one cooking journey with two equally prominent reading-source paths, delivered through separate reviewable increments. Manual cooks retain their direct start. RFX cooks require verified incoming readings and an explicit probe association before recording. Implement data/session correctness and guided screens in an approved order. Do not solve the data gap with copy alone.

## Proposed flow

```text
Home
  No active cook: Start a cook; secondary Connect probes
  Active cook: current cook, readings, recording state, Resume cook
  Multiple active cooks: clear cook switcher and Add cook

Devices
  Add a gateway → connect → verify incoming readings → name probes
  Already configured gateway: reuse saved setup
  Advanced connection settings: available when needed

Start a cook
  Food/cut → choose reading source (equal choices):
    Enter temperatures manually → probe names and targets → Start cook
    Use RFX probes → select probes (connect if needed) → targets → Start cook
  Optional name, equipment, pellets, timers, guides: collapsed or secondary

Cook
  Temperatures and age → target/alerts → chart → actions
  Manual mode: obvious Log reading action
  RFX mode: obvious recording state; manual spot reading remains available
  Separate connection state, reading freshness, and recording state
  If interrupted: keep last value with age, explain recovery action

Finish
  Confirm end → verify saved result → History
```

Use one primary action at each step. Use user terms such as Connect probes, Food probe, Smoker temperature, Target temperature, and End cook. Keep protocol names in advanced setup where they are needed to configure a real connection. Manual and RFX use the same monitoring layout and History, with their source clearly identified. Do not mark manual mode as a fallback or hide it under Advanced.

Device setup must explain prerequisites when a gateway/broker is not yet configured; moving technical fields under Advanced must not imply that an unconfigured device can connect without them. Cook-local probe names, targets, and software notifications must be distinguished from settings or alarms written to hardware. A normal cooking-flow action must not silently rewrite device configuration.

When Bluetooth setup is unavailable, provide a clear route for an already configured gateway and guidance for completing initial setup in a supported environment. Keep hardware MQTT and browser WebSocket endpoints distinct in the setup model, even when the copy is simplified.

Approved mobile primary navigation: Home, Cook, History, More. Devices are reachable from Home and More; Guides, Recipes, Stats, and Settings remain discoverable under More. Use these same primary labels on desktop.

## Recording behavior and proposed design calls

The mode-priority question is resolved: both have equal prominence. The following design defaults were included in the document approved on 2026-10-31:

- The first cook presents both source choices without preselecting one. Each cook stores its chosen source; resuming never asks for setup again unless the association needs repair.
- RFX recording writes only readings associated with this cook. A manually entered reading remains explicitly identified as manual, even in an RFX cook; a connection interruption never silently changes the source mode or fabricates missing readings.
- A food probe belongs to one active cook at a time. A smoker/ambient channel may be explicitly shared across active cooks. Unselected channels remain device readings and are not silently added to cook history.
- Names, targets, and alerts in cook setup are cook-local. Writing gateway labels or hardware alarms stays in a clearly identified device-settings action.
- Recording is supported while the app's connection is running. Phone locking, suspension, closure, and background alerts are capability gates, not promised behavior. The interface explains the recording requirement before an RFX cook starts and makes any detected interruption visible on return.

For RFX recording, implement and verify explicit gateway/channel-to-cook associations, simultaneous cook isolation, ordered/duplicate-safe history, capture timestamps, unit correctness, interruption/reconnect semantics, reload recovery, and an end-of-session boundary. Do not label a sample Recorded until it is actually persisted to the selected cook. Define storage growth and quota failure behavior before sustained-session testing. Any local storage schema change needs its own review and migration design.

The local PWA's in-page connection must not imply uninterrupted recording or software alerts while the phone is locked, the tab is suspended, or the app is closed. Define supported conditions, show gaps when collection pauses, and verify recovery/backfill capabilities before promising them. No background server or cloud relay may be introduced to bypass the project's static/local-only constraints. Define whether an ambient channel may serve multiple simultaneous cooks; never infer food-probe ownership from a display name.

Probe replacement must require an explicit association update. A disconnected probe retains its last captured value and age; a newly discovered probe must not silently inherit its cook history.

## Delivery gates

Storage planning discovered a capacity constraint: an isolated Chrome fixture with four probes at one sample/second exceeded localStorage at four hours. Actual RFX frequency was not measured. See [fixture results](../qa/evidence/recording-storage-capacity.json) and [comparison](../qa/evidence/recording-storage-comparison.json), in which slower tested capture policies fit. The proposed [storage amendment revision 2](2026-10-31-cook-recording-storage-v2.md) retains all accepted samples in IndexedDB and needs approval because the project brief currently requires localStorage for all state. Stage A usability improvements are independent of that decision and must disclose that device readings are not yet cook recording; equal-source integration is completed only in Stage B.

1. Approve the main journey and recording behavior, including equal manual/RFX paths, device setup, the design calls above, and optional form fields.
2. Write an implementation plan with exact files and focused behavioral regressions. Keep existing QA-004 commit `21eef18` separate until its local integration decision.
3. Implement bounded changes with browser evidence. No broad visual redesign or dependency replacement.
4. Independently verify the full first-use, returning-use, interruption, reload, finish, and history paths. Use deterministic local telemetry fixtures; real hardware and mobile Safari remain separate release gates.

## Usability acceptance scenarios

- A first-time user can find Connect probes from Home and identify what the next setup step requires.
- A returning user can start or resume a cook without revisiting transport configuration.
- Start cook asks for the essential food, source/probes, and targets before optional guidance.
- The manual and RFX source choices are equally visible. A manual cook can start and be recorded without configuring or connecting a device.
- Either source reaches the same monitoring layout and saved History; no manual entry is mistaken for a live device sample.
- Connection success and receipt of a fresh reading are distinguishable; errors identify a useful next action.
- The cooking screen makes it clear whether temperatures are manual, live, stale, and saved to this cook.
- Finishing a cook leads to the saved cook in History; a later packet cannot silently change the completed session.
- Multiple active cooks remain switchable without losing setup or mixing food-probe histories. Shared ambient readings follow an explicit association policy.
- After app suspension or restart, the user sees any recording gap and the actual reconnection state; the app does not imply missing samples were saved.
- Phone and desktop use consistent labels; keyboard focus, form labels, errors, and contrast are checked.
- A novice walkthrough can complete the main tasks without developer coaching. Task completion, wrong turns, and points of hesitation are recorded. Passing functional tests alone is not proof that the flow is intuitive.
