---
name: scmduiuxreview
description: >-
  Review frontend SCMD PRO: Navy Theme, mobile-first UX, dashboard clarity, guard
  flow đơn giản, và product-fit. Dùng khi người dùng đề cập "UI", "UX", "React
  component", "màn hình", "dashboard", "theme", "mobile", "guard app", "design
  review", hoặc muốn check visual consistency và usability.
---

# SCMD PRO — UI/UX Review

Luôn trả lời bằng **tiếng Việt**.

## Nguyên tắc

UI của SCMD PRO phải phục vụ được **người dùng thực trong điều kiện thực tế**:
Guard dùng điện thoại ngoài trời ban đêm. Security Director cần thấy anomaly trong
30 giây. Vendor Representative cần hiểu violation mà không cần training.

Đừng chỉ check design token — check xem UI có *thực sự phục vụ được mục tiêu công
việc* của từng persona không.

---

## Design System

### Color Palette (bắt buộc)

| Token | Hex | Dùng cho |
|---|---|---|
| Main background | `#0D1324` | Page background |
| Primary action | `#2563EB` | CTA button, primary action |
| Accent / active | `#4285F4` | Link, active icon, highlight |
| Secondary text | `#CCD6F6` | Label, placeholder, secondary info |
| **Deprecated** | ~~`#0A192F`~~ ~~`#64FFDA`~~ | Không dùng |

### Typography
- **UI text:** Inter
- **GPS / timestamp / code:** JetBrains Mono
- **Không dùng italic**

### Touch Targets (mobile-first)
- Minimum: 48×48px
- Primary action (check-in, patrol start): 56px+
- Đặt action quan trọng trong vùng thumb-friendly (bottom half màn hình)
- Dùng `sm:` và `md:` Tailwind breakpoint đúng cách

---

## Persona Requirements

### Security Director
Cần thấy trong **≤30 giây** sau khi mở dashboard:
- Vendor score ranking
- High-risk site list
- SLA breach count
- Critical incident count
- Contract compliance %

### HR / Admin Manager
Cần thấy ngay:
- Thiếu guard ở site nào?
- Shift nào chưa đủ người?
- Vi phạm nào chờ xử lý?
- Trạng thái monthly acceptance report
- Gợi ý penalty

### Site Supervisor
Cần thấy ngay:
- Ai đang trực hiện tại?
- Patrol nào đang chạy?
- Incident nào cần action ngay?
- Guard/site nào có exception?

### Vendor Representative
Cần thấy ngay:
- Vi phạm đã confirm
- Evidence đính kèm
- Trạng thái dispute
- Scorecard tháng hiện tại

### Guard (mobile-critical)
Flow phải **nhanh và đơn giản nhất có thể**:
1. Check in (1 tap)
2. Xem task tiếp theo
3. Bắt đầu patrol
4. Scan QR / verify GPS
5. Thêm ảnh / ghi chú
6. Report incident
7. End shift

Mỗi bước không được có >2 tap từ màn hình hiện tại.

---

## Checklist Review

### Business Logic
- [ ] Compliance rule không được tính trong React component
- [ ] Không dùng mock/hardcoded data trong production flow
- [ ] SLA và violation không bị ẩn khỏi màn hình

### State Handling
- [ ] Loading state: skeleton hoặc spinner rõ ràng
- [ ] Empty state: message hướng dẫn, không để trống trắng
- [ ] Error state: message có nghĩa, có action (retry, go back)
- [ ] Optimistic update có rollback nếu API fail

### Accessibility
- [ ] Button có label rõ ràng (không chỉ icon)
- [ ] Color contrast đủ (text trên `#0D1324`)
- [ ] Form field có label (không chỉ placeholder)

### Mobile
- [ ] Touch target ≥48px
- [ ] Không có horizontal scroll ngoài ý muốn
- [ ] Form input không bị virtual keyboard che
- [ ] Heavy screen có pagination hoặc lazy load

---

## Output Format

### UX Verdict
`✅ Good` / `⚠️ Cần cải thiện` / `🚨 Vấn đề nghiêm trọng`

### Brand/Theme Issues
File, component, dòng cụ thể + token đúng cần dùng.

### Mobile Issues
Màn hình cụ thể + vấn đề + fix gợi ý.

### Persona-fit Issues
Persona nào không nhìn được thông tin cần thiết + tại sao quan trọng.

### Business Logic Leakage
Component nào đang tính rule không nên tính + chuyển về đâu.

### Recommended UI Improvements
Sắp xếp theo impact: từ cao đến thấp.

### Minimal Code Changes
Diff cụ thể, tập trung vào thay đổi ít nhất để đạt cải thiện nhiều nhất.
