# Ý tưởng: Board Games Hub — App chơi cờ trên trình duyệt

> Bản nháp ý tưởng · cập nhật 30/10/2026 · các quyết định đã chốt xem [mục 9](#9-quyết-định-đã-chốt)

## 1. Tầm nhìn

Một web app chạy hoàn toàn trên trình duyệt, mở ra là thấy **menu các trò chơi bàn cờ**, chọn một game là chơi ngay: không cần cài đặt, không bắt buộc tài khoản. Mỗi game hỗ trợ đủ **3 cách chơi**:

1. **Cùng máy**: 2–4 người chơi chung một thiết bị.
2. **Với máy**: đấu AI nhiều mức độ khó.
3. **Online**: chơi với bạn bè qua link mời, hoặc ghép trận nhanh với người lạ.

Online là một trụ cột của sản phẩm chứ không phải tính năng thêm vào sau: kiến trúc được thiết kế để mọi game đều chơi online được ngay khi luật đã viết xong.

Điểm khác biệt:
- **Kho cờ truyền thống Việt Nam**: cờ tướng, cờ caro, ô ăn quan, cờ gánh, cờ cá ngựa… ít nơi gom đủ và làm đẹp, càng ít nơi cho chơi online.
- **Vào ván online trong vài giây**: gửi link là bạn vào chơi, không cần đăng ký.
- **Nhẹ, nhanh, chơi offline** (PWA): mở trên điện thoại như một app; mất mạng vẫn chơi được với máy hoặc cùng máy.
- **Kiến trúc "plug-in game"**: thêm game mới chỉ cần viết luật theo một interface chung; menu, AI, lưu ván, undo và **online** đều dùng lại.

## 2. Người dùng mục tiêu

| Nhóm | Nhu cầu |
|---|---|
| Gia đình, bạn bè ngồi cạnh nhau | Mở nhanh trên laptop/tablet, 2–4 người chơi chung một máy |
| Người chơi một mình lúc rảnh | Đấu với AI có nhiều mức độ khó |
| Bạn bè ở xa | Gửi link, vào chơi ngay, không cần đăng ký |
| Trẻ em, người mới | Có hướng dẫn luật, gợi ý nước đi hợp lệ |

## 3. Danh sách game trong menu

Chỉ chọn **game truyền thống/dân gian/cổ điển** (luật thuộc phạm vi công cộng) và **game tự thiết kế**, tránh tái tạo các board game thương mại có bản quyền.

**3 game làm trước (MVP): Cờ caro, Cờ cá ngựa, Cờ vua.** Ba game này phủ đủ các dạng khó của kiến trúc: đặt quân trên bàn lớn (caro), nhiều người + xúc xắc (cá ngựa), luật phức tạp + AI mạnh (cờ vua).

### 3.1 Cờ dân gian Việt Nam

| Game | Bàn | Độ khó cài đặt | AI | Ưu tiên |
|---|---|---|---|---|
| Cờ caro (Gomoku) | Lưới 15×15 hoặc vô hạn | Dễ | Heuristic + minimax | **MVP** |
| Cờ cá ngựa | Bàn hình chữ thập, 2–4 người, xúc xắc | Trung bình | Luật ưu tiên (ăn quân > về chuồng > ra quân…) | **MVP** |
| Ô ăn quan | 10 ô dân + 2 ô quan | Dễ | Minimax (cây nhỏ) | v1 |
| Cờ gánh | Lưới 5×5 có đường chéo | Trung bình | Minimax | v1 |
| Cờ tướng | 9×10 | Khó (luật tướng đối mặt, chiếu…) | Alpha-beta | v1 |

### 3.2 Cờ cổ điển thế giới

| Game | Bàn | Độ khó cài đặt | AI | Ưu tiên |
|---|---|---|---|---|
| Tic-tac-toe | 3×3 | Rất dễ | Minimax đầy đủ | **Giai đoạn 0** (game mẫu) |
| Cờ vua | 8×8 | Khó (nhập thành, bắt tốt qua đường, phong cấp, hoà lặp 3 lần) | Alpha-beta tự viết (xem [8](#8-rủi-ro-và-lưu-ý) về engine ngoài) | **MVP** |
| Reversi | 8×8 | Dễ | Alpha-beta + bảng trọng số ô | v1 |
| Cờ đam (Draughts) | 8×8 | Trung bình | Alpha-beta | v1 |
| Cờ cối xay (Nine Men's Morris) | 24 điểm | Trung bình | Alpha-beta | v1 |
| Ô vuông (Dots and Boxes) | Lưới chấm | Dễ | Heuristic chuỗi | v1 |
| Cờ vây | 9×9 / 13×13 / 19×19 | Khó (đếm điểm, ko) | MCTS | v2 |

### 3.3 Game tự thiết kế (bản sắc riêng của app)

Một vài phác thảo để phát triển thêm:

- **Cờ Sen** — bàn lục giác, mỗi người đặt "lá sen" để nối hai bờ hồ đối diện; đặt lá cạnh lá đối thủ thì có thể lật lá đó nếu kẹp được giữa hai lá của mình. Kết hợp ý tưởng nối đường và lật quân.
- **Đua Thuyền Rồng** — 2–4 người, mỗi lượt chọn bài số (không xúc xắc) để tiến thuyền trên sông có xoáy nước và dòng chảy; bài đã dùng thì phải chờ một vòng mới lấy lại được.
- **Chợ Phiên** — game đặt quân giành ô hàng trên bàn 6×6, mỗi ô cho điểm khác nhau theo cụm hàng hoá liền kề.

Các game gốc làm sau khi kiến trúc ổn định (v2+), vì cần thời gian thử luật và cân bằng.

## 4. Tính năng

### 4.1 Cốt lõi (MVP)
- Màn hình **menu dạng lưới thẻ**: hình minh hoạ, tên, số người chơi, thời gian một ván, nhãn độ khó.
- Lọc/tìm theo: số người, thể loại (dân gian VN / cổ điển / tự thiết kế), thời lượng.
- Chế độ chơi: **cùng máy**, **đấu với máy** (Dễ / Vừa / Khó) và **online qua link mời** (xem 4.3).
- Highlight nước đi hợp lệ, hiệu ứng di chuyển quân.
- **Hoàn tác / làm lại** (chơi offline), chơi lại ván mới.
- **Tự động lưu ván đang chơi** (đóng tab mở lại vẫn còn).
- Trang **luật chơi** ngắn gọn cho từng game, có hình minh hoạ.
- Responsive: dùng tốt trên điện thoại, cả dọc lẫn ngang.
- Giao diện **tối giản phẳng**, có chế độ sáng/tối.

### 4.2 Mở rộng (v1)
- **PWA**: cài lên màn hình chính, chơi offline.
- Lịch sử ván, xem lại từng nước (replay).
- Thống kê cá nhân: thắng/thua theo game, chuỗi thắng.
- Âm thanh đặt quân (bật/tắt).
- Song ngữ Việt / Anh.

**Sau v1**: thêm các **theme** (bàn gỗ, bàn tre, giấy dó…). Từ đầu mọi màu sắc, bo góc, bóng đổ đều lấy từ design token (CSS variables), nên thêm theme chỉ là thêm một bộ token, không phải sửa component.

### 4.3 Online
**MVP: chơi với bạn bè**
- Tạo phòng → nhận **link mời / mã phòng 6 ký tự** → bạn mở là vào ván.
- Không cần tài khoản; đặt **nickname tạm**, lưu trên máy.
- Phòng 2–4 người cho cờ cá ngựa; ghế trống có thể cho AI chơi thay.
- **Kết nối lại tự động**: rớt mạng, đóng tab hay kết nối bị server ngắt (xem 6.3), mở lại vẫn vào đúng ván, đúng lượt.
- Đầu hàng; xử thua khi bỏ ván quá lâu.

**v1: hoàn thiện**
- Mã QR cho phòng.
- Đồng hồ thời gian cho mỗi bên (tuỳ chọn), xử thua khi hết giờ.
- Đề nghị hoà, xin đi lại (đối thủ phải đồng ý).
- Chat nhanh bằng emoji/câu có sẵn (tránh phải kiểm duyệt nội dung).

**v2: cộng đồng**
- **Ghép trận nhanh** theo game và giới hạn thời gian.
- Xem người khác chơi (spectator), danh sách ván đang diễn ra.
- Tài khoản (đăng nhập Google hoặc email) để giữ lịch sử, bạn bè, điểm xếp hạng (Elo/Glicko) theo từng game. Nickname tạm được gộp vào tài khoản khi đăng ký.
- Báo cáo người chơi xấu, chặn người chơi.

### 4.4 Ý tưởng xa hơn
- Câu đố hằng ngày (puzzle cờ vua, caro "thắng trong 3 nước").
- Chế độ hướng dẫn tương tác cho người mới.
- Giải đấu nhỏ giữa nhóm bạn (vòng tròn, loại trực tiếp).
- Trình tạo biến thể luật (đổi kích thước bàn, điều kiện thắng).

## 5. Phác thảo giao diện

**Menu chính**

```
┌──────────────────────────────────────────────────────┐
│  ♟ Board Games Hub              [🔍 Tìm]  [☀/🌙] [⚙]  │
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
│                                         │
│  [📖 Luật chơi]          [ Bắt đầu ▶ ]  │
└─────────────────────────────────────────┘
```

**Trong ván**: bàn cờ ở giữa, thanh trên hiển thị lượt đi + trạng thái kết nối của từng người (online), thanh dưới có Hoàn tác / Gợi ý / Đầu hàng / Menu.

## 6. Kiến trúc kỹ thuật

### 6.1 Stack đã chọn
| Lớp | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | React, routing, API và WebSocket trong cùng một dự án; deploy thẳng lên Vercel |
| Hosting | **Vercel** | Deploy theo git push, preview cho từng nhánh |
| Style | CSS variables làm design token (+ Tailwind hoặc CSS Modules) | Tối giản phẳng trước, thêm theme sau chỉ bằng bộ token mới |
| Render bàn cờ | SVG (đa số game), Canvas (bàn lớn như caro vô hạn, cờ vây 19×19) | SVG sắc nét, dễ style và gắn sự kiện |
| State | Zustand hoặc reducer thuần | Luật game là hàm thuần nên undo/replay dễ |
| AI | Web Worker | Không làm đơ giao diện khi máy suy nghĩ |
| Lưu trữ phía trình duyệt | IndexedDB (qua `idb-keyval`) | Lưu ván, thống kê, cài đặt, nickname |
| Offline | PWA (Serwist cho Next.js) | Cài như app |
| Online | **WebSocket trên Vercel Functions** (`experimental_upgradeWebSocket` của `@vercel/functions`, thư viện `ws`) | Server kiểm tra nước đi bằng engine luật dùng chung |
| Trạng thái online | **Upstash Redis** (qua Vercel Marketplace): lưu phòng + pub/sub giữa các instance | Function không giữ state lâu dài; xem 6.3 |
| Hẹn giờ phía server | Upstash QStash (tin nhắn hẹn giờ) hoặc Vercel Cron | Xử thua khi bỏ ván / hết giờ mà không cần tiến trình chạy liên tục |
| Cơ sở dữ liệu (v2) | Postgres (Neon qua Vercel Marketplace) | Tài khoản, lịch sử, xếp hạng |
| Test | Vitest (luật), Playwright (luồng online 2 trình duyệt) | |

### 6.2 Interface chung cho mỗi game

Mọi game đều cài đặt cùng một "hợp đồng". Engine luật là **hàm thuần**, tách khỏi UI, nhờ đó AI, undo, replay và online dùng chung được.

```ts
interface GameDefinition<State, Move> {
  id: string;                    // "caro", "ludo-vn", "chess", ...
  meta: {
    name: string;
    players: [min: number, max: number];
    category: "vn-folk" | "classic" | "original";
    durationMin: number;
    difficulty: 1 | 2 | 3;
  };
  setup(options: GameOptions): State;
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
- **Game registry**: danh sách game, menu tự sinh từ `meta`.
- **Game session**: quản lý lịch sử nước đi → undo/redo/replay/autosave.
- **AI runner** (Web Worker): minimax + alpha-beta chung cho mọi game có `evaluate`; MCTS chung cho game không có hàm đánh giá tốt (cờ vây); game có xúc xắc (cờ cá ngựa) dùng luật ưu tiên hoặc expectimax.
- **Transport**: một interface chung cho cả 3 chế độ (`LocalTransport`, `AITransport`, `OnlineTransport`). UI chỉ biết "gửi nước đi" và "nhận nước đi", không cần biết đối thủ là người cùng máy, AI hay người ở xa. Nhờ vậy game nào viết xong luật là chơi online được luôn, và nếu sau này đổi hạ tầng online thì chỉ cần viết lại `OnlineTransport`.

### 6.3 Kiến trúc online trên Vercel

```
 Trình duyệt A          Vercel Function #1     Upstash Redis      Vercel Function #2          Trình duyệt B
┌─────────────┐  WS   ┌──────────────────┐   ┌─────────────┐   ┌──────────────────┐  WS   ┌─────────────┐
│ UI + engine │ ────▶ │ kiểm tra Move    │──▶│ room:{id}   │──▶│ nhận qua pub/sub │ ────▶ │ UI + engine │
│  (dự đoán)  │ ◀──── │ bằng core/       │◀──│  moves[]    │◀──│ đẩy xuống client │ ◀──── │  (dự đoán)  │
└─────────────┘       └──────────────────┘   │  seats, ... │   └──────────────────┘       └─────────────┘
                                             │ pub/sub     │
                                             └─────────────┘
```

Nguyên tắc chung:
- **Server là trọng tài**: client gửi `Move`, function đọc ván từ Redis, chạy `legalMoves`/`applyMove` (cùng code với client, trong package `core`), ghi nước đi mới vào Redis rồi phát cho mọi người trong phòng. Client không thể gửi nước đi sai luật.
- **Client hiển thị trước** nước đi của mình cho mượt, nếu server từ chối thì quay lại trạng thái cũ.
- **Ván = danh sách nước đi**: kết nối lại chỉ cần tải danh sách nước đi rồi phát lại; dùng luôn cho replay.
- **Game có xúc xắc** (cờ cá ngựa): server tung xúc xắc và ghi kết quả vào lịch sử, client không tự tung.
- **Thông điệp** gọn: `join`, `move`, `state`, `roll`, `offer-draw`, `resign`, `clock`, `chat-preset`, `presence`.
- **Danh tính khách**: token ngẫu nhiên lưu ở trình duyệt, đủ để kết nối lại đúng ghế mà không cần tài khoản.

Những điểm riêng do chạy trên Vercel Functions:
- **Function không có trạng thái**: mọi thứ về phòng nằm trong Redis, không giữ trong bộ nhớ function.
- **Hai người có thể nối vào hai instance khác nhau** → mỗi phòng có một kênh pub/sub trên Redis để các instance chuyển nước đi cho nhau.
- **Kết nối WebSocket bị giới hạn thời gian** (bài thử nghiệm ghi nhận bị ngắt sau khoảng 5 phút) trong khi một ván cờ vua/cá ngựa dài hơn thế → client **tự kết nối lại ngầm** và tải các nước đi còn thiếu. Người chơi chỉ thấy chấm trạng thái chớp nhẹ, không mất ván.
- **Không có tiến trình chạy nền** để đếm giờ → lưu thời điểm hết hạn trong Redis, kiểm tra mỗi khi có thông điệp; với ván bị bỏ thì đặt một tin nhắn hẹn giờ QStash để xử thua.
- **Phương án dự phòng**: tính năng WebSocket của Vercel còn mới (beta từ 06/2026). Nếu giới hạn gây khó, chuyển phần realtime sang dịch vụ chuyên (Ably, Pusher) hoặc một server Node nhỏ riêng; nhờ có `Transport` nên phần còn lại không phải sửa.

### 6.4 Cấu trúc thư mục dự kiến (monorepo pnpm + Turborepo)

Luật game phải chạy được ở cả trình duyệt lẫn server, nên tách thành package dùng chung.

```
apps/
  web/                      # Next.js, deploy lên Vercel
    app/
      page.tsx              # menu chính
      play/[gameId]/        # màn hình chơi offline / với máy
      room/[roomId]/        # màn hình phòng online
      api/ws/route.ts       # điểm nối WebSocket
      api/rooms/route.ts    # tạo phòng, lấy thông tin phòng
    components/             # nút, dialog, đồng hồ, toast
    boards/                 # Board.tsx của từng game + rules.md
    transport/              # local, ai, online
    ai/                     # minimax.ts, mcts.ts, worker.ts
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
      ludo-vn/
      chess/
      ...
```

Vì `Board` là component React nên nằm ở `apps/web`, còn `GameDefinition` trong `core` chỉ chứa luật và metadata.

## 7. Lộ trình

| Giai đoạn | Nội dung | Kết quả |
|---|---|---|
| **0. Khung** | Monorepo, Next.js trên Vercel, `core` dùng chung, `GameDefinition` + `Transport`, session, menu, design token; Tic-tac-toe chạy được cả 3 chế độ, online qua WebSocket + Redis, có thử ngắt kết nối và nối lại | Kiến trúc online trên Vercel được kiểm chứng ngay từ đầu |
| **1. MVP** | **Cờ caro, Cờ cá ngựa (2–4 người), Cờ vua**; AI 3 mức; phòng online qua link + nickname tạm + kết nối lại; autosave, luật chơi, responsive, sáng/tối | Bản công khai đầu tiên, chơi được với bạn ở xa |
| **2. v1** | Cờ tướng, Ô ăn quan, Reversi, Cờ gánh, Cờ đam, Cờ cối xay, Ô vuông; đồng hồ, đề nghị hoà, QR, chat nhanh; PWA, thống kê, replay, song ngữ | Kho game đầy đủ, online đầy đủ cho bạn bè |
| **3. v2** | Tài khoản, ghép trận nhanh, xếp hạng, spectator; theme (gỗ, tre, giấy dó); Cờ vây; game tự thiết kế đầu tiên | Cộng đồng người chơi online |
| **4. Sau đó** | Puzzle hằng ngày, tutorial tương tác, giải đấu nhỏ | Giữ chân người chơi |

## 8. Rủi ro và lưu ý

- **Bản quyền game**: chỉ dùng game dân gian/cổ điển và game tự thiết kế; không dùng tên, hình ảnh, luật đặc thù của board game thương mại. Hình quân cờ, âm thanh tự làm hoặc lấy từ nguồn CC0.
- **Engine cờ vua ngoài**: Stockfish (bản WASM) dùng giấy phép GPLv3, nhúng vào app thì phải công khai mã nguồn app theo GPL. Nếu không muốn, tự viết alpha-beta (đủ cho mức Dễ/Vừa/Khó của người chơi phổ thông). Thư viện sinh nước đi `chess.js` dùng giấy phép BSD, có thể bọc vào `GameDefinition` để tiết kiệm thời gian, nhưng `core` cần chạy được cả trên server.
- **WebSocket trên Vercel còn mới**: giới hạn thời gian kết nối, chi phí theo thời gian CPU, API `experimental_` có thể thay đổi. Giai đoạn 0 phải đo thực tế; nếu không ổn thì dùng phương án dự phòng ở 6.3.
- **Gói Vercel**: gói Hobby (miễn phí) chỉ dành cho dự án cá nhân, phi thương mại; nếu có quảng cáo hay thu phí thì cần gói Pro.
- **Luật địa phương khác nhau**: cờ cá ngựa (điều kiện ra quân, đá quân, về chuồng), ô ăn quan, cờ gánh có nhiều biến thể → chọn một bộ luật chuẩn, ghi rõ trong trang luật, thêm tuỳ chọn biến thể sau.
- **AI nặng trên điện thoại**: cờ vua, cờ tướng, cờ vây cần giới hạn thời gian suy nghĩ và chạy trong Web Worker.
- **Gian lận online**: server kiểm tra mọi nước đi; khó chặn việc dùng engine ngoài để gợi ý (cờ vua, cờ tướng), xử lý sau khi có xếp hạng.
- **Bỏ ván giữa chừng**: cần luật rõ (hết giờ chờ thì xử thua, hoặc với cá ngựa thì AI chơi thay ghế đó) để người còn lại không bị treo.
- **Ghép trận khi ít người**: lúc đầu hàng chờ sẽ vắng → ưu tiên link mời bạn bè; ghép trận chỉ mở khi đủ người.
- **Khả năng truy cập**: hỗ trợ điều khiển bằng bàn phím, không dùng màu là tín hiệu duy nhất để phân biệt quân các bên (cá ngựa 4 màu cần thêm ký hiệu).

## 9. Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Framework | **React với Next.js** |
| 2 | Online | **WebSocket**, server làm trọng tài |
| 3 | Tài khoản | *Tạm chốt*: **nickname tạm** cho đến v2, chưa cần tài khoản (cần xác nhận) |
| 4 | Hosting | **Vercel** (WebSocket trên Vercel Functions + Upstash Redis) |
| 5 | Phong cách hình ảnh | **Tối giản phẳng** trước; theme khác làm sau, dựa trên design token |
| 6 | Game làm trước | **Cờ caro, Cờ cá ngựa, Cờ vua**; game tự thiết kế để v2 |

### Câu hỏi còn mở
1. Xác nhận quyết định số 3: chơi online bằng nickname tạm đến v2 có được không?
2. Cờ vua: chấp nhận mở mã nguồn (GPL) để dùng Stockfish, hay tự viết AI?
3. Cờ cá ngựa theo bộ luật nào: ra quân khi gieo 1 hay 6, có được gieo lại khi ra 6 không, về chuồng phải đúng số hay không?
4. Dự án cá nhân (gói Vercel Hobby) hay có ý định thương mại (gói Pro)?
