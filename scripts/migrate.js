/*
 node /Volumes/SSD/Other/Possmap/scripts/migrate.js
 新增命题或新闻脚本 utils/change目录的所有.js导入firestore
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "./serviceAccount.json" with { type: "json" };
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TARGET_DIR = path.resolve(__dirname, "../src/utils/change");

// true全部清空-写入逻辑，false不清空-新增命题和新闻逻辑
const CLEAR_BEFORE_MIGRATE = false;

if (!fs.existsSync(TARGET_DIR)) {
  console.error(`❗️ 目标目录不存在: ${TARGET_DIR}`);
  process.exit(1);
}

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// 递归清空 propositions 集合：先删每个文档下的 triggers 子集合，再删文档本身
async function clearPropositions() {
  console.log("🧹 正在清空 propositions 集合...");

  const propsSnapshot = await db.collection("propositions").get();

  if (propsSnapshot.empty) {
    console.log("ℹ️ propositions 集合本就是空的，无需清空");
    return;
  }

  let deletedDocs = 0;

  for (const propDoc of propsSnapshot.docs) {
    // 先删子集合 triggers
    const triggersSnapshot = await propDoc.ref.collection("triggers").get();

    if (!triggersSnapshot.empty) {
      let batch = db.batch();
      let operationCount = 0;

      for (const triggerDoc of triggersSnapshot.docs) {
        batch.delete(triggerDoc.ref);
        operationCount++;
        if (operationCount === 400) {
          await batch.commit();
          batch = db.batch();
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }
    }

    // 再删文档本身
    await propDoc.ref.delete();
    deletedDocs++;
  }

  console.log(`✅ 已清空 propositions 集合，共删除 ${deletedDocs} 篇文档（含各自 triggers 子集合）`);
}

// 全新命题：整条新建（原有逻辑，要求 prop.baseProbability 已提供）
async function createNewProposition(prop, triggers) {
  const triggerCount = triggers.length;
  const latestTriggerDate = triggers.reduce(
    (max, t) => (t.date > max ? t.date : max),
    triggers[0]?.date || "2026-01-01"
  );

  const propRef = db.collection("propositions").doc();
  const generatedId = propRef.id;
  const creatorId = "dpVoWjwVUpTL6rY4rmIUD6b2xyg1";
  const follow = Math.floor(Math.random() * (5000 - 200 + 1)) + 200;

  const sortedTriggers = [...triggers].sort((a, b) => a.date.localeCompare(b.date));
  const trendCache = sortedTriggers.map((t) => ({
    d: t.dir === "up" ? 1 : 0,
    p: Math.round(parseFloat(t.pct) * 10),
    t: parseInt(t.date.replace(/-/g, ""), 10),
  }));

  await propRef.set({
    id: generatedId,
    title: prop.title,
    baseProbability: parseFloat(prop.baseProbability),
    follow,
    triggerCount,
    trendCache,
    latestTriggerDate,
    creatorId,
    createdAt: new Date(latestTriggerDate),
    updatedAt: new Date(),
  });

  let batch = db.batch();
  let operationCount = 0;

  for (const [index, trigger] of triggers.entries()) {
    const numericId = String(index + 1);
    const triggerRef = propRef.collection("triggers").doc(numericId);

    batch.set(triggerRef, {
      authorId: creatorId,
      createdAt: new Date(trigger.date),
      dir: trigger.dir,
      pct: trigger.pct,
      text: trigger.text,
      date: trigger.date,
      url: trigger.url || "",
      basis: trigger.basis || "",
    });

    operationCount++;
    if (operationCount === 400) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}

// 已存在命题：按 date+text 比对，只追加 Firestore 中缺失的 trigger
async function appendMissingTriggers(propDoc, localTriggers) {
  const existingSnapshot = await propDoc.ref.collection("triggers").get();

  // 已存在的 (date, text) 组合集合，用于去重比对
  const existingKeySet = new Set();
  let maxNumericId = 0;

  existingSnapshot.forEach((doc) => {
    const data = doc.data();
    existingKeySet.add(`${data.date}__${data.text}`);
    const idNum = parseInt(doc.id, 10);
    if (!isNaN(idNum) && idNum > maxNumericId) {
      maxNumericId = idNum;
    }
  });

  // 本地文件里 Firestore 还没有的 trigger
  const missingTriggers = localTriggers.filter(
    (t) => !existingKeySet.has(`${t.date}__${t.text}`)
  );

  if (missingTriggers.length === 0) {
    return 0; // 没有新增
  }

  const creatorId = "dpVoWjwVUpTL6rY4rmIUD6b2xyg1";
  let batch = db.batch();
  let operationCount = 0;
  let nextId = maxNumericId + 1;

  for (const trigger of missingTriggers) {
    const triggerRef = propDoc.ref.collection("triggers").doc(String(nextId));
    nextId++;

    batch.set(triggerRef, {
      authorId: creatorId,
      createdAt: new Date(trigger.date),
      dir: trigger.dir,
      pct: trigger.pct,
      text: trigger.text,
      date: trigger.date,
      url: trigger.url || "",
      basis: trigger.basis || "",
    });

    operationCount++;
    if (operationCount === 400) {
      await batch.commit();
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  // 更新父文档：triggerCount 累加 / trendCache 追加 / latestTriggerDate 取最大值 / updatedAt
  const existingData = propDoc.data();
  const oldTrendCache = existingData.trendCache || [];

  const newTrendEntries = missingTriggers
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => ({
      d: t.dir === "up" ? 1 : 0,
      p: Math.round(parseFloat(t.pct) * 10),
      t: parseInt(t.date.replace(/-/g, ""), 10),
    }));

  const mergedTrendCache = [...oldTrendCache, ...newTrendEntries];

  const allDates = [
    existingData.latestTriggerDate,
    ...missingTriggers.map((t) => t.date),
  ].filter(Boolean);
  const newLatestTriggerDate = allDates.reduce((max, d) => (d > max ? d : max));

  await propDoc.ref.update({
    triggerCount: (existingData.triggerCount || 0) + missingTriggers.length,
    trendCache: mergedTrendCache,
    latestTriggerDate: newLatestTriggerDate,
    updatedAt: new Date(),
  });

  return missingTriggers.length;
}

async function migrate() {
  try {
    if (CLEAR_BEFORE_MIGRATE) {
      await clearPropositions();
    }

    const files = fs.readdirSync(TARGET_DIR).filter((file) => file.endsWith(".js"));

    if (files.length === 0) {
      console.log("ℹ️ 目标目录中未检索到 .js 文件");
      process.exit(0);
    }

    let invalidCount = 0;
    let newPropCount = 0;
    let updatedPropCount = 0;
    let unchangedPropCount = 0;
    let addedTriggerCount = 0;

    for (const file of files) {
      const absolutePath = path.join(TARGET_DIR, file);
      const sourceUrl = pathToFileURL(absolutePath);

      const dataModule = await import(sourceUrl);
      const propositionsData = dataModule.propositions || dataModule.default;

      // 结构非法校验
      if (!Array.isArray(propositionsData) || propositionsData.length === 0) {
        invalidCount++;
        continue;
      }

      for (const prop of propositionsData) {
        const localTriggers = prop.triggers || [];

        // 按 title 匹配 Firestore 中是否已存在该命题
        const snapshot = await db
          .collection("propositions")
          .where("title", "==", prop.title)
          .limit(1)
          .get();

        if (snapshot.empty) {
          // 情况一：全新命题，整条新建
          await createNewProposition(prop, localTriggers);
          newPropCount++;
          addedTriggerCount += localTriggers.length;
        } else {
          // 情况二：命题已存在，按 date+text 增量追加缺失 trigger
          const propDoc = snapshot.docs[0];
          const added = await appendMissingTriggers(propDoc, localTriggers);

          if (added > 0) {
            updatedPropCount++;
            addedTriggerCount += added;
          } else {
            unchangedPropCount++;
          }
        }
      }
    }

    // 格式化输出最终统计 Log
    if (invalidCount > 0) {
      console.log(`⚠️ ${invalidCount}个文件结构非法`);
    }
    console.log(`🆕 新建命题 ${newPropCount} 个`);
    console.log(`🔁 更新命题 ${updatedPropCount} 个（追加了缺失trigger）`);
    console.log(`⏭️ 未变化命题 ${unchangedPropCount} 个（trigger均已存在）`);
    console.log(`✅ 共新增 ${addedTriggerCount} 条trigger`);

    process.exit(0);
  } catch (err) {
    console.error("❗️ 脚本中止执行，失败原因:", err);
    process.exit(1);
  }
}

migrate();
