# Tasks

## 0. Trước khi code

- [x] 0.1 Người dùng duyệt `mockup/index.html` (bố cục điện thoại xoay ngang 844 × 390, Cờ cá ngựa và Cờ vua, sáng/tối); ghi điều chỉnh vào design §3
- [x] 0.2 Người dùng duyệt khung thanh trên cùng + hover trong `mockup/index.html` (thanh dính khi đã cuộn, nút "Giao diện"/"Ngôn ngữ" với menu thả xuống ở máy tính sáng/tối và điện thoại 390 px, thẻ game hover/focus); ghi điều chỉnh vào design §8–§10
- [x] 0.3 `add-resign-and-abandon` và `add-rules-pages` đã archive (change này kiểm cả màn hình của chúng); chạy `pnpm ui:shots`, xem ảnh 360/390 px của mọi màn hình, bổ sung danh sách chỗ hở vào design §2–§4 nếu có thêm

## 1. Công cụ kiểm tiếp cận

- [x] 1.1 `axe-core: ^4.14.0` vào `catalog` của `pnpm-workspace.yaml`, `"axe-core": "catalog:"` vào `devDependencies` của `apps/web`; `pnpm install` không thêm gói mới vào `pnpm-lock.yaml`, không cần `allowBuilds` hay `minimumReleaseAgeExclude` (design §1)
- [x] 1.2 `e2e/axe.ts` (ESM, `createRequire(import.meta.url).resolve("axe-core/axe.min.js")`; luật WCAG A/AA + `LIGHTHOUSE_RULES` ghi nguồn; `incomplete` đính kèm test; chờ hết animation; lượt `best-practice` đầy đủ chỉ báo); script `test:a11y` ở `apps/web`, `package.json` gốc và `turbo.json` (`dependsOn: ["build"]`); `pnpm knip` xanh
- [x] 1.3 `e2e/a11y.spec.ts` nhóm (A) menu, bắt đầu ván, trang lỗi/không tìm thấy/đang tải — sáng/tối, hai cấu hình, `reducedMotion: "reduce"`
- [x] 1.4 Nhóm (B) màn hình chơi cùng máy ×4, với máy (đang nghĩ, lựa chọn ngựa), thẻ kết quả (thắng có confetti, hoà, đầu hàng)
- [x] 1.5 Nhóm (C) hộp thoại và menu đang mở: "Ván mới", "Đầu hàng", xử bỏ ván, luật chơi, phong cấp Cờ vua, menu "Giao diện" và "Ngôn ngữ" (sau nhóm 6)
- [x] 1.6 Nhóm (D) sảnh chờ (hỏi tên, ghế máy), ván online hai trình duyệt (Cờ vua cầm Đen, dòng chờ bỏ ván với đồng hồ đặt bằng `page.clock.setSystemTime` — không `fastForward`/`runFor`, ghế "Máy chơi thay"), phòng không tồn tại; nhóm (E) trang luật ×4
- [x] 1.7 Lượt `best-practice` đầy đủ một lần (desktop, sáng); đo thời gian `test:a11y` (ngân sách ≤ 3 phút, design §1); ghi vi phạm, `incomplete` và best-practice vào design "Kết quả kiểm tra"

## 2. Sửa vi phạm tiếp cận

- [x] 2.1 Sửa từng vi phạm axe tìm ra (mỗi loại một commit `fix(...)`); màu thiếu tương phản sửa bằng token có sẵn, ghi cặp màu + tỉ số sáng/tối vào design
- [x] 2.2 Rà `best-practice` và `incomplete` còn lại: sửa hoặc ghi lý do giữ vào design
- [x] 2.3 `pnpm test:a11y` xanh theo mọi scenario của "Không vi phạm tiếp cận tự động phát hiện được"

## 3. Điện thoại dọc

- [x] 3.1 Cờ vua dưới 1024 px: bỏ khoảng trống dưới thanh ghế, sổ ghi + nút icon "Lật bàn" một dòng (design §2); test component nút icon có tên "Lật bàn"
- [x] 3.2 Hàng nút của màn hình chơi dưới 1024 px: một dòng khi vừa, "Ván mới" ở dòng đầu khi xuống dòng (design §2, Risks)
- [x] 3.3 `ConnectionNotice` dưới 1024 px: chỗ dành sẵn một dòng `text-small`; test component (trống, đang kết nối lại, tạm ngắt)
- [x] 3.4 `e2e/layout-small.spec.ts`: mọi màn hình ở 360 × 740 và 360 × 640 không cuộn ngang; "Cờ vua ở 360 × 740" (bàn, hai thanh ghế `toBeInViewport()`, "Ván mới" `toBeInViewport({ ratio: 1 })`), "Cờ vua ở 360 × 640"; Cờ cá ngựa: nút gieo trong màn hình; "Ván online trên điện thoại" (chiều cao chỗ dòng báo kết nối ≤ một dòng); vùng chạm ≥ 24 px cho điều khiển của từng màn hình

## 4. Xoay ngang, vùng an toàn, màu thanh trình duyệt, chuyển động

- [x] 4.1 Biến thể `short-landscape:` trong `packages/ui/src/styles.css`; lưới màn hình chơi và `--board-room` cho màn hình ngang thấp (design §3)
- [x] 4.2 E2E 844 × 390 và 740 × 360 theo "Cờ cá ngựa xoay ngang", "Cờ vua xoay ngang" (+ Tic-tac-toe, Cờ caro 15×15: bàn `ratio: 1`); 844 × 300: ghi kết quả, giới hạn nếu có vào design
- [x] 4.3 `app/layout.tsx`: `export const viewport` (`viewportFit: "cover"`, không chặn phóng to); biến `--safe-*` + tiện ích `px-safe`/`pt-safe`/`pb-safe` cho thanh trên, khung nội dung, hộp thoại toàn màn hình; test `layout.test.tsx` (thẻ viewport không có `maximum-scale`/`user-scalable=no`) theo "Phóng to"; E2E đặt `--safe-left: 44px` bằng `page.addStyleTag` theo "Xoay ngang có tai thỏ"
- [x] 4.4 `ThemeColorSync` (design §4) + hai thẻ `theme-color` theo `media` trong HTML server; test component và E2E theo "Màn hình chơi Cờ cá ngựa ở giao diện tối", "Về menu"
- [x] 4.5 Rà mọi `animate-*`/`transition` (kể cả hộp thoại, dòng chờ bỏ ván) có nhánh `motion-reduce:`; E2E `reducedMotion: "reduce"` mở hộp thoại không có chuyển động

## 5. Thanh trên cùng dính (design §8)

- [x] 5.1 `packages/ui`: `TopBar` (ô `start`/`center`/`end`, `sticky top-0 z-30`, nền đặc theo token, `pt` vùng an toàn), token `--top-bar-height` (điện thoại, `sm`, `short-landscape:`), `scroll-padding-top` cho `html`; test component (vai trò `banner`, nền không trong suốt qua lớp token)
- [x] 5.2 `features/shell/AppTopBar.tsx` (luôn có `ThemeMenu` + `LocaleMenu` ở cuối ô `end`; dưới `sm`: "← Về menu" chỉ icon, tiêu đề `truncate`, chip ra nội dung — design §8) + menu dùng nó (thay `AppBar`); test `AppTopBar` (hai nút ở mọi biến thể) và `MenuPage` theo vai trò
- [x] 5.3 Màn hình chơi (bốn game, cùng máy, với máy, online) dùng `AppTopBar` có hai nút chọn, chip xuống đầu nội dung dưới `sm`; `--board-room` và lưới theo `--top-bar-height` thay cho số cứng; `play-layout.spec.ts` (1280 × 800) và `layout-small.spec.ts` xanh không nới ngưỡng
- [x] 5.4 Bắt đầu ván, sảnh chờ, đang vào phòng, lỗi phòng dùng `AppTopBar` (có hai nút chọn) ("← Về menu" lên thanh); test component các trang đó
- [x] 5.5 Trang luật, `StateScreen` (không tìm thấy ×3, `error.tsx`, lỗi tải game, đang tải) dùng `AppTopBar` (có hai nút chọn); test theo "Trang không tìm thấy"
- [x] 5.6 E2E `top-bar.spec.ts`: theo "Cuộn trang luật", "Cuộn menu bằng Tab", "Màn hình chơi vẫn không cần cuộn"; thanh vẫn ở `y = 0` sau khi cuộn ở menu, bắt đầu ván, sảnh chờ, trang luật (hai cấu hình); hộp thoại mở nằm trên thanh

## 6. Menu chọn giao diện và ngôn ngữ (design §9)

- [x] 6.1 `packages/ui`: `Menu` (`MenuButton`, `MenuRadioGroup`, `MenuRadioItem`; `popover="auto"`, `toggle` → `aria-expanded`, vị trí kẹp trong khung với lề 16 px), `GlobeIcon`, `LoaderIcon` trong `icons.ts`; test đủ bàn phím (Enter/Space/↓/↑ mở và vào mục, ↑/↓/Home/End, chữ cái đầu, Enter/Space chọn, Escape trả tiêu điểm, Tab đóng), bấm ngoài, `aria-haspopup`/`aria-controls`/`aria-checked`
- [x] 6.2 `ThemeMenu` (thay `ThemeSwitcher`): icon theo lựa chọn (đọc `currentTheme()`, HTML server đúng icon từ cookie), tên "Giao diện: {theme}"; test theo các scenario của "Chọn giao diện sáng hoặc tối"; test cũ của giao diện (cookie, không nháy) xanh
- [x] 6.3 `LocaleMenu` (thay `LocaleSwitcher`): globe + mã, tên "Ngôn ngữ: {language}, {code}", `lang` mỗi mục, `aria-busy` + vòng xoay (tĩnh khi giảm chuyển động) khi đang đổi; test theo các scenario của "Đổi ngôn ngữ"
- [x] 6.4 Bản dịch `Settings.themeButton`, `Settings.languageButton`, `Settings.languageSwitching` vi/en/ja; bỏ khoá không còn dùng; `messages.test.ts`, `pnpm knip` xanh
- [x] 6.5 E2E `settings-menus.spec.ts` (hai cấu hình): mở/chọn bằng bàn phím và bằng chuột/chạm, Escape, bấm ngoài, đổi ngôn ngữ giữ tiêu điểm ở nút; menu trọn trong khung 360 × 740 trên menu, màn hình chơi, sảnh chờ, trang luật, trang không tìm thấy; "Đổi ngôn ngữ ở trang luật"; sửa `theme.spec.ts`, `i18n.spec.ts` theo vai trò mới
- [x] 6.6 Kiểm không client component nào trong cây trang phòng/màn hình chơi lấy `locale` làm `key` hay mở lại kết nối khi ngôn ngữ đổi (design §9); E2E: đổi giao diện và ngôn ngữ giữa ván Cờ caro cùng máy và với máy (ván, lượt, máy đang nghĩ giữ nguyên) theo "Đổi ngôn ngữ giữa ván"; hai trình duyệt trong phòng Cờ caro online theo "Đổi giao diện khi đang chơi online", "Đổi ngôn ngữ khi đang chơi online" (không về sảnh, giữ ghế, nước của đối thủ tới); ghi kết quả (giữ kết nối hay nối lại) vào design §9

## 7. Hover, nhấn và chuyển động (design §10)

- [x] 7.1 Token `--duration-fast`, `--duration-base`, `--ease-standard` + tiện ích `transition-lift` trong `styles.css`; `styles.test.ts` kiểm có token và mọi tiện ích chuyển động mới có nhánh `motion-reduce`
- [x] 7.2 `Button`, `Card`, `Input`, liên kết chữ: trạng thái hover/focus-visible/active theo bảng design §10; test component không đổi (vai trò, tên)
- [x] 7.3 Thẻ game ở menu (nhấc + bóng, hình phóng nhẹ trong khung `overflow-hidden`, focus-within như hover), hàng "Tiếp tục ván dở", mục menu chọn; E2E: hover thẻ không đổi `boundingBox` của các thẻ khác (không xô bố cục), `reducedMotion: "reduce"` không có `transform`
- [x] 7.4 Kiểm `hover:` của bản build nằm trong `@media (hover: hover)` (test đọc CSS build hoặc E2E giả lập `hover: none`); ô bàn cờ không thêm hiệu ứng ngoài nền nhẹ đã có

## 8. Menu, README, ảnh

- [x] 8.1 Chân trang menu: liên kết "Giấy phép bên thứ ba" (khoá có sẵn `Menu.thirdPartyLicenses` vi/en/ja, vùng chạm ≥ 24 px: `py-2` + `inline-block`); test component và E2E theo "Mở danh sách giấy phép"
- [x] 8.2 README theo design §6 (chạy ở máy, biến môi trường không có bí mật, deploy Vercel + Upstash `sin1`, cấu trúc, mọi lệnh kể cả `test:a11y`, giấy phép: mã nguồn giữ mọi quyền + bên thứ ba); plan.md §4.6 thêm dòng `pnpm test:a11y`
- [x] 8.3 `ui-shots/screens.shots.ts`: ảnh ở design §7 (360 × 740 mọi màn hình chơi, 360 × 640 Cờ vua, 844 × 390 bốn game, 844 × 300 Cờ cá ngựa, chân trang menu, thanh trên đã cuộn ở menu/bắt đầu ván/trang luật 390 px, menu "Giao diện" mở ở máy tính sáng/tối, menu "Ngôn ngữ" mở ở 390 px, thẻ game hover/focus, thanh trên của màn hình chơi Cờ cá ngựa, Cờ vua online, sảnh chờ, trang luật và trang không tìm thấy ở 360 × 740, 390 × 844, 1280 × 800); chạy `pnpm ui:shots`, xem từng ảnh sáng/tối, so trước/sau `20g-chess-360` và `19-online-ludo-playing`, so ảnh ngang với mockup; người dùng duyệt ảnh
- [x] 8.4 Rà `web-design-guidelines` trên các file đã đổi; checklist UX bàn cờ của skill `board-games-ui` ở 360 px và ngang

## 9. Đo và thử thật

- [x] 9.1 Lighthouse chạy tay trên bản build production theo design §1 (Mobile và Desktop, sáng và tối); điền bảng "Kết quả kiểm tra"; mọi trang ≥ 90

## 10. Hoàn tất

- [x] 10.1 plan.md §10: M8 xong — ba change, điểm Lighthouse, kết quả thử trên thiết bị thật (đóng các mục "Còn lại" của M4–M7 đã thử), và ghi nhận các mục M8 có từ trước (sáng/tối `color-theme`, bàn phím, ký hiệu quân ngoài màu) đã kiểm lại bằng `pnpm test:a11y` và test hiện có; idea.md §9 thêm "không có giấy phép mã nguồn (giữ mọi quyền)"
- [x] 10.2 Đối chiếu design và delta với code; diff trọn thân hai khối MODIFIED (`color-theme` "Chọn giao diện sáng hoặc tối", `localization` "Đổi ngôn ngữ") với `openspec/specs/`; `pnpm exec openspec validate polish-accessibility-and-mobile --strict`, `pnpm check`, `pnpm knip`, `pnpm test:e2e` (hai cấu hình), `pnpm test:a11y`, `pnpm spec:check`
- [x] 10.3 Archive change (`pnpm exec openspec archive polish-accessibility-and-mobile --yes`) trong cùng PR, sau review

## Ngoài phạm vi

- PWA, "Thêm vào màn hình chính": v1 (idea.md §4.2).
- Lighthouse CI, `@axe-core/playwright`: không cần (design §1).
- File `LICENSE` của dự án: người dùng chốt không có (giữ mọi quyền).
- So ảnh tự động: vẫn xem ảnh `ui:shots` bằng mắt (plan.md §4.6).
- Task 9.2 cũ — thử trên thiết bị thật theo checklist design §5 (iPhone Safari dọc/ngang kể cả vùng tai thỏ và màu thanh trình duyệt, Android Chrome, laptop; online giữa hai thiết bị trên Production; VoiceOver/TalkBack): cần điện thoại thật và bản deploy Production, người dùng tự thử sau khi merge; danh sách giữ ở plan.md §10 (M8, "Còn treo"), lỗi tìm ra là việc sửa lỗi hoặc change mới.
