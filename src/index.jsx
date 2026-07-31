import { h } from "preact";
import { useState } from "preact/hooks";
import Home from "./home.jsx";
import Game from "./game.jsx";

export default function App() {
  const [page, setPage] = useState("home");

  if (page === "game") {
     return <Game onClose={() => setPage("home")} />;
  }
  return <Home onEnterGame={() => setPage("game")} />;
}