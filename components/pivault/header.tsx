"use client";

import { Bell, Shield, Search, Eye } from "lucide-react";
import { usePiAuth } from "@/contexts/pi-auth-context";

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  onSearchClick?: () => void;
  onPrivacyClick?: () => void;
}

export function Header({ title, showSearch, onSearchClick, onPrivacyClick }: HeaderProps) {
  const { userData } = usePiAuth();
  const username = userData?.username ?? "User";

  return (
    <header className="flex items-center justify-between px-4 pt-safe-top pb-3 pt-4 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-20">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="text-base font-bold text-foreground leading-tight">{title}</h1>
          {title === "PiVault" && (
            <p className="text-[10px] text-muted-foreground leading-tight">
              Welcome, @{username}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
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
        <button className="w-8 h-8 rounded-xl bg-card border border-border flex items-center justify-center relative hover:border-primary/30 transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">
            {username.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
