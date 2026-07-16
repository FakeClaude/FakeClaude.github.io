// home.jsx
import { h } from "preact";
import { useState, useRef, useEffect } from "preact/hooks";
import "./main.css";

export default function Home() {
  const thinkingStartTime = useRef(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingSvg, setThinkingSvg] = useState(null);
  const [userName] = useState("Idiot");
  const [model] = useState("Fable 5");
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
  function handleSend() {
  if (!text.trim()) return;
  setMessages([...messages, text]);
  setStarted(true);
  setText("");
  const el = textareaRef.current;
  el.style.height = "24px";

  setIsThinking(true);
  thinkingStartTime.current = Date.now();
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