# Design

## Context

Tuỳ chọn luật đi theo ván như sau (xem proposal.md, Why):

- **Lúc tạo**: người chơi chọn ở `SetupScreen`. Tuỳ chọn được lưu trong `GameSession.options`; online thì nằm trong `room.record`.
- **Ván mới cùng máy và đấu với máy**: `requestNewGame()` của `local-transport` gọi `newSession(session.options, …)`.
- **Ván mới online**: `requestNewGame()` của `online-transport` gửi `{ type: "rematch", gameNumber }`. `rematch` của `room-service` tạo `createSession` với `session.options`.
- **Kiểm tuỳ chọn**: `parseGameOptions` của engine kiểm mọi tuỳ chọn từ ngoài vào, kể cả lúc server tạo phòng (`invalid-options`).
- **Nhãn**: `useOptionLabels` đặt tên nhóm và giá trị từ khoá `Games.<id>.options.*`.
- **Hiển thị lựa chọn**: `RadioGroup` (packages/ui) là thanh phân đoạn xuống dòng khi hẹp.
- **Game có tuỳ chọn**: hiện chỉ Cờ caro (`size`, `rule`) và Đội gom thạch (`map`). Đội gom thạch sẽ có 8 bản đồ (`add-jelly-crew-game` §11), quá nhiều cho một thanh ở 390 px.

Thư mục bị ảnh hưởng, theo chiều phụ thuộc của plan.md §3.2, `ui` ← `web` và `protocol` ← `web`:

- `packages/protocol` (thông điệp);
- `packages/ui` (`RadioGroup`);
- `apps/web/src/{server,transport,features,lib,games}`;
- `apps/web/messages`.

`engine` và `games` không đổi: gợi ý ván sau là việc của giao diện, không phải luật.

## Goals / Non-Goals

**Goals:**

- Một đường duy nhất cho "ván mới với tuỳ chọn X" ở mọi chế độ: `requestNewGame(options?)`. Nút "Đổi …", nút gợi ý và "Ván mới" / "Chơi lại" đều đi qua đường này.
- Hộp đổi tuỳ chọn dùng lại đúng nhóm lựa chọn của màn bắt đầu ván, để hai nơi không lệch nhau.
- Phần dùng chung không biết mã game nào: tên nút, ghi chú và gợi ý do game khai báo.

**Non-Goals:**

- Không đổi cách xoay ghế, cách tính "hai yêu cầu cho cùng một ván", hay thời hạn phòng.
- Không thêm tin hệ thống vào chat.

## Decisions

### 1. Giao thức: `rematch` có thêm `options` tuỳ chọn

- **Thông điệp**: `{ type: "rematch", gameNumber, options?: unknown }`. Schema zod để `options` là `unknown`, vì giá trị sai phải tới được `room-service` để bị từ chối bằng `invalid-options`. Nếu schema bắt sai thì client nhận `invalid-message` và kết nối lại, như cách chat đã làm. Cỡ bị chặn bởi giới hạn khung thông điệp sẵn có.
- **Server** (`rematch`): khi `options !== undefined`, gọi `parseGameOptions(game, options)`; sai thì `fail(ENGINE_ERROR.InvalidOptions, room)`. Thứ tự kiểm giữ như cũ (ghế → `stale-move` → `game-not-over`), rồi mới tới tuỳ chọn. Nhờ vậy yêu cầu thứ hai cho cùng một ván vẫn nhận `stale-move` dù tuỳ chọn có hợp lệ hay không.
- **Lưu**: không cần trường mới trong `StoredRoom`. Tuỳ chọn nằm trong `record.options` của ván mới, và các lần `rematch` sau không gửi `options` thì lấy tuỳ chọn của ván vừa xong, tức tuỳ chọn mới.
- **Client cũ** không gửi `options` thì hành vi như trước. Server cũ gặp `options` lạ thì `strictObject` từ chối với `invalid-message`. Client và server luôn deploy cùng nhau, và khi lệch phiên bản thì kiểm phiên bản app đã báo "ứng dụng vừa được cập nhật". Không cần bước chuyển tiếp.

**Phương án khác**: một thông điệp mới `change-options`. Bị loại vì nó trùng mọi luật của `rematch` (ghế, ván đã xong, chỉ một ván mới).

### 2. Transport: `requestNewGame(options?: unknown)`

- **Cùng máy và đấu với máy**: `newSession(options ?? session.options, playerCount)`. Tuỳ chọn được kiểm bằng `parseGameOptions`; sai thì bỏ qua yêu cầu. Giao diện chỉ gửi giá trị lấy từ `optionChoices` nên trường hợp này không xảy ra, nhưng transport không tin dữ liệu từ ngoài. Ván mới được lưu như mọi ván, kèm `options`, nên tải lại vẫn giữ tuỳ chọn mới.
- **Online**: gửi `options` nếu có. Lỗi `invalid-options` cho `rematch` được xử lý như mọi lời từ chối khác của `rematch` (`pending` bị huỷ, nút bấm lại được).
- **`ReadySnapshot`**: không đổi; `options` của ván mới đã có trong snapshot.

### 3. Giao diện

**`OptionFields`** (`features/setup/OptionFields.tsx`, mới) được tách từ vòng `optionChoices.map` của `SetupScreen`:

- nhận `gameId`, `choices`, `value`, `onChange`;
- vẽ một `RadioGroup` cho mỗi tuỳ chọn;
- được dùng ở `SetupScreen` và `NewGameOptionsDialog`.

**`RadioGroup`** có thêm hai thứ:

- `hint?: string` cho từng lựa chọn: một dòng chữ nhỏ màu `fg-muted` dưới tên.
- `layout?: "bar" | "grid"`, mặc định `bar`:
  - `grid` là lưới `repeat(auto-fill, minmax(8rem, 1fr))` trên cùng một rãnh `bg-surface-muted`;
  - ô đã chọn nổi lên như thanh hiện nay (viền `border-control`, dấu ✓, đậm hơn), không trông như nút hành động chính;
  - mỗi ô cao ít nhất 56 px.

`OptionFields` chọn `grid` khi game có ghi chú cho tuỳ chọn đó, còn lại giữ `bar`. Cờ caro vì vậy không đổi hình.

**Nhãn** (`useOptionLabels`):

- `hint(gameId, name, value)` đọc khoá `Games.<id>.options.<name>.hints.<value>` nếu có (`t.has`), không có thì trả `null`.
- `change(gameId)` đọc khoá `Games.<id>.options.change`, bắt buộc với mọi game có `optionChoices`: Cờ caro "Đổi bàn, luật", Đội gom thạch "Đổi bản đồ".
- `next(gameId, options)` đọc khoá `Games.<id>.options.next` với `{rules}` là `summary` của tuỳ chọn gợi ý, ví dụ "Bản đồ tiếp: {rules}".
- `use-option-labels.test` kiểm:
  - có đủ `change` cho mọi game có tuỳ chọn;
  - nếu một giá trị của một tuỳ chọn có `hints` thì mọi giá trị của tuỳ chọn đó đều có, ở cả ba ngôn ngữ;
  - có `next` khi game khai báo gợi ý.

**Gợi ý ván sau**: thêm `GameUI.useNextOptions?: () => (result: GameResult, options: Options) => Options | null`, không bắt buộc.

- Đội gom thạch sẽ cài hook này ở `add-jelly-crew-game` §11.
- `PlayScreen` chỉ gọi hook khi ván đã kết thúc, và bỏ qua gợi ý không khớp `optionChoices` (`matchOptionChoices`).

**Thẻ kết quả** (`PlayScreen`), khi ván kết thúc:

- Có gợi ý: nút chính `[→ Bản đồ tiếp: Tiệm chè]` chiếm trọn hàng trên điện thoại, rồi `[Ván mới | Chơi lại]` dạng `secondary`.
- Không có gợi ý: `[Ván mới | Chơi lại]` vẫn là nút chính như hiện nay.
- Sau cùng là `[Đổi …]` dạng `secondary`, có icon (bản đồ hoặc thanh trượt).
- Giữa ván không có hai nút mới. Nút "Ván mới" giữa ván ở hàng công cụ giữ nguyên.

**`NewGameOptionsDialog`** (`features/play`, mới):

- dựng trên `Dialog` gốc của `packages/ui`;
- tiêu đề là tên nút, mô tả có hai biến thể cùng máy / online;
- trong hộp là `OptionFields`, chọn sẵn `snapshot.options`;
- hai nút "Huỷ" và "Bắt đầu ván mới".

Bấm "Bắt đầu ván mới" làm ba việc:

1. ghi lựa chọn nhớ gần nhất (`setup-preferences`), chỉ phần `options`, giữ chế độ, mức độ và người đi trước đang nhớ;
2. gọi `transport.requestNewGame(options)`;
3. đóng hộp.

Focus sau đó theo đúng đường của "Ván mới" / "Chơi lại" hiện nay (`focusNewGame`, `focusTitleOnNewGame`).

**Báo ván mới với tuỳ chọn khác** (online):

- `PlayScreen` giữ `options` của ván trước theo `gameNumber`.
- Khi ván mới có `optionLabels.summary` khác ván trước và chưa có nước nào, dòng trạng thái và vùng `role="status"` ghi `Play.newGameOptions` "Ván mới: {rules}", nối với phần đang có ("· bạn là Hồng", "Bạn đi trước").
- Nước đầu tiên của ván mới thì trở về lời báo thường.

### 4. Chữ hiển thị (vi; en và ja dịch tương ứng)

**Khoá chung**:

- `Play.newGameOptions` "Ván mới: {rules}"
- `Play.optionsDialog.description` "Ván mới bắt đầu với lựa chọn này."
- `Play.optionsDialog.descriptionOnline` "Ván mới bắt đầu ngay cho cả phòng, với lựa chọn này."
- `Play.optionsDialog.confirm` "Bắt đầu ván mới"
- `Play.optionsDialog.cancel` "Huỷ"

**Theo game**:

- `Games.caro.options.change` "Đổi bàn, luật"
- `Games.jelly-crew.options.change` "Đổi bản đồ"
- `Games.jelly-crew.options.next` "Bản đồ tiếp: {rules}"
- `Games.jelly-crew.options.map.hints.*` (độ khó, khai báo ở `add-jelly-crew-game` §11)

### 5. Hướng hình ảnh và token

Mockup: `mockup/index.html`, ảnh trong `mockup/png/`. Người dùng duyệt ngày 13/11/2026 ("Duyệt"), không điều chỉnh. Mockup gồm:

- màn bắt đầu ván có lưới 8 bản đồ kèm độ khó;
- thẻ thắng có "Bản đồ tiếp";
- hộp "Đổi bản đồ" cùng máy và online;
- bản đồ cuối, không có nút gợi ý;
- màn của bạn cùng phòng sau khi Minh đổi bản đồ;
- Cờ caro và hộp "Đổi bàn, luật".

Không thêm token mới:

- Lưới dùng lại `surface-muted`, `surface-raised`, `border-control` và `shadow-raised` của thanh phân đoạn.
- Dòng ghi chú dùng `fg-muted`, đã đạt 4.5:1 trên `surface-muted` ở cả sáng lẫn tối, như chú thích của màn bắt đầu ván.
- Nút đổi tuỳ chọn dùng biến thể `secondary` sẵn có của `Button`, kèm icon để phân biệt với "Ván mới"; không thêm biến thể.

### 6. Kiểm tra

**Unit**:

- protocol: `rematch` có và không có `options`;
- `room-service`:
  - ván mới với tuỳ chọn khác;
  - tuỳ chọn sai bị từ chối với `invalid-options`, phòng không đổi;
  - lần sau không gửi thì giữ tuỳ chọn mới;
  - hai yêu cầu cho cùng một ván;
- `local-transport`: ván mới với tuỳ chọn, lưu và tải lại;
- `online-transport`: gửi kèm `options`;
- `use-option-labels`: các khoá bắt buộc và ghi chú.

**Component**:

- `RadioGroup` dạng lưới và ghi chú (vai trò radio, tên đọc được gồm cả ghi chú);
- `OptionFields`;
- `NewGameOptionsDialog`;
- `PlayScreen`:
  - các nút có và không có theo trạng thái ván và theo game;
  - gợi ý;
  - lời báo online.

**E2E**:

- Cờ caro cùng máy đổi sang 19×19 từ thẻ kết quả;
- Cờ caro online hai trình duyệt, một người đổi và người kia thấy bàn 19×19;
- Đội gom thạch "Bản đồ tiếp" (sau khi `add-jelly-crew-game` §11 có bản đồ thứ hai trong danh sách mới).

**Ảnh**: `pnpm ui:shots` thêm cảnh hộp đổi tuỳ chọn và thẻ thắng có gợi ý. Xem sáng/tối × 390/1280 và 360 px.

## Khác thiết kế

Ghi lại khi code; spec và các mục trên đã sửa cho khớp.

- **Lời báo ván mới có hai dạng**: game đi tự do ghi `Play.newGameOptions` "Ván mới: {rules} · {status}"; game theo lượt vốn đã báo "Ván mới: bạn cầm X và đi trước", nên luật nối phía sau bằng `Play.newGameOptionsTurn` "{status} · {rules}", không lặp "Ván mới".
- **Icon của nút đổi tuỳ chọn** là thanh trượt (`SlidersHorizontalIcon`) cho mọi game. Mockup vẽ hình bản đồ cho Đội gom thạch, nhưng phần dùng chung không biết tuỳ chọn nào là bản đồ.
- **Nút gợi ý cũng ghi nhớ tuỳ chọn** như hộp đổi tuỳ chọn (`rememberSetupOptions`): người vừa sang "Tiệm chè" mở lại màn bắt đầu ván thấy "Tiệm chè".
- **Hộp đổi tuỳ chọn** là `ConfirmDialog` có thêm `children` và `wide` (`max-w-lg`, cuộn bên trong khi thấp), không phải `Dialog` toàn màn hình.
- **Ghi chú trong `RadioGroup`**: radio có ghi chú được đặt tên bằng `aria-label` "Kho lạnh, Khó", chữ ghi chú hiện trên màn hình là `aria-hidden`. Đọc qua một span `sr-only` thì Chromium chèn dấu cách trước dấu phẩy ("Kho lạnh , Khó"). Hàm `choose` của E2E nhận tên có ghi chú theo sau.

- **Sau hai lượt review** (rà `web-design-guidelines` và săn bug):
  - nút "Bản đồ tiếp" được xuống dòng khi tên dài, hai nút phụ giãn đều trên điện thoại;
  - ô lưới luôn chừa chỗ cho dấu ✓;
  - nút đổi tuỳ chọn có `aria-haspopup="dialog"`;
  - lời báo ván mới so tuỳ chọn theo giá trị, không theo chữ, nên đổi ngôn ngữ không báo nhầm "Ván mới";
  - lời từ chối `invalid-options` cho `rematch` không hiện "Nước đi không hợp lệ";
  - online, focus chờ ở tiêu đề sau khi bấm "Bắt đầu ván mới";
  - khi chưa nhớ gì, lựa chọn nhớ mới ghi cả số người chơi;
  - nhóm chỉ có ghi chú ở vài giá trị thì không đọc ghi chú nào.

## Risks / Trade-offs

- [Hai người cùng bấm ở hai máy: một người "Chơi lại", người kia "Đổi bản đồ"] → người tới trước thắng như hiện nay, người sau nhận `stale-move`. Người sau thấy ván mới đã bắt đầu (lời báo nêu bản đồ nếu đổi) và có thể đổi lại ở ván sau. Không thêm khoá hay bỏ phiếu: đây là game giữa bạn bè.
- [Đổi bản đồ khi đồng đội còn đang đọc kết quả] → ván mới bắt đầu ngay cho cả phòng, giống "Chơi lại". Dòng trạng thái nói rõ bản đồ mới. Đồng đội có thể bấm "Bỏ cuộc" hoặc đổi lại sau ván.
- [Lưới 8 ô dài trên điện thoại 360 × 640] → mỗi ô 56 px × 4 hàng, khoảng 240 px. Hộp có `max-height` và tự cuộn bên trong, nút "Bắt đầu ván mới" luôn tới được. Kiểm bằng ảnh 360 px.
- [Tuỳ chọn được nhớ ngay khi bấm, trước khi server nhận: nếu người khác bấm "Chơi lại" trước, ván mới theo tuỳ chọn của người đó mà màn bắt đầu ván vẫn nhớ lựa chọn bị bỏ] → chấp nhận: người bấm trước quyết, như "Chơi lại"; lần sau mở màn bắt đầu ván thì lựa chọn đó chỉ là gợi ý ban đầu, đổi được.
- [Ghi nhớ lựa chọn khi đổi từ ván online] → chỉ ghi `options`, không đổi chế độ đang nhớ, nên lần sau mở màn bắt đầu ván vẫn ở chế độ cũ với bản đồ mới. Như vậy là chủ ý.

## Migration Plan

Không có dữ liệu cũ phải đổi:

- Phòng và ván đã lưu không có trường mới.
- Client cũ (tab mở từ trước khi deploy) gửi `rematch` không có `options` và vẫn chạy.
- Server mới nhận được cả hai dạng.
