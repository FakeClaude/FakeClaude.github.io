#!/usr/bin/env node
/**
 * scripts/seed-d1.js
 *
 * 功能：清空 D1 数据库中的 replies 表，并用 scripts/replies.json 的内容重新写入。
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

// wrangler.toml 里配置的 D1 database_name
const DB_NAME = 'fakeclaude';

const isRemote = process.argv.includes('--remote');
const modeFlag = isRemote ? '--remote' : '--local';

const jsonPath = path.join(__dirname, 'replies.json');
const sqlPath = path.join(__dirname, '.seed-tmp.sql');

function escapeSql(str) {
  // SQL 里单引号需要转义成两个单引号
  return String(str).replace(/'/g, "''");
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

  const lines = [];
  lines.push('DROP TABLE IF EXISTS replies;');
  lines.push(`CREATE TABLE replies (
  id INTEGER PRIMARY KEY,
  lang TEXT NOT NULL,
  type TEXT NOT NULL,
  text TEXT NOT NULL
);`);

  let count = 0;
  for (const row of data) {
    const { id, lang, type, text } = row;
    if (id === undefined || id === null || !lang || !type || !text) {
      console.error('❌ 发现字段不完整的记录，已终止：', row);
      process.exit(1);
    }
    lines.push(
      `INSERT INTO replies (id, lang, type, text) VALUES (${Number(id)}, '${escapeSql(lang)}', '${escapeSql(type)}', '${escapeSql(text)}');`
    );
    count++;
  }

  fs.writeFileSync(sqlPath, lines.join('\n'), 'utf-8');
  console.log(`📝 已生成临时 SQL 文件: ${sqlPath}（共 ${count} 条记录）`);

  const cmd = `npx wrangler d1 execute ${DB_NAME} ${modeFlag} --file="${sqlPath}"`;
  console.log(`🚀 执行命令: ${cmd}`);

  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✅ 写入完成，共 ${count} 条记录（${isRemote ? '远程生产库' : '本地开发库'}）`);
  } catch (err) {
    console.error('❌ 执行 wrangler 命令失败:', err.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
  }
}

main();