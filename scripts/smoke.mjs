import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = (process.env.BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? '3016'}`).replace(/\/$/, '');
const key = process.env.DEMO_ACCESS_KEY;
assert.ok(key, 'DEMO_ACCESS_KEY is required');

async function call(path, options = {}, expectedStatus = 200) {
  const response = await fetch(`${base}${path}`, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}`);
  return response.json();
}

await call('/health/live');
await call('/health/ready');
const version = await call('/version');
assert.match(version.node, /^22\./);
if (process.env.EXPECTED_SHA) assert.equal(version.commit, process.env.EXPECTED_SHA);
const login = await call('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-demo-access-key': key },
  body: JSON.stringify({ email: 'analyst@example.test', password: 'AnalystDemo!2026' })
});
assert.ok(login.accessToken);
const authorization = `Bearer ${login.accessToken}`;
const customers = await call('/api/v1/customers', { headers: { authorization } });
assert.equal(customers.data.length, 5);
for (const [customerId, status] of [['customer-stable', 'APPROVED'], ['customer-review', 'MANUAL_REVIEW'], ['customer-restricted', 'REJECTED']]) {
  const options = {
    method: 'POST',
    headers: { authorization, 'content-type': 'application/json', 'idempotency-key': randomUUID() },
    body: JSON.stringify({ customerId, amountCents: 100000, installments: 12 })
  };
  const result = await call('/api/v1/credit-applications', options, 201);
  assert.equal(result.data.decision.status, status);
  const replay = await call('/api/v1/credit-applications', options);
  assert.deepEqual(result, replay);
  const saved = await call(`/api/v1/credit-applications/${result.data.id}`, { headers: { authorization } });
  assert.deepEqual(saved, result);
}
console.log(JSON.stringify({ status: 'passed', commit: version.commit, checks: ['readiness', 'node22', 'version', 'authentication', 'customers', 'approval', 'review', 'rejection', 'idempotency', 'retrieval'] }));
