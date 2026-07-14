// utils/firebaseLogger.js 流量统计
import { getDocs as _getDocs, getDoc as _getDoc } from "firebase/firestore";

// ─── Re-export propositions.js 用到的所有 firestore 函数 ──────────
// （这样 propositions.js 只需改 import 路径，内容一字不动）
export {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, limit, startAfter,
  serverTimestamp
} from "firebase/firestore";

// ─── 会话统计 ─────────────────────────────────────────────────────
const stats = { reads: 0, bytes: 0, byStage: {} };

function estimateBytes(data) {
  try { return new TextEncoder().encode(JSON.stringify(data)).length; }
  catch { return 0; }
}

// 自动从调用栈解析阶段名，无需手动传 label
function getCallerLabel() {
  const lines = (new Error().stack || "").split("\n");
  const callers = [];
  for (const line of lines) {
    if (line.includes("firebaseLogger")) continue;
    if (line.includes("node_modules"))   continue;
    const match = line.match(/at (?:async )?(?:\w+\.)?(\w+) \(/);
    if (match?.[1]) callers.push(match[1]);
    if (callers.length >= 2) break;
  }
  // 倒序：外层函数（阶段名）在前，内层在后，如 "startLoadingPipeline › fetchTriggers"
  return callers.reverse().join(" › ") || "unknown";
}

function record(label, docCount, bytes) {
  stats.reads += docCount;
  stats.bytes  += bytes;
  if (!stats.byStage[label]) stats.byStage[label] = { calls: 0, reads: 0, bytes: 0 };
  stats.byStage[label].calls += 1;
  stats.byStage[label].reads += docCount;
  stats.byStage[label].bytes += bytes;

  console.log(` 累计 ${stats.reads} reads / ~${(stats.bytes / 1024).toFixed(1)} KB`
  );
}

// ─── 包装 getDocs / getDoc（签名与原版完全相同）────────────────────
export async function getDocs(q) {
  const label = getCallerLabel();
  const snap  = await _getDocs(q);
  const bytes = snap.docs.reduce((s, d) => s + estimateBytes(d.data()), 0);
  record(label, snap.docs.length, bytes);
  return snap;
}

export async function getDoc(ref) {
  const label = getCallerLabel();
  const snap  = await _getDoc(ref);
  const bytes = snap.exists() ? estimateBytes(snap.data()) : 0;
  record(label, snap.exists() ? 1 : 0, bytes);
  return snap;
}

// ─── 调试工具 ──────────────────────────────────────────────────────
export function printFirebaseStats() {
  console.group("📊 Firebase 流量统计");
  console.log(`总读取: ${stats.reads} 文档  |  估算传输: ~${(stats.bytes / 1024).toFixed(1)} KB`);
  console.table(
    Object.entries(stats.byStage)
      .sort((a, b) => b[1].reads - a[1].reads)
      .map(([stage, s]) => ({
        调用路径:   stage,
        调用次数:   s.calls,
        文档数:     s.reads,
        "估算 KB":  (s.bytes / 1024).toFixed(1)
      }))
  );
  console.groupEnd();
}

export function resetFirebaseStats() {
  stats.reads = 0; stats.bytes = 0; stats.byStage = {};
  console.log("🔄 Firebase 统计已重置");
}

export function getFirebaseStats() { return structuredClone(stats); }

// DEV 环境挂载到 window，方便 Console 直接调用
if (typeof window !== "undefined" && import.meta.env?.DEV) {
  window.__fbPrint = printFirebaseStats;
  window.__fbReset = resetFirebaseStats;
  window.__fbStats = getFirebaseStats;
}