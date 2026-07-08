// This hook is the sole bridge between the provider boundary and the telemetry pipeline.
// It is the only non-lib file permitted to import from src/lib/providers/ and
// src/lib/telemetry/eventBus/ — see ADR-001 and the design spec.
import { useState, useEffect, useRef, useCallback } from 'react';
import { ThermoWorksAdapter } from '../lib/providers/adapters/thermoworks/ThermoWorksAdapter.js';
import { normalizeProviderEvent } from '../lib/telemetry/normalization/normalize.js';
import { globalEventBus } from '../lib/telemetry/eventBus/EventBus.js';

const STORAGE_KEY = 'pitlogic-mqtt-v1';
export const CONFIG_CACHE_KEY = 'pitlogic-thermoworks-config-cache-v1';

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // JSON corruption → treat as missing config; connect() will surface a user-readable error
  }
}

function loadConfigCache() {
  try {
    const raw = localStorage.getItem(CONFIG_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveConfigCacheEntry(gatewayId, rawConfig) {
  const cache = loadConfigCache();
  cache[gatewayId] = rawConfig;
  try {
    localStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Quota errors or private-mode restrictions are non-fatal — this cache is a convenience
    // fallback only, never a source of truth (see design spec).
  }
}

export function useThermoWorksProvider() {
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const sessionRef = useRef(null); // { adapter, unsub }
  const seenConfigRef = useRef(new Set()); // gatewayIds with a live retained config seen this session

  const connect = useCallback(async () => {
    const config = loadConfig();
    if (!config?.brokerUrl || !config?.username || !config?.password) {
      setError('Missing broker configuration. Set broker URL, username, and password first.');
      setStatus('error');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const adapter = new ThermoWorksAdapter(config);
      // Raw events cross the provider boundary here: normalize validates shape (Zod),
      // then publish delivers to TelemetryStore via the eventBus. Normalization happens
      // in the hook, not in the adapter, to keep the adapter purely transport-layer.
      const unsub = adapter.subscribe(rawEvent => {
        const normalized = normalizeProviderEvent(rawEvent, adapter.id);
        if (normalized.type === 'gateway:config') {
          seenConfigRef.current.add(normalized.gatewayId);
          saveConfigCacheEntry(normalized.gatewayId, normalized.raw);
        }
        globalEventBus.publish(normalized);
      });
      await adapter.connect();
      sessionRef.current = { adapter, unsub };
      setStatus('connected');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!sessionRef.current) return;
    const { adapter, unsub } = sessionRef.current;
    unsub();
    await adapter.disconnect();
    sessionRef.current = null;
    setStatus('disconnected');
    setError(null);
  }, []);

  const hasConfigBaseline = useCallback(gatewayId => seenConfigRef.current.has(gatewayId), []);

  const updateDeviceConfig = useCallback(async (gatewayId, edits) => {
    if (!sessionRef.current) throw new Error('Not connected');
    const fallbackBaseline = hasConfigBaseline(gatewayId) ? undefined : loadConfigCache()[gatewayId];
    await sessionRef.current.adapter.publishConfig(gatewayId, edits, fallbackBaseline);
  }, [hasConfigBaseline]);

  useEffect(() => {
    // Clean up adapter on unmount — prevents event delivery to unmounted components
    return () => {
      const session = sessionRef.current;
      if (session) {
        session.unsub();
        void session.adapter.disconnect();
        sessionRef.current = null;
      }
    };
  }, []);

  return { status, error, connect, disconnect, hasConfigBaseline, updateDeviceConfig };
}
