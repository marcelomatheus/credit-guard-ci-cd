import type { Customer, CreditHistorySnapshot, OpenFinanceSnapshot } from '../../modules/customers/domain/customer.js';
import type { User } from '../../modules/identity/domain/user.js';

export const users: readonly User[] = [
  {
    id: 'user-analyst',
    email: 'analyst@example.test',
    name: 'Demo Analyst',
    role: 'ANALYST',
    passwordHash: 'credit-analyst-demo-2026:c3291d68b453c00a7a6a5e62d54f1bb615163ba33ff2b21f2ffb893bfafea9c94c990f0e5c2a2a1bab7c605bc2a8788166d9a7d3f3f525fc65f50d634f6b7aa1'
  },
  {
    id: 'user-viewer',
    email: 'viewer@example.test',
    name: 'Demo Viewer',
    role: 'VIEWER',
    passwordHash: 'credit-viewer-demo-2026:be46d346a1f43bc3636af343f3fd35bf01cc24d316716b0e9c855541b582a6d0010f6a9b6b17f8c9ef86b15d2b74d00fd752961ca394729e689b9e80e95bb82d'
  }
];

export const customers: readonly Customer[] = [
  { id: 'customer-stable', name: 'Alex Morgan', segment: 'PREMIUM' },
  { id: 'customer-review', name: 'Jordan Taylor', segment: 'STANDARD' },
  { id: 'customer-restricted', name: 'Casey Parker', segment: 'STANDARD' },
  { id: 'customer-overcommitted', name: 'Riley Adams', segment: 'STANDARD' },
  { id: 'customer-no-consent', name: 'Sam Walker', segment: 'STANDARD' }
];

const asOf = '2026-11-01T00:00:00.000Z';

export const openFinanceSnapshots: readonly OpenFinanceSnapshot[] = [
  { customerId: 'customer-stable', source: 'MOCK_OPEN_FINANCE', asOf, consent: 'GRANTED', monthlyIncomeCents: 800_000, monthlyDebtCents: 50_000, balanceCents: 2_400_000, connectedInstitutions: ['Demo Bank A', 'Demo Bank B'] },
  { customerId: 'customer-review', source: 'MOCK_OPEN_FINANCE', asOf, consent: 'GRANTED', monthlyIncomeCents: 450_000, monthlyDebtCents: 40_000, balanceCents: 300_000, connectedInstitutions: ['Demo Bank A'] },
  { customerId: 'customer-restricted', source: 'MOCK_OPEN_FINANCE', asOf, consent: 'GRANTED', monthlyIncomeCents: 400_000, monthlyDebtCents: 20_000, balanceCents: 50_000, connectedInstitutions: ['Demo Bank B'] },
  { customerId: 'customer-overcommitted', source: 'MOCK_OPEN_FINANCE', asOf, consent: 'GRANTED', monthlyIncomeCents: 350_000, monthlyDebtCents: 110_000, balanceCents: 10_000, connectedInstitutions: ['Demo Bank C'] }
];

export const creditHistories: readonly CreditHistorySnapshot[] = [
  { customerId: 'customer-stable', source: 'MOCK_CREDIT_HISTORY', asOf, score: 850, hasRestrictions: false, latePaymentsLast12Months: 0, activeContracts: 1, relationshipMonths: 48 },
  { customerId: 'customer-review', source: 'MOCK_CREDIT_HISTORY', asOf, score: 620, hasRestrictions: false, latePaymentsLast12Months: 2, activeContracts: 2, relationshipMonths: 18 },
  { customerId: 'customer-restricted', source: 'MOCK_CREDIT_HISTORY', asOf, score: 410, hasRestrictions: true, latePaymentsLast12Months: 5, activeContracts: 3, relationshipMonths: 8 },
  { customerId: 'customer-overcommitted', source: 'MOCK_CREDIT_HISTORY', asOf, score: 760, hasRestrictions: false, latePaymentsLast12Months: 0, activeContracts: 4, relationshipMonths: 36 },
  { customerId: 'customer-no-consent', source: 'MOCK_CREDIT_HISTORY', asOf, score: 730, hasRestrictions: false, latePaymentsLast12Months: 0, activeContracts: 0, relationshipMonths: 12 }
];
