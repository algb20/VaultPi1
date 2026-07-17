"use client";

import {
  Shield,
  Eye,
  Lock,
  Globe,
  CheckCircle,
  Image as ImageIcon,
  Video,
  FileText,
  Link2,
  StickyNote,
  Upload,
  Trash2,
  Folder,
  Activity as ActivityIcon,
  Fingerprint,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useVault } from "@/contexts/vault-context";
import { formatBytes, timeAgo } from "@/lib/vaultpi/db";

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

export function PrivacyDashboard() {
  const { files, notes, items, activity, storageUsed, storageQuota } = useVault();

  const encrypted = files.filter((f) => f.is_encrypted).length;
  const pct = storageQuota > 0 ? Math.min(100, (storageUsed / storageQuota) * 100) : 0;

  const breakdown = [
    { label: "Photos", icon: ImageIcon, color: "text-sky-400", count: files.filter((f) => f.kind === "photo").length },
    { label: "Videos", icon: Video, color: "text-amber-400", count: files.filter((f) => f.kind === "video").length },
    { label: "Documents", icon: FileText, color: "text-emerald-400", count: files.filter((f) => f.kind === "document").length },
    { label: "Links", icon: Link2, color: "text-violet-400", count: files.filter((f) => f.kind === "link").length },
    { label: "Notes", icon: StickyNote, color: "text-primary", count: notes.length },
  ];

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-4">
      {/* Privacy status */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Privacy Status</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Encryption</p>
            <p className="text-sm font-semibold text-foreground">AES-256 + ZKE</p>
            <Badge className="bg-emerald-400/15 text-emerald-400 border-emerald-400/20 text-[10px] w-fit">Active</Badge>
          </div>
          <div className="rounded-lg bg-secondary p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Encrypted Items</p>
            <p className="text-sm font-semibold text-foreground">{encrypted}</p>
            <p className="text-[10px] text-muted-foreground">of {items.length} total</p>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Fingerprint className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">Pi Identity Protected</p>
          <p className="text-xs text-muted-foreground">Only you, signed in with Pi, can access this vault.</p>
        </div>
        <CheckCircle className="w-5 h-5 text-emerald-400" />
      </div>

      {/* Data breakdown */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Your Data</span>
        </div>
        <div className="divide-y divide-border">
          {breakdown.map((b) => (
            <div key={b.label} className="flex items-center gap-3 px-4 py-3">
              <b.icon className={`w-4 h-4 ${b.color} flex-shrink-0`} />
              <span className="flex-1 text-sm text-foreground">{b.label}</span>
              <span className="text-sm font-semibold text-foreground">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Access / activity log */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Eye className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Activity Log</span>
          <Badge className="ml-auto bg-secondary text-muted-foreground border-border text-[10px]">Recent</Badge>
        </div>
        {activity.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No activity recorded yet.</p>
        ) : (
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {activity.map((log) => {
              const meta = activityMeta(log.action);
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <meta.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{meta.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.detail}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(log.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Storage */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Encrypted Storage</span>
          </div>
          <Badge className="bg-sky-400/15 text-sky-400 border-sky-400/20">{formatBytes(storageQuota)}</Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Current Usage</span>
            <span className="text-foreground font-medium">
              {formatBytes(storageUsed)} / {formatBytes(storageQuota)}
            </span>
          </div>
          <Progress value={pct} className="h-2 bg-secondary" />
        </div>
      </div>
    </div>
  );
}
