// main.jsx
import { h, render } from "preact";
import App from "./index.jsx";

// 挂载深色主题(对应 main.css 里的 :root[data-theme="dark"] 那套变量)
document.documentElement.setAttribute("data-theme", "dark");

render(<App />, document.getElementById("app"));