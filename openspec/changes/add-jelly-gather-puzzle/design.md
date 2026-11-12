# Design

## Context

Lý do và phạm vi ở `proposal.md`; hành vi ở `specs/jelly-gather/spec.md`. Hiện trạng ảnh hưởng tới cách làm:

- Mọi game là `GameDefinition` nhiều người, đi qua màn hình bắt đầu ván, session, transport, `PlayScreen` và kết quả theo ghế. Menu sinh thẻ từ `GAMES` (`features/menu/menu-games.ts`). Tên trên thẻ đọc từ `Games.<id>`, hình từ `GAME_ARTWORK`, dòng thông tin luôn có thời lượng (`GameFacts`), lối vào luôn có "Online" và luật (`PlayLinks`).
- Hộp công cụ (`add-toolbox-card-score`) đã có mẫu cho nội dung không phải game:
  - thư mục riêng, danh sách đăng ký `TOOLS`, bản dịch `Toolbox.tools.<id>`;
  - ranh giới ESLint;
  - một route catch-all chuyển màn hình bằng `history.pushState` (`tools/card-score/navigation.tsx`);
  - đọc trình duyệt bằng `useSyncExternalStore` có giá trị phía server (`keypad-preference.ts`).
- Mỗi game có `theme.css` cho hợp đồng `--game-*` trong `[data-game="<id>"]`, được `Artwork.tsx` của game import. `games/theme-css.test.ts` chỉ quét `games/` và đòi biến riêng có dạng `--<id>-*`.
- Theme và Ngôn ngữ trên thanh trên là `popover` có `role="menu"` (`packages/ui/src/components/Menu.tsx`), tự xử lý phím mũi tên và chữ cái.
- Vitest chạy mọi test trong `src/` ở môi trường jsdom, thời hạn mặc định 5 giây mỗi test.

## Goals / Non-Goals

**Goals:**

- Luật là hàm thuần nhỏ, có test cho mọi scenario; một lần chơi dựng lại được từ màn và chuỗi thao tác.
- Không màn nào không giải được, và số bước ít nhất được máy chứng minh.
- Thêm trò giải đố thứ hai sau này chỉ là một thư mục, một route, bản dịch và một dòng `PUZZLES`.
- Chơi thoải mái bằng một ngón tay ở 390 px và bằng bàn phím ở 1280 px.

**Non-Goals:** như mục "Ngoài phạm vi" của proposal. Không đưa luật vào `packages/`, vì không có server nào cần chạy lại luật.

## Decisions

### 1. Luật: nghiên cứu game gốc, rồi tự thiết kế và thử bằng bộ giải

**Nguồn đã đọc:**

- [Trang Steam](https://store.steampowered.com/app/1492620/Jelly_Is_Sticky/):
  - hơn 300 màn tự làm;
  - "màu của khối thạch quyết định tính chất: độ dính, độ cứng, độ biến dạng";
  - có lửa đốt thạch, cổng mở khoá, nhiều nhân vật;
  - hoàn tác đầy đủ, bản đồ thế giới, trình tạo màn;
  - một người chơi; thẻ Sokoban, đi theo ô lưới.
- [Puzzlebyrinth](https://puzzlebyrinth.com/en/reviews/jelly-is-sticky): bốn loại thạch; thao tác "đẩy, dính, biến dạng, hoàn tác"; không có hướng dẫn, mỗi cơ chế mới đến kèm vài màn dễ để dạy.

Không nguồn nào đọc được ghi thạch nào dính với thạch nào, có trọng lực hay không, hay điều kiện qua màn. Bài hướng dẫn Steam duy nhất chặn truy cập tự động. Một bản làm lại của fan trên GitHub có luật riêng; đó là game khác nên không dùng làm căn cứ.

**Luật của Gom thạch là luật tự thiết kế**, chỉ giữ thể loại:

- nhìn từ trên xuống, không trọng lực;
- đẩy kiểu Sokoban với khối nhiều ô;
- thạch cùng loại chạm cạnh thì dính vĩnh viễn;
- qua màn khi mỗi loại còn một khối.

Tính chất theo loại:

| Loại                 | Dính với         | Khi bị đẩy                             | Tính khi qua màn |
| -------------------- | ---------------- | -------------------------------------- | ---------------- |
| Thạch thường (4 màu) | cùng màu         | đi một ô                               | có               |
| Đá viên              | không gì         | đi một ô                               | không            |
| Sương sáo            | mọi loại thạch   | đi một ô                               | không            |
| Thạch dừa            | thạch dừa, tường | đi một ô; chạm tường thì đứng yên luôn | có               |

**Đã thử bằng bộ giải** (bản nháp trong scratchpad, BFS trên trạng thái nhân vật + các khối):

- Lưới 5 × 4 với 2 + 2 thạch: khoảng 20% màn sinh ngẫu nhiên giải được với ít nhất 6 bước. Các màn đó cần 17–21 bước và 1 000–2 000 trạng thái.
- Lưới 6 × 5 có thêm đá viên: 19–31 bước, tới 120 000 trạng thái.
- Một màn 9 × 6 có đủ ba cơ chế cần 879 000 trạng thái và 3,8 giây.
- Màn vẽ tay đầu tiên phần lớn **không giải được**, vì thạch sát tường không bao giờ kéo ra được. Luật không sai, nhưng màn phải được máy kiểm (§5).
- **Chương 2 được làm lại hai lần:**
  - Ban đầu chương 2 là đá viên đẩy một ô. Lượt review chỉ ra nó tương đương một thạch một ô có màu riêng: thay ba đá viên của một màn bằng ba thạch màu khác cho cùng lời giải. Chương 2 khi đó không dạy luật nào mới.
  - Thử **đá viên trượt** tới khi chạm vật cản: trong khoảng 900 màn sinh ngẫu nhiên giải được, cách trượt chỉ đổi lời giải ở một màn, và chỉ thêm 1 bước. Đá trượt chủ yếu làm việc dọn đường dễ hơn, không tạo câu đố. Bỏ.
  - **Chọn sương sáo**, dính với mọi màu: nó đổi lời giải ở 31–47% số màn giải được, và nhiều màn bỏ nó đi là không giải được. Màn mẫu 2-1 cần 6 bước; nếu thay sương sáo bằng một khối trơ thì cần 9. Sương sáo hợp chủ đề "dính": vừa là cầu nối, vừa là cái bẫy kéo theo màu không muốn.
  - Đá viên ở lại như khối chắn trơ, thứ duy nhất sương sáo không dính được. Nó xuất hiện từ màn 1-5, có gợi ý.

**Đã cân nhắc:**

- **Có trọng lực, nhìn ngang**, kiểu "jelly no puzzle": thạch rơi, người chơi kéo trái phải. Bị loại, vì game gốc gắn thẻ Sokoban, và điều khiển bằng vuốt bốn hướng trên điện thoại rõ hơn kéo khối.
- **Ô đích** (đưa thạch lên ô đánh dấu): thêm một loại ô và một luật nữa. "Mỗi màu một khối" đủ tạo câu đố và đúng tinh thần "dính".
- **Thạch dính vào nhân vật** (kéo được thạch): phá bẫy sát tường, quá khác thể loại; để sau.

### 2. Trò giải đố không phải `GameDefinition`

| Phương án                                          | Đánh giá                                                                                                                                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GameDefinition` với `players: { min: 1, max: 1 }` | Lấy được lưu ván, hoàn tác. Nhưng phải tắt màn hình bắt đầu ván, "với máy", "Online", kết quả theo ghế, "Tiếp tục ván dở", liên kết luật (`PlayLinks` luôn có "Online" và luật); mỗi chỗ tắt là một nhánh trong phần dùng chung |
| Một công cụ trong Hộp công cụ                      | Sai chỗ: Hộp công cụ dành cho buổi chơi ngoài đời, người dùng tìm trò chơi ở danh sách game                                                                                                                                     |
| **Loại riêng "trò giải đố"**                       | **Chọn.** Theo mẫu của Hộp công cụ; sửa menu một lần, các trò sau là một dòng `PUZZLES`                                                                                                                                         |

**Cấu trúc thư mục:**

- `apps/web/src/puzzles/registry.ts`: `PUZZLES` gồm `id`, `href` (`as Route` như `TOOLS`), `Artwork`, `levelCount`.
- `apps/web/src/puzzles/jelly-gather/`:
  - `rules/`: hàm thuần, không React, không DOM;
  - `levels.ts`;
  - component, kho lưu, test.

**Ranh giới import:**

- `puzzles/` được import `@board-games/ui`, `features/shell`, `lib`, `config`, `test`.
- ESLint: một block `@typescript-eslint/no-restricted-imports` cho `src/puzzles/**`, như `src/tools/**`. Nó cấm `transport`, `server`, `games`, `ai-worker`, `tools`, `@board-games/{engine,games,protocol}`. `src/tools/**` cấm thêm `puzzles`. Có test trong `packages/config/eslint/index.test.js`.
- Bất biến thêm vào `openspec/config.yaml` như proposal.

### 3. Mô hình luật

```ts
const JELLY_KIND = {
  Strawberry: "strawberry",
  Pandan: "pandan",
  Mango: "mango",
  Taro: "taro",
  Coconut: "coconut",
  Grass: "grass",
  Ice: "ice",
} as const;
interface Level {
  id: `${1 | 2 | 3}-${number}`;
  version: number;
  width: number;
  height: number;
  walls: ReadonlySet<number>;
  start: Board;
  minMoves: number;
  hint?: "push" | "ice" | "grass" | "coconut";
}
interface Board {
  player: number;
  pieces: readonly Piece[];
} // ô = y * width + x
interface Piece {
  cells: readonly number[];
  kinds: readonly JellyKind[];
  fixed: boolean;
} // kinds[i] của cells[i]
```

**Màn viết bằng chữ** trong `levels.ts`, mỗi màn một mảng chuỗi:

| Ký tự     | Nghĩa                |
| --------- | -------------------- |
| `#`       | tường                |
| `.`       | ô trống              |
| `@`       | nhân vật             |
| `r g y p` | bốn màu thạch thường |
| `c`       | thạch dừa            |
| `b`       | sương sáo            |
| `i`       | đá viên              |

- `parseLevel` đọc lúc import: mỗi ô một khối, rồi `settle` dính những gì chạm nhau. Vì vậy hai vùng cùng màu chạm nhau không thể là hai khối lúc mở màn.
- `version` tăng mỗi khi sửa thiết kế một màn đã phát hành (§4).
- Test kiểm: đúng một `@`, viền ngoài kín tường, tối đa 10 × 10 ô kể cả tường, `id` không trùng.

**`step(level, board, direction)`** trả `{ board, moved, outcome }` hoặc `{ blocked }`:

1. Ô đích của nhân vật là tường thì bị chặn.
2. Ô đích trống thì nhân vật đi.
3. Ô đích có khối thì gom tập khối bị đẩy bằng duyệt theo chiều rộng. Với mỗi ô của mỗi khối trong tập: ô kế tiếp là tường hay khối `fixed` thì chặn, là khối khác thì thêm khối đó vào tập. Ô kế tiếp là ô nhân vật đang đứng không chặn, vì nhân vật cũng đi; nhờ vậy khối bao quanh nhân vật đẩy được (spec "Khối bao quanh nhân vật").
4. Dời cả tập một ô, nhân vật vào ô đích.
5. `moved` là bàn lúc này, trước khi dính, dùng cho chuyển động (§7).
6. **`settle`**:
   - hai ô chạm cạnh của hai khối khác nhau **dính** khi cùng loại thạch, hoặc một trong hai là sương sáo, và không ô nào là đá viên;
   - gộp bằng union-find tới khi ổn định; khối gộp có `fixed` nếu một trong các khối có;
   - sau đó, khối có ô dừa chạm cạnh tường thì thành `fixed`. Đặt `fixed` không đổi chỗ khối nào nên không sinh lần gộp mới.

Bàn lúc mở màn cũng đi qua `settle`.

**Kết quả mỗi bước:**

- `outcome` gồm: ô nhân vật tới, các loại bị đẩy, các màu vừa ít khối đi kèm số khối còn lại, các loại sương sáo vừa dính vào, có khối vừa đứng yên, `solved`. Lời báo cho trình đọc màn hình và hiệu ứng đều đọc từ đây, nên lời báo không lệch với bàn.
- `blocked` nói lý do: `wall`, `fixed`, `jam` (bị chặn ở xa).
- `isSolved(board)`: với mỗi màu thạch (dâu, lá dứa, xoài, khoai môn, dừa), mọi ô của màu đó thuộc cùng một khối; sương sáo và đá viên không tính. Số khối của một màu = số khối có ít nhất một ô màu đó.

Mọi hàm là hàm thuần, không mutate. Khối được sắp theo ô nhỏ nhất của nó, nên hai bàn bằng nhau có cùng dạng; test so sánh bằng `toEqual`.

### 4. Lần chơi là chuỗi thao tác

**Lịch sử:**

- Là một chuỗi ký tự: `U D L R` cho một bước đã đi, `*` cho "Chơi lại màn".
- Bàn hiện tại = phát lại từ đầu; gặp `*` thì về bàn đầu. Số bước = số bước sau dấu `*` cuối.
- **Hoàn tác** bỏ ký tự cuối. "Hoàn tác" tắt khi lịch sử rỗng, không phải khi số bước bằng 0: sau "Chơi lại màn", số bước là 0 mà vẫn hoàn tác được.
- "Chơi lại màn" không ghi gì khi số bước bằng 0 (bàn khi đó chắc chắn là bàn đầu). Đi vài bước rồi quay về đúng bàn đầu thì vẫn chơi lại được, vì lệnh còn đưa số bước về 0. Phím R bỏ qua `event.repeat`.
- **Bước bị chặn** không ghi gì.
- **Bước sau khi đã giải** không ghi được.

**Trong bộ nhớ**, một reducer giữ ngăn xếp các bàn đi kèm lịch sử. Đi một bước là đẩy vào ngăn, hoàn tác là lấy ra: mỗi thao tác O(1). Chỉ phát lại cả chuỗi khi mở màn và khi kiểm dữ liệu đọc từ máy (4 000 bước đo được 1,1 ms).

**Giới hạn:**

- Lịch sử dài quá 20 000 ký tự thì bỏ đoạn cũ nhất, tới hết dấu `*` đầu tiên, **chỉ khi phần còn lại có từ 10 000 ký tự**. Đoạn bỏ đi chỉ phục vụ hoàn tác qua những lần chơi lại cũ, và spec đòi lùi được ít nhất 10 000 thao tác (lượt review code: bỏ ngay tại dấu `*` đầu có thể chỉ để lại vài thao tác).
- Không có `*` nào để bỏ, hay `*` đầu quá muộn, thì giữ nguyên (20 000 bước liền không chơi lại không xảy ra thật). `replay` nhận mọi độ dài mà `push` để lại, nên lần chơi luôn khôi phục được nguyên vẹn sau khi tải lại. Lịch sử quá lớn để ghi (đầy bộ nhớ) thì lần ghi bị bỏ qua như mọi lần ghi hỏng.

**Lưu ở localStorage**, ghi đồng bộ sau mỗi thao tác:

- `board-games:jelly-gather:progress`: `{ format: 1, best: { [levelId]: { moves, version } } }`.
- `board-games:jelly-gather:attempt:<levelId>`: `{ format: 1, version, history, updatedAt }`.

**Đọc từng mục một bằng zod**, để một giá trị hỏng không xoá cả tiến độ. Bỏ lần chơi và kỷ lục khi:

- `id` không còn trong `LEVELS`;
- `version` khác `version` của màn hiện tại (màn đã sửa thiết kế);
- `history` có ký tự lạ, có bước bị chặn, hay có bước sau khi đã giải mà không qua `*`.

`format` lớn hơn bản đang chạy thì không ghi đè, để không phá dữ liệu của bản mới hơn ở tab khác. Mọi lần chạm `localStorage`, kể cả đọc thuộc tính `window.localStorage`, nằm trong `try/catch`, vì Safari có thể ném `SecurityError`.

**Hai tab:**

- Ghi tiến độ là đọc lại rồi gộp, giữ số nhỏ hơn cho mỗi màn, rồi mới ghi. Giải một màn ở tab này không xoá màn đã giải ở tab kia.
- Nghe sự kiện `storage` để danh sách màn của tab kia cập nhật. Khi không còn component nào nghe (rời trò rồi quay lại trong cùng tab), bộ nhớ đệm bị bỏ, để lần nghe sau đọc lại.
- **Mỗi bước của tab này chỉ đổi một mục** của bộ nhớ đệm (lượt review code: đọc lại cả 25 khoá mỗi lần nhấn phím là thừa). Giải xong một màn thì đọc lại cả kho, vì `recordSolve` có gộp với tab khác.
- Hai tab cùng một màn: lần ghi lịch sử sau thắng. Chấp nhận, vì một người chơi.

**"Tiếp tục"** chọn lần chơi có `updatedAt` mới nhất trong các màn chưa giải và có lịch sử khác rỗng; không có thì màn đầu tiên chưa giải.

**Server và trình duyệt.** Route render trên server, nơi không có localStorage. Mọi giá trị đọc từ máy đi qua `useSyncExternalStore`, với giá trị phía server là "chưa đọc", như `keypad-preference.ts`:

- **Danh sách màn** lúc chưa đọc hiện đủ chương và ô màn nhưng không có dấu đã giải, "Tiếp tục" và `<details>` chưa xác định. Có test tải lại không có cảnh báo hydration trong console.
- **Màn chơi** lúc chưa đọc hiện bàn đầu màn, khoá điều khiển. Đọc xong thì hiện bàn đã khôi phục **không có chuyển động** (spec "Khôi phục không trượt").

**Đã cân nhắc:**

- **IndexedDB**, như Ghi điểm: dữ liệu ở đây vài KB, đánh mất cũng không nghiêm trọng như điểm do người dùng nhập, và localStorage đồng bộ.
- **Lưu ảnh chụp bàn** thay cho chuỗi bước: mất hoàn tác sau khi tải lại.

### 5. Màn chơi được làm và kiểm thế nào

- **Bộ giải** `rules/solver.ts`: BFS trên `(nhân vật, các khối)`, trả lời giải ngắn nhất. Chỉ test dùng, không vào bundle trang.
- **Lời giải mẫu** của mỗi màn ở `levels.solutions.ts`, chỉ test import.
- **Test màn** trong `levels.test.ts`, chạy trong project Vitest `pure` (Node, không có setup DOM; `apps/web/vitest.config.ts`, cùng luật trong `rules/`), thời hạn đặt rõ cho từng test. Docblock `@vitest-environment node` không dùng được vì file setup của project jsdom chạm `HTMLDialogElement`:
  1. Mọi màn không giải sẵn lúc đầu.
  2. Phát lại lời giải thì giải đúng ở bước cuối, không bước nào bị chặn, và độ dài bằng `minMoves`.
  3. BFS không tìm được lời giải ngắn hơn `minMoves`. Giới hạn 300 000 trạng thái mỗi màn; màn vượt giới hạn không được nhận.
- **Đo ở task 3.1**: hai màn 10 × 10 dày khối chạm giới hạn 300 000 trạng thái sau 1,9 và 2,4 giây (Node). Một màn tệ nhất vì vậy vẫn dưới thời hạn từng test. **Tổng (task 3.4)**: 130 test màn chạy 4,3 giây; màn tốn nhất là 3-8 (64 196 trạng thái), và bản 2-2 thay sương sáo bằng đá (141 000 trạng thái, khoảng 0,7 giây). Vì vậy test màn ở lại trong Vitest, không cần script `levels:check`.
- **Đo ngay từ task 3.1** trên màn lớn nhất dự kiến. Tổng thời gian test màn quá 20 giây thì bước 3 chuyển sang script `pnpm --filter @board-games/web levels:check`, chạy trong `pnpm check`; quyết định ghi lại ở đây.
- **Cách làm màn:**
  1. Chọn tay cơ chế, hình khối, chỗ hẹp cho từng màn.
  2. Dùng bộ giải và bộ sinh ngẫu nhiên có lọc (script trong scratchpad, không vào repo) để thử biến thể.
  3. Giữ màn mà lời giải có ý: phải gom theo thứ tự, phải tránh dính sớm, phải dùng sương sáo làm cầu nối mà không kéo theo màu khác, phải dẫn dừa đi đường không chạm tường. Mỗi màn chương 2 được kiểm là sương sáo đổi lời giải: thay nó bằng đá viên thì không giải được hoặc cần số bước khác. Bỏ màn chỉ dài.
- **Đường cong:** chương 1 từ khoảng 4 tới 30 bước; chương 2 và 3 bắt đầu dễ rồi tăng. Màn mở đầu cơ chế có gợi ý.
- **Rủi ro:** màn "đúng nhưng chán". Thử chơi là cách duy nhất biết (Risks).

### 6. Route và điều hướng

- Một route catch-all `app/puzzles/jelly-gather/[[...path]]/page.tsx` render `JellyGatherApp`. Trang server kiểm `path`:
  - rỗng là danh sách màn;
  - một đoạn trùng một `id` trong `LEVELS` là màn đó;
  - còn lại `notFound()`.
- `not-found.tsx` trong segment (như `app/play/[gameId]/not-found.tsx`) dùng `AppStateScreen` với lối về danh sách màn.
- Ở phía client, đường dẫn không nhận ra sau `pushState` hiện danh sách màn, như `CardScoreApp`.
- Chuyển màn hình bằng `history.pushState` như Ghi điểm, để mất mạng vẫn chơi đủ 24 màn. Không tải lười chunk nào.
- **Dùng chung điều hướng:** chuyển `goTo`, `ToolLink`, `BackLink`, `ScreenTitle` từ `tools/card-score/navigation.tsx` sang `features/shell/client-navigation.tsx` (ESLint cho phép: `features/**` chỉ bị cấm `@board-games/games`), đổi `ToolLink` thành `HistoryLink`. Ghi điểm import từ chỗ mới; không đổi hành vi, test hiện có giữ nguyên.
- Thanh trên: danh sách màn về menu, màn chơi về danh sách màn (`AppTopBar back`).

### 7. Màn hình chơi

**Điện thoại** (390 × 844), từ trên xuống:

- Thanh trên.
- Dòng "Màn 1-3", số bước, và dòng chương.
- Dòng gợi ý, nếu màn có.
- Bàn.
- Hàng điều khiển:
  - dòng 1: "Hoàn tác", ↑, "Chơi lại màn";
  - dòng 2: ←, ↓, →;
  - nút 52 × 52 px.

Chiều cao: 56 + 60 + 40 + 350 + 2 × 60 = 626 px. Ở 360 × 640, bàn co theo chiều cao còn lại.

**Máy tính** (1280): bàn bên trái; bảng bên phải gồm số bước, gợi ý, nút và dòng chữ nhỏ về phím.

**Bàn là SVG:**

- **Kích thước ô** = min(56, chiều rộng khả dụng / số cột, chiều cao khả dụng / số hàng). Màn 10 cột ở 390 px là 35 px mỗi ô.
- **Khối nhiều ô vẽ thành một hình liền:** mỗi ô một hình vuông bo góc, cộng các dải nối giữa hai ô cùng khối, cộng ô vá giữa bốn ô cùng khối. Vẽ hai lớp: viền đậm, rồi thân thụt vào. Khối dính hiện ngay thành một khối, không cần chữ để thấy.
- **Ký hiệu** (mockup):

  | Khối               | Ký hiệu                                                                           |
  | ------------------ | --------------------------------------------------------------------------------- |
  | Dâu                | ● đặc                                                                             |
  | Lá dứa             | ▲                                                                                 |
  | Xoài               | ■                                                                                 |
  | Khoai môn          | ◆                                                                                 |
  | Thạch dừa          | vòng tròn rỗng ○                                                                  |
  | Sương sáo          | dấu ✕ sáng trên thân gần đen; giữa hai ô khác loại dính nhau có một dải sương sáo |
  | Thạch dừa đứng yên | thêm dấu đinh ghim ở ô chạm tường                                                 |
  | Đá viên            | không ký hiệu; góc vuông hơn, hai vệt sáng chéo                                   |

- **Nhân vật** tròn, có mắt nhìn theo hướng vừa đi, màu mực, không trùng hình khối nào.

**Chuyển động:**

- Bàn `moved` (trước khi dính) hiện trước: các khối bị đẩy và nhân vật trượt từ chỗ cũ bằng `transform`, transition 120 ms. Khối vừa dính hay vừa đứng yên nảy nhẹ 80 ms ngay sau đó, bằng Web Animations API: tổng 200 ms, có test cộng `delay + duration` của mọi lần gọi `animate`. Thực tế code chỉ vẽ bàn cuối và cho từng ô vừa bị đẩy trượt từ chỗ cũ tới (`data-slide`), không đổi qua lại giữa hai bàn.
- **Bước bị chặn:** nhân vật nhích về phía bị chặn rồi trở lại (140 ms), để người nhìn màn hình cũng thấy, không chỉ trình đọc màn hình.
- **Bước mới không chờ chuyển động cũ:** bước mới tới thì hiện ngay bàn cuối của bước trước rồi chạy bước mới. State là nguồn chân lý, transition chỉ là hình.
- Bàn hiện lần đầu và bàn khôi phục không có transition.
- `motion-reduce`: không transition, không nảy.

**Phím:** một listener `keydown` trên `window` khi màn hình chơi đang mở. Bỏ qua khi:

- `event.defaultPrevented`;
- tiêu điểm ở `input`, `textarea`, `select`, `[contenteditable]`, trong `dialog` đang mở, trong `[role="menu"]` hay một popover đang mở;
- có Alt, Ctrl, Meta hay Shift. Ngoại lệ duy nhất là Ctrl/⌘ + Z không kèm Shift.

Phím mũi tên `preventDefault` để trang không cuộn. R bỏ qua `repeat`; phím hướng được lặp khi giữ.

**Vuốt:**

- Pointer events trên bàn, `touch-action: none` chỉ trên bàn.
- Ngưỡng 24 px theo trục trội; mỗi cú vuốt một bước.
- Bàn cách mép màn hình ít nhất 16 px. Cử chỉ quay lại của Android ở độ nhạy cao vẫn có thể đụng, nên ghi vào danh sách thử máy thật.

**Trình đọc màn hình:**

- SVG `aria-hidden`.
- **Mô tả bàn:** danh sách ẩn, mỗi hàng một mục, gom các ô giống nhau liền nhau ("Hàng 3: tường, 2 ô trống, thạch dâu, bạn, tường"). Dừa đứng yên ghi "thạch dừa đứng yên".
- **Lời báo** trong vùng `role="status"`, đặt chữ theo `outcome`:
  - đi: "Hàng 3, cột 4";
  - đẩy: "Đẩy thạch dâu";
  - dính: "Thạch dâu dính lại, còn 2 khối";
  - bị chặn: nói lý do.
- Hai lời báo giống nhau liền nhau thì xoá vùng rồi đặt lại ở khung hình sau, để trình đọc đọc lại.
- Nút hướng là `button` thật có nhãn. "Hoàn tác" dùng mẫu `aria-disabled` kèm lý do khi lịch sử rỗng.

**Khi giải xong:**

- Khung giải xong **thay chỗ hàng điều khiển** (trên máy tính: thay bảng nút ở cột phải). Không phải dialog. Bàn và khung vừa màn hình 360 × 640 mà không cuộn.
- Tiêu điểm chuyển vào "Màn tiếp", hoặc "Chơi lại màn" ở màn cuối. Chỉ chuyển khi tiêu điểm đang ở `body`, ở tiêu đề màn (`ScreenTitle` lấy tiêu điểm khi vừa chuyển màn hình) hay ở một nút điều khiển.
- Hoàn tác từ khung (nút hay phím Z) làm khung biến mất; tiêu điểm chuyển về nút "Hoàn tác" của hàng điều khiển.
- Hiệu ứng mừng: khung hiện bằng một lần phóng nhẹ 260 ms, có nhánh giảm chuyển động.

### 8. Danh sách màn và menu

**Danh sách màn:**

- Phần đầu gồm tiêu đề, một câu mô tả, nút "Tiếp tục" và phần "Cách chơi" (`<details>`, mở sẵn khi chưa giải màn nào, chỉ sau khi đã đọc máy).
- Ba chương, mỗi chương một lưới ô màn (4 cột trên điện thoại, 8 cột trên máy tính): số màn, dấu đã giải (✓ kèm chữ cho trình đọc), số bước tốt nhất.
- Ô màn là `<a>` thật (`HistoryLink`).

**Menu:**

- `MenuGame` thêm biến thể `{ kind: "puzzle"; id; Artwork; levelCount }` lấy từ `PUZZLES`. `buildMenu` đặt chúng sau game chơi được, trước "Sắp có".
- `MenuPage` có một nhánh cho `kind: "puzzle"`:
  - cùng khung `Card` với thẻ game;
  - tên và mô tả từ `Puzzles.<id>.{name,tagline}`, như `Toolbox.tools.<id>`;
  - dòng "1 người · 24 màn" (`Menu.levels`, số nhiều ICU);
  - một lối "Chơi" có `aria-describedby` tới tên.

  Nhánh này không đọc `Games`, `GAME_ARTWORK` hay `PlayLinks`. Thêm trò giải đố sau đó không phải sửa `MenuPage`.

- `Artwork.tsx` của trò `import "./theme.css"` như các game, để `data-game="jelly-gather"` và `bg-game-tint` trên thẻ có giá trị.
- **Sửa test đang có:** `e2e/menu.spec.ts` (số mục danh sách), `MenuPage.test.tsx` (số liên kết), `top-bar.spec.ts`, `layout-small.spec.ts`, `theme-color.spec.ts` có danh sách trang.

### 9. Hình ảnh và token

**Hướng hình ảnh: "rau câu"**, món thạch rau câu nhiều màu quen thuộc:

- Khối thạch bóng, có vệt sáng, viền đậm hơn màu thân.
- Nền bàn là khay men kem, tường là gạch men xanh xám.
- Ban đêm: khay tối; thạch giữ màu nhưng tối hơn; viền sáng lên để nổi trên nền tối.
- Màu thạch: dâu đỏ hồng, lá dứa xanh lá, xoài vàng, khoai môn tím, dừa trắng ngà, sương sáo nâu gần đen, đá viên xanh nhạt.

**Token** riêng của trò, trong `puzzles/jelly-gather/theme.css`, phạm vi `[data-game="jelly-gather"]`:

- Hợp đồng `--game-*` có sẵn: `--game-page`, `--game-tint`, `--game-board`, `--game-line`.
- Biến riêng theo quy ước `--jelly-gather-*`: `--jelly-gather-<kind>`, `-<kind>-edge`, `-<kind>-mark`, `-wall`, `-wall-top`, `-player`, `-player-eye`, `-pin`, `-sheen`.
- Mỗi giá trị có bản sáng, và có mặt trong cả hai khối tối giống hệt nhau. `packages/ui` không biết mã trò nào.

**Test token:** các hàm `block`, `contrast`, `resolve` của `games/theme-css.test.ts` chuyển sang `src/test/theme-css.ts`. Test của game giữ nguyên ý; test mới `puzzles/theme-css.test.ts` kiểm:

- viền thạch / nền bàn ≥ 3:1;
- ký hiệu / thân thạch ≥ 3:1;
- tường / nền bàn ≥ 3:1;
- nhân vật / nền bàn ≥ 3:1;
- mắt / nhân vật ≥ 3:1.

Giá trị và tỉ số chốt cùng mockup, ghi vào bảng dưới trước khi code (task 0.2).

Giá trị trong mockup (tính bằng công thức WCAG; chốt lại khi mockup được duyệt):

| Cặp                          | Sáng  | Tối   |
| ---------------------------- | ----- | ----- |
| viền dâu / nền bàn           | 7.37  | 8.27  |
| ký hiệu dâu / thân dâu       | 4.19  | 4.14  |
| viền lá dứa / nền bàn        | 6.41  | 10.90 |
| ký hiệu lá dứa / thân lá dứa | 5.69  | 4.78  |
| viền xoài / nền bàn          | 5.62  | 11.62 |
| ký hiệu xoài / thân xoài     | 7.21  | 6.91  |
| viền khoai môn / nền bàn     | 9.28  | 9.16  |
| ký hiệu khoai môn / thân     | 5.39  | 4.65  |
| viền dừa / nền bàn           | 4.68  | 9.23  |
| ký hiệu dừa / thân dừa       | 4.28  | 4.52  |
| viền sương sáo / nền bàn     | 18.39 | 8.08  |
| ký hiệu sương sáo / thân     | 9.50  | 9.97  |
| viền đá viên / nền bàn       | 4.61  | 13.67 |
| vệt đá viên / thân đá viên   | 3.99  | 3.99  |
| tường / nền bàn              | 5.75  | 5.49  |
| nhân vật / nền bàn           | 16.65 | 14.10 |
| mắt / nhân vật               | 17.47 | 15.43 |
| đinh ghim / thân dừa         | 12.43 | 10.74 |

Viền của dải nối sương sáo trên thân sương sáo chỉ 1.50:1 ở giao diện sáng. Viền đó chỉ để trang trí: dải nối được nhận ra nhờ thân gần đen của nó nằm giữa hai thân thạch sáng.

**Icon** thêm vào `packages/ui/src/icons.ts`: `ArrowUp`, `Undo2`, `RotateCcw`. Đã có: `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Check`.

**Hình thẻ:** tự vẽ SVG, ba khối thạch, hai khối đang dính, và nhân vật.

**Mockup:** `mockup/index.html`, **chơi được** bằng chính luật ở §3 với 6 màn mẫu, sáng/tối, 390/360/1280. Người dùng duyệt trước khi code.

**Cách kiểm tra:**

- `pnpm ui:shots` thêm các ảnh sau, mỗi ảnh ở sáng/tối × 390/1280:
  - danh sách màn mới, danh sách màn đã giải vài màn;
  - màn 1-1;
  - một màn chương 3 có thạch dừa đứng yên;
  - khung giải xong;
  - trang không tìm thấy màn.
- Thêm ảnh 360 × 640 cho khung giải xong.
- `test:a11y` quét các màn hình đó.

### 10. Bản dịch

- Namespace `Puzzles` (tên, mô tả trên menu) và `JellyGather` (tên chương, gợi ý, cách chơi, nhãn nút, lời báo, mô tả bàn, không tìm thấy màn); khoá `Menu.levels`.
- Lời báo ghép từ tham số ICU (`{kind}` qua `select`, `{count, plural}`), không ghép chuỗi trong code. Tên loại thạch dịch theo ngôn ngữ ("dâu" / "strawberry" / "いちご").
- `i18n/client-messages.ts` gửi mọi namespace trừ `Rules` cho mọi trang, nên khoảng 3 KB chữ (khoảng 1 KB sau gzip) thêm vào mọi trang, như `CardScore`. Chấp nhận; lớp gộp bản tin theo route để change khác.

### 11. Delta `accessibility`

Requirement "Thanh trên cùng luôn thấy" có mô tả 490 ký tự. Thêm ", trò giải đố" vào ngoại lệ làm nó vượt 500, mức `openspec validate --strict` từ chối trong `specs/`. Vì vậy delta đổi đúng một chữ, không đổi nghĩa: "luôn nằm ở mép trên" thành "luôn ở mép trên". Phần còn lại chép nguyên văn, kèm một scenario mới.

## Risks / Trade-offs

- **Màn đúng nhưng chán, hoặc đường cong độ khó lệch.** Bộ giải chỉ chứng minh màn giải được và ngắn nhất là bao nhiêu, không chứng minh màn hay.
  → Mockup chơi được để người dùng thử cơ chế trước khi làm đủ 24 màn. Sau khi code, người dùng chơi thử cả 24 màn trước khi archive (task 10.3); màn nào chán thì thay.
- **Kẹt không lối ra** (thạch sát tường, dính sai thứ tự) là bản chất của thể loại.
  → Hoàn tác không giới hạn thực tế và "Chơi lại màn" hoàn tác được. Phần "Cách chơi" nói rõ "thạch sát tường không kéo ra được".
- **Test bộ giải chậm** (879 000 trạng thái mất 3,8 giây ở bản nháp).
  → Giới hạn 300 000 trạng thái mỗi màn, môi trường node, thời hạn đặt rõ, đo từ task 3.1, đường lui là script riêng (§5).
- **Vuốt trên điện thoại thật** chưa thử, có thể đụng cuộn trang hay cử chỉ quay lại của trình duyệt.
  → `touch-action: none` chỉ trên bàn, bàn cách mép, luôn có nút hướng. Ghi vào danh sách thử thiết bị thật ở `plan.md`.
- **Phím đụng menu trên thanh trên và phím tắt của trình duyệt.**
  → Luật bỏ qua ở §7, có test với menu đang mở.
- **Sửa phần dùng chung** (menu, điều hướng, hàm test token).
  → Mỗi chỗ một lần, có test; ghi bất biến mới.
- **localStorage bị chặn** (trình duyệt riêng tư nghiêm ngặt).
  → Vẫn chơi được trong phiên, chỉ không nhớ; không báo lỗi chặn màn hình.
- **Gần giống game gốc.**
  → Tên, hình, màn tự làm; cơ chế giới hạn ở bốn loại; sương sáo, đá viên trơ và luật qua màn là tự đặt. Không dùng chữ "Jelly Is Sticky" ở bất cứ đâu trong app.
