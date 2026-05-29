import { z } from 'zod';

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : value);
const normalizeSource = (value: unknown) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export const contactLeadIntentValues = [
  'DEMO_REQUEST',
  'TECHNICAL_SUPPORT',
  'SYSTEM_INCIDENT',
  'BUSINESS_PARTNERSHIP',
  'BILLING',
  'OTHER',
] as const;

export const contactLeadSourceValues = [
  'PUBLIC_CONTACT_PAGE',
  'LANDING_PAGE',
  'PRICING_PAGE',
  'DOCS_PAGE',
  'SUPPORT_LINK',
] as const;

const vietnamPhonePattern = /^\+?[0-9][0-9\s().-]{7,24}$/;
const controlCharPattern = /[\u0000-\u001F\u007F]/;

const subjectToIntent = (subject: string): (typeof contactLeadIntentValues)[number] => {
  const normalized = subject.toLowerCase();
  if (normalized.includes('demo') || normalized.includes('tư vấn') || normalized.includes('tu van')) return 'DEMO_REQUEST';
  if (normalized.includes('kỹ thuật') || normalized.includes('ky thuat') || normalized.includes('hỗ trợ') || normalized.includes('ho tro')) return 'TECHNICAL_SUPPORT';
  if (normalized.includes('báo lỗi') || normalized.includes('bao loi') || normalized.includes('sự cố') || normalized.includes('su co')) return 'SYSTEM_INCIDENT';
  if (normalized.includes('hợp tác') || normalized.includes('hop tac') || normalized.includes('kinh doanh')) return 'BUSINESS_PARTNERSHIP';
  if (normalized.includes('thanh toán') || normalized.includes('thanh toan')) return 'BILLING';
  return 'OTHER';
};

const optionalCleanText = (max: number) =>
  z.preprocess(
    normalizeText,
    z
      .string()
      .max(max)
      .refine((value) => !controlCharPattern.test(value), 'CONTROL_CHARACTERS_NOT_ALLOWED')
      .optional()
      .default(''),
  );

const phoneSchema = z.preprocess(
  normalizeText,
  z
    .string()
    .max(32)
    .optional()
    .default('')
    .refine((value) => value.length === 0 || vietnamPhonePattern.test(value), 'INVALID_PHONE_FORMAT'),
);

export const submitContactLeadSchema = z.object({
  fullName: z.preprocess(normalizeText, z.string().min(2).max(120).refine((value) => !controlCharPattern.test(value), 'CONTROL_CHARACTERS_NOT_ALLOWED')),
  email: z.preprocess(normalizeText, z.string().email().max(160)),
  company: optionalCleanText(160),
  phone: phoneSchema,
  subject: z.preprocess(normalizeText, z.string().min(3).max(160).refine((value) => !controlCharPattern.test(value), 'CONTROL_CHARACTERS_NOT_ALLOWED')),
  message: z.preprocess(normalizeText, z.string().min(10).max(4000).refine((value) => !controlCharPattern.test(value), 'CONTROL_CHARACTERS_NOT_ALLOWED')),
  intent: z.enum(contactLeadIntentValues).optional(),
  source: z.preprocess(normalizeSource, z.enum(contactLeadSourceValues).optional().default('PUBLIC_CONTACT_PAGE')),
  turnstileToken: z.preprocess(normalizeText, z.string().max(2048).optional().default('')),
  website: z.preprocess(normalizeText, z.string().max(200).optional().default('')),
}).transform((data) => ({
  ...data,
  company: data.company || null,
  phone: data.phone || null,
  intent: data.intent || subjectToIntent(data.subject),
  source: data.source || 'PUBLIC_CONTACT_PAGE',
  turnstileToken: data.turnstileToken || null,
  isHoneypotTriggered: Boolean(data.website),
}));

export type SubmitContactLeadInput = z.infer<typeof submitContactLeadSchema>;
