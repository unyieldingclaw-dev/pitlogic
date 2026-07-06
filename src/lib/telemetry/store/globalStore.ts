import { TelemetryStore } from './TelemetryStore.js';
import { globalEventBus } from '../eventBus/EventBus.js';

export const globalTelemetryStore = new TelemetryStore(globalEventBus);
