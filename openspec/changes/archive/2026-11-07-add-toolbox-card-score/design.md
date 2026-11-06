# Design

## Context

Xem `proposal.md` về lý do và phạm vi, `specs/card-score/spec.md` về hành vi. Bối cảnh ảnh hưởng tới cách làm:

- App đã có `idb-keyval` 6.3.0, `zod`, `<dialog>` gốc (`DialogFrame`), `ConfirmDialog`, `Card`, `Button`, `Input`, `StateScreen`, `lib/with-timeout.ts`. Không cần thư viện mới.
- Mọi route đều động (`app/layout.tsx` đọc locale, `i18n/request.ts` đọc cookie và header), không có service worker. Chuyển route bằng `<Link>` cần server, nên khi mất mạng không chuyển được.
- `DialogFrame` có nhánh trình duyệt tự đóng dialog không qua `cancel` (close watcher của Chromium).
- `useFormatter` dùng múi giờ cố định `Asia/Ho_Chi_Minh` (`i18n/config.ts`).
- Thanh trên cùng (`AppTopBar`, `AppStateScreen`) luôn dẫn về menu.

## Goals / Non-Goals

**Goals:**

- Nhập một ván 4 người trong khoảng 10 giây bằng một tay, không phải tự cộng.
- Không thể lưu một ván sai tổng; sửa được mọi ván đã lưu; không có đường nào tạo ván trùng.
- Toàn bộ công cụ nằm trong `apps/web/src/tools/`, phần logic là hàm thuần có test.

**Non-Goals:** như mục "Ngoài phạm vi" của proposal. Không đưa logic vào `packages/`, vì không có server cần dùng lại.

## Decisions

### 1. Công cụ không phải game

Công cụ không dùng `GameDefinition`, session hay transport. Đã cân nhắc coi đây là một "game" để dùng lại lưu ván, nhưng không có lượt, luật hay trọng tài, phải nhét điểm vào `applyMove`, và sửa một ván cũ không hợp với mô hình phát lại nước đi.

- `apps/web/src/tools/registry.ts`: `TOOLS` (id, `href: Route`, `Artwork`). Thêm công cụ là thêm một dòng.
- `apps/web/src/tools/card-score/`: logic, kho, component của công cụ.
- `apps/web/src/features/toolbox/ToolboxPage.tsx`: trang danh sách; `MenuPage` chỉ thêm một `<Link href="/tools">`, `typedRoutes` kiểm đường dẫn.

`tools/` được import `@board-games/ui`, `features/shell`, `features/identity` (`parsePlayerName`, và `name-limit.ts` cho độ dài tên), `lib`, `config`. Luật tên vì thế đi qua `features/identity` chứ không import trực tiếp `protocol`. ESLint: một block `@typescript-eslint/no-restricted-imports` riêng cho `src/tools/**`, cấm cả alias lẫn đường dẫn tương đối tới `transport`, `server`, `games`, `ai-worker` và `@board-games/{engine,games,protocol}`, có test trong `packages/config/eslint/index.test.js` (block sau trong flat config thay hẳn `no-restricted-imports` của block trước nên phải dùng rule riêng này).

### 2. Một khung client cho cả công cụ, để dùng được khi mất mạng

Một route catch-all `app/tools/card-score/[[...path]]/page.tsx` render `CardScoreApp`. Khung này đọc `usePathname()`, `useSearchParams()` và chọn màn hình:

| Đường dẫn                             | Màn hình       | Lối về         |
| ------------------------------------- | -------------- | -------------- |
| `/tools/card-score`                   | Danh sách nhóm | `/tools`       |
| `/tools/card-score/new`, `?from=<id>` | Tạo nhóm       | Danh sách nhóm |
| `/tools/card-score/<id>`              | Bảng điểm      | Danh sách nhóm |
| `/tools/card-score/<id>/edit`         | Sửa nhóm       | Bảng điểm      |

Trang server trả `notFound()` nếu `path` có dạng khác các dòng trên. Chuyển màn hình bằng `window.history.pushState`, tạo nhóm xong dùng `replaceState` (Next.js đồng bộ hai hàm này với `usePathname`, `PlayRoute.tsx` đã dùng `replaceState`). Liên kết là `<a href>` thật (`ToolLink`), chặn điều hướng rồi `pushState`, không dùng `<Link>` để khỏi prefetch và khỏi phụ thuộc router.

**Đã cân nhắc:**

- Bốn route riêng: gọn hơn về mặt Next.js, nhưng mất mạng thì không sang được "Sửa nhóm", đúng lúc có người vào thêm ở quán yếu sóng.
- Cắt lời hứa offline: tệ hơn, vì không có gì ở công cụ thực sự cần server.

`RoundSheet` và `ConfirmDialog` không tải lười, vì chunk tải lười sẽ hỏng khi mất mạng. `error.tsx` của route dùng `PageError` như các route khác, lối về là menu: một trang lỗi không nên dẫn lại vào màn hình vừa hỏng.

### 3. Mô hình dữ liệu

```ts
interface CardScoreGroup {
  readonly format: 1;
  readonly id: string; // randomId()
  readonly name: string; // "" = không đặt tên
  readonly players: readonly { id: string; name: string; active: boolean }[];
  readonly rounds: readonly { id: string; at: string; scores: Record<string, number> }[];
  readonly nextPlayerId: number; // id người chơi "p1", "p2": ngắn, không dùng lại
  readonly createdAt: string;
  readonly updatedAt: string;
}
```

- Một ván chỉ chứa điểm của những người có mặt lúc đó, nên thêm người, cho nghỉ, đổi tên không đụng tới ván cũ. Số thứ tự ván là vị trí trong mảng, nên xoá ván tự đánh số lại.
- **Id ván sinh lúc mở màn hình nhập**, không sinh trong transaction. `addRound` thấy id đã có: cùng số thì coi như xong, khác số thì ghi số mới (lần ghi trước thành công muộn và người dùng đã sửa số). Nhờ vậy bấm đúp, hay lưu lại sau khi hết giờ chờ, không tạo ván trùng. Ván trùng vẫn cân nên không kiểm tra nào khác phát hiện được. Biểu mẫu tạo nhóm giữ một id cho cả vòng đời vì cùng lý do.
- **Một giới hạn điểm cho mọi nơi**: tuyệt đối tối đa 9.999.999 ở ô nhập, số tự tính và dữ liệu lưu. Số tự tính vượt thì chặn lưu. Vì vậy mở lại một ván cũ không bao giờ gặp số quá giới hạn.
- Giới hạn khác: 500 ván một nhóm, 16 người kể cả đã nghỉ. Một nhóm tối đa khoảng 100 KB.
- Mọi thao tác đổi nhóm là hàm thuần `(group, input, now) => group`, ném `CardScoreError` có mã (`score-mismatch`, `round-gone`, `player-gone`, `round-limit`, …), test được không cần trình duyệt.
- **Schema zod kiểm cả ràng buộc giữa các trường** bằng `superRefine`: id người không trùng, khoá của `scores` có trong `players`, số là số nguyên trong giới hạn, `nextPlayerId` lớn hơn mọi id đang có. Tên lưu trữ chỉ là `z.string()`; luật tên chỉ áp lúc nhập, để siết luật tên online sau này không biến nhóm cũ thành hỏng.

### 4. Kho: IndexedDB, chỉ ghi qua `update`

- Database riêng `board-games-card-score`, store `groups`, khoá là `id`, theo quy ước ở `storage-keys.ts`.
- **Interface kho chỉ có `get`, `update`, `entries`, `del`, không có `set`**: mọi thao tác đổi nhóm đi qua `update`, nên không viết được kiểu đọc rồi ghi không nguyên tử. Riêng xoá nhóm đọc rồi xoá: chỉ để từ chối bản mới hơn, không có gì bị mất nếu xen nhau. `update` của `idb-keyval` đọc và ghi trong cùng transaction; updater ném lỗi thì không `put` gì và promise bị reject (đã đọc code 6.3.0). Hàm trả `void`, nên kết quả lấy qua closure. Đã cân nhắc `get` rồi `set` (mất ván khi hai tab xen nhau) và localStorage (đồng bộ, dễ đầy, không có transaction).
- **Kiểm chứng**: unit test bằng KV giả không có `set`, thêm E2E hai trang bấm "Lưu ván" gần như đồng thời nhiều lần trên IndexedDB thật. Không thêm `fake-indexeddb`.
- **Mọi updater đi qua `readGroup`**, trả `saved | newer | corrupt`, từ chối ghi với cả `newer` lẫn `corrupt`. Chỉ `deleteGroup` được xoá `corrupt`, và chỉ khi người dùng chọn từ trang của nhóm đó. Không tự xoá (khác ván dở, đây là số liệu người dùng tự nhập). Xoá nhóm `newer` bị từ chối.
- Danh sách đọc bằng `entries()` trong một transaction và trả về nhóm đọc được, số nhóm `newer` và id các nhóm `corrupt`, để hiện một dòng báo kèm lối mở trang của nhóm hỏng.
- IndexedDB có thể treo vĩnh viễn (`transport/store-timeout.ts` đã gặp), nên mọi thao tác bọc `lib/with-timeout.ts`. Hết giờ thì báo lỗi; lần ghi muộn vẫn có thể thành công, id ván ở §3 lo phần lưu lại.
- **Tab khác** đọc lại khi có `visibilitychange` hay `focus`. Không dùng `BroadcastChannel`: một người một máy là đủ, đỡ một kênh phải test. Đọc lại MUST NOT đụng bản nháp đang nhập.
- `navigator.storage.persist()` gọi một lần sau khi tạo nhóm, không quan tâm kết quả.
- Không dùng được IndexedDB: màn hình báo lỗi có lối về; không giữ tạm trong bộ nhớ, vì mất điểm khi đóng tab còn tệ hơn báo trước.

### 5. Bàn số riêng

Bàn phím số của iOS không có dấu trừ ([WebKit bug 200226](https://bugs.webkit.org/show_bug.cgi?id=200226), [issue của vue-currency-input](https://github.com/dm4t2/vue-currency-input/issues/372)), mà ván nào cũng có số âm. Bàn phím hệ điều hành còn che nửa màn hình và iOS đẩy trang lên, có thể đẩy cả nút lưu ra ngoài.

| Phương án                                                        | Đánh giá                                                                                                                                           |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inputmode="numeric"` + nút ± mỗi dòng                           | Bàn phím che nửa màn hình, nút lưu xa tay, thêm một lần chạm ngoài bàn phím cho mỗi số âm                                                          |
| `inputmode="text"`                                               | Mở bàn phím chữ, phải đổi sang số mỗi lần                                                                                                          |
| **Bàn số riêng, ô vẫn là `<input>` thật với `inputmode="none"`** | **Chọn**: bố cục cố định, dùng một tay, nút lưu trong tầm ngón cái. Không dùng `readonly`, vì nó chặn gõ và dán, và trình đọc màn hình báo chỉ đọc |

Chi tiết:

- Hiện theo `(pointer: coarse)`. **Nút "Dùng bàn phím của máy" ngay trong màn hình nhập**, nhớ ở localStorage (`CARD_SCORE_KEYBOARD_KEY`): đây là lối thoát tức thì cho người dùng VoiceOver, TalkBack, nhập bằng giọng nói, iPad có bàn phím rời, và nếu thử máy thật thấy bàn số vướng. Chế độ này có nút ± ở đầu màn hình, vì bàn phím số của iPhone không có dấu trừ.
- **Nguồn chân lý là state `active` (chỉ số ô đang chọn) và `fresh` (ô vừa được chọn, số đầu nhập vào thay cả số cũ)**, không phải tiêu điểm. Bàn số ghi vào state rồi trả tiêu điểm về ô đó, cuộn ô đó vào vùng thấy. Bàn phím thật dùng `select()` khi focus để có cùng hành vi thay số. Focus lại đúng ô đó từ ngoài trang (quay về từ ứng dụng khác) không tính là chọn lại, để số đang gõ không mất.
- Thao tác của phím đặt ở `onClick`; `onPointerDown` chỉ `preventDefault` để giữ tiêu điểm. Trình đọc màn hình có thể không phát `pointerdown`, nên không phụ thuộc vào nó. Nút có `touch-manipulation` để bấm nhanh không phóng to. Bàn số là `role="group"`.
- "Tiếp": sang ô trống kế tiếp, quay vòng; không còn ô trống thì sang dòng sau, quay vòng.
- Bố cục: đầu màn hình cao 52 px (đóng, tiêu đề, đổi bàn phím; có thêm "Lưu ván" khi không có bàn số), dòng trạng thái một dòng cao cố định 36 px (tên dài bị cắt), danh sách ô cuộn được, bàn số dưới cùng 4 × 48 px. Ở 360 × 640 với 8 người: 640 − 52 − 36 − 192 = 360 px, 8 dòng 44 px là 352 px, còn 8 px đệm. Xoay ngang: hai cột.
- Phím: `7 8 9 ⌫ / 4 5 6 ± / 1 2 3 Tiếp / 0 (rộng gấp đôi) 00 Lưu ván`. "Lưu ván" tách khỏi "Tiếp" và không hoạt động khi chưa đủ điều kiện, nên bấm "Tiếp" liên tiếp không lưu nhầm. Bàn số bỏ qua chữ số thứ 8; số dán vào quá giới hạn thì ô báo lỗi.
- `parseScore` là hàm thuần, chuẩn hoá NFKC, nhận `+`, `-`, `−`. Giá trị mỗi ô giữ dạng chuỗi (`""`, `"-"`, `"-12"`). Số có dấu chấm hay phẩy bị coi là sai: `1.000` đọc khác nhau theo ngôn ngữ.

### 6. Trạng thái một ván là hàm thuần

`roundState(rows)` trả về một trong: `empty`, `invalid(playerIds)`, `missing(n)`, `auto(playerId, value)`, `auto-too-large(playerId)`, `mismatch(delta)`, `balanced`, kèm số lưu được. `invalid` thắng mọi trạng thái khác. Giao diện và thao tác lưu cùng dùng hàm này, nên điều hiện ra và điều được lưu không lệch nhau.

**Số tự tính là phần tử chữ riêng** đè lên ô, không phải `value` hay `placeholder`: ô có thể đang chứa `−`, và placeholder bị ẩn lúc đó. Ô giữ giá trị thật của nó nhưng chữ trong suốt khi đang tự tính; phần tử số tự tính `aria-hidden`, ô có `aria-describedby` tới một dòng ẩn đọc "Tự tính: +35". Nhãn "Tự tính" nằm dưới tên ở cột bên trái, không chồng lên số dài. Nền `accent-soft` giữ cả khi focus.

Trạng thái được báo qua một vùng `role="status"` ẩn, trễ khoảng 500 ms, để gõ số không làm trình đọc nói liên tục.

### 7. Vòng đời màn hình nhập

- **Sửa `DialogFrame`**: khi dialog tự đóng mà `open` vẫn true sau `onDismiss` (close watcher), gọi lại `showModal()`. Thêm một bộ đếm vào phụ thuộc của effect và test nhánh này. Dialog có sẵn không đổi, vì `onDismiss` của chúng đặt `open` false.
- **Hỏi lại khi đóng và xoá ván là khung ngay trong màn hình nhập**, không phải `ConfirmDialog` lồng hoặc anh em: `cancel`, `close` của dialog con lan lên dialog cha trong React, và hai dialog đè nhau làm thứ tự lớp phức tạp.
- **Khoá khi đang lưu**: state `saving` chặn lần bấm thứ hai; id ván ở §3 là lớp thứ hai.
- **Bản nháp ván mới** lưu vào sessionStorage theo id nhóm (`CARD_SCORE_DRAFT_KEY_PREFIX`), kèm id ván, để tải lại, bị hệ điều hành dọn tab trong lúc nghe điện thoại, hay vuốt quay lại đều còn. Danh sách người đang chơi đổi thì bỏ nháp. Không lưu nháp khi sửa ván cũ.
- **Danh sách người chốt lúc mở màn hình nhập**. Đọc lại từ tab khác không đổi nó. Lúc lưu, hàm thuần kiểm lại và báo `player-gone` hay `round-gone`, giữ nguyên số đã nhập. Người mới được thêm ở tab khác chỉ đơn giản không có trong ván đó.
- **Thông báo sau khi lưu** nằm trong vùng `role="status"` gắn sẵn ngoài dialog, đặt chữ sau khi dialog đóng, kèm nút "Sửa". Xoá ván thì đưa tiêu điểm về nút "Nhập ván N", vì nút đã mở không còn.
- **Cuộn trang**: lưu ván mới thì về đầu trang để thấy thông báo và xếp hạng; các trường hợp khác trở lại đúng chỗ lúc mở, vì trả tiêu điểm cho nút dính đáy màn hình làm trang tự nhảy.
- **`DialogFrame` còn được sửa một nhánh**: sự kiện `close` đến muộn hơn lúc đóng, nên dialog vừa mở lại thật nhanh không được coi là đã đóng (E2E Esc phát hiện).

### 8. Sửa nhóm áp dụng ngay

Mỗi thao tác (đổi tên khi rời ô, thêm, nghỉ, chơi lại, xoá) là một `update` riêng, với hàm thuần theo `playerId`. Không có bước "lưu" và không có bản nháp cả nhóm, nên không ghi đè mảng `players` từ bản cũ, và không có thứ tự thao tác nào bị kẹt giới hạn 8 người. Ô tên hiện giá trị đã lưu cho tới khi người dùng gõ, và chỉ ghi khi đã gõ, nên đi qua ô không đè đổi tên của tab khác. Nút "Xong" chờ các ô đang gõ lưu xong; có ô bị từ chối thì ở lại. Rời màn hình cách khác thì vẫn lưu tên đang gõ.

### 9. Tính toán tổng kết

- `standings`: cùng điểm cùng hạng kiểu 1, 1, 3; bằng điểm giữ thứ tự trong nhóm. Cúp chỉ hiện với hạng 1 có tổng lớn hơn 0.
- `settlements`: tham lam, người nợ nhiều nhất chuyển cho người được nhiều nhất, bằng nhau theo thứ tự trong nhóm. Không quá số người có tổng khác 0 trừ 1 lần và tất định. Không tìm số lần ít nhất tuyệt đối vì đó là bài toán NP-khó, trong khi 8 người không đáng phức tạp; vì vậy spec gọi đây là "gợi ý". Hàm luôn dừng và không ra lần chuyển 0 điểm, kể cả khi tổng đầu vào khác 0.

### 10. Luồng và màn hình

- **Lối vào**: một nút phụ trong phần đầu menu, phía trên `Card` để `ContinueList` tải sau không đẩy nó đi; ở cuối danh sách game thì trên điện thoại phải cuộn qua năm thẻ.
- **Bảng điểm** trên điện thoại, từ trên xuống: thông báo đã lưu; xếp hạng kèm "Sửa nhóm", "Chia sẻ tổng kết", "Buổi mới"; cân điểm; các ván; "Xoá nhóm" ở cuối. Nút "Nhập ván N" dính dưới cùng. Từ 1024 px hai cột.
- **Nhập ván là `<dialog>` toàn màn hình** dùng `DialogFrame` (export thêm), vì `Dialog` có sẵn lấy tiêu điểm vào tiêu đề và không có chỗ cho nút lưu. `initialFocus` là ô đầu tiên.
- **Tạo và sửa nhóm là màn hình cuộn thường**, không phải dialog: 8 ô chữ cần bàn phím hệ điều hành; cuộn thường là ít rủi ro nhất trên iOS.
- **Lối về**: `AppTopBar` thêm prop `back?: ReactNode` (kèm hằng `BACK_LINK_CLASS` cho cùng một dáng), vì lối về trong công cụ là `ToolLink` còn lối về menu là `<Link>`; `AppStateScreen` truyền tiếp prop này để các màn hình đang tải, không tìm thấy, không dùng được cũng về đúng chỗ.

### 11. Hình ảnh

Khung chung của app: không có `data-game`, không theme riêng. Hướng "sổ ghi điểm": số dùng `tabular-nums` cho thẳng cột, dòng hạng 1 nền `celebration-soft` kèm cúp, dấu `+`/`−` luôn có bên cạnh màu. Hình thẻ công cụ tự vẽ bằng SVG (một lá bài và một cột số), không dùng hình bên thứ ba. Tên trong cột lịch sử xuống tối đa 2 dòng, để phân biệt hai người trùng họ tên đệm.

**Token**: không thêm, không đổi. Icon thêm vào `packages/ui/src/icons.ts` khi code dùng tới: `Wrench`, `Plus`, `Pencil`, `Trash2`, `Share2`, `Delete`, `Keyboard`, `Users`, `ArrowRight`, `ArrowDown`, `Info`.

Tương phản của các cặp token dùng mới (đã tính bằng công thức WCAG):

| Cặp                                    | Sáng | Tối   |
| -------------------------------------- | ---- | ----- |
| `success-ink` / `surface`              | 6.52 | 10.85 |
| `success-ink` / `surface-muted`        | 5.56 | 9.71  |
| `danger-ink` / `surface`               | 7.16 | 9.78  |
| `danger-ink` / `surface-muted`         | 6.11 | 8.75  |
| `celebration-ink` / `celebration-soft` | 5.23 | 8.22  |
| `warning-ink` / `warning-soft`         | 5.12 | 9.25  |
| `success-ink` / `success-soft`         | 5.71 | 8.09  |
| `danger-ink` / `danger-soft`           | 5.90 | 8.88  |
| `accent-ink` / `accent-soft`           | 8.98 | 9.46  |
| `fg-muted` / `surface`                 | 6.19 | 7.32  |

Các cặp `*-ink` trên `accent-soft`, `fg-muted` trên `celebration-soft` và `surface-muted` đều từ 5:1 trở lên ở cả hai giao diện (lượt review code đã tính).

**Mockup**: `mockup/index.html` chạy được; người dùng duyệt trước khi code.

**Cách kiểm tra**: ảnh `pnpm ui:shots` sáng/tối × 390/1280 px, thêm 360 × 640 với 8 người tên dài cho màn hình nhập; `test:a11y` quét đủ màn hình mới.

### 12. Bản dịch và số

Namespace mới `Toolbox` và `CardScore`, khoảng 5 KB chữ thêm vào bản tin client của mọi trang, khoảng 1,5 KB sau gzip. Chấp nhận: khoảng này không đáng thêm một lớp gộp bản tin theo route. Chỉ `Rules` vẫn bị loại như hiện tại.

Số hiển thị qua `useFormatter` theo ngôn ngữ, dấu luôn có khi khác 0, dùng dấu trừ `−`; số điểm cân đi qua ICU (`{amount, number}`, số nhiều ở tiếng Anh). Giờ lưu truyền múi giờ của thiết bị thay cho múi giờ cố định của app, an toàn vì chỉ render sau khi đọc IndexedDB. Tên người do người dùng nhập, nên không dịch và có `translate="no"`.

## Risks / Trade-offs

- **Mất dữ liệu khi trình duyệt dọn bộ nhớ.** Theo các nguồn thứ cấp đã tìm, Safari xoá bộ nhớ của trang sau 7 ngày dùng Safari mà không tương tác với trang đó ([Didomi](https://docs.didomi.io/releases-and-announcements/announcements/apple-implements-7-day-cap-on-script-writable-storage)), và ứng dụng thêm vào màn hình chính được đối xử riêng; chưa đối chiếu được với tài liệu của WebKit. Nhóm chơi cách tuần trên iPhone có thể mất dữ liệu → trang ghi rõ dữ liệu chỉ ở trình duyệt này, gọi `persist()`, nhắc chia sẻ tổng kết cuối buổi. Sao lưu ra file là việc đầu tiên nên làm tiếp nếu chuyện này xảy ra thật.
- **Một máy duy nhất.** Điện thoại người ghi hết pin thì buổi chơi mất lối vào điểm cho tới khi sạc → chấp nhận, đúng cách dùng người dùng mô tả.
- **Bàn số riêng là thói quen mới, `inputmode="none"` chưa thử trên máy thật.** E2E chỉ mô phỏng cảm ứng → mockup đã dùng đúng cơ chế này; thử mockup trên một iPhone và một Android trước khi code nếu làm được (task 0.1), có nút đổi sang bàn phím của máy ngay trong màn hình.
- **Số tự tính có thể sai ý** nếu nhập nhầm ô khác → số hiện ngay ở dòng đó và trong dòng trạng thái trước khi lưu, và sửa được ngay từ thông báo đã lưu.
- **Bảng lịch sử cuộn ngang trong khung** với 8 người trên điện thoại → cột số ván cố định; chấp nhận vì danh sách thẻ làm mất khả năng so theo cột.
- **Một route catch-all** làm trình duyệt không tách chunk theo màn hình → chấp nhận, công cụ nhỏ và đổi lại dùng được khi mất mạng.
- **URL có `%` hỏng** (`/tools/card-score/%`) ra trang 500 trần của Next trước khi tới code app, như mọi route hiện có (`/room/%`) → không xử lý riêng ở change này.
