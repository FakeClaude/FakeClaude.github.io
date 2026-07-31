// src/game.jsx
import { useEffect, useState } from "preact/hooks";
import DinoJump from "./utils/game/DinoJump.jsx";
import {h} from "preact";
import { useTranslation } from "react-i18next";
import { idb } from "./utils/IndexedDB";

// 游戏顺序表
export const GAME_ORDER = ["tetris"]; // 后面依次追加 "minesweeper", "2048" ...
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
// 标记某个游戏为已解锁
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
export function getNextGameToLoad(unlockedList) {
  for (const key of GAME_ORDER) {
    if (!unlockedList.includes(key)) {
      return key;
    }
  }
  return null; // 全部已解锁
}

export default function Game({ onClose }) {
  const { t } = useTranslation();
  const [unlocked, setUnlocked] = useState(null); // null = 加载中
  const [nextGame, setNextGame] = useState(null);
  const [error, setError] = useState(null);
  const [tokenValue, setTokenValue] = useState(null); // null = 还没从 idb 读到；读到之后是数字
  const [tokenToasts, setTokenToasts] = useState([]); // 得/减分动效队列，每项 { id, delta }

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

  useEffect(() => {
    idb.get("token").then((saved) => {
      if (saved && saved.tokenLabel != null) {
        setTokenValue(Number(saved.tokenLabel));
      } else {
        idb.set("token", { tokenLabel: "10" });
        setTokenValue(10);
      }
    });
  }, []);

  // DinoJump 里翻山 +1 / 死亡 -1 时会调用这个，负责写回 idb、刷新页面数字、弹出动效
  function handleTokenChange(newValue, delta) {
    setTokenValue(newValue);
    idb.set("token", { tokenLabel: String(newValue) });

    if (delta) {
      const toastId = Date.now() + Math.random();
      setTokenToasts((prev) => [...prev, { id: toastId, delta }]);
      // 动画播放完毕（900ms，和下面 CSS 动画时长保持一致）后自动移除，避免堆积
      setTimeout(() => {
        setTokenToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 900);
    }
  }

  if (error) {
    return <div>IndexedDB 出错: {error}</div>;
  }

  if (unlocked === null) {
    return <div>加载中...</div>;
  }

  return (
    <>
      <div className="home-token">
        <span className="token-name" >{t("home.Token")}</span >
        <span className="token-label" >{" "}{tokenValue ?? "…"}</span >
        {tokenToasts.map((toast) => (
          <span
            key={toast.id}
            className={`token-toast ${toast.delta > 0 ? "token-toast-up" : "token-toast-down"}`}
          >
            {toast.delta > 0 ? `+${toast.delta}` : toast.delta}
          </span>
        ))}
      </div>
      <div className="game-close" onClick={onClose}></div>
      {tokenValue !== null && (
        <DinoJump initialToken={tokenValue} onTokenChange={handleTokenChange} />
      )}
    </>
  );

}