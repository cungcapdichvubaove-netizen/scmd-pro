import { db } from '../../../src/server/core/db/prisma.js';
import { logger } from '../utils/logger.js';
import { GLOBAL_CONSTANTS } from '../config.js';
import { generateVNName, generateIdNumber, generatePhone, randomInt, randomElement, generateCoordinates, randomDate } from '../utils/random.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function runStandardSeed() {
  logger.step('Seeding Standard Demo Data');
  
  await db.withTenant('SYSTEM', async (sys) => {
    // We will build Vinhomes and An Hoi
    const tenants = [
      {
        id: GLOBAL_CONSTANTS.VINHOMES_TENANT_ID,
        name: 'Vinhomes Grand Park',
        subdomain: 'vinhomes',
        plan: 'PRO',
        center: GLOBAL_CONSTANTS.VINHOMES_CENTER
      },
      {
        id: GLOBAL_CONSTANTS.ANHOI_TENANT_ID,
        name: 'Chung cư An Hội',
        subdomain: 'anhoi',
        plan: 'FREE',
        center: GLOBAL_CONSTANTS.ANHOI_CENTER
      }
    ];

    const tenantAdminHash = await bcrypt.hash(GLOBAL_CONSTANTS.DEFAULT_TENANT_PASSWORD, GLOBAL_CONSTANTS.SALT_ROUNDS);
    const guardHash = await bcrypt.hash(GLOBAL_CONSTANTS.DEFAULT_GUARD_PASSWORD, GLOBAL_CONSTANTS.SALT_ROUNDS);

    for (const t of tenants) {
      logger.info(`Building data for Tenant: ${t.name}`);

      await sys.tenant.upsert({
        where: { subdomain: t.subdomain },
        update: {},
        create: {
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
          plan: t.plan,
          contactEmail: `admin@${t.subdomain}.scmd.pro`,
          contactPhone: generatePhone(),
          ownerName: 'Admin ' + t.name,
          maxEmployees: t.plan === 'PRO' ? 100 : 5,
          status: 'active',
        },
      });

      // Tenant Admin
      await sys.staff.upsert({
        where: { username: `admin_${t.subdomain}` },
        update: { password: tenantAdminHash },
        create: {
          id: crypto.randomUUID(),
          tenantId: t.id,
          username: `admin_${t.subdomain}`,
          email: `admin@${t.subdomain}.scmd.pro`,
          password: tenantAdminHash,
          fullName: `Quản lý ${t.name}`,
          role: 'tenant-admin',
          status: 'active',
          tokenVersion: 1,
        },
      });

      // Staff / Guards
      const STAFF_COUNT = t.plan === 'PRO' ? 15 : 2;
      const staffList = [];
      for (let i = 1; i <= STAFF_COUNT; i++) {
        const username = `guard_${t.subdomain}_${i}`;
        const s = await sys.staff.upsert({
          where: { username },
          update: { password: guardHash },
          create: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            username,
            email: `${username}@${t.subdomain}.scmd.pro`,
            password: guardHash,
            fullName: generateVNName(),
            phone: generatePhone(),
            idNumber: generateIdNumber(),
            role: i === 1 ? 'supervisor' : 'guard',
            status: 'active',
            tokenVersion: 1,
          },
        });
        staffList.push(s);
      }

      // Checkpoints
      const CHECKPOINT_COUNT = t.plan === 'PRO' ? 20 : 5;
      const checkpoints = [];
      for (let i = 1; i <= CHECKPOINT_COUNT; i++) {
        const cpId = crypto.randomUUID();
        const coords = generateCoordinates(t.center.lat, t.center.lng, 0.8);
        const cpName = `Điểm kiểm tra ${i}`;
        
        await sys.$executeRawUnsafe(`
          INSERT INTO "checkpoints" (id, tenant_id, name, location, qr_hash, status, created_at, updated_at)
          VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, 'active', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `, cpId, t.id, cpName, coords.lng, coords.lat, crypto.randomUUID());
        
        checkpoints.push({ id: cpId, name: cpName, ...coords });
      }

      // Patrol Logs (Last 7 days)
      logger.info(`Seeding Patrol Logs for ${t.name}...`);
      const now = new Date();
      const logsToCreate = t.plan === 'PRO' ? 200 : 20;

      for (let i = 0; i < logsToCreate; i++) {
        const guard = randomElement(staffList);
        const cp = randomElement(checkpoints);
        const pastDate = new Date(now.getTime() - randomInt(0, 7 * 24 * 60 * 60 * 1000));
        
        await sys.patrolLog.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            staffId: guard.id,
            checkpointId: cp.id,
            metadata: { notes: randomElement(['An toàn', 'Bình thường', 'Everything OK', '']) },
            createdAt: pastDate,
          }
        });
      }

      // Incidents
      logger.info(`Seeding Incidents for ${t.name}...`);
      const INCIDENT_TYPES = ['CCTV_OFFLINE', 'INTRUSION', 'FIRE_ALARM', 'PIPE_BROKEN', 'SUSPICIOUS_PERSON', 'DOOR_OPEN'];
      const incidentCount = t.plan === 'PRO' ? 15 : 2;
      for (let i = 0; i < incidentCount; i++) {
        const guard = randomElement(staffList);
        const reportedAt = randomDate(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), now);
        
        // Randomly resolve some
        let status = randomElement(['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED']);
        let resolvedAt = (status === 'RESOLVED' || status === 'CLOSED') ? new Date(reportedAt.getTime() + randomInt(1, 48) * 3600 * 1000) : null;

        await sys.incident.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            staffId: guard.id,
            type: randomElement(INCIDENT_TYPES),
            severity: randomElement(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            description: 'Phát hiện sự cố bất thường tại khu vực quản lý',
            status: status as any,
            reportedAt,
            resolvedAt,
            createdAt: reportedAt,
            updatedAt: resolvedAt || reportedAt,
          }
        });
      }

      // Tasks
      logger.info(`Seeding Tasks for ${t.name}...`);
      const taskCount = t.plan === 'PRO' ? 30 : 5;
      for (let i = 0; i < taskCount; i++) {
        const assignee = randomElement(staffList);
        const createdAt = randomDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), now);
        
        await sys.task.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: t.id,
            title: `Nhiệm vụ tuần tra khu vực ${randomInt(1, 10)}`,
            description: 'Yêu cầu kiểm tra kỹ các góc khuất, báo cáo ngay nếu có sự cố.',
            status: randomElement(['PENDING', 'IN_PROGRESS', 'COMPLETED']),
            priority: randomElement(['LOW', 'MEDIUM', 'HIGH']),
            dueDate: new Date(createdAt.getTime() + randomInt(1, 5) * 24 * 3600 * 1000),
            assigneeId: assignee.id,
            createdAt: createdAt,
            updatedAt: createdAt,
          }
        });
      }
    }
  });

  logger.success('Standard Demo Data seeded.');
}
