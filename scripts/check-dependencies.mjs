import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
const deprecated = Object.entries(lock.packages)
  .filter(([, entry]) => entry.deprecated)
  .map(([path, entry]) => `${path}@${entry.version}: ${entry.deprecated}`);
assert.equal(deprecated.length, 0, `Deprecated locked packages:\n${deprecated.join('\n')}`);
const runtime = readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8').trim();
const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
assert.match(runtime, /^22\.\d+\.\d+$/);
assert.ok(dockerfile.startsWith(`FROM node:${runtime}-`), 'Docker and .nvmrc must use the same Node 22 version');
assert.match(lock.packages['node_modules/@types/node'].version, /^22\./, 'Node typings must target the deployed runtime');
console.log('Locked packages have no deprecations; Node runtime and typings are aligned');
