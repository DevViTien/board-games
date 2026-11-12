# Design

## Context

Lý do và phạm vi ở `proposal.md`; hành vi ở `specs/`. Change này nối tiếp `add-jelly-gather-puzzle`; mọi cách làm của change đó vẫn giữ (luật thuần trong `rules/`, màn chữ trong `levels.ts`, bộ giải chứng minh số bước ít nhất, lưu localStorage theo `version` từng màn). Change đó **chưa archive**, nên `openspec/specs/jelly-gather/` chưa có; change này archive sau nó.

## Goals / Non-Goals

**Goals:**

- Một luật qua màn thứ hai (khuôn) mà không đổi gì ở 24 màn đã có, kể cả tiến độ đã lưu.
- Màn Boxoban giữ đúng câu đố gốc dưới luật của Gom thạch, và điều đó được test chứng minh.
- Ghi công Boxoban đúng giấy phép Apache 2.0.

**Non-Goals:** như mục "Ngoài phạm vi" của proposal.

## Decisions

### 1. Tìm hiểu: ô đích của game gốc và map công khai

**Game gốc:**

- Thread [Steam "unachievable levels"](https://steamcommunity.com/app/1492620/discussions/0/3280321473015226885/): "The target at the bottom left in VESTIBULUM cannot get enough jellys to cover". Một người trả lời rằng màn có "just enough to fill in the target"; nhà phát triển xác nhận đó là lỗi của một bản vá.
- Suy ra: ô đích phải được thạch phủ kín, và cần đủ lượng thạch. Không nguồn nào ghi ô đích có màu không, thạch thừa được nằm ngoài không. Bài hướng dẫn chữ duy nhất trên Steam chặn truy cập tự động.
- **Map:** không có bộ map công khai chính thức; trò có trình tạo màn. Người chơi chia sẻ màn qua một Discord của cộng đồng ([thread "Share custom levels?"](https://steamcommunity.com/app/1492620/discussions/0/3417684283212554037/)), không ghi điều khoản. Màn của game gốc là tài sản của Lunarch Studios, nên không dùng.

**Map công khai có giấy phép:**

- Bộ 90 màn Sokoban "public domain" của David Joffe: chính tác giả ghi là gom từ nhiều nguồn, nên không rõ nguồn gốc từng màn. Bỏ.
- Microban (David W. Skinner): không tìm được điều khoản rõ. Bỏ.
- **Boxoban** ([google-deepmind/boxoban-levels](https://github.com/google-deepmind/boxoban-levels), Apache 2.0): mỗi màn 10 × 10 kể cả tường, 4 hộp, 4 ô đích; có bộ "hard" 3 332 màn. **Chọn.**

**Luật khuôn đã thử bằng bộ giải** (bản nháp trong scratchpad, cùng luật với `rules/`):

- Trên lưới 5 × 5 có 3 thạch dâu và một khuôn dâu ba ô, chỉ 12/200 màn sinh ngẫu nhiên giải được. Màn giải được cần 17–30 bước, trong khi luật gom trên cùng bàn chỉ cần 3–5 bước. Khuôn nhiều ô buộc người chơi dính thạch thành đúng hình rồi mới đưa vào. Đây là chiều sâu mới, đúng chủ đề "dính".
- "Phủ khuôn" và "vừa khít khuôn" chỉ khác nhau khi có thạch thừa. Người dùng chọn **vừa khít**.

**Boxoban dưới luật của Gom thạch** (hộp thành đá viên, ô đích thành khuôn đá):

- Đá viên không dính gì, nên đá viên chính là hộp Sokoban, trừ một điều: Gom thạch cho **đẩy dây chuyền**, Sokoban thì không.
- Trên 40 màn đầu của `hard/000.txt`: 32 màn giải được trong 400 000 trạng thái. **25/32 màn ngắn đi** khi được đẩy dây chuyền, ví dụ màn #0 từ 50 bước còn 23.
- Trên 160 màn từ #40: **47 màn có số bước ít nhất như nhau** dưới cả hai luật, trong 300 000 trạng thái. Chương 5 chỉ lấy từ 47 màn này.
- Đã cân nhắc đổi luật đá viên ("không đẩy được khi phía sau có khối"). Bỏ, vì phải kiểm lại và có thể đổi lời giải của mọi màn đã có đá viên.

- **Cùng số bước ít nhất chưa đủ** (lượt review design, bằng một bộ giải độc lập không dùng bản nháp): ở #147, chỉ một bước từ lúc mở màn đã có thế bí theo luật Sokoban mà đẩy dây chuyền vẫn gỡ được (3 627 thế như vậy); #64 có từ độ sâu 5, #63 và #49 ở độ sâu 17 và 21. Vì vậy tiêu chí chọn thêm: **đẩy dây chuyền không gỡ được thế bí nào của luật Sokoban** (bộ giải độc lập trong scratchpad, `review2/soko.mjs`). Tiêu chí này kiểm khi chọn màn; test chỉ kiểm số bước ít nhất bằng nhau, nên spec ghi "không làm lời giải ngắn đi", không hứa nhiều hơn.
- Bộ giải độc lập xác nhận số bước và số trạng thái của bản nháp. Trong `hard/000.txt` không có `*` hay `+`; số thứ tự `; n` đếm từ 0.

**8 màn chương 5** (đề xuất; task 3.3 chạy lại bằng code TS):

| Màn | Boxoban `hard/000.txt` | Số bước ít nhất | Trạng thái (tới lời giải) | Thế bí được gỡ |
| --- | ---------------------- | --------------- | ------------------------- | -------------- |
| 5-1 | #199                   | 19              | 2 961                     | 0              |
| 5-2 | #128                   | 30              | 25 756                    | 0              |
| 5-3 | #75                    | 35              | 25 349                    | 0              |
| 5-4 | #184                   | 39              | 43 857                    | 0              |
| 5-5 | #198                   | 39              | 51 200                    | 0              |
| 5-6 | #190                   | 40              | 36 736                    | 0              |
| 5-7 | #111                   | 48              | 29 743                    | 0              |
| 5-8 | #112                   | 49              | 32 601                    | 0              |

### 2. Mô hình: khuôn là một lớp của màn

- **Định nghĩa màn có thêm `molds`**: một mảng chuỗi cùng kích thước với `rows`. Mỗi ký tự là `.` (không có khuôn) hoặc một chữ hoa:

  | Ký tự | Khuôn của |
  | ----- | --------- |
  | `R`   | dâu       |
  | `G`   | lá dứa    |
  | `Y`   | xoài      |
  | `P`   | khoai môn |
  | `C`   | dừa       |
  | `I`   | đá viên   |

  Viết riêng một lớp, vì một ô có thể vừa là khuôn vừa có khối nằm sẵn lên.

- `parseLevel` kiểm: cùng kích thước, khuôn không nằm trên tường, chữ hợp lệ, **mỗi loại có khuôn có số ô khối bằng số ô khuôn** (lượt review: thiếu điều này thì màn có thể hiện "Khuôn 3/3" mà không bao giờ giải được). Mã lỗi mới `LEVEL_ERROR.Mold`. Hệ quả: ở màn có khuôn đá, mọi đá viên đều phải vào khuôn, nên đá viên không dùng làm chướng ngại được trong màn đó. Khuôn nằm dưới nhân vật hay dưới khối lúc mở màn là hợp lệ.
- Với số ô bằng nhau, "mọi ô khuôn có khối đúng loại" tương đương "vừa khít", và "Khuôn n/m" đủ khi và chỉ khi màn được giải.
- `Level` thêm `molds: ReadonlyMap<number, MoldKind>`, rỗng ở màn không có khuôn. `MoldKind` là `JellyKind` trừ sương sáo.
- **Luật qua màn đi theo màn**: `isSolved(board)` thành `isSolved(level, board)`.
  - Màn không có khuôn: luật gom như cũ.
  - Màn có khuôn: với mỗi ô khuôn, ô đó có khối đúng loại; và mọi ô của một loại có khuôn nằm trên khuôn của loại đó.

  `Grid` (thứ `step` cần) thêm `molds`, nên `step` biết khi nào giải xong. `settle` nhận kiểu hẹp hơn (chỉ kích thước và tường), vì `parseLevel` gọi nó trước khi có khuôn.

- **Những chỗ đổi theo** (lượt review design): `step.ts`, `isAttemptSolved` trong `history.ts` (dùng `attempt.level`), `solver.ts`, `levels.test.ts`, `step.test.ts`; `CHAPTER_COUNT` 3 thành 5; ép kiểu `"1" | "2" | "3"` của tên chương trong `PlayLevel.tsx` và `LevelList.tsx`; `HINT` thêm `Mold` và `Depot`; test và tài liệu đang ghi "24 màn".
- **`moldProgress(level, board)`**: hàm thuần trả `{ fitted, total }` hoặc `null`. **Chip "Khuôn 3/8" tính lại từ bàn đang hiện mỗi lần render**, nên luôn đúng sau khi hoàn tác, chơi lại hay tải lại. `outcome.molds` (kể cả ở bước chỉ đi, không đẩy) chỉ dùng cho lời báo.
- **Không đổi dữ liệu lưu**: màn mới có `id` mới (4-x, 5-x); 24 màn cũ giữ `version` 1.

### 3. Bộ giải và test

- `solve(level, limit, { chainPush })`: giữ tham số `limit` như cũ để không đổi các lời gọi hiện có. `chainPush: false` là luật Sokoban: bỏ mọi bước có `result.pushedPieces.length > 1`, cách đếm chính xác có sẵn trong `step`. Chỉ test dùng.
  - Bản nháp đầu so khối theo ô và đếm sai, vì một viên đá trượt vào đúng ô viên kia vừa rời.
- **`levels.test.ts` thêm:**
  1. Mọi màn chương 4 có khuôn.
  2. Chương 5 chỉ có đá viên và khuôn đá.
  3. Mỗi màn chương 5: `solve` với `chainPush: false` cho đúng `minMoves`.
  4. Mỗi màn chương 4: luật gom **chưa** thoả lúc mở màn, và bỏ lớp khuôn thì lời giải ngắn nhất đổi hoặc vô nghiệm (kết quả MUST NOT là `too-big`). Nhờ vậy test không qua một cách vô nghĩa khi bàn đã gom sẵn.
  5. Chương 4 không có khuôn đá, để gợi ý "kho đá" ở 5-1 đúng là lần đầu gặp khuôn đá.
  6. Phát lại lời giải ngắn nhất của luật gom (nếu có) không giải được màn khuôn: chặt hơn test 4.
  7. Mỗi màn chương 5: đọc 10 dòng gốc trong comment, chuyển đổi ngay trong test, so với `rows` và `molds` đã ghi, để comment không lệch với màn.
- **Thời gian:** chương 5 tốn nhất khoảng 50 000 trạng thái mỗi màn, chạy hai lần (hai luật). **Đo (task 3.3):** `levels.test.ts` có 243 test, chạy 8 giây (trước là 130 test, 4,3 giây). Số bước và số trạng thái của 8 màn chương 5 bằng code TS trùng với bản nháp; theo luật Sokoban cần 2 888 – 48 140 trạng thái.

### 4. Chép màn Boxoban

- **Script chuyển đổi** nằm trong scratchpad, không vào repo:
  - `$` thành `i`, `.` thành `I` trong lớp khuôn, khoảng trắng thành `.`;
  - hộp nằm sẵn trên đích (`*`) thành `i` trên `I`;
  - người đứng trên đích (`+`) thành `@` trên `I`.
- **Mỗi màn chương 5 trong `levels.ts`** có một comment ghi nguồn (`Boxoban hard/000.txt #199, google-deepmind/boxoban-levels@78011d8c, Apache-2.0`) và 10 dòng gốc nguyên văn, để thấy rõ đã đổi gì (Apache 2.0 §4b: ghi rõ file đã sửa).
- **`/third-party-licenses.txt`** thêm một mục:
  - tên bộ, tác giả theo README của bộ, nguồn kèm SHA, danh sách 8 màn;
  - "đã sửa: hộp thành đá viên, ô đích thành khuôn đá, chơi theo luật Gom thạch";
  - "© DeepMind / Google. This is not an official Google product", câu nói 8 màn đã chuyển đổi vẫn theo Apache 2.0, và trích dẫn mà README của bộ đề nghị (Guez et al., 2018, "An investigation of Model-free planning: boxoban levels");
  - toàn văn giấy phép Apache 2.0.

  Repo nguồn (đã kiểm ở SHA trên) không có file NOTICE, nên không có gì phải chép theo §4d. Comment trong `levels.ts` bị loại khỏi bundle khi build, nên bản app chạy dựa vào mục trong `/third-party-licenses.txt`; mục đó phải tự ghi rõ "đã sửa".

- **Danh sách màn:** dòng mô tả chương 5 ghi "Màn từ bộ Boxoban của DeepMind (Apache 2.0)" kèm liên kết tới `/third-party-licenses.txt`.

### 5. Màn hình

- **Khuôn trên bàn:**
  - Vẽ dưới khối: ô bo góc thụt vào, nền là màu thân của loại ở độ mờ thấp, viền nét đứt màu viền của loại, ký hiệu của loại nhỏ ở giữa.
  - Vẽ thêm trên khối: viền nét đứt và **ký hiệu nhỏ của loại khuôn ở góc ô**, để khuôn và loại của nó vẫn thấy khi bị che, kể cả bởi khối sai loại.
  - Ô đã vừa: viền liền **và dấu ✓**, hai tín hiệu ngoài màu.
  - Chi tiết chốt cùng mockup.
- **Chip tiến độ:** "Khuôn 3/8" cạnh số bước, chỉ ở màn có khuôn, tính từ bàn đang hiện. Số đếm là ô khuôn, cộng mọi loại; nhãn cho trình đọc màn hình nói rõ "3 trên 8 ô khuôn đã vừa".
- **Chữ đang có phải sửa:** `howTo.goal` thành "Màn không có khuôn: gom mỗi màu thành một khối"; khung giải xong ở màn có khuôn ghi "Vừa khuôn!" thay cho "Gom xong!" (cả lời báo); `hints.ice` ("không cần gom") vẫn đúng ở chương 1, không đổi.
- **Trình đọc màn hình:**
  - mô tả bàn có "khuôn dâu", "thạch dâu trong khuôn dâu", "bạn trên khuôn dâu"; mỗi loại khuôn là một nhóm riêng khi gom các ô giống nhau;
  - lời báo thêm "Khuôn 3/8" khi số ô vừa đổi.
- **Danh sách màn:** 5 chương. Chương 5 có dòng ghi nguồn. Phần "Cách chơi" thêm một dòng về khuôn.
- **Menu:** "40 màn", tự sinh từ `LEVELS.length`.

**Token** (chốt cùng mockup đã duyệt):

- **Chỉ thêm một token**, `--jelly-gather-mold-fill`: độ mờ của thân khuôn (sáng 0.28, tối 0.32). Thuần trang trí; khuôn được nhận ra nhờ viền.
- **Viền khuôn** (cả khi bị che) dùng lại màu viền của loại (`--jelly-gather-<kind>-edge`). Mọi cặp viền / nền bàn đã đạt từ 3:1 ở bảng của change trước; thấp nhất là viền đá viên 4.61 và viền dừa 4.68 ở giao diện sáng.
- **Khi bị che**, viền, vòng tròn ký hiệu ở góc và dấu ✓ có một quầng màu nền bàn (`--game-board`) bên dưới, nên đọc được trên mọi thân khối (kể cả sương sáo gần đen). Không cần token `--jelly-gather-mold-line` riêng như mockup.

**Kiểm tra:**

- `theme-css` test thêm: viền khuôn / nền bàn ≥ 3:1; viền khuôn khi bị che / thân khối ≥ 3:1.
- `pnpm ui:shots` thêm ảnh cho: màn 4-1, một màn khuôn đã vừa vài ô và một ô sai loại, màn chương 5 (cả 360 × 640: bàn 10 cột còn 32 px mỗi ô), danh sách màn có 5 chương.
- Tương phản riêng của khuôn đá trên nền bàn sáng (đá viên nhạt, độ mờ thấp).

### 6. Bản dịch

- **Thêm:** `chapters.4`, `chapters.5` (kèm `credit`, câu ghi nguồn Boxoban có liên kết), `hints.mold`, `hints.depot`, `howTo.mold`, `play.molds` ("Khuôn {fitted}/{total}"), `play.moldsLabel` (câu cho trình đọc màn hình), `say.molds`, `say.solvedMolds`, `solved.titleMolds` ("Vừa khuôn!"), `cell.mold`, `cell.onMold`, `moldNames.*` ("khuôn dâu", "khuôn đá": tên khuôn khác tên khối nên có khoá riêng); `howTo.goal` đổi thành câu cho màn không có khuôn.
- **Chip:** chữ "Khuôn 3/8" `aria-hidden`, kèm một `sr-only` đọc "3 trên 8 ô khuôn đã vừa" (một `aria-label` trên `<span>` không có vai trò sẽ bị trình đọc màn hình bỏ qua).
- **Lời báo "Khuôn n/m"** chỉ khi bước làm đổi số ô vừa (`outcome.moldsChanged`).
- **Viền khuôn trên ô vừa có khối trượt tới** hiện dần sau 120 ms của cú trượt, để không xuất hiện trước khối (tổng vẫn 200 ms).

## Risks / Trade-offs

- **Màn khuôn khó thiết kế:** chỉ khoảng 6% màn ngẫu nhiên giải được.
  → Thiết kế tay từ những hình khuôn có ý (thanh, chữ L, chữ T, hai khuôn cạnh nhau), bộ giải chọn và chứng minh, như chương 1–3.
- **Màn Boxoban dài và "khô"** (19–61 bước, bốn viên đá giống nhau) so với các chương khác.
  → Đặt cuối cùng, ghi rõ nguồn; người dùng chơi thử (task cuối). Nếu chán thì bớt màn hay thay bằng màn khác trong 47 ứng viên.
- **Màn Boxoban sinh bằng thuật toán, không do người thiết kế.** Đó là bản chất của bộ màn; câu đố đã được DeepMind lọc theo độ khó.
- **Archive phụ thuộc change trước.** Nếu `add-jelly-gather-puzzle` chưa archive, change này không archive được.
  → Ghi trong tasks; người dùng chơi thử 24 màn cũ và 16 màn mới cùng một lượt.
- **Hai change archive liền nhau:** chơi thử (task 7.3) gộp cả 24 màn cũ và 16 màn mới. Archive `add-jelly-gather-puzzle` rồi change này trong cùng một commit, chạy `spec:check`, để `specs/` không có lúc ghi "24 màn". Sau đó sửa `## Purpose` của `specs/jelly-gather/spec.md` (delta không sửa được Purpose) để nhắc tới khuôn.
- **Chính sách tài sản bên thứ ba** trong `.claude/skills/board-games-ui/SKILL.md` ("ngoại lệ duy nhất", "file giữ nguyên không sửa") viết cho hình ảnh. Change sửa dòng đó để nói rõ dữ liệu màn của bên thứ ba được chuyển đổi nếu ghi bản gốc và ghi rõ đã sửa; sửa luôn quyết định 19 trong `idea.md` ("màn tự làm").
- **Giấy phép:** Apache 2.0 đòi kèm giấy phép và ghi rõ đã sửa. Thiếu một trong hai là vi phạm.
  → Có test đọc `/third-party-licenses.txt`, kiểm có mục Boxoban và toàn văn giấy phép (task 4.3).
