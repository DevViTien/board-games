# Design

## Context

- Kết quả M3 (plan.md §10): `upgradeWebSocket` của `@vercel/functions` chạy được trên Vercel Hobby; function ở `sin1` cho độ trễ khứ hồi ~70 ms từ Việt Nam; kết nối bị cắt sau ~300 giây với mã `1006` (server có thể không kịp chạy handler `close`); nhiều kết nối dồn vào một instance nhưng một phòng vẫn có thể nằm trên 2 instance; pub/sub qua Upstash Redis (TCP, thư viện `redis`) chuyển đủ 1080/1080 tin. `upgradeWebSocket` chỉ chạy khi môi trường Vercel cung cấp ngữ cảnh nâng cấp (`getContext().upgradeWebSocket`): có trên Vercel và dưới `vercel dev`, **không** có dưới `next dev`/`next start`.
- Engine: `createSession`, `playMove(game, session, move: unknown, rng)` kiểm nước đi không tin cậy và gieo kết quả ngẫu nhiên bằng `rng`; `toRecord`/`fromRecord` (biên bản `{ version: 1, gameId, playerCount, options, entries }`); `parseGameOptions`; lỗi là `Result` với `ENGINE_ERROR`. Registry luật: `findGame(id)` trong `@board-games/games`. Nguồn ngẫu nhiên thật `cryptoRng` ở `apps/web/src/lib/crypto-rng.ts`.
- `packages/protocol` đang rỗng, đã có lint/typecheck/test; ESLint cho phép nó import `engine`.
- `apps/web/vitest.config.ts` chạy mọi test trong `jsdom`; Turbo lọc biến môi trường của task.
- Bất biến liên quan (openspec/config.yaml): server là trọng tài, ngẫu nhiên do server tạo; một ván = danh sách nước đi; function không giữ state, kết nối bị ngắt định kỳ là bình thường; không tài khoản.
- Yêu cầu hành vi: `specs/online-rooms/spec.md`. Phía client (transport, giao diện): change `add-online-play`.

## Goals / Non-Goals

**Goals:**

- Server là nơi duy nhất quyết định một nước đi có được ghi hay không; client không thể làm sai ván.
- Không một lỗi nào (thông điệp xấu, Redis chập chờn) làm sập instance, vì một instance phục vụ nhiều phòng.
- Lỡ tin pub/sub hay mất kết nối không làm ai kẹt: mọi lần bị từ chối và mọi lần nối lại đều trả trạng thái mới nhất.
- Logic phòng (`room-service`) test được không cần mạng hay Redis; đường WebSocket thật test được trên máy và trong CI không cần Vercel.
- Ít lệnh Redis và ít thời gian giữ kết nối, để nằm trong gói miễn phí (Upstash 500 nghìn lệnh/tháng; Vercel 360 GB-giờ bộ nhớ).

**Non-Goals:**

- Theo dõi ai đang nối (presence), xử thua khi bỏ ván: M8.
- Gửi phần chênh lệch thay vì cả phòng: ván cờ nhỏ (Tic-tac-toe ≤ 9 nước, cờ vua vài trăm), gửi cả phòng đơn giản và đủ nhanh.
- Ghế cho máy chơi thay trong phòng online: M6 (thêm trường loại ghế vào `players` khi đó).

## Decisions

### 1. Chỉ WebSocket, không REST

Mọi thao tác phòng (tạo, vào, ngồi, đi, ván mới) là thông điệp trên một kết nối WebSocket tới `/api/realtime`.

- **Lý do**: trên máy (dev, E2E) `upgradeWebSocket` không chạy dưới `next start`, nên WebSocket phải do một tiến trình Node riêng phục vụ (§7). Nếu tạo phòng qua REST (route của Next) còn đi nước qua WebSocket (tiến trình kia), kho phòng trong bộ nhớ ở hai tiến trình sẽ không thấy nhau, buộc dev và E2E phải có Redis. Một kênh thì một tiến trình giữ cả kho bộ nhớ.
- **Đã cân nhắc**: REST `POST /api/rooms` + WebSocket (plan.md §3.2 cũ) — bị loại vì lý do trên; chạy E2E bằng `vercel dev` — cần đăng nhập Vercel, không chạy được trong CI; giả lập ngữ cảnh nâng cấp của Vercel trong server Next tuỳ biến — dựa vào chi tiết nội bộ của `@vercel/functions`, dễ gãy.
- **Cái giá**: trang phòng không có metadata riêng phía server (link mời dán vào ứng dụng chat chỉ hiện tiêu đề chung của app); phòng không tồn tại chỉ biết sau khi nối WebSocket. Chấp nhận. Muốn thêm REST sau này thì phải giải bài toán kho chung ở dev trước.
- Tạo phòng mở một kết nối ngắn (`create` → `created`, server đóng ngay); trang phòng mở kết nối riêng (`join`). Thêm một lần bắt tay (~0,3 giây ở `sin1`).

### 2. Gói `protocol`

`packages/protocol/src/` chỉ phụ thuộc `@board-games/engine` (kiểu `PlayerIndex`, `GameRecord`, `EngineErrorCode`) và `zod`. Không biết game cụ thể: nước đi và tuỳ chọn là `unknown`, do luật của game kiểm.

```ts
export const PROTOCOL_VERSION = 1;

// room.ts
export const ROOM_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // không 0/O, 1/I/L
export const ROOM_CODE_LENGTH = 6;
export type RoomCode = string & { readonly __brand: "RoomCode" };
export function normalizeRoomCode(raw: string): RoomCode | null; // bỏ mọi khoảng trắng, viết hoa, kiểm bảng chữ
export const playerNameSchema; // cắt khoảng trắng, NFC, 1–24 code point, không có ký tự \p{Cc}/\p{Cf}/\p{Zl}/\p{Zp}
export const roomCodeSchema; // mã đã ở dạng chuẩn: cái server gửi và lưu, không phải cái người chơi gõ
export const gameRecordSchema;
// Schema của RoomView chỉ dùng trong gói (parseServerMessage), không export: nó bỏ mọi trường lạ, kể cả playerId.

export interface SeatView {
  readonly name: string;
}
export interface RoomView {
  readonly code: RoomCode;
  readonly gameId: string;
  readonly revision: number; // tăng 1 mỗi lần phòng đổi; chỉ để client xếp thứ tự các bản
  readonly gameNumber: number; // ván thứ mấy trong phòng, từ 1
  readonly seats: readonly (SeatView | null)[]; // theo PlayerIndex của ván hiện tại; null = ghế trống
  readonly record: GameRecord; // ván hiện tại
}

// messages.ts
type ClientMessage =
  | {
      type: "create";
      protocol: number;
      gameId: string;
      playerCount?: number;
      options?: unknown;
      playerId: string;
      name: string;
    }
  | { type: "join"; protocol: number; code: string; playerId: string; name: string } // vào xem phòng; người đã có ghế được nhận ra
  | { type: "sit"; name: string } // ngồi ghế trống nhỏ nhất (người đã có ghế giữ ghế), dưới tên gửi kèm
  | { type: "move"; gameNumber: number; moveIndex: number; move: unknown }
  | { type: "rematch"; gameNumber: number }
  | { type: "ping" };
type ServerMessage =
  | { type: "created"; code: RoomCode }
  | { type: "room"; room: RoomView; you: PlayerIndex | null }
  | { type: "rejected"; request: "sit" | "move" | "rematch" | null; code: RejectionCode }
  | { type: "error"; code: RejectionCode } // lỗi của lời chào hoặc lỗi nặng; server đóng kết nối ngay sau đó
  | { type: "pong" };

export function parseClientMessage(raw: unknown): ClientMessage | null;
export function parseServerMessage(raw: unknown): ServerMessage | null;
export function readGreetingVersion(raw: unknown): number | null; // `protocol` của một lời chào, kể cả lời chào sai phần còn lại
export const playerIdSchema;
export const MAX_MESSAGE_BYTES = 16 * 1024;
export const CLOSE_CODE = { GreetingTimeout: 4000, Idle: 4001 } as const;
```

- `playerId`: 16–64 ký tự `[A-Za-z0-9_-]`; là bí mật nhận ghế nên **không bao giờ** có trong thông điệp server gửi đi.
- Tên tạm: độ dài tính theo code point (một emoji là một ký tự). Chặn cả nhóm `\p{Cf}` (ký tự định dạng): ký tự bidi, ký tự độ rộng 0, và cả ZWJ, nên emoji ghép bằng ZWJ (gia đình, cờ cầu vồng…) không dùng được trong tên; chấp nhận cho đơn giản.
- `ClientMessage` suy từ schema zod; `ServerMessage` khai báo tường minh (`readonly`, dùng `RoomView`) và schema `satisfies` kiểu đó, để server dựng thông điệp từ `toRoomView` mà không phải sao chép.
- `CLOSE_CODE` và `MAX_MESSAGE_BYTES` nằm trong `protocol` vì client (change `add-online-play`) cũng cần.
- `protocol` chỉ có ở lời chào (`create`/`join`); khác `PROTOCOL_VERSION` → `error: outdated-client`. Server đọc nó bằng `readGreetingVersion` **trước** schema đầy đủ, để tab cũ gửi trường lạ vẫn được báo `outdated-client` chứ không phải `invalid-message`.
- `sit` mang tên (kiểm bằng `playerNameSchema` như lời chào): ở sảnh chờ người chơi sửa được tên rồi mới bấm "Vào chơi" (change `add-online-play` §5), nên tên lúc chào có thể đã cũ. Người đã có ghế gửi `sit` với tên khác thì được đổi tên, giữ nguyên ghế.
- Nước đi gắn với **vị trí trong ván** (`gameNumber`, `moveIndex = số nước đã có`), không với `revision` của cả phòng: người khác vào ghế hay đổi tên giữa chừng không làm nước đang gửi bị từ chối oan; gửi trùng hay gửi lại nước cũ sau khi nối lại vẫn bị chặn. `rematch` gắn với `gameNumber`: hai người cùng bấm chỉ tạo một ván.
- Có cả hai hàm parse để client cũng kiểm dữ liệu từ mạng. Thông điệp client: `z.strictObject` (trường lạ = sai định dạng); thông điệp server: `z.object` (client cũ bỏ qua trường mới).

**Bảng mã lỗi** (`ROOM_ERROR` trong `errors.ts`; `RejectionCode = RoomErrorCode | EngineErrorCode`) — nguồn duy nhất cho server, client và spec:

| Mã                                                                                                                | Gửi bằng                                                                                           | Khi nào                                  | Server đóng?         | Client làm gì                                 |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------- | --------------------------------------------- |
| `invalid-message`                                                                                                 | `error` trước lời chào; `rejected` (request `null`) sau lời chào                                   | JSON hỏng, sai schema, khung nhị phân    | trước lời chào: có   | nối lại có giãn cách, không đặt lại giãn cách |
| `outdated-client`                                                                                                 | `error`                                                                                            | `protocol` khác server                   | có                   | dừng, báo app vừa cập nhật                    |
| `unknown-game`, `invalid-player-count`, `invalid-options`                                                         | `error` (trả lời `create`)                                                                         | game chưa đăng ký, số người/tuỳ chọn sai | có                   | báo không tạo được phòng                      |
| `room-not-found`                                                                                                  | `error` (trả lời `join`; trả lời `sit`/`move`/`rematch` khi phòng biến mất lúc đang ở trong phòng) | không có phòng (hoặc đã hết hạn, bị xoá) | có                   | dừng, báo không tìm thấy phòng                |
| `room-full`                                                                                                       | `rejected` (`sit`), kèm `room` như dòng dưới                                                       | hết ghế trống                            | không                | báo phòng đã đủ người, client tự đóng         |
| `not-seated`                                                                                                      | `rejected` (`move`, `rematch`), kèm `room` như dòng dưới                                           | kết nối chưa có ghế                      | không                | gỡ cờ chờ                                     |
| `waiting-for-players`, `not-your-turn`, `stale-move`, `game-over`, `game-not-over`, mã của luật (`illegal-move`…) | `rejected` **kèm `room` hiện tại** gửi ngay trước (nếu mới hơn bản client đã có, §5.5)             | §4                                       | không                | áp `room`, gỡ cờ chờ                          |
| `too-many-messages`                                                                                               | `error`                                                                                            | quá 30 thông điệp/10 giây                | có (1008)            | nối lại có giãn cách, không đặt lại giãn cách |
| `unavailable`                                                                                                     | `error` (trả lời `create`/`join`), `rejected` (còn lại)                                            | kho lỗi hoặc quá 5 giây                  | trả lời lời chào: có | nối lại có giãn cách                          |

Mã đóng kết nối riêng: `4000` hết hạn chào (client: nối lại như mất kết nối), `4001` rảnh quá lâu (client: dừng ở trạng thái rảnh, không tự nối lại, xem change `add-online-play`).

### 3. Phòng lưu ra sao

```ts
// apps/web/src/server/room.ts — đọc từ kho luôn qua `parseStoredRoom` (zod; JSON hỏng hay sai schema → null)
interface StoredRoom {
  readonly format: 1; // định dạng lưu; đổi định dạng thì tăng số này
  readonly code: RoomCode;
  readonly gameId: string;
  readonly revision: number;
  readonly gameNumber: number;
  readonly players: readonly ({ readonly playerId: string; readonly name: string } | null)[]; // theo ghế
  readonly record: GameRecord;
  readonly updatedAt: number; // ms, từ đồng hồ server
}
```

- **Redis**: một HASH `<prefix>room:<CODE>` với hai trường `rev` (số) và `data` (JSON của `StoredRoom`), `EXPIRE 604800` (7 ngày) đặt lại ở mỗi lần ghi → phòng tự xoá sau 7 ngày không ai đổi gì. `prefix` = `VERCEL_ENV` + `:` (`production:`, `preview:`) hoặc `dev:`: Preview và Production dùng chung một Upstash mà không thấy phòng của nhau. Kênh pub/sub `<prefix>room:<CODE>` mang `data` mới sau mỗi lần ghi.
- **Ghi có kiểm phiên bản** (`RoomStore.update(code, expectedRevision, next)`): script Lua `HGET rev` → khác `expectedRevision` thì trả `conflict`; đúng thì `HSET rev data` → `EXPIRE` → `PUBLISH`, tất cả trong một `EVALSHA` (khai báo bằng `scripts` của `redis`, thư viện tự lo `NOSCRIPT`). Không dùng `cjson`, không phải giải mã JSON trong Lua. Tạo phòng: script `EXISTS` → `HSET` + `EXPIRE` (trùng mã → sinh mã khác, tối đa 5 lần rồi `unavailable`).
- **Đã cân nhắc**: một khoá chuỗi JSON + `cjson` trong Lua (phụ thuộc thư viện Lua của Upstash, giải mã cả phòng mỗi lần ghi, và `cjson` mã hoá lại `[]` thành `{}`); `WATCH`/`MULTI` (3–4 lệnh mỗi lần ghi, giữ kết nối riêng cho mỗi giao dịch); `@upstash/redis` (REST, không subscribe được — M3).
- **Kết quả kiểm chứng trên Upstash thật (task 1.2, 03/11/2026)**: script `HGET` → `HSET` → `EXPIRE` → `PUBLISH` chạy qua `EVALSHA` đúng cả ba nhánh (`1` ghi, `0` sai phiên bản, `-1` không có phòng), subscriber ở kết nối khác nhận tin `PUBLISH` từ trong script; `TTL` sau khi ghi là 604800; lần đầu `SCRIPT EXISTS` trả `0`, thư viện tự chuyển sang `EVAL` khi gặp `NOSCRIPT`, sau đó `SCRIPT EXISTS` trả `1`. Upstash tính **script = 1 lệnh + 1 lệnh cho mỗi `redis.call`** (trang billing của Upstash: "a script that runs a `GET` and a `SET` is billed as 3 commands"), nên script ghi tốn 5 lệnh, tách `PUBLISH` ra ngoài cũng tốn đúng 5 (4 + 1): **giữ `PUBLISH` trong script** vì cùng chi phí mà ghi và phát là một bước nguyên tử, một lượt khứ hồi. Script không rẻ hơn `WATCH`/`MULTI` theo số lệnh (`MULTI`/`EXEC` cũng bị tính) nhưng vẫn ít hơn (5 so với 7) và không giữ kết nối riêng. Trang giá không nói tin pub/sub giao tới subscriber có bị tính hay không; `PUBLISH`/`SUBSCRIBE`/`UNSUBSCRIBE` là lệnh thường (không nằm trong danh sách miễn phí `AUTH`, `HELLO`, `PING`, `QUIT`…), ước tính ở §8 coi mỗi tin giao tới mỗi instance cũng có thể bị tính. Upstash **không** có `CLIENT KILL` (`ERR Command is not available`), còn `CLIENT ID`, `CLIENT LIST`, `PUBSUB NUMSUB`, `QUIT` có.
- **Bộ nhớ** (`store/memory.ts`): `Map` giữ JSON của phòng (đọc lại qua `parseStoredRoom` như từ Redis) + tập listener, tin giao bằng `queueMicrotask` như tin từ mạng; cùng ngữ nghĩa kiểm phiên bản; cho test và dev server khi không có `REDIS_URL`. TTL không mô phỏng. Điều khiển cho test là method của `MemoryRoomStore`: `dropMessages(n)` (lỡ tin), `reconnect()` (như kho Redis khi kênh nối lại: đọc lại mọi phòng đang có listener và giao cho listener), `intercept(operation, hook)` (chạy trước thao tác: ném lỗi, treo, hoặc chen một lần ghi khác để tạo `conflict`), `writeRaw` (dữ liệu sai định dạng), `expire(code)` (xoá phòng như khi hết hạn), `listenerCount`.
- **Listener lỗi không lan**: cả hai kho giao tin qua một helper chung `notifyListeners(listeners, room)` (`store/room-store.ts`): listener nào ném lỗi thì ghi log, các listener khác vẫn nhận. Không có nó, lỗi ném trong `queueMicrotask` (bộ nhớ) hay trong callback của `redis` là lỗi không bắt và làm sập tiến trình. `addListener` (cùng file) bọc mỗi listener thành một bản riêng, để cùng một hàm đăng ký hai lần là hai listener.
- **Một kho mỗi tiến trình**: `store/open-room-store.ts` (`openRoomStore(config)`) tạo kho lần đầu cần và dùng lại cho mọi kết nối; route và `dev-main.ts` cùng gọi nó.

```ts
// apps/web/src/server/store/room-store.ts
interface RoomStore {
  create(room: StoredRoom): Promise<"created" | "exists">;
  get(code: RoomCode): Promise<StoredRoom | null>;
  update(
    code: RoomCode,
    expectedRevision: number,
    next: StoredRoom,
  ): Promise<"updated" | "conflict" | "missing">;
  /**
   * Gọi listener với mọi StoredRoom ghi sau khi promise trả về (kể cả từ instance khác), và với bản
   * đọc lại sau mỗi lần kho nối lại kênh (tin có thể đã lỡ trong lúc mất kết nối).
   */
  subscribe(code: RoomCode, listener: (room: StoredRoom) => void): Promise<() => void>;
  close(): Promise<void>;
}
```

- **Một subscriber mỗi instance**: bản Redis giữ một client lệnh và một client subscriber, tạo lười và dùng lại giữa các kết nối. Gộp listener theo kênh (`SUBSCRIBE` khi listener đầu tiên của kênh ở instance này, `UNSUBSCRIBE` khi listener cuối rời; listener thứ hai chờ chung promise `SUBSCRIBE` của listener đầu). Khi subscriber `ready` lại sau lỗi: đọc lại (`HGET`) mọi phòng đang có listener và gọi listener (§Goals: lỡ tin không làm ai kẹt). Lúc đó client lệnh có thể vẫn đang nối lại (với `disableOfflineQueue` nó báo `ClientOfflineError` ngay), nên mỗi lần đọc lại hỏng được thử lại tối đa 5 lần, cách nhau 500 ms, và chỉ khi phòng vẫn còn listener. `SUBSCRIBE` của một kênh hỏng thì kênh được đánh dấu, listener tiếp theo của phòng đó thử lại.
- **`UNSUBSCRIBE` hỏng**: nếu socket của subscriber vừa rớt, `UNSUBSCRIBE` bị từ chối nhưng thư viện vẫn giữ handler và `SUBSCRIBE` lại kênh đó khi nối lại, nên kênh bị rò. Kho nhớ các handler đó và gỡ lại ở lần `ready` sau: `unsubscribe(name)` (mọi handler) nếu phòng không còn ai nghe, `unsubscribe(name, handler)` (chỉ handler cũ) nếu phòng đã được nghe lại bằng kênh mới.
- **Thư viện `redis` 6.3 đã gộp một phần (đọc `@redis/client/dist/lib/client/pub-sub.js`, task 1.2)**: nó giữ `Map` kênh → tập listener, chỉ gửi `UNSUBSCRIBE` khi listener cuối của kênh rời, và tự `SUBSCRIBE` lại mọi kênh khi nối lại, trước khi phát `ready` (đã thấy trên Upstash: sau khi subscriber bị ngắt, `PUBSUB NUMSUB` vẫn là 1 và tin sau đó vẫn tới). Nhưng listener chỉ được thêm vào `Map` khi `SUBSCRIBE` đã có trả lời, nên hai listener tới cùng lúc gửi hai `SUBSCRIBE`; và thư viện không có API công khai liệt kê kênh đang nghe để đọc lại phòng khi `ready`. Vì vậy **giữ `Map` tự viết** (mỏng: kênh → tập listener + promise `SUBSCRIBE` chung), mỗi kênh chỉ đăng ký một listener với thư viện; phần tự `SUBSCRIBE` lại khi nối lại thì dựa vào thư viện.
- **Độ bền**: cả hai client luôn có `.on("error")` (thiếu thì Node coi là lỗi không bắt và tắt tiến trình); singleton giữ **promise** `connect()` và xoá promise khi nó bị từ chối, để lần sau thử lại; `disableOfflineQueue: true`: khi mất kết nối, lệnh hỏng ngay thay vì xếp hàng.
- **Không lệnh nào chờ quá 5 giây, và kết nối chết được thay** (`lazyClient` trong `redis.ts`). Hạn `commandOptions.timeout` của `redis` chỉ áp cho lệnh **chưa ghi** xuống socket; lệnh đã ghi lên một kết nối TCP nửa sống (Wi-Fi của máy chủ rớt, NAT xoá mapping) không bao giờ có trả lời và thư viện chờ mãi. Vì vậy:
  - mọi thao tác của kho (lệnh, `connect`, `SUBSCRIBE`/`UNSUBSCRIBE`, lần đọc lại khi kênh nối lại, `close`) đi qua `withTimeout` 5 giây (`lib/with-timeout.ts`), quá hạn là `TimeoutError` → kết nối WebSocket trả `unavailable` (hạn của chính kết nối, §5.9, cũng là 5 giây);
  - 2 lần quá hạn **liên tiếp** trên một client → client bị huỷ (`destroy`), lời gọi sau mở client mới; nếu là subscriber thì mọi kênh đang nghe được `SUBSCRIBE` lại trên client mới rồi đọc lại phòng;
  - `pingInterval` 15 giây (`PING` miễn phí trên Upstash) + `socket.socketTimeout` 40 giây: một `PING` không có trả lời làm các `PING` sau dừng, kết nối im lặng và bị cắt sau 40 giây, thư viện tự nối lại (subscriber thì tự `SUBSCRIBE` lại rồi `ready` → đọc lại phòng). Đây là cách duy nhất phát hiện subscriber nửa sống, vì nó không gửi lệnh nào khác;
  - `reconnectStrategy` luôn trả một số (50 ms nhân đôi tới 2 giây, cộng nhiễu): chiến lược mặc định trả `false` với `SocketTimeoutError`, tức client dừng hẳn (`terminated`) đúng lúc vừa phát hiện kết nối chết. Nếu client vẫn `terminated`, nó bị huỷ và thay như trên.
  - Bảo đảm thực tế: một yêu cầu không bao giờ chờ kho quá 5 giây; client lệnh chết được thay sau tối đa 2 yêu cầu hỏng; subscriber nửa sống được thay sau khoảng 15 + 40 giây im lặng, và tin lỡ trong lúc đó được bù bằng lần đọc lại. Trong khoảng đó người chơi vẫn nhận `room` trả thẳng cho yêu cầu của mình, chỉ chậm thấy nước của người khác.
- Test đường hồi phục không cần Redis: `createRedisRoomStore` nhận `openClient` (mặc định tạo client `redis`) và `timing` rút ngắn; `store/fake-redis.ts` (chỉ cho test) giả client với các nút `goOffline`, `comeBack`, `hang`, `failUnsubscribe`, `terminate`. Bộ hợp đồng `describeRoomStore` cũng chạy trên client giả, nên logic của kho Redis có test trong CI.

### 4. Luật phòng (`room-service.ts`)

`createRoomService({ store, rng, now, games })`, không biết WebSocket. Mã phòng vào service đã là `RoomCode`: chuẩn hoá mã người chơi gõ (`abc 234`) chỉ làm ở biên, trong kết nối (§5.4). Mỗi yêu cầu trả `ServiceResult<StoredRoom>` theo đúng kiểu `Result` của engine: `{ ok: true, value }` hoặc `{ ok: false, error, room? }` (`room`: phòng vừa đọc, gửi cho client trước lời từ chối); ghế của người gửi tính bằng `seatOf`.

| Yêu cầu                                                  | Điều kiện                                                                                                                                                                                                                       | Kết quả                                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `create(gameId, playerCount, options, player)`           | game đã đăng ký (`unknown-game`); `playerCount` trong `meta.players`, không gửi → `meta.players.min` (`invalid-player-count`); `options` không gửi → `defaultOptions` của game, có gửi → `parseGameOptions` (`invalid-options`) | phòng mới, `revision 1`, `gameNumber 1`, người tạo ngồi ghế 0, các ghế khác trống                                        |
| `join(code, player)`                                     | phòng tồn tại (`room-not-found`)                                                                                                                                                                                                | trả phòng; người đã có ghế mà gửi tên khác → đổi tên (ghi)                                                               |
| `sit(code, player)` (`player.name` là tên gửi kèm `sit`) | đã có ghế → giữ ghế đó (tên khác → đổi tên, ghi; cùng tên → không ghi); còn ghế trống → ghế trống nhỏ nhất; hết → `room-full`                                                                                                   | ghi (trừ khi không có gì đổi)                                                                                            |
| `move(code, playerId, gameNumber, moveIndex, move)`      | có ghế (`not-seated`); đủ người (`waiting-for-players`); `gameNumber`/`moveIndex` khớp ván hiện tại (`stale-move`); ván chưa kết thúc (`game-over`); `currentPlayer` là ghế đó (`not-your-turn`)                                | `fromRecord` → `playMove(game, session, move, rng)` (lỗi của luật trả nguyên mã) → `toRecord` → `update`                 |
| `rematch(code, playerId, gameNumber)`                    | có ghế; `gameNumber` khớp (`stale-move`); ván đã có kết quả (`game-not-over`)                                                                                                                                                   | `players` xoay một ghế (ghế 0 sang ghế 1, …, ghế cuối về 0) để luân phiên người đi trước; biên bản mới; `gameNumber + 1` |
| `watch(code, listener)`                                  | —                                                                                                                                                                                                                               | chuyển thẳng tới `RoomStore.subscribe`, để kết nối chỉ phụ thuộc service                                                 |

- **`update` trả `conflict`**: mọi yêu cầu ghi đi qua một helper `writeWithRetry(code, attempts, decide)`: đọc phòng, `decide` trả phòng mới (trả lại đúng phòng vừa đọc nghĩa là không có gì để ghi) hoặc lời từ chối; gặp `conflict` thì đọc lại và quyết định lại trên bản mới. `join`/`sit` không phụ thuộc trạng thái client: `JOIN_ATTEMPTS = 3` lần đọc; `move`/`rematch`: `MOVE_ATTEMPTS = 2`, tức đọc lại một lần và kiểm lại điều kiện trên bản mới (người khác vừa đổi tên thì nước đi vẫn hợp lệ và được ghi; ván đã đổi thì `stale-move`). Hết lượt → `unavailable` kèm phòng đọc gần nhất. Phòng biến mất giữa chừng (`get` trả `null`, `update` trả `missing`) → `room-not-found`.
- Mọi lời từ chối của `move`/`rematch` trả kèm phòng vừa đọc, để kết nối gửi `room` hiện tại trước `rejected` (không tốn thêm lệnh Redis).
- `rng` là `cryptoRng`; `now` cho `updatedAt`. Tiêm vào để test tất định.
- `toRoomView(room)` bỏ `playerId`, chỉ để tên; `seatOf(room, playerId)` tính `you` — tính lại cho **từng kết nối mỗi lần gửi**, vì ván mới xoay ghế.

### 5. Kết nối (`realtime/connection.ts`)

`attachConnection(socket /* WebSocket của thư viện ws */, { service, limits })` dùng chung cho Vercel và dev server; nó chỉ phụ thuộc service (nghe phòng qua `service.watch`), nên nơi gọi không phải ghép đúng cặp service–kho. Trạng thái kết nối là một union phân biệt: `greeting` (tới khi xử lý xong thông điệp đầu; `create` luôn kết thúc bằng đóng), `joining { code, player }`, `joined { code, player }`, `closed`. `limits` (`ConnectionLimits`: hạn chào, hạn rảnh, chu kỳ ping, giới hạn tần suất, hạn của kho) mặc định theo các số dưới đây; test rút ngắn chúng thay vì giả đồng hồ (socket thật không chạy cùng fake timers), nên không có tham số `timers`:

1. Gắn mọi handler (`message`, `error`, `close`, `pong`) **đồng bộ** ngay khi nhận socket; thông điệp tới trước khi phụ thuộc (kho Redis) sẵn sàng được xếp hàng, không bị rơi.
2. Thông điệp đầu phải là `create` hoặc `join` trong 10 giây; không chào kịp → đóng mã `4000` (không gửi `error`, để client coi như mất kết nối và nối lại). Thông điệp đầu sai loại → `error: invalid-message` rồi đóng.
3. `create` → `created { code }` rồi **server đóng** kết nối (không trông vào client).
4. `join` → chuẩn hoá mã (`normalizeRoomCode`; không phải mã → `room-not-found`), đăng ký nghe phòng **trước** khi đọc phòng; tin từ kênh tới trước bản đầu được giữ lại. Gửi `room` đầu kèm `you`, rồi mọi `room` có `revision` lớn hơn bản đã gửi gần nhất (áp chung cho tin từ kênh và tin gửi thẳng). Lời chào thành công thì kết nối ở lại phòng đó tới khi đóng; hẹn giờ rảnh (§5.7) bắt đầu từ đây.
5. `sit`/`move`/`rematch` → service; thành công thì gửi ngay `room` mới cho chính kết nối (vẫn đúng nếu `PUBLISH` lỡ). Người gửi **luôn** nhận một `room` cho yêu cầu thành công: nếu trong lúc yêu cầu chạy kênh chưa đưa `room` nào tới kết nối này, server gửi bản mới nhất nó biết dù cùng `revision` với bản đã gửi (ví dụ `sit` của người đã có ghế, cùng tên: không có gì ghi, nhưng client vẫn chờ câu trả lời; client bỏ qua bản trùng `revision`). Bị từ chối thì gửi `room` hiện tại (nếu có) rồi `rejected { request, code }`; bản này chỉ được gửi khi `revision` lớn hơn bản kết nối đã gửi gần nhất: client đã có bản mới nhất thì chỉ nhận `rejected`. Riêng `room-not-found` (phòng hết hạn hay bị xoá trong lúc kết nối đang ở trong phòng) → `error: room-not-found` rồi đóng, vì không còn gì để phục vụ.
6. `ping` → `pong`, trả **ngay** trong handler `message` (sau khi kiểm tần suất) khi đã vào phòng, không xếp hàng sau một lời gọi kho đang chậm: client coi `pong` trễ là kết nối chết và nối lại. Server gửi khung ping của WebSocket mỗi 30 giây; không nhận khung pong trước lần ping sau → `terminate()`. Listener của kênh tự gỡ khi socket không còn `OPEN` (Vercel có thể cắt kết nối mà không chạy `close`, trong lúc instance vẫn sống vì kết nối khác).
7. **Rảnh quá lâu**: 20 phút không có thông điệp nào ngoài `ping` và không có `room` mới gửi đi → đóng mã `4001`. Lưới an toàn cho client lỗi; client đúng tự ngắt sớm hơn (change `add-online-play`).
8. **Bảo vệ**: `maxPayload` 16 KB (vượt → `ws` phát `error` trên socket và tự đóng nó với mã 1009; handler `error` của kết nối chỉ ghi log; tiến trình không sập); khung nhị phân → `invalid-message`; quá 30 thông điệp trong 10 giây (tính cả `ping`) → `error: too-many-messages`, đóng 1008.
9. **Không có lỗi nào thoát ra ngoài**: thông điệp được xử lý tuần tự qua một chuỗi promise có `catch`; service ném lỗi khi kho lỗi, kết nối bắt mọi lỗi của lời gọi service (và hạn `storeTimeoutMs` 5 giây, qua `withTimeout` dùng chung ở `lib/with-timeout.ts`) → `unavailable` (theo bảng §2); lỗi lạ ở chính kết nối → log, `error: unavailable`, đóng mã 1011. Không có `unhandledRejection`.
10. `close` → huỷ đăng ký kênh, dừng hẹn giờ. Không có state phòng nào trong bộ nhớ cần dọn.

### 6. Môi trường (`server/env.ts`)

zod kiểm `process.env` **lười, lần đầu cần** (không ở cấp module, để `next build` không chạy nó): `REDIS_URL` (`redis://`/`rediss://`, tuỳ chọn), `VERCEL`, `VERCEL_ENV`, `REALTIME_PORT` (mặc định 3001). Trên Vercel mà thiếu `REDIS_URL` là lỗi cấu hình (route trả 503), không âm thầm dùng bộ nhớ: mỗi instance một kho bộ nhớ sẽ làm hai người chơi không thấy nhau.

### 7. Ba nơi chạy server

- **Vercel**: `app/api/realtime/route.ts`, `GET`:
  1. Không phải yêu cầu nâng cấp (`Upgrade: websocket`) → 426.
  2. `await connection()`; trên Vercel thiếu `REDIS_URL` (hoặc biến môi trường sai) → 503.
  3. `upgradeWebSocket((ws) => attachConnection(ws, { service }), { maxPayload: 16 * 1024 })` với `createDefaultRoomService(openRoomStore(...))` (kho Redis singleton của instance).
  4. `upgradeWebSocket` bị từ chối trước khi gọi handler → 501 kèm log "chạy server realtime: `pnpm --filter @board-games/web realtime`". **Khác dự kiến**: `@vercel/functions` 3.10 không export `getContext` (không có trong trường `exports` của gói), nên route không hỏi trước được môi trường có ngữ cảnh nâng cấp hay không; nó để `upgradeWebSocket` tự từ chối ("not available in the current runtime") dưới `next dev`/`next start`. Đọc thẳng `globalThis[Symbol.for("@vercel/request-context")]` bị loại vì dựa vào chi tiết nội bộ. Hệ quả: kiểm 503 đứng trước 501 (kết quả như nhau vì 503 chỉ xảy ra trên Vercel), và client bỏ đi giữa lúc nâng cấp cũng nhận 501 (socket đã đóng, không ai đọc).
- **Máy, dev và E2E**: `server/realtime/dev-server.ts` export `startRealtimeServer({ port, store })`: `http.createServer` trả 200 ở `/healthz` (Playwright chờ được) và 404 chỗ khác, `WebSocketServer({ noServer: true })` nhận nâng cấp ở `/api/realtime`. Handler `upgrade` gắn `error` lên socket thô trước khi làm gì (peer ngắt giữa chừng không thành lỗi không bắt) và bọc `new URL(request.url)` trong `try`: dòng yêu cầu mà parser của Node cho qua nhưng không phải URL (`GET http://[`) → huỷ socket, server vẫn chạy. `server/realtime/dev-main.ts` đọc env, chọn kho (Redis nếu có `REDIS_URL`, không thì bộ nhớ), gọi `startRealtimeServer`; chạy bằng script `realtime` của `apps/web` (`tsx src/server/realtime/dev-main.ts`). `pnpm dev` ở gốc chạy cả `next dev` lẫn server realtime (task `realtime` persistent trong `turbo.json`).
- Code chạy dưới `tsx` không import Next và không dùng gói `server-only` (gói này ném lỗi ngoài Next); ESLint cho phép theo danh sách: mọi file dưới `src/**` **trừ** `src/server/**` và `src/app/api/**` không được import thư mục server, kể cả qua đường dẫn tương đối (`@/server/**`, `./server/**`, `../server/**`, … tới 5 cấp `../`), để `redis`/`ws` không lọt vào bundle client; thư mục mới ở `src/` mặc định bị chặn (khai báo trong `packages/config/eslint`, lớp `web`).
- `tsx` kéo theo `esbuild`, gói có script cài đặt: ghi `esbuild: false` vào `allowBuilds` như các gói đã có ở đó (bản nhị phân dựng sẵn được cài qua dependency tuỳ chọn); không bật script nào.
- Biến của server realtime đi qua Turbo bằng `passThroughEnv` của task `realtime` (`REDIS_URL`, `REALTIME_PORT`, `VERCEL`, `VERCEL_ENV`), vì Turbo lọc biến môi trường. `tsx` không tự nạp file `.env`: muốn dùng Redis khi chạy local thì đặt `REDIS_URL` trong shell.
- Client tìm server ở đâu: change `add-online-play` (biến `REALTIME_URL` đọc lúc chạy; ở development mặc định `ws://localhost:3001/api/realtime`).

### 8. Chi phí

Upstash tính script là 1 lệnh + 1 cho mỗi `redis.call` (task 1.2, §3): script tạo phòng (`EXISTS`, `HSET`, `EXPIRE`) = 4, script ghi (`HGET`, `HSET`, `EXPIRE`, `PUBLISH`) = 5. Lần đầu mỗi script chạy trên một Redis chưa nạp nó tốn thêm 1 (`EVALSHA` bị `NOSCRIPT` rồi `EVAL`).

| Việc                           | Lệnh Redis tính phí                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Tạo phòng                      | 4 (script tạo)                                                                               |
| Vào phòng                      | 1 `SUBSCRIBE` (nếu instance chưa nghe phòng) + 1 `HGET` (+5 khi đổi tên)                     |
| Ngồi ghế, một nước đi, ván mới | 1 `HGET` + 5 (script ghi + phát) = 6                                                         |
| Tin phát tới instance khác     | trang giá không nói; ước tính an toàn: 1 mỗi instance đang nghe phòng                        |
| Rời phòng                      | 1 `UNSUBSCRIBE` khi kết nối cuối của phòng trên instance đó đóng                             |
| Kết nối lại mỗi ~5 phút        | như vào phòng, thường không ghi                                                              |
| Subscriber nối lại             | 1 `HGET` mỗi phòng instance đang nghe (đọc lại); lần thử hỏng vì client offline không gửi đi |
| Giữ kết nối Redis sống         | `PING` mỗi 15 giây trên mỗi client: miễn phí trên Upstash                                    |

Một ván Tic-tac-toe 2 người (tạo, hai người vào, một người ngồi, 9 nước): khoảng 4 + 4 + 6 + 54 ≈ 70 lệnh, cộng vài chục lệnh cho kết nối lại và tin giao tới instance khác; gói miễn phí 500 nghìn lệnh/tháng vẫn đủ vài nghìn ván mỗi tháng. Thời gian giữ kết nối: client ngắt khi tab ẩn hoặc rảnh (change `add-online-play`), server ngắt sau 20 phút rảnh (§5.7) và đóng ngay kết nối tạo phòng (§5.3).

### 9. Test

- `packages/protocol`: parse đúng/sai từng thông điệp (kể cả `sit` thiếu tên hoặc tên sai), `readGreetingVersion`, `normalizeRoomCode`, `playerNameSchema` (NFC, ký tự bidi, độ rộng 0; ký tự vô hình và dấu kết hợp viết bằng `\u` trong test), `RoomView` không giữ trường `playerId`.
- `room-service` với kho bộ nhớ, `rng`/`now` giả: mọi dòng bảng §4, kể cả `conflict` ở `join`/`sit`/`move`, xoay ghế, trùng mã, `sit` đổi tên người đã có ghế, `watch`.
- Kho bộ nhớ, kho Redis trên client giả (`fake-redis.ts`, chạy trong CI) và kho Redis thật chạy chung bộ hợp đồng (`describeRoomStore`, kể cả "listener ném lỗi không chặn listener khác"). Client giả đếm `SUBSCRIBE`/`UNSUBSCRIBE` gửi đi (một `SUBSCRIBE` cho hai listener tới cùng lúc, `UNSUBSCRIBE` sau listener cuối): `PUBSUB NUMSUB` của Upstash trễ so với trả lời `SUBSCRIBE` (đo được ~50 ms, có lần hơn 2,5 giây, cả với client `redis` trần) nên không dùng để đếm; trên Upstash thật chỉ kiểm tin vẫn tới listener ở lại và không tới ai sau listener cuối. Client giả còn kiểm các đường hồi phục ở §3: đọc lại khi client lệnh còn offline (và thôi khi phòng hết listener), thay client lệnh sau 2 lần quá hạn hoặc khi `terminated`, nghe lại trên subscriber mới, gỡ lại handler khi `UNSUBSCRIBE` hỏng. Bản Redis thật chỉ chạy khi có `REDIS_URL_TEST`, chạy tay với Upstash thật trước khi archive: `REDIS_URL_TEST=… pnpm --filter @board-games/web test`. Task `test` của Turbo khai báo `env: ["REDIS_URL_TEST"]`: biến là một phần của khoá cache, nên lần chạy có Redis không lấy kết quả cache của lần không có (kiểm bằng `turbo run test --dry=json`: hash khác nhau). Mọi khoá test nằm dưới tiền tố `test:<ngẫu nhiên>:` và bị xoá sau khi chạy.
- Scenario "Kênh chung bị lỡ tin" có test trong CI ở tầng kết nối: kho bộ nhớ bỏ tin của một nước đi, rồi `reconnect()`; người kia nhận `room` có nước đó, người vừa đi không nhận lại bản trùng (lọc theo `revision`).
- Upstash không có `CLIENT KILL` (task 1.2): test cùng scenario ở tầng kho Redis thật bắt socket của client subscriber qua spy `tls.connect`/`net.createConnection`, huỷ nó rồi ghi phòng từ một kho khác đã nối sẵn, để tin `PUBLISH` lỡ thật; đã thử bỏ phần đọc lại khi `ready` thì test đỏ.
- Test của `server/**` và `app/api/**` chạy trong môi trường `node`: `apps/web/vitest.config.ts` có hai project (`dom` với jsdom, `server` với node). Hai project không kế thừa `include` của cấu hình gốc (Vitest cộng dồn mảng); gốc chỉ mang `sharedTestOptions` (`passWithNoTests`, `coverage`) export từ `@board-games/config/vitest`, cùng bộ mà `createVitestConfig` của các gói khác dùng.
- Test route không dùng `vi.resetModules()` (Vitest 5 mất mock khi nạp lại module): mock `serverEnv` để mỗi test chọn môi trường, dựa trên `readServerEnv` thật.
- Tích hợp: `startRealtimeServer({ port: 0, store })` + client `ws` thật: một ván đầy đủ, từ chối kèm `room`, kết nối lại, `room-full`, hai server chung một kho ("hai instance"), thông điệp xấu không làm sập kết nối khác, kho giả lỗi/treo → `unavailable`; mã gõ thường có khoảng trắng; `sit` mang tên mới; `sit` lần hai vẫn nhận `room` kèm `you`; `ping` được trả trước một yêu cầu đang chờ kho treo; phòng hết hạn giữa chừng → `error: room-not-found` rồi đóng; người xem chỉ vào phòng, không gửi gì, vẫn mở qua hạn rảnh nhờ `room` mới; dòng yêu cầu `GET http://[` kèm `Upgrade` không làm sập server (`/healthz` vẫn 200). Mỗi test này đã được kiểm là đỏ khi bỏ phần sửa tương ứng.
- Route: mock `@vercel/functions` và `next/server` (`connection()`); kiểm 426/501/503.
- Trên Vercel: deploy Preview, chạy script khói (một ván qua `/api/realtime` với Upstash) trước khi archive; xem log `close` để biết handler có chạy khi Vercel cắt kết nối không.
- **Kết quả trên Vercel (03/11/2026)**: Preview ở `sin1` với Upstash thật, script khói chạy từ Việt Nam đạt 12/12: tạo phòng (server tự đóng kết nối tạo phòng), vào phòng không có ghế, `sit` mang tên đã sửa, nước sai lượt → `not-your-turn`, nước sai luật → `illegal-move`, nối lại giữa ván nhận đủ 3 nước ở đúng ghế, thắng sau 5 nước, chơi lại xoay ghế, `ping` 77 ms. Từ lúc gửi nước tới khi người kia nhận: 69–73 ms. Lần đầu bị 302 vì khoá vượt bảo vệ cần vài giây mới có hiệu lực. Chưa đo handler `close` khi Vercel cắt ở ~300 giây: ping 30 giây (§5.6) dọn kết nối chết dù handler có chạy hay không.

## Risks / Trade-offs

- [Upstash không cho `PUBLISH` trong script, hoặc tính phí script theo số lệnh bên trong] → đã kiểm ở task 1.2: `PUBLISH` trong script chạy được; Upstash có tính theo số `redis.call`, nhưng tách `PUBLISH` ra cũng tốn đúng bấy nhiêu lệnh nên giữ trong script (§3, §8).
- [Tin pub/sub lỡ khi subscriber mất kết nối] → kho đọc lại phòng khi subscriber `ready` lại; mọi lời từ chối kèm `room` hiện tại; client nối lại mỗi ~5 phút nhận bản đầy đủ.
- [Handler `close` không chạy khi Vercel cắt function] → ping 30 giây + listener tự gỡ khi socket không `OPEN`.
- [Kết nối giữ instance sống, tốn GB-giờ; vượt hạn mức Hobby có thể làm Vercel tạm dừng cả app] → server ngắt kết nối rảnh 20 phút, client ngắt sớm hơn; theo dõi tab Usage sau M4.
- [Người lạ có link vào trước bạn] → chấp nhận cho nhóm nhỏ; ngồi ghế phải bấm "Vào chơi" (change `add-online-play`).
- [Kết nối TCP nửa sống tới Redis: lệnh đã ghi không bao giờ có trả lời, `redis` chờ mãi] → hạn 5 giây cho mọi thao tác, thay client sau 2 lần quá hạn liên tiếp, `PING` + `socketTimeout` cho subscriber, chiến lược nối lại không bao giờ bỏ cuộc (§3). Còn lại: subscriber nửa sống có thể trễ tới ~55 giây mới bị thay; trong lúc đó người chơi chậm thấy nước của người khác (nước của chính mình vẫn tới ngay).
- [Không giới hạn số phòng tạo hay số lần vào phòng theo IP hay toàn cục] → chấp nhận cho M4 (nhóm nhỏ, link không công khai): một script mở kết nối liên tục có thể đốt hết hạn mức lệnh của Upstash (500 nghìn/tháng) hay GB-giờ của Vercel. Giới hạn hiện có chỉ theo từng kết nối (§5.7–§5.8). Giảm thiểu sau nếu cần: luật firewall/rate limit của Vercel cho `/api/realtime`, hoặc bộ đếm `create`/`join` theo IP trong bộ nhớ của mỗi instance (không chính xác giữa các instance nhưng không tốn lệnh Redis).
- [Tab cũ sau deploy] → `protocol` trong lời chào, `outdated-client`. [Đổi luật hay định dạng làm phòng cũ (≤ 7 ngày) không đọc được] → `format` trong `StoredRoom`, phòng đọc không được coi như không tồn tại; chấp nhận.

## Migration Plan

Không có dữ liệu cũ. Deploy: `REDIS_URL` đã có ở cả Production và Preview (M3). Gỡ: xoá route `/api/realtime`; phòng trong Redis tự hết hạn sau 7 ngày.

## Open Questions

(không có)
