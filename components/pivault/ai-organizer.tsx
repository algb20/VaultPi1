"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Tags,
  Sparkles,
  FolderOpen,
  Clock,
  ArrowRight,
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Link2,
  StickyNote,
  Lock,
  HardDrive,
  Star,
  MessageCircle,
  Brain,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useVault } from "@/contexts/vault-context";
import * as db from "@/lib/vaultpi/db";
import { formatBytes, timeAgo } from "@/lib/vaultpi/db";
import type { VaultItem } from "@/lib/vaultpi/types";

const kindIcon: Record<string, { icon: React.ElementType; color: string }> = {
  photo: { icon: ImageIcon, color: "text-sky-400" },
  video: { icon: Video, color: "text-amber-400" },
  document: { icon: FileText, color: "text-emerald-400" },
  link: { icon: Link2, color: "text-violet-400" },
  note: { icon: StickyNote, color: "text-primary" },
  audio: { icon: FileText, color: "text-cyan-400" },
  archive: { icon: FileText, color: "text-rose-400" },
  other: { icon: FileText, color: "text-rose-400" },
};

const LARGE_FILE = 100 * 1024 * 1024; // 100MB
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

export function AiOrganizer({ onOpenFiles }: { onOpenFiles: (filter?: string) => void }) {
  const { items, files, notes, tags } = useVault();
  const [query, setQuery] = useState("");
  const [conversationMode, setConversationMode] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.note_content || "").toLowerCase().includes(q) ||
          (i.link_url || "").toLowerCase().includes(q),
      )
      .slice(0, 30);
  }, [query, items]);

  const collections = useMemo(() => {
    const now = Date.now();
    return [
      { key: "large", label: "Large Files", desc: "Over 100 MB", icon: HardDrive, count: files.filter((f) => f.size_bytes > LARGE_FILE).length },
      { key: "recent", label: "Recently Added", desc: "Last 7 days", icon: Clock, count: files.filter((f) => now - new Date(f.created_at).getTime() < RECENT_MS).length },
      { key: "encrypted", label: "Encrypted", desc: "AES-256 protected", icon: Lock, count: files.filter((f) => f.is_encrypted).length },
      { key: "starred", label: "Starred", desc: "Your favourites", icon: Star, count: files.filter((f) => f.is_starred).length },
    ];
  }, [files]);

  const openItem = async (item: VaultItem) => {
    if (item.kind === "link" && item.link_url) return window.open(item.link_url, "_blank");
    if (item.storage_path) {
      const url = await db.getSignedUrl(item.storage_path);
      if (url) window.open(url, "_blank");
    }
  };

  const answer = (q: string): string => {
    const s = q.toLowerCase();
    const count = (pred: (i: VaultItem) => boolean) => items.filter(pred).length;
    if (/photo|image|صور/.test(s)) return `You have ${count((i) => i.kind === "photo")} photos in your vault.`;
    if (/video|فيديو/.test(s)) return `You have ${count((i) => i.kind === "video")} videos stored.`;
    if (/doc|pdf|مستند/.test(s)) return `You have ${count((i) => i.kind === "document")} documents.`;
    if (/link|رابط/.test(s)) return `You saved ${count((i) => i.kind === "link")} links.`;
    if (/note|مذكرة|ملاحظ/.test(s)) return `You have ${notes.length} notes.`;
    if (/large|big|كبير/.test(s)) {
      const big = files.filter((f) => f.size_bytes > LARGE_FILE).length;
      return `You have ${big} files larger than 100 MB.`;
    }
    const found = items.filter(
      (i) => i.name.toLowerCase().includes(s) || (i.note_content || "").toLowerCase().includes(s),
    ).length;
    return found > 0
      ? `I found ${found} item${found > 1 ? "s" : ""} matching "${q}". Open the Search above to see them.`
      : `I couldn't find anything for "${q}". Try a file name, a keyword, or a type like "photos".`;
  };

  const send = () => {
    if (!query.trim()) return;
    const q = query;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setTimeout(() => setMessages((m) => [...m, { role: "assistant", text: answer(q) }]), 400);
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-4 pb-24 px-4 pt-4">
      {/* Assistant header */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">Smart Assistant</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Search across everything in your vault, get instant insights, and organize with smart collections.
            </p>
          </div>
        </div>
      </div>

      {conversationMode ? (
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 h-96">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Assistant</span>
            <button onClick={() => setConversationMode(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">Ask me: "how many photos", "large files", or a file name.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs p-3 rounded-2xl text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-foreground rounded-bl-none"}`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about your vault..."
              className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            <button onClick={send} className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files, notes and links..."
              className="w-full bg-card border border-border rounded-2xl pl-10 pr-12 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            {query && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button onClick={() => setConversationMode(true)} className="p-2 rounded-lg hover:bg-secondary">
                  <MessageCircle className="w-4 h-4 text-primary" />
                </button>
                <button onClick={() => setQuery("")} className="p-2 rounded-lg hover:bg-secondary">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>

          {/* Search results */}
          {query && (
            <div className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Results
                </span>
                <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">{results.length}</Badge>
              </div>
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No matches for “{query}”.</p>
              ) : (
                <div className="divide-y divide-border max-h-80 overflow-y-auto">
                  {results.map((r) => {
                    const meta = kindIcon[r.kind] || kindIcon.other;
                    return (
                      <button key={r.id} onClick={() => openItem(r)} className="flex items-center gap-3 w-full px-4 py-3 hover:bg-secondary text-left">
                        <meta.icon className={`w-4 h-4 ${meta.color} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{r.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {r.kind}{r.kind !== "link" && r.kind !== "note" ? ` · ${formatBytes(r.size_bytes)}` : ""} · {timeAgo(r.created_at)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Smart collections */}
          {!query && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Smart Collections</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {collections.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => c.key === "starred" ? onOpenFiles("starred") : onOpenFiles()}
                    className="rounded-2xl bg-card border border-border p-4 flex flex-col gap-2 text-left hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <c.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-lg font-bold text-foreground">{c.count}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.label}</p>
                      <p className="text-[10px] text-muted-foreground">{c.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {!query && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tags className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Your Tags</span>
              </div>
              {tags.length === 0 ? (
                <p className="text-xs text-muted-foreground px-1">No tags yet. Tags you add to items will appear here.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span key={t.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-foreground">
                      {t.name}
                      <span className="opacity-60">({t.count ?? 0})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
