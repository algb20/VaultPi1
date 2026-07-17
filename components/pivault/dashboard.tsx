"use client";

import { useState } from "react";
import {
  Shield,
  Image as ImageIcon,
  Video,
  FileText,
  Link2,
  Folder,
  Lock,
  RefreshCw,
  ChevronRight,
  Star,
  Activity as ActivityIcon,
  Sparkles,
  Upload,
  Trash2,
  StickyNote,
  Plus,
  BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useVault } from "@/contexts/vault-context";
import * as db from "@/lib/vaultpi/db";
import { formatBytes, timeAgo } from "@/lib/vaultpi/db";
import type { ItemKind, VaultItem } from "@/lib/vaultpi/types";

interface DashboardProps {
  onUpload: () => void;
  onOpenTab: (tab: string) => void;
  onOpenFiles: (filter?: string) => void;
  onOpenNotes: () => void;
}

const categoryConfig: {
  kind: ItemKind;
  label: string;
  filter: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}[] = [
  { kind: "photo", label: "Photos", filter: "photos", icon: ImageIcon, color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/20" },
  { kind: "video", label: "Videos", filter: "videos", icon: Video, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  { kind: "document", label: "Documents", filter: "documents", icon: FileText, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  { kind: "link", label: "Links", filter: "links", icon: Link2, color: "text-violet-400", bg: "bg-violet-400/10", border: "border-violet-400/20" },
];

const kindIcon: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  photo: { icon: ImageIcon, color: "text-sky-400", bg: "bg-sky-400/10" },
  video: { icon: Video, color: "text-amber-400", bg: "bg-amber-400/10" },
  document: { icon: FileText, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  link: { icon: Link2, color: "text-violet-400", bg: "bg-violet-400/10" },
  note: { icon: StickyNote, color: "text-primary", bg: "bg-primary/10" },
  audio: { icon: FileText, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  archive: { icon: FileText, color: "text-rose-400", bg: "bg-rose-400/10" },
  other: { icon: FileText, color: "text-rose-400", bg: "bg-rose-400/10" },
};

function activityMeta(action: string): { icon: React.ElementType; label: string } {
  switch (action) {
    case "upload": return { icon: Upload, label: "File uploaded" };
    case "delete": return { icon: Trash2, label: "Item deleted" };
    case "note": return { icon: StickyNote, label: "Note saved" };
    case "link": return { icon: Link2, label: "Link saved" };
    case "folder": return { icon: Folder, label: "Folder created" };
    default: return { icon: ActivityIcon, label: action };
  }
}

export function Dashboard({ onUpload, onOpenTab, onOpenFiles, onOpenNotes }: DashboardProps) {
  const { files, notes, folders, activity, storageUsed, storageQuota, reload } = useVault();
  const [syncing, setSyncing] = useState(false);
  const [newFolder, setNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");

  const pct = storageQuota > 0 ? Math.min(100, (storageUsed / storageQuota) * 100) : 0;
  const starred = files.filter((f) => f.is_starred);
  const recent: VaultItem[] = files.slice(0, 5);

  const quickActions = [
    { label: "Upload", icon: Upload, color: "text-sky-400", onClick: onUpload },
    { label: "AI Assistant", icon: Sparkles, color: "text-amber-400", onClick: () => onOpenTab("ai") },
    { label: "Notes", icon: StickyNote, color: "text-emerald-400", onClick: onOpenNotes },
    { label: "Sync", icon: RefreshCw, color: "text-violet-400", onClick: doSync },
  ];

  async function doSync() {
    setSyncing(true);
    await reload();
    setSyncing(false);
    toast.success("Vault synced");
  }

  async function createFolder() {
    if (!folderName.trim()) return;
    await db.createFolder(folderName.trim());
    setFolderName("");
    setNewFolder(false);
    await reload();
    toast.success("Folder created");
  }

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-4">
      {/* Storage card */}
      <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Vault Storage</p>
              <p className="text-sm font-semibold text-foreground">
                {formatBytes(storageUsed)} of {formatBytes(storageQuota)}
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-400/15 text-emerald-400 border-emerald-400/20 text-[10px]">Encrypted</Badge>
        </div>
        <Progress value={pct} className="h-1.5 bg-secondary" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{pct.toFixed(1)}% used</span>
          <span>{formatBytes(Math.max(0, storageQuota - storageUsed))} free</span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border active:scale-95 transition-transform hover:border-primary/30"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <action.icon className={`w-5 h-5 ${action.color} ${action.label === "Sync" && syncing ? "animate-spin" : ""}`} />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium text-center">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Categories
          </h2>
          <button onClick={() => onOpenFiles()} className="text-xs text-primary flex items-center gap-0.5">
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {categoryConfig.map((cat) => {
            const count = files.filter((f) => f.kind === cat.kind).length;
            return (
              <button
                key={cat.label}
                onClick={() => onOpenFiles(cat.filter)}
                className={`rounded-2xl border ${cat.border} bg-card p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors text-left`}
              >
                <div className={`w-9 h-9 rounded-xl ${cat.bg} flex items-center justify-center`}>
                  <cat.icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-tight">{count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{cat.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent files */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Recent Files</h2>
          <button onClick={() => onOpenFiles()} className="text-xs text-primary flex items-center gap-0.5">
            See all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        {recent.length === 0 ? (
          <button onClick={onUpload} className="w-full rounded-xl border border-dashed border-border bg-card p-6 text-center hover:border-primary/40 transition-colors">
            <p className="text-sm text-muted-foreground">No files yet — tap to upload your first item</p>
          </button>
        ) : (
          <div className="flex flex-col gap-1.5">
            {recent.map((file) => {
              const meta = kindIcon[file.kind] || kindIcon.other;
              return (
                <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                    <meta.icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.kind === "link" ? "Link" : formatBytes(file.size_bytes)} · {timeAgo(file.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {file.is_starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    {file.is_encrypted && (
                      <Badge className="text-[10px] bg-secondary text-muted-foreground border-border">
                        <Lock className="w-2.5 h-2.5" />
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes teaser */}
      <button
        onClick={onOpenNotes}
        className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 hover:border-primary/30 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <StickyNote className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Notes</p>
          <p className="text-xs text-muted-foreground">{notes.length} saved · quick memos & ideas</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-primary" />
            Activity
          </h2>
        </div>
        {activity.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1">No recent activity.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {activity.slice(0, 5).map((log) => {
              const meta = activityMeta(log.action);
              return (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <meta.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.detail}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(log.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Folders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Folders</h2>
          <button onClick={() => setNewFolder(!newFolder)} className="text-xs text-primary flex items-center gap-0.5">
            New <Plus className="w-3 h-3" />
          </button>
        </div>
        {newFolder && (
          <div className="flex gap-2 mb-2">
            <input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
              placeholder="Folder name"
              className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
              autoFocus
            />
            <button onClick={createFolder} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm">Add</button>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {folders.length === 0 && !newFolder && (
            <p className="text-xs text-muted-foreground px-1 py-2">No folders yet.</p>
          )}
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border whitespace-nowrap flex-shrink-0"
            >
              <Folder className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">{folder.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Storage insight */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-primary" />
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">{files.length}</span> files ·{" "}
          <span className="text-foreground font-medium">{starred.length}</span> starred ·{" "}
          <span className="text-foreground font-medium">{folders.length}</span> folders
        </div>
      </div>
    </div>
  );
}
