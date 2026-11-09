import { ApplicationError } from '../../shared/application-error.js';
import type { ApplicationQuery, CreditApplication, CreditApplicationRepository } from '../../modules/credit-analysis/domain/credit-application.js';

interface Entry {
  application: CreditApplication;
  key: string;
  fingerprint: string;
}

export class InMemoryCreditApplicationRepository implements CreditApplicationRepository {
  private readonly entries = new Map<string, Entry>();
  private readonly keys = new Map<string, string>();

  constructor(private readonly maximum: number, private readonly now: () => number = Date.now) {}

  private prune() {
    for (const [id, entry] of this.entries) {
      if (Date.parse(entry.application.expiresAt) <= this.now()) {
        this.entries.delete(id);
        this.keys.delete(entry.key);
      }
    }
  }

  findById(id: string, userId: string) {
    this.prune();
    const entry = this.entries.get(id);
    return entry?.application.createdBy === userId ? structuredClone(entry.application) : undefined;
  }

  findByIdempotencyKey(key: string, fingerprint: string) {
    this.prune();
    const id = this.keys.get(key);
    const entry = id ? this.entries.get(id) : undefined;
    if (entry && entry.fingerprint !== fingerprint) {
      throw new ApplicationError('IDEMPOTENCY_CONFLICT', 'This idempotency key was already used with another payload', 409);
    }
    return entry ? structuredClone(entry.application) : undefined;
  }

  saveOnce(key: string, fingerprint: string, application: CreditApplication) {
    const existing = this.findByIdempotencyKey(key, fingerprint);
    if (existing) return { application: existing, replayed: true };
    if (this.entries.size >= this.maximum) {
      throw new ApplicationError('SIMULATION_CAPACITY_REACHED', 'The in-memory simulation capacity has been reached; retry after records expire', 503);
    }
    this.entries.set(application.id, { application: structuredClone(application), key, fingerprint });
    this.keys.set(key, application.id);
    return { application: structuredClone(application), replayed: false };
  }

  list(query: ApplicationQuery) {
    this.prune();
    const items = [...this.entries.values()]
      .map((entry) => entry.application)
      .filter((item) => item.createdBy === query.userId)
      .filter((item) => !query.customerId || item.customer.id === query.customerId)
      .filter((item) => !query.status || item.decision.status === query.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    return { items: structuredClone(items.slice((query.page - 1) * query.limit, query.page * query.limit)), total: items.length };
  }
}
