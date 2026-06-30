// This hook is the sole bridge between the provider boundary and the telemetry pipeline.
// It is the only non-lib file permitted to import from src/lib/providers/ and
// src/lib/telemetry/eventBus/ — see ADR-001 and the design spec.
import { useState, useEffect, useRef, useCallback } from 'react';
import { ThermoWorksAdapter } from '../lib/providers/adapters/thermoworks/ThermoWorksAdapter.js';
import { normalizeProviderEvent } from '../lib/telemetry/normalization/normalize.js';
import { globalEventBus } from '../lib/telemetry/eventBus/EventBus.js';

const STORAGE_KEY = 'pitlogic-mqtt-v1';

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // JSON corruption → treat as missing config; connect() will surface a user-readable error
  }
}

export function useThermoWorksProvider() {
  const [status, setStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  // Device meta (state/battery/firmware) stays in hook-local state — must NOT flow through globalEventBus.
  const [deviceState, setDeviceState] = useState(() => new Map());
  const sessionRef = useRef(null); // { adapter, unsub, unsubMeta }

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
        globalEventBus.publish(normalized);
      });
      const unsubMeta = adapter.subscribeDeviceMeta(event => {
        setDeviceState(prev => {
          const map = new Map(prev);
          if (event.type === 'state') {
            map.set(event.deviceId, event);
          } else if (event.type === 'battery') {
            const existing = map.get(event.deviceId);
            if (existing) map.set(event.deviceId, { ...existing, battery: event.battery });
          } else if (event.type === 'firmware') {
            const existing = map.get(event.deviceId);
            if (existing) map.set(event.deviceId, { ...existing, firmware: event.firmware });
          }
          return map;
        });
      });
      await adapter.connect();
      sessionRef.current = { adapter, unsub, unsubMeta };
      setStatus('connected');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (!sessionRef.current) return;
    const { adapter, unsub, unsubMeta } = sessionRef.current;
    unsub();
    unsubMeta();
    await adapter.disconnect();
    sessionRef.current = null;
    setStatus('disconnected');
    setError(null);
    setDeviceState(new Map());
  }, []);

  const publishDeviceConfig = useCallback(async (deviceId, config) => {
    if (!sessionRef.current) throw new Error('[thermoworks] publishDeviceConfig: not connected');
    await sessionRef.current.adapter.publishDeviceConfig(deviceId, config);
  }, []);

  useEffect(() => {
    // Clean up adapter on unmount — prevents event delivery to unmounted components
    return () => {
      const session = sessionRef.current;
      if (session) {
        session.unsub();
        session.unsubMeta();
        void session.adapter.disconnect();
        sessionRef.current = null;
      }
    };
  }, []);

  return { status, error, connect, disconnect, deviceState, publishDeviceConfig };
}
