import { TelemetryStore } from './TelemetryStore.js';
import { globalEventBus } from '../eventBus/EventBus.js';

export const globalStore = new TelemetryStore(globalEventBus);
