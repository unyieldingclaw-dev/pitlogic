/**
 * STUB — ThermoWorks SDK integration placeholder.
 *
 * COMPLIANCE NOTICE (ADR-003):
 * Before implementing any method in this file, run the 8-question filter in
 * src/lib/compliance/ADR-003-sdk-boundaries.md. Any "yes" answer = stop + escalate.
 *
 * PROHIBITED in this file:
 * - Reverse-engineering ThermoWorks protocols or Bluetooth packets
 * - Accessing localStorage, domain state, or UI state
 * - Emitting session events (SessionStore owns session lifecycle)
 * - Inferring staleness (TelemetryStore owns stale derivation)
 * - Any analytics logic
 *
 * APPROVED integration path:
 * Official ThermoWorks SDK only → emit RawProviderEvent → normalization layer.
 */

import type { TemperatureProvider } from '../../core/TemperatureProvider.js';
import type { RawProviderEvent } from '../../core/ProviderTypes.js';

class NotImplementedError extends Error {
  constructor(method: string) {
    super(
      `ThermoWorksAdapter.${method} is not implemented. ` +
      'Integrate only via the official ThermoWorks SDK after completing the ' +
      'ADR-003 engineering decision filter.',
    );
    this.name = 'NotImplementedError';
  }
}

export class ThermoWorksAdapter implements TemperatureProvider {
  readonly id = 'thermoworks';

  async connect(): Promise<void> {
    throw new NotImplementedError('connect');
  }

  subscribe(_handler: (event: RawProviderEvent) => void): () => void {
    throw new NotImplementedError('subscribe');
  }

  async disconnect(): Promise<void> {
    throw new NotImplementedError('disconnect');
  }
}
