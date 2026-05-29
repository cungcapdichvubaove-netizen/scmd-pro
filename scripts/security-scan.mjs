import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'dist-backend',
  '.vite',
  'coverage',
]);

const allowedFiles = new Set([
  '.env.example',
  '.env.desktop.example',
  '.env.production.example',
]);

const deniedFilePatterns = [
  /^\.env$/,
  /^\.env\.(?!example$|desktop\.example$|production\.example$).+/,
  /(^|[\\/])id_rsa$/,
  /(^|[\\/])id_ed25519$/,
  /\.(pem|key|p12|pfx)$/i,
];

const secretPatterns = [
  {
    name: 'seed default password',
    pattern: new RegExp(`\\b(${['Admin', 'Demo', 'Guard'].map((prefix) => `${prefix}@2025!`).join('|')})\\b`),
  },
  {
    name: 'known default infrastructure password',
    pattern: new RegExp(`\\b(${[
      ['redis', 'secure', 'pass', '2026'].join('_'),
      ['scmd', 'secret', 'pass'].join('_'),
      ['ADMIN', 'PASSWORD', '123'].join('_'),
      ['CHANGE', 'ME', 'redis', 'password', '2026'].join('_'),
    ].join('|')})\\b`),
  },
  {
    name: 'hardcoded environment secret',
    pattern: /^\s*(JWT_SECRET|INTERNAL_API_SECRET|DEVICE_SECRET)\s*=\s*(?!replace_me|ci-test-secret|ci-internal-secret)[^\s#${][^\s#]*/im,
  },
  {
    name: 'hardcoded code secret literal',
    pattern: /\b(JWT_SECRET|INTERNAL_API_SECRET|DEVICE_SECRET)\s*=\s*['"`](?!replace_me|ci-test-secret|ci-internal-secret)[^'"`]+['"`]/i,
  },
  {
    name: 'private key block',
    pattern: /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  },
  {
    name: 'production compose secret default',
    pattern: /\$\{(?:POSTGRES_PASSWORD|REDIS_PASSWORD|GRAFANA_PASSWORD|JWT_SECRET|INTERNAL_API_SECRET|DEVICE_SECRET):-[^}]+\}/,
  },
];

const textExtensions = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml',
  '.env', '.example', '.toml', '.sql', '.sh', '.bat', '.ps1', '.dockerignore',
  '.gitignore', '.gitattributes',
]);

function extensionOf(file) {
  const idx = file.lastIndexOf('.');
  return idx === -1 ? file : file.slice(idx);
}

function runGit(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
}

function isGitTracked(rel) {
  return runGit(['ls-files', '--error-unmatch', rel]) === rel;
}

function isGitIgnored(rel) {
  return runGit(['check-ignore', rel]) === rel;
}

function isLocalIgnoredEnvFile(rel) {
  const base = rel.split('/').pop();
  return base === '.env' && !isGitTracked(rel) && isGitIgnored(rel);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (ignoredDirs.has(entry)) continue;
    const abs = join(dir, entry);
    const stats = statSync(abs);
    if (stats.isDirectory()) {
      walk(abs, files);
    } else {
      files.push(abs);
    }
  }
  return files;
}

const findings = [];

for (const file of walk(root)) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const base = rel.split('/').pop();

  if (!allowedFiles.has(base) && deniedFilePatterns.some((pattern) => pattern.test(base) || pattern.test(rel))) {
    if (!isLocalIgnoredEnvFile(rel)) {
      findings.push(`${rel}: forbidden secret-bearing file`);
    }
  }

  const ext = extensionOf(base);
  if (!textExtensions.has(ext) && !base.startsWith('.env')) continue;

  const content = readFileSync(file, 'utf8');
  for (const rule of secretPatterns) {
    if (rule.pattern.test(content)) {
      findings.push(`${rel}: ${rule.name}`);
    }
  }
}

if (findings.length > 0) {
  console.error('Security scan failed:');
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log('Security scan passed.');
