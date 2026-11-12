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

| Nhóm                   | Công nghệ                                                                      | Phiên bản                             | Ghi chú                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime                | Node.js                                                                        | 24 (LTS)                              | Ghi trong `.nvmrc` và `engines`                                                                                                                                                                                                                                                                                                                                                   |
| Quản lý gói            | pnpm                                                                           | 12.8                                  | Dùng workspace; ghi trong `packageManager`                                                                                                                                                                                                                                                                                                                                        |
| Monorepo               | Turborepo                                                                      | 2.11                                  | Chạy build/lint/test theo cây phụ thuộc, có cache                                                                                                                                                                                                                                                                                                                                 |
| Framework              | Next.js (App Router)                                                           | 16.4                                  |                                                                                                                                                                                                                                                                                                                                                                                   |
| UI                     | React                                                                          | 19.3                                  |                                                                                                                                                                                                                                                                                                                                                                                   |
| Ngôn ngữ               | TypeScript                                                                     | **6.0.3**                             | Không dùng 7.0 vì typescript-eslint 8.72 chỉ hỗ trợ TypeScript dưới 6.1                                                                                                                                                                                                                                                                                                           |
| Style                  | Tailwind CSS                                                                   | 4.3                                   | Token khai báo bằng `@theme` (CSS variables) → thêm theme chỉ cần ghi đè biến                                                                                                                                                                                                                                                                                                     |
| Ghép class / biến thể  | clsx + tailwind-merge (`cn`), class-variance-authority (`cva`)                 | 2.1 / 3.7 / 0.7                       | `className` truyền vào ghi đè được class mặc định; biến thể component khai báo một chỗ                                                                                                                                                                                                                                                                                            |
| Icon                   | lucide-react                                                                   | 1.64                                  | Chỉ import qua `@board-games/ui` (ESLint chặn import trực tiếp)                                                                                                                                                                                                                                                                                                                   |
| Font                   | Be Vietnam Pro + Noto Sans JP qua `next/font`                                  | —                                     | Đủ dấu tiếng Việt và chữ Nhật, tự host; font Nhật không tải trước, trình duyệt chỉ tải phần chữ cần dùng                                                                                                                                                                                                                                                                          |
| Đa ngôn ngữ            | next-intl                                                                      | 4.14                                  | vi (mặc định), en, ja; kiểm tra key bản dịch lúc biên dịch                                                                                                                                                                                                                                                                                                                        |
| State phía client      | React (`useSyncExternalStore` + state cục bộ)                                  | —                                     | Không dùng Zustand (xem lại 03/11/2026): transport là kho duy nhất giữ ván, màn hình đọc ảnh chụp qua `useSyncExternalStore`, state giao diện còn lại là state cục bộ; luật game là hàm thuần                                                                                                                                                                                     |
| Chuyển động            | CSS transition / `@keyframes` (token trong `packages/ui`) + Web Animations API | —                                     | Thư viện `motion` hoãn: chỉ thêm khi CSS không làm được, sau review (skill `board-games-ui`)                                                                                                                                                                                                                                                                                      |
| Lưu trữ trình duyệt    | idb-keyval                                                                     | 6.3                                   | IndexedDB cho ván đang chơi, thống kê                                                                                                                                                                                                                                                                                                                                             |
| Sinh mã phòng/ID       | nanoid                                                                         | 6.0                                   |                                                                                                                                                                                                                                                                                                                                                                                   |
| Kiểm tra dữ liệu       | zod                                                                            | 4.x (xác nhận khi cài)                | Kiểm tra thông điệp online ở cả hai phía                                                                                                                                                                                                                                                                                                                                          |
| Luật Cờ vua            | chess.js                                                                       | **1.4.0** (ghim chính xác, không `^`) | BSD-2-Clause, không phụ thuộc gói nào, không có script cài đặt từ registry. Chỉ `packages/games/src/chess/chess-js.ts` import (ESLint chặn chỗ khác); adapter gọi hàm nội bộ `_moves` (nhanh hơn API công khai 25–55 lần) nên ghim phiên bản; `renovate.json` có luật riêng (PR riêng, không automerge, nhãn "xem adapter + perft"). Chi tiết: design của `add-chess-rules` §1–§2 |
| Online                 | WebSocket trên Vercel Functions                                                | `@vercel/functions` 3.10, `ws` 8.22   | `upgradeWebSocket` (đã GA); đã đo ở M3, xem §10                                                                                                                                                                                                                                                                                                                                   |
| Dữ liệu online         | Upstash Redis                                                                  | `redis` 6.3 (TCP)                     | Phòng, lịch sử nước đi, pub/sub. Pub/sub cần kết nối TCP nên dùng `redis` qua `REDIS_URL`; `@upstash/redis` (REST) không subscribe được                                                                                                                                                                                                                                           |
| Lint                   | ESLint + typescript-eslint + eslint-config-next                                | **9.39** / 8.72 / 16.4                | Flat config. Không dùng ESLint 10 vì các plugin của eslint-config-next (react, import, jsx-a11y) chưa hỗ trợ                                                                                                                                                                                                                                                                      |
| Sắp xếp import         | eslint-plugin-simple-import-sort                                               | 14.0                                  | Tự sửa khi lưu file / commit                                                                                                                                                                                                                                                                                                                                                      |
| Format                 | Prettier + prettier-plugin-tailwindcss                                         | 3.9 / 0.8                             | Tự sắp xếp class Tailwind, cả trong `cn()` và `cva()`                                                                                                                                                                                                                                                                                                                             |
| Test đơn vị, component | Vitest + Testing Library + jsdom                                               | 5.0 / 16.3 / 30.1                     | API giống Jest (`describe`, `it`, `expect`, `vi.fn()`); coverage bằng `@vitest/coverage-v8`                                                                                                                                                                                                                                                                                       |
| Test E2E               | Playwright                                                                     | 1.64                                  | Chạy trên bản build production, 2 cấu hình máy: desktop + điện thoại                                                                                                                                                                                                                                                                                                              |
| Git hooks              | husky + lint-staged + commitlint                                               | 9.1 / 17.6 / 21.2                     | Trước commit: Prettier + ESLint trên file thay đổi; commit message theo Conventional Commits                                                                                                                                                                                                                                                                                      |
| Phát hiện code thừa    | knip                                                                           | 6.43                                  | File, export, thư viện không dùng; chạy trong CI                                                                                                                                                                                                                                                                                                                                  |
| Cập nhật thư viện      | Renovate                                                                       | —                                     | PR gom hằng tuần; đã chặn TypeScript ≥ 6.1 và ESLint ≥ 10                                                                                                                                                                                                                                                                                                                         |
| Phát triển theo spec   | OpenSpec (`@fission-ai/openspec`)                                              | 1.15                                  | Lệnh `/opsx:*` trong Claude Code; quy trình ở CLAUDE.md, cấu hình ở `openspec/config.yaml`                                                                                                                                                                                                                                                                                        |

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

| Package             | Trách nhiệm                                                                                                                                              | Được phụ thuộc vào                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `packages/engine`   | Kiểu `GameDefinition`, session (lịch sử nước đi, undo/redo, replay), bộ sinh số ngẫu nhiên có seed, thuật toán AI chung (minimax/alpha-beta, expectimax) | Không phụ thuộc package nào, không React, không DOM |
| `packages/games`    | Luật của từng game, mỗi game một thư mục; danh sách game (registry) phía luật                                                                            | `engine`                                            |
| `packages/protocol` | Kiểu và schema zod của thông điệp online, mô hình phòng (ghế, trạng thái)                                                                                | `engine`                                            |
| `packages/ui`       | Design token, component nền (Button, Card, Dialog, Toast, Badge…), không biết gì về game                                                                 | React                                               |
| `packages/config`   | `tsconfig` gốc, cấu hình ESLint, Prettier dùng chung                                                                                                     | —                                                   |
| `apps/web`          | Ghép mọi thứ: trang, bàn cờ của từng game, transport, Web Worker AI, server phòng online                                                                 | Tất cả ở trên                                       |

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
│     │  │  ├─ play/[gameId]/       # màn hình bắt đầu ván
│     │  │  │  └─ [mode]/           # chơi theo chế độ: local (cùng máy), ai (với máy)
│     │  │  ├─ room/[code]/         # phòng online: link mời /room/<mã>, mã sai → không tìm thấy
│     │  │  ├─ rules/[gameId]/      # trang luật chơi của một game (render ở server)
│     │  │  ├─ tools/               # Hộp công cụ; tools/card-score/[[...path]]/: một route cho mọi màn hình của công cụ
│     │  │  └─ api/
│     │  │     └─ realtime/route.ts # điểm nối WebSocket trên Vercel; mọi thao tác phòng đi qua đây, không REST
│     │  ├─ features/               # mỗi tính năng một thư mục, tự chứa
│     │  │  ├─ menu/                # thẻ game, mục "Tiếp tục ván dở"
│     │  │  ├─ setup/               # màn hình bắt đầu ván: chế độ, mức độ, ai đi trước, lựa chọn gần nhất
│     │  │  ├─ play/                # màn hình ván, thanh điều khiển, hộp thoại kết thúc
│     │  │  ├─ room/                # trang phòng (RoomRoute), sảnh chờ + link mời, trang lỗi phòng, tạo phòng
│     │  │  ├─ chat/                # chat trong phòng: store (use-room-chat), panel, nút, bong bóng, lớp portal
│     │  │  ├─ identity/            # tên tạm + playerId trong localStorage, ô nhập tên (NameField)
│     │  │  ├─ rules/               # khung trang luật (RulesPage, RulesSection, RulesFigure), mục đầu hàng/bỏ ván, LazyRules của hộp thoại
│     │  │  ├─ toolbox/             # trang Hộp công cụ, sinh từ danh sách TOOLS
│     │  │  └─ settings/            # ngôn ngữ, sáng/tối, âm thanh
│     │  ├─ games/                  # phần giao diện của từng game
│     │  │  ├─ registry.ts          # ghép luật (packages/games) với giao diện
│     │  │  ├─ artwork.ts, rules.ts # GAME_ARTWORK, GAME_RULES: một dòng mỗi game, không kéo bàn cờ
│     │  │  ├─ tictactoe/           # Board.tsx, Artwork.tsx, theme.css, Rules.tsx + rules/ (hình), index.ts
│     │  │  ├─ caro/
│     │  │  ├─ ludo/
│     │  │  └─ chess/
│     │  ├─ tools/                  # công cụ ngoài game: registry.ts (TOOLS) và mỗi công cụ một thư mục, không dùng engine, games, protocol, transport, server
│     │  ├─ config/                 # constant toàn app: site.ts, routes.ts, storage-keys.ts
│     │  ├─ i18n/                   # cấu hình ngôn ngữ, chọn ngôn ngữ, bộ nạp bản dịch
│     │  ├─ test/                   # tiện ích test dùng chung (renderWithIntl)
│     │  ├─ transport/              # transport theo ghế (người/máy) và online, kết nối phòng (RoomConnection), kho ván dở theo slot
│     │  ├─ ai-worker/              # AiPlayer: Web Worker chạy AI của engine, dự phòng trên luồng chính
│     │  ├─ server/                 # chỉ chạy phía server; ESLint cấm phần client import
│     │  │  ├─ env.ts               # biến môi trường (zod, đọc lười), chọn kho, tiền tố khoá
│     │  │  ├─ room.ts              # StoredRoom, toRoomView (bỏ playerId), seatOf
│     │  │  ├─ room-service.ts      # trọng tài: tạo/vào/ngồi/đi/ván mới, không biết Redis hay WebSocket
│     │  │  ├─ store/               # RoomStore: redis.ts (Upstash), memory.ts (dev + test), bộ hợp đồng chung
│     │  │  └─ realtime/            # connection.ts (một WebSocket), dev-server.ts + dev-main.ts (server Node cho dev, E2E)
│     │  └─ lib/                    # tiện ích nhỏ chỉ dùng trong web (realtime-url.ts: địa chỉ server realtime)
│     ├─ messages/                  # vi.json (gốc), en.json, ja.json
│     ├─ e2e/                       # Playwright
│     └─ ui-shots/                  # `pnpm ui:shots` (playwright.shots.config.ts): ảnh màn hình chính để duyệt giao diện
├─ packages/
│  ├─ engine/src/   { types.ts, session.ts, rng.ts, ai/, index.ts }
│  ├─ games/src/    { tictactoe/, caro/, ludo/, chess/, index.ts }
│  ├─ protocol/src/ { messages.ts, room.ts, errors.ts, index.ts }
│  ├─ ui/src/       { styles.css, components/, icons.ts, lib/cn.ts, index.ts }
│  └─ config/       { tsconfig/, eslint/, vitest/ }
├─ .github/workflows/ci.yml
├─ turbo.json, pnpm-workspace.yaml, package.json
├─ idea.md, plan.md, README.md
```

### 3.3 Các điểm "common hoá" chính

Đây là những chỗ viết một lần, mọi game dùng lại. Thêm game mới mà phải sửa các chỗ này là dấu hiệu thiết kế sai.

| Phần dùng chung                                                                                                                                                                                                                                                                                                                                        | Ở đâu                                                                                          | Game chỉ cần cung cấp                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hợp đồng luật (`GameDefinition`)                                                                                                                                                                                                                                                                                                                       | `engine`                                                                                       | `meta`, `defaultOptions`, `setup`, `currentPlayer`, `legalMoves`, `applyMove`, `result`, (`parseOptions`, `evaluate`, `candidateMoves`, `moveKey`)                                                                                                                                                                                                                                                                                                                                                                  |
| Lịch sử, undo/redo, biên bản, replay                                                                                                                                                                                                                                                                                                                   | `engine` (`session`, `record`)                                                                 | Không gì cả                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Autosave                                                                                                                                                                                                                                                                                                                                               | `apps/web`                                                                                     | Không gì cả                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| AI: `chooseMove(game, state, { level, rng, now, timeLimitMs })`, minimax góc nhìn ghế máy + alpha-beta + expectimax, đào sâu dần (lần gieo bắt buộc ngay sau một nước quyết định không tốn độ sâu); mức `AI_LEVEL` Dễ/Vừa/Khó; chạy trong Web Worker (`AiPlayer`, không chạy được thì dự phòng trên luồng chính), transport cho máy đi khi tới ghế máy | `engine/ai` + `ai-worker` + `transport`                                                        | Hàm `evaluate` (càng cao càng tốt cho `player`; số hữu hạn, nên là số nguyên, trị tuyệt đối dưới 10^8; mọi chênh lệch đều được coi là thật) và `meta.supportsAI: true`, kèm một dòng `AI_GAMES` (`packages/games/src/ai.ts`, subpath `@board-games/games/ai`: Worker chỉ kéo luật của game có máy; test bắt nếu quên); game bàn lớn thêm `candidateMoves` (tập nước máy xét ở mỗi thế, tốt trước; tập con khác rỗng của `legalMoves`, giữ mọi nước thắng ngay và chặn ngay; bộ kiểm tra hợp đồng `candidate-moves`) |
| Ngẫu nhiên (xúc xắc)                                                                                                                                                                                                                                                                                                                                   | `engine` chọn kết quả bằng rng được truyền vào                                                 | Khai báo `outcomes(state, move)`: các kết quả có thể kèm trọng số                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Chơi online, kết nối lại, server trọng tài                                                                                                                                                                                                                                                                                                             | `transport` + `server` + `protocol`                                                            | Không gì cả                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Menu, bộ lọc                                                                                                                                                                                                                                                                                                                                           | `features/menu`                                                                                | `meta` (tên, số người, thời lượng)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Màn hình bắt đầu ván (chế độ, số người chơi, mức độ, ai đi trước, tuỳ chọn luật, ván dở của game)                                                                                                                                                                                                                                                      | `features/setup`                                                                               | `meta.supportsAI`, `meta.players` (nhóm "Số người chơi" khi `min < max`); game có tuỳ chọn luật khai báo `optionChoices` (giá trị được chọn, theo thứ tự hiện) và khoá dịch `Games.<id>.options.*`                                                                                                                                                                                                                                                                                                                  |
| Khung màn hình ván (lượt, đồng hồ, nút, bảng người chơi hoặc hai thanh ghế quanh bàn)                                                                                                                                                                                                                                                                  | `features/play`                                                                                | Component `Board`; game hai người muốn ghế trên và dưới bàn (Cờ vua) trả `seatOrder` trong `layout(…)`                                                                                                                                                                                                                                                                                                                                                                                                              |
| Trang luật chơi `/rules/<id>`, hộp thoại "Luật chơi" trên màn hình chơi, liên kết từ menu và màn hình bắt đầu ván, mục đầu hàng/bỏ ván                                                                                                                                                                                                                 | `features/rules` + `app/rules/[gameId]` + `features/play` (`PlayScreen` tự render `LazyRules`) | `games/<id>/Rules.tsx` (các mục, nhận `t` của namespace `Rules` và `place`), hình SVG ở `games/<id>/rules/*.tsx` chỉ dùng token, một dòng `GAME_RULES` (`games/rules.ts`), khoá `Rules.<id>.*`                                                                                                                                                                                                                                                                                                                      |
| Giao diện nền, token, theme                                                                                                                                                                                                                                                                                                                            | `packages/ui`                                                                                  | Không gì cả                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### 3.4 Các interface cốt lõi

`GameDefinition` và phiên chơi đã cài ở `packages/engine` (chi tiết: `openspec/specs/game-engine/spec.md`, mã nguồn `packages/engine/src/types.ts`). `Transport`, `SavedGameStore` và `AiPlayer` đã cài ở `apps/web/src/transport/` và `apps/web/src/ai-worker/` (M2: một transport cục bộ theo ghế cho cả cùng máy lẫn đấu với máy; chi tiết: `openspec/specs/{local-play,play-vs-ai,game-setup}/spec.md`). `RoomStore`, `RoomView` và thông điệp online đã cài ở M4 (`apps/web/src/server/`, `packages/protocol/`; chi tiết: `openspec/specs/online-rooms/spec.md` và design của change `add-online-rooms`). Phía client của chơi online (`RoomConnection`, transport online, ghế `remote` trong ảnh chụp) cũng cài ở M4 (`apps/web/src/transport/`, `features/{room,identity}`; chi tiết: `openspec/specs/{online-play,player-identity}/spec.md` và design của change `add-online-play`).

```ts
// packages/engine — mọi method khai báo `this: void` để truyền đi mà không cần bind
interface GameDefinition<State, Move, Outcome = never, Options extends object = Record<string, never>> {
  readonly id: GameId;                               // kebab-case; khai báo game bằng `as const satisfies`
  readonly meta: GameMeta;                           // số người, thể loại, thời lượng, supportsAI
  readonly defaultOptions: Options;
  readonly optionChoices?: OptionChoices<Options>;   // { [tuỳ chọn]: giá trị được chọn, theo thứ tự hiện } (chỉ giá trị, không chữ);
                                                     // đọc chung qua listOptionChoices(game) → { name, values }[]; kiểm tra hợp đồng `option-choices`
  parseOptions?(raw: unknown): Options | null;       // kiểm tra tuỳ chọn từ bên ngoài; không có thì chỉ nhận defaultOptions
  setup(ctx: { playerCount; options }): State;       // tất định; ngẫu nhiên lúc tạo ván đi vào options
  currentPlayer(state: State): PlayerIndex;
  legalMoves(state: State): readonly Move[];
  outcomes?(state: State, move: Move): readonly { outcome: Outcome; weight: number }[];
  applyMove(state: State, move: Move, outcome?: Outcome): State; // tất định, không sửa state
  result(state: State): GameResult | null;           // { kind: "win", winners, reason? } | { kind: "draw", reason? }
  evaluate?(state: State, player: PlayerIndex): number; // bắt buộc khi supportsAI; |giá trị| < 10^8
  candidateMoves?(state: State): readonly Move[];    // nước máy xét, tốt trước (bàn lớn); tập con khác rỗng của
                                                     // legalMoves, giữ mọi nước thắng/chặn ngay; không có = mọi nước hợp lệ
  moveKey?(move: Move): string;                      // mặc định: JSON với khoá đã sắp xếp
}

// apps/web/src/games — phần giao diện của một game, ghép với luật bằng defineGameEntry
interface GameUI<State, Move, Outcome = never> {
  readonly Board: ComponentType<BoardProps<State, Move, Outcome>>; // { state, legalMoves, onMove, disabled, result, lastEntry, viewer }
  readonly usePlayerLabel: () => (player: PlayerIndex, state: State) => string; // "X", "O", tên màu… (state: thế đang hiện)
  readonly useMoveLabel: () => (move: Move, state: State) => string; // cụm hành động: "đánh hàng 8, cột 9", "gieo được 5";
                                                                     // state là thế sau nước đó
}

// Phiên chơi: dữ liệu thuần + hàm thuần, lỗi trả về dạng Result<T> với mã ENGINE_ERROR
createSession(game, { playerCount, options? }): Result<Session>
playMove(game, session, move: unknown, rng: Rng): Result<Session> // rng do nơi gọi truyền vào mỗi nước
applyEntry(game, session, entry: unknown): Result<Session> // { move, outcome? } chơi ở nơi khác (server online), không gieo lại
undo(session) / redo(session): Result<Session>      // ván đã có `ending` → game-over
concede(game, session, { reason: "resigned" | "abandoned", player }): Result<Session> // M8: mọi ghế khác thắng với
                                                     // reason đó (ENDING_REASON); ván đã kết thúc → game-over, ghế ngoài
                                                     // ván → illegal-move; không thêm nước; sessionResult chỉ báo khi cursor
                                                     // = entries.length; sau đó không đi/hoàn tác/làm lại được
activeEntries(session) / lastEntry(session)            // lịch sử đang có hiệu lực, không gồm nước đã hoàn tác
toRecord(session): GameRecord                          // { version: 1, gameId, playerCount, options, entries, ending? }
                                                       // (ending tuỳ chọn, RECORD_VERSION vẫn 1; fromRecord kiểm như dữ liệu ngoài)
fromRecord(game, raw: unknown): Result<Session>        // biên bản là dữ liệu không tin cậy

// apps/web/src/transport — nơi duy nhất giữ Session; màn hình chơi chỉ đọc ảnh chụp và gửi yêu cầu
interface Transport<State, Move, Outcome = never> {
  getSnapshot(): PlaySnapshot;                       // { status: "loading" } | { status: "ready", state, legalMoves,
                                                     //   currentPlayer, result, lastEntry, moveCount, canUndo, canRedo,
                                                     //   canMove (transport quyết ai được đi), viewer (ghế của người ở
                                                     //   thiết bị này khi chỉ có một người, null nếu không),
                                                     //   seats: SeatView[], waitingFor: "ai" | "opponent" | null,
                                                     //   inProgress (người đã đi ít nhất một nước còn hiệu lực; online luôn sai),
                                                     //   supportsUndo (online: sai), canStartNewGame (online: chỉ khi
                                                     //   ván đã có kết quả), connection (ConnectionStatus, null nếu không online),
                                                     //   options (tuỳ chọn luật của ván, màn hình chơi ghi tóm tắt luật) }
  subscribe(listener: (event: TransportEvent) => void): () => void; // "changed" | { "rejected", code: RejectionCode }
  submit(move: Move): void;                          // kết quả qua sự kiện, kể cả bị từ chối (online là bất đồng bộ)
  requestUndo(): void;                               // lùi tới lượt người ở thiết bị này (bỏ cả nước máy); online không có hoàn tác
  requestRedo(): void;                               // làm lại tới lượt người kế tiếp (kèm nước máy)
  requestNewGame(): void;
  resign(): void;                                    // M8: khi ảnh chụp có resign (với máy, online); cùng máy không có
  claimAbandoned(): void;                            // M8: online, xử lượt đang chạy (ảnh chụp turn); server quyết
  dispose(): void;
}
// Ảnh chụp (M8): resign: { outcome: "loss" | "stand-in", available } | null; turn: { player, startedAt (giờ thiết bị,
// = lúc nhận phòng − turnIdleMs), claim: "win" | "end" | "stand-in" | null, available } | null; sự kiện "claim-refused".
// Ghế máy chơi thay người ở xa: { kind: "ai", level: "medium", standInFor: name } (cả ghế của chính mình).

// Ghế: SeatController = { kind: "human" } | { kind: "ai", level } là dữ liệu lưu của chế độ cục bộ;
// SeatView = SeatController | { kind: "remote", name: string | null } là ghế trong ảnh chụp (remote = người chơi ở xa, null = ghế trống).
// Transport cục bộ theo ghế: mỗi ghế là người hoặc máy.
// Tới ghế máy thì hỏi AiPlayer, chờ tối thiểu 300 ms (game có outcomes: AI_SETTLE_DELAY_MS 500 ms, ngay sau một nước có
// kết quả ngẫu nhiên AI_RESULT_DELAY_MS 800 ms; ai-timing.ts), kiểm lại ván chưa đổi rồi mới đi; máy lỗi thì đi nước hợp lệ
// ngẫu nhiên. Đấu với máy N người: một người + máy ở mọi ghế còn lại, cùng mức; "Tôi" = ghế đi đầu, "Máy" = người đi thứ
// hai, "Ngẫu nhiên" = rút đều trong N ghế. Hoàn tác không bao giờ lùi qua một nước có outcome (dừng ngay sau lần gieo).
createLocalTransport({ definition, store, rng, mode?: "local" | "ai", start?: PlaySetup, fallback?: PlaySetup, ai?: AiPlayer })
// PlaySetup = { mode: "local", options?, playerCount? } | { mode: "ai", level, first: "human" | "ai" | "random", options?, playerCount? }
// options, playerCount chưa tin cậy (từ đường dẫn ?options=<JSON>&players=<n> hay localStorage); thứ tự: start mà luật nhận
// (cả tuỳ chọn lẫn số người) → ván đã lưu → fallback (lựa chọn nhớ gần nhất, cả hai chế độ) → mặc định. "Ván mới" giữ tuỳ
// chọn và số người của ván đang chơi. players=<n> chỉ có khi game có số người thay đổi.

// Kết nối một phòng (không biết game): join với danh tính đọc lại ở mỗi lần chào (getIdentity: mã người chơi ghim cho cả
// phiên trang phòng, tên có thể null khi khách chưa đặt tên — lời chào khi đó không có trường name), giữ room mới nhất (room
// đầu tiên sau mỗi join luôn thắng), tự nối lại (0/1/2/4/8 rồi 10 giây, nhân hệ số ngẫu nhiên [0,8; 1]; về 0 chỉ sau 30
// giây online), ping 20 giây và tự đóng khi im lặng 45 giây, tạm ngắt khi tab ẩn từ 60 giây hoặc 10 phút không hoạt động,
// thôi hẳn (failed) khi phòng không còn, app cũ, hay hết ghế mà mình chưa có ghế; sit quá 8 giây thì nối lại. Mọi thông
// điệp nhận được đi qua parseServerMessage.
createRoomConnection({ url, code, getIdentity, openSocket?, environment?, random? }): RoomConnection
// RoomConnection: getSnapshot() → { status: ConnectionStatus (CONNECTION_STATUS ở transport/types.ts: "connecting" |
//   "online" | "reconnecting" | "paused" | "idle" | "failed"), room, you, failure, slow }; subscribe;
//   send(sit | move | rematch | ai-seat): boolean; onRejected; onSynced; resume; reconnect; dispose. Lời từ chối ai-seat
//   (not-host, seat-taken, not-ai-seat, game-started, invalid-seat) không làm nối lại; outdated-client dừng hẳn, không tự tải lại.

// Transport online theo ghế: dựng ván bằng fromRecord(room.record) mỗi lần room đổi; nước đi chỉ hiện khi server đã ghi
// (không hiển thị trước); chờ trả lời thì khoá bàn (cờ chờ theo gameNumber + moveIndex), quá 8 giây thì nối lại; chỉ phát
// "rejected" với mã của luật; isBroken() khi biên bản không dựng được (từ đó thôi theo dõi; trang phòng dừng kết nối).
// Ghế máy của phòng là { kind: "ai", level: "medium" } trong ảnh chụp. Một room mang nhiều nước mới (máy đi liền nhau) được
// hiện lần lượt: nước đầu ngay, mỗi nước sau cách AI_RESULT_DELAY_MS (sau lần gieo) / AI_SETTLE_DELAY_MS, hay AI_MIN_DELAY_MS
// với game không có xúc xắc; canMove sai tới khi hiện xong; ván mới hiện bàn trống trước; vào phòng/tải lại/nối lại hiện ngay.
createOnlineTransport({ definition, connection }): OnlineTransport

// Ván dở theo slot game × chế độ (khoá "<gameId>:<mode>", vỏ { version: 2, savedAt, inProgress, mode, record });
// ván cùng máy của M1 (khoá "<gameId>", version 1) được chuyển một lần trước mọi thao tác.
interface SavedGameStore {
  load(slot: SaveSlot): Promise<{ settings: ModeSettings; record: unknown } | undefined>; // từ chối = có thể có ván, không được ghi đè
  save(slot: SaveSlot, game: { settings; record; inProgress }): Promise<void>;
  clear(slot: SaveSlot): Promise<void>;
  listInProgress(): Promise<SavedGameSummary[]>;    // cho menu và màn hình bắt đầu ván, mới nhất trước; kèm options của
                                                     // biên bản (chưa kiểm) để ghi luật cạnh chế độ
}

// apps/web/src/ai-worker — máy nghĩ ngoài luồng giao diện
interface AiPlayer {
  chooseMove(request: AiRequest): Promise<unknown>;  // { gameId, state, level, timeLimitMs, seed }; transport kiểm lại nước
  dispose(): void;
}
// createWorkerAiPlayer(): Worker tạo ở yêu cầu đầu; Worker lỗi/không trả lời → luồng chính (200 ms) cho mọi lượt sau.

// packages/protocol — thông điệp online, kiểm bằng zod ở cả hai phía
// client → server: create { protocol, gameId, playerCount?, options?, playerId, name } | join { protocol, code, playerId, name? }
//                  | sit { name } | move { gameNumber, moveIndex, move } | rematch { gameNumber }
//                  | ai-seat { seat, on } (chỉ chủ phòng, phòng từ ba ghế, trước nước đầu của ván) | ping
//                  | resign { gameNumber } | claim-abandoned { gameNumber, moveIndex } (M8; từ chối kèm phòng gửi lại,
//                  mã mới not-abandoned)
// Luật dùng chung ở packages/protocol/leaving.ts (M8): leaveOutcome(seats, leaver, gameHasAi) → "end" | "stand-in" (máy chơi
// thay chỉ ở phòng > MAX_SEATS_WITHOUT_AI = 2 ghế của game có máy, khi còn người tự chơi khác); abandonClaim → "ok" |
// "too-early" | "not-claimable" (ABANDON_AFTER_MS = 5 phút theo đồng hồ server).
// PROTOCOL_VERSION = 3 (M8, đầu hàng và bỏ ván): tab bản 1–2 nhận outdated-client ở lời chào.
// server → client: created { code } | room { room: RoomView, you } | rejected { request, code } | error { code } | pong
// PROTOCOL_VERSION = 2 (M6, ghế máy): tab của bản 1 nhận outdated-client ở lời chào.
// join.name tuỳ chọn (M6.5, ask-name-in-lobby): khách chưa có tên vào phòng trước, biết ngay phòng không có/đủ người, rồi
// đặt tên ở sảnh chờ (sit vẫn bắt buộc có tên); người đã ngồi chào không tên thì giữ tên cũ. Giữ phiên bản 2: client bản 2
// cũ luôn gửi name nên vẫn khớp; tăng lên 3 sẽ bắt mọi tab đang mở (cả ván dở) tải lại mà không được gì.
interface RoomView {                                 // không bao giờ chứa playerId
  readonly code: RoomCode;                           // 6 ký tự, không 0/O/1/I/L
  readonly gameId: string;
  readonly revision: number;                         // tăng 1 mỗi lần phòng đổi
  readonly gameNumber: number;                       // ván thứ mấy trong phòng
  readonly seats: readonly ({ kind: "human"; name: string; standIn: boolean } | { kind: "ai" } | null)[];
  readonly host: PlayerIndex | null;                 // ghế hiện tại của chủ phòng (người tạo); null với phòng bản trước
  readonly record: GameRecord;                       // ván hiện tại; client dựng lại bằng fromRecord
  readonly turnIdleMs: number | null;                // M8: lượt đã kéo dài bao lâu lúc gửi (giờ server); null khi chưa đủ
                                                     // người hay ván đã có kết quả
}
// M8: StoredRoom định dạng 3 (ghế người có standIn, turnStartedAt: number | null đặt lúc ghi: restart/stop/keep); đọc được
// định dạng 1–2 (turnStartedAt = updatedAt). toRoomView(room, now) không dựng lại ván. REALTIME_ABANDON_AFTER_MS chỉ cho
// server realtime ở máy (E2E), bị bỏ qua khi có VERCEL_ENV.
// room-service: StoredRoom định dạng 2 (hostId, ghế { kind: "human", playerId, name } | { kind: "ai" }); đọc được định
// dạng 1 (mọi ghế là người, không có chủ phòng). Máy chơi thay ghế máy ngay trong lần ghi đã trao lượt cho nó (move, sit,
// ai-seat, rematch; join khi phòng dừng ở lượt máy): chooseMove mức Vừa, rng của server, qua playMove của luật, tối đa
// MAX_AI_MOVES_PER_WRITE = 200 nước mỗi lần ghi; không hẹn giờ, không tiến trình nền.

// apps/web/src/server/store — mọi state của phòng nằm ở đây (Redis trên Vercel, bộ nhớ khi dev/test)
interface RoomStore {
  create(room: StoredRoom): Promise<"created" | "exists">;
  get(code: RoomCode): Promise<StoredRoom | null>;
  update(code: RoomCode, expectedRevision: number, next: StoredRoom): Promise<"updated" | "conflict" | "missing">; // ghi + phát tin
  subscribe(code: RoomCode, listener: (room: StoredRoom) => void): Promise<() => void>; // cả instance khác; đọc lại khi kênh nối lại
  close(): Promise<void>;
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
  export const GAME_CATEGORY = {
    VnFolk: "vn-folk",
    Classic: "classic",
    Original: "original",
  } as const;
  export type GameCategory = (typeof GAME_CATEGORY)[keyof typeof GAME_CATEGORY];
  ```
  Lý do: không sinh code thừa khi biên dịch, giá trị là chuỗi đọc được trong log/JSON gửi qua mạng, chạy được với công cụ chỉ xoá kiểu (Node, SWC).
- **Constant đặt ở tầng sở hữu nó**:

  | Loại                         | Ở đâu                                  | Ví dụ                                                  |
  | ---------------------------- | -------------------------------------- | ------------------------------------------------------ |
  | Khái niệm chung của mọi game | `packages/engine/src/constants.ts`     | `GAME_CATEGORY`, giới hạn số người                     |
  | Riêng một game               | `packages/games/src/<id>/constants.ts` | kích thước bàn caro, số bậc chuồng cá ngựa             |
  | Giao thức online             | `packages/protocol/src/`               | tên thông điệp, mã lỗi                                 |
  | Cấu hình toàn app            | `apps/web/src/config/`                 | `site.ts` (tên, mô tả), `routes.ts`, `storage-keys.ts` |
  | Riêng một tính năng          | ngay trong `features/<tên>/`           | danh sách lựa chọn của màn hình chọn chế độ            |

- **Không có file `constants.ts` dùng chung cho cả app** gom mọi thứ: nó luôn phình to và kéo phụ thuộc chéo. Chỉ tạo constant khi có chỗ dùng (knip báo export thừa).

### 4.3 Styling

- Chỉ dùng **class tiện ích của Tailwind + token** (`bg-surface`, `text-fg-muted`, `rounded-card`…); không viết màu cứng (`#fff`, `bg-blue-500`) trong component. Màu mới = thêm token trong `packages/ui/src/styles.css`.
- Ghép class bằng **`cn()`**; component có nhiều biến thể khai báo bằng **`cva()`** (xem `Button`).
- Component nhận `className` để nơi dùng chỉnh bố cục; `cn` đảm bảo class truyền vào thắng class mặc định.
- Không viết CSS riêng, trừ trường hợp Tailwind không làm được (ví dụ hiệu ứng bàn cờ phức tạp); khi đó dùng CSS Module đặt cạnh component.
- Thang chữ (`text-display`, `text-title`, `text-status`, `text-heading`, `text-body`, `text-small`, `text-caption`), bán kính (`rounded-control`, `rounded-card`), bóng (`shadow-card`, `shadow-press`, `shadow-raised`) và vòng focus (`focus-ring`, `focus-ring-within`: viền mực + quầng giấy) đều là token của `packages/ui/src/styles.css`; `cn()` dùng `extendTailwindMerge` để hiểu chúng. Khoảng cách theo thang mặc định, chỉ các bậc 1, 2, 3, 4, 6, 8, 10, 14.
- **Token theo game**: `packages/ui` khai báo hợp đồng `--game-*` (`--game-page`, `--game-tint`, `--game-board`, `--game-line`, `--game-mark-1`, `--game-mark-2`, `--game-highlight`, `--game-last-move`, `--game-win`, tiện ích `bg-game-*`/`stroke-game-*`…) với giá trị mặc định, không biết mã game nào. Giá trị của từng game nằm trong `apps/web/src/games/<id>/theme.css` (CSS thường, selector `[data-game="<id>"]`, sáng + hai khối tối giống hệt), import từ `Artwork.tsx` và `index.ts` của game; hình minh hoạ đăng ký trong `games/artwork.ts` (`GAME_ARTWORK`, tách khỏi `GAME_ENTRY_LOADERS` để trang server không kéo bàn cờ của mọi game vào bundle); phần tử bọc vùng của game mang `data-game`. Test `games/theme-css.test.ts` và `packages/ui/src/styles.test.ts` kiểm đủ ba khối và tỉ số tương phản.
- Mọi việc giao diện theo skill `board-games-ui` (`.claude/skills/board-games-ui/SKILL.md`): luật cứng (tương phản AA, bàn phím, giảm chuyển động, vùng chạm, không cuộn ngang ở 360 px), hướng thiết kế (khung chung + bản sắc từng game qua biến `--game-*`), quy trình 4 pha. Component tự viết trên `cva()`; chưa dùng shadcn/ui (hoãn, xem §10 M6.5).

### 4.4 Icon và hình ảnh

- Icon giao diện lấy từ **lucide-react**, nhưng chỉ import qua **`@board-games/ui`** (`packages/ui/src/icons.ts`), đặt tên có hậu tố `Icon` (`CheckIcon`, `SunIcon`). Cần icon mới thì thêm một dòng re-export ở đó.
- Icon trang trí luôn có `aria-hidden`; nút chỉ có icon phải có `aria-label`.
- Hình quân cờ, bàn cờ là SVG tự vẽ, đặt trong thư mục của game (`apps/web/src/games/<id>/`), không lẫn vào bộ icon chung.

### 4.5 Test

- **Test đặt cạnh code**: `rules.ts` ↔ `rules.test.ts`, `Button.tsx` ↔ `Button.test.tsx`.
- Cấu hình Vitest dùng chung từ `@board-games/config/vitest`; package có React dùng `environment: "jsdom"` + `vitest.setup.ts` (matcher của jest-dom và dọn DOM sau mỗi test).
- Test component theo cách người dùng thao tác: tìm phần tử bằng `getByRole`/`getByText`, bấm bằng `userEvent`; không test chi tiết bên trong component.
- E2E (Playwright) đặt trong `apps/web/e2e/`, chạy trên bản build production.

### 4.6 Công cụ tự kiểm tra

| Khi nào             | Công cụ                         | Kiểm tra gì                                                                                                                                                                   |
| ------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lưu file (VS Code)  | Prettier, ESLint                | Định dạng, sắp xếp import và class Tailwind                                                                                                                                   |
| `git commit`        | husky → lint-staged, commitlint | Prettier + ESLint trên file thay đổi; commit message đúng chuẩn                                                                                                               |
| Mỗi PR, push `main` | GitHub Actions                  | `format:check`, `knip`, lint, typecheck, test, build; job E2E riêng                                                                                                           |
| Hằng tuần           | Renovate                        | PR cập nhật thư viện                                                                                                                                                          |
| `pnpm test`         | `messages.test.ts`              | Bản dịch en/ja đủ key và đúng tham số so với tiếng Việt                                                                                                                       |
| Làm giao diện, CI   | `pnpm test:a11y`                | axe-core 4.14 trong Playwright (`apps/web/e2e/a11y.spec.ts`): mọi màn hình chính sáng/tối × máy tính/điện thoại, không vi phạm WCAG 2.x A/AA và luật Lighthouse; cũng chạy trong `pnpm test:e2e`                  |
| Làm giao diện       | `pnpm ui:shots`                 | Build rồi chụp màn hình chính từ server local (sáng/tối × 390 × 844 / 1280 × 800) vào `apps/web/.ui-shots/`; xem bằng mắt, không so ảnh tự động, không nằm trong `pnpm check` |

### 4.7 Đa ngôn ngữ (vi, en, ja)

- Thư viện **next-intl**. Bản dịch ở `apps/web/messages/{vi,en,ja}.json`, chia namespace theo tính năng (`Menu`, `Settings`, `Games`…). Mã nguồn i18n ở `apps/web/src/i18n/`.
- **Tiếng Việt là ngôn ngữ gốc**: `vi.json` quyết định cấu trúc. Thiếu key ở `en.json`/`ja.json` là lỗi TypeScript; gọi `t("key-sai")` hay truyền thiếu tham số cũng là lỗi TypeScript.
- **URL không chứa mã ngôn ngữ.** Thứ tự chọn: cookie `NEXT_LOCALE` (người chơi đã chọn) → `Accept-Language` của trình duyệt → `vi`. Lý do: link mời vào phòng mở ra bằng ngôn ngữ của người nhận. Đánh đổi: trang được render động trên server thay vì tĩnh, không ảnh hưởng với quy mô app.
- **Chỉ `apps/web` biết về ngôn ngữ.** `engine`, `games`, `protocol` không chứa chữ hiển thị; chúng trả về id/mã (`"caro"`, `"illegal-move"`) và app dịch bằng key tương ứng (`Games.caro.name`, `Errors.illegal-move`). Nhờ vậy server online và Web Worker không phải tải bản dịch.
- Số nhiều, số, ngày giờ dùng cú pháp ICU (`{count, plural, one {# player} other {# players}}`) thay vì ghép chuỗi trong code.
- Tên thương hiệu (`SITE.name`) không dịch, để trong `apps/web/src/config/site.ts`.
- Test component bọc trong `renderWithIntl(ui, { locale })` (`apps/web/src/test/render-with-intl.tsx`).
- **Namespace `Rules` không gửi xuống client**: layout gốc truyền `clientMessages(messages)` (mọi namespace trừ `Rules`) cho `NextIntlClientProvider`. Trang luật dịch ở server (`getTranslations("Rules")`); hộp thoại "Luật chơi" của màn hình chơi nạp lười phần luật của game và tệp messages của ngôn ngữ đang dùng khi mở lần đầu (`features/rules/load-rules.ts`). Chữ mà component client của hộp thoại cần (nút, tiêu đề, lỗi) nằm ở `Play.rules*`, không ở `Rules`. ESLint chặn `useTranslations`/`getTranslations` với namespace `Rules` trong tệp `"use client"`.
- Thêm một ngôn ngữ: thêm mã vào `LOCALES` và `LOCALE_LABELS` (`src/i18n/config.ts`), tạo `messages/<mã>.json`, thêm vào `MESSAGE_LOADERS`; TypeScript và `messages.test.ts` sẽ chỉ ra chỗ còn thiếu.

### Quy trình thêm một game mới (checklist)

1. `packages/games/src/<id>/`: `rules.ts` cài `GameDefinition` (khai báo bằng `export const <id> = { … } as const satisfies GameDefinition<State, Move, Outcome, Options>` để mã game giữ kiểu literal), `rules.test.ts`, (tuỳ chọn) `options.ts` cho biến thể luật kèm `parseOptions`, và `optionChoices` nếu người chơi được chọn biến thể ở màn hình bắt đầu ván (mọi chế độ, kể cả tạo phòng online).
2. Trong `rules.test.ts`, gọi `describeGameContract(<game>, { seeds, maxPlies, playerCounts?, options?, timeout? })` từ `@board-games/engine/testing` → phải xanh (không truyền `playerCounts` thì thử mọi số người game cho phép).
3. `apps/web/src/games/<id>/`: `Board.tsx`, `Artwork.tsx`, `theme.css`, `index.ts`, và trang luật `Rules.tsx` (các mục bằng `RulesSection`, kết thúc bằng `RulesLeavingSection`) với hình ở `rules/*.tsx` (SVG chỉ dùng token, mỗi hình có `label` + chú thích). Sửa luật của game thì sửa luôn `Rules.<id>` cho khớp `openspec/specs/<id>`.
4. Thêm tên và nội dung của game vào `apps/web/messages/{vi,en,ja}.json` (`Games.<id>…`, luật chơi ở `Rules.<id>…`); game có `optionChoices` thêm `Games.<id>.options.<tuỳ chọn>.label`, `….values.<giá trị>` và câu ICU `Games.<id>.options.summary` với tham số trùng tên tuỳ chọn (`use-option-labels.test.tsx` kiểm đủ khoá; chữ của giá trị không chứa `.`, kiểm tra hợp đồng `option-choices` bắt).
5. Thêm game vào `GAMES` (`packages/games/src/index.ts`) và mã của nó vào `GAME_IDS` (`packages/games/src/ids.ts`, cho code client chỉ cần mã game), rồi một dòng vào `apps/web/src/games/registry.ts`, một dòng `GAME_ARTWORK` (`apps/web/src/games/artwork.ts`) và một dòng `GAME_RULES` (`apps/web/src/games/rules.ts`); game có máy (`meta.supportsAI`) thêm một dòng `AI_GAMES` (`packages/games/src/ai.ts`).
6. Game tự xuất hiện trong menu, chơi được cùng máy, online, và với máy nếu `meta.supportsAI` (bộ kiểm tra hợp đồng bắt buộc khi đó phải có `evaluate`).

## 5. Môi trường và hạ tầng

| Việc              | Cách làm                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mã nguồn          | Git, repo trên GitHub (có thể để công khai)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| CI                | GitHub Actions: `pnpm install` → `turbo lint typecheck test build` cho mọi PR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Deploy            | Vercel nối với GitHub: nhánh `main` lên production, mỗi PR có link preview để gửi bạn thử                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Biến môi trường   | `REDIS_URL` (tích hợp Upstash trên Vercel tự thêm, kèm `KV_*`), `QSTASH_TOKEN` (từ v1); khai báo và kiểm tra bằng zod trong `apps/web/src/server/env.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Chạy local        | `pnpm dev` chạy `next dev` (cổng 3000) và server realtime (`ws://localhost:3001/api/realtime`, script `realtime` của `apps/web`, đổi cổng bằng `REALTIME_PORT`): `next dev` không nâng cấp được WebSocket nên server realtime là một tiến trình Node riêng, dùng chung bộ xử lý kết nối với route trên Vercel. Không có `REDIS_URL` thì phòng nằm trong bộ nhớ của tiến trình đó; có `REDIS_URL` thì dùng Redis với tiền tố khoá `dev:`. Chơi online ngay trên máy: mở `/play/<mã game>`, chọn "Online", "Tạo phòng", rồi mở link mời trong một cửa sổ ẩn danh hoặc trình duyệt khác (mỗi trình duyệt một `playerId`; hai tab cùng trình duyệt là cùng một người). App tìm server realtime theo `REALTIME_URL` (đọc lúc chạy); không đặt thì ở `next dev` là `ws://localhost:3001/api/realtime`, còn lại là cùng origin `/api/realtime` (Vercel). E2E chạy bản build ở cổng 3100 với server realtime riêng ở cổng 3101 |
| Phòng trong Redis | HASH `<tiền tố>room:<MÃ>` (`rev`, `data`), hết hạn 7 ngày sau lần ghi cuối; tiền tố theo `VERCEL_ENV` (`production:`, `preview:`, còn lại `dev:`) để Preview và Production dùng chung một Upstash mà không thấy phòng của nhau                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Cập nhật thư viện | Renovate hoặc Dependabot, gom theo tuần                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## 6. Các mốc phát triển

Kích thước ước lượng: **S** ≈ 1–2 buổi, **M** ≈ 3–5 buổi, **L** ≈ 1–2 tuần (làm ngoài giờ).

Từ M1, mỗi mốc được làm qua một hoặc nhiều **OpenSpec change** (`/opsx:propose` → `/opsx:apply` → `/opsx:archive`, xem CLAUDE.md). Bảng dưới là lộ trình; chi tiết requirement, thiết kế và task của từng việc nằm trong `openspec/changes/<tên>/`, và hành vi đã xong nằm trong `openspec/specs/`. Mốc chỉ coi là xong khi mọi change của nó đã archive.

### 6.1 Giai đoạn 0: Khung

| Mốc                                                       | Nội dung                                                                                                                                                                                                           | Xong khi                                                                                                                                                                  | Cỡ  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **M0. Khởi tạo repo**                                     | Git + GitHub; pnpm workspace + Turborepo; `packages/config`; Next.js khung trong `apps/web`; Tailwind + token sáng/tối trong `packages/ui`; ESLint (kèm quy tắc chiều phụ thuộc), Prettier, Vitest; CI; nối Vercel | `pnpm lint typecheck test build` xanh ở local và CI; trang "Hello" chạy trên domain Vercel                                                                                | S   |
| **M1. Engine + game mẫu cùng máy**                        | `engine`: types, session (undo/redo), rng; `games/tictactoe`; bộ test hợp đồng chung; `features/menu` tự sinh từ registry; `features/play` + `LocalTransport`; autosave vào IndexedDB                              | Chơi Tic-tac-toe cùng máy từ menu; undo/redo đúng; F5 vẫn giữ ván                                                                                                         | M   |
| **M2. AI**                                                | `engine/ai` (minimax + alpha-beta, giới hạn thời gian, 3 mức khó); `ai-worker`; transport theo ghế (người/máy) thay cho `AITransport` riêng; màn hình bắt đầu ván; ván dở theo game × chế độ                       | Đấu với máy Tic-tac-toe, máy mức Khó không thua; giao diện không bị đứng khi máy nghĩ                                                                                     | S   |
| **M3. Thử nghiệm online trên Vercel** _(cổng quyết định)_ | Dựng route WebSocket tối giản trên Vercel Hobby, đo: thời gian giữ kết nối, độ trễ từ Việt Nam, 2 client trên 2 instance có nhận được tin qua Redis pub/sub không, chạy local được không                           | Có bảng số đo và **quyết định**: giữ WebSocket của Vercel, hay chuyển sang phương án dự phòng (Ably/Pusher gói miễn phí, hoặc server Node riêng). Ghi kết quả vào plan.md | S   |
| **M4. Phòng online**                                      | `protocol` (thông điệp + zod); `features/identity`; `room-service` + `RoomStore` (memory, redis); `realtime/`; `OnlineTransport` có tự kết nối lại; trang tạo phòng, link mời, mã phòng; TTL 7 ngày                | 2 trình duyệt chơi Tic-tac-toe qua link; tắt mạng một bên rồi bật lại vẫn tiếp tục đúng lượt; gửi nước đi sai luật bị server từ chối; test E2E bằng Playwright xanh       | L   |

### 6.2 Giai đoạn 1: MVP

| Mốc                              | Nội dung                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Xong khi                                                                                                                                       | Cỡ  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| **M5. Cờ caro**                  | Luật (5 quân liên tiếp, bàn 15×15 / 19×19); hàm `evaluate` theo mẫu chuỗi quân; bàn SVG (Canvas nếu bàn lớn bị chậm), đánh dấu nước vừa đi và hàng thắng                                                                                                                                                                                                                                                                                                                                                                                                            | Chơi được cả 3 chế độ; AI mức Vừa chặn được chuỗi 4                                                                                            | M   |
| **M6. Cờ cá ngựa**               | Luật theo cột "phổ biến" (idea.md 3.4) nhưng mỗi điểm là một tuỳ chọn trong `LudoOptions`; xúc xắc qua `rng` (online thì server tung); 2–4 người; AI luật ưu tiên; ghế trống cho AI chơi thay; hiệu ứng gieo xúc xắc và đi quân                                                                                                                                                                                                                                                                                                                                     | Chơi được cả 3 chế độ với 2, 3, 4 người; mỗi điểm luật có test riêng; 1000 ván ngẫu nhiên tự chơi đều kết thúc                                 | L   |
| **M6.5. Thiết kế lại giao diện** | Nền thiết kế: bảng màu (nền trung tính ấm, màu nhấn chính + phụ không trùng màu quân, token `success`/`warning`/`celebration`), thang chữ, component dùng chung; bản sắc riêng cho Tic-tac-toe, Cờ caro, Cờ cá ngựa (biến `--game-*`); bảng người chơi và lượt, khoảnh khắc kết thúc ván (hàng thắng, ăn mừng), trạng thái rỗng/lỗi; sửa lỗi điện thoại mà khảo sát tìm ra. Bốn change: `add-design-foundation` → `redesign-game-boards` → `add-game-feedback`, theo skill `board-games-ui`, và `ask-name-in-lobby` (giao thức + server, độc lập với ba change kia) | Người dùng duyệt mockup và ảnh `pnpm ui:shots` của mọi màn hình ở sáng/tối × điện thoại/máy tính; tương phản đạt AA; mọi test (unit, E2E) xanh | M   |
| **M7. Cờ vua**                   | Luật đầy đủ (nhập thành, bắt tốt qua đường, phong cấp, chiếu bí, hết nước đi, hoà lặp 3 lần, luật 50 nước), `meta.supportsAI = false`; chọn quân phong cấp; lật bàn theo bên mình                                                                                                                                                                                                                                                                                                                                                                                   | Chơi được cùng máy và online; vượt bộ test thế cờ chuẩn (đếm số nước đi hợp lệ "perft" ở các thế cờ mẫu)                                       | L   |
| **M8. Hoàn thiện MVP**           | Trang luật chơi từng game; responsive điện thoại; sáng/tối; điều khiển bằng bàn phím; ký hiệu phân biệt quân ngoài màu; xử lý bỏ ván; README hướng dẫn chạy                                                                                                                                                                                                                                                                                                                                                                                                         | Bạn bè dùng thử trên điện thoại và laptop không cần hướng dẫn thêm; Lighthouse Accessibility ≥ 90                                              | M   |

Về cờ vua ở M7: quyết định **tự viết luật hay bọc `chess.js`** (giấy phép BSD) ngay đầu mốc. Đề xuất bọc `chess.js` cho nhanh, miễn là chạy được ở server và trong `GameDefinition`.

### 6.3 Sau MVP (sẽ chi tiết hoá sau)

- **Hộp công cụ** (ngoài các mốc, xong 07/11/2026, `add-toolbox-card-score`): Ghi điểm đánh bài, xem §10.
- **Trò giải đố** (ngoài các mốc, đưa lên sớm từ "Sau đó", 12/11/2026, `add-jelly-gather-puzzle`): Gom thạch, xem §10.
- **v1**: chủ phòng chọn biến thể luật cá ngựa; Cờ tướng, Ô ăn quan, Reversi, Cờ gánh, Cờ đam, Cờ cối xay, Ô vuông; đồng hồ (QStash), đề nghị hoà, QR, chat (đã mở rộng thành chat đầy đủ, `add-room-chat`); PWA, thống kê, replay.
- **v2**: phòng cố định của nhóm, bảng thành tích nhóm, spectator; theme (gỗ, tre, giấy dó); Cờ vây; game tự thiết kế (Cờ rào đã làm sớm, `add-fence-race-game`, xem §10).
- **Sau đó**: AI cờ vua, puzzle, tutorial, giải đấu trong nhóm.

## 7. Chiến lược test

| Tầng               | Công cụ                                             | Nội dung                                                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hợp đồng game      | Vitest, hàm dùng chung `describeGameContract(game)` | Áp cho **mọi** game: tự chơi hàng trăm ván ngẫu nhiên (seed cố định) và kiểm tra mọi ván đều kết thúc, `applyMove` không làm đổi state cũ, nước đi trong `legalMoves` luôn áp dụng được, serialize rồi đọc lại cho kết quả như cũ |
| Luật riêng         | Vitest                                              | Kịch bản cụ thể từng luật: thắng caro theo hàng chéo, ra quân khi gieo 6, nhập thành, perft cờ vua…                                                                                                                               |
| AI                 | Vitest                                              | Thế cờ "thắng trong 1 nước" thì AI phải đi đúng; không vượt giới hạn thời gian                                                                                                                                                    |
| Logic phòng online | Vitest + `RoomStore` bộ nhớ                         | Vào phòng, đủ người, đi sai lượt, đi sai luật, hai nước đi tới cùng lúc, kết nối lại, đầu hàng                                                                                                                                    |
| Giao diện          | Vitest + Testing Library (chọn lọc)                 | Component dùng chung trong `packages/ui`, các khung ở `features/play`                                                                                                                                                             |
| End-to-end         | Playwright                                          | Menu → chơi cùng máy; 2 trình duyệt chơi online qua link; ngắt mạng rồi nối lại                                                                                                                                                   |

Tiêu chí: `engine`, `games`, `protocol`, `room-service` có độ phủ test ≥ 90%; phần giao diện không đặt chỉ tiêu cứng.

## 8. Tiêu chí hoàn thành chung (Definition of Done)

Mọi mốc chỉ coi là xong khi:

- CI xanh: lint, typecheck, test, build.
- Có test cho phần luật/logic mới.
- Bản preview trên Vercel chạy được, đã thử trên một điện thoại thật.
- Không vi phạm quy tắc chiều phụ thuộc giữa các package.
- Cập nhật README/plan.md nếu thay đổi cách chạy hoặc quyết định kỹ thuật.

## 9. Rủi ro của kế hoạch

| Rủi ro                                                                            | Ảnh hưởng                                                 | Cách xử lý                                                                                                                                                    |
| --------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WebSocket của Vercel không ổn trên gói Hobby (giới hạn thời gian, chạy local khó) | Chậm mốc M4                                               | Đã thử ở M3: dùng được, kết nối bị cắt mỗi ~5 phút nên client phải tự nối lại. Kiến trúc `Transport` + `RoomStore` vẫn cho phép đổi hạ tầng mà không sửa game |
| Kết nối WebSocket giữ instance sống, tốn hạn mức bộ nhớ (GB-giờ) của Hobby        | Hết hạn mức miễn phí giữa tháng, Vercel tạm dừng function | Theo dõi tab Usage sau M4; dồn kết nối vào ít instance; nếu thiếu thì chuyển realtime sang Cloudflare Durable Objects (gói miễn phí, có ngủ đông)             |
| TypeScript 7 / công cụ mới chưa tương thích nhau                                  | Lỗi build, lint                                           | Ghim TypeScript 6.0; nâng cấp có chủ đích qua Renovate                                                                                                        |
| Luật cờ vua nhiều trường hợp hiếm                                                 | Bug khó thấy                                              | Test perft với thế cờ chuẩn; cân nhắc bọc `chess.js`                                                                                                          |
| Luật cá ngựa phức tạp, dễ sai khi kết hợp nhiều biến thể                          | Bug, tranh cãi khi chơi                                   | Mỗi điểm luật một test; tự chơi 1000 ván ngẫu nhiên; MVP chỉ bật bộ luật phổ biến                                                                             |
| Làm ngoài giờ, dễ dàn trải                                                        | Không bao giờ ra bản đầu                                  | Bám thứ tự mốc; mỗi mốc có kết quả chơi được; gửi bạn thử từ sau M4                                                                                           |

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

- Đã push lên GitHub; CI chưa chạy được vì tài khoản GitHub bị khoá do vấn đề thanh toán (job không được khởi động). Mở khoá ở GitHub → Settings → Billing rồi chạy lại CI.
- ~~Nối repo với Vercel~~ — xong 01/11/2026: project `board-games` (Root Directory `apps/web`, biến `ENABLE_EXPERIMENTAL_COREPACK=1` cho Production và Preview), bản đầu chạy trên https://board-games-swart.vercel.app (build dùng pnpm 12.8.1, Next 16.4.3; đấu với máy chạy trong Web Worker). Bản đầu được deploy bằng CLI; từ 02/11/2026 mỗi lần push `main` tự deploy qua Git (function ở `sin1`).

### M1. Engine + game mẫu cùng máy (30/10/2026)

Đã xong, qua 2 change OpenSpec (đã archive):

- `add-game-engine`: `packages/engine` — hợp đồng `GameDefinition`, phiên chơi (hoàn tác/làm lại), biên bản ván và phát lại từ dữ liệu không tin cậy, ngẫu nhiên đi qua rng được truyền vào, bộ kiểm tra hợp đồng `@board-games/engine/testing` (14 kiểm tra). Spec: `openspec/specs/game-engine/`.
- `add-tictactoe-game`: Tic-tac-toe trong `packages/games`; registry hai tầng (`GAMES` + `GAME_ENTRY_LOADERS`, giao diện nạp lười); menu sinh từ registry với lối "Tiếp tục"; màn hình chơi cùng máy `/play/<mã game>` qua `Transport`/`LocalTransport`; tự lưu ván dở vào IndexedDB; `ConfirmDialog` trong `packages/ui`; bản dịch vi/en/ja. Spec: `openspec/specs/{tictactoe,game-menu,local-play}/`.
- Mỗi change đều qua 2 lượt review (senior dev, săn bug) và một lượt xử lý kết quả review trước khi archive.

### M2. AI (30/10/2026)

Đã xong, qua 2 change OpenSpec:

- `add-game-ai` (đã archive): `packages/engine` có `chooseMove` (minimax góc nhìn ghế máy + alpha-beta + expectimax, đào sâu dần, giới hạn thời gian) và mức `AI_LEVEL` Dễ/Vừa/Khó; Tic-tac-toe có `evaluate` và `supportsAI: true`. Spec: `openspec/specs/game-ai/`.
- `add-play-vs-ai` (đã archive): màn hình bắt đầu ván `/play/<mã game>` (`features/setup`: chế độ, mức độ, ai đi trước, nhớ lựa chọn gần nhất, tiếp tục ván dở của game); màn hình chơi theo chế độ `/play/<mã game>/{local,ai}`; transport cục bộ theo ghế (người/máy) thay cho `AITransport` riêng; máy nghĩ trong Web Worker (`ai-worker`, dự phòng trên luồng chính); ván dở lưu theo game × chế độ, ván M1 được chuyển sang khoá mới; menu có mục "Tiếp tục ván dở"; `RadioGroup` trong `packages/ui`; bản dịch vi/en/ja; E2E cho đấu với máy, màn hình bắt đầu ván, ván lưu ở bản trước và trang lỗi tải game; máy báo nước vừa đi và ô vừa đánh được đánh dấu. Spec: `openspec/specs/{game-setup,play-vs-ai}/`, cập nhật `local-play`, `game-menu`.
- Sửa lỗi phát hiện khi viết E2E: phần chơi của game không tải được thì màn hình kẹt ở "Đang tải…" và tải lại chunk liên tục, không bao giờ hiện trang lỗi; nay lần tải lỗi được giữ cho tới khi người chơi bấm "Thử lại".

### M3. Thử nghiệm online trên Vercel (02/11/2026)

**Quyết định: giữ WebSocket của Vercel + Upstash Redis, function chạy ở Singapore (`sin1`).** Không cần phương án dự phòng.

Cách đo: route thử `/api/probe/ws` (`upgradeWebSocket` + `redis` pub/sub) và script `scripts/m3-probe/probe.mjs`, nằm trên nhánh `spike/m3-online-probe` (không merge). Deploy dạng Preview trên Vercel Hobby; Redis là Upstash gói Free, vùng Singapore, tạo qua Vercel Marketplace (tắt tự nâng gói). Đo từ một máy ở Việt Nam: mỗi vùng một kết nối ping 2 giây/lần trong 12 phút, và 6 kết nối cùng phòng, mỗi kết nối phát 5 giây/lần trong 3 phút.

| Số đo                                                | Function ở `iad1` (Mỹ)                                   | Function ở `sin1` (Singapore)        |
| ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------ |
| Kết nối sống được                                    | 308 giây, rồi bị cắt với mã `1006` (không có khung đóng) | 310 giây, mã `1006`                  |
| Nối lại (gồm bắt tay TLS)                            | 1,7–1,9 giây                                             | 0,33 giây                            |
| Độ trễ khứ hồi ping (p50 / p95 / max)                | 235 / 244 / 542 ms                                       | **69 / 78 / 108 ms**                 |
| Pub/sub: tin tới nơi                                 | 1080/1080, 648 tin qua instance khác                     | 1080/1080, 576 tin qua instance khác |
| Pub/sub: thời gian từ gửi tới nhận (p50 / p95 / max) | 456 / 479 / 1151 ms                                      | **69 / 81 / 174 ms**                 |
| Số instance cho 6 kết nối                            | 2                                                        | 2                                    |

Rút ra cho M4:

- **Vùng**: function của project đã đặt ở `sin1` từ 02/11/2026 (Settings → Functions → Function Region). Ở `iad1` mỗi tin phải vòng qua Mỹ và Redis Singapore, chậm gấp ~6 lần. Đặt `regions` trong `apps/web/vercel.json` không có tác dụng khi deploy bằng CLI từ gốc monorepo; cờ `vercel deploy --regions sin1` thì có.
- **Kết nối bị cắt mỗi ~5 phút** (giới hạn 300 giây của Hobby), server không kịp gửi khung đóng → client coi `1006` là chuyện bình thường, nối lại ngay và tải các nước còn thiếu theo số thứ tự; không dựa vào sự kiện đóng phía server để dọn dẹp.
- **Kết nối dồn vào cùng instance**: Vercel đặt nhiều WebSocket vào một instance, nhưng một phòng vẫn có thể nằm trên 2 instance → bắt buộc pub/sub qua Redis. Bản thử mở một kết nối Redis subscriber cho mỗi WebSocket; M4 nên dùng một subscriber mỗi instance cho mọi phòng.
- **Chạy local**: `vercel dev` chạy được route WebSocket (độ trễ 0–5 ms); `next dev` thì không.
- **Lỗi đã gặp khi dựng**: commit có email tác giả không thuộc tài khoản Vercel thì deploy Hobby bị **Blocked** → repo đặt `git config --local user.email` là email noreply của GitHub (`178360649+DevViTien@users.noreply.github.com`): GitHub chặn push lộ email riêng tư, còn Vercel vẫn nhận ra tác giả là `DevViTien`. Bản Preview có Deployment Protection → script đo cần khoá Protection Bypass for Automation (đã thu hồi sau khi đo).
- **Chi phí**: mọi thứ trên gói miễn phí, không nhập thẻ. Hạn mức cần theo dõi: Vercel Hobby (bộ nhớ đã cấp 360 GB-giờ, CPU 4 giờ, 1 triệu lần gọi mỗi tháng) và Upstash Free (500 nghìn lệnh/tháng). WebSocket giữ instance sống suốt thời gian có người kết nối, nên **bộ nhớ GB-giờ** là hạn mức dễ chạm nhất. Ước tính, cần kiểm lại: với bộ nhớ mặc định 2 GB thì được khoảng 180 giờ instance mỗi tháng, tức ~6 giờ/ngày có người chơi online. Nhóm nhỏ thì đủ; nếu thiếu thì chuyển realtime sang Cloudflare Durable Objects (gói miễn phí, ngủ đông khi không có tin).

### M4. Phòng online (03/11/2026)

Đã xong, qua 2 change OpenSpec:

- `add-online-rooms` (đã archive): phía server. `packages/protocol` (thông điệp `create`/`join`/`sit`/`move`/`rematch`/`ping` và `created`/`room`/`rejected`/`error`/`pong` kiểm bằng zod ở cả hai phía, mã phòng 6 ký tự không có 0/O/1/I/L, `playerNameSchema`, bảng mã lỗi chung); `room-service` làm trọng tài (kiểm lượt, vị trí ván và luật bằng chính code của `packages/games`, xoay ghế khi chơi lại); `RoomStore` bộ nhớ và Redis (một HASH mỗi phòng, ghi có kiểm phiên bản + `PUBLISH` trong một script Lua, TTL 7 ngày, một subscriber mỗi instance, đọc lại phòng khi kênh nối lại, mọi thao tác có hạn 5 giây); kết nối WebSocket dùng chung cho route `/api/realtime` trên Vercel và server realtime chạy ở máy (`pnpm dev`, E2E). Spec: `openspec/specs/online-rooms/`. Chạy thử trên Vercel Preview (`sin1`, Upstash thật) bằng script khói: 12/12 bước đạt, nước đi tới người kia sau 69–73 ms.
- `add-online-play`: phía client. Tên tạm + `playerId` trong `localStorage` (`features/identity`); chế độ "Online" ở màn hình bắt đầu ván với nút "Tạo phòng"; trang phòng `/room/<mã>` (hỏi tên lần đầu, sảnh chờ có link mời để sao chép/chia sẻ, chỉ ngồi ghế khi bấm "Vào chơi", trang lỗi khi phòng không tồn tại, đã đủ người, app vừa cập nhật hay dữ liệu hỏng); ô "Vào phòng" bằng mã trên menu; `RoomConnection` tự nối lại có giãn cách (tối đa 10 giây), ping phát hiện kết nối nửa sống, tạm ngắt khi tab ẩn từ 60 giây hoặc 10 phút không hoạt động (nút "Tiếp tục"); transport online dựng ván từ biên bản server gửi, dùng chung `PlayScreen` (lời báo theo "bạn" và tên đối thủ, không hoàn tác, "Chơi lại" sau khi có kết quả, dòng "Đang kết nối lại…" chỉ hiện khi mất kết nối quá 1,5 giây); không hiển thị trước nước đi (idea.md §6.3). `packages/ui` thêm `Input` và token `danger`. E2E hai trình duyệt: tạo phòng, mở link, chơi hết ván, chơi lại đổi phe, mất mạng rồi có lại, tải lại trang, đổi tên giữ ghế, phòng đầy, phòng không tồn tại, mã phòng ở menu. Spec: `openspec/specs/{online-play,player-identity}/`, cập nhật `game-setup`, `game-menu`.

Còn lại:

- Chơi thử thật giữa hai thiết bị (một điện thoại) qua link mời trên Production sau khi merge vào `main` (Preview có Deployment Protection chặn thiết bị chưa đăng nhập Vercel); ghi kết quả vào đây.
- Theo dõi tab Usage của Vercel (GB-giờ) và Upstash (số lệnh) sau khi bạn bè bắt đầu chơi.

### M5. Cờ caro (03/11/2026)

Đã xong, qua 2 change OpenSpec:

- `add-caro-game` (đã archive): luật Cờ caro trong `packages/games/src/caro/` (bàn 15×15 / 19×19, luật thắng "chặn hai đầu" và "tự do", mép bàn không chặn, hoà khi đầy bàn, hàng thắng); hook `candidateMoves` trong engine cho game bàn lớn (máy chỉ xét ô gần quân, luôn giữ ô thắng/chặn ngay, kể cả nước ngẫu nhiên của mức Dễ) và kiểm tra hợp đồng `candidate-moves`; máy Cờ caro (`evaluate` theo cửa sổ 5 ô, tôn trọng luật đang dùng); bàn `role="grid"` (lưới SVG + nút, roving tabindex, chạm hai lần khi ô < 24 px); `GameUI.useMoveLabel` nhận thêm `state`; menu có thẻ Cờ caro (~10 phút); E2E cùng máy, đấu với máy mức Vừa, online. Số đo thời gian máy ở design của change.
- `add-game-options` (code xong, archive trong cùng PR sau review): chọn tuỳ chọn luật chung cho mọi game khai báo `optionChoices` (engine: `listOptionChoices`, kiểm tra hợp đồng `option-choices`, 16 kiểm tra); Cờ caro cho chọn bàn 15×15 / 19×19 và luật "chặn hai đầu" / "tự do" ở màn hình bắt đầu ván, mọi chế độ kể cả tạo phòng online; tuỳ chọn đi theo đường dẫn bắt đầu ván (`?options=<JSON>`), transport, ván đã lưu (định dạng lưu không đổi), "Ván mới"/"Chơi lại" và được nhớ cùng lựa chọn gần nhất; luật đang dùng hiện ở màn hình chơi, mục ván dở trên menu và màn hình bắt đầu ("Cờ caro · Với máy · Khó · 19×19 · Tự do"), sảnh chờ phòng online ("Luật: 19×19 · Tự do"). Tic-tac-toe không đổi. E2E: 19×19 + "tự do" cùng máy (tải lại, ván mới, menu, lựa chọn được nhớ), bàn 19×19 ở khung 360 px (chạm hai lần), máy mức Khó trên 19×19 (lượt sau ~1,5 giây ở cả hai cấu hình Playwright, số đo ở design §8), phòng online 19×19 "tự do" tới khi thắng và chơi lại.

Còn lại:

- Chưa thử trên thiết bị thật: bàn 19×19 và chạm hai lần trên điện thoại, thời gian máy mức Khó trên CPU điện thoại (E2E "mobile" chỉ mô phỏng khung hình và cảm ứng trên máy tính); chơi thử Cờ caro online giữa hai thiết bị trên Production. Ghi kết quả vào đây.

### M6. Cờ cá ngựa (03/11/2026)

Qua 3 change OpenSpec theo thứ tự `add-multiplayer-setup` → `add-ludo-game` → `add-room-ai-seats`:

- `add-multiplayer-setup` (đã archive): phần dùng chung cho game 2–4 người có xúc xắc, chưa biết gì về Cờ cá ngựa. Nhóm "Số người chơi" ở màn hình bắt đầu ván cho game có `meta.players.min < max` (mọi chế độ, nhớ cùng lựa chọn gần nhất, đường dẫn `players=<n>`, `createRoom` gửi `playerCount`); transport cục bộ tạo ván N người; đấu với máy = một người + máy ở mọi ghế còn lại ("Ngẫu nhiên" rút đều vị trí lượt); lời báo nêu tên ghế khi có từ hai máy và nói mọi nước của máy; nhịp máy trong game có xúc xắc (`AI_SETTLE_DELAY_MS`, `AI_RESULT_DELAY_MS`); hoàn tác không vượt qua lần gieo; engine: lần gieo bắt buộc ngay sau một nước quyết định không tốn độ sâu; game mẫu `dice-race`, `roll-choose` export qua `@board-games/engine/testing`; `GameUI.usePlayerLabel(player, state)`, `useMoveLabel` trả cụm hành động. Tic-tac-toe, Cờ caro không đổi (E2E cũ xanh không sửa).
- `add-ludo-game` (đã archive): luật Cờ cá ngựa trong `packages/games/src/ludo/` theo bộ luật người dùng chốt (một xúc xắc, ra quân bằng 6, gieo 6 được gieo thêm kể cả khi không đi được, không vượt, đá, gieo 1 nhảy tới chân chuồng kế tiếp, lên chuồng theo bậc, thắng khi chiếm bậc 3–6); `LudoOptions` có bốn biến thể nhưng ván chỉ nhận bộ mặc định (biến thể chạy qua định nghĩa chỉ cho test); máy dùng `chooseMove` chung với `evaluate` theo trọng số; bàn SVG chữ thập tự vẽ (màu + ký hiệu, nút "Gieo xúc xắc", nhóm "Chọn ngựa", danh sách vị trí cho trình đọc màn hình, hiệu ứng xúc xắc lăn và ngựa đi từng ô, tắt khi giảm chuyển động); token `piece-*` và keyframes trong `packages/ui`; thẻ menu chơi được; online giữa người với người chạy ngay (server gieo). Số đo: 1000 ván tự chơi đều kết thúc (file test ~6,6 s; ván ngẫu nhiên 4 người trung bình 1 149 nước, dài nhất 2 104, biên bản ~76 KB, `fromRecord` ~15 ms); máy Vừa ~0,5 ms/nước, Khó đạt độ sâu ≥ 5 trong 1,5 s ở 2 và 4 người; một vòng ba máy mức Dễ 2,9–5,9 s trong E2E (dài hơn khi máy gieo 6 rồi gieo thêm) (chi tiết ở design §5–§8 của change).
- `add-room-ai-seats` (code xong, archive trong cùng PR sau review): phòng online 2–4 ghế có chủ phòng (người tạo, `hostId` chỉ ở server, `RoomView.host` theo ghế hiện tại); chủ phòng đánh dấu ghế trống là "Máy" ở sảnh chờ (`ai-seat { seat, on }`, trước nước đầu của ván, chỉ phòng từ ba ghế của game có máy — phòng hai ghế không có ghế máy), ghế trống cuối cùng thành máy là bắt đầu ván; server chơi thay ghế máy bằng `chooseMove` mức Vừa với rng của server ngay trong lần ghi đã trao lượt (không hẹn giờ, không thêm lệnh Redis), chốt an toàn 200 nước mỗi lần ghi, `join` đi tiếp phòng dừng ở lượt máy; mã lỗi mới `not-host`, `seat-taken`, `not-ai-seat`, `game-started`, `invalid-seat` (không làm nối lại); `PROTOCOL_VERSION` 2, `STORED_ROOM_FORMAT` 2 vẫn đọc được phòng định dạng 1 (ván dở không mất khi deploy); transport online hiện lần lượt các nước nhận cùng lúc theo nhịp máy cục bộ (nút khoá tới khi hiện xong; vào phòng/tải lại/nối lại hiện ngay); lời báo nêu mọi nước không đi từ thiết bị này kèm lượt kế tiếp ("Minh vừa gieo được 6. Đang chờ Minh…"), ván mới máy đi trước; "Online"/"Chơi lại" dựa vào việc ván là online (một người + ba máy). E2E: phòng 3 ghế hai trình duyệt + một máy, một người + ba máy, tab cũ nhận `outdated-client` không tự tải lại (cả hai cấu hình Playwright). Chi phí ước tính ở design §6 theo số đo biên bản ~76 KB (1 người + 3 máy ~11 MB/ván tới client, ~1/4 số lần ghi của ván 4 người).
- M6 xong về code qua ba change; tiếp theo: **M6.5. Thiết kế lại giao diện**, rồi M7. Cờ vua.
- Còn lại: đo trên Vercel Preview (Upstash thật) thời gian từ nước của người tới khi có nước máy, số lệnh Redis và dung lượng một ván 1 người + 3 máy (việc đo trên Preview của `add-room-ai-seats`, chưa làm); chơi thử Cờ cá ngựa trên điện thoại thật và online giữa hai thiết bị trên Production (cỡ ô ~22 px, nhịp máy, theo dõi tab Usage của Upstash/Vercel với ván dài). Ghi kết quả vào đây.

### M6.5. Thiết kế lại giao diện (03/11/2026)

Khảo sát giao diện sau M6 (ảnh chụp mọi màn hình, sáng/tối, điện thoại/máy tính):

- Bảng màu một sắc độ (mọi thứ quanh hue ~250); màu nhấn trùng màu quân xanh dương của Cờ cá ngựa.
- Menu không có bản sắc của từng game; bàn cờ không có chất liệu (Cờ caro trông như bảng tính).
- Kết thúc ván phẳng: Tic-tac-toe không vẽ hàng thắng, không có khoảnh khắc ăn mừng.
- Không có bảng người chơi/lượt; khung xúc xắc Cờ cá ngựa mang màu người vừa gieo, không phải người sắp gieo.
- Thang chữ phẳng (gần như mọi chữ `text-sm font-medium`); component chung chung (radio đã chọn trông như nút hành động chính).
- Tràn trên điện thoại: danh sách chọn ngựa của Cờ cá ngựa, đầu trang Cờ caro.
- Trạng thái lỗi/rỗng sơ sài; phòng không tồn tại vẫn hỏi tên trước khi báo (đã sửa ở `ask-name-in-lobby`).
- Giữ: Be Vietnam Pro + Noto Sans JP, kiến trúc token, vòng `focus-visible`, `RadioGroup` dùng radio gốc, nút `aria-disabled`, roving tabindex, ký hiệu quân ●■▲◆, `motion-reduce`, `<dialog>` gốc.

Quyết định về công cụ (chưa đổi code sản phẩm):

- **Dùng**: skill `frontend-design` (chọn hướng hình ảnh, làm mockup), `web-design-guidelines` (rà giao diện; ghim bản quy tắc), `vercel-react-best-practices` và `vercel-composition-patterns` (khi code), vendored trong `.claude/skills/` (nguồn, phiên bản ở `.claude/skills/VENDORED.md`); skill dự án `board-games-ui` là nguồn chân lý và thắng các skill trên khi mâu thuẫn. Thêm `pnpm ui:shots` (Playwright, cấu hình riêng `apps/web/playwright.shots.config.ts`, cổng 3200/3201) để chụp màn hình chính từ bản build local.
- **Không dùng**: UI UX Pro Max, Taste, Board Game UI skill, trình cài Impeccable — trùng với các skill trên, kéo theo kho dữ liệu hay script cài đặt lớn, hoặc đề xuất chung chung không hợp bất biến của repo (token, i18n, a11y).
- **Hoãn**: thư viện `motion` (CSS + Web Animations API đủ cho các khoảnh khắc đã định và nằm trong nhịp máy `ai-timing.ts`; xét lại nếu cần chuỗi hiệu ứng phức tạp), `shadcn init` (component tự viết trên `cva()` đã đủ; xét lại khi cần component lớn như popover, tooltip).
- **Không cần**: Zustand (transport đã là kho giữ ván qua `useSyncExternalStore`; bỏ khỏi §2).
- Hướng thiết kế (chốt bằng mockup ở change `add-design-foundation`): khung chung + bản sắc từng game qua biến `--game-*`. Đây là bước tiếp của quyết định "tối giản phẳng trước, theme sau" (idea.md §9 mục 5): khung vẫn tối giản, nhưng mỗi game có chất liệu riêng.
- `add-design-foundation` (đã archive): bảng màu mới (nền giấy ấm, màu nhấn tím khác hue mọi màu quân, token `success`/`warning`/`celebration`, màu quân dân gian kèm `-line`/`-ink`/`-hover`), vòng focus hai lớp, thang chữ/bán kính/bóng, component `Button`/`RadioGroup` segmented/`ToggleGroup`/`Input`/`Card`/`Badge`/`StateScreen`/`LogoMark` (bỏ `Select`), hợp đồng `--game-*` + `games/<id>/theme.css` + `Artwork`, chọn giao diện Sáng/Tối/Theo hệ thống (cookie `theme`, `data-theme` từ HTML server), menu mới (hero, thẻ có hình và lối "Online" → `?mode=online`), màn hình bắt đầu ván và các màn hình đang tải/lỗi/không tìm thấy mới. Tỉ số tương phản ở design §2 của change, kiểm bằng test. Tiếp theo: `redesign-game-boards`, rồi `add-game-feedback`.
- `redesign-game-boards` (đã archive): màn hình chơi mang `data-game` (token `games/<id>/theme.css`), thanh trên "← Về menu" + tên game + chip; `BoardProps.layout({ board, controls })` — bàn dựng phần bàn và phần điều khiển, `PlayScreen` đặt vào một lưới (một thứ tự DOM; từ 1024 px bàn bên trái, cột bên phải; bàn cỡ `min(var(--board-room), <cỡ tối đa của game>)`), ở 1280 × 800 không cần cuộn (E2E `play-layout.spec.ts`; cấu hình Playwright "desktop" nay 1280 × 800). Tic-tac-toe "sticker" (X cam, O tím đậm, ô viền tím, dấu nước vừa đi đứt nét bên trong ô); Cờ caro "vở ô li" (lề đỏ, đường kẻ xanh mỗi 5 đường đậm hơn, X/O nét bút bi, vòng đứt nét nước vừa đi, quân xem trước nét đứt trên nền gợi ý, hàng thắng gạch màu bút người thắng + khoanh); Cờ cá ngựa "tranh dân gian" (giấy điệp, khối chuồng màu, chuồng của người đang đến lượt viền mực + vòng đứt, ngựa có viền và ký hiệu mực, xúc xắc và nút gieo theo màu người đang đến lượt, mặt chờ, chip "Lượt trước", lựa chọn ngựa lưới 2 cột). Tiêu điểm sau khi gieo/đi bằng ref. Tỉ số ở design §2–§4 của change, kiểm bằng `games/theme-css.test.ts`. Tiếp theo: `add-game-feedback`.
- `add-game-feedback` (đã archive): bảng người chơi gọn (hàng ≤ 40 px, cột bên từ 1024 px, ô 1–2 cột trên điện thoại; tên theo chế độ "X"/"Bạn · X"/"Máy · O"/"Minh · O", dòng phụ loại ghế, mức máy, tóm tắt của game; chip "Đến lượt"/"Thắng"; online chip "Đã kết nối"/"Mất kết nối" sau 1,5 s), một phần tử `role="status"` cố định trong khung đổi biến thể thành thẻ kết quả (chip "Kết thúc", câu kết quả, dòng giải thích `useResultDetail`, nút "Ván mới"/"Chơi lại" duy nhất), confetti khi người ở đây vừa thắng (không gắn khi giảm chuyển động), hàng thắng Tic-tac-toe (nét mực có viền giấy, vẽ dần 300 ms), "Đang nghĩ…" + `aria-busy` khi máy nghĩ, lý do nút "Hoàn tác"/"Làm lại"/"Gieo xúc xắc" không bấm được (từ dữ liệu snapshot sẵn có). `GameUI` thêm `useSeatSummary?`, `useResultDetail?`, `SeatMark?`; `BoardProps.waitingFor?`. Engine, luật, transport, giao thức, server không đổi. E2E 1280 × 800 Cờ cá ngựa 4 người với bốn lựa chọn (cùng máy và phòng online giả).
- `ask-name-in-lobby` (code xong 03/11/2026, archive trong cùng PR sau review): người mở link mời lần đầu được báo ngay phòng không tồn tại / đã đủ người / ứng dụng vừa cập nhật, không phải nhập tên trước. Lời chào `join` có `name` tuỳ chọn (`PROTOCOL_VERSION` giữ 2, §3.4); `room-service.join(code, playerId, name | null)` không ghi gì cho người chưa có ghế và giữ tên của người đã ngồi khi không kèm tên. Trang phòng bỏ bước "Chọn tên để vào phòng": ghim một mã người chơi cho cả phiên trang (mã đã nhớ, hoặc `guestPlayerId()` không lưu, giữ qua "Thử lại"), sảnh chờ hỏi tên bằng ô tên trống có focus sẵn và gợi ý `Room.nameHint` (`aria-describedby`); "Vào chơi" lưu tên cùng mã đó chỉ khi trình duyệt chưa nhớ danh tính nào hoặc nhớ đúng mã này (`saveName(name, sessionPlayerId)` không thay mã của tab khác), và luôn ghim mã + tên vào `sessionStorage` của tab cho phòng đó (`pinRoomIdentity`), nên tải lại tab vẫn đúng ghế. Test: giao thức, room-service, kết nối (tab cũ gửi tên vẫn chạy), `RoomRoute` hai tab dùng chung `localStorage`, E2E người lạ gặp phòng không có / đủ người / còn ghế và hai tab chưa có tên cùng vào một phòng Cờ cá ngựa 3 ghế rồi mất mạng (cả hai cấu hình Playwright); ảnh `ui:shots` `11-room-lobby-ask-name`, `11b-room-lobby-name-refused`, `12-room-not-found`.
- M6.5 xong về code qua bốn change (đã xem ảnh `pnpm ui:shots` sáng/tối × 390/1280; chưa thử trên điện thoại thật). Tiếp theo: **M7. Cờ vua**.

### M7. Cờ vua (04/11/2026)

Qua 2 change OpenSpec theo thứ tự `add-chess-rules` → `add-chess-board`:

- `add-chess-rules` (code xong 04/11/2026, archive trong cùng PR sau review): luật Cờ vua trong `packages/games/src/chess/` bọc `chess.js` 1.4.0 (ghim; adapter `chess-js.ts` dùng `_moves` nội bộ qua kiểu `ChessInternals`, kiểm hình dạng lúc chạy, test đối chiếu với `moves({ verbose: true })`); state thuần (`fen`, `positions` từ nước Tốt/ăn quân gần nhất, `san`, `drawClaim`); hoà theo FIDE: nước `{ type: "claim-draw" }` khi lặp ba lần hoặc 50 nước ở thế hiện tại, tự động khi lặp năm lần / 75 nước, hết nước đi và không đủ quân ngay, chiếu hết thắng cả ở nước thứ 75; `moveKey` UCI kiểm dạng; hàm cho giao diện `chessBoard`, `chessKingInCheck`, `isChessDrawClaim`. Chỉ lộ qua subpath `@board-games/games/chess`, **chưa** vào `GAMES`/`GAME_IDS` (menu vẫn "Sắp có", `chess.js` chưa vào bundle nào). Số đo: perft khớp số công bố (mở đầu d4, Kiwipete d3, thế 3 d4, thế 4/4 đối xứng/5/6 d3; file ~1,9 s); 40 ván ngẫu nhiên trung bình 359 nửa nước, dài nhất 616 (biên bản 20,4 KB, `fromRecord` ~89 ms); `legalPieceMoves` ~25–64 µs/thế (chi tiết ở design §2, §4, §6 của change).
- `add-chess-board` (code xong 04/11/2026, archive trong cùng PR sau review): Cờ vua vào `GAMES`/`GAME_IDS`, registry, `GAME_ARTWORK`; menu bốn game chơi được, không còn "Sắp có" (`PLANNED_GAMES = []`, nhánh "Sắp có" vẫn test qua `MenuPage` `cards`). Màn hình bắt đầu ván chỉ "Cùng máy"/"Online". Bàn xanh–kem (`games/chess/theme.css`), bộ quân **"staunty"** của sadsnake1 (Lichess, CC BY-NC-SA 4.0; 12 SVG nguyên byte ở `apps/web/public/pieces/staunty/` từ `lichess-org/lila@9af5b51f`, ghi công trong `LICENSE.txt` và `apps/web/public/third-party-licenses.txt` cùng BSD-2 của `chess.js`), toạ độ HTML trong ô sát mép, hai thanh ghế trên/dưới bàn (`BoardParts.seatOrder`, `SeatBar` tách từ `PlayerPanel`), chọn/đi quân bằng chuột, chạm, bàn phím (roving tabindex, mũi tên theo hướng bàn), lời báo lựa chọn, giữ lựa chọn khi phòng cập nhật cùng thế (`fen|san.length`), bộ chọn phong cấp `<dialog>`, "Đòi hoà" khi đòi được, "Lật bàn", chữ báo chiếu, sổ ghi FAN, nhãn nước của đối thủ, dòng giải thích bảy lý do kết thúc, quân trượt 180 ms (tắt khi giảm chuyển động). `@board-games/games/ai` (`AI_GAMES`) cho Worker. Bundle (gzip, `next build` trước/sau): `/` và `/play/[gameId]` không đổi, `/play/[gameId]/[mode]` +0,6 KB, `/room/[code]` +0,5 KB; `chess.js` + bàn chỉ ở chunk màn hình Cờ vua (19,8 KB gzip) và server; chunk AI Worker không có `chess.js` hay luật Cờ vua.
- M7 xong về code qua hai change. Còn lại: thử trên điện thoại thật (một ván ~80 nước mỗi bên, phát lại khi phòng đổi) và online giữa hai thiết bị thật. Tiếp theo: **M8**.

### M8. Hoàn thiện MVP (04/11/2026)

Qua 3 change OpenSpec theo thứ tự `add-resign-and-abandon` → `add-rules-pages` → `polish-accessibility-and-mobile`:

- `add-resign-and-abandon` (code xong 04/11/2026, archive trong cùng PR sau review): engine có kết thúc ngoài luật (`concede`, `ENDING_REASON`, `GameRecord.ending` tuỳ chọn, RECORD_VERSION giữ 1; kiểm tra hợp đồng `reserved-reasons`); luật chung `packages/protocol/leaving.ts`; thông điệp `resign`, `claim-abandoned`, mã `not-abandoned`, `PROTOCOL_VERSION` 3, `RoomView.turnIdleMs`, ghế `standIn`; server `STORED_ROOM_FORMAT` 3 với `turnStartedAt` (đọc được định dạng 1–2), máy chơi thay ghế `standIn` như ghế máy, "Chơi lại" trả ghế; client: `RoomConnection.turnClock` (giờ nhận phòng − `turnIdleMs`, phòng cùng revision chỉ cập nhật đồng hồ), ảnh chụp `resign`/`turn`, sự kiện `claim-refused`; màn hình chơi: nút "Đầu hàng" + hộp thoại (online, với máy; cùng máy không có), dòng chờ từ 1 phút, nút xử từ 5 phút, lời nhắc người đến lượt từ 4 phút, ghế "Máy chơi thay", "Máy (thay Lan) thắng!", dòng giải thích `Play.ending.*`. Không hẹn giờ, không dịch vụ mới (bỏ QStash, idea.md §6.3). E2E `online-abandon.spec.ts` (server realtime E2E với `REALTIME_ABANDON_AFTER_MS=3000`, trình duyệt chỉ `page.clock.setSystemTime`). Còn lại: thử trên thiết bị thật cùng `polish-accessibility-and-mobile`.
- `add-rules-pages` (code xong 04/11/2026, archive trong cùng PR sau review): trang `/rules/<id>` cho bốn game (Server Component, không có chunk client riêng), nội dung ở `Rules.<id>` vi/en/ja theo `openspec/specs/{tictactoe,caro,ludo,chess}` và mục chung đầu hàng/bỏ ván (Cờ cá ngựa thêm "Máy chơi thay"), `games/<id>/Rules.tsx` + `GAME_RULES`, 13 hình SVG tự vẽ chỉ dùng token (hình Cờ cá ngựa vẽ từ `board-layout.ts`, Cờ vua dùng file "staunty" nguyên vẹn), ghi công bộ quân + liên kết giấy phép trên trang Cờ vua. Lối vào: liên kết chữ nhỏ trên thẻ menu (tên đọc được "Luật chơi Cờ caro"), màn hình bắt đầu ván, nút "Luật chơi" ở thanh trên màn hình chơi mở `Dialog` mới của `packages/ui` (chung `DialogFrame` với `ConfirmDialog`), dòng "Ván này", không liên kết rời ván, đọc lại dòng lượt khi đóng, lỗi + "Thử lại". `Rules` không có trong provider của client; hộp thoại nạp lười luật ở mọi chế độ (đổi so với design ban đầu: slot render ở server làm `/play/<id>/<mode>` nặng thêm 3,5–5,5 KB gzip). Số đo: design "Kết quả kiểm tra".
- `polish-accessibility-and-mobile` (code xong 04/11/2026, archive trong cùng PR sau review): **thanh trên dính** `TopBar` (`packages/ui`) + `AppTopBar` trên mọi trang (menu, bắt đầu ván, màn hình chơi kể cả online, sảnh chờ, lỗi phòng, trang luật, không tìm thấy/lỗi/đang tải qua `AppStateScreen`), nền đặc theo nền trang (của game trong `data-game`), cao `--top-bar-height` (3.5 / 4 / 3 rem) mà phép tính "không cuộn" của màn hình chơi dùng, `scroll-padding-top`; **hai nút chọn** "Giao diện" (icon theo lựa chọn) và "Ngôn ngữ" (quả cầu + mã) mở menu `Menu`/`MenuRadioItem` mới của `packages/ui` trên `popover` gốc (mẫu menu button + `menuitemradio`, đủ bàn phím; thay `ThemeSwitcher`, `LocaleSwitcher`, bỏ `ToggleGroup`); đổi ngôn ngữ giữa ván online **giữ nguyên kết nối** (E2E hai trình duyệt: 0 WebSocket mới, đúng ghế, nước đối thủ tới). Điện thoại: Cờ vua 360 × 740 trọn bàn + hai thanh ghế + "Ván mới" ("Lật bàn" thành nút icon), 360 × 640 cuộn tới được; dòng báo kết nối một dòng nhỏ; **xoay ngang** (`short-landscape:`, cao ≤ 512 px) bàn trái trọn chiều cao, cột phải (thanh ghế Cờ vua vào cột), đạt cả 844 × 300; vùng an toàn `viewport-fit=cover` + `--safe-*`/`px-safe-*`; `theme-color` theo nền trang (`ThemeColorSync` trong thanh trên, HTML server theo cookie). Hover/nhấn/tiêu điểm: token `--duration-*`, `--ease-standard`, tiện ích `transition-lift`, thẻ game nhấc khi hover/Tab, tắt khi giảm chuyển động, `hover:` chỉ với chuột. **Kiểm tiếp cận tự động**: axe-core 4.14.0 (catalog, devDependency, không thêm gói vào lockfile) trong `e2e/a11y.spec.ts` (`pnpm test:a11y`, cũng trong `test:e2e`): ≈ 150 lần quét sáng/tối × máy tính/điện thoại trong ~35 giây, 0 vi phạm WCAG A/AA + luật Lighthouse, 0 vi phạm best-practice; axe tìm ra và đã sửa: tên nút ngôn ngữ ("Ngôn ngữ: Tiếng Việt, VI"), chữ toạ độ trong ô Cờ vua, thân hộp thoại luật cuộn bằng bàn phím. **Lighthouse 13.5 Accessibility: 100** ở cả sáu trang đo (menu, bắt đầu ván, Cờ caro cùng máy, Cờ cá ngựa với máy, sảnh chờ, luật Cờ vua) × Mobile/Desktop × sáng/tối (CLI trên bản build ở máy, Chromium 156). README viết lại (chạy ở máy, biến môi trường, deploy Vercel Hobby + Upstash `sin1`, lệnh, giấy phép: mã nguồn giữ mọi quyền). Số đo, lựa chọn và chỗ khác thiết kế: design "Kết quả kiểm tra", §8–§9.
- Các mục của hàng M8 có từ trước, kiểm lại bằng `pnpm test:a11y` và test hiện có, không làm lại: sáng/tối (`color-theme`, M6.5), điều khiển bằng bàn phím (roving tabindex của mọi bàn), ký hiệu phân biệt quân ngoài màu (X/O, ●■▲◆, hình quân Cờ vua).
- **M8 xong về code qua ba change; MVP (M0–M8) xong về code.** Tiêu chí "Lighthouse Accessibility ≥ 90" đạt (100). Tiêu chí "bạn bè dùng thử trên điện thoại và laptop không cần hướng dẫn thêm" chờ lượt thử thật dưới đây.
- **Còn treo, cần người dùng thử trên thiết bị thật** (checklist design §5 của `polish-accessibility-and-mobile`, trên Production sau khi merge; gộp các mục "Còn lại" của M4–M7): iPhone Safari dọc và ngang (vùng tai thỏ, màu thanh trình duyệt theo nền game, 844 × 300 khi thanh địa chỉ hiện, menu "Giao diện"/"Ngôn ngữ" bằng chạm); Android Chrome; laptop Chrome/Edge 1280 px (hover thẻ game); online giữa iPhone và laptop qua link mời (Cờ caro tới khi thắng, "Chơi lại", khoá màn hình 1 phút rồi mở, đầu hàng, chờ 5 phút thấy nút xử bỏ ván, đổi ngôn ngữ giữa ván); Cờ caro 19×19 chạm hai lần; Cờ cá ngựa 4 người với máy; Cờ vua một ván ~20 nước (và ~80 nước mỗi bên online, phát lại khi phòng đổi — M7); VoiceOver/TalkBack đọc dòng lượt một nước. Ghi kết quả (đạt / lỗi + ảnh) vào đây; lỗi nhỏ sửa thẳng, lỗi lớn thành change mới.

### Sau MVP (v1)

- `redesign-ludo-play` (code xong 04/11/2026, archive trong cùng PR sau review): Cờ cá ngựa có quân hình đầu ngựa tự vẽ trên đế (ký hiệu ●■▲◆ trên đế, khoảng 0,28 ô), `viewBox` nới lên trên 0,3 ô để hàng trên cùng không bị cắt; bỏ danh sách nút "Ngựa 1: …" dưới bàn: ngựa đi được nhấp nhô với vòng mực + quầng màu, một chạm là đi (ngựa có tâm hình gần chỗ chạm nhất trong mọi ngựa, chỉ đi khi ngựa đó chọn được), bàn phím và trình đọc màn hình dùng nút trong suốt đặt trùng lên ngựa (roving tabindex, mũi tên), trỏ/tiêu điểm hiện ngựa mờ ở ô tới, khung ô đích, dấu ✕ trên ngựa sẽ bị đá. Nhấn giữ "Gieo xúc xắc" mở lớp mờ toàn màn hình với xúc xắc 3D (`three` 0.186.0 + `cannon-es` 0.20.0, một chunk lười 158 KB gzip, chỉ tải trên màn chơi Cờ cá ngựa lúc rảnh), thả tay mới gửi nước gieo; số vẫn do engine/server bốc, xúc xắc chọn trong kho quỹ đạo mô phỏng trước một quỹ đạo tự dừng đúng mặt đó; lớp mờ tắt ≤ 1,9 s sau khi có số; trong lúc tung, `PlayScreen` giữ dòng lượt, bảng người chơi và nút của ván như trước khi gieo (`presentation-hold`). Không WebGL / giảm chuyển động / chưa tải → bấm là gieo như trước. Nhịp máy: `AI_THROW_DELAY_MS` 2500 sau lần gieo của người (cùng máy và ghế máy online), online nước của người khác tới trong lúc đó xếp hàng. Luật, engine, protocol, server không đổi. Số đo: design §2, §11 của change.
- Còn lại: thử trên điện thoại thật (giữ lâu, trượt ngón, máy đời thấp, iOS Safari) — nằm trong danh sách thử thiết bị thật ở M8.
- `add-room-chat` (xong và archive 05/11/2026): chat trong phòng online cho mọi game, bằng code dùng chung (thêm game không phải sửa gì). Gõ tự do (một dòng, 200 code point, `sanitizeChatText` thuần dùng cả hai phía), 8 câu có sẵn và 6 emoji (chỉ id qua mạng, hiện theo ngôn ngữ người đọc). Chỉ người có ghế đọc và gửi, hiện khi phòng có từ hai người có ghế, cả sảnh chờ lẫn ván đã kết thúc. Tin nằm trong `StoredRoom.chat` (30 tin, đọc lỏng từng tin; `STORED_ROOM_FORMAT`, `PROTOCOL_VERSION` không đổi), đo được: 30 tin thường khoảng 7 KB, 30 câu có sẵn 5,5 KB, tệ nhất (30 × 200 emoji 4 byte) 29,5 KB mỗi bản phòng (cùng số ở `design.md` §1). `room-service.chat` kiểm trùng theo `playerId` + `id` trước giới hạn 5 tin/10 giây tính từ chính phòng; `writeWithRetry` gộp lại khi xung đột chỉ do chat (giữ quyết định, kể cả xúc xắc đã gieo, không gọi lại `decide`, không tính vào số lần thử). Từ chối `chat` không làm client nối lại; `online-transport` không phát lại và không vẽ lại khi chỉ có chat đổi; `RoomContent` đăng ký hẹp, `RoomGame` `memo`. Phía client: `features/chat/` với store `createRoomChat` phía trên nhánh sảnh chờ / màn hình chơi, panel trong portal (`ChatLayer`): tấm trượt trên điện thoại kèm `visualViewport`, cột bên khi xoay ngang, bảng trên điều khiển từ 1024 px (đo ô lưới `data-chat-dock`); bong bóng, emoji nổi, thẻ "Chat · số" qua `IntersectionObserver`, tắt chat lưu `board-games:chat-muted`. Chỗ khác thiết kế ghi ở mục "Khác thiết kế" của `design.md`. E2E `online-chat.spec.ts` (bàn không xê dịch ở 360 × 740, 844 × 390, 1280 × 800), `test:a11y`, ảnh `40-*`–`43-*`.
- Còn lại của `add-room-chat`, thêm vào danh sách thử thiết bị thật ở M8: bàn phím ảo iOS Safari và Android Chrome, bộ gõ tiếng Việt và tiếng Nhật trên điện thoại, TalkBack, VoiceOver; khói online trên Production sau khi merge (hai kết nối, gửi tin, nối lại còn tin, không có `playerId` trong gói tin).
- `add-fence-race-game` (xong và archive 06/11/2026): **Cờ rào** (`fence-race`, nhóm tự thiết kế, 2–4 người, đưa lên làm sớm từ v2): `GameDefinition` trong `packages/games/src/fence-race/` (tìm đường; `fenceRaceFenceIssue` là nguồn của lý do hiển thị khi xem trước, `legalMoves` dùng chung `fenceInTheWay` và tìm đường, có tối ưu riêng, test giữ hai bên khớp nhau), máy ba mức cả ghế máy và máy chơi thay; `Board` với ba chế độ Đi quân, Đặt rào, Phá rào, rào xem trước kéo giữ hướng, điện thoại dọc: bàn cao theo `svh` trong `theme.css` của game; xoay ngang và từ 1024 px: theo `--board-room` của `PlayScreen` (`dvh`), không sửa vì là phần dùng chung. Thêm game không sửa phần dùng chung (`engine`, `session`, `transport`, `features`, `server`, `protocol`, `ui`); số đo ở design của change.
- Còn lại của `add-fence-race-game`, thêm vào danh sách thử thiết bị thật ở M8: kéo rào bằng ngón tay thật (có đường lui bỏ kéo ở design §5), `touch-action: pinch-zoom` và thanh địa chỉ trên Safari iOS, bàn có đổi cỡ khi thanh địa chỉ thu lại lúc cuộn ở điện thoại xoay ngang và máy từ 1024 px không (`--board-room` theo `dvh`), trình đọc màn hình thật (NVDA, VoiceOver, TalkBack) với tên ô và dòng xem trước; khói online trên Production có đặt rào, phá rào và nối lại giữa ván sau khi merge.
- `add-toolbox-card-score` (xong và archive 07/11/2026): **Hộp công cụ** (`/tools`, sinh từ `TOOLS`) và **Ghi điểm đánh bài** (`apps/web/src/tools/card-score/`), lối vào ở đầu menu. Công cụ không phải game: không dùng `engine`, `games`, `protocol`, `transport`, `server` (ESLint chặn, có test). Logic là hàm thuần (`score-logic.ts`, `group.ts`, `summary.ts`). Mọi màn hình của công cụ nằm trong một route catch-all và chuyển bằng `pushState`, nên đã mở công cụ thì mất mạng vẫn dùng đủ (E2E `context.setOffline`). Kho IndexedDB riêng, chỉ ghi qua `update` của `idb-keyval`, nên hai tab lưu cùng lúc không mất ván (E2E trên IndexedDB thật); id ván sinh lúc mở màn hình nhập, nên bấm đúp hay lưu lại sau khi hết giờ chờ không tạo ván trùng. Bàn số riêng theo `(pointer: coarse)`, ô `inputmode="none"`, đổi được sang bàn phím của máy. Bản nháp ván mới trong `sessionStorage`. `DialogFrame` được export và sửa hai nhánh: dialog bị trình duyệt tự đóng mà cha vẫn giữ mở thì hiện lại; sự kiện `close` đến muộn của lần đóng trước không đóng dialog vừa mở lại. Không thêm token, không thêm thư viện.
- Còn lại của `add-toolbox-card-score`, thêm vào danh sách thử thiết bị thật ở M8: bàn số và `inputmode="none"` trên iPhone và Android (E2E chỉ mô phỏng cảm ứng), đo một ván 4 người có trong khoảng 10 giây không, `navigator.share` trên iOS và Android, VoiceOver và TalkBack với bàn số và nút đổi sang bàn phím của máy, dữ liệu có bị Safari dọn sau một thời gian không dùng không.
- `add-jelly-gather-puzzle` (12/11/2026): **Gom thạch** (`/puzzles/jelly-gather`), trò giải đố một người, loại nội dung mới ngoài `GameDefinition` (`apps/web/src/puzzles/<id>/`, danh sách `PUZZLES`, ranh giới ESLint, bất biến mới trong `openspec/config.yaml`). Luật thuần trong `rules/` (đi, đẩy dây chuyền, dính cùng màu, sương sáo dính mọi màu, thạch dừa dính tường, đá viên trơ; qua màn khi mỗi màu một khối), chạy trong project Vitest `pure` (Node). 24 màn, 3 chương; mỗi màn có lời giải mẫu và được BFS chứng minh số bước ít nhất. Lịch sử `UDLR*` với ngăn xếp bàn (hoàn tác O(1), chơi lại hoàn tác được), lưu localStorage đọc từng mục bằng zod theo `version` của màn, gộp khi ghi để hai tab không mất tiến độ của nhau, đọc qua `useSyncExternalStore` (server: "chưa đọc"). Màn hình chơi: bàn SVG (khối nhiều ô vẽ liền, ký hiệu từng loại, đinh ghim dừa), phím mũi tên/WASD/Z/R bỏ qua khi menu trên thanh trên đang mở hay có phím bổ trợ, vuốt, bàn điều khiển, khung giải xong thay chỗ bàn điều khiển, lời báo cho trình đọc màn hình và mô tả bàn theo hàng. Một route catch-all `pushState` như Hộp công cụ, nên mất mạng vẫn chơi đủ 24 màn. Menu có thẻ trò giải đố ("1 người · 24 màn", chỉ "Chơi"). Điều hướng `HistoryLink` chuyển sang `features/shell/client-navigation.tsx` dùng chung với Ghi điểm.
- Còn lại của `add-jelly-gather-puzzle`, thêm vào danh sách thử thiết bị thật ở M8: vuốt trên điện thoại thật (cuộn trang, cử chỉ quay lại của iOS và Android ở độ nhạy cao), VoiceOver và TalkBack với lời báo mỗi bước và mô tả bàn, cảm giác của chuyển động 120 ms trên máy yếu.
