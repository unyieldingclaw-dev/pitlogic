import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DetailView from '../DetailView';

vi.mock('../TempChart', () => ({
  default: () => <div data-testid="temp-chart-stub" />,
  buildChartData: () => [],
  analyzeProbe: () => null,
}));

vi.mock('../ShareCard', () => ({
  default: () => <div data-testid="share-button-stub" />,
}));

const baseCook = {
  id: 'cook1',
  name: 'Test Brisket',
  cut: 'Brisket',
  status: 'complete',
  startTime: 1_700_000_000_000,
  endTime: 1_700_030_000_000,
  notes: '',
  rating: 0,
  probes: [
    { name: 'Probe 1', target: 203, readings: [] },
  ],
  smokerReadings: [],
};

describe('DetailView — Import CSV', () => {
  it('renders an Import CSV control in the Overview tab', () => {
    render(<DetailView cooks={[baseCook]} detailId="cook1" onBack={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} flash={vi.fn()} onCSV={vi.fn()} />);
    expect(screen.getAllByText(/import csv/i).length).toBeGreaterThan(0);
  });

  it('calls onCSV with the file input event and the detail cook id', () => {
    const onCSV = vi.fn();
    render(<DetailView cooks={[baseCook]} detailId="cook1" onBack={vi.fn()} onDelete={vi.fn()} onSave={vi.fn()} flash={vi.fn()} onCSV={onCSV} />);
    const input = screen.getByLabelText(/import csv/i);
    fireEvent.change(input, { target: { files: [] } });
    expect(onCSV).toHaveBeenCalledTimes(1);
    expect(onCSV.mock.calls[0][1]).toBe('cook1');
  });
});
