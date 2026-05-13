import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
app.use(express.json());

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

const verifySecret = (req, res, next) => {
  const provided = req.headers['x-pdf-secret'];
  if (!INTERNAL_API_SECRET || provided !== INTERNAL_API_SECRET) {
    console.error(`[PDF] Unauthorized access attempt: Invalid or missing x-pdf-secret`);
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  next();
};

const envDomains = process.env.REPORT_ALLOWED_DOMAINS ? process.env.REPORT_ALLOWED_DOMAINS.split(',').map(d => d.trim()) : [];
const ALLOWED_DOMAINS = [...new Set(['app.scmdpro.com', 'staging.scmdpro.com', ...envDomains])];

function isAllowed(urlStr) {
  try {
    const u = new URL(urlStr);
    
    // SEC-FIX [H-02]: Strict Internal Port Validation (SSRF Protection)
    const INTERNAL_SERVICES = { 
      'api': [3000], 
      'localhost': [3000], 
      '127.0.0.1': [3000] 
    };
    
    if (INTERNAL_SERVICES[u.hostname]) {
      const allowedPorts = INTERNAL_SERVICES[u.hostname];
      const port = parseInt(u.port) || (u.protocol === 'https:' ? 443 : 80);
      if (allowedPorts.includes(port)) return true;
      console.warn(`[PDF] Blocked internal probing attempt on port ${port} for ${u.hostname}`);
      return false;
    }
    
    // Standard external validation
    if (u.protocol !== 'https:') return false;
    return ALLOWED_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

let browser = null;

async function getBrowser() {
  // [FIX H-05] Kiểm tra browser có còn connected không trước khi reuse
  if (browser) {
    try {
      if (!browser.isConnected()) {
        console.warn('[PDF] Browser disconnected, sẽ relaunch on next request...');
        browser = null;
      }
    } catch {
      // isConnected() throw → browser đã chết
      browser = null;
    }
  }

  if (!browser) {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-gpu',
        '--font-render-hinting=none'
      ],
      headless: true
    });

    // [FIX H-05] Lắng nghe sự kiện disconnect để reset về null ngay lập tức
    browser.on('disconnected', () => {
      console.error('[PDF] Browser disconnected event — sẽ relaunch khi có request tiếp theo');
      browser = null;
    });
  }
  return browser;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pdf-generation' });
});

app.post('/generate', verifySecret, async (req, res) => {
  const { url, options, token } = req.body;
  console.log(`[PDF] Incoming request for URL: ${url}`);
  
  if (!isAllowed(url)) {
    console.error(`[PDF] Security violation for URL: ${url}`);
    return res.status(403).json({error: 'SECURITY_VIOLATION'});
  }
  
  let page;
  try {
    const b = await getBrowser();
    page = await b.newPage();
    
    if (token) {
      await page.setExtraHTTPHeaders({ 'x-internal-token': token });
    }

    console.log(`[PDF] Navigation started: ${url}`);
    const response = await page.goto(url, { 
      waitUntil: ['load', 'networkidle0'], 
      timeout: 45000 
    });
    
    if (!response || !response.ok()) {
      const status = response ? response.status() : 'No response';
      console.error(`[PDF] Navigation failed with status: ${status}`);
    }

    // Add wait for fonts
    await page.evaluateHandle('document.fonts.ready');
    console.log(`[PDF] Fonts ready, generating PDF...`);
    
    const pdf = await page.pdf({ 
      format: 'A4', 
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
      ...options 
    });
    
    console.log(`[PDF] PDF generated successfully, size: ${pdf.length} bytes`);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (err) {
    console.error('[PDF] Error generating PDF:', err);
    res.status(500).json({error: err.message});
  } finally {
    if (page) await page.close().catch(()=>{});
  }
});

app.post('/screenshot', verifySecret, async (req, res) => {
  const { url } = req.body;
  if (!isAllowed(url)) return res.status(403).json({error: 'SECURITY_VIOLATION'});
  
  let page;
  try {
    const b = await getBrowser();
    page = await b.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
    const screenshot = await page.screenshot({ fullPage: true });
    res.setHeader('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (err) {
    console.error('Screenshot error', err);
    res.status(500).json({error: err.message});
  } finally {
    if (page) await page.close().catch(()=>{});
  }
});

const PORT = process.env.PDF_PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => console.log(`PDF Service running on port ${PORT}`));

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[PDF-FATAL] Port ${PORT} already in use. Service might be already running.`);
    // Exit with 0 because we handle this as non-fatal in the main system
    process.exit(0);
  } else {
    console.error(`[PDF-FATAL] Server error:`, err);
    process.exit(1);
  }
});
