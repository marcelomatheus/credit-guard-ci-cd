import type { Customer, CreditHistorySnapshot, OpenFinanceSnapshot } from '../../customers/domain/customer.js';
import type { CreditDecision, CreditRequest } from './credit-policy.js';

export interface CreditApplication {
  readonly id: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly createdBy: string;
  readonly customer: Customer;
  readonly request: CreditRequest;
  readonly openFinance: OpenFinanceSnapshot;
  readonly creditHistory: CreditHistorySnapshot;
  readonly decision: CreditDecision;
}

export interface StoredApplication {
  readonly application: CreditApplication;
  readonly replayed: boolean;
}

export interface ApplicationQuery {
  readonly userId: string;
  readonly page: number;
  readonly limit: number;
  readonly customerId?: string | undefined;
  readonly status?: CreditDecision['status'] | undefined;
}

export interface CreditApplicationRepository {
  findById(id: string, userId: string): CreditApplication | undefined;
  findByIdempotencyKey(key: string, fingerprint: string): CreditApplication | undefined;
  saveOnce(key: string, fingerprint: string, application: CreditApplication): StoredApplication;
  list(query: ApplicationQuery): { items: readonly CreditApplication[]; total: number };
}
