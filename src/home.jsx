// home.jsx
import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import "./main.css";

export default function Home() {
  const [aiReplies, setAiReplies] = useState([]);
  const thinkingStartTime = useRef(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingSvg, setThinkingSvg] = useState(null);
  const [userName] = useState("Idiot");
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
    if (hour < 12) return "Morning";
    if (hour < 18) return "Afternoon";
    return "Evening";
  }
  async function handleSend() {
  if (!text.trim()) return;
  setMessages([...messages, text]);
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
    setAiReplies((prev) => [...prev, data.text]);
  }, remain);
}
  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  }

  useEffect(() => {
    fetch("/loading_thinking.svg")
        .then((res) => res.text())
        .then((svgText) => setThinkingSvg(svgText))
        .catch((err) => console.error("加载动画失败:", err));
  }, []);
  useEffect(() => {
  textareaRef.current?.focus();
}, []);

  return (
     <div class={`home ${started ? "home-started" : ""}`}>

    {!started && (
      <div class="greeting">
        <span class="greeting-icon"></span>
        <span>{getGreeting()}, {userName}</span>
      </div>
    )}

       {started && (
           <div class="message-list" >
             {messages.map((msg, i) => (
                 <div class="message-bubble" key={i} >{msg}</div >
             ))}

             {isThinking && thinkingSvg && (
                 <div class="thinking-wrapper" >
                   <div
                       class="thinking-icon"
                       dangerouslySetInnerHTML={{__html: thinkingSvg}}
                   />
                   <span class="thinking-text" >Thinking </span >
                 </div >
             )}
               {!isThinking && aiReplies.map((reply, i) => (
      <div class="ai-reply" key={i}>{reply}</div>
    ))}

           </div >
       )}

      <div class="input-card">
        <textarea
            ref={textareaRef}
            rows={1}
            className={`input-textarea ${started ? "input-textarea-compact" : ""}`}
            placeholder="How can I help you today?"
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
  <span className="input-send-icon"></span>
</div>

        </div >
      </div >
    </div >
  );
}