import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import DashboardTab from '../DashboardTab.jsx';
import SettingsSheet from '../DevicesPanel.jsx';

const NOW = new Date('2026-10-23T20:00:00Z').getTime();

function probe(id, status, ageMs, valueF = 177.3) {
  return {
    probeId: id, label: id, occupancy: 'occupied', status, targetTemp: null, battery: null,
    lastReading: { probeId: id, source: 'synthetic', status: 'active', timestamp: { capturedAt: NOW - ageMs, receivedAt: NOW },
      temp: { valueF, providerUnit: 'F', providerValue: valueF, normalizedBy: 'provider' } },
  };
}

function dashboard(liveProbes) {
  const props = { cooks: [], activeCook: null, allActiveCooks: [], channelMeta: new Map(),
    onGoActive: vi.fn(), onNewCook: vi.fn(), onSelectCook: vi.fn() };
  const view = render(<DashboardTab {...props} liveProbes={liveProbes} />);
  return { ...view, rerenderProbes: next => view.rerender(<DashboardTab {...props} liveProbes={next} />) };
}

function settings(liveProbes) {
  return render(<SettingsSheet open onClose={vi.fn()} cookState={{ cooks: [], activeCooks: [] }} recipes={[]}
    onImportCooks={vi.fn()} onImportRecipes={vi.fn()} prefs={{ theme: 'dark', cutPrefs: {} }} resetCutPref={vi.fn()}
    setTheme={vi.fn()} mqttStatus="disconnected" mqttError={null} onMqttConnect={vi.fn()} onMqttDisconnect={vi.fn()}
    csvStatus="idle" csvError={null} onCsvReplay={vi.fn()} onCsvReset={vi.fn()} liveProbes={liveProbes}
    deviceState={new Map()} gatewayHealth={[]} onHasConfigBaseline={() => false} onUpdateDeviceConfig={vi.fn()} />);
}

describe('live reading freshness', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it('labels an all-stale Dashboard as previous readings with each probe age', () => {
    dashboard(new Map([['p1', probe('p1', 'stale', 31_000)]]));

    expect(screen.getByText('Last Readings')).toBeTruthy();
    expect(screen.getByText('Stale · 31s ago')).toBeTruthy();
    expect(screen.queryByText('Live Readings')).toBeNull();
  });

  it('keeps a stale member explicit when another probe is live', () => {
    dashboard(new Map([
      ['fresh', probe('fresh', 'active', 2_000)],
      ['old', probe('old', 'stale', 45_000)],
    ]));

    expect(screen.getByText('Live Readings')).toBeTruthy();
    expect(screen.getByText('Live · 2s ago')).toBeTruthy();
    expect(screen.getByText('Stale · 45s ago')).toBeTruthy();
  });

  it('shows disconnected status and advances the age without new telemetry', () => {
    dashboard(new Map([['p1', probe('p1', 'disconnected', 45_000)]]));

    expect(screen.getByText('Last Readings')).toBeTruthy();
    expect(screen.getByText('Disconnected · 45s ago')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(screen.getByText('Disconnected · 1m ago')).toBeTruthy();
  });

  it('refreshes the age immediately on a status change after a long tab pause', () => {
    const { rerenderProbes } = dashboard(new Map([['p1', probe('p1', 'active', 1_000)]]));
    vi.setSystemTime(NOW + 3 * 3600_000);
    rerenderProbes(new Map([['p1', probe('p1', 'disconnected', 1_000)]]));

    expect(screen.getByText('Disconnected · 3h ago')).toBeTruthy();
  });

  it('shows a disconnected probe status and age in Devices', () => {
    settings(new Map([['p1', probe('p1', 'disconnected', 45_000)]]));

    expect(screen.getByText('Probe Readings')).toBeTruthy();
    expect(screen.queryByText('Live Probes')).toBeNull();
    expect(screen.getByText('Disconnected · 45s ago')).toBeTruthy();
  });
});
