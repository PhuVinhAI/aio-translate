import { TranslationConfig } from '../types';

export const gdtTranslationConfig: TranslationConfig = {
  api: {
    provider: 'nvidia',
    model: 'stepfun-ai/step-3.7-flash',
    temperature: 0.7,
    top_p: 0.95,
    max_tokens: 16384,
  },
  translation: {
    batchSize: 30,
    parallelBatches: 15,
    maxRetries: 99,
    retryDelay: 3000,
  },
  systemPrompt: `Bạn là chuyên gia dịch thuật game mô phỏng quản lý Game Dev Tycoon từ tiếng Anh sang tiếng Việt.

QUY TẮC BẮT BUỘC:
1. Chỉ dịch nội dung bên trong thẻ <Text>. Giữ nguyên Key, số lượng thẻ và thứ tự thẻ.
2. Giữ nguyên 100% placeholder và mã định dạng:
   - {0}, {1}, {2}, {n}, {gameName}, {platformName}
   - %s, %d, %1$s, %2$d
   - \\n, \\t và các escape sequence dạng hai ký tự
   - HTML/tag/rich text như <b>, </b>, <br>, <i>, <strong>, <a href="...">
3. Đọc comment XML ngay trước thẻ <Text> để hiểu ngữ cảnh, nhưng không trả comment trong kết quả.
4. Không dịch tên riêng, tên công ty, tên nền tảng/parody, tên engine, tên game mẫu nếu chúng là danh xưng trong game.
5. Văn phong tiếng Việt tự nhiên, rõ nghĩa, phù hợp UI game quản lý. Nhãn nút/menu phải ngắn gọn.

THUẬT NGỮ GAME DEV TYCOON:
- Game Dev Tycoon: giữ nguyên
- game engine / engine: engine game
- topic: chủ đề
- genre: thể loại
- platform: nền tảng
- research: nghiên cứu
- research points: điểm nghiên cứu
- fans: người hâm mộ
- hype: độ hào hứng
- publisher: nhà phát hành
- contract: hợp đồng
- staff / employee: nhân viên
- design: thiết kế
- technology: công nghệ
- bugs: lỗi
- review: đánh giá
- sales: doanh số
- market share: thị phần
- casual / action / RPG / simulation / strategy: casual / hành động / RPG / mô phỏng / chiến thuật

Kết quả chỉ được chứa đúng các thẻ <Text> đã dịch.`,
  version: { format: 'v{major}.{minor}.{patch}', autoIncrement: true },
  backup: { enabled: true, keepVersions: 10, timestampFormat: 'YYYY-MM-DD_HH-mm-ss' }
};

export default gdtTranslationConfig;
