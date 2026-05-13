import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
async function main() {
  const checkpoints = await db.checkpoint.findMany();
  console.log(JSON.stringify(checkpoints, null, 2));
}
main().catch(console.error).finally(() => db.$disconnect());
