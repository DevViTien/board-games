# Design

## Context

- Mỗi game có phần giao diện ở `apps/web/src/games/<id>/` (`index.ts` với `GameUI`, `Board.tsx`, `Artwork.tsx`, `theme.css` dưới `[data-game="<id>"]`), nạp lười qua `GAME_ENTRY_LOADERS` (`games/registry.ts`); hình minh hoạ menu đăng ký riêng ở `GAME_ARTWORK` (`games/artwork.ts`) để trang server không kéo bàn cờ vào bundle. Bàn Cờ cá ngựa vẽ theo `games/ludo/board-layout.ts` (lưới 15 × 15, `TRACK_CELLS` 56 ô, chân chuồng, chuồng đích 6 bậc).
- plan.md §3.2 từng ghi `rules.{vi,en,ja}.mdx` trong thư mục game, nhưng bất biến (sau này) nói **mọi chữ hiển thị chỉ nằm trong `messages/{vi,en,ja}.json`**; repo không có MDX.
- `app/layout.tsx` bọc mọi trang bằng `<NextIntlClientProvider>` không tham số → **toàn bộ** messages của ngôn ngữ đang dùng được gửi xuống client ở mọi trang. Thêm vài chục khoá dài của luật chơi mà không xử lý thì mọi trang (menu, phòng) nặng thêm.
- Route: `/` (menu), `/play/<id>` (bắt đầu ván), `/play/<id>/<mode>` (Server Component, render `PlayRoute` là client), `/room/<code>` (mã game chỉ biết sau khi vào phòng qua WebSocket). Trang render động theo cookie ngôn ngữ, đường dẫn không chứa ngôn ngữ.
- `packages/ui` có `ConfirmDialog` (native `<dialog>`, `showModal`, Esc) nhưng chưa có hộp thoại nội dung tổng quát.
- Luật đang chạy: `openspec/specs/{tictactoe,caro,ludo,chess}/spec.md`; đầu hàng/bỏ ván: `add-resign-and-abandon` (archive trước change này).
- Yêu cầu hành vi: delta `game-rules` (capability mới).

## Goals / Non-Goals

**Goals:**

- Người mới đọc được luật của mỗi game trong 1–2 phút, trên điện thoại, bằng ba ngôn ngữ, đúng luật app đang chạy.
- Hình minh hoạ cho đúng những luật dễ hiểu nhầm; tự vẽ, đọc được trong cả sáng lẫn tối, có mô tả cho trình đọc màn hình.
- Mở luật giữa ván mà không rời ván.
- Chữ của luật không làm nặng trang nào khác.
- Thêm game = thêm một `Rules.tsx` trong thư mục game + một dòng `GAME_RULES` + bản dịch.

**Non-Goals:**

- Hướng dẫn tương tác, câu đố, hình động; luật biến thể chưa chơi được.

## Đã chốt với người dùng (04/11/2026)

- Mockup được duyệt, kèm các sửa của review (nội dung §5, hộp thoại §4, liên kết menu §3).
- Liên kết "Luật chơi" trên thẻ menu là **chữ nhỏ dưới hai nút** (như mockup), mỗi liên kết có **tên đọc được riêng**: chữ thấy được + tên game ẩn cho trình đọc màn hình (không dùng `aria-describedby`).
- Không có mục "Mẹo cho người mới" ở M8.

## Decisions

### 1. Nội dung: khoá bản dịch + component theo game, không MDX

- `messages/{vi,en,ja}.json` có namespace `Rules`: `Rules.title` ("Luật chơi {game}"), `Rules.play`, `Rules.backToMenu`, `Rules.notFound.*`, `Rules.common.leaving.*` (đầu hàng, bỏ ván — §5), và `Rules.<id>.<mục>.{title,body,…}` cho từng game; chữ mà **component client** của hộp thoại cần (nút, tiêu đề hộp thoại, "Ván này: {rules}", "Đóng", đang tải, lỗi, "Thử lại") nằm ở `Play.rules` và `Play.rulesDialog.*`, không ở `Rules` — namespace `Rules` không bao giờ có ở client (apply: sửa so với bản đầu, vốn đặt `Rules.inThisGame`/`close`/`loadError`); liên kết menu `Menu.rulesLink` ("Luật chơi <hidden>{game}</hidden>", thẻ `hidden` → `sr-only`, mỗi ngôn ngữ tự xếp thứ tự: ja "<hidden>{game}の</hidden>ルール"), `Setup.rules`; nhấn mạnh trong đoạn bằng rich text của next-intl (`<b>…</b>`), danh sách bằng khoá `item1…itemN` cố định.
- `games/<id>/Rules.tsx` sắp các mục bằng khung chung `RulesSection`, `RulesFigure` (`features/rules/`), và hình ở `games/<id>/rules/*.tsx`. Component nhận `t` đã dịch (hàm dịch của namespace `Rules`, kiểu `RulesTranslator` = `createTranslator<Messages, "Rules">`) và `place` (`"page"`: mục `h2`, có liên kết; `"dialog"`: mục `h3`, không liên kết nào) chứ không gọi hook, để dùng được cả ở Server Component (`getTranslations`) lẫn client (`createTranslator` trên messages nạp lười — §4).
- **Không gửi `Rules` xuống client ở mọi trang**: layout truyền `messages` tường minh, bỏ namespace `Rules` (`<NextIntlClientProvider messages={clientMessages(messages)}>`, `i18n/client-messages.ts`); trang luật dịch ở server, hộp thoại nạp lười (§4). Task đo kích thước HTML + payload RSC của `/`, `/play/caro`, `/room/<mã>` trước/sau (không tăng quá 1 KB gzip).
- **Phương án đã cân nhắc**:
  - _MDX mỗi ngôn ngữ_ (như plan.md §3.2 cũ): vi phạm bất biến chữ hiển thị, cần `@next/mdx` + `@mdx-js/*`, mất kiểm tra đủ khoá/tham số ICU của `messages.test.ts`, chữ trong hình vẫn phải ở messages — bỏ; sửa plan.md §3.2.
  - _Mảng mục trong messages đọc bằng `t.raw`_: mất kiểu và kiểm tham số — bỏ.
  - _Để `Rules` trong provider chung_: mỗi trang thêm ~6–10 KB chữ (ba game dài) mà không dùng — bỏ (review).
- Độ dài: mỗi game 4–8 mục, mỗi mục ≤ 3 câu hoặc ≤ 5 gạch đầu dòng; kiểm bằng mắt trong ảnh `ui:shots` 390 px.

### 2. Đăng ký và route

```ts
// apps/web/src/games/rules.ts — một dòng mỗi game, như GAME_ARTWORK
export const GAME_RULES = {
  tictactoe: () => import("./tictactoe/Rules").then((m) => m.TicTacToeRules),
  caro: …, ludo: …, chess: …,
} as const satisfies Record<RegisteredGameId, () => Promise<RulesComponent>>;
```

- `app/rules/[gameId]/page.tsx` (Server Component): mã không thuộc `GAME_RULES` → `notFound()` (`not-found.tsx` dùng `StateScreen`); `generateMetadata` → "Luật chơi Cờ caro". `<main data-game>`; `Rules.tsx` import `theme.css` của game nên hình dùng đúng token bàn.
- Test (`games/rules.test.ts`): khoá của `GAME_RULES` trùng `GAME_IDS`.
- **Bundle**: trang luật không có client component riêng → First Load JS bằng trang không tìm thấy. Ghi số đo `next build` trước/sau vào "Kết quả kiểm tra".

### 3. Lối vào

- **Menu**: mỗi thẻ thêm liên kết chữ nhỏ dưới hai nút "Chơi"/"Online" → `/rules/<id>`; nội dung `Luật chơi<span className="sr-only"> {tên game}</span>` (tên đọc được "Luật chơi Cờ caro", duy nhất trên trang); vùng chạm ≥ 24 px (`py-2`).
- **Màn hình bắt đầu ván**: liên kết "Luật chơi" (biến thể `ghost`, `BookOpenIcon`) cạnh tiêu đề game.
- **Màn hình chơi**: nút "Luật chơi" ở cột phải thanh trên (chỉ icon dưới `sm`, chữ "Luật chơi" vẫn là tên đọc được qua `sr-only`, 44 × 44 px), mở `Dialog` với `LazyRules` (§4).
- **Phương án đã cân nhắc**: liên kết thường từ màn hình chơi tới `/rules/<id>` — ván online phải vào lại phòng, hiện lần lượt bị cắt — bỏ cho màn hình chơi. Mở thẻ mới — trái thói quen trên điện thoại — bỏ.

### 4. Hộp thoại luật

- `packages/ui` thêm `Dialog`: native `<dialog>` + `showModal()`, tiêu đề `<h2 tabIndex={-1}>` làm `aria-labelledby` và nhận tiêu điểm khi mở (trình đọc màn hình đọc từ đầu), nút đóng `XIcon` có `aria-label`, thân `overflow-y-auto` `max-h-[calc(100dvh-2rem)]`, toàn màn hình dưới `sm`. Esc và nút đóng gọi `onClose`; trả tiêu điểm về nút đã mở là hành vi gốc của `<dialog>` (không tự viết). `ConfirmDialog` dùng chung phần khung (`DialogFrame`), test hiện có xanh không sửa.
- **Nội dung của hộp thoại**:
  - **Mọi chế độ** (cùng máy, với máy, phòng online): `PlayScreen` tự render `<LazyRules gameId open/>` (`features/rules/LazyRules.tsx`; prop `rules` chỉ để test thay nội dung). Nội dung chỉ được render từ lần mở hộp thoại đầu tiên (rồi giữ lại, mở lại tức thì), lúc đó `LazyRules` `import()` `features/rules/load-rules.ts` — chunk riêng gồm `GAME_RULES[id]()` và `MESSAGE_LOADERS[locale]()` (cả tệp messages của ngôn ngữ đang dùng, ~5–9 KB gzip, chọn namespace `Rules` bằng `createTranslator`, không cần `NextIntlClientProvider` lồng). Nạp lỗi (mất mạng, kể cả chunk của chính `load-rules`): khung cảnh báo trong hộp thoại với `Play.rulesDialog.loadError` (`role="alert"`) và nút "Thử lại" — không dùng `StateScreen` (nó là cả một trang có `<main>` riêng).
  - **Phương án đã bỏ khi apply** (đo, xem "Kết quả kiểm tra"): trang `/play/<id>/<mode>` render `<XRules/>` ở server và truyền slot đã dịch xuống — HTML + payload RSC của mọi màn hình chơi nặng thêm 3,5 KB (Cờ caro) tới 5,5 KB gzip (Cờ vua, Cờ cá ngựa) dù hộp thoại không được mở, trái mục tiêu "chữ của luật không làm nặng trang nào khác". Nạp lười thêm ~0,5 KB JS (component `LazyRules`) và cần mạng ở lần mở đầu; lỗi có "Thử lại".
  - Tách riêng phần `Rules` của messages thành tệp JSON sinh lúc build: bỏ — thêm bước build và tệp chữ ngoài `messages/{vi,en,ja}.json` (bất biến), chỉ để bớt vài KB ở lần mở đầu.
- Đầu hộp thoại: "Ván này: 19×19 · Tự do" khi game có tuỳ chọn luật (`useOptionLabels().summary`); tiêu đề mục là `h3` (`RulesSection` nhận cấp tiêu đề). **Không** có liên kết "Mở trang luật" (sẽ rời phòng; hộp thoại đã có đủ nội dung).
- Mở hộp thoại không đổi ván: transport vẫn chạy. `showModal()` làm trơ vùng `role="status"` của màn hình; khi đóng, `PlayScreen` **đọc lại dòng lượt** (thêm dấu lặp vô hình như cơ chế `REPEAT_MARK` hiện có) để người dùng trình đọc màn hình biết lượt hiện tại.

### 5. Nội dung từng game (bản vi, tóm tắt) và hình

Mỗi hình là SVG `role="img"` có `<title>` từ messages, trong `<figure>` có `<figcaption>` thấy được; quân luôn có ký hiệu ngoài màu; **mọi màu của hình là biến CSS của game hay của `packages/ui`** (`var(--game-*)`, `var(--piece-*)`, `currentColor`), không có màu cố định — để hình đổi theo giao diện sáng/tối (kiểm bằng test, §8).

**Mục chung `Rules.common.leaving`** (cuối mọi trang, `RulesLeavingSection`): "Chơi online: bấm "Đầu hàng" để chịu thua (cần xác nhận). Người đến lượt mà 5 phút không đi thì người khác có thể xử thắng." Trang Cờ cá ngựa thêm: "Phòng 3–4 người: thay vì kết thúc ván, máy chơi thay người đầu hàng hay bỏ ván ("Máy chơi thay") tới hết ván; người đó chơi lại từ ván sau. Phòng 2 người kết thúc ván như các game khác." Khi đấu với máy: "Đầu hàng thì máy thắng."

**Tic-tac-toe** — Mục tiêu; Cách đi (X đi trước, mỗi lượt một ô trống); Thắng (ba quân thẳng hàng: 3 ngang, 3 dọc, 2 chéo); Hoà (đầy 9 ô).
Hình: `lines.tsx` — ba bàn 3 × 3 nhỏ: một hàng, một cột, một đường chéo có nét gạch.

**Cờ caro** — Mục tiêu (5 quân liền theo ngang, dọc hay chéo; với luật "chặn hai đầu" chuỗi đó không được bị chặn cả hai đầu); Bàn (15 × 15 hoặc 19 × 19, chọn ở màn hình bắt đầu ván); Cách đi (X đi trước); Luật "tự do" (từ 5 quân liền trở lên là thắng, dù hai đầu có gì); Luật "chặn hai đầu" (như trên, trừ khi **cả hai** ô ngay ngoài hai đầu chuỗi là quân đối thủ; mép bàn không tính là chặn; chuỗi dài hơn 5 thắng theo **cùng điều kiện**); Hoà (đầy bàn mà không ai thắng).
Hình: `five.tsx`, `blocked.tsx` (`O X X X X X O` không thắng / `O X X X X X ·` thắng), `edge.tsx` (`|X X X X X O` sát mép: thắng).

**Cờ cá ngựa** — Mục tiêu (người đầu tiên đưa đủ 4 ngựa lên bậc 3, 4, 5, 6 của chuồng đích); Bàn (2–4 người, mỗi màu một ký hiệu; đường chung 56 ô đi một chiều; chuồng đích 6 bậc từ chân chuồng); Lượt (gieo rồi chọn ngựa; không ngựa nào đi được thì mất lượt); Ra quân (chỉ khi gieo 6, tới ô xuất phát; **không ra được khi ô xuất phát đang có ngựa mình**; đá ngựa đối thủ đứng đó); Gieo 6 (được gieo thêm, kể cả khi không đi được); Đi và đá (đi đúng số ô; không vượt ngựa nào; không dừng ở ô có ngựa mình; dừng đúng ô có ngựa đối thủ thì đá về chuồng); Gieo 1 (ngựa trên đường chung nhảy tới chân chuồng gần nhất phía trước nếu mọi ô ở giữa trống và ô đó không có ngựa mình — kể cả chân chuồng của màu không có người chơi; **nhảy được thì bắt buộc nhảy**; **ngựa đối thủ ở chân chuồng đó bị đá**; không nhảy được thì đi 1 ô); Lên chuồng (từ chân chuồng gieo k lên thẳng bậc k nếu bậc 1…k trống; ở bậc n chỉ lên bậc n + 1 khi gieo đúng n + 1; trong chuồng không vượt, không bị đá); Đầu hàng và bỏ ván (mục chung, có đoạn "Máy chơi thay").
Hình (vẽ từ `board-layout.ts`: `TRACK_CELLS`, ô xuất phát, chân chuồng, ô chuồng đích — cùng hình học với bàn, không vẽ tay): `path.tsx` (bàn thu nhỏ, đường đi của Đỏ tô đậm từ ô xuất phát quanh vòng tới chân chuồng rồi bậc 1–6; chiều đi bằng các mũi tên nhỏ **đặt trên ô của đường chung**, không mũi tên nào cắt qua khối chuồng), `jump.tsx` (đoạn đường chung thẳng: gieo 1 nhảy tới chân chuồng kế tiếp và đá ngựa đối thủ đứng đó / bị chắn → đi 1 ô), `home.tsx` (chuồng đích: vào bậc 4 bằng gieo 4 từ chân chuồng; bậc 4 → 5 cần gieo đúng 5; bốn ngựa ở bậc 3–6 = thắng). Khi apply: `path.tsx` vẽ cả bàn từ `TRACK_CELLS`/`stableOutline`/`stepCells`; `jump.tsx` là cánh phải của bàn thật (cột 9–14, hàng 6–8: ngựa Đỏ ở ô 8, chân chuồng Xanh dương ở ô 13) vẽ hai lần; `home.tsx` là chân chuồng + 6 bậc của Đỏ đặt nằm ngang (trên bàn chúng đi dọc), cùng kiểu ô, khung chân chuồng, ngựa như bàn (`games/ludo/rules/parts.tsx`).

**Cờ vua** — Mục tiêu; Bàn (Trắng đi trước; ô h1 màu sáng ở góc phải); Cách đi từng quân; Nhập thành (điều kiện); Bắt tốt qua đường (chỉ ngay nước kế tiếp); Phong cấp (Hậu, Xe, Tượng, Mã); Kết thúc (chiếu hết thắng; hết nước đi hoà; hoà tự động: lặp năm lần, 75 nước, không đủ quân; nút "Đòi hoà" khi lặp ba lần hoặc 50 nước); Đầu hàng và bỏ ván (mục chung). Cuối trang: "Quân cờ: bộ "staunty" của sadsnake1 (Lichess), CC BY-NC-SA 4.0 · Giấy phép" → `/third-party-licenses.txt`.
Hình: `moves.tsx` (sáu bàn 5 × 5, quân qua `ChessPiece`), `castling.tsx`, `en-passant.tsx`, `promotion.tsx`.

Bản en/ja dịch đủ, giữ đúng thuật ngữ đang dùng trên màn hình chơi; ngoại lệ không dịch: tên bộ quân "staunty", "CC BY-NC-SA 4.0", toạ độ a–h, 1–8.

### 6. Giao diện

- **Hướng hình ảnh** (mockup `mockup/index.html`, đã duyệt): nền `bg-game-page`, cột chữ ≤ 68 ký tự, `text-title`/`text-heading`/`text-body`; máy tính: hình cạnh đoạn (lưới hai cột từ `lg`), điện thoại: hình dưới đoạn, rộng tối đa 360 px. Đầu trang: "← Về menu", tiêu đề, `Artwork`, số người · thời lượng, "Chơi Cờ caro"; cuối trang lặp lại nút.
- **Token**: không thêm; hình dùng `--game-*`/`--piece-*` đã kiểm tương phản ở `redesign-game-boards`/`add-chess-board` (sáng và tối).
- **Kiểm tra**: ảnh `ui:shots` `25-rules-tictactoe`, `25b-rules-caro`, `25c-rules-ludo`, `25d-rules-chess` (`fullPage`), `25e-rules-dialog-caro`, `25f-rules-360`, sáng/tối × 390/1280 — kiểm bằng mắt rằng hình đọc được ở giao diện tối (bổ sung cho test tự động §8); rà `web-design-guidelines`.

### 7. Tiếp cận

- Trang: một `h1`, mỗi mục `h2` (trong hộp thoại `h3` dưới `h2`), `<main data-game>`, `lang` theo ngôn ngữ.
- Mỗi `<figure>`: `<figcaption>` thấy được; SVG `role="img"` `aria-labelledby` trỏ `<title>`; `Artwork` đầu trang `aria-hidden`.
- Hộp thoại: `showModal()` giữ tiêu điểm, tiêu đề nhận tiêu điểm khi mở, Esc đóng, tiêu điểm trả về nút "Luật chơi" (hành vi gốc), dòng lượt được đọc lại khi đóng.

### 8. Test

- `games/rules.test.ts`; test component từng `Rules.tsx` (vi, en, ja): tiêu đề mục theo scenario, mỗi hình có tên và chú thích, ghi công trên trang Cờ vua, mục chung về đầu hàng/bỏ ván (Cờ cá ngựa có "Máy chơi thay"); **màu của hình**: duyệt mọi `fill`/`stroke`/`style` trong SVG của mỗi trang, chỉ chấp nhận `var(--…)`, `currentColor`, `none`, `transparent`; **ja**: không phần tử chữ nào của trang là khoá thô hay trùng chữ vi (trừ ngoại lệ ở §5).
- `RulesPage`, `Dialog` (mở, tiêu điểm tiêu đề, Esc, nút đóng; tiêu điểm trả về kiểm ở E2E), `LazyRules` (lỗi nạp + "Thử lại"), `PlayScreen.rules.test.tsx` (dòng "Ván này", không có liên kết rời trang), `PlayScreen` (đóng hộp thoại → dòng lượt đọc lại), `MenuPage` (tên đọc được "Luật chơi Cờ caro"), layout (provider không chứa `Rules`), `app/rules/[gameId]/page.test.tsx`.
- `e2e/rules.spec.ts` (hai cấu hình): menu → "Luật chơi Cờ cá ngựa" → "Chơi Cờ cá ngựa"; màn hình bắt đầu Cờ caro → luật; Cờ caro cùng máy đã đi hai nước → "Luật chơi" → Esc → hai quân còn, tiêu điểm ở nút; phòng online hai trình duyệt: hộp thoại mở, đối thủ đi, đóng → có nước mới, không vào lại phòng; `/rules/khong-co`; 360 × 740 không cuộn ngang.

## Kết quả kiểm tra

**Kích thước (gzip, `next build` + `next start`, cookie `NEXT_LOCALE=vi`; JS = tổng các `<script src>` của trang, tức First Load JS; script đo: tải HTML, payload RSC với header `RSC: 1`, rồi từng chunk).** Trước = cây làm việc sau khi `add-resign-and-abandon` archive, trước change này.

| Trang                                          | HTML trước → sau                          | RSC trước → sau                    | JS trước → sau                                     |
| ---------------------------------------------- | ----------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| `/`                                            | 12 412 → 12 749 (+337)                    | 8 807 → 9 044 (+237)               | 242 883 → 243 559 (+676)                           |
| `/play/caro`                                   | 10 041 → 10 319 (+278)                    | 7 371 → 7 487 (+116)               | 252 823 → 253 649 (+826)                           |
| `/play/caro/local`                             | 8 237 → 8 350 (+113)                      | 6 845 → 6 951 (+106)               | 267 647 → 268 952 (+1 305)                         |
| `/room/ABC234`                                 | 8 201 → 8 317 (+116)                      | 6 800 → 6 914 (+114)               | 269 288 → 270 584 (+1 296)                         |
| `/rules/caro` · `ludo` · `chess` · `tictactoe` | (404) → 14 757 · 18 822 · 18 918 · 11 089 | → 10 904 · 12 900 · 12 624 · 8 868 | → 203 773 (bằng trang không tìm thấy + phần chung) |

- HTML + RSC: tăng ≤ 0,34 KB ở mọi trang có sẵn (khoá `Menu.rulesLink`, `Setup.rules`, `Play.rules*` và bốn liên kết của menu); `Rules` không có trong payload của trang nào ngoài `/rules/*`. Bản slot render ở server (đã bỏ, §4) đo được `/play/caro/local` RSC 10 336 (+3 491), `/play/chess/local` 12 309, `/play/ludo/local` 12 489.
- JS: `/` và `/play/[gameId]` +0,7–0,8 KB (chunk chung của `@board-games/ui`: `Dialog`, `DialogFrame`, `BookOpenIcon`, `XIcon`); màn hình chơi và phòng +1,3 KB (thêm nút, hộp thoại, `LazyRules`) — **vượt mục tiêu 1 KB khoảng 0,3 KB**, chấp nhận: đó là chính hộp thoại; mọi phần nặng (luật, hình, messages, `createTranslator`) nằm trong chunk nạp lười `load-rules` + chunk từng `Rules.tsx` + chunk messages. `/rules/[gameId]` không có chunk client riêng: không bàn cờ, không engine (ESLint chặn `Rules.tsx`/`rules/**`/`games/rules.ts` import bàn, entry hay registry).

**Ảnh `ui:shots`** (`25`–`25g`, sáng/tối × 390/1280, cùng menu `01*` và màn hình bắt đầu ván): đã xem từng ảnh so với mockup. Sửa sau khi xem: trên điện thoại nút "Chơi <game>" xuống dưới tiêu đề (trước đó tiêu đề bị ép ba dòng), chữ toạ độ trong hình Cờ vua nhỏ lại. Hình đọc được ở giao diện tối (nền `surface`, ô và quân theo token của game). en/ja: `25g-rules-caro-en`, `25g-rules-ludo-ja` không tràn, chữ Nhật ngắt theo cụm.

**Rà `web-design-guidelines`** (`features/rules/**`, `games/*/Rules.tsx`, `games/*/rules/**`, `Dialog.tsx`): nút chỉ icon có tên (chữ `sr-only`), icon trang trí `aria-hidden`, `focus-ring` trên liên kết, tiêu đề `text-balance`, dấu “ ” và …, `overscroll-contain` trong thân hộp thoại, `<image>` có `width`/`height`, `min-w-0` cho cột chữ; tiêu đề hộp thoại `tabIndex={-1}` bỏ viền tiêu điểm (chỉ nhận tiêu điểm bằng script, như tiêu đề màn hình chơi). Không có skip link (cả app chưa có; thuộc `polish-accessibility-and-mobile`).

## Risks / Trade-offs

- **Văn dài trong JSON** → khoá chia nhỏ theo mục; `messages.test.ts` bắt thiếu khoá hay lệch tham số.
- **Nội dung lệch luật khi luật đổi** → mỗi mục ánh xạ tới requirement của spec game; checklist sửa game ở plan.md §4 thêm bước sửa `Rules.<id>`.
- **Hộp thoại che lời báo lượt** → dòng lượt được đọc lại khi đóng; ván vẫn chạy trong lúc đọc.
- **Chunk luật trong phòng online nạp lỗi** → trạng thái lỗi có "Thử lại"; ván không bị ảnh hưởng.
- **Trang Cờ vua dài trên điện thoại** → mục ngắn; nếu chơi thử thấy dài thì gập "Cách đi từng quân" bằng `<details>`.

## Migration Plan

Không có dữ liệu lưu mới; deploy bình thường.

## Open Questions

(không còn — đã chốt ngày 04/11/2026.)
