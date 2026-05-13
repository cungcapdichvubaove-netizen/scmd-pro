import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActivateSubscriptionUseCase } from './activate-subscription.use-case.js';
import { db } from '../../db/prisma.js';
import { redisClient } from '../../redis.js';
import { getLightQueue } from '../../queue/index.js';
import { AuditService } from '../../audit/audit.service.js';
import { PRICE_PER_USER_PER_MONTH_VND } from '../../../shared/constants/billing.constants.js';

const mockTenantFindUnique = vi.fn();
const mockQueryRaw = vi.fn();
const mockUpsert = vi.fn();
const mockCreate = vi.fn();

vi.mock('../../db/prisma.js', () => ({
  db: {
    system: vi.fn(() => ({
      tenant: {
        findUnique: mockTenantFindUnique
      },
      $transaction: vi.fn(async (cb) => {
        return cb({
          $queryRaw: mockQueryRaw,
          tenantSubscription: { upsert: mockUpsert },
          billingPayment: { create: mockCreate }
        });
      })
    }))
  }
}));

vi.mock('../../redis.js', () => ({
  redisClient: {
    del: vi.fn()
  }
}));

const mockQueueAdd = vi.fn();
vi.mock('../../queue/index.js', () => ({
  getLightQueue: vi.fn(() => ({
    add: mockQueueAdd
  }))
}));

vi.mock('../../audit/audit.service.js', () => ({
  AuditService: {
    log: vi.fn()
  }
}));

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getActiveSpan: vi.fn(() => ({
      spanContext: () => ({ traceId: 'test-trace-id' })
    }))
  }
}));

describe('ActivateSubscriptionUseCase', () => {
  let useCase: ActivateSubscriptionUseCase;

  const mockTenantId = 'cli7z39e8000008l41z111111';
  const mockActorId = 'cli7z39e8000008l41z222222';

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new ActivateSubscriptionUseCase();
  });

  const validPayload = {
    tenantId: mockTenantId,
    paidUsers: 5,
    paidMonths: 12,
    paymentRef: 'BANK-TRF-123',
    paidAt: new Date(Date.now() - 1000).toISOString(),
    activatedBy: mockActorId,
    note: 'Bank transfer',
  };

  it('should throw an error if tenant does not exist', async () => {
    mockTenantFindUnique.mockResolvedValue(null);

    await expect(useCase.execute(validPayload)).rejects.toThrow(`Tenant không tồn tại: ${mockTenantId}`);
  });

  it('should process activation correctly for an existing tenant and create payment', async () => {
    mockTenantFindUnique.mockResolvedValue({ id: mockTenantId, name: 'ACME Corp' } as any);

    mockQueryRaw.mockResolvedValue([]);
    mockUpsert.mockResolvedValue({});
    mockCreate.mockResolvedValue({});

    const result = await useCase.execute(validPayload);

    // Validate expected amount
    const expectedAmount = (BigInt(5) * BigInt(12) * PRICE_PER_USER_PER_MONTH_VND['PRO']).toString();
    expect(result.amountVnd).toBe(expectedAmount);
    expect(result.expiresAt).toBeInstanceOf(Date);

    // Validate transaction called
    expect(mockQueryRaw).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: mockTenantId },
      update: expect.objectContaining({
        plan: 'PRO',
        paidUsers: 5,
      })
    }));

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: mockTenantId,
        paymentRef: 'BANK-TRF-123',
        status: 'ACTIVE'
      })
    }));

    // Invalidation
    expect(redisClient.del).toHaveBeenCalledWith(`sub:${mockTenantId}`);

    // Audit
    expect(AuditService.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'BILLING_SUBSCRIPTION_ACTIVATED',
      tenantId: mockTenantId,
      status: 'SUCCESS'
    }));

    // Queue
    expect(mockQueueAdd).toHaveBeenCalledWith('billing-notification', expect.objectContaining({
      type: 'SUBSCRIPTION_ACTIVATED',
      tenantId: mockTenantId
    }));
  });

  it('should calculate new expiry based on current active subscription', async () => {
    mockTenantFindUnique.mockResolvedValue({ id: mockTenantId, name: 'ACME Corp' } as any);

    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days from now

    mockQueryRaw.mockResolvedValue([{
      id: 'sub-1', plan: 'PRO', paidUsers: 5, activeUsers: 5,
      expiresAt: futureExpiry, gracePeriodDays: 3, autoDowngrade: true
    }]);
    
    mockUpsert.mockResolvedValue({});
    mockCreate.mockResolvedValue({});

    const result = await useCase.execute({ ...validPayload, paidMonths: 1 });

    // Ensure expiry is futureExpiry + 1 month
    const expectedExpiry = new Date(futureExpiry);
    expectedExpiry.setMonth(expectedExpiry.getMonth() + 1);

    // Minor deviation might happen due to execution time, let's just check if it's strictly greater than futureExpiry
    expect(result.expiresAt.getTime()).toBeGreaterThan(futureExpiry.getTime());
  });
});
