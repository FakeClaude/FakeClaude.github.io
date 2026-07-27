// prerender-langs.js
// 用法: node prerender-langs.js
// 作用: 构建完成后，为每种语言在 docs/<lang>/ 下生成一份静态 index.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../docs");
const srcIndexPath = path.join(distDir, "index.html");

// 语言元数据表：key 为 URL 路径段 (docs/<lang>/index.html)
const LANGS = {
  en: {
    htmlLang: "en",
    title: "FakeClaude - The Dumbest AI",
    description: "Breaking the record for the stupidest AI in history",
    h1: "FakeClaude",
    p: "Breaking the record for the stupidest AI in history",
  },
  zh: {
    htmlLang: "zh",
    title: "FakeClaude - 山寨克劳德",
    description: "成为人类历史上最愚蠢的人工智能",
    h1: "FakeClaude",
    p: "山寨克劳德 - 成为人类历史上最愚蠢的人工智能",
  },
  fr: {
    htmlLang: "fr",
    title: "FakeClaude - L'IA la Plus Stupide",
    description: "Battre le record de l'IA la plus stupide de l'histoire",
    h1: "FakeClaude",
    p: "Battre le record de l'IA la plus stupide de l'histoire",
  },
  de: {
    htmlLang: "de",
    title: "FakeClaude - Die Dümmste KI",
    description: "Den Rekord für die dümmste KI der Geschichte brechen",
    h1: "FakeClaude",
    p: "Den Rekord für die dümmste KI der Geschichte brechen",
  },
  es: {
    htmlLang: "es",
    title: "FakeClaude - La IA Más Tonta",
    description: "Batiendo el récord de la IA más tonta de la historia",
    h1: "FakeClaude",
    p: "Batiendo el récord de la IA más tonta de la historia",
  },
  ja: {
    htmlLang: "ja",
    title: "FakeClaude - 史上最も愚かなAI",
    description: "史上最も愚かなAIの記録に挑戦",
    h1: "FakeClaude",
    p: "史上最も愚かなAIの記録に挑戦",
  },
  ko: {
    htmlLang: "ko",
    title: "FakeClaude - 역사상 가장 멍청한 AI",
    description: "역사상 가장 멍청한 AI 기록에 도전",
    h1: "FakeClaude",
    p: "역사상 가장 멍청한 AI 기록에 도전",
  },
  pt: {
    htmlLang: "pt",
    title: "FakeClaude - A IA Mais Burra",
    description: "Quebrando o recorde da IA mais burra da história",
    h1: "FakeClaude",
    p: "Quebrando o recorde da IA mais burra da história",
  },
  ru: {
    htmlLang: "ru",
    title: "FakeClaude - Самый Глупый ИИ",
    description: "Побивая рекорд самого глупого ИИ в истории",
    h1: "FakeClaude",
    p: "Побивая рекорд самого глупого ИИ в истории",
  },
  ar: {
    htmlLang: "ar",
    title: "FakeClaude - أغبى ذكاء اصطناعي",
    description: "تحطيم الرقم القياسي لأغبى ذكاء اصطناعي في التاريخ",
    h1: "FakeClaude",
    p: "تحطيم الرقم القياسي لأغبى ذكاء اصطناعي في التاريخ",
  },
  hi: {
    htmlLang: "hi",
    title: "FakeClaude - सबसे मूर्ख AI",
    description: "इतिहास में सबसे मूर्ख AI का रिकॉर्ड तोड़ना",
    h1: "FakeClaude",
    p: "इतिहास में सबसे मूर्ख AI का रिकॉर्ड तोड़ना",
  },
};

const SITE_URL = "https://fakeclaude.pages.dev";

/**
 * 把原始 docs/index.html 转换为指定语言版本
 */
function transformHtml(html, langCode, meta) {
  let out = html;

  // 1. <html lang="en"> -> <html lang="de">
  out = out.replace(/<html\s+lang="[^"]*"/, `<html lang="${meta.htmlLang}"`);

  // 2. <title>...</title>
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);

  // 3. 主 meta description (第一条，没有 lang 属性的那条)
  out = out.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${meta.description}" />`
  );

  // 4. og:title / og:description / og:url
  out = out.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${meta.title}" />`);
  out = out.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${meta.description}" />`);
  out = out.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${SITE_URL}/${langCode}" />`);

  // 5. canonical
  out = out.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${SITE_URL}/${langCode}" />`);

  // 6. 占位内容 #holder 里的 h1 / p（构建产物里是压缩过的 HTML，用非贪婪匹配定位到 #holder 区块内）
  out = out.replace(
    /(<div id="holder"[\s\S]*?<h1>)[^<]*(<\/h1>)/,
    `$1${meta.h1}$2`
  );
  out = out.replace(
    /(<div id="holder"[\s\S]*?<p>)[^<]*(<\/p>)/,
    `$1${meta.p}$2`
  );

  return out;
}

function main() {

  if (!fs.existsSync(srcIndexPath)) {
    console.error("[prerender-langs] 找不到 docs/index.html，请先执行 `npm run build`");
    process.exit(1);
  }

  const html = fs.readFileSync(srcIndexPath, "utf-8");


  const langCodes = Object.keys(LANGS);
  let successCount = 0;

  for (const langCode of langCodes) {
    const meta = LANGS[langCode];
    const outHtml = transformHtml(html, langCode, meta);

    const outDir = path.join(distDir, langCode);
    const outPath = path.join(outDir, "index.html");

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, outHtml, "utf-8");


    successCount++;
  }

  console.log(`\n[prerender-langs] 生成 ${successCount} 个语言页面`);
}

main();