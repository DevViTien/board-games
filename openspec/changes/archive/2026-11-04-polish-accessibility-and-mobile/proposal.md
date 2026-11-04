# Proposal

## Why

Tiêu chí xong của M8 (plan.md §6.2) là "bạn bè dùng thử trên **điện thoại và laptop** không cần hướng dẫn thêm; **Lighthouse Accessibility ≥ 90**". Các mốc trước đã làm phần lớn mục của hàng M8 (sáng/tối, bàn phím, ký hiệu quân ngoài màu), nhưng còn những chỗ hở đã ghi lại: Cờ vua ở 360 × 740 có khoảng trống dưới thanh ghế và hàng nút xuống dòng nên "Ván mới" nằm dưới mép màn hình (plan.md §10 M7); màn hình online giữ một dải trống cho dòng báo kết nối đẩy bàn xuống trên điện thoại; điện thoại xoay ngang thì bàn cao hơn màn hình (idea.md §4.1 hứa "cả dọc lẫn ngang"); app chưa xử lý vùng tai thỏ (`safe-area`); chưa có cách kiểm tiếp cận tự động lặp lại được; chưa thử trên thiết bị thật; README chưa có cách deploy. Change này kiểm và sửa toàn app sau khi `add-resign-and-abandon` và `add-rules-pages` đã có màn hình mới. Thuộc mốc **M8. Hoàn thiện MVP**; là change cuối của M8.

## What Changes

- **Kiểm tiếp cận tự động**: `apps/web/e2e/a11y.spec.ts` chạy axe-core trong Playwright trên mọi màn hình chính (menu, bắt đầu ván của bốn game, màn hình chơi của bốn game ở các chế độ, sảnh chờ, ván online, trang luật và hộp thoại luật, hộp thoại xác nhận, các trang lỗi/không tìm thấy) ở sáng và tối, điện thoại và máy tính; không được có vi phạm WCAG 2.x A/AA nào. Lệnh `pnpm test:a11y` (cũng chạy trong `pnpm test:e2e`). Thư viện: `axe-core` 4.14.0 khai báo trong `catalog` (đã có trong `pnpm-lock.yaml` qua `eslint-plugin-jsx-a11y`, không thêm gói nào mới; design §1).
- **Lighthouse**: chạy tay một lần trên bản build production (Chrome DevTools, điện thoại và máy tính, sáng và tối) cho menu, bắt đầu ván, màn hình chơi, sảnh chờ, trang luật; ghi điểm vào design và plan.md §10; mục tiêu ≥ 90 ở mọi trang.
- **Sửa những gì kiểm tra tìm ra**, kèm các chỗ hở đã biết:
  - Cờ vua 360 × 740: bỏ khoảng trống dưới thanh ghế; sổ ghi, "Lật bàn" và hàng nút gọn trong một khối; bàn, hai thanh ghế và trọn nút "Ván mới" nằm trong màn hình không cần cuộn. Kiểm thêm khung thật 360 × 640 (có thanh trình duyệt).
  - Dòng báo kết nối online trên điện thoại: chỗ dành sẵn chỉ còn một dòng chữ nhỏ (vẫn không làm bàn nhảy khi mất kết nối).
  - Điện thoại xoay ngang: bàn vừa chiều cao màn hình, phần điều khiển đặt bên cạnh như trên máy tính.
  - Vùng an toàn: `viewport-fit=cover` + lề qua biến trung gian `--safe-*` (= `env(safe-area-inset-*)`, test đặt được) cho thanh trên, nội dung và hộp thoại.
  - `theme-color` theo **nền trang đang hiện** (nền của game `--game-page`, sáng/tối, cả giao diện người chơi chọn), đặt bởi một client component nhỏ.
  - Điện thoại xoay ngang kiểm ở 844 × 390, 740 × 360 và 844 × 300 (Safari có thanh địa chỉ); bố cục ngang có mockup nhỏ `mockup/index.html` để duyệt trước khi code.
  - Hàng nút của màn hình chơi ở 360 px (với máy có thêm "Đầu hàng" sau `add-resign-and-abandon`): một dòng khi vừa, xuống dòng gọn khi không.
  - Rà lại vùng chạm ≥ 24 px (nên 44 px) cho chip, liên kết chữ, nút chỉ có icon; giảm chuyển động cho mọi hiệu ứng (kể cả hộp thoại mới); không cuộn ngang ở 360 px cho mọi màn hình.
- **Thanh trên cùng dính trên mọi trang** (menu, bắt đầu ván, màn hình chơi bốn game kể cả online, sảnh chờ và lỗi phòng, trang luật, các trang không tìm thấy/lỗi/đang tải): một component `TopBar` chung, nền đặc bằng token, tôn trọng vùng an toàn; chiều cao là token `--top-bar-height` mà mọi phép tính "không cuộn" của màn hình chơi dùng; phần tử có tiêu điểm không bị thanh che (design §8).
- **Chọn giao diện và ngôn ngữ gọn hơn**: hai nhóm lựa chọn trên thanh menu thay bằng hai nút icon có trên thanh trên cùng của **mọi trang** (người dùng chốt 04/11/2026) (giao diện: mặt trời/mặt trăng/màn hình theo lựa chọn; ngôn ngữ: quả cầu + mã "VI"), mỗi nút mở một menu thả xuống (mẫu menu button + `menuitemradio`, `popover` gốc, component `Menu` mới trong `packages/ui`), đủ bàn phím, chuột, chạm, nằm trong khung 360 px, `aria-busy` khi đang đổi ngôn ngữ (design §9).
- **Hover, nhấn, chuyển động** nhất quán cho thẻ game và mọi bề mặt bấm được (nhấc thẻ, phóng nhẹ hình, trạng thái nhấn, focus-visible giống hover), token thời lượng chuyển động, tắt khi giảm chuyển động, không dính hover trên cảm ứng (design §10).
- **Menu**: chân trang có liên kết "Giấy phép bên thứ ba" tới `/third-party-licenses.txt` (ghi công bộ quân "staunty" tới được từ mọi nơi, không chỉ trang luật Cờ vua).
- **README**: chạy ở máy (pnpm, server realtime, biến môi trường không có bí mật), deploy (Vercel Hobby + Upstash Free, `sin1`, các bước đã làm ở M0/M3), cấu trúc thư mục, mọi lệnh (`check`, `knip`, `spec:check`, `test:e2e`, `test:a11y`, `ui:shots`), giấy phép bên thứ ba.
- **Ghi nhận việc đã xong** của hàng M8 (sáng/tối, bàn phím, ký hiệu quân) vào plan.md §10 sau khi kiểm lại bằng test hiện có và kiểm tra mới, không làm lại.
- **Thử trên thiết bị thật** (iPhone Safari, Android Chrome, laptop): checklist ở design §5, kết quả ghi vào plan.md §10 (việc còn treo từ M4–M7).

## Capabilities

### New Capabilities

- `accessibility`: không có vi phạm tiếp cận tự động phát hiện được trên các màn hình chính; dùng được ở điện thoại nhỏ dọc, điện thoại xoay ngang, trong vùng an toàn của màn hình; màu thanh trình duyệt theo nền trang.

### Modified Capabilities

- `game-menu`: thêm "Giấy phép bên thứ ba".
- `color-theme`: sửa "Chọn giao diện sáng hoặc tối" (nút "Giao diện" trên thanh của mọi trang mở menu thả xuống thay cho nhóm lựa chọn ở menu).
- `local-play`: sửa "Tuỳ chọn luật của ván" (luật của ván ghi ở đầu phần nội dung, không còn cạnh tên game trên thanh).
- `play-vs-ai`: sửa "Hiện chế độ và mức độ của ván" (cùng chỗ như trên).
- `localization`: sửa "Đổi ngôn ngữ" (nút "Ngôn ngữ" trên thanh của mọi trang mở menu thả xuống, bận trong lúc đổi, không mất ván khi đổi giữa ván).

## Ngoài phạm vi

- PWA, "Thêm vào màn hình chính", chơi offline: v1 (idea.md §4.2).
- Lighthouse CI hay chấm điểm Performance/SEO tự động: không thêm (design §1); chỉ Accessibility được chấm, bằng axe tự động và Lighthouse chạy tay.
- Đổi hướng thiết kế, token màu, font: không — chỉ sửa lỗi bố cục và tiếp cận; màu mới chỉ khi kiểm tra tìm ra tỉ số thiếu (khi đó ghi vào design).
- So ảnh tự động (visual regression): vẫn xem ảnh `ui:shots` bằng mắt (plan.md §4.6).
- File `LICENSE` của dự án: người dùng chốt không có (giữ mọi quyền); README ghi rõ.

## Impact

- **Code**:
  - `apps/web/e2e/a11y.spec.ts` (mới), `apps/web/e2e/axe.ts` (mới, tiêm `axe.min.js` và chạy `axe.run`), `apps/web/e2e/layout-small.spec.ts` (mới: mọi màn hình ở 360 × 740, 360 × 640 và xoay ngang không cuộn ngang, điều khiển chính trong màn hình); `apps/web/package.json` (`axe-core: catalog:` ở devDependencies, script `test:a11y`), `pnpm-workspace.yaml` (`axe-core` trong `catalog`), `package.json` gốc và `turbo.json` (`test:a11y`).
  - `apps/web/src/app/layout.tsx` (`export const viewport`: `viewportFit: "cover"`, `themeColor` sáng/tối), `packages/ui/src/styles.css` (tiện ích lề vùng an toàn nếu cần), `features/play/PlayScreen.tsx` (lưới cho màn hình ngang thấp, dòng báo kết nối, hàng nút), `features/play/ConnectionNotice.tsx`, `games/chess/Board.tsx` (khối sổ ghi + "Lật bàn"), `features/menu/MenuPage.tsx` (chân trang), các chỗ kiểm tra tìm ra.
  - Thanh trên và menu chọn: `packages/ui/src/components/TopBar.tsx`, `Menu.tsx` (mới), `packages/ui/src/icons.ts` (`GlobeIcon`, `CheckIcon` đã có, `LoaderIcon`), `packages/ui/src/styles.css` (`--top-bar-height`, `--duration-*`, `--ease-standard`, `transition-lift`, `scroll-padding-top`); `apps/web/src/features/shell/AppTopBar.tsx` (mới), `features/menu/AppBar.tsx` (bỏ), `features/settings/ThemeMenu.tsx`, `LocaleMenu.tsx` (thay `ThemeSwitcher`, `LocaleSwitcher`), `features/{setup,play,room,rules}/*` và các `not-found.tsx`/`error.tsx` (dùng `AppTopBar`), `PlayScreen.tsx` (`--board-room` theo token); hover/nhấn ở `Button`, `Card`, `Input`, thẻ menu, `ContinueList`.
  - `apps/web/messages/{vi,en,ja}.json` (`Settings.themeButton`, `Settings.languageButton`, `Settings.languageSwitching` và chữ mới nếu có), `apps/web/ui-shots/screens.shots.ts` (ảnh 360 × 740, 360 × 640 và ngang); `apps/web/src/features/settings/ThemeColorSync.tsx` (mới).
  - `README.md`.
- **Engine, games, protocol, server**: không đổi.
- **Phụ thuộc**: `axe-core` 4.14.0 (devDependency của `apps/web`, chỉ chạy trong test, không vào bundle); không thêm gói mới vào lockfile; không `allowBuilds`, không `minimumReleaseAgeExclude` (design §1).
- **Bất biến**: không chạm bất biến nào.
- **Tài liệu**: README, plan.md §4.6 (dòng `pnpm test:a11y`), §10 (M8 xong: điểm Lighthouse, kết quả thử trên thiết bị thật, các mục M8 đã có từ trước).
