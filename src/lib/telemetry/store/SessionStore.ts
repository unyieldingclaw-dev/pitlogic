import type { CookSession } from '../domain/SessionModels.js';
import type { IEventBus } from '../eventBus/types.js';

type SessionListener = (session: CookSession | null) => void;

/**
 * Owns session lifecycle exclusively.
 * Providers MUST NOT emit session events — only SessionStore does.
 */
export class SessionStore {
  private session: CookSession | null = null;
  private readonly listeners = new Set<SessionListener>();

  constructor(private readonly eventBus: IEventBus) {}

  getSession(): CookSession | null {
    return this.session;
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  startSession(probeIds: string[]): CookSession {
    const sessionId = `session-${Date.now()}`;
    const now = Date.now();
    this.session = { sessionId, startedAt: now, probeIds };
    this.eventBus.publish({ type: 'session:started', sessionId, timestamp: now });
    this.notify();
    return this.session;
  }

  endSession(): void {
    if (this.session === null) return;
    const now = Date.now();
    const { sessionId } = this.session;
    this.session = { ...this.session, endedAt: now };
    this.eventBus.publish({ type: 'session:ended', sessionId, timestamp: now });
    this.notify();
    this.session = null;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(this.session); } catch { /* isolate */ }
    }
  }
}
