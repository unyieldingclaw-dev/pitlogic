# Performance and stability report

## Conditions

One headless installed-Chrome run on Windows 11 against the local Vite 8 development server at a **390×844** viewport. Each sample used a fresh isolated browser context with one active synthetic cook, one probe series, and one smoker series at one-minute intervals. Service workers were blocked; network was loopback. Timing covers navigation, app load, selecting Active, and first rendered Recharts surface. [Raw observed samples](evidence/performance-results.json) and the [12-hour data-volume screenshot](evidence/chart-12h-synthetic-390x844.png) are retained. The later expanded browser workflow was rerun separately; it was not used as a repeat performance sample.

| Represented cook span | Points per series | Navigation load event | Wall time to chart | Resource transfer | JS heap snapshot | LocalStorage JSON chars |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 30 minutes | 31 | 176 ms | 428 ms | 5.87 MB | 23.9 MB | 2,943 |
| 2 hours | 121 | 174 ms | 481 ms | 5.87 MB | 28.5 MB | 10,546 |
| 8 hours | 481 | 206 ms | 620 ms | 5.87 MB | 42.8 MB | 41,506 |
| 12 hours | 721 | 331 ms | 810 ms | 5.87 MB | 37.5 MB | 62,146 |

These are **single samples**, not medians or Core Web Vitals. Heap snapshots are affected by garbage collection, so the 12-hour value being below the 8-hour value does not show memory recovery. The transfer figure reflects unoptimized dev modules and is not a production payload measurement. `npm run build` produced a **1,417.92 kB minified / 394.16 kB gzip** JS chunk and a Vite >500 kB warning; build completed successfully. No bundle regression baseline was available.

## Interpretation

- The tested chart rendered at all four synthetic data sizes and did not show a first-render failure. The elapsed spans were encoded in timestamps and samples; the browser was **not** kept open for 30 minutes, 2 hours, 8 hours, or 12 hours. Background sleep, reconnection accumulation, memory retention, storage quota, and tab restoration remain untested.
- [TempChart.jsx](../../src/components/TempChart.jsx) builds chart rows by iterating unique times and using `.find` in each probe series. This is quadratic for a single dense series; the current 721-point sample rendered, but larger or multi-probe inputs need an explicit stress baseline before declaring scaling adequate. Equal-time readings collapse to the first value (QA-009).
- The app’s service worker uses stale-while-revalidate for same-origin GETs, but the browser audit disabled it. Install/offline behavior and cache version recovery were not measured.
- No telemetry-to-UI latency, interaction delay percentile, CPU utilization, heap growth over real elapsed time, event-listener count, network reconnection time, Lighthouse score, LCP, CLS, or INP was captured. There is no basis for a claim about them.

## Provisional targets for the next gate

These are recommendations, not project requirements: on a representative phone, retain visible temperature updates within 2 seconds of receipt while foregrounded; mark a reading stale within the configured 30-second threshold plus one check interval; keep 12-hour, multi-probe chart pan/tooltip responsive and localStorage writes under the browser quota; show broker-loss state promptly and recover without duplicate listeners or entries. Establish actual performance budgets on a production build and physical devices before release.

## Required sustained test

Run isolated broker fixtures for 30 minutes, 2 hours, 8 hours, and 12 hours of **real elapsed time**, including background/foreground transitions and controlled outages. Capture memory/CPU at intervals, event-handler and subscription counts, messages received versus rendered, chart point counts, localStorage size, probe age/status, and recovery duration. Preserve a clean reference profile and repeat on a production build. Time acceleration may supplement, but cannot replace, mobile sleep/background testing.
