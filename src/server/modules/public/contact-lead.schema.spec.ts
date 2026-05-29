import { describe, expect, it } from 'vitest';

import { submitContactLeadSchema } from './contact-lead.schema';

const validPayload = {
  fullName: ' Nguyễn Văn A ',
  email: ' BAN@DOANHNGHIEP.VN ',
  company: ' Công ty SCMD ',
  phone: '+84 912 345 678',
  subject: 'Yêu cầu demo / tư vấn gói',
  message: 'Tôi cần tư vấn triển khai SCMD Pro cho hệ thống bảo vệ thuê ngoài.',
  source: 'public_contact_page',
};

describe('submitContactLeadSchema', () => {
  it('normalizes and derives demo intent from subject', () => {
    const parsed = submitContactLeadSchema.parse(validPayload);

    expect(parsed.fullName).toBe('Nguyễn Văn A');
    expect(parsed.email).toBe('BAN@DOANHNGHIEP.VN');
    expect(parsed.company).toBe('Công ty SCMD');
    expect(parsed.phone).toBe('+84 912 345 678');
    expect(parsed.intent).toBe('DEMO_REQUEST');
    expect(parsed.source).toBe('PUBLIC_CONTACT_PAGE');
    expect(parsed.isHoneypotTriggered).toBe(false);
  });

  it('flags honeypot without rejecting the public response contract', () => {
    const parsed = submitContactLeadSchema.parse({
      ...validPayload,
      website: 'https://spam.example',
    });

    expect(parsed.isHoneypotTriggered).toBe(true);
  });

  it('rejects invalid email, invalid phone and spoofed source', () => {
    expect(() => submitContactLeadSchema.parse({ ...validPayload, email: 'invalid' })).toThrow();
    expect(() => submitContactLeadSchema.parse({ ...validPayload, phone: 'abc<script>' })).toThrow();
    expect(() => submitContactLeadSchema.parse({ ...validPayload, source: 'RANDOM_CLIENT_VALUE' })).toThrow();
  });

  it('rejects control characters in public text fields', () => {
    expect(() => submitContactLeadSchema.parse({ ...validPayload, fullName: 'A\u0000B' })).toThrow();
    expect(() => submitContactLeadSchema.parse({ ...validPayload, message: 'Nội dung hợp lệ nhưng có\u0007 ký tự điều khiển' })).toThrow();
  });
});
