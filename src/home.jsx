// home.jsx
import { h } from "preact";
import { useState } from "preact/hooks";
import "./main.css";

export default function Home() {
  // 用户名,先写死,后面可以改成从设置里读取
  const [userName] = useState("Steven");

  // 当前选中的模型和效果等级,先写死,下一步做成可切换
  const [model] = useState("Sonnet 5");
  const [effort] = useState("Low");

  // 根据当前时间生成问候语(早上/下午/晚上好)
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
          class="input-textarea"
          placeholder="How can I help you today?"
        />
        <div class="input-toolbar">
          <div class="model-select">
            <span class="model-name">{model}</span>
            <span class="effort-label">{effort}</span>
            <span class="chevron">▾</span>
          </div>
        </div>
      </div>
    </div>
  );
}