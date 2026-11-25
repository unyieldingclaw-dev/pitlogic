import { describe, it, expect } from 'vitest';
import { computeGatewayHealth } from '../deviceHealth.js';

describe('computeGatewayHealth', () => {
  it('attributes probes to their gateway by id', () => {
    const gatewayState = new Map([
      ['gw1', { gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F' }],
    ]);
    const telemetryProbes = new Map([
      ['gw1-ch1', { probeId: 'gw1-ch1', battery: 42 }],
    ]);
    const result = computeGatewayHealth(gatewayState, telemetryProbes);
    expect(result).toEqual([
      { gatewayId: 'gw1', wifiStrength: 88, battery: 'C', firmware: 'v2.45', units: 'F', unitMismatch: false,
        probes: [{ probeId: 'gw1-ch1', battery: 42 }] },
    ]);
  });

  it('does not misattribute a probe when one gateway id is a string prefix of another', () => {
    const gatewayState = new Map([
      ['M123', { gatewayId: 'M123', wifiStrength: null, battery: null, firmware: null, units: 'F' }],
      ['M1234567', { gatewayId: 'M1234567', wifiStrength: null, battery: null, firmware: null, units: 'F' }],
    ]);
    const telemetryProbes = new Map([
      ['M1234567-ch1', { probeId: 'M1234567-ch1', battery: 55 }],
    ]);
    const result = computeGatewayHealth(gatewayState, telemetryProbes);
    const m123 = result.find(gw => gw.gatewayId === 'M123');
    const m1234567 = result.find(gw => gw.gatewayId === 'M1234567');
    expect(m123.probes).toEqual([]);
    expect(m1234567.probes).toEqual([{ probeId: 'M1234567-ch1', battery: 55 }]);
  });

  it('excludes probes with a null battery', () => {
    const gatewayState = new Map([
      ['gw1', { gatewayId: 'gw1', wifiStrength: null, battery: null, firmware: null, units: 'F' }],
    ]);
    const telemetryProbes = new Map([
      ['gw1-ch1', { probeId: 'gw1-ch1', battery: null }],
    ]);
    const result = computeGatewayHealth(gatewayState, telemetryProbes);
    expect(result[0].probes).toEqual([]);
  });

  it('flags unitMismatch when the gateway reports Celsius', () => {
    const gatewayState = new Map([
      ['gw1', { gatewayId: 'gw1', wifiStrength: null, battery: null, firmware: null, units: 'C' }],
    ]);
    const result = computeGatewayHealth(gatewayState, new Map());
    expect(result[0].unitMismatch).toBe(true);
  });
});
