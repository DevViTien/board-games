# Tasks

## 1. Chuẩn bị

- [x] 1.1 Thêm mã `ai-not-supported` vào `ENGINE_ERROR` (`packages/engine/src/errors.ts`); ghi hợp đồng thang điểm của `evaluate` (design §2: số hữu hạn, nên là số nguyên, trị tuyệt đối dưới 10^8, mọi chênh lệch đều được coi là thật) vào chú thích của `evaluate` trong `types.ts`; kiểm chứng bằng `errors.test.ts` xanh (mã duy nhất, kebab-case) và typecheck
- [x] 1.2 Tạo `packages/engine/src/ai/levels.ts` (`AI_LEVEL` `as const`, `AiLevel`, độ sâu tối thiểu/tối đa và tỉ lệ nước ngẫu nhiên của từng mức theo design §3) và `ai/score.ts` (`WIN`, `EVAL_LIMIT`, `TIE_EPSILON`); trong `test-fixtures/`: thêm `evaluate` và biến thể `supportsAI: true` cho game giả đếm số, biến thể `supportsAI: true` có `evaluate` cho game đua xúc xắc, game giả `choice-game.ts` có tuỳ chọn `winWeight`/`loseWeight`, `line-game.ts` và `tree-game.ts` (cây sinh theo seed); trong `testing/` (xuất qua `@board-games/engine/testing`): `clocks.ts` (đồng hồ không bao giờ hết giờ — ném lỗi sau `maxReads` lần đọc thay vì treo —, hết giờ ngay, tăng đều mỗi lần đọc) (design §6); test nhỏ cho từng game giả và đồng hồ (mỗi biến thể vượt `describeGameContract`); kiểm chứng bằng typecheck và test engine xanh

## 2. Tìm kiếm

- [x] 2.1 Tạo `ai/search.ts`: một vòng tìm độ sâu cố định theo design §2 (góc nhìn ghế máy, alpha-beta, expectimax ở nút ngẫu nhiên với trọng số kiểm bằng `checkOutcomeWeights` dùng chung với `session`, ném lỗi ở thế chưa kết thúc mà không có nước đi, điểm thắng/thua theo số nước, `evaluate` có `NaN` thành 0 và bị kẹp `±EVAL_LIMIT`, mọi danh sách nước lấy qua `searchMoves`, cửa sổ `(best − TIE_EPSILON, +∞)` ở gốc trả nhóm ứng viên ngang điểm có giá trị chính xác, báo đã chạm giới hạn độ sâu hay chưa, dừng khi đồng hồ hết giờ nếu được phép); test: chọn đúng nước thắng ngay, chặn thua ngay ở độ sâu 2, kỳ vọng có trọng số với `choice-game` (spec "Chọn nước có kỳ vọng tốt hơn", "Không trông vào kết quả may mắn"), không thay đổi trạng thái (trạng thái đóng băng sâu), `evaluate` trả `NaN`/`±Infinity` vẫn cho nước hợp lệ, nước gieo có kỳ vọng hơn chỉ một phần lẻ (5/6, 1/2) vẫn thắng nước chắc chắn, hai nước gieo cùng kỳ vọng vẫn ngang, trọng số `0`/âm/lẻ/`NaN`/`Infinity` và thế không có nước đi thì ném lỗi; trên các thế ngẫu nhiên của Tic-tac-toe (giữa ván và tàn cuộc): điểm tốt nhất và **tập** nước ngang điểm tốt nhất trùng với minimax không cắt tỉa; trên 400 cây của `tree-game`: trùng với expectiminimax kiểu paranoid không cắt tỉa

## 3. Chọn nước

- [x] 3.1 Tạo `ai/choose-move.ts`: kiểm tra đầu vào (`game-over`, `ai-not-supported`; mức độ lạ, `timeLimitMs` không hữu hạn hoặc âm, đồng hồ đọc ra số không hữu hạn thì ném `RangeError`), ba mức độ theo design §3, đào sâu dần với độ sâu tối thiểu của mức luôn chạy hết, chọn đều giữa nhóm ngang điểm bằng `rng`; test theo các scenario "Máy đi một nước hợp lệ", "Ván đã kết thúc", "Game không hỗ trợ đấu với máy", "Chớp nước thắng ngay", "Thắng sớm nhất có thể", "Thua muộn nhất có thể", "Không đi vào thế thua khi tránh được", "Chặn nước thắng ngay của đối thủ", "Ưu tiên thắng hơn chặn", "Dễ không phải lúc nào cũng đi nước tốt nhất", "Hết giờ vẫn có nước đi", "Hết giờ vẫn chặn nước thắng ngay" (mức Vừa và Khó, đồng hồ hết giờ ngay), quá hạn chót thì dừng ngay ở nút kế tiếp (không gọi thêm hàm luật nào), "Tìm hết cây trước khi hết giờ" (đồng hồ đứng yên ném lỗi sau 100 lần đọc), "Cùng đầu vào cho cùng nước đi", "Các nước tốt ngang nhau được chọn ngẫu nhiên" (Tic-tac-toe mở đầu và `choice-game` tỉ lệ 1:1 với nhiều seed); không viết test "Dễ không chặn" (design §3)
- [x] 3.2 Kiểm AI với game có xúc xắc: mọi mức độ trả nước hợp lệ cho biến thể có AI của game đua xúc xắc với 2, 3 và 4 người, dùng đồng hồ tăng đều mỗi lần đọc và hạn 5 ms để mức Khó dừng được (design §6)
- [x] 3.3 Xuất `chooseMove`, `AI_LEVEL`, `AiLevel`, `ChooseMoveOptions` từ `packages/engine/src/index.ts`; kiểm chứng bằng `pnpm knip` không báo thừa và typecheck

## 4. Tic-tac-toe đấu với máy

- [x] 4.1 Thêm `evaluate` (design §4) và `supportsAI: true` vào `packages/games/src/tictactoe/rules.ts`; cập nhật test `meta` trong `rules.test.ts` (scenario "Có thể đấu với máy"); test `evaluate` trong `ai.test.ts`: thế đang có hai quân thẳng hàng được điểm cao hơn thế trống, đổi ghế thì đổi dấu, giá trị là số nguyên trong ±800; `describeGameContract` vẫn xanh (kiểm tra `supportsAI ⇒ evaluate`)
- [x] 4.2 Test "Thử mọi cách đi của người chơi" (design §5): trong `ai.test.ts`, duyệt toàn bộ cây với máy mức Khó (đồng hồ `neverExpires` từ `@board-games/engine/testing`), cả người đi trước và máy đi trước, với 3 seed khác nhau, không lá nào người chơi thắng; test chạy dưới 10 giây

## 5. Kiểm tra tích hợp

- [x] 5.1 Chạy `pnpm --filter @board-games/engine test:coverage` (dòng và nhánh ≥ 90%), `pnpm check`, `pnpm knip`, `pnpm spec:check`; cập nhật plan.md §3.3 dòng AI (`chooseMove`, mức độ, thang điểm `evaluate`) và kiểm chứng bằng đọc lại

## Workflow follow-up

- Review code (senior dev + săn bug), xử lý kết quả, rồi archive bằng `/opsx:archive` trong cùng PR với task cuối.
- Sau khi archive, xác nhận `openspec/specs/game-ai/spec.md` được tạo, `openspec/specs/tictactoe/spec.md` đã đổi requirement "Bàn và người chơi", và `pnpm spec:check` xanh.
