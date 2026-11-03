# Tasks

## 1. Thư viện và adapter

- [x] 1.1 Thêm `chess.js: 1.4.0` (ghim chính xác) vào `catalog` của `pnpm-workspace.yaml` kèm chú thích lý do ghim (design §1, §2), `"chess.js": "catalog:"` vào `dependencies` của `packages/games`; `renovate.json` thêm `packageRules` cho `chess.js` (PR riêng, không `automerge`); `pnpm install` không cần `allowBuilds` hay `minimumReleaseAgeExclude`; `pnpm-lock.yaml` chỉ thêm đúng một gói
- [x] 1.2 `packages/games/eslint.config.js`: khối `@typescript-eslint/no-restricted-imports` chặn `chess.js` ở mọi file trừ `src/chess/chess-js.ts` và test (design §1); thử import `chess.js` từ `rules.ts` thì lint đỏ, bỏ đi thì xanh
- [x] 1.3 `chess/constants.ts` (`CHESS_COLOR`, `CHESS_PIECE`, `CHESS_PROMOTION_PIECES`, `CHESS_RESULT_REASON`, `CHESS_CLAIM_DRAW`, `ChessSquare`, `ChessPromotionPiece`; design §3)
- [x] 1.4 `chess/chess-js.ts`: `positionOf`, `legalPieceMoves` qua `ChessInternals._moves` (ép `as unknown as`, gọi như phương thức, kiểm hình dạng lúc chạy, dựng `ChessPieceMove` tường minh, thứ tự phong cấp theo `CHESS_PROMOTION_PIECES`), `play`, `isInCheck`, `isInsufficient` (design §2)
- [x] 1.5 `chess-js.test.ts`: tập UCI của `legalPieceMoves` bằng tập của `moves({ verbose: true })` ở mọi thế perft của design §6 và mọi thế của một ván ngẫu nhiên (ba ván lúc đầu; giảm sau review vì thời gian test); bốn nước phong cấp theo thứ tự q, r, b, n; nước không phong cấp không có khoá `promotion`; đối tượng thiếu `_moves` hoặc trả phần tử sai dạng → lỗi có thông điệp rõ

## 2. Luật

- [x] 2.1 `chess/rules.ts`: `ChessState` (gồm `drawClaim`), `ChessPieceMove`, `ChessDrawClaim`, `chess` khai báo `as const satisfies GameDefinition<ChessState, ChessMove>` (`meta` classic / 20 phút / `supportsAI: false`, `defaultOptions: {}`, không `parseOptions`), `setup`, `currentPlayer`, `legalMoves` (thêm nước đòi hoà khi đòi được), `applyMove`, `result` theo thứ tự ở design §4, `moveKey` (UCI / `claim-draw`, kiểm dạng)
- [x] 2.2 `chess/test-positions.ts`: `chessStateFromFen` chuẩn hoá FEN qua `fen()` của `chess.js`; test: FEN có ô bắt tốt qua đường không dùng được cho cùng khoá với thế không có ô đó
- [x] 2.3 `rules.test.ts` theo "Bàn và người chơi" (ván mới 32 quân, 20 nước; khai báo; `invalid-options`) và "Nước đi hợp lệ" (quân bị ghim, `illegal-move` và ván không đổi, dữ liệu sai dạng gồm `{ from: "e2e", to: "4" }`, `{ from: "e7e8", to: "q" }`, `{ type: "claim-draw", from: "e2" }`, thiếu trường, trường lạ được bỏ khỏi lịch sử); state cũ không đổi sau `applyMove`
- [x] 2.4 Test theo "Nhập thành" (bảy scenario, thêm mất quyền khi Xe bị ăn), "Bắt tốt qua đường" (ba scenario), "Phong cấp" (bốn scenario, thêm phong cấp khi ăn quân và phong cấp của Đen ở hàng 1)
- [x] 2.5 Test theo "Chiếu hết", "Hết nước đi", "Không đủ quân để chiếu hết" (thêm vua + mã, hai tượng khác màu ô vẫn chơi tiếp); mỗi kết thúc: `legalMoves` rỗng và `result` đúng `kind`, `winners`, `reason`
- [x] 2.6 Test theo "Đòi hoà" (sáu scenario: chưa tự kết thúc, đòi khi lặp ba lần, chưa đủ điều kiện, khác quyền nhập thành, đòi theo 50 nước, đi tiếp thay vì đòi); thêm: khác quyền bắt tốt qua đường không phải cùng thế; nước đòi hoà chỉ có trong `legalMoves` của bên đến lượt; sau đòi hoà `currentPlayer` là bên đã đòi
- [x] 2.7 Test theo "Hoà tự động khi lặp lại năm lần hoặc sau 75 nước" (bốn scenario, kể cả chiếu hết ở nước thứ 75 và chiếu hết tạo lần lặp thứ năm); `positions` dài đúng bộ đếm nửa nước + 1 và bắt đầu lại sau nước Tốt hoặc ăn quân
- [x] 2.8 Test theo "Ký hiệu nước đi": sổ ghi `f3 e5 g4 Qh4#`, `e8=Q+` (Vua trắng e1, Vua đen a8), `Nbd2`, `O-O`, `O-O-O`, `exd6` (bắt tốt qua đường); nước đòi hoà không thêm gì vào `san`
- [x] 2.9 `chess/board.ts` (`chessBoard`, `chessSquareName`, `chessSquareAt`, `isChessDrawClaim`) và `chessKingInCheck` (design §5); test: thế mở đầu đủ 32 quân đúng ô, ô vua bị chiếu ở thế "Bị chiếu vẫn còn nước thoát", `null` khi không bị chiếu

## 3. Perft, hợp đồng, biên bản

- [x] 3.1 `chess/perft.test.ts` theo "Số nước đi ở các thế cờ chuẩn" ở đúng các độ sâu của design §6 (chỉ đếm nước đi quân); đo thời gian từng thế, chỉnh độ sâu nếu file vượt ~2 s (sửa luôn số trong scenario), ghi số đo vào design §6
- [x] 3.2 `chess/contract.test.ts`: `describeGameContract(chess, { seeds: [1, 2, 3], maxPlies, timeout })` xanh; test "Ván ngẫu nhiên kết thúc" (seed 4–13, mọi ván có `result` với một trong bảy lý do; thêm ván không đòi hoà tới `seventy-five-move` / `fivefold-repetition`); đo độ dài trung bình / dài nhất và phân bố lý do với luật cuối, chọn `maxPlies`, ghi vào design §4, §6
- [x] 3.3 `chess/record.test.ts` theo "Dựng lại ván từ biên bản" (ván dựng tay có `O-O`, `exd6` qua đường, `e8=N` và kết thúc bằng đòi hoà; so state, sổ ghi, lượt, kết quả); đo `fromRecord` của biên bản 500+ nửa nước, ghi vào design §2

## 4. Export và tài liệu

- [x] 4.1 `chess/index.ts` và subpath `"./chess"` trong `packages/games/package.json`; **không** thêm vào `GAMES`, `GAME_IDS` (`index.test.ts` không đổi; menu vẫn ghi Cờ vua "Sắp có"); `pnpm knip` sạch
- [x] 4.2 plan.md §2 thêm dòng `chess.js` 1.4.0 (ghim, lý do, luật Renovate), §10 ghi M7 bắt đầu: `add-chess-rules` xong

## 5. Hoàn tất

- [x] 5.1 Đối chiếu design và delta spec với code; `pnpm exec openspec validate add-chess-rules --strict`, `pnpm check`, `pnpm knip`, `pnpm spec:check` (không đổi giao diện nên không cần `pnpm test:e2e`; E2E hiện có vẫn phải xanh trong CI)
- [x] 5.2 Archive change (`pnpm exec openspec archive add-chess-rules --yes`) trong cùng PR, sau review, trước khi apply `add-chess-board`

## Ngoài phạm vi

- Bàn cờ, nút "Đòi hoà", menu, đăng ký game trong `GAMES`/`GAME_IDS`, online, E2E, thông báo giấy phép đi kèm bundle: change `add-chess-board` (cùng M7).
- Đòi hoà bằng cách báo trước một nước sẽ tạo thế lặp lại hoặc nước thứ 50 (FIDE 9.2.1, 9.3.1): chỉ đòi được trên thế hiện tại (design §4); làm sau nếu người chơi cần.
- Thế chết ngoài các trường hợp `isInsufficientMaterial()` nhận ra: không tự kết thúc; ván vẫn hết ở 75 nước.
- Máy chơi Cờ vua và `evaluate`: sau MVP (Stockfish GPLv3, idea.md §8).
- Đề nghị hoà cần đối phương đồng ý: v1.
- Perft độ sâu 5 trở lên: ~20 s, không hợp `pnpm check`; chạy tay khi nâng `chess.js` nếu cần.
- Nhập/xuất PGN, FEN cho người chơi, Chess960, đồng hồ, đầu hàng: ngoài M7 (proposal).
