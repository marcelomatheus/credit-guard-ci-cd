import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const stableVersion = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;
const revisionPattern = /^[a-f0-9]{40}$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const environment = process.env;
const mode = process.argv[2];

function run(binary, args) {
  return execFileSync(binary, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function output(name, value) {
  assert.ok(environment.GITHUB_OUTPUT, 'GITHUB_OUTPUT is required');
  appendFileSync(environment.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function inspect(reference) {
  const result = spawnSync('docker', ['buildx', 'imagetools', 'inspect', reference, '--format', '{{json .Manifest}}'], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (/manifest unknown|no such manifest|\bnot found\b/i.test(result.stderr)) return null;
    throw new Error(`Registry inspection failed: ${result.stderr.trim()}`);
  }
  const digest = JSON.parse(result.stdout).digest;
  assert.match(digest, digestPattern, 'Invalid registry digest');
  return digest;
}

function labels(reference) {
  run('docker', ['pull', reference]);
  return JSON.parse(run('docker', ['image', 'inspect', reference, '--format', '{{json .Config.Labels}}']));
}

function tagImage(reference, tag) {
  run('docker', ['buildx', 'imagetools', 'create', '--prefer-index=false', '--tag', tag, reference]);
  assert.equal(inspect(tag), reference.split('@')[1], 'Promoted tag does not match the verified digest');
}

function validate() {
  assert.equal(environment.GITHUB_REF_TYPE, 'tag', 'Run this workflow on a vMAJOR.MINOR.PATCH tag');
  const tag = environment.GITHUB_REF_NAME ?? '';
  assert.ok(tag.startsWith('v') && stableVersion.test(tag.slice(1)), 'Only stable vMAJOR.MINOR.PATCH tags are supported');
  const version = tag.slice(1);
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  assert.equal(manifest.version, version, 'Git tag and package.json versions differ');
  assert.equal(lock.version, version, 'Git tag and package-lock.json versions differ');
  assert.equal(lock.packages?.['']?.version, version, 'Root lockfile package version differs');
  const revision = run('git', ['rev-parse', 'HEAD']);
  assert.match(revision, revisionPattern);
  assert.equal(revision, environment.GITHUB_SHA, 'Checkout does not match the workflow revision');
  assert.equal(run('git', ['rev-parse', `refs/tags/${tag}^{commit}`]), revision, 'Git tag has moved');
  run('git', ['merge-base', '--is-ancestor', revision, 'origin/main']);
  output('version', version);
  output('tag', tag);
  output('revision', revision);
}

function imageContext() {
  const version = environment.RELEASE_VERSION ?? '';
  const revision = environment.RELEASE_SHA ?? '';
  const image = environment.IMAGE ?? '';
  assert.match(version, stableVersion);
  assert.match(revision, revisionPattern);
  assert.match(image, /^docker\.io\/[a-z0-9][a-z0-9_-]*\/[a-z0-9][a-z0-9._-]*$/);
  return { version, revision, image, tag: `v${version}` };
}

function imageReference(image) {
  const reference = environment.IMAGE_REF ?? '';
  assert.ok(reference.startsWith(`${image}@`), 'Unexpected image repository');
  assert.match(reference.slice(image.length + 1), digestPattern);
  return reference;
}

function resolve() {
  const { version, revision, image } = imageContext();
  const digest = inspect(`${image}:${version}`);
  if (!digest) {
    output('reuse', 'false');
    return;
  }
  const reference = `${image}@${digest}`;
  const existing = labels(reference);
  assert.equal(existing['org.opencontainers.image.revision'], revision, 'Version already belongs to another commit; bump the package version');
  assert.equal(existing['org.opencontainers.image.version'], version, 'Existing image version label differs');
  output('reuse', 'true');
  output('image_ref', reference);
}

function promote() {
  const { version, image } = imageContext();
  const reference = imageReference(image);
  const existing = inspect(`${image}:${version}`);
  assert.ok(!existing || existing === reference.split('@')[1], 'Refusing to replace an existing version digest');
  if (!existing) tagImage(reference, `${image}:${version}`);
}

function latest() {
  const { version, image } = imageContext();
  const reference = imageReference(image);
  assert.equal(inspect(`${image}:${version}`), reference.split('@')[1], 'Version tag no longer matches the release image');
  const previous = inspect(`${image}:latest`);
  if (previous) {
    const previousVersion = labels(`${image}@${previous}`)['org.opencontainers.image.version'];
    assert.match(previousVersion, stableVersion, 'Latest image has no stable version label');
    const left = previousVersion.split('.').map(BigInt);
    const right = version.split('.').map(BigInt);
    const differing = left.findIndex((part, index) => part !== right[index]);
    if (differing >= 0 && left[differing] > right[differing]) {
      output('make_latest', 'false');
      return;
    }
  }
  tagImage(reference, `${image}:latest`);
  output('make_latest', 'true');
}

function publish() {
  const { version, revision, image, tag } = imageContext();
  const reference = imageReference(image);
  const repository = environment.GITHUB_REPOSITORY ?? '';
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  const existing = spawnSync('gh', ['release', 'view', tag, '--repo', repository, '--json', 'body,isDraft,isPrerelease'], { encoding: 'utf8' });
  if (existing.error) throw existing.error;
  const commitLine = `Commit: \`${revision}\``;
  const imageLine = `Image: \`${reference}\``;
  if (existing.status === 0) {
    const release = JSON.parse(existing.stdout);
    assert.ok(!release.isDraft && !release.isPrerelease, 'Existing release is not a published stable release');
    assert.ok(release.body.split('\n').includes(commitLine) && release.body.split('\n').includes(imageLine), 'Existing GitHub Release points to another commit or image');
    console.log(`Verified existing release ${tag}`);
    return;
  }
  assert.match(existing.stderr, /release not found|HTTP 404/i, 'Unable to inspect the GitHub Release');
  const directory = mkdtempSync(join(tmpdir(), 'credit-release-'));
  try {
    const notes = join(directory, 'notes.md');
    writeFileSync(notes, `Version: \`${version}\`\n\n${commitLine}\n\nDocker tag: \`${image}:${version}\`\n\n${imageLine}\n\nThe image passed smoke tests, the vulnerability scan, VPS deployment and public route verification.\n\nPull the exact deployed artifact:\n\n\`\`\`bash\ndocker pull ${reference}\n\`\`\`\n`);
    run('gh', ['release', 'create', tag, '--repo', repository, '--verify-tag', '--title', tag, '--notes-file', notes, `--latest=${environment.MAKE_LATEST === 'true'}`]);
    console.log(`Published release ${tag}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

try {
  const commands = { validate, resolve, promote, latest, publish };
  assert.ok(Object.hasOwn(commands, mode), 'Expected validate, resolve, promote, latest or publish');
  commands[mode]();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
