import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
  const main = environment.GITHUB_REF_TYPE === 'branch' && environment.GITHUB_REF_NAME === 'main';
  assert.ok(main || environment.GITHUB_REF_TYPE === 'tag', 'Run this workflow on main or a stable release tag');
  const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
  const version = manifest.version;
  assert.match(version, stableVersion, 'Only stable MAJOR.MINOR.PATCH versions are supported');
  const tag = `v${version}`;
  if (!main) assert.equal(environment.GITHUB_REF_NAME, tag, 'Git tag and package.json versions differ');
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  assert.equal(lock.version, version, 'Git tag and package-lock.json versions differ');
  assert.equal(lock.packages?.['']?.version, version, 'Root lockfile package version differs');
  const revision = run('git', ['rev-parse', 'HEAD']);
  assert.match(revision, revisionPattern);
  assert.equal(revision, environment.GITHUB_SHA, 'Checkout does not match the workflow revision');
  run('git', ['merge-base', '--is-ancestor', revision, 'origin/main']);
  const result = spawnSync('git', ['rev-parse', '--quiet', '--verify', `refs/tags/${tag}^{commit}`], { encoding: 'utf8' });
  if (result.error) throw result.error;
  assert.ok(result.status === 0 || result.status === 1, 'Unable to inspect the release tag');
  const existing = result.status === 0 ? result.stdout.trim() : null;
  if (!main) assert.equal(existing, revision, 'Git tag has moved');
  const before = environment.BEFORE_SHA;
  if (main && before && !/^0+$/.test(before)) {
    assert.match(before, revisionPattern, 'Invalid previous push revision');
    const previous = JSON.parse(run('git', ['show', `${before}:package.json`]));
    assert.match(previous.version, stableVersion, 'Previous package version is invalid');
    if (previous.version !== version) {
      assert.ok(compareVersions(version, previous.version) > 0, 'The release version must increase');
      assert.ok(!existing || existing === revision, 'The new version already belongs to another commit');
    }
  }
  const publish = !main || !existing || existing === revision;
  console.log(publish ? `Release ${tag} selected` : `${tag} already exists; running CI only`);
  output('version', version);
  output('tag', tag);
  output('revision', revision);
  output('publish', String(publish));
}

function releaseIdentity() {
  const version = environment.RELEASE_VERSION ?? '';
  const revision = environment.RELEASE_SHA ?? '';
  assert.match(version, stableVersion);
  assert.match(revision, revisionPattern);
  return { version, revision, tag: `v${version}` };
}

function imageContext() {
  const identity = releaseIdentity();
  const image = environment.IMAGE ?? '';
  assert.match(image, /^docker\.io\/[a-z0-9][a-z0-9_-]*\/[a-z0-9][a-z0-9._-]*$/);
  return { ...identity, image };
}

function repositoryName() {
  const repository = environment.GITHUB_REPOSITORY ?? '';
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  return repository;
}

function remoteTagRevision(repository, tag) {
  const result = spawnSync('gh', ['api', `repos/${repository}/git/ref/tags/${tag}`], { encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    assert.match(result.stderr, /HTTP 404/i, 'Unable to inspect the remote Git tag');
    return null;
  }
  let target = JSON.parse(result.stdout).object;
  for (let depth = 0; depth < 10; depth++) {
    assert.match(target.sha, revisionPattern, 'Invalid remote Git object');
    if (target.type === 'commit') return target.sha;
    assert.equal(target.type, 'tag', 'Release tag must point to a commit');
    target = JSON.parse(run('gh', ['api', `repos/${repository}/git/tags/${target.sha}`])).object;
  }
  throw new Error('Release tag nesting exceeds the supported limit');
}

function tagRelease() {
  const { revision, tag } = releaseIdentity();
  const repository = repositoryName();
  const existing = remoteTagRevision(repository, tag);
  if (existing) {
    assert.equal(existing, revision, 'Refusing to move an existing Git tag');
    console.log(`Verified existing Git tag ${tag}`);
    return;
  }
  run('gh', ['api', `repos/${repository}/git/refs`, '--method', 'POST', '-f', `ref=refs/tags/${tag}`, '-f', `sha=${revision}`]);
  assert.equal(remoteTagRevision(repository, tag), revision, 'Created tag does not match the verified commit');
  console.log(`Created Git tag ${tag}`);
}

function compareVersions(left, right) {
  const a = left.split('.').map(BigInt);
  const b = right.split('.').map(BigInt);
  const differing = a.findIndex((part, index) => part !== b[index]);
  return differing < 0 ? 0 : a[differing] > b[differing] ? 1 : -1;
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
    if (compareVersions(previousVersion, version) > 0) {
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
  const repository = repositoryName();
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
    const changelog = join('docs', 'releases', `${tag}.md`);
    const highlights = existsSync(changelog) ? `${readFileSync(changelog, 'utf8').trim()}\n\n## Deployment artifact\n\n` : '';
    writeFileSync(notes, `${highlights}Version: \`${version}\`\n\n${commitLine}\n\nDocker tag: \`${image}:${version}\`\n\n${imageLine}\n\nThe image passed smoke tests, the vulnerability scan, VPS deployment and public route verification.\n\nPull the exact deployed artifact:\n\n\`\`\`bash\ndocker pull ${reference}\n\`\`\`\n`);
    run('gh', ['release', 'create', tag, '--repo', repository, '--verify-tag', '--title', tag, '--notes-file', notes, `--latest=${environment.MAKE_LATEST === 'true'}`]);
    console.log(`Published release ${tag}`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

try {
  const commands = { validate, tag: tagRelease, resolve, promote, latest, publish };
  assert.ok(Object.hasOwn(commands, mode), 'Expected validate, tag, resolve, promote, latest or publish');
  commands[mode]();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
