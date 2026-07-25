import { onRequestGet as __api_generate_anchors_js_onRequestGet } from "/Volumes/SSD/Other/other/Fakeclaude/functions/api/generate-anchors.js"
import { onRequestPost as __api_reply_js_onRequestPost } from "/Volumes/SSD/Other/other/Fakeclaude/functions/api/reply.js"

export const routes = [
    {
      routePath: "/api/generate-anchors",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_generate_anchors_js_onRequestGet],
    },
  {
      routePath: "/api/reply",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_reply_js_onRequestPost],
    },
  ]