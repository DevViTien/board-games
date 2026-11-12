# Tasks

## 0. Thiết kế

- [x] 0.1 Người dùng chốt hướng (13/11/2026): cột phải cùng luôn hiện và thu gọn được trên máy tính; toàn màn hình trên điện thoại. Người dùng yêu cầu implement và merge ngay, không qua bước duyệt mockup

## 1. Bố cục và cột chat

- [x] 1.1 `use-chat-placement.ts`: `CHAT_LAYOUT` `column` / `dock` / `dialog` theo design §1; bỏ `sheetHeight`, `useSheetSpacer`; `useViewportBox`; test chọn bố cục theo khung
- [x] 1.2 `chat-column.ts`: đọc/ghi/nghe `board-games:chat-column` (zod, mặc định mở) + khoá trong `config/storage-keys.ts`; test
- [x] 1.3 Store: `column` và `setColumn`; `ChatButton` không hiện và không đăng ký khi `column`; test
- [x] 1.4 `ChatLayer`: cột (bảng chat cố định ở mép phải), dải `ChatRail`, `data-chat-column` trên `<html>`, mở theo lựa chọn khi vào `column`, đóng khi rời; bong bóng và emoji nổi cạnh dải; test theo "Cột chat trên màn hình rộng" và "Tin đến khi chat đóng"
- [x] 1.5 `globals.css` (`--chat-room`, `--play-side`), `PlayScreen` (`--board-room`, lề, khối bọc `padding-right`), sảnh chờ chừa chỗ; test hiện có của `PlayScreen` xanh

## 2. Hộp thoại toàn màn hình

- [x] 2.1 `ChatLayer` + `ChatPanel`: `<dialog>` `showModal`, `visualViewport`, `cancel` khi gõ bằng bộ gõ, `close` trả tiêu điểm, dòng lượt `aria-live`, khe lời của bàn, `focusOnMount`; nút "Thu gọn chat" ở cột; Esc theo bố cục; test theo "Bố cục chat" và "Chat bằng bàn phím và trình đọc màn hình"
- [x] 2.2 Bản dịch vi/en/ja: `collapse`, `expand`, tên vùng cột

## 3. Kiểm tra

- [x] 3.1 E2E `online-chat.spec.ts`: cột ở 1280 × 800 (không che bàn và cột thông tin, thu gọn, nhớ lựa chọn, tin mới không làm bàn xê dịch), 1024 × 768 (`dock`), hộp thoại ở 360 × 740 và 844 × 390 (bàn đứng yên, bàn phím ảo, Esc); `ui-shots/screens.shots.ts` ảnh `40-*`–`43-*` theo bố cục mới, thêm ảnh cột thu gọn
- [x] 3.2 `pnpm ui:shots` xem từng ảnh chat sáng/tối × 390/1280; rà `web-design-guidelines` trên các file đã đổi; hai lượt review code (senior dev, săn bug), sửa xong
- [x] 3.3 `pnpm check`, `pnpm knip`, `pnpm spec:check`, `pnpm test:e2e` xanh; plan.md §10 (mục `rework-chat-layout`), README nếu cần; thêm `<dialog>` trên iOS và bàn phím ảo vào danh sách thử thiết bị thật ở M8

## Ngoài phạm vi

- Xem proposal, mục "Ngoài phạm vi".
