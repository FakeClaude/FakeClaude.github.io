// home.jsx
import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import { useTranslation } from "react-i18next";
import "./main.css";
import { useTypewriter } from "./utils/useTypewriter";

function TypewriterText({ text, onChunkVisible, isLatest }) {
  const { chunks, done } = useTypewriter(text, 200);
  const [isSending, setIsSending] = useState(true);
  const sendingStartTime = useRef(Date.now());

  useEffect(() => {
    onChunkVisible?.();

    if (done && isSending) {
      const dur = 700;
      const elapsed = Date.now() - sendingStartTime.current;
      const remain = dur - (elapsed % dur);
      const timer = setTimeout(() => setIsSending(false), remain);
      return () => clearTimeout(timer);
    }
  }, [chunks, done]);

  return (
    <div class="ai-reply">
      <div class="ai-reply-text">
        {chunks.map((chunk, i) => (
          <span key={i} class={`typewriter-chunk ${chunk.visible ? "visible" : ""}`}>
            {chunk.text}
          </span>
        ))}
      </div>

      {isLatest && (
        isSending
          ? <img src="/loading_sending.svg" class="sending-icon" alt="" />
          : <div class="sending-icon sending-icon-static" />
      )}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();

  // <editor-fold desc="const">
  const [sendingSvg, setSendingSvg] = useState(null);
  const userScrolledUp = useRef(false);
  const thinkingStartTime = useRef(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingSvg, setThinkingSvg] = useState(null);
  const [userName] = useState(t("home.Idiot"));
  const [model] = useState("Idiot 5");
  const [effort] = useState("Max");
  const [text, setText] = useState("");
  const textareaRef = useRef(null);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);

  function handleInput(e) {
  setText(e.target.value);
  const el = textareaRef.current;
  const minH = started ? 24 : 52;
  el.style.height = "auto";
  el.style.height = Math.max(el.scrollHeight, minH) + "px";
}
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return t("home.Good Morning");
    if (hour < 18) return t("home.Good Afternoon");
    return t("home.Good Evening");
  }
  async function handleSend() {
    if (!text.trim()) return;
    userScrolledUp.current = false;
    const userText = text;
    setMessages((prev) => [...prev, {role: "user", text: userText}]);
  setStarted(true);
  setText("");
  const el = textareaRef.current;
  el.style.height = "24px";

  setIsThinking(true);
  thinkingStartTime.current = Date.now();

  // 请求数据库拿真实回答
  const res = await fetch("/api/reply", { method: "POST" });
  const data = await res.json();

  // 按之前的思路:等到动画播完当前整数倍周期,再停止思考、显示回答
  const dur = 700; // 对应你SVG里的 dur="0.7s",单位毫秒
  const elapsed = Date.now() - thinkingStartTime.current;
  const remain = dur - (elapsed % dur);

  setTimeout(() => {
    setIsThinking(false);
    setMessages((prev) => [...prev, { role: "ai", text: data.text }]);
  }, remain);
}
  function handleKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
}
  function scrollToKeepDistance() {
  if (userScrolledUp.current) return;

  const card = document.querySelector(".input-card");
  const list = document.querySelector(".message-list");
  if (!card || !list || !list.lastElementChild) return;

  const cardTop = card.getBoundingClientRect().top;
  const lastBottom = list.lastElementChild.getBoundingClientRect().bottom;
  const gap = cardTop - lastBottom;

  const vh = window.innerHeight;
  const minGap = vh * 0.1;
  const maxGap = vh * 0.2;

  if (gap >= minGap && gap <= maxGap) return;

  const target = window.scrollY - (gap - vh * 0.15);
  window.scrollTo(0, target);
}

  useEffect(() => {
  function handleWheel(e) {
    if (e.deltaY < 0) {
      userScrolledUp.current = true;
    }
  }
  window.addEventListener("wheel", handleWheel, { passive: true });
  return () => window.removeEventListener("wheel", handleWheel);
}, []);
  useEffect(() => {
    fetch("/loading_thinking.svg")
        .then((res) => res.text())
        .then((svgText) => setThinkingSvg(svgText))
        .catch((err) => console.error("error", err));
  }, []);
  useEffect(() => {
  fetch("/loading_sending.svg")
    .then((res) => res.text())
    .then((svgText) => setSendingSvg(svgText))
    .catch((err) => console.error("error", err));
}, []);
  useEffect(() => {
  textareaRef.current?.focus();
}, []);
  useEffect(() => {
  scrollToKeepDistance();
}, [messages, isThinking]);
  // </editor-fold>

  return (
      <div className={`home ${started ? "home-started" : ""}`} >

        {!started && (
            <div className="greeting" >
              <span class="greeting-icon" ></span >
              <span >{getGreeting()}, {userName}</span >
            </div >
        )}

        {started && (
            <div className="message-list"

            >
              {messages.map((msg, i) =>
                  msg.role === "user" ? (
                      <div className="message-bubble" key={i} >{msg.text}</div >
                  ) : (
                      <TypewriterText
    text={msg.text}
    key={i}
    onChunkVisible={scrollToKeepDistance}
    isLatest={i === messages.length - 1}
/>
                  )
              )}

              {isThinking && thinkingSvg && (
                  <div className="thinking-wrapper" >
                    <div
                        className="thinking-icon"
                        dangerouslySetInnerHTML={{__html: thinkingSvg}}
                    />
                    <span className="thinking-text" >{t("home.Thinking")} </span >
                  </div >
              )}
            </div >
        )}

        <div className="input-footer" >
          <div className="input-card" >
        <textarea
            ref={textareaRef}
            rows={1}
            className={`input-textarea ${started ? "input-textarea-compact" : ""}`}
            placeholder={started ? t("home.Write a message…") : t("home.How can I help you today?")}
            value={text}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
        />
            <div className="input-toolbar" >
              <div className="model-select" >
                <span className="model-name" >{model}</span >
                <span className="effort-label" >{effort}</span >
                <span className="chevron" > </span >
              </div >

              <div
                  className={`input-send ${text.trim() ? "" : "input-send-disabled"}`}
                  onClick={handleSend}
              >
                <span className="input-send-icon" ></span >
              </div >

            </div >
          </div >
          <p class="input-footer-disclaimer">{t("home.FakeClaude can make mistakes. But makes far fewer mistakes than humans.")}</p>
</div>

        </div >
        );
        }