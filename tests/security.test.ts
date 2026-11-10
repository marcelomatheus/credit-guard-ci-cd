import { describe, expect, it } from 'vitest';
import { loadConfiguration } from '../src/infrastructure/config.js';
import { ScryptPasswordVerifier } from '../src/infrastructure/security/scrypt-password-verifier.js';
import { users } from '../src/infrastructure/mocks/fixtures.js';

describe('configuration and credential safety', () => {
  it('uses port 3016 by default and honors an explicit runtime port', () => {
    const environment = { JWT_SECRET: 'a13df6b90e728c5419deac04f63875b2', DEMO_ACCESS_KEY: 'e04c651d98627fa34bd570aec9813f60' };
    expect(loadConfiguration(environment).PORT).toBe(3016);
    expect(loadConfiguration({ ...environment, PORT: '3017' }).PORT).toBe(3017);
  });

  it('requires configured secrets and validates runtime bounds without leaking values', () => {
    expect(() => loadConfiguration({})).toThrow('JWT_SECRET, DEMO_ACCESS_KEY');
    expect(() => loadConfiguration({ JWT_SECRET: 'private', DEMO_ACCESS_KEY: 'private' })).toThrow('Invalid environment');
    expect(() => loadConfiguration({ JWT_SECRET: 'private', DEMO_ACCESS_KEY: 'private' })).not.toThrow('private');
  });

  it('rejects development or trivial secrets in production', () => {
    expect(() => loadConfiguration({ NODE_ENV: 'production', JWT_SECRET: 'local-only-secret-replace-before-deploy-2026', DEMO_ACCESS_KEY: 'local-demo-access-key' })).toThrow();
    expect(() => loadConfiguration({ NODE_ENV: 'production', JWT_SECRET: 'x'.repeat(64), DEMO_ACCESS_KEY: 'x'.repeat(64) })).toThrow();
    expect(loadConfiguration({ NODE_ENV: 'production', JWT_SECRET: 'a13df6b90e728c5419deac04f63875b2', DEMO_ACCESS_KEY: 'e04c651d98627fa34bd570aec9813f60' }).NODE_ENV).toBe('production');
  });

  it('verifies hashed fixtures and rejects malformed hashes', async () => {
    const passwords = new ScryptPasswordVerifier();
    expect(await passwords.verify('AnalystDemo!2026', users[0]!.passwordHash)).toBe(true);
    expect(await passwords.verify('incorrect', users[0]!.passwordHash)).toBe(false);
    expect(await passwords.verify('incorrect', 'invalid')).toBe(false);
    expect(await passwords.verify('incorrect', 'salt:invalid')).toBe(false);
  });
});
