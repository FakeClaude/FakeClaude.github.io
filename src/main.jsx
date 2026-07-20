// main.jsx
import { h, render } from "preact";
import App from "./index.jsx";
import { i18nPromise } from "./utils/i18n.js";
import { initTheme } from "./utils/theme.js";

initTheme();

i18nPromise.then(() => {
  render(<App />, document.getElementById("app"));
});