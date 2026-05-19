import type { NormalizedTemperature } from '../domain/TelemetryModels.js';

export function toFahrenheit(value: number, unit: 'F' | 'C'): number {
  return unit === 'C' ? value * 9 / 5 + 32 : value;
}

export function normalizeTemperature(
  providerValue: number,
  providerUnit: 'F' | 'C',
): NormalizedTemperature {
  const valueF = toFahrenheit(providerValue, providerUnit);
  return {
    valueF,
    providerUnit,
    providerValue,
    normalizedBy: providerUnit === 'F' ? 'provider' : 'normalizer',
  };
}
