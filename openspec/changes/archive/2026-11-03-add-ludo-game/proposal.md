# Proposal

## Why

Cờ cá ngựa là game thứ hai của MVP (idea.md §3, §9 mục 6) và là game kiểm chứng phần "nhiều người + xúc xắc" của kiến trúc: 2–4 người, mỗi lượt một lần gieo do bộ sinh ngẫu nhiên của nơi chạy ván tạo (server khi online), máy chơi thay nhiều ghế. Change này đưa Cờ cá ngựa vào app với **bộ luật người dùng đã chốt** (luật "phổ biến" của idea.md §3.4 cộng bốn điểm riêng: ra quân chỉ bằng 6, gieo 1 nhảy tới chân chuồng kế tiếp, lên chuồng từ chân chuồng theo số gieo, thắng khi chiếm bậc 3–6), chơi được cùng máy, đấu với máy và online giữa người với người, với 2, 3 hoặc 4 người. Thuộc mốc **M6. Cờ cá ngựa** (plan.md §6.2); dựa trên `add-multiplayer-setup` (chọn số người, nhiều máy, nhịp xúc xắc). Ghế máy trong phòng online là change kế tiếp `add-room-ai-seats`.

## What Changes

- **Luật Cờ cá ngựa** (`packages/games/src/ludo/`): đường chung 56 ô (mỗi màu 14 ô), 4 ô chân chuồng, chuồng đích 6 bậc; lượt = nước "gieo" (kết quả 1–6 qua `outcomes`, xác suất đều) rồi nước "đi ngựa"; không ngựa nào đi được thì mất lượt ngay trong nước gieo; gieo 6 được gieo thêm; ra quân chỉ khi gieo 6 (đá ngựa đối thủ ở ô xuất phát); không vượt ngựa nào, không đứng chung ô với ngựa mình, dừng đúng ô ngựa đối thủ thì đá; gieo 1 bắt buộc nhảy tới chân chuồng kế tiếp khi đường trống, không thì đi 1 ô; từ chân chuồng của mình gieo k lên thẳng bậc k, rồi từ bậc n phải gieo đúng n+1; thắng khi đủ 4 ngựa ở bậc 3, 4, 5, 6.
- **Tuỳ chọn luật `LudoOptions`** cho các điểm hay đổi theo vùng và dễ tách: điều kiện ra quân (6 | 1 hoặc 6), gieo thêm (khi 6 | không), vượt ngựa (không | được), nhảy khi gieo 1 (có | không); mặc định đúng bộ luật trên. Ở M6 luật **chỉ nhận bộ mặc định** từ bên ngoài (đường dẫn, tạo phòng, biên bản) và **không** khai báo `optionChoices`, nên không ai chạy được luật ẩn và giao diện không hiện gì về biến thể (chọn biến thể là việc của v1); biến thể được viết và test qua một định nghĩa luật chỉ dành cho test. Các điểm còn lại (2 xúc xắc, "rào" hai ngựa, ô xuất phát an toàn, lên chuồng không chia bậc, thắng không tính bậc) cố định trong luật (design §3).
- **Máy chơi Cờ cá ngựa**: `evaluate` mang thứ tự ưu tiên của idea.md §3.1 (đá quân > lên chuồng > ra quân > an toàn > tiến), dùng chung `chooseMove` của engine (expectimax ở lần gieo, mọi ghế khác là đối thủ): Dễ nhìn một nước và đôi khi đi ngẫu nhiên, Vừa nhìn qua lần gieo kế tiếp, Khó đào sâu trong giới hạn thời gian; chạy với 2, 3, 4 người.
- **Bàn cờ** (`apps/web/src/games/ludo/`): SVG hình chữ thập tự vẽ (không theo bàn thương mại nào), ngựa phân biệt bằng màu **và** ký hiệu (tròn, vuông, tam giác, thoi), nút "Gieo xúc xắc", nhóm lựa chọn ngựa (nói rõ tới đâu, đá ai), chỉ ô đích khi trỏ/đưa tiêu điểm, danh sách vị trí ngựa cho trình đọc màn hình (lần gieo của mình do bàn đọc, nước của máy/đối thủ do lời báo của màn hình chơi đọc — không đọc hai lần), gieo 6 không đi được báo "được gieo thêm", hiệu ứng xúc xắc lăn và ngựa đi từng ô (keyframes trong `@theme` của `packages/ui`, tắt khi giảm chuyển động, không dài hơn nhịp máy), vừa khung 360 px, dùng trọn bằng bàn phím.
- **Màu quân dùng chung**: token theo tên màu `piece-red`, `piece-blue`, `piece-yellow`, `piece-green` (sáng/tối) và keyframes `--animate-dice-roll`, `--animate-piece-kicked` trong `packages/ui`.
- **Đăng ký game**: `GAME_IDS`, `GAMES`, một dòng `GAME_ENTRY_LOADERS`; bỏ Cờ cá ngựa khỏi "Sắp có"; thẻ menu 2–4 người, ~20 phút; bản dịch vi/en/ja.
- **Online giữa người với người** chạy ngay nhờ server dùng chính luật trong `packages/games` (server gieo mọi lần gieo); E2E hai người.
- Test: mỗi điểm luật một nhóm test, mỗi biến thể một test (qua định nghĩa chỉ cho test), bộ kiểm tra hợp đồng (mặc định và mọi biến thể đổi), **1000 ván tự chơi ngẫu nhiên với seed cố định đều kết thúc** (vòng lặp chỉ trên state, file riêng), thuộc tính "không ai bị kẹt", AI (thứ tự ưu tiên ở 2 và 4 người, nước thắng, Dễ khác Vừa, 4 người trong giới hạn thời gian), bàn cờ (component), E2E smoke 2/3/4 người × cùng máy/đấu với máy, thế dựng sẵn cho luật nhảy, khung 360 px, online hai người.

## Capabilities

### New Capabilities

- `ludo`: luật Cờ cá ngựa (bàn, lượt gieo và đi, mất lượt, gieo thêm, ra quân, đi trên đường chung, đá, nhảy khi gieo 1, lên chuồng đích, thắng, ván luôn kết thúc), tuỳ chọn luật (chỉ nhận bộ mặc định), máy chơi Cờ cá ngựa, bàn cờ trên giao diện (gieo, chọn ngựa, bàn phím, trình đọc màn hình, hiệu ứng, màn hình nhỏ, nhãn nước đi) và chơi online.

### Modified Capabilities

- `game-menu`: sửa "Game chơi được và game sắp có trên menu" (MODIFIED; scenario "Menu khi có Tic-tac-toe và Cờ caro" giữ tên, nay nói Cờ cá ngựa cũng chơi được; thêm "Thẻ Cờ cá ngựa"). Đã thử: `validate --strict` từ chối đổi tên scenario trong MODIFIED, nhưng nhận và archive được khi giữ tên.

## Ngoài phạm vi

- Ghế máy chơi thay trong phòng online, phòng 3–4 người có máy, hiện lần lượt nhiều nước nhận cùng lúc: change `add-room-ai-seats`.
- Chọn biến thể luật trên giao diện, hiện luật đang dùng: v1 (idea.md §4.3, plan.md §6.3).
- Hai xúc xắc, "rào" hai ngựa, ô xuất phát an toàn, lên chuồng không chia bậc, thắng không tính bậc, mất lượt khi ra 6 ba lần, xếp hạng nhì/ba/tư: không làm ở M6.
- Tự đi khi chỉ có một ngựa đi được, tranh lượt đi đầu bằng xúc xắc, xoay bàn theo màu của người chơi, âm thanh: không làm ở M6.
- Trang luật chơi `rules.{vi,en,ja}.mdx`: M8 cùng các game khác.

## Impact

- **Code**:
  - `packages/games/src/ludo/` (mới: `constants.ts`, `options.ts`, `track.ts`, `moves.ts`, `rules.ts`, `ai.ts`, `index.ts`; chỉ cho test: `test-positions.ts`, `test-variants.ts`, `self-play.ts`; + test), `packages/games/src/{index.ts,ids.ts}`.
  - `apps/web/src/games/ludo/` (mới: `Board.tsx`, `board-layout.ts`, `Dice.tsx`, `use-ludo-animation.ts`, `player-label.ts`, `move-label.ts`, `index.ts` + test), `games/registry.ts`, `features/menu/planned-games.ts`, `apps/web/messages/{vi,en,ja}.json`, `apps/web/e2e/` (mới `play-ludo.spec.ts`, helper dựng biên bản Cờ cá ngựa).
  - `packages/ui/src/styles.css`: token `piece-red|blue|yellow|green`, `--animate-dice-roll`, `--animate-piece-kicked` (không CSS Module).
- **Engine, transport, server, giao thức**: không đổi. Biên bản một ván 4 người ~600–900 nước (gieo + đi), ~35 KB JSON (design §7).
- **Phụ thuộc**: không thêm thư viện.
- **Bất biến**: "Thêm một game chỉ gồm GameDefinition + Board + bản dịch + một dòng registry" — giữ được nhờ `add-multiplayer-setup` đã làm phần dùng chung; riêng token màu quân và keyframes thêm vào `packages/ui` một lần, dùng lại được cho game nhiều người sau này. Luật là hàm thuần, xúc xắc chỉ qua `outcomes` + rng của nơi gọi (bất biến ngẫu nhiên, server gieo khi online).
- **Tài liệu**: plan.md §10 (M6) trong task cuối; README nếu có danh sách game.
