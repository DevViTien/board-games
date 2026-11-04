# Design

## Context

Xem proposal.md (Why). Hiện trạng liên quan:

- `apps/web/src/games/ludo/Board.tsx` vẽ bàn bằng SVG (lưới 15 × 15 của `board-layout.ts`) trong khung `aspect-square overflow-hidden`; ngựa là đĩa tròn (`Horse`); lựa chọn là danh sách `<Button data-ludo-choice>` dưới bàn; SVG `aria-hidden` có `onClick` tìm `[data-choice]`. `Dice.tsx` là xúc xắc 2D cạnh nút "Gieo xúc xắc"; `use-ludo-animation.ts` cho xúc xắc lăn 450 ms và ngựa đi 50 ms một ô, trong nhịp máy của `transport/ai-timing.ts` (`AI_RESULT_DELAY_MS` 800, `AI_SETTLE_DELAY_MS` 500).
- Số gieo do `packages/engine` bốc (`pickOutcome` + `Rng` từ `crypto`) khi nước gieo được chơi: cùng máy trong `local-transport` (đồng bộ), online trong `room-service`. Client không gửi số chấm.
- Online, nước của ghế máy được server ghi ngay; `online-transport` hiện lần lượt bằng `revealDelay`, nhưng chỉ khi các nước tới **cùng một lần cập nhật**; nước tới ở lần cập nhật sau (một người ở xa gieo) hiện ngay.
- `PlayScreen` dựng dòng lượt (`role="status"`), bảng người chơi, đồng hồ lượt, các nút của ván từ cùng một ảnh chụp (snapshot) của transport mà bàn nhận.
- Mockup đã được người dùng duyệt ngày 04/11/2026: `mockup/index.html` (chạy được, có bảng debug ép số 1–6), ảnh trong `mockup/png/`. Người dùng chốt: lớp mờ chỉ cho người ở thiết bị này; một chạm là đi; xúc xắc bằng Three.js + vật lý. Hai lượt duyệt thiết kế đã chạy; các mục dưới đã gộp kết quả (đặc biệt §1, §4, §5, §7).

## Goals / Non-Goals

**Goals:**

- Ngựa hình con ngựa đọc được ở ô 22 px (khung 360 px), ký hiệu màu vẫn thấy, hàng trên cùng không bị cắt.
- Chạm ngựa để đi, giữ trọn khả năng chơi bằng bàn phím và trình đọc màn hình.
- Cú tung 3D có cảm giác vật lý thật, mặt dừng luôn đúng số đã bốc, không đổi mặt giữa chừng trong gần như mọi lần, và không bao giờ để cách tung ảnh hưởng số ra.
- Kết quả không lộ (chữ, trình đọc màn hình) trước khi xúc xắc dừng; không gieo hai lần; máy và người ở xa không cắt ngang cú tung.
- Không làm nặng trang nào khác; không WebGL hay giảm chuyển động thì vẫn chơi trọn vẹn bằng đường 2D.

**Non-Goals:**

- Đổi luật, engine, protocol, server.
- Cú tung 3D cho máy hay người ở xa; chạm để bỏ qua; âm thanh; kéo thả.

## Decisions

### 1. Số xin lúc thả tay; chọn quỹ đạo có sẵn mặt đúng

Trình tự cho người ở thiết bị này khi 3D dùng được (pha của hook, mục 4):

1. **Giữ** (`hold`): lớp mờ mở, xúc xắc lắc giữa màn hình, vòng lực đầy dần trong 1,5 s. Ngay từ lúc nhấn, bắt đầu mô phỏng một **kho quỹ đạo** không cần số: cannon-es bước cố định 1/120 s, điều kiện đầu ngẫu nhiên (hình ảnh, không phải giá trị ván: `createRng` với seed từ `crypto.getRandomValues`), ghi vị trí + quaternion từng khung, đọc mặt nằm trên lúc dừng. Mỗi khung hình chạy tối đa 2 mô phỏng (không chạy dồn trong một handler), ưu tiên mức lực yếu trước (bấm nhanh), rồi các mức mạnh hơn. Chỉ giữ quỹ đạo dừng phẳng (pháp tuyến mặt trên · trục đứng ≥ 0,99, hết chuyển động trước khung tối đa), thời gian bay 0,9–1,4 s.
2. **Thả**: gửi `{ type: "roll" }` như hôm nay; chạy đoạn "nhấc tay" có kịch bản khoảng 100 ms (xúc xắc quay nhanh lên khỏi tay). Lực = thời gian giữ (0 → 1,5 s) chọn mức lực của kho.
3. **Có số** (ply mới với `last.kind === "roll"` của người này — mốc "có số" của mọi ngân sách bên dưới): chọn trong kho, ở mức lực gần nhất, một quỹ đạo có **mặt trên tự nhiên đúng số đã bốc** — không đổi mặt nào. Thiếu thì mô phỏng thêm (vẫn 2 mỗi khung, trong lúc nhấc tay). Với 24–36 quỹ đạo, xác suất không có mặt cần là khoảng 1,3%–0,14% (lượt duyệt đo trên mockup: 180/180 lần ép số đều dừng đúng). Chỉ khi vẫn thiếu mới dùng **phép quay đối xứng** của khối lập phương gắn vào lưới (không vào thân vật lý, quỹ đạo không đổi), áp ngay trong đoạn nhấc tay lúc xúc xắc quay nhanh nhất. Đoạn nhấc tay nội suy từ tư thế trong tay sang tư thế đầu của quỹ đạo được chọn.
4. **Bay** theo thời gian thực (không theo số khung): vị trí của khung ứng với thời gian đã trôi, nên khung rớt không kéo dài cú tung.
5. **Dừng**: số hiện lớn kèm "Được gieo thêm"/"Mất lượt" nếu có; lớp mờ tắt; ô xúc xắc cạnh bàn và màn hình chơi cập nhật; kết quả được đọc lúc này (mục 4).

**Ngân sách cứng: lớp mờ tắt xong ≤ 1,9 s sau mốc có số** (spec cho phép 2,2 s, máy chờ 2,5 s — mục 7). Bay ≤ 1,4 s; phần đọc số co lại (tối thiểu 300 ms) để vừa hạn; tới hạn thì tắt bất kể đang ở đâu. Không có quỹ đạo dùng được (mọi thử đều không dừng phẳng) → đóng lớp mờ, dùng đường 2D cho lần đó.

**Số về muộn** (online): sau đoạn nhấc tay, xúc xắc quay tại chỗ (kịch bản) chờ số; quá 3 s kể từ khi thả thì đóng lớp mờ, xúc xắc nhỏ về trạng thái chờ; số tới sau hiện thẳng ở ô cạnh bàn bằng đường 2D. Nước gieo bị từ chối (online `rejected`, cùng máy lỗi) → đóng ngay.

**Phương án đã cân nhắc:**

- _Vật lý quyết định mặt_ (số = mặt nằm trên): loại — canh thời điểm thả là ảnh hưởng được số; online phá bất biến "server là trọng tài".
- _Mô phỏng một quỹ đạo rồi đổi mặt khi có số_ (mockup): lượt duyệt chỉ ra đây vẫn là đổi mặt nhìn thấy được (xúc xắc đã hiện mặt trong tay và lúc nhấc lên). Giữ làm phương án dự phòng hiếm.
- _Gửi nước gieo lúc nhấn_: thời gian giữ không giới hạn nên máy có thể đi khi người còn đang giữ; Esc không huỷ được.
- _Gửi lúc xúc xắc dừng_: phải biết số trước khi phát quỹ đạo; loại.

### 2. Thư viện 3D: `three` + `cannon-es`, tải lười

- `three` **0.186.0** (MIT, 08/09/2026) và `@types/three` cùng dòng 0.186; `cannon-es` **0.20.0** (MIT, 2022, không phụ thuộc). `three` 0.187.0 (30/10/2026) đủ tuổi 1 ngày của pnpm nhưng mockup đã kiểm với 0.186.0; giữ 0.186.0. Khai báo trong `catalog`, không cần `allowBuilds`, không ngoại lệ tuổi phiên bản. Thêm vào `apps/web/public/third-party-licenses.txt` với nguyên văn giấy phép MIT.
- Dung lượng ước tính bằng esbuild trong mockup: three 133 KB gzip, cannon-es 24 KB. Next 16 dùng Turbopack và `three` là một module lớn, nên con số thật có thể lớn hơn: **ngân sách chunk 3D ≤ 250 KB gzip**; vượt thì import từ đường dẫn con của `three` (`three/src/...` những lớp dùng tới) và ghi lại; kích thước thật ghi vào đây khi build. **Đo khi build (Next 16.4.3, Turbopack, 04/11/2026)**: three + cannon-es + `dice-stage` + `throw-sim` vào **một** chunk lười 627 986 B, **gzip 158 047 B (≈ 154 KiB)**, trong ngân sách, không cần đường dẫn con. JS tải tới sự kiện `load` (đo bằng Chromium với bản build): `/` 12 script, gzip 214 123 B; `/play/tictactoe` 14 script, 231 218 B; `/play/chess/local` 17 script, 249 408 B; `/play/ludo/local` 17 script, 249 408 B — không trang nào có chunk 3D; trên `/play/ludo/local` chunk 3D chỉ được tải sau đó, lúc rảnh.
- Mọi import `three`/`cannon-es` (kể cả `throw-sim.ts`) chỉ nằm sau một `import()` động trong `games/ludo/dice3d/`; không file nào ngoài thư mục đó import tĩnh tới chúng. Kiểm bằng danh sách chunk của bản build: JS tải đầu của `/`, `/play/tictactoe`, `/play/chess/local` **và của chính `/play/ludo/local`** không chứa chúng.
- Bắt đầu tải lần đầu tiên nút gieo bấm được cho người ở thiết bị này (không tải cho người xem không có ghế), lúc rảnh (`requestIdleCallback`, dự phòng `setTimeout`). Tải xong thì tạo renderer và `renderer.compile` lúc rảnh, để lần nhấn đầu không khựng. Chưa tải xong lúc nhấn → lần đó dùng 2D.
- **Đã cân nhắc**: `@dimforge/rapier3d-compat` (WASM nhúng khoảng 1,5 MB); tự viết vật lý khối lập phương (va chạm cạnh/góc khó cho đẹp); khối 3D bằng CSS (người dùng chọn Three.js + vật lý).

### 3. Khi nào dùng 3D, vòng đời

3D chỉ dùng khi đủ cả: người gieo là người ở thiết bị này; không `prefers-reduced-motion: reduce`; tạo được ngữ cảnh WebGL (kiểm một lần, canvas kiểm thử được giải phóng bằng `WEBGL_lose_context`); chunk và renderer sẵn sàng. Thiếu một điều kiện → đường 2D hiện có. `webglcontextlost` hay lỗi khi vẽ giữa cú tung → đóng lớp mờ, hiện số bằng 2D, các lần sau dùng 2D. Renderer giữ suốt màn chơi; rời màn thì dọn hình học, vật liệu, texture (cả bộ nhớ đệm texture theo màu/giao diện) và gọi `forceContextLoss()`; an toàn với lần gắn đôi của StrictMode. Tỉ lệ điểm ảnh tối đa 2. Khung camera và tường ảo tính một lần lúc bắt đầu giữ và giữ nguyên tới hết cú tung (canvas co giãn kiểu letterbox); đổi hướng màn hình hay kích thước lớn giữa chừng thì kết thúc cú tung ngay, hiện số.

### 4. Lớp mờ, cử chỉ, giữ màn hình

- **Lớp phủ** render qua portal vào `document.body` (không bị tổ tiên có `transform`/`contain` làm hỏng `fixed`), `fixed inset-0`, trên thanh trên cùng và dưới các hộp thoại/menu ở top layer; nền token `--overlay` + `backdrop-filter: blur()` (không hỗ trợ thì chỉ nền tối); `aria-hidden`; `data-throw="3d"` (hợp đồng với E2E). Canvas vuông giữa màn hình (`min(96vmin, 36rem)`, mục 11); vòng lực SVG màu của người gieo; dòng gợi ý "Giữ để lấy đà · thả tay để gieo". Từ lúc thả tới lúc tắt, lớp phủ nhận và nuốt mọi con trỏ.
- **Hook `use-hold-to-roll`** có pha `idle → hold → await → fly → rest → idle`; mọi đầu vào ngoài `idle` (trừ thả/huỷ của pha `hold`) bị bỏ qua — chặn cú click sinh ra sau `pointerup`, click gốc khi nhả Space, Enter lặp phím, chạm lên lớp phủ. Nhấn: `pointerdown` chính (`isPrimary`) trên nút đang bấm được → `setPointerCapture`; thả: `pointerup` → tung; huỷ (không gửi gì): `pointercancel`, `lostpointercapture`, Esc (nghe trên `document`, vì Safari không đưa tiêu điểm vào nút khi bấm), `visibilitychange` ẩn, `blur` cửa sổ, và khi `canRoll`/ply/`disabled` đổi trong lúc giữ; thả thì kiểm lại `canRoll` trước khi gửi. Space: `keydown` (bỏ `repeat`) → giữ, `keyup` → tung, `preventDefault` để không có click gốc. Enter hay `click` không qua pha giữ (trình đọc màn hình, bàn phím) → tung lực nhỏ nhất.
- **Chạm trên điện thoại**: nút gieo có `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` và chặn `contextmenu`, để giữ lâu không cuộn trang, không bật menu chọn chữ hay chú thích của iOS.
- **Giữ màn hình (presentation hold)**: `PlayScreen` cung cấp một context nhỏ `usePresentationHold()`; bàn Cờ cá ngựa gọi `hold()` lúc thả tay và nhả lúc lớp mờ tắt (hay khi cú tung bị cắt). Trong lúc giữ, `PlayScreen` dựng dòng lượt, bảng người chơi, đồng hồ lượt và các nút của ván từ ảnh chụp lúc `hold()`, còn bàn vẫn nhận ảnh chụp mới (cần số) nhưng tự hiện như trước khi gieo (xúc xắc nhỏ chờ, chưa ngựa nào chọn được, lời nhắc cũ). Vùng `role="status"` vì thế không đổi tới khi nhả, nên kết quả không bị đọc sớm; khi nhả, dòng lượt và lời nhắc của bàn cập nhật một lần như hôm nay. Đây chỉ là trì hoãn hiển thị, không khoá transport; ván được thay (ván mới, trạng thái mới sau khi kết nối lại) thì nhả ngay. Trò khác không gọi `hold()` nên không đổi gì.
- Tiêu điểm ở lại trên nút gieo suốt cú tung; khi xúc xắc dừng mới chuyển tới ngựa chọn được đầu tiên (nếu gieo bằng bàn phím).

### 5. Chạm ngựa để đi

- Bỏ nhóm `<Button data-ludo-choice>` dưới bàn. Trên bàn, mỗi ngựa chọn được có một `<button>` trong suốt, đặt theo **cùng phép biến đổi toạ độ** với `viewBox` (một hàm dùng chung cho SVG và nút), cạnh `max(24px, 1,36 ô)` (khoảng 30 px ở khung 360), tâm ở **tâm hình** của ngựa (cao hơn tâm ô khoảng 0,3 ô), trong `role="group"` tên "Chọn ngựa". Nút giữ `data-ludo-choice`, tên đọc như nút cũ ("Ngựa 2: ra chuồng, đá ngựa Vàng"), roving tabindex: một điểm dừng Tab, mũi tên chuyển, Enter/Space đi.
- **Chạm**: các nút `pointer-events: none`; khung bàn xử lý `click` (chỉ khi `pointerdown` cũng bắt đầu trên khung bàn, cùng `pointerId`, không phải con trỏ bắt đầu trên lớp phủ), tìm **ngựa có tâm hình gần nhất trong mọi ngựa** trong bán kính vùng chạm, và chỉ đi khi ngựa đó chọn được — chạm vào một ngựa không đi được không bao giờ "trượt" sang ngựa bên cạnh. Gộp với `onClick` của SVG hiện có (một bộ xử lý). Chuột di chuyển trên bàn hiện xem trước theo cùng quy tắc. Bàn phím và trình đọc màn hình (kích hoạt bằng `click()`) đi qua chính các nút.
- Xem trước (hover, tiêu điểm): ngựa mờ ở ô tới, khung ô đích, dấu ✕ trên ngựa sẽ bị đá.
- Ngựa chọn được nhấp nhô (`--animate-piece-bob`, biên độ nằm trong phần nới của `viewBox`, `motion-reduce` thì đứng yên) và có vòng mực + quầng màu: không chỉ dựa vào màu.
- Kiểm `axe` (`target-size`) ở trạng thái chọn ngựa; nếu bị báo vì vùng chạm chồng nhau thì thu nút về cỡ đủ cách nhau (≥ 24 px tính cả khoảng cách) trong khi việc chọn bằng chạm vẫn theo tâm gần nhất.
- **Đã cân nhắc**: giữ danh sách nút (người dùng muốn bỏ); `role="button"` trên `<g>` của SVG (tiêu điểm SVG kém ổn định giữa trình duyệt, vùng chạm khó lớn hơn hình); chọn ngựa gần nhất **trong các ngựa chọn được** (chạm vào đầu một ngựa khác có thể đi nhầm ngựa).

### 6. Quân ngựa

- `Horse` vẽ lại thành đầu ngựa trên đế hình trống (path SVG tự vẽ trong `games/ludo/`, theo mockup), màu `PIECE_FILL`, viền `stroke-piece-edge`, ký hiệu `PIECE_INK_FILL` trên mặt đế, cỡ khoảng 0,28 ô (khoảng 6 px ở ô 22 px). Bóng, dấu vừa đi, dấu bị đá, ngựa mờ xem trước giữ ý nghĩa cũ.
- Ngựa cao khoảng 1,2 ô và nhấp nhô: `viewBox` thành `0 -0.3 15 15.3`, khung bàn đổi từ `aspect-square` sang `aspect-[15/15.3]` để SVG không bị co và không có dải trống hai bên; nút chạm dùng cùng phép biến đổi (mục 5). `--board-room` của màn chơi vẫn tính theo chiều rộng nên bố cục khác không đổi (kiểm ở 360 và khi xoay ngang).
- Tương phản: dùng lại token màu quân, viền và mực ký hiệu của `redesign-game-boards` (đã ≥ 3:1 sáng và tối); không thêm màu quân mới.

### 7. Nhịp máy và nước tới sau

- `ai-timing.ts` thêm `AI_THROW_DELAY_MS = 2500`: chờ tối thiểu trước nước kế tiếp của máy khi nước trước là **lần gieo của người**. Lớp mờ tắt ≤ 1,9 s sau khi có số (mục 1) nên dư 0,6 s cho khung rớt, GC hay lần tung đầu. Máy nghĩ chạy song song nên nước máy hiện trong 3 s (spec `play-vs-ai`). Lần gieo của máy giữ 800.
- `local-transport` (`aiDelayMs`): nước cuối ngẫu nhiên do người đi → 2500.
- `online-transport`: sau khi hiện lần gieo của ghế mình (không phải ghế đang có máy thay `standIn`), luôn giữ một **khoảng dừng ≥ 2500 ms** trước khi hiện nước kế tiếp, kể cả nước tới ở lần cập nhật sau (người ở xa gieo nhanh) — các nước tới trong lúc đó xếp hàng phía sau, đúng thứ tự (spec "Cú tung không bị cắt"). Ván mới hay trạng thái mới sau khi kết nối lại vẫn thay ngay như hôm nay.
- Áp dụng cả khi người chơi dùng đường 2D (transport không biết bàn có dùng 3D): chậm hơn khoảng 1,7 s sau một lần mất lượt, chấp nhận được và đơn giản hơn một kênh "hiệu ứng xong" từ bàn về transport.
- Cập nhật chú thích trong `ai-timing.ts` và luật chuyển động trong `.claude/skills/board-games-ui/SKILL.md` (xúc xắc ≤ `AI_RESULT_DELAY_MS`, trừ cú tung 3D ≤ 1,9 s trong `AI_THROW_DELAY_MS`).
- **Đã cân nhắc**: callback "hiệu ứng xong" trong `BoardProps` dùng chung (nhiều thay đổi cho một trường hợp); tăng `AI_RESULT_DELAY_MS` cho mọi lần gieo (chậm cả lượt máy).

### 8. Cấu trúc thư mục

`apps/web/src/games/ludo/`:

- `Horse.tsx` (quân), `board-geometry.ts` (phép biến đổi `viewBox` ↔ phần trăm, tâm hình ngựa), `ChoiceTargets.tsx` (nhóm nút trong suốt), `Board.tsx` (ghép lại, bộ xử lý chạm, bỏ danh sách lựa chọn).
- `dice3d/`: `throw-sim.ts` (thuần, cannon-es: kho quỹ đạo, đọc mặt trên, kiểm dừng phẳng, phép quay dự phòng — test trong Node), `dice-stage.ts` (three: cảnh, xúc xắc bo góc, mặt vẽ canvas theo token, bóng vẽ sẵn), `ThrowOverlay.tsx`, `load-dice3d.ts` (kiểm WebGL + `import()`), `use-hold-to-roll.ts` (không import three).
- `features/play/`: `presentation-hold.tsx` (context + hook), `PlayScreen.tsx` dùng nó.
- Chiều phụ thuộc không đổi: `three`/`cannon-es` chỉ ở `apps/web`; `packages/games`, `engine`, `ui` không biết tới.

### 9. Token

- Dùng lại `--overlay` (sáng `oklch(0.22 0.015 250 / 0.4)`, tối `oklch(0.05 0 0 / 0.6)`) cho nền lớp phủ; chữ trên lớp phủ dùng nền `--surface` + `--fg` như thẻ hiện có (≥ 4,5:1).
- Thêm vào `@theme` của `styles.css`: `--animate-piece-bob`. Vòng lực vẽ theo tiến độ bằng JS. Không thêm màu; mặt xúc xắc dùng `--game-board`, chấm `--fg`, cạnh `--piece-*` của người gieo, đọc qua `getComputedStyle` khi tạo vật liệu và khi đổi giao diện.

### 10. Từ ngữ ở spec khác

`local-play` ("cả hai lựa chọn ngựa", "cả bốn lựa chọn ngựa") và `accessibility` ("nút gieo hay lựa chọn của game") vẫn đúng: "lựa chọn ngựa" nay là các ngựa chọn được trên bàn, vẫn phải nằm trong màn hình. Không cần delta.

### 11. Khi code: những chỗ đi khác hay cụ thể hơn

Ghi lại lúc làm (`/opsx:apply`), để `design.md` tả đúng code:

- **Kho quỹ đạo nạp trước lúc rảnh** (§1): sau khi tải chunk, `stage.prepare()` compile shader rồi mô phỏng dần (2 mỗi khung, khi không có cú tung) tới 36 quỹ đạo, và giữ phần còn lại qua các lần tung (mỗi lần lấy một quỹ đạo ra); lúc giữ và lúc nhấc tay vẫn mô phỏng thêm 2 mỗi khung, tối đa 48. Kho không phụ thuộc số nên nạp trước không đổi gì về công bằng, chỉ làm dự phòng đổi mặt hiếm hơn: bấm nhanh (khoảng 14 mô phỏng) còn khoảng 14% cần đổi mặt, kho 36 thì test 120 lần đều có mặt tự nhiên đủ (≥ 115/120). Thiếu mặt cần thì nhấc tay chờ thêm tối đa 100 ms (tính theo thời gian, không theo khung: khung chậm không ăn vào ngân sách) rồi mới dùng phép quay đối xứng. Ba mức lực `POWER_LEVELS = [0; 0,5; 1]`.
- **Thông số vật lý và camera** (`throw-sim.ts`, `dice-stage.ts`): trọng lực −40, ma sát 0,4, nảy 0,25. Canvas luôn vuông nên camera cố định (fov 30, đặt ở (0, 11, 5,5)) và tường ảo là hằng số `DICE_WALLS` (`x ±2`, `z −1,25…2,4`), không tính lại lúc bắt đầu giữ. Canvas `min(96vmin, 36rem)` (thiết kế ghi `min(80vmin, 30rem)` với fov 35: ảnh `ui-shots` cho thấy xúc xắc chỉ khoảng 50 px trên điện thoại, nhỏ hơn nhiều so với mockup), tay giữ ở độ cao 2,9, nhấc lên 3,4. Đo (Vitest, 300 lần mỗi mức): mô phỏng 0,5–0,8 ms mỗi quỹ đạo; khoảng 65–70% số lần thử được giữ (dừng phẳng ≥ 0,99, trong 0,9–1,4 s); thời gian bay trung vị 1,10 s (mức yếu), 1,14 s, 1,19 s (mức mạnh).
- **Nhịp cú tung**: phát lại theo thời gian thực, được nhanh tới ×1,4 để bay xong trong 1,45 s sau khi có số; số hiện tối đa 600 ms (co lại để vừa hạn), mờ đi 150 ms; hạn cứng 1,9 s đóng bất kể đâu. Đo bằng E2E (`ludo-throw.spec.ts`, Chromium + SwiftShader trên Windows, đo trong trang, 16 lần): số về 17–33 ms sau khi thả (cùng máy), xúc xắc dừng 1,02–1,50 s sau khi thả, lớp mờ tắt 1,78–1,92 s sau khi thả (≤ 1,9 s sau khi có số); nước máy hiện 0,83–0,86 s sau khi lớp mờ tắt (khoảng 2,5 s sau khi có số).
- **Online, nước của chính mình không chờ** (§7): khoảng dừng 2500 ms sau lần gieo của ghế mình chỉ giữ nước của người khác; nước kế tiếp của chính ghế đó (chọn ngựa sau khi gieo, nhất là ở đường 2D) hiện ngay, nếu không người chơi phải chờ tới 2,5 s mới thấy ngựa mình đi.
- **Quân ngựa** (§6): tỉ lệ 0,0088 ô mỗi đơn vị (mockup 0,0092), đế thấp hơn tâm ô 0,44 ô, để quân ở hàng trên cùng cao tới khoảng −0,2 và biên độ nhấp nhô (0 → −0,1 ô, mockup −0,1 → −0,24) cùng độ nhấc khi xem trước (−0,1) nằm trong phần nới −0,3 của `viewBox`; SVG để `overflow: visible` phòng khi vượt. Ký hiệu trên đế khoảng 0,28 ô. Bỏ vệt sáng trắng trên mặt đế của mockup (màu cứng, không có token hợp lý ở cả sáng lẫn tối). Khung bàn vẽ trong SVG (`stroke-(--ludo-frame)`, cắt bàn bằng `clipPath` bo góc) thay cho viền `border-2` của khung HTML, vì khung HTML nay cao hơn bàn 0,3 ô.
- **Tiêu điểm sau khi gieo**: chỉ chuyển tới ngựa chọn được đầu tiên khi gieo bằng bàn phím hay trình đọc màn hình (Enter, Space, `click` không có con trỏ), đúng như spec; bấm hay chạm thì tiêu điểm ở lại nút gieo. Tiêu điểm vào nút trong suốt nào (chỉ bàn phím hay script làm được) thì xem trước ngựa đó.
- **Canvas vừa khung khi đã đặt vào lớp phủ**: lớp phủ chỉ đặt canvas vào trang sau khi cú giữ bắt đầu, nên stage chỉnh kích thước bộ đệm vẽ theo kích thước thật của canvas ở mỗi khung (ảnh `ui-shots` đầu tiên lộ lỗi canvas 1 × 1 khi chỉnh một lần lúc giữ).
- **Lớp phủ**: `z-35` (trên thanh trên cùng `z-30`, dưới menu `z-40` và top layer). Lời trên lớp phủ: "Được gieo thêm" chỉ khi gieo 6 mà không ngựa nào đi được (gieo thêm ngay), "Mất lượt" khi mất lượt; gieo 6 có ngựa đi được không ghi gì (luật cho gieo thêm sau khi đi).
- **Vị trí tính từ dữ liệu** (nút trong suốt, vòng lực, thẻ số) đặt bằng `style` `left`/`top`: là hình học của ván, không phải màu hay kiểu; mọi màu và kiểu vẫn là class + token.
- **Hợp đồng với test**: nút gieo có `data-dice="3d" | "2d"` (một lần nhấn sẽ tung xúc xắc nào); lớp phủ có `data-throw="3d"`, `data-phase` và `data-top-face` (mặt nằm trên khi dừng, đọc từ hướng của lưới 3D); mỗi quân có `data-at` (tâm ô) và `data-horse`. jsdom không có canvas: `vitest.setup.ts` cho `getContext` trả `null` như trình duyệt không WebGL, test cú tung dùng stage giả.
- **Thư viện**: `@types/three` 0.186.0 kéo theo các gói kiểu của nó vào lockfile (`@types/webxr`, `@types/stats.js`, `@tweenjs/tween.js`, `fflate`, `meshoptimizer`, `@dimforge/rapier3d-compat`): chỉ là phụ thuộc của gói kiểu, không vào bundle, không có script cài đặt. `throw-sim.test.ts` chạy trong dự án `dom` của Vitest (file thiết lập của dự án cần DOM) nhưng không dùng DOM.
- **Ảnh `ui-shots`**: thêm `13d-ludo-holding`, `13e-ludo-flying`, `13f-ludo-result` (dừng thời gian bằng `page.clock`), `09e-ludo-preview`, `09f-ludo-preview-360` (xem trước từ bàn phím: ngựa nhấc lên, ngựa mờ ở ô tới, khung ô đích); bỏ `13b-ludo-rolling` (xúc xắc nhỏ lăn sau cú bấm của người ở đây: nay là cú tung 3D, xúc xắc nhỏ chỉ lăn cho máy và người ở xa). Sau lượt xem ảnh đầu đã sửa: canvas 1 × 1 (mục trên), xúc xắc quá nhỏ (camera, cỡ canvas), vòng lực nhỏ hơn xúc xắc trên máy tính (nay 42% cạnh canvas), thẻ số chồng lên xúc xắc trên máy tính (nay cách tâm xúc xắc 12% cạnh canvas).
- **Sau hai lượt review code**:
  - Cú giữ Space kết thúc không tung khi nút gieo mất tiêu điểm; nhả Space hay nhả con trỏ ở bất cứ đâu trên trang (nghe trên `document`) vẫn tung. Lớp phủ nhận mọi con trỏ ở mọi pha (cả lúc giữ: con trỏ đang giữ đã bị nút bắt), có `touch-none`, `overscroll-contain` và chặn `wheel`/`touchmove` (listener không passive) để trang không cuộn sau nó.
  - Chỉ nuốt cú click có `detail > 0` sau một lần nhấn con trỏ: Enter hay trình đọc màn hình không bao giờ bị nuốt bởi một cú giữ bị trình duyệt huỷ.
  - Từ lúc thả tới lúc lớp mờ tắt (lúc `PlayScreen` đang giữ), mọi phần của màn chơi trừ phần điều khiển của bàn mang `inert` (bọc bằng phần tử `display: contents`, lưới không đổi): thanh trên, dòng lượt, bảng người chơi, bàn, các nút của ván. Kết nối (dòng báo, chip "Mất kết nối", lý do khoá) luôn đọc ảnh chụp sống; chỉ dòng lượt, ghế, đồng hồ và nút của ván được giữ.
  - Tốc độ phát tính từ phần ngân sách còn lại khi cú nhấc tay xong (`playbackSpeed` trong `throw-sim.ts`, chừa 32 ms để nhận ra lúc dừng), nên quỹ đạo dài nhất sau 100 ms chờ vẫn dừng trước 1,45 s và số hiện ≥ 300 ms.
  - `renderer.compile` của three 0.186 duyệt mọi lưới (`traverse`) khi chuẩn bị vật liệu, chỉ đèn là theo `traverseVisible`; dù vậy stage vẫn hiện xúc xắc và bóng trong lúc compile, gửi texture các mặt và bóng lên GPU (`initTexture`), và chuẩn bị bằng màu token của người sắp gieo (đọc từ bàn), không dùng màu cứng.
  - `webglAvailable()` chỉ nhớ khi tìm thấy WebGL; lần không thấy được thử lại ở bàn sau. `useDice3d` trả thẳng stage (bỏ `fail` không dùng).
  - Nước 3D đã hiện (`settledPly`) chỉ được bỏ hiệu ứng 2D cho tới khi ván đi tiếp hay bị thay; nước cùng số thứ tự ở ván mới vẫn có hiệu ứng.
  - Online, sau khi kết nối lại mà lần gieo của mình vẫn là nước mới nhất và khoảng dừng chưa hết, khoảng dừng chạy tiếp phần còn lại.
  - Chạm ngựa chỉ cần cú nhấn bắt đầu trên khung bàn (không còn so `pointerId` của click, vì Firefox/Safari có thể cho click của cú chạm một id khác); `pointercancel` (cuộn) bỏ cú nhấn.
  - Thẻ số theo cả hoành độ của xúc xắc, giữ trong canvas.
  - ESLint (`packages/config/eslint`): `three`/`cannon-es` chỉ được import trong `dice-stage.ts` và `throw-sim.ts`; `./dice-stage`, `./throw-sim` không được import tĩnh ở đâu khác (chỉ `import()` của `load-dice3d.ts`), test được phép.
  - E2E đo hạn lớp mờ từ lúc có số (pha `fly`), so với 2,2 s của spec; kiểm nước máy hiện sau khi lớp mờ tắt và trong 3 s kể từ khi có số. Test E2E "gieo 6 không đi được" đổi thành "đang tung thì không đi được" (số ở E2E do engine bốc thật; gieo 6 không đi được nằm ở test component).

## Risks / Trade-offs

- [Máy yếu giật khung] → mô phỏng rải theo khung trong lúc giữ, phát lại theo thời gian thực với hạn cứng 1,9 s; tỉ lệ điểm ảnh ≤ 2; bóng vẽ sẵn; compile lúc rảnh; lỗi hay mất ngữ cảnh → 2D.
- [Đổi mặt nhìn thấy] → chọn quỹ đạo có sẵn mặt đúng; đổi mặt chỉ còn là dự phòng hiếm, giấu trong đoạn quay nhanh.
- [Chunk lớn hơn ước tính với Turbopack] → ngân sách 250 KB gzip, import đường dẫn con nếu vượt; kiểm bằng bản build.
- [Online: số về trễ, bị từ chối, mất kết nối] → quay tại chỗ tối đa 3 s rồi đóng; huỷ cú giữ khi không còn gieo được.
- [Một chạm là đi, online không hoàn tác] → người dùng chốt; chạm theo tâm hình gần nhất trong mọi ngựa, chỉ ngựa chọn được mới đi; cần cả nhấn và nhả trên bàn.
- [Máy chờ 2,5 s cả khi người dùng 2D] → chấp nhận (mục 7).
- [Ký hiệu trên đế nhỏ ở 22 px] → khoảng 6 px, kiểm bằng ảnh 360 px; danh sách vị trí cho trình đọc màn hình giữ nguyên.
- [Cử chỉ chạm thật (giữ lâu, trượt ngón) không test tự động được] → Playwright chỉ chạm một cái; kiểm bằng test hook với sự kiện con trỏ tổng hợp, còn thiết bị thật nằm trong danh sách thử của người dùng.
- [WebGL trong Playwright] → Chromium headless trên Windows có SwiftShader mặc định (lượt duyệt đã kiểm), nhưng vẫn thêm `--enable-unsafe-swiftshader` vào cấu hình và kiểm `data-throw="3d"` để không lặng lẽ chạy đường 2D.

## Migration Plan

Không có dữ liệu cũ phải chuyển: ván lưu, phòng online giữ nguyên định dạng, `PROTOCOL_VERSION` không đổi. Rollback là revert commit.

## Kiểm tra

- Unit: `throw-sim` (kho quỹ đạo: mỗi số 1–6 qua nhiều seed đều có quỹ đạo dừng phẳng đúng mặt; thời gian bay 0,9–1,4 s; mức lực mạnh không bay ngắn hơn; không có quỹ đạo → báo dùng 2D); `use-hold-to-roll` (các pha, mọi đường huỷ, chặn click sau thả, Space không sinh click, Enter lặp); `presentation-hold` + PlayScreen (dòng lượt không đổi khi đang giữ); Board (chạm, không danh sách, mũi tên, tiêu điểm sau khi dừng, đường 2D trong jsdom, chạm ngựa không đi được cạnh ngựa đi được); transport (2500 sau lần gieo của người, 800 sau lần gieo của máy; online: nước tới ở lần cập nhật sau vẫn chờ sau lần gieo của mình; ghế `standIn` không tính); `load-dice3d` (không WebGL, tải lỗi, mất ngữ cảnh, dọn khi rời màn).
- E2E: `ludo-throw.spec.ts` trên Chromium (kiểm `data-throw="3d"`): giữ rồi thả, Esc huỷ, một lần gieo dù bấm thêm, đấu với máy mất lượt thì máy không gieo trước khi lớp phủ tắt (có biên độ), dòng lượt không đổi khi đang tung. Các spec Cờ cá ngựa cũ (`play-ludo`, `online-ludo`, `play-vs-ai`, `layout-small`, `motion`, `a11y`) chạy đường 2D bằng `reducedMotion: "reduce"` nơi không kiểm cú tung, chọn ngựa bằng tiêu điểm + Enter hoặc bấm theo toạ độ bàn (nút có `pointer-events: none`), bỏ kiểm "mỗi lựa chọn cao ≥ 44 px" thay bằng vùng chạm ≥ 24 px.
- Ảnh `pnpm ui:shots` (dừng thời gian bằng `page.clock`): Cờ cá ngựa chờ gieo, đang giữ, đang bay, lúc hiện số, đang chọn + xem trước — sáng/tối × 390/1280 px, thêm 360 px cho trạng thái chọn; so với `mockup/png/`.
- Bản build: chunk 3D ≤ 250 KB gzip, không nằm trong JS tải đầu của các trang đã nêu ở mục 2.
