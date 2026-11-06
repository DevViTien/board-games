# Design

## Context

Xem `proposal.md` về lý do và phạm vi, `specs/fence-race/spec.md` về hành vi. Bối cảnh ảnh hưởng tới cách làm:

- Thêm game theo bất biến: `GameDefinition` trong `packages/games`, `Board` và phần giao diện trong `apps/web/src/games/<id>/`, mỗi registry một dòng. Không có nhánh theo mã game trong `features/`, `transport/`, `server/`. Khoá `Games.fence-race.*`, `data-game`, `gameId`, `theme-css.test.ts` đều nhận dấu gạch ngang (đã kiểm).
- Server gọi `legalMoves` khi kiểm tra từng nước và khi phát lại ván (`session.ts`, `findLegal`). Game có khoảng 160 vị trí đặt rào và mỗi vị trí có thể cần tìm đường, nên chi phí `legalMoves` là ràng buộc thật.
- Máy dùng minimax alpha-beta chung, nhiều ghế thì ghế máy tối đa, mọi ghế khác tối thiểu (`packages/engine/src/ai/search.ts`). Ghế máy online chạy mức Vừa ngay trên server với `timeLimitMs: 0`, nên phải rẻ. Mức Khó chạy trong Worker, có giới hạn `AI_TIME_LIMIT_MS`.
- Số người chơi: `game-setup` hiện mọi số từ `min` tới `max`. Không có cách khai báo "2 hoặc 4" mà không sửa phần dùng chung, nên game cho cả 3 người.
- `leaveOutcome` tự áp dụng cho mọi game có máy từ ba ghế, nên Cờ rào có "Máy chơi thay" mà không cần code thêm; hai spec đang viết riêng cho Cờ cá ngựa được sửa trong change này.

## Goals / Non-Goals

**Goals:**

- Toàn bộ game nằm trong thư mục của nó, không sửa phần dùng chung.
- `fenceRaceFenceIssue` là nguồn của lý do hiển thị khi xem trước. `legalMoves` dùng chung `fenceInTheWay` và tìm đường, có tối ưu riêng; test giữ hai bên khớp nhau.
- Đặt rào chính xác trên điện thoại mà không phải chạm trúng khe giữa các ô.

**Non-Goals:**

- Máy đánh ở trình độ cao: chỉ cần ba mức khác nhau rõ, mức Khó đủ thách thức người mới.
- Tuỳ chọn luật. Hằng số nằm một chỗ để dễ chỉnh khi thử luật.
- Tô đường ngắn nhất luôn bật, tutorial nhiều bước, danh sách rào cho trình đọc màn hình: để sau nếu chơi thật thấy cần.

## Decisions

### 1. Trạng thái và nước đi

`packages/games/src/fence-race/`, id `fence-race`, nhóm `GAME_CATEGORY.Original`, `players: { min: 2, max: 4 }`, `durationMinutes: 15`, `supportsAI: true`.

```ts
type FenceDirection = "h" | "v";
interface Fence {
  row: number;
  col: number;
  dir: FenceDirection;
} // neo: giao điểm góc dưới phải của ô (row, col)
type FenceRaceMove =
  | { kind: "step"; row: number; col: number }
  | { kind: "fence"; row: number; col: number; dir: FenceDirection }
  | { kind: "break"; row: number; col: number; dir: FenceDirection };

interface FenceRaceState {
  rows: number;
  columns: number;
  pawns: readonly Cell[]; // theo ghế; số phần tử là số người chơi
  fences: readonly Fence[]; // luôn sắp theo thứ tự cố định: phát lại cho đúng state
  fencesLeft: readonly number[];
  breaksLeft: readonly number[];
  toMove: PlayerIndex;
  moveCount: number;
  lastFrom: Cell | null; // ô quân vừa rời ở nước đi quân gần nhất, null nếu nước đó không đi quân
  lastBroken: Fence | null; // rào vừa phá ở nước gần nhất, null nếu nước đó không phá: `evaluate` đọc (§3)
  result: GameResult | null; // tính một lần, ở nước kết thúc ván
}
```

Hàng 0 ở trên, neo rào có `row ∈ 0…rows−2`, `col ∈ 0…columns−2`. Cạnh đích suy ra từ ghế và số người, không lưu. `moveKey`: `s:r:c`, `f:h:r:c`, `b:h:r:c`.

- **Vì sao lưu `fences` dạng danh sách, không phải bitset**: state là dữ liệu thuần, đọc được, gọn trong JSON của bản ghi; bảng tra cạnh bị chắn dựng cục bộ trong từng hàm. Không có cache cấp module (hàm thuần, bất biến).
- **Vì sao lưu `result` trong state**: giới hạn lượt cần tìm đường; `result()` được gọi ở mỗi nút của cây tìm kiếm nên phải rẻ. Cùng cách với `win` của Cờ caro.
- **Vì sao lưu `lastFrom`**: spec đòi đánh dấu ô vừa rời kể cả sau khi tải lại, mà `HistoryEntry` chỉ có ô đến. Cờ cá ngựa cũng giữ nước vừa đi trong state. Phương án thêm `from` vào nước đi làm khoá nước dài hơn và trùng thông tin đã có trong state.
- **Không lưu chủ của rào**: mockup vẽ mọi rào một màu, luật không cần biết; lần phá dùng được cho rào của bất kỳ ai.

### 2. Luật rào và chi phí `legalMoves`

Hàm thuần xuất ra cho cả app và server:

- `fenceRaceDistance(state, player)`: BFS, số bước ngắn nhất về đích.
- `fenceRaceFenceIssue(state, fence)`: `null` hoặc mã `no-fences`, `out-of-board`, `overlap`, `cross`, `seals` kèm ghế bị bịt. Đây là nguồn của lý do hiển thị khi xem trước. `legalMoves` dùng chung `fenceInTheWay` và tìm đường, có tối ưu riêng; test giữ hai bên khớp nhau.

Tối ưu `legalMoves`: tìm đường ngắn nhất của mỗi người một lần; rào không chắn cạnh nào trên các đường đó thì chắc chắn không bịt kín, khỏi BFS. Chỉ rào chắn đường mới BFS lại. Phương án kiểm mọi rào bằng BFS đơn giản hơn nhưng tốn khoảng 160 × 4 lần tìm đường cho mỗi lần gọi; phương án thêm `isMoveLegal` vào engine thì phải sửa phần dùng chung. Đo trên code trong repo (Node 24, một luồng, 5.400–5.800 thế của 30 ván ngẫu nhiên mỗi số người): `legalMoves` trung bình 0,015–0,017 ms, p95 0,11–0,14 ms, lâu nhất 0,84 ms; phát lại trọn ván 198–200 nước bằng `fromRecord` trung bình 2,8–3,3 ms, lâu nhất 5,5 ms. Test `legal-moves.test.ts`, trên mọi thế của 8 ván ngẫu nhiên mỗi số người, so `legalMoves` với luật viết lại độc lập trong test bằng BFS, và với `fenceRaceFenceIssue` cho mọi rào, không sai khác.

**Hết số nước tối đa** (200, hoặc 198 ở ván ba người để mọi người có số lượt bằng nhau): ai có đường ngắn nhất thì thắng, từ hai người cùng ngắn nhất thì hoà (`reason: "turn-limit"`), kể cả ván nhiều người: chọn đơn giản hơn là chia thắng cho nhiều người. Về đích đúng nước 200 vẫn là `goal`. Phương án "lặp thế cờ thì hoà" phải theo dõi lịch sử và vẫn cần giới hạn cứng, nên bỏ.

**Cổng đích 5 ô** (người dùng chọn ngày 06/11/2026): đích của mỗi người là 5 ô giữa của cạnh đối diện (cột hay hàng thứ 3 tới thứ 7 trên cạnh 9 ô). Đã so bốn bộ luật bằng tự chơi với cùng một máy (mức Vừa, 2 nước mở đầu ngẫu nhiên, n=200 mỗi ô, đều 0% hết lượt; kết quả nằm ngoài repo, đây là số chính):

| Bộ luật                | Thắng theo ghế, 2 / 3 / 4 người              | Phá rồi đặt lại đúng chỗ | Người dẫn ở 3/4 ván thắng |
| ---------------------- | -------------------------------------------- | ------------------------ | ------------------------- |
| Cả cạnh là đích        | 52/48; 29/41,5/29,5; 20,5/27,5/31/21         | 76/66/56%                | 88/51/37%                 |
| **Cổng 5 ô (đã chọn)** | **49,5/50,5; 34/34,5/31,5; 23,5/32/23,5/21** | **47/37/26%**            | **95/76/51%**             |
| Cổng 3 ô               | 46/54; 42,5/28/29,5; 27/28,5/28/16,5         | 51/30/29%                | 93/87/63%                 |
| Cổng 5 ô và rào riêng  | 48/52; 32/35/33; 21/29/25,5/24,5             | 49/43/31%                | 92/64/51%                 |

Cổng 5 ô tạo khác biệt thật về luật, cân bằng ghế tốt nhất ở 3 người mà ít đổi mockup. Cổng 3 ô lệch ghế và ván ngã ngũ sớm hơn. Rào riêng (rào của mình không cản mình) khác game tham khảo nhiều nhất, nhưng phải có màu và ký hiệu chủ trên nét rào rất mảnh ở điện thoại, luật khó giải thích hơn, và người giỏi có thể khai thác (đặt một mình được hiệu +10 bước, so với +3). Cái giá của cổng 5 ô: rào hại chính mình nhiều hơn (12,3% so với 8,9% ở 2 người), ván hai người ngã ngũ sớm hơn.

**Một lượt luôn có nước**: luật bảo đảm luôn còn đường và quân không chặn nhau, nên luôn có ít nhất một nước đi quân.

### 3. Máy

Các quyết định dưới đây lấy từ số đo, bản nháp của lượt duyệt trước rồi code trong repo; bảng cuối mục là số của code.

- `evaluate(state, player)` = `100 × (đường của đối thủ gần đích nhất − đường của mình) + 10 × lần phá còn lại − 400 × số đối thủ cách đích 1 bước`, cộng phần rào: ván hai người `40 × (rào của mình − rào của đối thủ)`, ván ba, bốn người `5 × rào của mình`. Số nguyên, trong giới hạn của engine.
- Ván hai người, ngay sau một nước phá (`lastBroken`) mà người đi tiếp còn rào, `evaluate` tính đường như rào đó vẫn còn: nước phá ở cuối cây tìm kiếm chưa có câu trả lời, đối thủ đặt lại được.
- `candidateMoves(state)`, tối đa khoảng 20 nước, tốt nhất trước:
  - **chỉ nước đi quân nằm trên một đường ngắn nhất**, luôn gồm nước về đích. Luôn có ít nhất một nước như vậy, và mỗi nước đều rút ngắn đường;
  - rào chắn đường ngắn nhất của đối thủ, gồm cả rào chỉ thêm 1 bước, sắp theo số bước làm dài thêm, gồm **mọi** rào chặn được đối thủ sắp về đích;
  - phá rào khi đường của mình ngắn đi từ 2 bước trở lên, tối đa 3 lựa chọn.

Vì sao có các quy tắc đó:

- **Chỉ đi theo đường ngắn nhất**: máy theo thiết kế ban đầu đi qua đi lại, vì tìm kiếm cho rằng tiến lên sẽ bị chặn. Ván 3 người hết lượt 8–31,7%, một thế lặp 27 lần. Sau khi sửa: 0% hết lượt ở 2, 3, 4 người. Không chỉnh số rào để né: giảm còn 4 rào cũng hết bế tắc nhưng không chữa nguyên nhân và làm lệch ghế hơn.
- **Điểm phạt 400**: engine ở độ sâu 2 chỉ thấy ghế ngay sau, nên ở ván 3–4 người máy không chặn được ghế +2, +3 (0/100). Có điểm phạt thì chặn 50/50 ở mọi vị trí. Spec vẫn chỉ cam kết chặn ở ván hai người, vì máy chặn hộ người khác có thể bất lợi cho chính nó.
- **Hai quy tắc đi cùng nhau**: chỉ kết hợp cả hai thì độ sâu 4 mới thắng mức Vừa (69,3%, n=300). Theo thiết kế ban đầu, độ sâu 4 chỉ thắng 32,9% vì tiêu rào sớm và hết rào cuối ván. Chưa tách riêng công của từng phần.

- **Sửa cách máy dùng lần phá (task 2.3)**: với code trong repo trước khi sửa, ở độ sâu 3 bên có lần phá chỉ thắng 17,5% (đi trước) và 30% (đi sau) khi đấu bên không có, trên 160 ván mỗi bên. Nguyên nhân: ở độ sâu lẻ, nước cuối của cây là của máy, nên nước phá ở đó được tính trọn công mà chưa ai trả lời; có nước đó ở cuối mọi đường thì đòn rào của đối thủ như không còn tác dụng, và máy thực chất nhìn nông đi một nước. Đã thử rồi bỏ: điểm giữ lần phá âm (`−30`: 15 / 31,7%), chỉ cho phá khi đang thua đường (11,7 / 25%), chỉ cho phá khi ngắn đi từ 3 bước (15,8 / 20,8%), cả hai (9,2 / 19,2%). Chọn cách không tính công nước phá vừa đi khi người tiếp theo còn rào để đặt lại; số sau khi sửa ở bảng cuối mục.
- **Trọng số rào 40 và trừ rào của đối thủ, chỉ ở ván hai người**: với trọng số 5 như thiết kế ban đầu, mức Khó thật 1500 ms chỉ thắng Vừa 56,3% (n=48), độ sâu 4 và 5 thắng 51 và 50%, chỉ độ sâu 3 đạt 69%: tìm kiếm càng sâu càng tiêu rào sớm để né nước rào cuối cây của đối thủ. Trọng số 20: Khó 52,8%, độ sâu 4 60%. Trọng số 40: Khó 77,8% (n=36), độ sâu 3, 4, 5 đều 77–80%; trọng số 80 không hơn. Ván ba, bốn người giữ 5 và không dùng `lastBroken`: dùng cách của ván hai người thì Vừa chỉ thắng Dễ 33,7% ở ván ba người (mức công bằng 33,3), bỏ đi thì 54%. Độ sâu 3 đấu Vừa ở ván ba người dao động 26–38% theo seed (n=150), không hơn mức công bằng rõ rệt: spec không cam kết điểm này.

**Số đo của code trong repo.** Tự chơi có 2 nước mở đầu ngẫu nhiên, seed cố định, cùng một lõi `chooseMove` với engine thật; "độ sâu 3" là đào sâu dần dừng ở độ sâu 3 bằng `searchRoot`.

| Đo                                       | Số ván          | Kết quả                                                                                                            |
| ---------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Vừa tự chơi, 2 người                     | 300             | Thắng theo ghế 56,3 / 43,7%; 68,3 nước; hết lượt 0; dùng phá ở 100% ván, 2 lần một ván, trung bình ở nước 15,1     |
| Vừa tự chơi, 3 người                     | 300             | Thắng theo ghế 35,3 / 33,3 / 31,3%; 63,4 nước; hết lượt 0; 2,91 lần phá một ván                                    |
| Vừa tự chơi, 4 người                     | 300             | Thắng theo ghế 26 / 27,7 / 22,3 / 24%; 62,1 nước; hết lượt 0; 3,42 lần phá một ván                                 |
| Độ sâu 3 tự chơi, 2 người                | 200             | Thắng theo ghế 56 / 44%; 69,3 nước; hết lượt 0                                                                     |
| Độ sâu 3 tự chơi, 3 người                | 200             | Thắng theo ghế 28 / 41 / 31%; 62,3 nước; hết lượt 0                                                                |
| Lần phá, mức Vừa                         | 800 mỗi ô       | Chỉ ghế đầu có: ghế đầu thắng 60,9%. Chỉ ghế sau có: ghế sau thắng 61,9%. Không ai có: ghế đầu 54,1, ghế sau 45,9% |
| Lần phá, độ sâu 3                        | 300 mỗi ô       | Chỉ ghế đầu có: ghế đầu thắng 57,7%. Chỉ ghế sau có: ghế sau thắng 60,3%. Không ai có: ghế đầu 56, ghế sau 44%     |
| Vừa đấu Dễ                               | 400 / 300 / 300 | Vừa thắng 91 / 54 / 43,3% ở 2 / 3 / 4 người (công bằng 50 / 33,3 / 25)                                             |
| Độ sâu 3 đấu Dễ, 2 người                 | 200             | 98%                                                                                                                |
| Độ sâu 3, 4, 5 đấu Vừa, 2 người          | 300 / 100 / 60  | 79,7 / 77 / 78,3%                                                                                                  |
| Độ sâu 3 đấu Vừa, 3 và 4 người           | 150 mỗi ô       | 26 / 27,3% (công bằng 33,3 / 25): spec chỉ cam kết Khó hơn Vừa ở ván hai người                                     |
| Khó thật 1500 ms, 2 người                | 60 / 24         | Thắng Vừa 70%, thắng Dễ 100%, đo trong khi 7 luồng cùng chạy nên ít nút hơn máy rảnh                               |
| Đồng hồ `ticking` 1200 lần đọc (test cũ) | 200 / 60        | Thắng Vừa 75%, thắng Dễ 95%                                                                                        |
| Dừng sau độ sâu 3 (test hiện tại)        | 100             | Thắng Vừa 77 trên 100 ván, ở ba seed (số đo của lượt review)                                                       |

Đọc bảng:

- **Hết lượt**: 0 ván ở mọi ô, dưới ngưỡng 1%, nên không chỉnh gì thêm cho máy.
- **Cân bằng ghế**: cao nhất 56,3% ở ván hai người (ngưỡng 65%); ở ván 3–4 người cao nhất 41% và 27,7%, tức 1,23 và 1,11 lần tỉ lệ công bằng (ngưỡng 1,5). Không chạm ngưỡng nên giữ 9, 6, 4 rào, không sửa spec và proposal.
- **Lần phá**: bên có lần phá hơn bên không có ở cả hai mức, không còn thua kém. Ở mức Vừa và độ sâu 3, máy phá sớm (nước 13–15 ở ván hai người) và đối thủ đặt lại đúng chỗ trong 52–70% số lần: chơi được nhưng chưa khôn; lội ngược dòng với người thật phải chơi mới biết.

**Chi phí** (Node 24, máy rảnh, một luồng, 164–170 thế giữa ván của 12 ván): mức Vừa như trên server (`timeLimitMs: 0`) trung bình 1,19 / 1,76 / 2,03 ms một nước ở 2 / 3 / 4 người, p95 3,8 / 5,7 / 9,4 ms, lâu nhất 12,8 ms, dưới mốc 50 ms xa. Mức Khó với `AI_TIME_LIMIT_MS` 1500: lâu nhất 1501 ms; đào sâu trung bình tới độ sâu 7–9, thấp nhất 3–4. Trình duyệt và điện thoại chậm hơn máy đo, chưa đo trên thiết bị thật.

Phương án MCTS: hợp với cây nhánh lớn, nhưng engine không có sẵn và sẽ phải sửa phần dùng chung; minimax với tập thu hẹp đủ cho mục tiêu.

**Thứ tự ghế 3 người là dưới, trên, trái**: ghế không có người đối diện thắng thấp nhất khi đi ở giữa (25,8%, thứ tự dưới, trái, trên), và đạt 33,2% khi đi cuối (n=900), đo với máy theo thiết kế ban đầu. Với máy đã sửa, ghế đó thắng 31,3% ở mức Vừa, 31% ở độ sâu 3.

### 4. Hình ảnh và bố cục (mockup người dùng duyệt ngày 06/11/2026)

Mockup ở `mockup/index.html`, ảnh ở `mockup/png/`, số đo đầy đủ ở `mockup/README.md`.

**Hướng hình ảnh**: đồng làng nhìn từ trên xuống, vẽ mực trên giấy dó. Ô là thửa ruộng (lúa non, lúa chín, đất cày, loại ruộng theo ô nên hai người thấy cùng một tấm bản đồ), rào là nét mực đậm có đốt, quân là nón lá nhìn từ đỉnh mang ký hiệu ● ■ ▲ ◆, đích là dãy mái cổng làng theo màu người chơi, chỉ phủ 5 ô giữa của cạnh. Ban đêm là đồng dưới trăng, rào trắng trăng. Hình tự vẽ bằng SVG; không có ô xanh, nền cỏ, hàng caro đích, rào gỗ nâu, rào tre xanh, nhân vật 3D của video tham khảo.

**Token** (trong `games/fence-race/theme.css`, không thêm gì vào `packages/ui`). Tỉ số đo trên mockup, chữ thấp nhất 5,00 sáng và 4,64 tối, đồ hoạ thấp nhất 3,08 sáng và 3,03 tối; `theme-css.test.ts` kiểm các cặp:

| Token                  | Sáng                                     | Tối       | Dùng cho                       | Tỉ số thấp nhất (sáng / tối)               |
| ---------------------- | ---------------------------------------- | --------- | ------------------------------ | ------------------------------------------ |
| `--game-page`          | `#ece7d6`                                | `#16150f` | Trang                          | chữ phụ 5,00 / 6,55                        |
| `--game-tint`          | `#f5f1e1`                                | `#211f15` | Tấm giấy dưới bàn, nền artwork | tên hàng cột 5,47 / 7,23                   |
| `--game-board`         | `#e6e3ad`                                | `#34381f` | Ruộng lúa non                  |                                            |
| `--fence-race-plot-2`  | `#efd98f`                                | `#433a19` | Ruộng lúa chín                 |                                            |
| `--fence-race-plot-3`  | `#dcc39b`                                | `#3e2e20` | Ruộng đất cày                  |                                            |
| `--game-line`          | `#78663c`                                | `#8d855a` | Bờ ruộng                       | 3,27 / 3,03 với ruộng                      |
| `--fence-race-row`     | `#bcae79`                                | `#4e4d33` | Luống trong ruộng, trang trí   | không cần                                  |
| `--fence-race-frame`   | `#3f3621`                                | `#b9af82` | Mép tấm giấy                   |                                            |
| `--fence-race-wall`    | `#1c1830`                                | `#f7f0d8` | Rào                            | 3,08 / 3,27 với bờ; 10,08 / 9,91 với ruộng |
| `--fence-race-halo`    | `#fbf7e8`                                | `#16150f` | Mép giấy quanh rào, dấu        | 16,0 với rào                               |
| `--fence-race-preview` | `#5b34e6`                                | `#a894ff` | Rào xem trước, rào chọn phá    | 4,00 / 4,49                                |
| `--fence-race-bad`     | `#a42a21`                                | `#ff8a7e` | Rào không hợp lệ               | 4,20 / 4,95                                |
| `--fence-race-bad-ink` | `#ffffff`                                | `#1f1a12` | Dấu ✕                          |                                            |
| `--game-highlight`     | `#1c1830`                                | `#f7f0d8` | Chấm ô đi được, vòng lượt      | 10,08 / 9,91                               |
| `--game-last-move`     | `#1c1830`                                | `#f7f0d8` | Nét đứt nước vừa đi            | 10,08 / 9,91                               |
| `--text-status`        | `clamp(1rem, 0.85rem + 0.8vw, 1.625rem)` | như sáng  | Dòng lượt nhỏ hơn              |                                            |

Cổng đích dùng `--piece-*` sẵn có, và khác các ô còn lại của cạnh về hình (mái cổng), không chỉ về màu. Rào không hợp lệ khác hình (rỗng, gãy đôi, có ✕), rào chọn phá có viền và vết nứt: màu không là tín hiệu duy nhất. Đường về đích dạng chấm chỉ hiện cho người bị đổi số bước khi xem trước, không có nút bật: luôn bật thì ván 4 người thành một mớ chấm.

**Bố cục** ở điện thoại, từ trên xuống: thanh trên, dòng lượt, bảng người chơi, bàn, dòng đọc giữ chỗ 2 dòng (`BoardParts.notes`), hàng điều khiển 44 px, hàng nút chung.

- Hàng điều khiển: `[Đi quân][Đặt rào][Phá rào]`, khi có xem trước đổi thành `[Xoay][Huỷ][Đặt rào]` hay `[Huỷ][Phá rào]`. Nút tự vẽ trong thư mục game (`aria-pressed` + `aria-disabled`), chỉ có chữ: `RadioGroup` không có tuỳ chọn disabled, mở rộng nó là sửa `packages/ui`; `icons.ts` chỉ có `RotateCwIcon`, nên chỉ dùng icon đó cho nút Xoay.
- Điện thoại dọc: bàn cao theo `svh`. Xoay ngang và từ 1024 px: theo `--board-room` của `PlayScreen` (`dvh`), không sửa vì là phần dùng chung. Cỡ bàn tính từ chiều cao các phần phải thấy, không theo chiều rộng, bằng CSS trong `theme.css` của game (không sửa `PlayScreen`). Số đo trên app ở mục "Khác thiết kế". Lề cạnh bàn để vuốt cuộn trang.
- Dùng **bảng người chơi** cho cả ván hai người, không dùng thanh ghế như Cờ vua: thanh ghế chỉ có một dòng `truncate`, lại ăn thêm chiều cao bàn dọc, và ván 3–4 người vốn đã cần bảng. Dòng tóm tắt `5 rào · phá · 7 bước`.
- Ô dưới 26 px: vùng bấm ô đi được nới ra ngoài ô, về phía xa quân (tiền lệ `HIT_MIN_PX` của Cờ cá ngựa).
- Giữ bàn đứng yên: `--text-status` hạ còn 16 px chỉ trong `[data-game="fence-race"]`, dòng lượt giữ chỗ 2 dòng khi có `viewer`, bảng người chơi online có chiều cao tối thiểu.

Điểm đã chấp nhận khi duyệt: bốn người online ở 360 × 740 là khung kém nhất (ô 21,2 px); nút Chat và Đầu hàng online ở 360 × 740 phải cuộn khoảng 50 px, không trái `accessibility` vì đó không phải nút chính của khoảnh khắc; 844 × 300 ô 18,9 px; tên rất dài có thể làm dòng lượt ra 3 dòng và bàn dịch 20 px ở 360 px.

### 5. Thao tác

Chế độ, rào xem trước và con trỏ là state riêng của `Board`, không vào `GameRecord`, không gửi đi.

- **Hình học thuần** (`board-geometry.ts`, có unit test): đổi toạ độ bàn sang màn hình theo hướng quay, toạ độ chạm sang rào gần nhất, sang rào đã có gần nhất. Hình trong `rules/` chỉ được import `board-layout`, `ColourSymbol`, `piece-style`, `pieces` (`packages/config/eslint/index.js`), nên phần vẽ dùng lại nằm trong `pieces.tsx`, toạ độ dùng chung nằm trong `board-layout.ts`.
- **Chọn hướng rào: kéo, giữ hướng**. Lần chạm đầu theo đường kẻ gần nhất. Sau đó hướng chỉ đổi bằng Xoay, R, hoặc chạm lại đúng rào. Chỉ nút mới đặt. Kéo từ gần rào (trong 2,5 ô) thì rào đi theo độ dời của ngón, không nhảy, nên đặt tay phía dưới rào được. Số đo: kéo chéo qua cùng một đường, giữ hướng đổi 0 lần còn theo đường kẻ gần nhất đổi 11 lần; mô phỏng tay lệch 6 px, đã giữ hướng trúng 94–99% so với 47–50%.
- **Đường lui**: bỏ kéo (chỉ chạm để dời) cũng đã chạy trong mockup, mọi thao tác chạm của nó có sẵn trong phương án này. Nếu thử trên điện thoại thật thấy kéo khó chịu thì bỏ phần kéo, không đổi spec nào khác ngoài scenario "Kéo giữ hướng", "Kéo để dời rào".
- **Con trỏ**: `pointerdown`, `pointermove`, `pointerup`, `pointercancel` trên lớp phủ có `setPointerCapture`, chỉ nhận `isPrimary` và nút chính; `buttons === 0` lúc di chuyển, `lostpointercapture`, lớp phủ mất, ván kết thúc đều kết thúc lần nhấn. Lớp phủ chỉ tồn tại ở chế độ Đặt rào và Phá rào, nằm ngoài `role="grid"`, với `touch-action: pinch-zoom`: một ngón không cuộn trang, hai ngón vẫn phóng to (spec `accessibility`).
- **Phương án đã loại**: mỗi khe là một nút riêng thì vùng chạm dưới 24 px; kéo rào từ ngoài bàn vào thì che bàn và không dùng được bằng bàn phím.
- **Bàn phím**: ở Đi quân, bàn là một điểm dừng Tab, roving tabindex như Cờ caro, `gridcell > button`. Ở Đặt rào và Phá rào, thêm một phần tử focus riêng (`tabIndex=0`) có tên đọc đổi theo vị trí, vì con trỏ nằm ở giao điểm, không ứng với nút ô nào. Nút xác nhận luôn mounted, dùng `aria-disabled`, để tiêu điểm không rơi về `body`. Nước gửi đi thì tiêu điểm ở lớp phủ tới khi `moveCount` đổi mới về ô có quân của ghế vừa đi (ghế lưu ngay lúc nhấn phím), và chỉ dời nếu tiêu điểm đang ở bàn, hàng điều khiển hoặc `body`, không cướp khỏi chat. Esc và nút Đi quân về quân của người đang tới lượt. Giữ Enter, Space (`event.repeat`) không bấm lần nữa. Phá rào: mũi tên nhảy giữa các rào đã có, PageUp và PageDown đi vòng qua mọi rào.
- **Đọc lên**: vùng `aria-live` đọc dòng xem trước, và nước vừa đi khi chơi cùng máy; dòng xem trước chỉ đổi khi vị trí neo đổi. Câu gợi ý chế độ không live, nếu không sẽ đọc chồng dòng lượt. Không dùng `role="status"` trong `notes` (`every-game.test.tsx` và E2E dùng `getByRole("status")`); không đặt `id` hay state trong `notes` vì `ChatNotes.tsx` vẽ phần tử này hai lần khi chat che; lý do cho `aria-describedby` nằm trong `controls`.
- **Vòng đời**: khoá xem trước bằng `moveCount`, `toMove`, cỡ bàn, số ghế và "ván đã kết thúc" (từ prop `result`, vì đầu hàng và xử bỏ ván không đổi `state`), không so object `state` (online dựng lại khi phòng cập nhật) và không huỷ khi `disabled` như Cờ caro, vì `online-transport.ts` đặt `canMove` false khi mất kết nối, mà kết nối bị ngắt định kỳ là bình thường. Vị trí đổi thì nhả pointer capture. Rào đang gửi vẽ từ xem trước cho tới khi `moveCount` đổi.
- **Tên rào**: theo ô bị ngăn cách, "rào giữa hàng 4 và 5, cột C–D". Phương án "rào ngang ở C5" đã loại: không ai suy ra được neo. `useMoveLabel(move, state)` không có `viewer`, và tên này đúng với mọi hướng quay.

### 6. Hướng bàn

`viewer` là ghế thứ hai trong ván hai người thì quay 180°; còn lại không quay. Quân vẽ thẳng đứng bất kể bàn quay. Tên ô gắn với bàn: cột A–I từ trái sang, hàng 1… từ dưới lên theo góc nhìn ghế đầu.

**Đã loại quay 90° ở ván 3–4 người** (so hai ảnh `4p-quay-90`, `4p-khong-quay`): số hàng chạy ngang, chữ cột chạy dọc, nên "rào giữa hàng 4 và 5" nhìn thành vạch dọc và mũi tên Lên đổi chữ cái. Cờ cá ngựa 4 người cũng không quay. Cái giá: đích của mỗi người ở một hướng khác nhau, bù bằng màu, ký hiệu trên cạnh đích và câu mục tiêu.

### 7. Tên

`fence-race`; tiếng Việt **Cờ rào**, tiếng Anh **Fence Race**, tiếng Nhật **フェンスレース**. Không dùng "Vượt rào": cụm này có nghĩa lóng trong tiếng Việt. Khoá bản dịch `Games.fence-race.*`, `Rules.fence-race.*`.

### 8. Chuyển động

Không có yếu tố ngẫu nhiên nên không cần `outcomes` hay `presentation-hold`; nhịp máy là `AI_MIN_DELAY_MS` 300 ms. Quân trượt khoảng 180 ms (như Cờ vua), rào hiện và biến mất tối đa 300 ms. Chỉ chạy khi có đúng một nước mới, không chạy khi hoàn tác, tải lại, ván mới (cách làm của `chess/Board.tsx`). Có nhánh giảm chuyển động, trạng thái cuối vẫn đúng. Bấm giữa lúc animation chạy là vô hại nên không giữ bàn.

## Risks / Trade-offs

- [Vòng chơi cốt lõi vẫn giống thể loại, nên gần với Quoridor] → Khác về tên, hình, cổng đích, bàn, số rào, không nhảy, được chung ô, phá rào, giới hạn số nước. Lượt duyệt đánh giá cổng đích và lần phá rào là hai điểm tạo khác biệt thật về lối chơi. Đã nêu rõ ở proposal để người dùng quyết định; đây không phải ý kiến pháp lý.
- [Bỏ luật nhảy và cho chung ô làm giảm tương tác giữa các quân] → Đổi lại luật đơn giản hơn, không có trường hợp mơ hồ; lần phá rào bù độ căng.
- [Ván dễ ngã ngũ sớm khi người chơi giỏi] → Ở độ sâu 3 của bản nháp, ai dẫn tại 75% ván thắng 99%. Chưa đo lại với máy đã sửa; phải chơi thật.
- [Số rào chỉ đo bằng máy] → Bảng ở §3: 2 người 56,3 / 43,7%, 68,3 nước; 3 người 35,3 / 33,3 / 31,3%; 4 người 26 / 27,7 / 22,3 / 24%, không chạm ngưỡng. Người thật có thể khác.
- [Ván 3 người lệch nhẹ theo ghế] → Đã đổi thứ tự ghế; số ở §3 không chạm ngưỡng nên giữ 6 rào.
- [Kéo rào chưa thử bằng ngón tay thật, Safari iOS chưa kiểm `pinch-zoom`] → Có đường lui ở §5. Ghi vào danh sách thử thiết bị thật.
- [Mức Khó chậm vì nhánh lớn và mỗi nút phải tìm đường] → Tập nước thu hẹp, giới hạn thời gian sẵn có; số đo ở §3.
- [Test sức mạnh máy lâu: `ai-strength.test.ts` khoảng 1 phút một luồng (cả thư mục `src/fence-race` 49 s, riêng file này từng đo 86 s khi máy bận; trước đó 139 s), vì spec đòi ít nhất 100 ván Khó đấu Vừa] → Khó trong test là `chooseMove` thật dừng đúng sau độ sâu 3 (bọc `applyMove` trong test để nhận ra lần duyệt gốc thứ tư rồi cho đồng hồ hết giờ), không phụ thuộc tốc độ máy và không phí đọc vào độ sâu bỏ dở; mỗi lượt đấu dừng khi đủ số thắng ngưỡng vì các ván còn lại không đổi kết luận. Đây là `chooseMove` thật dừng ở độ sâu 3, không phải cận dưới. Khó ở giới hạn thật chỉ đo ngoài test (§3).
- [Phá rào có thể làm ván dài ra] → Tối đa một lần mỗi người, không hoàn rào, có giới hạn 200 nước.
- [Dòng lượt 16 px nhỏ hơn các game khác] → Cần để câu dài vừa 2 dòng; dùng token game, không ảnh hưởng game khác.
- [Chuỗi en, ja có thể dài hơn tiếng Việt] → Task 3.13 đo bàn đứng yên với cả ba ngôn ngữ.

## Khác thiết kế

Ghi lại khi code và sau hai lượt review. Những điểm đầu không đổi hành vi; các điểm sau, từ "Sau review", có đổi scenario trong delta spec và nói rõ.

- **Tên token `--fence-*` thành `--fence-race-*`**: `theme-css.test.ts` chỉ nhận biến `--game-*` và `--<id game>-*`; đổi tên thì không phải sửa test dùng chung. Giá trị giữ nguyên.
- **`--text-status` nằm trong một rule riêng** của `[data-game="fence-race"]`, ngoài rule màu: không phải màu, không có giá trị tối riêng, và test chỉ đọc rule đầu.
- **`FenceRaceState` thêm `lastBroken`**, `evaluate` đổi trọng số rào và thêm cách tính nước phá (§3): bản đầu làm đúng thiết kế thì lần phá và mức Khó không đạt spec. Spec không đổi; ngưỡng 60% đạt với Khó thật.
- **Luống ruộng vẽ bằng một `path`, không dùng `<pattern>`**: `every-game-rules.test.tsx` chỉ cho `fill` là token, nên `fill="url(#...)"` không qua được; hình giữ nguyên ba loại ruộng, kiểu luống gần như mockup, và bàn nhẹ hơn.
- **Hình cổng trên trang luật không có tên hàng cột, chú thích nói "ngoài cổng" thay cho "cột B"**: cũng test đó không cho chữ A–I giống nhau giữa tiếng Việt và tiếng Nhật (chỉ nhận a–h thường), mà sửa test là sửa `features/rules`. Muốn giữ tên thì chỉ cần thêm `A-I` vào biểu thức của test.
- **Tên người trong dòng dưới bàn và nhãn nổi là màu hoặc "Bạn"; chi tiết kết quả chỉ là màu, vì `useResultDetail` không có `viewer`.** Không phải tên online như ảnh mockup: `BoardProps` và `useResultDetail` không có tên ghế, thêm vào là sửa phần dùng chung. Dòng lượt, bảng người chơi và tiêu đề kết quả vẫn có tên.
- **Tên các cạnh trong tên đọc của ô theo màn hình** ("rào phía trên" là phía trên màn hình của người đó), khớp mũi tên theo màn hình; mockup theo bàn.
- **Dòng dài dưới bàn dùng CSS**, hai dòng rồi dòng phụ rơi ra ngoài khung 36 px; mockup đếm 44 ký tự, không đúng với tiếng Nhật.
- **Câu mục tiêu cũng hiện khi đang chờ người đi trước ở đầu ván** (kèm "Đang chờ …"), để người ngồi ghế sau cũng đọc được, đúng scenario "Câu mục tiêu đầu ván".
- **Kích thước đo trên app thật** (chỗ trống quanh bàn của `PlayScreen` khác mockup một chút, bù được phần lớn bằng margin âm trong phần của game; trang còn đệm dưới 16 px thay vì 8 px): ô 29,6 px thay 30,4 ở 2 người 360 × 740, 24,9 px thay 26,1 ở 4 người, 21 px thay 21,2 ở 4 người online; các khung khác lệch tối đa 3,7 px ở ô (390 × 844, 4 người online, ô 32,4: mockup không đo khung này). Bảng:

Số đo bên dưới lấy với `dvh` lúc tải trang, khi thanh địa chỉ đang hiện `svh` cho cùng số.

| Khung      | Ván              | Ô (px) | Bàn         | Đáy bàn | Đáy hàng chế độ | Đáy Ván mới / Chat | Cuộn dọc |
| ---------- | ---------------- | ------ | ----------- | ------- | --------------- | ------------------ | -------- |
| 360 × 740  | 2 người cùng máy | 29,6   | 298,7 × 358 | 576     | 668             | Ván mới 724        | 0        |
| 360 × 740  | 2 người online   | 26,4   | 269,3 × 322 | 641     | 733             | Chat 789           | 65       |
| 360 × 740  | 4 người cùng máy | 24,9   | 256 × 256   | 574     | 666             | Ván mới 722        | 0        |
| 360 × 740  | 4 người online   | 21     | 221 × 221   | 642     | 734             | Chat 790           | 66       |
| 360 × 640  | 2 người cùng máy | 26     | 266 × 318   | 536     | 628             | Ván mới 684        | 60       |
| 360 × 640  | 2 người online   | 26     | 266 × 318   | 637     | 729             | Chat 785           | 161      |
| 360 × 640  | 4 người cùng máy | 25     | 257 × 257   | 575     | 667             | Ván mới 723        | 99       |
| 360 × 640  | 4 người online   | 25     | 257 × 257   | 678     | 770             | Chat 826           | 202      |
| 390 × 844  | 2 người cùng máy | 36,2   | 358 × 430,4 | 648     | 740             | Ván mới 796        | 0        |
| 390 × 844  | 2 người online   | 35,8   | 354,4 × 426 | 746     | 838             | Chat 894           | 66       |
| 390 × 844  | 4 người cùng máy | 36,2   | 358 × 358   | 676     | 768             | Ván mới 824        | 0        |
| 390 × 844  | 4 người online   | 32,4   | 324 × 324   | 746     | 838             | Chat 894           | 66       |
| 740 × 360  | 2 người cùng máy | 24,4   | 247,3 × 296 | 353     | 289             | Ván mới 341        | 1        |
| 740 × 360  | 2 người online   | 24,4   | 247,3 × 296 | 353     | 342             | Chat 394           | 46       |
| 740 × 360  | 4 người cùng máy | 29,8   | 296 × 296   | 353     | 299             | Ván mới 351        | 3        |
| 740 × 360  | 4 người online   | 29,8   | 296 × 296   | 353     | 378             | Chat 430           | 82       |
| 844 × 300  | 2 người cùng máy | 18,9   | 198,2 × 236 | 293     | 282             | Ván mới 334        | 46       |
| 844 × 300  | 2 người online   | 18,9   | 198,2 × 236 | 293     | 343             | Chat 395           | 107      |
| 844 × 300  | 4 người cùng máy | 23,1   | 236 × 236   | 293     | 282             | Ván mới 334        | 46       |
| 844 × 300  | 4 người online   | 23,1   | 236 × 236   | 293     | 361             | Chat 413           | 125      |
| 844 × 390  | 2 người cùng máy | 27,1   | 271,8 × 326 | 383     | 305             | Ván mới 357        | 1        |
| 844 × 390  | 2 người online   | 27,1   | 271,8 × 326 | 383     | 343             | Chat 395           | 17       |
| 844 × 390  | 4 người cùng máy | 33,1   | 326 × 326   | 383     | 314             | Ván mới 366        | 1        |
| 844 × 390  | 4 người online   | 33,1   | 326 × 326   | 383     | 361             | Chat 413           | 35       |
| 1280 × 800 | 2 người cùng máy | 53,7   | 532,6 × 640 | 752     | 525             | Ván mới 585        | 0        |
| 1280 × 800 | 2 người online   | 53,7   | 532,6 × 640 | 752     | 570             | Chat 630           | 0        |
| 1280 × 800 | 4 người cùng máy | 64,5   | 640 × 640   | 752     | 571             | Ván mới 631        | 0        |
| 1280 × 800 | 4 người online   | 64,5   | 640 × 640   | 752     | 616             | Chat 676           | 0        |

`svh` đặt được bằng CSS của riêng game; ván có `viewer` cùng dùng một mức giữ chỗ, và `:has([data-chat-dock])` phân biệt phòng online có người với đấu máy, vì `BoardProps` không nói online.

Sau review, có đổi delta spec:

- **Tên trong scenario theo code**: "Báo đường dài ra", "Đọc rào quanh ô" theo màu hoặc "Bạn"; "Kết quả hết lượt" tách tiêu đề thẻ (như mọi game) và dòng chi tiết (chỉ màu). Lý do như điểm trên về tên người.
- **Nước vừa đi chỉ nói ở dòng dưới bàn khi chơi cùng máy**: với người chơi cụ thể, dòng lượt đã nói, lặp lại chỉ chiếm chỗ. Viết "Đọc nước đi và kết quả", "Đánh dấu rào vừa phá" theo hai nhánh `viewer`.
- **Máy không bảo đảm phá rào lợi nhất**: nó còn xét nước trả lời, 342 thế cờ ngẫu nhiên đủ điều kiện cũ cho 314 lần chọn rào lợi nhất, 24 lần rào khác, 4 lần đi quân. Scenario "Máy biết phá rào" tả đúng thế cờ của test; thêm "Máy không phá rào vô ích" và "Rào của máy chắn đường đối thủ", đúng điều `usefulBreaks` và `blockingFences` bảo đảm ở mọi mức, vì nước ngẫu nhiên của mức Dễ cũng lấy trong `candidateMoves`.
- **Thêm PageUp, PageDown ở Phá rào**: mũi tên theo hướng không nhảy tới được mọi rào (fuzz lượt săn lỗi: 162/20.000 thế); giữ mũi tên, thêm vòng qua mọi rào theo thứ tự `state.fences`, nói trong tên đọc của lớp phủ.
- **"Ván mới" khi ván chưa kết thúc và chưa ai đi nước nào giữ nguyên rào xem trước và chế độ**: `Board` chỉ nhận `state` và `result`, thế cờ giống hệt nên không có tín hiệu, mà phần dùng chung không được sửa. So object `state` sẽ làm mất xem trước khi nối lại. Thêm scenario "Ván mới khi chưa có gì đổi". Ván đã kết thúc thì `result` về null nên vẫn bỏ.
- **Thêm scenario** cho: dữ liệu sai dạng, nhiều người cùng thắng, ván kết thúc khi đang xem trước, vòng đầu trên thiết bị dùng chung, nhãn nổi ở mép bàn, tiêu điểm khi nước đang gửi và khi bị từ chối, Esc trên thiết bị dùng chung, giữ phím.

## Migration Plan

Không đổi `PROTOCOL_VERSION`, `STORED_ROOM_FORMAT`; không dữ liệu cũ nào bị ảnh hưởng. Rollback: gỡ commit; phòng Cờ rào đang chơi sẽ báo game không tồn tại như mọi `gameId` lạ.
