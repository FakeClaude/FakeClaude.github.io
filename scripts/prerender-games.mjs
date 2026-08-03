// prerender-games.mjs
// 用法: node prerender-games.mjs（在 prerender-langs.js 之后执行，见 package.json 的 postbuild）
// 作用: 自动扫描 src/utils/game/ 目录下的游戏组件，为每个游戏 × 每种语言
//       生成一份带有专属 <title>/<meta description> 的静态入口页：
//         英文（无前缀）  -> docs/game/<GameKey>/index.html
//         其他语言        -> docs/<lang>/game/<GameKey>/index.html
//       页面本身不做真正的服务端预渲染（内容还是同一个 SPA），只是换了 meta 信息，
//       并注入一段最先执行的脚本：如果地址没带 hash，就自动把 hash 设成
//       "#/game/<GameKey>"，这样不管是社交平台抓取预览，还是真人直接打开这个路径，
//       都能拿到正确的标题描述、并自动跳进对应的游戏。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../docs");
const gameSrcDir = path.resolve(__dirname, "../src/utils/game");

const SITE_URL = "https://fakeclaude.pages.dev";

// 支持的语言列表，跟 prerender-langs.js 保持一致；"en" 是默认语言，不带路径前缀
const LANG_CODES = ["en", "zh", "fr", "de", "es", "ja", "ko", "pt", "ru", "ar", "hi"];

// ------------------------------
// 每个游戏 × 每种语言的标题/描述文案。
// 新增游戏时建议在这里补一份完整翻译；如果没来得及补，脚本会自动用兜底文案，
// 不会报错、也不会漏生成页面。
// ------------------------------
const GAME_META = {
  DinoJump: {
    en: { title: "New Dino Jump - Play the Free Online Game", description: "The rules aren't what you remember. Work out what's actually dangerous — before it's too late." },
    zh: { title: "新恐龙跳 - 免费在线游戏", description: "规则已经不是你熟悉的那套。摸索出真正危险的是什么，才能活下去。" },
    fr: { title: "Nouveau Dino Jump - Jouez Gratuitement en Ligne", description: "Les règles ne sont plus les mêmes. Découvrez ce qui est vraiment dangereux — avant qu'il ne soit trop tard." },
    de: { title: "Neues Dino Jump - Kostenlos Online Spielen", description: "Die Regeln sind nicht mehr dieselben. Finde heraus, was wirklich gefährlich ist — bevor es zu spät ist." },
    es: { title: "Nuevo Dino Jump - Juega Gratis Online", description: "Las reglas ya no son las mismas. Descubre qué es realmente peligroso — antes de que sea tarde." },
    ja: { title: "新ダイノジャンプ - 無料オンラインゲーム", description: "ルールはもう同じじゃない。何が本当に危険なのか見極めろ——手遅れになる前に。" },
    ko: { title: "새로운 다이노 점프 - 무료 온라인 게임", description: "규칙이 예전과 다릅니다. 진짜 위험한 게 뭔지 알아내세요 — 늦기 전에." },
    pt: { title: "Novo Dino Jump - Jogue Grátis Online", description: "As regras não são mais as mesmas. Descubra o que é realmente perigoso — antes que seja tarde." },
    ru: { title: "Новый Dino Jump - Играть Бесплатно Онлайн", description: "Правила уже не те. Разберитесь, что на самом деле опасно — пока не поздно." },
    ar: { title: "داينو جامب الجديد - العب مجانًا أونلاين", description: "القواعد لم تعد كما كانت. اكتشف ما هو خطير حقًا — قبل فوات الأوان." },
    hi: { title: "नया डायनो जंप - मुफ्त ऑनलाइन गेम खेलें", description: "नियम अब वैसे नहीं हैं। पता लगाएं कि असल में खतरनाक क्या है — देर होने से पहले।" },
  },
  Tetris: {
    en: { title: "New Tetris - Play the Free Online Game", description: "No line clears here. Figure out what actually scores — the real rule is hidden." },
    zh: { title: "新俄罗斯方块 - 免费在线游戏", description: "这里不消行。摸索出到底靠什么得分——真正的规则被藏起来了。" },
    fr: { title: "Nouveau Tetris - Jouez Gratuitement en Ligne", description: "Pas de lignes à effacer ici. Découvrez ce qui compte vraiment — la vraie règle est cachée." },
    de: { title: "Neues Tetris - Kostenlos Online Spielen", description: "Hier werden keine Reihen geräumt. Finde heraus, was wirklich zählt — die echte Regel ist versteckt." },
    es: { title: "Nuevo Tetris - Juega Gratis Online", description: "Aquí no se eliminan líneas. Descubre qué es lo que realmente puntúa — la regla real está oculta." },
    ja: { title: "新テトリス - 無料オンラインゲーム", description: "ここではラインは消えない。何で得点するのか見極めろ——本当のルールは隠されている。" },
    ko: { title: "새로운 테트리스 - 무료 온라인 게임", description: "여기선 줄이 지워지지 않습니다. 무엇이 점수가 되는지 알아내세요 — 진짜 규칙은 숨겨져 있습니다." },
    pt: { title: "Novo Tetris - Jogue Grátis Online", description: "Aqui não há eliminação de linhas. Descubra o que realmente pontua — a regra real está escondida." },
    ru: { title: "Новый Тетрис - Играть Бесплатно Онлайн", description: "Линии здесь не убираются. Разберитесь, что приносит очки — настоящее правило скрыто." },
    ar: { title: "تتريس الجديد - العب مجانًا أونلاين", description: "لا يتم مسح الصفوف هنا. اكتشف ما الذي يمنحك النقاط فعلاً — القاعدة الحقيقية مخفية." },
    hi: { title: "नया टेट्रिस - मुफ्त ऑनलाइन गेम खेलें", description: "यहाँ लाइनें साफ़ नहीं होतीं। पता लगाएं कि असल में अंक किससे मिलते हैं — असली नियम छिपा है।" },
  },
  SnakeOrbit: {
    en: { title: "New Snake - Play the Free Online Game", description: "Same snake, different rules. Figure out how you actually win — before you crash." },
    zh: { title: "新贪吃蛇 - 免费在线游戏", description: "还是那条蛇，规则却变了。摸索出获胜的关键，撞上去之前想明白。" },
    fr: { title: "Nouveau Snake - Jouez Gratuitement en Ligne", description: "Même serpent, règles différentes. Découvrez comment gagner vraiment — avant de vous écraser." },
    de: { title: "Neues Snake - Kostenlos Online Spielen", description: "Gleiche Schlange, andere Regeln. Finde heraus, wie man wirklich gewinnt — bevor du abstürzt." },
    es: { title: "Nuevo Snake - Juega Gratis Online", description: "Misma serpiente, reglas distintas. Descubre cómo ganar de verdad — antes de chocar." },
    ja: { title: "新スネーク - 無料オンラインゲーム", description: "同じヘビ、違うルール。本当の勝ち方を見極めろ——ぶつかる前に。" },
    ko: { title: "새로운 스네이크 - 무료 온라인 게임", description: "같은 뱀, 다른 규칙. 진짜 이기는 방법을 알아내세요 — 부딪히기 전에." },
    pt: { title: "Novo Snake - Jogue Grátis Online", description: "Mesma cobra, regras diferentes. Descubra como vencer de verdade — antes de bater." },
    ru: { title: "Новая Змейка - Играть Бесплатно Онлайн", description: "Та же змейка, другие правила. Разберитесь, как на самом деле победить — прежде чем врежетесь." },
    ar: { title: "الثعبان الجديد - العب مجانًا أونلاين", description: "نفس الثعبان، قواعد مختلفة. اكتشف كيف تفوز فعلاً — قبل أن تصطدم." },
    hi: { title: "नया स्नेक - मुफ्त ऑनलाइन गेम खेलें", description: "वही सांप, अलग नियम। पता लगाएं कि असल में कैसे जीतना है — टकराने से पहले।" },
  },
};

// 兜底文案：扫描到了新游戏、但 GAME_META 里还没补翻译时使用
// 同样体现"表面是经典玩法，规则其实被改写了"这个统一调性
function getFallbackMeta(gameKey, langCode) {
  return {
    title: `${gameKey}: The Rules Aren't What You Think`,
    description: `A classic on the surface — the real rules are hidden. Play and figure them out.`,
  };
}

function getMeta(gameKey, langCode) {
  return GAME_META[gameKey]?.[langCode] || getFallbackMeta(gameKey, langCode);
}

// 自动扫描 src/utils/game/ 目录下的 .jsx 文件，文件名（不含扩展名）即游戏 key，
// 后续新增游戏只要把组件放进这个目录，不用改这个脚本
function scanGameKeys() {
  if (!fs.existsSync(gameSrcDir)) {
    console.error(`[prerender-games] 找不到游戏目录: ${gameSrcDir}`);
    return [];
  }
  return fs
    .readdirSync(gameSrcDir)
    .filter((f) => f.endsWith(".jsx"))
    .map((f) => path.basename(f, ".jsx"));
}

// 把某个语言的基准 html（docs/index.html 或 docs/<lang>/index.html）
// 转换成某个游戏专属的静态入口页
function transformHtml(html, gameKey, langCode, meta) {
  let out = html;

  const langPrefix = langCode === "en" ? "" : `/${langCode}`;
  const pageUrl = `${SITE_URL}${langPrefix}/game/${gameKey}`;

  // 1. <title>
  out = out.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);

  // 2. 主 meta description（第一条，没有 lang 属性的那条）
  out = out.replace(
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${meta.description}" />`
  );

  // 3. og:title / og:description / og:url
  out = out.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${meta.title}" />`);
  out = out.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${meta.description}" />`);
  out = out.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${pageUrl}" />`);

  // 4. canonical
  out = out.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${pageUrl}" />`);

  // 5. 占位内容 #holder 里的 h1 / p，换成游戏标题/描述，避免首屏闪现网站首页的文案
  out = out.replace(
    /(<div id="holder"[\s\S]*?<h1>)[^<]*(<\/h1>)/,
    `$1${meta.title}$2`
  );
  out = out.replace(
    /(<div id="holder"[\s\S]*?<p>)[^<]*(<\/p>)/,
    `$1${meta.description}$2`
  );

  // 6. 注入自动跳转脚本：地址没带 hash 时，自动补成 "#/game/<GameKey>"，
  // 放在 <head> 最前面，确保比真正挂载 App 的模块脚本更早执行
  const redirectScript = `<script>if(!location.hash){location.hash="#/game/${gameKey}";}</script>`;
  out = out.replace(/<head>/, `<head>\n    ${redirectScript}`);

  return out;
}

// ------------------------------
// 更新 docs/sitemap.xml：把每个游戏 × 每种语言的地址加进去
// 用一对注释标记包裹自动生成的部分，每次都先删掉旧的这一段再插入新的，
// 保证重复执行 build 不会越加越多，也不会碰到手动维护的其余部分
// ------------------------------
const SITEMAP_START = "  <!-- GAME PAGES START (auto-generated by prerender-games.mjs, do not edit by hand) -->";
const SITEMAP_END = "  <!-- GAME PAGES END -->";

function buildSitemapBlock(gameKeys) {
  let block = `${SITEMAP_START}\n`;

  for (const gameKey of gameKeys) {
    // 英文（默认）地址：列出全部语言的 hreflang 备用地址，跟首页那条的写法一致
    block += `\n  <url>\n`;
    block += `    <loc>${SITE_URL}/game/${gameKey}</loc>\n`;
    block += `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/game/${gameKey}"/>\n`;
    block += `    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}/game/${gameKey}"/>\n`;
    for (const lang of LANG_CODES) {
      if (lang === "en") continue;
      block += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${SITE_URL}/${lang}/game/${gameKey}"/>\n`;
    }
    block += `    <changefreq>weekly</changefreq>\n`;
    block += `    <priority>0.8</priority>\n`;
    block += `  </url>\n`;

    // 其他语言地址：只列 x-default + 自身语言两条 hreflang，跟首页各语言条目的写法一致
    for (const lang of LANG_CODES) {
      if (lang === "en") continue;
      block += `\n  <url>\n`;
      block += `    <loc>${SITE_URL}/${lang}/game/${gameKey}</loc>\n`;
      block += `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/game/${gameKey}"/>\n`;
      block += `    <xhtml:link rel="alternate" hreflang="${lang}" href="${SITE_URL}/${lang}/game/${gameKey}"/>\n`;
      block += `    <changefreq>weekly</changefreq>\n`;
      block += `    <priority>0.7</priority>\n`;
      block += `  </url>\n`;
    }
  }

  block += `${SITEMAP_END}\n`;
  return block;
}

function updateSitemap(gameKeys) {
  const sitemapPath = path.join(distDir, "sitemap.xml");
  if (!fs.existsSync(sitemapPath)) {
    console.error(`[prerender-games] 找不到 ${sitemapPath}，跳过 sitemap 更新`);
    return;
  }

  let content = fs.readFileSync(sitemapPath, "utf-8");

  // 先删掉上一次生成的自动区块（如果有），避免重复累加
  const markerRegex = new RegExp(
    `[ \\t]*${SITEMAP_START.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${SITEMAP_END.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n?`,
    "g"
  );
  content = content.replace(markerRegex, "");

  const block = buildSitemapBlock(gameKeys);
  content = content.replace("</urlset>", `${block}\n</urlset>`);

  fs.writeFileSync(sitemapPath, content, "utf-8");
  console.log(`[prerender-games] 已更新 sitemap.xml（${gameKeys.length} 个游戏 × ${LANG_CODES.length} 种语言）`);
}

function main() {
  const gameKeys = scanGameKeys();
  if (gameKeys.length === 0) {
    console.error("[prerender-games] 没有扫描到任何游戏，跳过生成");
    return;
  }

  let successCount = 0;

  for (const langCode of LANG_CODES) {
    // 英文用根目录的 docs/index.html；其他语言用 prerender-langs.js 已生成的 docs/<lang>/index.html
    const srcIndexPath =
      langCode === "en"
        ? path.join(distDir, "index.html")
        : path.join(distDir, langCode, "index.html");

    if (!fs.existsSync(srcIndexPath)) {
      console.error(`[prerender-games] 找不到 ${srcIndexPath}，请先执行 build 和 prerender-langs`);
      continue;
    }

    const baseHtml = fs.readFileSync(srcIndexPath, "utf-8");

    for (const gameKey of gameKeys) {
      const meta = getMeta(gameKey, langCode);
      const outHtml = transformHtml(baseHtml, gameKey, langCode, meta);

      // 英文 -> docs/game/<GameKey>/index.html
      // 其他语言 -> docs/<lang>/game/<GameKey>/index.html
      const outDir =
        langCode === "en"
          ? path.join(distDir, "game", gameKey)
          : path.join(distDir, langCode, "game", gameKey);
      const outPath = path.join(outDir, "index.html");

      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outPath, outHtml, "utf-8");

      successCount++;
    }
  }

  console.log(`[prerender-games] 生成 ${successCount} 个游戏页面`);

  updateSitemap(gameKeys);
}

main();
