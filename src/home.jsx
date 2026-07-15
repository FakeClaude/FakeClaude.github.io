// home.jsx
import { h } from "preact";
import { useState, useRef } from "preact/hooks";
import "./main.css";

export default function Home() {
  const [userName] = useState("Steven");
  const [model] = useState("Sonnet 5");
  const [effort] = useState("Low");
  const [text, setText] = useState("");
  const textareaRef = useRef(null);

  function handleInput(e) {
    setText(e.target.value);
    const el = textareaRef.current;
    el.style.height = "auto";           // 先重置,避免只增不减
    el.style.height = el.scrollHeight + "px";  // 再按实际内容高度赋值
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  }

  return (
    <div class="home">
      <div class="greeting">
        <span class="greeting-icon"> </span>
        <span>{getGreeting()}, {userName}</span>
      </div>

      <div class="input-card">
        <textarea
            ref={textareaRef}
            class="input-textarea"
            placeholder="How can I help you today?"
            value={text}
            onInput={handleInput}
        />
        <div class="input-toolbar">
          <div class="model-select">
            <span class="model-name">{model}</span>
            <span class="effort-label">{effort}</span>
            <span class="chevron"> </span>
          </div>
        </div>
      </div>
    </div>
  );
}