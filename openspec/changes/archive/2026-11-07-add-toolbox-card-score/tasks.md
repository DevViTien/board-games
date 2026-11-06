# Tasks

## 0. Thiết kế

- [x] 0.1 Mockup `mockup/index.html` chạy được, người dùng duyệt mockup và phạm vi trong proposal ngày 07/11/2026 (một máy nhập điểm, chỉ tổng bằng 0, không quy đổi tiền). Chưa thử trên máy thật: chuyển vào danh sách thử thiết bị thật ở `plan.md` §10
- [x] 0.2 Hai lượt duyệt thiết kế (kiến trúc và dữ liệu; trải nghiệm và điểm sót trong spec) đã gộp vào spec, design, mockup

## 1. Logic thuần

- [x] 1.1 `tools/card-score/score-logic.ts`: `parseScore`, `roundState`; test theo "Nhập điểm một ván", "Tự tính người còn trống", "Tổng ván phải bằng 0" (ô sai thắng mọi trạng thái, ô chỉ có dấu trừ, số tự tính bằng 0 và vượt giới hạn, `-0`, NFKC, `+35`, `1.000`)
- [x] 1.2 `summary.ts`: `standings` (kèm số ván nhất), `settlements`: test theo "Bảng xếp hạng hiện tại", "Gợi ý cân điểm"; test thuộc tính với bộ số ngẫu nhiên có seed: sau mọi lần chuyển mọi tổng về 0, không quá số người có tổng khác 0 trừ 1 lần, không có lần chuyển 0 điểm; đầu vào có tổng khác 0 vẫn dừng
- [x] 1.3 `group.ts`: kiểu, schema zod có `superRefine`, `createGroup`, `addRound` (id đã có thì coi như xong), `editRound`, `deleteRound`, đổi tên, thêm người, nghỉ, chơi lại, xoá người chưa có điểm, `newSessionDraft`; test theo "Tạo nhóm", "Sửa nhóm khi đang chơi", "Sửa và xoá ván đã lưu", "Buổi chơi mới từ nhóm cũ", các mã lỗi và giới hạn 500 ván, 16 người, trùng tên với người đã nghỉ
- [x] 1.4 `summary.ts` (`summaryText`): chữ tổng kết nhận hàm dịch và ngày; test theo "Nội dung tổng kết", có tên và không có tên

## 2. Kho dữ liệu

- [x] 2.1 `group-store.ts` trên `idb-keyval` chỉ qua `update`, `entries`, `del`, database riêng và các khoá trong `config/storage-keys.ts`, bọc `lib/with-timeout.ts`, `persist()` sau khi tạo nhóm; test với KV giả không có `set`: thao tác ném lỗi không ghi gì, đọc `saved`, `newer`, `corrupt`, nhóm hỏng không bị xoá và không làm hỏng danh sách, từ chối ghi `newer` và `corrupt`, xoá `corrupt` chỉ khi được gọi rõ, hết giờ báo lỗi, lưu lại cùng id không tạo ván trùng
- [x] 2.2 `use-group.ts` (`useGroups`, `useGroup`): trạng thái `loading`, `ready`, `missing`, `unavailable`, `newer`, `corrupt`; đọc lại khi `visibilitychange` và `focus`; test bằng store giả, đọc lại không đụng bản nháp

## 3. Khung Hộp công cụ

- [x] 3.1 `packages/ui`: export `DialogFrame`, sửa nhánh trình duyệt tự đóng dialog (`showModal()` lại khi `open` vẫn true), thêm icon theo design §11; test nhánh tự đóng và các dialog có sẵn không đổi; `pnpm --filter @board-games/ui test` xanh
- [x] 3.2 `AppTopBar`, `AppStateScreen` thêm prop `back`; test lối về đúng bảng ở design §2, menu và các trang hiện có không đổi; sửa delta `accessibility` nếu khác
- [x] 3.3 `tools/registry.ts`, `tools/card-score/Artwork.tsx`, `features/toolbox/ToolboxPage.tsx`, route `/tools` kèm `error.tsx`; test theo spec `toolbox` kể cả danh sách công cụ thử nghiệm
- [x] 3.4 Lối vào trên `MenuPage`; test theo "Lối vào Hộp công cụ", cả trong màn hình ở 390 × 844 (E2E)
- [x] 3.5 Block ESLint cho `src/tools/**` theo design §1; test trong `packages/config/eslint/index.test.js` cho cả alias lẫn đường dẫn tương đối
- [x] 3.6 Route catch-all `app/tools/card-score/[[...path]]/page.tsx` kèm `error.tsx`, `CardScoreApp` chọn màn hình theo đường dẫn, `pushState`, `replaceState`, `<Link onNavigate>`; test đường dẫn không hợp lệ trả `notFound`, chuyển màn hình không gửi yêu cầu RSC (E2E)
- [x] 3.7 Khoá `Toolbox`, `CardScore` trong `messages/{vi,en,ja}.json`, thêm dần cùng từng nhóm task giao diện; kiểm tra bản dịch tự động xanh

## 4. Danh sách và nhóm

- [x] 4.1 `GroupList`: rỗng, đang tải, không dùng được bộ nhớ, có nhóm, dòng báo nhóm `newer` và `corrupt`; test theo "Danh sách nhóm", "Trình duyệt chặn lưu trữ", "Một nhóm hỏng", "Dữ liệu của bản mới hơn"
- [x] 4.2 `GroupForm` cho `new` và `new?from=`: thêm và bớt ô, lỗi theo từng ô, chỉ render sau khi đọc xong nhóm nguồn, `replaceState` sau khi tạo; test theo "Tạo nhóm", "Buổi chơi mới từ nhóm cũ"
- [x] 4.3 `GroupEdit`: đổi tên khi rời ô, thêm, nghỉ, chơi lại, xoá, mỗi thao tác một `update`; `aria-disabled` kèm lý do ở các giới hạn; test theo "Sửa nhóm khi đang chơi"

## 5. Bảng điểm

- [x] 5.1 `Scoreboard`: xếp hạng, cúp, trạng thái không tìm thấy, `newer`, `corrupt` (có nút xoá); test theo "Bảng xếp hạng hiện tại", "Đường dẫn nhóm trên máy khác"
- [x] 5.2 Mục cân điểm và bảng lịch sử: khung cuộn focus được, cột số ván cố định, lối sửa từng ván, giờ theo thiết bị; test theo "Gợi ý cân điểm", "Lịch sử các ván"
- [x] 5.3 Chia sẻ tổng kết: bảng chia sẻ, sao chép, hộp thoại dự phòng, chưa có ván; test theo mọi scenario của "Chia sẻ tổng kết"
- [x] 5.4 Xoá nhóm, `ConfirmDialog` nêu tên và số ván; vùng `role="status"` gắn sẵn với thông báo đã lưu kèm nút "Sửa"; test theo "Xoá nhóm", "Báo đã lưu", "Sửa ngay ván vừa lưu"

## 6. Màn hình nhập ván

- [x] 6.1 `RoundSheet` với `DialogFrame`: ô từng người, state `active`, `fresh`, dòng trạng thái, vùng status trễ, lối lưu `aria-disabled` kèm lý do, số tự tính là phần tử riêng; test theo "Nhập điểm một ván", "Tự tính người còn trống", "Tổng ván phải bằng 0"
- [x] 6.2 `ScoreKeypad` theo `(pointer: coarse)`, `inputmode="none"`, đổi sang bàn phím của máy nhớ ở localStorage, Enter trên bàn phím thật; test theo mọi scenario của "Bàn số"
- [x] 6.3 Khung hỏi lại trong màn hình, sửa và xoá ván, khoá `saving`, id ván sinh lúc mở, bản nháp sessionStorage; không lưu được thì giữ số đã nhập; test theo "Giữ ván đang nhập dở", "Sửa và xoá ván đã lưu", "Bấm lưu hai lần", "Không lưu được", "Người chơi bị xoá ở tab khác"

## 7. Kiểm tra toàn luồng

- [x] 7.1 E2E `tools-card-score.spec.ts`: lối vào từ menu, tạo nhóm, nhập ván bằng bàn số (Pixel 7) và bàn phím (desktop), tự tính, lệch tổng, sửa, xoá, tải lại giữa chừng, người vào và nghỉ, buổi mới, chia sẻ, cả luồng bằng bàn phím, không có gói tin chứa tên hay điểm
- [x] 7.2 E2E mất mạng theo "Mất mạng giữa buổi" (`context.setOffline`); E2E hai trang bấm lưu gần như đồng thời nhiều lần theo "Hai tab lưu cùng lúc", thử đổi kho sang đọc rồi ghi thì test đỏ
- [x] 7.3 `layout-small.spec.ts`: 360 × 740 và 360 × 640 với 8 tên dài cho mọi màn hình mới, 844 × 390 cho màn hình nhập; `top-bar.spec.ts`: lối về của bốn màn hình con
- [x] 7.4 `a11y.spec.ts`: mọi màn hình và hộp thoại mới, hai giao diện, hai khung; thêm ảnh vào `ui-shots/screens.shots.ts`
- [x] 7.5 Cập nhật `idea.md` (quyết định 18, mô tả Hộp công cụ), `plan.md` (§3.2, §6.3, §10, danh sách thử thiết bị thật: bàn số, `inputmode="none"`, `navigator.share` trên iOS và Android, trình đọc màn hình), `README.md`, và thêm bất biến vào `openspec/config.yaml`
- [x] 7.6 `pnpm check --concurrency=1`, `KNIP_DISABLE_RAW_TRANSFER=1 pnpm knip`, `pnpm format:check`, `pnpm spec:check`, `pnpm test:e2e`, `pnpm test:a11y` xanh; `pnpm ui:shots`, xem từng ảnh mới so với mockup, rà bằng `web-design-guidelines`
- [x] 7.7 Hai lượt review code (senior dev, săn bug), sửa xong chạy lại 7.6

## Workflow follow-up

- Archive trong cùng nhánh sau khi đối chiếu delta với code (`/opsx:archive`).
- Commit, push, merge khi người dùng yêu cầu; thử trên Production sau khi merge.
