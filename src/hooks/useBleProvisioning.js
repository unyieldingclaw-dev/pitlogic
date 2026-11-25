// This hook is the sole bridge between the provider boundary and UI for BLE device
// provisioning. It is permitted to import from src/lib/providers/ — see ADR-001.
// Unlike useThermoWorksProvider.js, this is a one-shot configuration write, not a
// telemetry stream: it never touches the event bus or TelemetryStore, so there is
// nothing to normalize or materialize here — it's a thin pass-through that exists
// solely to satisfy the firewall.
import { useState, useCallback } from 'react';
import { ThermoWorksBleProvisioner } from '../lib/providers/adapters/thermoworks/ThermoWorksBleProvisioner.js';

export function useBleProvisioning() {
  const [provisioner] = useState(() => new ThermoWorksBleProvisioner());

  const connect = useCallback(() => provisioner.connect(), [provisioner]);
  const scanWifiNetworks = useCallback(onNetwork => provisioner.scanWifiNetworks(onNetwork), [provisioner]);
  const provision = useCallback((fields, onStatus) => provisioner.provision(fields, onStatus), [provisioner]);
  const disconnect = useCallback(() => provisioner.disconnect(), [provisioner]);

  return { connect, scanWifiNetworks, provision, disconnect };
}
