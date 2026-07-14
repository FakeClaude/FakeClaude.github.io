/**
 * PossMap - Programmatic SEO Generator
 * -------------------------------------
 * Reads all "events" documents from Firestore, detects the language of
 * each event's title, and renders a static SEO-friendly HTML page into:
 *
 *   dist/event/{slug}-{id}/index.html          (English, default, no prefix)
 *   dist/{lang}/event/{slug}-{id}/index.html    (zh, fr, de, es, ja, ko, pt, ru, ar, hi)
 *
 * Only the "title" field (plus baseProbability/follow for meta description)
 * is used to build the page — trigger data is not rendered.
 *
 * Usage (run vite build FIRST — this script reads dist/index.html for the
 * real hashed asset filenames):
 *   vite build
 *   node scripts/generate-seo.mjs
 *
 * Install dependencies first:
 *   npm install firebase-admin franc-min
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { franc } from "franc-min";
import { buildBayesianChain } from "../src/utils/propositions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT, "dist");
const SERVICE_ACCOUNT_PATH = path.join(__dirname, "serviceAccount.json");
const BUILT_INDEX_PATH = path.join(DIST_DIR, "index.html");

// ---------------------------------------------------------------------------
// IMPORTANT: run this script AFTER `vite build`, not before.
// Vite renames /src/main.jsx to a hashed production filename
// (e.g. /assets/main-DPR46mL4.js), and that hash changes on every build.
// Instead of hardcoding it, we read the just-built dist/index.html and pull
// out its real <script type="module"> entry tag and any <link rel="stylesheet">
// tags, then reuse those exact tags on every generated event page.
// ---------------------------------------------------------------------------
function loadBuiltAssetTags() {
  if (!fs.existsSync(BUILT_INDEX_PATH)) {
    throw new Error(
      `[generate-seo] ${BUILT_INDEX_PATH} not found. Run "vite build" BEFORE "node scripts/generate-seo.mjs".`
    );
  }
  const html = fs.readFileSync(BUILT_INDEX_PATH, "utf-8");

  const scriptMatches = html.match(/<script[^>]+type=["']module["'][^>]*><\/script>/g) || [];
  const styleMatches = html.match(/<link[^>]+rel=["']stylesheet["'][^>]*>/g) || [];
  const modulePreloadMatches = html.match(/<link[^>]+rel=["']modulepreload["'][^>]*>/g) || [];

  if (scriptMatches.length === 0) {
    console.warn(
      "[generate-seo] No <script type=\"module\"> entry tag found in dist/index.html — check Vite output format."
    );
  }

  // Force src/href to be root-absolute. Event pages live at nested paths
  // like /event/{slug}/ or /{lang}/event/{slug}/, so a relative path such as
  // "assets/main-xxx.js" or "./assets/main-xxx.js" (valid at the site root)
  // would resolve to the WRONG url (e.g. /event/{slug}/assets/main-xxx.js)
  // at that depth — a 404 that Firebase's SPA rewrite then serves as
  // index.html, which is exactly the "Expected a JavaScript-or-Wasm module
  // script but got text/html" error.
  function absolutize(tag) {
    return tag.replace(/(src|href)=["'](?!https?:\/\/|\/)([^"']+)["']/g, (m, attr, val) => {
      return `${attr}="/${val.replace(/^\.\//, "")}"`;
    });
  }

  const scripts = scriptMatches.map(absolutize);
  const styles = [...styleMatches, ...modulePreloadMatches].map(absolutize);

  // Pull out just the src="..." URLs from the entry script tag(s), so we can
  // inject <script type="module"> elements dynamically at runtime (AFTER our
  // IndexedDB cache-seeding finishes) instead of loading them statically.
  const entrySrcs = scripts
    .map((tag) => {
      const m = tag.match(/src=["']([^"']+)["']/);
      return m ? m[1] : null;
    })
    .filter(Boolean);

  return {
    styles: styles.join("\n  "),
    entrySrcs,
  };
}

// ---------------------------------------------------------------------------
// Supported languages: "en" is default (no URL prefix), others get /{lang}/
// ---------------------------------------------------------------------------
const SUPPORTED_LANGS = ["en", "zh", "fr", "de", "es", "ja", "ko", "pt", "ru", "ar", "hi"];

// franc returns ISO 639-3 codes; map them to our ISO 639-1 target set.
const FRANC_TO_LANG = {
  eng: "en",
  cmn: "zh",
  zho: "zh",
  fra: "fr",
  deu: "de",
  spa: "es",
  jpn: "ja",
  kor: "ko",
  por: "pt",
  rus: "ru",
  arb: "ar",
  ara: "ar",
  hin: "hi",
};

function detectLang(title) {
  if (!title || title.trim().length < 3) return "en";
  const code3 = franc(title, { minLength: 3 });
  const lang = FRANC_TO_LANG[code3];
  return SUPPORTED_LANGS.includes(lang) ? lang : "en";
}

// ---------------------------------------------------------------------------
// Slug helpers — slug is derived from title, id is appended to guarantee
// uniqueness (e.g. "czechia-defeats-south-korea-9nhgGFJ47NEvFKFn1p0C")
// ---------------------------------------------------------------------------
function slugify(text) {
  return text
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // drop non-latin chars (CJK/AR/etc fall away here)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function buildSlugId(event) {
  let base = slugify(event.title);
  if (!base) base = "event"; // fallback when title has no latin characters
  return `${base}-${event.id}`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// i18n — only one phrase is needed per language: the label that follows
// the probability number (e.g. "Current Probability" / "的概率").
// Fill in the ones you need; missing languages fall back to English.
// ---------------------------------------------------------------------------
const CURRENT_PROBABILITY_LABEL = {
  en: "Current Probability",
  zh: "的概率",
  fr: "Probabilité actuelle",
  de: "Aktuelle Wahrscheinlichkeit",
  es: "Probabilidad actual",
  ja: "現在の確率",
  ko: "현재 확률",
  pt: "Probabilidade atual",
  ru: "Текущая вероятность",
  ar: "الاحتمالية الحالية",
  hi: "वर्तमान संभावना",
};

function probabilityLabel(lang) {
  return CURRENT_PROBABILITY_LABEL[lang] || CURRENT_PROBABILITY_LABEL.en;
}

// ---------------------------------------------------------------------------
// Final probability — baseProbability + 所有 trendCache 触发的贝叶斯链式影响
// trendCache: [{ d: 0|1, p: pct*10, t: date }, ...]
//   d: 1 = up, 0 = down
//   p: pct*10，实际 pct = p / 10
//   t: 排序用的日期，需从旧到新排序后再计算
// ---------------------------------------------------------------------------
function getFinalProbability(event) {
  const base = event.baseProbability;
  const trendCache = event.trendCache;

  if (!Array.isArray(trendCache) || trendCache.length === 0) {
    return Math.trunc(base);
  }

  const orderedTriggers = [...trendCache]
    .sort((a, b) => a.t - b.t)
    .map((item) => ({
      dir: item.d === 1 ? "up" : "down",
      pct: item.p / 10,
    }));

  const { points } = buildBayesianChain(base, orderedTriggers);
  const finalP = points[points.length - 1];

  return Math.trunc(finalP);
}

// ---------------------------------------------------------------------------
// Firestore init
// ---------------------------------------------------------------------------
const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function fetchEvents() {
  const snapshot = await db.collection("propositions").get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Mirrors the client's fetchTriggers() in propositions.js: latest N triggers
// by "date" descending, shape { id, ...data() }.
async function fetchTriggers(propId, fetchLimit = 10) {
  const snap = await db
    .collection("propositions")
    .doc(propId)
    .collection("triggers")
    .orderBy("date", "desc")
    .limit(fetchLimit)
    .get();

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      date: toMillis(data.date), // Timestamp -> epoch ms, safe to JSON.stringify
    };
  });
}

// ---------------------------------------------------------------------------
// HTML template — title-only page
// ---------------------------------------------------------------------------
function toMillis(ts) {
  if (!ts) return null;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts._seconds === "number") return ts._seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return null;
}

function buildSeedProposition(event, triggers) {
  return {
    id: event.id,
    title: event.title,
    baseProbability: Number(event.baseProbability) || 0,
    follow: event.follow ?? 0,
    creatorId: event.creatorId ?? null,
    triggerCount: event.triggerCount ?? 0,
    trendCache: Array.isArray(event.trendCache) ? event.trendCache : [], // real array of {d,p,t}
    triggers: triggers ?? [], // latest 10, fetched at build time (see main())
    createdAt: toMillis(event.createdAt),
    updatedAt: toMillis(event.updatedAt),
    latestTriggerDate: toMillis(event.latestTriggerDate),
  };
}

function renderEventHTML(event, lang, assetTags, triggers) {
  const slugId = buildSlugId(event);
  const finalProbability = getFinalProbability(event);
  const canonicalPath = lang === "en" ? `/event/${slugId}/` : `/${lang}/event/${slugId}/`;
  const canonicalUrl = `https://possmap.web.app${canonicalPath}`;

  // e.g. "June 11, 2026 FIFA World Cup: Czechia Defeats South Korea Current Probability 58%"
  // or for zh: "2026年中国获得世界杯冠军的概率 1%"
  const description = `${event.title} ${probabilityLabel(lang)} ${finalProbability}%`;

  const alternates = SUPPORTED_LANGS.map((l) => {
    const href =
      l === "en"
        ? `https://possmap.web.app/event/${slugId}/`
        : `https://possmap.web.app/${l}/event/${slugId}/`;
    return `<link rel="alternate" hreflang="${l}" href="${href}" />`;
  }).join("\n  ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description,
    url: canonicalUrl,
  };

  return `<!DOCTYPE html>
<html lang="${lang}"${lang === "ar" ? ' dir="rtl"' : ""}>
<head>
  <meta charset="UTF-8" />
  <meta name="theme-color" content="#000" id="theme-color-meta" />
  <meta name="color-scheme" content="dark light" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(event.title)} | PossMap</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${alternates}
  <meta property="og:title" content="${escapeHtml(event.title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta name="twitter:card" content="summary" />
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>

  ${assetTags.styles}

  <style>
    * {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #holder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0 40px;
      height: 100vh;
      text-align: left;
      opacity: 0.5;
    }
    #holder section {
      max-width: 488px;
      width: 100%;
    }
    #holder p {
      font-size: 16px;
      line-height: 1.5;
    }
    #holder h1 {
      font-size: 18px;
      margin-bottom: 20px;
      font-weight: normal;
    }
  </style>
</head>
<body>
  <!--
    This is NOT a redirect page. It IS the app's entry point (same #app mount
    point and same main.jsx bundle as the real index.html), just with:
      1) event-specific SEO meta/JSON-LD above, and
      2) event-specific #holder content below instead of the generic tagline, and
      3) localStorage.expandCard pre-set so the app opens with this event's
         card already expanded, and
      4) the URL silently rewritten (history.replaceState, no reload) to a
         path the app's preact-router actually has a route for ("/" or
         "/{lang}") — the app has no route for "/event/{slug}", so without
         this step preact-router matches nothing and #app stays empty, and
      5) this event pre-seeded to the FRONT of the IndexedDB "home_best"
         cache that startLoadingPipeline() reads on mount — so this card
         renders immediately instead of waiting for the home page's normal
         follow-count-ordered load. Only once that seeding finishes do we
         inject the real main.jsx bundle (see below), guaranteeing order.
    Because the app mounts in place (no navigation), the generic holder from
    index.html never appears — only this event-specific one, until React
    replaces it with the live, expanded card.
  -->
  <script>
  (function () {
    var EVENT = ${JSON.stringify(buildSeedProposition(event, triggers))};
    var EXPAND_KEY = "home_best";
    var ENTRY_SRCS = ${JSON.stringify(assetTags.entrySrcs)};

    try {
      var stored = JSON.parse(localStorage.getItem("expandCard") || "{}");
      stored[EXPAND_KEY] = EVENT.id;
      localStorage.setItem("expandCard", JSON.stringify(stored));
    } catch (e) {
      // localStorage unavailable (private mode, disabled, etc.)
    }
    try {
      var routedPath = ${JSON.stringify(lang === "en" ? "/" : `/${lang}`)};
      history.replaceState(null, "", routedPath);
    } catch (e) {
      // history API unavailable
    }

    function loadEntryScripts() {
      ENTRY_SRCS.forEach(function (src) {
        var s = document.createElement("script");
        s.type = "module";
        s.crossOrigin = "";
        s.src = src;
        document.body.appendChild(s);
      });
    }

    // Same IndexedDB schema as src/utils/IndexedDB.js (DB_NAME/DB_VERSION/
    // store names below MUST stay in sync with that file).
    function seedCacheThenLoadApp() {
      if (!window.indexedDB) { loadEntryScripts(); return; }

      var req = indexedDB.open("AppDatabase", 1);

      req.onupgradeneeded = function (e) {
        var idb = e.target.result;
        if (!idb.objectStoreNames.contains("create")) {
          idb.createObjectStore("create", { keyPath: "key" });
        }
        if (!idb.objectStoreNames.contains("propositions")) {
          idb.createObjectStore("propositions", { keyPath: "key" });
        }
      };

      req.onsuccess = function (e) {
        var idb = e.target.result;
        var tx, store, getReq;
        try {
          tx = idb.transaction("propositions", "readwrite");
          store = tx.objectStore("propositions");
          getReq = store.get(EXPAND_KEY);
        } catch (e2) {
          loadEntryScripts();
          return;
        }

        getReq.onsuccess = function () {
          var existing = getReq.result ? getReq.result.value : [];
          if (!Array.isArray(existing)) existing = [];
          var withoutDupe = existing.filter(function (p) { return p.id !== EVENT.id; });
          var merged = [EVENT].concat(withoutDupe);

          var putReq = store.put({ key: EXPAND_KEY, value: merged });
          putReq.onsuccess = loadEntryScripts;
          putReq.onerror = loadEntryScripts;
        };
        getReq.onerror = loadEntryScripts;
      };

      req.onerror = loadEntryScripts;
    }

    seedCacheThenLoadApp();
  })();
  </script>

  <div id="app">
    <div id="holder">
      <section>
        <h1>${escapeHtml(event.title)}</h1>
        <p>${probabilityLabel(lang)} ${finalProbability}%</p>
      </section>
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Write file to disk
// ---------------------------------------------------------------------------
async function writeEventPage(event, lang, assetTags, triggers) {
  const slugId = buildSlugId(event);
  const dir =
    lang === "en"
      ? path.join(DIST_DIR, "event", slugId)
      : path.join(DIST_DIR, lang, "event", slugId);

  fs.mkdirSync(dir, { recursive: true });
  const html = renderEventHTML(event, lang, assetTags, triggers);
  fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Sitemap — public/sitemap.xml is the hand-maintained base (home page +
// language home pages). We append one <url> per generated event page and
// write the combined result to dist/sitemap.xml (this OVERWRITES the plain
// copy vite already put there during `vite build`).
// ---------------------------------------------------------------------------
const PUBLIC_SITEMAP_PATH = path.join(ROOT, "public", "sitemap.xml");
const DIST_SITEMAP_PATH = path.join(DIST_DIR, "sitemap.xml");

function toW3CDate(millis) {
  if (!millis) return null;
  return new Date(millis).toISOString().slice(0, 10); // YYYY-MM-DD
}

function buildEventSitemapEntry(event, lang, slugId) {
  const loc =
    lang === "en"
      ? `https://possmap.web.app/event/${slugId}/`
      : `https://possmap.web.app/${lang}/event/${slugId}/`;

  const lastmod = toW3CDate(toMillis(event.updatedAt) ?? toMillis(event.latestTriggerDate));

  return `  <url>
    <loc>${loc}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ""}    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`;
}

function writeSitemap(entries) {
  if (!fs.existsSync(PUBLIC_SITEMAP_PATH)) {
    console.warn(`[generate-seo] ${PUBLIC_SITEMAP_PATH} not found — skipping sitemap generation.`);
    return;
  }
  const base = fs.readFileSync(PUBLIC_SITEMAP_PATH, "utf-8");
  const combined = base.replace(
    /<\/urlset>\s*$/,
    `\n${entries.join("\n\n")}\n\n</urlset>\n`
  );
  fs.writeFileSync(DIST_SITEMAP_PATH, combined, "utf-8");
  console.log(`[generate-seo] sitemap.xml 已写入 ${entries.length} 个命题页面`);
}

async function main() {
  const assetTags = loadBuiltAssetTags();
  const events = await fetchEvents();
  const sitemapEntries = [];

  for (const event of events) {
    const lang = detectLang(event.title);
    const triggers = await fetchTriggers(event.id, 10);
    await writeEventPage(event, lang, assetTags, triggers);
    sitemapEntries.push(buildEventSitemapEntry(event, lang, buildSlugId(event)));
  }

  writeSitemap(sitemapEntries);

  console.log(`[generate-seo] 生成 ${events.length} 个事件页面`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
