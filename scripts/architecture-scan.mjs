import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'src', 'server');
const ignoredDirs = new Set(['node_modules', 'dist', 'dist-backend', '.git']);

const systemBypassAllowlist = new Set([
  'src/server/modules/staff/staff.repository.ts',
]);

const protectedRouteAllowlist = new Set([
  "router.get('/me'",
  "router.get('/subscriptions/pricing'",
  "router.post('/tenant/upgrade-request'",
]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;
    const abs = join(dir, entry);
    const stats = statSync(abs);
    if (stats.isDirectory()) {
      walk(abs, files);
    } else if (entry.endsWith('.ts')) {
      files.push(abs);
    }
  }
  return files;
}

const findings = [];

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function collectInternalDynamicImports(content) {
  const imports = [];
  const dynamicImportRegex = /import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
  for (const match of content.matchAll(dynamicImportRegex)) {
    imports.push(match[1]);
  }
  return imports;
}

for (const abs of walk(srcRoot)) {
  const rel = relative(root, abs).replaceAll('\\', '/');
  const content = stripComments(readFileSync(abs, 'utf8'));

  for (const specifier of collectInternalDynamicImports(content)) {
    if (!specifier.endsWith('.js')) {
      findings.push(`${rel}: dynamic internal import "${specifier}" must use Native ESM .js extension`);
    }
  }

  if (content.includes('systemBypass(') && !rel.endsWith('core/db/prisma.ts') && !systemBypassAllowlist.has(rel)) {
    findings.push(`${rel}: db.systemBypass() is not allowlisted`);
  }

  if (content.includes('systemBypass(') && rel !== 'src/server/core/db/prisma.ts') {
    const calls = content.match(/systemBypass\s*\(([\s\S]*?)\)/g) || [];
    for (const call of calls) {
      if (!call.includes('reason:') || !call.includes('caller:')) {
        findings.push(`${rel}: systemBypass() call must include reason and caller`);
      }
    }
  }
}

const routesPath = join(root, 'src', 'server', 'routes.ts');
const routes = readFileSync(routesPath, 'utf8').split(/\r?\n/);
let afterRequireAuth = false;
for (let i = 0; i < routes.length; i += 1) {
  const line = routes[i].trim();
  if (line.includes('router.use(requireAuth)')) {
    afterRequireAuth = true;
    continue;
  }
  if (!afterRequireAuth) continue;
  if (!/^router\.(get|post|put|patch|delete)\(/.test(line)) continue;

  const joined = routes.slice(i, Math.min(i + 4, routes.length)).join(' ');
  const isExplicitlyGuarded = joined.includes('requirePermission(') || joined.includes('requireRole(');
  const isAllowlisted = [...protectedRouteAllowlist].some((prefix) => joined.includes(prefix));
  if (!isExplicitlyGuarded && !isAllowlisted) {
    findings.push(`src/server/routes.ts:${i + 1}: protected route lacks explicit RBAC guard`);
  }
}

if (findings.length > 0) {
  console.error('Architecture scan failed:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log('Architecture scan passed.');
