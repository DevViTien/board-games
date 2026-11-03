# Proposal

## Why

M3 đã chốt hạ tầng online: WebSocket trên Vercel Functions (`upgradeWebSocket`, function ở `sin1`) và Upstash Redis cho phòng và pub/sub giữa các instance (plan.md §10). Chưa có dòng code nào của phần online. Change này dựng **phía server** của phòng online: định nghĩa thông điệp, mô hình phòng, lưu phòng, server làm trọng tài cho mọi nước đi, và điểm nối WebSocket chạy được cả trên Vercel lẫn trên máy (dev, E2E). Thuộc mốc **M4. Phòng online** (plan.md §6.1). Change `add-online-play` (giao diện, transport online, danh tính) dựa trên change này và archive sau.

## What Changes

- **`packages/protocol`** có nội dung: phiên bản giao thức, mã phòng, schema tên tạm, bảng mã lỗi duy nhất, thông điệp client → server (`create`, `join`, `sit`, `move`, `rematch`, `ping`) và server → client (`created`, `room`, `rejected`, `error`, `pong`), mô hình phòng gửi cho client (`RoomView`, không chứa `playerId`), kèm schema zod để kiểm cả hai chiều.
- **Phòng online** (`apps/web/src/server/`): tạo phòng cho một game đã đăng ký với mã 6 ký tự; vào phòng để xem, người đã có ghế được nhận ra qua `playerId`, người mới phải yêu cầu ngồi mới có ghế (mở nhầm link không chiếm ghế của bạn); ván bắt đầu khi đủ người; server kiểm mọi nước đi bằng chính luật trong `packages/games`, tự tạo giá trị ngẫu nhiên; mọi người trong phòng, kể cả khi nối vào instance khác, nhận cùng một trạng thái, và mọi lời từ chối kèm trạng thái mới nhất để không ai kẹt khi lỡ tin; kết nối lại nhận lại toàn bộ ván; chơi ván mới trong cùng phòng (xoay ghế để luân phiên người đi trước); phòng tự xoá sau 7 ngày không hoạt động, phòng của bản thử và bản chính tách nhau.
- **`RoomStore`**: một giao diện, hai bản cài: Redis (Upstash, TCP, ghi có kiểm phiên bản kèm phát tin trong một lệnh, một subscriber mỗi instance, đọc lại khi kênh nối lại) và bộ nhớ (dev, test).
- **Điểm nối WebSocket**: route `/api/realtime` dùng `upgradeWebSocket` trên Vercel, và một server WebSocket nhỏ chạy bằng Node cho dev và E2E (`pnpm --filter @board-games/web realtime`, `pnpm dev` chạy kèm); cả hai gọi chung một bộ xử lý kết nối. Mọi thao tác phòng đi qua WebSocket, không có REST.
- **Bảo vệ và độ bền**: kiểm phiên bản giao thức (tab cũ sau khi app cập nhật được báo), giới hạn kích thước và tần suất thông điệp, ping giữ kết nối, đóng kết nối rảnh 20 phút, mọi lỗi của một kết nối hay của Redis được bắt mà không làm sập instance, kiểm biến môi trường bằng zod.

## Capabilities

### New Capabilities

- `online-rooms`: phòng online phía server — tạo phòng, vào phòng, ngồi vào ghế, server làm trọng tài, đồng bộ trạng thái giữa mọi người trong phòng, kết nối lại, ván mới trong phòng, hết hạn phòng, bảo vệ kết nối.

### Modified Capabilities

(không có)

## Ngoài phạm vi

- Giao diện, transport online, tên tạm và `playerId`, chế độ "Online" ở màn hình bắt đầu, nhập mã phòng ở menu: change `add-online-play` (cùng mốc M4).
- Trạng thái có mặt của từng người (chấm "đang kết nối" của đối thủ), xử thua khi bỏ ván, đầu hàng: M8 ("xử lý bỏ ván"). Server không theo dõi ai đang nối vì function có thể bị cắt mà không kịp báo đóng (M3).
- Xem người khác chơi (giao diện), nhận lại ghế khi mất `playerId` ("Đây là tôi"), rời ghế: làm sau; người thứ ba yêu cầu ngồi vào phòng đã đủ người nhận lỗi `room-full`. Giao thức đã tách "vào phòng" khỏi "ngồi ghế" nên xem người khác chơi về sau không phải đổi giao thức.
- Ghế cho máy chơi thay trong phòng online (idea.md §4.3): M6.
- Hoàn tác, đề nghị hoà, đồng hồ, chat: v1 (idea.md §4.3).
- Chọn tuỳ chọn luật khi tạo phòng: cùng lúc với tuỳ chọn luật ở màn hình bắt đầu (M5/M6). Thông điệp `create` đã có chỗ cho `options`, server kiểm bằng `parseOptions` của game.
- Giới hạn số phòng mỗi người, chống dò mã phòng: không làm cho nhóm nhỏ; mã 6 ký tự trong bảng 31 ký tự có khoảng 887 triệu tổ hợp.
- Hẹn giờ phía server (QStash): chưa cần vì chưa có đồng hồ và xử thua.

## Impact

- **Code**: `packages/protocol/src/` (mới: `room.ts`, `messages.ts`, `errors.ts`, `index.ts`), `apps/web/src/server/` (mới: `env.ts`, `room-service.ts`, `store/`, `realtime/`), `apps/web/src/app/api/realtime/route.ts` (mới).
- **Phụ thuộc**: `packages/protocol` thêm `zod` và `@board-games/engine`; `apps/web` thêm `@board-games/protocol`, `@vercel/functions` 3.10, `ws` 8.22, `redis` 6.3, dev thêm `@types/ws`, `tsx`. Cùng phiên bản đã chạy ở bản thử M3; khai báo trong `catalog`.
- **Hạ tầng**: dùng `REDIS_URL` mà tích hợp Upstash đã thêm cho project Vercel (M3). Không thêm dịch vụ mới; mọi thứ trên gói miễn phí.
- **Bất biến**: thực hiện đúng "server là trọng tài", "một ván = danh sách nước đi", "function không giữ state", "không tài khoản". `packages/protocol` chỉ phụ thuộc `engine` và zod, không React/DOM/Node, đúng chiều phụ thuộc.
- **Tooling**: `turbo.json` (task `realtime` persistent, `passThroughEnv` cho `REDIS_URL_TEST`), ESLint cấm phần client import `@/server/**`, test của `server/**` chạy trong môi trường Node.
- **Tài liệu**: plan.md §3.2 (`app/api/realtime` thay cho `api/rooms` và `api/ws`), §3.4 (`RoomStore` thật), §5 (chạy local) cập nhật trong task cuối.
