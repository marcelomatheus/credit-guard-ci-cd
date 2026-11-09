export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: 'ANALYST' | 'VIEWER';
  readonly passwordHash: string;
}

export type PublicUser = Omit<User, 'passwordHash'>;

export interface UserRepository {
  findByEmail(email: string): User | undefined;
  findById(id: string): User | undefined;
}

export interface PasswordVerifier {
  verify(password: string, hash: string): Promise<boolean>;
}

export interface TokenService {
  issue(user: PublicUser): Promise<string>;
  verify(token: string): Promise<string>;
}

export function publicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
