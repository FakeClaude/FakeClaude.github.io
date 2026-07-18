// src/utils/useTypewriter.js
import { useState, useEffect, useRef } from "preact/hooks";

export function useTypewriter(fullText, interval = 200) {
  const [chunks, setChunks] = useState([]);
  const [done, setDone] = useState(false);
  const totalRef = useRef(0);

  useEffect(() => {
    if (!fullText) {
      setChunks([]);
      setDone(false);
      return;
    }

    const rawChunks = [];
    let i = 0;
    while (i < fullText.length) {
      const size = Math.random() < 0.8 ? 10 : 20;
      rawChunks.push(fullText.slice(i, i + size));
      i += size;
    }

    totalRef.current = rawChunks.length;
    setChunks([]);
    setDone(false);

    const timers = rawChunks.map((text, index) =>
      setTimeout(() => {
        setChunks((prev) => [...prev, { text, visible: false }]);

        requestAnimationFrame(() => {
          setChunks((prev) => {
            const next = [...prev];
            if (!next[index]) return prev;
            next[index] = { ...next[index], visible: true };
            return next;
          });
          // 只有轮到最后一块、且它这一帧也标记为可见了,才算真正播完
          if (index === totalRef.current - 1) {
            setDone(true);
          }
        });
      }, index * interval)
    );

    return () => timers.forEach((t) => clearTimeout(t));
  }, [fullText, interval]);

  return { chunks, done };
}