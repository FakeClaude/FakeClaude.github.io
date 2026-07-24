import { onRequestPost as __api_reply_js_onRequestPost } from "/Volumes/SSD/Other/other/Fakeclaude/functions/api/reply.js"

export const routes = [
    {
      routePath: "/api/reply",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_reply_js_onRequestPost],
    },
  ]