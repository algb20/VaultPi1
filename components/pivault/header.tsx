"use client";

import { useEffect, useState } from "react";
import { Shield, Search, Eye, Sun, Moon, Languages, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { usePiAuth } from "@/contexts/pi-auth-context";
import { useLanguage } from "@/components/translation-provider";
import { LANGUAGES } from "@/lib/vaultpi/i18n";

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  onSearchClick?: () => void;
  onPrivacyClick?: () => void;
}

export function Header({ title, showSearch, onSearchClick, onPrivacyClick }: HeaderProps) {
  const { userData } = usePiAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [showLang, setShowLang] = useState(false);
  useEffect(() => setMounted(true), []);

  const username = userData?.username ?? "User";
  const isDark = theme !== "light";

  return (
    <header className="flex items-center justify-between px-4 pt-safe-top pb-3 pt-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-foreground leading-tight truncate">{title}</h1>
          {title === "PiVault" && (
            <p className="text-[10px] text-muted-foreground leading-tight truncate">Welcome, @{username}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Theme toggle — icon only, toggles each press */}
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center hover:border-primary/30 transition-colors"
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          {mounted && !isDark ? (
            <Moon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Language / translate */}
        <div className="relative">
          <button
            onClick={() => setShowLang((s) => !s)}
            className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center hover:border-primary/30 transition-colors"
            title="Language"
            aria-label="Language"
          >
            <Languages className="w-4 h-4 text-muted-foreground" />
          </button>
          {showLang && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowLang(false)} />
              <div className="absolute right-0 top-10 z-30 w-36 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      setLanguage(l.label);
                      setShowLang(false);
                    }}
                    className="w-full px-3 py-2.5 text-sm text-left hover:bg-secondary flex items-center justify-between text-foreground"
                  >
                    {l.label}
                    {language === l.label && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {showSearch && (
          <button
            onClick={onSearchClick}
            className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center hover:border-primary/30 transition-colors"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        {title === "PiVault" && (
          <button
            onClick={onPrivacyClick}
            className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center hover:border-primary/30 transition-colors"
            title="Privacy & Recovery"
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{username.charAt(0).toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}
