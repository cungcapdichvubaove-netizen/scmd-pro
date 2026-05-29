import { Request, Response, NextFunction } from 'express';
import { logger } from '../../core/logger/index.js';
import { INTERNAL_API_SECRET } from '../../core/auth/secrets.js';
import { timingSafeStringEqual } from '../../core/security/constant-time.js';
import { RequestContextResolver } from '../../core/context/index.js';
import { ListStaffUseCase } from './application/list-staff.usecase.js';
import { CreateStaffUseCase } from './application/create-staff.usecase.js';
import { UpdateStaffUseCase } from './application/update-staff.usecase.js';
import { DeleteStaffUseCase } from './application/delete-staff.usecase.js';
import { GetStaffPerformanceUseCase } from './application/get-staff-performance.usecase.js';
import { AddDisciplinaryActionUseCase } from './application/add-disciplinary-action.usecase.js';
import { CheckReputationUseCase } from './application/check-reputation.usecase.js';
import { ExportStaffCvPdfUseCase } from './application/export-staff-cv-pdf.usecase.js';
import { StaffRepository } from './staff.repository.js';
import { createStaffSchema, updateStaffSchema } from './staff.schema.js';

export class StaffController {
  private static handleStaffBusinessError(err: any, res: Response): boolean {
    const message = err?.message;

    if (message === 'CONFLICT_USERNAME') {
      res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
      return true;
    }

    if (
      message === 'FORBIDDEN_ACTION' ||
      message === 'VENDOR_COMMANDER_CAN_ONLY_CREATE_GUARDS' ||
      message === 'VENDOR_COMMANDER_CAN_ONLY_UPDATE_GUARDS' ||
      message === 'VENDOR_COMMANDER_CAN_ONLY_DELETE_GUARDS'
    ) {
      res.status(403).json({ error: message });
      return true;
    }

    if (
      message === 'VENDOR_SCOPE_REQUIRED' ||
      message === 'VENDOR_SCOPE_MISMATCH' ||
      message === 'SITE_SCOPE_MISMATCH' ||
      message === 'CONTRACT_SCOPE_MISMATCH'
    ) {
      res.status(400).json({ error: message });
      return true;
    }

    if (message === 'NOT_FOUND_OR_ACCESS_DENIED') {
      res.status(404).json({ error: message });
      return true;
    }

    return false;
  }

  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const ctx = RequestContextResolver.resolve(req);
      const { cursor, limit, role, status, search, view } = req.query;
      
      const useCase = new ListStaffUseCase();
      const staff = await useCase.execute(ctx, { 
        cursor: cursor as string,
        limit: limit ? Math.min(parseInt(limit as string, 10), 200) : 20,
        role: role as string,
        status: status as string,
        search: search as string,
        view: view as string
      });
      return res.json(staff);
    } catch (err: any) {
      logger.error({ err }, 'List staff error');
      return next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      // FIX [TENANT-ID-BUG]: Parse client body TRƯỚC (không có tenantId),
      // sau đó inject tenantId từ SecurityContext server-side.
      // createStaffSchema đã omit tenantId — client không được phép gửi tenantId lên.
      // SUPER_ADMIN có tenantId="SYSTEM" (không phải UUID) sẽ không bị Zod reject ở bước parse.
      const ctx = RequestContextResolver.resolve(req);
      const partialData = createStaffSchema.parse(req.body);
      const data = { ...partialData, tenantId: ctx.tenantId };
      const useCase = new CreateStaffUseCase();
      
      try {
        const staff = await useCase.execute(ctx, data);
        return res.status(201).json(staff);
      } catch (txErr: any) {
        if (StaffController.handleStaffBusinessError(txErr, res)) {
          return;
        }
        throw txErr;
      }
    } catch (err: any) {
      logger.error({ err }, 'Create staff error');
      return next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateStaffSchema.parse(req.body);
      const { id } = req.params;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new UpdateStaffUseCase();
      
      try {
        await useCase.execute(ctx, { id: id as string, data });
      } catch (txErr: any) {
        if (StaffController.handleStaffBusinessError(txErr, res)) {
          return;
        }
        throw txErr;
      }
      return res.json({ success: true });
    } catch (err: any) {
      logger.error({ err }, 'Update staff error');
      return next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new DeleteStaffUseCase();
      
      try {
        await useCase.execute(ctx, id as string);
      } catch (txErr: any) {
        if (StaffController.handleStaffBusinessError(txErr, res)) {
          return;
        }
        throw txErr;
      }
      return res.json({ success: true });
    } catch (err: any) {
      logger.error({ err }, 'Delete staff error');
      return next(err);
    }
  }

  static async getPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new GetStaffPerformanceUseCase();
      const performance = await useCase.execute(ctx, id as string);
      return res.json(performance);
    } catch (err: any) {
      logger.error({ err }, 'Get staff performance error');
      return next(err);
    }
  }

  static async addDisciplinary(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new AddDisciplinaryActionUseCase();
      const action = await useCase.execute(ctx, { ...req.body, staffId: id as string });
      return res.status(201).json(action);
    } catch (err: any) {
      logger.error({ err }, 'Add disciplinary action error');
      return next(err);
    }
  }

  static async checkReputation(req: Request, res: Response, next: NextFunction) {
    try {
      const { idNumber } = req.query;
      const ctx = RequestContextResolver.resolve(req);
      const useCase = new CheckReputationUseCase();
      const result = await useCase.execute(ctx, { idNumber: idNumber as string });
      return res.json(result);
    } catch (err: any) {
      logger.error({ err }, 'Check reputation error');
      return next(err);
    }
  }

  static async exportPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const fields = req.query.fields as string;
      const useCase = new ExportStaffCvPdfUseCase();
      const result = await useCase.execute({ id: id as string, fields });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${result.fileName}`);
      return res.send(result.buffer);
    } catch (err: any) {
      logger.error({ err }, 'Export staff PDF error');
      return next(err);
    }
  }

  static async renderCvHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const fields = req.query.fields as string;
      
      const expectedToken = INTERNAL_API_SECRET;
      const providedToken = req.headers['x-internal-token'] as string || '';
      
      if (!timingSafeStringEqual(expectedToken, providedToken)) {
        return res.status(403).send('FORBIDDEN');
      }

      // SEC-NEW-2: Derive tenantId from staff record to prevent IDOR
      const exportData = await StaffRepository.getInternalExportData(id as string);

      if (!exportData) return res.status(404).send('Không tìm thấy nhân sự');

      const { staff, tenant } = exportData;

      const enabledFields = (fields || '').split(',').map(f => f.trim()).filter(Boolean);
      const hasField = (f: string) => enabledFields.length === 0 || enabledFields.includes(f);

      const staffData: any = staff;

      // Render a robust HTML optimized for PDF generation
      const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --navy: #0D1324;
            --primary: #2563EB;
            --accent: #4285F4;
            --silver: #CCD6F6;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', 'Roboto', 'DejaVu Sans', 'Liberation Sans', Arial, sans-serif;
            background: white; 
            color: var(--navy);
            line-height: 1.6;
            -webkit-print-color-adjust: exact;
        }
        .header {
            background: var(--navy) !important;
            color: white !important;
            padding: 50px 40px;
            text-align: center;
        }
        .header h1 {
            font-weight: 900;
            font-size: 28px;
            letter-spacing: 0.1em;
            margin-bottom: 8px;
            color: #00FFF2 !important;
        }
        .header p {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            opacity: 0.7;
        }
        .content {
            padding: 50px 60px;
        }
        .section {
            margin-bottom: 35px;
            page-break-inside: avoid;
        }
        .section-title {
            font-weight: 900;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: var(--navy);
            margin-bottom: 12px;
            border-left: 4px solid var(--primary);
            padding-left: 12px;
        }
        .section-content {
            font-size: 13px;
            color: #4A5568;
            padding-left: 16px;
        }
        .badge-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .badge {
            background: #EDF2F7 !important;
            padding: 4px 12px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 11px;
            color: var(--primary) !important;
            display: inline-block;
        }
        .footer {
            margin-top: 80px;
            display: flex;
            justify-content: space-between;
            padding: 0 60px 60px 60px;
            page-break-inside: avoid;
        }
        .signature-box {
            text-align: center;
            width: 200px;
        }
        .signature-title {
            font-weight: 900;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 60px;
        }
        .signature-line {
            font-size: 10px;
            opacity: 0.5;
            border-top: 1px dotted #CBD5E0;
            padding-top: 8px;
        }
        .staff-id {
            background: #F7FAFC !important;
            padding: 4px 10px;
            border-radius: 4px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>HỒ SƠ NHÂN SỰ CHUYÊN NGHIỆP</h1>
        <p>${tenant?.name || 'SCMD PRO'} • HỆ THỐNG QUẢN TRỊ AN NINH TẬP TRUNG</p>
    </div>

    <div class="content">
        ${hasField('name') ? `
        <div class="section">
            <div class="section-title">Họ và tên</div>
            <div class="section-content"><strong style="font-size: 18px;">${staffData.fullName}</strong></div>
        </div>
        ` : ''}

        ${hasField('staffId') ? `
        <div class="section">
            <div class="section-title">Mã nhân viên</div>
            <div class="section-content"><span class="staff-id">${staffData.staffId || 'N/A'}</span></div>
        </div>
        ` : ''}

        ${hasField('role') ? `
        <div class="section">
            <div class="section-title">Vai trò hệ thống</div>
            <div class="section-content"><span class="badge" style="background: var(--primary) !important; color: white !important;">${(staffData.role || 'N/A').toUpperCase()}</span></div>
        </div>
        ` : ''}

        ${hasField('qualifications') && Array.isArray(staffData.qualifications) && staffData.qualifications.length > 0 ? `
        <div class="section">
            <div class="section-title">Bằng cấp & Học vấn</div>
            <div class="section-content">
                <div class="badge-list">
                    ${staffData.qualifications.map((q: string) => `<span class="badge">${q}</span>`).join('')}
                </div>
            </div>
        </div>
        ` : ''}

        ${hasField('certificates') && Array.isArray(staffData.certificates) && staffData.certificates.length > 0 ? `
        <div class="section">
            <div class="section-title">Chứng chỉ chuyên môn</div>
            <div class="section-content">
                <ul style="list-style: none;">
                    ${staffData.certificates.map((c: string) => `<li style="margin-bottom: 5px;">✓ ${c}</li>`).join('')}
                </ul>
            </div>
        </div>
        ` : ''}

        ${hasField('rewards') && staffData.rewards ? `
        <div class="section">
            <div class="section-title">Thành tích & Khen thưởng</div>
            <div class="section-content">${staffData.rewards}</div>
        </div>
        ` : ''}

        ${hasField('disciplines') && staffData.disciplines ? `
        <div class="section">
            <div class="section-title">Lịch sử Kỷ luật</div>
            <div class="section-content" style="color: #E53E3E;">${staffData.disciplines}</div>
        </div>
        ` : ''}
    </div>

    <div class="footer">
        <div class="signature-box">
            <div class="signature-title">Nhân viên ký tên</div>
            <div class="signature-line">(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="signature-box">
            <div class="signature-title">Xác nhận của đơn vị</div>
            <div class="signature-line">(Ký tên và đóng dấu)</div>
        </div>
    </div>
</body>
</html>
      `;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (err: any) {
      logger.error({ err }, 'Render staff CV error');
      return next(err);
    }
  }
}
