import crypto from 'crypto';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type RetentionMode = 'dry-run' | 'delete';

function parseRetentionDays(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function getMode(): RetentionMode {
  return process.env.CONTACT_RETENTION_CONFIRM === 'delete' ? 'delete' : 'dry-run';
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function anonymizedHash(id: string, field: string) {
  return crypto.createHash('sha256').update(`scmd:contact-lead:anonymized:${field}:${id}`).digest('hex');
}

async function main() {
  const mode = getMode();
  const spamRetentionDays = parseRetentionDays('CONTACT_LEAD_SPAM_RETENTION_DAYS', 30, 1, 3650);
  const resolvedRetentionDays = parseRetentionDays('CONTACT_LEAD_RESOLVED_RETENTION_DAYS', 730, 30, 3650);
  const spamCutoff = daysAgo(spamRetentionDays);
  const resolvedCutoff = daysAgo(resolvedRetentionDays);

  const [spamToDelete, resolvedToAnonymize] = await Promise.all([
    prisma.contactLead.count({
      where: {
        status: 'SPAM',
        createdAt: { lt: spamCutoff },
      },
    }),
    prisma.contactLead.findMany({
      where: {
        status: 'RESOLVED',
        resolvedAt: { lt: resolvedCutoff },
        email: { not: '[anonymized]' },
      },
      select: { id: true },
      take: 500,
      orderBy: { resolvedAt: 'asc' },
    }),
  ]);

  if (mode === 'dry-run') {
    console.log(JSON.stringify({
      mode,
      wouldDeleteSpam: spamToDelete,
      wouldAnonymizeResolved: resolvedToAnonymize.length,
      resolvedBatchLimit: 500,
      spamCutoff: spamCutoff.toISOString(),
      resolvedCutoff: resolvedCutoff.toISOString(),
      note: 'Set CONTACT_RETENTION_CONFIRM=delete to apply mutations after validating the target database.',
    }, null, 2));
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedSpam = await tx.contactLead.deleteMany({
      where: {
        status: 'SPAM',
        createdAt: { lt: spamCutoff },
      },
    });

    let anonymizedResolved = 0;
    for (const lead of resolvedToAnonymize) {
      await tx.contactLead.update({
        where: { id: lead.id },
        data: {
          fullName: '[anonymized]',
          email: '[anonymized]',
          emailHash: anonymizedHash(lead.id, 'email'),
          contentHash: anonymizedHash(lead.id, 'content'),
          company: null,
          phone: null,
          subject: '[anonymized]',
          message: '[anonymized]',
          userAgent: null,
          ipHash: null,
        },
      });
      anonymizedResolved += 1;
    }

    return { deletedSpam: deletedSpam.count, anonymizedResolved };
  });

  console.log(JSON.stringify({
    mode,
    ...result,
    spamCutoff: spamCutoff.toISOString(),
    resolvedCutoff: resolvedCutoff.toISOString(),
  }, null, 2));
}

main()
  .catch((err) => {
    console.error('contact-leads-retention failed', { name: err?.name, code: err?.code, message: err?.message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
