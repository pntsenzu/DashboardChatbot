# Senzu Chatbot UI Dashboard

Dự án giao diện Dashboard quản lý Chatbot Messenger cho Senzu, xây dựng trên Next.js App Router, Tailwind CSS, và tích hợp Senzu Data API.

## Tính năng chính
1. **Tổng quan (Overview)**: KPI 7 ngày gần nhất, xu hướng hiệu suất, sự kiện cần chú ý, trạng thái bot Messenger.
2. **Hội thoại (Conversations)**: Danh sách hội thoại (tìm kiếm, lọc theo trạng thái), khung xem tin nhắn chi tiết, xem dòng thời gian AI xử lý tin nhắn.
3. **Khách hàng (Customers)**: Quản lý khách hàng, phân loại mức độ quan tâm (ý định mua, cân nhắc, mới, không hoạt động), lịch sử mua hàng, và ghi chú nhân viên (Server Action `insertCustomerNote`).
4. **Lưu lượng & Hiệu suất (Volume & Latency)**: Thống kê tin nhắn vào/ra theo giờ/ngày, ma trận giờ cao điểm (Heatmap 7x24), độ trễ phản hồi (trung bình, trung vị, p90).
5. **Sản phẩm (Products)**: Sản phẩm được quan tâm nhiều nhất, phân loại câu hỏi (giá, thông số, còn hàng, mua hàng), cảnh báo sản phẩm khách hỏi ngoài catalog.
6. **Tri thức & Trạng thái Bot (Knowledge & Status)**: Giám sát trạng thái Chrome, Messenger connection, thời gian nạp tri thức và đồng bộ sản phẩm.

## Cấu hình OpenCode
Dự án được tích hợp sẵn file cấu hình OpenCode agent tại `.opencode/` với 3 skills:
- `senzu-data-api`: Tài liệu & quy ước RPC 37 hàm.
- `senzu-ui-design-spec`: Quy chuẩn thiết kế HSL, thang font, layout.
- `github-automation`: Quy trình Git commit & GitHub CLI.

## Chạy thử nghiệm
```bash
npm install
npm run dev
```
Trình duyệt truy cập: `http://localhost:3000`
