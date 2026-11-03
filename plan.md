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
| Online | WebSocket trên Vercel Functions | `@vercel/functions` 3.10, `ws` 8.22 | `upgradeWebSocket` (đã GA); đã đo ở M3, xem §10 |
| Dữ liệu online | Upstash Redis | `redis` 6.3 (TCP) | Phòng, lịch sử nước đi, pub/sub. Pub/sub cần kết nối TCP nên dùng `redis` qua `REDIS_URL`; `@upstash/redis` (REST) không subscribe được |
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
│     │  │  ├─ play/[gameId]/       # màn hình bắt đầu ván
│     │  │  │  └─ [mode]/           # chơi theo chế độ: local (cùng máy), ai (với máy)
│     │  │  ├─ room/[code]/         # phòng online: link mời /room/<mã>, mã sai → không tìm thấy
│     │  │  └─ api/
│     │  │     └─ realtime/route.ts # điểm nối WebSocket trên Vercel; mọi thao tác phòng đi qua đây, không REST
│     │  ├─ features/               # mỗi tính năng một thư mục, tự chứa
│     │  │  ├─ menu/                # thẻ game, mục "Tiếp tục ván dở"
│     │  │  ├─ setup/               # màn hình bắt đầu ván: chế độ, mức độ, ai đi trước, lựa chọn gần nhất
│     │  │  ├─ play/                # màn hình ván, thanh điều khiển, hộp thoại kết thúc
│     │  │  ├─ room/                # trang phòng (RoomRoute), sảnh chờ + link mời, trang lỗi phòng, tạo phòng
│     │  │  ├─ identity/            # tên tạm + playerId trong localStorage, ô nhập tên (NameField)
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
│     └─ e2e/                       # Playwright
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

| Phần dùng chung | Ở đâu | Game chỉ cần cung cấp |
|---|---|---|
| Hợp đồng luật (`GameDefinition`) | `engine` | `meta`, `defaultOptions`, `setup`, `currentPlayer`, `legalMoves`, `applyMove`, `result`, (`parseOptions`, `evaluate`, `moveKey`) |
| Lịch sử, undo/redo, biên bản, replay | `engine` (`session`, `record`) | Không gì cả |
| Autosave | `apps/web` | Không gì cả |
| AI: `chooseMove(game, state, { level, rng, now, timeLimitMs })`, minimax góc nhìn ghế máy + alpha-beta + expectimax, đào sâu dần; mức `AI_LEVEL` Dễ/Vừa/Khó; chạy trong Web Worker (`AiPlayer`, không chạy được thì dự phòng trên luồng chính), transport cho máy đi khi tới ghế máy | `engine/ai` + `ai-worker` + `transport` | Hàm `evaluate` (càng cao càng tốt cho `player`; số hữu hạn, nên là số nguyên, trị tuyệt đối dưới 10^8; mọi chênh lệch đều được coi là thật) và `meta.supportsAI: true` |
| Ngẫu nhiên (xúc xắc) | `engine` chọn kết quả bằng rng được truyền vào | Khai báo `outcomes(state, move)`: các kết quả có thể kèm trọng số |
| Chơi online, kết nối lại, server trọng tài | `transport` + `server` + `protocol` | Không gì cả |
| Menu, bộ lọc | `features/menu` | `meta` (tên, số người, thời lượng) |
| Màn hình bắt đầu ván (chế độ, mức độ, ai đi trước, ván dở của game) | `features/setup` | `meta.supportsAI` |
| Khung màn hình ván (lượt, đồng hồ, nút) | `features/play` | Component `Board` |
| Giao diện nền, token, theme | `packages/ui` | Không gì cả |

### 3.4 Các interface cốt lõi

`GameDefinition` và phiên chơi đã cài ở `packages/engine` (chi tiết: `openspec/specs/game-engine/spec.md`, mã nguồn `packages/engine/src/types.ts`). `Transport`, `SavedGameStore` và `AiPlayer` đã cài ở `apps/web/src/transport/` và `apps/web/src/ai-worker/` (M2: một transport cục bộ theo ghế cho cả cùng máy lẫn đấu với máy; chi tiết: `openspec/specs/{local-play,play-vs-ai,game-setup}/spec.md`). `RoomStore`, `RoomView` và thông điệp online đã cài ở M4 (`apps/web/src/server/`, `packages/protocol/`; chi tiết: `openspec/specs/online-rooms/spec.md` và design của change `add-online-rooms`). Phía client của chơi online (`RoomConnection`, transport online, ghế `remote` trong ảnh chụp) cũng cài ở M4 (`apps/web/src/transport/`, `features/{room,identity}`; chi tiết: `openspec/specs/{online-play,player-identity}/spec.md` và design của change `add-online-play`).

```ts
// packages/engine — mọi method khai báo `this: void` để truyền đi mà không cần bind
interface GameDefinition<State, Move, Outcome = never, Options extends object = Record<string, never>> {
  readonly id: GameId;                               // kebab-case; khai báo game bằng `as const satisfies`
  readonly meta: GameMeta;                           // số người, thể loại, thời lượng, supportsAI
  readonly defaultOptions: Options;
  parseOptions?(raw: unknown): Options | null;       // kiểm tra tuỳ chọn từ bên ngoài; không có thì chỉ nhận defaultOptions
  setup(ctx: { playerCount; options }): State;       // tất định; ngẫu nhiên lúc tạo ván đi vào options
  currentPlayer(state: State): PlayerIndex;
  legalMoves(state: State): readonly Move[];
  outcomes?(state: State, move: Move): readonly { outcome: Outcome; weight: number }[];
  applyMove(state: State, move: Move, outcome?: Outcome): State; // tất định, không sửa state
  result(state: State): GameResult | null;           // { kind: "win", winners, reason? } | { kind: "draw", reason? }
  evaluate?(state: State, player: PlayerIndex): number; // bắt buộc khi supportsAI; |giá trị| < 10^8
  moveKey?(move: Move): string;                      // mặc định: JSON với khoá đã sắp xếp
}

// Phiên chơi: dữ liệu thuần + hàm thuần, lỗi trả về dạng Result<T> với mã ENGINE_ERROR
createSession(game, { playerCount, options? }): Result<Session>
playMove(game, session, move: unknown, rng: Rng): Result<Session> // rng do nơi gọi truyền vào mỗi nước
applyEntry(game, session, entry: unknown): Result<Session> // { move, outcome? } chơi ở nơi khác (server online), không gieo lại
undo(session) / redo(session): Result<Session>
activeEntries(session) / lastEntry(session)            // lịch sử đang có hiệu lực, không gồm nước đã hoàn tác
toRecord(session): GameRecord                          // { version: 1, gameId, playerCount, options, entries }
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
                                                     //   ván đã có kết quả), connection (ConnectionStatus, null nếu không online) }
  subscribe(listener: (event: TransportEvent) => void): () => void; // "changed" | { "rejected", code: RejectionCode }
  submit(move: Move): void;                          // kết quả qua sự kiện, kể cả bị từ chối (online là bất đồng bộ)
  requestUndo(): void;                               // lùi tới lượt người ở thiết bị này (bỏ cả nước máy); online không có hoàn tác
  requestRedo(): void;                               // làm lại tới lượt người kế tiếp (kèm nước máy)
  requestNewGame(): void;
  dispose(): void;
}

// Ghế: SeatController = { kind: "human" } | { kind: "ai", level } là dữ liệu lưu của chế độ cục bộ;
// SeatView = SeatController | { kind: "remote", name: string | null } là ghế trong ảnh chụp (remote = người chơi ở xa, null = ghế trống).
// Transport cục bộ theo ghế: mỗi ghế là người hoặc máy.
// Tới ghế máy thì hỏi AiPlayer, chờ tối thiểu 300 ms, kiểm lại ván chưa đổi rồi mới đi; máy lỗi thì đi nước hợp lệ ngẫu nhiên.
createLocalTransport({ definition, store, rng, mode?: "local" | "ai", start?: PlaySetup, fallback?: PlaySetup, ai?: AiPlayer })
// PlaySetup = { mode: "local" } | { mode: "ai", level, first: "human" | "ai" | "random" }

// Kết nối một phòng (không biết game): join với danh tính đọc lại ở mỗi lần chào (getIdentity), giữ room mới nhất (room
// đầu tiên sau mỗi join luôn thắng), tự nối lại (0/1/2/4/8 rồi 10 giây, nhân hệ số ngẫu nhiên [0,8; 1]; về 0 chỉ sau 30
// giây online), ping 20 giây và tự đóng khi im lặng 45 giây, tạm ngắt khi tab ẩn từ 60 giây hoặc 10 phút không hoạt động,
// thôi hẳn (failed) khi phòng không còn, app cũ, hay hết ghế mà mình chưa có ghế; sit quá 8 giây thì nối lại. Mọi thông
// điệp nhận được đi qua parseServerMessage.
createRoomConnection({ url, code, getIdentity, openSocket?, environment?, random? }): RoomConnection
// RoomConnection: getSnapshot() → { status: ConnectionStatus (CONNECTION_STATUS ở transport/types.ts: "connecting" |
//   "online" | "reconnecting" | "paused" | "idle" | "failed"), room, you, failure, slow }; subscribe;
//   send(sit | move | rematch): boolean; onRejected; onSynced; resume; reconnect; dispose

// Transport online theo ghế: dựng ván bằng fromRecord(room.record) mỗi lần room đổi; nước đi chỉ hiện khi server đã ghi
// (không hiển thị trước); chờ trả lời thì khoá bàn (cờ chờ theo gameNumber + moveIndex), quá 8 giây thì nối lại; chỉ phát
// "rejected" với mã của luật; isBroken() khi biên bản không dựng được (từ đó thôi theo dõi; trang phòng dừng kết nối).
createOnlineTransport({ definition, connection }): OnlineTransport

// Ván dở theo slot game × chế độ (khoá "<gameId>:<mode>", vỏ { version: 2, savedAt, inProgress, mode, record });
// ván cùng máy của M1 (khoá "<gameId>", version 1) được chuyển một lần trước mọi thao tác.
interface SavedGameStore {
  load(slot: SaveSlot): Promise<{ settings: ModeSettings; record: unknown } | undefined>; // từ chối = có thể có ván, không được ghi đè
  save(slot: SaveSlot, game: { settings; record; inProgress }): Promise<void>;
  clear(slot: SaveSlot): Promise<void>;
  listInProgress(): Promise<SavedGameSummary[]>;    // cho menu và màn hình bắt đầu ván, mới nhất trước
}

// apps/web/src/ai-worker — máy nghĩ ngoài luồng giao diện
interface AiPlayer {
  chooseMove(request: AiRequest): Promise<unknown>;  // { gameId, state, level, timeLimitMs, seed }; transport kiểm lại nước
  dispose(): void;
}
// createWorkerAiPlayer(): Worker tạo ở yêu cầu đầu; Worker lỗi/không trả lời → luồng chính (200 ms) cho mọi lượt sau.

// packages/protocol — thông điệp online, kiểm bằng zod ở cả hai phía
// client → server: create { protocol, gameId, playerCount?, options?, playerId, name } | join { protocol, code, playerId, name }
//                  | sit { name } | move { gameNumber, moveIndex, move } | rematch { gameNumber } | ping
// server → client: created { code } | room { room: RoomView, you } | rejected { request, code } | error { code } | pong
interface RoomView {                                 // không bao giờ chứa playerId
  readonly code: RoomCode;                           // 6 ký tự, không 0/O/1/I/L
  readonly gameId: string;
  readonly revision: number;                         // tăng 1 mỗi lần phòng đổi
  readonly gameNumber: number;                       // ván thứ mấy trong phòng
  readonly seats: readonly ({ name: string } | null)[];
  readonly record: GameRecord;                       // ván hiện tại; client dựng lại bằng fromRecord
}

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
1. `packages/games/src/<id>/`: `rules.ts` cài `GameDefinition` (khai báo bằng `export const <id> = { … } as const satisfies GameDefinition<State, Move, Outcome, Options>` để mã game giữ kiểu literal), `rules.test.ts`, (tuỳ chọn) `options.ts` cho biến thể luật kèm `parseOptions`.
2. Trong `rules.test.ts`, gọi `describeGameContract(<game>, { seeds, maxPlies, playerCounts?, options?, timeout? })` từ `@board-games/engine/testing` → phải xanh (không truyền `playerCounts` thì thử mọi số người game cho phép).
3. `apps/web/src/games/<id>/`: `Board.tsx`, `rules.{vi,en,ja}.mdx`, `index.ts`.
4. Thêm tên và nội dung của game vào `apps/web/messages/{vi,en,ja}.json` (`Games.<id>…`).
5. Thêm một dòng vào `apps/web/src/games/registry.ts`.
6. Game tự xuất hiện trong menu, chơi được cùng máy, online, và với máy nếu `meta.supportsAI` (bộ kiểm tra hợp đồng bắt buộc khi đó phải có `evaluate`).

## 5. Môi trường và hạ tầng

| Việc | Cách làm |
|---|---|
| Mã nguồn | Git, repo trên GitHub (có thể để công khai) |
| CI | GitHub Actions: `pnpm install` → `turbo lint typecheck test build` cho mọi PR |
| Deploy | Vercel nối với GitHub: nhánh `main` lên production, mỗi PR có link preview để gửi bạn thử |
| Biến môi trường | `REDIS_URL` (tích hợp Upstash trên Vercel tự thêm, kèm `KV_*`), `QSTASH_TOKEN` (từ v1); khai báo và kiểm tra bằng zod trong `apps/web/src/server/env.ts` |
| Chạy local | `pnpm dev` chạy `next dev` (cổng 3000) và server realtime (`ws://localhost:3001/api/realtime`, script `realtime` của `apps/web`, đổi cổng bằng `REALTIME_PORT`): `next dev` không nâng cấp được WebSocket nên server realtime là một tiến trình Node riêng, dùng chung bộ xử lý kết nối với route trên Vercel. Không có `REDIS_URL` thì phòng nằm trong bộ nhớ của tiến trình đó; có `REDIS_URL` thì dùng Redis với tiền tố khoá `dev:`. Chơi online ngay trên máy: mở `/play/<mã game>`, chọn "Online", "Tạo phòng", rồi mở link mời trong một cửa sổ ẩn danh hoặc trình duyệt khác (mỗi trình duyệt một `playerId`; hai tab cùng trình duyệt là cùng một người). App tìm server realtime theo `REALTIME_URL` (đọc lúc chạy); không đặt thì ở `next dev` là `ws://localhost:3001/api/realtime`, còn lại là cùng origin `/api/realtime` (Vercel). E2E chạy bản build ở cổng 3100 với server realtime riêng ở cổng 3101 |
| Phòng trong Redis | HASH `<tiền tố>room:<MÃ>` (`rev`, `data`), hết hạn 7 ngày sau lần ghi cuối; tiền tố theo `VERCEL_ENV` (`production:`, `preview:`, còn lại `dev:`) để Preview và Production dùng chung một Upstash mà không thấy phòng của nhau |
| Cập nhật thư viện | Renovate hoặc Dependabot, gom theo tuần |

## 6. Các mốc phát triển

Kích thước ước lượng: **S** ≈ 1–2 buổi, **M** ≈ 3–5 buổi, **L** ≈ 1–2 tuần (làm ngoài giờ).

Từ M1, mỗi mốc được làm qua một hoặc nhiều **OpenSpec change** (`/opsx:propose` → `/opsx:apply` → `/opsx:archive`, xem CLAUDE.md). Bảng dưới là lộ trình; chi tiết requirement, thiết kế và task của từng việc nằm trong `openspec/changes/<tên>/`, và hành vi đã xong nằm trong `openspec/specs/`. Mốc chỉ coi là xong khi mọi change của nó đã archive.

### 6.1 Giai đoạn 0: Khung

| Mốc | Nội dung | Xong khi | Cỡ |
|---|---|---|---|
| **M0. Khởi tạo repo** | Git + GitHub; pnpm workspace + Turborepo; `packages/config`; Next.js khung trong `apps/web`; Tailwind + token sáng/tối trong `packages/ui`; ESLint (kèm quy tắc chiều phụ thuộc), Prettier, Vitest; CI; nối Vercel | `pnpm lint typecheck test build` xanh ở local và CI; trang "Hello" chạy trên domain Vercel | S |
| **M1. Engine + game mẫu cùng máy** | `engine`: types, session (undo/redo), rng; `games/tictactoe`; bộ test hợp đồng chung; `features/menu` tự sinh từ registry; `features/play` + `LocalTransport`; autosave vào IndexedDB | Chơi Tic-tac-toe cùng máy từ menu; undo/redo đúng; F5 vẫn giữ ván | M |
| **M2. AI** | `engine/ai` (minimax + alpha-beta, giới hạn thời gian, 3 mức khó); `ai-worker`; transport theo ghế (người/máy) thay cho `AITransport` riêng; màn hình bắt đầu ván; ván dở theo game × chế độ | Đấu với máy Tic-tac-toe, máy mức Khó không thua; giao diện không bị đứng khi máy nghĩ | S |
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
| WebSocket của Vercel không ổn trên gói Hobby (giới hạn thời gian, chạy local khó) | Chậm mốc M4 | Đã thử ở M3: dùng được, kết nối bị cắt mỗi ~5 phút nên client phải tự nối lại. Kiến trúc `Transport` + `RoomStore` vẫn cho phép đổi hạ tầng mà không sửa game |
| Kết nối WebSocket giữ instance sống, tốn hạn mức bộ nhớ (GB-giờ) của Hobby | Hết hạn mức miễn phí giữa tháng, Vercel tạm dừng function | Theo dõi tab Usage sau M4; dồn kết nối vào ít instance; nếu thiếu thì chuyển realtime sang Cloudflare Durable Objects (gói miễn phí, có ngủ đông) |
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

| Số đo | Function ở `iad1` (Mỹ) | Function ở `sin1` (Singapore) |
|---|---|---|
| Kết nối sống được | 308 giây, rồi bị cắt với mã `1006` (không có khung đóng) | 310 giây, mã `1006` |
| Nối lại (gồm bắt tay TLS) | 1,7–1,9 giây | 0,33 giây |
| Độ trễ khứ hồi ping (p50 / p95 / max) | 235 / 244 / 542 ms | **69 / 78 / 108 ms** |
| Pub/sub: tin tới nơi | 1080/1080, 648 tin qua instance khác | 1080/1080, 576 tin qua instance khác |
| Pub/sub: thời gian từ gửi tới nhận (p50 / p95 / max) | 456 / 479 / 1151 ms | **69 / 81 / 174 ms** |
| Số instance cho 6 kết nối | 2 | 2 |

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

### Tiếp theo
**M5. Cờ caro** (§6.2): luật 5 quân liên tiếp trên bàn 15×15 / 19×19 (chọn kích thước bàn là tuỳ chọn luật đầu tiên khi tạo ván, kể cả tạo phòng online), `evaluate` theo mẫu chuỗi quân, bàn SVG có đánh dấu nước vừa đi và hàng thắng; chơi được cả 3 chế độ.
