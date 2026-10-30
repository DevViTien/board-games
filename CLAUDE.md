# CLAUDE.md

Hướng dẫn cho Claude Code trong repo **board-games** (Board Games Hub): web app chơi cờ trên trình duyệt — cùng máy, đấu với máy, online với bạn bè qua link mời. Dự án cá nhân, phi thương mại.

## Tài liệu nguồn

| Tài liệu               | Trả lời câu hỏi                                                               |
| ---------------------- | ----------------------------------------------------------------------------- |
| `idea.md`              | Sản phẩm là gì, đã chốt những gì (mục 9 "Quyết định đã chốt")                 |
| `plan.md`              | Kiến trúc (§3), quy ước code (§4), các mốc M0–M8 (§6), tiến độ (§10)          |
| `openspec/specs/`      | Hệ thống **đang** làm gì (hành vi hiện trạng — WHAT)                          |
| `openspec/changes/`    | Việc **sắp** làm (proposal, design, delta spec, tasks); `archive/` là lịch sử |
| `openspec/config.yaml` | Bối cảnh dự án và **các bất biến kiến trúc** — đọc trước khi đổi kiến trúc    |
| `README.md`            | Lệnh chạy, cấu trúc thư mục                                                   |

## Lệnh

| Lệnh                       | Khi nào                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| `pnpm check`               | Lint, typecheck, test, build — chạy trước khi coi một việc là xong |
| `pnpm knip`                | Tìm file, export, thư viện thừa                                    |
| `pnpm spec:check`          | Kiểm tra OpenSpec (strict) + không còn change xong mà chưa archive |
| `pnpm test:e2e`            | Playwright, khi đổi giao diện hoặc luồng người dùng                |
| `pnpm --filter <pkg> test` | Test một package (`@board-games/web`, `@board-games/ui`, …)        |
| `pnpm exec openspec …`     | CLI OpenSpec                                                       |

Gọi OpenSpec bằng **`pnpm exec openspec`**: repo ghim bản 1.15 trong `pnpm-workspace.yaml`, còn bản cài global trên máy có thể cũ hơn và sinh file khác định dạng.

## Quy trình bắt buộc: OpenSpec (spec-driven)

### Khi nào PHẢI đi qua OpenSpec

Thêm, sửa hoặc bỏ **hành vi** (người chơi hoặc hệ thống quan sát được) → bắt buộc:

1. `/opsx:explore` — khi yêu cầu còn mơ hồ, cần đọc code và bàn phương án trước (không viết code).
2. `/opsx:propose <mô tả>` — tạo change trong `openspec/changes/<tên>/` gồm proposal, delta spec, design, tasks.
3. `/opsx:apply` — code theo `tasks.md`, tick từng task khi xong và test xanh.
4. `/opsx:archive` — khi mọi task xong: gộp delta vào `openspec/specs/`, chuyển change vào `archive/`.

Mỗi mốc trong `plan.md` §6 được làm qua một hoặc nhiều change; proposal ghi rõ thuộc mốc nào. Tên change là kebab-case tiếng Anh dạng động từ + đối tượng: `add-game-engine`, `add-tictactoe-game`, `add-online-rooms`.

**Không** tạo file kế hoạch riêng (`plans/`, `TODO.md`…) cho việc sắp làm — dùng `openspec/changes/`.

### Khi nào KHÔNG cần change

- Sửa lỗi, refactor, đổi tooling/hạ tầng, sửa tài liệu **không đổi requirement** → làm thẳng.
- Nếu khi sửa phát hiện **hành vi lệch khỏi spec** → cập nhật spec (change nhỏ hoặc sửa thẳng `openspec/specs/`) để spec không bao giờ sai.

### Xong nghĩa là đã archive, trong cùng PR

- Tick task cuối **chưa phải** là xong. Chừng nào chưa archive, `openspec/specs/` không mô tả hành vi vừa ship.
- Tick task cuối ⇒ chạy `/opsx:archive` (hoặc `pnpm exec openspec archive <tên> --yes`) và commit cùng PR.
- `pnpm spec:check` (CI) **đỏ** nếu còn change tick hết task mà chưa archive. Không bao giờ sửa đỏ bằng cách bỏ tick lùi; hai đường đúng là archive, hoặc bỏ tick task thật sự chưa xong.
- **Không bao giờ archive hành vi chưa có trong code** — đó là ghi hành vi giả vào `specs/`.
- `tasks.md` là lời khai trạng thái, không phải danh sách ước muốn. Việc cố ý hoãn chuyển xuống mục `## Ngoài phạm vi` (kèm lý do), không để `- [ ]` treo mãi.
- Trước khi archive, đối chiếu delta với **code hiện tại**: code có thể đã đi khác lúc đề xuất; `specs/` phải tả đúng cái code đang làm.

### Bẫy khi sửa spec đang có

- Khối `## MODIFIED Requirements` **thay trọn** requirement trong `specs/`. Phải chép **toàn bộ** thân requirement hiện có rồi mới sửa; chép thiếu thì archive vẫn xanh nhưng `specs/` mất nội dung, im lặng. Luôn diff cả thân với bản trong `specs/` trước khi archive.
- Requirement đổi bản chất → cặp `## REMOVED Requirements` + `## ADDED Requirements` với **tên khác nhau**.
- Đổi tên một requirement làm hỏng mọi delta khác còn trỏ tên cũ → grep `openspec/changes/*/specs/**` trước khi đổi.
- Archive theo thứ tự tạo change. Nếu công cụ từ chối (delta trỏ vào spec chưa tồn tại, xoá mất scenario change khác đã thêm) thì làm mới delta, **không** dùng `--no-validate` để ép qua.

### Ngôn ngữ artifact

Nội dung proposal, design, tasks, requirement, scenario viết **tiếng Việt**. Giữ **tiếng Anh**: tiêu đề cấu trúc (`## Why`, `## Purpose`, `## Requirements`, `### Requirement:`, `#### Scenario:`, `## ADDED/MODIFIED/REMOVED Requirements`), dấu `**WHEN**`/`**THEN**`/`**AND**`, từ khoá `SHALL`/`MUST` (validator bắt buộc), và mọi định danh (tên change, capability, hàm, kiểu, mã lỗi, khoá bản dịch, đường dẫn). Chi tiết: `openspec/config.yaml` (`rules`).

## Bất biến kiến trúc

Danh sách đầy đủ nằm ở **một chỗ duy nhất**: `openspec/config.yaml` → `context` → "Bất biến". Đọc trước khi đổi bất cứ gì liên quan tới chiều phụ thuộc giữa package, luật game, chơi online, bản dịch hay danh tính người chơi. Change nào cần vi phạm một bất biến phải nói rõ trong proposal và lý do; nếu được chấp nhận thì sửa luôn danh sách ở đó.

## Quy ước code (tóm tắt — đầy đủ ở plan.md §4)

- Không `enum` (dùng object `as const` + union); export có tên; file `kebab-case.ts`, component `PascalCase.tsx`.
- Không viết chữ hiển thị cứng trong component: thêm khoá vào `apps/web/messages/vi.json` **và** `en.json`, `ja.json`.
- Style chỉ bằng class Tailwind + token; ghép bằng `cn()`, biến thể bằng `cva()`. Icon chỉ import từ `@board-games/ui`.
- Test đặt cạnh code; component test bằng `renderWithIntl` và truy vấn theo vai trò (`getByRole`).
- Thêm thư viện: khai báo phiên bản trong `catalog` của `pnpm-workspace.yaml`. Không thêm ngoại lệ cho chính sách tuổi phiên bản (`minimumReleaseAgeExclude`) và không bật script cài đặt (`allowBuilds: true`) khi chưa có lý do ghi lại.
- Commit theo Conventional Commits; không bỏ qua git hook (`--no-verify`).
