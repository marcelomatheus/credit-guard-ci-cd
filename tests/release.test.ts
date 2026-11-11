import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = resolve('scripts/release.mjs');
const image = 'docker.io/example/credit-api';
const digest = `sha256:${'a'.repeat(64)}`;
const otherDigest = `sha256:${'b'.repeat(64)}`;

interface State {
  tags: Record<string, string>;
  labels: Record<string, Record<string, string>>;
  calls: string[][];
  release?: { body: string; isDraft: boolean; isPrerelease: boolean };
  registryError?: string;
  githubError?: string;
}

describe('versioned image and GitHub Release orchestration', () => {
  let root: string;
  let revision: string;
  let state: State;

  function git(args: string[]) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  }

  function invoke(mode: string, extra: Record<string, string> = {}) {
    writeFileSync(join(root, 'state.json'), JSON.stringify(state));
    writeFileSync(join(root, 'output'), '');
    const result = spawnSync(process.execPath, [script, mode], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}`, TEST_STATE: join(root, 'state.json'),
        GITHUB_OUTPUT: join(root, 'output'), GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v1.2.3', GITHUB_SHA: revision,
        GITHUB_REPOSITORY: 'example/credit-api', RELEASE_VERSION: '1.2.3', RELEASE_SHA: revision,
        IMAGE: image, IMAGE_REF: `${image}@${digest}`, MAKE_LATEST: 'true', ...extra
      }
    });
    state = JSON.parse(readFileSync(join(root, 'state.json'), 'utf8')) as State;
    return { ...result, output: readFileSync(join(root, 'output'), 'utf8') };
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'credit-release-test-'));
    mkdirSync(join(root, 'bin'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '1.2.3' }));
    writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ version: '1.2.3', packages: { '': { version: '1.2.3' } } }));
    git(['init', '-b', 'main']);
    git(['config', 'user.name', 'Release Test']);
    git(['config', 'user.email', 'release@example.test']);
    git(['config', 'tag.gpgSign', 'false']);
    git(['add', '.']);
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.test', '-c', 'commit.gpgsign=false', 'commit', '-m', 'Release fixture']);
    revision = git(['rev-parse', 'HEAD']);
    git(['tag', '-a', 'v1.2.3', '-m', 'Release fixture', '--no-sign']);
    git(['update-ref', 'refs/remotes/origin/main', revision]);
    state = { tags: {}, labels: { [digest]: { 'org.opencontainers.image.revision': revision, 'org.opencontainers.image.version': '1.2.3' } }, calls: [] };
    const mock = `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(process.env.TEST_STATE, 'utf8'));
const tool = require('node:path').basename(process.argv[1]);
state.calls.push([tool, ...args]);
let output = '';
let error = '';
if (tool === 'docker') {
  if (args[0] === 'buildx' && args[2] === 'inspect') {
    const digest = state.tags[args[3]];
    if (state.registryError) error = state.registryError;
    else if (!digest) error = 'ERROR: manifest unknown';
    else output = JSON.stringify({ digest });
  } else if (args[0] === 'buildx' && args[2] === 'create') {
    state.tags[args[args.indexOf('--tag') + 1]] = args.at(-1).split('@')[1];
  } else if (args[0] === 'image') {
    output = JSON.stringify(state.labels[args[2].split('@')[1]]);
  }
} else if (args[1] === 'view') {
  if (state.githubError) error = state.githubError;
  else if (state.release) output = JSON.stringify(state.release);
  else error = 'release not found';
} else if (args[1] === 'create') {
  state.release = { body: fs.readFileSync(args[args.indexOf('--notes-file') + 1], 'utf8'), isDraft: false, isPrerelease: false };
}
fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(state));
if (error) { console.error(error); process.exit(1); }
console.log(output);
`;
    for (const binary of ['docker', 'gh']) {
      writeFileSync(join(root, 'bin', binary), mock);
      chmodSync(join(root, 'bin', binary), 0o700);
    }
  });

  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('accepts an annotated stable tag on main with matching package and lock versions', () => {
    const result = invoke('validate');
    expect(result.status, result.stderr).toBe(0);
    expect(result.output).toContain('version=1.2.3');
    expect(result.output).toContain(`revision=${revision}`);
  });

  it.each(['main', 'v01.2.3', 'v1.2.3-rc.1', 'v1.2.3+build.1', 'v1.2.4'])('rejects invalid or mismatched release reference %s', (tag) => {
    expect(invoke('validate', { GITHUB_REF_NAME: tag }).status).not.toBe(0);
  });

  it('rejects branch dispatches, stale lockfiles and commits outside main', () => {
    expect(invoke('validate', { GITHUB_REF_TYPE: 'branch' }).status).not.toBe(0);
    writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ version: '1.2.3', packages: { '': { version: '1.2.2' } } }));
    expect(invoke('validate').status).not.toBe(0);
    git(['checkout', '--', 'package-lock.json']);
    git(['checkout', '-b', 'unmerged']);
    writeFileSync(join(root, 'unmerged'), 'change');
    git(['add', 'unmerged']);
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.test', '-c', 'commit.gpgsign=false', 'commit', '-m', 'Unmerged change']);
    git(['tag', '-f', 'v1.2.3']);
    expect(invoke('validate', { GITHUB_SHA: git(['rev-parse', 'HEAD']) }).status).not.toBe(0);
  });

  it('builds only when the version is absent and fails closed on registry errors', () => {
    expect(invoke('resolve').output).toContain('reuse=false');
    state.registryError = 'ERROR: failed to authorize: HTTP 403';
    expect(invoke('resolve').status).not.toBe(0);
  });

  it('reuses a version digest only when its commit and version labels match', () => {
    state.tags[`${image}:1.2.3`] = digest;
    expect(invoke('resolve').output).toContain(`image_ref=${image}@${digest}`);
    state.labels[digest]!['org.opencontainers.image.revision'] = 'f'.repeat(40);
    expect(invoke('resolve').status).not.toBe(0);
    state.labels[digest]!['org.opencontainers.image.revision'] = revision;
    state.labels[digest]!['org.opencontainers.image.version'] = '1.2.2';
    expect(invoke('resolve').status).not.toBe(0);
  });

  it('promotes the verified digest idempotently and refuses to overwrite another digest', () => {
    expect(invoke('promote').status).toBe(0);
    expect(state.tags[`${image}:1.2.3`]).toBe(digest);
    const count = state.calls.filter(call => call.includes('create')).length;
    expect(invoke('promote').status).toBe(0);
    expect(state.calls.filter(call => call.includes('create'))).toHaveLength(count);
    state.tags[`${image}:1.2.3`] = otherDigest;
    expect(invoke('promote').status).not.toBe(0);
  });

  it('updates latest to the deployed digest and preserves a newer latest version', () => {
    state.tags[`${image}:1.2.3`] = digest;
    expect(invoke('latest').output).toContain('make_latest=true');
    expect(state.tags[`${image}:latest`]).toBe(digest);
    state.tags[`${image}:latest`] = otherDigest;
    state.labels[otherDigest] = { 'org.opencontainers.image.version': '1.10.0' };
    expect(invoke('latest').output).toContain('make_latest=false');
    expect(state.tags[`${image}:latest`]).toBe(otherDigest);
  });

  it('records the exact deployed digest and commit in a release and verifies retries', () => {
    const result = invoke('publish');
    expect(result.status, result.stderr).toBe(0);
    expect(state.release!.body).toContain(`Image: \`${image}@${digest}\``);
    expect(state.release!.body).toContain(`Commit: \`${revision}\``);
    expect(state.calls.find(call => call[0] === 'gh' && call.includes('create'))).toContain('--verify-tag');
    expect(invoke('publish').status).toBe(0);
    expect(state.calls.filter(call => call[0] === 'gh' && call.includes('create'))).toHaveLength(1);
    state.release!.body = 'Another artifact';
    expect(invoke('publish').status).not.toBe(0);
  });

  it('does not create a release when GitHub returns a permission error', () => {
    state.githubError = 'HTTP 403: Resource not accessible';
    expect(invoke('publish').status).not.toBe(0);
    expect(state.calls.some(call => call[0] === 'gh' && call.includes('create'))).toBe(false);
  });

  it('includes version-specific release notes before the verified artifact metadata', () => {
    mkdirSync(join(root, 'docs', 'releases'), { recursive: true });
    const highlights = '# v1.2.3\n\nFirst release with mock credit analysis.';
    writeFileSync(join(root, 'docs', 'releases', 'v1.2.3.md'), highlights);
    writeFileSync(join(root, 'docs', 'releases', 'v1.2.2.md'), 'Older release notes');
    const result = invoke('publish');
    expect(result.status, result.stderr).toBe(0);
    expect(state.release!.body.startsWith(`${highlights}\n\n## Deployment artifact\n\n`)).toBe(true);
    expect(state.release!.body).toContain(`Commit: \`${revision}\``);
    expect(state.release!.body).toContain(`Image: \`${image}@${digest}\``);
    expect(state.release!.body).not.toContain('Older release notes');
  });
});
