// @ts-check
// Turso 数据库迁移脚本
// 使用 @libsql/client 直接执行 Prisma 生成的迁移 SQL

const { createClient } = require("@libsql/client");

const url = process.env["DATABASE_URL"];
const authToken = process.env["DATABASE_AUTH_TOKEN"];

if (!url) {
  console.error("❌ DATABASE_URL 环境变量未设置");
  process.exit(1);
}

console.log(`🔌 连接到数据库: ${url}`);

const client = createClient({ url, authToken });

async function main() {
  // 检查是否已有表
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
  );
  const existingTables = tables.rows.map((r) => r.name);

  if (existingTables.length > 0) {
    console.log(
      `✓ 数据库已有 ${existingTables.length} 张表: ${existingTables.join(", ")}`
    );
    console.log("✓ 迁移已执行，跳过");
    return;
  }

  console.log("⚡ 数据库为空，正在执行初始化迁移...");

  // 从迁移 SQL 文件读取
  const fs = require("fs");
  const path = require("path");
  const migrationDir = path.join(
    __dirname,
    "..",
    "prisma",
    "migrations"
  );

  const dirs = fs.readdirSync(migrationDir).filter((d) =>
    fs.statSync(path.join(migrationDir, d)).isDirectory()
  );
  dirs.sort();

  for (const dir of dirs) {
    const sqlFile = path.join(migrationDir, dir, "migration.sql");
    if (!fs.existsSync(sqlFile)) continue;

    console.log(`  执行迁移: ${dir}`);
    const sql = fs.readFileSync(sqlFile, "utf-8");

    try {
      await client.executeMultiple(sql);
      console.log(`  ✓ ${dir} 完成`);
    } catch (err) {
      console.error(`  ✗ ${dir} 失败:`, err.message);
      process.exit(1);
    }
  }

  // 验证
  const verify = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log(
    `\n✓ 迁移完成! 数据库已有 ${verify.rows.length} 张表:`
  );
  verify.rows.forEach((r) => console.log(`  - ${r.name}`));
}

main().catch((err) => {
  console.error("❌ 迁移失败:", err.message);
  process.exit(1);
});
