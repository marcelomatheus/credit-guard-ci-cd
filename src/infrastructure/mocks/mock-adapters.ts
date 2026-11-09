import { ApplicationError } from '../../shared/application-error.js';
import type { CustomerRepository, CreditHistoryGateway, OpenFinanceGateway } from '../../modules/customers/domain/customer.js';
import type { UserRepository } from '../../modules/identity/domain/user.js';
import { creditHistories, customers, openFinanceSnapshots, users } from './fixtures.js';

export class MockCustomerRepository implements CustomerRepository {
  list() { return structuredClone(customers); }
  findById(id: string) { return structuredClone(customers.find((customer) => customer.id === id)); }
}

export class MockUserRepository implements UserRepository {
  findByEmail(email: string) { return structuredClone(users.find((user) => user.email === email.toLowerCase())); }
  findById(id: string) { return structuredClone(users.find((user) => user.id === id)); }
}

export class MockOpenFinanceGateway implements OpenFinanceGateway {
  async consult(customerId: string) {
    if (!customers.some((customer) => customer.id === customerId)) {
      throw new ApplicationError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
    }
    const snapshot = openFinanceSnapshots.find((item) => item.customerId === customerId);
    if (!snapshot) {
      throw new ApplicationError('OPEN_FINANCE_CONSENT_REQUIRED', 'Open Finance consent is not granted for this mock customer', 422);
    }
    return structuredClone(snapshot);
  }
}

export class MockCreditHistoryGateway implements CreditHistoryGateway {
  async consult(customerId: string) {
    const history = creditHistories.find((item) => item.customerId === customerId);
    if (!history) throw new ApplicationError('CUSTOMER_NOT_FOUND', 'Customer not found', 404);
    return structuredClone(history);
  }
}
