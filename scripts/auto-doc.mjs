import fs from 'fs';
import path from 'path';

// Lấy thông điệp commit/fix từ tham số (nếu có)
const rawMessage = process.argv.slice(2).join(' ') || 'General bug fixes & improvements';

// Lấy đường dẫn tuyệt đối
const PKG_PATH = path.resolve('package.json');
const META_PATH = path.resolve('metadata.json');
const CHANGE_PATH = path.resolve('CHANGELOG.md');
const DOC_PATH = path.resolve('DOCUMENTATION.md');

// Hàm tăng version patch (vd: 4.33.38 -> 4.33.39)
function bumpVersion(version) {
  const parts = version.split('.');
  if (parts.length === 3) {
    parts[2] = parseInt(parts[2], 10) + 1;
  }
  return parts.join('.');
}

try {
  console.log('🔄 Bắt đầu tiến trình cập nhật DOC...');

  // 1. package.json
  const pkgData = JSON.parse(fs.readFileSync(PKG_PATH, 'utf-8'));
  const currentVersion = pkgData.version;
  const newVersion = bumpVersion(currentVersion);
  pkgData.version = newVersion;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkgData, null, 2) + '\n');
  console.log(`✅ Đã tăng version package.json: ${currentVersion} -> ${newVersion}`);

  // 1.5 package-lock.json
  const LOCK_PATH = path.resolve('package-lock.json');
  if (fs.existsSync(LOCK_PATH)) {
    const lockData = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf-8'));
    lockData.version = newVersion;
    if (lockData.packages && lockData.packages[""]) {
      lockData.packages[""].version = newVersion;
    }
    fs.writeFileSync(LOCK_PATH, JSON.stringify(lockData, null, 2) + '\n');
    console.log(`✅ Đã đồng bộ version vào package-lock.json`);
  }

  // Set executable permissions for shell scripts
  try {
    const deployShPath = path.resolve('deploy-desktop.sh');
    const resetShPath = path.resolve('reset-desktop.sh');
    if (fs.existsSync(deployShPath)) fs.chmodSync(deployShPath, 0o755);
    if (fs.existsSync(resetShPath)) fs.chmodSync(resetShPath, 0o755);
    console.log(`✅ Đã thêm quyền thực thi (755) cho các shell scripts`);
  } catch (err) {
    console.warn('⚠️ Cảnh báo: Không thể chmod cho shell scripts:', err.message);
  }

  // 2. metadata.json
  const metaData = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
  metaData.name = metaData.name.replace(currentVersion, newVersion);
  fs.writeFileSync(META_PATH, JSON.stringify(metaData, null, 2) + '\n');
  console.log(`✅ Đã cập nhật metadata.json`);

  // 3. CHANGELOG.md
  const date = new Date().toISOString().split('T')[0];
  let changelog = fs.readFileSync(CHANGE_PATH, 'utf-8');
  // Chèn log mới vào sau dòng mô tả chuẩn SemVer hoặc trước header phiên bản gần nhất
  // Cho phép ngắt dòng bằng cách thay thế chuỗi "\n" thành ký tự newline thực sự
  const formattedMessage = rawMessage.replace(/\\n/g, '\n');
  
  // Nếu message đã chứa markdown bullet list (vd: - **Feature**:...), dùng trực tiếp
  // Ngược lại, bọc trong list item mặc định
  const logContent = formattedMessage.startsWith('- ') 
    ? formattedMessage 
    : `- **Auto-Update**: ${formattedMessage}`;

  const newEntry = `## [${newVersion}] - ${date}\n### Fixed\n${logContent}\n\n`;
  
  // Tìm pattern `## [x.y.z]` đầu tiên để chèn lên trước
  const insertIndex = changelog.search(/## \[\d+\.\d+\.\d+\]/);
  if (insertIndex !== -1) {
    changelog = changelog.slice(0, insertIndex) + newEntry + changelog.slice(insertIndex);
  } else {
    // Nếu chưa có pattern, chèn xuống cuối file (ít xảy ra)
    changelog += '\n' + newEntry;
  }
  fs.writeFileSync(CHANGE_PATH, changelog);
  console.log(`✅ Đã ghi log mới vào CHANGELOG.md`);

  // 4. DOCUMENTATION.md
  let doc = fs.readFileSync(DOC_PATH, 'utf-8');
  // Replace version header: `## Version: 4.33.38 (...)` -> `## Version: 4.33.39 (Auto-Patch)`
  const newDocHeader = `## Version: ${newVersion} (Auto-Patch: ${rawMessage})`;
  const updatedDoc = doc.replace(/^## Version:.*$/m, newDocHeader);
  fs.writeFileSync(DOC_PATH, updatedDoc);
  console.log(`✅ Đã cập nhật version tracker trong DOCUMENTATION.md`);

  console.log('\n🚀 Cập nhật tài liệu thành công!');
  
} catch (error) {
  console.error('❌ Có lỗi xảy ra trong quá trình cập nhật DOC:', error);
  process.exit(1);
}
