"use client";

// ═══════════════════════════════════════════════════════════════════
// EdgeDock — اختصار عائم على الحافة = مركز أدوات فعلي (وليس عرضاً فقط):
//  • رفع، كاميرا (التقاط)، تسجيل صوت، مذكرة، مشاركة، بحث، المميّزة، الملفات
//  • قفل اختياري برمز 3 أرقام (خصوصية)
//  • قابل للسحب + تبديل الجهة + تخصيص الإجراءات + الشفافية — يُحفظ في Supabase
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Camera,
  Mic,
  StickyNote,
  Share2,
  Search,
  Star,
  FolderOpen,
  Settings2,
  X,
  GripVertical,
  Layers,
  Lock,
  Delete,
} from "lucide-react";
import { toast } from "sonner";
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
  actions: ["upload", "camera", "audio", "note", "share"],
  lockEnabled: false,
};

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("vaultpin:" + s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function EdgeDock({ onUpload, onNewNote, onSearch, onStarred, onFiles }: EdgeDockProps) {
  const { profile, reload } = useVault();
  const [config, setConfig] = useState<DockConfig>(DEFAULT_DOCK);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [liveTop, setLiveTop] = useState<number | null>(null);
  const [liveSide, setLiveSide] = useState<DockConfig["side"] | null>(null);
  const dragState = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);

  const [pinMode, setPinMode] = useState<null | "enter" | "set">(null);
  const [pinBuf, setPinBuf] = useState("");
  const [pinErr, setPinErr] = useState(false);

  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.dock_config) setConfig({ ...DEFAULT_DOCK, ...(profile.dock_config as Partial<DockConfig>) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

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

  // ── الأدوات الفعلية ───────────────────────────────────────────────
  const doCamera = () => cameraInputRef.current?.click();

  const onCameraFile = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    try {
      const f = files[0];
      const kind = f.type.startsWith("video/") ? "video" : "photo";
      await db.uploadFile(f, { kindOverride: kind as any });
      await reload();
      toast.success(kind === "video" ? "Video saved" : "Photo saved");
    } catch (e: any) {
      toast.error(e?.message === "quota_exceeded" ? "Storage full" : "Upload failed");
    }
  };

  const doShare = async () => {
    const data = {
      title: "PiVault",
      text: "My secure vault on Pi Network",
      url: typeof location !== "undefined" ? location.href : "",
    };
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share(data);
      } else {
        await navigator.clipboard.writeText(data.url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  const toggleRecord = async () => {
    if (recording) {
      mediaRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
        try {
          await db.uploadFile(file, { kindOverride: "audio" });
          await reload();
          toast.success("Recording saved");
        } catch {
          toast.error("Could not save recording");
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setOpen(false);
      toast("Recording… tap the mic again to stop");
    } catch {
      toast.error("Microphone permission denied");
    }
  };

  const actions = [
    { key: "upload", label: "Upload", icon: Upload, run: () => { onUpload(); setOpen(false); } },
    { key: "camera", label: "Camera", icon: Camera, run: () => { doCamera(); setOpen(false); } },
    { key: "audio", label: recording ? "Stop" : "Record", icon: Mic, run: () => toggleRecord() },
    { key: "note", label: "New Note", icon: StickyNote, run: () => { onNewNote(); setOpen(false); } },
    { key: "share", label: "Share", icon: Share2, run: () => { doShare(); setOpen(false); } },
    { key: "search", label: "Search", icon: Search, run: () => { onSearch(); setOpen(false); } },
    { key: "starred", label: "Starred", icon: Star, run: () => { onStarred(); setOpen(false); } },
    { key: "files", label: "Files", icon: FolderOpen, run: () => { onFiles(); setOpen(false); } },
  ];
  const activeActions = actions.filter((a) => config.actions.includes(a.key));

  // ── القفل بالرمز ──────────────────────────────────────────────────
  const handleTap = () => {
    if (config.lockEnabled && config.pinHash && !unlocked) {
      setPinBuf("");
      setPinErr(false);
      setPinMode("enter");
      return;
    }
    setOpen((o) => !o);
  };

  const pushPin = async (d: string) => {
    if (pinBuf.length >= 3) return;
    const next = pinBuf + d;
    setPinBuf(next);
    setPinErr(false);
    if (next.length === 3) {
      if (pinMode === "set") {
        const h = await sha256(next);
        persist({ lockEnabled: true, pinHash: h });
        setPinMode(null);
        setPinBuf("");
        toast.success("PIN lock enabled");
      } else {
        const h = await sha256(next);
        if (h === config.pinHash) {
          setUnlocked(true);
          setPinMode(null);
          setPinBuf("");
          setOpen(true);
        } else {
          setPinErr(true);
          setPinBuf("");
        }
      }
    }
  };

  // ── السحب ─────────────────────────────────────────────────────────
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
      handleTap();
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

  const toggleLock = () => {
    if (config.lockEnabled) {
      persist({ lockEnabled: false, pinHash: undefined });
      setUnlocked(false);
      toast("Lock removed");
    } else {
      setPinBuf("");
      setPinErr(false);
      setPinMode("set");
    }
  };

  return (
    <>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onCameraFile(e.target.files)}
      />

      {/* لوحة إدخال الرمز */}
      {pinMode && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-64 rounded-3xl bg-card border border-border p-5 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {pinMode === "set" ? "Set a 3-digit PIN" : "Enter PIN"}
            </p>
            <div className="flex gap-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 ${
                    pinBuf.length > i ? "bg-primary border-primary" : "border-border"
                  } ${pinErr ? "border-destructive" : ""}`}
                />
              ))}
            </div>
            {pinErr && <p className="text-xs text-destructive">Wrong PIN, try again</p>}
            <div className="grid grid-cols-3 gap-2 w-full">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => pushPin(d)}
                  className="h-12 rounded-xl bg-secondary text-foreground text-lg font-semibold active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => { setPinMode(null); setPinBuf(""); }}
                className="h-12 rounded-xl bg-secondary text-muted-foreground text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => pushPin("0")}
                className="h-12 rounded-xl bg-secondary text-foreground text-lg font-semibold active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => setPinBuf((b) => b.slice(0, -1))}
                className="h-12 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* المقبض واللوحة */}
      <div className="fixed z-50 select-none" style={posStyle}>
        <div className={`flex ${side === "right" ? "flex-row-reverse" : "flex-row"} items-start gap-2`}>
          <button
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`w-11 h-11 rounded-2xl shadow-lg flex items-center justify-center touch-none active:scale-95 transition-transform ${
              recording ? "bg-destructive animate-pulse" : "bg-primary shadow-primary/30"
            }`}
            title="Quick tools — tap to open, drag to move"
          >
            {recording ? <Mic className="w-5 h-5 text-white" /> : <Layers className="w-5 h-5 text-primary-foreground" />}
          </button>

          {open && (
            <div className="rounded-2xl bg-card border border-border shadow-xl overflow-hidden w-44">
              {!editing ? (
                <>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <GripVertical className="w-3 h-3 text-muted-foreground" /> Tools
                    </span>
                    <button onClick={() => setEditing(true)}>
                      <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <div className="flex flex-col p-1.5 max-h-80 overflow-y-auto">
                    {activeActions.length === 0 && (
                      <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">
                        No tools — tap the gear to add.
                      </p>
                    )}
                    {activeActions.map((a) => (
                      <button
                        key={a.key}
                        onClick={a.run}
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
                <div className="p-3 flex flex-col gap-3 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Customize</span>
                    <button onClick={() => setEditing(false)}>
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Tools</span>
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

                  <button
                    onClick={toggleLock}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs ${
                      config.lockEnabled ? "bg-emerald-400/15 text-emerald-400" : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> PIN lock
                    </span>
                    <span className="text-[9px]">{config.lockEnabled ? "ON" : "off"}</span>
                  </button>

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
    </>
  );
}
