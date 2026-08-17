import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import { lazy, Suspense } from "preact/compat";
import Home from "./home.jsx";

const Game = lazy(() => import("./game.jsx"));

// 解析形如 "#/game" 或 "#/game/DinoJump" 的 hash
// 返回 { page: "home" | "game", gameKey: 具体游戏名 | null }
function parseHash() {
  const hash = window.location.hash;
  const match = hash.match(/^#\/game(?:\/([^/]+))?$/);
  if (match) {
    return { page: "game", gameKey: match[1] || null };
  }
  return { page: "home", gameKey: null };
}

export default function App() {
  const [route, setRoute] = useState(parseHash);

  // 静默拉game资源
  useEffect(() => {
    function handleHashChange() {
      setRoute(parseHash());
    }
    window.addEventListener("hashchange", handleHashChange);

    let idleId;
    let timerId;
    if ("requestIdleCallback" in window) {
      idleId = requestIdleCallback(() => import("./game.jsx"), { timeout: 2000 });
    } else {
      timerId = setTimeout(() => import("./game.jsx"), 2000);
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      if (idleId) cancelIdleCallback(idleId);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  function enterGame() {
    // 不指定具体游戏名，进去之后由 Game 组件根据 idb 里的进度决定是哪个游戏，
    // 再通过 onGameKeyChange 把具体游戏名补进地址栏
    window.location.hash = "#/game";
    setRoute({ page: "game", gameKey: null });
  }

  function closeGame() {
    window.location.hash = "";
    setRoute({ page: "home", gameKey: null });
  }

  // Game 组件内部当前显示的游戏发生变化时调用
  function setGameHash(key) {
    const newHash = `#/game/${key}`;
    if (window.location.hash !== newHash) {
      window.location.hash = newHash;
    }
    setRoute({ page: "game", gameKey: key });
  }

  if (route.page === "game") {
    return (
      <Suspense fallback={null}>
        <Game onClose={closeGame} urlGameKey={route.gameKey} onGameKeyChange={setGameHash} />
      </Suspense>
    );
  }
  return <Home onEnterGame={enterGame} />;
}