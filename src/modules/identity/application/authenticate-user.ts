import { ApplicationError } from '../../../shared/application-error.js';
import { publicUser } from '../domain/user.js';
import type { PasswordVerifier, TokenService, UserRepository } from '../domain/user.js';

export class AuthenticateUser {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordVerifier,
    private readonly tokens: TokenService,
    private readonly dummyHash: string,
    private readonly expiresIn: number
  ) {}

  async execute(email: string, password: string) {
    const user = this.users.findByEmail(email);
    const valid = await this.passwords.verify(password, user?.passwordHash ?? this.dummyHash);
    if (!user || !valid) {
      throw new ApplicationError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }
    const profile = publicUser(user);
    return {
      accessToken: await this.tokens.issue(profile),
      tokenType: 'Bearer',
      expiresIn: this.expiresIn,
      user: profile
    };
  }
}
