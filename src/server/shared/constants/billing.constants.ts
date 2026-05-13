import { SubscriptionPlan } from '@prisma/client';

export const PRICE_PER_USER_PER_MONTH_VND = {
  [SubscriptionPlan.FREE]: 0n,
  [SubscriptionPlan.PRO]: 99_000n,
  [SubscriptionPlan.ENTERPRISE]: 0n, // Custom pricing, normally handled separately
} as const;

export const GRACE_PERIOD_DAYS = 3;
export const EXPIRY_WARNING_DAYS = [7, 3]; // gửi email cảnh báo ở các mốc này
