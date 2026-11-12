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

## Khác thiết kế

Ghi lại khi code (task 1–5), các artifact khác đã sửa cho khớp:

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

- Tên tiếng Anh và tiếng Nhật của game ("Jelly Crew", "ゼリー隊") và của ba bản đồ: chốt khi thêm bản dịch, không đổi spec.
