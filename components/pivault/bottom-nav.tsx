"use client";

import { Fragment, useState } from "react";
import { Home, FolderOpen, Zap, Settings, Plus, Upload, Link as LinkIcon, StickyNote } from "lucide-react";

type Tab = "dashboard" | "files" | "ai" | "settings";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  onUpload: () => void;
  onScanLink: () => void;
  onNewNote: () => void;
  onOpenNotes: () => void;
}

const navItems: { key: Tab; icon: React.ElementType; label: string }[] = [
  { key: "dashboard", icon: Home, label: "Home" },
  { key: "files", icon: FolderOpen, label: "Files" },
  { key: "ai", icon: Zap, label: "AI" },
  { key: "settings", icon: Settings, label: "Settings" },
];

export function BottomNav({ active, onChange, onUpload, onScanLink, onNewNote, onOpenNotes }: BottomNavProps) {
  const [showSmartMenu, setShowSmartMenu] = useState(false);

  const smartMenuItems = [
    { icon: Upload, label: "Upload File", run: onUpload },
    { icon: StickyNote, label: "New Note", run: onNewNote },
    { icon: LinkIcon, label: "Save Link", run: onScanLink },
    { icon: FolderOpen, label: "Open Notes", run: onOpenNotes },
  ];

  const handleSmartMenuAction = (run: () => void) => {
    run();
    setShowSmartMenu(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border max-w-md mx-auto">
      <div className="flex items-center justify-around px-2 pb-safe-bottom py-2">
        {navItems.map((item, idx) => {
          const isActive = active === item.key;
          return (
            <Fragment key={item.key}>
              <button
                onClick={() => onChange(item.key)}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <item.icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
                  {isActive && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </button>
              {idx === 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSmartMenu(!showSmartMenu)}
                    className="flex flex-col items-center gap-1 -mt-5 transition-transform active:scale-90"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                      <Plus className={`w-6 h-6 text-primary-foreground transition-transform ${showSmartMenu ? "rotate-45" : ""}`} />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground">Menu</span>
                  </button>

                  {showSmartMenu && (
                    <>
                      <div className="fixed inset-0 z-0" onClick={() => setShowSmartMenu(false)} />
                      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-10">
                        <div className="p-3 border-b border-border">
                          <p className="text-xs font-semibold text-foreground">Quick Actions</p>
                        </div>
                        <div className="flex flex-col gap-1 p-2">
                          {smartMenuItems.map((item) => (
                            <button
                              key={item.label}
                              onClick={() => handleSmartMenuAction(item.run)}
                              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                            >
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <item.icon className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-sm font-medium text-foreground">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </nav>
  );
}
