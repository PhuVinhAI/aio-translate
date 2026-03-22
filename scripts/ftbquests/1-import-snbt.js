const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PATHS = require('../../config/paths.config');
const { escapeXml } = require('../utils/xml-parser');
const { backupFile } = require('../utils/backup');

function generateHashKey(originalKey) {
  return crypto.createHash('md5').update(originalKey).digest('hex').substring(0, 12).toUpperCase();
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, fileList);
    } else if (filePath.endsWith('.snbt')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function importFTBQuests() {
  const inputDir = PATHS.FTBQUESTS.INPUT_DIR;
  const outputXml = PATHS.FTBQUESTS.TEMP_EN_XML;
  const mappingFile = PATHS.FTBQUESTS.MAPPING;

  console.log('\n=== [FTB Quests 1] Import SNBT → XML ===');

  if (!fs.existsSync(inputDir)) {
    console.error(`❌ Không tìm thấy thư mục input: ${inputDir}`);
    console.error(`👉 HƯỚNG DẪN: Hãy tạo thư mục 'ftbquests/input' và ném cả file 'en_us.snbt' VÀ thư mục 'en_us' vào trong đó!`);
    process.exit(1);
  }

  backupFile(outputXml, path.dirname(outputXml));
  backupFile(mappingFile, path.dirname(mappingFile));

  const snbtFiles = walkDir(inputDir);
  console.log(`📂 Tìm thấy ${snbtFiles.length} file .snbt`);

  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  xml += '<STBLKeyStringList>\n';

  const mapping = {};
  let count = 0;

  // Regex thông minh bắt chính xác SNBT, hỗ trợ cả dấu gạch ngang trong Key và escape quote (\")
  const snbtRegex = /([\w\.\-]+)\s*:\s*(\[[\s\S]*?\]|"(?:[^"\\]|\\.)*")/g;
  const stringRegex = /"(?:[^"\\]|\\.)*"/g;

  snbtFiles.forEach(file => {
    const relPath = path.relative(inputDir, file).replace(/\\/g, '/'); // Chuẩn hóa đường dẫn chéo
    const content = fs.readFileSync(file, 'utf8');
    let match;

    while ((match = snbtRegex.exec(content)) !== null) {
      const originalKey = match[1].trim();
      let rawValue = match[2].trim();
      let isArray = false;
      let textValue = "";

      // Xử lý Array: ["line1", "line2"]
      if (rawValue.startsWith('[')) {
        isArray = true;
        const strMatches = [...rawValue.matchAll(stringRegex)];
        textValue = strMatches.map(m => {
          const str = m[0];
          return str.substring(1, str.length - 1); // Cắt bỏ ngoặc kép ở 2 đầu
        }).join('\\n'); // Nối bằng \n cho AI dễ hiểu ngữ cảnh
      } 
      // Xử lý String đơn: "value"
      else if (rawValue.startsWith('"')) {
        textValue = rawValue.substring(1, rawValue.length - 1);
      }

      // Bỏ qua giá trị rỗng
      if (!textValue || textValue.trim() === "") continue;

      const combinedKey = `${relPath}|||${originalKey}`;
      const hashKey = generateHashKey(combinedKey);

      xml += `  <Text Key="${hashKey}">${escapeXml(textValue)}</Text>\n`;

      mapping[hashKey] = {
        file: relPath,
        originalKey,
        isArray,
        originalValue: rawValue
      };
      count++;
    }
  });

  xml += '</STBLKeyStringList>';

  if (!fs.existsSync(path.dirname(outputXml))) fs.mkdirSync(path.dirname(outputXml), { recursive: true });
  fs.writeFileSync(outputXml, xml, 'utf8');
  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2), 'utf8');

  console.log(`✅ Đã tạo XML: ${count} entries`);
  console.log(`✅ Đã lưu Mapping files.`);
}

if (require.main === module) {
  importFTBQuests();
}

module.exports = { importFTBQuests };
