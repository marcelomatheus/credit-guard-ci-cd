import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parseDocument } from 'yaml';

for (const filename of readdirSync('.github/workflows').filter((name) => /\.ya?ml$/.test(name))) {
  const document = parseDocument(readFileSync(`.github/workflows/${filename}`, 'utf8'), { uniqueKeys: true });
  assert.equal(document.errors.length, 0, `${filename}: invalid YAML`);
  const workflow = document.toJS();
  assert.ok(workflow.on, `${filename}: missing trigger`);
  assert.ok(!workflow.on.pull_request_target, `${filename}: privileged PR execution is prohibited`);
  for (const job of Object.values(workflow.jobs)) {
    if (job.uses) assert.match(job.uses, /^\.\/\.github\/workflows\//);
    for (const step of job.steps ?? []) {
      if (step.uses) assert.match(step.uses, /^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/, `${filename}: action is not pinned`);
    }
  }
}
console.log('Workflow YAML and action pinning checks passed');
