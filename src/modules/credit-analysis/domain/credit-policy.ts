import { Decimal } from 'decimal.js';
import type { CreditHistorySnapshot, OpenFinanceSnapshot } from '../../customers/domain/customer.js';

export const creditPolicy = Object.freeze({
  version: 'credit-policy-v1',
  currency: 'BRL',
  minimumAmountCents: 10_000,
  maximumAmountCents: 10_000_000,
  minimumInstallments: 1,
  maximumInstallments: 60,
  maximumDebtToIncomeRatio: 0.3,
  minimumScore: 500,
  automaticApprovalScore: 700,
  rates: [
    { minimumScore: 800, monthlyRate: '0.015' },
    { minimumScore: 700, monthlyRate: '0.02' },
    { minimumScore: 500, monthlyRate: '0.03' },
    { minimumScore: 0, monthlyRate: '0.04' }
  ]
} as const);

export interface CreditRequest {
  readonly customerId: string;
  readonly amountCents: number;
  readonly installments: number;
}

export type DecisionReason = 'CREDIT_RESTRICTION' | 'LOW_CREDIT_SCORE' | 'INSUFFICIENT_PAYMENT_CAPACITY' | 'INTERMEDIATE_CREDIT_SCORE' | 'RECENT_LATE_PAYMENTS' | 'POLICY_REQUIREMENTS_MET';

export interface CreditDecision {
  readonly status: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  readonly reasons: readonly DecisionReason[];
  readonly policyVersion: string;
  readonly currency: 'BRL';
  readonly monthlyInterestRate: string;
  readonly installmentCents: number;
  readonly lastInstallmentCents: number;
  readonly totalRepaymentCents: number;
  readonly availablePaymentCents: number;
  readonly debtToIncomeRatio: string;
}

export function analyzeCredit(request: CreditRequest, finance: OpenFinanceSnapshot, history: CreditHistorySnapshot): CreditDecision {
  if (!Number.isSafeInteger(request.amountCents) || request.amountCents < creditPolicy.minimumAmountCents || request.amountCents > creditPolicy.maximumAmountCents) {
    throw new RangeError('Amount is outside policy limits');
  }
  if (!Number.isInteger(request.installments) || request.installments < creditPolicy.minimumInstallments || request.installments > creditPolicy.maximumInstallments) {
    throw new RangeError('Installments are outside policy limits');
  }
  const rate = new Decimal(creditPolicy.rates.find((tier) => history.score >= tier.minimumScore)!.monthlyRate);
  const growth = rate.plus(1).pow(request.installments);
  const payment = new Decimal(request.amountCents).mul(rate).mul(growth).div(growth.minus(1));
  const installmentCents = payment.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const totalRepaymentCents = payment.mul(request.installments).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const lastInstallmentCents = totalRepaymentCents - installmentCents * (request.installments - 1);
  const largestPaymentCents = Math.max(installmentCents, lastInstallmentCents);
  const capacity = Decimal.max(new Decimal(finance.monthlyIncomeCents).mul('0.3').floor().minus(finance.monthlyDebtCents), 0);
  const rejected: DecisionReason[] = [];
  const review: DecisionReason[] = [];
  if (history.hasRestrictions) rejected.push('CREDIT_RESTRICTION');
  if (history.score < creditPolicy.minimumScore) rejected.push('LOW_CREDIT_SCORE');
  if (finance.monthlyIncomeCents <= 0 || capacity.lessThan(largestPaymentCents)) rejected.push('INSUFFICIENT_PAYMENT_CAPACITY');
  if (history.score < creditPolicy.automaticApprovalScore) review.push('INTERMEDIATE_CREDIT_SCORE');
  if (history.latePaymentsLast12Months >= 3) review.push('RECENT_LATE_PAYMENTS');
  const status = rejected.length ? 'REJECTED' : review.length ? 'MANUAL_REVIEW' : 'APPROVED';
  return {
    status,
    reasons: rejected.length ? rejected : review.length ? review : ['POLICY_REQUIREMENTS_MET'],
    policyVersion: creditPolicy.version,
    currency: 'BRL',
    monthlyInterestRate: rate.toFixed(4),
    installmentCents,
    lastInstallmentCents,
    totalRepaymentCents,
    availablePaymentCents: capacity.toNumber(),
    debtToIncomeRatio: finance.monthlyIncomeCents > 0
      ? new Decimal(finance.monthlyDebtCents).plus(largestPaymentCents).div(finance.monthlyIncomeCents).toFixed(6)
      : '1.000000'
  };
}
