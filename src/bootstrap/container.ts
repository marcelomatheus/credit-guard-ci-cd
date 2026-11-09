import type { Configuration } from '../infrastructure/config.js';
import { MockCreditHistoryGateway, MockCustomerRepository, MockOpenFinanceGateway, MockUserRepository } from '../infrastructure/mocks/mock-adapters.js';
import { users } from '../infrastructure/mocks/fixtures.js';
import { InMemoryCreditApplicationRepository } from '../infrastructure/memory/in-memory-credit-application-repository.js';
import { JwtTokenService } from '../infrastructure/security/jwt-token-service.js';
import { ScryptPasswordVerifier } from '../infrastructure/security/scrypt-password-verifier.js';
import { AuthenticateUser } from '../modules/identity/application/authenticate-user.js';
import { SimulateCredit } from '../modules/credit-analysis/application/simulate-credit.js';

export function createContainer(configuration: Configuration) {
  const userRepository = new MockUserRepository();
  const customers = new MockCustomerRepository();
  const openFinance = new MockOpenFinanceGateway();
  const creditHistory = new MockCreditHistoryGateway();
  const applications = new InMemoryCreditApplicationRepository(configuration.MEMORY_MAX_APPLICATIONS);
  const tokens = new JwtTokenService(configuration.JWT_SECRET, configuration.TOKEN_TTL_SECONDS);
  return {
    users: userRepository,
    customers,
    openFinance,
    creditHistory,
    applications,
    tokens,
    authenticate: new AuthenticateUser(userRepository, new ScryptPasswordVerifier(), tokens, users[0]!.passwordHash, configuration.TOKEN_TTL_SECONDS),
    simulate: new SimulateCredit(customers, openFinance, creditHistory, applications, configuration.MEMORY_TTL_SECONDS)
  };
}

export type Container = ReturnType<typeof createContainer>;
