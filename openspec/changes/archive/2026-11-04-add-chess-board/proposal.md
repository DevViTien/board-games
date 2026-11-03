# Proposal

## Why

Luật Cờ vua đã có ở `add-chess-rules` nhưng người chơi chưa thấy game. Change này đưa Cờ vua lên app: bàn xanh–kem dễ đọc kiểu các trang chơi cờ online quen thuộc, bộ quân "staunty" của Lichess, thanh người chơi trên và dưới bàn, chọn và đi quân bằng chuột, chạm, bàn phím và trình đọc màn hình, chọn quân phong cấp, đòi hoà, lật bàn, sổ ghi, chơi cùng máy và online. Thuộc mốc **M7. Cờ vua** (plan.md §6.2), change thứ hai và cuối của mốc: xong change này là M7 "chơi được cùng máy và online".

## What Changes

- **Đăng ký**: `chess` vào `GAMES`/`GAME_IDS`, `GAME_ENTRY_LOADERS`, `GAME_ARTWORK`; danh sách "Sắp có" thành rỗng — menu có bốn game chơi được, không thẻ "Sắp có" nào. Màn hình bắt đầu ván chỉ có "Cùng máy" và "Online" (`supportsAI: false`, hành vi chung sẵn có).
- **Danh sách game có máy cho AI Worker**: subpath mới `@board-games/games/ai` (`AI_GAMES`, test khớp `GAMES.filter(meta.supportsAI)`); `compute-ai-move` dùng nó nên `chess.js` không vào chunk Worker.
- **Bản sắc** (`games/chess/theme.css`, sáng + tối): ô xanh lá và kem (giá trị riêng của dự án), toạ độ nhỏ trong các ô sát mép, bộ quân **"staunty"** của sadsnake1 trên Lichess (CC BY-NC-SA 4.0, chép nguyên file vào `apps/web/public/pieces/staunty/` kèm ghi công; người dùng chốt ngày 04/11/2026, thay bộ quân tự vẽ của mockup), dấu ô hai lớp mực + giấy; bản tối là xanh–kem đậm hơn. Bảng tỉ số AA ở design §3; mockup `mockup/index.html`.
- **Thanh người chơi trên và dưới bàn** (bên ở dưới bàn có thanh dưới bàn): hình Vua của màu, tên, loại ghế, "Đến lượt", trạng thái kết nối, hơn quân; chỗ bên phải để dành cho đồng hồ sau này. Khung màn hình chơi chung thêm một lựa chọn cho bàn: đặt hai ghế quanh bàn thay cho bảng ở cột bên.
- **Bàn** (`games/chess/Board.tsx` + hook `use-selection`, `use-roving-focus`): lưới `role="grid"` 8 × 8, tên ô "Mã trắng ở g1" / "Ô e4 trống", ô chọn có `aria-selected` và lời báo ("Đã chọn Mã g1: đi được f3, h3"); chấm cho ô trống, dấu góc cho ô ăn được (cả bắt tốt qua đường); Escape bỏ chọn; một điểm dừng Tab, mũi tên theo hướng màn hình. Lựa chọn và bộ chọn phong cấp giữ nguyên khi phòng online cập nhật cùng thế cờ.
- **Phong cấp**: hộp thoại `<dialog>` "Tốt g2 → g1" bốn quân, Hậu có tiêu điểm trước, huỷ giữ Tốt đang chọn.
- **Đòi hoà**: nút "Đòi hoà" kèm lý do chỉ hiện khi bên đến lượt (ở thiết bị này) có quyền đòi; bấm là gửi nước đòi hoà của luật.
- **Lật bàn**: nút ở mọi chế độ, không tự lật, về mặc định khi màu đổi (chơi lại) hay mở lại trang.
- **Nước vừa đi, chiếu, sổ ghi, lời**: ô đi/ô đến tô vàng + khung đứt nét; vua bị chiếu có vầng đỏ, vòng và chữ "Chiếu! Trắng đang bị chiếu"; sổ ghi ký hiệu đại số dạng hình (khung cuộn có tên, nhận tiêu điểm, tự cuộn tới nước mới); nhãn nước của đối thủ; dòng giải thích kết quả cho bảy lý do. Bản dịch vi/en/ja.
- **Hiệu ứng**: quân trượt 180 ms (cả Xe khi nhập thành), tắt khi giảm chuyển động.
- **Online** chạy qua phòng hiện có; chơi lại đổi màu và bàn quay theo. Không đổi giao thức.
- **Giấy phép**: `apps/web/public/third-party-licenses.txt` với thông báo BSD-2-Clause của `chess.js` và ghi công bộ quân staunty (CC BY-NC-SA 4.0); `LICENSE.txt` cạnh file quân.
- **Test**: component, hook, E2E cùng máy và online, ảnh `pnpm ui:shots`.

## Capabilities

### New Capabilities

(không có — thêm requirement vào `chess` của `add-chess-rules`)

### Modified Capabilities

- `chess`: thêm chế độ chơi, bàn, thanh người chơi, chọn/đi quân, giữ lựa chọn khi phòng cập nhật, bàn phím, phong cấp, đòi hoà, lật bàn, nước vừa đi và chiếu, sổ ghi, nhãn nước, kết quả, vừa màn hình, hiệu ứng, online.
- `game-menu`: "Game chơi được và game sắp có trên menu" — Cờ vua chơi được, không còn thẻ "Sắp có", thêm scenario "Thẻ Cờ vua"; "Vào chơi từ menu" — scenario "Thẻ sắp có không mở được" không còn nói tới Cờ vua.
- `local-play`: "Bảng người chơi" — game hai người chọn được hai thanh ghế trên và dưới bàn thay cho bảng ở cột bên; scenario cho Cờ vua.

## Ngoài phạm vi

- Không sao chép hình quân, bàn hay tài sản của chess.com (độc quyền): chỉ lấy hướng (bàn xanh–kem, thanh người chơi quanh bàn). Quân là bộ staunty của Lichess theo giấy phép mở CC BY-NC-SA 4.0, không sửa file; mọi hình khác tự vẽ.
- Đồng hồ (v1): thanh người chơi chỉ để chỗ, không vẽ ô trống. Ảnh đại diện người chơi: chỉ có hình Vua của màu (không có tài khoản, idea.md §9).
- Máy chơi Cờ vua, đề nghị hoà cần đối phương đồng ý (v1), đầu hàng và bỏ ván (M8), nhập/xuất PGN, premove, Chess960: đã chốt.
- Đòi hoà bằng nước báo trước (FIDE 9.2.1): `add-chess-rules` Ngoài phạm vi.
- Kéo thả quân: nhấp/chạm hai lần đủ cho chuột, cảm ứng và bàn phím; kéo thả cần pointer capture, xử lý cuộn trang trên điện thoại và đường đi a11y riêng — xét lại sau khi chơi thử.
- Thêm game "Sắp có" mới sau M7: người dùng chốt không thêm.
- Trang luật chơi `rules.{vi,en,ja}.mdx`: M8. Âm thanh đi quân, chủ đề bàn khác, xem lại ván, gợi ý nước đi.

## Impact

- **Code**:
  - `packages/games/src/index.ts`, `ids.ts`, `ai.ts` (mới) + test, `package.json` (subpath `./ai`).
  - `apps/web/src/games/chess/` (mới: `index.ts`, `theme.css`, `Artwork.tsx`, `pieces.tsx`, `Board.tsx`, `use-selection.ts`, `use-roving-focus.ts`, `PromotionPicker.tsx`, `MoveSheet.tsx`, `san.ts`, `move-label.ts`, `player-label.ts`, `seat-summary.ts`, `result-detail.ts`, `SeatMark.tsx` + test), `games/registry.ts`, `games/artwork.ts`, `games/types.ts` (`BoardParts.seatOrder?`), `games/theme-css.test.ts` (cặp hai lớp, focus trên nhiều nền), `games/define-game-entry.test.ts`, `features/play/PlayScreen.tsx` + `PlayerPanel.tsx` (thanh ghế quanh bàn), `features/menu/planned-games.ts` (rỗng), `MenuPage.tsx` (nguồn thẻ truyền vào được) và test menu, `ai-worker/compute-ai-move.ts`, `apps/web/public/third-party-licenses.txt`, `apps/web/public/pieces/staunty/` (12 SVG + `LICENSE.txt`), `apps/web/messages/{vi,en,ja}.json`, `apps/web/e2e/` (mới `play-chess.spec.ts`, `online-chess.spec.ts`), `apps/web/ui-shots/screens.shots.ts`.
- **Không đổi**: engine, protocol, server, transport, `packages/ui`.
- **Phụ thuộc**: không thêm (`chess.js` đã thêm ở `add-chess-rules`; app không import trực tiếp).
- **Bất biến** "Thêm một game chỉ gồm GameDefinition + Board, Artwork, theme.css + bản dịch + một dòng registry và một dòng GAME_ARTWORK": change này sửa phần dùng chung **hai lần, một lần cho mọi game sau**: (1) `BoardParts.seatOrder?` + thanh ghế trong `PlayScreen` — cách bố trí ghế quanh bàn mà người dùng chọn cho Cờ vua, dùng lại được cho game hai người sau (Cờ tướng); (2) `AI_GAMES` cho Worker — từ nay game có máy thêm một dòng ở `ai.ts` (test bắt nếu quên). Task cuối sửa câu bất biến trong `openspec/config.yaml` và checklist plan.md §4 cho khớp. Không chạm bất biến nào khác.
- **Tài liệu**: plan.md §3.3 (hàng AI, hàng khung màn hình ván), §4 (checklist thêm game), §10 (M7 xong); `openspec/config.yaml` (câu bất biến); README (danh sách game nếu có).
