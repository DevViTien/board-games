# Design

## Context

- `GameDefinition` (`packages/engine/src/types.ts`): `setup`, `currentPlayer`, `legalMoves`, `applyMove`, `result`, `moveKey?`; không có `parseOptions` thì engine chỉ nhận tuỳ chọn `{}`. `result` trả `{ kind: "win", winners, reason? } | { kind: "draw", reason? }`, `reason` là mã do game chọn, app dịch.
- Engine kiểm nước đi từ ngoài (mạng, biên bản) ở một chỗ: `findLegalMove` (`session.ts`) so `moveKey(candidate)` với `moveKey` của từng nước trong `legalMoves(state)` và **giữ object của luật**, nên trường lạ không vào lịch sử; `moveKey` ném lỗi với dữ liệu lạ nghĩa là "không khớp" → `illegal-move`. Mỗi bước phát lại (`replayEntry`) gọi `result`, `legalMoves`, `applyMove` một lần.
- Server phát lại cả biên bản ở mỗi lần ghi (`room-service.ts`: `fromRecord` trong `seatedGame`), transport online cũng vậy mỗi khi phòng đổi (`online-transport.ts`). Chi phí một nước của luật nhân với độ dài ván ở mỗi nước, nên quyết định hiệu năng ở §2.
- `describeGameContract` (`@board-games/engine/testing`): mọi kiểm tra chơi lại các ván ngẫu nhiên theo seed; `terminates` đòi ván kết thúc trong `maxPlies`; `result-matches-moves` đòi ván xong thì `legalMoves` rỗng.
- `packages/games/package.json` lộ mỗi game qua một subpath (`./caro`, `./ludo`); `GAMES` (`index.ts`) và `GAME_IDS` (`ids.ts`) là danh sách đăng ký; `RegisteredGameId` buộc app có đúng một dòng `GAME_ENTRY_LOADERS` và `GAME_ARTWORK` cho mỗi mã (lỗi kiểu nếu thiếu).
- Gói `games` chỉ phụ thuộc `engine` (ESLint `boundaries("games")` chặn workspace sai chiều và React/Next, không chặn thư viện ngoài).
- Yêu cầu hành vi: `specs/chess` (mới). Số đo dưới đây làm ngày 04/11/2026 trên máy dev (Node 24.21, Windows), bằng một bản nháp của luật trong scratchpad chạy với engine thật (`describeGameContract`, `playRandomGame`, `fromRecord`); bản nháp dùng hoà tự động ở lặp ba lần / 50 nước, nên độ dài ván ngẫu nhiên ở §4 sẽ dài hơn với luật cuối — đo lại khi apply.

## Goals / Non-Goals

**Goals:**

- Luật Cờ vua đúng FIDE (perft khớp số công bố, hoà theo Điều 9) với chi phí một nước đủ thấp để phát lại ván dài trên server và điện thoại.
- State, nước đi, kết quả là dữ liệu thuần; tất định; không mutate; không giữ bản `Chess` dùng chung.
- Phát hành được một mình: `pnpm check` xanh, app không đổi hành vi, `chess.js` chưa vào bundle nào.

**Non-Goals:**

- Giao diện, đăng ký game, online, E2E (`add-chess-board`); AI; PGN/FEN cho người chơi; đồng hồ, đề nghị hoà, đầu hàng; đòi hoà bằng nước báo trước (FIDE 9.2.1).

## Đã chốt với người dùng (04/11/2026)

- **Bọc `chess.js` 1.4.0** trong `GameDefinition` ở `packages/games/src/chess/`, thêm qua catalog của pnpm; server và client dùng cùng code, server vẫn là trọng tài; `chess.js` chỉ ở chunk Cờ vua và server.
- **`meta.supportsAI = false`**: màn hình bắt đầu ván chỉ có "Cùng máy" và "Online" (hành vi sẵn có của `game-setup`).
- **Phong cấp do người chơi chọn** (Hậu/Xe/Tượng/Mã): luật liệt kê bốn nước riêng; bộ chọn thuộc `add-chess-board`.
- **Hoà theo FIDE**: lặp lại ba lần và luật 50 nước **không** tự động — bên đến lượt đòi hoà (một phía, không cần đối phương đồng ý) bằng hành động "Đòi hoà", chỉ có khi điều kiện đúng ở thế hiện tại; lặp lại năm lần và luật 75 nước kết thúc tự động; hết nước đi và không đủ quân (thế chết như `chess.js` nhận ra) kết thúc ngay. Đòi hoà là một nước của game (`{ type: "claim-draw" }`) để server làm trọng tài. Lý do: `threefold-claim`, `fifty-move-claim`, `fivefold-repetition`, `seventy-five-move`, `stalemate`, `insufficient-material`, `checkmate`. Chiếu hết ở nước đạt 75 nước / lặp lại năm lần → chiếu hết thắng (FIDE 9.6). Đòi hoà bằng cách báo trước một nước (FIDE 9.2.1): ngoài phạm vi.
- **Ngoài phạm vi M7**: AI/engine (Stockfish GPL — sau), đồng hồ (v1), đề nghị hoà và đầu hàng (v1 / M8 "xử lý bỏ ván"), nhập/xuất PGN, premove, Chess960.

## Decisions

### 1. Thư viện: `chess.js` 1.4.0

- **Phiên bản**: 1.4.0, phát hành 14/06/2025 (`npm view chess.js time`), bản mới nhất; vượt xa tuổi tối thiểu của pnpm 12 (plan.md §2), không cần `minimumReleaseAgeExclude`. Catalog ghi **`chess.js: 1.4.0`** (không `^`): §2 dùng một hàm nội bộ của thư viện. `renovate.json` thêm `packageRules` cho `chess.js`: PR riêng, không `automerge`, nhãn ghi "xem adapter + perft".
- **Giấy phép**: BSD-2-Clause (© 2025 Jeff Hlywa). Bản phân phối dạng nhị phân (bundle web) phải kèm thông báo bản quyền: `add-chess-board` thêm `apps/web/public/third-party-licenses.txt` (khi `chess.js` lần đầu vào bundle). Change này chưa phân phối gì.
- **Cài đặt**: gói chỉ có mã JS (`dist/esm`, `dist/cjs`, kiểu `.d.ts`); script `prepare` chỉ chạy khi cài từ git, không chạy với tarball của registry → không cần `allowBuilds`. Không phụ thuộc gói nào khác.
- **Kích thước**: `dist/esm/chess.js` 107 KB chưa nén, ~24 KB gzip (gồm bộ đọc PGN sinh bằng Peggy; tree-shaking không bỏ được vì cùng một class). Dùng `BigInt` (khoá Zobrist): Node 24 và mọi trình duyệt app hỗ trợ đều có.
- **Ranh giới import**: chỉ `packages/games/src/chess/chess-js.ts` import `chess.js`. `packages/games/eslint.config.js` thêm một khối `@typescript-eslint/no-restricted-imports` (luật riêng, cộng thêm chứ không thay khối `no-restricted-imports` của `createConfig`) chặn `chess.js` ở mọi file trừ adapter và test. `apps/web` không khai báo `chess.js`, nên với `node_modules` cô lập của pnpm, import thẳng từ app không phân giải được (và knip báo phụ thuộc chưa khai).
- **Phương án đã cân nhắc**: tự viết luật (mảng 0x88 hoặc bitboard) — nhiều code nhất cho phần dễ sai nhất, plan.md §6.2 đã đề xuất bọc thư viện; `chessops` (GPL-3.0) — giấy phép buộc mở mã toàn app, chưa có quyết định đó.

### 2. Adapter và hiệu năng: một hàm nội bộ `_moves`

`chess-js.ts` gói mọi tiếp xúc với thư viện: `positionOf(fen)` dựng `new Chess(fen)` mới mỗi lần; `legalPieceMoves(position)`; `play(fen, move)` tự dựng bản cục bộ và trả FEN sau nước, SAN và cờ "nước Tốt hoặc ăn quân" (khi apply đổi từ `play(position, move)`: nhận FEN thì không hàm nào làm đổi một `position` người gọi còn giữ); `normalFen(fen)` (FEN do `fen()` viết lại, cho `chessStateFromFen`); `isInCheck`, `isInsufficient`. Không có bản `Chess` ở mức module, không cache (bất biến hàm thuần).

| Thao tác (thế Kiwipete, 48 nước)                                               | Thời gian                            |
| ------------------------------------------------------------------------------ | ------------------------------------ |
| `new Chess(fen)`                                                               | ~18 µs                               |
| `moves({ verbose: true })` (API công khai, mỗi nước tính SAN + hai FEN)        | ~480 µs (mở đầu) – 2,3 ms (Kiwipete) |
| `moves()` (chỉ SAN)                                                            | ~80 µs                               |
| `_moves({ legal: true })` (nội bộ, ô dạng 0x88)                                | ~40 µs                               |
| Một nửa nước khi phát lại (`result` + `legalMoves` + `applyMove`) với `_moves` | ~0,2 ms                              |
| Như trên với `moves({ verbose: true })`                                        | ~1,3–1,5 ms                          |

Bản nháp, ván ngẫu nhiên 525 nửa nước: biên bản 17,4 KB, `fromRecord` ~102 ms với `_moves`; với API công khai ~0,7 s (đo lại với luật cuối ở đoạn dưới: 616 nửa nước, 20,4 KB, ~89 ms).

Đo lại khi apply (04/11/2026, cùng máy, adapter thật): `new Chess(fen)` ~11 µs; `legalPieceMoves` (gồm kiểm hình dạng và dựng object) ~25 µs ở thế mở đầu, ~64 µs ở Kiwipete; `moves({ verbose: true })` ~0,66 ms và ~3,5 ms — nhanh hơn 25–55 lần. Ván ngẫu nhiên dài nhất của seed 1–40 (seed 39, 616 nửa nước): biên bản 20,4 KB, `fromRecord` ~89 ms (`record.test.ts`). Mỗi lần ghi của phòng và mỗi lần phòng đổi ở client đều phát lại cả ván, nên API công khai làm một ván ~80 nửa nước tốn ~0,1 s/nước trên server và vài trăm ms trên điện thoại ở cuối ván; với `_moves` là ~16 ms và ~60 ms (ước tính điện thoại chậm hơn 3–4 lần).

- **Chọn `_moves`**, gói chặt:
  - `dist/types/chess.d.ts` khai `private _moves;` (kiểu `any`), nên không gọi qua ngoặc vuông trên kiểu `Chess`. Khai riêng `interface ChessInternals { _moves(options: { legal: true }): readonly RawMove[] }` với `RawMove = { from: number; to: number; promotion?: string }`, ép `position as unknown as ChessInternals` và gọi như phương thức (giữ `this`).
  - Kiểm hình dạng lúc chạy: `typeof _moves === "function"`, kết quả là mảng, mỗi phần tử có `from`/`to` là số 0x88 hợp lệ, `promotion` vắng hoặc thuộc `q|r|b|n`; sai → ném lỗi có thông điệp nêu phiên bản đã ghim. Không âm thầm sai khi thư viện đổi.
  - Dựng `ChessPieceMove` tường minh `{ from, to }` và chỉ thêm `promotion` khi có (exactOptionalPropertyTypes, contract `plain-data`).
  - Thứ tự nước phong cấp lấy theo `CHESS_PROMOTION_PIECES` (q, r, b, n) chứ không theo thứ tự nội bộ (n, b, r, q); không nơi nào được "lấy nước hợp lệ đầu tiên" trên ô phong cấp — giao diện luôn hỏi (`add-chess-board`).
  - Mọi thứ khác (`move`, `fen`, `inCheck`, `isInsufficientMaterial`) là API công khai.
- **Chốt an toàn**: ghim phiên bản + luật Renovate (§1); `chess-js.test.ts` đối chiếu `legalPieceMoves` với `moves({ verbose: true })` (tập UCI bằng nhau) ở mọi thế perft và mọi thế của ba ván ngẫu nhiên; test adapter với đối tượng thiếu `_moves` → lỗi rõ.
- **Phương án đã cân nhắc**: chỉ dùng API công khai (chậm 25–55 lần mỗi lần gọi, 6–10 lần mỗi nửa nước phát lại; đo ở trên); lưu sẵn nước hợp lệ trong state do `applyMove` tính một lần (vẫn phải `verbose`, state to hơn ~1 KB/thế); cache theo FEN ở mức module (cấm: luật là hàm thuần); tự sinh nước đi (§1).

### 3. State, nước đi, khoá nước

```ts
// constants.ts
export const CHESS_COLOR = { White: "w", Black: "b" } as const; // ghế 0 = Trắng, ghế 1 = Đen
export const CHESS_PIECE = {
  King: "k",
  Queen: "q",
  Rook: "r",
  Bishop: "b",
  Knight: "n",
  Pawn: "p",
} as const;
export const CHESS_PROMOTION_PIECES = ["q", "r", "b", "n"] as const; // thứ tự hiện ở bộ chọn
export const CHESS_RESULT_REASON = {
  Checkmate: "checkmate",
  Stalemate: "stalemate",
  InsufficientMaterial: "insufficient-material",
  ThreefoldClaim: "threefold-claim",
  FiftyMoveClaim: "fifty-move-claim",
  FivefoldRepetition: "fivefold-repetition",
  SeventyFiveMove: "seventy-five-move",
} as const;
export const CHESS_CLAIM_DRAW = "claim-draw";
export type ChessSquare =
  `${"a" | "b" | "c" | "d" | "e" | "f" | "g" | "h"}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

// rules.ts
export interface ChessState {
  /** Thế cờ hiện tại, FEN đủ 6 trường (bộ đếm nửa nước cho luật 50 / 75 nước). */
  readonly fen: string;
  /** Khoá thế cờ (4 trường đầu của FEN) từ nước Tốt hoặc ăn quân gần nhất tới nay, cũ trước; phần tử cuối là thế hiện tại. */
  readonly positions: readonly string[];
  /** Mọi nước đi quân đã đi, SAN, cũ trước: sổ ghi. */
  readonly san: readonly string[];
  /** Lý do khi ván kết thúc bằng đòi hoà, `null` nếu chưa ai đòi. */
  readonly drawClaim: "threefold-claim" | "fifty-move-claim" | null;
}
export interface ChessPieceMove {
  readonly from: ChessSquare;
  readonly to: ChessSquare;
  readonly promotion?: ChessPromotionPiece; // chỉ có ở nước phong cấp
}
export interface ChessDrawClaim {
  readonly type: typeof CHESS_CLAIM_DRAW;
}
export type ChessMove = ChessPieceMove | ChessDrawClaim;
```

- **Đếm lặp lại**: `chess.js` đếm lặp bằng lịch sử của chính bản `Chess`, mất khi dựng từ FEN, nên state tự giữ `positions`. Khoá = 4 trường đầu của FEN (vị trí quân, bên đi, quyền nhập thành, ô bắt tốt qua đường). `fen()` của `chess.js` 1.4 **chỉ ghi ô bắt tốt qua đường khi nước bắt đó hợp lệ** (kể cả kiểm tốt bị ghim), nên khoá khớp định nghĩa "cùng thế" của FIDE 9.2.2 (scenario "Khác quyền nhập thành thì không phải cùng thế"). Nước Tốt hoặc ăn quân không thể đảo ngược, nên `positions` bắt đầu lại sau nước đó: độ dài = bộ đếm nửa nước + 1 ≤ 151 (bộ đếm dừng ở 150 vì luật 75 nước kết thúc ván). Lặp ba lần / năm lần = số lần khoá cuối xuất hiện trong `positions` ≥ 3 / ≥ 5.
- **Sổ ghi `san`**: SAN là mã chuẩn (chữ K/Q/R/B/N), app dịch thành hình quân và lời đọc. Lấy từ `Move.san` mà `move()` trả. Phương án khác: app tự tính SAN khi hiện (cần cả lịch sử thế, `BoardProps` không có) hoặc thêm lịch sử vào `BoardProps` (sửa phần dùng chung cho một game).
- **Bộ nhớ**: session giữ mọi thế, mỗi thế một bản sao `san` và `positions`, nên tổng là O(n²) phần tử: ván 300 nửa nước có Σ1..300 ≈ 45 000 tham chiếu chuỗi SAN (các chuỗi dùng chung, chỉ mảng là mới) ≈ 0,4 MB, cộng `positions` ≤ 151 khoá mỗi thế ≈ 0,3 MB. Chấp nhận được trên điện thoại; nếu đo thấy nặng, cách gỡ là lưu `san` dạng danh sách liên kết bất biến (vẫn là dữ liệu thuần) — không làm trước.
- **Nước đi quân**: `{ from, to, promotion? }`; nhập thành là nước của vua (`e1g1`), bắt tốt qua đường là nước của tốt chéo tới ô trống; mỗi lựa chọn phong cấp là một nước.
- **Nước đòi hoà**: `{ type: "claim-draw" }`, nằm trong `legalMoves` của bên đến lượt **chỉ khi** thế hiện tại đòi hoà được (lặp ≥ 3 hoặc bộ đếm nửa nước ≥ 100) và ván chưa kết thúc. `applyMove` giữ nguyên `fen`, `positions`, `san`, đặt `drawClaim` (`threefold-claim` nếu lặp ≥ 3, không thì `fifty-move-claim`); `currentPlayer` vẫn là bên đã đòi (app dùng để nói ai đòi). Chỉ bên đến lượt gửi được nước nên online server từ chối người khác bằng luật lượt sẵn có.
- **`moveKey`**: UCI cho nước đi quân (`e2e4`, `e7e8q`) — kiểm `from`/`to` khớp `/^[a-h][1-8]$/`, `promotion` vắng hoặc thuộc `CHESS_PROMOTION_PIECES`, không có `type`; `"claim-draw"` cho nước đòi hoà (object có đúng `type: "claim-draw"`, không `from`/`to`). Sai dạng → ném `TypeError` → engine coi là không khớp (`illegal-move`). Nhờ vậy `{ from: "e7e8", to: "q" }` không ghép thành `e7e8q`.
- **Không dùng zod ở luật**: giao thức để `move: z.unknown()` có chủ đích, biên bản cũng vậy; `findLegalMove` chỉ nhận nước có khoá trùng một nước hợp lệ và giữ object của luật.
- **Hàm của luật** (mỗi hàm dựng một `positionOf(state.fen)` khi cần):
  - `setup` → FEN mở đầu, `positions: [khoá mở đầu]`, `san: []`, `drawClaim: null`.
  - `currentPlayer` → trường 2 của FEN: `w` → 0, `b` → 1 (đọc chuỗi).
  - `legalMoves` → nước đi quân tính một lần; rỗng khi `endOf(…) !== null`; thêm `{ type: "claim-draw" }` cuối danh sách khi đòi hoà được.
  - `applyMove` → nước đi quân: `play`; `positions` bắt đầu lại nếu là nước Tốt hoặc ăn quân, không thì nối khoá mới; `san` nối `Move.san`. Nước đòi hoà: như trên. Không sửa state cũ. Thêm sau review: ném lỗi khi ván đã xong (đòi hoà rồi, lặp năm lần, 75 nước, không đủ quân; chiếu hết / hết nước đi thì `chess.js` tự từ chối mọi nước, nước đòi hoà thì kiểm còn nước đi quân) và khi `promotion` không khớp nước thật (`chess.js` bỏ qua quân phong ở nước không phong cấp) — engine không gọi được tới đó, nhưng luật không nhận state hay nước sai.
  - `result` → `endOf(…)`.

### 4. Kết thúc ván

`endOf` theo thứ tự:

1. `drawClaim !== null` → hoà với lý do đó.
2. Không có nước đi quân và đang bị chiếu → `{ kind: "win", winners: [bên vừa đi], reason: "checkmate" }`.
3. Không có nước đi quân → hoà `stalemate`.
4. `isInsufficientMaterial()` → hoà `insufficient-material` (`chess.js`: hai vua; vua + một tượng hoặc một mã; vua + các tượng cùng màu ô ở cả hai bên). Đây là phần thế chết `chess.js` nhận ra; thế chết khác (tốt khoá chặt) không tự kết thúc (Ngoài phạm vi).
5. Khoá cuối xuất hiện ≥ 5 lần → hoà `fivefold-repetition`.
6. Bộ đếm nửa nước ≥ 150 → hoà `seventy-five-move`.

- Chiếu hết đứng trước lặp năm lần và 75 nước (FIDE 9.6: nước chiếu hết quyết định ván) — scenario "Chiếu hết ở nước thứ bảy mươi lăm" (đã thử: `Rh8#` ở nửa nước có bộ đếm 100 cho `isCheckmate()` đúng; cùng cách ở 150).
- Đòi hoà được (lặp ≥ 3, bộ đếm ≥ 100) **không** là kết thúc: ván đi tiếp nếu bên đến lượt đi quân; quyền đòi chỉ còn nếu thế mới cũng đủ điều kiện (FIDE 9.4: đi quân là mất quyền đòi cho thế cũ).
- **Đòi bằng nước báo trước** (FIDE 9.2.1, 9.3.1: ghi nước sẽ tạo lặp lại / nước thứ 50 rồi đòi): ngoài phạm vi. Hệ quả: người tạo lần lặp thứ ba bằng nước của mình không đòi được ở lượt đó; đối thủ đòi được. Ghi trong Ngoài phạm vi.
- Đo 40 ván ngẫu nhiên với bản nháp (hoà tự động ở 3 lần / 50 nước): dài trung bình 369 nửa nước, dài nhất 546. Với luật cuối, người chơi ngẫu nhiên chọn nước đòi hoà như mọi nước khác khi có, còn không thì ván chạy tới 5 lần / 75 nước; chặn trên lý thuyết ~8 800 nửa nước.
- **Đo lại với luật cuối** (task 3.2, seed 1–40): trung bình 359 nửa nước, ngắn nhất 61, dài nhất 616; lý do: `insufficient-material` 25, `fifty-move-claim` 9, `checkmate` 5, `stalemate` 1 (seed 1–20: 14 / 3 / 2 / 1). Người chơi ngẫu nhiên gần như luôn chọn nước đòi hoà trong vài nước sau khi bộ đếm tới 100, nên không ván nào tới 75 nước hay lặp năm lần. `maxPlies` = 3 000 (gấp ~5 lần ván dài nhất đo được).

### 5. Hàm cho giao diện và cách phát hành trước bàn cờ

- `board.ts` (không import `chess.js`, đọc FEN): `chessBoard(state)` → 64 ô `{ color, type } | null` theo thứ tự a1, b1, …, h8; `chessSquareName(file, rank)` / `chessSquareAt(index)`; `isChessDrawClaim(move)` (phân biệt hai loại nước). Trong `rules.ts`: `chessKingInCheck(state)` → ô vua của bên đến lượt nếu đang bị chiếu, `null` nếu không. Bàn cờ (`add-chess-board`) đọc thế qua các hàm này, không phân tích FEN và không import `chess.js`.
- `test-positions.ts` (chỉ test dùng, như Cờ caro): `chessStateFromFen(fen)` dựng state từ một FEN, **chuẩn hoá qua `fen()` của `chess.js`** (bỏ ô bắt tốt qua đường không dùng được, chuẩn thứ tự quyền nhập thành) để khoá lặp khớp với khoá do `applyMove` tạo; khoá lặp chỉ gồm thế đó. Không có trong `index.ts`.
- `index.ts` export `chess`, kiểu, hằng, hàm ở trên; `package.json` thêm `"./chess": "./src/chess/index.ts"`.
- Thêm khi apply: `constants.ts` có `CHESS_FILES`, `CHESS_RANKS` (dựng kiểu `ChessSquare`), kiểu `ChessColor`, `ChessPieceType`, `ChessResultReason`, và bốn ngưỡng `CLAIM_REPETITIONS` (3), `CLAIM_HALF_MOVES` (100), `AUTOMATIC_REPETITIONS` (5), `AUTOMATIC_HALF_MOVES` (150) (không export qua `index.ts`); `rules.ts` export `chessPositionKey(fen)` cho `test-positions.ts` (không qua `index.ts`). `setup` không gọi `chess.js` (FEN mở đầu viết sẵn).
- **Chưa đăng ký**: không thêm vào `GAMES`, `GAME_IDS`. Nếu thêm, `RegisteredGameId` có `"chess"` và app lỗi kiểu ở `GAME_ENTRY_LOADERS`/`GAME_ARTWORK` cho tới khi có bàn cờ; nếu ép qua thì menu có thẻ "Chơi" dẫn tới game không có bàn và server mở được phòng Cờ vua. Giữ ngoài danh sách: menu vẫn "Sắp có", không route, không phòng, `chess.js` không vào bundle nào. Knip coi `exports` của package là điểm vào nên không báo export thừa.
- Phương án đã cân nhắc: cờ `hidden` trong `GameMeta` (sửa engine, menu, server cho một trạng thái tạm); làm luật và bàn trong một change (PR lớn, luật không được review riêng).

### 6. Test

| File               | Nội dung                                                                                                                                                                                                                                                                                                                                                                         | Thời gian đo (bản nháp)                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `perft.test.ts`    | perft qua `chess.legalMoves`/`chess.applyMove`, chỉ đếm nước đi quân: mở đầu độ sâu 1–4 (20 / 400 / 8 902 / 197 281), Kiwipete 1–3 (48 / 2 039 / 97 862), thế 3 độ sâu 4 (43 238), thế 4 và bản đối xứng độ sâu 3 (9 467), thế 5 độ sâu 3 (62 379), thế 6 độ sâu 3 (89 890)                                                                                                      | bản nháp: tổng ~1,8 s. **Apply** (chạy riêng file, đếm mọi độ sâu 1…d): mở đầu 0,87 s, Kiwipete 0,33 s, thế 3 0,17 s, thế 4 0,05 s + 0,04 s, thế 5 0,20 s, thế 6 0,28 s; tổng ~1,9 s (~3,9 s khi cả gói chạy song song) |
| `contract.test.ts` | `describeGameContract(chess, { seeds: [1, 2, 3], maxPlies, timeout: 10_000 })`; ván ngẫu nhiên seed 4–13 kết thúc với một trong bảy lý do; ván **không đòi hoà** (bọc `legalMoves` bỏ nước đòi hoà: seed 1 và 7 ngẫu nhiên, thêm hai ván seed 3, 4 mà mỗi bên 70% / 90% đi ngược nước trước của mình) kết thúc, có ván tới `seventy-five-move` (seed 7) và `fivefold-repetition` | apply: 16 kiểm tra ~5,1 s + 20 ván ~1,8 s. Sau review: 10 ván ~0,9 s, ván không đòi hoà ~0,3 s; file ~6,8 s khi cả thư mục `chess` chạy song song                                                                       |
| `chess-js.test.ts` | adapter = `moves({ verbose: true })` ở mọi thế perft (và một nước sau chúng) và mọi thế của một ván ngẫu nhiên (seed 1); thứ tự phong cấp q, r, b, n; lỗi rõ khi `_moves` thiếu hoặc trả sai dạng                                                                                                                                                                                | apply: ~2,1 s với 3 ván (~1 200 thế, 1,7 s vì API công khai chậm); sau review 1 ván (~400 thế): ~1,2 s cả file, quét ván ~0,6 s                                                                                         |
| `rules.test.ts`    | mỗi scenario của `specs/chess` qua `createSession`/`playMove` (kể cả mã lỗi), thế dựng bằng `chessStateFromFen`; `moveKey` từ chối dữ liệu sai dạng; state cũ không đổi                                                                                                                                                                                                          | apply: ~0,5 s (75 test); `board.test.ts` (tên ô, `isChessDrawClaim`) ~0 s                                                                                                                                               |
| `record.test.ts`   | ván có nhập thành, bắt tốt qua đường, phong cấp, kết thúc bằng đòi hoà → `toRecord` → JSON → `fromRecord` giống hệt; `fromRecord` của một biên bản 500+ nửa nước                                                                                                                                                                                                                 | apply: ~0,3 s (ván dựng tay 26 ms; seed 39, 616 nửa nước, ~0,26 s gồm cả chơi ván)                                                                                                                                      |

- **Vì sao perft qua `legalMoves` vẫn đúng**: perft đếm nước đi quân; nước đòi hoà chỉ có khi lặp ≥ 3 (cần ≥ 8 nửa nước từ thế gốc) hoặc bộ đếm ≥ 100, không xảy ra ở độ sâu ≤ 4 từ các thế chuẩn (bộ đếm 0–1); các điều kiện kết thúc khác (5 lần, 75 nước, không đủ quân) cũng không tới ở các độ sâu này — số khớp công bố là bằng chứng. Helper perft vẫn lọc `isChessDrawClaim` để không phụ thuộc lập luận đó. Đi qua `legalMoves` (thay vì `chess.perft()` của thư viện) là để kiểm chính adapter: đổi ô 0x88, bốn nước phong cấp, nhập thành.
- Độ sâu chọn để file chậm nhất dưới ~2 s và tổng thêm vào `pnpm --filter @board-games/games test` dưới ~8 s (Vitest chạy các file song song). Thế 4 đối xứng (Đen đi) bắt lỗi chỉ xảy ra ở một màu. Độ sâu 5 của thế mở đầu (4 865 609) qua luật mất ~20 s: không đưa vào `pnpm check`. Đổi độ sâu khi apply thì sửa luôn số trong scenario "Số nước đi ở các thế cờ chuẩn".

### 7. Online và biên bản

- Không đổi giao thức: nước đi quân < 60 B, nước đòi hoà ~30 B trong thông điệp `move` (giới hạn 16 KB chỉ cho client → server). Biên bản server → client tăng ~33 B/nửa nước: ván 200 nửa nước ~6,6 KB, ván ngẫu nhiên dài nhất đo được (seed 39, 616 nửa nước) 20,4 KB. `PROTOCOL_VERSION` giữ 2.
- Change này chưa đăng ký game nên server chưa mở được phòng Cờ vua; chơi online thuộc `add-chess-board`.

## Risks / Trade-offs

- [Dùng `_moves` nội bộ] → ghim phiên bản, luật Renovate riêng, một file adapter, kiểm hình dạng lúc chạy, test đối chiếu với API công khai (§2). Nâng lên 2.x phải xem lại adapter.
- [Phát lại cả ván ở mỗi lần ghi] → ~0,2 ms/nửa nước trên Node; ván rất dài trên điện thoại cũ có thể khựng ~0,3–0,5 s mỗi lần phòng đổi. Nếu đo thật thấy chậm: cache session theo `revision` ở transport online (phần dùng chung, change riêng), không cache trong luật.
- [Ván ngẫu nhiên dài hơn vì không còn hoà tự động ở 3 lần / 50 nước] → bộ kiểm tra hợp đồng có thể chậm hơn bản nháp; giảm còn 2 seed nếu vượt ~10 s, giữ perft đầy đủ.
- [Người chơi không biết mình đòi hoà được] → nút "Đòi hoà" chỉ hiện khi đòi được (`add-chess-board`).
- [`chess.js` có bộ đọc PGN không dùng] → ~24 KB gzip chỉ ở chunk Cờ vua và server.

## Open Questions

(không có — các quyết định đã chốt ở trên)
