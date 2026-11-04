# Design

## Context

- **Engine** (`packages/engine`): `Session = { gameId, playerCount, options, states, entries, cursor }`; kết quả chỉ đến từ luật (`sessionResult = game.result(currentState)`), `GameResult = { kind: "win", winners, reason? } | { kind: "draw", reason? }` với `reason` là mã do game đặt. `GameRecord = { version: 1, gameId, playerCount, options, entries }`; `fromRecord` chỉ đọc các trường đó (trường lạ bị bỏ qua). Transport online cắt phiên bằng `cursor` để hiện lần lượt (`{ ...whole, cursor: shown }`).
- **Server** (`apps/web/src/server/`): `StoredRoom` định dạng 2 (`hostId`, ghế `{ kind: "human", playerId, name } | { kind: "ai" } | null`, `record`, `updatedAt`); mọi thay đổi qua `writeWithRetry` (đọc → `decide` → ghi có kiểm `revision`). Ghế máy được đi ngay trong lần ghi trao lượt cho nó (`playAiSeats`, tối đa 200 nước). `toRoomView` được gọi lúc gửi, riêng cho từng kết nối (`deliver`), và **không** dựng lại ván (`fromRecord` của Cờ vua tốn tới hàng trăm ms cho ván dài). `deliver` không gửi lại phòng cùng `revision` trừ khi `force`. Không có hẹn giờ hay tiến trình nền (M3: kết nối WebSocket bị cắt ~300 giây).
- **Giao thức**: thông điệp client chặt (`strictObject`), thông điệp server lỏng (`z.object`, trường lạ bị bỏ), nhưng `rejectionCodeSchema` là `z.enum` (mã lạ làm cả thông điệp `rejected` bị bỏ qua). `gameRecordSchema` cũng lỏng: trường `ending` không khai báo sẽ bị **xoá** trước khi tới app và trước khi server lưu lại. `PROTOCOL_VERSION = 2`; khác phiên bản thì `outdated-client` → "App vừa được cập nhật" + nút tải lại (không tự tải lại).
- **Client**: `RoomConnection.acceptRoom` bỏ qua phòng có `revision` không lớn hơn phòng đang giữ (trừ lần đầu sau lời chào); `send` trả `false` lặng lẽ khi chưa kết nối. `RoomConnection` dừng hẳn (`room-full`) khi mình không có ghế mà mọi ghế đã có người, nên chưa có chế độ xem. Transport online dựng lại ảnh chụp (`show()`) cả khi chỉ trạng thái kết nối đổi (`refresh()`). Transport chỉ phát `rejected` cho mã của luật (`isRuleRefusal`: mã `ENGINE_ERROR` trừ `game-over`), `PlayScreen` khi đó báo `Play.invalidMove`; `messages` không có namespace lỗi chung. `PlayScreen` đọc `ReadySnapshot`, lời báo trong một `role="status"` duy nhất (`ResultCard`), dòng giải thích kết quả từ `GameUI.useResultDetail`. Ván với máy đã kết thúc thì không được giữ (slot bị xoá; nếu xoá lỗi thì `restore` bỏ ván đã có kết quả).
- idea.md §6.1/§6.3 từng định dùng QStash cho ván bị bỏ; người dùng chốt không dùng (dưới).
- Yêu cầu hành vi: delta `game-engine`, `online-rooms`, `online-play`, `play-vs-ai`, `local-play`.

## Goals / Non-Goals

**Goals:**

- Người còn lại không bao giờ kẹt vì một người bỏ đi: sau 5 phút họ tự kết thúc ván hay cho máy chơi thay; kể cả khi người tự chơi cuối cùng bỏ đi.
- Đầu hàng có xác nhận, online và với máy; kết quả nói rõ vì sao ván kết thúc.
- Một nguồn chân lý cho "ván đã kết thúc": `sessionResult` của engine; một nguồn cho "đầu hàng / xử bỏ ván làm gì trong phòng này": hàm thuần ở `packages/protocol`, server và client dùng chung.
- Server là trọng tài, kể cả về thời gian; không hẹn giờ, không dịch vụ mới, không lệnh Redis thừa, không dựng lại ván khi gửi phòng.
- Phòng đang dở trong Redis không mất khi deploy; tab cũ được mời tải lại.

**Non-Goals:**

- Lấy lại ghế giữa ván, đồng hồ mỗi bên, đề nghị hoà, chế độ xem cho người lạ (Ngoài phạm vi của proposal).
- Đổi luật của bất kỳ game nào.

## Đã chốt với người dùng (04/11/2026)

1. **Bỏ ván online**: người đến lượt **5 phút** chưa đi thì người khác đang ngồi trong phòng bấm được một nút: game hai người (Tic-tac-toe, Cờ caro, Cờ vua) → ván kết thúc, đối thủ thắng vì bỏ ván (`abandoned`); Cờ cá ngựa → ghế vắng giao cho máy của server ("Máy chơi thay") và ván đi tiếp. **Không hẹn giờ phía server, không dịch vụ trả phí**: server kiểm thời gian đã trôi từ lúc bắt đầu lượt bằng đồng hồ của chính nó và một thời điểm lưu cùng phòng; giá trị đó phải sống qua nối lại và đổi instance; phòng định dạng cũ vẫn đọc được. Client chỉ hiện nút khi đã đủ 5 phút (giờ của client chỉ để hiển thị, server quyết), và hiện thời gian/lời nhắc trong lúc chờ.
2. **Đầu hàng** online **và** khi đấu với máy, có hộp thoại xác nhận: online hai người → đối thủ thắng (`resigned`); online Cờ cá ngựa → ghế của mình thành "Máy" (server chơi), mình vẫn ở trong phòng và xem tiếp được; với máy → máy thắng. Không có đầu hàng khi chơi cùng máy ("Ván mới" đã có).
3. **Phòng Cờ cá ngựa chỉ có 2 ghế**: đầu hàng hay bị xử bỏ ván **kết thúc ván** (người kia thắng), như game hai người. Quy tắc giao cho máy vì vậy theo **số ghế của phòng** (`> 2`, khớp `MAX_SEATS_WITHOUT_AI`), không theo `meta.players.max`.
4. **Máy chơi thay có thể thắng**: nếu máy chơi thay Lan về đích trước, kết quả ghi "Máy (thay Lan) thắng"; màn hình của Lan không ăn mừng.
5. **Không lấy lại ghế giữa ván**: ghế trả về cho người đó ở "Chơi lại" (Ngoài phạm vi).
6. **Ngưỡng giữ nguyên**: dòng chờ từ phút 1, nhắc người đến lượt từ phút 4, xử bỏ ván từ phút 5.
7. Mockup được duyệt với các sửa ở review (mục G: tách "Đầu hàng" khỏi "Gieo xúc xắc"; thêm khung kết quả "Máy (thay Lan) thắng").

## Decisions

### 1. Kết thúc ngoài luật nằm ở phiên chơi của engine

```ts
// packages/engine
export const ENDING_REASON = { Resigned: "resigned", Abandoned: "abandoned" } as const;
export type EndingReason = (typeof ENDING_REASON)[keyof typeof ENDING_REASON];
export interface GameEnding { readonly reason: EndingReason; readonly player: PlayerIndex } // người đầu hàng / bỏ ván
interface Session { …; readonly ending?: GameEnding }               // exactOptional
interface GameRecord { …; readonly ending?: GameEnding }            // RECORD_VERSION vẫn 1
concede(game, session, ending: GameEnding): Result<Session>
// sessionResult: ending có và cursor === entries.length →
//   { kind: "win", winners: mọi ghế ≠ ending.player (tăng dần), reason: ending.reason }
```

- `concede` từ chối `game-over` khi `sessionResult` đã khác `null` (kể cả đã có `ending`), `illegal-move` khi `player` ngoài `0…playerCount − 1` hay không phải số nguyên; không bao giờ ném lỗi. Luôn tính trên toàn bộ lịch sử đang có hiệu lực: phiên có nước đã hoàn tác thì bỏ nhánh đó, như một nước mới. `concede` không thêm nước nào.
- Có `ending`: `playMove`, `applyEntry` → `game-over`; `canUndo`/`canRedo` → `false`, `undo`/`redo` → `game-over`. Phiên cắt bằng `cursor < entries.length` (transport online đang hiện lần lượt) **không** có kết quả từ `ending`: kết thúc chỉ hiện sau nước cuối.
- `toRecord` chép `ending`; `fromRecord` kiểm: object thuần, `reason` thuộc `ENDING_REASON`, `player` nguyên trong khoảng, thế cuối của biên bản chưa có kết quả theo luật → sai thì `corrupt-record`.
- Mã lý do `resigned`/`abandoned` là của engine; app dịch ở khung (`Play.ending.*`) trước khi hỏi `useResultDetail` của game.
- **Test**: hành vi của `concede` (hai người, bốn người, đã kết thúc, người ngoài ván, sau hoàn tác, biên bản qua JSON, `fromRecord` từ chối `ending` sai) là test của engine trên các game mẫu (`test-fixtures`). **Bộ kiểm tra hợp đồng** chỉ thêm một kiểm tra: `result().reason` của mọi ván tự chơi không bao giờ là `resigned` hay `abandoned` (mã của luật không được trùng mã của engine). Thêm game không phải viết gì.
- **`RECORD_VERSION` giữ 1**: trường thêm là tuỳ chọn; mọi nơi có thể đọc biên bản mới bằng code cũ đều đã bị chặn ở tầng khác (tab cũ: `PROTOCOL_VERSION` 3; instance server cũ: `STORED_ROOM_FORMAT` 3; ván với máy đã kết thúc không được lưu). Tăng lên 2 thì mọi ván dở trong IndexedDB và Redis phải qua đường chuyển đổi mà không được gì.
- **Phương án đã cân nhắc**:
  - _Kết thúc ở tầng phòng_ (`StoredRoom.ending`, `RoomView.ending`) + vỏ ván lưu của chế độ với máy: engine không đổi, nhưng hai transport và server mỗi nơi tự chồng "kết quả = ending ?? luật", ba chỗ phải nhớ chặn nước đi, hoàn tác, AI, `rematch`; dễ lệch nhau — bỏ.
  - _Nước "đầu hàng" trong `legalMoves` của từng game_ (như `claim-draw` của Cờ vua): sửa luật cả bốn game, máy sẽ xét nước đầu hàng khi tìm nước, Cờ cá ngựa có lượt gieo nên không có chỗ hợp lý — bỏ.
  - _Ghi đè `GameResult` tuỳ ý_: quá rộng, biên bản không kiểm được — bỏ; chỉ cho đúng hai lý do, người thắng suy ra.
- Chiều phụ thuộc không đổi: engine không biết phòng, máy hay thời gian.

### 2. Đầu hàng và bỏ ván làm gì: một hàm thuần ở `packages/protocol`

```ts
// packages/protocol/src/leaving.ts — dùng chung cho room-service (server) và transport online (client)
export const LEAVE_OUTCOME = { End: "end", StandIn: "stand-in" } as const;
/** Ghế mỗi chỗ: `self` = người tự chơi, `stand-in` = máy chơi thay người, `ai` = ghế máy, `null` = trống. */
type SeatPlay = "self" | "stand-in" | "ai" | null;
export function leaveOutcome(
  seats: readonly SeatPlay[],
  leaver: PlayerIndex,
  gameHasAi: boolean,
): LeaveOutcome;
// stand-in ⇔ gameHasAi && seats.length > MAX_SEATS_WITHOUT_AI (2) && có ghế `self` khác `leaver`; còn lại end
export function abandonClaim(view: {
  seats: readonly SeatPlay[];
  toMove: PlayerIndex;
  claimer: PlayerIndex | null;
  turnIdleMs: number | null;
}): "ok" | "too-early" | "not-claimable";
// ok ⇔ claimer có ghế (self hay stand-in), claimer ≠ toMove, seats[toMove] === "self", turnIdleMs ≥ ABANDON_AFTER_MS
```

- `MAX_SEATS_WITHOUT_AI` chuyển từ `room-service.ts` sang `packages/protocol` (cùng quy tắc "phòng hai ghế không có máy" của `add-room-ai-seats`), cùng `ABANDON_AFTER_MS = 5 * 60_000`.
- `gameHasAi` = `meta.supportsAI && evaluate !== undefined` (server có `GAMES`; client có định nghĩa của game đang chơi).

| Tình huống (online)                           | Phòng 2 ghế, hay game không có máy           | Phòng từ 3 ghế của game có máy (Cờ cá ngựa 3–4 người)                                                          |
| --------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| A đầu hàng                                    | `concede(A, resigned)` → mọi ghế khác thắng  | ghế A `standIn: true`; máy đi ngay nếu đang tới lượt A; không còn ghế `self` nào khác → `concede(A, resigned)` |
| B xử A bỏ ván (A tự chơi, đến lượt, ≥ 5 phút) | `concede(A, abandoned)` → mọi ghế khác thắng | ghế A `standIn: true`, máy đi ngay; không còn ghế `self` nào khác ngoài A → `concede(A, abandoned)`            |

- **Đấu với máy**: `concede(người, resigned)` → mọi ghế máy thắng, mọi game. **Cùng máy**: không có đầu hàng.
- **Người tự chơi cuối cùng bỏ đi** (Cờ cá ngựa: mọi người khác đã được máy chơi thay, rồi người cuối cùng tắt máy): ai đang ngồi trong phòng, kể cả người đã được máy chơi thay, xử được bỏ ván sau 5 phút; vì không còn ghế `self` nào ngoài người vắng, ván **kết thúc** với `abandoned`. Phòng không bao giờ treo ở lượt một người vắng. (Người được máy chơi thay xử bỏ ván không làm mình tự chơi lại; họ chỉ kết thúc ván để "Chơi lại".)
- **Người cuối cùng đầu hàng** (phòng một người + ba máy): `concede(A, resigned)`, ba ghế máy thắng. Lý do: không còn ai để chơi cùng, và chuỗi máy dài hơn `MAX_AI_MOVES_PER_WRITE` sẽ dừng ở lượt máy mà không người tự chơi nào để đi tiếp.
- **Phương án đã cân nhắc**: quy tắc theo `meta.players.max > 2` (Cờ cá ngựa 2 ghế cũng giao cho máy) — người dùng chốt phòng 2 ghế kết thúc ván — bỏ. Viết quy tắc hai lần (server và client): client hiện câu hỏi xác nhận sai hậu quả khi hai bản lệch nhau — bỏ.

### 3. Máy chơi thay: ghế vẫn là của người

```ts
// apps/web/src/server/room.ts — STORED_ROOM_FORMAT = 3
type StoredSeat = { kind: "human"; playerId; name; standIn: boolean } | { kind: "ai" } | null;
// packages/protocol
type SeatView = { kind: "human"; name: string; standIn: boolean } | { kind: "ai" };
```

- Người đầu hàng / bị xử **giữ ghế** (`seatOf` vẫn trả ghế đó, `you` không đổi): không cần chế độ xem mới, tab của họ vẫn ở màn hình ván, thấy máy đi thay, và bấm được "Chơi lại".
- Server coi ghế `standIn` như ghế máy ở mọi chỗ "ai đi lượt này": `playAiSeats`, `withAiMoves`, `move` (người ngồi ghế đó gửi nước → `not-your-turn`). Mức Vừa, rng server.
- **Đầu hàng đúng lượt mình** (Cờ cá ngựa, phòng từ 3 ghế): lần ghi đặt `standIn: true` gọi luôn `playAiSeats`, nên máy đi ngay cho ghế đó tới lượt một người tự chơi; `turnStartedAt` đặt lại cho lượt đó (§4).
- **Máy chơi thay thắng**: kết quả bình thường của luật (`winners` chứa ghế đó). Màn hình nói "Máy (thay Lan) thắng!"; màn hình của Lan không ăn mừng (`wonHere` sai khi ghế thắng của người xem là `standIn`).
- `rematch` đặt `standIn: false` cho mọi ghế (người trở lại tự chơi ở ván sau; nếu họ thật sự đã đi, 5 phút sau người khác lại xử). Phương án đã cân nhắc: ghế thành ghế trống ở ván sau — người vừa ra ngoài 5 phút mất hẳn ghế, phòng dừng chờ người — bỏ; ghế thành ghế máy vĩnh viễn — người đó không bao giờ chơi lại được — bỏ.
- Ghế `standIn` không đổi `hostId`.
- Client: transport online đưa ghế `standIn` vào ảnh chụp như ghế máy có tên người (`{ kind: "ai", level: "medium", standInFor: name }`), kể cả ghế của chính mình, để nhịp hiện lần lượt, "Máy đang nghĩ…", `waitingFor: "ai"` dùng lại được; `canMove` sai khi ghế của mình là `standIn`.

### 4. Thời điểm bắt đầu lượt (`turnStartedAt`)

- **Lưu ở đâu**: `StoredRoom.turnStartedAt: number | null` (ms, đồng hồ server, cùng nguồn `now()` với `updatedAt`), trong cùng HASH của phòng ở Redis → sống qua nối lại, đổi instance, deploy; không thêm khoá, không thêm lệnh. `null` khi phòng chưa đủ người hay ván đã có kết quả.
- **Ai đặt, lúc nào**: room-service lúc ghi, bằng phiên mà quyết định đó đã dựng sẵn (không dựng thêm): `written(room, changes, turn)` với `turn` là `"restart"` (ván có thêm nước, ván mới, phòng vừa đủ người, ghế vừa thành `standIn` và máy đã đi), `"stop"` (ván vừa có kết quả, kể cả `concede`; phòng không còn đủ người) hoặc `"keep"` (đổi tên, `join` không có nước máy, `ai-seat` không lấp ghế cuối). `move`, `rematch`, `resign`, `claimAbandoned` đã có `sessionResult`; `sit`/`ai-seat` lấp ghế cuối dùng phiên của `withAiMoves`.
- Một lượt Cờ cá ngựa gồm gieo rồi đi: mỗi nước đặt lại. "Lượt" ở đây là "từ nước gần nhất", đơn giản và công bằng.
- **Phòng định dạng cũ** (1, 2): `turnStartedAt = updatedAt` (lần ghi gần nhất ≥ lúc lượt bắt đầu, nên chỉ có thể xử _muộn hơn_), ghi thành định dạng 3 ở lần ghi kế tiếp. Phòng cũ đã xong ván vẫn có giá trị này; client bỏ qua khi ván có kết quả, server kiểm `game-over` trước khi xét thời gian. `parseStoredRoom` nhận 1, 2, 3.
- **Gửi cho client** (`RoomView.turnIdleMs: number | null`): `toRoomView(room, now)` chỉ tính `now − turnStartedAt` (hay `null`) **lúc gửi**, riêng cho từng kết nối; không dựng lại ván.
- **Đồng hồ ở client**: `RoomConnection.acceptRoom` ghi `receivedAt = environment.now()` và giữ `turnClock = { startedAt: receivedAt − turnIdleMs } | null` trong ảnh chụp của kết nối; transport online chỉ đọc `turnClock` (không tính lại trong `show()`, vì `refresh()` dựng lại ảnh chụp khi kết nối đổi trạng thái và đồng hồ sẽ nhảy lùi). Phòng **cùng** `revision` (trả lời kèm lời từ chối, §5; lần gửi lại sau nối lại) chỉ cập nhật `turnClock`, không đổi `room` (không dựng lại ván). Lệch giờ giữa máy người chơi và server không ảnh hưởng; sai số chỉ bằng độ trễ mạng (~70 ms ở `sin1`). Mỗi lần nối lại (~5 phút/lần trên Vercel) đồng bộ lại.
- **Phương án đã cân nhắc**:
  - `turnIdleMs` tính từ kết quả ván lúc gửi: phải `fromRecord` mỗi lần gửi cho mỗi kết nối — bỏ (review).
  - Gửi thời điểm tuyệt đối `turnStartedAt`: điện thoại lệch giờ vài phút sẽ hiện nút sớm hay muộn — bỏ.
  - Thêm `now` của server vào `pong` để client tự tính độ lệch: thêm trường vào thông điệp chạy 20 giây/lần mà không được gì hơn — bỏ.
  - Dùng `updatedAt`: đổi tên hay vào lại phòng kéo dài lượt của người vắng — bỏ.
  - Hẹn giờ QStash / Vercel Cron: người dùng chốt không dùng — bỏ.
- Hằng số hiển thị ở `features/play`: `ABANDON_HINT_AFTER_MS = 60_000`, `ABANDON_WARN_AFTER_MS = 4 * 60_000`.

### 5. Giao thức và lời từ chối

```ts
// client → server (strictObject)
{
  type: "resign";
  gameNumber: number;
}
{
  type: "claim-abandoned";
  gameNumber: number;
  moveIndex: number;
} // vị trí của lượt bị xử, như `move`
// REJECTABLE_REQUESTS += "resign", "claim-abandoned"
// RoomView += turnIdleMs: number | null; SeatView người += standIn: boolean
// gameRecordSchema += ending: exactOptional(unknown)   // engine kiểm ở fromRecord
// ROOM_ERROR += NotAbandoned: "not-abandoned"
// PROTOCOL_VERSION = 3
```

- **Thứ tự kiểm `resign`** (`room-service.resign`, `MOVE_ATTEMPTS`): có ghế (`not-seated`) → đủ người (`waiting-for-players`) → `gameNumber` hiện tại (`stale-move`) → chưa có kết quả (`game-over`) → ghế đã `standIn`: trả phòng không ghi, không lỗi → `leaveOutcome` (§2).
- **Thứ tự kiểm `claim-abandoned`**: có ghế (`not-seated`) → đủ người (`waiting-for-players`) → `gameNumber` và `moveIndex` hiện tại (`stale-move`: người vắng vừa kịp đi, hay máy đã đi sau một lần xử ở Cờ cá ngựa) → chưa có kết quả (`game-over`: người thứ hai cùng xử một ván hai người — `concede` không thêm nước nên `moveIndex` vẫn khớp) → `abandonClaim` khác `"ok"` → `not-abandoned` → `leaveOutcome` (§2).
- **Lời từ chối kèm phòng mới nhất**: với `resign`/`claim-abandoned`, `connection.ts` gửi phòng bằng `deliver(room, playerId, { force: true })` trước `rejected` (phòng cùng `revision` cũng đi, với `turnIdleMs` tính lại), và `RoomConnection` nhận phòng cùng `revision` để cập nhật `turnClock` (§4). Nhờ đó client tự sửa đồng hồ khi bấm sớm.
- **Báo cho người chơi**: transport online phát sự kiện mới `{ type: "claim-refused" }` khi `claim-abandoned` bị từ chối với `not-abandoned`; `PlayScreen` hiện `Play.abandon.notYet` ("Chưa thể xử: lượt của Minh chưa đủ 5 phút.") trong `AbandonNotice` (`role="alert"`), mất đi khi `turnClock` đổi. Các mã khác (`stale-move`, `game-over`) đã có phòng mới giải thích, không báo thêm (như "Lời từ chối đã được giải thích" của `online-play`). Không thêm namespace lỗi chung.
- Không mã nào thuộc `RECONNECT_REJECTIONS`; transport online không xoá cờ chờ của một nước đang gửi khi nhận lời từ chối của hai yêu cầu mới.
- **`PROTOCOL_VERSION` 3**: client bản 2 sẽ bỏ `ending` (schema cũ xoá trường lạ) và thấy ván đã đầu hàng như vẫn đang chơi; bỏ `standIn` và tưởng người đã đầu hàng vẫn tự chơi. Tăng phiên bản để tab cũ nhận `outdated-client` và tải lại (luồng có sẵn).
- **`STORED_ROOM_FORMAT` 3**: instance cũ (định dạng 2) đọc phòng mới thì `z.object` xoá `ending`, `standIn`, `turnStartedAt` và có thể ghi đè. Tăng định dạng để instance cũ coi phòng mới là "không có phòng" trong tối đa ~5 phút lúc deploy (rủi ro đã chấp nhận ở `add-room-ai-seats`).

### 6. Transport và màn hình chơi

```ts
interface Transport { …; resign(): void; claimAbandoned(): void }
type TransportEvent = … | { readonly type: "claim-refused" };
interface ReadySnapshot {
  …
  /** Đầu hàng được không và hậu quả (để hộp thoại nói đúng); null khi không có nút. */
  readonly resign: { readonly outcome: "loss" | "stand-in"; readonly available: boolean } | null;
  /** Lượt online đang chạy: ai, bắt đầu lúc nào theo đồng hồ thiết bị (turnClock), xử thì ra sao. */
  readonly turn: {
    readonly player: PlayerIndex;
    readonly startedAt: number;
    readonly claim: "win" | "end" | "stand-in" | null; // null: người xem không xử được lượt này
    readonly available: boolean;                      // false khi đang nối lại / tạm ngắt
  } | null;
}
```

- **Cục bộ, chế độ với máy**: `resign = { outcome: "loss", available: true }` khi ván chưa có kết quả; `resign()` huỷ lượt máy đang nghĩ (như "Ván mới"), `concede(ghế người, resigned)`, phát `changed`, rồi lưu: `store.clear(slot)`; nếu xoá lỗi thì `store.save` biên bản **có `ending`** (`inProgress: false`) để `restore` thấy ván đã có kết quả và bỏ nó, không bao giờ khôi phục ván trước khi đầu hàng. Cùng máy: `resign = null`. `claimAbandoned()` cục bộ không làm gì; `turn = null`.
- **Online**: `resign` khác `null` khi ván đủ người, chưa có kết quả, mình có ghế và chưa `standIn`; `outcome` từ `leaveOutcome` (§2); `available` sai khi kết nối không `online`. `turn.claim` từ `abandonClaim` + `leaveOutcome` ("win" khi kết thúc mà mình thắng; "end" khi người được máy chơi thay xử người tự chơi cuối cùng; "stand-in"). `claimAbandoned()` gửi `{ gameNumber, moveIndex }` của ván đã hiện đầy đủ (không gửi khi đang hiện lần lượt).
- **`PlayScreen`**:
  - Nút "Đầu hàng" (biến thể `secondary`, `FlagIcon` trang trí) cuối hàng nút khi `resign !== null`; `aria-disabled` + lý do (`Play.locked.reconnecting`) khi `available` sai (như mẫu lý do của "Hoàn tác"). Bấm → `ConfirmDialog` (nút "Chơi tiếp" có tiêu điểm trước).
  - **Hẹn giờ ở `PlayScreen`** (`useTurnThresholds(turn)`): một `setTimeout` tới ngưỡng kế tiếp (1, 4, 5 phút tính từ `startedAt`), đặt lại khi `turn` đổi; trả `"none" | "hint" | "warn" | "claimable"`. Dòng lượt (`role="status"`) đổi theo giá trị này đúng một lần ở 5:00 (người chờ) và 4:00 (người đến lượt). `AbandonNotice` có đồng hồ giây riêng (`useTickingClock(1000)`) chỉ để hiển thị, ngoài vùng thông báo.
  - `AbandonNotice` (dưới dòng lượt trong `ResultCard`): người khác đến lượt, từ 1 phút: "Minh chưa đi · 2:13" + "Sau 5 phút, bạn có thể xử thắng." (Cờ cá ngựa phòng từ 3 ghế: "… cho máy chơi thay Minh."); từ 5 phút: nút "Xử thắng" / "Cho máy chơi thay" / "Kết thúc ván" (khi `claim === "end"`), `aria-disabled` + lý do khi `available` sai, xác nhận bằng `ConfirmDialog`. Mình đến lượt, từ 4 phút: "Còn 0:42. Quá 5 phút, người khác có thể xử thắng." (Cờ cá ngựa: "… cho máy chơi thay bạn."). Số dùng `useFormatter`, `tabular-nums`.
  - **Hộp thoại đóng khi tình thế đổi**: hỏi đầu hàng đóng khi `resign` thành `null`; hỏi xử bỏ ván đóng khi `turn.player` hay `turn.startedAt` đổi (người vắng vừa đi) hay `turn` thành `null`. **Tiêu điểm** sau khi hộp thoại đóng vì ván kết thúc (do mình xác nhận hay do người khác) về tiêu đề màn hình (`h1 tabIndex=-1`, đã có cho online); đóng vì huỷ thì về nút đã mở (hành vi gốc của `<dialog>`); nút không còn thì về tiêu đề.
  - Kết quả: câu kết quả giữ cách nói hiện có ("Bạn thắng!", "Minh thắng!", "Máy thắng!" — với máy, khi người chơi đầu hàng luôn "Máy thắng!" dù có mấy máy; ghế `standIn` thắng: "Máy (thay Lan) thắng!", trên màn hình của Lan cũng vậy); dòng giải thích `Play.ending.*`: "Bạn đã đầu hàng.", "Minh đã đầu hàng.", "Minh bỏ ván: quá 5 phút không đi.", "Bạn bỏ ván: quá 5 phút không đi.". Ăn mừng khi người ở đây thắng (kể cả vì đối thủ đầu hàng); **không** khi ghế thắng là ghế của người xem nhưng do máy chơi thay.
  - Ghế `standIn`: bảng người chơi/thanh ghế "Minh" + dòng phụ "Máy chơi thay"; ghế của mình "Bạn · Máy chơi thay"; nước của ghế đó báo "Máy (thay Minh) gieo được 3. Đến lượt bạn (Đỏ)"; khi ghế của mình đang `standIn`, dòng lượt nói "Máy đang chơi thay bạn." lúc tới lượt ghế đó.

### 7. Giao diện

- **Hướng hình ảnh** (mockup `mockup/index.html`, người dùng đã duyệt 04/11/2026 kèm sửa ở review): không màn hình mới. Nút "Đầu hàng" là nút phụ (không màu `danger`: hành động hợp lệ, đã có xác nhận), luôn ở hàng nút của khung, **tách khỏi điều khiển của game** (Cờ cá ngựa: dưới danh sách chọn ngựa, có khoảng cách `mt-6`, không cạnh "Gieo xúc xắc"); dòng chờ `text-small text-fg-muted`, số `tabular-nums`; nút xử là nút chính. Lời nhắc người đến lượt dùng `warning-soft`/`warning-ink` (cặp đã kiểm ở `add-design-foundation`).
- **Token**: không thêm, không đổi.
- **Bố cục điện thoại**: hàng nút của chế độ với máy có tới bốn nút → xuống hai dòng ở 360–390 px, chấp nhận; `polish-accessibility-and-mobile` gọn lại sau change này.
- **Kiểm tra**: ảnh `ui:shots` mới `22-online-chess-resign-dialog`, `22b-online-chess-waiting`, `22c-online-chess-claim`, `22d-online-chess-abandoned`, `23-online-ludo-stand-in`, `23b-online-ludo-mover-warning`, `23c-online-ludo-stand-in-won`, `24-ai-resign-dialog`, `24b-ai-resigned` (phòng giả `openFakeRoom` với `turnIdleMs` đặt sẵn; đồng hồ trang chỉ dùng `page.clock.setSystemTime`, xem §9), sáng/tối × 390/1280; rà `web-design-guidelines`; checklist UX bàn cờ (mục "Online: … đối thủ rời").

### 8. Bản dịch (vi gốc, en, ja)

`Play.resign`, `Play.confirmResign.{title,descriptionWin,descriptionStandIn,descriptionAi,confirm,cancel}`, `Play.abandon.{waiting,hintWin,hintStandIn,hintEnd,warnWin,warnStandIn,readyWin,readyStandIn,readyEnd,turnWarnWin,turnWarnStandIn,claimWin,claimStandIn,claimEnd,notYet}`, `Play.confirmAbandon.{titleWin,titleStandIn,titleEnd,descriptionWin,descriptionStandIn,descriptionEnd,cancel}` (nút xác nhận dùng `Play.abandon.claim*`), `Play.ending.{youResigned,opponentResigned,youAbandoned,opponentAbandoned}`, `Play.standIn`, `Play.standInName`, `Play.standInThinking`, `Play.standInThinkingForYou`, `Play.standInWins`, `Play.aiSeatTitle` ("Máy ({player})", tên ghế máy trong danh sách người thắng), `Play.locked.idle` (lý do khi kết nối tạm ngắt vì lâu không hoạt động: chỉ tới "Tiếp tục"), và để báo nước khi có ghế máy chơi thay: cụm `Play.{aiStandInMoved,aiMoved,aiSeatMoved,opponentMoved}` ghép với câu sau bằng `Play.movedThen` ("{moved}. {then}"). Tham số ICU: `name`, `elapsed`, `remaining`, `move`, `mover`, `moved`, `then`. `messages.test.ts` kiểm đủ khoá và tham số.

### 9. Test

- Engine (`test-fixtures`): mọi scenario của "Đầu hàng và bỏ ván", phiên cắt, `undo`/`redo`; kiểm tra hợp đồng: chỉ va chạm mã lý do (§1).
- Protocol: `leaveOutcome` (2 ghế Cờ cá ngựa → end; 3 ghế còn người tự chơi → stand-in; người tự chơi cuối cùng → end; game không có máy → end), `abandonClaim` (mọi nhánh), schema mới, `PROTOCOL_VERSION` 3.
- Server (`room-service-abandon.test.ts`, kho bộ nhớ, `now` giả): mọi scenario của `online-rooms`; `turnStartedAt` theo §4 (đổi tên giữ, `sit` lấp ghế cuối đặt lại, `rematch` đặt lại, kết quả → `null`); định dạng 1, 2; `toRoomView(room, now)` không gọi `fromRecord` (spy); kết nối gửi phòng `force` trước lời từ chối của hai yêu cầu mới; `REALTIME_ABANDON_AFTER_MS` chỉ có hiệu lực khi không có `VERCEL_ENV` (`env.test.ts`).
- Client: `RoomConnection` (`turnClock` từ `receivedAt`, phòng cùng `revision` chỉ cập nhật `turnClock`), transport cục bộ (đầu hàng khi máy nghĩ, slot bị xoá, xoá lỗi thì lưu bản có `ending`), transport online (đồng hồ giả, `refresh()` không đổi `startedAt`, `claim-refused`, `available`).
- Component: `PlayScreen` (nút, hộp thoại, huỷ, đóng khi tình thế đổi, tiêu điểm, dòng chờ, lời báo đổi một lần nhờ hẹn giờ của `PlayScreen` với `vi.useFakeTimers`, `notYet`, `standIn`, không ăn mừng khi máy chơi thay thắng), `PlayerPanel`.
- E2E (`online-abandon.spec.ts`, hai trình duyệt, cả hai cấu hình Playwright): đầu hàng Cờ caro → "Chơi lại"; xử bỏ ván Tic-tac-toe; Cờ cá ngựa 3 ghế cho máy chơi thay rồi "Chơi lại" trả ghế; phòng Cờ cá ngựa 2 ghế đầu hàng → kết thúc. Thời gian: server realtime của E2E chạy với `REALTIME_ABANDON_AFTER_MS` ngắn (vài giây, chỉ khi không có `VERCEL_ENV`); ở trình duyệt **chỉ** dùng `page.clock.setSystemTime` (không `fastForward`/`runFor`: chúng chạy luôn hẹn giờ im lặng 45 giây của `RoomConnection` → nối lại → nhận `turnIdleMs` thật). `play-vs-ai.spec.ts`: đầu hàng Tic-tac-toe → "Máy thắng!", menu không còn ván dở.

## Risks / Trade-offs

- **Cờ vua nghĩ lâu hơn 5 phút** → bị xử thua dù vẫn ngồi đó. Người dùng chốt 5 phút; nút cần người bấm và xác nhận, người đến lượt được nhắc từ phút 4.
- **Người vắng quay lại sau khi máy chơi thay** → chỉ xem tới hết ván; ghế trả về ở "Chơi lại" (người dùng chốt).
- **Máy chơi thay thắng ván** → người ngồi ghế đó không thắng (không ăn mừng), câu kết quả nói rõ "Máy (thay Lan)".
- **Đầu hàng là cuối cùng** → hộp thoại xác nhận, nút phụ, tiêu điểm đầu ở "Chơi tiếp".
- **Hai người cùng xử, hay người vắng vừa đi đúng lúc** → kiểm `revision` chỉ cho một lần ghi thắng; bên kia nhận `stale-move` (đã có nước mới) hay `game-over` (ván đã kết thúc), kèm phòng mới.
- **Deploy giữa ván** → tab cũ tải lại; phòng định dạng 1–2 được chuyển; instance cũ có thể báo `room-not-found` trong ~5 phút.
- **Đồng hồ server giữa các instance lệch nhau** → NTP, sai số mili giây; chấp nhận.
- **Bấm khi đang nối lại** → nút `aria-disabled` kèm lý do; không gửi gì.

## Migration Plan

- Thứ tự trong code: engine → protocol + server đọc định dạng 1–3 → client. Một PR, một lần deploy.
- Phòng định dạng 1, 2: đọc được (`turnStartedAt = updatedAt`, `standIn: false`), ghi lại thành định dạng 3 ở lần ghi kế tiếp.
- Tab cũ (giao thức 2): `outdated-client` → "App vừa được cập nhật" → tải lại.
- Quay về bản trước: phòng định dạng 3 thành "không có phòng" với bản cũ (hết hạn sau 7 ngày); chấp nhận.
- Ván với máy trong IndexedDB: không đổi định dạng.

## Open Questions

(không còn — người dùng đã trả lời ngày 04/11/2026, ghi ở "Đã chốt với người dùng".)

## Ghi chú khi cài đặt (04/11/2026)

Chỗ code đi khác bản thiết kế ở trên, và lý do:

- **`gameRecordSchema.ending`** là `{ reason: enum(ENDING_REASON), player: int ≥ 0 }` (lỏng như mọi thông điệp server) thay cho `unknown`: `RoomView.record` có kiểu `GameRecord`, mà `unknown` không gán được cho `GameEnding`. Engine vẫn kiểm `player` trong khoảng và thế cuối chưa có kết quả ở `fromRecord`.
- **`useTurnThresholds`** đọc đồng hồ mỗi giây (`setInterval` 1 s, chỉ đặt state khi đổi ngưỡng nên `PlayScreen` không vẽ lại mỗi giây) thay cho một `setTimeout` tới ngưỡng kế tiếp: hẹn giờ không theo kịp khi đồng hồ thiết bị nhảy (điện thoại thức dậy, E2E dùng `page.clock.setSystemTime`). `AbandonNotice` tự đếm giây (`useTickingClock`), ngoài vùng thông báo.
- **Lời nhắc người đến lượt** (4 phút): dòng lượt trên màn hình giữ nguyên ("Đến lượt bạn (Đỏ)") như mockup F; câu nhắc (`turnWarn*`) nằm trong cùng `role="status"` nhưng `sr-only`, nên được đọc một lần mà không lặp chữ của khung nhắc màu vàng.
- **`abandonClaim(view, abandonAfterMs = ABANDON_AFTER_MS)`** nhận ngưỡng làm tham số: server truyền `ServerEnv.abandonAfterMs` (`REALTIME_ABANDON_AFTER_MS` ở máy), client luôn 5 phút. `gameHasAi` ở `leaving.ts` nhận `{ meta, evaluate? }` để transport (định nghĩa có kiểu riêng) gọi được. `createDefaultRoomService(store, abandonAfterMs)`.
- **`written(room, changes, turn)`**: `withAiMoves` tự đặt `turnStartedAt` khi máy có đi (vì nó đã dựng phiên), `join` ghi với `"keep"` và mang giá trị đó theo; `ai-seat` bỏ ghế máy (phòng lại thiếu người) là `"stop"`.
- **Lưu ván với máy khi xoá slot lỗi**: chỉ ván có `ending` mới được ghi đè bằng biên bản có `ending`; ván thắng theo luật giữ hành vi cũ.
- **Tiêu điểm**: tiêu đề màn hình luôn `tabIndex=-1` (trước chỉ online), để ván với máy sau khi đầu hàng cũng đưa tiêu điểm về đó; huỷ thì `PlayScreen` tự trả tiêu điểm về nút đã mở (không chỉ dựa vào `<dialog>`).
- **Ảnh**: thêm `22c2-online-chess-claim-dialog`; `23c` dựng ván Cờ cá ngựa ghế đầu thắng bằng cách chọn sẵn xúc xắc trong `screens.shots.ts`.
- **Danh tính của lượt** (sau review): `TurnClock` có `gameNumber` + `moveIndex` (+ `player`); `RoomConnection` giữ nguyên đối tượng `turnClock` khi cùng lượt và lệch dưới 2 s (nối lại mỗi ~5 phút, phòng gửi lại kèm lời từ chối), nên đồng hồ không "bắt đầu lại"; `useTurnThresholds` tính ngưỡng ngay trong lần vẽ khi `startedAt` đổi (không bao giờ thoáng `none`) và thôi đọc đồng hồ khi đã tới 5 phút; hộp thoại xử bỏ ván và lời "chưa thể xử" chỉ mất khi lượt (theo danh tính) đổi.
- **Mất kết nối khi đang hỏi**: hộp thoại vẫn mở, nút xác nhận `aria-disabled` kèm lý do (`ConfirmDialog.confirmUnavailableReason`, thêm vào `packages/ui`); lý do khi tạm ngắt vì lâu không hoạt động chỉ tới "Tiếp tục" của dòng kết nối (`Play.locked.idle`), như khoá bàn.
- **Đồng hồ trên màn hình** ghi `m:ss` bằng một hàm nhỏ (`clockText`) thay cho `useFormatter`: next-intl không có định dạng thời lượng `m:ss`, chữ số và dấu hai chấm giống nhau ở cả ba ngôn ngữ; số dùng `tabular-nums`. `AbandonNotice` chỉ đếm giây khi có đồng hồ trên màn hình.
