# Nhập và xuất Excel khách hàng, nhà cung cấp, hồ sơ xe

## Nhập dữ liệu

1. Mở **Khách hàng**, **Nhà cung cấp** hoặc **Hồ sơ xe & Lịch sử**, bấm **Import Excel**.
2. Có thể nhập trực tiếp: chọn số dòng, bấm **Thêm dòng**, điền các ô trong bảng. Hoặc bấm **Dán dữ liệu**, dán vùng ô đã sao chép từ Excel theo thứ tự cột hướng dẫn, không gồm dòng tiêu đề.
3. Để nhập file, tải **Mẫu đầy đủ** hoặc **Mẫu cột đang hiện**, điền dữ liệu, rồi bấm **Chọn file Excel**. Nhận cả `.xlsx`, `.xls` Excel cũ và `.csv`; file mẫu tải xuống vẫn là `.xlsx`. File tối đa 10 MB; mỗi sheet tối đa 1.000 dòng dữ liệu và 80 cột.
4. Chọn sheet và ghép từng cột Excel với thuộc tính trong dự án. Dòng đầu là tiêu đề, các dòng sau là dữ liệu. Có **Tự động ghép**; cột không cần nhập chọn **Bỏ qua cột này**. Mỗi thuộc tính chỉ được ghép một lần.

   Với CSV, hệ thống tự nhận dấu phẩy, chấm phẩy hoặc tab và giữ nguyên chuỗi điện thoại/mã. Có hỗ trợ CSV UTF-8 và UTF-16 xuất từ Excel; nội dung chứa dấu phân cách hoặc xuống dòng cần đặt trong dấu ngoặc kép theo định dạng CSV.
5. Bấm **Đưa vào bảng**, kiểm tra và sửa dữ liệu. Ở **Thuộc tính chung**, tích thuộc tính để dùng cùng một giá trị cho mọi dòng chưa lưu; cột đó sẽ ẩn trong bảng. Bỏ tích để dùng lại giá trị riêng từng dòng.

   Bấm vào dòng hoặc ô cần thao tác để chọn dòng (được tô sáng). **Xóa dữ liệu** chỉ bỏ một dòng đang chọn khỏi bảng nhập, không xóa mọi dòng và không xóa bản ghi đã lưu trong hệ thống. Nút bị khóa khi chưa chọn dòng hoặc dòng đã lưu.
6. Bấm **Chấp nhận và lưu**. Cần sửa lỗi kiểm tra trước khi gửi. Dòng đã lưu có trạng thái **Đã lưu**, được khóa và không gửi lại khi thử các dòng còn lại. Nếu máy chủ báo lỗi một dòng, sửa dòng đó hoặc xóa khỏi bảng rồi thử lại. Các dòng thành công vẫn được giữ trong hệ thống; không có thao tác hoàn tác cả đợt nhập.

Nếu mất kết nối lúc lưu, có thể dòng đang gửi đã lưu trên máy chủ. Cửa sổ sẽ dừng nhập và khóa lần thử tiếp theo; đóng cửa sổ, kiểm tra danh sách trước khi nhập lại dòng đó.

## Thuộc tính của dự án

**Khách hàng:** Mã khách hàng; Tên khách hàng (bắt buộc); Số điện thoại; Email; Địa chỉ; Mã số thuế / CCCD; Nhóm khách hàng; Giảm giá riêng (%). Để trống mã khách hàng để hệ thống cấp mã. Nhóm phải có sẵn trong danh mục; mức giảm giá từ 0 đến 100, để trống để dùng chính sách mặc định.

**Nhà cung cấp:** Mã nhà cung cấp và Tên nhà cung cấp (bắt buộc); Nhóm nhà cung cấp; Số điện thoại; Email; Địa chỉ; Website; Ghi chú. Nhóm phải có sẵn trong danh mục. Mã trùng sẽ được báo lỗi; chức năng chỉ thêm mới, không ghi đè nhà cung cấp cũ. Có cùng bảng chỉnh dữ liệu, thuộc tính chung, tải mẫu, ghép cột và nhận `.xlsx`, `.xls`, `.csv` như hai trang còn lại.

**Hồ sơ xe:** Biển số (bắt buộc); Chủ xe; Hãng xe; Dòng xe; Phiên bản; Năm sản xuất; Màu xe; Số khung / VIN; Số máy; ODO (km); Nhiên liệu; Mức nhiên liệu (%); Ghi chú. Chủ xe có thể nhập mã khách hàng hoặc chọn từ danh sách. Hãng, dòng và nhiên liệu phải có sẵn; dòng xe phải thuộc đúng hãng. ODO không âm, mức nhiên liệu từ 0 đến 100. Dữ liệu trùng tên trong danh mục cần chọn bản ghi cụ thể ở ô danh sách.

Chức năng chỉ **thêm mới**, không cập nhật hoặc ghi đè khách hàng/xe đã có. Mã khách hàng và biển số trùng sẽ được báo lỗi. Điện thoại, mã khách, mã số thuế và số khung nên đặt kiểu **Text** trong Excel để giữ số 0 đầu; số 0 đã mất trong file nguồn không thể tự khôi phục. Ô công thức cần sao chép và dán thành giá trị trước khi nhập.

Danh mục khách hàng và xe dùng chung trong tổ chức. Nhập hồ sơ xe không tự tạo phiếu tiếp nhận, hồ sơ sửa chữa hoặc đưa xe vào hàng chờ của chi nhánh. Muốn tiếp nhận xe, lập phiếu tại chi nhánh đang chọn.

## Xuất dữ liệu

- **Khách hàng → Xuất Excel:** tải `.xlsx` gồm các khách hàng phù hợp bộ lọc đang hiển thị.
- **Nhà cung cấp → Xuất Excel:** tải `.xlsx` gồm các nhà cung cấp phù hợp bộ lọc đang hiển thị, với đúng các thuộc tính của form nhà cung cấp.
- **Hồ sơ xe → Xuất Excel:** tải toàn bộ hồ sơ xe đang hoạt động trong danh mục; gồm các thuộc tính để có thể kiểm tra và sử dụng làm dữ liệu nhập.
- **Lịch sử sửa chữa → Xuất Excel:** xuất lịch sử sửa chữa của xe đang xem trong phạm vi chi nhánh.
- **Phụ tùng thay thế → Xuất Excel:** xuất danh sách phụ tùng đã thay của xe đang xem trong phạm vi chi nhánh.

Nút ba chấm bên cạnh Xuất Excel đã được bỏ ở hai trang. Nhập cần quyền thêm khách hàng/xe; xuất cần quyền xuất dữ liệu.

## Xác minh bản sửa

Đã kiểm tra file `.xlsx` thật: ghép tiêu đề tiếng Việt, dán nhiều ô, thuộc tính chung, mã/biển số trùng, quan hệ hãng/dòng, nhiên liệu từ danh mục, giữ số 0 đầu, xuất rồi đọc lại, từ chối công thức và giới hạn file. Đã thử lưu qua API khách hàng/xe trên database kiểm thử riêng; không nhập dữ liệu thử vào database cửa hàng thật.

Sửa lỗi mở Import gây trắng trang: bước kiểm tra dòng dữ liệu hiện chịu được danh sách thuộc tính rỗng trong lúc tải hoặc khi tải thất bại. Bổ sung kiểm thử render React ban đầu cho cả cửa sổ nhập khách hàng và hồ sơ xe; 9 bài kiểm thử Excel/cửa sổ đạt, build frontend đạt.
