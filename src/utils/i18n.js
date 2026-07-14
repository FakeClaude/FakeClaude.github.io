// utils/i18n.js
// en,zh,fr,de,es,ja,ko,pt,ru,ar,hi
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const supported = ["en", "zh", "fr", "de", "es", "ja", "ko", "pt", "ru", "ar", "hi"];

function detectLanguage() {
  const pathSeg = location.pathname.split("/").filter(Boolean)[0];
  if (supported.includes(pathSeg)) {
    localStorage.setItem("language", pathSeg);
    return pathSeg;
  }
  const saved = localStorage.getItem("language");
  if (saved && supported.includes(saved)) return saved;

  const browserLang = (navigator.languages?.[0] || navigator.language || "en").toLowerCase();
  const matched = supported.find(lang => browserLang.startsWith(lang));
  const lang = matched || "en";
  localStorage.setItem("language", lang);
  return lang;
}

async function loadLocalJson(lang) {
  try {
    const mod = await import(`../locales/${lang}.json`);
    return mod.default;
  } catch (e) {
    console.error(`Failed to load ${lang}.json`, e);
    return null;
  }
}

export async function ensureLanguageLoaded(lang) {
  if (i18n.hasResourceBundle(lang, "translation")) return;
  const data = await loadLocalJson(lang);
  if (data) {
    i18n.addResourceBundle(lang, "translation", data, true, true);
  }
}

const initialLang = detectLanguage();

if (initialLang !== "en" && location.pathname === "/") {
  location.replace("/" + initialLang);
}

export const i18nPromise = (async () => {
  const data = await loadLocalJson(initialLang);
  return i18n
  .use(initReactI18next)
  .init({
    resources: data ? { [initialLang]: { translation: data } } : {},
    lng: initialLang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    parseMissingKeyHandler: (key) => key.split(".").pop(),
  });
})();

export default i18n;