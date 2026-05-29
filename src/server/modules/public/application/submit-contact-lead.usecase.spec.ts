import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '../../../core/db/prisma.js';
import {
  PublicContactLeadRateLimitError,
  SubmitContactLeadUseCase,
} from './submit-contact-lead.usecase.js';
import type { SubmitContactLeadInput } from '../contact-lead.schema.js';

vi.mock('../../../core/db/prisma.js', () => ({
  db: {
    withTenant: vi.fn(),
  },
}));

vi.mock('../../../core/logger/index.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const input: SubmitContactLeadInput = {
  fullName: 'Nguyễn Văn A',
  email: 'BAN@DOANHNGHIEP.VN',
  company: 'SCMD',
  phone: '+84 912 345 678',
  subject: 'Yêu cầu demo / tư vấn gói',
  message: 'Tôi cần tư vấn triển khai SCMD Pro cho hệ thống bảo vệ thuê ngoài.',
  intent: 'DEMO_REQUEST',
  source: 'PUBLIC_CONTACT_PAGE',
  website: '',
  turnstileToken: null,
  isHoneypotTriggered: false,
};

function mockTx(overrides: Record<string, unknown> = {}) {
  return {
    $executeRaw: vi.fn().mockResolvedValue([{ pg_advisory_xact_lock: '' }]),
    contactLead: {
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({
        id: 'lead-1',
        trackingCode: 'CL-20260524-AAAAAAAAAAAAAAAA',
        status: 'NEW',
        createdAt: new Date('2026-05-24T00:00:00.000Z'),
      }),
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SubmitContactLeadUseCase', () => {
  it('persists a normalized contact lead and returns tracking code', async () => {
    const tx = mockTx();
    vi.mocked(db.withTenant).mockImplementation(async (_tenantId, callback: any) => callback(tx));

    const result = await new SubmitContactLeadUseCase().execute(input, {
      ip: '127.0.0.1',
      userAgent: 'vitest',
    });

    expect(result.trackingCode).toMatch(/^CL-\d{8}-[A-F0-9]{16}$/);
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.contactLead.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'ban@doanhnghiep.vn',
        emailHash: expect.any(String),
        contentHash: expect.any(String),
        source: 'PUBLIC_CONTACT_PAGE',
      }),
    }));
  });

  it('returns existing tracking code for duplicate submission in short window', async () => {
    const tx = mockTx({
      findFirst: vi.fn().mockResolvedValue({
        trackingCode: 'CL-20260524-DUPLICATE000000',
        createdAt: new Date('2026-05-24T00:00:00.000Z'),
      }),
    });
    vi.mocked(db.withTenant).mockImplementation(async (_tenantId, callback: any) => callback(tx));

    const result = await new SubmitContactLeadUseCase().execute(input);

    expect(result.trackingCode).toBe('CL-20260524-DUPLICATE000000');
    expect(result.deduplicated).toBe(true);
    expect(tx.contactLead.create).not.toHaveBeenCalled();
  });

  it('retries tracking code collision when Prisma raises P2002', async () => {
    const tx = mockTx({
      create: vi
        .fn()
        .mockRejectedValueOnce({ code: 'P2002', meta: { target: ['tracking_code'] } })
        .mockResolvedValueOnce({
          id: 'lead-2',
          trackingCode: 'CL-20260524-BBBBBBBBBBBBBBBB',
          status: 'NEW',
          createdAt: new Date('2026-05-24T00:00:00.000Z'),
        }),
    });
    vi.mocked(db.withTenant).mockImplementation(async (_tenantId, callback: any) => callback(tx));

    const result = await new SubmitContactLeadUseCase().execute(input);

    expect(result.trackingCode).toBe('CL-20260524-BBBBBBBBBBBBBBBB');
    expect(tx.contactLead.create).toHaveBeenCalledTimes(2);
  });



  it('does not retry non-tracking-code unique constraints', async () => {
    const uniqueEmailError = { code: 'P2002', meta: { target: ['email_hash'] } };
    const tx = mockTx({
      create: vi.fn().mockRejectedValue(uniqueEmailError),
    });
    vi.mocked(db.withTenant).mockImplementation(async (_tenantId, callback: any) => callback(tx));

    await expect(new SubmitContactLeadUseCase().execute(input)).rejects.toBe(uniqueEmailError);
    expect(tx.contactLead.create).toHaveBeenCalledTimes(1);
  });

  it('blocks excessive submissions from the same email hash', async () => {
    const tx = mockTx({ count: vi.fn().mockResolvedValue(3) });
    vi.mocked(db.withTenant).mockImplementation(async (_tenantId, callback: any) => callback(tx));

    await expect(new SubmitContactLeadUseCase().execute(input)).rejects.toBeInstanceOf(PublicContactLeadRateLimitError);
    expect(tx.contactLead.create).not.toHaveBeenCalled();
  });

  it('does not persist honeypot submissions', async () => {
    const tx = mockTx();
    vi.mocked(db.withTenant).mockImplementation(async (_tenantId, callback: any) => callback(tx));

    const result = await new SubmitContactLeadUseCase().execute({ ...input, isHoneypotTriggered: true, website: 'https://spam.example' });

    expect(result.status).toBe('RECEIVED');
    expect(tx.contactLead.create).not.toHaveBeenCalled();
  });
});
