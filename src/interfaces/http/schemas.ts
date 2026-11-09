import { z } from 'zod';
import { creditPolicy } from '../../modules/credit-analysis/domain/credit-policy.js';

export const loginSchema = z.object({
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128)
}).strict();

export const simulationSchema = z.object({
  customerId: z.string().regex(/^customer-[a-z-]+$/).max(80),
  amountCents: z.number().int().min(creditPolicy.minimumAmountCents).max(creditPolicy.maximumAmountCents),
  installments: z.number().int().min(creditPolicy.minimumInstallments).max(creditPolicy.maximumInstallments)
}).strict();

export const idempotencySchema = z.string().min(8).max(128).regex(/^[A-Za-z0-9._:-]+$/);

export const applicationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  customerId: z.string().max(80).optional(),
  status: z.enum(['APPROVED', 'REJECTED', 'MANUAL_REVIEW']).optional()
}).strict();
