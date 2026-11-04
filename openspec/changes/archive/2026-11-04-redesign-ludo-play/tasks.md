# Tasks

## 0. Thiết kế

- [x] 0.1 Mockup chạy được (`mockup/index.html`, ảnh `mockup/png/`): ngựa tự vẽ ở 22/30/40 px, chạm ngựa để đi, nhấn giữ để gieo với Three.js + cannon-es, ép số 1–6 đều dừng đúng mặt
- [x] 0.2 Người dùng duyệt mockup và chốt: lớp mờ chỉ cho người ở thiết bị này, một chạm là đi, xúc xắc Three.js + vật lý (04/11/2026)
- [x] 0.3 Hai lượt duyệt thiết kế, đã gộp vào spec và design (kho quỹ đạo, giữ màn hình, pha cử chỉ, chạm theo tâm hình mọi ngựa, nhịp 2500 ms, nước tới sau xếp hàng)

## 1. Nhịp máy và nước tới sau

- [x] 1.1 `ai-timing.ts` thêm `AI_THROW_DELAY_MS` (2500) và cập nhật chú thích; `local-transport` (`aiDelayMs`) dùng nó khi nước cuối là lần gieo của người; test: 2500 sau lần gieo của người, 800 sau lần gieo của máy, nước máy trong 3 s kể từ khi có số (scenario "Máy chờ cú tung của người chơi", "Máy không đi ngay sau khi gieo", "Máy đáp lại sau nước của người chơi")
- [x] 1.2 `online-transport`: sau khi hiện lần gieo của ghế mình (không tính ghế `standIn`), giữ khoảng dừng ≥ 2500 ms, nước tới ở lần cập nhật sau xếp hàng đúng thứ tự; ván mới và kết nối lại vẫn thay ngay; test transport (scenario "Người ở xa gieo nhanh trong lúc xúc xắc còn lăn", "Kết nối lại khi đang tung")
- [x] 1.3 Cập nhật luật chuyển động trong `.claude/skills/board-games-ui/SKILL.md` (cú tung 3D ≤ 1,9 s trong `AI_THROW_DELAY_MS`)

## 2. Quân ngựa và hình học bàn

- [x] 2.1 `board-geometry.ts`: `viewBox` `0 -0.3 15 15.3`, phép biến đổi toạ độ bàn ↔ phần trăm của khung, tâm hình ngựa; khung bàn `aspect-[15/15.3]`; unit test phép biến đổi và tâm hình
- [x] 2.2 `Horse.tsx`: quân đầu ngựa trên đế theo mockup, ký hiệu màu trên đế khoảng 0,28 ô, giữ dấu vừa đi, bị đá, ngựa mờ xem trước; hàng trên cùng không bị cắt; test component (scenario "Quân hình con ngựa", "Phân biệt không chỉ bằng màu", "Đánh dấu nước vừa đi")
- [x] 2.3 Token `--animate-piece-bob` trong `packages/ui/src/styles.css` (nhánh `motion-reduce`, biên độ trong phần nới của `viewBox`); ngựa chọn được nhấp nhô + vòng mực + quầng màu; cập nhật `styles.test.ts` nếu nó liệt kê token animation

## 3. Chạm ngựa để đi

- [x] 3.1 `ChoiceTargets.tsx`: nút trong suốt `pointer-events: none` trên mỗi ngựa chọn được (`data-ludo-choice`, tên đọc như cũ, cạnh `max(24px, 1,36 ô)`, đặt bằng `board-geometry`), `role="group"` "Chọn ngựa", roving tabindex + phím mũi tên; xem trước (ngựa mờ, khung đích, dấu ✕) khi trỏ hay đưa tiêu điểm
- [x] 3.2 `Board.tsx`: bỏ danh sách nút dưới bàn; một bộ xử lý `click` trên khung bàn (cần `pointerdown` trên khung, cùng `pointerId`), chọn ngựa có tâm hình gần nhất trong **mọi** ngựa, chỉ đi khi ngựa đó chọn được; gộp `onClick` cũ của SVG
- [x] 3.3 Bản dịch vi/en/ja: tên nhóm "Chọn ngựa"; lời nhắc sau khi gieo giữ số đã gieo và không nói "chạm" (ví dụ "{player} gieo được {face}. Chọn một ngựa được đánh dấu để đi."); bỏ khoá không còn dùng
- [x] 3.4 Test component: cập nhật `Board.test.tsx`, `ludo-play.test.tsx` (lời nhắc, vị trí nhóm lựa chọn); thêm: một chạm là đi, chạm ngựa không đi được (kể cả nằm sát ngựa đi được) không có nước, chạm khi chưa gieo không có nước, không còn nút lựa chọn ngoài bàn, mũi tên chuyển ngựa và Tab rời nhóm, hai ngựa sát nhau chọn ngựa gần hơn, tiêu điểm về nút gieo sau khi đi (scenario "Một chạm là đi", "Chạm ngựa không đi được", "Chạm ngựa không đi được cạnh ngựa đi được", "Không còn danh sách lựa chọn", "Chuyển ngựa bằng phím mũi tên", "Hai ngựa chọn được nằm sát nhau", "Chọn ngựa", "Ô đích khi đưa tiêu điểm")

## 4. Giữ màn hình và cử chỉ

- [x] 4.1 `features/play/presentation-hold.tsx` + `PlayScreen`: `hold()`/nhả; khi giữ, dòng lượt, bảng người chơi, đồng hồ lượt và nút của ván dựng từ ảnh chụp lúc giữ; ván được thay thì nhả ngay; test PlayScreen (scenario "Mất lượt chưa lộ khi xúc xắc còn lăn")
- [x] 4.2 `dice3d/use-hold-to-roll.ts` (không import three): pha `idle/hold/await/fly/rest`, nhấn/thả con trỏ chính với pointer capture, Space giữ/nhả (bỏ lặp, chặn click gốc), Enter và click ngoài pha giữ = tung nhẹ, huỷ khi Esc (trên `document`), `pointercancel`, `lostpointercapture`, trang ẩn, cửa sổ mất tiêu điểm, `canRoll`/ply/`disabled` đổi; kiểm lại `canRoll` lúc thả; chỉ gửi `{ type: "roll" }` khi thả; test hook (scenario "Giữ Space để lắc", "Huỷ khi đang giữ", "Chưa thả thì chưa gieo", "Giữ lâu không gửi gì thêm", "Gieo 6 không đi được chỉ gieo một lần", "Mất kết nối khi đang giữ")
- [x] 4.3 Nút gieo: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, chặn `contextmenu`; vẫn là nút cũ (vai trò, `aria-disabled`, lý do khoá, màu người sắp gieo); test component cho các thuộc tính đó

## 5. Cú tung 3D

- [x] 5.1 Thêm `three` 0.186.0, `@types/three` 0.186.x, `cannon-es` 0.20.0 vào `catalog` và `apps/web` (cùng commit với code đầu tiên dùng chúng để `knip` không đỏ); `pnpm install` không cần `allowBuilds`, lockfile chỉ thêm các gói này; thêm hai mục vào `apps/web/public/third-party-licenses.txt` với nguyên văn giấy phép MIT
- [x] 5.2 `dice3d/throw-sim.ts`: kho quỹ đạo theo mức lực (2 mô phỏng mỗi khung), kiểm dừng phẳng (≥ 0,99), bay 0,9–1,4 s, chọn quỹ đạo có mặt trên tự nhiên đúng số, phép quay đối xứng dự phòng, báo "không có quỹ đạo" để dùng 2D; unit test trong Node: mỗi số 1–6 qua ít nhất 20 seed đều có quỹ đạo đúng mặt, thời gian bay trong khoảng, mức mạnh không bay ngắn hơn mức yếu (scenario "Mặt trên đúng số ván ghi", "Giữ lâu tung lâu hơn")
- [x] 5.3 `dice3d/load-dice3d.ts` + `dice-stage.ts`: kiểm WebGL một lần (giải phóng canvas kiểm), `import()` động khi nút gieo lần đầu bấm được cho người ở thiết bị này, tạo renderer và `compile` lúc rảnh; cảnh (xúc xắc bo góc, mặt vẽ canvas theo token sáng/tối, bóng vẽ sẵn, tỉ lệ điểm ảnh ≤ 2, khung camera cố định trong cú tung); `webglcontextlost`/lỗi → 2D; dọn texture/vật liệu và `forceContextLoss()` khi rời màn, an toàn với StrictMode; test các nhánh không WebGL, tải lỗi, mất ngữ cảnh, dọn
- [x] 5.4 `dice3d/ThrowOverlay.tsx` + nối vào `Board.tsx`: portal vào `body`, `fixed`, `--overlay` + blur, `aria-hidden`, `data-throw="3d"`, nuốt con trỏ từ lúc thả, vòng lực, dòng gợi ý, số lớn + "Được gieo thêm"/"Mất lượt"; phát theo thời gian thực, hạn cứng 1,9 s sau khi có số; số trễ thì quay tại chỗ, quá 3 s đóng; nước bị từ chối đóng ngay; đổi hướng màn hình kết thúc ngay; gọi `hold()` lúc thả và nhả lúc tắt; bàn hiện như trước khi gieo tới khi dừng rồi mới hiện số, ngựa chọn được, lời nhắc live và chuyển tiêu điểm; test component với stage giả (scenario "Nhấn giữ rồi thả", "Bấm nhanh", "Số về muộn", "Gieo và đi bằng bàn phím")
- [x] 5.5 Đường 2D: giảm chuyển động, không WebGL, chunk chưa sẵn hay lỗi → bấm là gieo, không lớp phủ; máy và người ở xa vẫn dùng xúc xắc nhỏ; test component (scenario "Không có WebGL", "Giảm chuyển động khi gieo", "Máy gieo không làm mờ màn hình", "Người ở xa gieo không làm mờ màn hình", "Giảm chuyển động", "Cập nhật mới giữa hiệu ứng", "Xúc xắc đang lăn khi mất lượt")
- [x] 5.6 Bản dịch vi/en/ja cho dòng gợi ý giữ để gieo, "Được gieo thêm", "Mất lượt" trên lớp phủ (dùng lại khoá có sẵn nếu trùng nghĩa)

## 6. E2E, ảnh và kiểm tra

- [x] 6.1 Playwright: thêm `--enable-unsafe-swiftshader` vào cấu hình Chromium (E2E và ui-shots); `e2e/ludo-throw.spec.ts` (kiểm `data-throw="3d"`): giữ rồi thả → lớp phủ hiện rồi tắt, ô xúc xắc hiện đúng số ván ghi; Esc huỷ không gieo; bấm thêm khi đang tung vẫn chỉ một lần gieo; dòng lượt không đổi khi đang tung; đấu với máy, mất lượt → máy không gieo trước khi lớp phủ tắt (có biên độ)
- [x] 6.2 Cập nhật E2E cũ: `play-ludo`, `online-ludo`, `play-vs-ai`, `layout-small` (bỏ kịch bản cột lựa chọn cuộn), `motion`, `a11y` — đường 2D bằng `reducedMotion: "reduce"` nơi không kiểm cú tung; chọn ngựa bằng tiêu điểm + Enter hoặc bấm theo toạ độ bàn; thay kiểm "lựa chọn cao ≥ 44 px" bằng vùng chạm ≥ 24 px; `test:a11y` có trạng thái chọn ngựa, 0 vi phạm (kể cả `target-size`)
- [x] 6.3 `ui-shots`: Cờ cá ngựa chờ gieo, đang giữ, đang bay, lúc hiện số, đang chọn + xem trước (dừng thời gian bằng `page.clock`), sáng/tối × 390/1280, thêm 360 cho trạng thái chọn; xem từng ảnh, so với `mockup/png/`
- [x] 6.4 Kiểm bản build: chunk 3D ≤ 250 KB gzip, không nằm trong JS tải đầu của `/`, `/play/tictactoe`, `/play/chess/local`, `/play/ludo/local`; ghi kích thước thật vào design §2
- [x] 6.5 Rà `web-design-guidelines` trên các file đã đổi
- [x] 6.6 `pnpm check --concurrency=1`, `pnpm knip`, `pnpm format:check`, `pnpm spec:check`, `pnpm test:e2e` (đầy đủ), `pnpm test:a11y` xanh; cập nhật plan.md §10 (mục Sau MVP) và README nếu có mô tả cách gieo

## Ngoài phạm vi

- Thử trên điện thoại thật (giữ lâu, trượt ngón, máy đời thấp, iOS Safari): cần máy thật, Playwright chỉ chạm một cái; người dùng tự thử sau khi deploy, như danh sách ở plan.md §10.

## Workflow follow-up

- Hai lượt review code (senior, săn bug), sửa, rồi archive trong cùng PR (`pnpm exec openspec archive redesign-ludo-play --yes`), đối chiếu delta với code trước khi archive.
