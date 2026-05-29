// ─────────────────────────────────────────────────────────────
// ⚠️ LOAD ENV + TELEMETRY (PHẢI ĐỨNG ĐẦU FILE)
// ─────────────────────────────────────────────────────────────
import 'dotenv/config';
import telemetry from './core/telemetry/index.js';

telemetry.start();

// ─────────────────────────────────────────────────────────────
// ⚠️ IMPORT KHÔNG SIDE-EFFECT (SAFE IMPORT ONLY)
// ─────────────────────────────────────────────────────────────
import { createServer } from 'http';
import { logger } from './core/logger/index.js';
import { initRedis, initBullRedis, disconnectAllRedis } from './infra/redis/client.js';
import { db } from './core/db/prisma.js';
import { validateContactLeadChallengeConfig } from './modules/public/contact-lead.controller.js';
import { validateProductionSecrets } from './bootstrap/production-secret-validation.js';
import { normalizeServiceType, servesPublicHttpApi, servesRealtimeGateway } from './bootstrap/service-profile.js';

// ─────────────────────────────────────────────────────────────
// 🚀 BOOTSTRAP
// ─────────────────────────────────────────────────────────────
async function bootstrap() {
  const SERVICE_TYPE = normalizeServiceType(process.env.SERVICE_TYPE);
  // Ensure PORT is always 3000 per constraints
  const PORT = 3000;

  logger.info({ SERVICE_TYPE }, '🚀 Starting SCMD system');

  try {
    validateProductionSecrets();
  } catch (err) {
    logger.error({ err }, '❌ Production secret configuration is invalid — aborting');
    process.exit(1);
  }

  if (servesPublicHttpApi(SERVICE_TYPE)) {
    try {
      validateContactLeadChallengeConfig();
    } catch (err) {
      logger.error({ err }, '❌ Public contact lead challenge configuration is invalid — aborting');
      process.exit(1);
    }
  }

  // ── STEP 0: START PDF SERVICE (MANAGED MICROSERVICE) ──────────
  if (process.env.NODE_ENV !== 'production' && SERVICE_TYPE === 'ALL') {
    const { spawn } = await import('child_process');
    const pdfService = spawn('node', ['scripts/pdf-server.js'], {
      stdio: 'inherit',
      env: { ...process.env, PDF_PORT: '3001' },
      detached: false // Ensure it dies with parent
    });

    pdfService.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        logger.warn('⚠️ PDF microservice port 3001 already in use. Assuming it is already running.');
      } else {
        logger.error({ err }, '❌ Failed to start PDF microservice');
      }
    });

    // Cleanup on exit
    const cleanup = () => {
      logger.info('🛑 Shutting down PDF microservice...');
      pdfService.kill('SIGTERM');
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
    
    logger.info('🛰️ PDF microservice process managed (Port 3001)');
  }

  // ── STEP 1: INIT REDIS ──────────────────────────────────────
  try {
    await initRedis();
    logger.info('✅ Redis pool initialized');

    // Init CacheManager Pub/Sub synchronization
    const { CacheManager } = await import('./core/cache/manager.js');
    await CacheManager.init();

    await initBullRedis();
    logger.info('✅ BullMQ Redis initialized');
  } catch (err) {
    logger.error({ err }, '❌ Redis initialization failed — aborting');
    process.exit(1);
  }

  // ── STEP 2: LAZY LOAD MODULES ───────────────────────────────
  const { initHeavyWorker } = await import('./core/queue/heavy.worker.js');
  const { initLightWorker } = await import('./core/queue/light.worker.js');
  const { Scheduler } = await import('./core/queue/scheduler.js');
  const { seed } = await import('./modules/auth/seed.js');

  // ── STEP 2.5: SEED ──────────────────────────────────────────
  // [FIX M-01] Chỉ seed trong development để tránh race condition khi có multiple replicas
  // Production seed được chạy 1 lần qua migrate service (run-migration.mjs)
  if (process.env.NODE_ENV !== 'production') {
    try {
      await seed();
      logger.info('✅ Database seeded and synchronized');
    } catch (err) {
      // Seed failure không nên dừng server (data có thể đã tồn tại)
      logger.warn({ err }, '⚠️  Seed warning (non-fatal) — continuing startup');
    }
  } else {
    logger.info('ℹ️  Production mode: skipping seed() — handled by migrate service');
  }

  // ── STEP 3: WORKERS & SCHEDULER ─────────────────────────────
  const isWorker = SERVICE_TYPE === 'WORKER' || SERVICE_TYPE === 'ALL';
  const isWorkerLight = SERVICE_TYPE === 'WORKER_LIGHT' || isWorker;
  const isWorkerHeavy = SERVICE_TYPE === 'WORKER_HEAVY' || isWorker;

  if (isWorkerLight || isWorkerHeavy) {
    // Heavy Worker Initialization
    if (isWorkerHeavy) {
      try {
        await initHeavyWorker();
        logger.info('✅ SCMD Heavy Worker started');
      } catch (err) {
        logger.error({ err }, '⚠️  Heavy Worker initialization error (non-fatal)');
      }
    }

    // Light Worker Initialization
    if (isWorkerLight) {
      try {
        await initLightWorker();
        logger.info('✅ SCMD Light Worker started');
      } catch (err) {
        logger.error({ err }, '⚠️  Light Worker initialization error (non-fatal)');
      }

      // Scheduler runs on Light Worker or API in monolith mode
      try {
        await Scheduler.init();
        logger.info('✅ Scheduler initialized');
      } catch (err) {
        logger.error({ err }, '⚠️  Scheduler initialization error (non-fatal)');
      }
    }
  }

  // ── STEP 4: API SERVER ──────────────────────────────────────
  const { createApp } = await import('./app.js');
  let app: Awaited<ReturnType<typeof createApp>>;
  try {
    app = await createApp();
  } catch (err) {
    logger.error({ err }, '❌ Failed to create Express app — aborting');
    process.exit(1);
  }

  const httpServer = createServer(app);

  // ── STEP 5.5: CONNECTION TRACKING ───────────────────────────
  const connections = new Set<any>();
  httpServer.on('connection', (socket) => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });

  // ── STEP 5: REALTIME ────────────────────────────────────────
  if (servesRealtimeGateway(SERVICE_TYPE)) {
    try {
      const { SocketService } = await import('./infra/socket/service.js');
      await SocketService.init(httpServer);
      logger.info('✅ Realtime (Socket.io) initialized');
    } catch (err) {
      // FIX: Socket failure KHÔNG được dừng HTTP server
      logger.error({ err }, '⚠️  Socket.io initialization error (non-fatal)');
    }

    try {
      const { PGNotifier } = await import('./core/db/pg-notifier.js');
      await PGNotifier.init();
      logger.info('✅ PG Listen/Notify initialized');
    } catch (err) {
      logger.error({ err }, '⚠️  PG Notifier initialization error (non-fatal)');
    }
  }

  // ── STEP 6: START LISTENING ─────────────────────────────────
  await new Promise<void>((resolve, reject) => {
    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`🔥 Service [${SERVICE_TYPE}] running on port ${PORT}`);
      resolve();
    });
    httpServer.on('error', reject);
  });

  // ── STEP 7: GRACEFUL SHUTDOWN ───────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, `🛑 [SCMD] ${signal} received. Starting graceful shutdown...`);

    // 1. Stop accepting new requests
    httpServer.close(async (err) => {
      if (err) {
        logger.error({ err }, '❌ Error during HTTP server close');
      } else {
        logger.info('✅ HTTP server closed (No more new connections)');
      }
    });

    // 2. Give in-flight requests 10s to finish, then force close idle connections
    const forceShutdownTimeout = setTimeout(() => {
      logger.warn('⚠️ Shutdown timeout reached. Forcing connection closure...');
      for (const socket of connections) {
        socket.destroy();
      }
    }, 25000); // Docker grace period is 30s, we try to be done by 25s

    try {
      // 3. Stop Realtime
      const { SocketService } = await import('./infra/socket/service.js');
      await SocketService.close();

      const { PGNotifier } = await import('./core/db/pg-notifier.js');
      await PGNotifier.cleanup();

      // 4. Stop Workers (Stop taking new jobs)
      const { closeHeavyWorker } = await import('./core/queue/heavy.worker.js');
      const { closeLightWorker } = await import('./core/queue/light.worker.js');
      await Promise.all([
        closeHeavyWorker(),
        closeLightWorker()
      ]);

      // 5. Close Queues
      const { QueueService } = await import('./core/queue/index.js');
      await QueueService.closeAllQueues();

      // 6. Disconnect Databases & Redis
      await db.disconnect();
      await disconnectAllRedis();

      clearTimeout(forceShutdownTimeout);
      logger.info('🏆 [SCMD] Graceful shutdown completed successfully');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, '❌ Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ─────────────────────────────────────────────────────────────
// ▶️ START — top-level catch để không crash process thầm lặng
// ─────────────────────────────────────────────────────────────
bootstrap().catch((bootstrapErr: any) => {
  // Fallback: nếu logger chưa init thì dùng console
  try {
    logger.error({ err: bootstrapErr }, '❌ Bootstrap failed');
  } catch (fallbackErr: any) {
    console.error('❌ Bootstrap failed:', bootstrapErr, fallbackErr);
  }
  process.exit(1);
});
