# Proposal

## Why

Người dùng muốn thêm một game lấy cảm hứng từ Jelly Is Sticky (Lunarch Studios, 2022): game giải đố **một người**, đẩy khối thạch trên lưới ô kiểu Sokoban, thạch dính vào nhau và mỗi màu có tính chất riêng. Người dùng đã chốt **hướng giải đố một người** (11/2026), thay vì biến cơ chế thành cờ đối kháng. App hiện chỉ có game nhiều người theo lượt (cùng máy, với máy, online), nên đây là **loại nội dung mới: trò giải đố**.

Không chép game gốc: tên, hình, màn chơi đều tự làm; chỉ giữ thể loại (đẩy khối thạch dính trên lưới). Luật chi tiết của game gốc không có nguồn công khai nào ghi rõ (trang Steam chỉ tả chung; xem `design.md` §1), nên luật dưới đây là **luật tự thiết kế** và đã được thử bằng bộ giải tự động.

Change nằm ngoài các mốc M0–M8. `plan.md` §6.3 ghi "puzzle" ở mục "Sau đó"; change này đưa lên làm sớm, thêm một dòng ở §6.3 và quyết định 19 ở `idea.md` §9.

## What Changes

- **Gom thạch** (`jelly-gather`, tên tạm, chốt cùng mockup): trò giải đố một người.
  - **Bàn**: lưới ô nhìn từ trên xuống, có tường, nhân vật, các khối thạch. Không có trọng lực.
  - **Đi và đẩy**: mỗi bước đi một ô theo bốn hướng. Đi vào thạch thì đẩy cả khối đó một ô, kéo theo mọi khối bị nó đẩy vào. Có tường hay khối cố định chắn thì không đi được, và bước đó không tính.
  - **Dính**: sau mỗi bước, hai khối **cùng màu** chạm cạnh nhau dính lại thành một khối, mãi mãi. Khác màu không dính, nhưng vẫn đẩy nhau được.
  - **Qua màn**: mỗi màu thạch nằm gọn trong một khối.
  - **Tính chất theo màu**, giới thiệu dần qua các chương:
    - Thạch thường (dâu, lá dứa, xoài, khoai môn): dính với cùng màu.
    - **Đá viên**: khối chắn, đẩy được, không dính gì, không cần gom.
    - **Sương sáo**: dính với mọi màu. Nó nối hai khối cùng màu từ xa, nhưng cũng kéo theo cả màu không muốn.
    - **Thạch dừa**: dính cả vào tường; chạm tường là đứng yên luôn.
  - **24 màn tự thiết kế, 3 chương 8 màn**: dính lại (có đá viên từ màn 1-5), sương sáo, thạch dừa. Mỗi màn được bộ giải kiểm là giải được, và có số bước ít nhất.
- **Màn hình chơi**: số bước, **hoàn tác không giới hạn**, "Chơi lại màn" (cũng hoàn tác được), "Màn tiếp" khi xong.
  - Điều khiển bằng phím mũi tên hoặc WASD, vuốt trên bàn, hoặc bốn nút hướng trên màn hình.
  - Màn đầu của mỗi cơ chế có một dòng gợi ý.
- **Danh sách màn**: theo chương, đánh dấu màn đã giải và số bước tốt nhất, có nút "Tiếp tục". Mọi màn đều mở, không khoá theo tiến độ. Có phần "Cách chơi" ngắn.
- **Tiến độ và màn đang chơi dở lưu trên trình duyệt này** (localStorage), không gửi đi đâu. Đã mở trò chơi thì mất mạng vẫn chơi đủ mọi màn.
- **Menu**: thêm thẻ "Gom thạch" trong danh sách game, ghi "1 người" và số màn, nút "Chơi" mở danh sách màn. Thẻ sinh từ danh sách đăng ký `PUZZLES`, để thêm trò giải đố sau là một dòng.

## Ngoài phạm vi

- **Chế độ hai người, đấu với máy, online**: không có trong game gốc; người dùng đã chọn giải đố một người. Có thể làm change riêng sau khi chơi thử.
- **Thạch biến dạng, lửa, cổng và chìa, nhiều nhân vật**: các cơ chế khác của game gốc. Mỗi cơ chế thêm luật, hình, màn và test; để sau, khi 3 chương đầu đã được chơi thử.
- **Trình tạo màn, màn của người chơi, chia sẻ màn**: cần định dạng màn công khai và kiểm tra màn giải được ngay trên máy người chơi.
- **Gợi ý, xem lời giải**.
- **Câu đố hằng ngày**, bảng xếp hạng, đồng bộ tiến độ nhiều máy, sao lưu ra file.
- **Trò giải đố trong "Tiếp tục ván dở" của menu** và trang `/rules`: mục tiếp tục chỉ đọc ván của game nhiều người; cách chơi nằm ngay trong trò.
- **Chạy offline khi tải lại trang**: app chưa có PWA.

## Capabilities

### New Capabilities

- `jelly-gather`: luật Gom thạch (đi, đẩy, dính, tính chất theo màu, qua màn), các màn, màn hình chơi, điều khiển, hoàn tác, danh sách màn, tiến độ trên trình duyệt.

### Modified Capabilities

- `game-menu`: thêm requirement "Thẻ trò giải đố trên menu"; "Thông tin trên thẻ game" và "Vào chơi từ menu" chỉ còn nói về thẻ game nhiều người (thẻ trò giải đố không có thời lượng, không có "Online").
- `accessibility`: "Thanh trên cùng luôn thấy" có thêm danh sách màn và màn hình chơi của trò giải đố (màn hình chơi về danh sách màn).

## Bất biến

Change này **phải sửa phần dùng chung một lần**, và **thêm một bất biến**:

- **Phần dùng chung phải sửa:** bất biến "Thêm một game chỉ gồm GameDefinition + Board…" nói về game nhiều người. Trò giải đố không dùng `GameDefinition`, session, transport hay server: không có lượt giữa người chơi, không có máy, không có trọng tài. Ép nó vào `GameDefinition` sẽ mang theo màn hình bắt đầu ván, chế độ và kết quả theo ghế, đều vô nghĩa với trò giải đố. Vì vậy change sửa `MenuPage` và `menu-games` một lần để menu hiện được thẻ trò giải đố. Lý do và các phương án đã cân nhắc ở `design.md` §2.
- **Bất biến thêm vào `openspec/config.yaml`:** thêm một trò giải đố chỉ gồm thư mục `apps/web/src/puzzles/<id>/`, route dưới `app/puzzles/`, bản dịch và một dòng `PUZZLES`. Trò giải đố không import `engine`, `games`, `protocol`, `transport`, `server` (ESLint chặn), và không gửi dữ liệu người chơi đi đâu.
- **"Luật game là hàm thuần"** vẫn giữ: luật Gom thạch là hàm thuần, không ngẫu nhiên. Một lần chơi là màn cộng danh sách bước, dựng lại bằng cách phát lại, đúng tinh thần "một ván = danh sách nước đi".

## Impact

- **Mới**:
  - `apps/web/src/puzzles/registry.ts`.
  - `apps/web/src/puzzles/jelly-gather/`: luật, màn, component, test, bộ giải dùng trong test.
  - Route `apps/web/src/app/puzzles/jelly-gather/[[...path]]/`.
- **Sửa**:
  - `features/menu/{MenuPage,menu-games}`: thẻ trò giải đố; sửa test đếm thẻ và liên kết của menu (`MenuPage.test.tsx`, `e2e/menu.spec.ts`).
  - `tools/card-score/navigation.tsx` chuyển sang `features/shell/client-navigation.tsx` để hai bên dùng chung.
  - Hàm kiểm token của `games/theme-css.test.ts` chuyển sang `src/test/` để test theme của trò giải đố dùng lại.
  - `config/storage-keys.ts`, `messages/{vi,en,ja}.json` (namespace `Puzzles` cho tên và mô tả trên menu, `JellyGather` cho chữ trong trò, khoá `Menu.levels`).
  - `packages/config/eslint`: ranh giới cho `src/puzzles/**`, có test.
  - `packages/ui/src/icons.ts`: thêm `ArrowUp`, `Undo2`, `RotateCcw`.
  - E2E (thêm mới, và `layout-small`, `motion`, `theme-color`, `top-bar`, `a11y`), `ui-shots`.
- **Không đổi**: `packages/engine`, `packages/games`, `packages/protocol`, `apps/web/src/server`, `apps/web/src/transport`. Không thêm thư viện, không thêm dịch vụ.
- **Tài liệu**: `idea.md` (§4, quyết định 19), `plan.md` (§6.3, §10), `README.md`, `openspec/config.yaml`.
