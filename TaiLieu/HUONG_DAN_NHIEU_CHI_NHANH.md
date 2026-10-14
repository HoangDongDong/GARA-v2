# HƯỚNG DẪN QUẢN LÝ NHIỀU CHI NHÁNH

Phiên bản đang áp dụng tại KAZUCOGARA, ngày 14/10/2026. Tài liệu này hướng dẫn người dùng phần mềm; không phải hướng dẫn chạy frontend/backend.

## 1. Cách tổ chức dữ liệu

Một chủ quản lý nhiều chi nhánh trong cùng cửa hàng/tổ chức kazuko. Chi nhánh không phải tài khoản cửa hàng SaaS mới và không tạo database khách hàng riêng.

- Khách hàng, xe, danh mục hàng và dịch vụ dùng chung để tránh nhập trùng.
- Phiếu sửa, báo giá, hóa đơn, nhập/xuất kho, thu chi, công nợ, hoa hồng, bảng lương và bản in được giới hạn theo chi nhánh.
- Tồn kho thuộc từng kho của từng chi nhánh; có cùng mặt hàng không có nghĩa là có cùng lượng tồn.
- Chủ được xem tổng hợp mọi chi nhánh. Nhân viên chỉ xem chi nhánh được cấp và thực hiện những chức năng được phân quyền.

Dữ liệu cũ của KAZUKO AUTO được giữ tại chi nhánh chính. Chi nhánh 2 không được tự chia lại hóa đơn hoặc hàng tồn từ chi nhánh chính.

## 2. Chọn chi nhánh làm việc

1. Đăng nhập bằng tài khoản đang có. Nếu trang đã mở trước cập nhật, tải lại bằng Ctrl+F5.
2. Vào **Tổng quan**, chọn nơi làm việc trong thanh **Chi nhánh**. Chỉ màn hình Tổng quan có nút chọn/đổi chi nhánh.
3. Lưu phiếu đang nhập trước khi đổi; trang sẽ tải lại để tránh dùng dữ liệu của chi nhánh trước.
4. Kiểm tra tên chi nhánh trước khi bán hàng, nhận xe, nhập kho, thanh toán hoặc in.

Lựa chọn được lưu riêng từng tab. Có thể mở tab A làm KAZUKO AUTO, tab B làm Chi nhánh 2 với cùng tài khoản chủ.

**Tất cả chi nhánh · chỉ xem** dành cho chủ xem danh sách/báo cáo tổng hợp. Muốn tạo hoặc sửa phiếu, chọn một chi nhánh cụ thể. Phần mềm chặn yêu cầu ghi khi đang xem tổng hợp.

## 3. Thêm chi nhánh

1. Chủ vào **Danh mục → Chi nhánh / Cửa hàng → Thêm mới**.
2. Nhập tên, mã, địa chỉ và điện thoại. Mã gồm 1–20 chữ/số/dấu gạch ngang hoặc gạch dưới, không trùng; mã được lưu viết hoa.
3. Lưu và tải lại trang để danh sách chọn chi nhánh cập nhật ngay.
4. Chọn chi nhánh mới, tạo kho và cấp quyền nhân viên theo các bước dưới.

Không thể ngừng chi nhánh chính. Chi nhánh còn lệnh sửa đang mở hoặc hàng chuyển đang vận chuyển cũng không được ngừng. Ngừng chi nhánh không xóa lịch sử.

## 4. Cấp tài khoản và nhân viên cho chi nhánh

Chủ vào **Danh mục → Chi nhánh / Cửa hàng**, bấm **Phân quyền chi nhánh**.

### Tài khoản đăng nhập

1. Chọn chi nhánh.
2. Chọn tài khoản đã tạo trong **Quản trị - Phân quyền**.
3. Chọn **Theo nhóm quyền tài khoản**, hoặc chọn nhóm quyền riêng tại chi nhánh đó.
4. Bấm **Cấp quyền**. Muốn bỏ quyền truy cập, chọn lại tài khoản/chi nhánh rồi bấm **Thu hồi quyền**.

Một tài khoản có thể được cấp nhiều chi nhánh và có nhóm quyền khác nhau ở mỗi nơi. Quyền được kiểm tra lại trên API mỗi lần thao tác. Chỉ chủ được quản lý tài khoản và cấu hình chung của tổ chức; cờ Admin của một tài khoản không tự biến tài khoản đó thành chủ.

### Nhân viên/kỹ thuật viên

1. Chọn chi nhánh và nhân viên trong phần **Phân nhân viên làm việc**.
2. Bấm **Phân vào chi nhánh**; có thể phân cùng nhân viên vào nhiều nơi.
3. Dùng **Ngừng phân công** để bỏ khỏi danh sách nhân viên làm việc tại nơi đó.

Cấp tài khoản đăng nhập và phân hồ sơ nhân viên là hai việc riêng. Muốn kỹ thuật viên vừa đăng nhập vừa được phân việc, cần thực hiện cả hai. Hồ sơ nhân viên mới tạo được gắn với chi nhánh đang chọn. Danh sách phân công và hoa hồng lấy theo chi nhánh của lệnh sửa.

Bản hiện tại: admin là chủ; KT1 được cấp KAZUKO AUTO. Không tự cấp thêm dữ liệu Chi nhánh 2 cho KT1.

## 5. Kho và bán hàng

### Chuẩn bị kho

1. Chọn chi nhánh cần thiết lập.
2. Vào **Danh mục → Kho hàng & Vị trí kho**, tạo kho rồi tạo vị trí nếu cần.
3. Nhập hàng thực tế tại **Nhập kho**, hoặc nhận hàng chuyển từ chi nhánh khác.

Kho mới có tồn bằng 0. Phần mềm không tự sao chép tồn của kho chính sang kho mới.

### Bán hàng

1. Chọn đúng chi nhánh và kho xuất trên trang POS.
2. Chọn khách, mặt hàng, số lượng, giảm giá và thanh toán như thông thường.
3. Kiểm tra tồn ở kho đang chọn, rồi lưu/thanh toán.
4. In phiếu của chi nhánh đó; số phiếu mới dùng đúng mẫu tại Cấu hình → Số phiếu, không tự thêm mã chi nhánh. Các chi nhánh dùng bộ đếm chung trong tổ chức để tránh trùng số. Phiếu cũ giữ nguyên số đã lưu.

Số phiếu, giá trị, chính sách VAT/phí của hóa đơn cũ được giữ nguyên. Cấu hình tính tiền hiện có vẫn áp dụng; việc phân chi nhánh không tự thêm phí dịch vụ cho hàng bán.

## 6. Sửa chữa, báo giá và thanh toán

1. Chọn chi nhánh trước khi tiếp nhận xe.
2. Chọn khách/xe từ danh mục dùng chung, chọn nhân viên của chi nhánh và hạng mục cần báo giá.
3. Lưu/in báo giá ban đầu. Khi khách xác nhận, chỉ chọn các hạng mục được khách đồng ý.
4. Phân công kỹ thuật viên, thực hiện sửa chữa/phát sinh, giao xe và thanh toán theo quy trình hiện có.
5. In lệnh sửa thực tế, phiếu tạm tính hoặc hóa đơn tại đúng chi nhánh.

Danh sách chờ duyệt, ảnh, báo giá đã lưu, lệnh sửa, hóa đơn và đường in PDF đều chịu phạm vi chi nhánh. Đổi ID trên đường dẫn không cho phép nhân viên lấy phiếu của nơi khác. Một xe không được mở quy trình sửa đang hoạt động đồng thời tại hai chi nhánh.

Phiếu đã phát sinh không được đổi trực tiếp chi nhánh để chuyển doanh thu/kho. Luồng chuyển lệnh sửa/xe giữa hai nơi và thu hộ chéo chi nhánh chưa mở trong phiên bản này.

## 7. Thu chi, công nợ, hoa hồng và lương

- Chọn chi nhánh rồi vào **Thu - Chi / Công nợ** để xem hoặc ghi nhận phát sinh tại nơi đó.
- Thanh toán nợ của hóa đơn chỉ thực hiện ở chi nhánh sở hữu hóa đơn; không tự ghi thu hộ sang nơi khác.
- Hoa hồng, phân công và dữ liệu bảng lương đang có được lọc theo chi nhánh của chứng từ.
- Chủ chọn **Tất cả chi nhánh** để xem tổng hợp; khi chi trả phải quay về một chi nhánh cụ thể.

Không tự tạo số dư đầu kỳ hoặc chia tiền thật cho các chi nhánh. Các số dư ngân hàng đã cấu hình được giữ nguyên.

## 8. Cấu hình bản in và ngân hàng

Chủ chọn chi nhánh tại **Tổng quan**, sau đó vào **Danh mục → Chi nhánh / Cửa hàng**, bấm **Cấu hình chi nhánh**:

1. Điền tên đơn vị, địa chỉ, điện thoại và lời cảm ơn trên bản in.
2. Chọn tài khoản nhận chuyển khoản; để **Không hiển thị QR** nếu chưa dùng.
3. Bấm **Lưu cấu hình**.

Tài khoản ngân hàng được thêm trong danh mục khi đang chọn chi nhánh sở hữu. Muốn một tài khoản dùng tại nhiều nơi, chủ bấm **Dùng chung cho mọi chi nhánh** tại dòng tài khoản trong cửa sổ cấu hình. Sau đó chọn tài khoản đó làm tài khoản nhận QR ở các chi nhánh cần dùng.

- Chỉ chủ được bật/tắt dùng chung; việc này không chuyển các hóa đơn cũ sang chi nhánh khác.
- Số dư của tài khoản dùng chung là số dư toàn tổ chức, không phải cộng một bản số dư ở mỗi chi nhánh.
- Báo cáo ngân hàng khi chọn một chi nhánh chỉ thể hiện phát sinh tại nơi đó, không cộng số dư đầu kỳ của cả tổ chức. Chọn **Tất cả chi nhánh** để xem số dư tổng hợp.
- Phiếu tạm tính dùng tổng tiền trên chính phiếu làm số tiền QR và dùng tài khoản nhận của chi nhánh sở hữu phiếu.

Chi nhánh chính mặc định kế thừa thông tin cấu hình cũ. Chi nhánh khác mặc định dùng tên/địa chỉ/điện thoại trong danh mục và chưa có tài khoản nhận QR, cho đến khi chủ cấu hình.

## 9. Máy in và Agent

1. Cài GARA Print Agent tại máy đặt máy in theo hướng dẫn Agent đã có.
2. Trong phần mềm, chọn đúng chi nhánh rồi vào **In chứng từ → Máy in & Agent**.
3. Tạo mã ghép và nhập vào Agent. Trạm được gắn với chi nhánh đã tạo mã.
4. Bật máy in, chọn khổ giấy và loại chứng từ in mặc định.
5. In thử một phiếu của chi nhánh đang chọn.

Trạm, máy in mặc định, hàng chờ in và PDF thuộc từng chi nhánh. Chi nhánh B không gửi lệnh qua máy in chỉ thuộc A. Trạm cũ của KAZUKO AUTO được giữ tại chi nhánh chính.

Bản này một trạm được gắn với một chi nhánh. Không đổi chi nhánh bằng cách sửa token/ID của trạm. Nếu cần bố trí lại trạm, chủ cấu hình lại việc ghép trạm theo nơi sử dụng.

## 10. Màn hình phụ

Chọn chi nhánh rồi thiết lập **Màn hình phụ**. Nội dung, tài khoản QR và đơn POS đang hiển thị được tách theo chi nhánh. Tab màn hình phục vụ chi nhánh nào cần giữ lựa chọn chi nhánh đó.

Cấu hình cũ của màn hình KAZUKO AUTO được kế thừa. Chi nhánh khác có cấu hình riêng, không ghi đè cấu hình của chi nhánh chính.

## 11. Chuyển kho giữa chi nhánh

Vào **Danh mục → Chi nhánh / Cửa hàng**, bấm **Chuyển kho chi nhánh**; cần quyền kho. Đổi chi nhánh làm việc tại Tổng quan trước khi gửi hoặc nhận hàng.

### Tại chi nhánh xuất

1. Chọn chi nhánh xuất, bấm **Tạo phiếu chuyển kho**.
2. Chọn kho xuất của nơi hiện tại và kho nhận thuộc chi nhánh khác.
3. Chọn mặt hàng, số lượng, ghi chú rồi **Lưu phiếu nháp**.
4. Kiểm tra và bấm **Gửi hàng** khi thực tế xuất hàng.

Phiếu nháp chưa trừ kho. Gửi hàng trừ kho xuất và chuyển sang đang vận chuyển. Chỉ hủy được phiếu còn nháp.

### Tại chi nhánh nhận

1. Chọn chi nhánh nhận, mở danh sách chuyển kho.
2. Bấm **Xác nhận nhận hàng**.
3. Nhập số lượng đã nhận **lũy kế** của từng mặt hàng rồi xác nhận.

Ví dụ gửi 10, lần đầu nhận 6 thì nhập 6. Lần sau nhận thêm 4 thì nhập tổng 10. Nhập lại 6 không cộng thêm 6 lần nữa. Không nhận quá số đã gửi hoặc giảm số đã nhận.

Kho nhận chỉ cộng lượng thực nhận; phần chưa nhận vẫn đang vận chuyển. Nhận đủ chuyển trạng thái **Đã nhận đủ**. Chuyển kho không tự tạo doanh thu/hóa đơn mua bán. Báo cáo kho có dòng chuyển xuất và từng lần chuyển nhận.

## 12. Báo cáo và các tình huống thường gặp

| Tình huống | Cách xử lý |
|---|---|
| Không thấy chi nhánh | Chủ kiểm tra chi nhánh đang sử dụng và quyền của tài khoản, rồi tải lại trang. |
| Chi nhánh mới chưa có hàng | Tạo kho và nhập/nhận hàng thực tế; không dùng lượng tồn của chi nhánh khác. |
| Không thấy kỹ thuật viên | Chủ phân hồ sơ nhân viên vào chi nhánh; kiểm tra trạng thái nhân viên. |
| Không sửa được khi xem tổng hợp | Chọn một chi nhánh cụ thể trước khi tạo/sửa/chi trả. |
| Không tìm thấy phiếu theo ID cũ | Kiểm tra chi nhánh sở hữu phiếu; quyền ở nơi khác không tự áp dụng. |
| Không có QR | Chủ chọn tài khoản nhận của chi nhánh; nếu dùng ngân hàng nơi khác, chủ cần bật dùng chung trước. |
| Không thấy máy in | Kiểm tra Agent đang chạy, chi nhánh ghép trạm và máy in được bật. |
| Cấu hình đã thay đổi ở máy khác | Tải lại cửa sổ cấu hình, kiểm tra rồi lưu lại; không ghi đè mù. |
| Muốn thu hộ/chuyển lệnh sửa/giá riêng | Các luồng này chưa mở; không đổi chi nhánh của chứng từ để thay thế. |

Giá hàng/dịch vụ hiện dùng chung theo chính sách tổ chức. Không có việc tự đổi giá giữa các chi nhánh. Báo cáo tổng hợp dùng các chứng từ đã lưu, không sao chép hoặc cộng trùng một hóa đơn.
