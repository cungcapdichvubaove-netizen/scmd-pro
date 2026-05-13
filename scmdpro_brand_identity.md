# SCMD PRO — Brand Identity Guidelines
> Version 2.5 · 2026 · Dành cho coder & vibe coding context (SCMD Core v3.9.1)

---

## 1. Brand Philosophy (Triết lý thương hiệu)

| Giá trị | Mô tả |
|---|---|
| 🛡 An toàn | Mọi element truyền tải sự tin tưởng, bảo mật, kiểm soát. Không gây cảm giác nguy hiểm hay hỗn loạn. |
| ✦ Đơn giản | Giao diện rõ ràng, thao tác tối thiểu. Người dùng tìm được chức năng trong 3 giây đầu. |
| ⚡ Hiệu quả | Ưu tiên tốc độ, hiệu suất. Không có yếu tố nào làm chậm workflow của người dùng. |
| 🌐 Phổ thông | Thiết kế cho mọi người — từ nhân viên bảo vệ đến IT admin cấp cao. Không cần hướng dẫn phức tạp. |

---

## 2. Color System (Hệ thống màu)

### CSS Variables — Copy trực tiếp

```css
:root {
  /* === PRIMARY === */
  --color-primary:        #2563EB;  /* Nút CTA, link, active state */
  --color-primary-hover:  #1A4FD0;  /* Hover state */
  --color-primary-light:  #EBF2FF;  /* Badge bg, tag bg */
  --color-primary-accent: #4285F4;  /* Icon active, accent */

  /* === NEUTRAL === */
  --color-bg:             #F8F9FB;  /* Page background */
  --color-surface:        #FFFFFF;  /* Card, modal, input bg */
  --color-border:         #E2E5EB;  /* Input border, card border */
  --color-text-primary:   #1A2133;  /* Nội dung chính */
  --color-text-secondary: #4E5566;  /* Meta, label, mô tả */
  --color-text-muted:     #9299A8;  /* Placeholder, disabled */
  --color-header:         #0D1324;  /* Header, sidebar dark */

  /* === SEMANTIC === */
  --color-success:        #10B981;  /* Online, thành công */
  --color-warning:        #F59E0B;  /* Cảnh báo, pending, chú ý */
  --color-danger:         #EF4444;  /* Lỗi, nguy hiểm, xóa, khóa */

  /* === BLUE SCALE === */
  --blue-50:  #EBF2FF;
  --blue-100: #C2D8FE;
  --blue-200: #91B8FC;
  --blue-400: #4285F4;
  --blue-500: #2563EB;  /* Brand primary */
  --blue-600: #1A4FD0;
  --blue-800: #0F2E8A;
  --blue-900: #071A5E;

  /* === GRAY SCALE === */
  --gray-50:  #F8F9FB;
  --gray-100: #F0F2F5;
  --gray-200: #E2E5EB;
  --gray-300: #C8CDD8;
  --gray-400: #9299A8;
  --gray-600: #4E5566;
  --gray-700: #2E3447;
  --gray-800: #1A2133;
  --gray-900: #0D1324;
}
```

### Quy tắc dùng màu

- ✅ Chỉ dùng `--color-primary` (#2563EB) cho action quan trọng nhất trên màn hình
- ✅ Màu đỏ chỉ dùng cho: lỗi, nguy hiểm, xác nhận xóa
- ✅ Mỗi màu phải có ý nghĩa — không dùng màu trang trí tùy tiện
- ❌ Không dùng gradient (ngoại trừ biểu đồ dữ liệu)
- ❌ Không dùng màu đỏ ngoài mục đích semantic đã định

### Semantic Color Mapping

| Trạng thái | Background | Text | Border | Dùng cho |
|---|---|---|---|---|
| Success | `#ECFDF5` | `#065F46` | `#A7F3D0` | Online, thành công |
| Warning | `#FFFBEB` | `#92400E` | `#FCD34D` | Cảnh báo, pending |
| Danger | `#FEF2F2` | `#991B1B` | `#FCA5A5` | Lỗi, nguy hiểm |
| Info | `#EBF2FF` | `#1A4FD0` | `#C2D8FE` | Thông tin, trung lập |

---

## 3. Typography (Hệ thống chữ)

### Fonts

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

**Import:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type Scale

| Role | Font | Size | Weight | Letter-spacing | Line-height | Dùng cho |
|---|---|---|---|---|---|---|
| Display | Inter | 32–40px | 800 | -1px | 1.15 | Tiêu đề trang chính, dashboard hero |
| Heading 1 | Inter | 24px | 700 | -0.5px | 1.3 | Tiêu đề section, modal title, page title |
| Heading 2 | Inter | 18px | 600 | -0.3px | 1.4 | Card title, table group, sub-section |
| Body | Inter | 14px | 400 | 0 | 1.6 | Nội dung mô tả, thông báo, hướng dẫn |
| Caption | Inter | 12px | 400 | 0 | 1.5 | Timestamp, meta info, tooltip, helper text |
| Label | Inter | 11px | 600 | 1.5px | — | Table header, section label, UPPERCASE |
| Code | JetBrains Mono | 13px | 400 | — | — | Code snippet, API key, Device ID, IP |

### Min font size: 13px
> Đảm bảo đọc được trên mọi màn hình, kể cả khi zoom

---

## 4. Spacing & Layout

### Spacing Scale (base-4)

```css
:root {
  --space-xs:  4px;   /* icon gap, inline */
  --space-sm:  8px;   /* badge gap, tight */
  --space-3:   12px;  /* input padding ngang */
  --space-md:  16px;  /* card padding, row gap */
  --space-lg:  24px;  /* section inner padding */
  --space-xl:  32px;  /* section gap */
  --space-2xl: 40px;  /* page padding */
  --space-3xl: 64px;  /* major section break */
}
```

### Border Radius

```css
:root {
  --radius-xs: 4px;   /* Tag */
  --radius-sm: 6px;   /* Button */
  --radius-md: 10px;  /* Input, alert */
  --radius-lg: 16px;  /* Card */
  --radius-xl: 24px;  /* Modal */
}
```

### Shadows

```css
:root {
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 30px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08);
}
```

### Breakpoints

| Device | Range | Note |
|---|---|---|
| Mobile | < 768px | Sidebar collapse → bottom nav / hamburger |
| Tablet | 768–1024px | — |
| **Desktop** | **1024–1440px** | **Primary target** |
| Wide | > 1440px | — |

### App Layout Structure

```
┌─────────────────────────────────────────┐
│              TOPBAR (56px)              │
├──────────┬──────────────────────────────┤
│          │                             │
│ SIDEBAR  │       MAIN CONTENT          │
│  (60px   │       (flex: 1)             │
│ icon-    │                             │
│  only)   │  ┌──────┐ ┌──────┐ ┌─────┐ │
│          │  │ CARD │ │ CARD │ │CARD │ │
│          │  └──────┘ └──────┘ └─────┘ │
│          │                             │
└──────────┴──────────────────────────────┘
```

- Sidebar: icon-only, dark (`--gray-900`), width 60px
- Topbar: full-width, white/light, height 56px
- Content: `padding: 24px`, background `--color-bg`

---

## 5. Components

### Buttons

```css
/* Base */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px;
  border-radius: var(--radius-sm); /* 6px */
  font-size: 13px; font-weight: 600;
  font-family: var(--font-sans);
  border: none; cursor: pointer;
  transition: all 0.15s ease-out;
  text-decoration: none;
}

/* Variants */
.btn-primary   { background: #2563EB; color: #fff; }
.btn-secondary { background: #EBF2FF; color: #1A4FD0; border: 1px solid #C2D8FE; }
.btn-ghost     { background: transparent; color: #4E5566; border: 1px solid #E2E5EB; }
.btn-danger    { background: #FEF2F2; color: #EF4444; border: 1px solid #FCA5A5; }
.btn-sm        { padding: 5px 12px; font-size: 12px; }

/* Icon-only button */
.btn-icon {
  width: 34px; height: 34px; padding: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm);
  background: #F0F2F5; border: 1px solid #E2E5EB; color: #4E5566;
  cursor: pointer;
}
```

### Status Badges

```css
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 11px; font-weight: 600;
}
.badge-dot { width: 6px; height: 6px; border-radius: 50%; }

/* Variants */
.badge-green  { background: #D1FAE5; color: #065F46; }   /* Online */
.badge-red    { background: #FEF2F2; color: #991B1B; }   /* Offline / lỗi */
.badge-orange { background: #FEF3C7; color: #92400E; }   /* Cảnh báo */
.badge-blue   { background: #EBF2FF; color: #1A4FD0; }   /* Đang xử lý */
.badge-gray   { background: #F0F2F5; color: #4E5566; }   /* Không hoạt động */
.badge-purple { background: #F3E8FF; color: #6B21A8; }   /* Ưu tiên cao */
```

**Quy tắc màu badge:** xanh lá = an toàn · đỏ = nguy hiểm · cam = cảnh báo · xanh dương = hành động

### Form Inputs

```css
.input-label {
  font-size: 12px; font-weight: 500;
  color: #2E3447; margin-bottom: 4px;
}

.demo-input {
  width: 100%;
  padding: 9px 12px 9px 36px; /* 36px nếu có icon trái */
  border: 1px solid #E2E5EB;
  border-radius: var(--radius-sm); /* 6px */
  font-size: 13px;
  font-family: var(--font-sans);
  color: #1A2133;
  background: #FFFFFF;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.demo-input:focus {
  border-color: #4285F4;
  box-shadow: 0 0 0 3px rgba(66,133,244,0.12);
}
.demo-input::placeholder { color: #9299A8; }
```

### Alert / Notification

```css
.alert {
  display: flex; gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-md); /* 10px */
  font-size: 13px;
}
.alert-title { font-weight: 600; margin-bottom: 2px; }
.alert-desc  { font-size: 12px; opacity: 0.8; }

/* Variants — background / text / border */
.alert-info    { background: #EBF2FF; color: #0F2E8A; border: 1px solid #91B8FC; }
.alert-success { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
.alert-warn    { background: #FFFBEB; color: #92400E; border: 1px solid #FCD34D; }
.alert-error   { background: #FEF2F2; color: #991B1B; border: 1px solid #FCA5A5; }
```

### Data Table

```css
.demo-table { width: 100%; border-collapse: collapse; }

.demo-table th {
  text-align: left;
  font-size: 11px; font-weight: 700;
  color: #9299A8; text-transform: uppercase; letter-spacing: 1px;
  padding: 8px 12px;
  border-bottom: 1px solid #E2E5EB;
}
.demo-table td {
  padding: 9px 12px;
  font-size: 12px; color: #2E3447;
  border-bottom: 1px solid #F0F2F5;
}
.demo-table tr:last-child td { border-bottom: none; }
.demo-table tr:hover td { background: #F8F9FB; }
```

---

## 6. Icons

- **Library:** Lucide Icons (recommended) — stroke-based, consistent
- **Stroke width:** 1.5px (standard), 2px (emphasis)
- **Size:** 16px (inline), 20px (button), 24px (navigation)
- **Color:** `var(--color-text-secondary)` default, `var(--color-primary)` on active/hover
- **Required:** Mọi icon phải có `tooltip` text và `aria-label`

---

## 7. Do & Don't Rules

### ✅ Bắt buộc

- Dùng font Inter, minimum **13px** — đọc được trên mọi màn hình kể cả khi zoom
- Mỗi action quan trọng phải có **loading state** và **confirmation**
- Tất cả icon phải có **tooltip text** và **aria-label**
- Responsive mobile-first — sidebar collapse thành bottom nav hoặc hamburger menu
- Error message phải bằng **tiếng Việt**, rõ ràng, nói rõ cách khắc phục

### ❌ Cấm

- Không dùng font size dưới **12px**
- Không dùng gradient hay shadow phức tạp cho background — làm chậm render, khó đọc màn hình cũ
- Không để nút xóa/xác nhận hành động nguy hiểm cạnh nhau — vùng trống tối thiểu **24px**
- Không dùng màu đỏ ngoài: lỗi, cảnh báo nguy hiểm, xác nhận xóa
- Không dùng mã lỗi kỹ thuật trong thông báo — luôn dùng tiếng Việt tự nhiên
- Không animate quá **300ms** cho micro-interaction thông thường

---

## 8. Motion & Animation

```css
:root {
  --transition-fast: 150ms ease-out;   /* Micro interaction: hover, active, focus */
  --transition-base: 200ms ease-out;   /* Component enter: opacity + translateY(4px) */
  --transition-slow: 300ms ease-in-out; /* (hiếm dùng) */
  --transition-page: 250ms ease-in-out; /* Page transition: fade only */
}
```

| Type | Duration | Easing | Effect |
|---|---|---|---|
| Micro interaction | 150ms | ease-out | hover · active · focus |
| Component enter | 200ms | ease-out | opacity + translateY(4px) |
| Page transition | 250ms | ease-in-out | fade only |
| Alert/Toast in | 200ms | ease-out | slide in |
| Alert/Toast out | 150ms | ease-out | fade out |
| Auto-dismiss toast | — | — | 4s |

> Chuyển động nhẹ nhàng, có mục đích — không làm phiền người dùng trong khi làm việc.

---

## 9. Logo Usage

### Variants

| Variant | Background | Dùng cho |
|---|---|---|
| Full logo (light) | `#FFFFFF` / light | App UI, tài liệu |
| Full logo (dark) | `#0D1324` / dark | Header, loading screen |
| Full logo (brand) | `#2563EB` | Marketing, banner |
| Icon only | Any | Favicon, app icon (min 32×32px) |

### Logo Spec

- Icon box: `border-radius: 10px`, background `#2563EB`
- Wordmark: `SCMD` — `#0D1324` (light bg) hoặc `#FFFFFF` (dark bg)
- `PRO` — `#2563EB` (light bg) hoặc `#4285F4` (dark bg)
- Font: Inter 800, letter-spacing: -0.5px
- **Không** tự ý chỉnh màu, tỷ lệ, hay font của logo

---

## 10. Quick Reference — CSS Copy-Paste

```css
/* ===== SCMD PRO — FULL CSS VARIABLES ===== */
:root {
  /* Colors */
  --color-primary:        #2563EB;
  --color-primary-hover:  #1A4FD0;
  --color-primary-light:  #EBF2FF;
  --color-text-primary:   #1A2133;
  --color-text-secondary: #4E5566;
  --color-surface:        #FFFFFF;
  --color-background:     #F8F9FB;
  --color-border:         #E2E5EB;
  --color-success:        #10B981;
  --color-warning:        #F59E0B;
  --color-danger:         #EF4444;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Radius */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 30px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.08);

  /* Transitions */
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 300ms ease-in-out;
  --transition-page: 250ms ease-in-out;

  /* Spacing */
  --space-xs:  4px;
  --space-sm:  8px;
  --space-md:  16px;
  --space-lg:  24px;
  --space-xl:  32px;
  --space-2xl: 40px;
  --space-3xl: 64px;
}
```

---

*SCMD PRO · Brand Identity Guidelines v2.4 · Nội bộ đội phát triển · Cập nhật 04/2025*
