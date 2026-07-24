#!/usr/bin/env node
/**
 * scripts/seed-d1.cjs
 *
 * 功能：将 scripts/replies.json 的内容与 D1 数据库中的 replies 表做对比，
 *       只对「id 不存在」或「id 存在但 lang/type/text 任一字段不同」的行执行写入，
 *       完全相同的行跳过，不做任何更新。
 *
 * 用法：
 *   node scripts/seed-d1.cjs          -> 操作本地 D1（wrangler --local，开发环境）
 *   node scripts/seed-d1.cjs --remote -> 操作远程生产 D1（wrangler --remote，线上环境，请谨慎）
 *
 * 前置条件：
 *   1. 已安装并登录 wrangler CLI（npx wrangler login）
 *   2. scripts/replies.json 存在，格式为 [{ "id", "lang", "type", "text" }, ...]
 *   3. 下面 DB_NAME 改成你 wrangler.toml 里配置的 D1 database_name
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

//  wrangler.toml 里配置的 D1 database_name
const DB_NAME = 'fakeclaude';

// 如果你的环境里 wrangler 不是全局命令，把这里改成 'npx wrangler'
const WRANGLER_BIN = 'npx wrangler';

const isRemote = process.argv.includes('--remote');
const modeFlag = isRemote ? '--remote' : '--local';

const jsonPath = path.join(__dirname, 'replies/replies.json');
const sqlPath = path.join(__dirname, '.seed-tmp.sql');

function escapeSql(str) {
  // SQL 里单引号需要转义成两个单引号
  return String(str).replace(/'/g, "''");
}

function runWrangler(args) {
  const cmd = `${WRANGLER_BIN} d1 execute ${DB_NAME} ${modeFlag} ${args}`;
  return execSync(cmd, { encoding: 'utf-8' });
}

function ensureTableExists() {
  const createSql = `CREATE TABLE IF NOT EXISTS replies (
  id INTEGER PRIMARY KEY,
  lang TEXT NOT NULL,
  type TEXT NOT NULL,
  text TEXT NOT NULL
);`;
  const tmpCreatePath = path.join(__dirname, '.seed-create-tmp.sql');
  fs.writeFileSync(tmpCreatePath, createSql, 'utf-8');
  try {
    execSync(
      `${WRANGLER_BIN} d1 execute ${DB_NAME} ${modeFlag} --file="${tmpCreatePath}"`,
      { stdio: 'inherit' }
    );
  } finally {
    if (fs.existsSync(tmpCreatePath)) fs.unlinkSync(tmpCreatePath);
  }
}

function fetchExistingRows() {
  let output;
  try {
    output = runWrangler(`--command "SELECT id, lang, type, text FROM replies" --json`);
  } catch (e) {
    console.error('❌ 查询现有数据失败:', e.message);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (e) {
    console.error('❌ 无法解析 wrangler 返回的 JSON:', e.message);
    console.error('原始输出:', output);
    process.exit(1);
  }

  // wrangler d1 execute --json 返回形如 [{ results: [...], success: true, ... }]
  const rows = Array.isArray(parsed) ? (parsed[0]?.results ?? []) : (parsed.results ?? []);

  const map = new Map();
  for (const row of rows) {
    map.set(Number(row.id), {
      lang: row.lang,
      type: row.type,
      text: row.text,
    });
  }
  return map;
}

function rowsEqual(a, b) {
  return a.lang === b.lang && a.type === b.type && a.text === b.text;
}

function main() {
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ 找不到文件: ${jsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('❌ replies.json 不是合法的 JSON:', e.message);
    process.exit(1);
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.error('❌ replies.json 内容为空或格式不对，应该是一个非空数组');
    process.exit(1);
  }

  // 先确保表存在（首次运行时）
  console.log('🔍 确保 replies 表存在...');
  ensureTableExists();

  console.log('🔍 读取数据库现有数据，用于对比...');
  const existingMap = fetchExistingRows();

  const toUpsert = [];
  let skipped = 0;

  for (const row of data) {
    const { id, lang, type, text } = row;
    if (id === undefined || id === null || !lang || !type || !text) {
      console.error('❌ 发现字段不完整的记录，已终止：', row);
      process.exit(1);
    }

    const numId = Number(id);
    const existing = existingMap.get(numId);
    const incoming = { lang, type, text };

    if (existing && rowsEqual(existing, incoming)) {
      skipped++;
      continue;
    }

    toUpsert.push({ id: numId, ...incoming });
  }

  console.log(`📊 对比结果：共 ${data.length} 条，跳过 ${skipped} 条（内容完全相同），待写入 ${toUpsert.length} 条`);

  if (toUpsert.length === 0) {
    console.log('✅ 没有需要更新或新增的记录，已跳过写入。');
    return;
  }

  const lines = [];
  for (const row of toUpsert) {
    lines.push(
      `INSERT INTO replies (id, lang, type, text) VALUES (${row.id}, '${escapeSql(row.lang)}', '${escapeSql(row.type)}', '${escapeSql(row.text)}') ` +
      `ON CONFLICT(id) DO UPDATE SET lang=excluded.lang, type=excluded.type, text=excluded.text;`
    );
  }

  fs.writeFileSync(sqlPath, lines.join('\n'), 'utf-8');
  console.log(`📝 已生成临时 SQL 文件: ${sqlPath}（共 ${toUpsert.length} 条待写入记录）`);

  const cmd = `${WRANGLER_BIN} d1 execute ${DB_NAME} ${modeFlag} --file="${sqlPath}"`;
  console.log(`🚀 执行命令: ${cmd}`);

  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ 写入完成，共 ${toUpsert.length} 条记录（${isRemote ? '远程生产库' : '本地开发库'}），跳过 ${skipped} 条未变化的记录`);
  } catch (err) {
    console.error('❌ 执行 wrangler 命令失败:', err.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
  }
}

main();
