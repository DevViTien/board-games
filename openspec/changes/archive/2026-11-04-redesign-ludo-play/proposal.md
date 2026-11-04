# Proposal

## Why

Bàn Cờ cá ngựa hiện vẽ quân thành đĩa tròn, chọn ngựa bằng một danh sách nút bên dưới bàn và gieo bằng một cú bấm với xúc xắc 2D nhỏ: đúng luật nhưng thiếu cảm giác "chơi thật". Người dùng muốn quân là con ngựa, chạm thẳng vào ngựa để đi, và một lần gieo có nghi thức (nhấn giữ để lắc, thả tay để tung, xúc xắc lăn giữa màn hình).

Change thuộc **Sau MVP (v1)** trong plan.md §6.3 — làm đẹp và tăng trải nghiệm một game đã có, sau khi M8 hoàn thiện MVP.

## What Changes

- **Quân ngựa tự vẽ**: mỗi ngựa là quân hình đầu ngựa đứng trên đế (SVG tự vẽ, không lấy của bên thứ ba), ký hiệu màu ●■▲◆ nằm trên đế nên vẫn không phân biệt chỉ bằng màu. Mọi dấu hiện có (vừa đi, bị đá, chuồng của người đang đi) giữ nguyên.
- **Chạm ngựa để đi** — **BREAKING** (giao diện): bỏ danh sách nút "Ngựa 1: …" dưới bàn. Sau khi gieo, những ngựa đi được nhấp nhô và có vòng sáng; một chạm (hay một cú bấm chuột) vào ngựa là ngựa đi ngay. Trỏ chuột hay đưa tiêu điểm vào ngựa thì hiện ngựa mờ ở ô tới, khung ô đích và dấu trên ngựa sẽ bị đá. Bàn phím và trình đọc màn hình dùng các nút trong suốt đặt trùng lên những ngựa đi được (tên đọc như các nút cũ, mũi tên để chuyển ngựa).
- **Gieo bằng nhấn giữ**, chỉ cho người ở thiết bị này: nhấn giữ "Gieo xúc xắc" thì cả màn hình mờ đi, xúc xắc 3D hiện giữa màn hình lắc như trong tay, vòng "lực" đầy dần; thả tay thì xúc xắc được tung, lăn và nảy theo mô phỏng vật lý, giữ càng lâu tung càng mạnh và lăn càng lâu; rồi hiện số lớn (kèm "Được gieo thêm" hay "Mất lượt" khi có), lớp mờ tắt và số về ô xúc xắc cạnh bàn. Bấm nhanh hay Enter là một cú tung nhẹ; giữ Space để lắc bằng bàn phím.
- **Số gieo vẫn do engine (cùng máy) hoặc server (online) bốc** bằng bộ sinh ngẫu nhiên an toàn, xin lúc thả tay; hình 3D chỉ đáp xuống đúng số đã bốc. Thời gian giữ và cách tung MUST NOT ảnh hưởng tới số ra.
- **Lần gieo của máy và người chơi ở xa** không mở lớp mờ: xúc xắc nhỏ cạnh bàn lăn như bây giờ.
- **Không có WebGL, tải thư viện 3D lỗi, hay bật giảm chuyển động**: không lớp mờ, bấm là gieo, số hiện ngay ở ô xúc xắc như hiện nay.
- **Không lộ, không gieo hai lần, không bị cắt**: trong lúc xúc xắc còn lăn, dòng lượt, bảng người chơi và lời nhắc vẫn như trước khi gieo (kết quả chỉ hiện và được đọc khi xúc xắc dừng); mọi lần bấm thêm bị bỏ qua; nước của máy hay người ở xa tới lúc đó chờ tới khi lớp mờ tắt.
- **Nhịp máy**: sau lần gieo của người, nước kế tiếp của máy chờ cú tung kết thúc (khoảng 2,5 giây sau khi có số, lớp mờ tắt trong 1,9 giây), cả khi chơi với máy lẫn ghế máy trong phòng online; lần gieo của máy giữ nhịp cũ.
- **Thư viện mới** (tải lười, chỉ khi vào màn chơi Cờ cá ngựa): `three` (vẽ 3D, MIT) và `cannon-es` (vật lý, MIT).

## Capabilities

### New Capabilities

(không có)

### Modified Capabilities

- `ludo`: chọn bằng cách chạm ngựa thay cho danh sách nút ("Gieo và chọn ngựa trên bàn", "Cờ cá ngựa bằng bàn phím và trình đọc màn hình", "Bàn Cờ cá ngựa vừa màn hình điện thoại"); hiệu ứng gieo mới ("Hiệu ứng gieo và đi quân"); ghi rõ xúc xắc nhỏ còn lăn ("Bàn Cờ cá ngựa"); thêm "Quân hình con ngựa", "Chạm ngựa để đi", "Gieo bằng nhấn giữ", "Số gieo không phụ thuộc cách tung", "Gieo khi không có xúc xắc 3D", "Kết quả chỉ lộ khi xúc xắc dừng", "Đang tung thì không đi được" và "Cú tung không bị cắt".
- `play-vs-ai`: "Nhịp máy sau kết quả ngẫu nhiên" và "Máy tự đi khi tới lượt" — sau lần gieo của người chơi, máy chờ cú tung kết thúc và đi trong vòng 3 giây kể từ khi có số (thay cho 2 giây).

## Impact

- **Code**: `apps/web/src/games/ludo/` (Board, quân ngựa, xúc xắc 3D và lớp mờ, hook nhấn giữ, bản dịch, test); `apps/web/src/transport/ai-timing.ts`, `local-transport.ts`, `online-transport.ts` (nhịp sau lần gieo của người, nước tới sau xếp hàng); `apps/web/src/features/play/` (giữ màn hình trong lúc tung); `.claude/skills/board-games-ui/SKILL.md` (luật chuyển động); `packages/ui/src/styles.css` nếu cần token mới (lớp mờ, vòng lực); `apps/web/messages/{vi,en,ja}.json`; E2E `play-ludo`, `online-ludo`, `play-vs-ai` và `ui-shots`.
- **Không đổi**: luật game (`packages/games`), engine, protocol, server, kho phòng. `PROTOCOL_VERSION` giữ nguyên, phòng đang chơi không bị ảnh hưởng.
- **Thư viện**: `three` 0.186.0 và `cannon-es` 0.20.0 vào `catalog` (ước tính khoảng 157 KB gzip, ngân sách 250 KB; một chunk tải lười, không vào JS tải đầu của trang nào).
- **Bất biến**: không chạm bất biến nào. Server vẫn là trọng tài, số gieo vẫn do server tạo (online) hay engine tạo (cùng máy); hình 3D chỉ là cách hiện kết quả.

## Ngoài phạm vi

- Lớp mờ và xúc xắc 3D cho lần gieo của máy hay người chơi ở xa (người dùng chốt: chỉ người ở thiết bị này).
- Chạm hai lần (chọn rồi xác nhận) trước khi đi: người dùng chốt một chạm là đi; online chạm nhầm thì không hoàn tác được, như mọi nước đi online khác.
- Chạm để bỏ qua cú tung đang lăn.
- Âm thanh, rung (Vibration API).
- Đổi hình quân hay xúc xắc của các game khác.
- Kéo thả ngựa.
