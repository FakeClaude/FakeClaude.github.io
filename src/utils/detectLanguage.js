// utils/detectLanguage.js
// 检测一段输入文本属于哪种语言。
// 支持: en, zh, fr, de, es, ja, ko, pt, ru, ar, hi
//
// 三层判断策略,从高到低降级:
//   Tier 1: 浏览器原生 Language Detector API(目前仅 Chrome 实验性支持)
//   Tier 2: Unicode 字符区间判断(命中专属文字系统的语言,如 zh/ja/ko/ru/ar/hi)
//   Tier 3: 拉丁字母语系特征词 + 变音符号打分(区分 en/fr/de/es/pt)
//
// 返回格式: { lang: "zh" | "en" | ... | "unknown", source: "native" | "unicode" | "latin-heuristic" | "none" }

const SUPPORTED_LANGS = ["en", "zh", "fr", "de", "es", "ja", "ko", "pt", "ru", "ar", "hi"];

// ---------------------------------------------------------------------------
// 预处理: 去掉数字、标点、emoji、URL、空白,只保留用于判断的"有效字符"
// ---------------------------------------------------------------------------
function cleanText(raw) {
  if (!raw) return "";
  return raw
    .replace(/https?:\/\/\S+/g, " ")               // URL
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ") // emoji / 符号区
    .replace(/[0-9]/g, " ")                          // 数字
    .trim();
}

// 有效字符长度太短时,直接判 unknown,不浪费判断成本
const MIN_EFFECTIVE_LENGTH = 3;

// ---------------------------------------------------------------------------
// Tier 1: 浏览器原生 Language Detector API
// ---------------------------------------------------------------------------
async function detectByNativeAPI(text) {
  if (!("LanguageDetector" in self)) return null;

  try {
    // 部分实现需要先 create() 一个 detector 实例
    const detector =
      typeof self.LanguageDetector.create === "function"
        ? await self.LanguageDetector.create()
        : new self.LanguageDetector();

    const detectPromise = detector.detect(text);
    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 300));

    const results = await Promise.race([detectPromise, timeoutPromise]);
    if (!results || results.length === 0) return null;

    const top = results[0]; // 一般按置信度降序排列
    const lang = normalizeLangCode(top.detectedLanguage);
    const confidence = top.confidence ?? 0;

    if (lang && SUPPORTED_LANGS.includes(lang) && confidence >= 0.6) {
      return lang;
    }
    return null;
  } catch (err) {
    // API 存在但调用失败(模型未下载/权限问题等),静默降级
    return null;
  }
}

// 有些实现返回的是 "zh-Hans" / "pt-BR" 这种带地区/文字系统后缀的代码,统一裁成主语言码
function normalizeLangCode(code) {
  if (!code) return null;
  return code.split("-")[0].toLowerCase();
}

// ---------------------------------------------------------------------------
// Tier 2: Unicode 字符区间判断
// 顺序很重要: 假名/谚文/西里尔/阿拉伯/天城文这些"独有"区间要先判断,
// 最后才判断 CJK 汉字区间——否则日文(汉字+假名混排)会被误判成中文。
// ---------------------------------------------------------------------------
const UNICODE_RANGES = [
  { lang: "ja", regex: /[\u3040-\u309f\u30a0-\u30ff]/g }, // 平假名 + 片假名
  { lang: "ko", regex: /[\uac00-\ud7af]/g },               // 谚文音节
  { lang: "ru", regex: /[\u0400-\u04ff]/g },               // 西里尔字母
  { lang: "ar", regex: /[\u0600-\u06ff]/g },               // 阿拉伯字母
  { lang: "hi", regex: /[\u0900-\u097f]/g },               // 天城文
  { lang: "zh", regex: /[\u4e00-\u9fff]/g },               // CJK 统一表意文字(汉字)
];

const UNICODE_HIT_RATIO_THRESHOLD = 0.3; // 命中字符占有效字符比例达到这个值才判定

function detectByUnicodeRange(text) {
  const effectiveLength = text.replace(/\s/g, "").length;
  if (effectiveLength === 0) return null;

  for (const { lang, regex } of UNICODE_RANGES) {
    const matches = text.match(regex);
    const hitCount = matches ? matches.length : 0;
    if (hitCount / effectiveLength >= UNICODE_HIT_RATIO_THRESHOLD) {
      return lang;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tier 3: 拉丁字母语系打分(en / fr / de / es / pt)
// ---------------------------------------------------------------------------

// 变音符号 / 特有字母组合(强信号,命中一次给较高权重)
const DIACRITIC_PATTERNS = {
  de: [/ß/, /ä/, /ö/, /ü/],
  fr: [/ç/, /à/, /â/, /ê/, /î/, /ô/, /û/, /œ/, /è/, /ë/],
  es: [/ñ/, /¿/, /¡/],
  pt: [/ã/, /õ/, /ç/, /â/, /ê/],
  en: [], // 英语没有特有变音符号,靠停用词判断
};

// 高频功能词(弱信号,按命中比例累加分数)
const STOPWORDS = {
  en: ["the", "and", "is", "of", "to", "in", "it", "you", "that", "for", "on", "with", "as", "are", "this", "be", "have", "not", "but", "was"],
  fr: ["le", "la", "les", "de", "et", "un", "une", "des", "est", "que", "qui", "dans", "pour", "pas", "avec", "il", "elle", "ce", "vous", "je"],
  de: ["der", "die", "das", "und", "ist", "nicht", "ein", "eine", "zu", "den", "mit", "sich", "auf", "für", "auch", "wie", "im", "sie", "des", "war"],
  es: ["el", "la", "los", "las", "de", "que", "y", "en", "es", "un", "una", "por", "con", "no", "para", "su", "se", "del", "al", "lo"],
  pt: ["o", "a", "os", "as", "de", "que", "e", "em", "é", "um", "uma", "para", "com", "não", "se", "do", "da", "no", "na", "por"],
};

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"'()«»—–]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function detectByLatinHeuristic(text) {
  const lowerText = text.toLowerCase();
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const scores = { en: 0, fr: 0, de: 0, es: 0, pt: 0 };

  // 强信号: 变音符号命中
  for (const lang of Object.keys(DIACRITIC_PATTERNS)) {
    for (const pattern of DIACRITIC_PATTERNS[lang]) {
      if (pattern.test(lowerText)) {
        scores[lang] += 5;
      }
    }
  }

  // 弱信号: 停用词命中比例
  for (const lang of Object.keys(STOPWORDS)) {
    const wordSet = new Set(STOPWORDS[lang]);
    const hitCount = tokens.filter((t) => wordSet.has(t)).length;
    scores[lang] += (hitCount / tokens.length) * 10;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topLang, topScore] = sorted[0];

  const MIN_SCORE_THRESHOLD = 1.5; // 分数太低说明区分度不够,不硬猜
  if (topScore >= MIN_SCORE_THRESHOLD) {
    return topLang;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

/**
 * 检测输入文本的语言
 * @param {string} rawText 原始输入文本
 * @returns {Promise<{ lang: string, source: string }>}
 */
export async function detectLanguage(rawText) {
  const text = cleanText(rawText);
  const effectiveLength = text.replace(/\s/g, "").length;

  if (effectiveLength < MIN_EFFECTIVE_LENGTH) {
    return { lang: "unknown", source: "none" };
  }

  // Tier 1: 浏览器原生 API
  const nativeResult = await detectByNativeAPI(text);
  if (nativeResult) {
    return { lang: nativeResult, source: "native" };
  }

  // Tier 2: Unicode 区间判断
  const unicodeResult = detectByUnicodeRange(text);
  if (unicodeResult) {
    return { lang: unicodeResult, source: "unicode" };
  }

  // Tier 3: 拉丁语系特征词打分
  const latinResult = detectByLatinHeuristic(text);
  if (latinResult) {
    return { lang: latinResult, source: "latin-heuristic" };
  }

  // 都没命中,交给调用方 fallback 到默认语言
  return { lang: "unknown", source: "none" };
}

export { SUPPORTED_LANGS };