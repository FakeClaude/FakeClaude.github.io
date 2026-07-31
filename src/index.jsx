import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import Home from "./home.jsx";
import Game from "./game.jsx";

function getPageFromHash() {
  return window.location.hash === "#/game" ? "game" : "home";
}

export default function App() {
  const [page, setPage] = useState(getPageFromHash);

  // 支持浏览器前进/后退按钮：hash 变化时同步页面状态
  useEffect(() => {
    function handleHashChange() {
      setPage(getPageFromHash());
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  function enterGame() {
    window.location.hash = "#/game";
    setPage("game");
  }

  function closeGame() {
    window.location.hash = "";
    setPage("home");
  }

  if (page === "game") {
     return <Game onClose={closeGame} />;
  }
  return <Home onEnterGame={enterGame} />;
}