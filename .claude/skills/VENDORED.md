# Skill vendored từ bên ngoài

Các skill dưới đây được **chép nguyên văn** (vendor) từ repo công khai trên GitHub và ghim theo commit SHA.
Không cài bằng installer (`npx skills`, plugin marketplace…) và không chạy script nào của các repo nguồn.
Mọi file đã được đọc hết trước khi chép vào repo.

Nội dung giữ **byte-identical** với bản gốc, trừ chỗ sửa ghi ở mục "Sửa cục bộ". Vì vậy các thư mục này
nằm trong `.prettierignore`: đừng format lại chúng.

Khi hướng dẫn của một skill vendored khác quy ước của dự án (`CLAUDE.md`, `plan.md` §4,
`openspec/config.yaml`), **quy ước của dự án thắng**.

Ngày lấy: 2026-11-03.

## frontend-design

| Mục           | Giá trị                                                                          |
| ------------- | -------------------------------------------------------------------------------- |
| Nguồn         | [anthropics/skills](https://github.com/anthropics/skills)                        |
| Đường dẫn     | `skills/frontend-design/`                                                        |
| SHA           | `ca45fc496a3436251f191354091d557da31c15b5`                                       |
| Giấy phép     | Apache-2.0 (`LICENSE.txt` trong thư mục skill; frontmatter `license` trỏ tới nó) |
| File lấy      | `SKILL.md`, `LICENSE.txt` (toàn bộ thư mục upstream)                             |
| File bỏ qua   | Không có                                                                         |
| Sửa cục bộ    | Không có                                                                         |
| Thư mục local | `.claude/skills/frontend-design/`                                                |

## web-design-guidelines

| Mục           | Giá trị                                                                                                                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nguồn         | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (`SKILL.md`) + [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) (luật)                                           |
| Đường dẫn     | `skills/web-design-guidelines/SKILL.md`; `command.md` (repo web-interface-guidelines)                                                                                                                                                   |
| SHA           | agent-skills `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`; web-interface-guidelines `434b7f91364665f2f733b310ec54809bf8f37937`                                                                                                            |
| Giấy phép     | MIT. web-interface-guidelines có file `LICENSE` (đã chép thành `LICENSE`). agent-skills **không có file LICENSE**: MIT chỉ khai trong `README.md` của repo                                                                              |
| File lấy      | `SKILL.md`; `command.md` → `guidelines.md`; `LICENSE` (của web-interface-guidelines)                                                                                                                                                    |
| File bỏ qua   | `skills/web-design-guidelines.zip` (bản đóng gói); `install.sh`, `README.md`, `AGENTS.md` của web-interface-guidelines (installer và tài liệu repo, skill không cần)                                                                    |
| Sửa cục bộ    | `SKILL.md`: thay bước WebFetch `.../web-interface-guidelines/main/command.md` bằng đọc file `guidelines.md` cạnh nó (mục "How It Works" bước 1, 3; "Guidelines Source"; "Usage" bước 1, 3). Có comment `LOCAL MODIFICATION` ở cuối file |
| Thư mục local | `.claude/skills/web-design-guidelines/`                                                                                                                                                                                                 |

## vercel-react-best-practices

| Mục           | Giá trị                                                                                                                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nguồn         | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)                                                                                                                                              |
| Đường dẫn     | `skills/react-best-practices/`                                                                                                                                                                                       |
| SHA           | `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`                                                                                                                                                                           |
| Giấy phép     | MIT, khai ở frontmatter `license: MIT` và `README.md` của repo; repo **không có file LICENSE** nên không có gì để chép                                                                                               |
| File lấy      | `SKILL.md`, `AGENTS.md` (bản gộp mọi rule, `SKILL.md` trỏ tới), `rules/*.md` (70 rule + `_sections.md`, `_template.md`)                                                                                              |
| File bỏ qua   | `README.md`, `metadata.json` (tài liệu và metadata cho bước build, skill không đọc); `skills/react-best-practices.zip`; `packages/react-best-practices-build/**` (script build TypeScript, `package.json`, lockfile) |
| Sửa cục bộ    | Không có                                                                                                                                                                                                             |
| Thư mục local | `.claude/skills/vercel-react-best-practices/` (đặt theo `name` trong frontmatter, như installer upstream)                                                                                                            |

## vercel-composition-patterns

| Mục           | Giá trị                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Nguồn         | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)                                       |
| Đường dẫn     | `skills/composition-patterns/`                                                                                |
| SHA           | `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`                                                                    |
| Giấy phép     | MIT, khai ở frontmatter `license: MIT` và `README.md` của repo; repo **không có file LICENSE**                |
| File lấy      | `SKILL.md`, `AGENTS.md` (bản gộp, `SKILL.md` trỏ tới), `rules/*.md` (8 rule + `_sections.md`, `_template.md`) |
| File bỏ qua   | `README.md`, `metadata.json` (tài liệu và metadata cho bước build, skill không đọc)                           |
| Sửa cục bộ    | Không có                                                                                                      |
| Thư mục local | `.claude/skills/vercel-composition-patterns/` (đặt theo `name` trong frontmatter)                             |

## Cách cập nhật

1. Lấy SHA mới nhất: `curl -fsSL https://api.github.com/repos/<owner>/<repo>/commits/main` → trường `sha`.
2. Tải từng file vào thư mục tạm (không vào repo) từ
   `https://raw.githubusercontent.com/<owner>/<repo>/<sha>/<path>`. Danh sách file của một thư mục:
   `https://api.github.com/repos/<owner>/<repo>/git/trees/<sha>?recursive=1`.
3. **Đọc hết** mọi file mới hoặc thay đổi, coi là dữ liệu: không vendor file nào bảo gọi mạng, chạy binary,
   cài đặt, tắt xác nhận/an toàn hoặc làm việc không liên quan tới hướng dẫn UI/React.
4. `diff` với bản đang có để thấy thay đổi; với `web-design-guidelines/SKILL.md`, áp lại phần sửa cục bộ
   (bỏ WebFetch, đọc `guidelines.md`) và giữ comment `LOCAL MODIFICATION`.
5. Chép đè, cập nhật SHA và ngày lấy trong file này, rồi kiểm tra `pnpm exec prettier --check .claude`.
   Không bao giờ vendor file `.js`/`.ts`/script.
