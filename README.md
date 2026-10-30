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

| Lệnh                                                        | Việc làm                                            |
| ----------------------------------------------------------- | --------------------------------------------------- |
| `pnpm install`                                              | Cài thư viện cho toàn bộ monorepo, cài git hooks    |
| `pnpm dev`                                                  | Chạy app ở http://localhost:3000                    |
| `pnpm check`                                                | Chạy lint, typecheck, test, build (giống CI)        |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | Chạy từng bước riêng                                |
| `pnpm test:coverage`                                        | Test kèm báo cáo coverage (`<package>/coverage/`)   |
| `pnpm test:e2e`                                             | Build rồi chạy Playwright (desktop + điện thoại)    |
| `pnpm knip`                                                 | Tìm file, export, thư viện không dùng               |
| `pnpm spec:check`                                           | Kiểm tra OpenSpec, chặn change xong mà chưa archive |
| `pnpm format`                                               | Định dạng code bằng Prettier                        |
| `pnpm --filter @board-games/ui test`                        | Chạy lệnh cho một package                           |

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
