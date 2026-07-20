// utils/scrollMemory.js
// 记住页面滚动位置,存到 localStorage,刷新后自动恢复

const STORAGE_KEY = "scrollMemory";

function saveScrollPosition() {
  localStorage.setItem(STORAGE_KEY, String(window.scrollY));
}

function restoreScrollPosition() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) return;

  const y = parseInt(saved, 10);
  if (isNaN(y)) return;

  // 用 requestAnimationFrame 确保在浏览器完成首次布局之后再滚动,
  // 否则页面内容还没渲染出高度,scrollTo 会失效
  requestAnimationFrame(() => {
    window.scrollTo(0, y);
  });
}

/**
 * 初始化滚动位置记忆功能。
 * 调用后会:
 * 1. 立即尝试恢复上次保存的滚动位置
 * 2. 监听滚动事件,持续保存最新位置
 *
 * @returns {Function} 清理函数,调用可移除监听(一般组件卸载时用)
 */
export function initScrollMemory() {
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      saveScrollPosition();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  return () => window.removeEventListener("scroll", onScroll);
}

export { restoreScrollPosition };