import { Router } from 'express';
import { sysManageGlobalAuditLimiter } from './core/middleware/rate-limit.middleware.js';
import { logger } from './core/logger/index.js';
import { timingSafeStringEqual } from './core/security/constant-time.js';
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
import { requireAuth, requireRole, requirePermission, requireAnyPermission, requireFeature, requireContractRuleEngineReady } from './shared/middlewares/auth.middleware.js';
import { UserRole } from './core/architecture/types.js';
import { upload, validateMagicBytes } from './shared/middlewares/upload.middleware.js';
import { authLimiter, criticalLimiter, pdfLimiter, aiLimiter, aiQuotaTracking } from './app.js';
import { trialRegisterLimiter, publicContactLeadLimiter } from './core/middleware/rate-limit.middleware.js';
import { idempotency } from './core/middleware/idempotency.middleware.js';
import { metrics } from './core/metrics.js';
import { AlertAggregatorService } from './core/queue/aggregator.service.js';
import { TenantRepository } from './modules/tenant/tenant.repository.js';
import { GeminiService } from './core/ai/gemini.service.js';
import { PredictiveGuardingController } from './modules/security/predictive-guarding.controller.js';
import { BillingController } from './modules/superadmin/billing/billing.controller.js';
import { AdminController } from './modules/admin/admin.controller.js';
import { ContactLeadController } from './modules/public/contact-lead.controller.js';

export function createRouter() {
  const router = Router();

  // Metrics (Internal monitoring)
  router.get('/monitor/metrics', requireAuth, requireRole([UserRole.SUPER_ADMIN]), async (req: any, res: any) => {
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

  // Public Contact Lead Routes (no tenant/auth context; stored in platform scope)
  router.post('/public/contact-leads', publicContactLeadLimiter, ContactLeadController.submit);

  // Auth Routes
  router.get('/auth/captcha', AuthController.getCaptcha);
  router.post('/auth/login', authLimiter, AuthController.login);
  // [FIX H-01]: Dùng trialRegisterLimiter (5 req/giờ) thay vì authLimiter (20 req/15 phút)
  // authLimiter quá lỏng → kẻ tấn công spam tạo tenant giả với proxy pool
  router.post('/auth/trial-register', trialRegisterLimiter, AuthController.trialRegister);
  router.get('/auth/verify-trial', AuthController.verifyTrialEmail);
  router.post('/auth/refresh', AuthController.refresh);
  router.post('/auth/logout', AuthController.logout);

  router.post('/ai/suggest-subdomain', aiLimiter, async (req: any, res) => {
    try {
      const { companyName } = req.body;
      if (!companyName) return res.status(400).json({ error: 'COMPANY_NAME_REQUIRED' });

      const text = await GeminiService.suggestSubdomain(companyName);
      return res.json({ subdomain: text });
    } catch (err: any) {
      logger.error({ err }, 'AI Suggest Subdomain failed');
      return res.status(500).json({ error: 'Dịch vụ AI tạm thời không khả dụng' });
    }
  });
  
  // News Routes (Public)
  router.get('/news', NewsController.getAll);
  router.get('/news/:slug', NewsController.getBySlug);

  // Internal Routes (Bypassing global auth, protected by shared internal token)
  router.get('/internal/staff/:id/cv', async (req, res, next) => {
    // SEC-NEW-10: Use independent, high-entropy secret with timingSafeEqual
    const expectedToken = INTERNAL_API_SECRET;
    const providedToken = req.headers['x-internal-token'] as string || '';
    
    if (!timingSafeStringEqual(expectedToken, providedToken)) {
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
    requireFeature('benchmark_mode'),
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
    requireFeature('benchmark_mode'),
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
    requireFeature('benchmark_mode'),
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
  
  router.post('/tenant/feedback', requirePermission('log:write'), TenantController.submitFeedback);

  // Tenant yêu cầu nâng cấp gói — lưu DB + notify superadmin
  router.post('/tenant/upgrade-request', requireAuth, TenantController.requestUpgrade);

  router.get('/tenant/routes', requireFeature('patrol_route'), requirePermission('log:read'), PatrolController.getRoutes);
  router.post('/tenant/routes', requireFeature('patrol_route'), requirePermission('checkpoint:write'), idempotency, PatrolController.createRoute);
  router.get('/tenant/patrol-assignments', requireFeature('patrol_route'), requirePermission('log:read'), PatrolController.listAssignments);
  router.post('/tenant/patrol-assignments', requireFeature('patrol_route'), requireFeature('shift_planning'), requirePermission('staff:write'), idempotency, PatrolController.createAssignment);
  router.post('/security/shift-sessions/open', requirePermission('log:write'), idempotency, PatrolController.openShiftSession);
  router.post('/security/patrol-sessions/start', requireFeature('patrol_route'), requirePermission('log:write'), idempotency, PatrolController.startPatrolSession);
  router.post('/security/patrol-sessions/:id/complete', requireFeature('patrol_route'), requirePermission('log:write'), idempotency, PatrolController.completePatrolSession);
  router.get('/tenant/patrol-exceptions', requireFeature('patrol_route'), requirePermission('log:read'), PatrolController.listPatrolExceptions);
  router.post('/tenant/patrol/analyze/:logId', requirePermission('log:read'), PatrolController.analyzeLog);
  router.get('/tenant/attendance/me', requirePermission('log:read'), PatrolController.getMyAttendance);
  router.get('/tenant/attendance', requirePermission('log:read'), PatrolController.getAttendance);
  router.get('/tenant/attendance/ops-summary', requirePermission('log:read'), PatrolController.getAttendanceOpsSummary);
  router.post('/tenant/attendance/check-in', requirePermission('log:write'), PatrolController.checkInAttendance);
  router.post('/tenant/attendance/check-out', requirePermission('log:write'), PatrolController.checkOutAttendance);
  router.post('/security/attendance/check', requirePermission('log:write'), PatrolController.checkAttendance);
  
  // [FIX C-03]: Thêm requirePermission('log:write') - trước đây chỉ có upload.single + validateMagicBytes
  // → mọi user đã xác thực (kể cả GUARD không có quyền) đều upload được ảnh lên storage của tenant bất kỳ
  router.post('/tenant/patrol/upload-photo', requireFeature('evidence_storage'), requirePermission('log:write'), upload.single('photo'), validateMagicBytes, PatrolController.uploadPhoto);
  router.post('/security/patrol/scan-qr', requireFeature('patrol_route'), requirePermission('log:write'), idempotency, PatrolController.scanQR);
  router.post('/security/patrol/complete', requireFeature('patrol_route'), requirePermission('log:write'), idempotency, PatrolController.complete);
  router.post('/security/incidents', requireFeature('incident_sla'), requirePermission('log:write'), criticalLimiter, idempotency, IncidentController.create);
  router.get('/tenant/incidents', requireFeature('incident_sla'), requirePermission('log:read'), IncidentController.list);
  router.get('/tenant/incidents/:id', requireFeature('incident_sla'), requirePermission('log:read'), IncidentController.getById);
  router.post('/tenant/incidents/:id/acknowledge', requireFeature('incident_sla'), requirePermission('staff:write'), IncidentController.acknowledge);
  router.post('/tenant/incidents/:id/assign', requireFeature('incident_sla'), requirePermission('staff:write'), IncidentController.assign);
  router.post('/tenant/incidents/:id/evidence', requireFeature('incident_sla'), requireFeature('evidence_storage'), requirePermission('log:write'), idempotency, IncidentController.addEvidence);
  router.patch('/tenant/incidents/:id/evidence/:evidenceId/status', requireFeature('incident_sla'), requireFeature('evidence_storage'), requirePermission('staff:write'), IncidentController.updateEvidenceStatus);
  router.post('/tenant/incidents/:id/status', requireFeature('incident_sla'), requirePermission('staff:write'), IncidentController.updateStatus);
  router.post('/tenant/incidents/:id/approve-resolution', requireFeature('incident_sla'), requirePermission('staff:write'), IncidentController.approveResolution);
  router.post('/tenant/incidents/:id/reject-resolution', requireFeature('incident_sla'), requirePermission('staff:write'), IncidentController.rejectResolution);
  router.post('/tenant/incidents/:id/close', requireFeature('incident_sla'), requirePermission('staff:write'), idempotency, IncidentController.close);
  router.get('/tenant/incidents/:id/export-pdf', requireFeature('incident_sla'), requireFeature('export_pdf'), requirePermission('staff:read'), pdfLimiter, IncidentController.exportPdf);
  router.post('/ai/analyze-incident-image', requirePermission('log:write'), aiLimiter, IncidentController.analyzeImage);
  router.post('/ai/anomaly/:alertId/feedback', requirePermission('log:write'), IncidentController.submitAnomalyFeedback);

  // Command Center & Monitor
  router.get('/tenant/command-center/feed', requirePermission('log:read'), CommandCenterController.getFeed);
  router.get('/tenant/command-center/map-data', requirePermission('log:read'), CommandCenterController.getMapData);
  router.get('/tenant/command-center/priorities', requirePermission('log:read'), CommandCenterController.getPriorities);
  router.get('/tenant/monitor/trust-score', requirePermission('log:read'), MonitorController.getTrustScore);
  router.get('/tenant/monitor/anomalies', requirePermission('log:read'), MonitorController.getAnomalies);
  router.get('/tenant/monitor/export-watcher-pdf', requirePermission('log:read'), pdfLimiter, MonitorController.exportPdf);
  router.get('/tenant/stats', requirePermission('log:read'), TenantController.getStats);
  router.get('/tenant/notifications', requirePermission('log:read'), NotificationController.list);
  router.patch('/tenant/notifications/:id/read', requirePermission('log:read'), NotificationController.markAsRead);
  router.post('/tenant/notifications/mark-all-read', requirePermission('log:read'), NotificationController.markAllAsRead);
  router.get('/tenant/audit-logs', requirePermission('log:read'), TenantController.getAuditLogs);
  router.get('/tenant/settings', requirePermission('staff:write'), TenantController.getSettings);
  router.put('/tenant/settings', requirePermission('staff:write'), TenantController.updateSettings);
  router.get('/security/guard/profile', requireRole([UserRole.GUARD]), requirePermission('log:read'), TenantController.getGuardProfile);

  // Attachment Management Routes
  router.get('/tenant/attachments', requireFeature('evidence_storage'), requirePermission('log:read'), AttachmentController.list);
  router.post('/tenant/attachments', requireFeature('evidence_storage'), requirePermission('log:write'), upload.single('file'), validateMagicBytes, AttachmentController.upload);
  router.patch('/tenant/attachments/:id', requireFeature('evidence_storage'), requirePermission('log:write'), AttachmentController.update);
  router.delete('/tenant/attachments/:id', requireFeature('evidence_storage'), requirePermission('log:write'), AttachmentController.delete);

  // Surprise Audit Routes
  router.get('/tenant/audits', requirePermission('staff:read'), AuditController.list);
  router.post('/tenant/audits', requirePermission('staff:write'), AuditController.create);

  // AI Analysis (Resilient via Circuit Breaker)
  router.post('/ai/analyze-patrol', requireFeature('patrol_route'), requirePermission('log:read'), aiLimiter, aiQuotaTracking, async (req: any, res) => {
    try {
      const { gpsTrajectory, imageUri } = req.body;

      // SEC-05 Fix: Basic payload size validation
      if (imageUri && imageUri.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Ảnh tải lên quá lớn, dung lượng tối đa là 5 MB' });
      }
      if (gpsTrajectory && JSON.stringify(gpsTrajectory).length > 200 * 1024) {
        return res.status(400).json({ error: 'Dữ liệu hành trình GPS vượt quá kích thước cho phép' });
      }

      const result = await GeminiService.analyzePatrolAnomaly(gpsTrajectory, imageUri);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'AI Analysis failed (Patrol)');
      return res.status(500).json({ error: 'Phân tích AI tạm thời không khả dụng', code: 'AI_CIRCUIT_OPEN' });
    }
  });
  
  router.post('/ai/analyze-behavior', requireFeature('predictive_guard'), requirePermission('log:read'), aiLimiter, aiQuotaTracking, async (req: any, res) => {
    try {
      const { logs, checkpoints, staffList } = req.body;
      const result = await GeminiService.analyzeBehaviorAnomaly(logs, checkpoints, staffList);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'AI Analysis failed (Behavior)');
      return res.status(500).json({ error: 'Phân tích AI tạm thời không khả dụng', code: 'AI_CIRCUIT_OPEN' });
    }
  });

  // Predictive Guarding (Killer Feature PRO MAX)
  router.get('/security/patrol/predictive-analysis', requireFeature('predictive_guard'), requirePermission('report:generate'), async (req, res, next) => {
    try {
      return PredictiveGuardingController.getBlindSpotAnalysis(req, res, next);
    } catch (err: any) {
      logger.error({ err }, 'Predictive Analysis fail load');
      return res.status(500).json({ error: 'Không thể tải mô-đun phân tích dự báo' });
    }
  });

  router.post('/ai/analyze-log', requireFeature('patrol_route'), requirePermission('log:read'), aiLimiter, aiQuotaTracking, async (req: any, res) => {
    try {
      const { logData, checkpoint } = req.body;
      const result = await GeminiService.analyzePatrolLog(logData, checkpoint);
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'AI Analysis failed (Patrol Log)');
      return res.status(500).json({ error: 'Phân tích AI tạm thời không khả dụng', code: 'AI_CIRCUIT_OPEN' });
    }
  });

  // Help Center
  router.get('/help/articles', requirePermission('staff:read'), HelpController.getArticles);

  // Report Routes
  router.post('/reports/generate-pdf', requireFeature('export_pdf'), requirePermission('report:generate'), pdfLimiter, idempotency, ReportController.generatePDF);
  router.get('/reports/status/:id', requireFeature('monthly_acceptance_report'), requirePermission('report:generate'), ReportController.getJobStatus);
  router.get('/reports/smart-monthly', requireFeature('usage_analytics'), requirePermission('report:generate'), ReportController.getSmartMonthlyInsights);
  router.get('/tenant/vendor-scorecards', requireFeature('vendor_scorecard'), requirePermission('vendor:read'), ReportController.listVendorScorecards);
  router.get('/tenant/monthly-acceptance-reports', requireFeature('monthly_acceptance_report'), requirePermission('report:generate'), ReportController.listMonthlyAcceptanceReports);
  router.post('/tenant/monthly-acceptance-reports/generate', requireFeature('monthly_acceptance_report'), requireFeature('penalty_engine'), requirePermission('report:generate'), idempotency, ReportController.generateMonthlyAcceptanceReport);
  router.get('/tenant/monthly-acceptance-reports/:id/version-binding', requireFeature('monthly_acceptance_report'), requirePermission('report:generate'), ReportController.getMonthlyAcceptanceVersionBinding);
  router.post('/tenant/monthly-acceptance-reports/:id/revisions', requireFeature('monthly_acceptance_report'), requirePermission('report:finalize'), idempotency, ReportController.createMonthlyAcceptanceRevision);
  router.post('/tenant/monthly-acceptance-reports/:id/finalize', requireFeature('monthly_acceptance_report'), requirePermission('report:finalize'), idempotency, ReportController.finalizeMonthlyAcceptanceReport);
  router.post('/tenant/monthly-acceptance-reports/:id/export', requireFeature('monthly_acceptance_report'), requireFeature('export_pdf'), requirePermission('report:generate'), idempotency, ReportController.queueMonthlyAcceptanceExport);
  router.get('/tenant/monthly-acceptance-reports/:id/artifacts/:attachmentId/download', requireFeature('monthly_acceptance_report'), requirePermission('report:generate'), ReportController.downloadMonthlyAcceptanceArtifact);
  router.get('/tenant/violation-disputes', requireFeature('monthly_acceptance_report'), requireAnyPermission(['vendor:dispute:view', 'violation:review', 'violation:resolve']), ReportController.listViolationDisputes);
  router.post('/tenant/violation-disputes', requireFeature('monthly_acceptance_report'), requirePermission('vendor:dispute:submit'), idempotency, ReportController.submitViolationDispute);
  router.post('/tenant/violation-disputes/:id/resolve', requireFeature('monthly_acceptance_report'), requirePermission('violation:resolve'), idempotency, ReportController.resolveViolationDispute);

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
  router.get('/sys-manage/vendors', requireFeature('vendor_management'), requirePermission('vendor:read'), VendorController.listVendors);
  router.get('/sys-manage/vendors/:id/evaluation', requireFeature('vendor_scorecard'), requirePermission('vendor:read'), VendorController.getVendorEvaluation);
  router.post('/sys-manage/vendors', requireFeature('vendor_management'), requirePermission('vendor:write'), VendorController.createVendor);
  router.put('/sys-manage/vendors/:id', requireFeature('vendor_management'), requirePermission('vendor:write'), VendorController.updateVendor);
  router.get('/sys-manage/sites', requireFeature('contract_compliance'), requirePermission('vendor:read'), VendorController.listSites);
  router.post('/sys-manage/sites', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.createSite);
  router.put('/sys-manage/sites/:id', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.updateSite);
  router.get('/sys-manage/guard-posts', requireFeature('contract_compliance'), requirePermission('vendor:read'), VendorController.listGuardPosts);
  router.post('/sys-manage/guard-posts', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.createGuardPost);
  router.put('/sys-manage/guard-posts/:id', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.updateGuardPost);
  router.get('/sys-manage/contracts', requireFeature('contract_compliance'), requirePermission('vendor:read'), VendorController.listContracts);
  router.post('/sys-manage/contracts', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.createContract);
  router.put('/sys-manage/contracts/:id', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.updateContract);
  router.post('/sys-manage/contracts/:id/ai-scan', requireFeature('ai_contract_scan'), requireContractRuleEngineReady(), requirePermission('vendor:write'), VendorController.requestContractAiScan);
  router.get('/sys-manage/compliance-scores', requireFeature('vendor_scorecard'), requirePermission('vendor:read'), VendorController.listComplianceScores);

  // Backward-compatible tenant admin aliases used by the security workspace UI.
  router.get('/admin/vendors', requireFeature('vendor_management'), requirePermission('vendor:read'), VendorController.listVendors);
  router.get('/admin/vendors/:id/evaluation', requireFeature('vendor_scorecard'), requirePermission('vendor:read'), VendorController.getVendorEvaluation);
  router.post('/admin/vendors', requireFeature('vendor_management'), requirePermission('vendor:write'), VendorController.createVendor);
  router.put('/admin/vendors/:id', requireFeature('vendor_management'), requirePermission('vendor:write'), VendorController.updateVendor);
  router.get('/admin/sites', requireFeature('contract_compliance'), requirePermission('vendor:read'), VendorController.listSites);
  router.post('/admin/sites', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.createSite);
  router.put('/admin/sites/:id', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.updateSite);
  router.get('/admin/guard-posts', requireFeature('contract_compliance'), requirePermission('vendor:read'), VendorController.listGuardPosts);
  router.post('/admin/guard-posts', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.createGuardPost);
  router.put('/admin/guard-posts/:id', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.updateGuardPost);
  router.get('/admin/contracts', requireFeature('contract_compliance'), requirePermission('vendor:read'), VendorController.listContracts);
  router.post('/admin/contracts', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.createContract);
  router.put('/admin/contracts/:id', requireFeature('contract_compliance'), requirePermission('vendor:write'), VendorController.updateContract);
  router.post('/admin/contracts/:id/ai-scan', requireFeature('ai_contract_scan'), requireContractRuleEngineReady(), requirePermission('vendor:write'), VendorController.requestContractAiScan);
  router.get('/admin/contracts/:contractId/versions', requireFeature('contract_compliance'), requireRole([UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN]), requirePermission('vendor:read'), VendorController.listContractVersions);
  router.post('/admin/contracts/:contractId/versions', requireFeature('contract_compliance'), requireRole([UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN]), requirePermission('vendor:write'), idempotency, VendorController.createContractVersion);
  router.post('/admin/contracts/:contractId/versions/:versionId/activate', requireFeature('contract_compliance'), requireRole([UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN]), requirePermission('vendor:write'), idempotency, VendorController.activateContractVersion);
  router.post('/admin/contracts/:contractId/versions/:versionId/archive', requireFeature('contract_compliance'), requireRole([UserRole.TENANT_ADMIN, UserRole.SUPER_ADMIN]), requirePermission('vendor:write'), idempotency, VendorController.archiveContractVersion);
  router.get('/admin/shift-schedules', requireFeature('shift_planning'), requirePermission('vendor:read'), VendorController.listShiftSchedules);
  router.post('/admin/shift-schedules/generate', requireFeature('shift_planning'), requireFeature('vendor_commander'), requirePermission('staff:write'), idempotency, VendorController.generateShiftSchedules);
  router.post('/admin/shift-assignments', requireFeature('shift_planning'), requireFeature('vendor_commander'), requirePermission('staff:write'), idempotency, VendorController.assignShift);
  router.delete('/admin/shift-assignments/:id', requireFeature('shift_planning'), requireFeature('vendor_commander'), requirePermission('staff:write'), idempotency, VendorController.removeShiftAssignment);
  router.get('/admin/compliance-scores', requireFeature('vendor_scorecard'), requirePermission('vendor:read'), VendorController.listComplianceScores);

  // Dedicated Vendor Commander API aliases: role-scoped, feature-gated, repository-enforced by vendor/site/contract scope.
  router.get('/vendor-commander/contracts', requireFeature('vendor_commander'), requireFeature('contract_compliance'), requireRole([UserRole.VENDOR_COMMANDER]), requirePermission('vendor:read'), VendorController.listContracts);
  router.get('/vendor-commander/shift-schedules', requireFeature('vendor_commander'), requireFeature('shift_planning'), requireRole([UserRole.VENDOR_COMMANDER]), requirePermission('vendor:read'), VendorController.listShiftSchedules);
  router.post('/vendor-commander/shift-schedules/generate', requireFeature('vendor_commander'), requireFeature('shift_planning'), requireRole([UserRole.VENDOR_COMMANDER]), requirePermission('staff:write'), idempotency, VendorController.generateShiftSchedules);
  router.post('/vendor-commander/shift-assignments', requireFeature('vendor_commander'), requireFeature('shift_planning'), requireRole([UserRole.VENDOR_COMMANDER]), requirePermission('staff:write'), idempotency, VendorController.assignShift);
  router.delete('/vendor-commander/shift-assignments/:id', requireFeature('vendor_commander'), requireFeature('shift_planning'), requireRole([UserRole.VENDOR_COMMANDER]), requirePermission('staff:write'), idempotency, VendorController.removeShiftAssignment);

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
