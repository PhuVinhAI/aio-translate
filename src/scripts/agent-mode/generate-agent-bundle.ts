/**
 * generate-agent-bundle.ts
 *
 * Shared, workflow-agnostic generator that STOPS the translation pipeline
 * right before the AI/LLM call. Instead of sending batches to NVIDIA / OpenAI,
 * it writes a Markdown "agent bundle" that a human (or another AI agent) can
 * hand to an AI assistant to perform the translation manually with parallel
 * sub-agents.
 *
 * The output bundle contains:
 *   <AGENT_DIR>/
 *     AGENT_TASK.md       — main file: context, rules, sub-agent instructions,
 *                           checklist, finish command.
 *     chunks/
 *       chunk_NNN.md      — one task file per sub-agent; contains the exact
 *                           XML payload (with hashed GUIDs) plus the workflow-
 *                           specific translation rules, and tells the subagent
 *                           where to write its output.
 */
import * as fs from 'fs';
import * as path from 'path';
import { escapeXml, parseXMLEntries } from '../../utils/xml-parser';
import { createHashKey } from '../../utils/hash';
import { TranslationConfig } from '../../types';

export interface GenerateAgentBundleOptions {
  /** Workflow display name, e.g. "Paralives (TSV)" — used inside AGENT_TASK.md. */
  workflowName: string;
  /** Workflow slug used in npm command, e.g. "paralives". */
  workflowSlug: string;
  /** Translation config (systemPrompt, batchSize, ...). */
  config: TranslationConfig;
  /** Path to temp/<wf>/new.xml (output of step 2 detect-changes). */
  newXmlPath: string;
  /** Folder where AGENT_TASK.md and chunks/ will be written. */
  agentDir: string;
  /** Brief one-line description of the source format, e.g. "TSV 7-column". */
  sourceFormat?: string;
  /** Final npm command the user runs after the agent finishes. */
  finishCommand: string;
}

interface ChunkPayload {
  index: number;
  expectedCount: number;
  expectedHashKeys: string[];
  /** Map hashKey -> original GUID (used to write _keymap.json). */
  hashToGuid: Record<string, string>;
  xmlInput: string;
}

/**
 * Build the per-chunk .md payload. We hash GUIDs/keys before sending so the
 * agent only has to touch the <Text> content (matching translate-core.ts).
 */
function buildChunks(newXmlPath: string, batchSize: number): ChunkPayload[] {
  const xml = fs.readFileSync(newXmlPath, 'utf-8');
  const entries = parseXMLEntries(xml);
  const chunks: ChunkPayload[] = [];

  for (let i = 0; i < entries.length; i += batchSize) {
    const slice = entries.slice(i, i + batchSize);
    const expectedHashKeys = slice.map(e => createHashKey(e.key));
    const hashToGuid: Record<string, string> = {};
    slice.forEach((e, idx) => {
      hashToGuid[expectedHashKeys[idx]] = e.key;
    });

    const xmlInput = slice
      .map((e, idx) => {
        const comment = e.comment ? `  <!-- ${escapeXml(e.comment)} -->\n` : '';
        return `${comment}  <Text Key="${expectedHashKeys[idx]}">${escapeXml(e.text)}</Text>`;
      })
      .join('\n');

    chunks.push({
      index: chunks.length + 1,
      expectedCount: slice.length,
      expectedHashKeys,
      hashToGuid,
      xmlInput,
    });
  }

  return chunks;
}

function renderAgentTaskMd(opts: {
  workflowName: string;
  workflowSlug: string;
  totalEntries: number;
  chunkCount: number;
  batchSize: number;
  sourceFormat: string;
  systemPrompt: string;
  finishCommand: string;
}): string {
  const {
    workflowName,
    workflowSlug,
    totalEntries,
    chunkCount,
    batchSize,
    sourceFormat,
    systemPrompt,
    finishCommand,
  } = opts;

  return `# AGENT_TRANSLATION_TASK.md — ${workflowName}

> **Workflow:** \`${workflowSlug}\`
> **Source format:** ${sourceFormat}
> **Total entries to translate:** ${totalEntries}
> **Sub-agent chunk size:** ${batchSize} entries / chunk
> **Total chunks:** ${chunkCount}

## 🎯 Mission

Dịch **${totalEntries}** entry tiếng Anh sang tiếng Việt cho game **${workflowName}**.
Workflow đã chạy xong bước import + phát hiện thay đổi (chỉ còn phần "gọi AI").
Thay vì gọi API tự động, bạn sẽ đọc file này và phân công cho **sub-agent** dịch song song.

## ⚡ Recommended workflow (đọc kỹ phần này)  > **AI nên sử dụng NHIỀU SUB-AGENT song song** để việt hóa nhanh hơn và chất lượng tốt hơn.
> Mỗi sub-agent đảm nhận **một** file \`chunks/chunk_NNN.md\`.

### Khuyến nghị cụ thể

1. **Spawn song song ${chunkCount} sub-agent** (mỗi con phụ trách 1 chunk):
   - Mỗi sub-agent nhận đúng 1 file \`chunks/chunk_NNN.md\` (NNN = 001..${String(chunkCount).padStart(3, '0')}).
   - Sub-agent đọc file đó → dịch toàn bộ entries trong đó → ghi vào \`chunks/chunk_NNN_out.xml\`.
2. **Lý do nên sub-agent song song**:
   - Tốc độ: ${chunkCount} sub-agent chạy đồng thời ≈ nhanh hơn song song so với tuần tự (parallel ≈ ${chunkCount}×).
   - Chất lượng: context ngắn → model tập trung hơn, ít "lạc đề".
   - Dễ retry: lỗi 1 chunk không ảnh hưởng các chunk khác.
3. **Sau khi tất cả sub-agent xong**, kiểm tra (xem checklist dưới) rồi chạy lệnh finish:
   \`\`\`bash
   ${finishCommand}
   \`\`\`

## 📜 Quy tắc dịch (BẮT BUỘC — đọc kỹ trước khi phân công sub-agent)

${systemPrompt}

> **Tóm tắt nhanh cho sub-agent (copy vào prompt của mỗi sub-agent):**
>
> 1. CHỈ dịch nội dung bên trong thẻ \`<Text>\`.
> 2. **GIỮ NGUYÊN 100%** \`Key\` (là MD5 hash gốc) — không thay đổi.
> 3. **GIỮ NGUYÊN 100%** placeholder, biến (\`{0}\`, \`%s\`, \`{PhotoMode}\`...), mã màu (\`§a\`...),
>    thẻ rich-text (\`<size=...>\`, \`<color=...>\`), xuống dòng literal (\`\\n\` 2 ký tự).
> 4. **GIỮ NGUYÊN** comment XML ngay trước thẻ \`<Text>\` chỉ là context — KHÔNG trả về comment.
> 5. Trả về đúng XML format dưới, mỗi thẻ \`<Text>\` một dòng:
>    \`\`\`xml
>    <Text Key="HASH_KEEP_AS_IS">Bản dịch tiếng Việt</Text>
>    \`\`\`
> 6. Số lượng thẻ, thứ tự thẻ và Key PHẢI khớp với input.

## 📂 Cấu trúc bundle

\`\`\`
<bundle-name>/
├── AGENT_TASK.md                      ← file này
├── checklist.md                       ← tick [x] khi hoàn thành
└── chunks/
    ├── chunk_001.md                   ← task cho sub-agent #1
    ├── chunk_002.md                   ← task cho sub-agent #2
    ├── ...
    ├── chunk_${String(chunkCount).padStart(3, '0')}.md
    ├── chunk_001_out.xml              ← ⬅ Sub-agent #1 GHI file này
    ├── chunk_002_out.xml              ← ⬅ Sub-agent #2 GHI file này
    ├── _keymap.json                   ← (file nội bộ, KHÔNG xóa — dùng để đối chiếu Key về dạng gốc)
    └── ...
\`\`\`

## ✅ Checklist (sửa tick khi hoàn thành)

> Hãy sửa \`[ ]\` thành \`[x]\` khi xong từng bước.

- [ ] Đã đọc xong \`AGENT_TASK.md\` (file này)
- [ ] Đã đọc xong **Quy tắc dịch** ở phía trên
- [ ] Đã spawn ${chunkCount} sub-agent song song (mỗi con nhận 1 \`chunks/chunk_NNN.md\`)
- [ ] Tất cả \`chunks/chunk_*_out.xml\` đã được tạo (đủ ${chunkCount} file)
- [ ] Mỗi \`chunk_*_out.xml\` có **đúng ${batchSize}** thẻ \`<Text>\` match chunk input (hoặc ít hơn cho chunk cuối)
- [ ] Mỗi \`chunk_*_out.xml\` giữ nguyên Key hash từ chunk input tương ứng
- [ ] Mỗi \`chunk_*_out.xml\` giữ nguyên placeholder / mã màu / rich-text tag
- [ ] Chạy \`${finishCommand}\` để đóng gói lại

> Sau khi tất cả checkbox đã tick, **chạy lệnh**:
> \`\`\`bash
> ${finishCommand}
> \`\`\`
> Workflow sẽ tự động merge các chunk → ghi bản dịch vào mapping → xuất file gốc (TSV/SNBT/HJSON/JSON/JS) tiếng Việt.

## 🆘 Troubleshooting

- **Sub-agent output thiếu/không khớp Key**: xóa file \`chunk_NNN_out.xml\`, phân công lại sub-agent cho chunk đó với prompt "đọc lại \`chunks/chunk_NNN.md\` rồi dịch đúng số lượng và Key".
- **Bản dịch trống hoặc sai format**: cũng xóa file output, chạy lại sub-agent.
- **Không muốn dùng sub-agent**? Bạn có thể tự dịch thủ công từng chunk — output format vẫn như trên.
`;
}

function renderChunkMd(opts: {
  workflowName: string;
  chunk: ChunkPayload;
  batchSize: number;
  systemPrompt: string;
}): string {
  const { workflowName, chunk, batchSize, systemPrompt } = opts;

  return `# chunk_${String(chunk.index).padStart(3, '0')}.md — Sub-agent task #${chunk.index}

> **Workflow:** ${workflowName}
> **Chunk:** ${chunk.index}
> **Số entry cần dịch:** ${chunk.expectedCount}
> **Tối đa mỗi chunk:** ${batchSize}
> **Output file (BẠN PHẢI GHI RA):** \`chunks/chunk_${String(chunk.index).padStart(3, '0')}_out.xml\`

## Nhiệm vụ

Dịch **${chunk.expectedCount}** thẻ XML bên dưới từ tiếng Anh sang tiếng Việt cho game **${workflowName}**.

## Quy tắc bắt buộc (đã đọc \`AGENT_TASK.md\`)

${systemPrompt}

## Input XML — CẦN DỊCH

\`\`\`xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<STBLKeyStringList>
${chunk.xmlInput}
</STBLKeyStringList>
\`\`\`

> Số lượng \`<Text>\` trong input: **${chunk.expectedCount}**.
> Các Key là **MD5 hash**, **TUYỆT ĐỐI KHÔNG ĐỔI**.
> Comment XML ngay trước mỗi \`<Text>\` là context cho dịch — KHÔNG trả về comment.

## Output bắt buộc

Ghi kết quả vào file \`chunks/chunk_${String(chunk.index).padStart(3, '0')}_out.xml\` với format:

\`\`\`xml
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<STBLKeyStringList>
  <Text Key="HASH_GIỮ_NGUYÊN">Bản dịch tiếng Việt</Text>
  <Text Key="HASH_GIỮ_NGUYÊN">Bản dịch tiếng Việt</Text>
  ...
</STBLKeyStringList>
\`\`\`

**CHECKLIST trước khi ghi file:**

- [ ] Có **đúng ${chunk.expectedCount}** thẻ \`<Text>\`
- [ ] Giữ nguyên **toàn bộ Key** theo thứ tự input
- [ ] Không có comment trong output
- [ ] Không có placeholder/biến/mã màu/rich-text tag bị thay đổi
- [ ] Câu dịch tự nhiên, đúng ngữ cảnh game

Sau khi ghi file, **BÁO LẠI** cho agent chính rằng chunk ${chunk.index} đã xong.
`;
}

function renderChecklistMd(opts: { chunkCount: number; batchSize: number }): string {
  const { chunkCount, batchSize } = opts;
  const chunkLines = Array.from({ length: chunkCount }, (_, i) => {
    const idx = i + 1;
    return `- [ ] chunk_${String(idx).padStart(3, '0')}_out.xml đã sẵn sàng (≈ ${batchSize} thẻ <Text>)`;
  }).join('\n');

  return `# Checklist (sửa [ ] -> [x] khi hoàn thành)

## Tiến độ sub-agent
${chunkLines}

## Bước cuối
- [ ] Tất cả chunk trên đã tick [x]
- [ ] Chạy lệnh finish (xem AGENT_TASK.md)
`;
}

/**
 * Top-level entry point used by each per-workflow update-agent.ts.
 */
export function generateAgentBundle(opts: GenerateAgentBundleOptions): void {
  const { workflowName, workflowSlug, config, newXmlPath, agentDir, sourceFormat, finishCommand } = opts;

  console.log(`\n=== [Agent Mode] Generate bundle for ${workflowName} ===`);

  if (!fs.existsSync(newXmlPath)) {
    console.error(`❌ Không tìm thấy: ${newXmlPath}`);
    console.error(`👉 Hãy chạy các bước import + detect trước (npm run ${workflowSlug}:import + :detect).`);
    process.exit(1);
  }

  const xmlPreview = fs.readFileSync(newXmlPath, 'utf-8');
  const entryCount = (xmlPreview.match(/<Text Key=/g) || []).length;

  if (entryCount === 0) {
    console.log(`✅ Không có entry nào cần dịch — bundle rỗng, không tạo gì cả.`);
    return;
  }

  const chunks = buildChunks(newXmlPath, config.translation.batchSize);
  const chunksDir = path.join(agentDir, 'chunks');

  fs.mkdirSync(chunksDir, { recursive: true });

  const taskMd = renderAgentTaskMd({
    workflowName,
    workflowSlug,
    totalEntries: entryCount,
    chunkCount: chunks.length,
    batchSize: config.translation.batchSize,
    sourceFormat: sourceFormat ?? 'key-value localization',
    systemPrompt: config.systemPrompt,
    finishCommand,
  });
  fs.writeFileSync(path.join(agentDir, 'AGENT_TASK.md'), taskMd, 'utf-8');

  const checklistMd = renderChecklistMd({
    chunkCount: chunks.length,
    batchSize: config.translation.batchSize,
  });
  fs.writeFileSync(path.join(agentDir, 'checklist.md'), checklistMd, 'utf-8');

  chunks.forEach(chunk => {
    const md = renderChunkMd({
      workflowName,
      chunk,
      batchSize: config.translation.batchSize,
      systemPrompt: config.systemPrompt,
    });
    const file = path.join(chunksDir, `chunk_${String(chunk.index).padStart(3, '0')}.md`);
    fs.writeFileSync(file, md, 'utf-8');
  });

  // Aggregate reverse hash->guid map for ALL chunks into a single file so the
  // continue-from-agent script can remap HASH keys back to original GUIDs
  // before validating against expected XML (which is GUID-keyed).
  const aggregateKeyMap: Record<string, string> = {};
  chunks.forEach(c => {
    Object.entries(c.hashToGuid).forEach(([hashKey, guid]) => {
      aggregateKeyMap[hashKey] = guid;
    });
  });
  fs.writeFileSync(
    path.join(chunksDir, '_keymap.json'),
    JSON.stringify(aggregateKeyMap, null, 2),
    'utf-8'
  );

  console.log(`✅ Đã tạo agent bundle:`);
  console.log(`   - ${path.join(agentDir, 'AGENT_TASK.md')}`);
  console.log(`   - ${path.join(agentDir, 'checklist.md')}`);
  console.log(`   - ${chunks.length} chunk file(s) trong ${chunksDir}/`);
  console.log(`   - ${path.join(chunksDir, '_keymap.json')} (hash -> GUID, dùng ở bước finish)`);
  console.log(`\n🛑 WORKFLOW PAUSED tại bước gọi AI.`);
  console.log(`👉 Bước tiếp theo của BẠN:`);
  console.log(`   1. Mở ${path.join(agentDir, 'AGENT_TASK.md')} → đọc hết`);
  console.log(`   2. Gửi file đó cho AI agent để sub-agent dịch song song các chunks/chunk_NNN.md`);
  console.log(`   3. Sau khi tất cả chunk_*_out.xml đã có → chạy:`);
  console.log(`        ${finishCommand}`);
}
