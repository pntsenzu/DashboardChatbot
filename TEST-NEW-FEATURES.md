# Test Cases — Tính năng mới implement

- **Phạm vi:** commit `9b2ebcf` `fix(security): chi mo unsafe-eval trong dev…` + commit `fcdbcb0` `feat(analytics): dung 10 ham backend da san cho UI (nhom R) + bo loc ngay trang khach hang`
- **Ngày tạo:** 09/10/2026
- **Số case:** 49 (A: 7 · B: 18 · C: 13 · D: 3 · E: 8)
- **Cột Status:** `PASS` · `FAIL` · `BLOCKED` · `SKIP` — để trống khi chưa chạy
- **Cột Actual/Notes:** ghi lại giá trị/hiện tượng thực tế, kèm màn hình nếu FAIL

---

## 0. Chuẩn bị môi trường

| Hạng mục | Cách làm |
|---|---|
| Chạy dev | `npm run dev` → `http://localhost:3000` |
| Chạy production | `npm run build` rồi `npx next start` (bắt buộc test **cả hai** — case A05) |
| Đăng nhập | Middleware yêu cầu Google OAuth khi cấu hình `GOOGLE_CLIENT_ID/SECRET` (và luôn yêu cầu ở production) |
| Ngôn ngữ | Nút `VI` / `日本語` ở header (cookie `senzu-locale`) |
| Dữ liệu thật (09/10/2026) | 3 khách; **"Hôm nay" chưa có hoạt động** → dùng để test trạng thái rỗng; "Hôm qua" có2 khách |
| Trạng thái sự kiện | Chưa có sự kiện open trong7 ngày → section sự kiện trên `/` hiển thị EmptyState là **đúng**, không phải lỗi |

### Tham chiếu nhanh:10 hàm nhóm R → trang kiểm thử

| # | Hàm Backend | Trang | Case |
|---|---|---|---|
|1 | `getOpenAttentionItems` | `/` (và badge trên `/customers`) | B01–B04, B14 |
|2 | `getCustomersPerBucket` | `/volume` | B05–B07 |
|3 | `getConversationVolumeTrend` | `/volume` | B08–B10 |
|4 | `getInterestSignalsTrend` | `/products` | B11 |
|5 | `getCustomerActivityTrend` | `/customers` | B13 |
|6 | `getCustomerActivityStats` | `/customers` | B12 |
|7 | `getTotalCustomersLifetime` | `/customers` | B12 |
|8 | `getAllCustomers` | `/customers?tab=all` | B15 |
|9 | `getCustomerPurchaseSignal` | `/customers/[id]` | B18 |
|10 | `getCustomerOpenAttention` | `/customers/[id]` | B16–B17 |

---

## A. Tương tác nút bấm (sửa lỗi CSP — regression)

| Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| A01 | DateRangeFilter `/volume` | Mở `/volume` → bấm nút "30 ngày" | URL thêm `?range=last30`; biểu đồ + KPI tải theo kỳ30 ngày; trang không nháy trắng | | | |
| A02 | DateRangeFilter `/products` | Mở `/products` → bấm "Tháng trước" | URL `?range=lastMonth`; số liệu đổi theo kỳ | | | |
| A03 | TrendChart đổi kiểu đồ | Trên `/volume` bấm "Đường" rồi "Cột" | Biểu đồ đổi dạng **ngay tại chỗ** (không reload); nút đang chọn có `aria-pressed="true"` | | | |
| A04 | TrendChart đổi kiểu đồ | Lặp lại A03 ở `/products` và `/customers` | Giống A03 | | | |
| A05 | CSP / console | F12 → tab Console, chạy **cả** `npm run dev` **và** `npm run build && npx next start`, mở các trang ở mục A | Không có lỗi `Refused to evaluate a string as JavaScript… 'unsafe-eval'`; không có `pageerror`; mọi nút bấm được | | | Prod CSP phải KHÔNG chứa `unsafe-eval` |
| A06 | Kỳ tùy chọn (form GET) | `/customers` → bấm "Tùy chọn" → từ `01/09/2026` đến `15/09/2026` → "Áp dụng" | URL `?range=custom&from=2026-09-01&to=2026-09-15`; mô tả kỳ = `01/09/2026 – 15/09/2026` | | | |
| A07 | Chuyển tab | `/customers` → bấm "Danh bạ toàn cục" rồi quay lại | Hai tab đổi trạng thái bình thường (không đơ) | | | |

---

## B. Nhóm R —10 hàm Backend đã sẵn, UI mới dùng

### B.1 Trang tổng quan `/` — `getOpenAttentionItems`

| Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| B01 | Section thống kê sự kiện | Mở `/` → section "Sự kiện cần chú ý theo loại & theo ngày" | Có "Phân bố theo loại sự kiện" (từng loại kèm số lượng + %) và biểu đồ "Số sự kiện theo ngày (giờ VN)";6 loại `AttentionEventType` đều có nhãn tiếng Việt đúng nghĩa | | | |
| B02 | Lọc theo kỳ | So danh sách sự kiện với dữ liệu API | Chỉ lấy sự kiện `createdAtMs >= now - 7 ngày`; không có sự kiện cũ hơn7 ngày | | | |
| B03 | Trạng thái rỗng | Kỳ không có sự kiện open (trạng thái hiện tại) | Hiện EmptyState mô tả, **không** đổ lỗi, **không** vẽ biểu đồ toàn số0 | | | |
| B04 | Trục X đủ mọi ngày | Hover các cột trên biểu đồ timeline | Trục X liệt kê **mọi ngày** trong kỳ (kể cả ngày0), tooltip dạng `DD/MM · Tên loại: n` | | | |

### B.2 Trang `/volume` — `getCustomersPerBucket`, `getConversationVolumeTrend`

| Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| B05 | Số khách theo bucket | Mở `/volume` (kỳ >48h) → section "Số khách theo ngày" | Biểu đồ1 chuỗi "Khách riêng biệt"; mô tả "Mỗi khách chỉ tính một lần trong mỗi khung · giờ VN (UTC+7)"; **chỉ vẽ cột `incoming`** | | | `outgoing` luôn0, không được vẽ cột phụ |
| B06 | Kỳ theo giờ | Chuyển sang "Hôm nay" | Tiêu đề đổi thành "Số khách theo giờ"; nhãn trục X theo mẫu `DD/MM HH` | | | |
| B07 | Rỗng | Kỳ không có khách nhắn tin | "Chưa có khách nhắn tin trong kỳ đã chọn." | | | |
| B08 | Nguồn tin trả lời | Section "Nguồn tin trả lời theo ngày" | Mô tả dạng "AI đảm nhiệm **xx,x%** số tin trả lời trong kỳ"; biểu đồ2 chuỗi "Tin AI trả lời" và **"Tin trả lời khác (không phải AI)"** | | | `otherOutgoing` **không được** dịch là "nhân viên" |
| B09 | Không có dữ liệu trả lời | Chọn kỳ không có tin trả lời | Mô tả = "Chưa có tin trả lời trong kỳ để tính tỷ lệ AI" (**không hiện0%**); biểu đồ = "Chưa có dữ liệu tin trả lời trong kỳ đã chọn." | | | |
| B10 | Đổi kỳ | Đổi "7 ngày" → "30 ngày" | Cả2 section trên cập nhật theo kỳ | | | |

### B.3 Trang `/products` — `getInterestSignalsTrend`

| Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| B11 | Tín hiệu quan tâm | Section "Tín hiệu quan tâm theo ngày" | Biểu đồ **4 chuỗi**; trục X đủ mọi ngày trong kỳ; đổi kỳ → biểu đồ đổi theo | | | |

### B.4 Trang `/customers` — `getCustomerActivityTrend`, `getCustomerActivityStats`, `getTotalCustomersLifetime`, `getAllCustomers`

| Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| B12 | KPI độ phủ | Section "Tín hiệu quan tâm & độ phủ khách hàng" |3 KPI: "Tổng khách (mọi thời điểm)" (meta "Không giới hạn theo kỳ"), "Khách đã hỏi sản phẩm" + "Khách có tín hiệu đặt hàng" (meta "Trong kỳ đã chọn") | | | |
| B13 | Biểu đồ hoạt động | Section "Khách hoạt động theo ngày" |2 chuỗi "Khách mới" / "Khách quay lại"; kỳ không có hoạt động → "Chưa có khách hoạt động trong kỳ này." | | | |
| B14 | Badge cảnh báo theo dòng | Dòng khách có sự kiện open (bảng trong kỳ **và** danh bạ toàn cục) | Badge "N cần chú ý"; màu theo severity: `error` → đỏ, `warning` → vàng, `info` → xanh; nhiều sự kiện của1 khách gộp thành1 badge với N cộng dồn | | | |
| B15 | Danh bạ toàn cục | Bấm tab "Danh bạ toàn cục" (`?tab=all`) | Bảng ≤**200** khách; cột Tên/ID · Tổng tin · Tổng hội thoại · Lần cuối nhắn; sắp theo lần tương tác gần nhất; có badge cảnh báo; **không** có cột mức độ quan tâm | | | |

### B.5 Chi tiết khách `/customers/[id]` — `getCustomerPurchaseSignal`, `getCustomerOpenAttention`

| Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| B16 | Alert sự kiện của khách | Mở khách **có** sự kiện open | Alert "{n} sự kiện cần chú ý của khách này", liệt kê tối đa3 mục dạng "Loại · thời gian"; nếu nhiều hơn hiện "và {n} sự kiện khác…" | | | |
| B17 | Không có sự kiện | Mở khách không có sự kiện open | **Không** hiển thị alert (không chiếm chỗ) | | | |
| B18 | Tín hiệu mua hàng | Card "Tín hiệu mua hàng" | Hiện "Lượt hỏi sản phẩm" và "Lượt nhắc đặt hàng" + ghi chú "…suy ra từ hành vi hỏi, không phải đơn hàng đã xác nhận"; cả hai =0 → "Khách chưa đặt câu hỏi sản phẩm nào." | | | |

---

## C. Bộ lọc thời gian trang khách hàng

| Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| C01 | DateRangeFilter | Mở `/customers` |7 nút: Hôm nay · Hôm qua ·7 ngày ·30 ngày · Tháng này · Tháng trước · Tùy chọn; "7 ngày" đang chọn (`aria-pressed="true"`) | | | |
| C02 | Mô tả kỳ | Bấm "Hôm qua" | Mô tả = `08/10/2026 – 08/10/2026 · tối đa50 khách hoạt động trong kỳ` (cùng1 ngày) | | | |
| C03 | URL là nguồn sự thật | Chọn kỳ rồi refresh / bấm Back-Forward / copy link mở tab khác | Kỳ được giữ nguyên | | | |
| C04 | KPI khớp số dòng bảng | Chọn "Tháng trước" | "Tổng khách trong kỳ" **bằng** số dòng bảng (dữ liệu thật:2 =2); không còn hiện tượng KPI >0 nhưng bảng trống | | | Đây là lỗi đã sửa — regression bắt buộc |
| C05 | Kỳ quá khứ không tính lố | So "Tháng trước" với "30 ngày" | Kỳ quá khứ chỉ đếm trong [đầu kỳ, kết thúc kỳ), không cộng phần sau ngày kết thúc | | | |
| C06 | Nội dung KPI | Đọc3 KPI đầu | "Khách hàng mới" + "Khách quay lại" = "Tổng khách trong kỳ" | | | |
| C07 | Kỳ trống nhất quán | Chọn "Hôm nay" (chưa có hoạt động) |3 KPI =0; biểu đồ "Chưa có khách hoạt động trong kỳ này."; bảng "Chưa có khách hàng nào trong kỳ" — cả3 đồng nhất | | | |
| C08 | Kỳ không hợp lệ | "Tùy chọn" → từ `15/09/2026` đến `01/09/2026` (đảo ngày) → "Áp dụng" | Hiện cảnh báo "Khoảng thời gian không hợp lệ — đã quay về kỳ mặc định."; rơi về7 ngày | | | |
| C09 | Giữ kỳ khi chuyển tab | Chọn "30 ngày" → "Danh bạ toàn cục" → "Hoạt động trong kỳ" | URL đi `?range=last30` → `?tab=all&range=last30` → `?range=last30`; kỳ **không** bị reset về7 ngày | | | |
| C10 | Danh bạ không bị lọc ngày | Ở tab "Danh bạ toàn cục" | Không có bộ lọc ngày; mô tả ghi "không giới hạn bởi bộ lọc ngày"; khách im lặng lâu ngày vẫn hiển thị | | | |
| C11 | Tin cuối ngoài kỳ | Kỳ quá khứ mà khách còn nhắn **sau** kỳ | Cột "Lần cuối nhắn" chỉ hiện ngày **trong kỳ**; không xác định được → hiện "—" kèm title "Không xác định được tin cuối trong kỳ đã chọn." | | | |
| C12 | Khách thiếu dữ liệu quan tâm | Khách có tin trong kỳ nhưng không có trong danh sách quan tâm | Vẫn hiện đủ1 dòng, badge "Chưa xác định" — **không mất khách** | | | |
| C13 | Thứ tự bảng | Xem thứ tự dòng trong kỳ | Sắp theo tin cuối **trong kỳ**, mới nhất nằm trên | | | |

---

## D. i18n (VI / JA)

| Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| D01 | Locale JA | Chuyển `日本語` → kiểm `/customers` | Nút lọc "今日/昨日/7日間/30日間/今月/先月/カスタム"; tab,6 KPI, badge, EmptyState đều tiếng Nhật; **không** còn sót tiếng VI hay giá trị `undefined` | | | |
| D02 | Locale VI | Chuyển `VI` | Ngược lại D01 — toàn bộ tiếng Việt | | | |
| D03 | Section mới ở JA | Ở `日本語` mở `/`, `/volume`, `/products`, `/customers/[id]` |6 nhãn `AttentionEventType`, "日別の返信ソース", "日別の関心シグナル", "購入シグナル", alert "この顧客には未対応のイベントが {n} 件あります" đều đã dịch | | | |

---

## E. Build, regression & QD

| Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|---|
| E01 | Type-check | `npx tsc --noEmit` | Exit0, không lỗi type | | | |
| E02 | Lint | `npm run lint` |0 warning /0 error | | | |
| E03 | Build | `npm run build` | Exit0;11 route kiểu `ƒ` (dynamic) | | | |
| E04 | Không sửa backend | `git show --stat9b2ebcf fcdbcb0` | Chỉ7 file UI/i18n/config; không có file RPC/backend | | | |
| E05 | Trang khác không vỡ | Mở `/`, `/conversations`, `/conversations/[id]`, `/knowledge`, `/login` | HTTP200, hiển thị bình thường, không lỗi console | | | |
| E06 | Responsive ≤640px | Thu nhỏ cửa sổ trên `/customers` và `/volume` | Bảng chuyển thành danh sách xếp chồng; nút bộ lọc chạm được (cao ≥44px nhờ `coarse:h-11`) | | | |
| E07 | A11y | Dùng Tab + Enter trên bộ lọc và nút đổi kiểu đồ | Thấy focus ring; nhóm nút có `role="group"` + `aria-label`; trạng thái chọn thể hiện qua `aria-pressed` | | | |
| E08 |10/10 hàm nhóm R | Đối chiếu bảng tham chiếu ở mục0 | Đủ10 hàm được UI gọi ở5 trang đã nêu | | | |

---

## Cách dán vào Google Sheets test log

Cột theo chuẩn: `Test ID | Feature | Bước kiểm tra | Expected | Actual | Status | Notes`.
Khi có kết quả, dùng MCP `google-sheets` → `add_rows` (append) hoặc `update_cells` để ghi `PASS`/`FAIL` vào cột **Status**, ghi `Actual` + `Notes` cho case FAIL.
