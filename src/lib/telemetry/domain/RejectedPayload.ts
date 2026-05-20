export interface RejectedPayloadMetadata {
  providerId: string;
  eventType?: string;
  receivedAt: number;
  payloadHash?: string;
  /** Bounded excerpt — never a full data dump. */
  truncatedPayload?: unknown;
}
