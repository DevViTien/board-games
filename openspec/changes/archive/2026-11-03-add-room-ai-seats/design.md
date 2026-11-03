# Design

## Context

- Server (`apps/web/src/server/`): `StoredRoom = { format: 1, code, gameId, revision, gameNumber, players: (RoomPlayer | null)[], record, updatedAt }`, mọi thay đổi qua `writeWithRetry` (đọc → `decide` → ghi có kiểm `revision`, xung đột thì quyết lại trên phòng mới). `move` từ chối khi còn ghế `null` (`waiting-for-players`), rút kết quả ngẫu nhiên bằng rng của server; `rematch` xoay mọi ghế đi một chỗ. **Chưa có chủ phòng**: người tạo chỉ "ngồi ghế đầu", sau ván mới thì sang ghế khác. Mỗi lần ghi = 1 `HGET` + script 5 lệnh có `PUBLISH` cả phòng (design `add-online-rooms` §8).
- Giao thức (`packages/protocol`): `PROTOCOL_VERSION = 1` gửi trong lời chào, khác thì `outdated-client` (client hiện "App vừa được cập nhật" + tải lại). Thông điệp client chặt (`strictObject`), thông điệp server lỏng. `RoomView.seats: ({ name } | null)[]`, không có `playerId`.
- Client: `RoomRoute` hiện sảnh chờ khi còn ghế `null` hoặc mình chưa có ghế; `RoomLobby` vẽ mọi ghế (tên/"Đang chờ…") và nạp lười luật của game (`useGameOptionChoices`). Transport online dựng ván bằng `fromRecord` mỗi lần phòng đổi và hiện ngay trạng thái cuối; ghế người khác là `{ kind: "remote", name }`. `PlayScreen` dùng "có ghế `remote`" để hiện nhãn "Online" và đặt tên nút "Chơi lại".
- Sau `add-multiplayer-setup` và `add-ludo-game`: phòng tạo được với 2–4 ghế; Cờ cá ngựa có `evaluate` theo thứ tự ưu tiên; `chooseMove` mức Vừa (độ sâu 2, kỳ vọng qua lần gieo kế tiếp) rẻ; `PlayScreen` nêu tên ghế khi có từ hai ghế máy; `AI_RESULT_DELAY_MS` = 800 ms.
- M3/M4: WebSocket trên Vercel bị cắt ~300 giây, client tự nối lại; function không giữ state; không có tiến trình nền.
- Yêu cầu hành vi: delta `online-rooms`, `online-play`.

## Goals / Non-Goals

**Goals:**

- Phòng 2–4 ghế bắt đầu được khi thiếu người, máy do **server** chơi, không phụ thuộc client nào đang mở.
- Server vẫn là trọng tài duy nhất; mọi nước máy đi qua luật, mọi lần gieo từ rng server.
- Không thêm dịch vụ hay hẹn giờ; không tốn thêm lệnh Redis cho nước của máy.
- Người chơi nhìn kịp nước của máy (xúc xắc, ngựa) dù server ghi nhiều nước cùng lúc.
- Phòng đang dở trong Redis không mất khi deploy; tab cũ được mời tải lại.

**Non-Goals:**

- Máy chơi thay người bỏ ván, nhường ghế máy cho người đến muộn, xử thua (M8).
- Chọn mức của ghế máy, chuyển chủ phòng, đuổi khỏi ghế.

## Đã chốt với người dùng (03/11/2026)

- Phòng online Cờ cá ngựa có 2–4 ghế; **ghế trống có thể do server chơi thay**: **chủ phòng** đánh dấu ghế trống là "Máy"; server chơi ghế đó bằng máy rẻ theo **luật ưu tiên** (đá > lên chuồng > ra quân…, idea.md §3.1) với **rng của server**; không phụ thuộc client nào đang mở.
- Server vẫn là trọng tài duy nhất; **xúc xắc của mọi ghế do server gieo**.

## Decisions

### 1. Chủ phòng

- `StoredRoom.hostId: string | null` = `playerId` của người tạo, đặt ở `create`, không đổi. `RoomView.host: PlayerIndex | null` = ghế hiện tại của chủ phòng (tính ở `toRoomView` bằng `seatOf`), nên sau mỗi lần xoay ghế vẫn đúng; `playerId` không rời server.
- Phòng định dạng 1 (trước change này): `hostId = null` → không ai đổi ghế máy; các phòng đó là Tic-tac-toe/Cờ caro hai ghế đã đủ người, không cần.
- Phương án đã cân nhắc:
  - Mọi người có ghế đều đổi được ghế máy: không cần lưu thêm gì, nhưng người dùng chốt "chủ phòng", và hai người cùng bấm sẽ giành nhau — bỏ.
  - Chủ phòng = người đang ngồi ghế 0: đổi theo mỗi ván mới, khó hiểu — bỏ.
- Rủi ro chấp nhận: chủ phòng không quay lại thì không ai thêm máy được; nhóm bạn tạo phòng mới (nút "Tạo phòng" mất vài giây).

### 2. Ghế máy trong dữ liệu và giao thức

```ts
// apps/web/src/server/room.ts — STORED_ROOM_FORMAT = 2
type StoredSeat = { kind: "human"; playerId: string; name: string } | { kind: "ai" } | null;
interface StoredRoom { format: 2; …; hostId: string | null; players: readonly StoredSeat[] }
// packages/protocol — PROTOCOL_VERSION = 2
type SeatView = { kind: "human"; name: string } | { kind: "ai" };
interface RoomView { …; seats: readonly (SeatView | null)[]; host: PlayerIndex | null }
// client → server
{ type: "ai-seat"; seat: number; on: boolean }   // REJECTABLE_REQUESTS thêm "ai-seat"
```

- **Đọc phòng cũ**: `parseStoredRoom` nhận định dạng 1 và 2; định dạng 1 được chuyển (`players[i]` → `{ kind: "human", … }`, `hostId: null`) và ghi lại thành định dạng 2 ở lần ghi kế tiếp. Phương án đã cân nhắc: tăng định dạng và coi phòng cũ là "không có phòng" (như ghi chú của `STORED_ROOM_FORMAT`) — làm mất ván đang dở của bạn bè khi deploy, bỏ.
- **Phiên bản giao thức 2**: client bản 1 đọc `seats` kiểu cũ (`{ name }`), gặp `{ kind: "ai" }` sẽ hỏng; tăng phiên bản để tab cũ nhận `outdated-client` ở lời chào (kể cả khi nối lại sau ~5 phút) và thấy "App vừa được cập nhật" + "Tải lại trang" — luồng đã có, không viết gì thêm. Lúc deploy, kết nối cũ còn sống trên instance cũ tối đa ~5 phút; instance cũ đọc phòng định dạng 2 thành "không có phòng" → client cũ nhận `room-not-found` sớm hơn một chút; chấp nhận (nhóm nhỏ, deploy ít).
- **Luật `ai-seat`** (`room-service.setAiSeat`, qua `writeWithRetry`), thứ tự kiểm:
  1. người gửi là chủ phòng (`hostId`), không thì `not-host`;
  2. game hỗ trợ đấu với máy (`meta.supportsAI`) **và phòng có từ ba ghế**, không thì `ai-not-supported` (quyết định sản phẩm sau review: ghế máy chỉ cho phòng Cờ cá ngựa 3–4 người; phòng hai ghế — Tic-tac-toe, Cờ caro, Cờ cá ngựa 2 người — là chơi giữa hai người, ai muốn đấu với máy thì dùng chế độ "Đấu với máy"; mã cũ, không làm nối lại);
  3. ván hiện tại chưa có nước nào, không thì `game-started`;
  4. số ghế trong khoảng `0…players.length − 1`, không thì `invalid-seat` (schema chỉ đòi số nguyên, kể cả số âm, để số ghế sai không bao giờ thành `invalid-message` — mã đó làm client nối lại);
  5. `on`: ghế phải trống (`null`), không thì `seat-taken`; bỏ dấu: ghế phải là ghế máy, không thì `not-ai-seat`.
     Đánh dấu một ghế đã là ghế máy (bấm hai lần trước khi có trả lời) → trả phòng không ghi, không lỗi (như `sit` lặp lại; scenario "Đánh dấu lại ghế máy"); `seat-taken` chỉ khi ghế có người. Bỏ dấu một ghế trống vẫn là `not-ai-seat` (scenario "Bỏ dấu ghế không phải ghế máy"): client bỏ qua mọi lời từ chối `ai-seat` nên không có gì khác biệt với người chơi.
- **Phòng đủ người** = không còn ghế `null` (ghế máy tính là có người): `move` và `waiting-for-players` không đổi mã; `sit` lấy ghế `null` thấp nhất, ghế máy không bị lấy; phòng chỉ còn ghế người và máy → người mới nhận `room-full` như hiện nay.
- Chủ phòng luôn có ghế (người tạo ngồi ghế đầu và không rời ghế được), nên phòng luôn có ít nhất một ghế người.
- **Mã lỗi mới** (`ROOM_ERROR`): `not-host`, `seat-taken`, `not-ai-seat`, `game-started`, `invalid-seat` (dùng lại `ai-not-supported` của engine). **Không** mã nào trong số này thuộc `RECONNECT_REJECTIONS` của `room-connection.ts` (`invalid-message`, `too-many-messages`, `unavailable`): số ghế sai không được làm client nối lại — vì vậy không dùng `invalid-message` cho nó. Trang phòng không hiện lời báo riêng cho các mã này (§5).
- **Transport online** bỏ qua `rejected` của `ai-seat` như của `sit` (`onRejected`: `request === "sit" || request === "ai-seat"` → không `settle()`), để lời từ chối đổi ghế máy không xoá cờ chờ của một nước đang gửi.
- **Giới hạn chấp nhận**:
  - Đánh dấu **ghế trống cuối cùng** là máy làm phòng đủ người, ván bắt đầu ngay trong cùng lần ghi (và nếu ghế đi đầu là máy thì máy đi luôn) — không có bước xác nhận hay hoàn tác; chủ phòng muốn đổi thì chờ ván xong. Nút ở ghế trống cuối cùng vì vậy có tên đọc được nói rõ "… và bắt đầu ván" (`Room.addAiAndStartLabel`).
  - Ván đầu của phòng, ghế đi đầu là chủ phòng (người) nên máy không bao giờ đi đầu ván 1. Sau "Chơi lại", ghế xoay một chỗ: máy có thể sang ghế đầu và **đi ngay trong chính lần ghi "Chơi lại"**; client hiện lần lượt các nước đó (§4).

### 3. Server đi thay ghế máy

```ts
// room-service.ts
const AI_SEAT_LEVEL = AI_LEVEL.Medium;
const MAX_AI_MOVES_PER_WRITE = 200; // chỉ là chốt an toàn
function playAiSeats(room: StoredRoom, game, session): Session; // trả phiên đã thêm nước của máy
```

- Chỉ có ở phòng từ ba ghế (§2); code đi thay không phân biệt số ghế (phòng định dạng cũ hay ghi tay vẫn chạy đúng).
- Sau **mọi** quyết định dẫn tới ghi phòng (`move`, `sit`, `ai-seat`, `rematch`) và ở `join` của người đã ngồi khi phòng đang dừng ở lượt máy: nếu phòng đủ người, ván chưa kết thúc và tới lượt một ghế máy, server lặp: `chooseMove(game, state, { level: Medium, rng: server rng, now, timeLimitMs: 0 })` (mức Vừa luôn làm xong độ sâu tối thiểu, `timeLimitMs: 0` để không làm thêm), rồi `playMove(game, session, move, rng)` (luật kiểm nước, rng server gieo); máy lỗi hay chọn nước bị từ chối → nước hợp lệ ngẫu nhiên (như transport cục bộ); lỗi được ghi log **một lần mỗi chuỗi**, không mỗi nước (máy hỏng thì hỏng ở mọi nước). Dừng khi tới lượt một người, ván kết thúc, hoặc chạm `MAX_AI_MOVES_PER_WRITE`.
- **Cùng một lần ghi**: các nước của máy nằm trong `record` của chính lần ghi đó, nên nguyên tử với nước của người (xung đột → quyết lại cả chuỗi trên phòng mới), không có hẹn giờ, không cần client nào đang mở, không tốn thêm lệnh Redis. Người chơi đóng tab ngay sau nước của mình thì các nước máy đã nằm trong phòng.
- **Chốt an toàn**: một chuỗi chạm 200 nước (gần như không thể: 3 máy × nhiều lần gieo 6 liên tiếp) thì ghi phần đã đi; `join` của bất kỳ người đã ngồi nào (mỗi lần nối lại ~5 phút cũng là một `join`) đi tiếp. Cũng nhờ vậy phòng không kẹt ở lượt máy nếu một lần ghi trước bị lỗi giữa chừng.
- **Chi phí CPU**: Cờ cá ngựa mức Vừa = ≤ 4 nước × 6 kết quả gieo × `evaluate` ≈ vài chục phép đánh giá mỗi nước; một chuỗi 3 máy ~6–10 nước < 5 ms, thêm vào thời gian phát lại biên bản (`fromRecord`, vài ms). Không đáng kể so với ~70 ms khứ hồi.
- **Tái lập trong test**: `RoomServiceDeps` đã nhận `rng` và `now`; test dùng `createRng(seed)` và đồng hồ giả.
- Phương án đã cân nhắc:
  - Ghi từng nước máy riêng, cách nhau bằng `setTimeout` trên server: function có thể bị đông cứng hay bị cắt sau 300 giây, nước máy phụ thuộc kết nối còn sống và instance; tốn thêm lệnh — bỏ.
  - Hẹn giờ QStash cho mỗi nước máy: thêm dịch vụ chưa có quyết định trong idea.md (bất biến), trễ hàng giây — bỏ.
  - Client của chủ phòng chạy máy rồi gửi nước: phá "không phụ thuộc client nào", chủ phòng đóng tab là ván kẹt, và client chọn được số gieo nếu tự gieo — bỏ.
  - Máy theo "luật ưu tiên" viết riêng cho server: đã có `evaluate` mang thứ tự ưu tiên + `chooseMove` mức Vừa, dùng chung với đấu với máy; một đường code — giữ cách này.

### 4. Hiện lần lượt ở client

- Transport online giữ `shown` (số nước đang hiện). Khi phòng mới tới:
  - lần đầu sau mỗi lần vào phòng, tải lại hay nối lại: `shown` = cuối biên bản, hiện ngay (không phát lại lịch sử). Nhận ra ở lần cập nhật mà trạng thái kết nối vừa chuyển sang `online` (lời chào vừa được trả lời; cùng lần cập nhật mang phòng) và lại ở `onSynced`, để không có bước hiện dở nào lọt ra trước khi nhảy tới cuối;
  - **ván mới** (`gameNumber` đổi trong khi đang kết nối, tức là "Chơi lại"): nếu ván cũ còn nước chưa hiện (đang hiện lần lượt), ván mới **xếp hàng** (`queued`, giữ phiên, phòng và ghế của mình trong ván cũ) cho tới khi hiện hết các nước và kết quả của ván cũ (nút "Chơi lại" ẩn trong lúc đó), rồi mới thay. Sau đó `shown = 0` — bàn mới hiện trước (lời báo "Ván mới: …"), rồi các nước máy đi ngay trong lần ghi "Chơi lại" (máy được xoay vào ghế đầu) hiện lần lượt, nước đầu sau `AI_SETTLE_DELAY_MS` (game có `outcomes`) hay `AI_MIN_DELAY_MS`, để chúng cũng được thấy và được đọc;
  - còn lại, nếu biên bản có hơn `shown + 1` nước: hiện nước kế tiếp ngay, rồi mỗi nước sau cách một khoảng không ngắn hơn hiệu ứng của nước vừa hiện. Game có `outcomes`: `AI_SETTLE_DELAY_MS` (500 ms, ≥ ngựa đi tối đa 400 ms), hay `AI_RESULT_DELAY_MS` (800 ms) nếu nước vừa hiện có `outcome` — cùng hằng số với nhịp máy cục bộ (`add-multiplayer-setup` §4). Game không có `outcomes`: `AI_MIN_DELAY_MS` (300 ms). Một nước mới thì hiện ngay như hiện nay. Không có hằng số `REVEAL_STEP_MS` riêng.
- Ảnh chụp dựng từ `session.states[shown]` (phiên đã phát lại đủ, nên không phát lại thêm); `canMove` chỉ đúng khi `shown` là cuối biên bản; `lastEntry`/`lastMover` theo `shown`, nên lời báo và hiệu ứng của bàn đi theo từng nước.
- Cờ chờ trả lời (`pending`) vẫn tính theo biên bản thật, không theo `shown`: nước của mình được ghi là đã được trả lời dù còn đang hiện các nước máy sau nó.
- Áp cho mọi game nhưng chỉ có tác dụng khi một cập nhật mang nhiều nước (máy đi liền nhau, hay client lỡ một tin); Tic-tac-toe, Cờ caro giữa hai người không đổi.
- **Trình đọc màn hình**: nhịp hiện (500–800 ms mỗi nước) có thể ngắn hơn thời gian trình đọc màn hình đọc xong một câu; trình đọc có thể bỏ qua hay nối các câu — chấp nhận ở M6 (người nhìn màn hình vẫn kịp thấy; nhịp chỉnh được ở client). Hai nước liền nhau có cùng lời báo (máy gieo 6 không đi được hai lần) thì lời báo thứ hai mang một ký tự rộng 0 (`U+200B`, không thấy được) để vùng `role="status"` đổi và được đọc lại. Vì mỗi nước được hiện thành một ảnh chụp riêng, `role="status"` của `PlayScreen` đọc **từng nước** của máy/đối thủ trong chuỗi ("Máy (Xanh dương) đi ngựa 2 tới ô 17, đá ngựa Đỏ. Máy (Vàng) đang nghĩ…"), theo lời báo của `add-multiplayer-setup` §3; vùng gợi ý của bàn chỉ đọc lần gieo của chính người chơi, nên không đọc trùng.
- Phương án đã cân nhắc: để bàn tự hoạt hoạ nhiều nước — bàn chỉ nhận một `lastEntry`, lời báo trên màn hình chơi sẽ bỏ qua các nước giữa (nhất là khi ngựa của mình bị đá); giãn ở server — §3.

### 5. Giao diện

- **Sảnh chờ** (`RoomLobby`): mỗi ghế ghi tên (ghế của mình "(bạn)"), "Đang chờ…" hay "Máy"; chủ phòng có nhãn "Chủ phòng" cạnh tên. Khi `you === room.host`, game hỗ trợ đấu với máy (`useGameOptionChoices` trả thêm `supportsAI` của luật đã nạp lười; chưa nạp xong thì chưa có nút) và ván chưa có nước nào: ghế trống có nút "Cho máy chơi" (tên đọc được "Cho máy chơi ghế 3"), ghế máy có nút "Bỏ máy" ("Bỏ máy ở ghế 3"). Bấm thì gửi `ai-seat`; bị từ chối thì sảnh chờ hiện lại theo trạng thái phòng (không thêm lời báo: lý do đã thấy được). Tiêu điểm: nút vừa bấm biến thành nút kia ở cùng chỗ, `aria-disabled` khi đang chờ trả lời. Hết chờ khi ghế vừa bấm đã đổi như yêu cầu (thành máy, hay thành trống) hoặc khi có lời từ chối `ai-seat`; phòng đổi vì việc khác (đổi tên, người khác ngồi) không tính là trả lời. Lời từ chối báo qua `RoomRoute` (đếm các lời từ chối bằng `onRejected` và truyền xuống), nên một lời từ chối không kèm phòng mới không khoá nút mãi. Chỉ phòng từ ba ghế có nút (§2); tên đọc được của nút luôn bắt đầu bằng chữ hiện trên nút (WCAG 2.5.3, kiểm ở cả vi/en/ja).
- **Màn hình ván**: ghế máy online là `{ kind: "ai", level: "medium" }` trong ảnh chụp, nên `PlayScreen` báo "Máy đang nghĩ…" / "Máy (Xanh dương) đang nghĩ…" trong lúc đang hiện lần lượt, "Máy … thắng!" như khi đấu với máy. Nhãn "Online", tên nút "Chơi lại", lời báo ván mới và việc ẩn nhãn mức máy ("Với máy · Vừa") dựa vào `snapshot.connection !== null` thay vì "có ghế `remote`", vì phòng một người + ba máy không có ghế `remote`.
- **Báo mọi nước đi từ nơi khác** (chốt Open Question bên dưới, bản tối thiểu): khi một nước của người ở xa hay của ghế máy được hiện, lời báo luôn nêu nước đó rồi lượt kế tiếp, kể cả khi lượt kế tiếp không phải của mình: "Minh vừa gieo được 6. Đang chờ Minh…", "Minh vừa … . Đang chờ Lan…", "Máy (Vàng) … . Đang chờ Lan…", "Minh vừa … . Máy (Vàng) đang nghĩ…" — cùng kiểu `Play.aiSeatMovedAiThinking`. Vì transport hiện từng nước một (§4), mọi nước trung gian (gieo 6 → đi ngựa đá → gieo thêm) đều được đọc, kể cả lúc ngựa của mình bị đá khi đang chờ. Ván mới mà máy đi trước: "Ván mới: bạn cầm O, máy đi trước" / "…, máy (Đỏ) đi trước". Phương án đã cân nhắc: chỉ báo nước máy (như `add-multiplayer-setup`) — người ở xa trong phòng 3–4 người vẫn bị bỏ qua; một lời báo riêng gom cả lượt — cần biết lượt bắt đầu từ đâu, phức tạp hơn mà không đọc kịp từng nước.
- **Bản dịch** (vi/en/ja): `Room.aiSeat` "Máy", `Room.host` "Chủ phòng", `Room.addAi` "Cho máy chơi", `Room.addAiLabel` "Cho máy chơi ghế {seat}", `Room.removeAi` "Bỏ máy", `Room.removeAiLabel` "Bỏ máy ở ghế {seat}", `Room.addAiAndStartLabel` "Cho máy chơi ghế {seat} và bắt đầu ván"; lời báo nước từ nơi khác `Play.opponentMovedWaitingFor`, `Play.opponentMovedAiThinking`, `Play.opponentMovedAiSeatThinking`, `Play.aiMovedWaitingFor`, `Play.aiSeatMovedWaitingFor`, ván mới máy đi trước `Play.newGameAiFirst`, `Play.newGameAiSeatFirst`. Mã lỗi mới không có lời báo riêng (§5 sảnh chờ), nhưng được thêm vào bảng mã lỗi của protocol và test.

### 6. Chi phí và giới hạn

- Lệnh Redis: không đổi mỗi yêu cầu (1 `HGET` + 5); nước của máy không có yêu cầu riêng. Một ván Cờ cá ngựa 1 người + 3 máy tốn ~1/4 số lần ghi của ván 4 người (chỉ lượt người), ~290 lần ghi × 6 ≈ 1.750 lệnh (theo số đo ván ngẫu nhiên 4 người ~1.150 nước của `add-ludo-game`). `ai-seat`: một lần ghi mỗi lần bấm.
- Kích thước: mỗi lần ghi phát cả phòng; với máy, một lần ghi mang thêm vài nước (~40 byte/nước). Biên bản cuối ván đo được ~76 KB (plan.md §10, ván ngẫu nhiên 4 người), trung bình ~38 KB trên cả ván.
- **Băng thông** (ước tính theo số đo: ~1.150 nước một ván 4 người, phòng trung bình ~38 KB trên cả ván, tối đa ~76 KB; ván người thật có thể ngắn hơn ván ngẫu nhiên):
  - 4 người thật: ~1.150 lần ghi × 4 client × ~38 KB ≈ **175 MB/ván** server → client; Redis (`HSET` + `PUBLISH` tới ~2 instance, ~3 bản) ≈ **130 MB/ván**.
  - 1 người + 3 máy: chỉ lượt người là lần ghi (~1/4, ~290 lần), mỗi lần mang thêm nước máy; ≈ 290 × 1 client × ~38 KB ≈ **11 MB/ván** tới client, ~33 MB Redis.
  - 2 người + 2 máy: ~575 lần ghi × 2 client × ~38 KB ≈ **44 MB/ván**.
  - Thêm: mỗi lần chào (`join`) — vào phòng, tải lại, và lần nối lại ~5 phút do Vercel cắt — gửi lại cả phòng (≤ 76 KB) cho người đó; với phòng đủ người có ghế máy, `join` còn đọc lại và phát lại biên bản để xem có nước máy nào phải đi. Ván 30 phút ≈ 6 lần × ≤ 76 KB ≈ < 0,5 MB mỗi client, nhỏ so với trên.
  - Gửi phần nước mới thay vì cả phòng sẽ giảm mạnh các số trên; để sau khi xem tab Usage (Ngoài phạm vi).
- **GB-giờ**: kết nối giữ instance sống bất kể ghế máy; ván 20–40 phút ≈ 1–3 GB-giờ (1–2 instance × 2 GB) khi chỉ có một phòng. Ghế máy không thêm kết nối nào; server không giữ tiến trình hay hẹn giờ cho máy, nên không tăng GB-giờ.
- Giới hạn tốc độ (30 thông điệp/10 giây) không đổi: người chơi chỉ gửi nước của mình.
- Kết nối bị cắt ~300 giây không ảnh hưởng: nước máy không gắn với kết nối nào.

### 7. Test

- `protocol`: `ai-seat` hợp lệ/sai (số ghế âm, thiếu `on`, trường lạ), `RoomView` mới (ghế máy, `host`), thông điệp server cũ thiếu `host` vẫn đọc được (lỏng), mã lỗi mới (`not-host`, `seat-taken`, `not-ai-seat`, `game-started`, `invalid-seat`).
- `server/room.ts`: đọc định dạng 1 → chuyển; định dạng 2 qua lại JSON; `toRoomView` không có `playerId`, có `host` đúng ghế sau xoay.
- `room-service` (kho bộ nhớ, `createRng(seed)`, đồng hồ giả, `ludo` và Tic-tac-toe): mọi scenario của delta `online-rooms`; chuỗi máy dừng đúng ở lượt người; máy đi ở `sit`/`ai-seat`/`rematch`/`join`; hai yêu cầu xung đột → chuỗi máy quyết lại một lần; chốt an toàn (game mẫu mà máy đi mãi) dừng ở 200 và `join` đi tiếp; phòng định dạng 1 chơi tiếp được.
- `connection.ts`: định tuyến `ai-seat`, `rejected { request: "ai-seat" }`.
- `room-connection`: `rejected` với `invalid-seat` hay mã ghế máy khác không làm nối lại; `online-transport`: `rejected` của `ai-seat` không xoá cờ chờ của nước đang gửi.
- `online-transport` (đồng hồ giả): hiện lần lượt, khoảng cách theo `AI_SETTLE_DELAY_MS`/`AI_RESULT_DELAY_MS` (game có `outcomes`) và `AI_MIN_DELAY_MS` (game khác), `canMove` sai tới khi hiện xong, nối lại hiện ngay trạng thái cuối, "Chơi lại" có máy đi đầu được hiện lần lượt từ đầu, `pending` được trả lời dù đang hiện.
- Component: `RoomLobby` (nút của chủ phòng, người khác không thấy, ghế "Máy", game không hỗ trợ máy không có nút); `PlayScreen` online một người + ba máy ("Online", "Chơi lại").
- E2E: tasks §5.

## Risks / Trade-offs

- **Chủ phòng biến mất** → không ai thêm máy; tạo phòng mới. Ghi nhận, xem lại ở M8 cùng việc bỏ ván.
- **Deploy giữa ván** → tab cũ phải tải lại (luồng có sẵn); phòng định dạng 1 được chuyển, không mất ván. Kết nối cũ trên instance cũ có thể nhận `room-not-found` trong tối đa ~5 phút; tải lại là hết.
- **Client mới gặp instance cũ khi đang deploy** (lời chào phiên bản 2 tới server phiên bản 1) → nhận `outdated-client` dù client mới hơn. Không có vòng lặp tải lại: client **không tự tải lại** khi gặp `outdated-client`, chỉ hiện "App vừa được cập nhật" với nút "Tải lại trang" người chơi bấm (luồng hiện có, `add-online-play`), và `outdated-client` là lỗi dừng hẳn (không tự nối lại). Bấm tải lại sau khi deploy xong là vào được. Task kiểm lại điều này bằng test và không thêm tự tải lại; nếu sau này thêm tự tải lại thì phải có giới hạn số lần (ví dụ một lần mỗi 60 giây, nhớ trong `sessionStorage`).
- **Chuỗi máy dài trong một lần ghi** → bị chặn ở 200 nước; thời gian thực tế vài ms.
- **Hiện lần lượt làm người chơi chờ** (3 máy × ~1,3 s ≈ 4 s) → nhịp nằm ở client (`AI_SETTLE_DELAY_MS`, `AI_RESULT_DELAY_MS`), chỉnh được sau khi chơi thử mà không đổi server hay spec, miễn không ngắn hơn hiệu ứng của bàn.
- **Ghế trống cuối cùng thành máy là bắt đầu ngay** (§2) → tên đọc được của nút nói rõ; chấp nhận cho M6.
- **Chủ phòng cho máy ghế trống cuối cùng đúng lúc người bạn bấm "Vào chơi"** → hai lần ghi tranh nhau một ghế; kiểm `revision` (CAS) chỉ cho một bên thắng. Nếu máy thắng, người bạn nhận `room-full` và trang "Phòng đã đủ người"; nếu người bạn thắng, chủ phòng nhận `seat-taken` (bị bỏ qua, sảnh chờ hiện người bạn). Chấp nhận: hiếm, và chủ phòng thấy ngay để tạo phòng mới hay chờ ván sau.
- **Nhịp hiện ngắn hơn giọng đọc** (§4) → trình đọc màn hình có thể không kịp đọc hết từng nước; chấp nhận ở M6.
- **Máy online luôn mức Vừa** → đủ cho "chơi thay"; chọn mức để sau.

## Migration Plan

- Deploy sau `add-ludo-game`. Thứ tự trong code: protocol + server đọc được cả hai định dạng phòng → client mới.
- Phòng định dạng 1 trong Redis: đọc được, ghi lại thành định dạng 2 ở lần ghi kế tiếp; không có bước chuyển dữ liệu riêng.
- Tab cũ (giao thức 1): `outdated-client` → "App vừa được cập nhật" → tải lại.
- Quay về bản trước: phòng đã ghi định dạng 2 sẽ thành "không có phòng" với bản cũ (hết hạn sau 7 ngày); chấp nhận cho dự án nhóm nhỏ.

## Open Questions

(đã chốt trong change này, §5 "Báo mọi nước đi từ nơi khác": bản tối thiểu báo mọi nước không đi từ thiết bị này, kèm lượt kế tiếp.)

Ghi lại câu hỏi ban đầu:

- **Lời báo nước người khác ở phòng 3–4 người** (ghi lại từ review `add-multiplayer-setup`): `PlayScreen` hiện chỉ nêu nước vừa đi của đối thủ ở xa khi **tới lượt mình** (`Play.opponentMovedYourTurn`); khi người ở xa A vừa đi và tới lượt người ở xa B, lời báo chỉ là "Đang chờ B…", không nói A vừa làm gì. Cả phòng hai người cũng gặp với Cờ cá ngựa (review `add-ludo-game`): các nước trung gian của đối thủ trong một lượt (gieo 6 → đi ngựa đá → gieo thêm → đi ngựa) chỉ hiện là "Đang chờ …" (`waitingFor`), người chơi chỉ nghe nước cuối cùng khi tới lượt mình; trình đọc màn hình bỏ lỡ việc bị đá. Cần quyết ở change này (hoặc một change theo sau) có thêm lời báo kiểu "A {move}. Đang chờ B…" như `Play.aiSeatMovedAiThinking` hay không; `add-multiplayer-setup` cố ý không đổi `online-play`.
