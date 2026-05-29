export type ReportColumn<T extends Record<string, unknown>> = {
  key: keyof T | string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  format?: (value: unknown, row: T) => string;
};

export type ReportSummaryItem = {
  label: string;
  value: string | number;
  note?: string;
};

export type ReportMetadata = {
  title: string;
  subtitle?: string;
  organizationName?: string;
  unitName?: string;
  reportPeriod?: string;
  generatedBy?: string;
  generatedAt?: Date;
  logoUrl?: string;
  footerNote?: string;
};

const DEFAULT_LOGO_URL = '/logo_scmd_pro.png';

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const formatVietnamDateTime = (value: Date | string | number = new Date()): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const formatVietnamDate = (value: Date | string | number): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? '');
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const getCellValue = <T extends Record<string, unknown>>(row: T, column: ReportColumn<T>): string => {
  const raw = row[column.key as keyof T];
  return column.format ? column.format(raw, row) : String(raw ?? '');
};

const buildReportHtml = <T extends Record<string, unknown>>(
  metadata: ReportMetadata,
  columns: ReportColumn<T>[],
  rows: T[],
  summary: ReportSummaryItem[] = [],
): string => {
  const generatedAt = formatVietnamDateTime(metadata.generatedAt ?? new Date());
  const logoUrl = metadata.logoUrl || DEFAULT_LOGO_URL;
  const orgName = metadata.organizationName || 'SCMD Pro';
  const unitName = metadata.unitName || 'Hệ thống giám sát dịch vụ bảo vệ thuê ngoài';

  const summaryHtml = summary.length > 0 ? `
    <section class="summary-grid">
      ${summary.map(item => `
        <div class="summary-card">
          <div class="summary-label">${escapeHtml(item.label)}</div>
          <div class="summary-value">${escapeHtml(item.value)}</div>
          ${item.note ? `<div class="summary-note">${escapeHtml(item.note)}</div>` : ''}
        </div>
      `).join('')}
    </section>
  ` : '';

  const tableRows = rows.length > 0 ? rows.map((row, index) => `
    <tr>
      <td class="center muted">${index + 1}</td>
      ${columns.map(column => `
        <td class="${column.align || 'left'}" style="${column.width ? `width:${escapeHtml(column.width)}` : ''}">
          ${escapeHtml(getCellValue(row, column))}
        </td>
      `).join('')}
    </tr>
  `).join('') : `
    <tr>
      <td colspan="${columns.length + 1}" class="empty">Không có dữ liệu trong khoảng thời gian đã chọn</td>
    </tr>
  `;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(metadata.title)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #0f172a; background: #ffffff; font-family: Inter, Arial, sans-serif; }
    .page { width: 100%; min-height: 100vh; padding: 0; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; border-bottom: 3px solid #2563eb; padding-bottom: 18px; margin-bottom: 22px; }
    .brand { display: flex; gap: 14px; align-items: center; }
    .logo { width: 58px; height: 58px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 14px; padding: 6px; }
    .org { font-size: 16px; font-weight: 900; letter-spacing: .04em; text-transform: uppercase; color: #0d1324; }
    .unit { margin-top: 4px; color: #475569; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
    .meta { text-align: right; font-size: 11px; line-height: 1.65; color: #475569; min-width: 240px; }
    .meta strong { color: #0f172a; }
    h1 { margin: 0 0 6px; font-size: 23px; line-height: 1.2; color: #0d1324; text-transform: uppercase; letter-spacing: .02em; }
    .subtitle { margin: 0 0 18px; color: #475569; font-size: 12px; font-weight: 700; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0 22px; }
    .summary-card { border: 1px solid #dbeafe; background: #f8fafc; border-radius: 14px; padding: 12px; min-height: 72px; }
    .summary-label { color: #64748b; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; }
    .summary-value { margin-top: 6px; color: #0d1324; font-size: 22px; line-height: 1; font-weight: 900; }
    .summary-note { margin-top: 5px; color: #64748b; font-size: 10px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; }
    th { background: #0d1324; color: #ffffff; font-size: 10px; text-transform: uppercase; letter-spacing: .08em; padding: 10px 8px; border: 1px solid #1e293b; text-align: left; }
    td { font-size: 11px; padding: 9px 8px; border: 1px solid #cbd5e1; vertical-align: top; word-wrap: break-word; }
    tbody tr:nth-child(even) td { background: #f8fafc; }
    .left { text-align: left; } .center { text-align: center; } .right { text-align: right; }
    .muted { color: #64748b; font-weight: 700; }
    .empty { text-align: center; color: #64748b; padding: 28px; font-weight: 800; }
    .footer { margin-top: 26px; display: flex; justify-content: space-between; gap: 24px; color: #64748b; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
    .signature { margin-top: 34px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; text-align: center; color: #0f172a; font-size: 11px; font-weight: 800; }
    .signature small { display: block; margin-top: 6px; color: #64748b; font-weight: 600; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
    @media screen { body { background: #e2e8f0; padding: 24px; } .page { max-width: 1120px; margin: 0 auto; background: white; padding: 28px; box-shadow: 0 20px 50px rgba(15, 23, 42, .15); } }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div>
        <div class="brand">
          <img class="logo" src="${escapeHtml(logoUrl)}" alt="SCMD Pro" />
          <div>
            <div class="org">${escapeHtml(orgName)}</div>
            <div class="unit">${escapeHtml(unitName)}</div>
          </div>
        </div>
      </div>
      <div class="meta">
        <div><strong>Thời gian lập:</strong> ${escapeHtml(generatedAt)}</div>
        ${metadata.reportPeriod ? `<div><strong>Kỳ báo cáo:</strong> ${escapeHtml(metadata.reportPeriod)}</div>` : ''}
        ${metadata.generatedBy ? `<div><strong>Người lập:</strong> ${escapeHtml(metadata.generatedBy)}</div>` : ''}
      </div>
    </section>

    <h1>${escapeHtml(metadata.title)}</h1>
    ${metadata.subtitle ? `<p class="subtitle">${escapeHtml(metadata.subtitle)}</p>` : ''}
    ${summaryHtml}

    <table>
      <thead>
        <tr>
          <th style="width:42px;text-align:center">STT</th>
          ${columns.map(column => `<th class="${column.align || 'left'}" style="${column.width ? `width:${escapeHtml(column.width)}` : ''}">${escapeHtml(column.header)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>

    <section class="signature">
      <div>Người lập báo cáo<small>Ký và ghi rõ họ tên</small></div>
      <div>Đại diện quản lý<small>Ký và ghi rõ họ tên</small></div>
    </section>

    <footer class="footer">
      <span>${escapeHtml(metadata.footerNote || 'Báo cáo được tạo tự động từ dữ liệu thực tế trên hệ thống SCMD Pro.')}</span>
      <span>SCMD Pro · Confidential</span>
    </footer>
  </main>
</body>
</html>`;
};

const openReportWindow = (html: string): Window | null => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
  if (!printWindow) return null;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return printWindow;
};

const toSafeFileName = (name: string): string => name
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9-_]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase() || 'scmd-report';

export const printStandardReport = <T extends Record<string, unknown>>(
  metadata: ReportMetadata,
  columns: ReportColumn<T>[],
  rows: T[],
  summary: ReportSummaryItem[] = [],
): void => {
  const html = buildReportHtml(metadata, columns, rows, summary);
  const printWindow = openReportWindow(html);
  if (!printWindow) {
    throw new Error('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup cho SCMD Pro.');
  }

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};

export const LEGACY_EXCEL_MIME_TYPE = 'application/vnd.ms-excel;charset=utf-8;';
export const LEGACY_EXCEL_EXTENSION = 'xls';

export const buildLegacyExcelFileName = (title: string, generatedAt: Date = new Date()): string => {
  const datePart = generatedAt.toISOString().slice(0, 10);
  return `${toSafeFileName(title)}-${datePart}.${LEGACY_EXCEL_EXTENSION}`;
};

export const exportStandardExcel = <T extends Record<string, unknown>>(
  metadata: ReportMetadata,
  columns: ReportColumn<T>[],
  rows: T[],
  summary: ReportSummaryItem[] = [],
): void => {
  const html = buildReportHtml(metadata, columns, rows, summary);
  const excelHtml = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${html}</body></html>`;
  const blob = new Blob(['\ufeff', excelHtml], { type: LEGACY_EXCEL_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = buildLegacyExcelFileName(metadata.title);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const exportReport = <T extends Record<string, unknown>>(
  format: 'print' | 'excel',
  metadata: ReportMetadata,
  columns: ReportColumn<T>[],
  rows: T[],
  summary: ReportSummaryItem[] = [],
): void => {
  if (format === 'excel') {
    exportStandardExcel(metadata, columns, rows, summary);
    return;
  }
  printStandardReport(metadata, columns, rows, summary);
};

export const printHtmlFragment = (title: string, bodyHtml: string): void => {
  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>@page{size:A4;margin:16mm}body{font-family:Inter,Arial,sans-serif;color:#0f172a}.sheet{max-width:760px;margin:0 auto}.center{text-align:center}.logo{width:72px;height:72px;object-fit:contain}h1{font-size:22px;text-transform:uppercase;color:#0d1324}.box{border:1px solid #cbd5e1;border-radius:18px;padding:24px;margin-top:18px}.meta{font-size:12px;color:#64748b;margin-top:10px}.footer{margin-top:28px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#64748b;text-align:center}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body><main class="sheet">${bodyHtml}</main></body></html>`;
  const printWindow = openReportWindow(html);
  if (!printWindow) throw new Error('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép popup cho SCMD Pro.');
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};

export const htmlEscape = escapeHtml;
