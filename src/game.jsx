// src/game.jsx
import { useEffect, useState } from "preact/hooks";
import DinoJump from "./utils/game/DinoJump.jsx";

// ------------------------------
// 1. 游戏顺序表（以后每加一个游戏，往这里加一个 key 即可）
// ------------------------------
export const GAME_ORDER = ["tetris"]; // 后面依次追加 "minesweeper", "2048" ...

// ------------------------------
// 2. IndexedDB 基础封装
// ------------------------------
const DB_NAME = "token-games-db";
const DB_VERSION = 1;
const STORE_NAME = "unlocked-games";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // key: gameKey (如 "tetris")，value: { unlockedAt: timestamp }
        db.createObjectStore(STORE_NAME, { keyPath: "gameKey" });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

// 读取所有已解锁的游戏 key 列表
async function getUnlockedGames() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const rows = req.result || [];
      resolve(rows.map((r) => r.gameKey));
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

// 标记某个游戏为已解锁（第二步会在游戏得分成功时调用它，这一步先只导出，不接入）
export async function markGameUnlocked(gameKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ gameKey, unlockedAt: Date.now() });
    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

// ------------------------------
// 3. 决定当前应该加载哪个游戏
//    规则：找 GAME_ORDER 里第一个"未解锁"的游戏
//    如果全解锁了，返回 null（表示用户可以在已解锁列表里任选，但不能跳选未解锁的）
// ------------------------------
export function getNextGameToLoad(unlockedList) {
  for (const key of GAME_ORDER) {
    if (!unlockedList.includes(key)) {
      return key;
    }
  }
  return null; // 全部已解锁
}

// ------------------------------
// 4. 占位组件：先只打印状态，不渲染具体游戏
// ------------------------------
export default function Game() {

  const [unlocked, setUnlocked] = useState(null); // null = 加载中
  const [nextGame, setNextGame] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getUnlockedGames()
      .then((list) => {
        if (cancelled) return;
        setUnlocked(list);
        setNextGame(getNextGameToLoad(list));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div>IndexedDB 出错: {error}</div>;
  }

  if (unlocked === null) {
    return <div>加载中...</div>;
  }

  return <DinoJump />;
}