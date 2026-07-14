// vite.config.js
import { defineConfig, loadEnv } from "vite";
import preact from "@preact/preset-vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  return {
    plugins: [preact()],
    base: env.VITE_BASE_URL,
    build: {
      outDir: "docs",
      target: 'esnext',
      minify: 'terser', // 核心：使用 Terser 进行深度混淆
      terserOptions: {
        compress: {
          drop_console: false, // true移除/false保留 console
          drop_debugger: true, // 移除 debugger
        },
        mangle: true, // 核心：变量名混淆
        format: {
          comments: false, // 核心：删除所有 JS 注释
        },
      },
      cssMinify: true, // 核心：压缩 CSS 并删除注释
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, "index.html")
        }
      }
    },
    esbuild: {
      legalComments: 'none', // 彻底移除 esbuild 法律注释
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
    },
  };
});