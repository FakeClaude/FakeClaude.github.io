// utils/scrollMemory.js
import { useEffect, useRef } from "preact/hooks";

const STORAGE_KEY = "scrollMemory";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function saveScroll(key, y) {
  if (!key) return;
  const all = readAll();
  all[key] = y;
  writeAll(all);
}

export function getScroll(key) {
  if (!key) return 0;
  const all = readAll();
  return all[key] || 0;
}

/**
 * 滚动位置记忆 Hook
 * @param {Object} containerRef  滚动容器的 ref（例如 .card-list）
 * @param {string} key           记忆位置的唯一键（如 "best" / "new" / "myevents"）
 * @param {boolean} ready        数据是否已加载完成（决定何时尝试恢复滚动）
 */
export function useScrollMemory(containerRef, key, ready) {
  const restoredRef = useRef(false);

  // 监听滚动并保存
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        saveScroll(key, el.scrollTop);
        ticking = false;
      });
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [key, ready]);

  // 数据就绪后恢复滚动位置（仅恢复一次）
  useEffect(() => {
    if (!ready) {
      restoredRef.current = false;
      return;
    }
    if (restoredRef.current) return;

    const el = containerRef.current;
    const savedY = getScroll(key);
    if (savedY > 0 && el) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollTop = savedY;
        });
      });
    }
    restoredRef.current = true;
  }, [ready, key]);
}