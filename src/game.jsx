// src/game.jsx
import { useEffect, useState } from "preact/hooks";
import DinoJump from "./utils/game/DinoJump.jsx";
import Tetris from "./utils/game/Tetris.jsx";
import SnakeOrbit from "./utils/game/SnakeOrbit.jsx";
import {h} from "preact";
import { useTranslation } from "react-i18next";
import { idb } from "./utils/IndexedDB";

// 游戏顺序表
export const GAME_ORDER = ["tetris"];
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

// 已知的游戏 key，用来校验 URL 里带来的游戏名是否合法
const KNOWN_GAMES = ["DinoJump", "Tetris", "SnakeOrbit"];

export default function Game({ onClose, urlGameKey, onGameKeyChange }) {
  const { t } = useTranslation();
  const [unlocked, setUnlocked] = useState(null); // null = 加载中
  const [nextGame, setNextGame] = useState(null);
  const [error, setError] = useState(null);
  const [tokenValue, setTokenValue] = useState(null); // null = 还没从 idb 读到；读到之后是数字
  const [displayedToken, setDisplayedToken] = useState(null); // 页面上实际展示的数字，逐步 +1/-1 追向 tokenValue
  const [tokenToasts, setTokenToasts] = useState([]); // 得/减分动效队列，每项 { id, delta }
  const [currentGame, setCurrentGame] = useState(null); // null = 还没从 idb 读到；"DinoJump" | "Tetris" | "SnakeOrbit"
  const [snakeOrbitProgress, setSnakeOrbitProgress] = useState(null); // SnakeOrbit 上次过关瞬间的完整快照，null = 从第1关开始

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

  useEffect(() => {
    idb.get("game").then((saved) => {
      let resolvedCurrent;
      let resolvedSnakeProgress = null;
      let needsWrite = false;

      if (saved && typeof saved === "object") {
        // 新格式：{ current: "DinoJump" | "Tetris" | "SnakeOrbit", SnakeOrbit: 快照对象 }
        // SnakeOrbit 字段如果是完整快照对象（有 snake 字段）才能精确恢复；
        // 如果是旧版本存的纯数字（只记关卡数），没法精确还原身体位置，回退到从第1关开始
        resolvedCurrent = saved.current;
        const snakeProgress = saved.SnakeOrbit;
        resolvedSnakeProgress = snakeProgress && typeof snakeProgress === "object" ? snakeProgress : null;
      } else if (typeof saved === "string") {
        // 更旧的格式：直接存的字符串，读到后自动迁移成新的对象格式
        resolvedCurrent = saved;
        needsWrite = true;
      } else {
        resolvedCurrent = "DinoJump";
        needsWrite = true;
      }

      // 地址栏里指定了合法的游戏名（分享链接打开 / 手动改地址），优先采用，并同步写回 idb
      if (urlGameKey && KNOWN_GAMES.includes(urlGameKey) && urlGameKey !== resolvedCurrent) {
        resolvedCurrent = urlGameKey;
        needsWrite = true;
      }

      if (needsWrite) {
        idb.set("game", { current: resolvedCurrent, SnakeOrbit: resolvedSnakeProgress });
      }

      setCurrentGame(resolvedCurrent);
      setSnakeOrbitProgress(resolvedSnakeProgress);
    });
  }, []);

  // 当前显示的游戏一旦确定/发生变化（首次加载确定、或闯关切到下一个），
  // 就把地址栏同步成 "#/game/具体游戏名"，这样地址可以直接分享打开
  useEffect(() => {
    if (currentGame) {
      onGameKeyChange?.(currentGame);
    }
  }, [currentGame]);

  // 闯关成功时由子游戏调用：把当前游戏记录切换成指定的下一个游戏，写回 idb.FakeClaudeDB.replies.game
  function handleLevelComplete(nextGameKey) {
    idb.get("game").then((saved) => {
      const prev = saved && typeof saved === "object" ? saved : {};
      idb.set("game", { ...prev, current: nextGameKey });
    });
    setCurrentGame(nextGameKey);
  }

  // SnakeOrbit 每绕成功一圈（身体闪烁那一瞬间）就调用这个，把完整快照（身体坐标、
  // 下一关目标、方向、待长出的量）写回 idb，同级于 current 字段；
  // 死亡重开或刷新后由 SnakeOrbit 自己精确恢复到这一帧
  function handleSnakeProgressChange(snapshot) {
    setSnakeOrbitProgress(snapshot);
    idb.get("game").then((saved) => {
      const prev = saved && typeof saved === "object" ? saved : { current: "SnakeOrbit" };
      idb.set("game", { ...prev, SnakeOrbit: snapshot });
    });
  }

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

  // token 数字滚动动效：不直接跳到目标值，而是每隔一小段时间 +1/-1 逐步逼近
  // 首次读到 tokenValue 时（displayedToken 还是 null）直接同步，不做动画
  useEffect(() => {
    if (tokenValue === null) return;
    if (displayedToken === null) {
      setDisplayedToken(tokenValue);
      return;
    }
    if (displayedToken === tokenValue) return;

    const diff = tokenValue - displayedToken;
    const step = diff > 0 ? 1 : -1;
    const totalSteps = Math.abs(diff);
    // 差值大时加快节奏，避免涨分很多时动画拖太久；差值小时保持能看清的速度
    const stepDuration = Math.max(15, Math.min(80, 600 / totalSteps));

    const timer = setInterval(() => {
      setDisplayedToken((prev) => {
        if (prev === null) return prev;
        const next = prev + step;
        if (next === tokenValue) {
          clearInterval(timer);
        }
        return next;
      });
    }, stepDuration);

    return () => clearInterval(timer);
  }, [tokenValue]);

  if (error) {
    return <div>IndexedDB 出错: {error}</div>;
  }

  if (unlocked === null || currentGame === null) {
    return <div>加载中...</div>;
  }

  return (
    <div className="game">
      <div className="home-token">
        <span className="token-name" >{t("home.Token")}</span >
        <span className="token-label" >{" "}{displayedToken ?? "…"}</span >
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
      {tokenValue !== null && currentGame === "DinoJump" && (
        <DinoJump
          initialToken={tokenValue}
          onTokenChange={handleTokenChange}
          onLevelComplete={() => handleLevelComplete("Tetris")}
        />
      )}
      {tokenValue !== null && currentGame === "Tetris" && (
        <Tetris
          initialToken={tokenValue}
          onTokenChange={handleTokenChange}
          onLevelComplete={() => handleLevelComplete("SnakeOrbit")}
        />
      )}
      {tokenValue !== null && currentGame === "SnakeOrbit" && (
        <SnakeOrbit
          initialToken={tokenValue}
          onTokenChange={handleTokenChange}
          initialProgress={snakeOrbitProgress}
          onProgressChange={handleSnakeProgressChange}
        />
      )}
    </div>
  );

}