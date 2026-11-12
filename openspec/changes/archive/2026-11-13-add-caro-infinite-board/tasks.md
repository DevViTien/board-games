# Tasks

## 0. Thiết kế

- [x] 0.1 Người dùng chọn "Bàn vô hạn tự nở" cho mọi chế độ (cùng máy, đấu với máy, online), ngày 13/11/2026
- [x] 0.2 Mockup chạy được trong `mockup/` (ảnh `mockup/png/`) làm tài liệu tham chiếu; người dùng yêu cầu implement và merge luôn ngày 13/11/2026 (design, mục Context)

## 1. Luật (`packages/games/src/caro/`)

- [x] 1.1 `CARO_SIZES` thêm `"infinite"`, `CARO_INFINITE` (giới hạn 61, vùng đầu 15, lề 5), `parseCaroOptions` nhận `"infinite"`; test tuỳ chọn ("Tuỳ chọn luật của Cờ caro", năm scenario)
- [x] 1.2 State có `area` và `infinite`; `setup`, `legalMoves` theo vùng, `applyMove` nở vùng cắt theo bàn; bàn 15×15 và 19×19 giữ nguyên hành vi; test theo "Bàn và người chơi", "Đặt quân", "Bàn vô hạn tự nở", "Hoà" (mọi scenario, kể cả mép giới hạn không chặn)
- [x] 1.3 Bộ kiểm tra hợp đồng thêm hai tổ hợp vô hạn (`maxPlies: 3721`); test `optionChoices` theo "Lựa chọn tuỳ chọn luật của Cờ caro"

## 2. Máy

- [x] 2.1 `caroEvaluate` chấm thưa trên bàn vô hạn; test cùng điểm với cách chấm mọi dãy trên cùng thế cờ; test mọi ô máy xét nằm trong vùng; các test chặn chuỗi hiện có chạy thêm trên bàn vô hạn; "Nước đầu trên bàn vô hạn" (hàng 31, cột 31)
- [x] 2.2 Đo thời gian máy mức Vừa và Khó trên thế cờ vô hạn 30 nước trong test (như test 19×19 hiện có), theo "Máy Cờ caro trên bàn vô hạn"

## 3. Giao diện (`apps/web/src/games/caro/`)

- [x] 3.1 Icon `ZoomInIcon`, `ZoomOutIcon`, `LocateFixedIcon` trong `packages/ui/src/icons.ts`
- [x] 3.2 `Board.tsx` tổng quát hoá theo vùng hiện; bàn vô hạn là khung cuộn với bốn mức thu phóng, đường đậm theo chỉ số giới hạn, bù cuộn khi vùng nở, giữ tâm khi thu phóng, theo nước mới ngoài khung, "Về nước vừa đi", kéo bằng chuột, bàn phím đi trong vùng; test component theo "Xem bàn vô hạn", "Đi quân Cờ caro bằng bàn phím" (bảy scenario) và chạm hai lần; test hiện có của bàn 15×15 và 19×19 vẫn xanh
- [x] 3.3 Bản dịch vi/en/ja: nhãn "Vô hạn", nút thu phóng và lý do, "Về nước vừa đi", câu giới thiệu, câu luật; `Rules.tsx` theo "Luật Cờ caro" (ba cỡ bàn); test trang luật và `move-label` ("Nước đầu trên bàn vô hạn")

## 4. Kiểm tra

- [x] 4.1 E2E trong `e2e/play-caro.spec.ts` (mục "on the board that grows"): chọn "Vô hạn", đặt quân sát mép làm vùng nở mà ô không xê dịch, "Về nước vừa đi", thu phóng, kéo bằng chuột không đặt quân, tự cuộn tới nước của máy ngoài khung; 360 px không cuộn ngang, nút ≥ 44 px, bàn đã nở cuộn trong khung với `overscroll-behavior-x: contain` (kéo ngón tay thật để M8), chạm hai lần đặt quân; ảnh `08f`–`08j-caro-infinite-*` trong `ui-shots/screens.shots.ts`
- [x] 4.2 `pnpm ui:shots` (Cờ caro), xem từng ảnh sáng/tối × 390/1280 so với mockup; rà `web-design-guidelines` trên các file giao diện đã đổi; hai lượt review code (senior dev, săn bug), sửa xong; sửa sau ảnh: đường mép vùng bị cắt nửa nét khi thu nhỏ, ảnh đầu ván chụp trước khi vào màn chơi; sửa sau review: bấm vào thanh cuộn không thành kéo, kéo giữ con trỏ khi ra ngoài khung
- [x] 4.3 Tài liệu: idea.md (bảng game: Cờ caro có bàn vô hạn), plan.md §6.3 và §10; README không nêu cỡ bàn nên không đổi
- [x] 4.4 `pnpm check` (17/17), `pnpm knip`, `pnpm spec:check`, `pnpm test:e2e` của `play-caro.spec.ts` (22 qua, 4 bỏ qua vì chỉ dành cho cảm ứng hay chuột) xanh, chạy trên một worktree chỉ có change này, ngày 13/11/2026

## Ngoài phạm vi

- Xem proposal.md, mục "Ngoài phạm vi". Thêm: thử bù cuộn khi vùng nở trên Safari iOS thật và kéo bằng ngón tay trên điện thoại thật — vào danh sách thử thiết bị thật ở M8.
