# KẾ HOẠCH QUẢN LÝ NHIỀU CHI NHÁNH DƯỚI MỘT CHỦ
Ngày lập: 13/10/2026. Dự án triển khai: D:/Garage/KAZUCOGARA.
Trạng thái: kế hoạch đã được yêu cầu triển khai. Theo dõi kết quả từng giai đoạn ở cuối tài liệu.

## 1. Mục tiêu và phạm vi
Một chủ/doanh nghiệp có một tài khoản quản trị tổ chức và nhiều chi nhánh. Chủ xem báo cáo toàn hệ thống hoặc từng chi nhánh; nhân viên chỉ thao tác trong chi nhánh được cấp. Tách kho, chứng từ, công việc, thu chi, công nợ theo nguồn phát sinh. Khách hàng, hồ sơ xe và danh mục hàng/dịch vụ dùng chung có kiểm soát.

Phạm vi gồm giao diện, API, Firebird, phân quyền, chuyển đổi dữ liệu cũ, mã phiếu, cấu hình, QR, Agent, màn hình phụ, báo cáo và kiểm thử. Không tạo một doanh nghiệp mới cho mỗi chi nhánh. Không xóa khách hàng/hóa đơn thật để làm lại dữ liệu.

## 2. Hiện trạng đã xác minh
- SaaS hiện có một database cho mỗi cửa hàng đăng ký độc lập. Trong bản bàn giao chỉ còn tenant legacy / mã kazuko.
- DCUAHANG lưu chi nhánh; cột CODE, NAME, DIACHI, DIENTHOAI, EMAIL đã có.
- Cột DCUAHANGID đã tồn tại ở DKHOHANG, TDONHANG, TNHAPKHO, TTIEPNHANXE, TLENHSUACHUA, THOADONSUACHUA, TTHUCHI, TBANGLUONG và TTRANGTHAIXE.
- TNGUOIDUNGTHEOCUAHANG đã tồn tại với ID, SUSERID, DCUAHANGID, STATUS và thông tin tạo/sửa; tại thời điểm khảo sát chưa có bản ghi.
- TBAOGIA, TBAOHANH, TCHITIETTHANHTOAN chưa có DCUAHANGID trong metadata đã khảo sát.
- Kho đã có thông tin chi nhánh nhưng stock.js chưa áp dụng kiểm tra quyền chi nhánh xuyên suốt.
- PRINT_ROUTES đang có khóa TYPEKEY toàn doanh nghiệp; PRINT_STATIONS chưa gắn chi nhánh.
- SNUMBERCOUNTER đang đếm theo CODE, chưa tách theo chi nhánh.
- ISADMIN hiện là quyền toàn database; không được dùng trực tiếp để cho quản lý chi nhánh vượt phạm vi.
- Mục quỹ tiền mặt có định nghĩa trên giao diện; phải kiểm tra bảng thực tế trước khi chọn cách bổ sung schema.
- Nhiều API lấy dữ liệu bằng ID hoặc tổng hợp toàn database, chưa có bộ lọc phạm vi thống nhất.

Không thêm trùng các cột đã có. Khảo sát lại metadata ngay trước migration vì database có thể đã thay đổi.

## 3. Mô hình tổ chức
    Hệ thống SaaS
      Doanh nghiệp/chủ A -> database A
        Chi nhánh A1 -> kho, giao dịch, nhân viên, máy in
        Chi nhánh A2 -> kho, giao dịch, nhân viên, máy in
      Doanh nghiệp/chủ B -> database B
        Chi nhánh B1 ...

Giữ tenant/database làm ranh giới doanh nghiệp; DCUAHANG là ranh giới chi nhánh bên trong tenant. Không gộp database của hai chủ khác nhau. Việc một người quản lý nhiều doanh nghiệp độc lập là mở rộng riêng.

## 4. Quy tắc bắt buộc
1. Mọi giao dịch mới thuộc đúng một chi nhánh; ID lấy từ ngữ cảnh đã được server xác minh.
2. Chứng từ đã ghi nhận không được đổi chi nhánh bằng sửa thông thường.
3. Một nhân viên được cấp một hoặc nhiều chi nhánh; mặc định không có quyền nếu chưa được cấp.
4. Chủ được xem toàn tổ chức; khi ghi dữ liệu vẫn phải chọn một chi nhánh cụ thể.
5. Không có chế độ ghi vào “Tất cả chi nhánh”.
6. Không chỉ lọc danh sách: đọc chi tiết, ảnh, sửa, hủy, thanh toán, in, xuất file đều phải kiểm tra.
7. Chi tiết chứng từ thừa hưởng phạm vi từ chứng từ cha; không tin ID chi nhánh do client gửi.
8. Kho, tài khoản/quỹ, máy in và nhân viên được tham chiếu phải hợp lệ trong phạm vi giao dịch.
9. Không dựa vào localStorage, việc ẩn nút hoặc ISADMIN để bảo vệ dữ liệu.
10. Không thay đổi cách tính VAT, phí dịch vụ, giảm giá và trạng thái sửa chữa ngoài phạm vi chi nhánh. POS bán phụ tùng vẫn không tính phí dịch vụ.
11. Mã số cũ, liên kết ảnh, snapshot báo giá và dữ liệu tài chính cũ được giữ.

## 5. Dữ liệu dùng chung và dữ liệu riêng
| Dữ liệu | Phạm vi | Quy tắc |
|---|---|---|
| Khách hàng, xe | Doanh nghiệp | Dùng chung thông tin cơ bản; lịch sử/chứng từ chỉ lộ trong phạm vi được xem |
| Hàng hóa, dịch vụ, đơn vị, hãng xe | Doanh nghiệp | Một mã dùng chung; giá riêng chi nhánh là lớp override |
| Nhân viên và tài khoản | Doanh nghiệp | Phân công nhiều chi nhánh qua bảng liên kết |
| Kho và vị trí kho | Chi nhánh | Mỗi kho thuộc một chi nhánh; vị trí thuộc kho |
| Tiếp nhận, báo giá, lệnh sửa, hóa đơn | Chi nhánh | Ghi chi nhánh tại lúc lập; giữ suốt vòng đời |
| Phiếu nhập/xuất, tồn kho | Chi nhánh/kho | Tính từ chuyển động thật theo kho |
| Công nợ | Chi nhánh phát sinh + tổng tổ chức | Khách dùng chung nhưng dư nợ được phân tích theo chứng từ |
| Quỹ tiền mặt | Chi nhánh | Số dư đầu kỳ và giao dịch riêng |
| Tài khoản ngân hàng | Tổ chức hoặc chi nhánh | Tài khoản dùng chung có số dư thật chung, không nhân số dư đầu kỳ lên nhiều lần |
| Lương/hoa hồng | Chi nhánh thực hiện + nhân viên | Không tính trùng khi nhân viên làm nhiều nơi |
| Mẫu in | Doanh nghiệp, có override | Mẫu mặc định, thông tin đầu phiếu, QR chọn theo chi nhánh |
| Agent, máy in, màn hình phụ | Chi nhánh | Không gửi phiếu A đến trạm B nếu chưa được phép |
| Audit | Tổ chức và chi nhánh | Có người thực hiện, chi nhánh, chứng từ, hành động |

## 6. Vai trò và quyền
| Vai trò | Phạm vi | Quyền dự kiến |
|---|---|---|
| Chủ doanh nghiệp | Toàn tổ chức | Tạo/ngừng chi nhánh, cấp quyền, xem tổng hợp, cấu hình tổ chức |
| Quản trị tổ chức | Các quyền được chủ giao | Quản lý theo phạm vi được cấp; không tự trở thành chủ |
| Quản lý chi nhánh | Chi nhánh được cấp | Nhân sự, chứng từ, báo cáo, máy in trong chi nhánh |
| Thu ngân | Chi nhánh được cấp | POS, thu tiền, in, thu chi theo quyền nghiệp vụ |
| Cố vấn | Chi nhánh được cấp | Tiếp nhận, báo giá, xác nhận và theo dõi |
| Kỹ thuật viên | Chi nhánh được cấp | Công việc/phân công được phép |
| Thủ kho | Kho thuộc chi nhánh được cấp | Nhập, xuất và chuyển kho theo quyền |
| Kế toán | Một hoặc nhiều chi nhánh | Công nợ, thu chi, đối chiếu theo quyền |

Giữ quyền nghiệp vụ bitmask Xem/Thêm/Sửa/Xóa/In; bổ sung quyền tổ chức và phạm vi chi nhánh. Quyền hiệu lực = tài khoản hoạt động + tenant hợp lệ + chi nhánh được cấp + quyền nghiệp vụ. Quyền giá vốn/lương/hoa hồng và xuất dữ liệu vẫn được kiểm tra riêng.

Không tự nâng mọi tài khoản ISADMIN thành chủ. Xác định tài khoản chủ hiện tại; các tài khoản quản trị cũ phải được rà soát và cấp phạm vi rõ ràng. Chủ có quyền mọi chi nhánh của chính tổ chức, không vượt sang tenant khác.

## 7. Thay đổi Firebird: giữ, sửa, thêm, bỏ
### 7.1 Giữ và chuẩn hóa DCUAHANG
Giữ ID và các thông tin cũ. Chuẩn hóa CODE duy nhất trong tổ chức. Đề xuất bổ sung ISMAIN, LOGO/config theo chi nhánh, địa chỉ liên hệ và cờ hoạt động cần thiết. Kho mặc định có thể dùng DCUAHANG.DKHOHANGID hiện có; kiểm tra kho đó thực sự thuộc chi nhánh. Chỉ một chi nhánh chính.

Ngừng sử dụng thay cho xóa chi nhánh đã có phát sinh. PARENTID cũ không được hiểu là quan hệ tenant mới.

### 7.2 Tận dụng TNGUOIDUNGTHEOCUAHANG
Giữ bảng đang có, thêm liên kết SUSER/DCUAHANG, unique cặp người dùng–chi nhánh sau khi xử lý bản ghi trùng. Có thể thêm SGROUPUSERID nếu cần vai trò khác nhau theo từng chi nhánh và ISDEFAULT cho chi nhánh mặc định. Chỉ một mặc định hoạt động trên mỗi tài khoản, kiểm tra trong transaction.

Bổ sung SUSER.ORGROLE hoặc mô hình quyền tổ chức tương đương: OWNER, ORG_ADMIN, STAFF. Không dùng mặc định OWNER; tài khoản cũ được ánh xạ có kiểm soát.

Thêm bảng TNHANVIENCHINHANH cho nhân viên làm nhiều chi nhánh nếu chưa có bảng tương đương. Gồm nhân viên, chi nhánh, khoảng hiệu lực, trạng thái và vai trò công việc. Không ép một nhân viên chỉ có một chi nhánh.

### 7.3 Giao dịch
| Bảng | Đã có cột chi nhánh? | Việc cần làm |
|---|---|---|
| TDONHANG | Có | Backfill, FK/index, kiểm tra kho xuất/nhập và mọi route |
| TNHAPKHO | Có | Backfill, FK/index, chi tiết thuộc kho của chi nhánh |
| TTIEPNHANXE | Có | Gắn chi nhánh bắt buộc khi tạo |
| TLENHSUACHUA | Có | Đồng nhất với tiếp nhận/báo giá, kiểm tra ở chuyển trạng thái |
| THOADONSUACHUA | Có | Thừa hưởng lệnh sửa; không lấy chi nhánh mới trên client |
| TTRANGTHAIXE | Có | Đồng nhất với lệnh/tiếp nhận |
| TTHUCHI | Có | Xác định chi nhánh thu/chi thực tế và quỹ/tài khoản |
| TBANGLUONG | Có | Phân bổ thu nhập/hoa hồng, không chốt trùng |
| TBAOGIA | Chưa thấy | Thêm DCUAHANGID, giữ nguyên phiên bản báo giá |
| TBAOHANH | Chưa thấy | Thêm DCUAHANGID; ghi nơi lập/tiếp nhận xử lý |
| TCHITIETTHANHTOAN | Chưa thấy | Thêm chi nhánh nguồn nợ/thu thực tế và liên kết phiếu thu khi cần |

TPHATSINHSUACHUA, TPHANCONGNHANVIEN, TTRANGTHAIANH, TLICHSUTRANGTHAI và các bảng chi tiết lấy phạm vi qua chứng từ cha. Chỉ thêm cột chi nhánh vào bảng con khi có lý do hiệu năng/audit và phải ràng buộc khớp cha. TXUATPHUTUNG bắt buộc kiểm tra cả lệnh sửa và kho.

### 7.4 Kho, quỹ và tài khoản
- DKHOHANG.DCUAHANGID đã có: backfill và ràng buộc, không thêm trùng.
- DVITRIKHO thừa hưởng từ DKHOHANG; không dùng vị trí hiện tại của mã hàng để suy ra chi nhánh giao dịch cũ.
- Tạo/hoàn thiện DQUYTIENMAT theo metadata thực tế, gồm ID, CODE, NAME, DCUAHANGID, SODUDAU, STATUS và audit. Bổ sung liên kết quỹ vào giao dịch nếu còn thiếu.
- Với ngân hàng, tạo liên kết tài khoản–chi nhánh hoặc đánh dấu phạm vi ORG/BRANCH; không dùng trường CHINHANH của ngân hàng làm chi nhánh gara vì đây là tên chi nhánh ngân hàng.
- Thêm bảng cấu hình DCHINHANHCONFIG: DCUAHANGID, NAME, kiểu giá trị, TEXTVALUE/INTVALUE/DECIMALVALUE/BLOBVALUE cần thiết, VERSION và audit; unique (chi nhánh, tên cấu hình). Giá trị thiếu kế thừa SCONFIG tổ chức.
- Thông tin in, tài khoản nhận QR và lời cảm ơn có thể override theo chi nhánh; không nhân bản toàn bộ SCONFIG vô điều kiện.

### 7.5 Mã phiếu
Theo yêu cầu cập nhật ngày 14/10/2026, số phiếu dùng mẫu cấu hình và SNUMBERCOUNTER chung tổ chức. SBRANCHCOUNTER đã tạo trước đây được giữ trong schema để tương thích, không còn dùng để cấp số phiếu mới.

Số mới không tự thêm tiền tố mã chi nhánh, ví dụ BH26/00001 nếu đó là mẫu đang cấu hình. Mã cũ giữ nguyên. Không đổi ID hay NAME của phiếu cũ. Mã khách hàng, mặt hàng, dịch vụ, nhân viên vẫn dùng bộ đếm chung tổ chức. Khóa bộ đếm và ghi phiếu trong cùng transaction; kiểm tra số đã có trên bảng gốc của tổ chức để chống trùng giữa chi nhánh và phiếu đã hủy, không trả dữ liệu phiếu ngoài phạm vi người dùng. Tìm kiếm hỗ trợ mã cũ và mã mới.

### 7.6 Agent và in
- Thêm DCUAHANGID vào PRINT_PAIRINGS, PRINT_STATIONS và PRINT_JOBS.
- PRINT_PRINTERS thừa hưởng chi nhánh qua STATIONID; các truy vấn phải join trạm.
- PRINT_ROUTES hiện chỉ có TYPEKEY: chuyển sang khóa (DCUAHANGID, TYPEKEY) hoặc tạo PRINT_BRANCH_ROUTES rồi chuyển dần.
- Idempotency của job gắn tenant + chi nhánh + người dùng + khóa request.
- Không sửa toàn bộ AppId bộ Setup chỉ vì thêm chi nhánh. Agent có thể giữ ghép cũ khi ánh xạ chi nhánh được kiểm chứng; nếu không rõ thì thu hồi/ghép lại có thông báo.
- Token Agent được server ánh xạ về trạm/chi nhánh. Không cho Agent tự khai chi nhánh để claim PDF của nơi khác.

### 7.7 Chuyển kho/chuyển xe
Tạo TCHUYENKHO và TCHUYENKHOCT nếu chưa có bảng tương đương. Header: mã, chi nhánh/kho nguồn, chi nhánh/kho đích, trạng thái, thời điểm, người xuất/nhận. Chi tiết: mã hàng, đơn vị, lượng gửi/nhận, giá vốn snapshot. Có khóa chống gửi trùng và audit.

Tạo TCHUYENXE hoặc lịch sử điều phối tương đương nếu hỗ trợ chuyển một lượt sửa giữa chi nhánh. Không sửa chi nhánh phiếu đã chốt. Phương án an toàn: đóng bàn giao tại nơi cũ, tạo lượt liên kết tại nơi mới, giữ hóa đơn/phát sinh của từng nơi.

### 7.8 Audit và migration
Thêm/hoàn thiện TBRANCHAUDIT và bảng/version migration tương đương. Audit ghi chi nhánh nguồn/đích, người thực hiện, hành động, entity ID và thời điểm; không ghi mật khẩu, token hoặc toàn bộ ảnh/PDF.

### 7.9 Phần được bỏ hoặc thay thế
- Bỏ việc hiểu danh mục DCUAHANG là chỉ thông tin không ảnh hưởng nghiệp vụ.
- Bỏ các đường đọc/ghi giao dịch toàn database khi người dùng không có phạm vi tổng hợp.
- Bỏ bộ đếm/máy in mặc định toàn hệ thống cho các chứng từ cần tách chi nhánh, sau khi chuyển xong.
- Bỏ cache không có tenant/chi nhánh trong khóa.
- Không xóa bảng SaaS, không xóa các bảng nghiệp vụ, không xóa dữ liệu lịch sử.
- Chỉ drop cột/constraint/bảng cũ khi đã chứng minh không còn tham chiếu, có migration hai chiều hoặc backup kiểm chứng và có danh sách cụ thể. Giai đoạn đầu ưu tiên thêm và backfill.

## 8. Ràng buộc và tương thích Firebird 2.5
- Tên bảng/index/constraint/trigger không vượt 31 ký tự.
- Dùng SMALLINT cho cờ; không áp dụng cú pháp BOOLEAN/IDENTITY hoặc cú pháp chỉ có ở bản Firebird mới.
- Migration kiểm tra RDB$ metadata trước khi thêm cột/constraint; không dựa vào ADD COLUMN IF NOT EXISTS.
- Thêm cột nullable trước, backfill và đối chiếu rồi áp dụng ràng buộc. Firebird 2.5 không có ALTER COLUMN SET NOT NULL như Firebird 3; chọn CHECK (DCUAHANGID IS NOT NULL) hoặc phương án rebuild đã được thử trên bản sao, không sửa trực tiếp system table.
- FK về DCUAHANG/SUSER dùng đúng kiểu và character set của ID hiện có.
- Kiểm tra index/unique hiện tại trước khi thêm. Index gợi ý (DCUAHANGID, STATUS, NGAY) trên bảng giao dịch phù hợp, (DCUAHANGID, STATUS) trên kho và membership; chọn theo explain/plan thực tế.
- CHECK phải nêu IS NOT NULL khi cần bắt buộc; không dựa vào biểu thức chấp nhận UNKNOWN.
- Sao lưu bằng gbak và khôi phục thử. Không copy FDB đang mở bằng sao chép file thông thường.
- Giữ transaction ngắn, thứ tự khóa ổn định để hạn chế deadlock; có retry có giới hạn cho xung đột hợp lệ.

Tài liệu cú pháp đối chiếu: [Firebird 2.5 Language Reference — ALTER TABLE](https://firebirdsql.org/file/documentation/html/en/refdocs/fblangref25/firebird-25-language-reference.html#fblangref25-ddl-tbl-alter). Các lưu ý cú pháp trên cần được xác nhận lại trên chính Firebird đang dùng trước migration.

## 9. Middleware và hợp đồng API
Thứ tự: xác thực tài khoản -> xác định tenant -> nạp quyền tổ chức/membership -> xác định branch -> kiểm tra quyền nghiệp vụ -> gọi service.

Dùng ngữ cảnh request/AsyncLocalStorage riêng cho chi nhánh. Không gắn trạng thái mutable “chi nhánh hiện tại” lên connection pool để request khác dùng nhầm.

- GET /api/branches: chỉ danh sách chi nhánh được phép; chủ xem tất cả.
- POST/PUT /api/branches: quyền tổ chức; ngừng sử dụng thay cho xóa khi có phát sinh.
- GET/PUT /api/admin-access/users/:id/branches: quản lý membership trong quyền được cấp.
- GET /api/auth/me: trả organization, role tổ chức, allowedBranches và defaultBranchId cùng quyền nghiệp vụ.
- Các request nghiệp vụ gửi X-Branch-Id; server xác minh ID và tự gắn chi nhánh khi tạo.
- Truy vấn tổng hợp dùng scope=all hoặc danh sách chi nhánh rõ ràng; chỉ trên API đọc/báo cáo được hỗ trợ.
- Không tin DCUAHANGID từ body, query hoặc token cũ chưa kiểm tra.
- ID không thuộc phạm vi đọc trả 404 để tránh lộ tồn tại; yêu cầu chọn chi nhánh không được cấp trả 403.
- Chi nhánh ngừng sử dụng: cho đọc lịch sử theo quyền, chặn giao dịch mới; không âm thầm chuyển về nơi khác.

Các API list/detail/update/delete/image/pdf/export/history đều phải có kiểm tra. Không đưa lọc chi nhánh vào regex sửa SQL tự động. Mỗi service dùng helper phạm vi và JOIN/bind params có whitelist.

## 10. Giao diện và phiên làm việc
- Header có bộ chọn Chi nhánh, chỉ liệt kê nơi được cấp. Chủ có chế độ “Toàn hệ thống” cho dashboard/báo cáo.
- Màn nghiệp vụ luôn hiển thị chi nhánh đang thao tác.
- Khi đổi chi nhánh có dữ liệu chưa lưu: hỏi lưu/giữ bản nháp hoặc bỏ trước khi chuyển; không chuyển giỏ hàng sang kho nơi khác.
- Danh sách chi nhánh có thêm phân công tài khoản, kho, máy in, quỹ và tài khoản nhận tiền.
- Phân quyền có lựa chọn phạm vi và vai trò; một người được nhiều chi nhánh.

Giữ branchId theo từng tab/sessionStorage, hoặc một cơ chế tương đương đã kiểm thử đa tab. Hai tab có thể làm ở A/B mà không ghi đè nhau. Khi đổi branch: hủy request cũ, xóa cache theo phạm vi, reset form, đổi khóa idempotency. Phản hồi A về muộn không được thay dữ liệu B. Quyền bị thu hồi phải có hiệu lực server ngay, không chỉ đợi frontend tải lại.

## 11. Bán hàng POS
- Kho và tồn chỉ của chi nhánh đang chọn; mỗi dòng kiểm tra kho trước khi chốt.
- Không sử dụng tồn của B để bán ở A. Kho âm tuân cấu hình của đúng kho/chi nhánh.
- Phiếu mới nhận branchId server; phiếu đã lưu giữ nguyên branch.
- Các thống kê nhanh, danh sách phiếu, khách nợ và trả hàng/hủy nếu có phải lọc đúng chi nhánh.
- Giỏ hàng, ngày bán, giá riêng, giảm giá, VAT và tài khoản thu tiền được kiểm chứng cùng phạm vi.
- Giá chung giữ nguyên; override giá chi nhánh không làm thay đơn giá/giá vốn của chứng từ đã lưu.
- QR/màn hình khách lấy cùng số tiền và chi nhánh với bill.

## 12. Sửa chữa và điều phối
- Tiếp nhận -> báo giá -> xác nhận -> đang sửa -> giao xe -> hoàn thành cùng chi nhánh.
- Báo giá ban đầu giữ snapshot, việc khách chọn/bỏ không thay lịch sử báo giá.
- Kỹ thuật viên/phụ tùng/phát sinh chỉ được chọn trong phạm vi phù hợp.
- Mọi thao tác chuyển bước, thanh toán, phân công, ảnh trạng thái, in thực tế và bảo hành phải kiểm tra phiếu cha.
- Xe/khách dùng chung; một xe có nhiều lượt lịch sử tại nhiều chi nhánh. Người không có quyền không thấy tiền, ảnh, nhân sự hoặc chứng từ của chi nhánh khác.
- Nếu chuyển xe giữa nơi A/B: có xác nhận bàn giao, thời điểm và liên kết lượt mới; không dời toàn bộ lịch sử A sang B.
- Hồ sơ đang làm dở không được mất khi đổi bộ chọn chi nhánh.

## 13. Kho và chuyển hàng
Tồn tính từ một định nghĩa chuyển động dùng chung cho POS, sửa chữa, nhập kho, báo cáo và chuyển kho. Chi nhánh xác định qua kho đã được kiểm chứng.

Chuyển kho:
1. A lập nháp, chọn kho nguồn A và kho đích B thuộc cùng tổ chức.
2. Gửi/duyệt theo quyền; khóa và kiểm tra tồn.
3. Khi xuất thực tế, trừ nguồn và ghi lượng đang vận chuyển.
4. B nhận toàn bộ hoặc một phần; chỉ lượng nhận được mới cộng vào kho B.
5. Phần thiếu/hỏng/hoàn được ghi bằng nghiệp vụ đối chiếu, không chỉnh số âm thủ công.
6. Hủy nháp chưa xuất không tạo chuyển động. Phiếu đã xuất không xóa; hoàn bằng nghiệp vụ đảo có dấu vết.

Tồn toàn tổ chức cần bao gồm “đang vận chuyển” khi đối chiếu. Chuyển nội bộ không là doanh thu, không tự phát sinh VAT bán hàng. Không tạo một phiếu nhập giả và một hóa đơn bán giả để chuyển chi nhánh. Hai request đồng thời không được xuất vượt tồn hay nhận hai lần cùng một lượng.

## 14. Thu chi, công nợ và tài khoản dùng chung
- Doanh thu/nợ gốc thuộc chi nhánh lập hóa đơn.
- Tiền mặt thuộc quỹ tại nơi thu/chi thực tế.
- Khách hàng có tổng nợ tổ chức và số nợ từng chi nhánh; không sao chép khách sang nhiều bản ghi chỉ để chia nợ.
- Tài khoản ngân hàng dùng chung chỉ có một số dư đầu kỳ và một số dư thật. Báo cáo theo chi nhánh hiển thị phần giao dịch, không giả định đó là số dư tài khoản riêng.
- Thanh toán một lần cho nhiều hóa đơn cần phân bổ, tổng phân bổ không vượt tiền thực nhận và dư nợ.

Thu hộ giữa chi nhánh phải là một chức năng có quyền riêng:
1. Ghi rõ chi nhánh thu thực tế và chi nhánh phát sinh hóa đơn.
2. Một phiếu thu tiền thực tế; nhiều dòng phân bổ nếu cần.
3. Giảm nợ từng hóa đơn theo dòng phân bổ, không nhân phiếu thu.
4. Doanh thu vẫn ở nơi lập hóa đơn; tiền/quỹ ở nơi nhận thực tế.
5. Có báo cáo đối soát nội bộ.

Trong phiên bản đầu, nếu chưa hoàn thành thu hộ thì chặn rõ ràng việc thu nợ khác chi nhánh. Không âm thầm gán cùng một branchId cho cả dòng tiền và doanh thu.

Rà lại cashbook.js, bankBalances.js và finance: hiện có nhiều nguồn invoice/payment/voucher; phải có nguồn chuẩn và khóa sự kiện để không cộng cùng tiền hai lần khi bổ sung phiếu thu và phân bổ.

## 15. Nhân viên, lương và hoa hồng
- Một hồ sơ nhân viên có thể được phân công nhiều chi nhánh theo thời gian.
- Hoa hồng thừa hưởng chi nhánh lệnh thực hiện; điều kiện hoàn thành/thu đủ hiện tại được giữ.
- Lương cơ bản của một người không cộng lặp vì xuất hiện ở hai nơi.
- Nếu cần chia chi phí lương giữa các chi nhánh, ghi tỷ lệ phân bổ có hiệu lực, tổng 100%; bảng lương tổng chỉ chốt một lần.
- Khi ngừng việc/thu hồi chi nhánh: chặn phiên thao tác mới nhưng giữ lịch sử phân công và tiền đã tính.
- Quyền xem lương/giá vốn/hoa hồng vẫn tách khỏi quyền xem báo cáo tổng.

## 16. In, QR, cấu hình và màn hình phụ
- Tên/địa chỉ/điện thoại trên phiếu phản ánh đúng chi nhánh; có thương hiệu chủ chung.
- Phiếu lịch sử dùng snapshot hoặc chính sách tái in đã định nghĩa, không tự đổi địa chỉ khi sửa cấu hình.
- Mẫu mặc định: override chi nhánh -> mẫu mặc định tổ chức -> báo lỗi nếu không có; không lấy máy in của nơi khác làm fallback.
- QR lấy tài khoản được cấp cho chi nhánh, số tiền đúng phần cần thu hiển thị trên bill; dùng chung hàm làm tròn. Nếu thay quy tắc tổng/còn phải thu khi có thu trước phải thống nhất nghiệp vụ, không đổi ngầm.
- Chủ cấu hình Agent cho từng nơi; quản lý chi nhánh chỉ cấu hình phạm vi được giao.
- Job/PDF/cache có tenant và branch; không claim/in lại job chi nhánh khác.
- Màn hình phụ, nội dung POS, tiến độ và dữ liệu ngân hàng phải gắn chi nhánh; dữ liệu A không cập nhật TV ở B.
- URL màn hình công khai nếu có cần token trình chiếu giới hạn đúng nội dung/chi nhánh, không dùng token chủ gara.
- Ngừng chi nhánh chặn ghép trạm mới, claim mới và màn hình live theo chính sách; hoàn tất/xử lý job đang gửi để tránh in trùng.

## 17. Báo cáo và đối soát
Chủ có dashboard tổng và bảng so sánh theo nơi: doanh thu, tiền thực thu, công nợ, tồn kho, số xe, công việc, nhân sự. Mọi số tổng được tạo từ nguồn đã lọc phạm vi; không lấy toàn bộ dữ liệu rồi chỉ ẩn cột.

Đối soát bắt buộc:
- Tổng doanh thu tổ chức = tổng chi nhánh, sau khi loại giao dịch chuyển nội bộ.
- Công nợ tổ chức = tổng nợ theo chứng từ/chi nhánh; thanh toán phân bổ không giảm hai lần.
- Tồn nguồn + tồn đích + đang vận chuyển khớp luân chuyển.
- Quỹ tiền mặt từng chi nhánh khớp thu/chi và đầu kỳ đã duyệt.
- Ngân hàng dùng chung khớp một số dư thực, không nhân đầu kỳ.
- Bảng lương tổng không nhân lương cơ bản; hoa hồng không trùng cùng công việc.
- File PDF/CSV/Excel xuất cùng bộ lọc với màn hình và có tên chi nhánh/kỳ.
- Quyền “xem nhiều chi nhánh” không tự cấp quyền giá vốn, lương hoặc xuất file.

## 18. Chuyển đổi dữ liệu hiện tại
1. Dừng ghi trong cửa sổ bảo trì; sao lưu tenant và platform, khôi phục thử.
2. Lập danh sách chi nhánh đang có; chọn rõ chi nhánh chính và tài khoản chủ.
3. Báo cáo kho chưa có chi nhánh, giao dịch NULL, cặp cha/con lệch, membership trùng, ID mồ côi, mã phiếu trùng và số dư nguồn chưa rõ.
4. Giữ nguyên chi nhánh đã có căn cứ. Những dòng chưa gắn chi nhánh chỉ về chi nhánh chính khi đã xác nhận thực sự thuộc nơi đó.
5. Không gán mọi thu chi về nơi chính: TTHUCHI có thể đã được chọn Chi nhánh 2 và phải bảo toàn.
6. Kho/chứng từ có bằng chứng mâu thuẫn phải được ánh xạ thủ công; không suy từ người tạo hiện tại hoặc vị trí hiện tại của mặt hàng.
7. Backfill cha trước, con sau; khớp tiếp nhận–báo giá–lệnh–hóa đơn, kho và thanh toán.
8. Cấp phạm vi cho tài khoản/nhân viên cũ theo danh sách đã duyệt, không mặc định mọi người xem tất cả.
9. Đặt bộ đếm mới cao hơn mức số mới đã dùng; giữ nguyên mã cũ và snapshot.
10. Thêm FK/CHECK/unique sau khi dữ liệu sạch; kiểm chứng trên bản khôi phục trước.
11. So sánh số bản ghi, tổng tiền, dư nợ, tồn kho, số ảnh/mẫu và hash nội dung không nằm trong phạm vi thay đổi.
12. Mở pilot một chi nhánh; kiểm tra rồi thêm nơi thứ hai để nghiệm thu.

Migration lặp lại không thêm bản ghi hoặc trừ kho lần hai. Các bước có version/trạng thái và báo cáo ngoại lệ; không chạy lén ở mỗi lần start.

## 19. Rollback và triển khai
Trước go-live: backup tenant + platform, cấu hình và bản code; có file khôi phục đã đọc thử. Bản sao này phục vụ đợt migration, lưu ngoài thư mục source bàn giao.

Nếu thất bại trước mở ghi: khôi phục code/schema/data cùng phiên bản. Nếu đã có giao dịch mới đa chi nhánh: không restore bản cũ đè lên và làm mất giao dịch; tạm ngừng ghi, xuất đối soát và chọn sửa tiến hoặc phương án phục hồi có bảo toàn phát sinh.

Cột/bảng mới được triển khai theo expand -> migrate -> enforce -> retire. Không để hai phiên bản server cũ/mới cùng ghi khi phiên bản cũ chưa hỗ trợ branch. Gắn schema version kiểm tra lúc start; thiếu migration thì báo rõ, không tự bỏ qua quyền để chạy.

## 20. Danh sách module cần chỉnh
| Nhóm | Module/điểm chính |
|---|---|
| Ngữ cảnh và quyền | tenancy.js, accessControl.js, permissionPolicy.js, db.js và branchScope.js mới |
| Tài khoản/chi nhánh | routes/auth.js, adminAccess.js, catalogData.js, storeProfiles.js, loginDirectory.js |
| Kho/bán hàng | routes/parts.js, sales.js, inventoryReceipts.js; stock.js, receiptValidation.js, salesPrices.js |
| Sửa chữa | repairOrders.js, workflow.js, invoices.js; repairSupplements.js, repairCommissions.js |
| Tài chính | cashVoucher.js, cashbook.js, bankBalances.js, routes/finance.js và thanh toán công nợ |
| Lương/nhân sự | employees.js, module bảng lương/thu nhập, lịch sử phân công |
| Báo cáo | reportData.js, reportExport.js, routes/reports.js, dashboard |
| In và Agent | documentPrint.js, salesPrint.js, provisionalPaymentQr.js, printAgent.js, PRINT_* |
| Cấu hình/TV | systemConfig.js, secondaryDisplayConfig.js, màn hình phụ và public display |
| Frontend | AccessSession, sessionGuard, API interceptor, MainLayout, selector mới và các màn nghiệp vụ |
| Khởi tạo/bàn giao | tenantSeed.js, saasWorker.js, migrations, configure-handoff.js, CaiDat/README |

Tên route/file phải được đối chiếu khi triển khai; danh sách là điểm rà soát, không phải cho phép bỏ qua service dùng cùng dữ liệu.

## 21. Lộ trình và điều kiện hoàn tất
| Giai đoạn | Công việc | Điều kiện qua giai đoạn |
|---|---|---|
| G0 | Khảo sát schema/data, chốt mapping và chủ | Có danh sách đối chiếu, backup khôi phục được |
| G1 | Migration chi nhánh, membership, kho, cấu hình | Chạy được trên bản sao, không lệch số liệu |
| G2 | Ngữ cảnh/quyền API và selector frontend | Chặn truy cập trái phép cả list/ID/mutation |
| G3 | POS, nhập kho, sửa chữa và vòng đời | Hai chi nhánh hoạt động độc lập, không lấy kho nhầm |
| G4 | Thu chi, công nợ, nhân sự | Số dư/hoa hồng/lương không trùng |
| G5 | Báo cáo, cấu hình, mã phiếu | Tổng hợp khớp tổng từng chi nhánh, mã không trùng |
| G6 | In, QR, Agent, màn hình phụ | Máy in/QR/TV đúng nơi, không lộ PDF |
| G7 | Chuyển kho và điều phối xe | Xuất/nhận/hoàn có audit, tồn vận chuyển khớp |
| G8 | Thu hộ và phân bổ nâng cao, giá riêng | Chỉ mở khi sổ tiền/nợ được đối soát đầy đủ |
| G9 | Pilot, kiểm thử hồi quy, bàn giao HDSD | Đạt toàn bộ tiêu chí nghiệm thu và có rollback |

Không coi hoàn tất chỉ vì có bộ chọn chi nhánh. Thời gian cần ước lượng sau G0 theo số endpoint phải sửa và các ngoại lệ dữ liệu; chưa cam kết ngày hoàn thành khi chưa khảo sát xong.

## 22. Ma trận kiểm thử bắt buộc
Dùng tổ chức X có A/B và tổ chức Y có C; chủ X, quản lý A, quản lý B, nhân viên được A+B và người không được cấp.

### Quyền
- Người A không list/đọc/sửa/xóa/thanh toán/in/export/đọc ảnh phiếu B bằng ID.
- Chủ X không lấy dữ liệu C dù biết ID/token branch.
- Header/body bị giả, branch không tồn tại hoặc ngừng hoạt động đều bị chặn đúng.
- ISADMIN nhưng chỉ có phạm vi A không vượt sang B.
- Thu hồi quyền có hiệu lực ngay; JWT cũ không giữ quyền vô thời hạn.
- API không có branch bị chặn ở thao tác ghi, không mặc định tất cả.

### Nghiệp vụ
- POS A không dùng kho B, vẫn tính VAT/giảm giá đúng và không cộng phí dịch vụ phụ tùng.
- Lệnh sửa A, báo giá ban đầu và phát sinh không bị dời branch khi đổi selector.
- Thu trước/thu đủ/ghi nợ/thu hộ đối chiếu đúng nguồn tiền và dư nợ.
- Ngân hàng chung không nhân số dư đầu kỳ; quỹ A không dùng vào B ngoài nghiệp vụ được cấp.
- Chuyển kho gửi/nhận một phần/hủy/hoàn và gửi lại request không tạo tồn trùng.
- Hoa hồng một việc không tính đôi; lương cơ bản người A+B chỉ tính một lần.
- Máy in/PDF/QR/màn hình phụ/khách xem lịch sử đúng phạm vi.

### Đồng thời và phiên
- Hai người tạo phiếu cùng chi nhánh cùng thời điểm, không trùng mã.
- Hai chi nhánh tạo phiếu cùng lúc, counter không khóa sai hoặc dùng chung ngoài chủ ý.
- Hai lần xuất/nhận đồng thời không vượt tồn hay nhận trùng.
- Hai tab A/B, đổi branch khi request đang tải, đăng nhập tài khoản khác, refresh và session hết hạn.
- Hủy/thử lại một request thanh toán/in không tạo phiếu hoặc job mới ngoài ý muốn.

### Migration và hiệu năng
- Database chỉ một chi nhánh; nhiều chi nhánh; cột sẵn có; dữ liệu NULL; membership trùng; kho không rõ; cấu hình thiếu.
- Chạy migration hai lần không đổi kết quả; ngắt giữa bước và chạy tiếp có kiểm soát.
- Đối chiếu tổng trước/sau, ảnh/mẫu và bộ đếm; không thay nội dung ngoài phạm vi.
- Query plan/latency với dữ liệu thực; phân trang/filter thực hiện ở database.
- Không có request khai “all” để xuất toàn tenant khi chỉ được một branch.

## 23. Tiêu chí nghiệm thu toàn bộ
1. Chủ đăng nhập một lần, quản lý ít nhất hai chi nhánh.
2. Nhân viên chỉ thao tác đúng nơi được cấp và đúng quyền nghiệp vụ.
3. Cùng SKU/khách/xe dùng chung nhưng tồn/chứng từ/tiền/nợ/phân công tách được.
4. Dashboard tổng khớp chi nhánh; dữ liệu tài chính và kho được đối soát.
5. Mã phiếu mới phân biệt chi nhánh, mã cũ không đổi.
6. In/QR/Agent/TV đúng nơi; không có đường đọc tắt vượt phạm vi.
7. Chuyển kho/điều phối/thu hộ chỉ mở khi đã qua kiểm thử nghiệp vụ tương ứng.
8. HDSD có hướng dẫn tạo chi nhánh, cấp quyền, đổi nơi, kho, máy in và báo cáo.
9. Build/kiểm thử đạt; tồn tại backup phục hồi đã thử, migration version và log triển khai.
10. Không còn bug mức chặn về rò dữ liệu, trừ tiền/kho hai lần hoặc mất phát sinh.

## 24. Các quyết định cần xác nhận khi triển khai
- Tài khoản nào là chủ, chi nhánh nào là chính; dữ liệu chưa rõ được ánh xạ thế nào.
- Nhân viên nào được nơi nào, có khác vai trò giữa các nơi không.
- Khách/xe dùng chung nhưng mức xem lịch sử xuyên chi nhánh đến đâu.
- Giá hàng/dịch vụ dùng chung hay override; quyền thay giá.
- Tài khoản ngân hàng nào dùng chung; quỹ đầu kỳ thực tế từng nơi.
- Có cho thu hộ/chuyển xe trong phiên bản đầu hay triển khai sau.
- Chính sách in lại địa chỉ cũ và QR khi đã có thu trước.
- Giới hạn số chi nhánh theo gói SaaS và khả năng quản trị tổ chức.

Các quyết định chưa có câu trả lời dùng mặc định ít quyền, giữ nguyên dữ liệu và chặn thao tác chưa đủ căn cứ; không suy đoán rồi ghi đè dữ liệu thật.

## 25. Checklist triển khai / nhật ký
- [x] Lập kế hoạch và đọc metadata Firebird hiện tại.
- [x] G0: backup/restore kiểm chứng và báo cáo ánh xạ dữ liệu.
- [x] G1: schema, FK/index và backfill.
- [x] G2: context, API scope, membership và selector.
- [x] G3: bán hàng/kho/sửa chữa.
- [x] G4: thu chi/công nợ/nhân sự.
- [x] G5: báo cáo/cấu hình/mã phiếu.
- [x] G6: in/Agent/QR/TV.
- [x] G7a: chuyển kho nháp/gửi/nhận từng phần/nhận đủ, có lịch sử và báo cáo.
- [ ] G7b: chuyển xe/lệnh sửa liên chi nhánh — chưa mở; không đổi trực tiếp chi nhánh chứng từ.
- [ ] G8: thu hộ/giá riêng — mặc định không triển khai trong bản đầu; dùng giá chung, thanh toán tại nơi sở hữu hóa đơn.
- [x] G9a: hồi quy, Firebird tích hợp, HDSD Markdown, kích hoạt và đối chiếu dữ liệu.
- [ ] G9b: pilot với người dùng vận hành thực tế và kiểm tra máy in vật lý tại từng nơi.

Mỗi lần cập nhật ghi rõ thay đổi code, migration đã chạy ở database nào, backup ở đâu, kiểm thử và phần còn chưa hoàn thành. Không đánh dấu đầy đủ khi chỉ hoàn thành nền tảng.

### Nhật ký triển khai 13/10/2026
- Đã chạy preflight tại KAZUCOGARA: hai chi nhánh, một tài khoản admin và KT1; các chứng từ có chi nhánh đều thuộc KAZUKO AUTO, chưa có chứng từ riêng của Chi nhánh 2.
- Backup tenant và platform nằm ngoài source: D:/Garage/branch-implementation/before-multibranch-2026-10-13. Đã khôi phục thử và đối chiếu số bản ghi toàn bộ bảng.
- Migration branch-foundation-v1 được thử hai lần trên database riêng trước khi áp dụng vào KAZUCOGARA/backend/GARAGE.FDB.
- Đã bổ sung role tổ chức, phân công chi nhánh, cấu hình chi nhánh, bộ đếm riêng, quỹ, bảng chuyển kho/audit và các cột chi nhánh còn thiếu. Dữ liệu NULL được gắn chi nhánh chính, mã phiếu và số tiền cũ giữ nguyên.
- Chưa bật chế độ đa chi nhánh cho giao diện/API: phải hoàn tất lớp phân quyền và truy vấn có phạm vi trước để không làm lộ dữ liệu giữa hai nơi.


### Nhật ký triển khai 14/10/2026 — bản đa chi nhánh đầu tiên đã kích hoạt

**Phạm vi đã chạy:** chọn chi nhánh riêng từng tab; chủ xem tất cả ở chế độ chỉ đọc; phân quyền tài khoản theo chi nhánh/nhóm riêng; phân nhân viên; phạm vi bán hàng, nhập/xuất kho, sửa chữa/báo giá/ảnh, công nợ/thu chi/hoa hồng/bảng lương và báo cáo; bộ đếm số phiếu riêng; cấu hình bản in/QR; trạm/máy in mặc định/hàng chờ in; màn hình phụ; chuyển kho và ngân hàng dùng chung có kiểm soát.

**Phần nâng cao chưa mở:** thu hộ chéo chi nhánh, chuyển xe/lệnh sửa đang mở, giá riêng từng nơi. Đây là các tùy chọn của lộ trình, không được giả lập bằng sửa cột chi nhánh hoặc tạo hóa đơn mua bán cho chuyển kho. Phiên bản hiện tại giữ giá chung và chỉ thu nợ tại nơi sở hữu hóa đơn.

#### Kiến trúc và file triển khai

- branchScope.js: AsyncLocalStorage với readIds/writeIds bất biến; quyền chủ tách khỏi ISADMIN.
- services/branches.js + routes/branches.js: đọc membership từ database mỗi request, xác thực chi nhánh, cấp/thu hồi, nhóm riêng, phân nhân viên và audit.
- branchSql.js + branchTables.json: ánh xạ tường minh 46 bảng sang view có phạm vi. Các câu SELECT đã đổi tại source; không dùng regex chắp bộ lọc bảo mật vào SQL khi chạy.
- db.js: reset RDB USER_SESSION và GTT_BRANCH_SCOPE trên mỗi lần mượn kết nối/transaction, kể cả attachment tái sử dụng. Không có phạm vi thì view không trả chứng từ. Các tác vụ bảo trì được đánh dấu rõ và không nhận bypass từ client.
- services/branchViewMigration.js + tools/install-branch-views.js: view đọc, trigger chặn ghi/chuyển chi nhánh trái phép, đối chiếu parent/kho/trạm/máy in; FK và mã chi nhánh duy nhất. Firebird 2.5 khóa bảng gốc với điều kiện ID thuộc view được phép, vì WITH LOCK trực tiếp trên view không được hỗ trợ.
- services/inventoryTransfers.js: khóa phiếu và mặt hàng trong transaction; số nhận lũy kế chống cộng trùng, lưu TCHUYENKHONHAN cho từng lần nhận để báo cáo đúng ngày. Không hủy hàng đã gửi.
- services/branchSettings.js: override tên/địa chỉ/điện thoại/lời cảm ơn/tài khoản QR theo chi nhánh; version kiểm tra lưu đồng thời. Tên bản in lấy theo chi nhánh của chứng từ kể cả khi chủ đang xem tổng hợp.
- PRINT_ROUTES cũ được giữ; TBRANCHPRINTROUTE lưu tuyến theo chi nhánh, kế thừa tuyến cũ cho chi nhánh chính.
- Lịch bảo dưỡng được bổ sung DCUAHANGID và view; cấu hình màn hình dùng DCHINHANHCONFIG, đơn đang hiển thị và trạng thái thông báo có khóa theo chi nhánh.
- Frontend branchSession/BranchToolbar/BranchSettings/InventoryTransfers: lựa chọn trong sessionStorage, gửi X-Branch-Id cho cả API chung và axios cũ; media gửi branch_id; bỏ phản hồi cũ; reload khi đổi chi nhánh để hủy form/cache cũ. Khóa gửi trùng gồm phạm vi chi nhánh; chi nhánh chính giữ tương thích khóa yêu cầu trước cập nhật.
- Khi khởi động, server kiểm tra đủ view, chi nhánh chính và tài khoản chủ của các tenant đang hoạt động. Tenant mới từ seed cũ phải chạy nâng cấp trước khi mở. Đăng ký SaaS vẫn tắt như bản bàn giao hiện có; không tự bật đăng ký hoặc tạo tenant.

#### Database, backup và đối chiếu

- Áp dụng tại KAZUCOGARA/backend/GARAGE.FDB. Dự án garage-app cũ không bị sửa bởi đợt triển khai này.
- MULTIBRANCH_ENABLED=true trong backend/.env; backend đang chạy lại trên 4000. Migration branch-foundation-v1 và branch-views-v1 có trong database.
- Backup trước kích hoạt: D:/Garage/branch-implementation/before-activation-2026-10-14; đã khôi phục thử cả tenant và platform.
- Đối chiếu trước/sau: 93 bảng giữ nguyên số dòng, tổng số lượng và tổng tiền. Không đưa dữ liệu thử A/B vào database vận hành; mọi giao dịch thử chạy trên bản khôi phục ngoài source.
- Bổ sung TBRANCHPRINTROUTE, TCHUYENKHONHAN và các view/trigger/constraint. Không xóa bảng nghiệp vụ, không xóa/chia lại hóa đơn, không thay đổi số tiền cũ.

#### Kiểm thử và giới hạn thực tế

- Bộ hồi quy: 288 bài, 268 đạt, 20 bài tích hợp cũ không bật nên bỏ qua, 0 lỗi.
- Thử riêng Firebird: luân phiên 60 truy vấn A/B/no-scope trên pool; chặn ID giả, đổi chi nhánh chứng từ, ghi khi xem tổng hợp.
- Cấp/thu hồi membership và nhóm quyền theo chi nhánh đã được thử qua HTTP trên database riêng.
- Chuyển kho nháp/gửi/nhận một phần/lặp yêu cầu/nhận đủ; cấm nơi nhận tự gửi, nơi xuất tự nhận, nhận quá lượng gửi và hủy sau gửi.
- Tạo đơn POS ở B và gửi lại cùng khóa cho ra cùng phiếu; tạo lệnh sửa/báo giá B; xuất PDF thật; A không lấy được phiếu/PDF của B.
- Ghép Agent gắn chi nhánh; mã ghép chỉ dùng một lần; tuyến máy in B không đổi tuyến A; máy in khác phạm vi bị từ chối.
- Cấu hình hóa đơn, màn hình phụ và ngân hàng dùng chung được thử tách A/B. Ngân hàng dùng chung trả số dư toàn tổ chức; báo cáo phát sinh chi nhánh không cộng số dư đầu kỳ chung nhiều lần.
- Trên database thật: 30 API đọc A/B đạt; kiểm tra truy cập trái phép trả 403/404; health hoạt động.
- Frontend build đạt. Công cụ trình duyệt chặn truy cập tab localhost nên chưa xác nhận giao diện bằng tương tác trình duyệt trực tiếp; chưa gửi lệnh ra máy in vật lý. Cần pilot người dùng trước triển khai vận hành hàng loạt.

#### Công cụ bàn giao và cách kiểm thử lại

- tools/migrate-branches.js: nền tảng schema/role/backfill, cần backup và chỉ định chi nhánh chính/chủ. Không gọi tự động ở mỗi request.
- tools/install-branch-views.js kazuko: cài schema/view/trigger giai đoạn đọc-ghi; chạy khi API đã dừng và có backup.
- tools/branch-backup.js và branch-preflight.js: kiểm chứng/đối chiếu trước nâng cấp.
- Test/backend/tests/branchScope.test.js và Test/frontend/tests/branchSession.test.mjs: kiểm thử ngữ cảnh và phản hồi cũ.
- Test/firebird/check_multi_branch.js: fixture tích hợp của snapshot kazuko hiện tại. Chỉ nhận BRANCH_TEST_DB là đường dẫn tuyệt đối đến file khôi phục nằm ngoài source, kết thúc bằng .branch-test.fdb; từ chối GARAGE.FDB và file trong source. Có tạo dữ liệu thử, không dùng trên dữ liệu vận hành. Snapshot cần chi nhánh/tài khoản hiện có và một mặt hàng tồn ít nhất 4 đơn vị. Khôi phục một bản test mới trước mỗi đợt.
- HDSD khách hàng: TaiLieu/HUONG_DAN_NHIEU_CHI_NHANH.md. Hướng dẫn Word cũ được giữ để chủ dự án tự chỉnh như đã yêu cầu.

Khôi phục nếu có sự cố: dừng API, giữ lại backup mới của dữ liệu phát sinh sau kích hoạt, khôi phục backup đã kiểm chứng đến file riêng để kiểm tra rồi mới thay database theo quy trình bảo trì. Không copy đè FDB đang mở, không khôi phục mù làm mất giao dịch mới. Nếu quay về bản trước kích hoạt, tắt MULTIBRANCH_ENABLED và dùng code/schema tương ứng; không xóa cột hoặc bảng mới trực tiếp để rollback.

### Sửa danh mục chi nhánh 14/10/2026

- Khắc phục bảng Danh mục → Chi nhánh / Cửa hàng chỉ hiện nơi đang chọn dù thanh chọn có nhiều nơi.
- Danh mục chi nhánh là dữ liệu quản trị tổ chức: chủ được đọc/sửa bản ghi danh mục của mọi chi nhánh khi đang làm việc tại một nơi. ORGROLE trong context lấy từ tài khoản đã xác thực, không lấy từ request body.
- Chỉ ngoại lệ tài nguyên stores; kho, phiếu và dữ liệu nghiệp vụ vẫn theo chi nhánh. Nhân viên không được mở rộng phạm vi đọc danh mục bằng ngoại lệ của chủ.
- Kiểm tra chỉ đọc trên database đang dùng: cả chọn KAZUKO AUTO và Chi nhánh 2 đều trả đủ 3 chi nhánh, gồm bản ghi 12 mới được tạo; thử nhân viên và danh sách kho vẫn giữ phạm vi. Các kiểm tra API chống lấy dữ liệu/ID/PDF ngoài quyền vẫn đạt.
- Không sửa/xóa dữ liệu Firebird. Đã bổ sung kiểm tra danh mục chủ/nhân viên vào fixture Firebird bàn giao.

### Vị trí điều khiển chi nhánh theo yêu cầu 14/10/2026
- Chọn/đổi chi nhánh làm việc chỉ xuất hiện tại Tổng quan. Lựa chọn vẫn áp dụng cho mọi trang trong tab.
- Cấu hình chi nhánh, Chuyển kho chi nhánh và Phân quyền chi nhánh chỉ xuất hiện tại Danh mục → Chi nhánh / Cửa hàng. Khu vực này hiển thị tên chi nhánh hiện tại bằng chữ, không có bộ chọn đổi nơi làm việc.
- Không đổi phạm vi API hoặc dữ liệu Firebird; đã cập nhật hướng dẫn sử dụng theo vị trí mới.

### Sửa mất ngữ cảnh khi lưu phiếu 14/10/2026
- Tái hiện thông báo “Chọn một chi nhánh để thực hiện giao dịch” khi Nhập kho đã có chi nhánh: callback của kết nối Firebird trong pool có thể chạy bằng ngữ cảnh lúc mở kết nối, làm mất chi nhánh/tenant của giao dịch hiện tại.
- db.transaction giữ ngữ cảnh của người gọi bằng AsyncResource.bind trước khi lấy kết nối; giữ nguyên kiểm tra quyền và bộ chọn chỉ tại Tổng quan.
- Kiểm tra trên bản sao database riêng: mở sẵn ba kết nối ngoài ngữ cảnh chi nhánh, giao dịch luân phiên A/B giữ đúng cả tenant và USER_SESSION; lưu Nhập kho thành công, thử lại cùng khóa không tạo trùng, chi nhánh khác đọc phiếu trả 404.
- Kiểm tra tích hợp bán hàng, sửa chữa, PDF, màn hình phụ và 30 lượt đọc API đạt. Bộ kiểm thử: 288 bài, 268 đạt, 20 bỏ qua, 0 lỗi. Không tạo phiếu thử trên database cửa hàng thật.

### Bật lại tài khoản ngân hàng dùng chung 14/10/2026
- Tách danh sách quản lý dùng chung của chủ khỏi danh sách tài khoản được phép chọn QR tại chi nhánh. Khi ngưng dùng chung, tài khoản vẫn hiện trong danh sách quản lý toàn tổ chức để chủ bật lại, kèm tên chi nhánh quản lý.
- Danh sách chọn QR vẫn lọc theo chi nhánh; tài khoản của chi nhánh khác chỉ xuất hiện khi đã bật dùng chung. Không mở quyền quản lý cho nhân viên; quyền chủ lấy từ tài khoản được xác thực tại route.
- Kiểm tra bản sao Firebird: bật chia sẻ từ chi nhánh khác, ngưng chia sẻ vẫn thấy trong quản lý nhưng không còn trong lựa chọn QR, bật lại xuất hiện trong lựa chọn QR; nhân viên truy cập cấu hình trả 403. Kiểm tra tích hợp còn lại và build frontend đạt. Không thay đổi tài khoản ngân hàng thật.

### Phân biệt danh mục xe và tiếp nhận chi nhánh 14/10/2026
- Khi bật nhiều chi nhánh, Tổng số xe tại Tổng quan đếm xe duy nhất có phiếu tiếp nhận, lệnh sửa chữa hoặc trạng thái quy trình còn hiệu lực trong phạm vi chi nhánh đang xem. Không đếm mọi bản ghi DXE dùng chung; xem tất cả chi nhánh vẫn đếm mỗi xe một lần.
- Hồ sơ chờ duyệt không tự đưa xe chỉ có trong danh mục chung vào hàng chờ báo giá. Xe xuất hiện theo hồ sơ quy trình được lập tại chi nhánh; chế độ một chi nhánh cũ giữ hành vi tương thích.
- Danh mục xe vẫn dùng chung để tìm/chọn xe khi lập phiếu, tránh tạo trùng hồ sơ. Không xóa hoặc chuyển dữ liệu xe thật.
- Kiểm tra Firebird riêng: tạo xe trong danh mục không đổi thống kê/hàng chờ A hoặc B; lập lệnh tiếp nhận tại B đưa xe vào bảng B và tăng số xe B đúng một, không đưa vào A. Kiểm tra tích hợp và bộ hồi quy đạt (268 đạt, 20 bỏ qua, 0 lỗi).
