# Design

## Context

- Sau `add-online-rooms`:
  - `packages/protocol` có `PROTOCOL_VERSION`, `normalizeRoomCode`, `playerNameSchema`, `RoomView` (`code`, `gameId`, `revision`, `gameNumber`, `seats: (SeatView | null)[]`, `record`), bảng mã lỗi `RejectionCode`, thông điệp `create`/`join`/`sit`/`move`/`rematch`/`ping` và `created`/`room`/`rejected`/`error`/`pong`, `parseServerMessage`.
  - Server ở `/api/realtime` (Vercel) hoặc server realtime chạy bằng `pnpm --filter @board-games/web realtime` (máy, cổng 3001, `/healthz`); `pnpm dev` chạy kèm server realtime.
  - Server gửi `room` đầy đủ kèm `you` ngay khi vào phòng, sau mỗi thay đổi, và trước mỗi lời từ chối `move`/`rematch`. Vào phòng (`join`) không chiếm ghế; người mới phải `sit`. `move` mang `gameNumber` + `moveIndex`; `rematch` mang `gameNumber`.
  - Server đóng mã `4000` khi không chào kịp, `4001` khi rảnh 20 phút; `error` đóng kết nối (bảng mã lỗi ở design §2 của change đó).
- Web sau M2:
  - `PlayScreen` chỉ đọc `ReadySnapshot` (`canMove`, `viewer`, `seats`, `waitingFor`, `inProgress`, `lastMover`…) và gửi yêu cầu qua `Transport`; `GamePlay` tạo transport trong effect; `loadGameEntry(gameId)` nạp lười luật + giao diện.
  - `features/setup`: `SetupScreen`, `SetupChoice` nhớ ở `localStorage`. `readSetupChoice` ép chế độ về `local` khi game không có AI. `SetupScreen` ẩn nhóm chọn chế độ khi chỉ có một chế độ, và hỏi xác nhận khi không đọc được ván đã lưu.
  - `SeatController` (`human` | `ai`) cũng là dữ liệu lưu (`ModeSettings`, `seatSchema`). `TransportEvent.rejected.code` đang là `EngineErrorCode`.
- M3: kết nối bị cắt mỗi ~5 phút (mã `1006`); nối lại ở `sin1` ~0,3 giây; kết nối mở là instance sống, tốn GB-giờ (gói Hobby 360 GB-giờ/tháng, function 2 GB → khoảng 180 giờ kết nối/tháng cho cả nhóm).
- Yêu cầu hành vi: `specs/player-identity`, `specs/online-play`, `specs/game-setup`, `specs/game-menu`.

## Goals / Non-Goals

**Goals:**

- `PlayScreen` dùng chung cho cả ba chế độ; online chỉ thêm một loại ghế và vài trường ảnh chụp.
- Người chơi không bao giờ phải tự tải lại trang để tiếp tục ván, kể cả với kết nối "nửa sống" (socket còn mở nhưng mạng đã mất mà không ai báo).
- Kết nối chỉ mở khi người chơi đang dùng trang phòng; tab bỏ quên không giữ instance sống.
- Logic kết nối lại và dựng ván test được bằng socket giả, đồng hồ giả, môi trường giả.

**Non-Goals:**

- Hiện nước trước khi server xác nhận (§4).
- Danh sách phòng đang chơi trên menu: M8.

## Decisions

### 1. Danh tính (`features/identity/`)

```ts
interface Identity { readonly playerId: string; readonly name: string }
readIdentity(): Identity | null;            // localStorage "board-games:identity", zod; hỏng → null
saveName(name: string): Identity;           // giữ playerId cũ, chưa có thì tạo mới
```

- `playerId` tạo bằng `crypto.randomUUID()`, không có (trang `http://` qua IP mạng LAN không phải secure context) thì 16 byte từ `crypto.getRandomValues` dạng hex. Chỉ tạo khi người chơi lưu tên lần đầu.
- `localStorage` bị chặn: giữ danh tính trong bộ nhớ của tab; tải lại trang sẽ là người mới. Không báo lỗi. Bản trong bộ nhớ chỉ được đọc khi trình duyệt từ chối đọc hoặc đã từ chối ghi; khi đã từ chối ghi (đầy bộ nhớ), bản trong bộ nhớ **thắng** bản cũ trình duyệt còn giữ nhưng không cập nhật được nữa. Còn lại `localStorage` là nguồn duy nhất (xoá dữ liệu trình duyệt thì là người mới).
- `parsePlayerName(raw)` trả tên đã chuẩn hoá hoặc `null`, dùng chung cho `NameField`, trang phòng, sảnh chờ và màn hình bắt đầu ván.
- Tên kiểm bằng `playerNameSchema` của `packages/protocol`, nên client và server không lệch.
- `NameField` (ô tên có nhãn, lỗi gắn bằng `aria-describedby`, nhận `ref` tới ô nhập): ở màn hình bắt đầu ván (chế độ Online, **lưu khi rời ô** nếu tên hợp lệ, và khi bấm "Tạo phòng") và ở trang phòng (hỏi tên khi chưa có; ở sảnh chờ người chưa có ghế sửa được tên trước khi bấm "Vào chơi").
- Tên bị từ chối khi xác nhận → form đưa focus về ô tên (qua `ref`), để trình đọc màn hình đọc lời báo gắn với ô; cách này được chọn thay vì `role="alert"` vì không đọc trùng khi ô đã có focus. Bước hỏi tên của trang phòng đặt focus vào ô ngay khi hiện (trang chỉ có câu hỏi đó).
- Test component dùng `src/test/fresh-identity.ts`: `vi.mock` module danh tính bằng bản chuyển mọi lời gọi tới một bản thật nạp mới mỗi test (`vi.resetModules` + `vi.importActual`), để danh tính trong bộ nhớ của một test (trình duyệt từ chối lưu) không lọt sang test sau.

### 2. Server realtime ở đâu

- Trang server (`app/play/[gameId]/page.tsx`, `app/room/[code]/page.tsx`) `await connection()` rồi đọc `process.env.REALTIME_URL` **lúc chạy** (`configuredRealtimeUrl` trong `lib/realtime-url.ts`, kiểm bằng zod: phải là địa chỉ `ws:`/`wss:`, sai thì coi như không đặt), truyền xuống client dạng chuỗi hoặc `null`.
- Không đặt biến: ở `NODE_ENV=development` thì `ws://localhost:3001/api/realtime` (tính trên server); còn lại `null`, và client (`resolveRealtimeUrl`) dùng cùng origin `wss://<host>/api/realtime` (`ws://` khi trang là `http:`).
- Lý do: biến `NEXT_PUBLIC_*` bị đóng cứng lúc build; E2E chạy bản build production với server realtime ở cổng khác, còn Vercel dùng cùng origin.
- `pnpm dev` chạy `next dev` qua Turbo, vốn lọc biến môi trường: task `dev` khai báo `passThroughEnv: ["REALTIME_URL"]`, để điện thoại trong mạng LAN dùng được server realtime của máy (`REALTIME_URL=ws://<IP máy>:3001/api/realtime pnpm dev`, README).
- E2E: `playwright.config.ts` có hai `webServer`:
  - `pnpm start --port 3100` với `env: { REALTIME_URL: "ws://localhost:3101/api/realtime" }`;
  - `pnpm realtime` với `env: { REALTIME_PORT: "3101", REDIS_URL: "" }` (chuỗi rỗng coi như không đặt, nên phòng nằm trong bộ nhớ dù shell có `REDIS_URL`), chờ ở `url: http://localhost:3101/healthz`, `reuseExistingServer: false` cả ở máy: server realtime còn chạy từ lần trước (code cũ, phòng cũ) không được dùng lại; cổng bận thì lần chạy báo lỗi.

### 3. Kết nối phòng (`transport/room-connection.ts`)

Không biết game; chỉ biết giao thức.

```ts
// transport/types.ts: CONNECTION_STATUS (as const) và kiểu suy ra từ nó, dùng chung cho ảnh chụp,
// sảnh chờ và dòng trạng thái kết nối; không so chuỗi trực tiếp.
type ConnectionStatus = "connecting" | "online" | "reconnecting" | "paused" | "idle" | "failed";
interface RoomConnectionSnapshot {
  readonly status: ConnectionStatus;
  readonly room: RoomView | null;   // bản mới nhất đã nhận, giữ qua các lần nối lại
  readonly you: PlayerIndex | null;
  readonly failure: RejectionCode | null;   // khi status = "failed"
  readonly slow: boolean;                   // chưa từng online sau 10 giây (§5)
}
createRoomConnection({ url, code, getIdentity, openSocket, environment, random }): {
  getSnapshot(): RoomConnectionSnapshot; subscribe(listener): () => void;
  send(request: RoomRequest): boolean; // sit | move | rematch; false khi không "online"; sit có hạn 8 giây
  onRejected(listener): () => void;    // { request, code }
  onSynced(listener): () => void;      // room đầu tiên sau mỗi join đã tới
  resume(): void;      // từ "idle"/"paused": nối lại ngay
  reconnect(): void;   // bỏ socket đang có và nối lại ngay (transport gọi khi quá 8 giây không có trả lời)
  dispose(): void;
}
```

Hẹn giờ là `setTimeout`/`setInterval` toàn cục (test dùng `vi.useFakeTimers()`), không tiêm `timers` riêng: đồng hồ giả của Vitest đã thay cả hai và cả `Date.now`.

**Chào.** Gửi `join { protocol, code, playerId, name }` khi socket mở, với danh tính đọc bằng `getIdentity()` **ở mỗi lần chào**: tên sửa ở sảnh chờ, hay ở màn hình bắt đầu ván của tab khác, là tên phòng thấy sau lần nối lại kế tiếp, không bị lời chào mang tên cũ đổi ngược. Trang phòng truyền `() => readIdentity() ?? <danh tính của trang>`, nên đổi tên không tạo lại kết nối. Phương án đã cân nhắc: cập nhật tên trong kết nối khi gửi `sit`; không đủ, vì tên sửa ở tab khác không đi qua `sit`.

**Nhận `room`.** `room` **đầu tiên sau mỗi lần `join`** luôn thay bản đang giữ, dù `revision` nhỏ hơn (Redis mất dữ liệu, failover). Khi đó trạng thái chuyển `online`, hẹn 30 giây để đặt giãn cách về 0 (xem "Nối lại"), và sự kiện "đã đồng bộ lại" (`onSynced`) được phát để transport gỡ cờ chờ. Các `room` sau chỉ thay khi `revision` lớn hơn.

**Hết ghế.** `room` có `you = null` mà không còn ghế trống (người chưa có ghế mở link phòng đã đủ người, hay người khác vừa ngồi ghế cuối) → `failed` với `room-full` và đóng socket, ngay ở tầng kết nối: không xem phòng người khác ở M4. `rejected` `room-full` cho `sit` cũng vậy (khi `room` đi kèm không mới hơn bản đã có). Trang phòng chỉ đọc `failed`, không tự kiểm "chưa có ghế và hết ghế".

**Ngồi ghế.** `send(sit)` hẹn 8 giây; `room` có `you` khác `null`, `rejected` của `sit`, hay socket bị bỏ thì huỷ hẹn. Quá hạn → bỏ socket và nối lại ngay, như nước đi không được trả lời (§4): lời chào sau đó cho biết đã có ghế hay chưa, và sảnh chờ mở lại nút "Vào chơi" khi kết nối rời `online`. Hẹn nằm ở kết nối vì chỉ kết nối biết giao thức (`room`/`you`); sảnh chờ không giữ hẹn giờ.

**Kiểm kết nối sống.** Khi tab đang hiện:

- gửi `ping` mỗi 20 giây khi `online`;
- quá 45 giây không nhận được khung nào (kể cả lúc đang chờ `room` đầu tiên sau khi mở socket) → tự `close()` và nối lại (kết nối "nửa sống": đổi Wi-Fi sang 4G, NAT xoá mapping). Tab ẩn thì dừng cả hai, hiện lại thì đếm lại từ đầu.

**Nối lại.** Áp khi socket đóng (mọi mã trừ `4001`, kể cả `1006`, `4000`), khi chưa `dispose` và chưa `failed`/`idle`/`paused`:

- trạng thái chuyển `reconnecting`;
- thử lại sau 0 ms, 1 s, 2 s, 4 s, 8 s rồi mỗi 10 s;
- mỗi khoảng chờ nhân hệ số ngẫu nhiên trong [0,8; 1], nên không bao giờ quá 10 giây và hai người không thử cùng lúc;
- không giới hạn số lần.

Giãn cách chỉ về 0 khi giữ được `online` **liên tục ít nhất 30 giây**, với **mọi** kiểu đóng, không riêng vài mã lỗi: server đóng ngay sau mỗi lời chào (lỗi, quá tải) thì các lần thử giãn dần thay vì vòng "bị đóng → nối ngay → bị đóng". Lần Vercel cắt sau ~5 phút vẫn được nối lại ngay, vì khi đó đã `online` quá 30 giây. Phương án cũ (về 0 sau mỗi lời chào thành công, trừ ba mã lỗi) bị bỏ: một server đóng bằng `1006` ngay sau lời chào sẽ bị gọi liên tục.

`error` (server đóng ngay sau đó) ngoài hai mã ở "Lỗi nặng" → bỏ socket và nối lại. `rejected` mang `invalid-message`, `too-many-messages` hay `unavailable` (server không đóng): client báo lời từ chối cho transport (gỡ cờ chờ) rồi tự đóng và nối lại, để lần chào sau mang về trạng thái mới nhất.

**Lỗi nặng** → `failed`, đóng socket, không nối lại:

- `error` với `room-not-found` hoặc `outdated-client`;
- hết ghế khi mình chưa có ghế ("Hết ghế" ở trên), kể cả `rejected` `room-full` cho `sit` của chính mình.

**Thứ tự ưu tiên của các sự kiện môi trường.**

| Sự kiện          | Xử lý                                                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab ẩn ≥ 60 giây | → `paused`, đóng socket. Đo bằng mốc thời gian lúc ẩn (`now()`), không chỉ bằng hẹn giờ: điện thoại khoá màn hình làm treo hẹn giờ.                                                                              |
| Tab hiện lại     | Ẩn ≥ 60 giây theo mốc thời gian → ép nối lại ngay, kể cả khi trạng thái vẫn ghi `online`, vì socket có thể đã chết khi máy ngủ. Ẩn ngắn hơn → không làm gì. Nghe cả `visibilitychange` và `pageshow`.            |
| `offline`        | Đóng socket, `reconnecting`.                                                                                                                                                                                     |
| `online`         | Thử ngay khi chưa có socket (đang chờ lần thử sau) **hoặc** socket chưa vào phòng (lần thử mở lúc mất mạng có thể treo, không mở cũng không đóng), nhưng **chỉ khi tab đang hiện**. Tab ẩn thì chờ tới khi hiện. |
| `paused`         | Thắng mọi sự kiện mạng: không có gì mở lại socket khi tab đang ẩn.                                                                                                                                               |

**Rảnh.** 10 phút không có `room` mới và không có thao tác của người chơi trên trang (`pointerdown`, `keydown`, hay một yêu cầu gửi đi) → `idle`, đóng socket. `room` đầu sau mỗi lần chào chỉ tính là hoạt động khi chưa có bản nào hoặc `revision` khác bản đang giữ: lần Vercel cắt mỗi ~5 phút trả lại đúng phòng cũ, và nếu tính nó thì tab bỏ quên không bao giờ rảnh. Màn hình hiện "Đã tạm ngắt vì lâu không có hoạt động" với nút "Tiếp tục" (`resume()`). Server đóng `4001` → cũng `idle`. Lúc `paused` không đếm rảnh: tab hiện lại thì nối lại và đếm lại từ đầu.

**Phụ thuộc tiêm vào.** `openSocket(url, { onOpen, onMessage, onClose })` (`transport/socket.ts`) trả `{ send, close }`; bản mặc định bọc `WebSocket` của trình duyệt, và địa chỉ bị trình duyệt từ chối (`new WebSocket` ném lỗi) được báo như kết nối đóng `1006`. `environment` (`isVisible()`, `now()`, `listen(listener)`) gói `visibilityState` và các sự kiện `visibilitychange`/`pageshow` (→ `"visibility"`), `online`, `offline`, `pointerdown`/`keydown` (→ `"activity"`). `random` cho hệ số giãn cách. Test truyền bản giả của cả ba (`src/test/fake-realtime.ts`).

**Dữ liệu từ mạng.** Mọi khung nhận được qua `readServerMessage` (`JSON.parse` + `parseServerMessage`); không phải chuỗi, JSON hỏng hay sai định dạng → bỏ qua và `console.warn`.

### 4. Transport online (`transport/online-transport.ts`)

```ts
createOnlineTransport({ definition, connection }): OnlineTransport<State, Move, Outcome>
// = Transport<State, Move, Outcome> & { isBroken(): boolean }
```

**Dựng ván.** Mỗi lần `room` đổi: `fromRecord(definition, room.record)` → `Session`, phát lại cả ván từ biên bản (bất biến "một ván = danh sách nước đi"). Biên bản hỏng hoặc sai game → `isBroken()` thành `true` (báo một lần bằng sự kiện `changed`), ảnh chụp giữ bản đúng gần nhất, và transport **thôi theo dõi** phòng: không phát lại biên bản hỏng mỗi khi trạng thái kết nối đổi, không gỡ `isBroken()` nữa. Trang phòng hiện trang lỗi "Không mở được phòng" và dừng hẳn kết nối (§6); "Thử lại" tạo kết nối và transport mới. Transport không sở hữu kết nối: trang phòng tạo và huỷ nó.

**Ghế trong ảnh chụp.** `ReadySnapshot.seats` đổi kiểu thành `SeatView[]`, với `SeatView = SeatController | { kind: "remote"; name: string | null }` (`null` = ghế trống). `SeatController` giữ nguyên vì nó là dữ liệu lưu của chế độ cục bộ; ghế `remote` không bao giờ vào `ModeSettings`. Ghế `you` là `{ kind: "human" }`, `viewer = you`. `useModeLabel` bỏ qua ghế `remote`.

**Đi.** `canMove` = `online` ∧ đủ người ∧ chưa có kết quả ∧ đến lượt `you` ∧ không có cờ chờ. Khi `submit(move)` và `canMove`:

1. Gửi `move { gameNumber, moveIndex: số nước đã có, move }`.
2. Bật cờ chờ `{ gameNumber, moveIndex }`, nên `canMove` sai.
3. Cờ chờ gỡ khi có `room` của ván khác (`gameNumber` đổi) hoặc có hơn `moveIndex` nước, khi có `rejected`, hoặc khi đồng bộ lại sau `join`. **Không** gỡ theo `revision`: đối thủ đổi tên hay có người ngồi vào ghế làm `revision` tăng mà nước đi chưa được trả lời, và gỡ lúc đó cho gửi nước thứ hai.
4. Quá 8 giây chưa gỡ → ép kết nối nối lại. Lần đồng bộ sau `join` sẽ cho biết nước đi đã được ghi hay chưa.

**Không hiện trước.** Nước đi chỉ hiện khi server gửi `room` mới. Lý do:

- độ trễ ~70 ms ở `sin1` không cảm nhận được;
- hiện trước thì phải xử lý quay lui;
- với game có xúc xắc (M6), client không biết trước kết quả.

idea.md §6.3 cập nhật theo. Nếu đo thực tế thấy chậm thì thêm sau, chỉ trong transport này. Không chạm bất biến: "client chỉ hiển thị trước" là giới hạn (client không quyết), không phải nghĩa vụ.

**Bị từ chối.** Khi có `rejected` của `move`:

- gỡ cờ chờ; `room` hiện tại đã tới ngay trước nên bàn đúng theo server;
- phát `TransportEvent` `rejected` **chỉ** với mã của luật (`ENGINE_ERROR` trừ `game-over`). Các mã khác (`stale-move`, `not-your-turn`, `game-over`, `waiting-for-players`, `not-seated`…) không phát: `room` đi kèm đã giải thích. Đây là nơi duy nhất lọc mã của server; `PlayScreen` không biết mã nào. `TransportEvent.rejected.code` nới thành `RejectionCode`. Lời từ chối `sit` là việc của kết nối và sảnh chờ, transport bỏ qua.

`PlayScreen` báo ngắn "Nước đi không hợp lệ." (`role="alert"`, trong dòng giữ chỗ của kết nối) với mọi sự kiện `rejected`, ghi lại số nước lúc đó, và bỏ lời báo khi số nước đổi (có nước mới hoặc ván mới), không phải khi có sự kiện `changed` bất kỳ: trạng thái kết nối đổi không xoá lời báo. Chỉ ở ván online, nên chơi cùng máy và đấu với máy không đổi.

**Ván mới và hoàn tác.**

- `requestNewGame()` khi ván đã có kết quả → `rematch { gameNumber }`, bật cờ chờ như một nước đi (bấm hai lần chỉ gửi một lần; quá 8 giây thì nối lại). Ván đã xong không có thêm nước, nên chỉ ván mới (`gameNumber` đổi) gỡ cờ.
- `requestUndo`/`requestRedo` không làm gì.

**Ảnh chụp mới.** Thêm vào `ReadySnapshot`; transport cục bộ điền giá trị cũ.

| Trường            | Cục bộ         | Online                                            |
| ----------------- | -------------- | ------------------------------------------------- |
| `waitingFor`      | `"ai" \| null` | `"opponent"` khi đến lượt ghế `remote`            |
| `supportsUndo`    | `true`         | `false` → `PlayScreen` ẩn hai nút                 |
| `canStartNewGame` | `true`         | chỉ khi ván đã có kết quả                         |
| `connection`      | `null`         | `ConnectionStatus`                                |
| `inProgress`      | như cũ         | luôn `false` (server giữ ván, không có gì để mất) |

### 5. Trang phòng (`app/room/[code]/`, `features/room/`)

**`page.tsx` (server).**

- `normalizeRoomCode(code)`; sai định dạng → `notFound()`.
- Khác dạng chuẩn (viết thường) → `redirect` sang dạng chuẩn.
- Truyền `code` và `realtimeUrl`. Title của trang: "Phòng <mã>", đã dịch.

**`RoomRoute` (client), theo thứ tự:**

1. Chưa có tên → `NameField` (focus sẵn) + nút "Tiếp tục".
2. `RoomSession` tạo `RoomConnection` trong effect, giống `GamePlay`, để mount hai lần ở dev vẫn đúng. Effect không phụ thuộc danh tính: kết nối đọc danh tính ở mỗi lần chào (§3), nên đổi tên không tạo lại kết nối. "Thử lại" tạo kết nối mới bằng cách đổi `key`.
3. Chưa có `room` → "Đang vào phòng…". Quá 10 giây chưa từng `online` (`slow`) → thêm "Chưa kết nối được máy chủ" và lối về menu; vẫn thử lại phía sau.
4. Có `room`:
   - kiểm `isRegisteredGameId(room.gameId)`, sai → trang lỗi "Không mở được phòng" (§6);
   - `loadGameEntry(room.gameId)` (Suspense; lỗi tải dùng lại trang lỗi tải game của M2);
   - `createOnlineTransport` trong effect của `OnlineGame`; khi đã có transport, component con nhận transport khác `null` mới đọc `isBroken()` (không dùng đối tượng giả khi chưa có).

`RoomSession` sở hữu kết nối nên cũng là nơi dừng nó: game không có trong app hay biên bản không dựng được (`isBroken()`) thì component con báo lên (`onBroken`, từ effect), `RoomSession` hiện trang lỗi và `dispose()` kết nối. Phương án đã cân nhắc: để component con tự `dispose` kết nối của cha (như trang "đủ người" cũ); bỏ vì việc dừng nằm rải ở nhiều nơi không sở hữu kết nối.

**Sảnh chờ** (`RoomLobby`). Hiện khi phòng còn ghế trống, **hoặc** khi mình chưa có ghế:

- tên game, mã phòng;
- link mời `<origin>/room/<mã>` với nút "Sao chép link" (Clipboard API; thất bại thì chọn sẵn chữ để tự sao chép) và nút "Chia sẻ" (chỉ khi có `navigator.share`);
- danh sách ghế: tên, "(bạn)" ở ghế của mình, hoặc "Đang chờ…".

Người chưa có ghế:

- còn ghế trống → thấy `NameField` với tên đã nhớ và nút **"Vào chơi"**, gửi `sit { name }` với tên **đang có trong ô** (đã sửa thì là tên mới), vì tên lúc `join` có thể đã cũ; server ngồi người đó dưới tên này (change `add-online-rooms` §2). Trang phòng (`RoomSession`) nhớ tên đó (`saveName`) và cập nhật danh tính của trang, nên các lần chào sau cũng mang tên mới. Nút khoá tới khi có trả lời; quá 8 giây không có thì kết nối tự nối lại (§3). Tên không hợp lệ → focus về ô tên. Không tự ngồi: người tạo phòng lỡ mở link của chính mình trong trình duyệt khác (trình duyệt trong ứng dụng chat) sẽ thấy tên mình đã ngồi ghế đầu và không chiếm ghế của bạn;
- hết ghế → kết nối tự chuyển `failed` với `room-full` và đóng socket (§3); trang phòng hiện "Phòng đã đủ người".

Có ghế và đủ người → `PlayScreen`. Nếu sảnh chờ đã hiện trước đó, tiêu đề của màn hình ván nhận focus (prop `focusTitle` của `PlayScreen`, `h1` với `tabIndex={-1}`), vì nút "Vào chơi" đang có focus đã biến mất.

Ô link mời là `Input` chỉ đọc có nhãn "Link mời", để chọn sẵn chữ được khi Clipboard API lỗi. Sảnh chờ cũng có dòng trạng thái kết nối như `PlayScreen`. Ô chữ dùng component `Input` mới của `packages/ui`, lời báo lỗi dùng token màu mới `danger`.

**`PlayScreen`.**

- Header thêm huy hiệu "Online" khi có ghế `remote`.
- Dòng trạng thái kết nối (`features/play/ConnectionNotice.tsx`, dùng chung với sảnh chờ) có chỗ giữ sẵn dưới header, để bàn không bị đẩy xuống; lề âm bù khoảng cách của cột nằm trong chính component, nơi dùng không phải tự thêm. Dòng chỉ hiện khi `connection` khác `online` **liên tục quá 1,5 giây**, để lần nối lại ~0,3 giây mỗi 5 phút không làm chữ nhấp nháy. `idle` hiện ngay, kèm nút "Tiếp tục"; `PlayScreen` nhận thêm prop `onResume` (trang phòng truyền `connection.resume`).
- Nút ván mới chỉ hiện khi `canStartNewGame`; khi có ghế `remote` (ván online) tên là "Chơi lại" và không hỏi xác nhận (`inProgress` luôn sai). Tên nút theo ghế `remote`, không theo `connection`, giống huy hiệu "Online".

### 6. Trang lỗi phòng

| Trường hợp                             | Thông báo                                                | Lối ra             |
| -------------------------------------- | -------------------------------------------------------- | ------------------ |
| `room-not-found`                       | Không tìm thấy phòng (sai mã hoặc đã hết hạn sau 7 ngày) | Về menu            |
| `room-full` (khi mình chưa có ghế)     | Phòng đã đủ người                                        | Về menu            |
| `outdated-client`                      | App vừa được cập nhật                                    | "Tải lại trang"    |
| Biên bản hỏng, game không có trong app | Không mở được phòng                                      | "Thử lại", về menu |

Không trang nào trong bảng tự kết nối lại. Ba dòng đầu: kết nối đã `failed` và đóng socket (§3). Dòng cuối: trang phòng `dispose()` kết nối (§5); "Thử lại" mở phòng từ đầu với kết nối mới.

### 7. Lời báo lượt và kết quả

`describeStatus` mở rộng theo ghế và vẫn chỉ đọc ảnh chụp:

| Tình huống                            | Lời báo                                                                       |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Đến lượt mình                         | "Đến lượt bạn"                                                                |
| Nước vừa đi là của ghế `remote`       | "Minh vừa đánh hàng 2, cột 3. Đến lượt bạn" (dùng `useMoveLabel` như với máy) |
| Đến lượt ghế `remote`                 | "Đang chờ Minh…"                                                              |
| Ván chưa có nước nào, có ghế `remote` | "Ván mới: bạn cầm O, Minh đi trước" hoặc "Ván mới: bạn cầm X và đi trước"     |
| Mình thắng                            | "Bạn thắng!"                                                                  |
| Ghế `remote` thắng                    | "Minh thắng"                                                                  |
| Hoà                                   | như cũ                                                                        |

Lời "Ván mới" dùng `usePlayerLabel` và `seats`. Ván mới đổi phe của người không bấm "Chơi lại", nên lời báo phải nói rõ phe mới.

Tên là dữ liệu người dùng nhập: React tự thoát ký tự, và tên đi vào bản dịch qua tham số ICU, không ghép chuỗi.

### 8. Tạo phòng từ màn hình bắt đầu

- **Kiểu dữ liệu.** `SetupChoice.mode` có kiểu `SetupMode` (`SETUP_MODE = { ...SLOT_MODE, Online: "online" }`). `SlotMode` giữ nguyên vì ván online không có slot lưu.
- **Địa chỉ server.** `SetupScreen` nhận thêm prop `realtimeUrl` từ `page.tsx` (§2) và prop `createRoom` (bản giả trong test).
- **Đọc lựa chọn đã nhớ.** `readSetupChoice` nhận `online` và chỉ ép `ai` về `local` khi game không có AI.
- **Nhóm chọn chế độ** luôn hiện, vì mọi game có ít nhất "Cùng máy" và "Online".
- **Màn hình chế độ Online:**
  - hiện `NameField` (điền sẵn tên đã nhớ) thay cho mức độ và người đi trước;
  - nút chính là "Tạo phòng";
  - không đọc danh sách ván dở để quyết việc hỏi xác nhận, không hỏi xác nhận kể cả khi không đọc được ván đã lưu: tạo phòng không bỏ ván nào.
- **Bấm "Tạo phòng":**
  1. Kiểm tên rồi `saveName`; tên không hợp lệ → focus về ô tên, không tạo phòng.
  2. Nút khoá trong lúc chờ (`aria-disabled`, và một `ref` kiểm ngay trong lần bấm, nên hai lần bấm trước khi React vẽ lại vẫn chỉ ra một phòng); cạnh nút có vùng `role="status"` (luôn có mặt ở chế độ Online) hiện "Đang tạo phòng…".
  3. `createRoom({ url, gameId, identity })` (`features/room/create-room.ts`, trả `{ ok: true, code }` hoặc `{ ok: false, error }` với `error` là mã của server hoặc `unreachable`): kết nối ngắn, `create` → `created`. Quá 10 giây, mất kết nối hoặc `error` → báo lỗi tại chỗ (`role="alert"`) và mở khoá nút; riêng `outdated-client` báo app vừa được cập nhật kèm nút "Tải lại trang", thay cho lời báo lỗi mạng. Nếu `created` về sau hạn thì bỏ qua; phòng thừa tự hết hạn. Socket được khai báo trước mọi chỗ có thể kết thúc lời hứa, nên socket báo đóng ngay khi đang mở cũng không lỗi.
  4. Người chơi đã rời màn hình (về menu) trước khi có kết quả → bỏ qua kết quả: không nhớ lựa chọn, không chuyển trang.
  5. Nhớ lựa chọn.
  6. `router.push("/room/<mã>")`.

### 9. Menu: vào phòng bằng mã

Mục "Vào phòng bằng mã" (`features/menu/JoinRoomForm.tsx`: một `section` có tiêu đề `h2` như mục "Tiếp tục ván dở", ô "Mã phòng" + nút "Vào phòng"; tiêu đề khác chữ của nút để trình đọc màn hình không đọc trùng) dưới danh sách game và trên mục "Tiếp tục ván dở" (mục này hiện sau khi đọc xong IndexedDB, không được đẩy form xuống):

- `normalizeRoomCode` đúng → `router.push("/room/<mã>")`;
- sai → lời báo lỗi gắn với ô (`aria-describedby`) và focus về ô, để lời báo được đọc; không rời trang;
- phòng không tồn tại thì trang phòng báo (§6).

### 10. Test

**Đơn vị:**

- `identity`: `localStorage` hỏng hoặc bị chặn, không có `randomUUID`.
- `room-connection`, với socket giả, `vi.useFakeTimers()`, môi trường giả:
  - nối lại với giãn cách ≤ 10 giây;
  - `room` đầu sau `join` luôn thay bản đang giữ;
  - nhịp `ping`, kết nối im lặng 45 giây;
  - lỗi nặng không nối lại; lỗi không đặt lại giãn cách;
  - ẩn tab theo mốc thời gian, `online` khi tab ẩn, `online` khi lần thử còn treo;
  - rảnh 10 phút, kể cả khi server cắt mỗi 5 phút và trả lại cùng `revision`; đóng `4001`;
  - tên đọc lại ở mỗi lần chào; hết ghế khi chưa có ghế; `sit` không được trả lời trong 8 giây;
  - giãn cách vẫn tăng khi server đóng ngay sau mỗi lời chào.
- `online-transport`:
  - dựng ván, `canMove`;
  - cờ chờ và hạn 8 giây, `rejected` (chỉ mã của luật được phát); cờ chờ không gỡ khi phòng đổi vì việc khác (đổi tên);
  - biên bản hỏng báo một lần rồi thôi theo dõi;
  - `rematch` kèm `gameNumber`, ghế `remote`.
- Transport cục bộ điền trường mới.

**Component** (`renderWithIntl`):

- sảnh chờ: người tạo, người mới có "Vào chơi", focus về ô tên khi tên sai;
- trang phòng: hết ghế, trang lỗi dừng kết nối, tên sửa ở sảnh chờ còn sau khi nối lại, "Thử lại" dùng tên mới nhất, focus vào tiêu đề khi sảnh chờ nhường chỗ cho ván;
- trang lỗi phòng;
- `PlayScreen` online: lời báo theo tên, ván mới nói phe, ẩn hoàn tác, "Chơi lại" chỉ sau kết quả và theo ghế `remote`, dòng kết nối sau 1,5 giây, `idle` có "Tiếp tục", lời báo nước bị từ chối còn khi kết nối đổi;
- màn hình bắt đầu ván chế độ Online: hai lần bấm trong cùng một lượt vẽ, "Đang tạo phòng…", rời màn hình trước khi có kết quả, `outdated-client`;
- form vào phòng của menu (tiêu đề, focus khi mã sai);
- `Input` của `packages/ui`.

**E2E** (`e2e/online.spec.ts`, hai `browser.newContext()`):

- tạo phòng → mở link ở trình duyệt thứ hai → "Vào chơi" → chơi hết ván → "Chơi lại" đổi phe;
- `context.setOffline(true/false)` giữa ván (dựa vào sự kiện `online` nối lại ngay, không vào thời gian giãn cách);
- tải lại trang giữa ván;
- mã sai ở menu, phòng không tồn tại;
- người thứ ba thấy "Phòng đã đủ người".

## Risks / Trade-offs

- **Mất `playerId`** khi xoá dữ liệu trình duyệt hay đổi máy → vào lại phòng thành người mới, phòng đủ người thì không ngồi được. "Đây là tôi" để sau (proposal). Chấp nhận cho nhóm bạn.
- **Hai tab cùng `playerId`** → cả hai điều khiển cùng ghế. Server vẫn kiểm lượt và vị trí ván nên ván không sai. Không chặn.
- **Tab để hiện trước mắt nhưng không ai chơi** → ngắt sau 10 phút rảnh (§3); server ngắt sau 20 phút. Theo dõi tab Usage sau M4.
- **`setOffline` của Playwright có thể không đóng WebSocket đang mở** → client tự đóng khi nhận sự kiện `offline` (§3), nên E2E không phụ thuộc cách trình duyệt giả lập.
- **Preview có Deployment Protection**, điện thoại không đăng nhập Vercel bị chặn → thử trên hai thiết bị bằng Production sau khi merge, hoặc link chia sẻ của Preview.
- **Tên phản cảm, tên trùng** → nhóm bạn, không kiểm duyệt; hai người trùng tên vẫn phân biệt bằng "bạn".

## Migration Plan

Không có dữ liệu cũ phải chuyển. `SetupChoice` cũ (chế độ `local`/`ai`) vẫn đọc được. Deploy sau `add-online-rooms`.

## Open Questions

(không có)
