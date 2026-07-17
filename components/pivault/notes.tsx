"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  StickyNote,
  Pin,
  PinOff,
  Trash2,
  ArrowLeft,
  Search,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useVault } from "@/contexts/vault-context";
import * as db from "@/lib/vaultpi/db";
import { timeAgo } from "@/lib/vaultpi/db";
import type { VaultItem } from "@/lib/vaultpi/types";

interface NotesProps {
  autoNew?: boolean;
  onAutoNewConsumed?: () => void;
}

export function Notes({ autoNew, onAutoNewConsumed }: NotesProps) {
  const { notes, reload } = useVault();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<VaultItem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (autoNew) {
      startNew();
      onAutoNewConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNew]);

  const startNew = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setCreating(true);
  };
  const startEdit = (n: VaultItem) => {
    setEditing(n);
    setTitle(n.name);
    setContent(n.note_content || "");
    setCreating(true);
  };
  const cancel = () => {
    setCreating(false);
    setEditing(null);
    setTitle("");
    setContent("");
  };

  const save = async () => {
    if (!title.trim() && !content.trim()) {
      cancel();
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await db.updateItem(editing.id, {
          name: title.trim() || "Untitled note",
          note_content: content,
        });
      } else {
        await db.createNote(title.trim() || "Untitled note", content);
      }
      await reload();
      cancel();
      toast.success("Note saved");
    } catch {
      toast.error("Could not save note");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (n: VaultItem) => {
    await db.updateItem(n.id, { is_pinned: !n.is_pinned });
    await reload();
  };

  const del = async (n: VaultItem) => {
    await db.deleteItem(n);
    await reload();
    if (editing?.id === n.id) cancel();
    toast.success("Note deleted");
  };

  const filtered = notes
    .filter(
      (n) =>
        !query ||
        n.name.toLowerCase().includes(query.toLowerCase()) ||
        (n.note_content || "").toLowerCase().includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.is_pinned) - Number(a.is_pinned) ||
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

  // ── Editor ────────────────────────────────────────────────────────
  if (creating) {
    return (
      <div className="flex flex-col h-full pb-24 px-4 pt-4 gap-3">
        <div className="flex items-center justify-between">
          <button onClick={cancel} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Notes
          </button>
          <div className="flex items-center gap-2">
            {editing && (
              <button
                onClick={() => del(editing)}
                className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </button>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              <Check className="w-4 h-4" /> Save
            </button>
          </div>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full bg-transparent text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          autoFocus={!editing}
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing... your notes are encrypted and stored securely in your vault."
          className="flex-1 min-h-[50vh] w-full bg-card border border-border rounded-2xl p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none leading-relaxed"
        />
      </div>
    );
  }

  // ── List ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full pb-24 px-4 pt-4 gap-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full bg-card border border-border rounded-2xl pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <button
        onClick={startNew}
        className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold active:scale-98 transition-transform"
      >
        <Plus className="w-4 h-4" /> New Note
      </button>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <StickyNote className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No notes yet</p>
          <p className="text-xs text-muted-foreground">Capture ideas, lists and memos — all encrypted in your vault.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((n) => (
            <div key={n.id} className="rounded-2xl bg-card border border-border p-4">
              <button onClick={() => startEdit(n)} className="w-full text-left">
                <div className="flex items-center gap-2">
                  {n.is_pinned && <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                  <p className="text-sm font-semibold text-foreground truncate">{n.name}</p>
                </div>
                {n.note_content && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
                    {n.note_content}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">{timeAgo(n.updated_at)}</p>
              </button>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => togglePin(n)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-xs text-muted-foreground"
                >
                  {n.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  {n.is_pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  onClick={() => del(n)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-xs text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
