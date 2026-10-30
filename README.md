# Board Games Hub

App chơi cờ trên trình duyệt: cùng máy, với máy và online với bạn bè qua link mời.

- Ý tưởng và các quyết định sản phẩm: [idea.md](idea.md)
- Kế hoạch phát triển, kiến trúc, quy ước code: [plan.md](plan.md)

## Yêu cầu

- Node.js 24 (xem `.nvmrc`)
- pnpm 12 (`corepack enable` sẽ tự dùng đúng phiên bản ghi trong `package.json`)
- Lần đầu chạy E2E: `pnpm --filter @board-games/web exec playwright install chromium`

## Lệnh thường dùng

| Lệnh                                                        | Việc làm                                          |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `pnpm install`                                              | Cài thư viện cho toàn bộ monorepo, cài git hooks  |
| `pnpm dev`                                                  | Chạy app ở http://localhost:3000                  |
| `pnpm check`                                                | Chạy lint, typecheck, test, build (giống CI)      |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | Chạy từng bước riêng                              |
| `pnpm test:coverage`                                        | Test kèm báo cáo coverage (`<package>/coverage/`) |
| `pnpm test:e2e`                                             | Build rồi chạy Playwright (desktop + điện thoại)  |
| `pnpm knip`                                                 | Tìm file, export, thư viện không dùng             |
| `pnpm format`                                               | Định dạng code bằng Prettier                      |
| `pnpm --filter @board-games/ui test`                        | Chạy lệnh cho một package                         |

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

## Commit

Commit message theo [Conventional Commits](https://www.conventionalcommits.org/): `feat(caro): add win detection`, `fix(ui): button focus ring`. Hook `commit-msg` sẽ từ chối message sai định dạng; hook `pre-commit` tự chạy Prettier và ESLint trên file thay đổi.
