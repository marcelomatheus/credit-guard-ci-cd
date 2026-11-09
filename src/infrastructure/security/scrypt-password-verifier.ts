import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordVerifier } from '../../modules/identity/domain/user.js';

const derive = promisify(scrypt);

export class ScryptPasswordVerifier implements PasswordVerifier {
  async verify(password: string, hash: string) {
    const [salt, encoded] = hash.split(':');
    if (!salt || !encoded || !/^[a-f0-9]{128}$/.test(encoded)) return false;
    const actual = await derive(password, salt, 64) as Buffer;
    return timingSafeEqual(actual, Buffer.from(encoded, 'hex'));
  }
}
