# Design

## Context

Hiện nay `ChatLayer` đặt bảng chat theo ba bố cục trong `use-chat-placement.ts`:

- `phone`: tấm trượt cao 48% từ dưới lên, kèm phần đệm cuối trang để còn cuộn được tới bàn;
- `landscape`: cột bên phải khi xoay ngang;
- `desktop`: bảng đè lên cột thông tin, đo từ ô lưới `data-chat-dock` của `PlayScreen`.

Người dùng thấy vướng ở cả hai đầu. Trên máy tính, bảng che dòng lượt, bảng người chơi và Sổ ghi. Trên điện thoại, tấm trượt che nửa bàn mà ô tin vẫn chật.

Người dùng đã chốt hướng làm ngày 13/11/2026: cột luôn hiện ở mép phải và thu gọn được; trên điện thoại thì toàn màn hình.

Ngoài cách đặt bảng, store `createRoomChat` và mọi thứ của server, protocol giữ nguyên.

## Goals / Non-Goals

**Goals**

- Từ 1280 px, chat không che gì của ván.
- Trên điện thoại, chat có đủ chỗ.
- Bàn không xê dịch khi có tin.
- Chạm ít code chung nhất có thể.

**Non-Goals**

- Đổi cột thông tin của ván.
- Đổi độ rộng cột bằng cách kéo.
- Chat ở chế độ cùng máy hay đấu với máy.

## Decisions

### 1. Ba bố cục theo khung

`CHAT_LAYOUT` đổi thành `column`, `dock`, `dialog`. `useChatLayout(inLobby)` chọn như sau:

| Điều kiện                                                                  | Bố cục   |
| -------------------------------------------------------------------------- | -------- |
| `(orientation: landscape) and (max-height: 32rem)` (điện thoại xoay ngang) | `dialog` |
| `(min-width: 1280px)`                                                      | `column` |
| `(min-width: 1024px)` và đang ở màn hình chơi                              | `dock`   |
| còn lại (dưới 1024 px; sảnh chờ dưới 1280 px)                              | `dialog` |

- `dock` là cách hiện nay của `desktop`, giữ nguyên: đo `data-chat-dock`, đưa lời của bàn lên đầu bảng.
- Bỏ `sheetHeight`, `useSheetSpacer`, `data-chat-spacer`, tay nắm của tấm trượt và nhánh `landscape`.
- Xoay ngang mà dùng hộp thoại thì người chơi không nhìn thấy bàn trong lúc chat. Đổi lại được một cách duy nhất cho mọi điện thoại, như người dùng yêu cầu.

### 2. Cột chat (`column`)

**Hình và vị trí**

- Bảng chat (`section` có tên "Chat", như mọi bố cục) cố định: `right: 0`, `top` ngay dưới thanh trên, `bottom: 0`, rộng **18rem**.
- Viền trái `border-border-control`, nền `bg-surface`, z 32 như bảng cũ.
- Bên trong là `ChatPanel` như các bố cục khác. Nút đóng (X) thay bằng nút "Thu gọn chat" (icon mũi tên sang phải, `aria-expanded="true"`). Không có dòng lượt hay khe lời của bàn, vì cột không che gì.

**Dải thu gọn**

- Cố định ở mép phải, rộng **3.5rem**, cùng chiều cao với cột.
- Một nút ở trên cùng (`ChatRail`): icon chat, chip số chưa đọc, tên đọc được là "Mở chat" kèm số chưa đọc, `aria-expanded="false"`.
- Khi chat đang tắt, nút dùng icon chat có gạch, như nút chat hiện nay.

**Chừa chỗ cho cột**

- `ChatLayer` đặt `data-chat-column="open"` hoặc `"rail"` lên `<html>` khi bố cục là `column` và chat hiện, rồi gỡ ra khi không còn.
- `globals.css` đổi theo thuộc tính đó:
  - `--chat-room`: 18rem hoặc 3.5rem, mặc định 0;
  - `--play-side`: phần không phải bàn của màn hình chơi; mặc định 34rem như hiện nay, khi cột mở là 25.5rem (§3).
- `PlayScreen` đo `--board-room` bằng `100vw - var(--play-side) - var(--chat-room)`, thay cho `100vw - 34rem`.
- Khi cột mở, lề ngang của trang giảm xuống 1.5rem và khoảng giữa bàn với cột thông tin còn 2rem. Viết bằng biến thể `[html[data-chat-column=open]_&]:`.
- Phần nội dung của màn hình chơi và của sảnh chờ được bọc trong một khối có `padding-right: var(--chat-room)`. Nhờ vậy thanh trên vẫn chạy hết bề ngang, còn nội dung căn giữa trong phần còn lại.

**Nhớ lựa chọn**

- `board-games:chat-column` (`config/storage-keys.ts`) lưu `"open"` hoặc `"collapsed"`, đọc bằng zod.
- Không đọc được thì mặc định là mở. Cách đọc, ghi và nghe tab khác giống `chat-muted.ts`.

**Mở và đóng**

- Bố cục thành `column` thì `ChatLayer` gọi `chat.setOpen(lựa chọn đã nhớ)`. Bố cục rời `column` (thu cửa sổ lại) thì `chat.setOpen(false)`, để hộp thoại không tự bật lên.
- Thu gọn hay mở cột thì ghi lựa chọn rồi chuyển tiêu điểm: thu gọn thì về nút của dải, mở thì vào ô nhập.
- Lúc vào trang hay lúc ván thay sảnh chờ, cột mở sẵn nhưng **không lấy tiêu điểm**. `ChatPanel` nhận prop `focusOnMount`, chỉ bật khi người chơi vừa tự mở.

**Nút chat của hàng nút**

- Store có thêm `column: boolean`, do `ChatLayer` đặt.
- `ChatButton` trả `null` khi `column` và không đăng ký mình làm nút của chat. Khi đó dải thu gọn đăng ký. Nhờ vậy `focusButton()` và `useButtonInView` (thẻ "Chat · số") luôn nói về nút đang có trên màn hình.

**Esc**

- Trong cột, Esc không làm gì. Lỡ tay thu gọn thì bàn đổi cỡ, nên không gắn việc đó vào một phím dễ bấm nhầm.

**Tin mới**

- Cột mở được tính là chat mở: không bong bóng, không số chưa đọc. `role="log"` đọc tin.
- Dải thu gọn được tính là chat đóng. Bong bóng và emoji nổi đặt sát bên trái dải (`right: 4.25rem`, rộng 18rem) dưới thanh trên. Chỗ đó chỉ có cột thông tin, không có bàn; `useWatchOverBoard` vẫn tắt bong bóng nếu nó chồng lên bàn.

### 3. Số đo của bàn

Thanh trên cao khoảng 4rem. Bàn được `min(chiều ngang còn lại, 100dvh − thanh trên − 6rem)`; Cờ caro còn bị chặn ở 37.5rem.

| Khung       | Hiện nay     | Cột mở (18rem)                 | Dải thu gọn (3.5rem) |
| ----------- | ------------ | ------------------------------ | -------------------- |
| 1280 × 800  | 640 (Cờ vua) | min(1280 − 696, 640) = **584** | 640                  |
| 1366 × 768  | 608          | min(670, 608) = 608            | 608                  |
| 1440 × 900  | 740          | min(744, 740) = 740            | 740                  |
| 1920 × 1080 | 920          | 920                            | 920                  |

Cách tính `--play-side` khi cột mở: lề 2 × 1.5rem + khoảng giữa 2rem + cột thông tin tối thiểu 20rem + 0.5rem dư = 25.5rem. Thêm 18rem của cột chat thì chiều ngang còn lại là `100vw − 43.5rem`.

Ở 1280 px, bàn nhỏ đi 9% (640 → 584 px). Khi cột chat mở, cột thông tin được ghim ở 20rem (`grid-cols-[auto_20rem]`), mức tối thiểu đã có của lưới. Nếu để `minmax(20rem,24rem)` thì lưới chia phần dư cho cả hai cột, khiến ô của bàn hẹp hơn bàn và bàn tràn sang cột thông tin. Lỗi này thấy được trên ảnh `44-*` trước khi sửa.

Đã cân nhắc cột chat ở 1024–1279 px: ở 1024 px, bàn chỉ còn `1024 − 696 = 328` px, quá nhỏ cho Cờ caro 19 × 19. Vì vậy khung này giữ `dock`.

### 4. Hộp thoại toàn màn hình (`dialog`)

**Phần tử**

- `<dialog>` gốc, mở bằng `showModal()`, chứa `ChatPanel`. Nhờ đó có sẵn ba thứ:
  - phần còn lại của trang `inert`;
  - lớp trên cùng, nằm trên cả lớp xúc xắc;
  - sự kiện `cancel` khi nhấn Esc, và khi dùng cử chỉ quay lại trên Android (CloseWatcher).
- Class: `fixed inset-x-0 m-0 size-auto max-h-none max-w-none p-0` phủ kín màn hình, không có `::backdrop` thấy được.

**Bàn phím ảo**

- `top` và `height` lấy từ `visualViewport` (`offsetTop`, `height`), đo lúc mở và khi vùng nhìn thấy đổi cỡ hay cuộn.
- Bàn phím mở thì hộp thoại thu theo, ô nhập và tin mới nhất vẫn thấy. Thay `useKeyboardHeight` bằng `useViewportBox(active)`.
- Đang phóng to bằng hai ngón (`scale > 1.01`) thì dùng `innerHeight`.

**Đóng**

- `cancel`: đang gõ bằng bộ gõ (`chat` biết qua `setComposing`) thì `preventDefault()`. Ngược lại thì để đóng.
- `close`: `chat.setOpen(false)` rồi `chat.focusButton()`.
- Nút đóng (X) gọi `dialog.close()`.
- Esc của `ChatPanel` (`onKeyDown`) bỏ qua khi là bố cục `dialog`, vì `cancel` đã lo.
- Quy tắc cũ "có `dialog[open]` khác thì bỏ qua" giữ cho `dock`.

**Đầu hộp thoại**

- Dòng lượt (`play.turnLine`) bọc `aria-live="polite"`, không có vai trò: dòng `role="status"` của màn hình chơi nằm ngoài hộp thoại và bị `inert`.
- Có khe lời của bàn (`notesSlot`), vì hộp thoại che bàn.
- Có nút xử bỏ ván hay "Chơi lại" như bảng `dock`.

**Tiêu điểm khi mở**

- Như hiện nay: màn hình cảm ứng thì vào nút đóng, để bàn phím ảo không bật lên chỉ để đọc tin; còn lại thì vào ô nhập.

**Đủ người trong lúc mở**

- Hộp thoại nằm trong portal của `ChatLayer`, ở trên nhánh sảnh chờ / màn hình chơi, nên vẫn mở, giữ chữ và tiêu điểm.
- Ở 1024–1279 px, sảnh chờ dùng `dialog` mà màn hình chơi dùng `dock`. Khi đổi, phần tử được thay; ô nhập lấy lại tiêu điểm nhờ `focusOnMount` (chuột, không cảm ứng).

### 5. Không đổi

- Bong bóng, emoji nổi và thẻ dưới thanh trên ở `dialog` và `dock` giữ nguyên chỗ.
- Tắt chat, giới hạn tốc độ, gửi lại, câu có sẵn, `role="log"` giữ nguyên.
- Không thêm token hay thư viện. Màu và viền dùng lại token của bảng chat hiện có, nên không cần tính lại tương phản.

## Risks / Trade-offs

- **Bàn đổi cỡ khi thu gọn hay mở cột.** Đó là thao tác có chủ đích; spec cho phép đúng hai trường hợp này.
- **`<dialog>` trên iOS Safari.** iOS hỗ trợ `showModal` từ 15.4. Bàn phím ảo không đổi cỡ hộp thoại, nên phải đo `visualViewport` (§4). Cần thử trên máy thật, thêm vào danh sách M8.
- **Cửa sổ trình duyệt máy tính thấp (dưới 512 px).** Gặp truy vấn xoay ngang nên dùng hộp thoại, như điện thoại.
- **Hai phần tử khác nhau khi đổi bố cục** (`dialog` sang `dock`). Tiêu điểm có thể mất trên màn hình cảm ứng cỡ 1024–1279 px khi ván thay sảnh chờ; chữ đang gõ thì vẫn còn trong store.

## Migration Plan

Không có dữ liệu cũ. Khoá `board-games:chat-column` mới; không có thì là mở.

## Open Questions

Không có. Người dùng yêu cầu implement và merge ngay (13/11/2026), không qua bước duyệt mockup. Bước kiểm tra hình là `pnpm ui:shots`: ảnh `40-*`–`43-*` sáng/tối × 390/1280.
