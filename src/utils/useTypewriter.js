// src/utils/useTypewriter.js
import { useState, useEffect } from "preact/hooks";

export function useTypewriter(fullText, interval = 200) {
  const [chunks, setChunks] = useState([]);

  useEffect(() => {
    if (!fullText) {
      setChunks([]);
      return;
    }

    const rawChunks = [];
    let i = 0;
    while (i < fullText.length) {
      const size = Math.random() < 0.8 ? 10 : 20;
      rawChunks.push(fullText.slice(i, i + size));
      i += size;
    }

    setChunks([]); // 从空数组开始,逐块 push,而不是一次性把全文放进 DOM

    const timers = rawChunks.map((text, index) =>
      setTimeout(() => {
        // 到点了,才把这一块加入 DOM(先是不可见状态)
        setChunks((prev) => [...prev, { text, visible: false }]);

        // 等它被加入 DOM 的下一帧,再切换为可见,触发 opacity 过渡动画
        requestAnimationFrame(() => {
          setChunks((prev) => {
            const next = [...prev];
            if (!next[index]) return prev;
            next[index] = { ...next[index], visible: true };
            return next;
          });
        });
      }, index * interval)
    );

    return () => timers.forEach((t) => clearTimeout(t));
  }, [fullText, interval]);

  return chunks;
}