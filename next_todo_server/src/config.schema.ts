import { z } from 'zod';

const configSchema = z.object({
  DB_HOST: z.string(),
  DB_PORT: z.preprocess((val) => Number(val), z.number().default(5432)),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_DATABASE: z.string(),
  JWT_SECRET: z.string(),
});

export function validate(config: Record<string, unknown>) {
  const result = configSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Config validation error: ${result.error.toString()}`);
  }

  return result.data;
}
