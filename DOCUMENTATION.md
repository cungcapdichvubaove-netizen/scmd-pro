# SCMD Pro - Enterprise Security Management System Documentation

## Version: V.5.9.0.4 (Operational Admin Doctrine)

## Source of Truth (SOT) - The SCMD Pro Whitepaper

TÃ i liá»‡u nÃ y lÃ  **SÃ¡ch tráº¯ng (White Paper)** chÃ­nh thá»©c, Ä‘Ã³ng vai trÃ² lÃ  kiáº¿n trÃºc chuáº©n, Ä‘áº·c táº£ nghiá»‡p vá»¥ vÃ  chiáº¿n lÆ°á»£c cÃ´ng nghá»‡ cho ná»n táº£ng SCMD Pro. Má»i quyáº¿t Ä‘á»‹nh ká»¹ thuáº­t, quy mÃ´ vÃ  váº­n hÃ nh pháº£i tuÃ¢n thá»§ tuyá»‡t Ä‘á»‘i cÃ¡c nguyÃªn táº¯c trong tÃ i liá»‡u nÃ y. Má»i thay Ä‘á»•i lá»‹ch sá»­ theo tá»«ng phiÃªn báº£n vui lÃ²ng tham kháº£o táº¡i `CHANGELOG.md`.

### Overview Dashboard Information Deduplication (v5.9.0.4)

Tenant-admin overview la command surface theo doi hang ngay, nen moi tin hieu van hanh chi duoc render o mot vi tri chinh voi vai tro ro rang. Cung mot van de nhu thieu nguoi, breach SLA, tuan tra loi hoac vi pham cho review khong duoc lap lai dong thoi o hero, chip, KPI card, rail panel va bang neu cac vi tri do khong tao them quyet dinh moi cho nguoi dung.

Guardrail bat buoc:

- `Operations queue` la noi duy nhat hien thi chi tiet tung viec can xu ly; cac vung khac chi duoc hien summary hoac metadata bo tro.
- Overview khong duoc render KPI card lap lai so lieu da co trong queue summary hoac cot bang. KPI cap cao chi duoc giu khi co ngu canh rieng va action/drill-down khac biet.
- Rail ben phai chi dung cho tin hieu bo tro nhu pham vi nguon du lieu, muc tieu rui ro va do tin cay du lieu; khong lap lai cac nhom `ca thieu nguoi`, `tuyen can can thiep`, `su co dang mo`, `vi pham cho review` neu chung da nam trong queue.
- Frontend phai hop nhat `priorities` va `command-center/feed` theo entity key nghiep vu truoc khi render, de mot su kien khong xuat hien thanh nhieu dong chi vi den tu hai endpoint khac nhau.
- Khi them widget moi vao overview, phai chi ro widget do tra loi cau hoi nao khac voi queue; neu khong, dua thong tin vao cot bang, saved view, filter hoac drill-down cua module lien quan.

### Seeder Process Exit Integrity (v5.9.0.3)

Seeder va one-off script cua SCMD Pro khong duoc giu process song gia sau khi da hoan tat nghiep vu. Moi interval/observer cap infra duoc import chung voi app runtime phai `unref()` hoac co co che cleanup tuong ung, neu khong se gay nham lan la "seed treo" du du lieu da ghi xong.

Guardrail bat buoc:

- Utility script (`prisma/seeders/*`, migration helper, retention job chay mot lan) phai goi `db.disconnect()` thay vi chi `$disconnect()` tren mot prisma client don le.
- Moi `setInterval` cap infra dung cho metrics/probe phai `unref()` neu khong can giu process song.
- Khi seed bi abort giua chung, he thong phai uu tien idempotent upsert va cleanup co scope tenant rieng de lan chay lai khong lam vo dataset khac.

### Session Bootstrap & Demo Credential Integrity (v5.9.0.2)

Auth shell phai phan biet ro `chua co session` va `session het han` ngay tu bootstrap client. `AuthProvider` khong duoc goi `/api/v1/me` vo dieu kien khi client chua co dau hieu session cookie (`scmd_csrf`), vi dieu nay tao 401 noise trong console/network va lam mo root cause that cua login failure.

Guardrail bat buoc:

- Client chi auto-verify session khi ton tai session hint phia browser (`scmd_csrf` cookie) hoac mot chi dau xac thuc hop le khac duoc whitepaper phe duyet.
- Neu khong co session hint, auth store phai duoc clear som va giao dien login khong duoc tao network noise khong can thiet.
- Khong hien thi demo credential tren login page neu credential do khong nam trong seed/runtime hien hanh cua moi truong.
- Demo credential public phai bam sat source seed dang duoc bootstrap mac dinh; neu co tier seed rieng nhu `ktc-ocb`, UI phai ghi ro do la dataset tuy chon.

### Build Integrity Hotfix (v5.9.0.1)

Hotfix nay chot them mot guardrail van hanh cho frontend admin shell: cac component nam duoi `src/apps/*/interfaces/components` khong duoc sao chep import tu file cap cha ma khong re-validate do sau thu muc thuc te. Truong hop `SuperAdminSidebar` da gay fail build Vite/Rollup vi duong dan tuong doi tro sai `lib/utils`, `context/AuthContext` va `SCMDLogo`.

Tac dong kien truc:

- Day la loi dong goi frontend, khong thay doi business flow, RLS/RBAC, Zod boundary hay data contract.
- Hotfix duoc gioi han o muc import resolution de giu minimal diff va tranh refactor lan man.
- Khi them component moi trong shell admin, uu tien alias nhat quan hoac verify path theo vi tri file thay vi copy import tu page container cap tren.

### Operational Dashboard Shell Governance (v5.7.0.0)

### Operational Admin Doctrine (v5.9.0.0)

Admin cua SCMD Pro khong duoc thiet ke nhu dashboard trinh dien chung chung. Day la bang dieu khien doi soat va giam sat dich vu bao ve thue ngoai, vi vay moi first viewport phai giup nguoi dung tra loi trong vai giay: hien co van de gi, nam o dau, ai chiu trach nhiem, muc do nghiem trong ra sao, va can bam vao dau de xu ly.

Nguyen tac bat buoc:

- Trang admin phai uu tien `ra quyet dinh nhanh`, khong uu tien "dep" hoac hero/card mang tinh trinh dien.
- Luong hien thi mac dinh cua moi tab van hanh phai theo thu tu `Trang thai he thong -> Viec can xu ly ngay -> KPI van hanh -> Bang/queue chinh -> Drill-down -> Hanh dong`.
- KPI chi duoc ton tai neu co y nghia van hanh va drill-down duoc den danh sach cu the. KPI khong click duoc hoac khong dan den ngu canh xu ly phai xem la trang tri.
- Sidebar tenant-admin phai la cong cu dieu huong nghiep vu cap cao, khong phai noi bung toan bo CRUD/module con cua he thong.
- Mau sac chi duoc dung de bieu thi trang thai/nguy co: xanh = on dinh, vang = can chu y, cam = rui ro, do = vi pham/nguy cap, xam = khong hoat dong/da dong. Cam dung palette thuong hieu de to mau toan bo dashboard.
- Typography, spacing va mat do thong tin phai nghieng ve enterprise operations: quet nhanh, mat do trung binh-cao, table-first, radius nhe, padding vua du, khong uppercase trai muc dich.
- Moi so lieu quan trong phai co ngu canh trang thai di kem, vi du `Su co dang mo: 12 · 3 qua han · 2 nghiem trong`, thay vi chi hien `12`.
- CTA moi khu vuc phai it nhung ro. Hanh dong chinh hien ro; cac thao tac phu dua vao menu ngu canh, khong dat 5-7 nut ngang hang trong mot dong.
- UI phai duoc to chuc theo job-to-be-done cua nguoi van hanh (`ca nao thieu`, `tuyen nao tre`, `site nao vi pham`, `vendor nao can nhac`) thay vi phan chieu truc tiep theo bang du lieu/ten module.
- Overview tenant-admin la command surface mac dinh cua toan he thong va phai uu tien `system status + urgent queue` truoc tat ca chart hay panel phan tich.
- Cac tab nghiep vu cap hai nhung khong phai command queue chinh nhu `vendors`, `tasks`, `audit`, `help` van phai nam duoi shell admin thong nhat. Chung khong duoc lap `PageHeader` rieng neu shell da co, va first viewport cua tab phai la summary/actionable context gon nhe thay vi hero trinh dien.
- Rieng `/admin/vendors` la workspace du lieu nha thau/hop dong nen khong render `EnterprisePageChrome`, `ContextFilterBar` toan cuc hoac card trang thai feature flag o first viewport. Man hinh phai bat dau truc tiep bang tab/toolbar cuc bo va bang du lieu `vendor/site/contract`; thong tin access/feature flag chi hien khi bi khoa hoac co loi quyen truy cap.
- Cac tab thuoc nhom `Cau hinh` nhu `settings`, `subscription` duoc phep uu tien form/workflow cau hinh thay vi urgent queue, nhung van phai giu visual discipline cua admin shell: khong hero trung lap, khong metric trang tri, khong card marketing hoa.

### Attendance Operations Command Dashboard Governance (v5.8.0.0)

Tab `attendance` trong tenant-admin khong duoc trinh bay nhu mot report log sau ky. Day la man hinh dieu hanh ca truc hang ngay, uu tien tra loi ngay 4 cau hoi: ca nao thieu nguoi, ai chua check-in/check-out, log nao sai GPS/khong hop le, va van de do gan voi site/vendor/contract nao.

Contract bat buoc cho attendance dashboard:

- Route `/admin/attendance` phai ton tai theo shell `TabToolbar -> KPI Summary -> Urgent Queue -> Operational Table`.
- Query filter cua tab attendance phai di xuong API that, khong duoc dung state frontend gia lap de tao cam giac da loc toan he thong.
- Read model attendance phai go duoc context `shiftSchedule`, `site`, `guardPost`, `contract`, `vendor` neu du lieu ton tai, de moi dong cham cong tro thanh bang chung doi soat hop dong thay vi log ca nhan roi rac.
- Auto-refresh trong tenant-admin khong duoc pha vo ngu canh thao tac. Khi nguoi dung dang o tab dieu hanh chi tiet nhu `attendance`, he thong khong duoc unmount man hinh dang xem hoac reset bo loc/noi dung chi vi co polling nen.
- KPI dau trang phai uu tien `Ca can xu ly`, `Ca thieu nguoi`, `Chua check-out`, `GPS/log rui ro`, `Ty le hop le`; cam dua `pagination`, `tong so dong` hoac chi so trang tri len vung quyet dinh chinh.
- `ops-summary` la endpoint tong hop duoc phep de frontend khong phai suy dien command state tu danh sach log phan trang. Endpoint nay phai tenant-scoped, validate Zod va giu RBAC `log:read`.
- `Urgent items` cua attendance phai dung cung ngon ngu van hanh voi command center: `UNDERSTAFFED`, `MISSING_CHECKOUT`, `WRONG_GPS`, `LATE_CHECKIN`, co `nextAction`, `siteName`, `vendorName`, `contractId`, `shiftLabel`.
- Empty state cua attendance phai giai thich ngu canh van hanh: khong co ca trong ky, bo loc qua hep, hoac chua co shift schedule; khong duoc chi hien mot dong "khong co du lieu" trung tinh.
- Attendance weekly/current-shift phai uu tien mat do thong tin enterprise, radius nhe, table dense, bo AI monthly block khoi first viewport. Phan tich thang neu can phai de trong luong reporting, khong chen vao khu command.

### Site Operations Dashboard Governance (v5.8.0.0)

Tab `sites` trong tenant-admin khong duoc bat dau bang CRUD checkpoint/route nhu mot man hinh cau hinh thuan tuy. First viewport phai uu tien `Site Operations Summary`, `urgent queue` va `Site Health` de nguoi van hanh nhin ra ngay site nao thieu contract/chot/tuyen, site nao dang co rui ro attendance hoac ngoai le tuan tra.

Contract bat buoc cho `sites` dashboard:

- `contextualFilters` cua tab `sites` phai tac dong that len du lieu hien thi; cam render filter gia ma danh sach/KPI khong doi.
- `Site Health` la don vi tong hop mac dinh, checkpoint chi la cap con dung cho drill-down va cau hinh.
- Neu co `attendance ops summary`, `urgentItems` phai duoc tai su dung o `sites` de giu nguyen ngu canh site/chot/tuyen, tranh buoc nguoi dung nhay qua tab `attendance` moi thay duoc rui ro.
- Loading/error state cua du lieu phu phai tach rieng voi empty state nghiep vu; cam silent catch roi render rong nhu khong co du lieu.

### Contextual Filter Governance (v5.7.0.0)

### Command Center Queue Data Contract (v5.7.0.0)

P1/P2 của command center phải loại bỏ cảm giác trang trí bằng cách hợp nhất các tín hiệu trùng nguồn trước khi render. Frontend phải chuẩn hóa `priority-*`, `feed-*`, `patrol-*`, `patrol-session-*`, `shift-shortage-*` và `violation-*` về cùng entity key nghiệp vụ để một sự kiện không xuất hiện nhiều lần trong hàng đợi. Dòng hiển thị site/ca/tuyến phải dùng nhãn đã rút gọn, không lặp lại tên mục tiêu trong cả cột `Site/Ca` và mô tả tuyến. Panel `Nhà cung cấp cần chú ý` phải được tính từ hàng đợi hiện tại theo số việc mở và số việc mức cao, không lấy dòng đầu tiên một cách ngẫu nhiên.

Dashboard tổng quan tenant-admin là màn hình điều hành hằng ngày, vì vậy hàng đợi xử lý phải dùng dữ liệu cấu trúc thay vì parse chuỗi mô tả. API `/api/tenant/command-center/priorities` phải trả tối thiểu `id`, `type`, `title`, `severity`, `timestamp`, `siteId/siteName`, `vendorId/vendorName`, `contractId`, `shiftLabel`, `routeName`, `guardName`, `assigneeName`, `slaStatus`, `dueAt`, `nextAction` và `targetRoute` khi dữ liệu nguồn có thể xác định được. Frontend được phép fallback từ `description` để tương thích dữ liệu cũ, nhưng không được coi chuỗi mô tả là contract chính.

Overview dashboard phải hợp nhất `priorities` và `command-center/feed` theo entity tương ứng, sort theo mức độ nghiêm trọng rồi đến thời điểm phát sinh. `CRITICAL`, `BREACHED`, `SHIFT_SHORTAGE`, `PATROL_EXCEPTION`, `INCIDENT_SLA` và `VIOLATION_REVIEW` phải được đưa vào hàng đợi xử lý với next-best-action cụ thể như `Điều phối nhân sự`, `Gửi nhắc tuần tra`, `Mở hồ sơ sự cố`, `Review vi phạm`, `Yêu cầu bổ sung`. Không dùng nút chung chung `Xử lý` nếu có thể xác định hành động nghiệp vụ tốt hơn.

Chỉ số `Chất lượng dữ liệu` không được trộn lẫn với trạng thái AI/reporting. Nếu `/api/reports/smart-monthly` trả lỗi phân tích, `criticalIssues` hoặc recommendation liên quan đến AI/API, dashboard phải hiển thị trạng thái degraded riêng và không dùng kết quả đó như bằng chứng đối soát tháng. Dữ liệu vận hành từ PostgreSQL/API nội bộ vẫn là nguồn đáng tin cậy cho command center.

Khu vực `Mục tiêu rủi ro` phải ưu tiên anomaly thật; nếu chưa có anomaly, có thể suy ra danh sách kiểm tra từ `map-data` bằng checkpoint `SOS`/`ALERT` hoặc nhiều checkpoint `INACTIVE`. Empty state chỉ được hiển thị khi không có dữ liệu rủi ro theo bộ lọc hiện tại, không dùng như khối trang trí.

Header cấp trang trong tenant-admin dashboard chỉ được dùng cho nhận diện trang, mô tả nghiệp vụ, trạng thái đồng bộ dữ liệu và action cấp trang như `Báo cáo`, `Đối soát SLA`, `Làm mới`. Không đặt search, dropdown site/vendor/status, khoảng thời gian hoặc bất kỳ filter nghiệp vụ nào trong header vì điều đó tạo kỳ vọng sai rằng filter đang chi phối toàn hệ thống.

Mọi filter nghiệp vụ phải nằm trong `TabContent`, sát vùng dữ liệu mà nó điều khiển. Mẫu bắt buộc là `TabToolbar -> KPI/Summary -> Main table/queue/cards -> Empty/Loading/Error state`. `TabToolbar` gồm quick search, primary filters, nút `Bộ lọc nâng cao`, active filter chips, `Xóa bộ lọc` và `Làm mới`. Refresh phải giữ nguyên filter hiện tại; export phải dùng đúng filter của tab hiện tại và ghi rõ phạm vi là dữ liệu theo bộ lọc của tab.

Trong tenant-admin dashboard, cụm `PageHeader + ContextFilterBar` phải sticky cùng nhau ở đầu scroll container. Filter không được cuộn mất khỏi màn hình khi người dùng xử lý bảng/hàng đợi dài, nhưng cũng không được đặt lẫn vào header identity. Đây là vùng điều khiển cố định của tab hiện tại.

Shell tenant-admin không được dùng feature flag để render rỗng main content của một tab đã có route/navigation hợp lệ. Sidebar và tab manager phải mount đúng component theo `activeTab`; nếu tenant chưa có quyền dùng module, module đó tự hiển thị trạng thái khóa/nâng cấp hoặc API trả lỗi có kiểm soát. Không được để người dùng thấy cùng một shell/filter nhưng không có nội dung riêng của tab.

Header tenant-admin phải tối giản. Không hiển thị khu vực trạng thái đồng bộ/telemetry nếu thông tin đó không phục vụ trực tiếp quyết định của người dùng ngay tại header. Trạng thái dữ liệu chi tiết, offline queue hoặc telemetry thiết bị nếu cần phải đặt trong tab/khu vực vận hành liên quan, có nguồn dữ liệu thật và action xử lý rõ ràng. Header chỉ giữ title/subtitle, tenant context và action cấp trang.

Kiến trúc filter tenant-admin phải đi theo hướng config-driven qua `TabFilterConfig`, `FilterField`, `ContextFilterBar`, `FilterChips`, `AdvancedFilterDrawer` và `useTabFilters`. Mỗi tab có default riêng theo nghiệp vụ: `overview`, `attendance`, `sites`, `incidents`, `vendors`, `staff`, `tasks`, `audit`, `attachments`, `violations`, `reports`.

Điều hướng tenant-admin phải dùng route path làm nguồn sự thật cho tab đang mở. Route canonical là `/admin/dashboard` cho `overview` và `/admin/<tab>` cho các module như `attendance`, `sites`, `incidents`, `vendors`, `staff`, `tasks`, `audit`, `attachments`, `violations`, `reports`, `subscription`, `settings`, `help`. Query `tab` chỉ được giữ để tương thích link cũ và phải được canonical hóa sang route path. Các hook filter không được tự ghi hoặc xóa `tab`, đồng thời khi đồng bộ query phải navigate với `pathname` hiện tại một cách tường minh để không làm người dùng bị kéo về `/admin/dashboard`.

Thứ tự khôi phục filter là URL query, sau đó localStorage theo key `tenantAdmin.filters.<tab>`, sau cùng là default của tab. URL query là source chính để reload và share link. LocalStorage chỉ lưu filter vận hành không nhạy cảm. Search debounce 300-500ms. Sort là trạng thái riêng và không được trộn vào filter.

Backend contract cho các list API liên quan phải hỗ trợ query params tương ứng như `siteId`, `vendorId`, `contractId`, `status`, `severity`, `from`, `to`, `q`, `sort`, `cursor`, `limit`, validate bằng Zod tại boundary và repository vẫn phải tenant-scoped qua `db.forTenant` hoặc cơ chế tenant scope hiện có. Không filter dữ liệu lớn hoàn toàn ở frontend khi backend/API cần hỗ trợ query.

Dashboard quản trị tenant phải ưu tiên mô hình **trung tâm điều hành** thay vì trang thống kê trình diễn. Màn hình tổng quan mặc định cần đặt `Hàng đợi xử lý theo ưu tiên` làm vùng nội dung chính, hiển thị trực tiếp các việc cần xử lý như thiếu nhân sự ca trực, tuần tra chưa đạt, sự cố mở, SLA quá hạn/sắp quá hạn và bằng chứng thiếu. KPI đầu trang chỉ được dùng để tóm tắt tình trạng vận hành và không được cạnh tranh thị giác với hàng đợi xử lý.

FilterBar trên dashboard là control có tác dụng thật, không phải thành phần trang trí. Các bộ lọc `Site`, `Nhà cung cấp`, `Khoảng thời gian`, `Trạng thái` phải được lưu bằng state có kiểm soát và truyền xuống vùng dữ liệu chịu ảnh hưởng. Nếu một tab chưa hỗ trợ đầy đủ filter backend, frontend tối thiểu phải áp dụng filter ở lớp danh sách đang hiển thị và không được tạo cảm giác người dùng đã lọc dữ liệu toàn hệ thống khi thực tế không đổi.

Header báo cáo chỉ được có một điểm vào chính là `Báo cáo`. Menu báo cáo gom các hành động: xuất PDF tổng quan, xuất Excel theo bộ lọc hiện tại, xuất báo cáo SLA, xuất báo cáo nhà cung cấp và lên lịch gửi báo cáo. Các bảng con chỉ dùng nút nhỏ `Xuất danh sách này` khi cần xuất riêng dữ liệu của bảng đó.

Ngôn ngữ dashboard vận hành phải dùng tiếng Việt tự nhiên: `Hoàn thành tuần tra`, `Chất lượng dữ liệu`, `Mục tiêu rủi ro`, `Tự cập nhật: 60 giây`, `Dữ liệu đồng bộ lúc...`. Các nhãn tiếng Anh như `Trust`, `Auto`, `Live Operations` chỉ được giữ khi là thuật ngữ sản phẩm đã được giải thích rõ trong ngữ cảnh.

Background governance: nền dashboard phải dùng navy/slate làm base, có chiều sâu nhẹ bằng gradient và vignette rất mềm. Pattern/grid chỉ được dùng ở mức gần như không nhận ra, opacity thấp, không cạnh tranh với bảng vận hành hoặc KPI. Header, sidebar và filter surface phải dùng cùng ngôn ngữ surface để tránh cảm giác nhiều mảng rời. Không dùng glow, texture hoặc gradient mạnh ở màn hình dữ liệu dày.

SCMD Pro được phép kế thừa có chọn lọc kỷ luật giao diện của các operational console hiện đại, nhưng không được sao chép nguyên bản phong cách của developer/infrastructure tool. Mục tiêu của phase này là tăng operational clarity, giảm nhiễu thị giác và giúp người dùng doanh nghiệp quét thông tin ca trực, tuần tra, sự cố, SLA và đối soát nhanh hơn.

Nguyen tac bat buoc:

- Product Positioning First: Mọi quyết định UI phải cường hóa định vị SCMD Pro là nền tảng giám sát và đối soát chất lượng dịch vụ bảo vệ thuê ngoài. Cấm đưa thuật ngữ kỹ thuật kiểu `Endpoint`, `Provider`, `MITM`, `Proxy Pool`, `Shutdown`, `Donate` vào shell tenant-admin/vendor workspace.
- AppShell Standard: Mọi workspace nghiệp vụ tenant-admin phải tuân theo cấu trúc `Sidebar -> Main -> PageHeader -> FilterBar -> KPI Summary -> Operational Content -> Pagination/Drawer`. Không để page chỉ gồm card/bảng rời rạc mà thiếu header và filter context.
- Sidebar Hierarchy: Sidebar phải ưu tiên để quét nhanh, gom các khối rõ ràng: `Brand/Tenant Identity`, `Main Navigation`, `Operations`, `Reports/Compliance`, `Account/Logout`.
- Active State Discipline: Item đang được chọn phải có active state rõ bằng nền nhạt, icon đổi màu, label đậm hơn và vị trí dễ nhận biết nhanh.
- Page Header Contract: Mỗi page nghiệp vụ phải có `title + subtitle + context actions` để diễn giải trục nghiệp vụ đang theo dõi.
- FilterBar Contract: Filter phải nằm sát vùng dữ liệu mà nó chi phối và ưu tiên thao tác một hàng compact. Tập filter chuẩn phải bám trục `Site`, `Vendor`, `Contract`, `Date Range`, `Status`, `SLA Risk`, `Refresh/Auto-refresh`, `Export`.
- Business Axis Alignment: Mọi filter, summary card và table state phải truy vết được về trục `Tenant -> Vendor -> Contract -> Site -> GuardPost -> Shift Requirement -> Attendance/Patrol/Incident -> ViolationEvent -> VendorScorecard -> MonthlyAcceptanceReport`.
- Operational Card Standard: Card dữ liệu phải tối ưu scan nhanh bằng số liệu, progress, status color, countdown/remaining SLA và quick action. Ưu tiên cho `Shift Coverage`, `Patrol Compliance`, `Open Incidents`, `SLA Deadline`, `Vendor Scorecard`, `Monthly Acceptance readiness`.
- Status Semantics: `Primary Blue` cho điều hướng/tiến trình, `Green` cho đúng chuẩn/an toàn, `Amber` cho cảnh báo/sắp vi phạm, `Red` cho breach/sự cố. Cấm làm loãng nghĩa cảnh báo bằng accent hồng/cam mang tính trang trí.
- Density & Typography: Sidebar item khoảng `13-14px`, page title `24-28px`, metadata `12-13px`, border mảnh, shadow nhẹ, radius `10-14px`, card padding `16-20px`. Giữ `Inter`, `JetBrains Mono` và cấm italic theo Navy Theme.
- Background & Surface Restraint: Được phép dùng grid/pattern rất mờ ở dashboard overview, nhưng không được làm rõ trên màn hình bảng/nghiệp vụ dày dữ liệu. Surface phải nghiêng navy/slate/neutral, ưu tiên trust và khả năng đối soát hơn hiệu ứng developer tool.
- Realtime Use With Restraint: `Auto-refresh`, `Last updated`, `Live indicator` là hợp lệ cho command center, nhưng phải áp dụng có chọn lọc theo page và tải API/socket.
- Action Vocabulary: CTA phải dùng ngôn ngữ doanh nghiệp vận hành như `Xuất báo cáo`, `Lọc dữ liệu`, `Tạo sự cố`, `Đối soát SLA`, `Xem bằng chứng`, `Xem chi tiết`.
- Implementation Strategy: Đây là initiative cấp sản phẩm, phải đi từ design system và shell component dùng chung (`AppShell`, `Sidebar`, `PageHeader`, `FilterBar`, `StatusBadge`, `OperationalCard`, `TableToolbar`) rồi mới rollout theo tab. Cấm sửa từng màn hình theo hướng mạnh ai nấy làm.
- Rollout Priority: Ưu tiên `Overview`, `Incidents`, `Reports`, sau đó mới mở rộng sang `Attendance`, `Sites/Patrol`, `Vendor`.

Minimal Operations Audit addendum:

- Tenant admin shell chỉ được có một nguồn page context chính. Nếu AppShell đã có `PageHeader` và `FilterBar`, tab content không được lặp lại hero/header/action bar riêng trừ khi có lý do nghiệp vụ đặc biệt.
- Overview phải là màn hình điều hành, không phải landing/demo page. Nội dung ưu tiên gồm KPI scan nhanh, hàng đợi xử lý, bản đồ điểm kiểm soát, realtime feed và các chỉ số đối soát cần quyết định.
- Sidebar không được nhân đôi thông tin tenant/account/SLA thành nhiều card độc lập. Brand, tenant, role, plan và logout phải đủ gọn trong một rail để giảm nhiễu thị giác.
- Background/pattern chỉ được giữ ở mức surface rất nhẹ. Các màn hình vận hành dày dữ liệu ưu tiên navy/slate phẳng, border mảnh và shadow cực nhẹ.
- Mọi action trên header/filter/content phải trả lời rõ: lọc dữ liệu, làm mới, xuất báo cáo, mở workspace xử lý hoặc tạo đối tượng nghiệp vụ. Action trang trí phải bị loại bỏ.
- Main content của các tab quản trị phải đồng bộ theo cùng một visual rhythm với shell: spacing `space-y-5`, radius `14px`, border `white/8-10`, shadow rất nhẹ, focus-visible rõ ràng và không lặp lại hero/page title khi shell đã có title. Các page-level header cũ trong tab chỉ được giữ lại nếu nó chứa action nghiệp vụ bắt buộc; khi có action thì render như một toolbar nhỏ.
- Các tab có workflow thường xuyên như `attendance` và `incidents` phải ưu tiên toolbar lọc/refresh ngắn, KPI có mục đích rõ, empty/loading/error state rõ ràng và modal có `role=dialog`, `aria-modal`, phím Escape đóng được.

Mau cau truc chuan:

```text
AppShell
├── Sidebar
│   ├── Brand / Tenant Identity
│   ├── Main Navigation
│   ├── Operations
│   ├── Reports / Compliance
│   └── Account / Logout
├── Main
│   ├── PageHeader
│   │   ├── Icon + Title + Subtitle
│   │   └── Context Actions
│   ├── FilterBar
│   │   ├── Site selector
│   │   ├── Vendor selector
│   │   ├── Contract / Date range
│   │   ├── Status / SLA risk
│   │   └── Refresh / Export
│   ├── KPI Summary
│   ├── Operational Cards / Tables
│   └── Pagination / Detail Drawer
```

Phase `v5.7.0.0` là thay đổi product-surface cấp MINOR. Nó không thay đổi business backbone, RLS, RBAC hay use-case contract, nhưng khóa chặt UI shell contract để các phase tiếp theo triển khai đồng nhất và không làm lệch định vị sản phẩm.

### Pre-demo Frontend/Security Guardrails (v5.6.1.0)

### Evidence Storage Optimization Governance (v5.6.2.2)

De toi uu hoa cho cac Tenant co tan suat su co cao va dam bao hieu nang Command Center:

- **Client-side Compression**: Component chup anh (`SecureCameraCapture`) phai thuc hien resize xuong max-width `1920px` va nÃ©n JPEG xuong muc `0.8` truoc khi tao Blob upload. Cam gui anh thÃ´ (raw) tu thiet bi di dong de tiet kiem bang thong va dung luong storage.
- **Edge-based Thumbnails**: UI list/feed chi duoc phep hien thi thumbnail co width <= `400px` thong qua Edge Transformation (Cloudflare Images/Sharp Proxy). Anh goc chi duoc load trong man hinh chi tiet hoac man hinh giam dinh (Forensic View).
- **Tiering Policy & Worker**: Há»‡ thá»‘ng triá»ƒn khai job `TIER_EVIDENCE_STORAGE` cháº¡y hÃ ng tuáº§n qua BullMQ Heavy Worker. Job thá»±c hiá»‡n quÃ©t cÃ¡c báº£n ghi báº±ng chá»©ng cÃ³ `isReportLocked = true` vÃ  `createdAt` > 180 ngÃ y Ä‘á»ƒ chuyá»ƒn Ä‘á»•i `storageClass` sang `COLD` (Infrequent Access). Metadata báº£n ghi pháº£i lÆ°u váº¿t `storageProviderClass` Ä‘á»ƒ Ä‘iá»u chá»‰nh logic láº¥y URL (Presigned URL cÃ³ thá»ƒ cáº§n TTL dÃ i hÆ¡n cho Cold Storage).
- **COLD Access Revocation**: Báº±ng chá»©ng Ä‘Ã£ chuyá»ƒn sang COLD storage KHÃ”NG Ä‘Æ°á»£c cung cáº¥p Presigned URL trá»±c tiáº¿p tá»« repository. Há»‡ thá»‘ng báº¯t buá»™c sá»­ dá»¥ng cÆ¡ cháº¿ JIT (Just-In-Time) thÃ´ng qua endpoint API trung gian. Endpoint nÃ y pháº£i kiá»ƒm tra session cá»§a Actor vÃ  chá»‰ cáº¥p phÃ¡t Presigned URL vá»›i TTL tá»‘i Ä‘a 60 giÃ¢y. Má»i yÃªu cáº§u truy cáº­p báº±ng chá»©ng COLD pháº£i Ä‘Æ°á»£c ghi Audit Log vá»›i nhÃ£n `HISTORICAL_ACCESS_AUDIT`.
- **Forensic Watermarking**: Viec nÃ©n anh phai thuc hien SAU khi da ve Watermark (GPS, Timestamp) vao Canvas de dam bao tinh toan ven cua bang chung phap ly.

Phien ban v5.6.1.0 khoa cac invariant truoc demo tenant dau tien:

- CSS build phai bat `cssCodeSplit` va khong duoc import truc tiep full DaisyUI CSS bundle; chi duoc sinh cac component UI dang dung qua Tailwind/DaisyUI plugin hoac thay bang design system noi bo.
- PWA phai duoc build qua `VitePWA`, cache app shell/static co gioi han, va khong cache API (`/api/*`) de tranh sai du lieu van hanh hien truong.
- Role `vendor-commander` phai vao `/vendor-commander/workspace`; khong duoc them role nay vao `allowedRoles` cua `/admin/*`.
- Incident offline signature khong duoc dung hardcoded fallback secret. Neu thieu `scmd_device_secret`, UI phai chan submit va yeu cau dang nhap lai.
- `npm run version:check` phai bat mismatch giua `package.json`, `index.html`, whitepaper/changelog va PWA manifest metadata bat buoc.
- Tenant-admin dashboard orchestrator khong duoc dung `@ts-nocheck`; moi thay doi tab phai giu type contract ro rang de tranh regression an loi props/null.
- Guard profile trong mobile app chi hien du lieu van hanh theo scope `tenant/vendor/site/contract/shift` cua guard hien tai: ten, staff ID, vendor, site/guard post, ca hom nay, lich su check-in 7 ngay va canh bao thieu thong tin bat buoc. Cam mo rong thanh HRM ca nhan nhu luong, CV, KPI ca nhan.
- ContractVersion lifecycle phai co API tao/list/activate/archive rieng. Activate version moi phai archive active version cu trong cung contract/tenant va ghi audit log; vendor-commander khong duoc activate/archive contract version.
- Vendor-commander API phai tiep tuc di qua role guard rieng va repository scope theo `assignedVendorId/assignedSiteId/assignedContractId`; khong duoc xem billing/settings/analytics toan tenant hoac du lieu vendor khac.
- Public contact lead Turnstile phai fail-fast tren service phuc vu public HTTP/API neu `CONTACT_LEAD_TURNSTILE_REQUIRED=true` nhung thieu `VITE_TURNSTILE_SITE_KEY` hoac `CLOUDFLARE_TURNSTILE_SECRET_KEY`. Worker-only/realtime-only service khong duoc bi phu thuoc public contact env neu khong mount public API. Desktop/local duoc phep tat challenge co chu dich qua `DESKTOP_CONTACT_LEAD_TURNSTILE_REQUIRED=false` hoac `DEV_CONTACT_LEAD_TURNSTILE_REQUIRED=false`; khong duoc dung dummy secret de vuot validation production.
- Frontend auth da chuyen sang cookie-auth: route guard khong duoc dung JWT localStorage/client token lam dieu kien dang nhap. `ProtectedRoute` phai dua tren session state da duoc `/api/v1/me` xac nhan va role hien tai de tranh vong lap `/login <-> dashboard`.
- Cookie-auth production phai mac dinh `AUTH_COOKIE_SECURE=true` va dung cookie `__Host-*`. Desktop/local chay HTTP phai opt-out ro rang qua `DESKTOP_AUTH_COOKIE_SECURE=false` hoac `DEV_AUTH_COOKIE_SECURE=false`; khong duoc yeu cau browser luu secure cookie tren kenh local HTTP. Moi API `/api/*` phai tra `Cache-Control: no-store` de `/api/v1/me` va auth state khong bi 304/stale cache.
- Seed demo account password khong duoc reset ngam trong production. Khi DB desktop/local da ton tai nhung tai khoan demo bi lech mat khau seed, chi duoc dong bo lai co chu dich bang `SEED_RESET_DEMO_PASSWORDS=true` trong non-production; production luon bo qua flag nay.
- SLO monitoring khong duoc query cross-tenant truc tiep tren bang tenant-scoped bang `groupBy`/bypass. Job nen lay danh sach tenant active trong SYSTEM context, sau do fan-out sang `db.withTenant(tenantId)` va dem log theo tung tenant de giu RLS bat bien.
- Feature guard phai validate dependency tren effective runtime flags da qua `resolveTenantFeatureFlags`, khong duoc dua vao raw `featuresEnabled` legacy. Tenant PRO/MAX co default feature phu thuoc hop le khong duoc bi chan boi override cu nhu `patrol`/`attendance`/`ai_analytics`.
- Mobile guard attendance phai co contract self-scoped ro rang: `GET /api/tenant/attendance/me` chi tra record trong ngay cua actor hien tai qua `db.forTenant(ctx.tenantId)`, khong doc attendance toan tenant. Check-in/check-out tu UI phai gui qua security attendance flow co Zod validation va permission `log:write`; cac alias tuong thich khong duoc bo qua validation.
- Attachment upload qua multipart phai normalize metadata server-side truoc Zod validation: `tags` tu form-data phai duoc parse thanh array. Neu storage provider chua cau hinh, chi desktop/local moi duoc dung data URI fallback do server tao tu uploaded file; production HTTPS that phai fail ro bang `ATTACHMENT_STORAGE_UNAVAILABLE`, khong nhan data URI client gui truc tiep.
- PWA install identity phai dung ten san pham `SCMD Pro`, icon vuong rieng cho install prompt (`192x192`, `512x512`, `maskable`) va apple touch icon. Khong duoc dung wordmark ngang lam icon manifest vi trinh duyet co the fallback sang chu cai mac dinh thay vi logo.
- `ViolationEvent.status` trong schema va migration phai mac dinh `PENDING_REVIEW`; legacy `OPEN`/`PENDING` chi duoc ton tai trong du lieu cu va phai normalize/backfill truoc khi tinh score, penalty hoac monthly acceptance.
- Production public phai fail-fast neu secret quan trong thieu, qua ngan hoac con placeholder `replace_me`; desktop/local profile chi duoc bo qua validation khi `APP_URL` la localhost/127.0.0.1 hoac `APP_ENV`/`VITE_APP_ENV` la `local`, `development`, `desktop`. Rieng `AUTH_COOKIE_SECURE=false` khong duoc phep bypass secret validation tren public domain. Unhandled 5xx ngoai local phai tra message generic, chi DomainError/Zod/Prisma mapped errors moi duoc tra message theo contract.
- CI integration co the bat `STRICT_DB_TEST=true` de cam Prisma fallback mock DB; cac test RLS/migration phai chay tren PostgreSQL that khi can chung minh isolation.

### Contract Versioning & Operational Law Governance (v5.6.0.0)

Contract Versioning la co che cot loi de bao ve tinh bat bien cua du lieu doi soat lich su, dam bao "Hop dong la luat van hanh" tai moi thoi diem.

Quy tac bat buoc:

- **Entity Separation**: Model `Contract` chi luu thong tin dinh danh (Vendor, Site, Subdomain). Moi thong so van hanh phai nam trong `ContractVersion`.
- **Immutability Policy**: Mot khi `ContractVersion` da chuyen sang trang thai `ACTIVE`, cam tuyet doi chinh sua (Update). Moi thay doi dieu khoan phai duoc thuc hien tren mot ban `DRAFT` moi.
- **Single Active Version**: Tai mot thoi diem, mot `Contract` chi duoc phep co duy nhat mot `ContractVersion` o trang thai `ACTIVE`.
- **Effective Date Guard**: `ContractVersion` phai co truong `effectiveFrom`. He thong se tu dong resolve version dung dua tren thoi diem phat sinh vi pham hoac ky bao cao.
- **Structured Components**: Moi version phai bao gom day du cac quan he:
    - `ContractLineItem`: Chi tiet don gia theo tung diem truc. Moi ban ghi phai bao gom:
        - `siteId`: Site ap dung.
        - `guardPostId`: Chot bao ve cu the.
        - `shiftName`: Ten ca (DAY, NIGHT, v.v.).
        - `requiredStaffCount`: So luong nhan su bat buoc theo hop dong.
        - `unitPrice`: Don gia (Decimal/Money) tren mot nhan su.
        - `billingCycle`: Chu ky tinh tien (mac dinh: MONTHLY).
        - `totalAmount`: Tu dong tinh bang `requiredStaffCount * unitPrice`.
    - `ContractShiftRequirement`: Quy dinh ca truc, so chot, gio bat dau/ket thuc.
    - `ContractStaffStandard`: Tieu chuan nhan su (bang cap, chung chi).
    - `ContractPenaltyRule`: Cac ma loi va muc phat tuong ung (da dong bo tu Penalty Engine V2).
    - `ContractChecklistRequirement`: Cac dau muc kiem tra bat buoc va tan suat.
- **Report Linkage**: `MonthlyAcceptanceReport` Báº®T BUá»˜C phai luu `contractVersionId`. Khi xuat report, he thong doc du lieu tu version snapshot nay, khong duoc doc tu live contract de tranh sai lech khi hop dong thay doi giua chung. HTTP surface cung cap endpoint `GET /api/tenant/monthly-acceptance-reports/:id/version-binding` de client kiem tra version binding hien co; endpoint nay chi doc `contractVersionId`/snapshot da luu tren report va khong duoc resolve lai live `Contract.activeVersion` cho bao cao lich su.
- **Monthly Cutoff Resolution**: Khi generate/regenerate monthly compliance, he thong phai resolve `ContractVersion` theo cutoff ky bao cao (`periodEndExclusive - 1ms`) dua tren `effectiveFrom/effectiveTo`, sau do bind Penalty Engine va snapshot tai chinh vao version da resolve. Neu du lieu legacy chua co version phu hop, chi fallback ve active version hien tai de duy tri kha nang van hanh, dong thoi van ghi ro `contractVersionId` fallback vao report snapshot.
- **Audit Trail**: Moi lan tao version moi hoac kich hoat version phai ghi `AuditLog` kem theo diff cac thay doi quan trong (vi du: thay doi don gia, tang muc phat).

Luong nghiep vu chuan:
`Create Contract -> Create Version 1 (DRAFT) -> Add Items/Rules -> Activate Version 1 -> [Váº­n hÃ nh] -> Change Request -> Create Version 2 (DRAFT) -> Review -> Activate Version 2 (V1 auto-archived)`.

### SuperAdmin Feature Flag Matrix Governance (v5.5.0.12)

Feature flag trong SCMD PRO phai la mot matrix nghiep vu co SSOT ro rang tren tenant, khong duoc ton tai nhieu nguon state song song giua UI, API va plan logic.

Quy tac bat buoc:

- `Tenant.featuresEnabled` la noi luu override theo tenant; feature flag thuc thi phai duoc resolve theo cong thuc `default theo plan + override theo tenant`.
- Danh muc feature flag chuan gom: `contract_compliance`, `vendor_management`, `vendor_commander`, `shift_planning`, `patrol_route`, `incident_sla`, `penalty_engine`, `vendor_scorecard`, `monthly_acceptance_report`, `export_pdf`, `evidence_storage`, `ai_contract_scan`, `predictive_guard`, `usage_analytics`, `benchmark_mode`, `sos_button`.
- Super Admin phai co workspace `Feature Flag Matrix` de tim tenant, loc theo plan, va bat/tat tung feature trong bang.
- Feature flag khong chi dung de an UI. API phai chan bang middleware `requireFeature(...)` tren cac route nghiep vu tuong ung.
- `GetMeUseCase` phai tra ve `resolvedFeatures` de frontend tenant-admin dung mot nguon truth duy nhat cho lock state.
- Khi subscription plan thay doi, he thong phai invalidate cache feature va resolve lai default feature theo plan moi.
- Cac route lien quan contract compliance, vendor operations, patrol, incident SLA, evidence, scorecard, monthly acceptance, predictive analytics, benchmark va export phai duoc map vao feature guard ro rang.

### AI Contract Scan Governance (v5.5.0.13)

AI Contract Scan la nang luc ho tro nhap lieu hop dong bang OCR + LLM extract, nhung chi duoc mo sau khi Contract Rule Engine da co model cau truc du de tiep nhan output da duoc duyet.

Quy tac bat buoc:

- `ai_contract_scan` la feature flag rieng, chi mo cho plan/phien ban da duoc phe duyet va phai duoc guard o ca UI va API.
- Giai doan 5.1 chi dung khung. Backend phai chan cung theo mac dinh neu Contract Rule Engine chua san sang, ke ca khi feature flag bi bat nham hoac bi bat co y.
- Dieu kien san sang bat buoc de AI Contract Scan duoc mo trong tuong lai la phai co day du dich den luu tru da duoc chuan hoa: `ContractVersion`, `ContractLineItem`, `ContractPenaltyRule`, `ContractStaffStandard`, `ContractShiftRequirement`, va `ContractChecklistRequirement`.
- Khi co yeu cau goi AI Contract Scan trong luc Contract Rule Engine chua hoan tat, he thong phai tra dung nguyen van thong bao: `AI Contract Scan chÆ°a kháº£ dá»¥ng cho Ä‘áº¿n khi Contract Rule Engine hoÃ n táº¥t.`
- Thu tu delivery bat buoc la `Contract Rule Engine -> AI Contract Scan`; neu chua co model cau truc cho `ContractVersion`, `LineItem`, `PenaltyRule`, `StaffStandard`, `ShiftRequirement`, `ChecklistRequirement` thi AI extract chi duoc xem la JSON tam, khong duoc coi la khac biet san pham da hoan chinh.
- Luong chuan bat buoc trong tuong lai: `Upload contract -> OCR/text extraction -> AI clause extraction -> confidence score -> admin review/edit -> approved clauses -> apply vao ContractVersion / LineItem / PenaltyRule / StaffStandard`.
- AI khong duoc tu active hop dong, khong duoc tu tao muc phat chinh thuc, va khong duoc bypass phe duyet cua admin.
- Moi output AI phai hien confidence score theo tung clause/field de admin quyet dinh duyet/sua/bo qua; khong duoc auto-approve khi confidence cao.
- `Approved clauses` la ranh gioi nghiep vu duy nhat duoc phep ghi vao contract rule model. Raw OCR text, prompt output, va normalized suggestion phai duoc luu tach lop de audit/review, khong overwrite truc tiep du lieu hop dong dang hieu luc.
- Giai doan 5.2 chua trien khai import hop dong that, chua OCR that, chua AI extract that, chua auto tao rule that. Chi ghi nhan flow tuong lai de dinh huong thiet ke va giu nguyen trang thai `chua kha dung`.
- Moi thao tac upload, re-run OCR, extract AI, edit field, approve clause, reject clause, va apply vao contract version phai ghi `AuditLog` day du kem actor, traceId, model/provider, confidence, va diff truoc/sau.
- Heavy tac vu OCR/LLM phai chay qua queue nang, co circuit breaker, sanitized error, quota/cost control, va khong block request lifecycle.
- Prompt/output AI phai duoc Zod-validate tai moi boundary; khong truyen PII khong can thiet; va moi repository write van phai di qua `db.forTenant(ctx.tenantId)`/RLS nhu cac flow hop dong khac.

### Penalty Engine V2 Governance (v5.5.0.11)

Penalty Engine V2 la buoc chuyen bat buoc de SCMD PRO tinh phat nha thau theo rule hop dong co cau truc, thay vi suy dien tu severity mac dinh hoac JSON policy khong du trace.

Quy tac bat buoc:

- `ContractPenaltyRule` la model SSOT cho rule phat, gom toi thieu `violationCode`, `penaltyUnit`, `amount`/`percentValue`, `graceCount`, `maxMonthlyPenalty`, `repeatEscalation`, `isActive`.
- Trong giai doan chuyen tiep, frontend contract duoc phep van ghi vao `penaltyPolicy.rules`, nhung backend phai dong bo cac dong nay sang `ContractPenaltyRule` sau moi lan create/update contract.
- Penalty engine phai match theo `violationCode`, khong duoc fallback ve severity-default penalty neu contract da khai bao rule cau truc.
- Cac `penaltyUnit` bat buoc ho tro gom `PER_OCCURRENCE`, `PER_HOUR`, `PER_GUARD`, `PERCENT_CONTRACT`.
- `graceCount` la so lan mien phat dau ky cho tung rule trong tung thang scope cua report.
- `maxMonthlyPenalty` la tran phat theo tung rule trong thang; engine phai cat phan vuot tran va ghi lai `capApplied`.
- `repeatEscalation` la multiplier tang muc phat theo lan lap lai cua cung rule trong cung thang; chi tiet escalation phai nam trong audit detail.
- Moi `PenaltyItem` duoc tao tu engine phai luu du truong audit: `violationId`, `penaltyRuleId`, `baseAmount`, `unit`, `quantity`, `graceApplied`, `capApplied`, `finalAmount`, `calculationDetail`, `contractVersionSnapshot`.
- `MonthlyAcceptanceReport` va revision cua no phai clone nguyen ven payload penalty audit; khong duoc tinh lai tu live rule sau khi snapshot da tao.

### Vendor Commander Shift Scheduler Governance (v5.5.0.10)

Shift Scheduler la workspace van hanh bat buoc cho `vendor-commander` de cat ca theo hop dong, gan guard vao chot/ca, va tao canh bao staffing truoc khi doi soat.

Quy tac bat buoc:

- Shift phai duoc sinh tu `ContractShiftRequirement` cua contract trong pham vi vendor/site/contract duoc giao; khong duoc cat ca ngoai scope.
- `vendor-commander` duoc phep gan va go guard trong `ShiftSchedule`, nhung khong duoc sua contract/SLA goc.
- Moi lan assign guard phai validate toi thieu: required count, overlap shift, vendor/site/contract scope, va staff standard co the kiem tra duoc tu `qualifications`, `licenseNumber`, `idNumber`, `idExpiry`.
- Neu guard khong dat tieu chuan critical thi he thong phai chan assign; neu chi thieu thong tin qualification mem thi he thong duoc phep canh bao.
- Khi shift da qua gio bat dau ma van thieu nguoi, he thong phai tao `ViolationEvent` voi `sourceType = SHIFT_SCHEDULE`, `violationType = SHIFT_UNDERSTAFFED`, `status = PENDING_REVIEW`.
- Commander UI phai uu tien workspace scheduler va contract read-only, khong hien flow authoring vendor/site/contract ngoai tham quyen.

### Contract UI Structured Authoring Governance (v5.5.0.9)

Contract Compliance UI phai cho phep Admin nhap cau hinh hop dong bang form va bang nghiep vu co cau truc, khong bat nguoi dung thao tac truc tiep voi JSON policy.

Quy tac bat buoc:

- `VendorContractManagement` phai co cac tab rieng cho `Tong quan`, `Don gia & So quan`, `Chot / Ca`, `Tieu chuan nhan su`, `Dieu khoan phat`, `Checklist / Noi quy`, `File hop dong`, va `Lich su version`.
- Admin phai nhap line item, shift requirement, staff standard, penalty rule, checklist requirement, contract file, va version note qua cac bang co cot ro rang; khong hien raw JSON o UI contract.
- Frontend van duoc serialize payload co cau truc vao `acceptancePolicy`, `evidencePolicy`, va `penaltyPolicy` de giu tuong thich API, nhung backend bat buoc dong bo sang model first-class `ContractVersion`, `ContractLineItem`, `ContractShiftRequirement`, `ContractStaffStandard`, va `ContractPenaltyRule` ngay trong flow create/update contract.
- `ContractShiftRequirement` la SSOT cho rule van hanh goc: chot nao, ca nao, bat dau/ket thuc luc nao, required headcount bao nhieu, va ngay nao trong tuan duoc ap dung. `ShiftSchedule` chi la artifact operational duoc generate ra tu rule nay.
- `ContractStaffStandard` la SSOT cho rule tieu chuan guard theo hop dong. Moi standard toi thieu phai co `standardCode`, `requiredQualifications`, `blockingLevel` (`BLOCK`/`WARN`) va `appliesToGuardPostId` neu chi ap dung cho tung chot.
- Khong mo rong them JSON input cho admin neu nghiep vu da co the bieu dien bang bang du lieu co cau truc.

### Tenant Upgrade Request UX Governance (v5.5.0.7)

Tenant Admin khi gui yeu cau nang cap PRO/MAX tu dashboard phai di qua mot luong nghiep vu thuc, khong duoc dung local noop state.

Quy tac bat buoc:

- `BillingTab` chi duoc goi handler nang cap da duoc inject tu dashboard shell.
- Handler nang cap phai goi `POST /api/tenant/upgrade-request` voi payload nghiep vu hop le.
- Sau khi gui thanh cong, frontend phai refetch `tenantInfo` de dong bo ngay `hasPendingUpgrade`.
- CTA nang cap phai chuyen ngay sang trang thai `DANG CHO PHE DUYET`, khong duoc doi user reload thu cong moi thay doi.
- Trang thai cho phe duyet la mot business state doc tu `GetMeUseCase`, khong duoc suy dien bang local UI flag.

### Vendor Commander Scope Governance (v5.5.0.8)

`vendor-commander` la actor van hanh bat buoc trong SCMD PRO cho luong nha thau nhap quan, cat ca va theo doi nghiep vu trong pham vi hop dong duoc giao.

Quy tac bat buoc:

- He thong phai co role `vendor-commander` va co the mo rong them `vendor-representative` cho dispute/doc bao cao.
- Moi tai khoan vendor actor phai co `assignedVendorId`; `assignedSiteId` va `assignedContractId` la scope bo sung neu tenant muon khoa hep hon.
- Scope vendor actor phai di xuyen suot JWT, `SecurityContext`, middleware va repository layer, khong duoc chi chan o frontend.
- `vendor-commander` chi duoc tao, xem, sua, xoa guard trong scope cua chinh minh; khong duoc sua hop dong, khong duoc finalize report, khong duoc resolve dispute.
- Danh sach guard, shift, patrol assignment, patrol route, incident, report, scorecard va dispute cua vendor actor phai duoc loc theo scope nghiep vu duoc giao.
- `Staff.assignedVendorId` la truong SSOT de rang buoc guard vao nha thau; `assignedSiteId` va `assignedContractId` la neo bo sung cho scope site/hop dong.
- Cac thao tac cap nhat/xoa staff phai duoc chan o ca use case va repository de tranh bypass scope khi thay doi tuong tac noi bo.

### Guard Mobile PWA Hardening & Native Wrapper Roadmap (v5.6.1.2)

W7 ghi nhan rui ro san pham: guard-facing experience hien dang dua tren PWA/mobile browser, chua co native app. Guard van phai thuc hien cac thao tac co tinh bang chung tai hien truong: QR/GPS check-in, checklist ca truc, chup anh, bao cao su co, xem task va dong bo khi mang yeu.

Hien trang ky thuat da xac nhan:

- Entry point guard la `/guard/app`, duoc route guard boi role `guard`.
- Patrol UI da co mobile-first thumb zone, QR/GPS flow, checklist, camera capture bang file input/camera browser va rung/beep feedback.
- Offline queue da co qua IndexedDB `sync_queue` va `SyncManager` cho `LOCATION`, `REPORT`, `INCIDENT`; anh patrol offline co co che luu base64 tam roi upload lai khi sync.
- Service worker sau W7.1 da duoc dang ky trong production va chi cache app shell/static asset cung origin; API mutation khong bi intercept, khong cache POST/PUT/DELETE.
- Truoc W7, installability PWA chua du ro vi thieu manifest/meta mobile trong shell; W7 da bo sung manifest/meta va W7.1 kich hoat service worker production.

Nguyen tac hardening truoc native app:

1. Khong trien khai React Native/Capacitor ngay trong MVP neu chua co telemetry ve tan suat loi camera/GPS/offline sync.
2. PWA phai toi thieu co manifest, mobile meta, portrait standalone, theme `#0D1324` va entry `/guard/app`.
3. Guard UI phai hien thi trang thai mang/GPS/queue ro rang, khong de guard nham tuong du lieu da gui khi con nam trong offline queue.
4. Moi action bang chung offline phai co idempotency/signature/timestamp va retry co gioi han; khong silent drop du lieu khi sync that bai.
5. Khong cache mutation API trong service worker. Neu sau nay them SW cache, chi cache app shell/static assets va GET read-only phu hop; POST/PUT/DELETE phai di qua network hoac offline queue co audit.
6. Gioi han PWA khong the xoa het: background GPS, camera reliability, permission persistence va OS-level push/background sync kem hon native. Cac gioi han nay phai duoc ghi trong release note va dao tao van hanh.

Roadmap sau MVP:

- Phase A: bo sung telemetry cho ty le GPS timeout, camera capture fail, sync retry/failed queue va thoi gian offline theo tenant/site.
- Phase B: mo rong app-shell caching co versioned cache + offline fallback rieng cho `/guard/app`, kem rollback/kill-switch; hien tai moi cache static/app shell, chua cache API.
- Phase C: spike Capacitor wrapper cho guard-facing flows neu telemetry cho thay PWA friction cao: QR/camera, foreground GPS, secure local storage, native permission prompts va push notification.
- Phase D: chi can React Native rieng neu can background location dai han, native task scheduling/offline DB phuc tap hoac MDM enterprise deployment.

### Phase 3 Vendor Commander Operating Model (v5.6.1.1)

Muc tieu cua Giai doan 3 la hoan thien persona `vendor-commander` thanh mot workspace van hanh doc lap cho Chi huy nha thau, du de team Product, Design va Engineering co the ban giao va trien khai ngay. Uu tien delivery duoc khoa theo thu tu:

- **Rat cao**: tach role `vendor-commander` thanh role doc lap, khong duoc dung chung permission bundle hay dashboard cua `supervisor`.
- **Cao**: tao workspace rieng cho Chi huy nha thau voi menu, widget canh bao va flow dieu huong theo tac vu hien truong.
- **Cao**: hoan thien nghiep vu cat ca theo hop dong, bao gom validation guard, trang thai du nguoi/thieu nguoi va canh bao rui ro tuan thu.

#### 1. Muc tieu nghiep vu va dinh vi persona

`vendor-commander` la nguoi dai dien phia nha thau de nhap quan, dieu phoi guard, theo doi thieu nguoi, xu ly vi pham van hanh va gui giai trinh tranh chap trong pham vi duoc giao. Role nay khong dai dien cho ben khach hang, khong co quyen thay doi "luat van hanh" cua hop dong, va khong duoc tham gia cac quyet dinh co tinh ket luan doi soat.

Phan tach trach nhiem bat buoc:

- `TENANT_ADMIN`/`SUPER_ADMIN`: tao tai khoan, gan scope, authoring contract, quyet dinh vi pham, finalize report.
- `SUPERVISOR`: dieu hanh noi bo phia khach hang/site, khong duoc coi la vendor actor.
- `VENDOR_COMMANDER`: quan ly guard cua nha thau, lap lich va cat ca theo pham vi vendor/site/contract duoc giao, theo doi su co/tuan tra/vi pham, gui giai trinh.
- `VENDOR_REPRESENTATIVE`: xem va gui dispute/doc giai trinh, nhung khong cat ca va khong quan ly guard.

#### 2. Pham vi quyen han va logic scope

Scope SSOT cua `vendor-commander` phai la:

`Tenant -> assignedVendorId -> assignedSiteId? -> assignedContractId?`

Rule phan quyen bat buoc:

- `assignedVendorId` la bat buoc khi tao tai khoan `vendor-commander`.
- `assignedSiteId` la tuy chon nhung neu da gan thi moi danh sach, chi tiet, aggregate va mutation deu phai bi khoa trong site do.
- `assignedContractId` la tuy chon nhung neu da gan thi moi thao tac scheduling, patrol, incident, dispute va report phai tiep tuc bi khoa theo contract do.
- Mot Chi huy co the duoc gan nhieu site trong cung mot vendor, nhung khong duoc cross-vendor. Neu can nhieu site thi phai dung bang mapping scope thay vi tao role rong khong gioi han.
- Admin khong duoc gan contract khong thuoc `assignedVendorId`, va khong duoc gan site nam ngoai contract neu contract da duoc chon.

Quyen duoc phep:

- Tao guard thuoc nha thau cua minh.
- Xem/sua guard trong pham vi duoc giao.
- Sinh lich ca, gan guard vao ca, go guard khoi ca trong scope.
- Xem ca thieu nguoi, guard chua check-in, tuan tra chua hoan thanh, su co va vi pham trong scope.
- Gui `dispute-explanation`/giai trinh cho vi pham hoac tranh chap dang mo.

Quyen khong duoc phep:

- Khong sua `Contract`, `ContractVersion`, `ContractPenaltyRule`, `ContractStaffStandard`.
- Khong xoa `ViolationEvent` hoac chuyen trang thai vi pham sang `WAIVED`/`PENALIZED`/`CLOSED`.
- Khong tu resolve dispute.
- Khong finalize `MonthlyAcceptanceReport`.
- Khong truy cap du lieu ngoai scope bang UI, API, bulk export hay direct id lookup.

#### 3. Defense-in-depth: UI guard + backend guard

Frontend chi la lop huong dan hanh vi, khong phai hang rao bao mat duy nhat. Bat buoc co du ca 4 lop:

1. **Feature guard**: chi tenant co feature `vendor_commander` moi hien workspace.
2. **Role guard**: router tach rieng dashboard `vendor-commander`, khong render dashboard `tenant-admin`/`supervisor`.
3. **Use-case authorization**: moi use case create/list/update/delete lien quan guard, shift, patrol, incident, violation, dispute phai authorize role + permission + scope.
4. **Repository/RLS guard**: query va mutation phai di qua `db.forTenant(ctx.tenantId)`/`db.withTenant(ctx.tenantId)` va filter `assignedVendorId`/`assignedSiteId`/`assignedContractId`; neu input vuot scope phai fail-closed.

Guardrail backend cu the:

- Route list khong nhan vendor/site/contract tu client de mo rong scope hon `SecurityContext`.
- Route detail theo `id` phai re-check record scope sau khi load; khong tin rang record ton tai la hop le.
- Mutation create/update/delete guard va assign shift phai goi `assertVendorActorValueInScope(...)` truoc khi ghi DB.
- Cache key phai kem `tenantId + role + assignedVendorId + assignedSiteId + assignedContractId` de tranh leak cross-scope.
- Log audit phai ghi actor role, actorId, vendorId/siteId/contractId scope, traceId va action.

#### 4. Mo hinh du lieu toi thieu can chot trong Giai doan 3

Quan he du lieu toi thieu:

- `User`/`Staff`: chua `role`, `assignedVendorId`, `assignedSiteId`, `assignedContractId`, `status`, qualification metadata.
- `Vendor`: nha thau SSOT ma Chi huy thuoc ve.
- `Site`: dia diem van hanh; co the thuoc mot vendor chu dao nhung van phai duoc kiem tra bang contract khi gan scope.
- `Contract`/`ContractVersion`: neo pham vi dich vu, so nguoi, chot, ca, tieu chuan va penalty.
- `Guard` (`Staff` role = `guard`): guard thuoc vendor, co the co site/contract scope hep hon.
- `ShiftSchedule`: ca truc sinh tu `ContractShiftRequirement`/`ContractLineItem`.
- `ShiftAssignment`: ban ghi cat ca guard vao tung `ShiftSchedule`.
- `PatrolAssignment`/`PatrolSession`: du lieu tuan tra de Chi huy theo doi muc do hoan thanh.
- `Incident`: su co trong pham vi vendor/site/contract.
- `ViolationEvent`: vi pham doi soat va vi pham van hanh.
- `ViolationDispute` hoac `dispute-explanation`: ho so giai trinh/phan hoi tu phia nha thau.

De xuat mo rong toi thieu de ho tro nhieu site cho mot Chi huy:

- Them bang `VendorActorScope` hoac `UserVendorScope` gom `userId`, `vendorId`, `siteId?`, `contractId?`, `isPrimary`, `status`.
- JWT van giu `assignedVendorId` nhu primary scope de compatibility, nhung API list/get duoc resolve tap scope tu bang mapping nay.
- Neu chua kip mo rong schema, phase 3A cho phep 1 vendor + 1 site + 1 contract / 1 tai khoan; phase 3B moi mo rong multi-site cung vendor.

#### 5. Rule khi Admin tao tai khoan Chi huy nha thau

Input toi thieu:

- `role = vendor-commander`
- `assignedVendorId` bat buoc
- `assignedSiteId` tuy chon
- `assignedContractId` tuy chon
- thong tin danh tinh, email/sdt, trang thai tai khoan

Validation bat buoc:

- Vendor phai ton tai, thuoc cung tenant va dang `ACTIVE` hoac it nhat khong `TERMINATED`.
- Neu co `assignedSiteId`, site phai thuoc tenant va nam trong danh muc site ma vendor duoc phep phuc vu.
- Neu co `assignedContractId`, contract phai thuoc tenant, thuoc dung vendor, va neu contract co `siteId` thi phai khop `assignedSiteId`.
- Khong cho tao `vendor-commander` ma thieu `assignedVendorId`.
- Khong cho admin gan role `vendor-commander` nhung de trong feature flag `vendor_commander = false` ma khong co canh bao product.
- Moi lan tao hoac sua scope cua Chi huy phai ghi `AuditLog` va invalidate token/session cache.

#### 6. Rule khi Chi huy tao guard

- Chi huy chi duoc tao `Staff.role = guard`.
- `assignedVendorId` cua guard moi phai mac dinh = `context.assignedVendorId`; client khong duoc override sang vendor khac.
- Neu Chi huy bi khoa site/contract thi guard moi phai nam trong cung scope hoac hep hon.
- Khong duoc tao guard dang `ACTIVE` neu thieu truong bat buoc nghiep vu nhu danh tinh, so dien thoai, CCCD/ma dinh danh neu tenant dang bat quy tac nay.
- Neu contract co `ContractStaffStandard` bat buoc, he thong duoc phep tao guard nhung danh dau `NOT_QUALIFIED` cho den khi bo sung du ho so; hoac block tao ngay neu tieu chuan la critical.

#### 7. Workspace rieng cho Chi huy nha thau

Khong dung chung dashboard voi admin. Dieu huong de xuat:

- `Tong quan dieu phoi`
- `Danh sach guard`
- `Lich ca`
- `Cat ca`
- `Ca thieu nguoi`
- `Guard chua check-in`
- `Tuan tra chua hoan thanh`
- `Vi pham dang ghi nhan`
- `Giai trinh tranh chap`

Cau truc man hinh:

- **Header scope bar**: Vendor, Site, Contract dang xem; neu duoc gan nhieu scope thi co scope switcher nhung chi trong tap da duoc admin cap.
- **Canh bao uu tien**: shortage, missed patrol, open incident, violation disputed, guard expiring qualification.
- **Work queue trung tam**: danh sach tac vu can xu ly hom nay theo muc do khan cap.
- **Panel chi tiet ben phai**: hien quick detail va action ma khong bat user mo qua nhieu modal.

Bo loc chung bat buoc:

- Date / ca / site / contract / guard post / trang thai / muc do uu tien.
- Bo loc phai tu dong gioi han theo scope; khong hien option ngoai pham vi.

Trang thai can hien thi ro:

- `DU_NGUOI`
- `THIEU_NGUOI`
- `CHUA_CHECK_IN`
- `GUARD_KHONG_DAT_CHUAN`
- `TUAN_TRA_CHUA_HOAN_THANH`
- `VI_PHAM_DANG_GHI_NHAN`
- `TRANH_CHAP_CHO_DUYET`

Dieu huong tac vu:

- Tu `Tong quan dieu phoi` -> click widget shortage di thang sang danh sach `Ca thieu nguoi` da ap filter.
- Tu `Ca thieu nguoi` -> mo drawer `Cat ca` cho dung shift dang thieu.
- Tu `Guard chua check-in` -> nhay sang chi tiet ca va danh sach guard duoc gan.
- Tu `Vi pham dang ghi nhan` -> mo chi tiet vi pham + timeline + nut `Gui giai trinh` neu con han.
- Tu `Tuan tra chua hoan thanh` -> mo route/session lien quan de xem checkpoint bi bo lo.

Tac dong UI/UX bat buoc:

- Mobile-first, touch target >= 48px, khong dung italic.
- Mau canh bao uu tien theo Navy Theme, trong do shortage/violation dung alert tone ro rang nhung khong xung dot voi deep navy.
- Dashboard phai toi uu cho thao tac nhanh 1 tay: widget quan trong nam o 1/3 duoi tren mobile.
- Contract va penalty rule chi hien read-only card/timeline, khong render form edit cho Chi huy.

#### 8. Nghiep vu cat ca theo hop dong

Luong chuan:

`Mo lich ca -> Chon site -> Chon contract -> Chon ngay/ca/chot -> Hien required headcount theo contract -> Gan guard vao ca -> Validate -> Luu -> Danh gia trang thai van hanh ca`

Input business bat buoc khi cat ca:

- `siteId`
- `contractId`
- `date`
- `shiftType`/`startTime`/`endTime`
- `guardPostId`/`positionName`
- danh sach guard duoc gan

Nguon required headcount:

- `required headcount` cua van hanh phai doc tu `ContractShiftRequirement.requiredStaffCount` theo `contractVersionId + siteId + guardPostId + shiftName + ngay-ap-dung`.
- `ContractLineItem.requiredStaffCount` duoc phep ton tai de tinh don gia va snapshot billing, nhung khong duoc xem la nguon luat van hanh goc neu `ContractShiftRequirement` da ton tai.
- Scheduler phai generate `ShiftSchedule` tu `ContractShiftRequirement`; metadata cua schedule phai tro ve `shiftRequirementId` de audit.
- Khong cho phep Chi huy sua required headcount goc cua contract; neu muon override tam thoi phai di qua co che exception co audit va phe duyet client-side trong phase sau.

Hanh vi UI man hinh cat ca:

- Cot trai: danh sach guard available, co bo loc theo trang thai, qualification, da co ca/chua.
- O giua: lich/board theo chot va khung gio.
- Cot phai: panel `Chi tiet ca` hien required, assigned, thieu, canh bao overlap, canh bao qualification, ghi chu.
- Ho tro drag-drop va fallback action `Gan vao ca` cho desktop/mobile accessibility.
- Nut `Luu nhap` va `Chot phan cong tam thoi`; phase nay chua duoc coi la finalize report hay finalize contract.

#### 9. Dieu kien guard "dat chuan" de duoc nhan ca

Guard dat chuan khi dong thoi thoa cac dieu kien sau:

- `status = ACTIVE`.
- Thuoc dung `assignedVendorId` trong scope cua Chi huy va phu hop vendor cua contract.
- Neu guard bi khoa `assignedSiteId` hoac `assignedContractId` thi phai khop ca dang phan cong.
- Khong bi `locked`, `suspended`, `terminated`, `offboarded`.
- Khong trung ca voi `ShiftAssignment` khac bi overlap thoi gian.
- Khong vuot gioi han phan cong lien tiep/so gio toi da neu tenant da bat quy tac labor/compliance.
- Dat cac tieu chuan critical tu `ContractStaffStandard` neu ton tai: chung chi, license, idNumber, idExpiry, training, ky nang, suc khoe hoac requirement tuong duong.
- `blockingLevel = BLOCK` phai chan assign guard vao `ShiftSchedule`; `blockingLevel = WARN` thi cho phep assign nhung bat buoc tra canh bao co cau truc cho UI va audit metadata.
- Neu he thong quan ly GPS/site eligibility thi guard phai nam trong danh sach duoc phep lam tai site do.

Phan loai validation:

- **Hard block**: sai vendor, sai site scope, sai contract scope, guard inactive/locked, overlap shift, thieu chung chi critical, document het han critical.
- **Soft warning**: sap het han giay to, thieu qualification khong critical, chua co check-in gan day, diem tuan thu thap, da co vi pham gan day.

Output validation tren `ShiftAssignment.metadata` nen snapshot:

- `qualificationStatus = PASS | WARN | FAIL`
- `warningCodes[]`
- `blockingCodes[]`
- `validatedAt`
- `validatedBy`

#### 10. Trang thai van hanh cua ca sau khi cat ca

Sau moi lan luu phan cong, he thong phai tinh lai trang thai ca thay vi chi luu danh sach nguoi.

Trang thai toi thieu:

- `UNASSIGNED`: chua co ai duoc gan.
- `PARTIALLY_ASSIGNED`: da co nguoi nhung chua du required count.
- `FULLY_ASSIGNED`: du nguoi va tat ca guard deu PASS/WARN.
- `ASSIGNED_WITH_RISK`: du nguoi nhung co it nhat mot guard WARN hoac chua check-in.
- `NON_COMPLIANT`: co guard FAIL, overlap, sai scope hoac vi pham critical.
- `IN_PROGRESS`: da den gio bat dau ca.
- `UNDERSTAFFED_LIVE`: qua gio bat dau ma so guard check-in hop le < required count.
- `COMPLETED`: het ca va da co du attendance/patrol evidence toi thieu.

Rule canh bao bat buoc:

- Neu assigned < required -> badge `THIEU_NGUOI`.
- Neu co guard FAIL -> badge `GUARD_KHONG_DAT_CHUAN` va khong cho save final assignment.
- Neu qua gio bat dau ma chua du nguoi -> sinh `ViolationEvent` `SHIFT_UNDERSTAFFED` voi `status = PENDING_REVIEW`.
- Neu du nguoi nhung co nguoi chua check-in trong nguong T+x phut -> badge `CHUA_CHECK_IN`, khong auto coi la dat ca.
- Neu patrol route bat buoc cua ca chua hoan thanh -> badge `TUAN_TRA_CHUA_HOAN_THANH`.

#### 11. Rule khi gui giai trinh tranh chap

- Chi huy chi duoc gui giai trinh cho `ViolationEvent`/`ViolationDispute` trong scope cua minh.
- Chi duoc gui khi vi pham o trang thai cho phep tranh chap, vi du `PENDING_REVIEW`, `CONFIRMED` hoac `DISPUTED` theo policy tenant.
- Khong duoc sua ket luan cuoi cung, chi duoc tao them `explanation`/evidence/vendor note.
- Phai co `reason` toi thieu, timestamp, actor, va neu co file dinh kem thi file cung phai tenant-scoped.
- Moi lan submit phai tao audit trail va timeline event de client-side reviewer thay duoc lich su phan hoi.
- Neu qua han tranh chap thi API tra loi fail-closed, UI hien read-only ly do het han.

#### 12. Danh sach rule kiem tra nghiep vu theo tung thao tac

**Khi tao role `vendor-commander`:**

- Role phai ton tai trong enum va permission map.
- Feature `vendor_commander` phai duoc resolve bat cho tenant.
- `assignedVendorId` bat buoc.
- `assignedSiteId`/`assignedContractId` phai hop le theo quan he vendor-contract-site.

**Khi gan pham vi:**

- Khong cross-tenant.
- Khong cross-vendor.
- Contract inactive van co the duoc xem lich su, nhung khong duoc dung de tao shift moi neu policy tenant cam.
- Neu user dang co ca/patrol dang mo o scope cu, can co canh bao operational truoc khi doi scope.

**Khi Chi huy tao guard:**

- Chi tao role `guard`.
- Guard thuoc dung vendor.
- Du lieu guard duoc sanitize, khong tra password hash/token version.
- Neu tenant bat mandatory standards thi danh gia qualification ngay khi tao.

**Khi cat ca:**

- Shift phai sinh tu contract trong scope.
- Required count phai doc tu SSOT contract.
- Moi guard duoc validate availability + qualification + scope.
- Mot guard khong duoc xuat hien 2 lan trong cung shift.
- He thong phai tinh trang thai ca va canh bao sau khi luu.

**Khi gui giai trinh:**

- Vi pham/dispute phai nam trong scope.
- Trang thai phai cho phep phan hoi.
- Phai co noi dung giai trinh toi thieu.
- Khong duoc thay doi resolution cua client-side.

#### 13. Acceptance criteria de ban giao

**A. Role `vendor-commander` - Muc uu tien rat cao**

- Admin tao duoc user role `vendor-commander` voi `assignedVendorId` bat buoc.
- He thong tu choi tao neu vendor/site/contract scope khong hop le.
- JWT va `SecurityContext` mang du scope vendor/site/contract.
- API list/detail/mutation tra ve 403/404 sanitized khi user co gang truy cap record ngoai scope.
- `vendor-commander` khong co permission `report:finalize`, `violation:resolve`, contract write.

**B. Phan quyen theo vendor/site/contract - Muc uu tien rat cao**

- Khi user bi khoa vao 1 vendor, danh sach guard/shift/patrol/incident/violation/report chi con du lieu cua vendor do.
- Khi user bi khoa them vao 1 site/contract, bo loc va ket qua tu dong hep scope.
- Truy cap truc tiep bang ID ngoai scope bi chan o backend du client co thay doi request.
- Cache, export va aggregate widget khong leak so lieu ngoai scope.

**C. Dashboard rieng cho Chi huy - Muc uu tien cao**

- Dang nhap bang role `vendor-commander` se vao workspace rieng, khong vao dashboard admin.
- Workspace co it nhat cac muc: guard, lich ca, cat ca, ca thieu nguoi, guard chua check-in, tuan tra chua hoan thanh, vi pham dang ghi nhan, giai trinh tranh chap.
- Moi widget/tac vu dieu huong den danh sach da ap scope va filter lien quan.
- Contract/policy hien read-only, khong co nut edit authoring.

**D. Man hinh cat ca - Muc uu tien cao**

- Chi huy mo lich ca theo site/contract trong scope va thay required headcount theo contract.
- Co the gan/go guard bang drag-drop hoac action button.
- Save se bi chan neu co guard FAIL hoac guard ngoai scope.
- Save thanh cong se cap nhat so assigned, shortage status va risk badge.

**E. Canh bao thieu nguoi - Muc uu tien cao**

- Ca chua du required count hien badge `THIEU_NGUOI` ngay tren lich va danh sach cong viec.
- Qua gio bat dau ma van thieu nguoi thi he thong tao vi pham `SHIFT_UNDERSTAFFED` `PENDING_REVIEW`.
- Dashboard tong quan dem duoc so ca thieu nguoi hom nay trong scope cua Chi huy.

**F. Kiem tra guard dat chuan - Muc uu tien cao**

- Guard inactive/locked/overlap/sai vendor bi block assign.
- Guard thieu tieu chuan non-critical hien warning nhung van luu neu policy cho phep.
- Chi tiet ly do PASS/WARN/FAIL hien trong panel assignment va duoc snapshot vao metadata.

**G. Danh sach vi pham va giai trinh tranh chap - Muc uu tien cao**

- Chi huy xem duoc vi pham trong scope va phan biet `PENDING_REVIEW`, `DISPUTED`, `PENALIZED`, `CLOSED`.
- Nut `Gui giai trinh` chi hien khi status cho phep va trong han.
- Submit giai trinh tao timeline/audit va khong thay doi resolution cuoi cung.
- Chi huy khong bao gio thay duoc action `resolve dispute` hoac `finalize report`.

#### 14. Edge cases bat buoc test

- Mot Chi huy duoc gan nhieu site cung mot vendor: chi xem du lieu trong tap site duoc cap, khong nho scope sang vendor khac.
- Guard thuoc dung vendor nhung thieu chung chi critical: khong duoc nhan ca.
- Ca da du nguoi nhung 1 guard chua check-in: trang thai la `ASSIGNED_WITH_RISK`, khong coi la van hanh an toan.
- Chi huy co gang goi API de doc `incidentId` ngoai scope: backend tra loi sanitized forbidden/not found.
- Admin doi scope cua Chi huy khi da co shift assignment sap toi: he thong canh bao anh huong va ghi audit.
- Contract het hieu luc nhung ca da tao tu truoc van ton tai: Chi huy duoc xem va xu ly van hanh ton dong, nhung khong duoc sinh shift moi neu policy cam.
- Dispute da qua han: UI khoa nut gui, API tu choi submit.

#### 15. RUI RO va de xuat trien khai thuc te

Rui ro chinh:

- Schema scope hien tai moi ho tro 1 `assignedSiteId` + 1 `assignedContractId`, chua du cho bai toan 1 Chi huy nhieu site cung vendor.
- Neu chi chan o UI ma khong chan o repository/use case se bi bypass bang API.
- Dashboard admin hien tai neu tai su dung qua muc se gay roi quyen va nham pham vi.
- Logic qualification neu chua chuan hoa `ContractStaffStandard` se dan den rule PASS/WARN/FAIL khong nhat quan.

De xuat delivery thuc te:

- **Phase 3A - Security First**: khoa role, permission, backend scope guard, admin create-flow, workspace route rieng.
- **Phase 3B - Scheduler First-Class**: man hinh lich ca, assign/remove guard, status du nguoi/thieu nguoi, warning qualification.
- **Phase 3C - Operational Follow-up**: widget guard chua check-in, patrol chua hoan thanh, violation feed, dispute explanation.
- **Phase 3D - Multi-scope & Optimization**: bang mapping nhieu site/contract cho 1 Chi huy, preload aggregate, notification, mobile optimization.

Checklist ky thuat toi thieu truoc release:

- Co Zod schema cho create/update commander scope, shift assignment, dispute explanation.
- Co RBAC middleware + use case auth + repository scope assert.
- Co tenant RLS test cho list/detail/mutation ngoai scope.
- Co audit log cho create commander, re-scope, create guard, assign shift, remove shift assignment, submit dispute explanation.
- Co UAT script theo 8 edge cases o tren.

### Monthly Acceptance Snapshot Governance (v5.5.0.5)

`MonthlyAcceptanceReport` phai duoc xem la mot snapshot nghiep vu bat bien, khong phai mot report doc live lai du lieu sau khi da chot.

Chuan export nghiem thu dung cho hop van hanh/doi soat phai du du cac nhom noi dung sau:

- Thong tin khach hang.
- Thong tin nha thau.
- Hop dong ap dung.
- Site ap dung.
- Ky bao cao.
- Tong so ca theo hop dong.
- Tong so ca thuc te dat.
- Ca thieu nguoi / di muon / sai vi tri.
- Tong tuyen tuan tra bat buoc.
- Ty le hoan thanh tuan tra.
- Danh sach su co.
- Ty le xu ly dung SLA.
- Danh sach vi pham da xac nhan.
- Danh sach vi pham dang tranh chap.
- Chi tiet tinh phat.
- Diem vendor scorecard.
- Phu luc bang chung.
- Ket luan nghiem thu.
- Nguoi lap / nguoi duyet / ngay duyet.

Du lieu export phai uu tien doc tu snapshot cua `MonthlyAcceptanceReport`; chi cac truong metadata tenant-level duoc phep bo sung tu system scope de hien thi ten/nguoi dai dien/thong tin lien he khach hang.

Snapshot toi thieu cua report gom:

- `contractSnapshot`
- `vendorSnapshot`
- `siteSnapshot`
- `slaPolicySnapshot`
- `penaltyPolicySnapshot`
- `scoreFormulaVersion`
- `violationSnapshots`
- `evidenceSnapshots`
- `penaltyCalculationDetails`
- `generatedDataHash`

Quy tac bat buoc:

- Khi report o `DRAFT`, he thong duoc phep regenerate snapshot cung scope.
- Khi report da `FINALIZED`, khong duoc cap nhat truc tiep report goc.
- Neu can thay doi sau finalize, he thong phai tao `Revision Draft` moi.
- Khi revision moi duoc finalize, report finalized truoc do phai chuyen `SUPERSEDED`.
- Export PDF/Excel phai dua tren snapshot cua chinh report/revision dang duoc xem, khong doc lai du lieu live.

Lifecycle governance:

`FINALIZED -> Create Revision -> DRAFT -> Review -> FINALIZED -> previous FINALIZED = SUPERSEDED`

### Violation Lifecycle Policy (v5.5.0.3)

`ViolationEvent` phai di theo mot lifecycle doi soat duy nhat:

- `PENDING_REVIEW`: moi ghi nhan, chua duoc tinh phat va chua dua vao score penalty.
- `CONFIRMED`: da duoc client-side review va duoc tinh vao discipline score.
- `DISPUTED`: nha thau dang tranh chap, tam treo tac dong score/phat cho den khi co ket luan.
- `WAIVED`: duoc mien tru, khong tinh score va khong tinh phat.
- `PENALIZED`: da ket luan co phat, duoc tinh score va sinh `PenaltyItem`.
- `CLOSED`: ho so vi pham da dong sau khi da duoc xu ly nghiep vu.

Guardrail bat buoc:

- Khong duoc tao moi `ViolationEvent` voi `OPEN` hoac `PENDING`.
- Legacy data `OPEN` / `PENDING` phai duoc backfill ve `PENDING_REVIEW`.
- `VendorScorecard` va `MonthlyAcceptanceReport` khong duoc coi `PENDING_REVIEW` hoac `DISPUTED` la vi pham da xac nhan.
- `PenaltyItem` chi duoc sinh tu violation da o trang thai `PENALIZED`.

### Report Artifact Storage Policy (v5.5.0.1)

Monthly Acceptance Report artifact pháº£i tÃ¡ch binary artifact ra khá»i business database:

- PostgreSQL chá»‰ lÆ°u metadata artifact, khÃ´ng lÆ°u ná»™i dung PDF/Excel dáº¡ng Base64 trong DB á»Ÿ production.
- Storage artifact chuáº©n pháº£i Ä‘i qua provider tháº­t (`S3-compatible`/`R2`) hoáº·c storage subsystem Ä‘Æ°á»£c cáº¥u hÃ¬nh táº­p trung.
- Metadata report artifact chuáº©n hoÃ¡ gá»“m: `storageKey`, `fileName`, `fileSize`, `mimeType`, `checksum`, `generatedAt`, `generatedBy`, `reportId`.
- Download artifact pháº£i Ä‘i qua tenant-scoped endpoint Ä‘á»ƒ giá»¯ RLS/RBAC vÃ  audit trail.
- Dev/Desktop Ä‘Æ°á»£c phÃ©p fallback local filesystem Ä‘á»ƒ test flow export, nhÆ°ng production pháº£i fail-closed náº¿u chÆ°a cÃ³ storage provider.

### Dispute Governance Policy (v5.5.0.2)

`ViolationDispute` pháº£i tÃ¡ch rÃµ quyá»n vendor-side vÃ  client-side:

- `vendor:dispute:submit`: chá»‰ dÃ¹ng cho vendor-side persona khi gá»­i khiáº¿u náº¡i.
- `vendor:dispute:view`: dÃ¹ng Ä‘á»ƒ xem tranh cháº¥p trong pháº¡m vi há»£p Ä‘á»“ng Ä‘Æ°á»£c phÃ©p truy cáº­p.
- `violation:review`: dÃ¹ng cho phÃ­a client Ä‘á»ƒ xem vÃ  háº­u kiá»ƒm tranh cháº¥p/vi pháº¡m.
- `violation:resolve`: dÃ¹ng cho phÃ­a client Ä‘á»ƒ ra quyáº¿t Ä‘á»‹nh `CONFIRMED` / `WAIVED` / `PENALIZED`.
- `report:finalize`: dÃ¹ng cho phÃ­a client Ä‘á»ƒ chá»‘t `MonthlyAcceptanceReport`.

Guardrail báº¯t buá»™c:

- Vendor khÃ´ng Ä‘Æ°á»£c tá»± resolve dispute cá»§a chÃ­nh há».
- `resolve dispute` vÃ  `finalize report` pháº£i Ä‘Æ°á»£c cháº·n báº±ng cáº£ RBAC route vÃ  use-case authorization guard.
- Náº¿u há»‡ thá»‘ng chÆ°a cÃ³ persona `Vendor Representative`, khÃ´ng Ä‘Æ°á»£c tÃ¡i sá»­ dá»¥ng quyá»n client-side hiá»‡n cÃ³ Ä‘á»ƒ giáº£ láº­p vendor-side dispute submit.

### Contract Compliance Engine Guardrail (v5.3.0.2)

SCMD Pro lÃ  ná»n táº£ng giÃ¡m sÃ¡t vÃ  Ä‘á»‘i soÃ¡t cháº¥t lÆ°á»£ng dá»‹ch vá»¥ báº£o vá»‡ thuÃª ngoÃ i, giÃºp doanh nghiá»‡p kiá»ƒm soÃ¡t ca trá»±c, tuáº§n tra, sá»± cá»‘ vÃ  má»©c Ä‘á»™ tuÃ¢n thá»§ há»£p Ä‘á»“ng báº±ng dá»¯ liá»‡u thá»±c táº¿. Há»‡ thá»‘ng khÃ´ng Ä‘á»‹nh vá»‹ lÃ  HRM/ERP cho cÃ´ng ty báº£o vá»‡; cÃ¡c nÄƒng lá»±c nhÃ¢n sá»± chá»‰ Ä‘Æ°á»£c xÃ¢y dá»±ng khi phá»¥c vá»¥ trá»±c tiáº¿p cho kiá»ƒm soÃ¡t váº­n hÃ nh, SLA, há»£p Ä‘á»“ng vÃ  báº±ng chá»©ng dá»¯ liá»‡u.

SCMD Pro pháº£i Ä‘Æ°á»£c phÃ¡t triá»ƒn nhÆ° má»™t **Contract Compliance Engine**:

```text
Há»£p Ä‘á»“ng quy Ä‘á»‹nh gÃ¬
â†’ Thá»±c táº¿ báº£o vá»‡ lÃ m gÃ¬
â†’ Sai lá»‡ch á»Ÿ Ä‘Ã¢u
â†’ Báº±ng chá»©ng lÃ  gÃ¬
â†’ NhÃ  tháº§u bá»‹ Ä‘Ã¡nh giÃ¡/pháº¡t/nghiá»‡m thu tháº¿ nÃ o
```

Má»i Ä‘á» xuáº¥t nÃ¢ng cáº¥p pháº£i Ä‘Æ°á»£c Ä‘Ã¡nh giÃ¡ theo bá»‘n trá»¥c sáº£n pháº©m:

- GiÃ¡m sÃ¡t báº£o vá»‡ thuÃª ngoÃ i.
- Kiá»ƒm soÃ¡t ca trá»±c, tuáº§n tra vÃ  sá»± cá»‘.
- Äá»‘i soÃ¡t SLA, há»£p Ä‘á»“ng vÃ  cháº¥t lÆ°á»£ng dá»‹ch vá»¥.
- Táº¡o báº±ng chá»©ng dá»¯ liá»‡u cho giÃ¡m Ä‘á»‘c an ninh, HR vÃ  ban quáº£n lÃ½.

Náº¿u má»™t Ä‘á» xuáº¥t khÃ´ng cá»§ng cá»‘ Ã­t nháº¥t má»™t trong bá»‘n trá»¥c trÃªn, Ä‘á» xuáº¥t Ä‘Ã³ pháº£i Ä‘Æ°á»£c xem lÃ  lá»‡ch Ä‘á»‹nh vá»‹ sáº£n pháº©m vÃ  cáº§n CTO review trÆ°á»›c khi Ä‘Æ°a vÃ o roadmap.

### Unified Business Backbone (v5.3.0.2)

Bá»‘n phase roadmap khÃ´ng pháº£i bá»‘n nhÃ³m tÃ­nh nÄƒng rá»i. ChÃºng lÃ  má»™t chuá»—i nghiá»‡p vá»¥ thá»‘ng nháº¥t:

- **V.5.2.0 - Khai bÃ¡o ná»n táº£ng Ä‘á»‘i soÃ¡t:** `Vendor â†’ Contract â†’ Site â†’ GuardPost â†’ SLA Rule`.
- **V.5.3.0 - Thu tháº­p dá»¯ liá»‡u thá»±c táº¿:** `Shift â†’ PatrolRoute â†’ PatrolSession â†’ Checkpoint Scan â†’ Patrol Compliance`.
- **V.5.4.0 - Quáº£n lÃ½ sá»± cá»‘ cÃ³ SLA vÃ  báº±ng chá»©ng:** `Incident â†’ SLA Timer â†’ Evidence Chain â†’ Escalation â†’ Closure Approval`.
- **V.5.5.0 - Äá»‘i soÃ¡t thÆ°Æ¡ng máº¡i:** `ViolationEvent â†’ VendorScorecard â†’ Monthly Acceptance Report â†’ Penalty / Approval`.

Má»i dá»¯ liá»‡u nghiá»‡p vá»¥ má»›i pháº£i bÃ¡m trá»¥c:

```text
Tenant
â†’ Vendor
â†’ Contract
â†’ Site
â†’ GuardPost
â†’ Shift Requirement
â†’ Vendor Guard Assignment
â†’ Attendance / Shift Coverage
â†’ PatrolRoute / PatrolSession
â†’ Incident / Evidence
â†’ ViolationEvent
â†’ VendorScorecard
â†’ MonthlyAcceptanceReport
```

KhÃ´ng Ä‘Æ°á»£c táº¡o luá»“ng rá»i kiá»ƒu `Staff â†’ Attendance â†’ Report` náº¿u luá»“ng Ä‘Ã³ khÃ´ng liÃªn káº¿t Ä‘Æ°á»£c vá»›i `Vendor`, `Contract`, `Site` hoáº·c `SLA`.

### Role & Feature Boundary (v5.3.0.2)

Staff/Guard trong SCMD Pro chá»‰ lÃ  nhÃ¢n sá»± báº£o vá»‡ do nhÃ  tháº§u bá»‘ trÃ­ Ä‘á»ƒ thá»±c hiá»‡n há»£p Ä‘á»“ng táº¡i site cá»§a khÃ¡ch hÃ ng. KhÃ´ng Æ°u tiÃªn lÆ°Æ¡ng báº£o vá»‡, CV báº£o vá»‡, Ä‘Ã o táº¡o ná»™i bá»™ cÃ´ng ty báº£o vá»‡, KPI cÃ¡ nhÃ¢n kiá»ƒu HRM, ERP/káº¿ toÃ¡n/kho/mua hÃ ng.

CÃ¡c vai trÃ² nghiá»‡p vá»¥ pháº£i Ä‘Æ°á»£c hiá»ƒu theo má»¥c tiÃªu sau:

- **Security Director:** xem tá»•ng quan rá»§i ro, SLA, nhÃ  tháº§u vÃ  sá»± cá»‘ lá»›n.
- **HR/Admin Manager:** Ä‘á»‘i soÃ¡t Ä‘á»§ ngÆ°á»i, Ä‘á»§ ca, nghiá»‡m thu vÃ  pháº¡t há»£p Ä‘á»“ng.
- **Site Supervisor:** xá»­ lÃ½ ca trá»±c, tuáº§n tra, sá»± cá»‘ vÃ  ngoáº¡i lá»‡ táº¡i site.
- **Vendor Representative:** xem vi pháº¡m, pháº£n há»“i/dispute vÃ  cung cáº¥p giáº£i trÃ¬nh.
- **Guard:** check-in, tuáº§n tra, bÃ¡o sá»± cá»‘ vÃ  gá»­i báº±ng chá»©ng.
- **Super Admin:** quáº£n trá»‹ tenant, plan vÃ  há»‡ thá»‘ng.

TÃ­nh nÄƒng Vendor SLA thuá»™c nhÃ³m PRO/MAX. Khi thÃªm tÃ­nh nÄƒng má»›i pháº£i xÃ¡c Ä‘á»‹nh plan/feature flag trÆ°á»›c khi code.

### Phase Delivery Checklist (v5.3.0.2)

Má»—i phase hoÃ n thÃ nh pháº£i cháº¡y tá»‘i thiá»ƒu:

```bash
npm run security:scan
npm run architecture:scan
npm run version:check
npx prisma validate
npm run db:generate
npm run build
docker compose config
```

Náº¿u cÃ³ DB schema má»›i: pháº£i cÃ³ migration, cáº­p nháº­t `rls_setup.sql`, cÃ³ index `tenantId`, vÃ  cÃ³ audit/security note trong `DOCUMENTATION.md`.

### Sprint 1 Stabilization Hardening (v5.4.0.1)

V.5.4.0.1 lÃ  patch stabilization cho phase Incident SLA + Evidence Chain, Æ°u tiÃªn Ä‘Æ°a báº£n build vá» tráº¡ng thÃ¡i an toÃ n hÆ¡n trÆ°á»›c khi má»Ÿ rá»™ng V.5.5.0. Pháº¡m vi cá»§a patch nÃ y cá»‘ Ã½ giá»¯ nhá», khÃ´ng refactor sÃ¢u use-case/domain, mÃ  táº­p trung vÃ o cÃ¡c gate phÃ¡t hÃ nh vÃ  tÃ­nh Ä‘Ãºng Ä‘áº¯n RLS.

- Loáº¡i file `.env` tháº­t khá»i source package; chá»‰ giá»¯ `.env.example` Ä‘á»ƒ security scan fail-fast náº¿u secrets bá»‹ Ä‘Ã³ng gÃ³i nháº§m.
- Sá»­a `VendorRepository.listComplianceScores()` dÃ¹ng `ComplianceScore.totalScore` Ä‘Ãºng vá»›i Prisma schema vÃ  map ngÆ°á»£c `score` cho mobile contract cÅ©.
- Thay cÃ¡c luá»“ng system fan-out/config read Ä‘ang dÃ¹ng `db.system()` sai ngá»¯ cáº£nh báº±ng `db.withTenant('SYSTEM', ...)` táº¡i patrol jobs, tenant settings vÃ  media config Ä‘á»ƒ PostgreSQL RLS nháº­n Ä‘Ãºng session variable `app.current_tenant_id = 'SYSTEM'`.
- Äá»“ng bá»™ policy migration `incident_sla_rules` vá»›i allowlist `SYSTEM`, trÃ¡nh lá»‡ch hÃ nh vi giá»¯a migration cá»¥c bá»™ vÃ  `rls_setup.sql`.

Patch nÃ y chÆ°a thay Ä‘á»•i Ä‘á»‹nh hÆ°á»›ng kiáº¿n trÃºc cá»§a V.5.4.0. Business orchestration lá»›n trong `PatrolService` vÃ  `IncidentSlaService` váº«n lÃ  technical debt Ä‘Ã£ biáº¿t, sáº½ Ä‘Æ°á»£c xá»­ lÃ½ á»Ÿ Sprint 3 vÃ  Sprint 4 Ä‘á»ƒ trÃ¡nh trá»™n stabilization vá»›i refactor.

### Sprint 2 Real Command Center (v5.4.0.2)

V.5.4.0.2 chuyá»ƒn Command Center tá»« mÃ n hÃ¬nh "feedback inbox" sang trung tÃ¢m giÃ¡m sÃ¡t váº­n hÃ nh tháº­t. Feed Æ°u tiÃªn vÃ  priority widget khÃ´ng cÃ²n láº¥y `Feedback` lÃ m nguá»“n dá»¯ liá»‡u chÃ­nh; thay vÃ o Ä‘Ã³ chÃºng gom dá»¯ liá»‡u trá»±c tiáº¿p tá»« `Incident`, `ViolationEvent`, `PatrolSession`, `PatrolAssignment`, `ShiftComplianceItem` vÃ  `AttendanceRecord`.

Thá»© tá»± Æ°u tiÃªn nghiá»‡p vá»¥ cá»§a feed Ä‘Æ°á»£c khÃ³a nhÆ° sau:

- Incident `CRITICAL/HIGH` quÃ¡ SLA hoáº·c sáº¯p quÃ¡ SLA.
- Thiáº¿u ngÆ°á»i táº¡i ca trá»±c hoáº·c patrol assignment Ä‘Ã£ quÃ¡ háº¡n chÆ°a khá»Ÿi Ä‘á»™ng.
- Patrol cÃ³ missed checkpoint, GPS mismatch, evidence missing hoáº·c session `MISSED/INVALID/PARTIAL`.
- Incident `RESOLVED_PENDING_APPROVAL` chá» closure governance.
- Violation cÃ²n `OPEN/PENDING_REVIEW` cáº§n supervisor hoáº·c tenant admin háº­u kiá»ƒm.
- Attendance record bá»‹ gáº¯n cá» `isValid = false` nhÆ° má»™t chá»‰ dáº¥u nghi váº¥n váº­n hÃ nh.

Command Center map cÅ©ng Ä‘Æ°á»£c nÃ¢ng tá»« checkpoint tÄ©nh sang checkpoint cÃ³ ngá»¯ cáº£nh hoáº¡t Ä‘á»™ng gáº§n nháº¥t:

- `ACTIVE`: checkpoint cÃ³ patrol log há»£p lá»‡ trong cá»­a sá»• thá»i gian gáº§n.
- `SOS`: checkpoint cÃ³ log báº¥t thÆ°á»ng hoáº·c exception code gáº§n nháº¥t.
- `INACTIVE`: chÆ°a cÃ³ hoáº¡t Ä‘á»™ng gáº§n Ä‘Ã¢y.

Patch nÃ y váº«n giá»¯ UI contract nháº¹ Ä‘á»ƒ trÃ¡nh refactor frontend lan rá»™ng trong phase stabilization. Dashboard overview tiáº¿p tá»¥c dÃ¹ng shape dá»¯ liá»‡u cÅ© (`title`, `description`, `severity`, `status`, `timestamp`) nhÆ°ng backend Ä‘Ã£ Ä‘á»•i hoÃ n toÃ n sang nguá»“n dá»¯ liá»‡u váº­n hÃ nh tháº­t.

Náº¿u cÃ³ API má»›i: pháº£i cÃ³ Zod schema, RBAC, `RequestContextResolver`, tenant access qua `db.withTenant(ctx.tenantId)` hoáº·c `db.forTenant(ctx.tenantId)`, vÃ  output pháº£i Ä‘Æ°á»£c sanitize.

### Sprint 3 Patrol Session Hardening (v5.4.0.3)

V.5.4.0.3 siÃ¡ÂºÂ¿t chÃ¡ÂºÂ·t phase Patrol Ã„â€˜Ã¡Â»Æ’ dÃ¡Â»Â¯ liÃ¡Â»â€¡u tuÃ¡ÂºÂ§n tra bÃ¡ÂºÂ¯t Ã„â€˜Ã¡ÂºÂ§u Ã„â€˜Ã¡ÂºÂ¡t chuÃ¡ÂºÂ©n Ã„â€˜Ã¡Â»â€˜i soÃƒÂ¡t hÃ¡Â»Â£p Ã„â€˜Ã¡Â»â€œng, thay vÃƒÂ¬ chÃ¡Â»â€° Ã„â€˜Ã¡Â»Â§ Ã„â€˜Ã¡Â»Æ’ ghi nhÃ¡ÂºÂ­n vÃ¡ÂºÂ­n hÃƒÂ nh. MÃƒÂ´ hÃƒÂ¬nh nghiÃ¡Â»â€¡p vÃ¡Â»Â¥ chÃƒÂ­nh thÃ¡Â»Â©c tÃ¡Â»Â« patch nÃƒÂ y lÃƒÂ :

```text
PatrolAssignment
-> Start PatrolSession
-> Scan checkpoint trong session
-> Complete PatrolSession
-> TÃƒÂ­nh compliance theo route/contract SLA
-> Sinh ViolationEvent chÃ†Â°a review
```

Quy tÃ¡ÂºÂ¯c bÃ¡ÂºÂ¥t biÃ¡ÂºÂ¿n mÃ¡Â»â€ºi:

- Patrol route gÃ¡ÂºÂ¯n `contractId` Ã„â€˜Ã†Â°Ã¡Â»Â£c xem lÃƒÂ  `Contract Compliance Patrol`. MÃ¡i scan QR cho checkpoint thuÃ¡Â»â„¢c route active cÃƒÂ³ contract bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c Ã„â€˜i qua `patrolSessionId`; legacy ad-hoc scan khÃƒÂ´ng cÃƒÂ²n Ã„â€˜Ã†Â°Ã¡Â»Â£c dÃƒÂ¹ng Ã„â€˜Ã¡Â»Æ’ tÃ¡ÂºÂ¡o bÃ¡ÂºÂ±ng chÃ¡Â»Â©ng SLA/scorecard cho route nÃƒÂ y.
- `Checkpoint` Ã„â€˜Ã†Â°Ã¡Â»Â£c neo thÃƒÂªm `siteId` vÃƒÂ  `guardPostId` Ã„â€˜Ã¡Â»Æ’ route activation cÃƒÂ³ thÃ¡Â»Æ’ xÃƒÂ¡c minh checkpoint thuÃ¡Â»â„¢c Ã„â€˜ÃƒÂºng site/guard post vÃ¡ÂºÂ­n hÃƒÂ nh. Quan hÃ¡Â»â€¡ nÃƒÂ y Ã„â€˜Ã†Â°Ã¡Â»Â£c giÃ¡Â»Â¯ nullable Ã„â€˜Ã¡Â»Æ’ migration an toÃƒÂ n, nhÃ†Â°ng route active phÃ¡ÂºÂ£i fail-fast nÃ¡ÂºÂ¿u phÃ¡ÂºÂ¡m ngÃ¡Â»Â¯ cÃ¡ÂºÂ£nh site.
- TÃ¡ÂºÂ¡o route khÃƒÂ´ng cÃƒÂ²n query checkpoint tÃ¡Â»Â«ng bÃ¡ÂºÂ£n ghi. Backend batch-load checkpoint/guard-post Ã„â€˜Ã¡Â»Æ’ validate trÃ†Â°Ã¡Â»â€ºc khi create, loÃ¡ÂºÂ¡i bÃ¡Â»Â N+1 query Ã¡Â»Å¸ route builder.
- Target `requiredCompletionPercent` cÃ¡Â»Â§a route Ã„â€˜Ã†Â°Ã¡Â»Â£c chuÃ¡ÂºÂ©n hÃƒÂ³a theo policy: Ã†Â°u tiÃƒÂªn request explicit, nÃ¡ÂºÂ¿u khÃƒÂ´ng cÃƒÂ³ thÃƒÂ¬ snapshot tÃ¡Â»Â« `contract.slaConfig.patrolCompletionTargetPercent` hoÃ¡ÂºÂ·c `min_patrol_compliance`, sau Ã„â€˜ÃƒÂ³ lÃ†Â°u lÃ¡ÂºÂ¡i trong route/compliance config Ã„â€˜Ã¡Â»Æ’ truy vÃ¡ÂºÂ¿t.
- `PatrolSession` completion khÃƒÂ´ng cÃƒÂ²n coi `100% + score >= 90` lÃƒÂ  hÃ„Æ’ng sÃ¡Â»â€˜ cÃ¡Â»Â©ng. TrÃ¡ÂºÂ¡ng thÃƒÂ¡i `COMPLETED / PARTIAL / MISSED / INVALID` phÃ¡ÂºÂ£i Ã„â€˜i theo target hoÃƒÂ n thÃƒÂ nh cÃ¡Â»Â§a route vÃƒÂ  tÃƒÂ­n hiÃ¡Â»â€¡u gian lÃ¡ÂºÂ­n GPS.
- `ViolationEvent` sinh tÃ¡Â»Â« patrol completion hoÃ¡ÂºÂ·c missed assignment mÃ¡ÂºÂ·c Ã„â€˜Ã¡Â»â€¹nh `PENDING_REVIEW`, khÃƒÂ´ng dÃƒÂ¹ng semantics `OPEN` kiÃ¡Â»Æ’u ticket vÃ¡ÂºÂ­n hÃƒÂ nh, Ã„â€˜Ã¡Â»Æ’ chuÃ¡ÂºÂ©n bÃ¡Â»â€¹ cho flow review/dispute/penalty Ã¡Â»Å¸ V.5.5.0.

TÃƒÂ¡c Ã„â€˜Ã¡Â»â„¢ng kiÃ¡ÂºÂ¿n trÃƒÂºc:

- Orchestration nghiÃ¡Â»â€¡p vÃ¡Â»Â¥ chÃƒÂ­nh cÃ¡Â»Â§a Patrol Ã„â€˜Ã†Â°Ã¡Â»Â£c tÃƒÂ¡ch khÃ¡Â»Âi `PatrolService` sang application/use-case layer cho cÃƒÂ¡c flow `create route`, `create assignment`, `start patrol session`, `complete patrol session`.
- `PatrolService` giÃ¡Â»Â chÃ¡Â»Â§ yÃ¡ÂºÂ¿u lÃƒÂ m facade/adaptor, giÃ¡ÂºÂ£m xu hÃ†Â°Ã¡Â»â€ºng God Service vÃƒÂ  Ã„â€˜Ã†Â°a business rule vÃ¡Â»Â Ã„â€˜ÃƒÂºng lÃ¡Â»â€ºp `core/use-cases`.
- Patch nÃƒÂ y chÃ†Â°a tÃƒÂ¡ch hÃ¡ÂºÂ¿t tÃ¡ÂºÂ¥t cÃ¡ÂºÂ£ flow Patrol. `processMissedAssignments` vÃ¡ÂºÂ«n cÃƒÂ²n nÃ¡ÂºÂ±m tÃ¡ÂºÂ¡i service do liÃƒÂªn quan Ã„â€˜Ã¡ÂºÂ¿n queue orchestration, nhÃ†Â°ng semantics violation/trÃ¡ÂºÂ¡ng thÃƒÂ¡i Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c Ã„â€˜Ã¡Â»â€œng bÃ¡Â»â„¢ vÃ¡Â»â€ºi phase V.5.5.0.

### Sprint 4 Incident SLA Governance Hardening (v5.4.0.4)

V.5.4.0.4 chuÃ¡ÂºÂ©n hÃƒÂ³a lÃ¡ÂºÂ¡i Incident SLA theo governance nghiÃ¡Â»â€¡m thu thay vÃƒÂ¬ workflow ticket Ã„â€˜ÃƒÂ³ng nhanh. Incident khÃƒÂ´ng cÃƒÂ²n Ã„â€˜Ã†Â°Ã¡Â»Â£c hiÃ¡Â»Æ’u nhÃ†Â° "submit resolution xong lÃƒÂ  close", mÃƒÂ  phÃ¡ÂºÂ£i Ã„â€˜i qua chuÃ¡Â»â€”i nghiÃ¡Â»â€¡p vÃ¡Â»Â¥:

```text
Report Incident
-> SLA assigned
-> Acknowledge / Investigate / Add evidence
-> Submit resolution
-> Approve resolution
-> Close incident
```

Quy tÃ¡ÂºÂ¯c bÃ¡ÂºÂ¥t biÃ¡ÂºÂ¿n mÃ¡Â»â€ºi:

- `approveResolution()` vÃƒÂ  `closeIncident()` lÃƒÂ  hai quyÃ¡ÂºÂ¿t Ã„â€˜Ã¡Â»â€¹nh khÃƒÂ¡c nhau. Approve chuyÃ¡Â»Æ’n incident sang `RESOLVED`; close chÃ¡Â»â€° hÃ¡Â»Â£p lÃ¡Â»â€¡ khi incident Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c approve vÃƒÂ  sau Ã„â€˜ÃƒÂ³ mÃ¡Â»â€ºi chuyÃ¡Â»Æ’n sang `CLOSED`.
- Role approval Ã„â€˜i theo severity. `SUPERVISOR` chÃ¡Â»â€° Ã„â€˜Ã†Â°Ã¡Â»Â£c approve/reject/close `LOW` vÃƒÂ  `MEDIUM`. Incident `HIGH` vÃƒÂ  `CRITICAL` bÃ¡ÂºÂ¯t buÃ¡Â»â„¢c do `TENANT_ADMIN` hoÃ¡ÂºÂ·c `SUPER_ADMIN` quyÃ¡ÂºÂ¿t Ã„â€˜Ã¡Â»â€¹nh.
- `ViolationEvent` sinh tÃ¡Â»Â« incident SLA breach phÃ¡ÂºÂ£i Ã„â€˜i vÃ¡Â»Â semantics Ã„â€˜Ã¡Â»â€˜i soÃƒÂ¡t, vÃƒÂ¬ vÃ¡ÂºÂ­y breach event luÃƒÂ´n upsert vÃ¡Â»â€ºi `status = PENDING_REVIEW`.
- Evidence Ã„â€˜ÃƒÂ£ Ã„â€˜Ã†Â°Ã¡Â»Â£c khÃƒÂ³a cho report (`lockedByReportId`, `lockedAt`, `isReportLocked`) khÃƒÂ´ng Ã„â€˜Ã†Â°Ã¡Â»Â£c Ã„â€˜Ã¡Â»â€¢i `status` trÃ¡Â»Â±c tiÃ¡ÂºÂ¿p. MuÃ¡Â»â€˜n thay Ã„â€˜Ã¡Â»â€¢i phÃ¡ÂºÂ£i Ã„â€˜i qua cÃ†Â¡ chÃ¡ÂºÂ¿ report revision Ã¡Â»Å¸ phase V.5.5.0.

TÃƒÂ¡c Ã„â€˜Ã¡Â»â„¢ng kiÃ¡ÂºÂ¿n trÃƒÂºc:

- Orchestration Incident SLA Ã„â€˜Ã†Â°Ã¡Â»Â£c tÃƒÂ¡ch khÃ¡Â»Âi `IncidentSlaService` sang application/use-case layer cho cÃƒÂ¡c flow `record created`, `acknowledge`, `add evidence`, `update evidence status`, `submit resolution`, `approve resolution`, `reject resolution`, `close incident`, `process SLA breach`.
- `IncidentSlaService` giÃ¡Â»Â giÃ¡Â»Â¯ vai trÃƒÂ² facade má»ng/compatibility layer; business rule thÃ¡Â»Â±c thi nÃ¡ÂºÂ±m Ã¡Â»Å¸ use case vÃƒÂ  shared governance helper.
- Patch nÃƒÂ y chuÃ¡ÂºÂ©n bÃ¡Â»â€¹ khÃ¡ÂºÂ£ nÃ„Æ’ng khÃƒÂ³a bÃ¡ÂºÂ±ng chÃ¡Â»Â©ng cho `MonthlyAcceptanceReport FINALIZED`, nhÃ†Â°ng chÃ†Â°a triÃ¡Â»Æ’n khai report revision hay builder V.5.5.0.

### Contract/Site/GuardPost Foundation (v5.3.0.3)

V.5.3.0.3 hoÃ n thiá»‡n láº¡i pháº§n ná»n táº£ng khai bÃ¡o cá»§a phase V.5.2.0 Ä‘á»ƒ Contract Compliance Engine khÃ´ng cÃ²n xem contract nhÆ° má»™t form tÃ i chÃ­nh Ä‘Æ¡n láº». Flow cáº¥u hÃ¬nh chuáº©n lÃ :

```text
Vendor
-> Site
-> GuardPost
-> Contract + SLA / Evidence Policy / Acceptance Policy / Penalty Policy
-> Shift Requirement / Patrol / Incident / Evidence
```

`Site` vÃ  `GuardPost` trá»Ÿ thÃ nh master data tenant-scoped trong PostgreSQL. `Contract` cÃ³ `siteId` Ä‘á»ƒ gáº¯n rÃµ site thá»±c táº¿, trong khi `siteName` Ä‘Æ°á»£c giá»¯ Ä‘á»ƒ tÆ°Æ¡ng thÃ­ch ngÆ°á»£c vá»›i dá»¯ liá»‡u cÅ©. UI Contract Compliance workspace pháº£i cho phÃ©p khai bÃ¡o Vendor, Site, GuardPost vÃ  Contract/SLA trong cÃ¹ng má»™t luá»“ng nghiá»‡p vá»¥, khÃ´ng dÃ¹ng mock SLA Ä‘á»ƒ tÃ­nh Ä‘á»‘i soÃ¡t.

Quy táº¯c báº¥t biáº¿n cá»§a phase nÃ y:

- Vendor cÃ³ tráº¡ng thÃ¡i `ACTIVE / SUSPENDED / TERMINATED`, risk level `LOW / MEDIUM / HIGH`, tax code, service scope vÃ  notes.
- Site cÃ³ tráº¡ng thÃ¡i `ACTIVE / INACTIVE`, loáº¡i site, Ä‘á»‹a chá»‰, quáº£n lÃ½ site vÃ  vendor phá»¥ trÃ¡ch tÃ¹y chá»n.
- GuardPost báº¯t buá»™c thuá»™c má»™t Site cÃ¹ng tenant; khÃ´ng táº¡o GuardPost cho Site inactive; GPS náº¿u khai bÃ¡o pháº£i cÃ³ cáº£ lat/lng há»£p lá»‡; radius máº·c Ä‘á»‹nh 50m.
- Contract ACTIVE báº¯t buá»™c cÃ³ `vendorId`, `siteId`, `startDate/endDate`, `guardCountPerShift`, Ã­t nháº¥t má»™t SLA rule vÃ  `acceptancePolicy`.
- Nhiá»u Contract ACTIVE trÃªn cÃ¹ng `vendorId + siteId` bá»‹ cháº·n náº¿u khoáº£ng thá»i gian overlap.
- Má»i create/update/status change cá»§a Vendor, Site, GuardPost, Contract pháº£i ghi AuditLog qua backend use-case.
- Repository chá»‰ truy cáº­p dá»¯ liá»‡u báº±ng `db.withTenant(ctx.tenantId)`; `sites` vÃ  `guard_posts` náº±m trong RLS setup vÃ  tenant isolation guard.

TÃ¡c Ä‘á»™ng kiáº¿n trÃºc: phase nÃ y Ä‘Æ°a Ä‘á»‘i soÃ¡t há»£p Ä‘á»“ng vá» Ä‘Ãºng trá»¥c dá»¯ liá»‡u `Tenant -> Vendor -> Contract -> Site -> GuardPost`, táº¡o Ä‘iá»ƒm neo cho V.5.3.0 patrol route, V.5.4.0 incident SLA vÃ  V.5.5.0 acceptance/penalty report. Rá»§i ro chÃ­nh lÃ  migration tá»« `Contract.siteName` cÅ© sang `siteId`; vÃ¬ váº­y `siteId` Ä‘Æ°á»£c thÃªm nullable trÆ°á»›c, API má»›i yÃªu cáº§u `siteId`, vÃ  dá»¯ liá»‡u cÅ© cáº§n Ä‘Æ°á»£c backfill báº±ng mapping site sau khi khÃ¡ch hÃ ng xÃ¡c nháº­n danh má»¥c site thá»±c táº¿.

### PatrolRoute/PatrolSession Compliance (v5.3.0.4)

V.5.3.0.4 chuyá»ƒn Patrol tá»« mÃ´ hÃ¬nh "Ä‘Ã£ quÃ©t QR" sang phiÃªn tuáº§n tra cÃ³ tuyáº¿n, ca, báº±ng chá»©ng vÃ  Ä‘iá»ƒm compliance. `PatrolRoute` cÃ³ thá»ƒ gáº¯n `siteId`, `contractId`, `vendorId`, thá»i lÆ°á»£ng dá»± kiáº¿n, target hoÃ n thÃ nh vÃ  lá»‹ch láº·p. `PatrolRouteCheckpoint` lÆ°u thá»© tá»±, checkpoint/guard post, yÃªu cáº§u GPS/áº£nh/ghi chÃº vÃ  ngÆ°á»¡ng thá»i gian Ä‘áº¿n Ä‘iá»ƒm. `PatrolAssignment` gáº¯n route vá»›i guard/shift/contract/vendor. `PatrolSession` lÃ  thá»±c táº¿ váº­n hÃ nh, lÆ°u completion percent, compliance score, missed/late/GPS/evidence counters.

Luá»“ng chuáº©n:

```text
Contract ACTIVE
-> Site cÃ³ GuardPost/Checkpoint
-> Táº¡o PatrolRoute ACTIVE
-> GÃ¡n PatrolAssignment cho guard/shift
-> Guard start PatrolSession
-> Scan checkpoint theo route
-> Backend validate QR/GPS/evidence/thá»© tá»±
-> PatrolComplianceCalculator cáº­p nháº­t Ä‘iá»ƒm
-> Complete session
-> ViolationEvent náº¿u lá»‡ch SLA
```

Quy táº¯c backend:

- KhÃ´ng active route náº¿u thiáº¿u `siteId`, thiáº¿u checkpoint, duplicate sequence, `expectedDurationMinutes <= 0`, hoáº·c `requiredCompletionPercent` ngoÃ i 1-100.
- Route gáº¯n contract chá»‰ há»£p lá»‡ khi contract Ä‘ang `ACTIVE`; náº¿u cÃ³ site trÃªn contract thÃ¬ pháº£i khá»›p site cá»§a route.
- GuardPost trong route checkpoint pháº£i thuá»™c cÃ¹ng site vÃ  Ä‘ang `ACTIVE`.
- Assignment chá»‰ táº¡o trÃªn route active, staff active, contract active vÃ  shift cÃ¹ng contract náº¿u cÃ³ shift.
- Scan checkpoint báº¯t buá»™c cÃ³ session/location, checkpoint thuá»™c route, QR há»£p lá»‡, session chÆ°a Ä‘Ã³ng, khÃ´ng duplicate route checkpoint, GPS Ä‘Ãºng radius náº¿u `gpsRequired`, áº£nh/ghi chÃº Ä‘á»§ náº¿u Ä‘Æ°á»£c cáº¥u hÃ¬nh.
- Compliance chá»‰ tÃ­nh á»Ÿ backend báº±ng `PatrolComplianceCalculator`: bá» checkpoint báº¯t buá»™c, sai GPS, sai thá»© tá»±, thiáº¿u evidence, quÃ¡ nhanh hoáº·c quÃ¡ muá»™n Ä‘á»u trá»« Ä‘iá»ƒm.
- `ViolationEvent` dÃ¹ng `tenantId + idempotencyKey` Ä‘á»ƒ chá»‘ng táº¡o trÃ¹ng khi offline sync retry hoáº·c queue job cháº¡y láº¡i.
- Realtime chá»‰ phÃ¡t qua Outbox sau commit vá»›i event `PATROL_UPDATED`; khÃ´ng emit Socket.io trá»±c tiáº¿p trong transaction.

TÃ¡c Ä‘á»™ng chiáº¿n lÆ°á»£c: dá»¯ liá»‡u tuáº§n tra giá» cÃ³ thá»ƒ Ä‘Æ°á»£c Ä‘á»c bá»Ÿi VendorScorecard vÃ  MonthlyAcceptanceReport á»Ÿ V.5.5.0 vÃ¬ má»—i vi pháº¡m patrol Ä‘Ã£ cÃ³ tenant/vendor/contract/site/session context, evidence summary vÃ  idempotency key.

### Incident SLA + Evidence Chain (v5.4.0.0)

V.5.4.0.0 nÃ¢ng Incident tá»« báº£n ghi "bÃ¡o/xá»­ lÃ½/Ä‘Ã³ng" thÃ nh workflow SLA cÃ³ timer, timeline, evidence chain vÃ  nguá»“n dá»¯ liá»‡u pháº¡t nhÃ  tháº§u. `Incident` cÃ³ thá»ƒ gáº¯n `vendorId`, `contractId`, `siteId`; lÆ°u `responseDueAt`, `resolutionDueAt`, thá»i Ä‘iá»ƒm ACK/submit resolution vÃ  danh sÃ¡ch evidence báº¯t buá»™c. `IncidentSlaRule` lÃ  cáº¥u hÃ¬nh SLA theo tenant/contract/site/severity/incident type, gá»“m thá»i háº¡n pháº£n há»“i, xá»­ lÃ½, escalation, penalty policy vÃ  evidence requirement.

Luá»“ng chuáº©n:

```text
Report Incident
-> resolve Vendor/Contract/Site context
-> calculate responseDueAt/resolutionDueAt from IncidentSlaRule
-> create IncidentTimeline(REPORTED, SLA_ASSIGNED)
-> ACK / ASSIGN / INVESTIGATE / WAITING_VENDOR_RESPONSE
-> add structured EvidenceChain
-> submit RESOLVED_PENDING_APPROVAL
-> approve -> CLOSED
-> reject -> REOPENED -> INVESTIGATING
```

SLA breach khÃ´ng cháº¡y trong transaction request chÃ­nh. Light queue kiá»ƒm tra response/resolution overdue, táº¡o `IncidentTimeline(SLA_BREACHED)`, notification vÃ  `ViolationEvent` idempotent theo `tenantId + incidentId + breachType` khi xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c vendor/contract chá»‹u trÃ¡ch nhiá»‡m. Queue khÃ´ng Ä‘Æ°á»£c emit realtime trá»±c tiáº¿p trong transaction; realtime/webhook pháº£i Ä‘i qua outbox/worker sau commit.

Evidence policy:

- PostgreSQL lÃ  SSOT metadata báº±ng chá»©ng: `sourceType`, `sourceId`, uploader, file type/url/thumbnail, capturedAt, GPS, checksum, status.
- Firebase/Storage chá»‰ lÆ°u binary; khÃ´ng giá»¯ business metadata duy nháº¥t.
- Evidence Ä‘Ã£ dÃ¹ng trong report khÃ´ng xÃ³a váº­t lÃ½; chá»‰ chuyá»ƒn `ACTIVE / REJECTED / ARCHIVED` vÃ  ghi audit/timeline.
- Approve resolution bá»‹ cháº·n náº¿u thiáº¿u `resolutionNote`, thiáº¿u evidence báº¯t buá»™c, actor khÃ´ng cÃ³ quyá»n, hoáº·c incident Ä‘Ã£ cancel.

TÃ¡c Ä‘á»™ng chiáº¿n lÆ°á»£c: Incident trá»Ÿ thÃ nh nguá»“n báº±ng chá»©ng trá»±c tiáº¿p cho VendorScorecard vÃ  MonthlyAcceptanceReport á»Ÿ V.5.5.0. Rá»§i ro chÃ­nh lÃ  migration lifecycle tá»« `RESOLVED` cÅ© sang `RESOLVED_PENDING_APPROVAL`; há»‡ thá»‘ng váº«n giá»¯ enum `RESOLVED` Ä‘á»ƒ tÆ°Æ¡ng thÃ­ch dá»¯ liá»‡u cÅ©, nhÆ°ng API má»›i submit resolution vÃ o tráº¡ng thÃ¡i chá» nghiá»‡m thu.

### Public Landing Content Governance (v5.1.1.22)

CÃ¡c liÃªn káº¿t public táº¡i footer trang chá»§ pháº£i trá» tá»›i tÃ i nguyÃªn cÃ³ ná»™i dung tháº­t, Ä‘Ãºng chá»§ Ä‘á» vÃ  cÃ³ metadata SEO rÃµ rÃ ng. CÃ¡c nhÃ³m ná»™i dung sáº£n pháº©m, giáº£i phÃ¡p, há»— trá»£, tráº¡ng thÃ¡i há»‡ thá»‘ng, chÃ­nh sÃ¡ch báº£o máº­t vÃ  Ä‘iá»u khoáº£n dá»‹ch vá»¥ Ä‘Æ°á»£c phá»¥c vá»¥ qua route public article hoáº·c route chá»©c nÄƒng tÆ°Æ¡ng á»©ng; khÃ´ng dÃ¹ng placeholder anchor cho cÃ¡c má»¥c cáº§n ná»™i dung Ä‘á»™c láº­p. Ná»™i dung public pháº£i nháº¥t quÃ¡n vá»›i Ä‘á»‹nh vá»‹ SCMD Pro lÃ  ná»n táº£ng quáº£n lÃ½ an ninh, tuáº§n tra, sá»± cá»‘, SLA vÃ  váº­n hÃ nh multi-tenant.

### Landing Hero Conversion UX (v5.1.1.23)

Trang chá»§ public Æ°u tiÃªn thÃ´ng Ä‘iá»‡p Ä‘á»‹nh vá»‹ "pháº§n má»m quáº£n lÃ½ tuáº§n tra thá»i gian thá»±c" trong first viewport, giáº£m mÃ´ táº£ dÃ i vÃ  dÃ¹ng video thá»±c táº¿ á»Ÿ hero Ä‘á»ƒ chá»©ng minh quy trÃ¬nh QR/GPS. Video hero Ä‘Æ°á»£c phá»¥c vá»¥ tá»« Cloudinary qua `media-src` CSP riÃªng, pháº£i `autoplay`, `muted`, `loop`, `playsInline` Ä‘á»ƒ cháº¡y á»•n Ä‘á»‹nh trÃªn desktop/mobile mÃ  khÃ´ng yÃªu cáº§u tÆ°Æ¡ng tÃ¡c ban Ä‘áº§u. Header public cÃ³ dáº£i xanh má»ng Ä‘á»ƒ tÃ¡ch menu khá»i hero, giá»¯ nháº­n diá»‡n Navy Theme nhÆ°ng tÄƒng Ä‘á»™ rÃµ vÃ¹ng Ä‘iá»u hÆ°á»›ng.

### Dark Landing Hero Balance UX (v5.1.1.24)

Hero trang chá»§ pháº£i giá»¯ Navy Theme nháº¥t quÃ¡n vá»›i toÃ n bá»™ public site, trÃ¡nh chuyá»ƒn sang light mode rá»i ráº¡c. Bá»‘ cá»¥c first viewport dÃ¹ng hai cá»™t cÃ¢n báº±ng, typography co giÃ£n báº±ng `clamp()`, video giá»¯ tá»· lá»‡ 16:9 vÃ  cÃ¡c chá»‰ sá»‘ phá»¥ Ä‘Æ°á»£c nÃ©n thÃ nh proof card ngáº¯n Ä‘á»ƒ phÃ¹ há»£p laptop, desktop vÃ  mobile. Dáº£i phÃ¢n tÃ¡ch header dÃ¹ng hairline xanh tinh táº¿ thay vÃ¬ thanh mÃ u dÃ y, nháº±m táº¡o nháº­n diá»‡n tráº¡ng thÃ¡i mÃ  khÃ´ng phÃ¡ nhá»‹p thá»‹ giÃ¡c.

### Backend Sidebar Logo Balance UX (v5.1.1.25)

Backend/dashboard sidebar branding uses a dedicated sidebar logo scale instead of public-header sizing. Expanded sidebars keep the full wordmark within navigation density limits, while collapsed sidebars show the cropped shield icon centered in a square target with a stable toggle position.

### Operations Core Phase 1 (v5.2.0.0)

SCMD Pro chuyá»ƒn tá»« ghi nháº­n log Ä‘Æ¡n láº» sang Ä‘iá»u phá»‘i nghiá»‡p vá»¥ theo phiÃªn. PostgreSQL lÃ  SSOT cho `PatrolRoute`, thá»© tá»± checkpoint trong route, `PatrolAssignment`, `ShiftSession` vÃ  `PatrolSession`. `ShiftSchedule` chá»‰ lÃ  káº¿ hoáº¡ch; `ShiftSession` lÃ  ca trá»±c thá»±c táº¿ Ä‘Æ°á»£c má»Ÿ tá»« check-in. `PatrolLog` cÃ³ thá»ƒ gáº¯n vá»›i `PatrolSession` Ä‘á»ƒ tÃ­nh thiáº¿u checkpoint, sai thá»© tá»±, sai GPS vÃ  `complianceScore`, Ä‘á»“ng thá»i váº«n tÆ°Æ¡ng thÃ­ch vá»›i log cÅ© chÆ°a thuá»™c session.

---

### Incident & Escalation Phase 2 (v5.3.0.0)

Incident lifecycle Ä‘Æ°á»£c nÃ¢ng tá»« ghi nháº­n tráº¡ng thÃ¡i sang quáº£n trá»‹ SLA. Má»—i sá»± cá»‘ cÃ³ `slaDeadline`, `slaMinutes`, `slaBreached`, ngÆ°á»i xá»­ lÃ½ resolution, ngÆ°á»i duyá»‡t resolution vÃ  ngÆ°á»i Ä‘Ã³ng Ä‘á»™c láº­p. `IncidentTimeline` lÃ  lá»‹ch sá»­ nghiá»‡p vá»¥ chuyÃªn biá»‡t cho report, assign, evidence, submit resolution, approve, escalate, close vÃ  reopen. `IncidentEvidence` lÆ°u áº£nh/video/tÃ i liá»‡u/ghi chÃº theo tá»«ng bÆ°á»›c xá»­ lÃ½ Ä‘á»ƒ báº£o toÃ n chuá»—i báº±ng chá»©ng.

SLA deadline Ä‘Æ°á»£c tÃ­nh tá»± Ä‘á»™ng theo severity: LOW 240 phÃºt, MEDIUM 120 phÃºt, HIGH 60 phÃºt, CRITICAL 15 phÃºt. BullMQ light worker kiá»ƒm tra quÃ¡ háº¡n má»—i phÃºt vÃ  tá»± chuyá»ƒn sá»± cá»‘ REPORTED/INVESTIGATING quÃ¡ háº¡n sang ESCALATED, phÃ¡t realtime notification cho tenant. Resolution pháº£i Ä‘Æ°á»£c ngÆ°á»i khÃ¡c duyá»‡t trÆ°á»›c khi manager/supervisor Ä‘Ã³ng; reopen tá»« RESOLVED/CLOSED báº¯t buá»™c cÃ³ lÃ½ do.

---

## 1. Executive Summary & Vision (Táº§m nhÃ¬n & Tá»•ng quan)

SCMD Pro khÃ´ng chá»‰ lÃ  pháº§n má»m quáº£n lÃ½ báº£o vá»‡, mÃ  lÃ  má»™t **Há»‡ sinh thÃ¡i Chá»‰ huy An ninh ThÃ´ng minh (Security Command Center)** dÃ nh cho doanh nghiá»‡p vÃ  táº­p Ä‘oÃ n. Há»‡ thá»‘ng giáº£i quyáº¿t cÃ¡c bÃ i toÃ¡n rá»§i ro hoáº¡t Ä‘á»™ng (Operational Risks), gian láº­n thá»i gian, vÃ  Ä‘á»™ trá»… trong á»©ng phÃ³ sá»± cá»‘ thÃ´ng qua dá»¯ liá»‡u thá»i gian thá»±c vÃ  trÃ­ tuá»‡ nhÃ¢n táº¡o (AI Watchdog).

**Má»¥c tiÃªu cá»‘t lÃµi:**

- **Zero-Trust Operation:** KhÃ´ng tin tÆ°á»Ÿng báº¥t ká»³ ai mÃ  khÃ´ng cÃ³ nguá»“n gá»‘c dá»¯ liá»‡u xÃ¡c thá»±c (GPS, Chá»¯ kÃ½ sá»‘, Timestamp tá»« Server).
- **Proactive Security:** Chuyá»ƒn Ä‘á»•i tá»« pháº£n á»©ng thá»¥ Ä‘á»™ng sang phÃ²ng ngá»«a chá»§ Ä‘á»™ng thÃ´ng qua PhÃ¢n tÃ­ch dá»± bÃ¡o (Predictive Analysis) vÃ  SLO Monitoring.
- **Enterprise-Grade Reliability:** Sáºµn sÃ ng phá»¥c vá»¥ quy mÃ´ táº­p Ä‘oÃ n vá»›i SLA 99.99%, Data Isolation an toÃ n tuyá»‡t Ä‘á»‘i.
- **Data Integrity Assurance (Má»›i v4.20):** Tá»± Ä‘á»™ng kiá»ƒm soÃ¡t tÃ­nh toÃ n váº¹n dá»¯ liá»‡u táº¡i má»i Ä‘iá»ƒm cháº¡m, ngÄƒn cháº·n rÃ¡c dá»¯ liá»‡u vÃ  vi pháº¡m policy cáº¥p há»‡ thá»‘ng.

---

## 2. Technology Stack (CÃ´ng nghá»‡ Cá»‘t lÃµi)

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS v4, Zustand (Global State), React Query (Server State), Leaflet (Maps). PWA Support.
- **Backend:** Node.js (v22+, Native ESM), Express.js, TypeScript.
- **Database:** PostgreSQL (MÃ£ nguá»“n dá»¯ liá»‡u duy nháº¥t - SSOT), Prisma ORM, PostGIS.
- **Cache & Queue:** Redis, BullMQ.
- **Real-time:** Socket.io (Redis Adapter), PostgreSQL LISTEN/NOTIFY.
- **AI & Integrations:** Google Gemini 1.5 Flash (PhÃ¢n tÃ­ch dá»¯ liá»‡u), Zalo OA API (Cáº£nh bÃ¡o).
- **Observability:** OpenTelemetry (Distributed Tracing), Prometheus, Grafana, Pino (Structured Logging).

---

## 3. High-level Architecture (Kiáº¿n trÃºc cáº¥p cao)

Há»‡ thá»‘ng thiáº¿t káº¿ theo cÆ¡ cháº¿ **B2B SaaS Multi-tenancy**, sá»­ dá»¥ng **Clean Architecture** táº¡i Backend vÃ  **Event-Driven Microservices pattern**.

### 3.1 Data Flow Diagram (Luá»“ng dá»¯ liá»‡u)

```text
[PWA / Web App / Mobile] --- (HTTPS/WSS) ---> [Nginx Load Balancer / Proxy]
                                                      |
                                          +-----------+-----------+
                                          |                       |
                               [Express.js API Layer]      [PDF Service]
                                          |          (Isolated Puppeteer Worker)
                                          v
                               [Prisma ORM / Data Layer]
        +---------------------------------+---------------------------------+
        v                                 v                                 v
[PostgreSQL DB]                  [Redis Cluster]             [External APIs (Gemini/Zalo)]
(Master Data, RLS,             (BullMQ, Pub/Sub, Cache,       (AI Analysis, ZNS Notify)
 Outbox Events)                 Socket.io Adapter)
```

### 3.3. Data Storage & Single Source of Truth (SSOT)

- **PostgreSQL lÃ  trÃ¡i tim cá»§a há»‡ thá»‘ng (Single Source of Truth):** ToÃ n bá»™ dá»¯ liá»‡u nghiá»‡p vá»¥ (Staff, Task, Incident, PatrolLog, Evidence, vÃ  tráº¡ng thÃ¡i Real-time) Báº®T BUá»˜C lÆ°u trá»¯ vÃ  xá»­ lÃ½ táº¡i PostgreSQL.
- **NGHIÃŠM Cáº¤M kiáº¿n trÃºc Dual-source / Firebase:** Tuyá»‡t Ä‘á»‘i KHÃ”NG Sá»¬ Dá»¤NG Firebase (Firestore, Realtime DB) cho báº¥t ká»³ tÃ­nh nÄƒng nÃ o. Viá»‡c báº£o vá»‡ toÃ n váº¹n dá»¯ liá»‡u (Data Integrity) vÃ  cÃ´ láº­p dá»¯ liá»‡u (Tenant Isolation qua RLS) diá»…n ra Ä‘á»“ng nháº¥t 100% táº¡i level database (PostgreSQL). PhÃ¡t sinh event real-time sáº½ Ä‘Æ°á»£c xá»­ lÃ½ qua PostgreSQL `LISTEN/NOTIFY` (Outbox Pattern) vÃ  Pub/Sub qua Redis/Socket.io.

### 3.4 Infrastructure & Scaling (Háº¡ táº§ng & Kháº£ nÄƒng Má»Ÿ rá»™ng)

- **Horizontal Scaling & Connection Pooling:** Layer API cháº¡y Ä‘a replica (`replicas: 2+`). Database scale báº±ng connection pool (PgBouncer/Supavisor) á»Ÿ cháº¿ Ä‘á»™ Transaction Mode, cho phÃ©p phá»¥c vá»¥ hÃ ng chá»¥c ngÃ n requests vá»›i sá»‘ lÆ°á»£ng DB Connection nhá».
- **Microservices-lite:** TÃ¡ch biá»‡t tÃ¡c vá»¥ náº·ng nhÆ° Render PDF (Puppeteer) ra khá»i HTTP Request Lifecycle chÃ­nh (Ä‘áº©y qua port Ä‘á»™c láº­p hoáº·c container khÃ¡c) Ä‘á»ƒ khÃ´ng gÃ¢y block Event Loop.
  - **SSRF Hardening (v4.38.1):** Ãp dá»¥ng **Strict Port Allowlist** cho PDF Service. Chá»‰ cho phÃ©p truy cáº­p ngÆ°á»£c láº¡i API ná»™i bá»™ táº¡i Port 3000. Má»i ná»— lá»±c truy cáº­p vÃ o cÃ¡c port dá»‹ch vá»¥ háº¡ táº§ng khÃ¡c (Redis, DB, Monitoring ná»™i bá»™) tá»« PDF Service sáº½ bá»‹ cháº·n Ä‘á»©ng táº¡i táº§ng Logic Validation, Ä‘áº£m báº£o an toÃ n tuyá»‡t Ä‘á»‘i cho máº¡ng ná»™i bá»™.
- **WebSocket Resilience (v4.38.3):** Cá»§ng cá»‘ háº¡ táº§ng Real-time báº±ng cÆ¡ cháº¿ **Multi-layered Rate Limiting**. NgÄƒn cháº·n táº¥n cÃ´ng DoS vÃ  spam thÃ´ng qua WebSocket báº±ng cÃ¡ch giá»›i háº¡n tá»•ng lÆ°u lÆ°á»£ng (Global Limit: 30 events/s) vÃ  cÃ¡c hÃ nh Ä‘á»™ng nháº¡y cáº£m (Join Tenant: 5 events/min) thÃ´ng qua Redis.
- **Active Session Revocation (v4.38.4):** Cáº£i thiá»‡n cÆ¡ cháº¿ thu há»“i quyá»n truy cáº­p báº±ng cÃ¡ch giáº£m TTL cá»§a auth metadata cache (60s) vÃ  triá»ƒn khai **Active Invalidation** trong cÃ¡c UseCase quáº£n trá»‹ nhÃ¢n sá»±. Äáº£m báº£o má»i thay Ä‘á»•i vá» tráº¡ng thÃ¡i tÃ i khoáº£n cÃ³ hiá»‡u lá»±c tá»©c thÃ¬, báº£o vá»‡ há»‡ thá»‘ng khá»i cÃ¡c tÃ i khoáº£n Ä‘Ã£ bá»‹ vÃ´ hiá»‡u hÃ³a.
- **Seeding Security (v4.38.2):** Loáº¡i bá» hoÃ n toÃ n plaintext password trong script khá»Ÿi táº¡o (Seed). Báº¯t buá»™c sá»­ dá»¥ng biáº¿n mÃ´i trÆ°á»ng (`SEED_SUPERADMIN_PASSWORD`) Ä‘á»ƒ cáº¥u hÃ¬nh máº­t kháº©u quáº£n trá»‹, Ä‘áº£m báº£o tÃ­nh váº¹n toÃ n ngay cáº£ khi source code bá»‹ rÃ² rá»‰.
- **L1/L2 Caching & Coalescing Strategy (SCMD Pro v4.0.5):**
  - **L1 (In-Process Coalescing):** Sá»­ dá»¥ng cÆ¡ cháº¿ Single-flight (thÃ´ng qua `authMetadataLocks` Map) Ä‘á»ƒ gá»™p cÃ¡c request Ä‘á»“ng thá»i tá»« cÃ¹ng má»™t ngÆ°á»i dÃ¹ng vÃ o má»™t DB query duy nháº¥t trong vÃ²ng Ä‘á»i cá»§a má»™t Process. LÆ°u Ã½: ÄÃ¢y lÃ  cÆ¡ cháº¿ local-to-node; trong mÃ´i trÆ°á»ng multi-replica, cÃ¡c process khÃ¡c nhau váº«n cÃ³ thá»ƒ thá»±c hiá»‡n query DB song song cho cÃ¹ng má»™t metadata trÆ°á»›c khi Cache L2 ká»‹p populate. Quyáº¿t Ä‘á»‹nh nÃ y giÃºp tá»‘i Æ°u Latency báº£o vá»‡ Database mÃ  khÃ´ng cáº§n overhead tá»« Distributed Locking.
  - **L2 (Distributed Cache - Redis):** LÆ°u trá»¯ metadata xÃ¡c thá»±c, tráº¡ng thÃ¡i Tenant vÃ  phÃ¢n quyá»n (TTL: 1h + Jitter 0-5m). Äá»“ng bá»™ hÃ³a thÃ´ng bÃ¡o vÃ´ hiá»‡u hÃ³a cache (Invalidation) giá»¯a cÃ¡c Node thÃ´ng qua Redis Pub/Sub.
  - **Thundering Herd & Exponential Backoff Guard (v4.33.16):** CÆ¡ cháº¿ Ä‘á»“ng bá»™ hÃ³a `CacheManager.wrap()` báº¯t buá»™c sá»­ dá»¥ng cáº¥u trÃºc Exponential Backoff (`Math.min(50 * Math.pow(2, attempt), 500)`) khi xá»­ lÃ½ lock miss. Chiáº¿n lÆ°á»£c nÃ y giÃºp triá»‡t tiÃªu hiá»‡n tÆ°á»£ng dá»™i bom poll liÃªn tá»¥c vÃ o Redis, giáº£m lÃ£ng phÃ­ CPU cho Node.js Event Loop, vÃ  phÃ¢n máº£nh cÃ¡c request tá»›i cÃ¹ng khÃ³a bá»™ nhá»› Ä‘á»‡m, báº£o vá»‡ tá»‘i Ä‘a Database Cluster vÃ  Caching Layer.

### 3.3 Multitenancy & Data Isolation (CÃ´ láº­p Dá»¯ liá»‡u Multi-Tenant)

- **Subdomain-based Routing & Identification:** PhÃ¢n Ä‘á»‹nh danh tÃ­nh workspace qua biáº¿n `tenantId` láº¥y tá»« Subdomain (VÃ­ dá»¥: `vincom.scmdpro.com`).
- **Prisma Middlewares (VÃ¡ch ngÄƒn Logic):** ToÃ n bá»™ truy váº¥n Database tá»« Use Cases báº¯t buá»™c Ä‘i qua vÃ¡ch ngÄƒn `db.forTenant(tenantId)`, DB Extension sáº½ ngáº§m Ä‘á»‹nh gáº¯n `WHERE tenantId = ...` vÃ o má»i layer.
- **PostgreSQL Row-Level Security (RLS) & DB Users:** (Tier PRO MAX) Táº­n dá»¥ng RLS táº§ng Database Ä‘á»ƒ ngÄƒn lá»™ lá»t dá»¯ liá»‡u ngay cáº£ khi code cÃ³ lá»—i Injection.

---

## 4. Technical Invariants (Quy táº¯c Ká»¹ thuáº­t Báº¥t biáº¿n)

### 4.1 Database Performance & Data Integrity

- **Optimized Indices:** CÃ¡c báº£ng siÃªu lá»›n (nhÆ° `audit_logs`, `patrol_logs`) báº¯t buá»™c cÃ³ cÃ¡c Composite Index (`[tenantId, createdAt, status]`).
- **Pagination Standard:** XÃ³a sá»• `offset/skip`. Báº¯t buá»™c dÃ¹ng **Cursor-based Pagination** (vá»›i `take`, `cursor`) trÃªn táº¥t cáº£ Feed (Timeline, SOC Incident) cÃ³ biáº¿n Ä‘á»™ng thá»i gian thá»±c (trÃ¡nh duplicates/missing items do insert má»›i).
- **Read Replica & CQRS Lite Pattern:** ToÃ n bá»™ Query thuáº§n tÃºy (`GET` APIs, Repository Read-only methods) Báº®T BUá»˜C pháº£i truyá»n flag `{ readOnly: true }` vÃ o `db.withTenant(...)` hoáº·c `db.forTenant(...)`. TÃ­nh nÄƒng nÃ y sáº½ Ä‘iá»u hÆ°á»›ng request sang Connection Pool cá»§a **Read Replica** (thÃ´ng qua `DATABASE_READ_URL`), nháº±m giáº£i phÃ³ng Ã¡p lá»±c táº£i trÃªn Primary Database chuyÃªn dá»¥ng cho cÃ¡c Transaction Write.
- **Relational Aggregation:** BÃ¡o cÃ¡o tuáº§n/thÃ¡ng sá»­ dá»¥ng SQL Native, xá»­ lÃ½ dáº¡ng Batch hoáº·c Materialized View thay vÃ¬ Query O(N) vá» RAM cá»§a Node.js.
- **Database-Level Data Integrity (Enums):** Æ¯u tiÃªn Native PostgreSQL Enums (thÃ´ng qua Prisma Enum) thay vÃ¬ Ä‘á»‹nh dáº¡ng cá»™t `String` cho cÃ¡c trÆ°á»ng phÃ¢n loáº¡i/tráº¡ng thÃ¡i cá»‘t lÃµi (nhÆ° `Incident.status`, `Staff.role`, `Task.status`). Viá»‡c triá»ƒn khai Native Enums giÃºp tháº¯t cháº·t tÃ­nh toÃ n váº¹n dá»¯ liá»‡u (Data Integrity) á»Ÿ má»©c Storage (Single Source of Truth), Ä‘á»“ng thá»i táº­n dá»¥ng Enum Index Optimization cá»§a PostgreSQL khi truy váº¥n. QuÃ¡ trÃ¬nh chuyá»ƒn Ä‘á»•i tá»« String sang Enum Ä‘Æ°á»£c thá»±c hiá»‡n thÃ nh cÃ¡c migration nhá» Ä‘á»™c láº­p Ä‘á»ƒ giáº£m thiá»ƒu Downtime (Table Locking).
- **Strict Enum Matching (v4.38.5):** NghiÃªm cáº¥m tuyá»‡t Ä‘á»‘i sá»­ dá»¥ng JS string literals (e.g. `'reported'`, `'open'`) Ä‘á»ƒ so sÃ¡nh hoáº·c gÃ¡n giÃ¡ trá»‹ cho cÃ¡c cá»™t Enum cá»§a Prisma (nhÆ° `IncidentStatus`). Do TypeScript chá»‰ check type á»Ÿ compile time Ä‘á»‘i vá»›i `String`, nhÆ°ng DB yÃªu cáº§u chÃ­nh xÃ¡c Ä‘á»‹nh dáº¡ng Enum (khi compile thÃ¬ máº¥t mapping, sinh ra silent bugs á»Ÿ runtime logic). **Báº®T BUá»˜C** sá»­ dá»¥ng cÃ¡c Object property Enum chuáº©n xÃ¡c xuáº¥t ra tá»« Prisma Client (`IncidentStatus.REPORTED`). Quy táº¯c nÃ y Ã¡p dá»¥ng cho má»i táº§ng (Controller, Service, Workers).
- **Automated Two-Stage Integrity Monitoring (v4.20):**
  - **Giai Ä‘oáº¡n 1 (Structural - Synchronous):** ToÃ n bá»™ Request Mutation (Create/Update) Ä‘i qua Zod Validation vÃ  logic `IntegrityGuard`. Guard nÃ y thá»±c hiá»‡n cÃ¡c check: Quota Check (vÃ­ dá»¥: tá»‘i Ä‘a sá»‘ nhÃ¢n viÃªn), Reference Cross-check (Ä‘áº£m báº£o Ref IDs thuá»™c cÃ¹ng Tenant).
  - **Giai Ä‘oáº¡n 2 (Stateful - Asynchronous):** Sau khi Transaction hoÃ n táº¥t, há»‡ thá»‘ng sá»­ dá»¥ng Outbox Pattern Ä‘á»ƒ Ä‘áº©y sá»± kiá»‡n sang Workers. Workers sáº½ thá»±c hiá»‡n "Háº­u kiá»ƒm" (Integrity Audit) nháº±m phÃ¡t hiá»‡n cÃ¡c sai lá»‡ch tráº¡ng thÃ¡i phá»©c táº¡p mÃ  Giai Ä‘oáº¡n 1 bá» qua, hoáº·c Ä‘á»“ng bá»™ hÃ³a cÃ¡c Metrics tráº¡ng thÃ¡i liÃªn quan.
- **Performance & Query Optimization (v.4.33.17):**
  - **PostgreSQL Aggregation thay vÃ¬ N+1 / N-Query Memory Aggregation:** Tuyá»‡t Ä‘á»‘i khÃ´ng dÃ¹ng `include` Ä‘a táº§ng á»Ÿ cáº¥p Ä‘á»™ Repository Ä‘á»ƒ láº¥y hÃ ng váº¡n dÃ²ng vÃ  Ä‘áº¿m (`ShiftReconciliationUseCase`), hay dispatch hÃ ng loáº¡t Promise.all `count()` song song cÃ¹ng lÃºc láº¥y metrics (`StaffRepository.checkReputation`). Má»i tÃ­nh toÃ¡n Dashboard, thá»‘ng kÃª pháº£i cáº¥u trÃºc báº±ng Database-level aggregates qua hÃ m `db.model.groupBy` hoáº·c `Raw SQL COUNT(*) FILTER` Ä‘á»ƒ Ä‘áº©y khá»‘i lÆ°á»£ng tÃ­nh toÃ¡n vá» CSDL thay vÃ¬ Node.js Event Loop.
  - **Chá»‘ng Over-fetching trong Read-queries:** Báº¯t buá»™c Ã¡p dá»¥ng `.select` loáº¡i bá» viá»‡c Include toÃ n bá»™ data cÃ¢y tá»• chá»©c khÃ´ng cáº§n thiáº¿t.
  - **Idempotency High-Throughput (Redis-Backed):** Chuyá»ƒn dá»‹ch thiáº¿t káº¿ Idempotency Record sang chá»§ yáº¿u xá»­ lÃ½ báº±ng khÃ³a (SetNX) vÃ  tráº¡ng thÃ¡i cá»§a Redis vá»›i TTL 24h. Giáº£m tá»‘i Ä‘a lá»‡nh Hard-Upsert xuá»‘ng PostgreSQL trong cÃ¡c Transaction Flow cÆ°á»ng Ä‘á»™ ráº¥t lá»›n (Webhook, Checkpoint Syncing) Ä‘á»ƒ háº¡n cháº¿ triá»‡t Ä‘á»ƒ Database Write-Contention.

### 4.2 Reliability & Resilience

- **Outbox Pattern:** CÃ¡c giao dá»‹ch chÃ©o ranh giá»›i (vÃ­ dá»¥: LÆ°u log -> BÃ¡o cáº£nh bÃ¡o) Ä‘Æ°á»£c báº£o chá»©ng báº±ng báº£ng `outbox` trong cÃ¹ng DB Transaction, sau Ä‘Ã³ Ä‘Æ°á»£c phÃ¡t thÃ´ng qua cÆ¡ cháº¿ `PG LISTEN/NOTIFY` tá»›i worker, cam káº¿t **At-Least-Once Delivery**.
- **Robust API Error Handling:**
  - **Gateway Interceptor:** CÃ¡c lá»—i validation Zod vÃ  Exception khÃ´ng lÆ°á»ng trÆ°á»›c Ä‘á»u Ä‘Æ°á»£c báº¯t á»Ÿ cáº¥p Middleware Ä‘á»ƒ ngÄƒn lá»™ StackTrace. Error Response format chuáº©n má»±c: `{ error: { message, code, details, traceId } }`. Zod errors Ä‘Æ°á»£c pass toÃ n bá»™ issue list xuá»‘ng HTTP payload.
  - **Frontend Diagnostic Toasts:** `apiFetch` tá»± Ä‘á»™ng rÃ£ payload lá»—i (vÃ­ dá»¥: há»— trá»£ Ä‘á»c array `details` tá»« lá»—i Zod, ná»‘i format `[field] message`) Ä‘á»ƒ xuáº¥t ra thÃ´ng bÃ¡o toast cá»¥ thá»ƒ rÃµ rÃ ng mÃ  khÃ´ng Ä‘Ã²i há»i xá»­ lÃ½ `catch` dÆ° thá»«a tá»«ng API call Ä‘Æ¡n láº» á»Ÿ Component.
  - **Server Logging:** Má»i Exception chÆ°a Ä‘Æ°á»£c handle Ä‘á»u Ä‘Ã­nh kÃ¨m `traceId` (OpenTelemetry/Contextual metadata), ghi cáº¥u trÃºc qua `pino` giÃºp truy váº¿t log cross-stack (userId, tenantId).
- **Circuit Breaker (opossum):** Phá»§ trÃªn má»i Network Call ra ngoÃ i (Gemini AI, Zalo OA, Email). Má»Ÿ máº¡ch (Open) vÃ  rá»›t ngay sau N láº§n lá»—i, tráº£ payload lá»—i sanitized (khÃ´ng leak stack-trace), tá»± Ä‘á»™ng retry thÄƒm dÃ² sau má»™t thá»i gian cáº¥u hÃ¬nh (Half-Open).
- **AI Cost Control (Má»›i v4.0.0):** Triá»ƒn khai Application-level throttle (`aiLimiter` vÃ  `aiQuotaTracking`) cho toÃ n bá»™ cÃ¡c endpoint `/ai/*` (Gemini API) nháº±m báº£o vá»‡ háº¡n má»©c chi phÃ­ AI (ngÄƒn cháº·n Tenant/DDoS vÆ°á»£t háº¡n má»©c). Cáº¥u hÃ¬nh tracking quota linh hoáº¡t qua `SystemConfig` (máº·c Ä‘á»‹nh 1000 lÆ°á»£t/thÃ¡ng).
- **Asynchronous Queues:**
  - _Light Worker (Concurrency: 30):_ Gá»­i Notification, Sync Cache, Audit Logs Trivial.
  - _Heavy Worker (Concurrency: 3):_ Render PDF, LLM Evaluation, Report XLS Generation.

### 4.3 Security & Zero-Trust Protocols

- **Security Critical Hardening (v5.1.1.19):** JWT access tokens are capped at 15 minutes, `/api/v1/monitor/metrics` requires explicit authentication plus Super Admin role, reCAPTCHA verification fails closed when configured upstream verification is unavailable, print tokens are scoped by document type, and upgrade approvals resolve the requested plan from trusted system metadata instead of title text.
- **Cookie Session Hardening (v5.6.1.2):** Frontend KHÃ”NG Ä‘Æ°á»£c persist JWT/refresh token nháº¡y cáº£m trong `localStorage`. Login/refresh phÃ¡t hÃ nh access token ngáº¯n háº¡n vÃ  refresh token qua `httpOnly`, `Secure` khi production, `SameSite` cookie. Mutating requests dÃ¹ng cookie-auth Báº®T BUá»˜C gá»­i double-submit CSRF token qua cookie `scmd_csrf` vÃ  header `x-csrf-token`; `/auth/refresh`, `/auth/logout` cÅ©ng pháº£i validate CSRF vÃ¬ Ä‘Ã¢y lÃ  public auth route khÃ´ng Ä‘i qua `requireAuth`. Client dÃ¹ng `credentials: 'include'`, chá»‰ giá»¯ metadata khÃ´ng nháº¡y cáº£m nhÆ° tenant/role/plan Ä‘á»ƒ Ä‘iá»u hÆ°á»›ng UI.
- **Zod & Zero-Trust Validation (Hardened v5.0.1.1):** 
  - **UseCase Level Enforcement:** KHÃ”NG chá»‰ validate á»Ÿ Controller. Má»i UseCase Báº®T BUá»˜C pháº£i thá»±c hiá»‡n `schema.parse(input)` ngay táº¡i entry point Ä‘á»ƒ báº£o vá»‡ ranh giá»›i Domain (Zero Trust Boundary).
  - **Input/Output Mapping:** Má»i endpoint báº¯t buá»™c cÃ³ validation payload tÆ°á»ng minh. KhÃ´ng tin tÆ°á»Ÿng dá»¯ liá»‡u FE.
  - **reCAPTCHA Resilience (v5.0.1.3):** Ãp dá»¥ng cÆ¡ cháº¿ **Fail-Open** cho toÃ n bá»™ cÃ¡c luá»“ng xÃ¡c thá»±c (Login & Trial Registration). Há»‡ thá»‘ng sáº½ bá» qua kiá»ƒm tra reCAPTCHA náº¿u Google API khÃ´ng thá»ƒ truy cáº­p, Ä‘áº£m báº£o dá»‹ch vá»¥ khÃ´ng bá»‹ giÃ¡n Ä‘oáº¡n do yáº¿u tá»‘ bÃªn thá»© ba.
- **RBAC & Attribute-Based Checks:** Há»‡ thá»‘ng cáº¥p phÃ©p phÃ¢n táº§ng (Tenant Staff, Tenant Admin, System Admin). KhÃ´ng bypass.
- **Data Mutation Audit Trail:** Má»i sá»­a Ä‘á»•i tráº¡ng thÃ¡i thá»±c thá»ƒ lÃµi pháº£i chÃ¨n dÃ²ng vÃ o `audit_logs` cÃ³ kÃ¨m tham chiáº¿u `traceId`.
- **Domain Error Handling:** (Má»›i v4.38.5) Ngá»«ng sá»­ dá»¥ng pattern string-matching (`throw new Error('NOT_FOUND: ...')`). Báº¯t buá»™c sá»­ dá»¥ng há»‡ thá»‘ng `DomainError` (e.g. `NotFoundError`, `BadRequestError`, `ForbiddenError` tá»« `domain.error.ts`) táº¡i táº§ng Use Case. `errorHandler` trung tÃ¢m sáº½ tá»± Ä‘á»™ng map vÃ  tráº£ vá» HTTP status code tÆ°Æ¡ng á»©ng Ä‘á»ƒ trÃ¡nh HTTP 500 lá»—i logic vÃ  tÄƒng type safety.

---

## 5. Domain Architectures (Äáº·c táº£ Kiáº¿n trÃºc Chá»©c nÄƒng Cá»‘t lÃµi)

### 5.1 Smart Patrol (Tuáº§n tra thÃ´ng minh & Chá»‘ng Gian Láº­n)

- **Anti-Fraud Mechanics (Hardened v5.0.1.1):**
  1. YÃªu cáº§u mÃ£ QR luÃ¢n chuyá»ƒn (QR Injection qua WebSocket).
  2. **GPS Forensic Verification**: Sá»­ dá»¥ng Haversine Formula cho kinh Ä‘á»™/vÄ© Ä‘á»™, max tolerance < 50m so vá»›i Checkpoint chá»§. Náº¿u vi pháº¡m, há»‡ thá»‘ng tá»± Ä‘á»™ng trigger `isValid: false` vÃ  dÃ¡n nhÃ£n `SUSPICIOUS` táº¡i Database metadata Ä‘á»ƒ phá»¥c vá»¥ háº­u kiá»ƒm.
  3. Image Timestamp & Hardware Signatures xÃ¡c thá»±c áº£nh upload.
- **Offline Reliability:** App PWA sá»­ dá»¥ng IndexedDB lÆ°u táº¡m cache tuáº§n tra náº¿u sáº­p máº¡ng. Sync Queue tá»± Ä‘á»™ng Ä‘áº©y dá»¯ liá»‡u khi `Navigator.onLine` active.

### 5.2 Real-time SOC (Security Operations Center)

- **State Transition:** Socket.io (cÃ³ Redis Adapter gáº¯n káº¿t Node Instances). Only Event-emitters. KhÃ´ng xá»­ lÃ½ business trong Socket Payload. Database Transaction lÃ  Ä‘iá»ƒm quyáº¿t Ä‘á»‹nh state, sau Ä‘Ã³ bÃ¡o `Notify` cho socket server update UI.
- **Presence & Heartbeat:** Cáº­p nháº­t tráº¡ng thÃ¡i "Äang lÃ m viá»‡c", "Máº¥t tÃ­n hiá»‡u" cá»§a nhÃ¢n viÃªn qua Redis `SETEX` keys.

### 5.3 The AI Watchdog (TrÃ­ Tuá»‡ NhÃ¢n Táº¡o)

- **LLM Governance:** KhÃ´ng truyá»n PII (Personally Identifiable Information) thÃ´ trá»±c tiáº¿p cho Gemini náº¿u khÃ´ng cáº§n thiáº¿t. Format prompts cáº¥u trÃºc JSON rÃµ rÃ ng.
- Sá»­ dá»¥ng Gemini API (Pro/Flash) Ä‘á»ƒ thá»±c thi Use cases: ÄÃ¡nh giÃ¡ hÃ nh vi báº£o vá»‡, PhÃ¢n tÃ­ch sÆ¡ Ä‘á»“ chuá»—i vi pháº¡m, Gá»£i Ã½ tá»± Ä‘á»™ng (Predictive Analysis) táº¡i Dashboard quáº£n trá»‹ viÃªn.

### 5.4 Vendor Evaluation (SLA Ngáº§m & ÄÃ¡nh giÃ¡ NhÃ  Tháº§u)

- **Time-Series SLAs:** TÃ­nh Ä‘iá»ƒm háº±ng ngÃ y thÃ´ng qua Job Cron (1:00 AM). Äiá»ƒm SLA bá»‹ trá»« tá»± nhiÃªn dá»±a trÃªn sá»‘ lá»—i Compliance bá»‹ vi pháº¡m trong ngÃ y. Report xuáº¥t theo thÃ¡ng lÃ  Data Aggregation, khÃ´ng tÃ­nh toÃ¡n Real-time Ä‘á»ƒ tiáº¿t kiá»‡m tÃ i nguyÃªn.

---

## 6. Observability & Operations (GiÃ¡m sÃ¡t & Quáº£n lÃ½)

### 6.1 Telemetry (Äo lÆ°á»ng tá»« xa)

- **Prometheus Exporter (`/api/v1/monitor/metrics`):** Thu tháº­p Throughput, Error Rate (% 5xx HTTP), Queue Depth (BullMQ backlog).
- **Distributed Tracing (OpenTelemetry):** Má»—i Request Ä‘Æ°á»£c Ä‘Ã­nh kÃ¨m `traceId`. `traceId` luÃ¢n chuyá»ƒn qua Prisma, Axios Outbound, Redis, BullMQ Job. Báº¥t cá»© Log lá»—i (`error.toISOString`) cÅ©ng cÃ³ `traceId` Ä‘á»ƒ filter log chÃ©o microservices trÃªn Grafana Loki hoáº·c Jaeger.

### 6.2 Disaster Recovery (KhÃ´i phá»¥c tháº£m há»a)

- **Data Backup:** Postgres tá»± Ä‘á»™ng thá»±c hiá»‡n WAL Archiving & Daily Snapshot.
- **Graceful Shutdown:** SIGTERM traps trÃªn Node.js Ä‘á»ƒ hoÃ n thÃ nh ná»‘t HTTP Requests & dá»«ng Queue Poll má»™t cÃ¡ch an toÃ n khÃ´ng máº¥t job (BullMQ Pause).

### 6.3 Cá»‘ Ä‘á»‹nh Äá»‹nh dáº¡ng Chá»¥p áº£nh & Chá»‘ng Giáº£ máº¡o (Anti-Spoofing Camera API) - v4.33.5

- **Live Evidence Capture:** Báº®T BUá»˜C sá»­ dá»¥ng MediaDevices API (`navigator.mediaDevices.getUserMedia`) Ä‘á»‘i vá»›i cÃ¡c tÃ­nh nÄƒng chá»¥p áº£nh lÃ m báº±ng chá»©ng (Sá»± cá»‘, Check-in, BÃ¡o cÃ¡o). NghiÃªm cáº¥m sá»­ dá»¥ng input type file truyá»n thá»‘ng Ä‘á»ƒ ngÄƒn cháº·n viá»‡c Guard upload áº£nh giáº£ máº¡o tá»« thÆ° viá»‡n (gallery).
- **Watermarking (Dáº¥u thá»i gian & Vá»‹ trÃ­):** Má»i áº£nh chá»¥p thÃ´ng qua luá»“ng Live Evidence pháº£i Ä‘Æ°á»£c Ä‘Ã­nh kÃ¨m trá»±c tiáº¿p thÃ´ng tin TimeStamp vÃ  GPS Coordinates trÃªn tháº» Canvas trÆ°á»›c khi Ä‘Æ°á»£c upload, táº¡o thÃ nh má»™t khung hÃ¬nh nguyÃªn khá»‘i. Äiá»u nÃ y giÃºp ngÄƒn cháº·n hoÃ n toÃ n viá»‡c can thiá»‡p Exif Data.
- **VÃ²ng Ä‘á»i tÃ i nguyÃªn (Memory/Battery Management):** Stream tá»« Camera pháº£i thá»±c thi Clean-up hook (táº¯t cÃ¡c Tracks) ngay láº­p tá»©c khi unmount Component Ä‘á»ƒ chá»‘ng rÃ² rá»‰ tÃ i nguyÃªn, suy giáº£m pin cá»§a thiáº¿t bá»‹.

---

## 8. Luá»“ng Nghiá»‡p vá»¥ & Logic Chi tiáº¿t (Detailed Business Flows)

### 8.1 Luá»“ng Onboarding & Trial (ÄÄƒng kÃ½ dÃ¹ng thá»­)

1. **Khá»Ÿi táº¡o:** User Ä‘Äƒng kÃ½ qua Form Trial. Há»‡ thá»‘ng validate reCAPTCHA v3 vÃ  Check Email trÃ¹ng láº·p.
2. **Provisioning:**
   - Táº¡o báº£n ghi `Tenant` vá»›i subdomain Ä‘á»‹nh danh.
   - Táº¡o `Staff` Ä‘áº§u tiÃªn vá»›i role `TENANT_ADMIN`.
   - Khá»Ÿi táº¡o `TenantSubscription` máº·c Ä‘á»‹nh gÃ³i `FREE`.
3. **Setup:** Admin thiáº¿t láº­p Checkpoints vÃ  gÃ¡n QR Codes cho cÃ¡c vá»‹ trÃ­ tuáº§n tra.

### 8.2 Luá»“ng Tuáº§n tra & Chá»‘ng gian láº­n (Patrol Workflow)

1. **Check-in:** NhÃ¢n viÃªn quÃ©t QR qua Mobile App (PWA).
2. **Validation:**
   - **GPS Guard:** Há»‡ thá»‘ng so sÃ¡nh tá»a Ä‘á»™ `(lat, lng)` cá»§a thiáº¿t bá»‹ vá»›i tá»a Ä‘á»™ Checkpoint Ä‘Ã£ lÆ°u. Sai sá»‘ > 50m sáº½ gáº¯n cá» `SUSPICIOUS`.
   - **QR Rotation:** MÃ£ QR cÃ³ thá»ƒ Ä‘Æ°á»£c cáº¥u hÃ¬nh thay Ä‘á»•i theo thá»i gian thá»±c (WebSocket) Ä‘á»ƒ ngÄƒn cháº·n viá»‡c chá»¥p áº£nh QR dÃ¡n táº¡i nhÃ .
3. **AI Analysis:** Káº¿t thÃºc ca trá»±c, dá»¯ liá»‡u Ä‘Æ°á»£c gá»­i sang Gemini API Ä‘á»ƒ phÃ¢n tÃ­ch hÃ nh vi (Check-in cÃ³ quÃ¡ nhanh khÃ´ng? CÃ³ bá» sÃ³t Ä‘iá»ƒm rá»§i ro khÃ´ng?).

### 8.3 Luá»“ng Xá»­ lÃ½ Sá»± cá»‘ (Incident Lifecycle)

1. **Reporting:** Chá»¥p áº£nh, mÃ´ táº£ sá»± cá»‘ táº¡i Checkpoint.
2. **Escalation:** System Ä‘áº©y Alert qua Zalo (ZNS) hoáº·c Socket.io tá»›i Manager.
3. **Resolution:** Manager phÃª duyá»‡t phÆ°Æ¡ng Ã¡n xá»­ lÃ½, cáº­p nháº­t tráº¡ng thÃ¡i `Resolved`. Má»i bÆ°á»›c Ä‘á»u lÆ°u `AuditLog`.

---

## 9. Chi tiáº¿t Háº¡ táº§ng & Logic Äáº·c biá»‡t (Specialized Logic)

### 9.1 Há»‡ thá»‘ng PDF Microservice (Managed Microservice)

- **CÆ¡ cháº¿:** Khi Admin yÃªu cáº§u xuáº¥t bÃ¡o cÃ¡o (CV, Patrol Report), API Server gá»­i yÃªu cáº§u (gá»i internal) tá»›i port `3001` (spawned node process).
- **Isolaton:** Puppeteer cháº¡y trong process riÃªng Ä‘á»ƒ Ä‘áº£m báº£o Memory Leak khÃ´ng lÃ m sáº­p API chÃ­nh.
- **Resilience:** Náº¿u Microservice lá»—i, Client sáº½ nháº­n Ä‘Æ°á»£c thÃ´ng bÃ¡o lá»—i cá»¥ thá»ƒ thay vÃ¬ timeout tráº¯ng trang.

### 9.2 Billing & Activation System (v4.32.2)

- **Manual Activation:** Super Admin kiá»ƒm tra mÃ£ Giao dá»‹ch (`PaymentRef`) vÃ  kÃ­ch hoáº¡t GÃ³i cÆ°á»›c.
- **Transaction Safety:** Viá»‡c cáº­p nháº­t gÃ³i cÆ°á»›c (`Subscription`) vÃ  táº¡o báº£n ghi Thanh toÃ¡n (`Payment`) Ä‘Æ°á»£c thá»±c thi trong má»™t `Prisma Transaction` duy nháº¥t.
- **Mock Data Visualization:** Há»‡ thá»‘ng cung cáº¥p bá»™ dá»¯ liá»‡u demo (táº¡i `.mock-data.json`) chá»©a cÃ¡c tráº¡ng thÃ¡i `Active`, `Expired`, `Pending` Ä‘á»ƒ kiá»ƒm thá»­ UI Dashboard Billing trá»±c quan.

### 9.3 Zero-Trust Data Layer (Row Level Security)

- **Tenant ID Bound:** ToÃ n bá»™ query Database lÃ  "Tenant-Aware". Developer khÃ´ng cáº§n viáº¿t `where tenantId = ...` thá»§ cÃ´ng nhá» cÆ¡ cháº¿ Global DB Extension.
- **RBAC Strictness:** Manager khÃ´ng thá»ƒ can thiá»‡p vÃ o cáº¥u hÃ¬nh Billing; Super Admin khÃ´ng thá»ƒ xem ná»™i dung Sá»± cá»‘ chi tiáº¿t cá»§a Tenant trá»« khi Ä‘Æ°á»£c cáº¥p quyá»n Ä‘áº·c biá»‡t.

---

## 10. Ká»‹ch báº£n Kiá»ƒm thá»­ & XÃ¡c thá»±c trÆ°á»›c Deploy (Pre-deployment Validation)

| ThÃ nh pháº§n           | Ká»‹ch báº£n Kiá»ƒm thá»­                                                                | Káº¿t quáº£ mong Ä‘á»£i                                                              |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Multi-tenancy**    | Truy cáº­p `/api/v1/tenant/staff` tá»« subdomain A nhÆ°ng dÃ¹ng Token cá»§a subdomain B. | **403 Forbidden** hoáº·c **404 Not Found** (RLS Block).                         |
| **Integrity Guard**  | Cá»‘ tÃ¬nh táº¡o 10 nhÃ¢n viÃªn trong khi GÃ³i cÆ°á»›c giá»›i háº¡n 2 ngÆ°á»i.                    | **402 Payment Required** hoáº·c Validation error.                               |
| **PDF Service**      | Xuáº¥t bÃ¡o cÃ¡o CV cá»§a nhÃ¢n viÃªn cÃ³ dung lÆ°á»£ng áº£nh lá»›n (> 5MB).                     | Microservice xá»­ lÃ½ á»•n Ä‘á»‹nh, khÃ´ng bá»‹ OOM, tráº£ vá» file PDF < 10s.              |
| **Billing UI**       | Super Admin kÃ­ch hoáº¡t gÃ³i cho má»™t Tenant rÃ¡c.                                    | Báº£ng thanh toÃ¡n cáº­p nháº­t Ä‘Ãºng ngÃ y háº¿t háº¡n, Audit log ghi nháº­n `activatedBy`. |
| **GPS Verification** | Mock GPS cÃ¡ch xa Checkpoint 500m vÃ  thá»±c hiá»‡n tuáº§n tra.                          | Dashboard hiá»‡n cáº£nh bÃ¡o Ä‘á» `SUSPICIOUS_FLAG`.                                 |

---

## 11. Kiáº¿n trÃºc Multi-Tenant Image Storage & Billing (V4.34.0)

Cáº­p nháº­t kiáº¿n trÃºc Storage Tiering sá»­ dá»¥ng S3-compatible API (R2) káº¿t há»£p vá»›i Time-weighted Billing.

### 11.1. Storage Architecture

- **Presigned URL Flow**: Client trá»±c tiáº¿p upload file thÃ´ng qua Presigned URL do API Server cáº¥p phÃ¡t, giáº£m thiá»ƒu 100% bandwidth upload cho há»‡ thá»‘ng Node.js.
- **Validation Strict**: Policy cá»§a Presigned URL giá»›i háº¡n cháº½ size (`content-length-range`) vÃ  chuáº©n MIME types Ä‘á»‹nh sáºµn theo yÃªu cáº§u á»©ng dá»¥ng Ä‘á»ƒ khÃ³a cháº·n file cÃ³ háº¡i.
- **Image Lifecycle Engine**: Quáº£n lÃ½ vÃ²ng Ä‘á»i áº£nh báº±ng DB (Pending -> Active -> Expired -> Deleting -> Deleted). DB lÃ  Source of Truth nháº±m ngÄƒn ngá»«a lá»—i Orphan Data hay Ghost Billing.

### 11.2. Time-weighted Usage Billing

- Ãp dá»¥ng mÃ´ hÃ¬nh Event-based cho Usage Billing (PostgreSQL báº£ng `tenant_usage_events`), ghi láº¡i má»i `delta_bytes` upload/delete.
- TÃ­nh toÃ¡n thÃ´ng lÆ°á»£ng lÆ°u trá»¯ tá»± Ä‘á»™ng hÃ³a, replayable khÃ´ng phá»¥ thuá»™c vÃ o tÃ¬nh tráº¡ng cloud storage táº¡i cÃ¡c báº£n snapshot point.

### 11.3. Outbox Pattern

- Async task: `IMAGE_UPLOADED` vÃ  `IMAGE_DELETED` Ä‘Æ°á»£c trigger tá»›i BullMQ thÃ´ng qua Event Outbox pattern tá»« PostgreSQL, cÃ¡ch ly Node layer Ä‘á»‘i vá»›i Data consistency. MÃ´i trÆ°á»ng Heavy Worker tiáº¿p tá»¥c audit dá»n dáº¹p cÃ¡c Orphan chunks dÆ° thá»«a.

---

## 12. Global Audit Log & Accountability (V4.36.0)

Nháº±m Ä‘áº£m báº£o tÃ­nh minh báº¡ch vÃ  trÃ¡nh tranh cháº¥p trÃ¡ch nhiá»‡m (non-repudiation) vá»›i khÃ¡ch hÃ ng/tenant, há»‡ thá»‘ng Ã¡p dá»¥ng cÆ¡ cháº¿ giÃ¡m sÃ¡t **Global Audit Log** cho Super Admin. QuÃ¡ trÃ¬nh triá»ƒn khai yÃªu cáº§u triá»‡t tiÃªu hoÃ n toÃ n rá»§i ro ká»¹ thuáº­t (Hardening).

### 12.1. Cá»‘t lÃµi thiáº¿t káº¿ (Architecture Design)

- **Centralized Cross-Tenant View**: Bá»• sung API `GET /api/v1/sys-manage/audit-logs` táº¡i node Super Admin khai thÃ¡c `db.system().auditLog.findMany()`. ÄÃ¢y lÃ  ngoáº¡i lá»‡ cÃ³ kiá»ƒm soÃ¡t cá»§a quy táº¯c Tenant Isolation, báº¯t buá»™c pháº£i báº£o vá»‡ bá»Ÿi quyá»n `system:manage`.
- **Strict Bounding & Offset Elimination**: Truy váº¥n toÃ n cáº§u Ä‘á»‘i máº·t vá»›i hÃ ng chá»¥c triá»‡u dÃ²ng dá»¯ liá»‡u. Báº¯t buá»™c dÃ¹ng Cursor-based Pagination. Äáº·c biá»‡t, Ä‘á»ƒ ngÄƒn cháº·n **Full Table Scan** khi khÃ´ng cÃ³ `tenantId`, Database Báº®T BUá»˜C pháº£i táº¡o Index toÃ n cá»¥c `@@index([createdAt(sort: Desc)])` (nÃªn táº¡o báº±ng Concurrent Indexing).
- **Date Range Limiter**: Báº¯t buá»™c cÆ°á»¡ng Ã©p má»‘c thá»i gian tá»‘i Ä‘a `from/to` trong queries. Náº¿u client khÃ´ng truyá»n, há»‡ thá»‘ng tá»± Ä‘á»™ng gÃ¡n giá»›i háº¡n Ä‘á»™ phÃ¢n giáº£i tá»‘i Ä‘a 30/90 ngÃ y gáº§n nháº¥t (unbound history guard).

### 12.2. Kiá»ƒm soÃ¡t rá»§i ro báº£o máº­t & Dá»¯ liá»‡u

- **Recursive Data Scrubbing**: Viá»‡c lÃ m sáº¡ch Payload (Masking) pháº£i Ä‘á»‡ quy qua cÃ¡c node (ká»ƒ cáº£ Array táº¡i Root level) vÃ  trang bá»‹ bá»™ tá»« Ä‘iá»ƒn alias nghiÃªm ngáº·t (`pwd`, `passwd`, `pass`, `token`, vÃ¢n vÃ¢n).
- **Infinite Loop Prevention (Audit the Auditor)**: TrÃ¡nh Ä‘á»‡ quy sinh log rÃ¡c lÃ m phÃ¬nh to Data khi Super Admin thao tÃ¡c truy váº¥n Log, báº±ng cÃ¡ch thiáº¿t káº¿ báº£ng Schema áº©n danh hoáº·c Filter Ignore action type `SUPERADMIN_VIEW_GLOBAL_AUDIT_LOGS`.
- **Throttling & Rate-Limit**: Bá»• sung bá»™ Ä‘áº¿m Global Rate Limit (vÃ­ dá»¥: 30 requests/phÃºt) riÃªng cho endpoint cá»±c náº·ng nÃ y.
- **Data Cold Storage**: Báº£ng `audit_logs` sáº½ tá»± Ä‘á»™ng lÃªn lá»‹ch export ra cÃ¡c ná»n táº£ng Cold Storage (S3/R2 .parquet files) trÆ°á»›c khi thá»±c hiá»‡n xÃ³a (DELETE older than 180 days) nháº±m xoÃ¡ gÃ¡nh náº·ng DBMS mÃ  váº«n Ä‘áº£m báº£o Ä‘Æ°á»£c báº±ng chá»©ng náº¿u cÃ³ tranh cháº¥p trong tÆ°Æ¡ng lai.

---

## 13. CI/CD & Quality Assurance (Äáº£m báº£o cháº¥t lÆ°á»£ng)

Há»‡ thá»‘ng Ã¡p dá»¥ng quy trÃ¬nh kiá»ƒm soÃ¡t cháº¥t lÆ°á»£ng nghiÃªm ngáº·t thÃ´ng qua GitHub Actions.

### 13.1. CI Workflow

- **Linting**: Thá»±c thi `eslint . && tsc --noEmit` Ä‘á»ƒ Ä‘áº£m báº£o code sáº¡ch vÃ  type-safe.
- **Testing**: Cháº¡y toÃ n bá»™ bá»™ test `vitest` cho cáº£ logic Business vÃ  Security Rules.
- **Coverage Gate**: Vitest báº¯t buá»™c sinh bÃ¡o cÃ¡o `text` vÃ  `lcov` báº±ng provider `v8`; pipeline pháº£i fail náº¿u coverage tháº¥p hÆ¡n ngÆ°á»¡ng tá»‘i thiá»ƒu: branches 60%, functions 70%, lines 70%, statements 70%.
- **Migration Safety Guard**: Sá»­ dá»¥ng `prisma migrate diff` Ä‘á»ƒ phÃ¡t hiá»‡n schema drift. Náº¿u schema hiá»‡n táº¡i khÃ´ng khá»›p vá»›i lá»‹ch sá»­ migration, pipeline sáº½ bÃ¡o lá»—i (Exit 1).
- **Migration Lock**: Kiá»ƒm tra sá»± tá»“n táº¡i cá»§a `migration_lock.toml` Ä‘á»ƒ ngÄƒn cháº·n rá»§i ro race-condition khi migration database.
- **Build Verification**: Cháº¡y `npm run build` Ä‘á»ƒ xÃ¡c nháº­n bundle frontend vÃ  backend sáºµn sÃ ng cho production.

### 13.2. Environment Consistency

Pipeline CI sá»­ dá»¥ng PostgreSQL service thá»±c táº¿ (`postgres:15-alpine`) Ä‘á»ƒ cháº¡y cÃ¡c integration tests, Ä‘áº£m báº£o mÃ´i trÆ°á»ng test tiá»‡m cáº­n nháº¥t vá»›i production.

### Sprint 5 Vendor Scorecard and Monthly Acceptance (v5.5.0.0)

V.5.5.0.0 mo phase doi soat thuong mai cua Contract Compliance Engine bang cach dua ViolationEvent di het chang nghiep vu toi VendorScorecard, MonthlyAcceptanceReport, PenaltyItem va ViolationDispute. Scorecard va acceptance report duoc tong hop truc tiep tu PatrolSession, Incident va ViolationEvent trong PostgreSQL theo tenant scope, khong con dua vao so lieu mock.

- Them application flow de list/generate/finalize VendorScorecard va MonthlyAcceptanceReport theo tenant, vendor, contract, site va month.
- Tao PenaltyItem tu cac vi pham da duoc xac nhan va tach rieng ViolationDispute cho luong vendor phan hoi/review.
- Khi finalize report, he thong khoa incident evidence lien quan bang report-lock hien co va chot penalty item trong cung transaction tenant-scoped.
- Bo sung MONTHLY_COMPLIANCE job chay theo thang de tu dong sinh batch scorecard/report cho tenant PRO va ENTERPRISE co hop dong hieu luc trong ky.
- Bo sung export PDF va Excel-compatible CSV qua BullMQ heavy queue; artifact duoc luu qua Attachment category REPORT va phat lai qua endpoint tai xuong co kiem tra tenant scope.

