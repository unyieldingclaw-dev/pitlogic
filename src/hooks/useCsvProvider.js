// Bridge: CSV File → CsvProvider → normalizer → globalEventBus → TelemetryStore.
// The only non-lib file permitted to import from src/lib/providers/ and
// src/lib/telemetry/eventBus/ for the CSV path — see ADR-001.
import { useState, useRef, useCallback, useEffect } from 'react';
import { CsvProvider } from '../lib/providers/adapters/csv/CsvProvider.js';
import { normalizeProviderEvent } from '../lib/telemetry/normalization/normalize.js';
import { globalEventBus } from '../lib/telemetry/eventBus/EventBus.js';

export function useCsvProvider() {
  const [status, setStatus] = useState('idle'); // 'idle' | 'replaying' | 'done' | 'error'
  const [error, setError] = useState(null);
  const sessionRef = useRef(null); // { provider, unsub }

  const replay = useCallback(async (file) => {
    if (sessionRef.current) {
      const { provider, unsub } = sessionRef.current;
      unsub();
      await provider.disconnect();
      sessionRef.current = null;
    }

    setStatus('replaying');
    setError(null);

    try {
      const text = await file.text();
      const provider = new CsvProvider(`csv-${Date.now()}`);
      const unsub = provider.subscribe(rawEvent => {
        const normalized = normalizeProviderEvent(rawEvent, provider.id);
        globalEventBus.publish(normalized);
      });
      provider.load(text);
      sessionRef.current = { provider, unsub };
      await provider.connect();
      setStatus('done');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Replay failed');
    }
  }, []);

  const reset = useCallback(async () => {
    if (sessionRef.current) {
      const { provider, unsub } = sessionRef.current;
      unsub();
      await provider.disconnect();
      sessionRef.current = null;
    }
    setStatus('idle');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      const session = sessionRef.current;
      if (session) {
        session.unsub();
        void session.provider.disconnect();
      }
    };
  }, []);

  return { status, error, replay, reset };
}
