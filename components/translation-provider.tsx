"use client";

// ═══════════════════════════════════════════════════════════════════
// LanguageProvider — محرّك ترجمة واجهة محلّي (DOM + MutationObserver).
// يترجم النصوص الثابتة للواجهة فقط عبر قاموس محلّي، ويضبط RTL للعربية.
// لا يرسل أي بيانات خارج المتصفح.
// ═══════════════════════════════════════════════════════════════════

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DICTS, labelToCode, isRtl } from "@/lib/vaultpi/i18n";

const STORAGE_KEY = "vaultpi.lang";

// ── محرّك الترجمة (على مستوى الوحدة) ────────────────────────────────
let observer: MutationObserver | null = null;
let activeDict: Record<string, string> | null = null;
const originals = new Map<Text, string>();
const originalPlaceholders = new Map<Element, string>();

function translateTextNode(node: Text, dict: Record<string, string>) {
  const raw = node.nodeValue ?? "";
  const key = raw.trim();
  if (!key) return;
  const tr = dict[key];
  if (tr && tr !== key) {
    if (!originals.has(node)) originals.set(node, raw);
    const next = raw.replace(key, tr);
    if (node.nodeValue !== next) node.nodeValue = next;
  }
}

function translateTree(root: Node, dict: Record<string, string>) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, dict);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const tag = n.parentElement?.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "TEXTAREA")
        return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const texts: Text[] = [];
  while (walker.nextNode()) texts.push(walker.currentNode as Text);
  texts.forEach((t) => translateTextNode(t, dict));

  (root as Element).querySelectorAll?.("[placeholder]").forEach((el) => {
    const key = (el.getAttribute("placeholder") || "").trim();
    if (dict[key]) {
      if (!originalPlaceholders.has(el)) originalPlaceholders.set(el, el.getAttribute("placeholder")!);
      el.setAttribute("placeholder", dict[key]);
    }
  });
}

function startTranslation(dict: Record<string, string>) {
  activeDict = dict;
  translateTree(document.body, dict);
  observer = new MutationObserver((muts) => {
    if (!activeDict) return;
    for (const m of muts) {
      if (m.type === "childList") {
        m.addedNodes.forEach((n) => translateTree(n, activeDict!));
      } else if (m.type === "characterData") {
        translateTextNode(m.target as Text, activeDict!);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function resetTranslation() {
  observer?.disconnect();
  observer = null;
  activeDict = null;
  originals.forEach((val, node) => {
    try {
      if (node.nodeValue !== val) node.nodeValue = val;
    } catch {
      /* node detached */
    }
  });
  originals.clear();
  originalPlaceholders.forEach((val, el) => {
    try {
      el.setAttribute("placeholder", val);
    } catch {
      /* detached */
    }
  });
  originalPlaceholders.clear();
}

// ── السياق (Context) ────────────────────────────────────────────────
interface LangCtx {
  language: string;
  setLanguage: (label: string) => void;
}
const Ctx = createContext<LangCtx | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>("English (US)");

  const applyEngine = useCallback((label: string) => {
    if (typeof document === "undefined") return;
    resetTranslation();
    const html = document.documentElement;
    const code = labelToCode(label);
    if (isRtl(label)) {
      html.setAttribute("dir", "rtl");
    } else {
      html.setAttribute("dir", "ltr");
    }
    html.setAttribute("lang", code);
    const dict = DICTS[code];
    if (dict && Object.keys(dict).length) startTranslation(dict);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || "English (US)";
    setLanguageState(saved);
    // نؤخّر قليلاً حتى تُرسم الواجهة الأولى
    const id = setTimeout(() => applyEngine(saved), 0);
    return () => clearTimeout(id);
  }, [applyEngine]);

  const setLanguage = useCallback(
    (label: string) => {
      setLanguageState(label);
      localStorage.setItem(STORAGE_KEY, label);
      applyEngine(label);
    },
    [applyEngine],
  );

  return <Ctx.Provider value={{ language, setLanguage }}>{children}</Ctx.Provider>;
}

export function useLanguage() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLanguage must be used within a LanguageProvider");
  return c;
}
