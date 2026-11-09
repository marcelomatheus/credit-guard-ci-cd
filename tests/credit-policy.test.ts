import { describe, expect, it } from 'vitest';
import { analyzeCredit } from '../src/modules/credit-analysis/domain/credit-policy.js';
import { creditHistories, openFinanceSnapshots } from '../src/infrastructure/mocks/fixtures.js';

const finance = openFinanceSnapshots[0]!;
const history = creditHistories[0]!;
const input = { customerId: finance.customerId, amountCents: 100000, installments: 12 };

describe('credit policy', () => {
  it('calculates a Price schedule with integer cents and a reconciled last payment', () => {
    const decision = analyzeCredit(input, finance, history);
    expect(decision.status).toBe('APPROVED');
    expect(decision.monthlyInterestRate).toBe('0.0150');
    expect(decision.installmentCents).toBe(9168);
    expect(decision.totalRepaymentCents).toBe(110016);
    expect(decision.installmentCents * 11 + decision.lastInstallmentCents).toBe(decision.totalRepaymentCents);
    expect(decision.availablePaymentCents).toBe(190000);
    expect(decision.policyVersion).toBe('credit-policy-v1');
  });

  it.each([
    [499, 'REJECTED', '0.0400'],
    [500, 'MANUAL_REVIEW', '0.0300'],
    [699, 'MANUAL_REVIEW', '0.0300'],
    [700, 'APPROVED', '0.0200'],
    [799, 'APPROVED', '0.0200'],
    [800, 'APPROVED', '0.0150']
  ])('handles score boundary %i', (score, status, rate) => {
    const decision = analyzeCredit(input, finance, { ...history, score });
    expect(decision.status).toBe(status);
    expect(decision.monthlyInterestRate).toBe(rate);
  });

  it('prioritizes rejection over manual review and returns every rejection reason', () => {
    const decision = analyzeCredit(input, { ...finance, monthlyDebtCents: 999999 }, { ...history, score: 450, hasRestrictions: true, latePaymentsLast12Months: 5 });
    expect(decision.status).toBe('REJECTED');
    expect(decision.reasons).toEqual(['CREDIT_RESTRICTION', 'LOW_CREDIT_SCORE', 'INSUFFICIENT_PAYMENT_CAPACITY']);
    expect(decision.availablePaymentCents).toBe(0);
  });

  it('requires review for recurring late payments even with a high score', () => {
    expect(analyzeCredit(input, finance, { ...history, latePaymentsLast12Months: 3 }).reasons).toContain('RECENT_LATE_PAYMENTS');
  });

  it('rejects zero income without dividing by zero', () => {
    const result = analyzeCredit(input, { ...finance, monthlyIncomeCents: 0 }, history);
    expect(result.status).toBe('REJECTED');
    expect(result.debtToIncomeRatio).toBe('1.000000');
  });

  it('accepts exact payment capacity and rejects one cent below capacity', () => {
    const decision = analyzeCredit(input, finance, history);
    const largest = Math.max(decision.installmentCents, decision.lastInstallmentCents);
    const exact = { ...finance, monthlyIncomeCents: 100000, monthlyDebtCents: 30000 - largest };
    expect(analyzeCredit(input, exact, history).status).toBe('APPROVED');
    expect(analyzeCredit(input, { ...exact, monthlyDebtCents: exact.monthlyDebtCents + 1 }, history).status).toBe('REJECTED');
  });

  it.each([9999, 10000001, 10000.5, NaN])('rejects invalid amount %s', (amountCents) => {
    expect(() => analyzeCredit({ ...input, amountCents }, finance, history)).toThrow(RangeError);
  });

  it.each([0, 61, 1.5])('rejects invalid installment count %s', (installments) => {
    expect(() => analyzeCredit({ ...input, installments }, finance, history)).toThrow(RangeError);
  });

  it.each([1, 60])('keeps the largest supported schedule finite for %i installments', (installments) => {
    const result = analyzeCredit({ ...input, installments, amountCents: 10000000 }, finance, history);
    expect(Number.isSafeInteger(result.totalRepaymentCents)).toBe(true);
    expect(result.lastInstallmentCents).toBeGreaterThan(0);
  });
});
