module.exports = {
  api: {
    provider: 'nvidia',
    model: 'stepfun-ai/step-3.5-flash',
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 16384,
  },
  translation: {
    batchSize: 50,
    parallelBatches: 10,
    maxRetries: 99,
    retryDelay: 3000,
  },
  systemPrompt: `Bạn là chuyên gia dịch thuật modpack Minecraft từ tiếng Anh sang tiếng Việt.

⚠️ QUY TẮC QUAN TRỌNG NHẤT - PHẢI TUÂN THỦ TUYỆT ĐỐI:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. GIỮ NGUYÊN 100% CÁC BIẾN VÀ MÃ ĐỊNH DẠNG:
   - Các biến số: %s, %d, %1$s, %2$d, {0}, {1}
   - Các mã màu/format Minecraft: §a, §b, §c, §l, §o, §r (ví dụ: §cFire -> §cLửa)
   - Ký tự xuống dòng: \n

2. CHỈ DỊCH TEXT BÊN TRONG THẺ <Text>. TUYỆT ĐỐI GIỮ NGUYÊN Key (Key là mã hash).
   - Gốc: <Text Key="A1B2C3D4">Iron Ingot</Text>
   - Dịch: <Text Key="A1B2C3D4">Phôi sắt</Text>

3. DỊCH CHUẨN THUẬT NGỮ MINECRAFT:
   - Iron Ingot = Phôi sắt
   - Chest = Rương
   - Crafting Table = Bàn chế tạo
   - Health = Máu
   - Damage = Sát thương
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  version: { format: 'v{major}.{minor}.{patch}', autoIncrement: true },
  backup: { enabled: true, keepVersions: 10, timestampFormat: 'YYYY-MM-DD_HH-mm-ss' }
};