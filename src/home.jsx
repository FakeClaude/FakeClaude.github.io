// home.jsx
import { h } from "preact";
import { useState, useRef } from "preact/hooks";
import "./main.css";

export default function Home() {
  const [userName] = useState("Idiot");
  const [model] = useState("Fable 5");
  const [effort] = useState("Max");
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

  function handleSend() {
  if (!text.trim()) return;  // 没内容不执行
  console.log("发送内容:", text);  // 这里以后换成真正的处理逻辑
  setText("");
  const el = textareaRef.current;
  el.style.height = "56px";  // 还原成初始高度
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
  <span className="input-send-icon"></span>
</div>

        </div >
      </div >
    </div >
  );
}