# Mockup đổi tuỳ chọn ván mới

Mockup tĩnh để duyệt trước khi code, cho change này và cho phần bản đồ của `add-jelly-crew-game` §11.

Mở `index.html` bằng trình duyệt; không cần máy chủ. Bảng bên trái chọn cảnh, khung hình và giao diện sáng/tối. Muốn xem nhanh một khung thì dùng `index.html?bare&scene=change&vp=360x640&theme=dark`.

## Các cảnh

- `setup`: màn bắt đầu ván, 8 bản đồ thành lưới, mỗi ô có độ khó.
- `won`: thắng khi chơi cùng máy, thẻ kết quả có "Bản đồ tiếp: Tiệm chè" (nút chính), "Ván mới", "Đổi bản đồ".
- `change`: hộp "Đổi bản đồ" khi chơi cùng máy.
- `last`: thắng bản đồ cuối, không có nút "Bản đồ tiếp".
- `online`, `online-change`: các cảnh trên khi chơi online ("Chơi lại" thay cho "Ván mới").
- `online-new`: màn hình của Lan sau khi Minh đổi sang "Tiệm chè": dòng trạng thái ghi "Ván mới: Tiệm chè · bạn là Hồng".
- `caro`, `caro-change`: Cờ caro với nút và hộp "Đổi bàn, luật". Cờ caro không có ghi chú nên nhóm lựa chọn vẫn giữ dạng thanh.

Bàn "Tiệm chè" là bố cục nháp, chỉ để xem hình. Bố cục thật được thiết kế ở task 7.2 của `add-jelly-crew-game`.

Ảnh nằm trong `png/`, đặt tên theo mẫu `cảnh-khung-sang|toi`.
