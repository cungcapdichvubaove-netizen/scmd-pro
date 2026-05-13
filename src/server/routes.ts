import { Router } from 'express';
import crypto from 'crypto';
import { sysManageGlobalAuditLimiter } from './core/middleware/rate-limit.middleware.js';
import { logger } from './core/logger/index.js';
import { RequestContextResolver } from './core/context/index.js';
import { AuthController } from './modules/auth/auth.controller.js';
import { PatrolController } from './modules/patrol/patrol.controller.js';
import { ReportController } from './modules/report/report.controller.js';
import { SuperAdminController } from './modules/superadmin/superadmin.controller.js';
import { StaffController } from './modules/staff/staff.controller.js';
import { TenantController } from './modules/tenant/tenant.controller.js';
import { TaskController } from './modules/task/task.controller.js';
import { NewsController } from './modules/news/news.controller.js';
import { RecordBenchmarkUseCase, ResetBenchmarkUseCase } from './core/use-cases/patrol/record-benchmark.usecase.js';
import { GetBenchmarkAnalyticsUseCase } from './core/use-cases/patrol/get-benchmark-analytics.usecase.js';
import { VendorController } from './modules/vendor/vendor.controller.js';
import { IncidentController } from './modules/incident/incident.controller.js';
import { AuditController } from './modules/audit/audit.controller.js';
import { CommandCenterController } from './modules/patrol/command-center.controller.js';
import { MonitorController } from './modules/patrol/monitor.controller.js';
import { HelpController } from './modules/help/help.controller.js';
import { NotificationController } from './modules/notification/notification.controller.js';
import { AttachmentController } from './modules/attachment/attachment.controller.js';
import { INTERNAL_API_SECRET } from './core/auth/secrets.js';
import { requireAuth, requireRole, requirePermission } from './shared/middlewares/auth.middleware.js';
import { UserRole } from './core/architecture/types.js';
import { upload, validateMagicBytes } from './shared/middlewares/upload.middleware.js';
import { authLimiter, criticalLimiter, pdfLimiter, aiLimiter, aiQuotaTracking } from './app.js';
import { idempotency } from './core/middleware/idempotency.middleware.js';
import { metrics } from './core/metrics.js';
import { AlertAggregatorService } from './core/queue/aggregator.service.js';
import { TenantRepository } from './modules/tenant/tenant.repository.js';
import { GeminiService } from './core/ai/gemini.service.js';
import { PredictiveGuardingController } from './modules/security/predictive-guarding.controller.js';
import { BillingController } from './modules/superadmin/billing/billing.controller.js';
import { AdminController } from './modules/admin/admin.controller.js';

export function createRouter() {
  const router = Router();

  // Metrics (Internal monitoring)
  router.get('/monitor/metrics', requireRole([UserRole.SUPER_ADMIN]), async (req: any, res: any) => {
    // If standard prometheus requester, return text format
    if (req.headers.accept?.includes('text/plain') || req.query.format === 'prometheus') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(await metrics.getPrometheusMetrics());
    }

    const snapshot = await metrics.getDetailedSnapshot();
    
    // Add additional aggregator metrics if service available
    try {
      (snapshot as any).aggregator = await AlertAggregatorService.getAggregationMetrics();
    } catch (err) {
      // Service might not be initialized yet
    }

    res.json(snapshot);
  });

  // Public: kiểm tra tenant tồn tại (dùng cho WorkspaceFinder)
  router.get('/auth/check-workspace/:subdomain', async (req, res) => {
    try {
      const { subdomain } = req.params;
      if (!subdomain || !/^[a-z0-9-]{2,50}$/.test(subdomain)) {
        return res.status(400).json({ exists: false, error: 'Mã không hợp lệ.' });
      }

      const normalized = subdomain.toLowerCase();

      // FIX [BUG-1]: Super-admin workspace ('system' / 'admin') là platform-level alias.
      // Bảng tenants có RLS SYSTEM-only — nếu cache cold, withTenant transaction chưa chạy
      // có thể race với pool connection chưa có set_config → trả 503 sai.
      // Giải pháp: early-return xác nhận ngay, không cần DB round-trip cho các alias cố định.
      const SYSTEM_WORKSPACE_ALIASES = new Set(['system', 'admin']);
      if (SYSTEM_WORKSPACE_ALIASES.has(normalized)) {
        return res.json({ exists: true, active: true, name: 'SCMD Platform Admin' });
      }

      const tenant = await TenantRepository.getBySubdomain(normalized);
      if (!tenant) {
        return res.status(404).json({ exists: false });
      }
      if (tenant.status !== 'active') {
        return res.status(403).json({ exists: true, active: false, error: 'Không gian làm việc này đã bị tạm khóa.' });
      }
      return res.json({ exists: true, active: true, name: tenant.name });
    } catch (err: any) {
      logger.error({ err }, 'check-workspace error');
      return res.status(503).json({ exists: false, error: 'Hệ thống đang gặp sự cố. Vui lòng thử lại.' });
    }
  });

  // Auth Routes
  router.get('/auth/captcha', AuthController.getCaptcha);
  router.post('/auth/login', authLimiter, AuthController.login);
  router.post('/auth/trial-register', authLimiter, AuthController.trialRegister);
  router.get('/auth/verify-trial', AuthController.verifyTrialEmail);
  router.post('/auth/refresh', AuthController.refresh);
  router.post('/auth/logout', AuthController.logout);
  
  // News Routes (Public)
  router.get('/news', NewsController.getAll);
  router.get('/news/:slug', NewsController.getBySlug);

  // Internal Routes (Bypassing global auth, protected by shared internal token)
  router.get('/internal/staff/:id/cv', async (req, res, next) => {
    // SEC-NEW-10: Use independent, high-entropy secret with timingSafeEqual
    const expectedToken = INTERNAL_API_SECRET;
    const providedToken = req.headers['x-internal-token'] as string || '';
    
    const expectedBuf = Buffer.from(expectedToken);
    const providedBuf = Buffer.from(providedToken);
    
    if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
      logger.warn({ ip: req.socket.remoteAddress, hostname: req.hostname }, 'Blocked unauthorized access to internal endpoint');
      return res.status(403).json({ error: 'FORBIDDEN_EXTERNAL' });
    }
    return next();
  }, StaffController.renderCvHtml);
  
  // Protected Routes - Mandatory Authentication
  router.use(requireAuth);

  // Me & Tenant Info (Enforced by requireAuth)
  router.get('/me', TenantController.getMe);
  router.get('/subscriptions/pricing', TenantController.getPricing);

  // Staff Management Routes
  router.get('/tenant/staff', requirePermission('staff:read'), StaffController.list);
  router.get('/tenant/staff/reputation', requirePermission('staff:read'), StaffController.checkReputation);
  router.post('/tenant/staff', requirePermission('staff:write'), idempotency, StaffController.create);
  router.get('/tenant/staff/:id/performance', requirePermission('staff:read'), StaffController.getPerformance);
  router.get('/tenant/staff/:id/cv-pdf', requirePermission('staff:read'), StaffController.exportPdf);
  router.post('/tenant/staff/:id/disciplinary', requirePermission('staff:write'), StaffController.addDisciplinary);
  router.put('/tenant/staff/:id', requirePermission('staff:write'), StaffController.update);
  router.delete('/tenant/staff/:id', requirePermission('staff:write'), idempotency, StaffController.delete);

  // Task Routes
  router.get('/tenant/tasks', requirePermission('task:read'), TaskController.list);
  router.post('/tenant/tasks', requirePermission('task:write'), idempotency, TaskController.create);
  router.put('/tenant/tasks/:id', requirePermission('task:write'), TaskController.update);
  router.delete('/tenant/tasks/:id', requirePermission('task:write'), idempotency, TaskController.delete);

  // Patrol Routes
  router.get('/tenant/patrol-logs', requirePermission('log:read'), PatrolController.getLogs);
  router.get('/tenant/checkpoints', requirePermission('checkpoint:read'), PatrolController.getCheckpoints);
  router.get('/security/patrol/checkpoints', requirePermission('checkpoint:read'), PatrolController.getCheckpoints); // Alias for mobile app compatibility
  router.post('/tenant/checkpoints', requirePermission('checkpoint:write'), idempotency, PatrolController.createCheckpoint);
  router.put('/tenant/checkpoints/:id', requirePermission('checkpoint:write'), PatrolController.updateCheckpoint);
  router.delete('/tenant/checkpoints/:id', requirePermission('checkpoint:write'), PatrolController.deleteCheckpoint);

  // ── BENCHMARK LEARNING MODE ──────────────────────────────────
  router.post('/sys-manage/checkpoints/:id/benchmark',
    requirePermission('checkpoint:write'),
    idempotency,
    async (req: any, res: any) => {
      try {
        const ctx = RequestContextResolver.resolve(req);
        const useCase = new RecordBenchmarkUseCase();
        const result = await useCase.execute(ctx, { id: req.params.id, data: req.body });
        res.json(result);
      } catch (err: any) {
        if (err.message === 'CHECKPOINT_NOT_FOUND') return res.status(404).json({ error: err.message });
        if (err.message?.startsWith('BENCHMARK_TOO_FAR')) return res.status(422).json({ error: err.message });
        if (err.message === 'UNAUTHORIZED_ACTION') return res.status(403).json({ error: err.message });
        logger.error({ err }, 'benchmark:record failed');
        res.status(500).json({ error: 'INTERNAL_ERROR' });
      }
    }
  );

  router.delete('/sys-manage/checkpoints/:id/benchmark',
    requirePermission('checkpoint:write'),
    async (req: any, res: any) => {
      try {
        const ctx = RequestContextResolver.resolve(req);
        const useCase = new ResetBenchmarkUseCase();
        const result = await useCase.execute(ctx, { id: req.params.id });
        res.json(result);
      } catch (err: any) {
        if (err.message === 'CHECKPOINT_NOT_FOUND') return res.status(404).json({ error: err.message });
        if (err.message === 'UNAUTHORIZED_ACTION') return res.status(403).json({ error: err.message });
        logger.error({ err }, 'benchmark:reset failed');
        res.status(500).json({ error: 'INTERNAL_ERROR' });
      }
    }
  );

  router.get('/sys-manage/benchmark/analytics',
    requirePermission('log:read'),
    async (req: any, res: any) => {
      try {
        const ctx = RequestContextResolver.resolve(req);
        const useCase = new GetBenchmarkAnalyticsUseCase();
        const result = await useCase.execute(ctx, req.query);
        res.json(result);
      } catch (err: any) {
        logger.error({ err }, 'benchmark:analytics failed');
        if (err.name === 'ZodError') return res.status(400).json({ error: 'INVALID_INPUT', details: err.errors });
        res.status(500).json({ error: 'INTERNAL_ERROR' });
      }
    }
  );
  // ─────────────────────────────────────────────────────────────
  
  router.post('/tenant/feedback', TenantController.submitFeedback);

  // Tenant yêu cầu nâng cấp gói — lưu DB + notify superadmin
  router.post('/tenant/upgrade-request', requireAuth, TenantController.requestUpgrade);

  router.get('/tenant/routes', requirePermission('log:read'), PatrolController.getRoutes);
  router.post('/tenant/patrol/analyze/:logId', requirePermission('log:read'), PatrolController.analyzeLog);
  router.get('/tenant/attendance', requirePermission('log:read'), PatrolController.getAttendance);
  router.post('/security/attendance/check', requirePermission('log:write'), PatrolController.checkAttendance);
  
  router.post('/tenant/patrol/upload-photo', upload.single('photo'), validateMagicBytes, PatrolController.uploadPhoto);
  router.post('/security/patrol/scan-qr', requirePermission('log:write'), idempotency, PatrolController.scanQR);
  router.post('/security/patrol/complete', requirePermission('log:write'), idempotency, PatrolController.complete);
  router.post('/security/incidents', requirePermission('log:write'), criticalLimiter, idempotency, IncidentController.create);
  router.get('/tenant/incidents', requirePermission('log:read'), IncidentController.list);
  router.get('/tenant/incidents/:id', requirePermission('log:read'), IncidentController.getById);
  router.post('/tenant/incidents/:id/assign', requirePermission('staff:write'), IncidentController.assign);
  router.post('/tenant/incidents/:id/status', requirePermission('staff:write'), IncidentController.updateStatus);
  router.get('/tenant/incidents/:id/export-pdf', requirePermission('staff:read'), pdfLimiter, IncidentController.exportPdf);
  router.post('/ai/analyze-incident-image', requireAuth, aiLimiter, IncidentController.analyzeImage);
  router.post('/ai/anomaly/:alertId/feedback', requireAuth, IncidentController.submitAnomalyFeedback);

  // Command Center & Monitor
  router.get('/tenant/command-center/feed', requirePermission('log:read'), CommandCenterController.getFeed);
  router.get('/tenant/command-center/map-data', requirePermission('log:read'), CommandCenterController.getMapData);
  router.get('/tenant/command-center/priorities', requirePermission('log:read'), CommandCenterController.getPriorities);
  router.get('/tenant/monitor/trust-score', requirePermission('log:read'), MonitorController.getTrustScore);
  router.get('/tenant/monitor/anomalies', requirePermission('log:read'), MonitorController.getAnomalies);
  router.get('/tenant/monitor/export-watcher-pdf', requirePermission('log:read'), pdfLimiter, MonitorController.exportPdf);
  router.get('/tenant/stats', requirePermission('log:read'), TenantController.getStats);
  router.get('/tenant/notifications', NotificationController.list);
  router.patch('/tenant/notifications/:id/read', NotificationController.markAsRead);
  router.post('/tenant/notifications/mark-all-read', NotificationController.markAllAsRead);
  router.get('/tenant/audit-logs', requirePermission('log:read'), TenantController.getAuditLogs);
  router.get('/tenant/settings', TenantController.getSettings);
  router.put('/tenant/settings', TenantController.updateSettings);

  // Attachment Management Routes
  router.get('/tenant/attachments', requirePermission('log:read'), AttachmentController.list);
  router.post('/tenant/attachments', requirePermission('log:write'), upload.single('file'), validateMagicBytes, AttachmentController.upload);
  router.patch('/tenant/attachments/:id', requirePermission('log:write'), AttachmentController.update);
  router.delete('/tenant/attachments/:id', requirePermission('log:write'), AttachmentController.delete);

  // Surprise Audit Routes
  router.get('/tenant/audits', requirePermission('staff:read'), AuditController.list);
  router.post('/tenant/audits', requirePermission('staff:write'), AuditController.create);

  // AI Analysis (Resilient via Circuit Breaker)
  router.post('/ai/analyze-patrol', requirePermission('log:read'), aiLimiter, aiQuotaTracking, async (req: any, res) => {
    try {
      const { gpsTrajectory, imageUri } = req.body;

      // SEC-05 Fix: Basic payload size validation
      if (imageUri && imageUri.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large (max 5MB)' });
      }
      if (gpsTrajectory && JSON.stringify(gpsTrajectory).length > 200 * 1024) {
        return res.status(400).json({ error: 'GPS Trajectory too large' });
      }

      const result = await GeminiService.analyzePatrolAnomaly(gpsTrajectory, imageUri);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'AI Analysis failed (Patrol)');
      return res.status(500).json({ error: 'AI analysis temporarily unavailable', code: 'AI_CIRCUIT_OPEN' });
    }
  });
  
  router.post('/ai/suggest-subdomain', aiLimiter, async (req: any, res) => {
    try {
      const { companyName } = req.body;
      if (!companyName) return res.status(400).json({ error: 'COMPANY_NAME_REQUIRED' });
      
      const text = await GeminiService.suggestSubdomain(companyName);
      return res.json({ subdomain: text });
    } catch (err: any) {
      logger.error({ err }, 'AI Suggest Subdomain failed');
      return res.status(500).json({ error: 'AI service temporarily unavailable' });
    }
  });

  router.post('/ai/analyze-behavior', requirePermission('log:read'), aiLimiter, aiQuotaTracking, async (req: any, res) => {
    try {
      const { logs, checkpoints, staffList } = req.body;
      const result = await GeminiService.analyzeBehaviorAnomaly(logs, checkpoints, staffList);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'AI Analysis failed (Behavior)');
      return res.status(500).json({ error: 'AI analysis temporarily unavailable', code: 'AI_CIRCUIT_OPEN' });
    }
  });

  // Predictive Guarding (Killer Feature PRO MAX)
  router.get('/security/patrol/predictive-analysis', requirePermission('report:generate'), async (req, res, next) => {
    try {
      return PredictiveGuardingController.getBlindSpotAnalysis(req, res, next);
    } catch (err: any) {
      logger.error({ err }, 'Predictive Analysis fail load');
      return res.status(500).json({ error: 'MODULE_LOAD_FAILURE' });
    }
  });

  router.post('/ai/analyze-log', requirePermission('log:read'), aiLimiter, aiQuotaTracking, async (req: any, res) => {
    try {
      const { logData, checkpoint } = req.body;
      const result = await GeminiService.analyzePatrolLog(logData, checkpoint);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'AI Analysis failed (Patrol Log)');
      return res.status(500).json({ error: 'AI analysis temporarily unavailable', code: 'AI_CIRCUIT_OPEN' });
    }
  });

  // Help Center
  router.get('/help/articles', requirePermission('staff:read'), HelpController.getArticles);

  // Report Routes
  router.post('/reports/generate-pdf', requirePermission('report:generate'), pdfLimiter, idempotency, ReportController.generatePDF);
  router.get('/reports/status/:id', ReportController.getJobStatus);
  router.get('/reports/smart-monthly', requirePermission('report:generate'), ReportController.getSmartMonthlyInsights);

  // Super Admin Routes
  router.get('/sys-manage/stats', requirePermission('system:manage'), SuperAdminController.getStats);
  router.get('/sys-manage/media-settings', requirePermission('system:manage'), SuperAdminController.getMediaSettings);
  router.put('/sys-manage/media-settings', requirePermission('system:manage'), SuperAdminController.updateMediaSettings);
  router.post('/sys-manage/integrity/check', requirePermission('system:manage'), SuperAdminController.runIntegrityCheck);
  router.get('/sys-manage/tenants', requirePermission('tenant:manage'), SuperAdminController.listTenants);
  router.post('/sys-manage/tenants/onboarding', requirePermission('tenant:manage'), SuperAdminController.onboardTenant);
  router.put('/sys-manage/tenants/:tenantId/subscription', requirePermission('tenant:manage'), SuperAdminController.updateSubscription);
  router.delete('/sys-manage/tenants/:tenantId', requirePermission('tenant:manage'), SuperAdminController.deleteTenant);

  // Danh sách yêu cầu nâng cấp từ tenant — superadmin xem và duyệt
  router.get('/sys-manage/upgrade-requests', requirePermission('tenant:manage'), SuperAdminController.listUpgradeRequests);
  router.patch('/sys-manage/upgrade-requests/:feedbackId/resolve', requirePermission('tenant:manage'), SuperAdminController.resolveUpgradeRequest);
  router.post('/sys-manage/tenants/:tenantId/activate', requirePermission('tenant:manage'), SuperAdminController.activateTenant);
  router.post('/sys-manage/tenants/:tenantId/suspend', requirePermission('tenant:manage'), SuperAdminController.suspendTenant);
  router.patch('/sys-manage/tenants/:tenantId/features', requirePermission('tenant:manage'), SuperAdminController.updateFeatures);
  router.patch('/sys-manage/tenants/:tenantId/max-employees', requirePermission('tenant:manage'), SuperAdminController.updateMaxEmployees);
  router.post('/sys-manage/tenants/:tenantId/reset-password', requirePermission('tenant:manage'), SuperAdminController.resetPassword);

  // Billing & Subscriptions Management
  router.get('/sys-manage/billing/tenants', requirePermission('billing:read'), async (req, res, next) => {
    return new BillingController().listTenants(req, res, next);
  });
  router.get('/sys-manage/billing/:tenantId', requirePermission('billing:read'), async (req, res, next) => {
    return new BillingController().getTenantBilling(req, res, next);
  });
  router.post('/sys-manage/billing/activate', requirePermission('billing:write'), async (req, res, next) => {
    return new BillingController().activate(req, res, next);
  });
  router.post('/sys-manage/billing/:tenantId/downgrade', requirePermission('billing:write'), async (req, res, next) => {
    return new BillingController().forceDowngrade(req, res, next);
  });
  
  // System Audit Logs (Global)
  router.get('/sys-manage/audit-logs', sysManageGlobalAuditLimiter, requirePermission('system:manage'), SuperAdminController.getGlobalAuditLogs);

  // DLQ Management
  router.get('/sys-manage/queues/dlq', requirePermission('system:manage'), SuperAdminController.listDLQJobs);
  router.post('/sys-manage/queues/dlq/:jobId/replay', requirePermission('system:manage'), SuperAdminController.replayDLQJob);

  // Vendor & Contract Management routes
  router.get('/sys-manage/vendors', requirePermission('vendor:read'), VendorController.listVendors);
  router.get('/sys-manage/vendors/:id/evaluation', requirePermission('vendor:read'), VendorController.getVendorEvaluation);
  router.post('/sys-manage/vendors', requirePermission('vendor:write'), VendorController.createVendor);
  router.put('/sys-manage/vendors/:id', requirePermission('vendor:write'), VendorController.updateVendor);
  router.get('/sys-manage/contracts', requirePermission('vendor:read'), VendorController.listContracts);
  router.post('/sys-manage/contracts', requirePermission('vendor:write'), VendorController.createContract);
  router.get('/sys-manage/compliance-scores', requirePermission('vendor:read'), VendorController.listComplianceScores);

  // News Management (Super Admin)
  router.get('/sys-manage/news', requirePermission('system:manage'), SuperAdminController.listNews);
  router.post('/sys-manage/news', requirePermission('system:manage'), SuperAdminController.createNews);
  router.put('/sys-manage/news/:id', requirePermission('system:manage'), SuperAdminController.updateNews);
  router.delete('/sys-manage/news/:id', requirePermission('system:manage'), SuperAdminController.deleteNews);

  // Role & Permission Management
  router.get('/sys-manage/permissions', requirePermission('system:manage'), SuperAdminController.getRolePermissions);
  router.patch('/sys-manage/permissions', requirePermission('system:manage'), SuperAdminController.updateRolePermissions);

  // SLO & Proactive Monitoring
  router.get('/sys-manage/slo/metrics', requireRole([UserRole.SUPER_ADMIN]), async (req, res, next) => {
    return AdminController.getSLOMetrics(req, res, next);
  });
  router.get('/sys-manage/slo/alerts', requireRole([UserRole.SUPER_ADMIN]), async (req, res, next) => {
    return AdminController.getSLOAlerts(req, res, next);
  });

  return router;
}