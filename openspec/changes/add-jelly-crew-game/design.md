# Design

## Context

Xem proposal.md, mục Why. Hiện trạng liên quan:

- Phòng online, link mời, chat, kết nối lại, xử bỏ ván đều chạy trên `GameDefinition` (`packages/engine`), server là trọng tài bằng chính luật trong `packages/games` (`GAMES`). Phòng 2–4 ghế đã có (Cờ cá ngựa, Cờ rào).
- Gom thạch (`apps/web/src/puzzles/jelly-gather/`) là trò giải đố một người, không phải `GameDefinition`; ESLint cấm nó import engine, games, protocol, transport, server.
- Hợp đồng engine chỉ biết game đối kháng: `sessionResult` cho "mọi người còn lại thắng" khi có người đầu hàng hay bỏ ván; `online-transport` cho người chờ quyền "xử thắng"; `PlayScreen` liệt kê tên người thắng.
- Bộ kiểm tra hợp đồng (`describeGameContract`) đòi mọi ván tự chơi ngẫu nhiên kết thúc trong `maxPlies`.
- Cờ vua đã chứng minh đường "game không có máy" (`supportsAI: false`): menu và màn bắt đầu ván chỉ có "Cùng máy" và "Online".

## Goals / Non-Goals

**Goals**

- Một game cùng phe 2–4 người chạy trên khung sẵn có: cùng máy và online, server làm trọng tài, ván là danh sách nước đi.
- Hợp đồng engine biết "game cùng phe" bằng một cờ, để game cùng phe sau này không phải sửa phần dùng chung.
- Bản đồ vừa màn hình 360 px mà không cần camera.

**Non-Goals**

- Không đổi trò giải đố Gom thạch, kể cả mã luật của nó (§2).
- Không đổi server, `RoomView`, định dạng phòng lưu trong Redis.
- Không có máy chơi hay máy chơi thay (`supportsAI: false`).

## Decisions

### 1. Là một game, không phải chế độ của trò giải đố

Đội gom thạch là `GameDefinition` mới `jelly-crew` trong `packages/games/src/jelly-crew/`, phần app ở `apps/web/src/games/jelly-crew/`, theo đúng bất biến "Thêm một game chỉ gồm…".

- **Đã cân nhắc**: thêm chế độ nhóm vào trò giải đố và tự làm phòng online cho nó. Bỏ: phải dựng lại trọng tài, phòng, kết nối lại, chat, và phá bất biến của trò giải đố.

### 2. Luật viết riêng, không dùng chung với Gom thạch

Luật đẩy và dính (khoảng 120 dòng: `settle` bằng union-find, đẩy cả dãy bằng BFS) được viết lại trong `packages/games/src/jelly-crew/`, theo cách Gom thạch đã làm nhưng mở rộng: nhiều nhân vật, nút, cửa, lượt.

- **Đã cân nhắc**: chuyển lõi luật của Gom thạch sang `packages/games` cho hai bên dùng chung. Bỏ ở change này: phải sửa trò giải đố vừa ship (đang chờ người dùng chơi thử 40 màn để archive), đổi bất biến "trò giải đố không import games", và hai luật đã khác nhau (thạch dừa, một người chơi, `chainPush`). Sau này muốn gộp thì làm một change refactor riêng; test của hai bên giữ hành vi.
- Giữ cùng **hình** (màu, ký hiệu từng loại thạch, cách vẽ khối liền) để hai trò là một họ; token được khai báo lại trong `games/jelly-crew/theme.css` vì mỗi game giữ token của riêng mình (§7).

### 3. State, nước đi, lượt

> **Đã thay bằng §10 (đi tự do, sau chơi thử 13/11/2026).** Phần dưới tả bản theo lượt đã ship trong commit `687dfbf`, giữ lại làm lịch sử quyết định; luật cửa, đẩy, dính và đặt lại bàn vẫn đúng.

**Nước đi** là chuỗi: `"U" | "D" | "L" | "R" | "end" | "back" | "reset"`. Ngắn vì một ván có vài trăm nước và cả biên bản được gửi mỗi lần ghi (§8); `moveKey` mặc định (JSON) là chính chuỗi đó.

**State** (dữ liệu thuần, không mutate):

```ts
interface JellyCrewState {
  readonly map: JellyCrewMapId; // "kitchen" | "market" | "cold-store"
  readonly playerCount: number;
  readonly board: { readonly chars: readonly number[]; readonly pieces: readonly Piece[] };
  readonly turn: PlayerIndex; // người đến lượt
  readonly taken: number; // bước đã đi trong lượt, 0..5
  readonly backs: number; // số lần đã lùi trong lượt, 0..5
  readonly turnsDone: number; // số lượt đã xong của cả ván
  readonly steps: number; // tổng bước cả đội đã đi (trừ bước đã lùi; giữ qua đặt lại)
  readonly turnBoards: readonly Board[]; // bàn trước mỗi bước của lượt này, để lùi
  readonly trail: { seat: PlayerIndex; cells: readonly number[] } | null; // đường đi của lượt gần nhất có bước
  readonly last: StepNews | null; // việc của nước vừa đi: khối bị đẩy, cửa mở/đóng, số khuôn đổi
  readonly result: "filled" | "out-of-rounds" | null;
}
```

Bố cục (tường, nút, cửa, khuôn, ô xuất phát, số vòng) không nằm trong state mà tra theo `map` và `playerCount` từ bảng hằng số, nên state nhỏ và biên bản không chép bản đồ. `last` và `trail` có trong state để nhãn nước đi (`useMoveLabel(move, stateAfter)`) và dấu đường đi đọc được việc vừa xảy ra mà không cần state trước; chúng tính ra từ nước đi nên vẫn tất định.

**Cửa**: một cửa nhóm _g_ mở khi một nút nhóm _g_ có nhân vật hay ô thạch, **hoặc** khi chính ô cửa đó có nhân vật hay ô thạch (kẹt; chỉ cửa đó, không phải mọi cửa nhóm _g_). `last.opened`/`closed` chỉ báo nhóm đổi theo nút, không báo cửa kẹt. Một bước được xét theo cửa của bàn trước bước; sau bước, cửa tính lại từ bàn mới. Nhờ luật kẹt, thạch hay khối nhiều ô đang nằm trong cửa luôn ra được, và bước từ nút vào cửa của nó hợp lệ.

**Luật mỗi nước**:

- Bước (`U/D/L/R`): hợp lệ khi `taken < 5` và `tryStep` không bị chặn (tường, mép bàn, cửa đóng, nhân vật khác, khối bị đẩy chạm một trong các thứ đó). Đẩy cả dãy như Gom thạch (luôn đẩy dây chuyền), rồi `settle`. Thêm bàn cũ vào `turnBoards`, `taken + 1`, `steps + 1`. Đầy khuôn thì `result = "filled"`. Lượt **không** tự chuyển khi `taken === 5`.
- `end`: luôn hợp lệ khi ván chưa xong; hết lượt.
- `back`: hợp lệ khi `taken > 0` và `backs < 5`; bàn = phần tử cuối của `turnBoards`, `taken − 1`, `steps − 1`, `backs + 1`.
- `reset`: hợp lệ khi bàn khác bàn xuất phát. So sánh trên dạng chuẩn: nhân vật theo ghế, khối sắp theo ô nhỏ nhất, ô trong khối sắp tăng (`settle` luôn trả dạng này), nên hai khối đã dính khác hẳn hai khối rời. Bàn = bàn xuất phát, `steps` giữ nguyên, rồi hết lượt.
- Hết lượt: `turnsDone + 1`, `turn = (turn + 1) % playerCount`, `taken = 0`, `backs = 0`, `turnBoards = []`; nếu `turnsDone === rounds × playerCount` thì `result = "out-of-rounds"`.
- `result()`: `"filled"` → `{ kind: "win", winners: mọi ghế, reason: "filled" }`; `"out-of-rounds"` → `{ kind: "draw", reason: "out-of-rounds" }`.

Thứ tự `legalMoves`: bốn hướng hợp lệ, `end`, `back`, `reset`. Không ngẫu nhiên, không `outcomes`.

**Ván luôn hữu hạn.** Mỗi lượt có nhiều nhất 10 bước (5 bước, lùi 5 lần, đi lại 5 bước), 5 lần lùi và một `end` hay `reset`: tối đa 16 nước. Cả ván tối đa `16 × rounds × playerCount` nước; ván thật thường khoảng 5–7 nước mỗi lượt. Test kết thúc như `ludo/termination.test.ts` kiểm giới hạn này.

**Vì sao giới hạn vòng.** Bộ kiểm tra hợp đồng đòi ván tự chơi kết thúc; người chơi ngẫu nhiên không bao giờ đầy khuôn. Giới hạn vòng cũng giữ phòng không kéo dài mãi và cho cả đội một con số để cố.

- **Đã cân nhắc**: mỗi lượt một bước (đơn giản nhất). Bỏ: bản đồ rộng, 4 người thì mỗi người chờ rất lâu mới đi được một ô.
- **Đã cân nhắc**: tuỳ chọn số bước mỗi lượt (3/5/8). Bỏ: giới hạn vòng phải tính theo nó và mỗi bố cục phải kiểm ba lần; 5 bước là đủ nhanh. Thêm sau nếu cần.
- **Đã cân nhắc**: hết 5 bước thì tự sang lượt (bản đầu của design). Bỏ sau lượt duyệt trải nghiệm: trên một thiết bị, bấm nhanh hay giữ phím làm nhân vật của người sau đi luôn; online thì bước thứ năm, thường là cú đẩy quan trọng nhất, không lùi được. Đổi lại mỗi lượt thêm một lần bấm, và "Giữ nút" (§6) bớt việc cho người đứng giữ nút.
- **Đã cân nhắc**: không có `back`, dùng hoàn tác của engine. Không được: online không có hoàn tác (`local-play` có, `online-play` không).
- **Đã cân nhắc**: không giới hạn số lần lùi. Bỏ: đi rồi lùi lặp mãi trong một lượt làm biên bản dài vô hạn; mỗi lần ghi phát lại và phát đi cả biên bản.

### 4. Bản đồ

Mỗi bố cục khai báo bằng chuỗi như Gom thạch, kèm lớp khuôn riêng:

```
#  tường        .  sàn          1–4  ô xuất phát của ghế
r g y p s i     thạch dâu, lá dứa, xoài, khoai môn, sương sáo, đá viên
a b c           nút nhóm ● ▲ ■        A B C  cửa nhóm ● ▲ ■
lớp khuôn: R G Y P S I (một chuỗi mỗi hàng, '.' là không có khuôn)
```

`parseLayout` kiểm khi nạp module (test chạy trên cả 9 bố cục): kích thước ≤ 19 × 13, đủ ô xuất phát 1..n, mỗi cửa có ít nhất một nút cùng nhóm và ngược lại, khuôn không đè tường, cửa hay nút, mỗi loại có khuôn có số ô thạch bằng số ô khuôn của loại đó (luật vừa khít; loại không có khuôn, thường là đá viên, chỉ là vật cản), thạch ban đầu chưa dính sai (đã `settle`), không ô thạch hay ô xuất phát nào nằm trên cửa. Sai thì ném lỗi có mã, để test báo rõ bố cục nào.

**Ba bản đồ × ba số người = 9 bố cục**, thiết kế ở task 1.7:

| Bản đồ            | Ý tưởng                                                                                  | Cơ chế                        |
| ----------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| Hai gian bếp (dễ) | Mỗi người một gian, khuôn ở gian giữa; người này giữ nút cho người kia đẩy thạch qua cửa | Nút, cửa, khuôn               |
| Chợ đêm (vừa)     | Lối đi chung hẹp, nhân vật chắn nhau; một khối thạch có thể nằm giữ nút thay người       | Thêm thạch giữ nút, sương sáo |
| Kho lạnh (khó)    | Đá viên chắn lối, phải đưa thứ tự đúng; cửa đóng lại sau lưng khi người giữ nút đi       | Thêm đá viên, cửa nhiều nhóm  |

Người dùng duyệt mockup ngày 13/11/2026 (yêu cầu implement), không điều chỉnh.

Chín bố cục (task 1.7, `layouts.ts`). Lời giải mẫu do một bộ xếp lượt đơn giản tạo ra: mỗi ghế đi các bước của mình theo đúng thứ tự cần, lượt kết thúc ngay khi bước kế tiếp là của ghế khác, nên số vòng của lời giải lớn hơn khi chơi thật; giới hạn vòng là 2,5 lần số đó, làm tròn lên.

| Bố cục       | Cỡ      | Lời giải (bước / nước / vòng) | Giới hạn vòng | Cơ chế chính                                                          |
| ------------ | ------- | ----------------------------- | ------------- | --------------------------------------------------------------------- |
| kitchen-2    | 19 × 7  | 25 / 34 / 5                   | 13            | mỗi người giữ nút cho người kia                                       |
| kitchen-3    | 19 × 12 | 37 / 59 / 8                   | 20            | vòng giữ nút ba người; khối dọc qua cửa dưới                          |
| kitchen-4    | 19 × 13 | 44 / 81 / 10                  | 25            | bốn gian, hai cửa ●                                                   |
| market-2     | 17 × 7  | 37 / 50 / 7                   | 18            | lối chung; người vào trong giữ nút cho người ngoài; sương sáo dính ba |
| market-3     | 19 × 9  | 41 / 64 / 8                   | 20            | đá viên đẩy lên nút ● giữ cửa thay người                              |
| market-4     | 19 × 12 | 43 / 73 / 8                   | 20            | thêm gian trên, cửa ● thứ hai                                         |
| cold-store-2 | 19 × 7  | 59 / 82 / 12                  | 30            | đá viên lên nút ▲; thứ tự vào kho; cửa ● đóng sau lưng                |
| cold-store-3 | 19 × 10 | 70 / 110 / 14                 | 35            | thêm gian dưới qua cửa ▲                                              |
| cold-store-4 | 19 × 10 | 89 / 154 / 17                 | 43            | hai người chung gian dưới, chắn nhau                                  |

**Kiểm tra bố cục** (spec "Bố cục giải được"):

- Mỗi bố cục có lời giải mẫu (danh sách nước) trong `layouts.solutions.ts`; test phát lại bằng chính `applyMove` và đòi thắng `filled`, người thắng là mọi ghế (kiểm tra `cooperative-winners` chạy trên đây vì ván ngẫu nhiên không bao giờ thắng), với số vòng dùng ≤ ½ `rounds`. `rounds` của bố cục đặt khoảng gấp 2,5 lần số vòng của lời giải mẫu, làm tròn lên.
- Test "cửa luôn đóng": BFS một tác nhân (mọi nhân vật đi lần lượt tuỳ ý, không lượt, cửa coi như tường) không tìm thấy lời giải. Khi cửa là tường, các gian tách rời hẳn, nên BFS chạy riêng từng gian có khuôn với nhân vật và thạch trong gian đó (nhân vật không phân biệt ghế); bố cục thắng được chỉ khi mọi gian ấy thắng được. Giới hạn 2 triệu trạng thái, chạm giới hạn thì test **thất bại** (không coi là đạt). Ở cả chín bố cục, gian khuôn không có nhân vật nào lúc đầu nên BFS dừng ngay.
- Không tìm lời giải ngắn nhất cho bố cục lớn: BFS nhiều nhân vật trên 13 × 7 với 2 người đã vượt 3,6 triệu trạng thái mà chưa xong (đo trong lúc thiết kế). Vì vậy game không có "ít bước nhất có thể" như Gom thạch.

### 5. Cờ cùng phe

- **Engine**: `GameMeta` thêm `readonly cooperative?: boolean`. `sessionResult` khi có `ending` ở game cùng phe trả `{ kind: "draw", reason: ending.reason }` thay vì liệt kê người thắng. Sửa chú thích còn ghi "every other seat wins" (`types.ts` `GameEnding`, `session.ts` `sessionResult`/`concede`, `room-service.ts` phần rời ván).
  - **Đã cân nhắc**: thêm loại kết quả mới `{ kind: "stopped" }`. Bỏ: mọi chỗ đọc `GameResult` (thẻ kết quả, bảng người chơi, biên bản, AI, server) phải xử lý thêm một nhánh; `draw` đã nghĩa là "không ai thắng", và `endedOutsideRules` chỉ xét lý do.
  - **Đã cân nhắc**: `winners: []`. Bỏ: phá bất biến "người thắng không rỗng" mà bộ kiểm tra hợp đồng đang giữ.
- **Bộ kiểm tra hợp đồng**: thêm kiểm tra `cooperative-winners` (game cùng phe thắng thì `winners` là mọi ghế) và `cooperative-no-ai` (game cùng phe không khai báo `supportsAI`, vì AI chấm điểm thắng theo từng ghế). Ván ngẫu nhiên của Đội gom thạch không bao giờ thắng, nên test bố cục (§4) chạy thêm kiểm tra người thắng trên các lời giải mẫu.
- **Transport**: `ReadySnapshot` thêm `cooperative: boolean` và `ending: GameEnding | null`, cả `local-transport` và `online-transport` đặt từ định nghĩa game và phiên (`PlayScreen` chỉ nhận `gameId`, `transport`, `ui`, không có định nghĩa). `ResignOption.outcome` thêm `"end"` (game cùng phe), để câu hỏi xác nhận không nói "Minh và Hoa sẽ thắng". Ở game cùng phe `claim` là `"end"`, không bao giờ `"win"`. `leaveOutcome` không đổi (không có máy nên đã là `End`).
- **Server**: không sửa mã; test thêm một game cùng phe giả trong `room-service-abandon.test.ts`: bỏ cuộc và xử bỏ ván cho `draw` kèm lý do, rồi "Chơi lại" được (ván đã có kết quả).
- **Màn hình chơi** (`features/play`), chỉ đọc `snapshot.cooperative`:
  - tiêu đề kết quả và dòng lượt khi xong: `Play.teamWins` "Cả đội thắng!", `Play.teamStopped` "Ván dừng" (kết thúc ngoài luật), `Play.teamEnded` "Ván kết thúc" (luật kết thúc không ai thắng); nhánh cùng phe đứng **trước** các nhánh `standInWins`, `youWin`, `opponentWins` và `draw`. Ăn mừng khi thắng (mọi ghế đều thắng nên `wonHere` đã đúng). `PlayerPanel` không gắn nhãn "Thắng" cho từng ghế ở game cùng phe;
  - dòng người rời ván lấy từ `snapshot.ending.player` (hiện `describeEnding` suy ra từ người không thắng nên không dùng được với `draw`): "Lan đã bỏ cuộc." / "Bạn đã bỏ cuộc.", "Lan bỏ ván: quá 5 phút không đi.";
  - nút "Bỏ cuộc", hộp thoại "Ván sẽ dừng cho cả đội, không ai thắng."; câu chờ, hộp thoại xử bỏ ván (`confirmAbandon` hiện có câu "không còn ai khác tự chơi", sai ở đây) và câu nhắc 4 phút (`turnWarnWin`) có biến thể cùng phe "ván sẽ dừng".
- Mọi chữ mới vào `Play.*` của `vi/en/ja.json`.

### 6. Màn hình chơi của game

- **Bàn** (`Board.tsx`): một SVG `viewBox` theo bố cục, rộng 100% cột, `max-width` để ô không quá 56 px. 19 cột ở 360 px còn ~17 px mỗi ô; mockup cho thấy vẫn đọc được số ghế (chữ ~9 px, đậm, trắng trên màu ghế) và ký hiệu thạch. Ô không bao giờ là vùng bấm. Không camera, không cuộn trong bàn.
- **Lớp vẽ** (dưới lên): nền và lưới, tường, khuôn, nút và cửa, vệt đường đi, thạch, viền khuôn khi có thạch, nhân vật.
- **Lượt trên bàn**: nhân vật đến lượt có vòng mực dày (≥ 2 px ở ô 17 px) cách thân một quầng nền, nhịp mờ chậm 1,6 s (tắt khi giảm chuyển động); khung bàn viền 3 px màu ghế đến lượt. **Vệt đường đi**: chấm nhỏ màu ghế trên các ô nhân vật vừa đi qua trong lượt gần nhất (`trail`), để đồng đội thấy gì vừa đổi.
- **Nút**: ô bo góc trung tính, ký hiệu nhóm ở giữa; có người hay thạch đứng thì đậm hơn. Nhân vật đứng trên nút có huy hiệu nhỏ ký hiệu nhóm ở góc, vì thân nhân vật che ký hiệu của nút. **Cửa đóng**: ô màu gỗ ba song dọc và huy hiệu ký hiệu nhóm, khác tường ở hình (song, huy hiệu). **Cửa mở**: hai cột gỗ ở hai mép ô (song đã rút vào), ký hiệu nhóm cỡ đủ ở giữa. Nét đứt chỉ dành cho khuôn.
- **Chip** dưới bàn: "Lam · còn 3 bước" (hết bước thì "Lam · hết bước, bấm Xong lượt", viền cảnh báo), "Vòng 3/40" (hai vòng cuối có viền cảnh báo), "Khuôn 5/8" (đầy thì màu thành công). Ván xong thì bỏ chip bước. Nằm trong `notes` của `BoardParts` để online, khi chat che cột, chúng vẫn được nói ở đầu khung chat.
- **Bàn điều khiển** (`controls`): ↑ giữa hàng trên, ← ↓ → hàng dưới; "Lùi bước" trên trái (chỉ khi `viewer !== null`, tức chơi online), "Đặt lại bản đồ" dưới trái, "Xong lượt" trên phải có viền đậm. Hướng bị chặn thì nút hướng `aria-disabled` kèm lý do ("Tường", "Cửa ▲ đóng", "Hồng chắn"), lấy từ cùng hàm kiểm bước của luật. Không phải lượt thì mọi nút, kể cả "Xong lượt", cùng kiểu khoá, kèm `lockedReason` ("Đang chờ Minh"; "Đang gửi…" khi nước trước chưa được server nhận). Vùng chạm 52 × 52 px.
- **Giữ nút**: khi nhân vật của người ở thiết bị này (cùng máy: của người đến lượt) đứng trên nút, có nút bật/tắt "Giữ nút" (`aria-pressed`). Đang bật, mỗi lần tới lượt ghế đó, bàn gửi `end` sau 600 ms và câu đọc nước đi nói "Hồng giữ nút, xong lượt". Bấm hướng, lùi, đặt lại hay tắt thì thôi giữ; rời nút cũng tắt. Trạng thái này chỉ ở thiết bị (không phải luật), mất khi tải lại trang.
- **Phím**: mũi tên, WASD (bỏ qua `event.repeat`), Enter = Xong lượt **chỉ khi** tiêu điểm ở `body` hay trên bàn, không bao giờ khi ở trong `button, a, [role=button], summary, input, textarea`; Z = Lùi bước chỉ khi chơi online. Chơi cùng máy không có phím hoàn tác (màn hình chơi chưa có; nút "Hoàn tác" vẫn có). Bỏ qua khi có phím bổ trợ, khi `<dialog>` hay menu đang mở, như Gom thạch.
- **Vuốt** trên bàn: ngưỡng 32 px theo trục trội. `touch-action: none` chỉ khi thiết bị này được đi; còn lại `pan-y` để kéo trên bàn cuộn trang.
- **Đặt lại bản đồ**: `<dialog>` gốc "Đặt lại bản đồ?", "Mọi người và thạch về chỗ ban đầu. Lượt của bạn kết thúc; các vòng đã chơi vẫn được tính.", nút "Để nguyên" có tiêu điểm, "Đặt lại". Ai đó đặt lại thì `notes` có dòng "Lan đã đặt lại bản đồ" tới bước kế tiếp.
- **Chuyển động**: nhân vật và khối bị đẩy trượt 120 ms, rồi khối mới dính co giãn nhẹ như Gom thạch; trong giới hạn 300 ms của game không xúc xắc. Nước nhận từ người ở xa dùng cùng chuyển động; màn hình chơi đã hiện lần lượt các nước nhận cùng lúc. Giảm chuyển động: không trượt, không nhịp.
- **Bảng người chơi**: `usePlayerLabel` → "Lam", "Hồng", "Cam", "Ngọc"; `SeatMark` vẽ nhân vật có số; `useSeatSummary` → "Giữ nút ●" khi đứng trên nút. Online, tên người đứng trước như mọi game ("Minh · Hồng").
- **Đọc màn hình**: chỉ một vùng `role="status"` (dòng lượt của màn hình chơi, `every-game.test.tsx` đòi đúng một). `useMoveLabel` nói trọn việc của nước từ `state.last`: "đi sang phải, cửa ● mở", "đẩy thạch dâu sang phải, khuôn 2/4", "xong lượt", "lùi một bước", "đặt lại bản đồ". Bước bị chặn không phải nước đi nên báo trong `notes` bằng `<p aria-live="polite">` không có vai trò, như Cờ rào. Danh sách "Mô tả bàn" theo hàng (`sr-only`).
- **Chi tiết kết quả** (`useResultDetail`): "Đầy khuôn sau 87 bước, 12 vòng." / "Hết 40 vòng, còn 3 ô khuôn trống."; người rời ván thì không có dòng của game (màn hình chơi đã có dòng của nó).

### 7. Token (sáng / tối) và tương phản

Trong `games/jelly-crew/theme.css`, `[data-game="jelly-crew"]`, ba khối như mọi game. Thạch, tường, khuôn dùng lại đúng giá trị của Gom thạch (đã kiểm ở `add-jelly-gather-puzzle` §9 và `add-jelly-gather-molds`), đổi tiền tố thành `--jelly-crew-*`. Mới:

| Token                | Sáng                  | Tối                   | Kiểm                                        |
| -------------------- | --------------------- | --------------------- | ------------------------------------------- |
| `seat-1` Lam         | `#2a5fc4`             | `#3d6fd6`             | số trắng 5.94 / 4.73                        |
| `seat-2` Hồng        | `#b8327a`             | `#c23d86`             | số trắng 5.56 / 4.88                        |
| `seat-3` Cam         | `#a8520c`             | `#b35e16`             | số trắng 5.42 / 4.64                        |
| `seat-4` Ngọc        | `#0b7169`             | `#11807a`             | số trắng 5.87 / 4.78                        |
| `seat-edge`          | `#17182b`             | `#f1f0f7`             | trên sàn 16.65 / 14.10                      |
| `seat-ink`           | `#ffffff`             | `#ffffff`             | (số ghế)                                    |
| `turn` (vòng lượt)   | `#17182b`             | `#f1f0f7`             | trên sàn 16.65 / 14.10                      |
| `turn-halo`          | `#fff9ec`             | `#1e2036`             | trang trí                                   |
| `plate` / `plate-on` | `#e6dcc4` / `#c7b48a` | `#3a3c58` / `#5d6080` | ký hiệu trên nút 11.25 · 7.55 / 8.90 · 5.07 |
| `plate-edge`         | `#6b5f45`             | `#b9b3a2`             | trên sàn 5.98 / 7.63                        |
| `sign`               | `#2b2418`             | `#f1ead8`             | (ký hiệu nhóm trên nút)                     |
| `door`               | `#7a5a3a`             | `#c9a57e`             | trên sàn 5.97 / 6.97                        |
| `door-bar`           | `#a98762`             | `#8f6c48`             | trang trí                                   |
| `door-sign`          | `#fff9ec`             | `#1e2036`             | trên cửa 5.97 / 6.97                        |
| `door-open`          | `#6b5f45`             | `#c9b9a0`             | trên sàn 5.98 / 8.31                        |

Số ghế là chữ nhỏ nên cần 4.5:1: đạt ở mọi ghế, cả tối. Màu ghế tránh bốn màu thạch (đỏ dâu, xanh lá dứa, vàng xoài, tím khoai môn) và khác thạch ở hình (tròn, có số). Cửa đóng và tường gần nhau về độ sáng (1.04 sáng, 1.27 tối) nên phân biệt bằng hình: song dọc và huy hiệu ký hiệu. `GAME_PAIRS` của `theme-css.test.ts` thêm các cặp trong bảng.

### 8. Online: chi phí và nhịp

- Mỗi nước là một lần ghi (1 `HGET` + script 5 lệnh, design `add-online-rooms` §8). Một lượt thật khoảng 5–7 nước; ván 2 người 10 vòng ≈ 100–140 nước, ván 4 người 20 vòng ≈ 400–560 nước ≈ 2.400–3.400 lệnh. Gói 500 nghìn lệnh/tháng vẫn đủ hơn 140 ván 4 người mỗi tháng. Tối đa (§3) là 16 nước mỗi lượt.
- Mỗi lần ghi phát cả phòng: nước đi là chuỗi 1–5 ký tự nên biên bản 600 nước khoảng 6 KB thêm vào JSON phòng; tổng băng thông một ván 4 người khoảng 4–6 MB mỗi chiều. Chi phí tăng theo bình phương độ dài ván, nên giới hạn ở §3 là cần thiết.
- Server và client dựng ván bằng `fromRecord`, đi qua `step()` của phiên cho mỗi nước: `result`, `legalMoves` (bốn lần `tryStep` có BFS và `settle`, cộng so sánh bàn cho `reset`), rồi `applyMove`. Task 1.6 đo `fromRecord` một biên bản 1.000 nước trên Node và đặt ngân sách dưới 50 ms trên máy dev (điện thoại chậm hơn vài lần). Đo được 11–15 ms (biên bản 1.000 nước kiểu dài nhất: 5 bước, lùi rồi đi lại 5 lần, xong lượt, ở cold-store-4); test để ngưỡng rộng 500 ms cho máy CI. Vượt thì tối ưu `legalMoves` (tính cửa một lần, dùng lại chỉ mục ô) trước khi đổi gì khác.
- Bấm liên tục: nước trước chưa được server nhận thì bàn khoá ("Đang gửi…") như mọi game, bàn điều khiển cũng hiện khoá; không xếp hàng nước đi.
- Đồng hồ xử bỏ ván tính từ nước gần nhất (mỗi bước khởi động lại đồng hồ), không từ đầu lượt; câu chữ và scenario nói "chưa đi nước nào".

### 9. Kiểm tra

- `packages/games`: test theo từng scenario của `jelly-crew`, `describeGameContract` với 2, 3, 4 người, test bố cục (§4), test phát lại ván dài.
- `packages/engine`: `sessionResult` và kiểm tra `cooperative-winners`, `cooperative-no-ai` có test vi phạm riêng như các kiểm tra khác.
- `apps/web/src/server`: game cùng phe giả trong test rời ván (§5).
- `apps/web`: component test Board, bàn điều khiển, nhãn; test `PlayScreen` cho cùng phe (cùng máy, online, bỏ cuộc, chờ 5 phút); trang luật.
- E2E `games-jelly-crew.spec.ts`: chơi cùng máy hết bố cục 2 người "Hai gian bếp" bằng phím; online hai trình duyệt: giữ nút và đẩy qua cửa, bỏ cuộc.
- `pnpm ui:shots`: thêm cảnh đầu ván 2 và 4 người, đang giữ nút, online chờ, thắng, hết vòng, mỗi cảnh × sáng/tối × 390/1280; xem từng ảnh so với mockup (`mockup/png/`).

### 10. Đi tự do (sau chơi thử 13/11/2026)

Người dùng chơi thử online (task 5.3) và thấy lượt cùng giới hạn bước làm ván chậm: "mong muốn không giới hạn theo lượt, 2 người tự do đi được". Ngày 13/11/2026 người dùng chốt bốn điểm:

- **Thay hẳn** kiểu theo lượt, không giữ làm tuỳ chọn.
- **Không thua**: ván chỉ kết thúc khi đầy khuôn hay có người bỏ cuộc; kết quả ghi **số bước và thời gian** để cả đội tự so lần sau.
- **Cùng máy: chọn nhân vật rồi đi**: một hàng "Điều khiển" chọn nhân vật mà mũi tên, bàn điều khiển và vuốt điều khiển; trên máy tính **W A S D luôn là nhân vật 1**, để hai người chung bàn phím đi cùng lúc.
- **Bỏ "Lùi bước"** (và "Giữ nút", "Xong lượt"); giữ "Đặt lại bản đồ" có hỏi lại.

Mockup: `mockup/free.html` (ảnh `mockup/png/free-*`); người dùng duyệt ngày 13/11/2026 ("Xử lý cả đi tự do, merge vào main"), không điều chỉnh.

#### 10.1 Hợp đồng engine: game đi tự do

Engine chỉ biết đi tuần tự: một `currentPlayer`, server từ chối nước của ghế không đến lượt (`not-your-turn`) và nước gửi theo vị trí cũ (`stale-move`). Thêm một **loại game** như cờ cùng phe ở §5, không phải chỗ riêng cho `jelly-crew`:

- `GameMeta.freePlay?: boolean`: mọi ghế đi bất cứ lúc nào; **mỗi nước tự nói ghế của nó**.
- `GameDefinition.moverOf?(move): PlayerIndex`, bắt buộc khi `freePlay`. `legalMoves(state)` liệt kê nước của **mọi** ghế. `currentPlayer` vẫn phải có (kiểu không đổi) nhưng code dùng chung không đọc nó ở game đi tự do.
- Hàm dùng chung `moverOf(definition, stateBefore, move)` trong `packages/engine`: game đi tự do thì `definition.moverOf(move)`, còn lại `currentPlayer(stateBefore)`. Mọi chỗ đang suy "ai vừa đi" từ `currentPlayer(states[i])` (`lastMover` của hai transport, `moverOf` của `online-transport`, phần rời ván của server) gọi hàm này.
- Bộ kiểm tra hợp đồng thêm `free-play-movers` (mọi nước hợp lệ có `moverOf` là một ghế của ván; ở mỗi trạng thái chưa xong, mỗi ghế có ít nhất một nước hoặc không ai có) và `free-play-no-ai` (game đi tự do không khai báo `supportsAI`: AI tìm kiếm theo lượt).
- Biên bản không đổi: vẫn là danh sách nước theo thứ tự server nhận, nên phát lại, kết nối lại, autosave vẫn tất định (bất biến "một ván = danh sách nước đi" giữ nguyên).
- **Đã cân nhắc**: mỗi ghế một hàng đợi nước riêng rồi ghép. Bỏ: biên bản không còn là một danh sách, phá bất biến phát lại.
- **Đã cân nhắc**: giữ lượt nhưng mỗi lượt là "một bước của bất kỳ ai". Bỏ: vẫn phải đổi kiểm tra lượt của server, mà chẳng đơn giản hơn.

#### 10.2 Server và transport

- **Server** (`room-service.move`), game đi tự do:
  - kiểm ghế bằng `moverOf(move) === seat`, không bằng `currentPlayer`;
  - `moveIndex` được **nhỏ hơn hoặc bằng** số nước đã có (cùng `gameNumber`): nước gửi khi chưa thấy nước của người khác được áp lên **trạng thái mới nhất** và kiểm lại bằng luật. Không còn hợp lệ ở đó (ví dụ ô vừa bị người khác chiếm) thì từ chối `illegal-move`. `moveIndex` lớn hơn số nước vẫn là `stale-move`;
  - không có đồng hồ lượt cho người chơi: client bỏ qua `turnIdleMs` (server vẫn tính như mọi game) nên không có lời nhắc 4 phút, và server từ chối "xử bỏ ván" (`not-abandoned`). Người kẹt vì đồng đội bỏ đi thì bấm "Bỏ cuộc" (ván dừng cho cả đội, §5);
  - **gửi lại không đi hai lần**: nước mà từ vị trí của nó đã có nước của chính ghế đó bị từ chối `stale-move`. Client chỉ gửi nước kế tiếp khi nước trước của mình đã được trả lời, nên đây luôn là bản gửi lại (câu trả lời bị mất, kết nối lại), không bao giờ là nước mới;
  - **thử ghi tới 4 lần** (`MOVE_ATTEMPTS`, trước là 2): nhiều người ghi cùng lúc nên xung đột phiên bản là thường, mỗi lần thử áp lên phòng mới nhất;
  - **giới hạn mỗi kết nối 150 thông điệp trong 10 giây** (trước là 30): mỗi lần bấm phím là một thông điệp; 30 làm người bấm nhanh bị ngắt kết nối sau vài giây (spec `online-rooms` "Giới hạn mỗi kết nối").
- **`online-transport`**, game đi tự do: `canMove` khi phòng đủ người, đang kết nối, ván chưa xong, người ở thiết bị này tự chơi ghế của mình và không có nước đang chờ server trả lời; không xét `currentPlayer`. `waitingFor` luôn `null`, `turn` (đồng hồ) luôn `null`. Một nước bị từ chối `illegal-move` mà `moveIndex` của nó đã cũ thì **im lặng** (bàn đã đổi vì người khác), không báo lỗi. Nước đang chờ chỉ coi là đã được trả lời khi phòng mới có một nước **của chính ghế mình** từ `moveIndex` trở đi, hoặc server từ chối; phòng dài thêm vì nước của người khác thì chưa (hiện `answers` coi mọi biên bản dài hơn là đã trả lời).
- **Hiện ngay, không lần lượt**: ở game đi tự do, các nước nhận cùng lúc hiện ngay (không theo nhịp "Hiện lần lượt các nước nhận cùng lúc"), nếu không người chơi bị khoá sau nước của người khác chừng nào họ còn đi.
- **Không đoán trước nước đi**: vẫn một nước chờ server trả lời mỗi lúc như mọi game, nước hiện khi server phát lại (khoảng 70 ms trên Production, plan.md §10). Giữ phím hay bấm liên tục thì được khoảng 8–12 bước mỗi giây. Đoán trước kèm sửa lại khi server khác ý là việc sau, nếu chơi thử thấy chậm.
- **Nhận nước liên tục**: `online-transport` hiện dựng lại cả ván bằng `fromRecord` mỗi lần nhận phòng. Game đi tự do nhận nhiều nước hơn và mỗi nước phải kiểm `legalMoves` của mọi ghế, nên thêm **nối tiếp**: biên bản mới cùng `gameNumber` và chứa biên bản đang có làm đầu thì chỉ áp các nước mới (`playMove` từng nước). Áp dụng cho mọi game (kết quả như dựng lại, test so hai đường).
- **`local-transport`**: `canMove` khi ván chưa xong (mọi ghế đều là người); "Hoàn tác" và "Làm lại" của màn hình chơi giữ nguyên (lùi nước gần nhất, của bất kỳ ai). Người dùng bỏ "Lùi bước" vì online nhiều người đi xen nhau; trên một thiết bị, hoàn tác đã có và vô hại.

#### 10.3 Luật mới

- **Nước đi**: `` `${seat}${direction}` `` với hướng `U/D/L/R` (ví dụ `"1L"`), hoặc `` `${seat}reset` ``. `moverOf` là chữ số đầu. Chuỗi ngắn vì cả biên bản được gửi mỗi lần ghi.
- **State**: `map`, `playerCount`, `board`, `steps` (số bước cả đội, giữ qua đặt lại), `last` (việc của nước vừa đi, có `seat`), `result: "filled" | "too-long" | null`. Bỏ `turn`, `taken`, `backs`, `turnsDone`, `turnBoards`, `trail`.
- **Bước**: hợp lệ khi `tryStep` của ghế đó không bị chặn, như cũ. Đầy khuôn thì `result = "filled"`.
- **Đặt lại**: mọi ghế đặt lại được khi bàn khác bàn xuất phát; bàn về bàn xuất phát, `steps` giữ nguyên.
- **Thứ tự `legalMoves`**: theo ghế, mỗi ghế bốn hướng hợp lệ rồi `reset`.
- **Giới hạn an toàn 3.000 nước**: nước thứ 3.000 kết thúc ván không ai thắng, lý do `too-long`. Không phải luật để chơi (lời giải dài nhất 89 bước, gấp hơn 30 lần) mà giữ ba thứ có giới hạn:
  - bộ kiểm tra hợp đồng đòi ván tự chơi ngẫu nhiên kết thúc;
  - server dựng lại cả ván mỗi lần ghi;
  - phòng gửi cả biên bản mỗi lần ghi.

  Thẻ kết quả nói rõ "Ván kết thúc: đã đi 3.000 nước" để không ai tưởng là thua.

- **Bỏ** `JELLY_CREW_STEPS`, `JELLY_CREW_BACKS`, `rounds` của bố cục, `out-of-rounds`, `end`, `back`.
- **Lời giải mẫu** (`layouts.solutions.ts`) đổi sang nước có ghế: bỏ `end`, gắn ghế đang đến lượt vào mỗi bước. Test "Bố cục giải được" phát lại và đòi thắng `filled`; bỏ điều kiện "≤ ½ số vòng". Test "cửa luôn đóng" giữ nguyên (BFS vốn đã không có lượt).

#### 10.4 Thời gian ván

Đo bằng đồng hồ của bên làm trọng tài, ngoài luật (luật vẫn không đọc giờ):

- **Online**: phòng trong Redis thêm `gameStartedAt` (lúc đủ người hay lúc "Chơi lại") và `gameEndedAt` (lúc ván có kết quả), giờ của server. `RoomView` thêm `gameTime: { startedAt, endedAt } | null`, không bắt buộc (phòng cũ không có thì `null`). Thời gian = `endedAt − startedAt`, cùng một đồng hồ nên không lệch giữa các máy.
- **Cùng máy**: ván lưu (`saved-game`) thêm `startedAt`/`endedAt` không bắt buộc; `local-transport` đặt bằng `Date.now()` khi tạo ván và khi ván có kết quả. Hoàn tác nước thắng thì bỏ `endedAt`.
- **Snapshot**: `ReadySnapshot.gameTime: { startedAt: number; endedAt: number | null } | null`, cho mọi game; hiện chỉ Đội gom thạch đọc.
- **Hiển thị**: chỉ trên thẻ kết quả ("Đầy khuôn sau 152 bước, 7 phút 12 giây."); không có đồng hồ chạy giữa ván, vì online cần bù lệch giờ giữa máy và server. Thiếu `gameTime` thì dòng chỉ có số bước.

#### 10.5 Màn hình chơi

- **Không có lượt trên bàn**: bỏ khung bàn màu ghế, vệt đường đi, nhịp mờ. Vòng đậm (không nhịp) đánh dấu **nhân vật mà phím mũi tên điều khiển**: của bạn khi online, nhân vật đang chọn khi cùng máy.
- **Dòng lượt** (`role="status"`): "Cả đội cùng đi" (online thêm "· bạn là Hồng"); kết quả như §5. Bảng người chơi không có nhãn "Đến lượt" ở game đi tự do. `PlayScreen` và `PlayerPanel` đọc cờ `snapshot.freePlay`.
- **Chip**: "Bước 37" và "Khuôn 1/4". Bỏ chip lượt và vòng.
- **Bàn điều khiển**: bốn hướng ở lưới 3 × 2, hàng nút có chữ "Đặt lại bản đồ" bên dưới. Hướng bị chặn vẫn tắt kèm lý do. Online: nút khoá khi có nước đang chờ server, nhưng không hiện chữ "Đang gửi…" (chỉ chừng 70 ms).
- **Cùng máy, hàng "Điều khiển"**: radio gốc (`fieldset` + `legend` "Điều khiển"), mỗi ghế một nhãn có dấu ghế và số phím; mặc định ghế 2 (ghế 1 đã có W A S D). Phím 1–n chọn nhân vật. Mũi tên khi tiêu điểm đang ở radio thì để radio tự xử lý (đổi lựa chọn), không đi.
- **Phím**: online thì mũi tên và W A S D cùng là nhân vật của bạn. Cùng máy thì W A S D là ghế 1, mũi tên là nhân vật đang chọn. Không lặp khi giữ phím; bỏ Enter và Z.
- **Vuốt** trên bàn đi nhân vật mũi tên đang điều khiển; `touch-action: none` khi đi được.
- **Đặt lại bản đồ**: hộp thoại "Mọi người và thạch về chỗ ban đầu (online: cho cả đội). Số bước đã đi vẫn được tính."; online mọi người thấy dòng "Minh đã đặt lại bản đồ."
- **Lời báo**: bước bị chặn nói tên nhân vật ("Hồng: không đi được, cửa ● đang đóng."). Nước của người khác vẫn đọc qua dòng lượt như mọi game, nhưng online hai người đi liên tục thì đọc dày. Vì vậy ở game đi tự do, `useMoveLabel` chỉ đọc nước **có việc**: đẩy thạch, cửa mở hay đóng, số khuôn đổi, đặt lại. Bước đi trống chỉ đọc khi là của chính thiết bị này.
- **Trang luật**: thay mục lượt, vòng, lùi bước, giữ nút bằng "Mọi người cùng đi, không giới hạn bước"; thêm cách điều khiển cùng máy.
- **Màn hình bắt đầu ván**: "Cả đội cùng thắng khi mọi khuôn có thạch đúng màu. Ai cũng đi bất cứ lúc nào."

#### 10.6 Chi phí online

- Một ván thật khoảng 2–5 lần lời giải: 100–450 bước. Mỗi bước là một lần ghi (≈ 6 lệnh Redis), tức 600–2.700 lệnh mỗi ván; gói 500 nghìn lệnh/tháng đủ khoảng 180 ván dài mỗi tháng.
- Mỗi lần ghi, server dựng lại cả ván. `legalMoves` của game đi tự do thử bốn hướng cho mọi ghế (tới 16 lần `tryStep` thay vì 4), nên `fromRecord` chậm khoảng 3–4 lần bản theo lượt. Đo được `fromRecord` một biên bản 3.000 nước ngẫu nhiên (Kho lạnh 4 người): **79 ms** trên máy dev, trong ngân sách 200 ms; test để ngưỡng rộng 2 s cho máy CI. Vượt thì kiểm nước khi phát lại bằng `tryStep` của đúng ghế đó thay vì sinh mọi nước hợp lệ (thêm `isLegal?` vào hợp đồng), trước khi đổi gì khác.
- Biên bản 3.000 nước chuỗi 2–6 ký tự khoảng 30 KB JSON, vẫn nhỏ so với giới hạn một lần ghi.

#### 10.7 Dữ liệu cũ

Nước đi đổi dạng, nên ván Đội gom thạch lưu trên máy và phòng đang chơi từ bản theo lượt (ship sáng 13/11/2026) không dựng lại được nữa:

- ván lưu đi đường "ván lưu hỏng" đã có (bỏ, bắt đầu ván mới);
- phòng đi đường "phòng lỗi" đã có.

Game mới ship trong ngày nên không viết chuyển đổi.

### 11. Tám bản đồ và bản đồ tiếp theo (sau chơi thử 13/11/2026)

Người dùng chơi thử bản đi tự do và thấy ba bản đồ là quá ít. Họ cũng không đổi được bản đồ khi chơi xong. Ngày 13/11/2026 người dùng chốt:

- **Thêm 5 bản đồ, thành 8.** Mỗi bản đồ mới có bố cục cho 2, 3 và 4 người, tổng 24 bố cục.
- **Đổi bản đồ ngay ở thẻ kết quả**, chung cho mọi game có tuỳ chọn. Phần này là change riêng `add-new-game-options`.
- **Online, ai đang ngồi cũng đổi được.**
- **Thắng thì có nút "Bản đồ tiếp: …"**.

Mockup: `../add-new-game-options/mockup/index.html`, gồm lưới 8 bản đồ kèm độ khó, thẻ thắng và hộp "Đổi bản đồ". Bàn "Tiệm chè" trong mockup là bản nháp. Người dùng duyệt ngày 13/11/2026, không điều chỉnh.

#### 11.1 Thứ tự và độ khó

Thứ tự trong `JELLY_CREW_MAPS` là thứ tự của màn bắt đầu ván và của "Bản đồ tiếp". Bản đồ mới xen vào giữa các bản đồ cũ theo độ khó. Mã cũ giữ nguyên, nên ván lưu và phòng cũ vẫn đọc được.

| #   | Mã                | Tên (vi)      | Độ khó  | Ý tưởng                                                                                                         | Cơ chế chính                            |
| --- | ----------------- | ------------- | ------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | `kitchen`         | Hai gian bếp  | Dễ      | (có sẵn) mỗi người một gian, giữ nút cho nhau                                                                   | nút, cửa, khuôn                         |
| 2   | `dessert-shop`    | Tiệm chè      | Dễ      | Quầy chè chia đôi tiệm; nút của mỗi người mở cửa bên người kia, khuôn ở gian sau, qua hai cửa khác nhóm         | giữ nút luân phiên, hai nhóm cửa        |
| 3   | `market`          | Chợ đêm       | Vừa     | (có sẵn) lối chung hẹp, thạch giữ nút                                                                           | thạch giữ nút, sương sáo                |
| 4   | `coconut-grove`   | Vườn dừa      | Vừa     | Hàng dừa thành lối zíc zắc; sương sáo nối nhiều thạch thành khối chữ L, phải ghép đúng hướng mới lọt cửa        | ghép khối bằng sương sáo, thạch giữ nút |
| 5   | `cold-store`      | Kho lạnh      | Khó     | (có sẵn) đá viên chắn lối, thứ tự vào kho                                                                       | đá viên, cửa nhiều nhóm                 |
| 6   | `floating-market` | Chợ nổi       | Khó     | Lối nước rộng một ô giữa các ghe; nhân vật chắn nhau, phải nhường nhau ở các bến nhỏ; đá viên làm "cầu" giữ nút | nhường lối, đá viên giữ nút             |
| 7   | `jelly-factory`   | Xưởng thạch   | Rất khó | Dây chuyền ba nhóm cửa nối nhau: đứng ● mới tới được ▲, đứng ▲ mới mở ■; mỗi người giữ một trạm rồi đổi chỗ     | chuỗi ba nhóm, đổi chỗ giữ nút          |
| 8   | `moon-festival`   | Đêm trăng rằm | Rất khó | Bản đồ cuối: khuôn hình trăng khuyết ở giữa sân, bốn loại thạch, đá viên, sương sáo, cửa đóng sau lưng          | gộp mọi cơ chế                          |

Độ khó hiện dưới tên bản đồ ở màn bắt đầu ván và trong hộp đổi bản đồ. Giá trị nằm trong khoá `Games.jelly-crew.options.map.hints.<mã>`: "Dễ", "Vừa", "Khó", "Rất khó"; en "Easy" / "Medium" / "Hard" / "Very hard"; ja「やさしい」「ふつう」「むずかしい」「とてもむずかしい」. Tên bản đồ tiếng Anh và tiếng Nhật chốt khi thêm bản dịch.

#### 11.2 Thiết kế 15 bố cục mới

Cách làm như task 1.7: vẽ tay bằng chuỗi, mỗi bố cục có lời giải mẫu là chuỗi nước có ghế (`layouts.solutions.ts`). Test phát lại lời giải phải thắng `filled`, và test "cửa luôn đóng" không tìm được lời giải. Thêm các ràng buộc:

- **Cỡ**: giữ ≤ 19 × 13. Bố cục 2 người nên ≤ 17 cột để ô ở 360 px không quá nhỏ.
- **Độ dài lời giải**: tăng dần theo thứ tự bản đồ:
  - Dễ: 20–45 bước;
  - Vừa: 35–75;
  - Khó: 55–110;
  - Rất khó: 85–200.

  Khoảng rộng để ba bản đồ cũ (25–89 bước) cũng nằm trong; test "takes as many steps as its difficulty asks" kiểm từng bố cục. Không bố cục nào vượt 200 bước, còn xa giới hạn an toàn 3.000 nước.

- **Phối hợp thật**: ngoài test "cửa luôn đóng", mỗi bố cục mới cần ít nhất hai người cùng đứng hoặc đổi chỗ ở nút trong lời giải mẫu. Ghi "điểm phối hợp" của từng bố cục vào bảng §11.4.
- **Bố cục 3 và 4 người** của cùng bản đồ mở rộng bố cục 2 người: thêm gian, thêm cửa, như ba bản đồ cũ. Như vậy người đã chơi bản 2 người nhận ra bản đồ.
- **Loại thạch và màu**: dùng lại sáu loại hiện có, không thêm token màu.

Thiết kế bố cục có thể giao cho một agent con với một bộ công cụ trong scratchpad: phát lại kế hoạch "ghế: chuỗi hướng" rồi in bàn khi bị chặn, giống `crew/plan.ts` lúc làm task 1.7. Lời giải cuối cùng vẫn do test trong repo kiểm.

#### 11.3 Bản đồ tiếp theo

Phần chung (`add-new-game-options`) có hook `GameUI.useNextOptions`. Đội gom thạch cài hook này như sau:

- kết quả `win` lý do `filled` → bản đồ kế sau bản đồ đang chơi trong `JELLY_CREW_MAPS`;
- bản đồ cuối, `too-long`, bỏ cuộc → `null`, không gợi ý;
- nhãn `Games.jelly-crew.options.next` "Bản đồ tiếp: {rules}";
- nút đổi tuỳ chọn `Games.jelly-crew.options.change` "Đổi bản đồ".

Gợi ý chỉ là tuỳ chọn `map`. Số người giữ như phòng hay ván đang chơi.

#### 11.4 Bố cục

| Bố cục            | Cỡ      | Lời giải (bước) | Điểm phối hợp                                                                                                                                                  |
| ----------------- | ------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dessert-shop-2    | 15 × 7  | 41              | Hồng đứng ▲ cho Lam đẩy xoài vào sảnh; Lam đứng ● (hai người cùng đứng nút) cho Hồng đẩy dâu vào và xoài lên hốc                                               |
| dessert-shop-3    | 15 × 11 | 41              | P3 giữ ●, P1 giữ ▲, P2 đẩy hai thạch lên hốc rồi đứng ■ cho P3 đẩy khối lá dứa qua cửa ■                                                                       |
| dessert-shop-4    | 15 × 11 | 41              | thêm kho có P4 và nút ■: P4 đẩy khoai môn qua cửa ▲ (P1 giữ) rồi đứng ■ cho P3                                                                                 |
| coconut-grove-2   | 15 × 10 | 56              | Hồng đứng ■ cho Lam đẩy xoài ra chuồng; Lam về giữ ●; đá viên đè ▲; Hồng ghép chữ L qua cổng đôi ●▲                                                            |
| coconut-grove-3   | 19 × 10 | 69              | thêm chòi có P3: giữ ■ cho xoài ra, rồi đẩy lá dứa qua cửa ● (P2 vẫn giữ)                                                                                      |
| coconut-grove-4   | 19 × 13 | 73              | thêm giếng có P4: đẩy khoai môn qua cửa ■ (P3 giữ)                                                                                                             |
| floating-market-2 | 14 × 8  | 64              | Lam đứng ▲ cho Hồng đẩy đá viên qua cửa rồi bước ra để đá viên lên ▲; Hồng đẩy thạch vào ô cửa rồi đứng ●, Lam ở bến chờ đẩy lên quầy (BFS: ngắn nhất 55 bước) |
| floating-market-3 | 14 × 11 | 85              | thêm khoang có P3 mở bằng ●: P1 giữ ●, P2 đứng ■, P3 đẩy lá dứa lên sạp                                                                                        |
| floating-market-4 | 14 × 11 | 91              | thêm khoang có P4 mở bằng ▲: P4 đẩy khoai môn qua ô nút ■, P2 bước lên ■ ngay sau lưng P4                                                                      |
| jelly-factory-2   | 17 × 9  | 90              | P1 đứng ● thả xoài xuống, P2 đẩy qua cửa ●; P2 lên trạm ▲ cho P1 sang ■; thạch đẩy lên nút thì kẹt luôn                                                        |
| jelly-factory-3   | 17 × 13 | 117             | nút ▲ chỉ còn ở phòng đóng gói: P3 giữ ▲ cho P1 sang ■, rồi đẩy khoai môn qua hai cửa ■ (BFS: P1 + P2 không thắng được)                                        |
| jelly-factory-4   | 17 × 13 | 108             | phòng đóng gói chia đôi: P3 đẩy khoai môn qua cửa ● (P1 giữ) sang phòng P4; P4 giữ ▲ rồi đẩy khoai lên khuôn                                                   |
| moon-festival-2   | 17 × 11 | 132             | khuôn trăng khuyết lấp theo thứ tự khoai môn → sương sáo → xoài, dâu cuối; P1 đứng ▲ cho P2 ra rồi cửa đóng sau lưng; P2 giữ ● rồi ■ cho P1                    |
| moon-festival-3   | 17 × 11 | 132             | kho chia hai bằng cửa ■ trong: P3 giữ ▲ cho P2 ra rồi tự thả xoài xuống cột                                                                                    |
| moon-festival-4   | 17 × 11 | 99              | thêm kho tây có ● và khoai môn: P3 giữ ▲, P2 giữ ■, P4 thả khoai và sương sáo, dọn đá viên, rồi giữ ● cho P1 lấy dâu                                           |

Bố cục do hai agent con thiết kế. Ngoài test của repo, mỗi agent chạy thêm một BFS riêng: một người không thắng được khi những người khác đứng yên. Bố cục đủ nhỏ thì chạy BFS, bố cục lớn thì lập luận theo cấu trúc. Lời giải mẫu không phải ngắn nhất.

Ba điểm cần biết:

- Ở Tiệm chè, Xưởng thạch và Đêm trăng rằm, bản 3 hay 4 người không dài hơn bản 2 người, vì nhiều người chia việc. Độ dài vẫn nằm trong khoảng của độ khó.
- Ở Chợ nổi 2 và 3 người, hai người đứng nút ở hai lúc khác nhau, không cùng lúc.
- Ở Vườn dừa, khối dâu và sương sáo dính sẵn từ đầu, người chơi chỉ ghép thêm xoài cho đúng hướng.

## Khác thiết kế

Ghi lại khi code (task 1–6), các artifact khác đã sửa cho khớp.

Bản đi tự do (nhóm 6):

- **Lời báo nước đi do bàn nói**, trong vùng `aria-live` của bàn (như bước bị chặn), không qua dòng lượt: dòng lượt của game đi tự do chỉ ghi "Cả đội cùng đi" (online thêm "· bạn là …"), vì `PlayScreen` không biết nước nào là "bước trống". Cùng máy, mọi nước được đọc (đều do người ở thiết bị này); online, bước trống của người khác không được đọc.
- **"Đã đặt lại bản đồ"** gọi người bấm theo màu nhân vật ("Hồng đã đặt lại bản đồ."), như các lời báo khác của bàn, không theo tên người chơi.
- **Thời gian ván cùng máy**: ván đã có kết quả không được lưu (như mọi game), nên tải lại sau khi thắng là ván mới; spec `local-play` "Thời gian ván cùng máy" tả đúng điều này (tải lại **giữa** ván giữ giờ bắt đầu).
- **`RoomView.gameTime`** vắng thì giữ vắng khi đọc (không thêm `null`), hỏng thì đọc là `null`.
- **Mục cuối trang luật** của game cùng phe đi tự do tên "Bỏ cuộc" (`RulesLeavingSection rooms="freeTeam"`), nói không ai bị xử bỏ ván; biến thể `team` giữ cho game cùng phe có lượt sau này.
- **`useResultDetail`** của `GameUI` nhận thêm `gameTime` (tham số thứ ba), `PlayScreen` truyền từ snapshot.
- **Sau lượt review code**: giới hạn kết nối, số lần thử ghi, từ chối nước gửi lại và hiện ngay các nước (§10.2) được thêm sau khi review tìm ra: bấm nhanh bị ngắt kết nối, người chơi bị khoá khi người khác đi liên tục, hai người ghi cùng lúc dễ hết lượt thử, và một nước gửi lại sau khi mất câu trả lời đi hai bước.
- **Nối tiếp biên bản** không chạy ngay sau lời chào (kết nối lại): lần đầu sau lời chào luôn dựng lại cả ván, như trước.

Bản theo lượt (nhóm 1–5):

- **Cửa kẹt theo từng ô**: chỉ cửa đang có người hay thạch nằm trong mới mở vì kẹt, không phải mọi cửa cùng nhóm (spec "Nút và cửa" viết "chính ô cửa"; mockup tính theo nhóm). `last.opened`/`closed` chỉ báo nhóm đổi theo nút.
- **`trail`** là `{ seat, cells } | null` (cần biết màu ghế của vệt), không phải mảng ô trần.
- **Bàn điều khiển**: bốn hướng ở lưới 3 × 2, "Xong lượt" bên phải cao bằng hai hàng; "Lùi bước", "Đặt lại bản đồ", "Giữ nút" ở một hàng nút có chữ bên dưới, xuống dòng được. Bản đặt "Lùi bước"/"Đặt lại" hai bên mũi tên (mockup) làm chữ vỡ 3–4 dòng ở 360 px và ở cột hẹp khi có cột chat.
- **"Giữ nút" không tự xong lượt khi mọi ghế đều đang giữ** (cùng máy): nếu không, ván tự chạy hết vòng mà không ai bấm gì.
- **Nước "xong lượt" của người đứng trên nút** đọc là "giữ nút ●, xong lượt" (`useMoveLabel`), cho mọi người trong phòng; thiết bị tự xong lượt còn báo "Hồng giữ nút, xong lượt." trong vùng `aria-live` của bàn.
- **Mục cuối trang luật** của game cùng phe tên "Bỏ cuộc và bỏ ván" (`RulesLeavingSection` có thêm `rooms="team"`), thay "Đầu hàng và bỏ ván".
- **Hình trên menu** (`Artwork.tsx`) vẽ tay riêng và **hình của trang luật** nằm trong `rules/figures.tsx`, chỉ dùng `../pieces` (ESLint cấm Artwork và Rules chạm tới bàn hay luật); `pieces.tsx` chỉ import kiểu từ `@board-games/games/jelly-crew`.
- **Lưới mờ của sàn** là `--jelly-crew-grid` (trang trí), không phải `--game-line`: `theme-css.test.ts` đòi `--game-line` 3:1 trên bàn.

## Risks / Trade-offs

- [Ô 17 px ở 360 px khó nhìn với bố cục 19 cột] → mockup đã xem ở 360 × 640; số ghế và ký hiệu đọc được. Bố cục 2 người giữ ≤ 17 cột nếu được; task 3.x xem ảnh 360 px của cả 9 bố cục.
- [Ở 360 × 640, 4 người: bàn điều khiển nằm dưới mép màn hình, phải cuộn dọc] → chấp nhận (không cuộn ngang; mọi nút tới được); bảng người chơi 4 ghế đã là lưới 2 × 2; thu gọn nó là việc của khung chung, không thuộc change này. Kéo trên bàn cuộn được khi không phải lượt mình (`pan-y`).
- [Thêm một lần bấm "Xong lượt" mỗi lượt] → đổi lấy việc không ai đi nhầm vào lượt người sau và lùi được bước thứ năm; "Giữ nút" bớt việc cho người đứng giữ.
- [Một người phá đội: đặt lại bản đồ liên tục, đứng chắn cửa] → chơi với bạn bè qua link mời; đặt lại dùng hết lượt người bấm, có hỏi lại, và mọi người thấy dòng "Lan đã đặt lại bản đồ". Không làm biểu quyết hay giới hạn số lần.
- [Bố cục hoá ra có lối tắt một người làm được, nhờ thạch giữ nút] → test "cửa luôn đóng" chỉ đảm bảo cần cửa; lượt chơi thử của người dùng (task 5.3) xem có cần phối hợp thật không. Thạch giữ nút là cơ chế có chủ đích ở "Chợ đêm".
- [Ván không kết thúc nếu mọi người bỏ đi] → phòng hết hạn như mọi game; xử bỏ ván sau 5 phút kết thúc ván.
- [Sửa `features/play` cho cờ cùng phe làm lệch câu của game khác] → mọi nhánh mới chỉ chạy khi `meta.cooperative`; test hiện có của các game khác giữ nguyên và phải xanh.
- [Luật đẩy viết hai lần (Gom thạch và Đội gom thạch) có thể lệch nhau] → chấp nhận (§2); spec của hai capability tả riêng, test riêng.

## Migration Plan

Thêm game mới, không đổi dữ liệu cũ: không đổi `STORED_ROOM_FORMAT`, khoá localStorage hay biên bản của game khác. Trường `cooperative` không bắt buộc nên các game hiện có không đổi. Phòng tạo từ bản trước không có game này. Rút lại: bỏ dòng trong các registry; dữ liệu ván dở của game này bị coi như game không còn (đường "game không tồn tại" đã có).

## Open Questions

- Tên tiếng Anh và tiếng Nhật của game ("Jelly Crew", "ゼリー隊") và của tám bản đồ: chốt khi thêm bản dịch, không đổi spec.
