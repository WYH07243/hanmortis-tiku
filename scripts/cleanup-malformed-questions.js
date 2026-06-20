// @ts-check
const { createClient } = require("@libsql/client");

const url = process.env["DATABASE_URL"];
const authToken = process.env["DATABASE_AUTH_TOKEN"];
const shouldApply = process.argv.includes("--apply");

if (!url) {
  console.error("❌ DATABASE_URL 环境变量未设置");
  process.exit(1);
}

const client = createClient({ url, authToken });

const headingHintPattern = /(题量|满分|作答时间|智能分析|单选题|多选题|判断题|简答题|计算题|共\d+题|第\d+部分|章节|作业)/;

function safeParseJson(raw) {
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function isMalformed(question) {
  const content = safeParseJson(question.content);
  const answer = safeParseJson(question.answer);
  const stem = content?.data?.stem?.trim?.() || "";

  if (!stem) return true;

  switch (question.type) {
    case "CHOICE": {
      const options = content?.data?.options;
      const correctIndex = answer?.data?.correctIndex;
      if (headingHintPattern.test(stem) && (!Array.isArray(options) || options.length < 2)) {
        return true;
      }
      return !Array.isArray(options) || options.length < 2 || !Number.isInteger(correctIndex);
    }
    case "TRUE_FALSE":
      return typeof answer?.data?.correct !== "boolean";
    case "SHORT_ANSWER":
      return !answer?.data?.referenceAnswer?.trim?.();
    case "CALCULATION":
      return !String(answer?.data?.value || "").trim();
    default:
      return true;
  }
}

async function main() {
  console.log(`🔌 连接到数据库: ${url}`);
  const result = await client.execute(`
    SELECT id, questionBankId, type, content, answer, sourceFile, createdAt
    FROM Question
    ORDER BY createdAt ASC
  `);

  const malformed = result.rows.filter(isMalformed);

  if (malformed.length === 0) {
    console.log("✅ 没有检测到脏题目");
    return;
  }

  console.log(`⚠️ 检测到 ${malformed.length} 条可疑题目:`);
  malformed.forEach((row, index) => {
    const content = safeParseJson(row.content);
    const stem = content?.data?.stem || "<empty stem>";
    console.log(`${index + 1}. ${row.id} | ${row.questionBankId} | ${row.type} | ${stem.slice(0, 80)}`);
  });

  if (!shouldApply) {
    console.log("\n这是预览模式，没有执行删除。");
    console.log("确认后可运行: npm run db:cleanup -- --apply");
    return;
  }

  for (const row of malformed) {
    await client.execute({
      sql: "DELETE FROM Question WHERE id = ?",
      args: [row.id],
    });
  }

  console.log(`🧹 已删除 ${malformed.length} 条脏题目`);
}

main().catch((error) => {
  console.error("❌ 清理失败:", error.message);
  process.exit(1);
});
