# Mockup Đội gom thạch

Mockup chơi được để duyệt trước khi code. Luật viết thật trong `index.html` (`tryStep`, `settle`, `replay`: lượt tối đa 5 bước kết thúc bằng Xong lượt, đẩy cả dãy, dính, nút và cửa (cửa kẹt khi có thứ nằm trong), khuôn, giới hạn vòng, lùi bước tối đa 5 lần mỗi lượt, đặt lại); mọi con số trên màn hình là tính ra. Đã sửa theo hai lượt duyệt thiết kế (design §3, §6).

Mở `index.html` bằng trình duyệt, không cần máy chủ. Bảng bên trái chọn sáng/tối, khung, cảnh. Thử nhanh một khung: `index.html?bare&scene=local4&vp=360x640&theme=dark`.

Cảnh: `menu`, `setup`, `local2` (cùng máy, đầu ván), `local2mid` (Hồng giữ nút ●, Lam đang đẩy), `full` (đã đi đủ 5 bước, có nút Giữ nút), `local4`, `online` (đến lượt bạn, có Lùi bước), `wait` (chờ người khác), `reset`, `resign`, `win`, `out` (hết vòng), `quit` (có người bỏ cuộc).

Ảnh trong `png/`, tên theo `cảnh-khung-sáng|tối`.

## Hướng hình ảnh

Cùng họ với Gom thạch: khay men kem, tường gạch men xanh xám, thạch bóng có ký hiệu riêng từng loại, khuôn là ô nét đứt màu nhạt. Mới:

- **Nhân vật**: hình tròn màu ghế (Lam, Hồng, Cam, Ngọc) có số ghế trắng đậm; người đến lượt có vòng mực dày và quầng nền, nhịp mờ chậm, và khung bàn mang màu ghế đó. Đứng trên nút thì có huy hiệu ký hiệu nút ở góc. Chấm màu ghế đánh dấu đường đi của lượt gần nhất.
- **Nút**: ô bo góc màu be có ký hiệu nhóm ● ▲ ■; có người hay thạch đứng thì đậm hơn.
- **Cửa đóng**: ô gỗ ba song dọc, huy hiệu ký hiệu nhóm ở giữa. **Cửa mở**: hai cột gỗ ở hai mép ô, ký hiệu ở giữa (nét đứt chỉ dành cho khuôn).
- **Chip** dưới bàn: "Lam · còn 3 bước", Vòng, Khuôn.
- **Bàn điều khiển**: hướng bị chặn thì tắt kèm lý do; "Giữ nút" hiện khi đứng trên nút.

Bản đồ trong mockup: "Hai gian bếp" 2 người (19 × 7, lời giải 25 bước trong 4 vòng, giới hạn 10 vòng; xem bảng bên trái) và bản nháp 4 người (19 × 13).

## Bản đi tự do (sau chơi thử 13/11/2026)

`free.html` thay lượt bằng đi tự do (design §10): không "Xong lượt", không vòng, không "Lùi bước", không "Giữ nút". Cùng máy có nhóm "Điều khiển" chọn nhân vật mà mũi tên, bàn điều khiển và vuốt điều khiển (mặc định Hồng); W A S D luôn là Lam, nên hai người chung một bàn phím đi cùng lúc được; phím 1–4 đổi nhân vật. Cảnh online cho Minh (Lam) tự đi mỗi 0,9 giây để thấy hai người đi cùng lúc; Minh đứng chờ khi cửa ● còn đóng. Thẻ thắng ghi số bước và thời gian. Thử nhanh: `free.html?bare&scene=online&vp=1280x800`.

Ảnh: `png/free-*`.
