import { z } from 'zod';

export const ReadingSourceSchema = z.enum(['live', 'csv-import', 'manual', 'replay', 'synthetic']);

export const TelemetryTimestampSchema = z.object({
  capturedAt: z.number().int().positive(),
  receivedAt: z.number().int().positive(),
  normalizedAt: z.number().int().positive(),
  persistedAt: z.number().int().positive().optional(),
});

export const NormalizedTemperatureSchema = z.object({
  valueF: z.number().finite(),
  providerUnit: z.enum(['F', 'C']),
  providerValue: z.number().finite(),
  normalizedBy: z.enum(['provider', 'normalizer']),
});

const BaseReadingSchema = z.object({
  probeId: z.string().min(1),
  source: ReadingSourceSchema,
  timestamp: TelemetryTimestampSchema,
});

export const ActiveReadingSchema = BaseReadingSchema.extend({
  status: z.literal('active'),
  temp: NormalizedTemperatureSchema,
});

export const DisconnectedReadingSchema = BaseReadingSchema.extend({
  status: z.literal('disconnected'),
});

export const RawProviderEventSchema = z.record(z.string(), z.unknown());

export const RawActiveReadingSchema = z.object({
  probeId: z.string().min(1),
  source: ReadingSourceSchema.optional().default('live'),
  capturedAt: z.number().int().positive(),
  temperature: z.number().finite(),
  unit: z.enum(['F', 'C']).optional().default('F'),
  status: z.literal('active').optional().default('active'),
});

export const RawDisconnectedReadingSchema = z.object({
  probeId: z.string().min(1),
  source: ReadingSourceSchema.optional().default('live'),
  capturedAt: z.number().int().positive(),
  status: z.literal('disconnected'),
});

export const RawGatewayStateSchema = z.object({
  gatewayId: z.string().min(1),
  capturedAt: z.number().int().positive(),
  wifiStrength: z.number().optional(),
  battery: z.string().optional(),
  firmware: z.string().optional(),
  units: z.enum(['F', 'C']).optional(),
});

export const RawProbeBatterySchema = z.object({
  probeId: z.string().min(1),
  capturedAt: z.number().int().positive(),
  battery: z.number(),
});
