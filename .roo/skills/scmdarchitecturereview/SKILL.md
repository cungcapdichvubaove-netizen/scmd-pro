---
name: scmdarchitecturereview
description: >-
  Dùng khi review kiến trúc SCMD PRO: Clean Architecture, Native ESM imports,
  dependency direction, phân tách layer, module size, circular imports, hoặc bất
  kỳ câu hỏi nào về tổ chức code. Trigger khi người dùng đề cập refactor, import
  lỗi, phân tầng, God Component/Service, hoặc hỏi "cái này đặt ở đâu đúng".
---

# SCMD PRO — Architecture Review

Luôn trả lời bằng **tiếng Việt**.

## Mục tiêu

Bảo vệ tính toàn vẹn của Clean Architecture trong SCMD PRO. Mỗi vi phạm đều có
chi phí thực tế: khó test, khó thay thế infra, bug khó tái hiện, onboarding chậm.
Hãy giải thích *tại sao* vi phạm gây hại — không chỉ liệt kê rule.

---

## Layer Map của SCMD PRO

```
src/
├── server/
│   ├── domain/entities/        ← Pure business rules. KHÔNG import gì khác.
│   ├── core/use-cases/         ← Orchestration. Import Domain, không import Infra/UI.
│   ├── adapters/repositories/  ← Interface cho DB. Chỉ data access, không có logic.
│   ├── adapters/controllers/   ← Thin. Parse input → gọi UseCase → format output.
│   └── infra/                  ← Prisma, Redis, BullMQ, Firebase, external services.
└── client/
    └── components/             ← React. Không chứa compliance rule quan trọng.
```

**Dependency Rule:** mũi tên chỉ đi vào trong. Domain ← UseCase ← Controller/Infra ← UI.

---

## Kiểm tra theo thứ tự ưu tiên

### 1. Dependency Direction (P0 — vi phạm là blocker)

| Vi phạm | Ví dụ cụ thể | Tại sao nguy hiểm |
|---|---|---|
| Domain import UseCase/Infra | `import { prisma }` trong entity | Domain bị khóa vào DB cụ thể |
| UseCase import Controller/UI | `import { Request }` trong use-case | UseCase không thể test độc lập |
| Repository chứa business rule | Tính penalty trong repo | Logic bị duplicate, không test được |
| React tính compliance rule | `if (violations > 3) penalize()` trong component | Bug nếu rule thay đổi |

### 2. Business Logic Placement (P0)

**Đúng chỗ:**
- `src/server/domain/entities/` — invariant, calculation, validation rule thuần túy
- `src/server/core/use-cases/` — orchestration, cross-entity logic

**Sai chỗ và hậu quả:**
- React component → không test được, bị duplicate
- API route/controller → controller phình to, khó maintain
- Repository → logic và data access lẫn lộn
- Prisma mapping layer → business rule bị ẩn
- Utility file (`utils/penaltyHelper.ts`) → logic "vô hình"

### 3. Native ESM Imports (P1)

```typescript
// ✅ Đúng
import { ContractService } from './contract.service.js';

// ❌ Sai — runtime crash với Node ESM
import { ContractService } from './contract.service';
import { ContractService } from './contract.service.ts';
```

Kiểm tra tất cả internal import. External package (lodash, zod...) không cần `.js`.

### 4. Module Size — God Component/Service (P1)

Dấu hiệu cần split:
- File > 400 dòng với nhiều trách nhiệm khác nhau
- Component React render > 3 màn hình khác nhau tùy role
- UseCase gọi > 5 repository khác nhau

**Quy tắc:** Chỉ đề xuất split khi an toàn và cần thiết. Không refactor rộng
trong khi đang fix bug.

### 5. Dependency Risks (P1)

- **Circular import:** A import B, B import A → build lỗi hoặc undefined
- **Shared mutable state:** singleton bị mutate → race condition trong multi-tenant
- **Infra leak vào Domain:** Prisma type xuất hiện trong entity
- **UI phụ thuộc server internal:** component import trực tiếp từ `src/server/`

### 6. Product Architecture Axis (P2)

SCMD PRO xoay quanh trục: `Tenant → Vendor → Contract → Site → SLA`

Vi phạm thường gặp:
- Flow Staff/Attendance tách biệt khỏi Contract/SLA → dữ liệu không nhất quán
- Report không trace về ViolationEvent → báo cáo thiếu evidence
- Incident không link Vendor → không tính được scorecard

---

## Output Format

### Architecture Verdict
`✅ Clean` / `⚠️ Cần chú ý` / `🚨 Vi phạm nghiêm trọng`

### Vi phạm phát hiện
Với mỗi vi phạm:
- **Vị trí:** file + dòng (nếu có)
- **Loại vi phạm:** (dependency direction / business logic / ESM / ...)
- **Tại sao gây hại:** tác động thực tế
- **Sửa tối thiểu:** code diff nhỏ nhất để fix

### Gợi ý Refactor Phase
Chỉ đề xuất khi vi phạm đủ nghiêm trọng để cần kế hoạch riêng.

### Mức độ rủi ro
`🔴 Cao` / `🟠 Trung bình` / `🟡 Thấp`
