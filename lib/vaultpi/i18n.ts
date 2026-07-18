// ═══════════════════════════════════════════════════════════════════
// VaultPi — اللغات المدعومة (عبر Google Translate: كل لغات العالم تقريباً)
// ═══════════════════════════════════════════════════════════════════

export interface Lang {
  label: string;
  code: string;
  rtl?: boolean;
}

export const LANGUAGES: Lang[] = [
  { label: "English", code: "en" },
  { label: "العربية", code: "ar", rtl: true },
  { label: "Español", code: "es" },
  { label: "Français", code: "fr" },
  { label: "Deutsch", code: "de" },
  { label: "Português", code: "pt" },
  { label: "Italiano", code: "it" },
  { label: "Nederlands", code: "nl" },
  { label: "Русский", code: "ru" },
  { label: "Türkçe", code: "tr" },
  { label: "فارسی", code: "fa", rtl: true },
  { label: "اردو", code: "ur", rtl: true },
  { label: "हिन्दी", code: "hi" },
  { label: "বাংলা", code: "bn" },
  { label: "中文 (简体)", code: "zh-CN" },
  { label: "中文 (繁體)", code: "zh-TW" },
  { label: "日本語", code: "ja" },
  { label: "한국어", code: "ko" },
  { label: "Bahasa Indonesia", code: "id" },
  { label: "Bahasa Melayu", code: "ms" },
  { label: "Tiếng Việt", code: "vi" },
  { label: "ไทย", code: "th" },
  { label: "Filipino", code: "tl" },
  { label: "Kiswahili", code: "sw" },
  { label: "Hausa", code: "ha" },
  { label: "Yorùbá", code: "yo" },
  { label: "Polski", code: "pl" },
  { label: "Українська", code: "uk" },
  { label: "Română", code: "ro" },
  { label: "Ελληνικά", code: "el" },
  { label: "עברית", code: "he", rtl: true },
  { label: "Türkmençe", code: "tk" },
  { label: "Kurdî", code: "ku" },
  { label: "Español (Latino)", code: "es" },
];

export function langByCode(code: string): Lang | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function isRtlCode(code: string): boolean {
  return !!LANGUAGES.find((l) => l.code === code)?.rtl;
}
