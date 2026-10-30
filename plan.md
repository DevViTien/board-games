# Kế hoạch phát triển: Board Games Hub

> Lập ngày 30/10/2026 · Ý tưởng và các quyết định sản phẩm: xem [idea.md](idea.md)

Tài liệu này chốt **cách xây dựng** app: phiên bản công nghệ, cách chia module, quy ước code, các mốc phát triển kèm tiêu chí hoàn thành, cách test và deploy. Mục tiêu là codebase hiện đại, chia module rõ ràng, phần dùng chung được gom lại một chỗ để dễ bảo trì và thêm game mới về sau.

## 1. Phạm vi

Kế hoạch chi tiết cho **MVP**: 3 game Cờ caro, Cờ cá ngựa, Cờ vua, kèm khung app và online qua link mời. Phần v1, v2 chỉ ghi ở mức danh sách (mục 6.3), sẽ chi tiết hoá khi xong MVP.

Nhắc lại các ràng buộc đã chốt:
- Dự án cá nhân, phi thương mại, nhóm nhỏ bạn bè/đồng nghiệp → chạy trên gói miễn phí (Vercel Hobby, Upstash).
- Không tài khoản: tên tạm + mã người chơi lưu trong `localStorage`.
- Cờ vua chưa có chế độ đấu với máy.
- Cờ cá ngựa dùng luật phổ biến (idea.md mục 3.4), nhưng viết luật sao cho các biến thể bật/tắt được về sau.

## 2. Phiên bản công nghệ

Tra trên npm ngày 30/10/2026. Phiên bản khai báo **một lần** trong mục `catalog` của `pnpm-workspace.yaml`, các package tham chiếu bằng `"catalog:"`; nâng cấp sau qua Renovate/Dependabot.

| Nhóm | Công nghệ | Phiên bản | Ghi chú |
|---|---|---|---|
| Runtime | Node.js | 24 (LTS) | Ghi trong `.nvmrc` và `engines` |
| Quản lý gói | pnpm | 12.8 | Dùng workspace; ghi trong `packageManager` |
| Monorepo | Turborepo | 2.11 | Chạy build/lint/test theo cây phụ thuộc, có cache |
| Framework | Next.js (App Router) | 16.4 | |
| UI | React | 19.3 | |
| Ngôn ngữ | TypeScript | **6.0.3** | Không dùng 7.0 vì typescript-eslint 8.72 chỉ hỗ trợ TypeScript dưới 6.1 |
| Style | Tailwind CSS | 4.3 | Token khai báo bằng `@theme` (CSS variables) → thêm theme chỉ cần ghi đè biến |
| Ghép class / biến thể | clsx + tailwind-merge (`cn`), class-variance-authority (`cva`) | 2.1 / 3.7 / 0.7 | `className` truyền vào ghi đè được class mặc định; biến thể component khai báo một chỗ |
| Icon | lucide-react | 1.64 | Chỉ import qua `@board-games/ui` (ESLint chặn import trực tiếp) |
| Font | Be Vietnam Pro + Noto Sans JP qua `next/font` | — | Đủ dấu tiếng Việt và chữ Nhật, tự host; font Nhật không tải trước, trình duyệt chỉ tải phần chữ cần dùng |
| Đa ngôn ngữ | next-intl | 4.14 | vi (mặc định), en, ja; kiểm tra key bản dịch lúc biên dịch |
| State phía client | Zustand | 5.0 | Chỉ cho state giao diện; luật game là hàm thuần |
| Lưu trữ trình duyệt | idb-keyval | 6.3 | IndexedDB cho ván đang chơi, thống kê |
| Sinh mã phòng/ID | nanoid | 6.0 | |
| Kiểm tra dữ liệu | zod | 4.x (xác nhận khi cài) | Kiểm tra thông điệp online ở cả hai phía |
| Online | WebSocket trên Vercel Functions | `@vercel/functions` 3.10, `ws` 8.22 | API `experimental_upgradeWebSocket` **cần kiểm chứng ở mốc M3** |
| Dữ liệu online | Upstash Redis | `@upstash/redis` 1.40 | Phòng, lịch sử nước đi, pub/sub |
| Lint | ESLint + typescript-eslint + eslint-config-next | **9.39** / 8.72 / 16.4 | Flat config. Không dùng ESLint 10 vì các plugin của eslint-config-next (react, import, jsx-a11y) chưa hỗ trợ |
| Sắp xếp import | eslint-plugin-simple-import-sort | 14.0 | Tự sửa khi lưu file / commit |
| Format | Prettier + prettier-plugin-tailwindcss | 3.9 / 0.8 | Tự sắp xếp class Tailwind, cả trong `cn()` và `cva()` |
| Test đơn vị, component | Vitest + Testing Library + jsdom | 5.0 / 16.3 / 30.1 | API giống Jest (`describe`, `it`, `expect`, `vi.fn()`); coverage bằng `@vitest/coverage-v8` |
| Test E2E | Playwright | 1.64 | Chạy trên bản build production, 2 cấu hình máy: desktop + điện thoại |
| Git hooks | husky + lint-staged + commitlint | 9.1 / 17.6 / 21.2 | Trước commit: Prettier + ESLint trên file thay đổi; commit message theo Conventional Commits |
| Phát hiện code thừa | knip | 6.43 | File, export, thư viện không dùng; chạy trong CI |
| Cập nhật thư viện | Renovate | — | PR gom hằng tuần; đã chặn TypeScript ≥ 6.1 và ESLint ≥ 10 |
| Phát triển theo spec | OpenSpec (`@fission-ai/openspec`) | 1.15 | Lệnh `/opsx:*` trong Claude Code; quy trình ở CLAUDE.md, cấu hình ở `openspec/config.yaml` |

pnpm 12 chỉ cài bản đã phát hành ít nhất khoảng 1 ngày (chống tấn công chuỗi cung ứng) và chặn script cài đặt trừ khi khai báo trong `allowBuilds`. Không thêm ngoại lệ cho các chính sách này; nếu bản mới nhất quá mới thì dùng bản trước đó.

## 3. Kiến trúc module

### 3.1 Các package và chiều phụ thuộc

```
                      ┌──────────────────┐
                      │  apps/web        │  Next.js: giao diện, route, server WebSocket
                      └───┬───┬───┬───┬──┘
          ┌───────────────┘   │   │   └──────────────┐
          ▼                   ▼   ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ packages/ui  │  │packages/games│  │packages/     │  │packages/     │
  │ token + UI   │  │ luật từng    │  │ protocol     │  │ config       │
  │ dùng chung   │  │ game         │  │ thông điệp   │  │ tsconfig,    │
  └──────────────┘  └──────┬───────┘  │ online       │  │ eslint dùng  │
                           │          └──────┬───────┘  │ chung        │
                           ▼                 ▼          └──────────────┘
                      ┌──────────────────────────┐
                      │     packages/engine      │  hợp đồng game, session, AI, RNG
                      └──────────────────────────┘
```

| Package | Trách nhiệm | Được phụ thuộc vào |
|---|---|---|
| `packages/engine` | Kiểu `GameDefinition`, session (lịch sử nước đi, undo/redo, replay), bộ sinh số ngẫu nhiên có seed, thuật toán AI chung (minimax/alpha-beta, expectimax) | Không phụ thuộc package nào, không React, không DOM |
| `packages/games` | Luật của từng game, mỗi game một thư mục; danh sách game (registry) phía luật | `engine` |
| `packages/protocol` | Kiểu và schema zod của thông điệp online, mô hình phòng (ghế, trạng thái) | `engine` |
| `packages/ui` | Design token, component nền (Button, Card, Dialog, Toast, Badge…), không biết gì về game | React |
| `packages/config` | `tsconfig` gốc, cấu hình ESLint, Prettier dùng chung | — |
| `apps/web` | Ghép mọi thứ: trang, bàn cờ của từng game, transport, Web Worker AI, server phòng online | Tất cả ở trên |

**Quy tắc bắt buộc**:
- Phụ thuộc chỉ đi **từ trên xuống** theo sơ đồ. `engine` và `games` phải chạy được ở cả trình duyệt, Node và Web Worker, nên cấm import React, DOM, Next.
- Mỗi package chỉ lộ ra ngoài qua trường `exports` trong `package.json`. Cấm import sâu vào file nội bộ của package khác.
- Các quy tắc này được ESLint kiểm tra (`no-restricted-imports` theo từng package), không chỉ dựa vào ý thức.

### 3.2 Cấu trúc thư mục

```
board-games/
├─ apps/
│  └─ web/
│     ├─ src/
│     │  ├─ app/                    # chỉ chứa route, mỏng, gọi xuống features
│     │  │  ├─ page.tsx             # menu
│     │  │  ├─ play/[gameId]/       # chơi cùng máy / với máy
│     │  │  ├─ room/[roomId]/       # phòng online
│     │  │  └─ api/
│     │  │     ├─ rooms/route.ts    # tạo phòng, lấy thông tin phòng
│     │  │     └─ ws/route.ts       # điểm nối WebSocket
│     │  ├─ features/               # mỗi tính năng một thư mục, tự chứa
│     │  │  ├─ menu/
│     │  │  ├─ play/                # màn hình ván, thanh điều khiển, hộp thoại kết thúc
│     │  │  ├─ room/                # sảnh chờ, ghế, trạng thái kết nối
│     │  │  ├─ identity/            # tên tạm + playerId trong localStorage
│     │  │  └─ settings/            # ngôn ngữ, sáng/tối, âm thanh
│     │  ├─ games/                  # phần giao diện của từng game
│     │  │  ├─ registry.ts          # ghép luật (packages/games) với giao diện
│     │  │  ├─ tictactoe/           # Board.tsx, rules.{vi,en,ja}.mdx, index.ts
│     │  │  ├─ caro/
│     │  │  ├─ ludo/
│     │  │  └─ chess/
│     │  ├─ config/                 # constant toàn app: site.ts, routes.ts, storage-keys.ts
│     │  ├─ i18n/                   # cấu hình ngôn ngữ, chọn ngôn ngữ, bộ nạp bản dịch
│     │  ├─ test/                   # tiện ích test dùng chung (renderWithIntl)
│     │  ├─ transport/              # Local, AI, Online: cùng một interface
│     │  ├─ ai-worker/              # Web Worker chạy AI của engine
│     │  ├─ server/                 # chỉ chạy phía server
│     │  │  ├─ room-service.ts      # xử lý join/move/resign, không biết Redis hay WebSocket
│     │  │  ├─ store/               # RoomStore: redis.ts, memory.ts (dev + test)
│     │  │  └─ realtime/            # WebSocket + pub/sub
│     │  └─ lib/                    # tiện ích nhỏ chỉ dùng trong web
│     ├─ messages/                  # vi.json (gốc), en.json, ja.json
│     └─ e2e/                       # Playwright
├─ packages/
│  ├─ engine/src/   { types.ts, session.ts, rng.ts, ai/, index.ts }
│  ├─ games/src/    { tictactoe/, caro/, ludo/, chess/, index.ts }
│  ├─ protocol/src/ { messages.ts, room.ts, index.ts }
│  ├─ ui/src/       { styles.css, components/, icons.ts, lib/cn.ts, index.ts }
│  └─ config/       { tsconfig/, eslint/, vitest/ }
├─ .github/workflows/ci.yml
├─ turbo.json, pnpm-workspace.yaml, package.json
├─ idea.md, plan.md, README.md
```

### 3.3 Các điểm "common hoá" chính

Đây là những chỗ viết một lần, mọi game dùng lại. Thêm game mới mà phải sửa các chỗ này là dấu hiệu thiết kế sai.

| Phần dùng chung | Ở đâu | Game chỉ cần cung cấp |
|---|---|---|
| Hợp đồng luật (`GameDefinition`) | `engine` | `setup`, `legalMoves`, `applyMove`, `result`, (`evaluate`) |
| Lịch sử, undo/redo, replay, autosave | `engine` + `features/play` | Không gì cả |
| AI (minimax, expectimax) + Web Worker | `engine/ai` + `ai-worker` | Hàm `evaluate` (nếu muốn có AI) |
| Ngẫu nhiên (xúc xắc) | `engine/rng` | Khai báo `random: true`, gọi RNG được truyền vào |
| Chơi online, kết nối lại, server trọng tài | `transport` + `server` + `protocol` | Không gì cả |
| Menu, bộ lọc, màn hình chọn chế độ | `features/menu` | `meta` (tên, số người, thời lượng, `supportsAI`) |
| Khung màn hình ván (lượt, đồng hồ, nút) | `features/play` | Component `Board` |
| Giao diện nền, token, theme | `packages/ui` | Không gì cả |

### 3.4 Các interface cốt lõi (phác thảo)

```ts
// packages/engine
interface GameDefinition<S, M, O = void> {
  id: GameId;
  meta: GameMeta;                                  // tên, số người, thể loại, supportsAI...
  setup(ctx: SetupContext<O>): S;                  // ctx có số người, tuỳ chọn luật, rng
  currentPlayer(state: S): PlayerIndex;
  legalMoves(state: S): readonly M[];
  applyMove(state: S, move: M, ctx: MoveContext): S;  // ctx có rng cho game ngẫu nhiên
  result(state: S): GameResult | null;
  evaluate?(state: S, player: PlayerIndex): number;
  serializeMove?(move: M): string;                 // mặc định JSON
}

// apps/web/src/transport
interface Transport<M> {
  submit(move: M): void;
  onEvent(listener: (event: SessionEvent<M>) => void): Unsubscribe;
  dispose(): void;
}

// apps/web/src/server/store
interface RoomStore {
  create(room: Room): Promise<void>;
  get(id: RoomId): Promise<Room | null>;
  appendMove(id: RoomId, expectedVersion: number, move: StoredMove): Promise<boolean>; // chống ghi đè đồng thời
  publish(id: RoomId, event: RoomEvent): Promise<void>;
  subscribe(id: RoomId, listener: (e: RoomEvent) => void): Promise<Unsubscribe>;
}
```

Nhờ `RoomStore` là interface, toàn bộ logic phòng (`room-service.ts`) test được bằng `memory.ts` mà không cần Redis hay mạng. Nếu phải bỏ WebSocket của Vercel (xem M3), chỉ thay phần `realtime/` và `OnlineTransport`.

## 4. Quy ước code

### 4.1 Chung
- **TypeScript strict** toàn bộ, bật thêm `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`. Không dùng `any`; dữ liệu từ ngoài (mạng, `localStorage`) luôn qua zod.
- **Luật game là hàm thuần**: không mutate state, không đọc `Math.random`/`Date.now` trực tiếp. Ngẫu nhiên đi qua `rng` được truyền vào để server và replay tái tạo được.
- **Đặt tên**: file `kebab-case.ts`, component `PascalCase.tsx`, hằng số `UPPER_SNAKE_CASE`, mã game `kebab-case` (`caro`, `ludo`, `chess`).
- **Export có tên**, không `export default`, trừ các file Next.js bắt buộc (`page.tsx`, `layout.tsx`, `icon`, …) và file `*.config.*`.
- **Import** đi qua điểm vào của package (`@board-games/ui`), trong app dùng alias `@/` thay cho `../../`. Thứ tự import do ESLint tự sắp.
- **Server Component mặc định**; chỉ thêm `"use client"` ở component cần tương tác (bàn cờ, điều khiển).
- **Commit** theo Conventional Commits (`feat(caro): …`, `fix(engine): …`), mỗi PR một việc.
- **Ngôn ngữ**: code, tên biến, commit bằng tiếng Anh; mọi chữ hiển thị cho người chơi nằm trong file bản dịch (xem 4.7), không viết cứng trong component.

### 4.2 Constant, enum, kiểu dữ liệu
- **Không dùng `enum`** (TypeScript báo lỗi nhờ `erasableSyntaxOnly`). Dùng object `as const` và suy ra kiểu union:
  ```ts
  export const GAME_CATEGORY = { VnFolk: "vn-folk", Classic: "classic", Original: "original" } as const;
  export type GameCategory = (typeof GAME_CATEGORY)[keyof typeof GAME_CATEGORY];
  ```
  Lý do: không sinh code thừa khi biên dịch, giá trị là chuỗi đọc được trong log/JSON gửi qua mạng, chạy được với công cụ chỉ xoá kiểu (Node, SWC).
- **Constant đặt ở tầng sở hữu nó**:

  | Loại | Ở đâu | Ví dụ |
  |---|---|---|
  | Khái niệm chung của mọi game | `packages/engine/src/constants.ts` | `GAME_CATEGORY`, giới hạn số người |
  | Riêng một game | `packages/games/src/<id>/constants.ts` | kích thước bàn caro, số bậc chuồng cá ngựa |
  | Giao thức online | `packages/protocol/src/` | tên thông điệp, mã lỗi |
  | Cấu hình toàn app | `apps/web/src/config/` | `site.ts` (tên, mô tả), `routes.ts`, `storage-keys.ts` |
  | Riêng một tính năng | ngay trong `features/<tên>/` | danh sách lựa chọn của màn hình chọn chế độ |
- **Không có file `constants.ts` dùng chung cho cả app** gom mọi thứ: nó luôn phình to và kéo phụ thuộc chéo. Chỉ tạo constant khi có chỗ dùng (knip báo export thừa).

### 4.3 Styling
- Chỉ dùng **class tiện ích của Tailwind + token** (`bg-surface`, `text-fg-muted`, `rounded-card`…); không viết màu cứng (`#fff`, `bg-blue-500`) trong component. Màu mới = thêm token trong `packages/ui/src/styles.css`.
- Ghép class bằng **`cn()`**; component có nhiều biến thể khai báo bằng **`cva()`** (xem `Button`).
- Component nhận `className` để nơi dùng chỉnh bố cục; `cn` đảm bảo class truyền vào thắng class mặc định.
- Không viết CSS riêng, trừ trường hợp Tailwind không làm được (ví dụ hiệu ứng bàn cờ phức tạp); khi đó dùng CSS Module đặt cạnh component.

### 4.4 Icon và hình ảnh
- Icon giao diện lấy từ **lucide-react**, nhưng chỉ import qua **`@board-games/ui`** (`packages/ui/src/icons.ts`), đặt tên có hậu tố `Icon` (`UsersIcon`, `ClockIcon`). Cần icon mới thì thêm một dòng re-export ở đó.
- Icon trang trí luôn có `aria-hidden`; nút chỉ có icon phải có `aria-label`.
- Hình quân cờ, bàn cờ là SVG tự vẽ, đặt trong thư mục của game (`apps/web/src/games/<id>/`), không lẫn vào bộ icon chung.

### 4.5 Test
- **Test đặt cạnh code**: `rules.ts` ↔ `rules.test.ts`, `Button.tsx` ↔ `Button.test.tsx`.
- Cấu hình Vitest dùng chung từ `@board-games/config/vitest`; package có React dùng `environment: "jsdom"` + `vitest.setup.ts` (matcher của jest-dom và dọn DOM sau mỗi test).
- Test component theo cách người dùng thao tác: tìm phần tử bằng `getByRole`/`getByText`, bấm bằng `userEvent`; không test chi tiết bên trong component.
- E2E (Playwright) đặt trong `apps/web/e2e/`, chạy trên bản build production.

### 4.6 Công cụ tự kiểm tra

| Khi nào | Công cụ | Kiểm tra gì |
|---|---|---|
| Lưu file (VS Code) | Prettier, ESLint | Định dạng, sắp xếp import và class Tailwind |
| `git commit` | husky → lint-staged, commitlint | Prettier + ESLint trên file thay đổi; commit message đúng chuẩn |
| Mỗi PR, push `main` | GitHub Actions | `format:check`, `knip`, lint, typecheck, test, build; job E2E riêng |
| Hằng tuần | Renovate | PR cập nhật thư viện |
| `pnpm test` | `messages.test.ts` | Bản dịch en/ja đủ key và đúng tham số so với tiếng Việt |

### 4.7 Đa ngôn ngữ (vi, en, ja)
- Thư viện **next-intl**. Bản dịch ở `apps/web/messages/{vi,en,ja}.json`, chia namespace theo tính năng (`Menu`, `Settings`, `Games`…). Mã nguồn i18n ở `apps/web/src/i18n/`.
- **Tiếng Việt là ngôn ngữ gốc**: `vi.json` quyết định cấu trúc. Thiếu key ở `en.json`/`ja.json` là lỗi TypeScript; gọi `t("key-sai")` hay truyền thiếu tham số cũng là lỗi TypeScript.
- **URL không chứa mã ngôn ngữ.** Thứ tự chọn: cookie `NEXT_LOCALE` (người chơi đã chọn) → `Accept-Language` của trình duyệt → `vi`. Lý do: link mời vào phòng mở ra bằng ngôn ngữ của người nhận. Đánh đổi: trang được render động trên server thay vì tĩnh, không ảnh hưởng với quy mô app.
- **Chỉ `apps/web` biết về ngôn ngữ.** `engine`, `games`, `protocol` không chứa chữ hiển thị; chúng trả về id/mã (`"caro"`, `"illegal-move"`) và app dịch bằng key tương ứng (`Games.caro.name`, `Errors.illegal-move`). Nhờ vậy server online và Web Worker không phải tải bản dịch.
- Số nhiều, số, ngày giờ dùng cú pháp ICU (`{count, plural, one {# player} other {# players}}`) thay vì ghép chuỗi trong code.
- Tên thương hiệu (`SITE.name`) không dịch, để trong `apps/web/src/config/site.ts`.
- Test component bọc trong `renderWithIntl(ui, { locale })` (`apps/web/src/test/render-with-intl.tsx`).
- Thêm một ngôn ngữ: thêm mã vào `LOCALES` và `LOCALE_LABELS` (`src/i18n/config.ts`), tạo `messages/<mã>.json`, thêm vào `MESSAGE_LOADERS`; TypeScript và `messages.test.ts` sẽ chỉ ra chỗ còn thiếu.

### Quy trình thêm một game mới (checklist)
1. `packages/games/src/<id>/`: `rules.ts` cài `GameDefinition`, `rules.test.ts`, (tuỳ chọn) `options.ts` cho biến thể luật.
2. Chạy bộ test chung `describeGameContract(<id>)` (mục 7) → phải xanh.
3. `apps/web/src/games/<id>/`: `Board.tsx`, `rules.{vi,en,ja}.mdx`, `index.ts`.
4. Thêm tên và nội dung của game vào `apps/web/messages/{vi,en,ja}.json` (`Games.<id>…`).
5. Thêm một dòng vào `apps/web/src/games/registry.ts`.
6. Game tự xuất hiện trong menu, chơi được cùng máy, online, và với máy nếu có `evaluate`.

## 5. Môi trường và hạ tầng

| Việc | Cách làm |
|---|---|
| Mã nguồn | Git, repo trên GitHub (có thể để công khai) |
| CI | GitHub Actions: `pnpm install` → `turbo lint typecheck test build` cho mọi PR |
| Deploy | Vercel nối với GitHub: nhánh `main` lên production, mỗi PR có link preview để gửi bạn thử |
| Biến môi trường | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `QSTASH_TOKEN` (từ v1); khai báo và kiểm tra bằng zod trong `apps/web/src/server/env.ts` |
| Chạy local | `pnpm dev`; khi không có biến Redis thì tự dùng `RoomStore` bộ nhớ để chơi online giữa 2 tab ngay trên máy |
| Cập nhật thư viện | Renovate hoặc Dependabot, gom theo tuần |

## 6. Các mốc phát triển

Kích thước ước lượng: **S** ≈ 1–2 buổi, **M** ≈ 3–5 buổi, **L** ≈ 1–2 tuần (làm ngoài giờ).

Từ M1, mỗi mốc được làm qua một hoặc nhiều **OpenSpec change** (`/opsx:propose` → `/opsx:apply` → `/opsx:archive`, xem CLAUDE.md). Bảng dưới là lộ trình; chi tiết requirement, thiết kế và task của từng việc nằm trong `openspec/changes/<tên>/`, và hành vi đã xong nằm trong `openspec/specs/`. Mốc chỉ coi là xong khi mọi change của nó đã archive.

### 6.1 Giai đoạn 0: Khung

| Mốc | Nội dung | Xong khi | Cỡ |
|---|---|---|---|
| **M0. Khởi tạo repo** | Git + GitHub; pnpm workspace + Turborepo; `packages/config`; Next.js khung trong `apps/web`; Tailwind + token sáng/tối trong `packages/ui`; ESLint (kèm quy tắc chiều phụ thuộc), Prettier, Vitest; CI; nối Vercel | `pnpm lint typecheck test build` xanh ở local và CI; trang "Hello" chạy trên domain Vercel | S |
| **M1. Engine + game mẫu cùng máy** | `engine`: types, session (undo/redo), rng; `games/tictactoe`; bộ test hợp đồng chung; `features/menu` tự sinh từ registry; `features/play` + `LocalTransport`; autosave vào IndexedDB | Chơi Tic-tac-toe cùng máy từ menu; undo/redo đúng; F5 vẫn giữ ván | M |
| **M2. AI** | `engine/ai` (minimax + alpha-beta, giới hạn thời gian, 3 mức khó); `ai-worker`; `AITransport` | Đấu với máy Tic-tac-toe, máy mức Khó không thua; giao diện không bị đứng khi máy nghĩ | S |
| **M3. Thử nghiệm online trên Vercel** *(cổng quyết định)* | Dựng route WebSocket tối giản trên Vercel Hobby, đo: thời gian giữ kết nối, độ trễ từ Việt Nam, 2 client trên 2 instance có nhận được tin qua Redis pub/sub không, chạy local được không | Có bảng số đo và **quyết định**: giữ WebSocket của Vercel, hay chuyển sang phương án dự phòng (Ably/Pusher gói miễn phí, hoặc server Node riêng). Ghi kết quả vào plan.md | S |
| **M4. Phòng online** | `protocol` (thông điệp + zod); `features/identity`; `room-service` + `RoomStore` (memory, redis); `realtime/`; `OnlineTransport` có tự kết nối lại; trang tạo phòng, link mời, mã phòng; TTL 7 ngày | 2 trình duyệt chơi Tic-tac-toe qua link; tắt mạng một bên rồi bật lại vẫn tiếp tục đúng lượt; gửi nước đi sai luật bị server từ chối; test E2E bằng Playwright xanh | L |

### 6.2 Giai đoạn 1: MVP

| Mốc | Nội dung | Xong khi | Cỡ |
|---|---|---|---|
| **M5. Cờ caro** | Luật (5 quân liên tiếp, bàn 15×15 / 19×19); hàm `evaluate` theo mẫu chuỗi quân; bàn SVG (Canvas nếu bàn lớn bị chậm), đánh dấu nước vừa đi và hàng thắng | Chơi được cả 3 chế độ; AI mức Vừa chặn được chuỗi 4 | M |
| **M6. Cờ cá ngựa** | Luật theo cột "phổ biến" (idea.md 3.4) nhưng mỗi điểm là một tuỳ chọn trong `LudoOptions`; xúc xắc qua `rng` (online thì server tung); 2–4 người; AI luật ưu tiên; ghế trống cho AI chơi thay; hiệu ứng gieo xúc xắc và đi quân | Chơi được cả 3 chế độ với 2, 3, 4 người; mỗi điểm luật có test riêng; 1000 ván ngẫu nhiên tự chơi đều kết thúc | L |
| **M7. Cờ vua** | Luật đầy đủ (nhập thành, bắt tốt qua đường, phong cấp, chiếu bí, hết nước đi, hoà lặp 3 lần, luật 50 nước), `meta.supportsAI = false`; chọn quân phong cấp; lật bàn theo bên mình | Chơi được cùng máy và online; vượt bộ test thế cờ chuẩn (đếm số nước đi hợp lệ "perft" ở các thế cờ mẫu) | L |
| **M8. Hoàn thiện MVP** | Trang luật chơi từng game; responsive điện thoại; sáng/tối; điều khiển bằng bàn phím; ký hiệu phân biệt quân ngoài màu; xử lý bỏ ván; README hướng dẫn chạy | Bạn bè dùng thử trên điện thoại và laptop không cần hướng dẫn thêm; Lighthouse Accessibility ≥ 90 | M |

Về cờ vua ở M7: quyết định **tự viết luật hay bọc `chess.js`** (giấy phép BSD) ngay đầu mốc. Đề xuất bọc `chess.js` cho nhanh, miễn là chạy được ở server và trong `GameDefinition`.

### 6.3 Sau MVP (sẽ chi tiết hoá sau)
- **v1**: chủ phòng chọn biến thể luật cá ngựa; Cờ tướng, Ô ăn quan, Reversi, Cờ gánh, Cờ đam, Cờ cối xay, Ô vuông; đồng hồ (QStash), đề nghị hoà, QR, chat nhanh; PWA, thống kê, replay.
- **v2**: phòng cố định của nhóm, bảng thành tích nhóm, spectator; theme (gỗ, tre, giấy dó); Cờ vây; game tự thiết kế.
- **Sau đó**: AI cờ vua, puzzle, tutorial, giải đấu trong nhóm.

## 7. Chiến lược test

| Tầng | Công cụ | Nội dung |
|---|---|---|
| Hợp đồng game | Vitest, hàm dùng chung `describeGameContract(game)` | Áp cho **mọi** game: tự chơi hàng trăm ván ngẫu nhiên (seed cố định) và kiểm tra mọi ván đều kết thúc, `applyMove` không làm đổi state cũ, nước đi trong `legalMoves` luôn áp dụng được, serialize rồi đọc lại cho kết quả như cũ |
| Luật riêng | Vitest | Kịch bản cụ thể từng luật: thắng caro theo hàng chéo, ra quân khi gieo 6, nhập thành, perft cờ vua… |
| AI | Vitest | Thế cờ "thắng trong 1 nước" thì AI phải đi đúng; không vượt giới hạn thời gian |
| Logic phòng online | Vitest + `RoomStore` bộ nhớ | Vào phòng, đủ người, đi sai lượt, đi sai luật, hai nước đi tới cùng lúc, kết nối lại, đầu hàng |
| Giao diện | Vitest + Testing Library (chọn lọc) | Component dùng chung trong `packages/ui`, các khung ở `features/play` |
| End-to-end | Playwright | Menu → chơi cùng máy; 2 trình duyệt chơi online qua link; ngắt mạng rồi nối lại |

Tiêu chí: `engine`, `games`, `protocol`, `room-service` có độ phủ test ≥ 90%; phần giao diện không đặt chỉ tiêu cứng.

## 8. Tiêu chí hoàn thành chung (Definition of Done)

Mọi mốc chỉ coi là xong khi:
- CI xanh: lint, typecheck, test, build.
- Có test cho phần luật/logic mới.
- Bản preview trên Vercel chạy được, đã thử trên một điện thoại thật.
- Không vi phạm quy tắc chiều phụ thuộc giữa các package.
- Cập nhật README/plan.md nếu thay đổi cách chạy hoặc quyết định kỹ thuật.

## 9. Rủi ro của kế hoạch

| Rủi ro | Ảnh hưởng | Cách xử lý |
|---|---|---|
| WebSocket của Vercel không ổn trên gói Hobby (giới hạn thời gian, chạy local khó, API `experimental_` đổi) | Chậm mốc M4 | Đặt thử nghiệm M3 **trước** khi làm phòng online; kiến trúc `Transport` + `RoomStore` cho phép đổi hạ tầng mà không sửa game |
| TypeScript 7 / công cụ mới chưa tương thích nhau | Lỗi build, lint | Ghim TypeScript 6.0; nâng cấp có chủ đích qua Renovate |
| Luật cờ vua nhiều trường hợp hiếm | Bug khó thấy | Test perft với thế cờ chuẩn; cân nhắc bọc `chess.js` |
| Luật cá ngựa phức tạp, dễ sai khi kết hợp nhiều biến thể | Bug, tranh cãi khi chơi | Mỗi điểm luật một test; tự chơi 1000 ván ngẫu nhiên; MVP chỉ bật bộ luật phổ biến |
| Làm ngoài giờ, dễ dàn trải | Không bao giờ ra bản đầu | Bám thứ tự mốc; mỗi mốc có kết quả chơi được; gửi bạn thử từ sau M4 |

## 10. Tiến độ

### M0. Khởi tạo repo (30/10/2026)

Đã xong:
- pnpm workspace + Turborepo, catalog phiên bản trong `pnpm-workspace.yaml`.
- `packages/config`: tsconfig (`base`, `library`, `react-library`, `nextjs`), ESLint (`createConfig(layer, dir)`), Vitest (`createVitestConfig`) dùng chung; Prettier ở `prettier.config.js` gốc.
- Quy tắc chiều phụ thuộc chạy được: thử import React vào `engine`, import `games` từ `engine`, import file nội bộ `@board-games/*/src`, `export default` đều bị ESLint báo lỗi.
- `packages/engine`, `games`, `protocol`: khung rỗng, sẵn lint/typecheck/test.
- `packages/ui`: token sáng/tối, `Button` (cva), `Card`, `Badge`, `Select`, `cn`, bộ icon.
- `apps/web`: Next.js 16 + Tailwind 4, trang menu tạm với 3 game "Sắp có", đa ngôn ngữ vi/en/ja (next-intl).
- Tooling: git hooks (husky, lint-staged, commitlint), knip, Renovate, Playwright, coverage.
- OpenSpec 1.15: lệnh `/opsx:*`, `openspec/config.yaml`, `CLAUDE.md`, spec nền `localization`, `pnpm spec:check` trong CI.
- `pnpm check` xanh ở máy local; commit `feat: create codebase`.

Còn lại:
- Push lên GitHub, xem CI chạy xanh.
- Nối repo với Vercel (Root Directory: `apps/web`), kiểm tra trang chạy trên domain Vercel.

### Tiếp theo
**M1. Engine + game mẫu cùng máy**, bắt đầu bằng `/opsx:propose` (gợi ý tách 2 change: `add-game-engine` cho hợp đồng game + session + autosave, `add-tictactoe-game` cho game mẫu + menu từ registry).
