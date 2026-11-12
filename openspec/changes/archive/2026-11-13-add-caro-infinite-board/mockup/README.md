# Mockup bàn caro vô hạn

Tài liệu tham chiếu cho cỡ bàn "Vô hạn" của Cờ caro (người dùng yêu cầu implement luôn ngày 13/11/2026, nên mockup không chờ duyệt; ảnh `pnpm ui:shots` là chỗ kiểm cuối). Luật vùng viết thật trong `index.html` (`grow`: vùng đầu 15×15 giữa giới hạn 61×61, nở thêm 5 ô quanh quân vừa đặt; `winLine` theo luật tự do cho gọn).

Mở `index.html` bằng trình duyệt, không cần máy chủ. Bảng bên trái chọn sáng/tối, khung, cảnh. Thử nhanh một khung: `index.html?bare&scene=mid&vp=390x844&theme=dark`. Bàn chơi được: click hay chạm để đặt quân (ô dưới 24 px trên màn hình cảm ứng thì chạm hai lần), kéo chuột hay vuốt để cuộn, nút thu phóng giữ tâm khung, "Về nước vừa đi".

Cảnh: `setup` (nhóm "Bàn cờ" có "Vô hạn"), `start` (đầu ván, trông như bàn 15×15), `mid` (giữa ván, vùng đã nở về phía trên trái), `away` (đã cuộn ra xa), `out` (thu nhỏ hết mức: vùng nhỏ hơn khung nằm giữa giấy, nút thu nhỏ ở dạng không bấm được), `won` (hàng thắng khoanh như trên giấy), `tap` (điện thoại, chạm lần đầu hiện quân xem trước).

Ảnh trong `png/`, tên theo `cảnh-khung-sáng|tối`.

## Hướng hình ảnh

Giữ nguyên trang vở ô li của Cờ caro: giấy kem, dải lề đỏ, đường kẻ xanh, X bút bi xanh, O bút bi đỏ, vòng nét đứt cho nước vừa đi, hàng thắng gạch và khoanh. Mới:

- Khung giấy cùng cỡ với bàn 15×15 nhưng là khung cuộn; đường đậm mỗi 5 ô tính theo giới hạn nên không nhảy khi vùng nở.
- Ba nút dưới bảng người chơi (máy tính) hay dưới bàn (điện thoại): thu nhỏ, phóng to (chỉ icon, có tên đọc được), "Về nước vừa đi".
- Chip luật "Vô hạn · Chặn hai đầu".
