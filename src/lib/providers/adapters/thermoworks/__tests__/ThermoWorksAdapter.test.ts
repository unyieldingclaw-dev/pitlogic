import { describe, it, expect } from 'vitest';
import { transformPayload } from '../ThermoWorksAdapter.js';

const TOPIC = '/probes/M123456789012/events';

function makePayload(channels: unknown[]): Buffer {
  return Buffer.from(JSON.stringify({ gatewayId: 'M123456789012', channels }));
}

describe('transformPayload', () => {
  it('emits one event per temperature reading in a single channel', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 225.4, type: 'T' }] },
    ]);
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      probeId: 'M123456789012-ch1',
      capturedAt: 2_000_000_000_000,
      temperature: 225.4,
      unit: 'F',
      source: 'live',
    });
  });

  it('emits one event per channel when multiple channels are present', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 200.0, type: 'T' }] },
      { number: 2, ts: 2_000_000_000_000, readings: [{ value: 165.0, type: 'T' }] },
    ]);
    const events = transformPayload(TOPIC, payload);
    expect(events).toHaveLength(2);
    expect(events[0].probeId).toBe('M123456789012-ch1');
    expect(events[1].probeId).toBe('M123456789012-ch2');
  });

  it('emits zero events when no readings have type T', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 50.0, type: 'H' }] },
    ]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('discards events with ts < 1e10 (seconds-epoch detection)', () => {
    const payload = makePayload([
      { number: 1, ts: 1_716_825_600, readings: [{ value: 200.0, type: 'T' }] },
    ]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('discards events with non-integer ts', () => {
    const payload = makePayload([
      { number: 1, ts: '2024-05-01T00:00:00Z', readings: [{ value: 200.0, type: 'T' }] },
    ]);
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array for malformed JSON payload', () => {
    expect(transformPayload(TOPIC, Buffer.from('not json'))).toHaveLength(0);
  });

  it('returns empty array when payload has no channels array', () => {
    const payload = Buffer.from(JSON.stringify({ gatewayId: 'M123456789012' }));
    expect(transformPayload(TOPIC, payload)).toHaveLength(0);
  });

  it('returns empty array for an unrecognised topic pattern', () => {
    const payload = makePayload([
      { number: 1, ts: 2_000_000_000_000, readings: [{ value: 200.0, type: 'T' }] },
    ]);
    expect(transformPayload('/something/else', payload)).toHaveLength(0);
  });
});
