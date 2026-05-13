import { z } from 'zod';
import { LoginRequestSchema, TrialRegisterSchema } from '../../../lib/contracts.js';

export const loginSchema = LoginRequestSchema;

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const exchangeTokenSchema = z.object({
  token: z.string(),
});

export const trialRegisterSchema = TrialRegisterSchema;
