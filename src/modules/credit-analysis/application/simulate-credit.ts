import { createHash, randomUUID } from 'node:crypto';
import { ApplicationError } from '../../../shared/application-error.js';
import type { CreditHistoryGateway, CustomerRepository, OpenFinanceGateway } from '../../customers/domain/customer.js';
import type { CreditApplicationRepository, StoredApplication } from '../domain/credit-application.js';
import { analyzeCredit } from '../domain/credit-policy.js';
import type { CreditRequest } from '../domain/credit-policy.js';

export class SimulateCredit {
  constructor(
    private readonly customers: CustomerRepository,
    private readonly finance: OpenFinanceGateway,
    private readonly history: CreditHistoryGateway,
    private readonly applications: CreditApplicationRepository,
    private readonly ttlSeconds: number,
    private readonly now: () => number = Date.now
  ) {}

  async execute(request: CreditRequest, userId: string, idempotencyKey: string): Promise<StoredApplication> {
    const key = `${userId}:${idempotencyKey}`;
    const fingerprint = createHash('sha256').update(JSON.stringify({ customerId: request.customerId, amountCents: request.amountCents, installments: request.installments })).digest('hex');
    const existing = this.applications.findByIdempotencyKey(key, fingerprint);
    if (existing) return { application: existing, replayed: true };
    const customer = this.customers.findById(request.customerId);
    if (!customer) throw new ApplicationError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
    const [openFinance, creditHistory] = await Promise.all([
      this.finance.consult(customer.id),
      this.history.consult(customer.id)
    ]);
    const createdAt = this.now();
    return this.applications.saveOnce(key, fingerprint, {
      id: randomUUID(),
      createdAt: new Date(createdAt).toISOString(),
      expiresAt: new Date(createdAt + this.ttlSeconds * 1000).toISOString(),
      createdBy: userId,
      customer,
      request,
      openFinance,
      creditHistory,
      decision: analyzeCredit(request, openFinance, creditHistory)
    });
  }
}
