# Tasks

## 1. Luật và máy

- [x] 1.1 `packages/games/src/forbidden-triangle/`: kiểu, tuỳ chọn `guests` (`parseOptions`, `optionChoices`), `pairOf`/`lineOf`, `closesTriangle`, `safeLines`, `GameDefinition` (nối dây, thua khi khép tam giác, hoà khi hết dây); test theo "Bàn và người chơi", "Nối dây", "Thua khi khép tam giác", "Hoà khi hết dây"
- [x] 1.2 `evaluate` và `candidateMoves`; `describeGameContract`; test theo "Máy chơi Tam giác cấm" (không tự thua ở mọi mức; Khó cầm Xanh thắng 50/50 ván ở bàn 6 khách trước người chơi ngẫu nhiên không tự thua); đo một nước Khó ở bàn 6, 7 khách, ghi vào design
- [x] 1.3 Đăng ký: `GAME_IDS`, `GAMES`, `AI_GAMES`, `exports` của package; `index.test.ts` xanh

## 2. Giao diện

- [x] 2.1 `theme.css` (sáng/tối), `theme-css.test.ts`; nhãn người chơi, nhãn nước đi, chi tiết kết quả, dòng dây an toàn, `SeatMark`
- [x] 2.2 `Board.tsx`: vòng khách, dây hai kiểu nét, dây vừa nối, tam giác thua, thao tác hai bước, cảnh báo và xác nhận nước tự thua, bàn phím, tên đọc được, mô tả bàn; test theo "Hiển thị bàn", "Thao tác", "Cảnh báo nước tự thua", "Dây an toàn trong bảng người chơi", "Dùng được bằng trình đọc màn hình", "Đọc nước đi và kết quả"
- [x] 2.3 `Artwork.tsx`, `Rules.tsx` có hình (tam giác khép, bàn 5 khách hoà); registry `GAME_ENTRY_LOADERS`, `artwork.ts`, `rules.ts`; test theo "Luật Tam giác cấm" và thẻ menu
- [x] 2.4 Bản dịch vi/en/ja: tên game, mô tả thẻ, tuỳ chọn `guests` có ghi chú, `options.change`, chữ của bàn, luật

## 3. Kiểm tra

- [x] 3.1 E2E `games-forbidden-triangle.spec.ts`: cùng máy chơi tới khi khép tam giác, đấu với máy, online hai trình duyệt, điện thoại 360 px bàn 7 khách; cảnh mới trong `ui-shots`
- [x] 3.2 `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280 và 360 px; rà `web-design-guidelines`; hai lượt review code (senior dev, săn bug), sửa xong
- [x] 3.3 `pnpm check`, `pnpm knip`, `pnpm spec:check`, `pnpm test:e2e` xanh; cập nhật idea.md, plan.md §10, README, skill `board-games-ui` (hướng hình của game)
- [ ] 3.4 Người dùng chạy local chơi thử (thay cho duyệt mockup, design §8); ghi nhận xét và sửa trước khi merge

## Workflow follow-up

- Archive sau `add-jelly-gather-puzzle`, `add-jelly-gather-molds`, `add-jelly-crew-game` và `add-new-game-options` (thứ tự tạo; delta `game-menu` chép từ bản của `add-jelly-crew-game`).
