import { pino } from 'pino';

export function createLogger(level: string) {
  return pino({
    level,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-demo-access-key"]', 'password', 'accessToken'],
      censor: '[REDACTED]'
    },
    base: { service: 'pipeline-credit-api' }
  });
}
