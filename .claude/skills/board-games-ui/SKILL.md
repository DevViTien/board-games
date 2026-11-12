---
name: board-games-ui
description: Source of truth for all UI work in the board-games repo (Board Games Hub). Use for anything visual or interactive in apps/web or packages/ui - design tokens, colours, dark mode, typography, layout, responsive/mobile fixes, components, boards and pieces, game-end and turn feedback, animations and motion, accessibility, screenshots, mockups, redesign - including OpenSpec changes that touch the UI. Also when the user says "giao diện", "UI", "thiết kế", "bàn cờ", "hiệu ứng", "màu", "dark mode". Overrides the vendored frontend-design, web-design-guidelines, vercel-react-best-practices and vercel-composition-patterns skills where they conflict.
---

# Giao diện Board Games Hub

Skill này là **nguồn chân lý** cho mọi việc giao diện trong repo. Thứ bậc khi mâu thuẫn:
`CLAUDE.md` + bất biến trong `openspec/config.yaml` > skill này > các skill vendored
(`frontend-design`, `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`;
nguồn và phiên bản ghi ở `.claude/skills/VENDORED.md`).

## Khi nào dùng skill vendored nào

| Giai đoạn                                    | Skill                                                        | Lấy gì                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Khám phá, đề xuất hướng hình ảnh, làm mockup | `frontend-design`                                            | Cách chọn hướng thẩm mỹ rõ ràng, tránh giao diện "AI chung chung"                      |
| Code                                         | `vercel-react-best-practices`, `vercel-composition-patterns` | Hiệu năng React, tách component, compound component thay cho prop boolean              |
| Kiểm tra                                     | `web-design-guidelines` + ảnh chụp `pnpm ui:shots`           | Rà a11y, form, focus, chuyển động, typography theo bộ quy tắc web interface guidelines |

### Khi skill khác nói khác

Luật của dự án thắng:

- `frontend-design` tự chọn font → giữ Be Vietnam Pro + Noto Sans JP, trừ khi một change quyết khác (font mới có subset `vietnamese`). Bảng màu hex riêng, selector CSS thô → token + Tailwind. Viết chữ thẳng trong code → khoá trong `messages/{vi,en,ja}.json`. (Sentence case của nó thì hợp.)
- `web-design-guidelines` đòi Title Case cho tiêu đề/nút → dùng sentence case (tiếng Việt, tiếng Nhật không có Title Case). Gợi ý `nuqs`, `virtua` → không có trong dự án, không thêm thư viện khi chưa review.
- `vercel-react-best-practices`: SWR, `better-all`, `lru-cache`, `@vercel/analytics` → không có trong dự án. `bundle-barrel-imports` → icon vẫn chỉ qua `@board-games/ui` (package được import từ mã nguồn). Đọc `localStorage` bằng `JSON.parse` trần → kiểm bằng zod. Cache/cờ có thể đổi ở mức module → không bao giờ trong `engine`/`games` (hàm thuần). Màu cứng (`bg-gray-200`), inline style trong ví dụ → token. Lời khuyên về memo giả định React Compiler → dự án **chưa bật**, theo cách dùng `memo`/`useMemo` hiện có.
- `vercel-composition-patterns`: ví dụ viết cho React Native (`TextInput`, `onPress`) → áp dụng mẫu, không chép API.
- Mọi skill: Server Action, data fetching, thư viện animation tuỳ ý → không có trong kiến trúc này; xem mục dưới.

## Luật cứng

**Token và style**

- Màu, bo góc, bóng chỉ lấy từ token trong `packages/ui/src/styles.css`. Màu mới = token mới, có giá trị **sáng và tối**: thêm vào `:root`, vào khối `@media (prefers-color-scheme: dark)` **và** khối `:root[data-theme="dark"]` (hai khối tối giống hệt nhau), rồi một dòng `--color-*` trong `@theme inline`. Không viết hex/oklch/`bg-blue-500` trong component.
- Ghép class bằng `cn()`, biến thể bằng `cva()`; component nhận `className`. CSS riêng chỉ khi Tailwind không làm được (CSS Module cạnh component, plan.md §4.3).
- Icon chỉ import từ `@board-games/ui` (`packages/ui/src/icons.ts`); icon trang trí `aria-hidden`, nút chỉ có icon có `aria-label`. Quân và bàn cờ là SVG tự vẽ trong `apps/web/src/games/<id>/`; ngoại lệ đã chốt: quân Cờ vua là bộ "staunty" của Lichess (CC BY-NC-SA 4.0), file nguyên vẹn ở `apps/web/public/pieces/staunty/` kèm giấy phép.
- Không chữ hiển thị cứng: khoá mới trong `apps/web/messages/vi.json` **và** `en.json`, `ja.json` (kể cả `aria-label`, chữ trong SVG).
- Font: giữ Be Vietnam Pro + Noto Sans JP. Font mới phải có subset `vietnamese` trong `next/font`, Noto Sans JP vẫn là dự phòng chữ Nhật; kiểm chữ có dấu chồng ("Hoàn tác", "Đến lượt", "Ngẫu nhiên") ở mọi cỡ chữ.
- Không thêm thư viện khi chưa review: khai báo trong `catalog` của `pnpm-workspace.yaml`, tôn trọng tuổi phiên bản tối thiểu, không `allowBuilds: true`, ghi phiên bản và lý do vào `design.md`.

**Tiếp cận (WCAG 2.2 AA)**

- Tương phản: chữ ≥ 4.5:1 (chữ lớn ≥ 3:1), viền điều khiển, quân, ô hợp lệ, hàng thắng ≥ 3:1 với nền ngay cạnh, ở **cả sáng lẫn tối**. Tính tỉ số, ghi vào `design.md`.
- Màu không bao giờ là tín hiệu duy nhất: quân có ký hiệu (cá ngựa ●■▲◆, X/O), lượt và kết quả có chữ, ô được chọn có dấu ngoài màu.
- Mọi bàn chơi được bằng bàn phím (roving tabindex, mũi tên, Enter/Space); `focus-visible` luôn thấy rõ trên mọi nền, kể cả nền bàn của từng game.
- Nút không bấm được dùng mẫu `aria-disabled` (vẫn focus được, có lý do), không `disabled` làm mất focus.
- Mọi animation có nhánh giảm chuyển động (`motion-reduce:` hoặc `prefers-reduced-motion`); khi giảm, trạng thái cuối vẫn hiện đúng.
- Vùng chạm ≥ 24 × 24 px, nên 44 px. Ngoại lệ đã có: ô Cờ caro < 24 px dùng chạm hai lần.
- Không cuộn ngang ở khung 360 px; mọi điều khiển tới được ở 360 và 390 px.
- Giữ những gì đang đúng: `RadioGroup` dùng radio gốc, `<dialog>` gốc, vòng focus, ký hiệu quân, `motion-reduce`.

**Phạm vi**

- Việc giao diện không sửa luật game (`packages/games`), engine, transport, protocol, server. Cần dữ liệu mới từ đó → change riêng.
- Đổi **hành vi** người chơi quan sát được (thêm bảng người chơi, khoảnh khắc kết thúc, trạng thái mới, đổi luồng) → đi qua OpenSpec. Thay đổi **thuần hình ảnh** (màu, khoảng cách, font, hình quân) làm thẳng, không cần change, nhưng vẫn qua pha 4.
- Không tạo `DESIGN.md`, `PRODUCT.md` hay file kế hoạch riêng: quyết định thiết kế ghi trong `design.md` của change (CLAUDE.md).

## Hướng thiết kế

**Khung chung** (`packages/ui`, `features/*`) — một hệ thống cho mọi màn hình:

- Thang chữ có cấp bậc (tiêu đề trang, tiêu đề mục, thân, chú thích, số), không để mọi thứ `text-sm font-medium`.
- Nền trung tính **ấm** thay cho xám-xanh một màu; một màu nhấn chính + một màu nhấn phụ; token `success`, `warning`, `celebration` bên cạnh `danger`.
- Màu nhấn **không trùng màu quân nào** (hiện `--accent` trùng `--piece-blue`).
- Nút, radio, thẻ có biến thể phân biệt rõ: radio đã chọn không được trông như nút hành động chính.
- Khoảng cách theo thang cố định; trạng thái rỗng, đang tải, lỗi được thiết kế như màn hình thật (có minh hoạ/icon, lời giải thích, hành động tiếp theo).

**Bản sắc từng game** — không ép ba game vào một khuôn:

- Mỗi game ghi đè một **bộ nhỏ biến `--game-*`** (ví dụ `--game-board`, `--game-line`, `--game-mark-1`, `--game-mark-2`, `--game-highlight`, `--game-last-move`) trong phạm vi `[data-game="<id>"]` do màn hình chơi đặt từ mã game.
- Hợp đồng (tên biến, giá trị mặc định sáng/tối, tiện ích `bg-game-*`) nằm trong `packages/ui/src/styles.css`; **giá trị của từng game nằm trong thư mục của game** (`apps/web/src/games/<id>/`). `packages/ui` không biết mã game nào, và thêm game không phải sửa phần dùng chung (bất biến). Cơ chế cụ thể chốt ở `design.md` của `add-design-foundation`.
- Khung (thanh trên, bảng người chơi, nút) giữ chung; chỉ bàn, quân, điểm nhấn của game đổi.
- Hướng khởi đầu (chốt bằng mockup):
  - **Tic-tac-toe**: tối giản, vui; nét dày, X/O có cá tính, ăn mừng nhẹ.
  - **Cờ caro**: "giấy vở ô li", dấu như bút bi (X xanh, O đỏ hay tương tự), hàng thắng như được khoanh/gạch.
  - **Cờ cá ngựa**: nhiều màu, tính xã hội, cảm hứng tranh dân gian (tự vẽ, không sao chép tranh có bản quyền).
  - **Cờ vua** (M7, chốt ở `add-chess-board`): bàn xanh–kem kiểu trang chơi cờ online, quân "staunty" của Lichess, thanh người chơi trên và dưới bàn.
- Chỉ dùng hình tự làm; không chép tài sản hay bắt chước giao diện game thương mại. **Ngoại lệ duy nhất**: bộ quân Cờ vua "staunty" (người dùng chốt ngày 04/11/2026, change `add-chess-board`). Mọi hình khác của bên thứ ba cần: quyết định của người dùng ghi trong proposal của một change, kiểm giấy phép, nguồn kèm SHA, một mục trong `apps/web/public/third-party-licenses.txt`, và file giữ nguyên không sửa. **Dữ liệu màn chơi** của bên thứ ba (hiện có: 8 màn Boxoban, Apache 2.0, change `add-jelly-gather-molds`) cũng cần bốn điều đầu; được chuyển đổi sang luật của trò nếu giấy phép cho phép, với bản gốc ghi cạnh bản đã chuyển và mục giấy phép nói rõ đã sửa gì.

## Checklist UX bàn cờ

Trước khi coi một màn hình chơi là xong, kiểm từng mục ở mọi chế độ (cùng máy, với máy, online):

- [ ] **Lượt của ai** thấy được ngay **trên bàn** (viền, quân sáng lên, vị trí ghế), không chỉ dòng chữ.
- [ ] **Bảng người chơi**: tên, quân/màu + ký hiệu, loại (người / máy / người ở xa), trạng thái kết nối (online).
- [ ] **Nước vừa đi** được đánh dấu; **nước hợp lệ** hiện khi chọn quân hay khi tới lượt.
- [ ] **Hàng thắng** vẽ rõ (cả Tic-tac-toe); **khoảnh khắc kết thúc** có chữ, hình, và hành động tiếp ("Ván mới", "Chơi lại", "Về menu").
- [ ] **Máy đang nghĩ** có tín hiệu (không chỉ khoá bàn im lặng).
- [ ] **Xúc xắc và lượt**: khung xúc xắc theo màu người **sắp** gieo, kết quả gieo đọc được, mất lượt được nói rõ.
- [ ] **Hoàn tác**: rõ khi nào bấm được, vì sao không (online không có hoàn tác).
- [ ] **Online**: đang kết nối, nối lại, tạm ngắt, đối thủ rời, phòng đầy, phòng không tồn tại (không hỏi tên trước khi báo phòng không có).
- [ ] **Rỗng / đang tải / lỗi**: có thiết kế, có lối thoát.
- [ ] Thông báo cho trình đọc màn hình (`role="status"`) vẫn đúng sau khi đổi giao diện.

## Chuyển động

- Ưu tiên CSS transition / `@keyframes` trong `packages/ui/src/styles.css` (như `animate-dice-roll`) hoặc Web Animations API. Thư viện `motion` chỉ sau review, có lý do ghi trong `design.md`.
- Thời lượng nằm trong nhịp máy ở `apps/web/src/transport/ai-timing.ts`: game không xúc xắc ≤ `AI_MIN_DELAY_MS` (300 ms); đi quân ≤ 400 ms trong `AI_SETTLE_DELAY_MS` (500 ms); xúc xắc ≤ `AI_RESULT_DELAY_MS` (800 ms) kể cả thời gian đọc số; riêng cú tung xúc xắc 3D của người ở thiết bị này (Cờ cá ngựa) đóng lớp mờ ≤ 1,9 s sau khi có số, trong `AI_THROW_DELAY_MS` (2500 ms). Máy không bao giờ được đi trước khi animation trước xong.
- Mỗi sự kiện **một** khoảnh khắc có chủ đích (đặt quân, gieo, đá quân, thắng), không chồng hiệu ứng. Ăn mừng thắng ngắn, không chặn nút.
- Mọi animation có nhánh giảm chuyển động; test bằng `reducedMotion: "reduce"` khi animation ảnh hưởng tới thứ tự hiển thị.

## Quy trình (ánh xạ sang OpenSpec)

1. **Pha 1 — Khảo sát.** `pnpm ui:shots`, xem ảnh bằng mắt (đọc PNG trong `apps/web/.ui-shots/`), liệt kê vấn đề theo màn hình. Dùng `/opsx:explore` để bàn.
2. **Pha 2 — Thiết kế.** `/opsx:propose` (mốc M6.5 trở đi). Với `frontend-design`, làm mockup HTML tĩnh (đặt trong scratchpad hoặc publish thành Artifact riêng tư) cho từng màn hình chính, sáng/tối, điện thoại/máy tính. **Người dùng duyệt mockup trước khi code.** Ghi vào `design.md` của change: hướng hình ảnh, token thêm/đổi (sáng + tối, tỉ số tương phản), quyết định đã cân nhắc, và cách kiểm tra.
3. **Pha 3 — Code.** `/opsx:apply` theo `tasks.md`, dùng `vercel-react-best-practices` + `vercel-composition-patterns`. Token trước, component chung sau, bàn từng game cuối. Thêm màn hình hay trạng thái mới thì thêm một ảnh vào `apps/web/ui-shots/screens.shots.ts`.
4. **Pha 4 — Kiểm tra.**
   - `pnpm ui:shots` (build rồi chụp từ server local, không bao giờ từ production): mỗi màn hình × sáng/tối × 390 × 844 / 1280 × 800 vào `apps/web/.ui-shots/<phone|desktop>-<light|dark>/`. Xem **từng ảnh**, so với mockup.
   - Rà bằng `web-design-guidelines` trên các file đã đổi.
   - `pnpm check`, `pnpm knip`, `pnpm spec:check`, `pnpm test:e2e` (đổi giao diện là phải chạy).
   - Hai lượt review code như mọi change (senior dev, săn bug), rồi `/opsx:archive`.

## Bẫy hay gặp

- E2E và test component truy vấn theo vai trò và tên; đổi chữ hay vai trò là sửa test, không đổi hành vi khi không có change.
- `data-*` mà E2E đọc (`data-ply`, `data-ludo-choice`) là hợp đồng với test, giữ nguyên.
- Thêm token tối mà quên một trong hai khối tối → chế độ tối theo hệ điều hành và theo `data-theme` lệch nhau.
- Hình đẹp ở 1280 px nhưng tràn ở 360 px: luôn xem ảnh điện thoại trước.
