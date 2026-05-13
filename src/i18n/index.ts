import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import mk from "./locales/mk.json";
import sq from "./locales/sq.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, mk: { translation: mk }, sq: { translation: sq } },
    fallbackLng: "en",
    supportedLngs: ["en", "mk", "sq"],
    detection: { order: ["localStorage", "navigator"], caches: ["localStorage"], lookupLocalStorage: "i18nextLng" },
    interpolation: { escapeValue: false },
  });

export default i18n;