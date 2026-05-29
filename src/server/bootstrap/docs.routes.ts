import { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export function registerDocsRoutes(app: Express) {
  // [DOCS RENDERER] Minimal Markdown → HTML converter (no external deps)
  // Defined outside handler to avoid re-creation on each request (performance).
  // Compliant with AGENTS.md: no italic (em), HTML-entities escaped before parsing.
  function _mdToHtml(md: string): string {
    let html = md
      // Escape HTML entities FIRST to prevent XSS from file content
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Bold only — italic (em) removed per AGENTS.md §3 Typography ("CẤM in nghiêng")
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong>$1</strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Horizontal rule
      .replace(/^---$/gm, '<hr>')
      // Blockquote (matches escaped '>' → '&gt;')
      .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Unordered list items
      .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
      // Ordered list items
      .replace(/^\d+\. (.+)$/gm, '<li class="ol">$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Wrap consecutive <li> into <ul> or <ol>
    html = html.replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, (match) => {
      if (match.includes('class="ol"')) {
        return '<ol>' + match.replace(/ class="ol"/g, '') + '</ol>';
      }
      return '<ul>' + match + '</ul>';
    });

    // Paragraphs: wrap non-block lines
    const blockTags = /^(<h[1-6]|<ul|<ol|<li|<blockquote|<hr|<\/ul|<\/ol)/;
    const lines = html.split('\n');
    const processed: string[] = [];
    let pBuffer: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (pBuffer.length) { processed.push('<p>' + pBuffer.join(' ') + '</p>'); pBuffer = []; }
      } else if (blockTags.test(trimmed)) {
        if (pBuffer.length) { processed.push('<p>' + pBuffer.join(' ') + '</p>'); pBuffer = []; }
        processed.push(trimmed);
      } else {
        pBuffer.push(trimmed);
      }
    }
    if (pBuffer.length) processed.push('<p>' + pBuffer.join(' ') + '</p>');
    return processed.join('\n');
  }

  // Serve /docs/* files (EULA, legal docs) — phải đứng TRƯỚC SPA fallback
  // để tránh bị app.get('*') bắt và trả về index.html.
  // Chỉ cho phép file .md, .txt, .pdf — không expose thư mục tùy ý.
  app.get('/docs/:filename', (req: Request, res: Response) => {
    const allowed = /^[\w\-]+\.(md|txt|pdf)$/i;
    const filename = req.params['filename'] as string;
    if (!allowed.test(filename)) {
      return res.status(400).json({ error: 'Invalid document name' });
    }
    const docPath = path.join(process.cwd(), 'docs', filename);
    if (!fs.existsSync(docPath)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const ext = path.extname(filename).toLowerCase();

    // PDF: send as-is
    if (ext === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(docPath);
    }

    // Markdown & plain text: render as styled HTML with SCMD Pro branding
    const rawContent = fs.readFileSync(docPath, 'utf-8');

    const bodyHtml = ext === '.md'
      ? _mdToHtml(rawContent)
      : `<pre>${rawContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;

    // Extract title from first H1, strip markdown syntax, then HTML-escape for safe injection
    const titleRaw = rawContent.match(/^#\s+(.+)$/m)?.[1]?.replace(/[*_`]/g, '') ?? filename;
    // [FIX XSS] pageTitle must be HTML-escaped before embedding into HTML attributes/content
    const pageTitle = titleRaw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} — SCMD Pro</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --color-primary: #2563EB;
      --color-primary-hover: #1A4FD0;
      --color-primary-light: #EBF2FF;
      --color-bg: #F0F4F8;
      --color-surface: #FFFFFF;
      --color-border: #E2E5EB;
      --color-text-primary: #1A2133;
      --color-text-secondary: #4E5566;
      --color-text-muted: #9299A8;
      --color-header: #0D1324;
      --blue-800: #0F2E8A;
      --blue-900: #071A5E;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    html { font-size: 16px; }
    body {
      font-family: var(--font-sans);
      background: var(--color-bg);
      color: var(--color-text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .site-header {
      background: var(--color-header);
      padding: 0 2rem;
      height: 60px;
      display: flex;
      align-items: center;
      gap: 1rem;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 0 rgba(255,255,255,0.06);
    }
    .site-header .logo-shield {
      width: 32px; height: 32px;
      background: var(--color-primary);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .site-header .logo-shield svg { width: 18px; height: 18px; fill: white; }
    .site-header .brand-name {
      font-weight: 700; font-size: 1rem; letter-spacing: -0.01em;
      color: #fff;
    }
    .site-header .brand-name span { color: #4285F4; }
    .site-header .doc-breadcrumb {
      margin-left: auto;
      font-size: 0.75rem;
      color: var(--color-text-muted);
      display: flex; align-items: center; gap: 0.4rem;
    }
    .site-header .doc-breadcrumb a {
      color: #9299A8; text-decoration: none;
      transition: color 0.15s;
    }
    .site-header .doc-breadcrumb a:hover { color: #fff; }
    .site-header .doc-breadcrumb .sep { opacity: 0.4; }
    .site-header .doc-breadcrumb .current { color: #C2D8FE; }

    /* ── Hero Banner ── */
    .doc-hero {
      background: linear-gradient(135deg, var(--blue-900) 0%, var(--blue-800) 50%, #1A4FD0 100%);
      padding: 3rem 2rem 2.5rem;
      position: relative;
      overflow: hidden;
    }
    .doc-hero::before {
      content: '';
      position: absolute; inset: 0;
      background-image: radial-gradient(circle at 80% 50%, rgba(66,133,244,0.15) 0%, transparent 60%),
                        radial-gradient(circle at 20% 80%, rgba(37,99,235,0.1) 0%, transparent 50%);
    }
    .doc-hero-inner {
      max-width: 760px; margin: 0 auto; position: relative;
    }
    .doc-hero .doc-type-badge {
      display: inline-flex; align-items: center; gap: 0.35rem;
      background: rgba(66,133,244,0.2);
      border: 1px solid rgba(66,133,244,0.35);
      color: #93C5FD;
      font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
      padding: 0.25rem 0.65rem; border-radius: 999px;
      margin-bottom: 1rem;
    }
    .doc-hero h1 {
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-weight: 800;
      color: #FFFFFF;
      line-height: 1.2;
      letter-spacing: -0.02em;
      margin-bottom: 0.75rem;
    }
    .doc-hero .meta {
      display: flex; gap: 1.5rem; flex-wrap: wrap;
      font-size: 0.8rem; color: rgba(194,216,254,0.7);
    }
    .doc-hero .meta span { display: flex; align-items: center; gap: 0.35rem; }

    /* ── Layout ── */
    .page-layout {
      max-width: 760px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 5rem;
      flex: 1;
      width: 100%;
    }

    /* ── Document Card ── */
    .doc-card {
      background: var(--color-surface);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      padding: 2.5rem 3rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04);
    }

    /* ── Typography ── */
    .doc-card h1 { display: none; } /* hidden — shown in hero */
    .doc-card h2 {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 2.25rem 0 0.75rem;
      padding-bottom: 0.5rem;
      border-bottom: 1.5px solid var(--color-border);
      letter-spacing: -0.01em;
    }
    .doc-card h2:first-child { margin-top: 0; }
    .doc-card h3 {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 1.5rem 0 0.5rem;
    }
    .doc-card p {
      font-size: 0.9375rem;
      line-height: 1.75;
      color: var(--color-text-secondary);
      margin-bottom: 0.875rem;
    }
    .doc-card strong {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    /* ── Lists ── */
    .doc-card ul, .doc-card ol {
      margin: 0.5rem 0 1rem 1.25rem;
    }
    .doc-card li {
      font-size: 0.9375rem;
      line-height: 1.7;
      color: var(--color-text-secondary);
      margin-bottom: 0.3rem;
    }
    .doc-card ul li::marker { color: var(--color-primary); }

    /* ── HR ── */
    .doc-card hr {
      border: none;
      border-top: 1px solid var(--color-border);
      margin: 2rem 0;
    }

    /* ── Blockquote ── */
    .doc-card blockquote {
      border-left: 3px solid var(--color-primary);
      background: var(--color-primary-light);
      padding: 0.75rem 1rem;
      border-radius: 0 6px 6px 0;
      margin: 1rem 0;
      font-size: 0.9rem;
      color: var(--color-primary-hover);
    }

    /* ── Inline Code ── */
    .doc-card code {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      background: #F0F4F8;
      border: 1px solid var(--color-border);
      color: #1A4FD0;
      padding: 0.1em 0.4em;
      border-radius: 4px;
    }

    /* ── Pre ── */
    .doc-card pre {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      background: var(--color-header);
      color: #E2E5EB;
      padding: 1.25rem 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      line-height: 1.6;
      margin: 1rem 0;
    }

    /* ── Links ── */
    .doc-card a {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px solid transparent;
      transition: border-color 0.15s, color 0.15s;
    }
    .doc-card a:hover {
      color: var(--color-primary-hover);
      border-bottom-color: var(--color-primary-hover);
    }

    /* ── TUYỆT ĐỐI KHÔNG ĐƯỢC highlight ── */
    .doc-card strong:has(+ *) { }
    /* Bold all-caps → accent styling */
    .doc-card p strong,
    .doc-card li strong {
      color: #0F2E8A;
    }

    /* ── Footer ── */
    .site-footer {
      background: var(--color-header);
      padding: 1.25rem 2rem;
      text-align: center;
    }
    .site-footer p {
      font-size: 0.75rem;
      color: #4E5566;
    }
    .site-footer p strong { color: #9299A8; font-weight: 500; }

    /* ── Print ── */
    @media print {
      .site-header, .site-footer, .doc-hero { display: none; }
      .doc-card { box-shadow: none; border: none; padding: 0; }
      .page-layout { padding: 0; }
    }

    @media (max-width: 640px) {
      .doc-card { padding: 1.5rem 1.25rem; }
      .doc-hero { padding: 2rem 1.25rem; }
    }
  </style>
</head>
<body>

  <header class="site-header">
    <div class="logo-shield">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
      </svg>
    </div>
    <div class="brand-name">SCMD <span>Pro</span></div>
    <nav class="doc-breadcrumb">
      <a href="/">Trang chủ</a>
      <span class="sep">›</span>
      <a href="#">Tài liệu</a>
      <span class="sep">›</span>
      <span class="current">${(pageTitle.split('–')[0] ?? '').split('-')[0]?.split('(')[0]?.trim() ?? ''}</span>
    </nav>
  </header>

  <section class="doc-hero">
    <div class="doc-hero-inner">
      <div class="doc-type-badge">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <polyline points="14 2 14 8 20 8" style="fill:none;stroke:currentColor;stroke-width:2"/>
        </svg>
        Văn bản pháp lý · Tài liệu chính thức
      </div>
      <h1>${pageTitle}</h1>
      <div class="meta">
        <span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Cập nhật: 20-04-2026
        </span>
        <span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          SCMD Pro · Security Company Management Dashboard
        </span>
      </div>
    </div>
  </section>

  <main class="page-layout">
    <article class="doc-card">
      ${bodyHtml}
    </article>
  </main>

  <footer class="site-footer">
    <p><strong>© 2026 SCMD Pro</strong> — Tài liệu này có giá trị pháp lý. Mọi bản sao phải được ủy quyền chính thức.</p>
  </footer>

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(html);
  });
}
