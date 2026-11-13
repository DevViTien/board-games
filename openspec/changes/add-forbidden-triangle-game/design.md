# Design

## Context

Game hai người theo lượt, không có yếu tố ngẫu nhiên, nước đi rời rạc. Vì vậy game đi đúng khuôn của Tic-tac-toe:

- một `GameDefinition` trong `packages/games`;
- máy chơi là bộ tìm kiếm alpha-beta chung của engine (`chooseMove`): đào sâu dần tới hết thời gian, dựa trên `evaluate` và `candidateMoves`;
- màn hình chơi, transport, phòng online dùng chung.

Thư mục bị ảnh hưởng, theo chiều phụ thuộc của plan.md §3.2:

- `packages/games/src/forbidden-triangle/` (luật thuần, chỉ phụ thuộc `engine`);
- `apps/web/src/games/forbidden-triangle/` (giao diện);
- mỗi registry một dòng;
- `apps/web/messages`.

## Goals / Non-Goals

**Goals:**

- Luật nhỏ, test được hết: thua khi khép tam giác cùng màu, hoà khi hết dây, ba cỡ bàn.
- Máy không bao giờ tự thua khi còn đường; mức Khó chơi hoàn hảo ở bàn 5 khách và rất mạnh ở bàn 6, 7.
- Bàn dùng tốt bằng chạm, chuột, bàn phím và trình đọc màn hình. Màu không phải tín hiệu duy nhất.

**Non-Goals:** ba người, bàn 8 khách trở lên, biến thể đếm tam giác (proposal, Ngoài phạm vi).

## Decisions

### 1. Số đo trước khi thiết kế

Đo bằng một bộ giải trong scratchpad, ngày 13/11/2026.

| Bàn             | Chơi hoàn hảo      | Giải hết                                     | Ngẫu nhiên không tự thua: hoà / người đi trước thua / số nước |
| --------------- | ------------------ | -------------------------------------------- | ------------------------------------------------------------- |
| 5 khách, 10 dây | hoà                | 10.758 thế, 3 ms                             | 11% / 31% / 10                                                |
| 6 khách, 15 dây | người đi sau thắng | 112.096 thế, 28 ms (gộp đối xứng: 3.641 thế) | 0% / 50% / 14                                                 |
| 7 khách, 21 dây | người đi sau thắng | gộp 5.040 đối xứng: 294.002 thế, 2,1 s       | 0% / 60% / 18                                                 |

Hệ quả cho thiết kế:

- Mặc định là bàn 6 khách: không bao giờ hoà, ván khoảng 14 nước.
- Bàn 5 khách là bản "thấy được vì sao cần 6". Bàn 7 khách là bản dài hơn.
- Người đi sau có lợi khi chơi hoàn hảo. Online, "Chơi lại" đã xoay ghế nên ai cũng được đi sau một ván. Khi đấu với máy, màn bắt đầu ván đã có lựa chọn "Ai đi trước".
- Trang luật nói thẳng điều này như một sự thật toán học thú vị.

### 2. State và nước đi

```ts
type ForbiddenTriangleOptions = { guests: 5 | 6 | 7 };
interface ForbiddenTriangleState {
  guests: 5 | 6 | 7;
  lines: readonly (PlayerIndex | null)[]; // one per pair, pairs ordered (0,1), (0,2) … (n-2,n-1)
  toMove: PlayerIndex;
  last: number | null; // the line just drawn
  lost: { player: PlayerIndex; triangle: readonly [number, number, number] } | null;
}
type ForbiddenTriangleMove = { line: number };
```

- **Một nước là chỉ số của một cặp khách.** Đây là định danh ổn định và gọn cho biên bản online. Hàm `pairOf(guests, line)` và `lineOf(guests, a, b)` đổi qua lại giữa chỉ số và cặp khách.
- **Kết quả**:
  - `lost` khác `null`: `win` cho người kia, lý do `triangle`;
  - hết dây mà `lost` vẫn `null`: `draw`, lý do `full`.
- **Nước tự thua là nước hợp lệ**, đúng luật gốc. Màn hình cảnh báo và hỏi xác nhận (§4).
- Hàm dùng chung cho luật, máy và giao diện:
  - `closesTriangle(state, player, line)` trả về khách thứ ba nếu nối dây đó khép tam giác, không thì `null`;
  - `safeLines(state, player)`.

### 3. Máy

- **`candidateMoves`** là các dây an toàn của người đến lượt, hoặc mọi dây khi không còn dây an toàn. Hợp đồng đòi giữ mọi nước thắng ngay và mọi nước chặn đối thủ thắng ngay: ở game này không có nước nào như thế, vì người ta chỉ thua bởi nước của chính mình. Mức Dễ chọn ngẫu nhiên trong các nước này, nên không bao giờ tự thua khi còn đường.
- **`evaluate`** = (số dây an toàn của mình − số dây an toàn của đối thủ) × 10.
  - Người hết dây an toàn ở lượt mình thì thua.
  - Đây là thước đo tự nhiên của thế cờ, tìm tới hết ván thì thay bằng điểm thắng hay thua thật.
- **Các mức** dùng `LEVEL_PROFILES` chung:
  - Dễ: độ sâu 1 và 40% nước ngẫu nhiên an toàn;
  - Vừa: độ sâu 2;
  - Khó: đào sâu tới hết thời gian.
- **Bàn 6 khách**: engine không có bảng ghi nhớ thế cờ, nên tìm tới hết ván từ đầu ván vượt 5 triệu nút. Mức Khó vì vậy tìm sâu dần trong 1,5 giây, rồi tới hết ván khi còn ít dây. Đo ngày 13/11/2026 với 1,5 giây thật: máy Khó cầm Xanh thắng 20/20 ván ở bàn 6 khách và 8/8 ở bàn 7, nước chậm nhất 1,5 giây. Test dùng ngân sách theo số lần đọc đồng hồ (`ticking`), nên đo theo số nút như nhau trên mọi máy. Thêm bảng ghi nhớ vào engine thì mức Khó sẽ hoàn hảo, nhưng việc đó thuộc change khác.
- **Bàn 7 khách**: mức Khó tìm sâu nhất trong thời gian cho phép, không cam kết hoàn hảo.

### 4. Màn hình chơi

**Bàn** là SVG vuông. Khách đặt trên vòng tròn, bắt đầu ở đỉnh, đi theo chiều kim đồng hồ.

**Vị khách**:

- là nút tròn có chữ A–G;
- vùng chạm ít nhất 44 px: bàn 7 khách ở 360 px rộng khoảng 320 px, khoảng cách giữa hai khách kề nhau khoảng 125 px nên đủ chỗ.

**Dây**:

- chỗ chưa nối là chấm mảnh (`--game-line`);
- vòng bàn tiệc mang màu và kiểu nét của người đến lượt (Đỏ liền, Xanh đứt), để thấy lượt ngay trên bàn; hết ván thì mờ;
- dây Đỏ là nét liền dày (`--game-mark-1`);
- dây Xanh là nét đứt dày (`--game-mark-2`), để không chỉ dựa vào màu;
- dây vừa nối có quầng đặc (`--game-last-move`, 3:1 trên nền bàn);
- tam giác thua tô nền trong suốt màu người thua, viền đậm.

**Thao tác**, hai bước:

1. **Chọn khách thứ nhất.** Khách được vòng đậm (`--game-highlight`). Các khách khác có trạng thái:
   - an toàn: viền màu người đến lượt, dây xem trước bằng chấm tròn (khác nét đứt của Xanh và chấm mảnh của chỗ chưa nối);
   - nguy hiểm: viền đứt màu cảnh báo, huy hiệu ⚠ (dạng chữ, U+FE0E, để không thành emoji vàng), dây xem trước chấm tròn màu cảnh báo;
   - đã có dây: đĩa vẫn đặc, viền chấm, chữ mờ, `aria-disabled`.
2. **Chọn khách thứ hai.** Nối ngay nếu an toàn. Nếu nguy hiểm thì mở `ConfirmDialog` "Nối A–C sẽ khép tam giác A–B–C của bạn và bạn thua." với hai nút "Để sau" và "Vẫn nối".

Chọn lại khách đang chọn, hay bấm Esc, thì bỏ chọn. Lựa chọn đang dở bị bỏ khi lượt đổi hay ván mới bắt đầu.

**Bàn phím**: các khách là một nhóm roving tabindex. Mũi tên trái và lên đi ngược chiều kim đồng hồ, phải và xuống đi xuôi chiều. Enter hoặc Space để chọn.

**Trình đọc màn hình**:

- tên nút khách nêu dây đã nối theo màu, và khi đã chọn khách thứ nhất thì nêu trạng thái của dây tới khách đó;
- mô tả bàn liệt kê dây theo màu (như "Mô tả bàn" của các game khác).

**Bảng người chơi** (`useSeatSummary`): "Còn 5 dây an toàn". Hết dây an toàn ở lượt mình thì ghi "Nước nào cũng khép tam giác".

**Lời báo**: nước đi là "nối A–C"; dòng dưới kết quả là "Đỏ khép tam giác A–B–C." hoặc "Đã nối hết dây, không ai khép tam giác.".

### 5. Token (sáng / tối)

Các giá trị nằm trong `apps/web/src/games/forbidden-triangle/theme.css`, phạm vi `[data-game="forbidden-triangle"]`. Tỉ số tương phản do `theme-css.test.ts` kiểm và ghi vào bảng sau khi đo.

| Biến                                        | Vai trò                                     |
| ------------------------------------------- | ------------------------------------------- |
| `--game-board`                              | nền bàn tiệc (khăn trải bàn kem / xanh đêm) |
| `--game-line`                               | chỗ chưa nối, ≥ 3:1 trên nền bàn            |
| `--game-mark-1`                             | dây Đỏ                                      |
| `--game-mark-2`                             | dây Xanh                                    |
| `--game-last-move`                          | quầng dây vừa nối                           |
| `--game-highlight`                          | khách đang chọn                             |
| `--forbidden-triangle-danger`               | ký hiệu nước tự thua                        |
| `--forbidden-triangle-guest` / `-guest-ink` | mặt và chữ của vị khách                     |

### 6. Tên

|            | vi           | en          | ja       |
| ---------- | ------------ | ----------- | -------- |
| Game       | Tam giác cấm | No Triangle | 三角禁止 |
| Người chơi | Đỏ, Xanh     | Red, Blue   | 赤, 青   |

Khách gọi bằng chữ A–G ở mọi ngôn ngữ.

### 7. Kiểm tra

- **Luật**:
  - test theo từng scenario;
  - `describeGameContract` (bộ kiểm hợp đồng chung) với ván ngẫu nhiên;
  - 1.000 ván ngẫu nhiên ở bàn 6 khách không ván nào hoà;
  - ván hoà ở bàn 5 khách bằng vòng và đường chéo.
- **Máy**:
  - không tự thua;
  - Khó cầm Xanh thắng 50/50 ván ở bàn 6 khách;
  - đo thời gian một nước Khó ở bàn 7 khách.
- **Component**: thao tác hai bước, cảnh báo và xác nhận, Esc, bàn phím, tên đọc được, dòng dây an toàn.
- **E2E**:
  - cùng máy chơi tới khi một người khép tam giác;
  - đấu với máy;
  - online hai trình duyệt;
  - điện thoại 360 px với bàn 7 khách.
- **Ảnh**: cảnh mới trong `ui-shots`, xem sáng/tối × 390/1280 và 360 px.

### 8. Không có mockup duyệt trước

`board-games-ui` đòi mockup HTML được duyệt trước khi code. Ngày 13/11/2026, người dùng bảo làm thẳng tới khi game chơi được đủ và sẽ duyệt bằng cách chạy local trước khi merge. Vì vậy hướng hình ảnh được chốt ở §4, và lần chạy local của người dùng thay cho bước duyệt mockup. Góp ý sau lần đó sửa ngay trên code.

## Khác thiết kế

Sau hai lượt review (săn bug, rà `web-design-guidelines`):

- vòng bàn tiệc báo lượt (mục "Lượt của ai" trong checklist của `board-games-ui`);
- tam giác thua có viền mực dày vẽ dưới các dây và nền đậm hơn; quầng dây vừa nối đặc màu;
- dây xem trước là chấm tròn, không trùng kiểu nét của Xanh;
- dòng hướng dẫn dưới bàn luôn cao hai dòng, không nhắc Esc (màn chạm không có Esc);
- hết ván, bảng người chơi ghi số dây mỗi người đã nối thay cho số dây an toàn;
- bàn ít khách hơn bàn trước (ván mới đổi luật trên cùng màn hình) vẫn giữ chỗ dừng Tab trên bàn.

## Risks / Trade-offs

- [Cảnh báo nước tự thua làm game dễ hơn bản gốc] → Kỹ năng thật của game là dồn đối thủ tới chỗ hết dây an toàn, và cảnh báo không lộ điều đó. Còn nối nhầm vì không nhìn ra tam giác chỉ gây bực mình, nhất là trên điện thoại. Có thể thêm tuỳ chọn tắt cảnh báo sau khi chơi thử.
- [Người đi sau có lợi] → Online, "Chơi lại" xoay ghế. Đấu với máy, người chơi chọn được ai đi trước. Trang luật nói rõ.
- [Bàn 7 khách: máy Khó chậm trên điện thoại] → máy dừng theo thời gian cho phép của engine. Test đo một nước trên máy dev, và nếu chậm thì thu hẹp `candidateMoves` theo thứ tự nước tốt.
