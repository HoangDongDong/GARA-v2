# KAZUKO AUTO — Bản bàn giao mã nguồn

Bản bàn giao ngày 13/10/2026, gồm mã nguồn hiện tại và dữ liệu cửa hàng **kazuko**. Đây là một bản độc lập: không trỏ vào database hoặc thư mục của dự án cũ.

## Thành phần

| Thư mục / file | Nội dung |
|---|---|
| `backend/` | API Node.js/Express, database Firebird, mẫu in và công cụ vận hành. |
| `frontend/` | Giao diện React/Vite và tài nguyên giao diện. |
| `print-agent/` | Mã nguồn Agent Windows, helper in PDF và script tạo bộ Setup. |
| `Test/` | Kiểm thử tự động và migration cần để bảo trì/khởi tạo cửa hàng. |
| `ops/` | Ba script/cấu hình nhỏ dành cho triển khai máy chủ Windows và backup. |
| `TaiLieu/` | Hướng dẫn sử dụng Word dành cho khách hàng. |
| `CaiDat.cmd` / `CaiDat.ps1` | Cài thư viện, chuẩn bị model tách nền, build bộ xuất PDF và cập nhật đường dẫn dữ liệu. |
| `ChayDuAn.cmd` | Mở backend và frontend sau khi cài đặt. |

Không kèm lịch sử Git, node_modules, log, ảnh/PDF kiểm tra, backup cửa hàng cũ, dữ liệu cửa hàng tạo thử, cache hoặc output build. Các model và thư viện tải được tạo lại ở bước cài đặt để bản mã nguồn gọn.

## Dữ liệu được bàn giao

- `backend/GARAGE.FDB`: dữ liệu kazuko hiện tại, ảnh đã nén, mẫu in và tài khoản hiện có.
- `backend/saas/platform-v1.fdb`: danh mục cửa hàng, chỉ còn cửa hàng ban đầu kazuko.
- `backend/saas/templates/seed-v6.fbk`: dữ liệu khởi tạo chuẩn cho chức năng tạo cửa hàng. **Đây là thành phần khởi tạo của chương trình, không phải bản backup của cửa hàng cũ.**
- `backend/saas/template-current.json`: phiên bản và hash của dữ liệu khởi tạo.

Database có thông tin khách hàng và chứng từ thật theo lựa chọn của chủ dự án. Không đưa các file dữ liệu này lên kho mã nguồn công khai. Tài khoản đăng nhập cửa hàng được giữ theo database; thông tin đăng nhập bàn giao riêng.

## Yêu cầu môi trường

- Windows 10 phiên bản 2004 trở lên hoặc Windows 11, 64-bit.
- Node.js 22 LTS và npm.
- Firebird Server 2.5, có công cụ `gbak`/`isql` khi sao lưu hoặc tạo cửa hàng.
- .NET SDK 8 hoặc mới hơn để build bộ in; .NET Desktop Runtime 8 để chạy các chương trình desktop đã build.
- Internet ở lần cài đầu để tải npm/NuGet và model tách nền ảnh.

## Cài đặt lần đầu

1. Đặt toàn bộ thư mục dự án tại vị trí muốn sử dụng.
2. Kiểm tra Firebird Server đang chạy.
3. Mở `backend/.env`, điều chỉnh `FB_HOST`, `FB_PORT`, `FB_USER`, `FB_PASSWORD` theo máy chủ Firebird. Bản đi kèm đặt mặc định `127.0.0.1:3050`, `SYSDBA/masterkey`.
4. Mở **CaiDat.cmd**, chờ cài thư viện và build hoàn tất.
5. Mở **ChayDuAn.cmd**.
6. Truy cập **http://localhost:5173** và đăng nhập cửa hàng **kazuko** bằng tài khoản hiện có.

Nếu muốn chạy bằng lệnh từ thư mục gốc:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\CaiDat.ps1
```

`CaiDat.ps1 -SkipImageModel` bỏ bước tải model tách nền khi chưa cần chức năng này. Sau đó có thể bổ sung bằng `npm --prefix frontend run prepare:part-images`. Không dùng tách nền ảnh cho đến khi model được chuẩn bị đầy đủ.

Designer desktop là tùy chọn; giao diện sửa mẫu trên web vẫn có trong ứng dụng. Muốn build cả Designer desktop, chạy `CaiDat.ps1 -BuildDesktopDesigner`. Designer desktop hiện dùng thư viện FastReport Demo theo mã nguồn gốc; bộ xuất PDF nghiệp vụ dùng FastReport Open Source riêng.

## Chạy và chuyển thư mục

`ChayDuAn.cmd` mở hai cửa sổ backend/frontend. Đóng các cửa sổ đó để dừng chương trình. Tránh chạy cùng lúc bản này và bản cũ trên cùng cổng 4000/5173.

Khi chuyển dự án sang thư mục/máy khác, giữ nguyên cấu trúc. `CaiDat.cmd` hoặc `ChayDuAn.cmd` tự cập nhật đường dẫn database của kazuko bằng `backend/tools/configure-handoff.js`.

Chạy riêng bằng hai terminal:

```powershell
cd backend
node tools/configure-handoff.js
npm run dev
```

```powershell
cd frontend
npm run dev
```

## Cấu hình riêng cho môi trường mới

- `.env` bàn giao không chứa API key Gemini, token email, secret phiên hoặc mật khẩu quản trị nền tảng của môi trường cũ.
- Muốn dùng nhận diện xe bằng AI, điền `GEMINI_API_KEY` hợp lệ.
- Secret phiên mới được tạo tại lần chạy đầu; tài khoản cửa hàng vẫn giữ theo database.
- Quản trị nền tảng cần thiết lập mật khẩu riêng ở giao diện thiết lập ban đầu trên localhost.
- Chức năng đăng ký cửa hàng mới đang tắt mặc định trong bản bàn giao. Cấu hình lại các biến `SAAS_*` nếu triển khai chức năng này.
- Không chạy toàn bộ migration trên dữ liệu thật. Database bàn giao đã có schema; chỉ chạy migration cụ thể khi nâng cấp có yêu cầu.

## Kiểm thử và build

Sau khi cài thư viện:

```powershell
npm --prefix Test test
npm --prefix frontend run build
dotnet publish backend/tools/fastreport-renderer/FastReportRenderer.csproj -c Release -o backend/tools/fastreport-renderer/bin/Renderer
```

Test Firebird/SaaS tích hợp chỉ chạy khi bật biến môi trường tương ứng; đọc từng test trước khi bật. Lệnh test thông thường không bật các test dữ liệu tích hợp này.

## GARA Print Agent

Mã nguồn và giấy phép thư viện Agent nằm trong `print-agent/`. Bộ Setup EXE có thể tạo lại bằng `print-agent/build-setup.ps1`, với Inno Setup Compiler và biến môi trường `GARA_SETUP_PASSWORD`. Không lưu mật khẩu Setup trong mã nguồn.

Ứng dụng có nút **Tải Agent** trong **In chứng từ**, trỏ trực tiếp tới bộ Setup đã bàn giao qua Drive. Khi thay phiên bản bộ cài, cập nhật link tại `frontend/src/components/PrintAgentControls.jsx`.

Agent được cài trên PC kết nối máy in, ghép một lần bằng mã Admin cấp, sau đó tự chạy cùng Windows. Hướng dẫn khách hàng nằm trong `TaiLieu/`.

## Kiểm tra trước bàn giao

- Đối chiếu nội dung 86 bảng nghiệp vụ và các bộ đếm sau khi backup/restore sang bản mới; dữ liệu khớp.
- Danh mục cửa hàng của bản bàn giao chỉ còn kazuko; đường dẫn trỏ vào database trong chính thư mục này.
- Frontend build thành công; renderer PDF và Designer desktop build thành công.
- 266 kiểm thử đạt, 20 kiểm thử tích hợp dữ liệu được bỏ qua theo cấu hình, không có kiểm thử thất bại.
- Kiểm tra API health, khách hàng, phụ tùng và danh sách mẫu in trả thành công; xuất thử hóa đơn bán hàng PDF từ database bàn giao thành công.
- Output build, thư viện đã cài và dữ liệu tạm của kiểm tra được dọn khỏi bản mã nguồn.

## Quản lý nhiều chi nhánh — cập nhật 14/10/2026

Bản hiện tại đã nâng cấp database kazuko và bật MULTIBRANCH_ENABLED. admin là chủ, KT1 giữ chi nhánh KAZUKO AUTO. Có thanh chọn chi nhánh, phân quyền, cấu hình riêng và chuyển kho. Khách/xe/danh mục dùng chung; chứng từ/kho/thu chi được phân phạm vi.

- Kế hoạch và nhật ký: TaiLieu/KE_HOACH_QUAN_LY_NHIEU_CHI_NHANH.md.
- HDSD khách hàng: TaiLieu/HUONG_DAN_NHIEU_CHI_NHANH.md.
- Kiểm thử Firebird chỉ chạy trên bản khôi phục *.branch-test.fdb ngoài source qua Test/firebird/check_multi_branch.js; tuyệt đối không dùng GARAGE.FDB vận hành làm fixture.
- Các thư mục node_modules/dist/bin/cache và log sinh khi cài/chạy vẫn là output có thể tạo lại; backup kiểm chứng và database thử của đợt phát triển được đặt ngoài KAZUCOGARA.
- Thu hộ/chuyển xe/giá riêng chưa mở; xem các lựa chọn và bước tiếp theo trong kế hoạch. Seed đăng ký tenant cũ chưa nâng cấp tự động; đăng ký SaaS vẫn tắt. Khi tạo tenant mới phải nâng cấp schema và chỉ định chủ/chi nhánh chính trước khi bật dùng.
