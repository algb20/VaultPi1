"use client";

// ═══════════════════════════════════════════════════════════════════
// LanguageProvider — ترجمة كامل الواجهة لأي لغة عالمية عبر Google Translate.
// يستخدم عنصر الترجمة المخفي + القائمة (.goog-te-combo) للتبديل الفوري،
// مع كوكي googtrans للاستمرارية، وضبط اتجاه RTL تلقائياً.
// ═══════════════════════════════════════════════════════════════════

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { isRtlCode } from "@/lib/vaultpi/i18n";

const STORAGE_KEY = "vaultpi.lang.code";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

function setGoogTransCookie(code: string) {
  const value = !code || code === "en" ? "" : `/en/${code}`;
  const write = (domain?: string) => {
    document.cookie =
      `googtrans=${value};path=/` + (domain ? `;domain=${domain}` : "");
  };
  try {
    write();
    const host = location.hostname;
    write(host);
    write("." + host);
  } catch {
    /* ignore */
  }
}

function applyViaCombo(code: string): boolean {
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo) return false;
  combo.value = code === "en" ? "" : code;
  combo.dispatchEvent(new Event("change"));
  return true;
}

function injectWidget() {
  if (document.getElementById("google-translate-script")) return;
  window.googleTranslateElementInit = () => {
    try {
      // eslint-disable-next-line new-cap
      new window.google.translate.TranslateElement(
        { pageLanguage: "en", autoDisplay: false },
        "google_translate_element",
      );
    } catch {
      /* ignore */
    }
  };
  const s = document.createElement("script");
  s.id = "google-translate-script";
  s.src =
    "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  s.async = true;
  document.body.appendChild(s);
}

interface LangCtx {
  code: string;
  setLanguageCode: (code: string) => void;
}
const Ctx = createContext<LangCtx | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || "en";
    setCode(saved);
    document.documentElement.dir = isRtlCode(saved) ? "rtl" : "ltr";
    injectWidget();
    if (saved !== "en") {
      setGoogTransCookie(saved);
      let tries = 0;
      const iv = setInterval(() => {
        if (applyViaCombo(saved) || ++tries > 60) clearInterval(iv);
      }, 250);
    }
  }, []);

  const setLanguageCode = useCallback((c: string) => {
    localStorage.setItem(STORAGE_KEY, c);
    setCode(c);
    document.documentElement.dir = isRtlCode(c) ? "rtl" : "ltr";
    setGoogTransCookie(c);
    if (!applyViaCombo(c)) {
      // القائمة لم تُحمّل بعد — أعد التحميل ليطبّق الكوكي
      location.reload();
    }
  }, []);

  return (
    <Ctx.Provider value={{ code, setLanguageCode }}>
      <div id="google_translate_element" aria-hidden="true" style={{ display: "none" }} />
      {children}
    </Ctx.Provider>
  );
}

export function useLanguage() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLanguage must be used within a LanguageProvider");
  return c;
}
