import { TelemetryStore } from './TelemetryStore.js';
import { globalEventBus } from '../eventBus/EventBus.js';

// Module-level singleton, not React Context: this is the one sanctioned crossing
// point of the provider/UI domain boundary (ADR-001) — hooks import this directly
// instead of threading a context provider through the component tree.
export const globalStore = new TelemetryStore(globalEventBus);
