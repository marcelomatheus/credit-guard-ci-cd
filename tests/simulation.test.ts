import { beforeEach, describe, expect, it } from 'vitest';
import { SimulateCredit } from '../src/modules/credit-analysis/application/simulate-credit.js';
import { InMemoryCreditApplicationRepository } from '../src/infrastructure/memory/in-memory-credit-application-repository.js';
import { MockCreditHistoryGateway, MockCustomerRepository, MockOpenFinanceGateway } from '../src/infrastructure/mocks/mock-adapters.js';

describe('in-memory simulations', () => {
  let now: number;
  let repository: InMemoryCreditApplicationRepository;
  let useCase: SimulateCredit;
  const input = { customerId: 'customer-stable', amountCents: 100000, installments: 12 };

  beforeEach(() => {
    now = Date.parse('2026-11-09T12:00:00Z');
    repository = new InMemoryCreditApplicationRepository(2, () => now);
    useCase = new SimulateCredit(new MockCustomerRepository(), new MockOpenFinanceGateway(), new MockCreditHistoryGateway(), repository, 60, () => now);
  });

  it('atomically deduplicates concurrent requests', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => useCase.execute(input, 'analyst', 'same-key')));
    expect(new Set(results.map((result) => result.application.id)).size).toBe(1);
    expect(results.filter((result) => !result.replayed)).toHaveLength(1);
    expect(repository.list({ userId: 'analyst', page: 1, limit: 20 }).total).toBe(1);
  });

  it('rejects both sequential and concurrent idempotency conflicts', async () => {
    const settled = await Promise.allSettled([
      useCase.execute(input, 'analyst', 'same-key'),
      useCase.execute({ ...input, amountCents: 200000 }, 'analyst', 'same-key')
    ]);
    expect(settled.filter((item) => item.status === 'fulfilled')).toHaveLength(1);
    await expect(useCase.execute({ ...input, installments: 10 }, 'analyst', 'same-key')).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });

  it('scopes idempotency and retrieval to each user', async () => {
    const a = await useCase.execute(input, 'a', 'same-key');
    const b = await useCase.execute(input, 'b', 'same-key');
    expect(a.application.id).not.toBe(b.application.id);
    expect(repository.findById(a.application.id, 'b')).toBeUndefined();
    expect(repository.list({ userId: 'b', page: 1, limit: 20 }).total).toBe(1);
  });

  it('expires records and idempotency keys together at the TTL boundary', async () => {
    const first = await useCase.execute(input, 'analyst', 'same-key');
    now += 59999;
    expect((await useCase.execute(input, 'analyst', 'same-key')).replayed).toBe(true);
    now += 1;
    expect(repository.findById(first.application.id, 'analyst')).toBeUndefined();
    expect((await useCase.execute(input, 'analyst', 'same-key')).replayed).toBe(false);
  });

  it('preserves unexpired keys when capacity is reached', async () => {
    await useCase.execute(input, 'analyst', 'first-key');
    await useCase.execute(input, 'analyst', 'second-key');
    await expect(useCase.execute(input, 'analyst', 'third-key')).rejects.toMatchObject({ status: 503 });
    expect((await useCase.execute(input, 'analyst', 'first-key')).replayed).toBe(true);
    now += 60000;
    expect((await useCase.execute(input, 'analyst', 'third-key')).replayed).toBe(false);
  });

  it('filters and paginates by customer and decision', async () => {
    await useCase.execute(input, 'analyst', 'first-key');
    await useCase.execute({ ...input, customerId: 'customer-restricted' }, 'analyst', 'second-key');
    expect(repository.list({ userId: 'analyst', page: 1, limit: 1 }).items).toHaveLength(1);
    expect(repository.list({ userId: 'analyst', page: 1, limit: 20, status: 'REJECTED' }).total).toBe(1);
    expect(repository.list({ userId: 'analyst', page: 1, limit: 20, customerId: 'customer-stable' }).total).toBe(1);
    expect(repository.list({ userId: 'analyst', page: 3, limit: 1 }).items).toEqual([]);
  });

  it('does not expose mutable repository state', async () => {
    const first = await useCase.execute(input, 'analyst', 'first-key');
    Reflect.set(first.application.customer, 'name', 'Changed');
    expect(repository.findById(first.application.id, 'analyst')!.customer.name).toBe('Alex Morgan');
  });

  it('rejects absent customers and missing Open Finance consent', async () => {
    await expect(useCase.execute({ ...input, customerId: 'customer-missing' }, 'analyst', 'first-key')).rejects.toMatchObject({ status: 404 });
    await expect(useCase.execute({ ...input, customerId: 'customer-no-consent' }, 'analyst', 'second-key')).rejects.toMatchObject({ status: 422 });
  });
});
