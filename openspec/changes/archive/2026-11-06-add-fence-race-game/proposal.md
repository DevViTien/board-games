# Proposal

## Why

Người dùng muốn thêm một game thuộc thể loại **đua về đích kết hợp đặt rào chặn đường**, sau khi xem một video game kiểu này. Thể loại hợp với app: theo lượt, không có yếu tố ngẫu nhiên, ván ngắn, chơi vui với bạn bè. Người dùng đã chốt: chơi theo lượt, có cả 2 và 4 người, đồ hoạ 2D.

`idea.md` cấm dùng "tên, hình ảnh, luật đặc thù của board game thương mại", mà game nổi tiếng nhất của thể loại này (Quoridor) là sản phẩm thương mại. Vì vậy đây là **game tự thiết kế**, tên **Cờ rào**, có luật và hình ảnh riêng, không phải bản sao đổi tên.

Change thuộc nhóm **v2 "game tự thiết kế"** trong plan.md §6.3, được đưa lên làm sớm theo yêu cầu của người dùng. `idea.md` §9 mục 6 ghi "game tự thiết kế để v2", nên change thêm một quyết định mới vào đó.

## What Changes

- **Game mới Cờ rào** (`fence-race`, nhóm "tự thiết kế"), 2–4 người, chơi được cùng máy, đấu với máy và online bằng khung sẵn có.
- **Luật**:
  - Mỗi lượt làm một trong ba việc: đi quân một ô, đặt một rào dài hai ô, hoặc phá một rào. Ai vào cổng đích, là 5 ô giữa của cạnh đối diện, trước thì thắng.
  - Không được đặt rào bịt kín đường về đích của bất kỳ ai.
  - Hết 200 nước của cả ván (198 khi ba người) mà chưa ai về đích thì người gần đích nhất thắng, bằng nhau thì hoà.
- **Những điểm tự thiết kế** so với các game cùng thể loại:
  - **Đích là cổng 5 ô**, không phải cả cạnh: đường đua dồn về một điểm tranh chấp. Người dùng chọn điểm này ngày 06/11/2026 sau khi xem số đo tự chơi, vì các khác biệt còn lại chưa đủ tạo bản sắc riêng.
  - Mỗi người có **một lần phá rào** trong cả ván, phá được rào của bất kỳ ai: đây là công cụ lội ngược dòng.
  - **Quân không chặn nhau và không nhảy qua nhau**: được đứng chung ô, nên không có luật nhảy với các trường hợp mơ hồ sát mép bàn.
  - **Bàn 11 hàng × 9 cột** khi hai người (đường đua dài hơn), 9 × 9 khi ba hoặc bốn người.
  - **Số rào riêng**: 9 rào mỗi người khi hai người, 6 khi ba người, 4 khi bốn người.
  - **Giới hạn số nước** để ván luôn kết thúc.
  - Hình ảnh riêng theo mockup; khi đặt rào, người chơi thấy trước đường về đích của mỗi người dài ra bao nhiêu bước.
- **Có 3 người**: màn hình bắt đầu ván hiện mọi số trong khoảng người chơi của game (`game-setup`), và ván 3 người không tốn thêm code, nên giữ cả 3 thay vì sửa phần dùng chung để loại nó.
- **Máy chơi được ở ba mức**, cả ghế máy trong phòng online: biết tiến về đích, biết chặn, biết dùng lần phá rào.
- **Thao tác trên điện thoại**: ba chế độ Đi quân, Đặt rào, Phá rào. Đặt và phá rào có bước xem trước rồi xác nhận, để không đặt nhầm trên khe nhỏ.
- **Trang luật** có hình minh hoạ, **thẻ trên menu**, bản dịch vi/en/ja.

## Capabilities

### New Capabilities

- `fence-race`: luật, máy và màn hình chơi của Cờ rào: bàn và số rào theo số người, ba loại nước đi, điều kiện đặt rào, phá rào, cổng đích, kết thúc ván, cách thao tác và hiển thị.

### Modified Capabilities

- `game-menu`: "Game chơi được và game sắp có trên menu": menu có năm game chơi được, thêm thẻ Cờ rào.
- `game-rules`: thêm requirement "Luật Cờ rào"; "Đầu hàng và bỏ ván trên trang luật" nay áp dụng cả Cờ rào, game thứ hai có "Máy chơi thay".
- `online-play`: "Nhắc người đến lượt" không còn viết riêng cho Cờ cá ngựa.

## Impact

- **Luật** (`packages/games/src/fence-race/`): `GameDefinition`, tìm đường, kiểm tra rào, `evaluate`, `candidateMoves`; thêm id vào `GAME_IDS`, `GAMES`, `AI_GAMES`.
- **Ứng dụng** (`apps/web/src/games/fence-race/`): `Board`, `Artwork`, `Rules`, `theme.css`, nhãn người chơi, nhãn nước đi, chi tiết kết quả; mỗi registry thêm một dòng (`GAME_ENTRY_LOADERS`, `GAME_ARTWORK`, `GAME_RULES`). Bản dịch vi/en/ja.
- **Tài liệu**: `idea.md` §3.3 và §9 (quyết định mới), plan.md §6.3 và §10, README.
- **Thư viện và dịch vụ**: không thêm gì.
- **Bất biến**: không vi phạm. Thêm game chỉ gồm các phần trên; `engine`, `session`, `transport`, `menu`, `server`, `packages/ui` không sửa. Luật là hàm thuần, không ngẫu nhiên; một ván là danh sách nước đi.
- **Ranh giới bản quyền**: vòng chơi cốt lõi (đi quân hoặc đặt rào, không được bịt kín đường) là cơ chế chung của thể loại nên vẫn giữ. Tên, hình ảnh và các luật liệt kê ở trên là của dự án. Không dùng tên Quoridor trong app hay tài liệu hiển thị cho người chơi, không lấy hình từ game đó hay từ video tham khảo.

## Ngoài phạm vi

- Chơi thời gian thực, đồ hoạ 3D (người dùng đã chọn theo lượt và 2D).
- Tuỳ chọn luật do người chơi chọn (cỡ bàn, số rào, tắt phá rào): chưa có nhu cầu, thêm sau bằng cơ chế tuỳ chọn sẵn có.
- Ô đặc biệt, vật phẩm, kỹ năng khác ngoài phá rào.
- Xem lại ván, bảng thành tích.
- Âm thanh.
