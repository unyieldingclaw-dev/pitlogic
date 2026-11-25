export function computeGatewayHealth(gatewayState, telemetryProbes) {
  return Array.from(gatewayState.values()).map(gw => ({
    ...gw,
    unitMismatch: gw.units === 'C',
    probes: Array.from(telemetryProbes.values())
      .filter(p => p.probeId.startsWith(`${gw.gatewayId}-ch`) && p.battery !== null)
      .map(p => ({ probeId: p.probeId, battery: p.battery })),
  }));
}
