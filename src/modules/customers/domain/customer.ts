export interface Customer {
  readonly id: string;
  readonly name: string;
  readonly segment: 'STANDARD' | 'PREMIUM';
}

export interface OpenFinanceSnapshot {
  readonly customerId: string;
  readonly source: 'MOCK_OPEN_FINANCE';
  readonly asOf: string;
  readonly consent: 'GRANTED';
  readonly monthlyIncomeCents: number;
  readonly monthlyDebtCents: number;
  readonly balanceCents: number;
  readonly connectedInstitutions: readonly string[];
}

export interface CreditHistorySnapshot {
  readonly customerId: string;
  readonly source: 'MOCK_CREDIT_HISTORY';
  readonly asOf: string;
  readonly score: number;
  readonly hasRestrictions: boolean;
  readonly latePaymentsLast12Months: number;
  readonly activeContracts: number;
  readonly relationshipMonths: number;
}

export interface CustomerRepository {
  list(): readonly Customer[];
  findById(id: string): Customer | undefined;
}

export interface OpenFinanceGateway {
  consult(customerId: string): Promise<OpenFinanceSnapshot>;
}

export interface CreditHistoryGateway {
  consult(customerId: string): Promise<CreditHistorySnapshot>;
}
