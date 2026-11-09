import { loadConfiguration } from '../infrastructure/config.js';
import { createLogger } from '../infrastructure/logger.js';
import { createApp } from '../interfaces/http/app.js';

const configuration = loadConfiguration(process.env);
const logger = createLogger(configuration.LOG_LEVEL);
const { app, markDraining } = createApp(configuration, undefined, logger);
const server = app.listen(configuration.PORT, '0.0.0.0', () => {
  logger.info({ port: configuration.PORT, commit: configuration.GIT_SHA }, 'Credit API started');
});
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.on('error', (err) => { logger.fatal({ err }, 'HTTP server failed'); process.exitCode = 1; });
let stopping = false;
function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  markDraining();
  logger.info({ signal }, 'Draining HTTP server');
  const timeout = setTimeout(() => { logger.error('Shutdown timed out'); process.exit(1); }, 10_000);
  timeout.unref();
  server.close(() => { clearTimeout(timeout); logger.info('HTTP server stopped'); });
  server.closeIdleConnections();
}
process.on('SIGTERM', () => { shutdown('SIGTERM'); });
process.on('SIGINT', () => { shutdown('SIGINT'); });
