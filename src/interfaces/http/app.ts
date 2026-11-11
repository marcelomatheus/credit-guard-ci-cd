import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import type { Logger } from 'pino';
import type { Configuration } from '../../infrastructure/config.js';
import { createLogger } from '../../infrastructure/logger.js';
import { createContainer } from '../../bootstrap/container.js';
import type { Container } from '../../bootstrap/container.js';
import { ApplicationError } from '../../shared/application-error.js';
import { creditPolicy } from '../../modules/credit-analysis/domain/credit-policy.js';
import { applicationQuerySchema, idempotencySchema, loginSchema, simulationSchema } from './schemas.js';
import { authenticatedUser, errorHandler, requireAnalyst, requireAuthentication, requireDemoAccessKey } from './middleware.js';
import { openApiDocument } from './openapi.js';
import { generateMetrics, recordHttpRequest, recordSimulationOutcome } from './metrics.js';
import { renderPage } from './web/page.js';
import { styles } from './web/styles.js';
import { script } from './web/script.js';

export function createApp(configuration: Configuration, container: Container = createContainer(configuration), logger: Logger = createLogger(configuration.LOG_LEVEL)) {
  const app = express();
  let ready = true;
  app.disable('x-powered-by');
  app.set('trust proxy', configuration.TRUST_PROXY.split(',').map((entry) => entry.trim()).filter(Boolean));
  app.use(pinoHttp({
    logger,
    genReqId: (_request, response) => {
      const id = randomUUID();
      response.setHeader('x-request-id', id);
      return id;
    }
  }));
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        scriptSrcAttr: ["'none'"],
        connectSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:']
      }
    }
  }));
  app.use((request, response, next) => {
    response.on('finish', () => {
      recordHttpRequest(request.method, request.route?.path ?? request.path, response.statusCode);
    });
    next();
  });
  app.use((_request, response, next) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '16kb' }));
  const page = renderPage({ accessKey: configuration.NODE_ENV === 'production' ? '' : configuration.DEMO_ACCESS_KEY });
  app.get('/', (_request, response) => {
    response.type('html').send(page);
  });
  app.get('/assets/app.css', (_request, response) => {
    response.type('css').send(styles);
  });
  app.get('/assets/app.js', (_request, response) => {
    response.type('js').send(script);
  });
  app.get('/metrics', (_request, response) => {
    response.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    response.send(generateMetrics());
  });
  app.get('/health/live', (_request, response) => { response.json({ status: 'alive' }); });
  app.get('/health/ready', (_request, response) => { response.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'draining', storage: 'memory' }); });
  app.get('/version', (_request, response) => { response.json({ version: configuration.APP_VERSION, commit: configuration.GIT_SHA, node: process.versions.node }); });
  app.get('/openapi.json', (_request, response) => { response.json(openApiDocument); });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  const limiterOptions = { standardHeaders: 'draft-8' as const, legacyHeaders: false, handler: (_request: express.Request, _response: express.Response, next: express.NextFunction) => { next(new ApplicationError('RATE_LIMIT_EXCEEDED', 'Too many requests; retry later', 429)); } };
  app.use('/api', rateLimit({ ...limiterOptions, windowMs: 60_000, limit: 120 }));
  app.post('/api/v1/auth/login',
    rateLimit({ ...limiterOptions, windowMs: 15 * 60_000, limit: 10 }),
    requireDemoAccessKey(configuration.DEMO_ACCESS_KEY),
    async (request, response) => {
      const { email, password } = loginSchema.parse(request.body);
      response.json(await container.authenticate.execute(email, password));
    }
  );
  app.use('/api/v1', requireAuthentication(container.tokens, container.users));
  app.get('/api/v1/auth/me', (_request, response) => { response.json({ data: authenticatedUser(response) }); });
  app.get('/api/v1/customers', (_request, response) => { response.json({ data: container.customers.list() }); });
  app.get('/api/v1/customers/:id', (request, response) => {
    const customer = container.customers.findById(request.params.id!);
    if (!customer) throw new ApplicationError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
    response.json({ data: customer });
  });
  app.get('/api/v1/customers/:id/open-finance', async (request, response) => { response.json({ data: await container.openFinance.consult(request.params.id!) }); });
  app.get('/api/v1/customers/:id/credit-history', async (request, response) => { response.json({ data: await container.creditHistory.consult(request.params.id!) }); });
  app.get('/api/v1/credit-policy', (_request, response) => { response.json({ data: creditPolicy }); });
  app.post('/api/v1/credit-applications', requireAnalyst, async (request, response) => {
    const input = simulationSchema.parse(request.body);
    const key = idempotencySchema.parse(request.get('idempotency-key'));
    const result = await container.simulate.execute(input, authenticatedUser(response).id, key);
    recordSimulationOutcome(result.application.decision.status);
    response.setHeader('Idempotency-Replayed', String(result.replayed));
    response.location(`/api/v1/credit-applications/${result.application.id}`);
    response.status(result.replayed ? 200 : 201).json({ data: result.application });
  });
  app.get('/api/v1/credit-applications', (request, response) => {
    const query = applicationQuerySchema.parse(request.query);
    const result = container.applications.list({ ...query, userId: authenticatedUser(response).id });
    response.json({ data: result.items, pagination: { page: query.page, limit: query.limit, total: result.total } });
  });
  app.get('/api/v1/credit-applications/:id', (request, response) => {
    const application = container.applications.findById(request.params.id!, authenticatedUser(response).id);
    if (!application) throw new ApplicationError('APPLICATION_NOT_FOUND', 'Credit application not found', 404);
    response.json({ data: application });
  });
  app.use((_request, _response) => { throw new ApplicationError('ROUTE_NOT_FOUND', 'Route not found', 404); });
  app.use(errorHandler(logger));
  return { app, markDraining: () => { ready = false; } };
}
