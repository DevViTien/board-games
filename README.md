# Board Games Hub

App chơi cờ trên trình duyệt: Tic-tac-toe, Cờ caro, Cờ cá ngựa và Cờ vua — cùng máy, đấu với máy và online với bạn bè qua link mời. Không cần tài khoản. Dự án cá nhân, phi thương mại, chạy trên gói miễn phí của Vercel và Upstash.

- Ý tưởng và các quyết định sản phẩm: [idea.md](idea.md)
- Kế hoạch phát triển, kiến trúc, quy ước code, tiến độ: [plan.md](plan.md)
- Hành vi hiện trạng và việc sắp làm (OpenSpec): [openspec/](openspec/)
- Hướng dẫn làm việc cùng Claude Code: [CLAUDE.md](CLAUDE.md)

## Chạy ở máy

Yêu cầu:

- Node.js 24 (xem `.nvmrc`)
- pnpm 12 (`corepack enable` sẽ tự dùng đúng phiên bản ghi trong `package.json`)
- Lần đầu chạy E2E hoặc chụp màn hình: `pnpm --filter @board-games/web exec playwright install chromium`

```sh
pnpm install   # cài thư viện cho cả monorepo, cài git hooks
pnpm dev       # app ở http://localhost:3000, server realtime ở ws://localhost:3001
```

Không cần biến môi trường nào để chạy ở máy: không có `REDIS_URL` thì phòng online nằm trong bộ nhớ của server realtime (mất khi tắt).

### Chơi online ở máy

1. `pnpm dev` (chạy cả app ở cổng 3000 lẫn server realtime ở cổng 3001).
2. Mở http://localhost:3000/play/tictactoe, chọn **Online**, nhập tên, bấm **Tạo phòng**.
3. Sao chép link mời và mở trong cửa sổ ẩn danh hoặc trình duyệt khác (mỗi trình duyệt nhớ một danh tính; hai tab chưa có tên là hai người khác nhau cho tới khi một tab đặt tên, và tab nào đã ngồi ghế trong một phòng thì giữ đúng ghế đó, kể cả khi tải lại), nhập tên rồi bấm **Vào chơi**.

Điện thoại trong cùng mạng LAN mở được `http://<IP máy>:3000`, nhưng app tìm server realtime ở `ws://localhost:3001` khi chạy `next dev`; khi đó đặt `REALTIME_URL=ws://<IP máy>:3001/api/realtime` cho `next dev`. Ngoài `next dev`, không đặt `REALTIME_URL` thì app dùng cùng origin (`/api/realtime`, như trên Vercel).

### Biến môi trường

Không biến nào là bắt buộc ở máy. Không ghi giá trị bí mật vào repo; trên Vercel chúng nằm trong Settings → Environment Variables.

| Biến                        | Ai đọc           | Ý nghĩa                                                                                                                                                                                  |
| --------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REDIS_URL`                 | server           | Upstash Redis, dạng `rediss://default:<mật khẩu>@<host>:6379`. Không đặt thì phòng nằm trong bộ nhớ. Trên Vercel bắt buộc (thiếu thì server từ chối chạy).                               |
| `REALTIME_URL`              | app (`next dev`) | Địa chỉ server realtime cho trình duyệt, ví dụ `ws://192.168.1.10:3001/api/realtime` khi thử trên điện thoại trong LAN. Không đặt: `ws://localhost:3001` khi dev, cùng origin khi build. |
| `REALTIME_PORT`             | server realtime  | Cổng của server realtime ở máy (mặc định 3001).                                                                                                                                          |
| `REALTIME_ABANDON_AFTER_MS` | server realtime  | Chỉ cho test ở máy: rút ngắn 5 phút trước khi xử được ván bị bỏ. Không có tác dụng trên Vercel.                                                                                          |
| `REDIS_URL_TEST`            | test             | Chạy thêm test kho phòng trên Redis thật: `REDIS_URL_TEST=rediss://… pnpm --filter @board-games/web test`.                                                                               |
| `VERCEL`, `VERCEL_ENV`      | server           | Vercel tự đặt. `VERCEL_ENV` quyết định tiền tố khoá trong Redis (`production:`, `preview:`, còn lại `dev:`), nên Preview và Production dùng chung một Upstash được.                      |

## Deploy (gói miễn phí)

Đã làm ở M0 và M3 (plan.md §10); làm lại cho một bản của riêng bạn:

1. **Vercel Hobby**: Add New → Project → Import repo GitHub này. **Root Directory** `apps/web` (Vercel nhận ra Next.js và pnpm). Thêm biến `ENABLE_EXPERIMENTAL_COREPACK=1` cho Production và Preview để build dùng đúng pnpm ghi trong `package.json`.
2. **Vùng của function**: Settings → Functions → Function Region → **Singapore (`sin1`)**, gần Upstash và người chơi ở Việt Nam (đo ở M3: độ trễ ~70 ms thay cho ~235 ms ở Mỹ).
3. **Upstash Redis Free** qua Vercel Marketplace (Storage → Upstash → Redis), vùng **Singapore**, **tắt tự nâng gói**. Nối với project thì `REDIS_URL` được thêm tự động.
4. Push lên `main` là deploy Production; mỗi PR có link Preview để gửi bạn thử.

Lưu ý:

- Email tác giả của commit phải thuộc tài khoản Vercel, nếu không deploy Hobby bị **Blocked** (ví dụ dùng email noreply của GitHub: `git config --local user.email <id>+<tên>@users.noreply.github.com`).
- Hạn mức cần theo dõi: Vercel Hobby (bộ nhớ 360 GB-giờ, CPU 4 giờ, 1 triệu lần gọi mỗi tháng; WebSocket giữ instance sống nên **GB-giờ** là hạn mức dễ chạm nhất) và Upstash Free (500 nghìn lệnh mỗi tháng). Kết nối WebSocket bị Vercel cắt mỗi ~5 phút là bình thường: app tự nối lại, không mất ván.

## Lệnh

| Lệnh                                                        | Việc làm                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                                  | Chạy app ở http://localhost:3000 kèm server realtime                                              |
| `pnpm --filter @board-games/web realtime`                   | Chỉ chạy server realtime (ws://localhost:3001)                                                    |
| `pnpm check`                                                | Lint, typecheck, test, build (giống CI) — chạy trước khi coi một việc là xong                     |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | Chạy từng bước riêng                                                                              |
| `pnpm test:coverage`                                        | Test kèm báo cáo coverage (`<package>/coverage/`)                                                 |
| `pnpm test:e2e`                                             | Build rồi chạy Playwright (máy tính 1280 × 800 + điện thoại Pixel 7), gồm cả kiểm tiếp cận        |
| `pnpm test:a11y`                                            | Build rồi chỉ chạy kiểm tiếp cận tự động (axe-core, WCAG 2.x A/AA + luật Lighthouse, sáng và tối) |
| `pnpm ui:shots`                                             | Build rồi chụp các màn hình chính vào `apps/web/.ui-shots/` để duyệt giao diện bằng mắt           |
| `pnpm knip`                                                 | Tìm file, export, thư viện không dùng                                                             |
| `pnpm spec:check`                                           | Kiểm tra OpenSpec (strict), chặn change xong mà chưa archive                                      |
| `pnpm format` / `pnpm format:check`                         | Định dạng code bằng Prettier / chỉ kiểm tra                                                       |
| `pnpm --filter @board-games/ui test`                        | Chạy lệnh cho một package                                                                         |

## Cấu trúc

```
apps/web            Next.js: giao diện, route, server WebSocket
  src/app           route (menu, /play, /room, /rules)
  src/features      màn hình dùng chung (menu, bắt đầu ván, màn hình chơi, phòng, luật, thanh trên)
  src/games         bàn, hình, token và trang luật của từng game
  e2e               Playwright (kể cả a11y.spec.ts), ui-shots/ chụp màn hình
packages/engine     Hợp đồng game, session, AI — không phụ thuộc framework
packages/games      Luật từng game
packages/protocol   Thông điệp online
packages/ui         Design token, component, icon dùng chung
packages/config     tsconfig, ESLint, Vitest dùng chung
```

- Phụ thuộc giữa các package chỉ đi một chiều (plan.md §3.1), ESLint báo lỗi nếu import sai chiều.
- Phiên bản thư viện khai báo một lần trong `pnpm-workspace.yaml` (mục `catalog`); các package tham chiếu bằng `"catalog:"`.
- Quy ước constant/enum, styling, icon, test: plan.md §4.

## Giấy phép

- **Mã nguồn của dự án**: giữ mọi quyền (all rights reserved). Repo không có file `LICENSE`: được xem và chạy thử, không được sao chép hay phân phối lại khi chưa hỏi tác giả.
- **Bên thứ ba** đi kèm app: [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause, luật Cờ vua), [three.js](https://github.com/mrdoob/three.js) và [cannon-es](https://github.com/pmndrs/cannon-es) (MIT, xúc xắc 3D của Cờ cá ngựa, chỉ tải trên màn chơi đó) và bộ quân Cờ vua **"staunty"** của Lichess (CC BY-NC-SA 4.0, file giữ nguyên trong `apps/web/public/pieces/staunty/`). Văn bản giấy phép đầy đủ: [apps/web/public/third-party-licenses.txt](apps/web/public/third-party-licenses.txt), cũng mở được từ chân trang menu của app ("Giấy phép bên thứ ba").
- Thư viện chỉ dùng khi phát triển (axe-core, Playwright, …) không vào bản build.

## Phát triển theo spec (OpenSpec)

Mọi thay đổi **hành vi** đi qua [OpenSpec](https://github.com/Fission-AI/OpenSpec), dùng các lệnh trong Claude Code:

| Lệnh                         | Việc làm                                                             |
| ---------------------------- | -------------------------------------------------------------------- |
| `/opsx:explore`              | Bàn và làm rõ ý tưởng trước khi viết spec (không viết code)          |
| `/opsx:propose <mô tả>`      | Tạo change: proposal, delta spec, design, tasks                      |
| `/opsx:apply`                | Code theo tasks của change                                           |
| `/opsx:archive`              | Change xong: gộp delta vào `openspec/specs/`, chuyển vào `archive/`  |
| `/opsx:update`, `/opsx:sync` | Sửa artifact của change đang làm; đồng bộ delta vào specs giữa chừng |

Quy tắc đầy đủ (khi nào cần change, archive trong cùng PR, bẫy khi sửa spec): [CLAUDE.md](CLAUDE.md). Bối cảnh, bất biến kiến trúc và quy tắc viết artifact: [openspec/config.yaml](openspec/config.yaml). Artifact viết tiếng Việt, định danh và từ khoá cấu trúc giữ tiếng Anh.

## Commit

Commit message theo [Conventional Commits](https://www.conventionalcommits.org/): `feat(caro): add win detection`, `fix(ui): button focus ring`. Hook `commit-msg` sẽ từ chối message sai định dạng; hook `pre-commit` tự chạy Prettier và ESLint trên file thay đổi.
