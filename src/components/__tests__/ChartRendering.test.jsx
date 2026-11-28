import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TempChart from '../TempChart';
import CompareChart from '../CompareChart';

vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <svg>{children}</svg>;
  const Empty = () => null;
  return {
    ResponsiveContainer: ({ children, initialDimension }) => (
      <div data-testid="responsive-container" data-initial-width={initialDimension?.width}
        data-initial-height={initialDimension?.height}>{children}</div>
    ),
    ComposedChart: Passthrough,
    XAxis: ({ ticks }) => <text data-testid="x-axis-ticks">{JSON.stringify(ticks)}</text>,
    YAxis: Empty,
    CartesianGrid: Empty,
    Tooltip: Empty,
    Line: Empty,
    Area: Empty,
    ReferenceLine: Empty,
    ReferenceArea: Empty,
  };
});

const readings = [
  { time: 0, temp: 70 },
  { time: 60, temp: 110 },
  { time: 120, temp: 150 },
];
const cook = {
  id: 'sample-1', name: 'Sample Brisket', cut: 'Brisket', status: 'complete',
  startTime: 1_700_000_000_000, endTime: 1_700_007_200_000,
  probes: [{ name: 'Point', target: 203, readings }], smokerReadings: [],
};

describe('chart rendering', () => {
  it('gives the cook chart a positive initial size before its observer measures the layout', () => {
    render(<TempChart cook={cook} height={280} />);
    const container = screen.getByTestId('responsive-container');
    expect(Number(container.dataset.initialWidth)).toBeGreaterThan(0);
    expect(Number(container.dataset.initialHeight)).toBe(280);
  });

  it('labels comparison time at hourly intervals, not every 15-minute sample', () => {
    const second = { ...cook, id: 'sample-2', startTime: cook.startTime + 1000 };
    render(<CompareChart cooks={[cook, second]} cut="Brisket" />);
    expect(JSON.parse(screen.getByTestId('x-axis-ticks').textContent)).toEqual([0, 60, 120]);
  });
});
