import { z } from 'zod';

export const CsvRowSchema = z.object({
  probeId: z.string().min(1),
  temperature: z.number().finite(),
  unit: z.enum(['F', 'C']),
  capturedAt: z.number().int().positive(),
  source: z.literal('csv-import'),
  status: z.literal('active'),
});

export type CsvRow = z.infer<typeof CsvRowSchema>;

export const CsvHeadersSchema = z.object({
  timeCol: z.number().int().min(-1),
  smokerCol: z.number().int().min(-1),
  probeCols: z.array(z.number().int().nonnegative()),
});
