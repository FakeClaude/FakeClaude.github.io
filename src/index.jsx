// index.jsx
import { h } from "preact";
import Home from "./home.jsx";

// 目前只有一个主页,所以不需要用到路由(preact-router)
// 以后如果要加"聊天记录页"之类的新页面,再回来加路由逻辑
export default function App() {
  return <Home />;
}