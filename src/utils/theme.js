// src/utils/theme.js 主题皮肤

export function initTheme() {
  // 1️⃣ 从 localStorage 读取主题
  let theme = localStorage.getItem("theme");
  if (!theme) {
    theme = "system";
    localStorage.setItem("theme", theme);
  }

  // 2️⃣ 解析成具体主题
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const activeTheme =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  // 3️⃣ 立即写入到 <html> 上 —— 🚀 CSS 依赖它
  document.documentElement.setAttribute("data-theme", activeTheme);
  document.documentElement.style.backgroundColor =
    activeTheme === "dark" ? "#000" : "#fff";
  document.documentElement.style.colorScheme = activeTheme;

  // 4️⃣ 同步 body & meta 颜色
  if (document.body)
    document.body.style.backgroundColor = activeTheme === "dark" ? "#000" : "#fff";

  const meta = document.getElementById("theme-color-meta");
  if (meta)
    meta.setAttribute("content", activeTheme === "dark" ? "#000" : "#fff");

  // 5️⃣ 监听系统主题变化
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", (e) => {
    if (localStorage.getItem("theme") === "system") {
      const newTheme = e.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", newTheme);
      document.documentElement.style.backgroundColor =
        newTheme === "dark" ? "#000" : "#fff";
      document.body.style.backgroundColor =
        newTheme === "dark" ? "#000" : "#fff";
      if (meta)
        meta.setAttribute("content", newTheme === "dark" ? "#000" : "#fff");
    }
  });
}

export function applyTheme(theme) {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const activeTheme =
    theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  // 设置 data-theme 属性供 CSS 使用
  document.documentElement.setAttribute("data-theme", activeTheme);

  // 设置背景颜色（防闪白）
  const bg = activeTheme === "dark" ? "#000" : "#fff";
  document.documentElement.style.backgroundColor = bg;
  document.body.style.backgroundColor = bg;
  document.documentElement.style.colorScheme = activeTheme;

  // 更新浏览器主题色（顶部地址栏颜色）
  const meta = document.getElementById("theme-color-meta");
  if (meta) meta.setAttribute("content", bg);
}

/**
 * 手动设置主题
 * @param {"light"|"dark"|"system"} mode
 */
export function setTheme(mode) {
  localStorage.setItem("theme", mode);
  applyTheme(mode);
}
