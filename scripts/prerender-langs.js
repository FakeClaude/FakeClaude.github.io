// prerender-langs.js
// 用法: node prerender-langs.js
// 作用: 构建完成后，为每种语言在 dist/<lang>/ 下生成一份静态 index.html

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const srcIndexPath = path.join(distDir, "index.html");

// 语言元数据表：key 为 URL 路径段 (dist/<lang>/index.html)
const LANGS = {
  zh: {
    htmlLang: "zh",
    title: "PossMap - 概率走势图",
    description: "贝叶斯式推演-概率走势图：追踪黑天鹅事件，溯源因果链条。",
    h1: "PossMap - 概率走势图",
    p: "贝叶斯式推演：追踪黑天鹅事件，溯源因果链条。",
  },
  fr: {
    htmlLang: "fr",
    title: "PossMap - Graphique de Tendance des Probabilités",
    description: "Inférence bayésienne - Graphique de tendance des probabilités : suivez les événements cygnes noirs, remontez les chaînes causales.",
    h1: "PossMap - Graphique de Tendance des Probabilités",
    p: "Inférence bayésienne : suivez les événements cygnes noirs, remontez les chaînes causales.",
  },
  de: {
    htmlLang: "de",
    title: "PossMap - Wahrscheinlichkeitstrend-Diagramm",
    description: "Bayesianische Inferenz - Wahrscheinlichkeitstrend-Diagramm: Black-Swan-Ereignisse verfolgen, Kausalketten zurückverfolgen.",
    h1: "PossMap - Wahrscheinlichkeitstrend-Diagramm",
    p: "Bayesianische Inferenz: Black-Swan-Ereignisse verfolgen, Kausalketten zurückverfolgen.",
  },
  es: {
    htmlLang: "es",
    title: "PossMap - Gráfico de Tendencias de Probabilidad",
    description: "Inferencia bayesiana - Gráfico de tendencias de probabilidad: rastree eventos de cisne negro, rastree cadenas causales.",
    h1: "PossMap - Gráfico de Tendencias de Probabilidad",
    p: "Inferencia bayesiana: rastree eventos de cisne negro, rastree cadenas causales.",
  },
  ja: {
    htmlLang: "ja",
    title: "PossMap - 確率トレンドチャート",
    description: "ベイズ的推論 - 確率トレンドチャート：ブラックスワン事象を追跡し、因果の連鎖を遡る。",
    h1: "PossMap - 確率トレンドチャート",
    p: "ベイズ的推論：ブラックスワン事象を追跡し、因果の連鎖を遡る。",
  },
  ko: {
    htmlLang: "ko",
    title: "PossMap - 확률 트렌드 차트",
    description: "베이지안 추론 - 확률 트렌드 차트: 블랙 스완 이벤트 추적, 인과 관계의 사슬 규명.",
    h1: "PossMap - 확률 트렌드 차트",
    p: "베이지안 추론: 블랙 스완 이벤트 추적, 인과 관계의 사슬 규명.",
  },
  pt: {
    htmlLang: "pt",
    title: "PossMap - Gráfico de Tendências de Probabilidade",
    description: "Inferência bayesiana - Gráfico de tendências de probabilidade: rastreie eventos de cisne negro, rastreie cadeias causais.",
    h1: "PossMap - Gráfico de Tendências de Probabilidade",
    p: "Inferência bayesiana: rastreie eventos de cisne negro, rastreie cadeias causais.",
  },
  ru: {
    htmlLang: "ru",
    title: "PossMap - График Трендов Вероятностей",
    description: "Байесовский вывод - График трендов вероятностей: отслеживание событий «черный лебедь» и причинно-следственных цепочек.",
    h1: "PossMap - График Трендов Вероятностей",
    p: "Байесовский вывод: отслеживание событий «черный лебедь» и причинно-следственных цепочек.",
  },
  ar: {
    htmlLang: "ar",
    title: "PossMap - مخطط اتجاه الاحتمالات",
    description: "الاستدلال البايزي - مخطط اتجاه الاحتمالات: تتبع أحداث البجعة السوداء، وتتبع السلاسل السببية.",
    h1: "PossMap - مخطط اتجاه الاحتمالات",
    p: "الاستدلال البايزي: تتبع أحداث البجعة السوداء، وتتبع السلاسل السببية.",
  },
  hi: {
    htmlLang: "hi",
    title: "PossMap - संभाव्यता रुझान चार्ट",
    description: "बेयेसियन अनुमान - संभाव्यता रुझान चार्ट: ब्लैक स्वान घटनाओं को ट्रैक करें, कारण श्रृंखलाओं का पता लगाएं।",
    h1: "PossMap - संभाव्यता रुझान चार्ट",
    p: "बेयेसियन अनुमान: ब्लैक स्वान घटनाओं को ट्रैक करें, कारण श्रृंखलाओं का पता लगाएं।",
  },
};

const SITE_URL = "https://possmap.web.app";

/**
 * 把原始 dist/index.html 转换为指定语言版本
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
    console.error("[prerender-langs] 找不到 dist/index.html，请先执行 `npm run build`");
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