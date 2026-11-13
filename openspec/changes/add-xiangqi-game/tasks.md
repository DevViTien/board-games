# Tasks

## 1. Duyệt thiết kế

- [x] 1.1 Người dùng duyệt mockup `mockup/index.html` (ảnh trong `mockup/png/`); ghi ngày duyệt và chỗ cần sửa vào design, sửa mockup nếu có

## 2. Luật và máy

- [x] 2.1 `packages/games/src/xiangqi/`: bàn, quân, sinh nước từng quân (cản chân Mã, cản mắt Tượng, ngòi Pháo, cung, sông), lọc tự chiếu và lộ mặt Tướng; test theo "Bàn và quân", "Cách đi của quân", "Tướng không đối mặt và không tự để bị chiếu"; perft độ sâu 1–3 từ thế mở đầu và vài thế đặc biệt
- [x] 2.2 Kết thúc ván: chiếu bí, hết nước, chiếu dai, lặp lại, 120 nước không ăn quân (`history`, `quiet`, `ending`); `describeGameContract`; test theo "Thắng khi chiếu bí hoặc hết nước", "Chiếu dai và lặp lại", "Hoà khi lâu không ăn quân"
- [x] 2.3 Ký hiệu Việt Nam (kể cả "t"/"s" và nhiều Tốt cùng cột); test theo "Ký hiệu nước đi"
- [x] 2.4 `evaluate`, `candidateMoves` có thứ tự; test theo "Máy chơi Cờ tướng"; đo một nước Khó ở thế giữa ván, ghi vào design §4
- [x] 2.5 Đăng ký: `GAME_IDS`, `GAMES`, `AI_GAMES`, `exports` của package; `index.test.ts` xanh

## 3. Giao diện

- [x] 3.1 Kiểm phông chữ Hán (design §5), chốt phông cho mặt quân; `theme.css` sáng/tối và `theme-css.test.ts`
- [x] 3.2 Quân SVG, bàn (giao điểm, sông, cung, dấu điểm, số cột theo hướng bàn); test theo "Bàn Cờ tướng"
- [x] 3.3 Chọn và đi quân, đánh dấu nước vừa đi và chiếu, bàn phím, tên giao điểm; test theo "Chọn quân và đi quân Cờ tướng", "Nước vừa đi và chiếu trên bàn Cờ tướng", "Đi quân Cờ tướng bằng bàn phím"
- [x] 3.4 Thanh người chơi, sổ ghi nước, lật bàn, nhãn nước đi, kết quả; test theo "Thanh người chơi Cờ tướng", "Sổ ghi nước đi Cờ tướng", "Lật bàn Cờ tướng", "Kết quả ván Cờ tướng"
- [x] 3.5 `Artwork.tsx`, `Rules.tsx` có hình (Mã cản chân, Pháo ăn qua ngòi); registry, artwork, rules; test theo "Luật Cờ tướng" và thẻ menu
- [x] 3.6 Bản dịch vi/en/ja: tên game, mô tả thẻ, tên quân, chữ của bàn, kết quả, luật

## 4. Kiểm tra

- [x] 4.1 E2E `games-xiangqi.spec.ts`: cùng máy tới chiếu bí, đấu với máy, online hai trình duyệt, điện thoại 360 px; cảnh mới trong `ui-shots`
- [x] 4.2 `pnpm ui:shots`, xem từng ảnh sáng/tối × 390/1280 và 360 px so với mockup; rà `web-design-guidelines`; hai lượt review code (senior dev, săn bug), sửa xong
- [x] 4.3 `pnpm check`, `pnpm knip`, `pnpm spec:check`, `pnpm test:e2e` xanh; cập nhật idea.md, plan.md §10, README, skill `board-games-ui`
- [ ] 4.4 Người dùng chơi thử local trước khi merge

## Workflow follow-up

- Archive sau các change đang mở tạo trước nó (`add-jelly-gather-puzzle`, `add-jelly-gather-molds`, `add-jelly-crew-game`, `add-new-game-options`, `add-forbidden-triangle-game`). Delta `game-menu` chép từ bản của `add-forbidden-triangle-game`.
