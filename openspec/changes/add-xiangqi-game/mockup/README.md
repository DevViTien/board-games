# Mockup Cờ tướng

Mockup để duyệt trước khi code. Mở `index.html` bằng trình duyệt, không cần máy chủ. Bảng bên trái chọn cảnh, khung và sáng/tối; thử nhanh một khung: `index.html?bare&scene=selected&vp=360x640&theme=dark`.

Nước đi trên bàn được tính bằng một bộ sinh nước nhỏ viết trong mockup, đúng luật (cản chân Mã, cản mắt Tượng, ngòi Pháo, cung, sông, lộ mặt Tướng), nên chấm và góc ngoặc là thật. Chữ Hán dùng Noto Serif TC để xem hình; phông của code chốt ở design §5.

Cảnh `play` (mặc định) **chơi được**: hai người cùng máy bấm quân rồi bấm điểm, có hoàn tác, ván mới, Esc bỏ chọn; báo "Chiếu!", chiếu bí, hết nước, chiếu dai (thua), lặp lại ba lần (hoà), 120 nước không ăn quân (hoà) đúng như spec. Bộ sinh nước đã được kiểm bằng perft (44, 1.920, 79.666) và 300 ván ngẫu nhiên. Ký hiệu nước trong mockup chưa có "t"/"s" cho hai quân cùng cột (có trong spec và sẽ có trong code).

Các cảnh còn lại: `setup`, `start`, `selected` (Pháo đầu: 4 điểm đi được, ăn Tốt qua ngòi), `check`, `mate` (chiếu bí, thẻ kết quả), `ai` (máy đang nghĩ). Ảnh trong `png/`, tên `cảnh-khung-sang|toi`.
