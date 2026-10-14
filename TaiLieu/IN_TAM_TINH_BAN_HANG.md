# In tạm tính bán hàng

- Bấm **In tạm tính (F8)** tại Bán hàng hoặc trong cửa sổ Xác nhận thanh toán đều mở hộp in PDF GARA.
- Bản in dùng mẫu mặc định của **Hóa đơn bán phụ tùng** trong Cấu hình / In chứng từ, với tiêu đề **PHIẾU TẠM TÍNH**. Không còn dùng trang HTML đơn giản và hộp in tự mở trước đây.
- Dữ liệu lấy từ giỏ hàng hiện tại: mặt hàng, đơn giá, số lượng, chiết khấu, VAT, giảm giá trên phiếu và tổng tiền. Máy chủ tính lại tổng theo cấu hình bán hàng; không cộng phí dịch vụ cho hàng bán.
- QR dùng cùng logic với phiếu tạm tính Sửa chữa: lấy tài khoản nhận thanh toán từ cấu hình chi nhánh, số tiền bằng tổng bill; tiêu đề **QUÉT QR CHUYỂN KHOẢN**, QR ở giữa, lời cảm ơn bên dưới. Không in thêm thông tin tài khoản thành một khối chữ bên cạnh QR. Nếu tài khoản chưa cấu hình hoặc không hợp lệ, hộp in báo lý do chưa có QR.
- Có thể xem trước, tải PDF hoặc gửi máy in qua Agent. Lệnh in Agent giữ bản PDF của giỏ hàng tại lúc gửi để chống in trùng.
- Chỉ in tạm tính không lưu phiếu bán hàng, không trừ tồn kho, không ghi nhận thanh toán và không tiêu thụ bộ đếm số phiếu. Sau khi xác nhận thanh toán mới lưu hóa đơn chính thức.

Kiểm tra trên database riêng: PDF được tạo từ mẫu đang cấu hình; tiền hàng 580.000đ, VAT 58.000đ, tổng và số tiền trong QR cùng bằng 638.000đ; phí dịch vụ bằng 0; số phiếu bán và bộ đếm không thay đổi sau khi xem bản tạm tính.
