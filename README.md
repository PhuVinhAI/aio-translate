# Công Cụ Dịch Game Tự Động (AIO Translate)

Công cụ dịch tự động cho mod game sử dụng AI (NVIDIA API). Hỗ trợ dịch **Minecraft Mods** (file `.jar`), **FTB Quests** (file `.snbt`), **Terraria Mods** (file `.hjson`/`.json`) và **Paralives** (file `.tsv`) từ tiếng Anh sang tiếng Việt.

## Tính Năng

- 🎮 Dịch Minecraft Mods (file `.jar`) từ tiếng Anh sang tiếng Việt
- 📋 Dịch FTB Quests (file `.snbt`) từ tiếng Anh sang tiếng Việt
- 🌳 Dịch Terraria Mods (file `.hjson`/`.json`) và xuất ra mod việt hóa riêng lẻ cho tModLoader
- 🏡 Dịch Paralives (file localization `.tsv`) và xuất lại file `.tsv` việt hóa giữ nguyên cấu trúc
- 🤖 Dịch tự động bằng AI sử dụng NVIDIA API (model: `mistralai/mistral-small-4-119b-2603`)
- ⚡ Xử lý song song nhiều batch đồng thời (cấu hình được theo từng workflow)
- 🔄 Tự động retry khi gặp lỗi
- 💾 Hệ thống backup tự động
- 🎨 Giữ nguyên định dạng game (mã màu, biến, thẻ định dạng, xuống dòng)
- 📦 TypeScript với strict mode đảm bảo type safety

## Yêu Cầu Hệ Thống

- Node.js 18+ (khuyến nghị: 20+)
- TypeScript 5.3+
- NVIDIA API key

## Cài Đặt

```bash
npm install
```

## Cấu Hình

Tạo file `.env` trong thư mục gốc:

```env
NVIDIA_API_KEY=your_api_key_here
NVIDIA_API_KEY_2=your_backup_api_key_here
```

Lấy API key tại: [NVIDIA API Catalog](https://build.nvidia.com/)

## Cấu Trúc Thư Mục

```
aio-translate/
├── input/                          # Dữ liệu đầu vào (do người dùng cung cấp)
│   ├── minecraft/
│   │   └── mods/                   # Đặt file .jar mod vào đây
│   ├── ftbquests/                  # Đặt file en_us.snbt và thư mục en_us/ vào đây
│   ├── terraria/                   # Đặt các thư mục mod (chứa file .hjson/.json) vào đây
│   └── paralives/                  # Đặt file localization .tsv vào đây
│
├── output/                         # Kết quả đầu ra
│   ├── minecraft/
│   │   └── resourcepack/           # Resource pack tiếng Việt được tạo ra
│   ├── ftbquests/                  # File vi_vn.snbt và thư mục vi_vn/ được tạo ra
│   ├── terraria/                   # Các bản mod việt hóa riêng lẻ (<ModId>Vietnamese/)
│   └── paralives/                  # File .vi.tsv việt hóa được tạo ra
│
├── data/                           # Dữ liệu nội bộ (mapping, nội dung đã trích xuất)
│   ├── minecraft/
│   │   ├── extracted.json          # Văn bản tiếng Anh đã trích xuất từ mods
│   │   ├── mapping.json            # Bản đồ dịch thuật
│   │   └── reverse_mapping.json
│   ├── ftbquests/
│   │   ├── mapping.json
│   │   └── reverse_mapping.json
│   ├── terraria/
│   │   ├── mapping.json
│   │   └── reverse_mapping.json
│   └── paralives/
│       └── mapping.json            # Bản đồ dịch theo GUID
│
├── temp/                           # File tạm (batches, tiến trình, XML trung gian)
│   ├── minecraft/
│   ├── ftbquests/
│   ├── terraria/
│   └── paralives/
│
└── src/                            # Mã nguồn TypeScript
    ├── config/                     # File cấu hình
    ├── scripts/                    # Scripts dịch thuật
    │   ├── minecraft/              # Workflow Minecraft
    │   ├── ftbquests/              # Workflow FTB Quests
    │   ├── terraria/               # Workflow Terraria
    │   ├── paralives/              # Workflow Paralives
    │   └── translate-core.ts       # Engine dịch chung
    ├── types/                      # Định nghĩa kiểu TypeScript
    └── utils/                      # Hàm tiện ích
```

## Hướng Dẫn Sử Dụng

### Dịch Minecraft Mods

1. Đặt các file `.jar` mod vào thư mục `input/minecraft/mods/`

2. Chạy workflow hoàn chỉnh:

```bash
npm run minecraft:update
```

Hoặc chạy từng bước riêng lẻ:

```bash
# Bước 0: Trích xuất file ngôn ngữ từ file .jar
npm run minecraft:extract

# Bước 1: Import JSON đã trích xuất sang định dạng XML
npm run minecraft:import

# Bước 2: Phát hiện nội dung mới/thay đổi
npm run minecraft:detect

# Bước 3: Dịch nội dung mới bằng AI
npm run minecraft:translate

# Bước 4: Gộp bản dịch với mapping hiện có
npm run minecraft:merge

# Bước 5: Xuất resource pack tiếng Việt
npm run minecraft:export
```

3. Kết quả: `output/minecraft/resourcepack/` - Copy thư mục này vào `resourcepacks/` của Minecraft instance

### Dịch FTB Quests

1. Đặt file FTB Quests vào `input/ftbquests/`:
   - `en_us.snbt` (file quest chính)
   - `en_us/` (thư mục chứa chapter files, reward tables, v.v.)

2. Chạy workflow hoàn chỉnh:

```bash
npm run ftbquests:update
```

Hoặc chạy từng bước riêng lẻ:

```bash
# Bước 0: Reset và dọn dẹp file tạm
npm run ftbquests:reset

# Bước 1: Import file SNBT sang định dạng XML
npm run ftbquests:import

# Bước 2: Phát hiện nội dung mới/thay đổi
npm run ftbquests:detect

# Bước 3: Dịch nội dung mới bằng AI
npm run ftbquests:translate

# Bước 4: Gộp bản dịch với mapping hiện có
npm run ftbquests:merge

# Bước 5: Xuất file SNBT tiếng Việt
npm run ftbquests:export
```

3. Kết quả: `output/ftbquests/` - Copy `vi_vn.snbt` và thư mục `vi_vn/` vào `config/ftbquests/quests/lang/` của modpack

### Dịch Terraria Mods

1. Đặt các thư mục mod cần dịch vào `input/terraria/`. Mỗi mod là một thư mục con chứa file ngôn ngữ `.hjson`/`.json` (ví dụ `input/terraria/CalamityMod/Localization/en-US/*.hjson`).

2. Chạy workflow hoàn chỉnh:

```bash
npm run terraria:update
```

Hoặc chạy từng bước riêng lẻ:

```bash
# Bước 1: Import file HJSON/JSON sang định dạng XML
npm run terraria:import

# Bước 2: Phát hiện nội dung mới/thay đổi
npm run terraria:detect

# Bước 3: Dịch nội dung mới bằng AI
npm run terraria:translate

# Bước 4: Gộp bản dịch với mapping hiện có
npm run terraria:merge

# Bước 5: Xuất các bản mod việt hóa riêng lẻ
npm run terraria:export
```

3. Kết quả: `output/terraria/` - Mỗi mod gốc được xuất thành một mod phụ `<ModId>Vietnamese/` (kèm `build.txt`, `.cs`, `.csproj`). Copy các thư mục này vào `ModSources/` của tModLoader, sau đó vào **Develop Mods → Build All** để biên dịch.

### Dịch Paralives

1. Đặt file localization `.tsv` (ví dụ `AllParalivesTranslationItems.tsv`) vào thư mục `input/paralives/`.

2. Chạy workflow hoàn chỉnh:

```bash
npm run paralives:update
```

Hoặc chạy từng bước riêng lẻ:

```bash
# Bước 1: Import file TSV sang định dạng XML (khóa theo GUID)
npm run paralives:import

# Bước 2: Phát hiện nội dung mới/thay đổi
npm run paralives:detect

# Bước 3: Dịch nội dung mới bằng AI
npm run paralives:translate

# Bước 4: Gộp bản dịch với mapping hiện có
npm run paralives:merge

# Bước 5: Xuất file TSV tiếng Việt
npm run paralives:export
```

3. Kết quả: `output/paralives/<tên-file>.vi.tsv` - File giữ nguyên 7 cột và thứ tự dòng của bản gốc, chỉ thay cột `Value` bằng tiếng Việt. Các dòng có `Do Not Translate = True` hoặc `Value` rỗng được giữ nguyên tiếng Anh. Import file này lại vào công cụ localization của Paralives.

> 💡 **Lưu ý:** Workflow dịch theo `GUID` (định danh duy nhất, ổn định) và chỉ dịch những dòng mới hoặc có câu gốc thay đổi — chạy lại trên cùng file sẽ không dịch lại phần đã hoàn thành.

## Development

Build TypeScript sang JavaScript:

```bash
npm run build
```

Chế độ watch cho development:

```bash
npm run dev
```

Xóa build artifacts:

```bash
npm run clean
```

## Chi Tiết Kỹ Thuật

### Engine Dịch Thuật

- Sử dụng NVIDIA API với model `mistralai/mistral-small-4-119b-2603`
- Xử lý dịch theo batch song song (số lượng batch cấu hình được trong `src/config/`)
- Tự động retry với exponential backoff khi gặp lỗi
- Giữ nguyên định dạng game:
  - Minecraft — mã màu `§a`, `§b`, biến `%s`, `{0}`, `{1}`, xuống dòng `\n`
  - Terraria — thẻ màu `[c/ColorCode:Text]`, thẻ item `[i:ItemID]`, biến `{0}`, `{NPCName}`, `{ItemName}`
  - Paralives — thẻ rich-text TextMeshPro `<link=0>`, `</link>`, `<size=50%>`, `<color=#1FB1FF>`, biến `{0}`, `{PhotoMode}`, xuống dòng `\n`
  - Ký tự đặc biệt và escape sequences

### Workflow Minecraft Mods

1. Trích xuất file ngôn ngữ từ archive `.jar`
2. Parse file JSON ngôn ngữ
3. Chuyển đổi sang định dạng XML để dịch
4. Phát hiện nội dung mới/thay đổi bằng so sánh hash
5. Dịch bằng AI theo batch song song
6. Gộp với bản dịch hiện có
7. Xuất theo cấu trúc resource pack Minecraft

### Workflow FTB Quests

1. Parse file quest SNBT/Hjson
2. Trích xuất chuỗi có thể dịch (tiêu đề, mô tả, phần thưởng)
3. Chuyển đổi sang định dạng XML để dịch
4. Phát hiện nội dung mới/thay đổi bằng so sánh hash
5. Dịch bằng AI theo batch song song
6. Gộp với bản dịch hiện có
7. Xuất file SNBT với bản dịch tiếng Việt

### Workflow Terraria Mods

1. Quét đệ quy các file `.hjson`/`.json` trong từng thư mục mod
2. Trích xuất chuỗi có thể dịch (bỏ qua key hệ thống và tham chiếu `{$...}`)
3. Chuyển đổi sang định dạng XML để dịch
4. Phát hiện nội dung mới/thay đổi bằng so sánh hash
5. Dịch bằng AI theo batch song song
6. Gộp với bản dịch hiện có
7. Xuất từng mod thành một mod phụ việt hóa độc lập, tương thích 100% với tModLoader

### Workflow Paralives

1. Đọc file `.tsv` (7 cột: GUID, Key, Value, OriginalValue, Info, Do Not Translate, Localization State)
2. Trích xuất cột `Value` cần dịch (bỏ qua dòng `Do Not Translate = True` và `Value` rỗng)
3. Chuyển đổi sang định dạng XML để dịch, khóa theo `GUID` (định danh duy nhất, ổn định)
4. Phát hiện nội dung mới/thay đổi (so sánh câu gốc trong mapping) — chỉ dịch phần chưa có bản dịch
5. Dịch bằng AI theo batch song song
6. Gộp với bản dịch hiện có
7. Xuất lại file `.tsv` giữ nguyên cấu trúc 7 cột + thứ tự dòng + line-ending (CRLF), chỉ thay cột `Value`

## Giấy Phép

MIT License - Xem file LICENSE để biết chi tiết

## Tác Giả

TomiWixoss

## Repository

https://github.com/PhuVinhAI/aio-translate

## Hỗ Trợ

Để báo lỗi và yêu cầu tính năng mới, vui lòng truy cập:
https://github.com/PhuVinhAI/aio-translate/issues

## Lưu Ý

- Đảm bảo có kết nối internet ổn định khi chạy dịch
- API key cần có đủ quota để xử lý số lượng lớn văn bản
- Quá trình dịch có thể mất vài phút đến vài giờ tùy thuộc vào số lượng mod/quest
- Backup tự động được tạo trước mỗi lần dịch
- Có thể tiếp tục dịch từ điểm dừng nếu bị gián đoạn (sử dụng progress.json)
