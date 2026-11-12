# Ý tưởng: Board Games Hub — App chơi cờ trên trình duyệt

> Bản nháp ý tưởng · cập nhật 30/10/2026 · các quyết định đã chốt xem [mục 9](#9-quyết-định-đã-chốt)

## 1. Tầm nhìn

Một web app chạy hoàn toàn trên trình duyệt, mở ra là thấy **menu các trò chơi bàn cờ**, chọn một game là chơi ngay: không cần cài đặt, không cần tài khoản. Có **3 cách chơi**:

1. **Cùng máy**: 2–4 người chơi chung một thiết bị.
2. **Với máy**: đấu AI nhiều mức độ khó (riêng cờ vua chưa có ở giai đoạn đầu).
3. **Online**: gửi link mời cho bạn bè, đồng nghiệp là vào chơi cùng.

Online là một trụ cột của sản phẩm chứ không phải tính năng thêm vào sau: kiến trúc được thiết kế để mọi game đều chơi online được ngay khi luật đã viết xong.

**Quy mô**: dự án cá nhân, phi thương mại, phục vụ một nhóm nhỏ bạn bè và đồng nghiệp. Ưu tiên đơn giản, chạy được trên gói miễn phí, không cần các tính năng cộng đồng lớn như ghép trận với người lạ hay bảng xếp hạng công khai.

Điểm khác biệt:
- **Kho cờ truyền thống Việt Nam**: cờ tướng, cờ caro, ô ăn quan, cờ gánh, cờ cá ngựa… ít nơi gom đủ và làm đẹp, càng ít nơi cho chơi online.
- **Vào ván online trong vài giây**: gửi link là bạn vào chơi, chỉ cần nhập tên.
- **Nhẹ, nhanh, chơi offline** (PWA): mở trên điện thoại như một app; mất mạng vẫn chơi được với máy hoặc cùng máy.
- **Kiến trúc "plug-in game"**: thêm game mới chỉ cần viết luật theo một interface chung; menu, AI, lưu ván, undo và **online** đều dùng lại.

## 2. Người dùng mục tiêu

| Nhóm | Nhu cầu |
|---|---|
| Bạn bè, đồng nghiệp ở xa | Gửi link vào nhóm chat, mọi người vào chơi ngay, không cần đăng ký |
| Gia đình, bạn bè ngồi cạnh nhau | Mở nhanh trên laptop/tablet, 2–4 người chơi chung một máy |
| Người chơi một mình lúc rảnh | Đấu với AI có nhiều mức độ khó |
| Người mới | Có hướng dẫn luật, gợi ý nước đi hợp lệ |

## 3. Danh sách game trong menu

Chỉ chọn **game truyền thống/dân gian/cổ điển** (luật thuộc phạm vi công cộng) và **game tự thiết kế**, tránh tái tạo các board game thương mại có bản quyền.

**3 game làm trước (MVP): Cờ caro, Cờ cá ngựa, Cờ vua.** Ba game này phủ đủ các dạng khó của kiến trúc: đặt quân trên bàn lớn (caro), nhiều người + xúc xắc (cá ngựa), luật di chuyển phức tạp (cờ vua).

### 3.1 Cờ dân gian Việt Nam

| Game | Bàn | Độ khó cài đặt | AI | Ưu tiên |
|---|---|---|---|---|
| Cờ caro (Gomoku) | Lưới 15×15, 19×19 hoặc vô hạn (tự nở, giới hạn ẩn 61×61; người dùng chọn 13/11/2026) | Dễ | Heuristic + minimax | **MVP** |
| Cờ cá ngựa | Bàn hình chữ thập, 2–4 người, xúc xắc | Trung bình | Luật ưu tiên (đá quân > lên chuồng > ra quân…) | **MVP** |
| Ô ăn quan | 10 ô dân + 2 ô quan | Dễ | Minimax (cây nhỏ) | v1 |
| Cờ gánh | Lưới 5×5 có đường chéo | Trung bình | Minimax | v1 |
| Cờ tướng | 9×10 | Khó (luật tướng đối mặt, chiếu…) | Alpha-beta | v1 |

### 3.2 Cờ cổ điển thế giới

| Game | Bàn | Độ khó cài đặt | AI | Ưu tiên |
|---|---|---|---|---|
| Tic-tac-toe | 3×3 | Rất dễ | Minimax đầy đủ | **Giai đoạn 0** (game mẫu) |
| Cờ vua | 8×8 | Khó (nhập thành, bắt tốt qua đường, phong cấp, hoà lặp 3 lần) | **Chưa làm**: MVP chỉ có cùng máy + online | **MVP** |
| Reversi | 8×8 | Dễ | Alpha-beta + bảng trọng số ô | v1 |
| Cờ đam (Draughts) | 8×8 | Trung bình | Alpha-beta | v1 |
| Cờ cối xay (Nine Men's Morris) | 24 điểm | Trung bình | Alpha-beta | v1 |
| Ô vuông (Dots and Boxes) | Lưới chấm | Dễ | Heuristic chuỗi | v1 |
| Cờ vây | 9×9 / 13×13 / 19×19 | Khó (đếm điểm, ko) | MCTS | v2 |

### 3.3 Game tự thiết kế (bản sắc riêng của app)

Đã có:

- **Cờ rào** — 2–4 người, đua quân về cổng làng ở cạnh đối diện (5 ô giữa của cạnh) và đặt rào làm người khác đi xa hơn, không được bịt kín đường của ai; mỗi người có một lần phá rào, quân không chặn nhau và được đứng chung ô. Bàn 11 × 9 khi hai người, 9 × 9 khi ba hoặc bốn người; ván luôn kết thúc nhờ giới hạn số nước.
- **Đội gom thạch** — 2–4 người **cùng phe**, mỗi người một nhân vật có số trên một bản đồ chung; mỗi lượt tối đa 5 bước rồi "Xong lượt"; đẩy thạch như Gom thạch, nhân vật chắn nhau, cửa mở khi có người hay thạch đứng trên nút cùng ký hiệu (● ▲ ■); cả đội thắng khi mọi ô khuôn có thạch đúng loại, hết vòng thì không ai thắng. Ba bản đồ (Hai gian bếp, Chợ đêm, Kho lạnh) × bố cục 2, 3, 4 người; chơi cùng máy và online, không có máy chơi (quyết định 21 ở mục 9).

Một vài phác thảo để phát triển thêm:

- **Cờ Sen** — bàn lục giác, mỗi người đặt "lá sen" để nối hai bờ hồ đối diện; đặt lá cạnh lá đối thủ thì có thể lật lá đó nếu kẹp được giữa hai lá của mình. Kết hợp ý tưởng nối đường và lật quân.
- **Đua Thuyền Rồng** — 2–4 người, mỗi lượt chọn bài số (không xúc xắc) để tiến thuyền trên sông có xoáy nước và dòng chảy; bài đã dùng thì phải chờ một vòng mới lấy lại được.
- **Chợ Phiên** — game đặt quân giành ô hàng trên bàn 6×6, mỗi ô cho điểm khác nhau theo cụm hàng hoá liền kề.

Các game gốc làm sau khi kiến trúc ổn định (v2+), vì cần thời gian thử luật và cân bằng; Cờ rào được đưa lên làm sớm (quyết định 17 ở mục 9).

### 3.4 Luật cờ cá ngựa: các biến thể

Cờ cá ngựa là trò dân gian nên mỗi nơi chơi một kiểu. Phần chung hầu như ai cũng chơi giống nhau:

- 2–4 người, mỗi người 4 ngựa cùng màu, xuất phát từ chuồng ở một góc bàn.
- Ngựa chạy một vòng quanh đường chung theo cùng chiều, đến cửa chuồng đích của mình thì đi lên các bậc chuồng (đánh số 1–6) ở giữa bàn.
- Mỗi lượt gieo xúc xắc rồi chọn một ngựa để đi đúng số chấm. Không đi được ngựa nào thì mất lượt.
- Đi đúng vào ô có ngựa đối thủ thì **đá** ngựa đó về chuồng.

Những điểm hay khác nhau giữa các nơi:

| # | Điểm luật | Cách chơi phổ biến (đề xuất làm mặc định) | Biến thể khác |
|---|---|---|---|
| 1 | Số xúc xắc | 1 con | 2 con, cộng tổng hoặc đi riêng từng con |
| 2 | Điều kiện ra quân | Gieo được **6** | Gieo được **1 hoặc 6**; dùng 2 xúc xắc thì đổ đôi mới ra quân |
| 3 | Gieo lại | Gieo **6** được gieo thêm một lượt | Không gieo lại; hoặc gieo lại khi ra 1 và 6; ra 6 ba lần liên tiếp thì mất lượt |
| 4 | Vượt qua ngựa khác | **Không được** đi vượt qua ngựa đang đứng chắn trên đường (cả của mình lẫn của đối thủ) | Được nhảy qua mọi ngựa |
| 5 | Hai ngựa mình cùng ô | Không được | Được, và hai ngựa đứng chung tạo thành "rào" không ai vượt qua được |
| 6 | Ô xuất phát | Ngựa đối thủ đứng ở ô xuất phát của mình sẽ bị đá khi mình ra quân | Ô xuất phát là ô an toàn, không ai bị đá ở đó |
| 7 | Lên bậc chuồng đích | Từ cửa chuồng, gieo **1** lên bậc 1; đang ở bậc n thì phải gieo đúng **n+1** mới lên bậc tiếp | Chỉ cần gieo đúng số ô còn lại để vào đích, không chia bậc |
| 8 | Điều kiện thắng | Người đầu tiên đưa đủ 4 ngựa lên chuồng đích (thường phải chiếm các bậc cao 3–6) | Chỉ cần 4 ngựa vào đích, không tính bậc; hoặc chơi tiếp để xếp hạng nhì, ba, tư |

Cách làm đề xuất: MVP dùng **cột "phổ biến"** làm luật mặc định, viết luật sao cho mỗi điểm trên là một tuỳ chọn (`LudoOptions`). Từ v1 cho phép chủ phòng bật/tắt các điểm 2, 3, 4, 7 khi tạo phòng, vì đó là các điểm hay gây cãi nhau nhất. Luật đang dùng hiện ngay ở đầu phòng để mọi người cùng biết.

## 4. Tính năng

### 4.1 Cốt lõi (MVP)
- Màn hình **menu dạng lưới thẻ**: hình minh hoạ, tên, số người chơi, thời gian một ván, nhãn độ khó.
- Lọc/tìm theo: số người, thể loại (dân gian VN / cổ điển / tự thiết kế), thời lượng.
- Chế độ chơi: **cùng máy**, **đấu với máy** (Dễ / Vừa / Khó, trừ cờ vua) và **online qua link mời** (xem 4.3).
- Highlight nước đi hợp lệ, hiệu ứng di chuyển quân.
- **Hoàn tác / làm lại** (chơi offline), chơi lại ván mới.
- **Tự động lưu ván đang chơi** (đóng tab mở lại vẫn còn).
- Trang **luật chơi** ngắn gọn cho từng game, có hình minh hoạ.
- Responsive: dùng tốt trên điện thoại, cả dọc lẫn ngang.
- Giao diện **tối giản phẳng**, có chế độ sáng/tối.
- **Đa ngôn ngữ: tiếng Việt, tiếng Anh, tiếng Nhật.** Tự theo ngôn ngữ trình duyệt, đổi được trong app và nhớ lựa chọn. Link mời không chứa ngôn ngữ, nên mỗi người mở link thấy app bằng ngôn ngữ của mình.

### 4.2 Mở rộng (v1)
- **PWA**: cài lên màn hình chính, chơi offline.
- Lịch sử ván, xem lại từng nước (replay).
- Thống kê cá nhân: thắng/thua theo game, chuỗi thắng.
- Âm thanh đặt quân (bật/tắt).

**Sau v1**: thêm các **theme** (bàn gỗ, bàn tre, giấy dó…). Từ đầu mọi màu sắc, bo góc, bóng đổ đều lấy từ design token (CSS variables), nên thêm theme chỉ là thêm một bộ token, không phải sửa component.

### 4.3 Online
**MVP: chơi với bạn bè**
- Tạo phòng → nhận **link mời / mã phòng 6 ký tự** → gửi vào nhóm chat, bạn mở là vào ván.
- Không có tài khoản: lần đầu vào thì nhập **tên tạm**, lưu trong `localStorage` để lần sau khỏi nhập lại.
- Phòng 2–4 người cho cờ cá ngựa; ghế trống có thể cho AI chơi thay.
- **Kết nối lại tự động**: rớt mạng, đóng tab hay kết nối bị server ngắt (xem 6.3), mở lại vẫn vào đúng ván, đúng lượt.
- Đầu hàng; xử thua (hoặc cho AI chơi thay, với cá ngựa) khi bỏ ván quá lâu.

**v1: hoàn thiện**
- Mã QR cho phòng.
- Chủ phòng chọn biến thể luật (cờ cá ngựa, xem 3.4).
- Đồng hồ thời gian cho mỗi bên (tuỳ chọn), xử thua khi hết giờ.
- Đề nghị hoà, xin đi lại (đối thủ phải đồng ý).
- Chat trong phòng: gõ tự do, câu có sẵn, emoji (quyết định 16, mục 9).

**v2: cho nhóm bạn**
- Xem người khác chơi (spectator).
- **Phòng cố định của nhóm** (ví dụ "Team Dev"): một link dùng lâu dài, xem ai đang chơi gì, bảng thành tích trong nhóm theo tên tạm.
- Lịch sử các ván online của nhóm.

Không làm (không cần cho nhóm nhỏ): ghép trận với người lạ, tài khoản/đăng nhập, xếp hạng Elo công khai, báo cáo/chặn người chơi.

### 4.4 Hộp công cụ

Ngoài các game, app có một **Hộp công cụ** (`/tools`) cho những buổi chơi ngoài đời. Công cụ đầu tiên là **Ghi điểm đánh bài**: tạo nhóm 2–8 người, sau mỗi ván một người nhập điểm, để trống một người thì app tự tính để tổng bằng 0; xem xếp hạng, lịch sử các ván, gợi ý ai chuyển cho ai bao nhiêu điểm, và chia sẻ tổng kết thành chữ. Dữ liệu chỉ nằm trên trình duyệt của máy đang nhập. Quyết định 18 ở mục 9.

### 4.5 Trò giải đố

Ngoài game nhiều người, app có **trò giải đố một người** với màn thiết kế sẵn. Trò đầu tiên là **Gom thạch**, lấy cảm hứng từ thể loại của Jelly Is Sticky nhưng tên, hình và luật chi tiết đều tự làm, màn tự làm trừ chương Boxoban:
- Đẩy các khối thạch trên lưới ô nhìn từ trên xuống; thạch cùng màu chạm cạnh nhau thì dính lại mãi.
- Qua màn khi mỗi màu nằm gọn trong một khối; ở màn có khuôn, khi mọi khuôn có thạch đúng màu, vừa khít.
- Năm chương, 40 màn: thạch thường (có đá viên từ màn 1-5), sương sáo dính mọi màu, thạch dừa dính cả vào tường, khuôn (đổ thạch vào khuôn cùng màu cho vừa khít), và kho đá: 8 màn lấy từ bộ Boxoban của DeepMind (Apache 2.0), chuyển thành đá viên và khuôn đá.
- Mọi màn được bộ giải tự động chứng minh là giải được và có số bước ít nhất.
- Hoàn tác không giới hạn, chơi lại màn hoàn tác được.
- Tiến độ chỉ nằm trên trình duyệt; không có chế độ với máy hay online. Quyết định 19 ở mục 9.

### 4.6 Ý tưởng xa hơn
- Câu đố hằng ngày (puzzle caro "thắng trong 3 nước", cờ vua).
- Chế độ hướng dẫn tương tác cho người mới.
- Giải đấu nhỏ trong nhóm (vòng tròn, loại trực tiếp).
- AI cho cờ vua.
- Trình tạo biến thể luật (đổi kích thước bàn, điều kiện thắng).

## 5. Phác thảo giao diện

**Menu chính**

```
┌──────────────────────────────────────────────────────┐
│  ♟ Board Games Hub        Xin chào, Khôi ✎  [☀/🌙] [⚙] │
├──────────────────────────────────────────────────────┤
│  [Tất cả] [Dân gian VN] [Cổ điển] [Tự thiết kế]      │
│  Người chơi: [1] [2] [3–4]    Thời lượng: [<10'] ... │
├──────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐      │
│  │  ╳ ○   │  │ 🎲 ●●  │  │  ♔ ♚   │  │        │      │
│  │Cờ caro │  │Cá ngựa │  │ Cờ vua │  │Sắp có… │      │
│  │2P · 5' │  │2–4P·20'│  │2P · 20'│  │        │      │
│  └────────┘  └────────┘  └────────┘  └────────┘      │
├──────────────────────────────────────────────────────┤
│  ▶ Tiếp tục ván dở: Cờ caro (vs Máy · Vừa)           │
│  🌐 Ván online đang chờ bạn: Cờ vua với "Minh" (lượt bạn) │
│  [ Nhập mã phòng: ______ ]  [ Vào ]                  │
└──────────────────────────────────────────────────────┘
```

**Màn hình trước khi vào ván**

```
┌──────────────── Cờ caro ────────────────┐
│  Chế độ:  (•) Đấu với máy  ( ) Cùng máy │
│           ( ) Online: [Mời bạn]         │
│  Độ khó:  [Dễ] [Vừa] [Khó]              │
│  Đi trước: [Tôi] [Máy] [Ngẫu nhiên]     │
│  Bàn:     [15×15] [19×19]               │
│  Luật thắng: [Chặn hai đầu] [Tự do]     │
│                                         │
│  [📖 Luật chơi]          [ Bắt đầu ▶ ]  │
└─────────────────────────────────────────┘
```

Với cờ vua, lựa chọn "Đấu với máy" bị ẩn trong giai đoạn đầu.

**Trong ván**: bàn cờ ở giữa, thanh trên hiển thị lượt đi + trạng thái kết nối của từng người (online), thanh dưới có Hoàn tác / Gợi ý / Đầu hàng / Menu.

## 6. Kiến trúc kỹ thuật

### 6.1 Stack đã chọn
| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | React, routing, API và WebSocket trong cùng một dự án; deploy thẳng lên Vercel |
| Hosting | **Vercel, gói Hobby** (miễn phí) | Dự án cá nhân, phi thương mại, ít người dùng: đúng điều kiện gói Hobby |
| Style | CSS variables làm design token (+ Tailwind hoặc CSS Modules) | Tối giản phẳng trước, thêm theme sau chỉ bằng bộ token mới |
| Render bàn cờ | SVG (đa số game), Canvas (bàn lớn như caro vô hạn, cờ vây 19×19) | SVG sắc nét, dễ style và gắn sự kiện |
| State | Zustand hoặc reducer thuần | Luật game là hàm thuần nên undo/replay dễ |
| AI | Web Worker | Không làm đơ giao diện khi máy suy nghĩ |
| Lưu trữ phía trình duyệt | `localStorage` (tên tạm, token người chơi, cài đặt) + IndexedDB qua `idb-keyval` (ván đang chơi, thống kê) | Không cần tài khoản |
| Offline | PWA (Serwist cho Next.js) | Cài như app |
| Online | **WebSocket trên Vercel Functions** (`upgradeWebSocket` của `@vercel/functions`, thư viện `ws`) | Server kiểm tra nước đi bằng engine luật dùng chung |
| Trạng thái online | **Upstash Redis**, gói miễn phí (qua Vercel Marketplace): lưu phòng + pub/sub giữa các instance | Function không giữ state lâu dài; xem 6.3 |
| Hẹn giờ phía server | **Không dùng** (chốt 04/11/2026, M8): thời điểm bắt đầu lượt lưu cùng phòng trong Redis, server kiểm khi người chơi yêu cầu xử bỏ ván | Không thêm dịch vụ; đồng hồ cho mỗi bên (v1) sẽ xét lại |
| Test | Vitest (luật), Playwright (luồng online 2 trình duyệt) | |

Không cần cơ sở dữ liệu quan hệ: không có tài khoản, dữ liệu online (phòng, lịch sử ván của nhóm) đều nằm gọn trong Redis.

### 6.2 Interface chung cho mỗi game

Mọi game đều cài đặt cùng một "hợp đồng". Engine luật là **hàm thuần**, tách khỏi UI, nhờ đó AI, undo, replay và online dùng chung được.

```ts
interface GameDefinition<State, Move, Options = {}> {
  id: string;                    // "caro", "ludo-vn", "chess", ...
  meta: {
    name: string;
    players: [min: number, max: number];
    category: "vn-folk" | "classic" | "original";
    durationMin: number;
    difficulty: 1 | 2 | 3;
    supportsAI: boolean;         // cờ vua: false ở giai đoạn đầu
  };
  setup(options: Options): State; // ví dụ cờ cá ngựa: LudoOptions chứa các biến thể luật ở 3.4
  currentPlayer(state: State): PlayerId;
  legalMoves(state: State): Move[];
  applyMove(state: State, move: Move): State;   // trả về state mới, không mutate
  result(state: State): GameResult | null;      // null = chưa kết thúc
  evaluate?(state: State, player: PlayerId): number; // dùng cho AI minimax
  random?: boolean;              // có xúc xắc/ngẫu nhiên → server tung thay client
}

// Phần giao diện, chỉ ở phía trình duyệt
interface GameUI<State, Move> {
  Board: React.ComponentType<BoardProps<State, Move>>;
  rules: RulesDoc;               // nội dung trang luật chơi
}
```

Bộ phận dùng chung:
- **Game registry**: danh sách game, menu tự sinh từ `meta` (ẩn "Đấu với máy" khi `supportsAI` là `false`).
- **Game session**: quản lý lịch sử nước đi → undo/redo/replay/autosave.
- **AI runner** (Web Worker): minimax + alpha-beta chung cho mọi game có `evaluate`; MCTS cho game không có hàm đánh giá tốt (cờ vây); game có xúc xắc (cờ cá ngựa) dùng luật ưu tiên hoặc expectimax.
- **Transport**: một interface chung cho cả 3 chế độ (`LocalTransport`, `AITransport`, `OnlineTransport`). UI chỉ biết "gửi nước đi" và "nhận nước đi", không cần biết đối thủ là người cùng máy, AI hay người ở xa. Nhờ vậy game nào viết xong luật là chơi online được luôn, và nếu sau này đổi hạ tầng online thì chỉ cần viết lại `OnlineTransport`.

### 6.3 Kiến trúc online trên Vercel

```
 Trình duyệt A          Vercel Function #1     Upstash Redis      Vercel Function #2          Trình duyệt B
┌─────────────┐  WS   ┌──────────────────┐   ┌─────────────┐   ┌──────────────────┐  WS   ┌─────────────┐
│ UI + engine │ ────▶ │ kiểm tra Move    │──▶│ room:{id}   │──▶│ nhận qua pub/sub │ ────▶ │ UI + engine │
│ (phát lại)  │ ◀──── │ bằng core/       │◀──│  moves[]    │◀──│ đẩy xuống client │ ◀──── │ (phát lại)  │
└─────────────┘       └──────────────────┘   │  seats, ... │   └──────────────────┘       └─────────────┘
                                             │ pub/sub     │
                                             └─────────────┘
```

Nguyên tắc chung:
- **Server là trọng tài**: client gửi `Move`, function đọc ván từ Redis, chạy `legalMoves`/`applyMove` (cùng code với client, trong package `core`), ghi nước đi mới vào Redis rồi phát cho mọi người trong phòng. Client không thể gửi nước đi sai luật.
- **Client không hiển thị trước** nước đi của mình (đã chốt ở M4, change `add-online-play`): nước đi chỉ hiện khi server đã ghi và gửi trạng thái mới; trong lúc chờ, bàn khoá để không gửi thêm nước nào. Lý do: độ trễ đo được với function ở `sin1` chỉ ~70 ms, không cảm nhận được; hiện trước thì phải xử lý quay lui khi bị từ chối; và với game có xúc xắc, client không biết trước kết quả. Nếu dùng thật thấy chậm thì thêm sau, chỉ trong transport online. Server vẫn là nơi duy nhất quyết định một nước có được ghi hay không.
- **Ván = danh sách nước đi**: kết nối lại chỉ cần tải danh sách nước đi rồi phát lại; dùng luôn cho replay.
- **Game có xúc xắc** (cờ cá ngựa): server tung xúc xắc và ghi kết quả vào lịch sử, client không tự tung.
- **Thông điệp** gọn: `join`, `move`, `state`, `roll`, `offer-draw`, `resign`, `clock`, `chat`, `presence`.
- **Danh tính người chơi**: lần đầu vào app, trình duyệt tạo một `playerId` ngẫu nhiên và lưu cùng tên tạm trong `localStorage`. Vào phòng thì gửi `playerId` này để server nhận ra đúng ghế khi kết nối lại.
- **Đổi máy hoặc xoá dữ liệu trình duyệt** thì mất `playerId` → mở lại link phòng sẽ thấy ghế cũ ở trạng thái "mất kết nối", bấm "Đây là tôi" để nhận lại ghế. Với nhóm bạn tin nhau thì cách này đủ dùng.
- **Phòng tự xoá** sau một thời gian không hoạt động (TTL trên Redis, ví dụ 7 ngày) để gói Redis miễn phí không bị đầy.

Những điểm riêng do chạy trên Vercel Functions:
- **Function không có trạng thái**: mọi thứ về phòng nằm trong Redis, không giữ trong bộ nhớ function.
- **Hai người có thể nối vào hai instance khác nhau** → mỗi phòng có một kênh pub/sub trên Redis để các instance chuyển nước đi cho nhau.
- **Kết nối WebSocket bị giới hạn thời gian** (bài thử nghiệm ghi nhận bị ngắt sau khoảng 5 phút) trong khi một ván cờ vua/cá ngựa dài hơn thế → client **tự kết nối lại ngầm** và tải các nước đi còn thiếu. Người chơi chỉ thấy chấm trạng thái chớp nhẹ, không mất ván.
- **Không có tiến trình chạy nền** để đếm giờ → lưu thời điểm bắt đầu lượt cùng phòng trong Redis (`turnStartedAt`) và kiểm khi có thông điệp: người còn lại bấm "Xử thắng" / "Cho máy chơi thay" sau 5 phút, server xét bằng đồng hồ của nó. Không dùng QStash hay Vercel Cron (chốt 04/11/2026, M8).
- **Phương án dự phòng**: tính năng WebSocket của Vercel còn mới (đã GA; thử nghiệm M3 cho thấy dùng được, xem plan.md §10). Nếu giới hạn gây khó, chuyển phần realtime sang dịch vụ chuyên có gói miễn phí (Ably, Pusher) hoặc một server Node nhỏ riêng; nhờ có `Transport` nên phần còn lại không phải sửa.

### 6.4 Cấu trúc thư mục dự kiến (monorepo pnpm + Turborepo)

> Đã được thay bằng cấu trúc chi tiết hơn trong [plan.md](plan.md) mục 3. Phần dưới chỉ giữ lại để tham khảo.

Luật game phải chạy được ở cả trình duyệt lẫn server, nên tách thành package dùng chung.

```
apps/
  web/                      # Next.js, deploy lên Vercel
    app/
      page.tsx              # menu chính
      play/[gameId]/        # màn hình chơi cùng máy / với máy
      room/[roomId]/        # màn hình phòng online
      api/ws/route.ts       # điểm nối WebSocket
      api/rooms/route.ts    # tạo phòng, lấy thông tin phòng
    components/             # nút, dialog, đồng hồ, toast
    boards/                 # Board.tsx của từng game + rules.md
    transport/              # local, ai, online
    ai/                     # minimax.ts, mcts.ts, worker.ts
    identity/               # tên tạm + playerId trong localStorage
    server/                 # rooms.ts, pubsub.ts, clock.ts (chỉ chạy phía server)
    styles/tokens.css       # design token; theme mới = file token mới
packages/
  core/                     # dùng chung client + server, không phụ thuộc React
    types.ts                # GameDefinition, Move, State...
    session.ts              # lịch sử nước đi, undo/redo, replay
    protocol.ts             # kiểu thông điệp online
    games/
      tictactoe/            # rules.ts, rules.test.ts
      caro/
      ludo-vn/              # rules.ts, options.ts (các biến thể ở 3.4)
      chess/
      ...
```

Vì `Board` là component React nên nằm ở `apps/web`, còn `GameDefinition` trong `core` chỉ chứa luật và metadata.

## 7. Lộ trình

| Giai đoạn | Nội dung | Kết quả |
|---|---|---|
| **0. Khung** | Monorepo, Next.js trên Vercel Hobby, `core` dùng chung, `GameDefinition` + `Transport`, session, menu, design token, tên tạm; Tic-tac-toe chạy được cả 3 chế độ, online qua WebSocket + Redis, có thử ngắt kết nối và nối lại | Kiến trúc online trên Vercel được kiểm chứng ngay từ đầu |
| **1. MVP** | **Cờ caro** (cùng máy, AI, online), **Cờ cá ngựa** 2–4 người với luật phổ biến (cùng máy, AI, online), **Cờ vua** (cùng máy, online); phòng online qua link + kết nối lại; autosave, luật chơi, responsive, sáng/tối | Bản đầu tiên gửi cho bạn bè, đồng nghiệp chơi |
| **2. v1** | Chọn biến thể luật cá ngựa; Cờ tướng, Ô ăn quan, Reversi, Cờ gánh, Cờ đam, Cờ cối xay, Ô vuông; đồng hồ, đề nghị hoà, QR, chat trong phòng (đã có); PWA, thống kê, replay | Kho game đầy đủ |
| **3. v2** | Phòng cố định của nhóm, bảng thành tích nhóm, spectator; theme (gỗ, tre, giấy dó); Cờ vây; game tự thiết kế đầu tiên | Thành "sân chơi" quen thuộc của nhóm |
| **4. Sau đó** | AI cờ vua, puzzle hằng ngày, tutorial tương tác, giải đấu trong nhóm | |

## 8. Rủi ro và lưu ý

- **Bản quyền game**: chỉ dùng game dân gian/cổ điển và game tự thiết kế; không dùng tên, hình ảnh, luật đặc thù của board game thương mại. Hình quân cờ, âm thanh tự làm hoặc lấy từ nguồn CC0.
- **Luật cờ vua đủ đúng**: dù chưa có AI, vẫn phải cài đủ nhập thành, bắt tốt qua đường, phong cấp, chiếu bí, hết nước đi, hoà lặp 3 lần, luật 50 nước. Có thể bọc thư viện `chess.js` (giấy phép BSD) vào `GameDefinition` cho nhanh. Khi làm AI cờ vua về sau: Stockfish (bản WASM) dùng giấy phép GPLv3, nên muốn dùng thì để repo ở chế độ công khai; với dự án cá nhân thì việc này dễ.
- **Luật cờ cá ngựa mỗi nơi một kiểu**: chốt bộ luật mặc định (3.4), hiện luật đang dùng ngay trong phòng để tránh tranh cãi.
- **WebSocket trên Vercel còn mới**: giới hạn thời gian kết nối và giới hạn riêng của gói Hobby (số kết nối, thời gian chạy function). Đã đo ở mốc M3 (plan.md §10): kết nối bị cắt mỗi ~5 phút, độ trễ ~70 ms khi function ở Singapore, pub/sub qua Redis giữa các instance chạy đúng → giữ WebSocket của Vercel; phương án dự phòng ở 6.3 vẫn để đó nếu hết hạn mức miễn phí.
- **Giới hạn gói miễn phí**: Upstash Redis và QStash gói miễn phí có hạn mức lệnh mỗi ngày; với một nhóm nhỏ thì dư, nhưng nên gom thông điệp (không gửi `presence` quá dày).
- **Mất tên tạm/ghế** khi đổi máy hay xoá dữ liệu trình duyệt: xử lý bằng nút "Đây là tôi" (6.3).
- **AI nặng trên điện thoại**: cờ tướng, cờ vây cần giới hạn thời gian suy nghĩ và chạy trong Web Worker.
- **Bỏ ván giữa chừng**: cần luật rõ (hết giờ chờ thì xử thua, hoặc với cá ngựa thì AI chơi thay ghế đó) để người còn lại không bị treo.
- **Khả năng truy cập**: hỗ trợ điều khiển bằng bàn phím, không dùng màu là tín hiệu duy nhất để phân biệt quân các bên (cá ngựa 4 màu cần thêm ký hiệu).

## 9. Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Framework | **React với Next.js** |
| 2 | Online | **WebSocket**, server làm trọng tài |
| 3 | Tài khoản | **Không có tài khoản**: chơi online bằng tên tạm, lưu trong `localStorage` |
| 4 | Hosting | **Vercel, gói Hobby** (WebSocket trên Vercel Functions + Upstash Redis gói miễn phí) |
| 5 | Phong cách hình ảnh | Khung chung gọn gàng (chữ, nút, khoảng cách dùng chung), **mỗi game một bản sắc riêng** qua token theo game (`[data-game]`); quy trình và luật ở skill `board-games-ui`. Thay cho "tối giản phẳng" ban đầu sau khảo sát giao diện ngày 03/11/2026 (plan.md §10, mốc M6.5) |
| 6 | Game làm trước | **Cờ caro, Cờ cá ngựa, Cờ vua**; game tự thiết kế để v2 |
| 7 | AI cờ vua | **Chưa làm**: cờ vua chỉ có chế độ cùng máy và online |
| 8 | Quy mô | **Dự án cá nhân, phi thương mại**, ít người dùng (bạn bè, đồng nghiệp) |
| 9 | Luật cờ cá ngựa mặc định | **Cột "phổ biến"** ở bảng 3.4 |
| 10 | Ngôn ngữ | **Tiếng Việt (mặc định), tiếng Anh, tiếng Nhật**, có ngay từ đầu |
| 11 | Ván dở | **Lưu theo game × chế độ chơi** (cùng máy / với máy): ván cùng máy và ván với máy của cùng một game không đè lên nhau |
| 12 | Thứ tự mốc | **M2 (AI) trước M3** (thử nghiệm online trên Vercel) |
| 13 | Bỏ ván online | **5 phút** cho mọi game: người còn lại bấm nút (không hẹn giờ phía server); phòng 2 ghế → kết thúc ván (người kia thắng), phòng từ 3 ghế của game có máy (Cờ cá ngựa, Cờ rào) → máy chơi thay tới hết ván, ghế trả lại ở "Chơi lại" (04/11/2026, change `add-resign-and-abandon`) |
| 14 | Đầu hàng | **Online và khi đấu với máy**, có hộp thoại xác nhận; cùng máy dùng "Ván mới". Cùng quy tắc với bỏ ván: phòng 2 ghế kết thúc ván, phòng từ 3 ghế của game có máy cho máy chơi thay (04/11/2026) |
| 15 | Giấy phép mã nguồn | **Không có giấy phép** (giữ mọi quyền, không có file `LICENSE`); phần mềm và hình của bên thứ ba giữ giấy phép riêng, liệt kê ở `apps/web/public/third-party-licenses.txt` (chốt 04/11/2026, `polish-accessibility-and-mobile`) |
| 16 | Chat trong phòng online | **Gõ tự do + câu có sẵn + emoji** cho mọi game, chỉ người có ghế đọc và gửi; **giữ 30 tin gần nhất theo phòng** (nằm trong dữ liệu phòng trên Redis, xoá cùng phòng); **không lọc từ** (nhóm bạn qua link riêng, có nút "Tắt chat" lưu theo trình duyệt) (chốt 05/11/2026, `add-room-chat`) |
| 17 | Game tự thiết kế làm sớm | **Cờ rào** làm trước các game v1 theo yêu cầu người dùng, thay cho "game tự thiết kế để v2" ở quyết định 6 với riêng game này. Theo lượt, đồ hoạ 2D, 2–4 người, luật và hình riêng (cổng đích 5 ô, một lần phá rào, không nhảy và được chung ô, không tuỳ chọn luật); không dùng tên hay hình của game thương mại cùng thể loại (chốt 06/11/2026, `add-fence-race-game`) |
| 18 | Hộp công cụ | App có thêm **Hộp công cụ** cho những buổi chơi ngoài đời, trước hết là **Ghi điểm đánh bài**. Công cụ không phải game, không đi qua server; **dữ liệu chỉ trên trình duyệt của máy đang nhập** (IndexedDB), một người ghi trên một máy, người khác xem bản tổng kết được chia sẻ. **Tổng mỗi ván luôn bằng 0**, chưa có cách tính khác. Chỉ ghi **điểm**, không quy đổi ra tiền. Đồng bộ nhiều máy và sao lưu ra file để sau nếu dùng thật thấy cần (chốt 07/11/2026, `add-toolbox-card-score`) |
| 19 | Trò giải đố một người | App có thêm loại **trò giải đố một người** (màn thiết kế sẵn), ngoài `GameDefinition`: không có chế độ với máy hay online, không đi qua server. Trò đầu tiên là **Gom thạch**, cùng thể loại đẩy khối thạch dính với Jelly Is Sticky nhưng tên, hình và luật chi tiết tự làm, màn tự làm trừ chương Boxoban (quyết định 20) (chỉ ba loại: dính cùng màu, sương sáo dính mọi màu, thạch dừa dính tường; đá viên là khối chắn trơ, trừ ở màn có khuôn đá, nơi đá viên phải vào khuôn). **Tiến độ chỉ trên trình duyệt** (localStorage). Mọi màn mở sẵn, không khoá theo tiến độ. Trình tạo màn, gợi ý, chế độ hai người để sau (chốt 12/11/2026, `add-jelly-gather-puzzle`) |
| 20 | Màn của bên thứ ba và màn khuôn | Gom thạch có thêm **màn khuôn** (ô đích có màu, luật **vừa khít**: mỗi loại có khuôn có đúng bằng số ô khuôn, mọi ô khuôn có khối đúng loại) và một chương **lấy màn từ bộ Boxoban** của DeepMind (**Apache 2.0**, commit `78011d8c`): hộp thành đá viên, ô đích thành khuôn đá; chỉ lấy màn mà luật đẩy dây chuyền không làm ngắn lời giải so với luật Sokoban; ghi công, nêu rõ đã sửa và kèm toàn văn giấy phép trong `/third-party-licenses.txt` và trên danh sách màn. **Không dùng màn của Jelly Is Sticky** (tài sản của Lunarch Studios, không có bộ map công khai) (chốt 12/11/2026, `add-jelly-gather-molds`) |
| 21 | Game cùng phe | **Đội gom thạch** là game mới (không phải chế độ của trò giải đố) chơi **cùng phe, theo lượt**, 2–4 người, cùng máy và online. Hợp đồng engine có cờ `cooperative`: game cùng phe thắng thì mọi ghế thắng; có người bỏ cuộc hay bỏ ván thì **ván dừng, không ai thắng** (thay vì những người còn lại thắng); màn hình báo "Cả đội thắng!", "Ván kết thúc", "Ván dừng" (chốt 12/11/2026, `add-jelly-crew-game`) |
