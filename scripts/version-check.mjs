import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const docs = readFileSync('DOCUMENTATION.md', 'utf8');
const agents = readFileSync('AGENTS.md', 'utf8');
const compose = readFileSync('docker-compose.yml', 'utf8');
const changelog = readFileSync('CHANGELOG.md', 'utf8');
const indexHtml = readFileSync('index.html', 'utf8');
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));

const expectedScmdVersion = pkg.scmdVersion;
if (!/^V\.\d+\.\d+\.\d+\.\d+$/.test(expectedScmdVersion)) {
  throw new Error(`package.json scmdVersion must use V.x.x.x.x format. Got: ${expectedScmdVersion}`);
}

const prereleasePatch = expectedScmdVersion.replace(/^V\.(\d+)\.(\d+)\.(\d+)\.(\d+)$/, '$1.$2.$3-$4');
if (pkg.version !== prereleasePatch) {
  throw new Error(`package.json version must mirror scmdVersion as npm semver. Expected ${prereleasePatch}, got ${pkg.version}`);
}

const requiredMatches = [
  ['DOCUMENTATION.md', docs],
  ['AGENTS.md', agents],
  ['docker-compose.yml', compose],
];

for (const [file, content] of requiredMatches) {
  if (!content.includes(expectedScmdVersion)) {
    throw new Error(`${file} does not contain ${expectedScmdVersion}`);
  }
}

const changelogVersion = pkg.version;
if (!changelog.includes(`## [${changelogVersion}]`)) {
  throw new Error(`CHANGELOG.md does not contain an entry for ${changelogVersion}`);
}

const forbiddenLegacyVersions = [
  `v${['5', '1', '0'].join('.')}`,
  `${['5', '1', '0'].join('.')}-Enterprise`,
];

for (const legacyVersion of forbiddenLegacyVersions) {
  if (indexHtml.includes(legacyVersion)) {
    throw new Error(`index.html still contains legacy version marker: ${legacyVersion}`);
  }
}

if (!indexHtml.includes(`SCMD Pro v${pkg.version}`)) {
  throw new Error(`index.html title must include SCMD Pro v${pkg.version}`);
}

if (!indexHtml.includes(`Version: ${pkg.version}`)) {
  throw new Error(`index.html version banner must include Version: ${pkg.version}`);
}

const requiredManifestFields = {
  name: 'SCMD Pro',
  short_name: 'SCMD Pro',
  display: 'standalone',
  theme_color: '#0D1324',
};

for (const [field, expected] of Object.entries(requiredManifestFields)) {
  if (manifest[field] !== expected) {
    throw new Error(`public/manifest.webmanifest ${field} must be ${expected}`);
  }
}

const iconSizes = new Set((manifest.icons || []).map((icon) => icon.sizes));
for (const requiredSize of ['192x192', '512x512']) {
  if (!iconSizes.has(requiredSize)) {
    throw new Error(`public/manifest.webmanifest missing ${requiredSize} icon`);
  }
}

const iconSources = new Set((manifest.icons || []).map((icon) => icon.src));
for (const requiredIcon of [
  '/icons/scmd-pro-icon-192.png',
  '/icons/scmd-pro-icon-512.png',
  '/icons/scmd-pro-maskable-512.png',
]) {
  if (!iconSources.has(requiredIcon)) {
    throw new Error(`public/manifest.webmanifest missing install icon ${requiredIcon}`);
  }
}

console.log(`Version consistency passed: ${expectedScmdVersion} (${pkg.version})`);
