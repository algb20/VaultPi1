"use client";

// ═══════════════════════════════════════════════════════════════════
// EdgeDock — اختصار عائم على حافة الشاشة، قابل للسحب والتخصيص.
//  • اضغط لفتح قائمة إجراءات سريعة (رفع/مذكرة/بحث/المميزة/الملفات)
//  • اسحب لتغيير موضعه عمودياً أو نقله لليمين/اليسار
//  • عدّل أي الإجراءات تظهر + الجهة + الشفافية — ويُحفظ في Supabase
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  StickyNote,
  Search,
  Star,
  FolderOpen,
  Settings2,
  X,
  GripVertical,
  Layers,
} from "lucide-react";
import { useVault } from "@/contexts/vault-context";
import * as db from "@/lib/vaultpi/db";
import type { DockConfig } from "@/lib/vaultpi/types";

interface EdgeDockProps {
  onUpload: () => void;
  onNewNote: () => void;
  onSearch: () => void;
  onStarred: () => void;
  onFiles: () => void;
}

const DEFAULT_DOCK: DockConfig = {
  enabled: true,
  side: "right",
  offset: 45,
  opacity: 0.95,
  actions: ["upload", "note", "search", "starred"],
};

export function EdgeDock({ onUpload, onNewNote, onSearch, onStarred, onFiles }: EdgeDockProps) {
  const { profile } = useVault();
  const [config, setConfig] = useState<DockConfig>(DEFAULT_DOCK);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [liveTop, setLiveTop] = useState<number | null>(null);
  const [liveSide, setLiveSide] = useState<DockConfig["side"] | null>(null);

  const dragState = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);

  // نُهيّئ من الملف الشخصي مرة واحدة عند توفره
  useEffect(() => {
    if (profile?.dock_config) {
      setConfig({ ...DEFAULT_DOCK, ...(profile.dock_config as Partial<DockConfig>) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  // مزامنة حالة التفعيل/الإيقاف (لإعادة التفعيل من الإعدادات)
  useEffect(() => {
    const enabled = profile?.dock_config?.enabled;
    if (typeof enabled === "boolean") setConfig((c) => ({ ...c, enabled }));
  }, [profile?.dock_config?.enabled]);

  const persist = (patch: Partial<DockConfig>) => {
    setConfig((c) => {
      const next = { ...c, ...patch };
      db.updateDock(patch).catch(() => {});
      return next;
    });
  };

  const actions = [
    { key: "upload", label: "Upload", icon: Upload, run: onUpload },
    { key: "note", label: "New Note", icon: StickyNote, run: onNewNote },
    { key: "search", label: "Search", icon: Search, run: onSearch },
    { key: "starred", label: "Starred", icon: Star, run: onStarred },
    { key: "files", label: "Files", icon: FolderOpen, run: onFiles },
  ];
  const activeActions = actions.filter((a) => config.actions.includes(a.key));

  // ── سحب ─────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragState.current;
    if (!d) return;
    if (Math.abs(e.clientY - d.startY) > 6 || Math.abs(e.clientX - d.startX) > 6) {
      d.moved = true;
      setOpen(false);
      setLiveTop(e.clientY);
      setLiveSide(e.clientX < window.innerWidth / 2 ? "left" : "right");
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragState.current;
    dragState.current = null;
    if (!d) return;
    if (d.moved) {
      const offset = Math.min(90, Math.max(4, (e.clientY / window.innerHeight) * 100));
      const side = (e.clientX < window.innerWidth / 2 ? "left" : "right") as DockConfig["side"];
      persist({ offset, side });
      setLiveTop(null);
      setLiveSide(null);
    } else {
      setOpen((o) => !o);
    }
  };

  if (!config.enabled) return null;

  const side = liveSide ?? config.side;
  const posStyle: React.CSSProperties = {
    top: liveTop != null ? `${liveTop}px` : `${config.offset}%`,
    [side]: 10,
    opacity: liveTop != null ? 0.7 : config.opacity,
  };

  const toggleAction = (key: string) => {
    const has = config.actions.includes(key);
    const next = has ? config.actions.filter((k) => k !== key) : [...config.actions, key];
    persist({ actions: next });
  };

  return (
    <div className="fixed z-50 select-none" style={posStyle}>
      <div className={`flex ${side === "right" ? "flex-row-reverse" : "flex-row"} items-start gap-2`}>
        {/* المقبض العائم */}
        <button
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="w-11 h-11 rounded-2xl bg-primary shadow-lg shadow-primary/30 flex items-center justify-center touch-none active:scale-95 transition-transform"
          title="Quick shortcut — tap to open, drag to move"
        >
          <Layers className="w-5 h-5 text-primary-foreground" />
        </button>

        {/* اللوحة المنبثقة */}
        {open && (
          <div className="rounded-2xl bg-card border border-border shadow-xl overflow-hidden w-44 animate-in fade-in slide-in-from-bottom-1">
            {!editing ? (
              <>
                <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <GripVertical className="w-3 h-3 text-muted-foreground" /> Quick Actions
                  </span>
                  <button onClick={() => setEditing(true)}>
                    <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex flex-col p-1.5">
                  {activeActions.length === 0 && (
                    <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">
                      No shortcuts — tap the gear to add.
                    </p>
                  )}
                  {activeActions.map((a) => (
                    <button
                      key={a.key}
                      onClick={() => {
                        a.run();
                        setOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <a.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{a.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Customize</span>
                  <button onClick={() => setEditing(false)}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Shortcuts</span>
                  {actions.map((a) => {
                    const on = config.actions.includes(a.key);
                    return (
                      <button
                        key={a.key}
                        onClick={() => toggleAction(a.key)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                          on ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <a.icon className="w-3.5 h-3.5" /> {a.label}
                        </span>
                        <span className="text-[9px]">{on ? "ON" : "off"}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Side</span>
                  <div className="flex gap-1.5">
                    {(["left", "right"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => persist({ side: s })}
                        className={`flex-1 py-1.5 rounded-lg text-xs capitalize ${
                          config.side === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Opacity {(config.opacity * 100).toFixed(0)}%
                  </span>
                  <input
                    type="range"
                    min={40}
                    max={100}
                    value={Math.round(config.opacity * 100)}
                    onChange={(e) => persist({ opacity: Number(e.target.value) / 100 })}
                    className="w-full accent-primary"
                  />
                </div>

                <button
                  onClick={() => {
                    persist({ enabled: false });
                    setOpen(false);
                    setEditing(false);
                  }}
                  className="text-[11px] text-destructive text-center py-1"
                >
                  Hide dock (re-enable in Settings)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
