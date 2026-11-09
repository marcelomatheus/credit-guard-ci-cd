import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const revision = 'a'.repeat(40);
const olderRevision = 'b'.repeat(40);
const image = `docker.io/example/credit-api@sha256:${'c'.repeat(64)}`;
const candidateId = `${revision}-200-1`;
const previousId = `${olderRevision}-100-1`;

describe('deployment orchestration with a simulated Docker CLI', () => {
  let root: string;
  let bin: string;
  let log: string;

  function release(id: string) {
    const path = join(root, 'releases', id);
    mkdirSync(path, { recursive: true });
    copyFileSync('compose.production.yaml', join(path, 'compose.yaml'));
    writeFileSync(join(path, 'release.env'), `IMAGE_REF=${image}\n`);
    return path;
  }

  function invoke(script: string, args: string[], extra: Record<string, string> = {}) {
    return spawnSync('bash', [`scripts/${script}`, root, ...args], {
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, DOCKER_LOG: log, MOCK_REVISION: revision, ...extra },
      encoding: 'utf8'
    });
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'credit-deploy-'));
    bin = join(root, 'bin');
    log = join(root, 'docker.log');
    mkdirSync(bin);
    mkdirSync(join(root, 'shared'));
    writeFileSync(join(root, 'shared/runtime.env'), 'JWT_SECRET=private\nDEMO_ACCESS_KEY=private\n');
    chmodSync(join(root, 'shared/runtime.env'), 0o600);
    writeFileSync(join(bin, 'docker'), `printf '%s\\n' "$*" >> "$DOCKER_LOG"
if [[ "$1" == image ]]; then printf '%s\\n' "$MOCK_REVISION"; exit 0; fi
manifest=''
operation=''
while [[ $# -gt 0 ]]; do
  if [[ "$1" == -f ]]; then manifest=$2; shift 2; continue; fi
  case "$1" in up|exec|pull|config|logs|stop) operation=$1; break;; esac
  shift
done
if [[ -n "\u0024{FAIL_RELEASE:-}" && "$manifest" == *"$FAIL_RELEASE"* && "$operation" == "\u0024{FAIL_OPERATION:-up}" ]]; then exit 19; fi
exit 0
`);
    chmodSync(join(bin, 'docker'), 0o700);
    release(candidateId);
    symlinkSync(release(previousId), join(root, 'current'));
  });

  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it('activates a digest, checks its revision and preserves the previous release', () => {
    const result = invoke('deploy.sh', [candidateId, image]);
    expect(result.status, result.stderr).toBe(0);
    expect(readlinkSync(join(root, 'current'))).toBe(join(root, 'releases', candidateId));
    expect(readlinkSync(join(root, 'previous'))).toBe(join(root, 'releases', previousId));
    const calls = readFileSync(log, 'utf8');
    expect(calls).toContain('pull api');
    expect(calls).toContain('up -d --no-build --pull never --wait');
    expect(calls).toContain(`EXPECTED_SHA=${revision}`);
    expect(calls).not.toContain('--build');
    expect(calls).not.toContain('prune');
  });

  it.each(['up', 'exec'])('restores the previous release when candidate %s fails', (operation) => {
    const result = invoke('deploy.sh', [candidateId, image], { FAIL_RELEASE: candidateId, FAIL_OPERATION: operation });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Previous release restored');
    expect(readlinkSync(join(root, 'current'))).toBe(join(root, 'releases', previousId));
    expect(readFileSync(log, 'utf8')).toContain(`EXPECTED_SHA=${olderRevision}`);
  });

  it('fails visibly if the candidate and recovery both fail', () => {
    const result = invoke('deploy.sh', [candidateId, image], { FAIL_RELEASE: root, FAIL_OPERATION: 'up' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('ROLLBACK FAILED');
  });

  it('stops an unhealthy first release when rollback is unavailable', () => {
    rmSync(join(root, 'current'));
    const result = invoke('deploy.sh', [candidateId, image], { FAIL_RELEASE: candidateId });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('No previous release');
    expect(readFileSync(log, 'utf8')).toContain('stop api');
    expect(existsSync(join(root, 'current'))).toBe(false);
  });

  it('rejects mutable tags, invalid identifiers and mismatched image revisions', () => {
    expect(invoke('deploy.sh', [candidateId, 'example/credit-api:latest']).status).not.toBe(0);
    expect(invoke('deploy.sh', ['../../escape', image]).status).not.toBe(0);
    expect(invoke('deploy.sh', [candidateId, image], { MOCK_REVISION: olderRevision }).status).not.toBe(0);
    expect(readlinkSync(join(root, 'current'))).toBe(join(root, 'releases', previousId));
  });

  it('requires private runtime file permissions', () => {
    chmodSync(join(root, 'shared/runtime.env'), 0o644);
    const result = invoke('deploy.sh', [candidateId, image]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('mode 600');
  });

  it('performs a manual rollback and retains the displaced release', () => {
    symlinkSync(join(root, 'releases', candidateId), join(root, 'previous'));
    const result = invoke('rollback.sh', []);
    expect(result.status, result.stderr).toBe(0);
    expect(readlinkSync(join(root, 'current'))).toBe(join(root, 'releases', candidateId));
    expect(readlinkSync(join(root, 'previous'))).toBe(join(root, 'releases', previousId));
  });

  it('recovers the current release when manual rollback fails', () => {
    const result = invoke('rollback.sh', [candidateId], { FAIL_RELEASE: candidateId });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Current release recovered');
    expect(readlinkSync(join(root, 'current'))).toBe(join(root, 'releases', previousId));
  });

  it('does not execute shell syntax supplied as an image reference', () => {
    const marker = join(root, 'injected');
    const result = invoke('deploy.sh', [candidateId, `$(touch ${marker})`]);
    expect(result.status).not.toBe(0);
    expect(existsSync(marker)).toBe(false);
  });

  it('keeps every deployment script syntactically valid Bash', () => {
    for (const script of ['deploy.sh', 'rollback.sh', 'release-common.sh', 'prepare-ssh.sh', 'test-image.sh', 'install-actionlint.sh']) {
      expect(() => execFileSync('bash', ['-n', `scripts/${script}`])).not.toThrow();
    }
  });
});
