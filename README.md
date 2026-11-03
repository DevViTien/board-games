# Board Games Hub

App chơi cờ trên trình duyệt: cùng máy, với máy và online với bạn bè qua link mời.

- Ý tưởng và các quyết định sản phẩm: [idea.md](idea.md)
- Kế hoạch phát triển, kiến trúc, quy ước code: [plan.md](plan.md)
- Hành vi hiện trạng và việc sắp làm (OpenSpec): [openspec/](openspec/)
- Hướng dẫn làm việc cùng Claude Code: [CLAUDE.md](CLAUDE.md)

## Yêu cầu

- Node.js 24 (xem `.nvmrc`)
- pnpm 12 (`corepack enable` sẽ tự dùng đúng phiên bản ghi trong `package.json`)
- Lần đầu chạy E2E: `pnpm --filter @board-games/web exec playwright install chromium`

## Lệnh thường dùng

| Lệnh                                                            | Việc làm                                             |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| `pnpm install`                                                  | Cài thư viện cho toàn bộ monorepo, cài git hooks     |
| `pnpm dev`                                                      | Chạy app ở http://localhost:3000 kèm server realtime |
| `pnpm --filter @board-games/web realtime`                       | Chỉ chạy server realtime (ws://localhost:3001)       |
| `pnpm check`                                                    | Chạy lint, typecheck, test, build (giống CI)         |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build`     | Chạy từng bước riêng                                 |
| `pnpm test:coverage`                                            | Test kèm báo cáo coverage (`<package>/coverage/`)    |
| `pnpm test:e2e`                                                 | Build rồi chạy Playwright (desktop + điện thoại)     |
| `pnpm ui:shots`                                                 | Build rồi chụp các màn hình chính để duyệt giao diện |
| `pnpm knip`                                                     | Tìm file, export, thư viện không dùng                |
| `pnpm spec:check`                                               | Kiểm tra OpenSpec, chặn change xong mà chưa archive  |
| `pnpm format`                                                   | Định dạng code bằng Prettier                         |
| `pnpm --filter @board-games/ui test`                            | Chạy lệnh cho một package                            |
| `REDIS_URL_TEST=rediss://… pnpm --filter @board-games/web test` | Chạy cả test kho phòng trên Redis thật (Upstash)     |

## Chơi online ở máy

1. `pnpm dev` (chạy cả app ở cổng 3000 lẫn server realtime ở cổng 3001; không có `REDIS_URL` thì phòng nằm trong bộ nhớ, mất khi tắt server).
2. Mở http://localhost:3000/play/tictactoe, chọn **Online**, nhập tên, bấm **Tạo phòng**.
3. Sao chép link mời và mở trong cửa sổ ẩn danh hoặc trình duyệt khác (mỗi trình duyệt nhớ một danh tính; hai tab chưa có tên là hai người khác nhau cho tới khi một tab đặt tên, và tab nào đã ngồi ghế trong một phòng thì giữ đúng ghế đó, kể cả khi tải lại), nhập tên rồi bấm **Vào chơi**.

Điện thoại trong cùng mạng LAN mở được `http://<IP máy>:3000`, nhưng app tìm server realtime ở `ws://localhost:3001` khi chạy `next dev`; khi đó đặt `REALTIME_URL=ws://<IP máy>:3001/api/realtime` cho `next dev`. Ngoài `next dev`, không đặt `REALTIME_URL` thì app dùng cùng origin (`/api/realtime`, như trên Vercel).

## Cấu trúc

```
apps/web            Next.js: giao diện, route, server WebSocket
packages/engine     Hợp đồng game, session, AI — không phụ thuộc framework
packages/games      Luật từng game
packages/protocol   Thông điệp online
packages/ui         Design token, component, icon dùng chung
packages/config     tsconfig, ESLint, Vitest dùng chung
```

- Phụ thuộc giữa các package chỉ đi một chiều (plan.md §3.1), ESLint báo lỗi nếu import sai chiều.
- Phiên bản thư viện khai báo một lần trong `pnpm-workspace.yaml` (mục `catalog`); các package tham chiếu bằng `"catalog:"`.
- Quy ước constant/enum, styling, icon, test: plan.md §4.

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
