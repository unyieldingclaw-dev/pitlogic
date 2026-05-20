/**
 * Session lifecycle is owned exclusively by SessionStore.
 * Providers MUST NOT create, infer, or terminate sessions.
 */
export interface CookSession {
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  probeIds: string[];
}
