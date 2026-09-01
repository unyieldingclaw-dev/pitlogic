import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeviceSettingsCard from '../DeviceSettingsCard';

const baseGw = {
  gatewayId: 'gw1',
  editableConfig: null,
};

describe('DeviceSettingsCard', () => {
  it('pre-fills channel labels and alarm values from editableConfig', () => {
    const gw = {
      gatewayId: 'gw1',
      editableConfig: {
        channelLabels: { 1: 'Brisket' },
        alarms: { 1: { high: 200, low: 50 } },
        transmitIntervalInSeconds: 60,
        recordingIntervalInSeconds: 30,
      },
    };
    render(<DeviceSettingsCard gw={gw} hasConfigBaseline={() => true} onUpdateDeviceConfig={vi.fn()} />);
    expect(screen.getByLabelText(/channel 1 label/i).value).toBe('Brisket');
    expect(screen.getByLabelText(/channel 1 high alarm/i).value).toBe('200');
    expect(screen.getByLabelText(/channel 1 low alarm/i).value).toBe('50');
    expect(screen.getByLabelText(/transmit interval/i).value).toBe('60');
    expect(screen.getByLabelText(/recording interval/i).value).toBe('30');
  });

  it('shows an "Initialize configuration" heading when there is no baseline yet', () => {
    render(<DeviceSettingsCard gw={baseGw} hasConfigBaseline={() => false} onUpdateDeviceConfig={vi.fn()} />);
    expect(screen.getByText(/initialize configuration/i)).toBeTruthy();
  });

  it('shows a normal "Device Settings" heading when a baseline exists', () => {
    render(<DeviceSettingsCard gw={baseGw} hasConfigBaseline={() => true} onUpdateDeviceConfig={vi.fn()} />);
    expect(screen.getByText(/^device settings$/i)).toBeTruthy();
  });

  it('calls onUpdateDeviceConfig with the edited fields on Save, and flashes a success message', async () => {
    const onUpdateDeviceConfig = vi.fn().mockResolvedValue(undefined);
    render(<DeviceSettingsCard gw={baseGw} hasConfigBaseline={() => true} onUpdateDeviceConfig={onUpdateDeviceConfig} />);

    fireEvent.change(screen.getByLabelText(/channel 1 label/i), { target: { value: 'Ribs' } });
    fireEvent.change(screen.getByLabelText(/channel 1 high alarm/i), { target: { value: '225' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await vi.waitFor(() => {
      expect(onUpdateDeviceConfig).toHaveBeenCalledWith('gw1', {
        channelLabels: { 1: 'Ribs' },
        alarms: { 1: { high: 225 } },
      });
    });
    expect(await screen.findByText(/settings sent/i)).toBeTruthy();
  });

  it('shows a flash error when onUpdateDeviceConfig rejects', async () => {
    const onUpdateDeviceConfig = vi.fn().mockRejectedValue(new Error('MQTT disconnected'));
    render(<DeviceSettingsCard gw={baseGw} hasConfigBaseline={() => true} onUpdateDeviceConfig={onUpdateDeviceConfig} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/mqtt disconnected/i)).toBeTruthy();
  });

  it('omits a non-numeric alarm value from the edits instead of sending NaN', async () => {
    const onUpdateDeviceConfig = vi.fn().mockResolvedValue(undefined);
    render(<DeviceSettingsCard gw={baseGw} hasConfigBaseline={() => true} onUpdateDeviceConfig={onUpdateDeviceConfig} />);

    fireEvent.change(screen.getByLabelText(/channel 1 high alarm/i), { target: { value: '-' } });
    fireEvent.change(screen.getByLabelText(/transmit interval/i), { target: { value: '-' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await vi.waitFor(() => {
      expect(onUpdateDeviceConfig).toHaveBeenCalledWith('gw1', {
        channelLabels: {},
        alarms: {},
      });
    });
  });
});
