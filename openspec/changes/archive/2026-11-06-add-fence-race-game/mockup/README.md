# Mockup Cờ rào

Mockup chơi được để duyệt trước khi code. Luật viết thật (`js/rules.js`: BFS, đè, cắt, bịt kín đường); mọi con số trên màn hình là tính ra, không gõ tay.

Mở `index.html` bằng trình duyệt, không cần máy chủ. Bảng bên trái chọn khung, sáng/tối, trạng thái, cách kéo rào, vẽ ngón tay. Thử nhanh một khung: `index.html?bare&scene=place2&vp=360x740&theme=dark`. Thử bằng điện thoại thật cần phục vụ thư mục này qua mạng nội bộ; `?drag=keep|nearest|nodrag` chọn cách thao tác.

Ảnh trong `png/` (44 ảnh), tên theo `trạng thái-khung-sáng|tối`. Không có `assets/`: mọi hình là SVG sinh từ `js/draw.js`.

## Hướng hình ảnh

Đồng làng nhìn từ trên xuống, vẽ mực trên giấy dó: mỗi ô là một thửa ruộng (lúa non, lúa chín, đất cày, loại ruộng đi theo ô nên hai người thấy cùng một tấm bản đồ), rào là nét mực đậm có đốt, quân là chiếc nón lá nhìn từ đỉnh với ký hiệu ● ■ ▲ ◆ ở chóp, đích là một cổng làng theo màu người chơi, phủ 5 ô giữa của cạnh đối diện. Ban đêm là đồng dưới trăng, rào đổi thành nét trắng trăng.

Không dùng: ô xanh, nền cỏ, hàng caro đích, rào gỗ nâu, rào tre xanh, nhân vật 3D.

## Cổng đích

Luật người dùng chốt: đích là **5 ô giữa** của cạnh đối diện (cột C–G hay hàng 3–7), không còn cả cạnh. Thứ tự ghế 3 người là dưới, trên, trái. Hết lượt ở nước 200, ván 3 người ở nước 198.

Cách vẽ, phân biệt với 4 ô ngoài cổng **không chỉ bằng màu**:

- Cổng là một khối có hình: hai cột trụ, mái dài vểnh hai đầu, đỉnh nhọn ở giữa, có viền `--piece-*-line`. Mỗi cột trụ mang ký hiệu của người chơi.
- 4 ô ngoài cổng chỉ có tên hàng cột in trực tiếp trên tấm giấy, như lề sách, không có khối nào.
- Cổng của người đến lượt (hay người thắng) màu đặc, chữ `--piece-*-ink`. Cổng khác nhạt (`color-mix` 24%), chữ `--fg`, viền vẫn rõ.
- Ô nhỏ: tên ô sát cổng (B, H, hàng 2, 8) tránh sang ngoài vừa đủ cho cột trụ, không ra khỏi ô của nó.
- Thắng: ô về đích có khung `--game-win` và 4 ngôi sao, quân có vòng, cổng của người thắng đặc.

**Không thêm token nào.** Xem ảnh `4p-khong-quay-360x740-sang` và `-toi` (ô 21,2 px): đọc được cả bốn cổng, nhờ màu, ký hiệu ● ■ ▲ ◆ cao khoảng 8 px trên cột trụ, và đích nằm ở cạnh riêng. Rõ nhất là cổng đặc; hai cổng nhạt xanh lá và vàng phải nhìn ký hiệu nhiều hơn nhìn màu. Chữ trong cổng 10 px ở khung này.

Câu mục tiêu đầu ván: `Về cổng màu đỏ ● ở cạnh trên trước mọi người.` Trang luật thêm hình cổng (quân ở cột B chưa thắng, đi dọc cạnh một bước vào cột C). Thẻ menu vẽ cổng trên 3 trong 5 cột.

## Bố cục đã chốt theo lượt duyệt kiến trúc

Từ trên xuống ở điện thoại: thanh trên, dòng lượt, bảng người chơi, bàn, dòng đọc (2 dòng, 36 px), **một hàng nút 44 px**, hàng nút chung.

- Hàng nút: `[Đi quân][Đặt rào][Phá rào]` là nút tự vẽ `aria-pressed` + `aria-disabled`, chỉ có chữ (`RadioGroup` không có disabled; icon đi quân, rào, phá chưa có và thêm phải sửa `packages/ui`). Khi đang xem trước đổi thành `[Xoay][Huỷ][Đặt rào]`, khi phá thành `[Huỷ][Phá rào]`. Chỉ `RotateCwIcon` có sẵn được dùng.
- Bàn cao theo `dvh` chứ không theo chiều rộng: phần còn lại sau khi trừ những thứ phải thấy. Hai người ở 360 × 740 ra 306 × 366, còn lề 27 px mỗi bên để cuộn.
- Bảng người chơi dùng cho cả 2 ghế, không dùng thanh trên và dưới bàn. Dòng tóm tắt: `5 rào · phá · 7 bước`, đã dùng thì `đã phá`.
- `--text-status` hạ xuống 16 px ở điện thoại, chỉ trong `[data-game="fence-race"]` (mục "Giữ bàn đứng yên").

## Cách chọn hướng rào: đã thử, đề xuất

Đề xuất **Kéo, giữ hướng**, và nó đã gồm luôn mọi thao tác của phương án bỏ kéo:

1. Lần chạm đầu của một lượt: rào nằm trên đường kẻ gần nhất (ngang hay dọc do chỗ chạm).
2. Từ đó **hướng chỉ đổi bằng nút Xoay, phím R, hoặc chạm lại đúng rào** (cùng giao điểm). Chạm nơi khác: rào dời tới đó, giữ hướng. Kéo: giữ hướng.
3. Kéo từ gần rào (trong 2,5 ô) thì rào đi theo độ dời của ngón, không nhảy, nên có thể đặt tay phía dưới rào để khỏi che. Chạm xa hơn là đặt lại ở đó.
4. Chỉ nút mới đặt. Chạm hai lần chỉ xoay, không bao giờ đặt nhầm.

Số đo so sánh:

| Câu hỏi | Kết quả |
| --- | --- |
| Kéo cùng một đường chéo 60 bước (touch thật qua CDP), sau khi đã xoay | Giữ hướng: **0** lần đổi hướng. Đổi theo đường kẻ gần nhất: **9–11** lần đổi qua các lần chạy, kết thúc sai hướng người chơi đã xoay |
| Chạm một phát trúng rào mong muốn, tay lệch 6 px, ô 26/30/36 px (mô phỏng Monte Carlo) | Nhắm giao điểm, chưa có hướng: **47–50%** (hướng là tung đồng xu). Nhắm giao điểm, đã giữ hướng: **94–99%**. Nhắm 1/4 dọc rào, chưa có hướng: 52–69% |
| Kéo trên bàn (`touch-action: pinch-zoom`, ở 360 × 640) | Trang không cuộn, rào đi theo |
| Vuốt ở lề 47 px cạnh bàn trong khi đang đặt rào | Trang cuộn tới hết (47 px) |
| Hai ngón trên bàn | Trang phóng to (1,29–1,87 lần qua các lần chạy), rào đứng yên: chỉ nhận con trỏ chính |
| Bỏ kéo (`touch-action: manipulation`) | Vuốt trên bàn cuộn trang, rào đứng yên; chạm dời rào, giữ hướng |

**Vì sao không bỏ kéo.** Bỏ kéo sạch hơn thật: trang luôn cuộn được, không có ngón tay che lúc chọn, code ít hơn hẳn (không capture con trỏ, không nhãn nổi). Nhưng cái hay của game là dò xem chặn chỗ nào đau nhất: kéo một đường qua sáu vị trí thấy số bước đổi liên tục; bỏ kéo thì sáu lần chạm. Trang ở 360 × 740 không cần cuộn nên kéo không mất gì; ở 360 × 640 vẫn cuộn được bằng lề và bảng người chơi. Mọi thao tác chạm của phương án bỏ kéo vẫn dùng được trong phương án này.

Nói thật: những con số trên đo bằng touch giả lập và mô phỏng. **Chưa ai thử bằng ngón tay thật.** Nếu thử trên máy thấy kéo khó chịu thì bỏ kéo là đường lui rẻ, chỉ đổi spec "Đặt rào có xem trước" và "Dùng được trên điện thoại".

**Ngón che điểm chạm** (ảnh `cham-keo-*`, ngón vẽ bằng toggle "Vẽ ngón tay"): khi cầm ngay trên rào dọc, nửa dưới rào bị che, chỉ còn đầu trên. Khi kéo từ phía dưới thì thấy trọn. Trong lúc kéo trên điện thoại có nhãn nổi `Minh: 6 → 9 bước` (hoặc lý do) đặt ngay trên điểm cao hơn trong hai điểm: rào và ngón, không che rào. Sang ngang hoặc máy tính không có nhãn, vì cột bên cạnh không bị tay che.

## Số đo

Đo lại sau khi đổi sang cổng; kích thước bàn không đổi vì cổng nằm trong phần lề sẵn có. Đo bằng Playwright, chromium, `file://`. "Hàng nút" là đáy hàng 44 px, "Ván mới" là đáy nút.

### Kích thước và điều phải thấy

| Khung | Ván | Ô (px) | Bàn | Đáy bàn | Đáy hàng nút | Đáy Ván mới / Chat | Cuộn dọc |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 360 × 740 | 2 người cùng máy | 30,4 | 306 × 366 | 583 | 675 | 735 | 0 |
| 360 × 740 | 4 người cùng máy | 26,1 | 267 × 267 | 584 | 676 | 736 | 0 |
| 360 × 740 | 2 người online | 26,4 | 270 × 322 | 638 | 730 | Chat 790 | 50 |
| 360 × 740 | 4 người online, không quay | 21,2 | 223 × 223 | 639 | 731 | Chat 791 | 51 |
| 360 × 640 | 2 người cùng máy | 26 | 266 × 318 | 535 | 627 | 687 | 47 |
| 360 × 640 | 4 người cùng máy | 25 | 257 × 257 | 574 | 666 | 726 | 86 |
| 390 × 844 | 2 người cùng máy | 36,2 | 358 × 430 | 647 | 739 | 799 | 0 |
| 390 × 844 | 4 người cùng máy | 36,2 | 358 × 358 | 675 | 767 | 827 | 0 |
| 390 × 844 | 2 người online | 35,9 | 355 × 427 | 743 | 835 | Chat 895 | 51 |
| 844 × 390 | 2 người cùng máy | 27 | 271 × 325 | 382 | 304 | 356 | 0 |
| 844 × 390 | 4 người cùng máy | 33,1 | 326 × 326 | 383 | 313 | 365 | 1 |
| 844 × 390 | 2 người online | 27 | 271 × 325 | 382 | 368 | Chat 420 | 42 |
| 740 × 360 | 2 người cùng máy | 24,3 | 247 × 295 | 352 | 289 | 341 | 0 |
| 740 × 360 | 4 người cùng máy | 29,7 | 295 × 295 | 352 | 300 | 352 | 4 |
| 740 × 360 | 2 người online | 24,3 | 247 × 295 | 352 | 368 | Chat 420 | 72 |
| 844 × 300 | 2 người cùng máy | 18,9 | 198 × 236 | 293 | 282 | 334 | 46 |
| 844 × 300 | 4 người cùng máy | 23,1 | 236 × 236 | 293 | 282 | 334 | 46 |
| 844 × 300 | 2 người online | 18,9 | 198 × 236 | 293 | 368 | Chat 420 | 132 |
| 1280 × 800 | 2 người | 53,7 | 533 × 641 | 753 | 525 | 585 | 0 |
| 1280 × 800 | 4 người | 64,5 | 641 × 641 | 753 | 571 | 631 | 0 |

Đọc bảng theo `openspec/specs/accessibility`:

- **360 × 740, cùng máy, 2 và 4 người**: bàn, dòng lượt, hàng nút, trọn "Ván mới" trong màn hình, không cuộn. Đạt.
- **360 × 740, online**: bàn, dòng lượt, trọn hàng nút chính trong màn hình. Chat và Đầu hàng phải cuộn 50 px. Spec chỉ đòi nút chính nên đạt, nhưng xem "Chưa ưng".
- **360 × 640**: cuộn dọc tới thì bàn và "Ván mới" nằm trọn: 2 người cần 470 px, 4 người 409 px, chỗ có là 583 px. Đạt.
- **Ngang**: cả bàn nằm trong chiều cao màn hình ở mọi khung, bàn dính khi cột bên cạnh cuộn.
- **Không cuộn ngang** ở cả 7 khung × 17 trạng thái. Đo cả `#scroller` lẫn trang.
- Trang luật 360 px: 2 363 px, thẻ menu: không cuộn.

### Vùng chạm

Ô đi được nhỏ nhất **24 × 24 px**. Ở ô dưới 26 px, vùng bấm ô đi được nới ra ngoài ô, về phía xa quân: ít nhất 24 × 28 px, hai vùng chéo nhau chỉ chồng một góc 2–3 px. Thử bằng touch thật ở 844 × 300 (ô 18,9 px): chạm vào giữa vùng thì đi đúng ô. Mọi nút và liên kết ≥ 24 × 24 px (0 phần tử vi phạm ở mọi khung); nút chế độ, Xoay, Huỷ, Đặt rào cao 44 px.

### Bàn không dịch chuyển

- Đổi chế độ, xem trước, xoay, rào sai, Huỷ, chọn phá, về Đi quân: **1 vị trí bàn duy nhất** ở cả 7 khung, 2 và 4 người.
- Nước của đối thủ online (đi quân, đặt rào, rào hàng hai chữ số, phá rào × đến lượt hay đang chờ): cùng một vị trí bàn ở cả 7 khung.

### Giữ bàn đứng yên khi có nước đối thủ

Câu đầy đủ `Minh vừa đặt rào giữa cột C và D, hàng 10–11. Đến lượt bạn (Xanh dương)` có 71 ký tự. Đo ở 360 px:

| Cỡ chữ dòng lượt | Dòng | Giữ chỗ | Ô 2 người online | Bàn dịch |
| --- | --- | --- | --- | --- |
| 20 px (mặc định) | 3 | 75 px | khoảng 23 px (tính) | 0, nhưng bàn nhỏ |
| 17,5 px, giữ 2 dòng | 2 hoặc 3 | 44 px | khoảng 26 px | **21,6 px** với rào hàng hai chữ số (đo) |
| **16 px, giữ 2 dòng (đã chọn)** | 2 | 40 px | 26,4 px | **0**, trừ tên rất dài |

Đề xuất: (1) ghi đè `--text-status` trong `theme.css` của game, không phải sửa phần dùng chung; (2) `min-height` 2 dòng cho dòng lượt khi có `viewer`; (3) `min-height` cho bảng người chơi online, vì dòng của bạn xuống hàng khi tới lượt (`Đến lượt` + `Đã kết nối` + tóm tắt không vừa ở 360 px) làm cao thêm 18 px.

Còn lệch: tên dài (`Nguyễn Hoàng Minh`) ra 3 dòng, bàn dịch 20 px ở 360 px. Muốn chặn hẳn thì giữ 3 dòng, ô online còn khoảng 24 px.

### Tương phản (thấp nhất, tính từ token thật lấy trong trang, 65 cặp mỗi giao diện)

| | Sáng | Tối |
| --- | --- | --- |
| Chữ (cần 4,5) | 5,00 chữ phụ trên trang | 4,64 chữ trên cổng đỏ đang lượt |
| Đồ hoạ (cần 3) | 3,08 rào trên bờ ruộng | 3,03 bờ ruộng trên lúa chín |
| Rào trên ruộng | 10,08 | 9,91 |
| Rào xem trước | 4,00 | 4,49 |
| Rào không hợp lệ | 4,20 | 4,95 |
| Dấu ô đi được, dấu nước vừa đi | 10,08 | 9,91 |
| Viền quân trên ruộng | 6,95 | 10,31 |
| Ký hiệu trên quân | 5,11 | 4,64 |
| Tên hàng cột ngoài cổng | 5,47 | 7,23 |
| Chữ trên cổng đặc (thấp nhất, đỏ) | 5,11 | 4,64 |
| Chữ trên cổng nhạt (thấp nhất) | 10,49 | 8,64 |
| Viền cổng trên tấm giấy | 4,18 | 4,43 |
| Viền ô thắng trên nền ô | 3,51 | 6,56 |

Không cặp nào dưới ngưỡng. Hai điểm cần biết: đường ngắn nhất màu vàng trực tiếp trên ruộng đất chỉ 2,78 ở chế độ sáng, nhưng các chấm có viền giấy (4,41 với viền) và đây là gợi ý phụ, số bước vẫn có bằng chữ. Rào, dấu, đường đi đều có viền giấy (`--fence-halo`) nên đè lên nhau vẫn tách được.

Màu không là tín hiệu duy nhất: bốn quân có ký hiệu; ô đi được có chấm; rào hợp lệ có hai đầu tròn, rào sai rỗng, gãy đôi, có ✕; rào chọn phá có viền và vết nứt; rào vừa đặt có khung nét đứt; chỗ vừa phá có đường viền nét đứt; ô vừa rời có hình vuông nét đứt; cổng có hình riêng và ký hiệu, ô ngoài cổng không có khối; người đến lượt có vòng quanh quân và cổng đặc, cổng khác nhạt.

## Token cần thêm

Trong `apps/web/src/games/fence-race/theme.css`, `[data-game="fence-race"]`. Không thêm gì vào `packages/ui`. Bản đầy đủ: `css/theme.css`.

| Token | Sáng | Tối | Dùng cho | Tỉ số thấp nhất (sáng / tối) |
| --- | --- | --- | --- | --- |
| `--game-page` | `#ece7d6` | `#16150f` | Trang | chữ phụ 5,00 / 6,55 |
| `--game-tint` | `#f5f1e1` | `#211f15` | Tấm giấy dưới bàn, nền artwork | tên hàng cột 5,47 / 7,23 |
| `--game-board` | `#e6e3ad` | `#34381f` | Ruộng lúa non | |
| `--fence-plot-2` | `#efd98f` | `#433a19` | Ruộng lúa chín | |
| `--fence-plot-3` | `#dcc39b` | `#3e2e20` | Ruộng đất cày | |
| `--game-line` | `#78663c` | `#8d855a` | Bờ ruộng | 3,27 / 3,03 với ruộng |
| `--fence-row` | `#bcae79` | `#4e4d33` | Luống trong ruộng (trang trí) | không cần |
| `--fence-frame` | `#3f3621` | `#b9af82` | Mép tấm giấy | |
| `--fence-wall` | `#1c1830` | `#f7f0d8` | Rào | 3,08 / 3,27 với bờ; 10,08 / 9,91 với ruộng |
| `--fence-halo` | `#fbf7e8` | `#16150f` | Mép giấy quanh rào, dấu, đường | 16,0 với rào |
| `--fence-preview` | `#5b34e6` | `#a894ff` | Rào xem trước, rào chọn phá (đúng giá trị `--accent`) | 4,00 / 4,49 |
| `--fence-bad` | `#a42a21` | `#ff8a7e` | Rào không hợp lệ (đúng giá trị `--danger-ink`, `--danger`) | 4,20 / 4,95 |
| `--fence-bad-ink` | `#ffffff` | `#1f1a12` | Dấu ✕ | |
| `--game-highlight` | `#1c1830` | `#f7f0d8` | Chấm ô đi được, vòng lượt | 10,08 / 9,91 |
| `--game-last-move` | `#1c1830` | `#f7f0d8` | Nét đứt nước vừa đi | 10,08 / 9,91 |
| `--text-status` | `clamp(1rem, 0.85rem + 0.8vw, 1.625rem)` | như sáng | Dòng lượt nhỏ hơn | |

Cổng dùng `--piece-*`, `--piece-*-ink`, `--piece-*-line` sẵn có; cổng nhạt là `color-mix(--piece-* 24%, --game-tint)`. Đổi sang cổng không thêm token. Ô về đích dùng `--game-win` + `--celebration-soft`.

## Đã kiểm

- Luật: 52 kiểm tra Node, gồm các scenario luật của spec `fence-race` (đè, cắt, bịt kín cả mình và người khác, quân không chắn đường, phá rào, hết lượt thắng và hoà) và phần cổng mới: đúng 5 ô giữa ở cả 4 cạnh, ô A, B, H, I không thắng, đi dọc cạnh vào cổng được, rào chặn đường dọc cạnh tính đúng số bước, số bước tính tới cổng, túi có chứa ô cạnh nhưng không tới được cổng vẫn là bịt kín, cổng người khác không tính, 198 nước khi ba người, về đích ở nước cuối là thắng do về đích. Mọi trạng thái mở ra đều xây bằng luật; đã kiểm thêm nước vừa đi không xuyên rào và không ai đang đứng sẵn trong cổng. Ván ngẫu nhiên 2, 3, 4 người, mỗi loại 60 ván: đều kết thúc, luôn còn đường. Số 6 → 9 và 9 → 7 trong ảnh là tính theo cổng.
- Touch thật qua CDP: chạm, kéo, xoay, dời, đặt, hai ngón, cuộn, ô đi được ở ô 18,9 px.
- Bàn phím: Tab tới bàn sau 5 phím; mũi tên, Enter đi quân; nút chế độ bằng Enter thì chuyển tiêu điểm vào bàn; mũi tên dời rào, R xoay, Enter đặt; Enter trên rào sai không đặt; Esc về Đi quân và tiêu điểm về ô quân; mũi tên chọn rào để phá; bàn quay 180°: mũi tên lên đúng hướng màn hình (D5 → D4). Nút chế độ tắt vẫn focus được, có lý do.
- Rào đang gửi online: **0** trong 140 khung hình thiếu rào, từ lúc bấm tới sau khi máy chủ trả lời (mô phỏng chậm 1,5 giây).
- Bốn quân chung ô: xem phóng lớn ở ô 26 px và 36 px, bốn ký hiệu đều phân biệt được, người đến lượt là khung vuông quanh ô. Chưa xem ở ô 21 px (4 người online) và 23 px (844 × 300).
- Xem bằng mắt sau khi đổi sang cổng: 2 người đi quân và đặt rào ở 360 × 740 (sáng và tối), 4 người 360 × 740 và 1280 × 800, 4 người ô 21 px sáng và tối, 3 người, 844 × 300, thắng 360 × 740, luật 360 × 740, menu. Các ảnh khác đã chụp lại nhưng chưa mở xem từng cái. Chữ có dấu chồng (Đặt rào, Đến lượt, Hoàn tác, Bịt kín đường) đọc tốt ở mọi cỡ đang dùng (12 px trở lên; riêng tên hàng cột 10–15 px là chữ và số không dấu).

## Ý kiến

**Quay bàn:** đã chốt, chỉ quay 180° ở ván 2 người (spec "Bàn quay theo người chơi"). Trạng thái `Đã loại: quay 90°` và ảnh `4p-quay-90` chỉ còn để đối chiếu. Mockup mặc định không quay ở ván 3–4 người.

**Đường ngắn nhất: không cần nút bật, chỉ tự hiện khi xem trước.** Đã thử luôn bật (toggle trong bảng): 2 người tạm ổn, 4 người là một mớ chấm che cả rào và dấu ô đi được. Còn hiện đúng đường của người bị đổi số bước trong lúc xem trước thì giải thích ngay vì sao "6 → 9". Trong game không có nút nào cho việc này.

**Nhãn cùng máy.** App cùng máy không có tên người, chỉ có màu. Toggle "Nhãn như app cùng máy" cho thấy `Xanh dương: 6 → 9 bước` và `Bịt kín đường của Xanh dương` vẫn gọn một dòng (đo ở lượt trước, chưa đo lại). Tên Lan, Minh trong ảnh cùng máy là để dễ đọc.

## Chưa ưng

- **4 người online ở 360 × 740**: phải bóp ô còn 21,2 px, bàn 223 px trong khi cột rộng 328 px, vì bảng 4 dòng ăn 210 px. Dùng được, nhưng là khung kém nhất. Phương án: ô 25 px và cuộn 38 px (trái với spec nếu coi đây là bắt buộc). Bốn người cùng máy thì ổn (26,1 px).
- **Chat và Đầu hàng online ở 360 × 740 phải cuộn 50 px**, không có số tin chưa đọc trong màn hình đầu. Bong bóng chat có sẵn trong app sẽ đỡ phần này, mockup này không vẽ.
- **844 × 300**: ô 18,9 px, chữ tên hàng 10 px, hai chữ số sát mép. Là khung có thanh trình duyệt, thu thanh đi là về 844 × 390. Online ở khung này phải cuộn cột 132 px mới tới Chat.
- **Dòng lượt 16 px** nhỏ hơn mọi game khác. Nếu không chịu được thì đổi cách gọi rào cho ngắn hơn, không thì bàn dịch hoặc bàn nhỏ.
- **Nón lá** ở ô dưới 30 px đọc gần như đồng tiền có vòng, chữ "nón" chỉ người được kể mới thấy. Không hại vì ký hiệu vẫn rõ; ở máy tính thì đúng ý hơn.
- **Kết thúc hoà ở 360 × 740**: nút Hoàn tác và Làm lại lệch 10 px dưới mép; nút chính (Ván mới trong thẻ) vẫn thấy.
- **Cổng ở ô nhỏ:** ở 21 px đọc được nhưng chật: chữ 10 px, ký hiệu khoảng 8 px, tên B và H sát cột trụ, hàng 2 và 8 sát đầu cột. Ở 18,9 px (844 × 300) hình đỉnh mái và đuôi mái gần như mất, cổng còn lại là một khối màu có ký hiệu, vẫn phân biệt được với ô ngoài cổng.
- **Hai cổng nhạt** vàng và xanh lá ở chế độ sáng khá gần nhau khi đều không tới lượt; chỉ ký hiệu và vị trí tách chúng ra.

## Vấn đề về luật và spec

- Số đo bot ở bản trước làm trên cả cạnh nên đã xoá. Số so sánh theo cổng là trong `design.md`; lượt này không chạy lại bot.
- **Câu mục tiêu theo màu**: ván hai người màu của cổng là màu của chính mình, nên "Về cổng màu đỏ ● ở cạnh trên" dễ hiểu; đã kiểm câu đó ở ván 2 người, ván 3–4 người không quay thì câu này càng cần vì mỗi người đi một hướng.
- **Ván 3 người**: cạnh trái không có cổng của ai, chỉ có tên hàng. Đã có trạng thái `Ván 3 người`, ảnh `3p-dau-van`.
- **Spec "Đọc được rào quanh ô"**: mockup đọc thêm "cổng đích của ..." trong tên ô; spec chưa đòi. Nên giữ, vì màu và hình của cổng không tới được trình đọc màn hình.
- `fenceName` vẫn dùng dạng `C5` làm khoá nội bộ; chữ hiển thị thì không.

## Chưa kiểm được

- Ngón tay thật trên điện thoại thật: mọi đo về chạm là touch giả lập trên Chromium. Safari iOS chưa thử, đặc biệt `touch-action: pinch-zoom` và thanh địa chỉ co giãn.
- Trình đọc màn hình thật: chỉ kiểm thuộc tính (`aria-live`, `aria-pressed`, `aria-disabled`, nhãn ô), chưa nghe bằng NVDA hay VoiceOver.
- Bản dịch en, ja: chưa có; chuỗi Nhật và Anh có thể dài hơn, nhất là cách gọi rào ở dòng lượt.
- Các con số `--board-room` thật: mockup tính kích thước bàn bằng JS với chiều cao biết trước; code thật làm bằng CSS `dvh`, cần chiều cao các phần xung quanh đúng như thế. Chiều cao hàng người chơi 42 px và thẻ kết quả là đo trên mockup bắt chước `PlayerPanel`, `ResultCard`, chưa đo trên app.
