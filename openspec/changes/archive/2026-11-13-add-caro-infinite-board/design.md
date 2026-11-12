# Design: add-caro-infinite-board

## Context

Cờ caro hiện có hai cỡ bàn 15×15 và 19×19 (`CARO_SIZES`). State giữ bàn dày `size × size` ô. `lines.ts` đi theo hàng và cột của bàn đó. Máy chấm thế cờ trên mọi dãy năm ô, tính sẵn cho mỗi cỡ (`WINDOWS[size]`). `Board.tsx` vẽ một lưới vuông vừa khung giấy vở `min(--board-room, 37.5rem)`. Người chơi muốn bàn lớn hơn nhiều, tốt nhất là vô hạn (góp ý 13/11/2026), và đã chọn "Bàn vô hạn tự nở" cho mọi chế độ.

Người dùng yêu cầu implement và merge luôn ngày 13/11/2026. Mockup trong `mockup/` vì vậy là tài liệu tham chiếu chứ không chờ duyệt (task 0.2). Ảnh `pnpm ui:shots` là chỗ kiểm cuối.

## Goals / Non-Goals

**Goals**

- Thêm cỡ "Vô hạn" mà không đổi engine, session, transport, protocol, server hay màn hình chơi chung.
- Ván vô hạn thật chạy nhanh như ván 19×19: máy, phát lại biên bản, vẽ bàn.
- Đầu ván trông như bàn 15×15 người chơi đã quen. Bàn chỉ lớn ra khi cần.
- Biên bản luôn có cận, để server và bộ kiểm tra hợp đồng chạy được.

**Non-Goals**

- Bàn không giới hạn thật.
- Ảo hoá ô.
- Pinch để thu phóng bàn.
- Minimap.
- Luật mở đầu.

Xem mục "Ngoài phạm vi" của proposal.

## Decisions

### 1. Giới hạn ẩn 61×61, bàn dày, chỉ số ô cố định

Bàn vô hạn là bàn dày `61 × 61` (`CARO_INFINITE.cap`) với `size: 61` trong state. Ô đánh số `row × 61 + col` như mọi bàn, nên những phần sau dùng lại nguyên vẹn:

- `lines.ts`: `stepFrom`, `winningRuns`, `wouldWin`;
- `moveKey`;
- mã lỗi;
- hàng thắng;
- `result-detail`.

Tên ô không đổi khi vùng nở. Cạnh lẻ để có một ô giữa: hàng 31, cột 31.

**Phương án đã cân nhắc**

| Phương án                                  | Vì sao không chọn                                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bàn thưa (danh sách quân theo toạ độ)      | Phải viết lại `lines.ts`, máy và bàn vẽ. `applyMove` rẻ hơn (chép vài chục quân thay vì 3.721 ô), nhưng số đo ở §3 cho thấy bàn dày đủ nhanh.                                                           |
| Toạ độ âm hay tương đối với ô giữa         | Tên ô kiểu "hàng −3" khó đọc bằng trình đọc màn hình.                                                                                                                                                   |
| Đánh số lại theo vùng (hàng 1 là mép vùng) | Tên một ô đổi mỗi khi vùng nở ở trên hay bên trái. Lời báo nước cũ và tiêu điểm bàn phím sẽ sai.                                                                                                        |
| Giới hạn 51 hay 81 (đo ở §3)               | 51 hơi chật: một thế trận kéo về một phía chạm mép sau khoảng 20 hàng. 81 làm phát lại một ván ngẫu nhiên dài và bộ kiểm tra hợp đồng chậm gấp khoảng ba lần, trong khi ván thật không bao giờ cần tới. |

### 2. Vùng đặt được trong state

State có `area: { top, left, bottom, right }` (chỉ số hàng và cột tính từ 0, gồm cả hai đầu) **ở mọi cỡ bàn**:

- Bàn 15×15 và 19×19 có vùng là cả bàn, và không bao giờ nở, vì phép nở luôn bị cắt theo bàn. Nhờ vậy `legalMoves` chỉ có một đường code.
- Bàn vô hạn có thêm `infinite: true`. Giao diện và máy đọc cờ này. Không đoán từ `size`.

Luật của vùng:

- `setup`: bàn vô hạn bắt đầu với vùng hàng và cột 23 tới 37 (chỉ số 0), tức hàng và cột 24 tới 38 khi đếm từ 1.
- `applyMove`: vùng mới là hình chữ nhật nhỏ nhất chứa vùng cũ và ô vừa đặt nới thêm `CARO_INFINITE.margin = 5` về mỗi phía, cắt theo `[0, size − 1]`.
- Lề 5 là đủ để một chuỗi năm quân đi ra từ quân ngoài cùng về mọi hướng mà không chạm mép vùng. Lề 5 cũng lớn hơn `CANDIDATE_RADIUS = 2`, nên mọi ô máy xét luôn nằm trong vùng. Máy không phải lọc gì thêm, và có test giữ điều này.
- `legalMoves`: các ô trống trong vùng.
- Hoà khi `filled === size²`. Vùng đầy thì quân ngoài cùng nằm sát mép vùng, nên vùng chỉ đầy khi đã bằng cả giới hạn. `legalMoves` vì thế chỉ rỗng khi ván đã hết.
- Hoàn tác và nối lại dựng state bằng cách phát lại, nên vùng luôn đúng với thế cờ. Không cần lưu thêm gì.

Tuỳ chọn:

- `CARO_SIZES = [15, 19, "infinite"]` là thứ tự hiển thị.
- `parseCaroOptions` nhận `"infinite"`.
- Biên bản và phòng cũ không có giá trị này nên đọc như trước.
- Kiểm tra hợp đồng `option-choices` chấp nhận giá trị chuỗi không có dấu chấm.

### 3. Máy và số đo

Ở bàn vô hạn, `caroEvaluate` chỉ chấm các dãy năm ô **có quân**: duyệt quân trong vùng, với mỗi hướng lấy năm dãy chứa quân đó, bỏ dãy trùng. Dãy trống được 0 điểm, dãy có cả X và O cũng 0, nên tổng giống hệt cách chấm mọi dãy. Có test so hai cách trên cùng thế cờ. Bàn 15×15 và 19×19 giữ `WINDOWS[size]` như cũ.

`caroCandidateMoves` không đổi:

- Ô gần quân, bán kính 2.
- Bàn trống thì đi ô giữa: hàng 31, cột 31.

Số đo bằng script tạm (`tsx`, Node 24, máy dev) với luật trên. Máy được hỏi ở thế cờ sau 30 nước do máy mức Vừa tự chơi.

| Đo                                                        | Bàn vô hạn (61)                                       | 19×19    |
| --------------------------------------------------------- | ----------------------------------------------------- | -------- |
| Máy mức Vừa (độ sâu 2), trung vị / lớn nhất               | 15 / 20 ms                                            | 7 / 8 ms |
| Máy mức Khó, giới hạn 1.500 ms                            | dùng hết hạn (1.501 ms)                               | 1.500 ms |
| Một lần `evaluate`                                        | 62 µs (bản đo duyệt cả bàn; bản thật duyệt vùng)      | 37,5 µs  |
| Một lần `applyMove` (chép bàn)                            | 14,8 µs                                               | 1,6 µs   |
| Ván ngẫu nhiên (200 ván): số nước trung vị / dài nhất     | 923 / 1.446                                           | –        |
| Vùng cuối ván ngẫu nhiên                                  | luôn chạm 61×61                                       | –        |
| Phát lại biên bản 1.249 nước (khớp khoá qua `legalMoves`) | 69 ms                                                 | –        |
| Ván thật (máy Vừa hoặc Dễ, 6 ván)                         | 10–48 nước; quân trải tối đa 11×11; vùng tối đa 21×21 | –        |

So với giới hạn khác (cùng script):

| Giới hạn | Máy Vừa   | Ván ngẫu nhiên trung vị / dài nhất | 200 ván ngẫu nhiên |
| -------- | --------- | ---------------------------------- | ------------------ |
| 51       | 12 ms     | 727 / 1.127                        | 3,8 s              |
| **61**   | **15 ms** | **923 / 1.446**                    | **6,5 s**          |
| 81       | 21 ms     | 1.384 / 2.100                      | 18,5 s             |

Kết luận:

- Giới hạn 61 giữ máy mức Vừa dưới 25 ms. Mức Khó vẫn theo hạn chung `AI_TIME_LIMIT_MS`.
- Bộ kiểm tra hợp đồng dùng `maxPlies: 3721` và `timeout` 60 s, ở file riêng `infinite-contract.test.ts` để Vitest chạy song song với các file khác. Các kiểm tra đóng băng mọi danh sách nước hợp lệ (tới 3.721 ô mỗi lượt), nên với seed 1 hai tổ hợp mất 219 s. Seed được chọn trong 60 seed đầu là hai ván ngẫu nhiên ngắn nhất (35: 300 nước với "chặn hai đầu", 27: 320 nước với "tự do"), còn khoảng 56 s. Cả gói `@board-games/games` chạy 87 s trên máy dev.
- Chép bàn 3.721 ô ở mỗi nút tìm kiếm làm mức Khó đi kém sâu hơn một chút trong cùng thời hạn. Chấp nhận được: mức Khó vẫn thấy chuỗi bốn và chặn như trên 19×19 (test hiện có chạy thêm với bàn vô hạn).

### 4. Nhãn nước đi và tên ô

Hàng và cột đếm từ 1 theo giới hạn, như mọi bàn (`row + 1`, `col + 1`). `move-label.ts` và tên ô trong `Board.tsx` không cần nhánh riêng. Nước đầu ở giữa là "hàng 31, cột 31".

Đã cân nhắc đánh số từ ô giữa (0, 0). Cách đó cần số âm, và không giống cách gọi ô ở hai bàn kia.

### 5. Bàn trên màn hình

**Bàn 15×15 và 19×19 giữ nguyên** hình và hành vi. Code chung được tổng quát hoá theo "vùng hiện" (`view`): bàn cố định có vùng hiện là cả bàn.

**Khung**

- Bàn vô hạn dùng cùng khung giấy vở: dải lề đỏ bên trái, viền, bóng, `w-[min(var(--board-room,100%),37.5rem)]`, vuông.
- Phần lưới là **khung cuộn gốc của trình duyệt** (`overflow: auto`, `data-caro-frame`). Bên trong là cả vùng, mỗi ô `cellPx` px.
- Cuộn bằng con lăn, thanh cuộn, bàn di chuột và vuốt ngón tay đều có sẵn.
- `overscroll-x-contain`: kéo ngang tới mép bàn không làm trang cuộn ngang. Chiều dọc vẫn nối với trang, để trên điện thoại vẫn cuộn được trang qua bàn.

**Mức thu phóng**

- Bốn mức, tính bằng số cột thấy trong khung: `ZOOM_STEPS = [25, 19, 15, 11]`, mặc định 15.
- `cellPx = độ rộng khung / số cột`. Cỡ của vùng viết bằng đơn vị `cqw` của khung (`@container`), nên đúng ngay từ lần vẽ đầu, chưa cần đo. Phép cuộn đọc `cellPx` từ `offsetWidth` của vùng. `ResizeObserver` chỉ dùng cho luật chạm hai lần.
- Ở mức mặc định, vùng đầu ván 15×15 vừa khít khung, nên trông như bàn 15×15: không thanh cuộn, ô cùng cỡ.
- Vùng nhỏ hơn khung (khi thu nhỏ) thì nằm giữa khung, phần còn lại là giấy trống.

**Đường kẻ**

- SVG phủ cả vùng.
- Đường đậm mỗi 5 ô tính theo **chỉ số của giới hạn** (`(area.top + i) % 5`), nên không nhảy khi vùng nở.
- Bàn vô hạn không vẽ chấm vở: chấm đặt theo mép bàn sẽ chạy theo vùng.

**Vùng nở không làm bàn giật**

- `useLayoutEffect` so vùng mới với vùng trước.
- Vùng thêm `k` hàng phía trên thì `scrollTop += k × cellPx`; thêm cột bên trái cũng vậy với `scrollLeft`.
- Việc này chạy trước khi vẽ, nên các ô đang thấy đứng yên.

**Đổi mức thu phóng giữ tâm**

- Trước khi đổi, ghi ô ở tâm khung (theo đơn vị ô).
- Sau khi vẽ ở `cellPx` mới, cuộn để ô đó lại ở tâm.

**Theo nước mới**

- Mỗi khi nước vừa đi đổi (của mình, của người kia, của máy) mà ô đó không nằm trọn trong khung, khung cuộn vừa đủ để thấy ô đó, tính trên chính khung bằng `frame.scrollTo`.
- Không dùng `scrollIntoView`, vì nó cuộn cả trang.
- `behavior: "smooth"`, trừ khi `prefers-reduced-motion: reduce` thì `"auto"`.
- Nước của mình luôn đang thấy sẵn, nên chỉ nước của người khác làm khung cuộn.

**"Về nước vừa đi"** cuộn để ô nước vừa đi nằm giữa khung. Chưa có nước thì nút ở dạng `aria-disabled`, kèm lý do "Chưa có nước nào".

**Thu nhỏ bàn / Phóng to bàn**

- Nút chỉ có icon (`ZoomOutIcon`, `ZoomInIcon`), có `aria-label`, cỡ 44 px.
- Ở mức cuối thì `aria-disabled`, kèm lý do "Đã nhỏ nhất" hay "Đã lớn nhất".
- Ba nút nằm trong phần `controls` của `BoardParts` (cột bên phải trên máy tính, dưới bàn trên điện thoại), trên dòng gợi ý chạm hai lần.
- Bàn cố định không có ba nút này.

**Kéo bằng chuột**

- Nhấn nút trái trên khung rồi di quá 4 px thì là kéo: khung cuộn theo chuột, con trỏ `grabbing`, và cú click sau cú kéo bị bỏ, nên không đặt quân.
- Không kéo thì click đặt quân như cũ.
- Cảm ứng dùng cuộn gốc: trình duyệt tự huỷ click khi ngón tay đã trượt.

**Bàn phím**

- Mũi tên, Home và End đi trong vùng.
- Ô được focus bằng `focus({ preventScroll: true })`, rồi khung cuộn vừa đủ để thấy ô đó (cùng hàm với "theo nước mới"). Trang không bị kéo theo.
- Tab vào bàn: ô có tiêu điểm gần nhất, rồi ô nước vừa đi, rồi ô giữa.

**Chạm hai lần:** `smallCells = cellPx < 24`, như hiện nay (ở 360 px, mức 15 cột cho ô khoảng 21 px).

**Hàng thắng** vẽ trong toạ độ của vùng (tâm ô trừ `area.left`, `area.top`), cùng SVG với đường kẻ.

**Số ô vẽ ra**

- Vẽ mọi ô của vùng: thường dưới 25×25 (625 ô). Tệ nhất 61×61 (3.721 ô), chỉ xảy ra với ván đánh ngẫu nhiên rất dài.
- `Cell` đã `memo`. Tên ô chỉ tính cho ô trong vùng.
- Ảo hoá để sau (Ngoài phạm vi).

**Chip luật** lấy nhãn tuỳ chọn theo cách chung: "Vô hạn · Chặn hai đầu". Không thêm số ô vào chip, để màn hình chơi chung không phải biết vùng.

### 6. Chữ và icon

Khoá mới trong `vi.json`, `en.json` và `ja.json`:

| Khoá                                            | vi                               |
| ----------------------------------------------- | -------------------------------- |
| `Games.caro.options.size.values.infinite`       | Vô hạn                           |
| `Games.caro.view` (tên nhóm nút)                | Xem bàn                          |
| `Games.caro.zoomOut`, `Games.caro.zoomIn`       | Thu nhỏ bàn, Phóng to bàn        |
| `Games.caro.zoomMin`, `Games.caro.zoomMax`      | Đã nhỏ nhất, Đã lớn nhất         |
| `Games.caro.toLastMove`, `Games.caro.noMoveYet` | Về nước vừa đi, Chưa có nước nào |

Sửa thêm:

- `tagline` thành "bàn 15×15, 19×19 hoặc vô hạn".
- Câu luật thành "Bàn 15×15, 19×19 hoặc vô hạn… Bàn vô hạn bắt đầu 15×15 và tự nở khi quân tới gần mép".

Icon: thêm `ZoomIn`, `ZoomOut`, `LocateFixed` vào `packages/ui/src/icons.ts`. Đó là chỗ duy nhất import `lucide-react`. Chỉ thêm tên xuất.

**Không thêm token màu:** nút dùng `Button` chung, khung dùng `bg-game-board` và `border-game-line` có sẵn, nên không có tỉ số tương phản mới phải tính. Vòng focus của ô vẫn là `focus-ring` trên nền giấy, đã đạt 3:1 ở `add-caro-game`.

## Risks / Trade-offs

- **Ván ngẫu nhiên dài làm vùng chạm 61×61 (3.721 ô DOM).** Chỉ bộ kiểm tra hợp đồng và người cố tình rải quân mới gặp. Vẫn chạy được nhờ `memo`; nếu chậm thì ảo hoá theo khung nhìn.
- **Cuộn mượt trên iOS khi bù cuộn lúc vùng nở.** Bù chạy trong `useLayoutEffect` trước khi vẽ. Nếu Safari còn đang cuộn quán tính, bàn có thể nhích một nhịp. Thêm vào danh sách thử thiết bị thật ở M8.
- **Máy mức Khó đi kém sâu hơn trên bàn vô hạn** vì chép bàn lớn hơn. Đã đo: vẫn trong hạn, vẫn qua các test chặn chuỗi.
- **Kéo bằng chuột lẫn với click.** Ngưỡng 4 px, và bỏ đúng một click sau cú kéo. Test component giữ cả hai.

## Migration Plan

Không cần chuyển dữ liệu:

- Ván dở, biên bản và phòng cũ có `size` 15 hoặc 19 vẫn đọc như trước.
- State luôn được dựng lại từ biên bản, nên trường `area` mới có ngay.
- Client cũ (tab mở trước khi deploy) gặp phòng vô hạn thì `parseCaroOptions` của nó từ chối `invalid-options`, và màn hình báo lỗi như với mọi tuỳ chọn lạ. Tải lại trang là hết.

## Open Questions

Không còn. Lề 5 và giới hạn 61 đã chốt bằng số đo ở §3. Người dùng có thể đổi sau khi chơi thử mà không phải đổi định dạng: cả hai chỉ là hằng số, nhưng đổi giới hạn sẽ làm biên bản vô hạn cũ đọc sai ô, nên phải tăng phiên bản nếu đổi.
