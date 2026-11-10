import { z } from 'zod';

const configuration = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3016),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JWT_SECRET: z.string().min(32).max(512),
  DEMO_ACCESS_KEY: z.string().min(16).max(256),
  TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  TRUST_PROXY: z.string().default('loopback'),
  MEMORY_TTL_SECONDS: z.coerce.number().int().min(60).max(86400).default(86400),
  MEMORY_MAX_APPLICATIONS: z.coerce.number().int().min(1).max(10000).default(1000),
  APP_VERSION: z.string().max(100).default('1.0.0'),
  GIT_SHA: z.string().regex(/^(development|[a-f0-9]{40})$/).default('development')
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production') {
    if (value.JWT_SECRET.startsWith('local-') || new Set(value.JWT_SECRET).size < 10) {
      context.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'Production requires a generated signing secret' });
    }
    if (value.DEMO_ACCESS_KEY.length < 32 || value.DEMO_ACCESS_KEY.startsWith('local-') || new Set(value.DEMO_ACCESS_KEY).size < 10) {
      context.addIssue({ code: 'custom', path: ['DEMO_ACCESS_KEY'], message: 'Production requires a generated demo access key' });
    }
  }
});

export type Configuration = z.infer<typeof configuration>;

export function loadConfiguration(environment: NodeJS.ProcessEnv): Configuration {
  const result = configuration.safeParse(environment);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid environment configuration: ${fields.join(', ')}`);
  }
  return result.data;
}
