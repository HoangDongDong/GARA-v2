# Kiểm thử và migration

- `backend/tests`: kiểm thử backend và nghiệp vụ.
- `frontend/tests` / `frontend/fixtures`: kiểm thử giao diện/logic và dữ liệu mẫu của test.
- `print-agent/tests`: kiểm thử Agent và ledger.
- `firebird/migrate_*.js`: migration cần cho bảo trì và khởi tạo dữ liệu.
- `firebird/tools/saas-*.js`: công cụ khởi tạo/kiểm tra SaaS.

Chạy từ thư mục gốc sau khi cài dependencies:

```powershell
npm --prefix Test test
npm --prefix Test run test:backend
npm --prefix Test run test:frontend
npm --prefix Test run test:print-agent
```

Test dùng thư viện tại `backend/node_modules` và `frontend/node_modules`, không cần cài node_modules riêng trong Test. Các test Firebird/SaaS tích hợp cần bật biến môi trường riêng và phải đọc nội dung trước khi chạy.

Không chạy tất cả migration/seed trên dữ liệu thật. Database bàn giao đã sẵn sàng. Giữ thư mục migration vì quy trình khởi tạo cửa hàng mới dùng một số module ở đây.

Log, ảnh/PDF kiểm tra, bản sao cấu hình và script thử một lần đã được loại khỏi bản bàn giao.
