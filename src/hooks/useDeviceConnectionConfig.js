import { useState } from 'react';

const KEY = 'pitlogic-mqtt-v1';
const emptyConfig = () => ({ brokerUrl: '', username: '', password: '', unit: 'F' });

export function loadDeviceConnectionConfig() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    return {
      brokerUrl: typeof stored?.brokerUrl === 'string' ? stored.brokerUrl : '',
      username: typeof stored?.username === 'string' ? stored.username : '',
      password: typeof stored?.password === 'string' ? stored.password : '',
      unit: stored?.unit === 'C' ? 'C' : 'F',
    };
  } catch { return emptyConfig(); }
}

export function useDeviceConnectionConfig() {
  const [config, setConfig] = useState(loadDeviceConnectionConfig);
  const saveConfig = next => {
    if (![next.brokerUrl, next.username, next.password].every(value => typeof value === 'string' && value.length > 0)) throw new Error('Enter the broker address, username and password.');
    let address;
    try { address = new URL(next.brokerUrl); } catch { throw new Error('Enter a valid broker WebSocket address.'); }
    if (!['ws:', 'wss:'].includes(address.protocol)) throw new Error('PitLogic needs the broker WebSocket address (ws:// or wss://), not the gateway MQTT address.');
    try { localStorage.setItem(KEY, JSON.stringify(next)); }
    catch { throw new Error('Could not save connection settings. Check browser storage and try again.'); }
  };
  return { config, setConfig, saveConfig };
}
