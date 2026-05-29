import { Prisma } from '@prisma/client';

import type { ReportCutoff } from './contracts.js';

export function getMonthRange(month: string) {
  const [yearRaw, monthRaw] = month.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0));
  return { start, end };
}

export function buildScopeWhere(input: { vendorId: string; contractId?: string | null; siteId?: string | null }) {
  const where: Record<string, unknown> = {
    vendorId: input.vendorId,
  };

  if (input.contractId) {
    where.contractId = input.contractId;
  }

  if (input.siteId) {
    where.siteId = input.siteId;
  }

  return where;
}

export function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function toDecimalAmount(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`);

  return `{${entries.join(',')}}`;
}

export function toPlainJson(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

export function getReportCutoff(start: Date, end: Date): ReportCutoff {
  return {
    periodStart: start,
    periodEndExclusive: end,
    asOf: new Date(end.getTime() - 1),
  };
}
