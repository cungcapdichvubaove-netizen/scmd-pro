import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const adminTenant = await prisma.tenant.findUnique({
    where: { subdomain: 'admin' }
  }).catch(() => null);
  
  const tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'system' }
  }).catch(() => null);

  const all_tenants = await prisma.tenant.findMany();

  console.log("Tenants found:", all_tenants.map(t => ({id: t.id, subdomain: t.subdomain, name: t.name})));
}

check().then(() => process.exit(0));
