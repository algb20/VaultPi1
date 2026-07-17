"use client";

import { useEffect, useState } from "react";
import { X, Check, Folder, Tag as TagIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { useVault } from "@/contexts/vault-context";
import * as db from "@/lib/vaultpi/db";
import type { VaultItem } from "@/lib/vaultpi/types";

export function ItemManageModal({ item, onClose }: { item: VaultItem; onClose: () => void }) {
  const { folders, tags, reload } = useVault();
  const [name, setName] = useState(item.name);
  const [folderId, setFolderId] = useState<string | null>(item.folder_id);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    db.getItemTagIds(item.id).then(setTagIds).catch(() => setTagIds([]));
  }, [item.id]);

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addTag = async () => {
    const n = newTag.trim();
    if (!n) return;
    try {
      const existing = tags.find((t) => t.name.toLowerCase() === n.toLowerCase());
      const tag = existing ?? (await db.createTag(n));
      setTagIds((prev) => (prev.includes(tag.id) ? prev : [...prev, tag.id]));
      setNewTag("");
      await reload();
    } catch {
      toast.error("Could not add tag");
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await db.updateItem(item.id, { name: name.trim() || item.name, folder_id: folderId });
      await db.setItemTags(item.id, tagIds);
      await reload();
      toast.success("Saved");
      onClose();
    } catch {
      toast.error("Could not save changes");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border-t border-border rounded-t-3xl p-5 flex flex-col gap-4 z-10 max-h-[85vh] overflow-y-auto">
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-border" />
        <div className="flex items-center justify-between mt-2">
          <h2 className="text-base font-bold text-foreground">Manage Item</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Rename */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60"
          />
        </div>

        {/* Move to folder */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5" /> Folder
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFolderId(null)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                folderId === null ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"
              }`}
            >
              None
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setFolderId(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  folderId === f.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <TagIcon className="w-3.5 h-3.5" /> Tags
          </span>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const on = tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border ${
                    on ? "bg-primary/15 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border"
                  }`}
                >
                  {on && <Check className="w-3 h-3" />}
                  {t.name}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="New tag"
              className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
            />
            <button onClick={addTag} className="px-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" /> {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
