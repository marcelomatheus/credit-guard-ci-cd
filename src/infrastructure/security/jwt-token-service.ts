import { randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { ApplicationError } from '../../shared/application-error.js';
import type { PublicUser, TokenService } from '../../modules/identity/domain/user.js';

export class JwtTokenService implements TokenService {
  private readonly key: Uint8Array;

  constructor(secret: string, private readonly ttlSeconds: number) {
    this.key = new TextEncoder().encode(secret);
  }

  async issue(user: PublicUser) {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(user.id)
      .setIssuer('pipeline-credit-api')
      .setAudience('pipeline-credit-api')
      .setIssuedAt()
      .setJti(randomUUID())
      .setExpirationTime(`${this.ttlSeconds}s`)
      .sign(this.key);
  }

  async verify(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'], issuer: 'pipeline-credit-api', audience: 'pipeline-credit-api', requiredClaims: ['sub', 'iat', 'exp', 'jti']
      });
      if (!payload.sub) throw new Error('Missing subject');
      return payload.sub;
    } catch {
      throw new ApplicationError('INVALID_TOKEN', 'Invalid or expired access token', 401);
    }
  }
}
