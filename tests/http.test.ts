import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/interfaces/http/app.js';
import { loadConfiguration } from '../src/infrastructure/config.js';
import { createContainer } from '../src/bootstrap/container.js';
import { JwtTokenService } from '../src/infrastructure/security/jwt-token-service.js';
import type { User } from '../src/modules/identity/domain/user.js';

const environment = { NODE_ENV: 'test', LOG_LEVEL: 'silent', JWT_SECRET: 'test-signing-secret-with-at-least-32-characters', DEMO_ACCESS_KEY: 'test-demo-access-key' };
const config = loadConfiguration(environment);
const input = { customerId: 'customer-stable', amountCents: 100000, installments: 12 };

describe('HTTP API', () => {
  let instance: ReturnType<typeof createApp>;
  let container: ReturnType<typeof createContainer>;
  let token: string;

  async function login(email = 'analyst@example.test', password = 'AnalystDemo!2026') {
    return request(instance.app).post('/api/v1/auth/login').set('x-demo-access-key', config.DEMO_ACCESS_KEY).send({ email, password });
  }

  beforeEach(async () => {
    container = createContainer(config);
    instance = createApp(config, container);
    const result = await login();
    expect(result.status).toBe(200);
    token = result.body.accessToken;
  });

  it('serves health, version, OpenAPI and Swagger and reports draining', async () => {
    expect((await request(instance.app).get('/health/live')).body.status).toBe('alive');
    expect((await request(instance.app).get('/health/ready')).body.storage).toBe('memory');
    const version = await request(instance.app).get('/version');
    expect(version.body.commit).toBe('development');
    expect(version.headers['x-powered-by']).toBeUndefined();
    expect(version.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
    expect((await request(instance.app).get('/openapi.json')).body.openapi).toBe('3.0.3');
    expect((await request(instance.app).get('/docs/')).status).toBe(200);
    instance.markDraining();
    expect((await request(instance.app).get('/health/ready')).status).toBe(503);
  });

  it('requires the private demo gate before accepting public mock credentials', async () => {
    const response = await request(instance.app).post('/api/v1/auth/login').send({ email: 'analyst@example.test', password: 'AnalystDemo!2026' });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_DEMO_ACCESS_KEY');
  });

  it('returns identical errors for nonexistent users and wrong passwords', async () => {
    for (const [email, password] of [['missing@example.test', 'wrong'], ['analyst@example.test', 'wrong']]) {
      const response = await login(email, password);
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(JSON.stringify(response.body)).not.toContain('passwordHash');
    }
  });

  it('handles invalid, expired, missing-subject-user and absent tokens', async () => {
    const user: User = { id: 'missing-user', email: 'missing@example.test', name: 'Missing', role: 'ANALYST', passwordHash: '' };
    const missingUserToken = await container.tokens.issue(user);
    const expired = await new JwtTokenService(config.JWT_SECRET, -1).issue(user);
    for (const value of ['invalid', expired, missingUserToken]) {
      expect((await request(instance.app).get('/api/v1/auth/me').auth(value, { type: 'bearer' })).status).toBe(401);
    }
    expect((await request(instance.app).get('/api/v1/customers')).status).toBe(401);
    expect((await request(instance.app).get('/api/v1/auth/me').auth(token, { type: 'bearer' })).body.data.role).toBe('ANALYST');
  });

  it('exposes mock customer sources without accepting caller-supplied scores', async () => {
    expect((await request(instance.app).get('/api/v1/customers').auth(token, { type: 'bearer' })).body.data).toHaveLength(5);
    const finance = await request(instance.app).get('/api/v1/customers/customer-stable/open-finance').auth(token, { type: 'bearer' });
    expect(finance.body.data.source).toBe('MOCK_OPEN_FINANCE');
    const history = await request(instance.app).get('/api/v1/customers/customer-stable/credit-history').auth(token, { type: 'bearer' });
    expect(history.body.data.score).toBe(850);
    expect((await request(instance.app).get('/api/v1/customers/customer-stable').auth(token, { type: 'bearer' })).status).toBe(200);
    expect((await request(instance.app).get('/api/v1/credit-policy').auth(token, { type: 'bearer' })).body.data.version).toBe('credit-policy-v1');
    const response = await request(instance.app).post('/api/v1/credit-applications').auth(token, { type: 'bearer' }).set('idempotency-key', randomUUID()).send({ ...input, score: 1000 });
    expect(response.status).toBe(400);
  });

  it.each([
    ['customer-stable', 201, 'APPROVED'],
    ['customer-review', 201, 'MANUAL_REVIEW'],
    ['customer-restricted', 201, 'REJECTED'],
    ['customer-overcommitted', 201, 'REJECTED'],
    ['customer-no-consent', 422, undefined],
    ['customer-missing', 404, undefined]
  ])('simulates the %s scenario', async (customerId, status, decision) => {
    const response = await request(instance.app).post('/api/v1/credit-applications').auth(token, { type: 'bearer' }).set('idempotency-key', randomUUID()).send({ ...input, customerId });
    expect(response.status).toBe(status);
    if (decision) expect(response.body.data.decision.status).toBe(decision);
  });

  it('replays, detects conflicts, lists, filters and retrieves owned simulations', async () => {
    const key = randomUUID();
    const create = (payload: object) => request(instance.app).post('/api/v1/credit-applications').auth(token, { type: 'bearer' }).set('idempotency-key', key).send(payload);
    const first = await create(input);
    expect(first.headers['idempotency-replayed']).toBe('false');
    const replay = await create(input);
    expect(replay.status).toBe(200);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body).toEqual(first.body);
    expect((await create({ ...input, installments: 10 })).status).toBe(409);
    const retrieved = await request(instance.app).get(first.headers.location!).auth(token, { type: 'bearer' });
    expect(retrieved.body).toEqual(first.body);
    const list = await request(instance.app).get('/api/v1/credit-applications?status=APPROVED&customerId=customer-stable&page=1&limit=1').auth(token, { type: 'bearer' });
    expect(list.body.pagination.total).toBe(1);
    const viewer = await login('viewer@example.test', 'ViewerDemo!2026');
    expect((await request(instance.app).get(first.headers.location!).auth(viewer.body.accessToken, { type: 'bearer' })).status).toBe(404);
    expect((await request(instance.app).get('/api/v1/credit-applications').auth(viewer.body.accessToken, { type: 'bearer' })).body.pagination.total).toBe(0);
    expect((await request(instance.app).post('/api/v1/credit-applications').auth(viewer.body.accessToken, { type: 'bearer' }).set('idempotency-key', randomUUID()).send(input)).status).toBe(403);
  });

  it('returns structured errors for unknown routes, invalid JSON and oversized payloads', async () => {
    expect((await request(instance.app).get('/missing')).status).toBe(404);
    const malformed = await request(instance.app).post('/api/v1/auth/login').set('content-type', 'application/json').send('{');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe('INVALID_JSON');
    const large = await request(instance.app).post('/api/v1/auth/login').send({ value: 'x'.repeat(17000) });
    expect(large.status).toBe(413);
    const invalid = await request(instance.app).post('/api/v1/auth/login').set('x-demo-access-key', config.DEMO_ACCESS_KEY).send({ email: 'invalid', password: '' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details).toBeDefined();
  });

  it('rejects missing keys and malformed pagination', async () => {
    expect((await request(instance.app).post('/api/v1/credit-applications').auth(token, { type: 'bearer' }).send(input)).status).toBe(400);
    for (const query of ['limit=0', 'page=-1', 'status=INVALID', 'limit=1&limit=2']) {
      expect((await request(instance.app).get(`/api/v1/credit-applications?${query}`).auth(token, { type: 'bearer' })).status).toBe(400);
    }
    for (const suffix of ['', '/open-finance', '/credit-history']) {
      expect((await request(instance.app).get(`/api/v1/customers/customer-missing${suffix}`).auth(token, { type: 'bearer' })).status).toBe(404);
    }
    expect((await request(instance.app).get('/api/v1/customers/customer-no-consent/open-finance').auth(token, { type: 'bearer' })).status).toBe(422);
  });

  it('enforces the login rate limit', async () => {
    for (let attempt = 0; attempt < 9; attempt++) await login('missing@example.test', 'wrong');
    const limited = await login();
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('hides unexpected adapter failures', async () => {
    container.openFinance.consult = async () => { throw new Error('private adapter details'); };
    const response = await request(instance.app).post('/api/v1/credit-applications').auth(token, { type: 'bearer' }).set('idempotency-key', randomUUID()).send(input);
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('private adapter details');
  });
});
