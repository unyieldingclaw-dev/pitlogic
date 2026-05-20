import { describe, it, expect } from 'vitest';
import { normalizeProviderEvent } from '../normalize.js';

const NOW = 1_700_000_000_000;

describe('normalizeProviderEvent', () => {
  it('produces probe:reading for a valid active event', () => {
    const raw = { probeId: 'p1', status: 'active', temperature: 200, unit: 'F', capturedAt: NOW };
    const event = normalizeProviderEvent(raw, 'test-provider');
    expect(event.type).toBe('probe:reading');
    if (event.type !== 'probe:reading') return;
    expect(event.reading.status).toBe('active');
    expect(event.reading.probeId).toBe('p1');
    expect(event.reading.temp.valueF).toBe(200);
  });

  it('produces probe:disconnected for a valid disconnected event', () => {
    const raw = { probeId: 'p2', status: 'disconnected', capturedAt: NOW };
    const event = normalizeProviderEvent(raw, 'test-provider');
    expect(event.type).toBe('probe:disconnected');
    if (event.type !== 'probe:disconnected') return;
    expect(event.reading.probeId).toBe('p2');
    expect(event.reading.status).toBe('disconnected');
  });

  it('converts Celsius to Fahrenheit and sets normalizedBy=normalizer', () => {
    const raw = { probeId: 'p3', status: 'active', temperature: 100, unit: 'C', capturedAt: NOW };
    const event = normalizeProviderEvent(raw, 'test-provider');
    expect(event.type).toBe('probe:reading');
    if (event.type !== 'probe:reading') return;
    expect(event.reading.temp.valueF).toBeCloseTo(212, 5);
    expect(event.reading.temp.providerUnit).toBe('C');
    expect(event.reading.temp.providerValue).toBe(100);
    expect(event.reading.temp.normalizedBy).toBe('normalizer');
  });

  it('sets normalizedBy=provider for Fahrenheit readings', () => {
    const raw = { probeId: 'p4', status: 'active', temperature: 165, unit: 'F', capturedAt: NOW };
    const event = normalizeProviderEvent(raw, 'test-provider');
    expect(event.type).toBe('probe:reading');
    if (event.type !== 'probe:reading') return;
    expect(event.reading.temp.normalizedBy).toBe('provider');
  });

  it('produces normalization:rejected for malformed payload without throwing', () => {
    const raw = { bad: 'data', missing: 'required fields' };
    const event = normalizeProviderEvent(raw, 'test-provider');
    expect(event.type).toBe('normalization:rejected');
    if (event.type !== 'normalization:rejected') return;
    expect(event.payload.providerId).toBe('test-provider');
  });

  it('produces normalization:rejected for empty object without throwing', () => {
    expect(() => normalizeProviderEvent({}, 'p')).not.toThrow();
    const event = normalizeProviderEvent({}, 'p');
    expect(event.type).toBe('normalization:rejected');
  });
});
