import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

describe('architecture matching after the minimatch security update', () => {
  const eslint = new ESLint();

  it.each([
    ['src/modules/credit-analysis/domain/probe.ts', 'express'],
    ['src/modules/credit-analysis/application/probe.ts', '../infrastructure/adapter.js']
  ])('continues enforcing inward dependencies for %s', async (filePath, source) => {
    const [result] = await eslint.lintText(`import value from '${source}';\nexport { value };\n`, { filePath });
    expect(result!.messages.some((message) => message.ruleId === 'no-restricted-imports')).toBe(true);
  });

  it('continues accepting valid domain TypeScript', async () => {
    const [result] = await eslint.lintText('export const amount: number = 100;\n', { filePath: 'src/modules/credit-analysis/domain/probe.ts' });
    expect(result!.errorCount).toBe(0);
    expect(result!.warningCount).toBe(0);
  });
});
