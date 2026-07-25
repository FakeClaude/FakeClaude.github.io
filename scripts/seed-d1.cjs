#!/usr/bin/env node
/**
 * scripts/seed-d1.cjs
 *
 * 功能：
 *   1. 清空 D1 数据库中所有已存在的用户表（DROP TABLE）。
 *   2. 扫描 scripts/replies/ 目录下所有 *.json 文件。
 *   3. 每个 json 文件对应一张表，表名 = 文件名（去掉 .json 后缀）。
 *   4. 表的字段名 = json 记录里出现过的所有 key（自动合并所有记录的字段，
 *      避免个别记录缺字段导致漏建列）。
 *   5. 字段类型根据字段值自动推断：number -> INTEGER，其它 -> TEXT。
 *   6. 每个文件里的全部记录批量写入对应表。
 *
 * 用法：
 *   node scripts/seed-d1.cjs          -> 操作本地 D1（wrangler --local，开发环境）
 *   node scripts/seed-d1.cjs --remote -> 操作远程生产 D1（wrangler --remote，线上环境，请谨慎）
 *
 * 前置条件：
 *   1. 已安装并登录 wrangler CLI（npx wrangler login）
 *   2. scripts/replies/ 目录下存在若干 *.json 文件，每个文件是一个非空数组，
 *      数组元素是结构一致（或大体一致）的对象，例如：
 *      [{ "id": 1, "type": "work", "text": "..." }, ...]
 *   3. 下面 DB_NAME 改成你 wrangler.toml 里配置的 D1 database_name
 *
 * ⚠️ 警告：本脚本会先清空数据库里所有已存在的表，再重新建表导入数据，
 *          属于破坏性操作，请确认目标数据库（--local / --remote）无误后再执行。
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// wrangler.toml 里配置的 D1 database_name
const DB_NAME = 'fakeclaude';

// 如果你的环境里 wrangler 不是全局命令，把这里改成 'npx wrangler'
const WRANGLER_BIN = 'npx wrangler';

const isRemote = process.argv.includes('--remote');
const modeFlag = isRemote ? '--remote' : '--local';

const repliesDir = path.join(__dirname, 'replies');
const sqlPath = path.join(__dirname, '.seed-tmp.sql');

function escapeSql(str) {
  // SQL 里单引号需要转义成两个单引号
  return String(str).replace(/'/g, "''");
}

function escapeIdent(name) {
  // 表名/列名里的双引号转义，并用双引号包裹，避免和 SQL 关键字冲突
  return `"${String(name).replace(/"/g, '""')}"`;
}

function runSqlFile(sqlContent, label) {
  fs.writeFileSync(sqlPath, sqlContent, 'utf-8');
  const cmd = `${WRANGLER_BIN} d1 execute ${DB_NAME} ${modeFlag} --file="${sqlPath}"`;
  console.log(`🚀 执行: ${label}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } finally {
    if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
  }
}

function runWranglerJson(command) {
  const cmd = `${WRANGLER_BIN} d1 execute ${DB_NAME} ${modeFlag} --command "${command}" --json`;
  const output = execSync(cmd, { encoding: 'utf-8' });
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? (parsed[0]?.results ?? []) : (parsed.results ?? []);
}

// ---- 第一步：清空数据库里所有已存在的表 ----
function clearDatabase() {
  console.log('🔍 查询数据库现有表...');
  let tables;
  try {
    tables = runWranglerJson(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'"
    );
  } catch (e) {
    console.error('❌ 查询现有表失败:', e.message);
    process.exit(1);
  }

  if (!tables.length) {
    console.log('ℹ️  数据库当前没有可清空的用户表。');
    return;
  }

  const dropSql = tables.map((t) => `DROP TABLE IF EXISTS ${escapeIdent(t.name)};`).join('\n');
  console.log(`🧹 即将清空 ${tables.length} 张表: ${tables.map((t) => t.name).join(', ')}`);
  runSqlFile(dropSql, `清空数据库（DROP ${tables.length} 张表）`);
  console.log('✅ 数据库已清空。');
}

// ---- 第二步：扫描 scripts/replies/ 下的 json 文件 ----
function loadJsonFiles() {
  if (!fs.existsSync(repliesDir)) {
    console.error(`❌ 找不到目录: ${repliesDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(repliesDir)
    .filter((f) => f.toLowerCase().endsWith('.json'))
    .sort();

  if (!files.length) {
    console.error(`❌ ${repliesDir} 目录下没有找到任何 .json 文件`);
    process.exit(1);
  }

  const fileData = [];
  for (const file of files) {
    const filePath = path.join(repliesDir, file);
    const tableName = file.slice(0, -'.json'.length);
    const raw = fs.readFileSync(filePath, 'utf-8');

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      console.error(`❌ ${file} 不是合法的 JSON: ${e.message}`);
      process.exit(1);
    }

    if (!Array.isArray(data) || data.length === 0) {
      console.error(`❌ ${file} 内容为空或格式不对，应该是一个非空数组，已跳过`);
      continue;
    }

    fileData.push({ file, tableName, rows: data });
  }

  return fileData;
}

// ---- 第三步：根据记录内容推断字段名与类型 ----
function inferColumns(rows) {
  // 合并所有记录出现过的 key，保持首次出现的顺序
  const columnOrder = [];
  const columnTypes = {}; // key -> 'INTEGER' | 'TEXT'

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columnOrder.includes(key)) columnOrder.push(key);

      const value = row[key];
      const inferredType =
        typeof value === 'number' && Number.isFinite(value) ? 'INTEGER' : 'TEXT';

      // 只要有一条记录里该字段是 TEXT，就把整列定为 TEXT（更宽松、不易出错）
      if (columnTypes[key] === 'TEXT') continue;
      if (value === null || value === undefined) continue;
      columnTypes[key] = columnTypes[key] === undefined ? inferredType : (
        columnTypes[key] === inferredType ? inferredType : 'TEXT'
      );
    }
  }

  // 没有任何非空值出现过的字段，默认按 TEXT 处理
  for (const key of columnOrder) {
    if (!columnTypes[key]) columnTypes[key] = 'TEXT';
  }

  return { columnOrder, columnTypes };
}

// ---- 第四步：为单个文件生成建表 + 插入的 SQL ----
function buildTableSql(tableName, rows) {
  const { columnOrder, columnTypes } = inferColumns(rows);

  if (!columnOrder.length) {
    console.error(`❌ 表 ${tableName} 没有可用字段，已跳过`);
    return null;
  }

  // 如果存在 id 字段，把它设为主键，方便后续 upsert/去重
  const hasId = columnOrder.includes('id');

  const columnDefs = columnOrder.map((col) => {
    const type = columnTypes[col];
    const pk = hasId && col === 'id' ? ' PRIMARY KEY' : '';
    return `  ${escapeIdent(col)} ${type}${pk}`;
  });

  const createSql = `CREATE TABLE ${escapeIdent(tableName)} (\n${columnDefs.join(',\n')}\n);`;

  const insertLines = rows.map((row) => {
    const values = columnOrder.map((col) => {
      const v = row[col];
      if (v === undefined || v === null) return 'NULL';
      if (columnTypes[col] === 'INTEGER') {
        const n = Number(v);
        return Number.isFinite(n) ? String(n) : 'NULL';
      }
      return `'${escapeSql(v)}'`;
    });
    const cols = columnOrder.map(escapeIdent).join(', ');
    return `INSERT INTO ${escapeIdent(tableName)} (${cols}) VALUES (${values.join(', ')});`;
  });

  return `${createSql}\n${insertLines.join('\n')}`;
}

function main() {
  console.log(`🌐 目标数据库: ${DB_NAME}（${isRemote ? '远程生产库 --remote' : '本地开发库 --local'}）`);

  // 1. 清空数据库
  clearDatabase();

  // 2. 扫描 json 文件
  const fileData = loadJsonFiles();
  console.log(`📁 找到 ${fileData.length} 个 json 文件: ${fileData.map((f) => f.file).join(', ')}`);

  // 3. 逐个文件建表并写入
  let totalRows = 0;
  for (const { file, tableName, rows } of fileData) {
    const sql = buildTableSql(tableName, rows);
    if (!sql) continue;

    console.log(`\n📦 处理 ${file} -> 表 "${tableName}"（${rows.length} 条记录）`);
    runSqlFile(sql, `建表并写入 "${tableName}"`);
    totalRows += rows.length;
  }

  console.log(`\n✅ 全部完成，共处理 ${fileData.length} 个文件，写入 ${totalRows} 条记录（${isRemote ? '远程生产库' : '本地开发库'}）`);
}

main();
