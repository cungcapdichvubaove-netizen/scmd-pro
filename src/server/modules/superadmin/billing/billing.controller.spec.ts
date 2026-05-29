import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findManyMock,
  parseMock,
} = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  parseMock: vi.fn(),
}));

vi.mock('../../../core/db/prisma.js', () => ({
  db: {
    system: () => ({
      tenantSubscription: {
        findMany: findManyMock,
      },
    }),
  },
}));

vi.mock('../../../core/use-cases/billing/billing.schemas.js', () => ({
  ListBillingTenantsSchema: {
    parse: parseMock,
  },
}));

import { BillingController } from './billing.controller.js';

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    query: {},
    params: {},
    body: {},
    ...overrides,
  } as Request;
}

function makeRes(): Response {
  const res = {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };

  return res as unknown as Response;
}

describe('BillingController.listTenants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('áp filter expiring theo business window > now và <= 7 ngày, giữ nguyên pagination contract', async () => {
    parseMock.mockReturnValue({
      status: 'expiring',
      take: 2,
      cursor: undefined,
    });

    const rows = [
      {
        id: 'sub-1',
        tenantId: 'tenant-1',
        plan: 'PRO',
        expiresAt: new Date('2026-05-28T00:00:00.000Z'),
        tenant: { name: 'Tenant A', subdomain: 'tenant-a', status: 'ACTIVE' },
      },
      {
        id: 'sub-2',
        tenantId: 'tenant-2',
        plan: 'PRO',
        expiresAt: new Date('2026-05-29T00:00:00.000Z'),
        tenant: { name: 'Tenant B', subdomain: 'tenant-b', status: 'ACTIVE' },
      },
      {
        id: 'sub-3',
        tenantId: 'tenant-3',
        plan: 'PRO',
        expiresAt: new Date('2026-05-30T00:00:00.000Z'),
        tenant: { name: 'Tenant C', subdomain: 'tenant-c', status: 'ACTIVE' },
      },
    ];

    findManyMock.mockResolvedValue(rows);

    const req = makeReq({ query: { status: 'expiring', take: '2' } });
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await new BillingController().listTenants(req, res, next);

    expect(parseMock).toHaveBeenCalledWith(req.query);
    expect(findManyMock).toHaveBeenCalledTimes(1);

    const prismaArgs = findManyMock.mock.calls[0][0];
    expect(prismaArgs.take).toBe(3);
    expect(prismaArgs.cursor).toBeUndefined();
    expect(prismaArgs.include).toEqual({
      tenant: { select: { name: true, subdomain: true, status: true } },
    });
    expect(prismaArgs.orderBy).toEqual({ expiresAt: 'asc' });
    expect(prismaArgs.where).toMatchObject({
      plan: { not: 'FREE' },
      expiresAt: {
        gt: expect.any(Date),
        lte: expect.any(Date),
      },
    });

    const { gt, lte } = prismaArgs.where.expiresAt as { gt: Date; lte: Date };
    expect(gt.getTime()).toBeLessThan(lte.getTime());
    expect(lte.getTime() - gt.getTime()).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000 + 5_000);

    expect(res.json).toHaveBeenCalledWith({
      items: rows.slice(0, 2),
      nextCursor: 'sub-2',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('áp filter expired gồm FREE và subscription đã quá hạn để tránh lệch số card và drill-down', async () => {
    parseMock.mockReturnValue({
      status: 'expired',
      take: 50,
      cursor: undefined,
    });

    findManyMock.mockResolvedValue([]);

    const req = makeReq({ query: { status: 'expired' } });
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await new BillingController().listTenants(req, res, next);

    const prismaArgs = findManyMock.mock.calls[0][0];
    expect(prismaArgs.where).toEqual({
      OR: [
        { plan: 'FREE' },
        { expiresAt: { lt: expect.any(Date) } },
      ],
    });
    expect(res.json).toHaveBeenCalledWith({
      items: [],
      nextCursor: undefined,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('đẩy lỗi parse sang next để giữ nguyên contract xử lý lỗi', async () => {
    const error = new Error('invalid query');
    parseMock.mockImplementation(() => {
      throw error;
    });

    const req = makeReq({ query: { status: 'oops' } });
    const res = makeRes();
    const next = vi.fn() as NextFunction;

    await new BillingController().listTenants(req, res, next);

    expect(findManyMock).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });
});
