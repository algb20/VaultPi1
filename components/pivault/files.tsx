"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Image as ImageIcon,
  Video,
  FileText,
  Link2,
  Music,
  Archive,
  Grid3X3,
  List,
  SlidersHorizontal,
  Check,
  MoreHorizontal,
  Share2,
  Trash2,
  Lock,
  Download,
  ChevronDown,
  Star,
  ExternalLink,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useVault } from "@/contexts/vault-context";
import * as db from "@/lib/vaultpi/db";
import { formatBytes, timeAgo } from "@/lib/vaultpi/db";
import type { ItemKind, VaultItem } from "@/lib/vaultpi/types";

type ViewMode = "grid" | "list";
type FilterTab = "all" | "photos" | "videos" | "documents" | "links" | "other";

const fileIcons: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  photo: { icon: ImageIcon, color: "text-sky-400", bg: "bg-sky-400/10" },
  video: { icon: Video, color: "text-amber-400", bg: "bg-amber-400/10" },
  document: { icon: FileText, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  link: { icon: Link2, color: "text-violet-400", bg: "bg-violet-400/10" },
  audio: { icon: Music, color: "text-cyan-400", bg: "bg-cyan-400/10" },
  archive: { icon: Archive, color: "text-rose-400", bg: "bg-rose-400/10" },
  other: { icon: Archive, color: "text-rose-400", bg: "bg-rose-400/10" },
};

const tabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "photos", label: "Photos" },
  { key: "videos", label: "Videos" },
  { key: "documents", label: "Docs" },
  { key: "links", label: "Links" },
  { key: "other", label: "Other" },
];

const sortOptions = ["Name", "Date", "Size", "Type"] as const;

function matchesTab(item: VaultItem, tab: FilterTab): boolean {
  if (tab === "all") return true;
  if (tab === "photos") return item.kind === "photo";
  if (tab === "videos") return item.kind === "video";
  if (tab === "documents") return item.kind === "document";
  if (tab === "links") return item.kind === "link";
  if (tab === "other") return ["audio", "archive", "other"].includes(item.kind);
  return true;
}

export function Files({ initialFilter }: { initialFilter?: string | null }) {
  const { files, reload } = useVault();

  const filterTabKeys: FilterTab[] = ["all", "photos", "videos", "documents", "links", "other"];
  const initTab = (initialFilter && filterTabKeys.includes(initialFilter as FilterTab)
    ? (initialFilter as FilterTab)
    : "all") as FilterTab;

  const [view, setView] = useState<ViewMode>("list");
  const [activeTab, setActiveTab] = useState<FilterTab>(initTab);
  const [starredOnly, setStarredOnly] = useState(initialFilter === "starred");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showSort, setShowSort] = useState(false);
  const [activeSort, setActiveSort] = useState<(typeof sortOptions)[number]>("Date");
  const [menuFileId, setMenuFileId] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    setActiveTab(initTab);
    setStarredOnly(initialFilter === "starred");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilter]);

  const filtered = useMemo(() => {
    let list = files.filter((f) => matchesTab(f, activeTab));
    if (starredOnly) list = list.filter((f) => f.is_starred);
    const sorted = [...list].sort((a, b) => {
      if (activeSort === "Name") return a.name.localeCompare(b.name);
      if (activeSort === "Size") return (b.size_bytes || 0) - (a.size_bytes || 0);
      if (activeSort === "Type") return a.kind.localeCompare(b.kind);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return sorted;
  }, [files, activeTab, starredOnly, activeSort]);

  // روابط موقّعة لصور المعاينة
  useEffect(() => {
    const paths = filtered
      .filter((f) => f.kind === "photo" && f.storage_path)
      .map((f) => f.storage_path!) as string[];
    if (!paths.length) {
      setThumbs({});
      return;
    }
    db.getSignedUrls(paths).then(setThumbs).catch(() => setThumbs({}));
  }, [filtered]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const openItem = async (item: VaultItem) => {
    if (item.kind === "link" && item.link_url) {
      window.open(item.link_url, "_blank");
      return;
    }
    if (item.storage_path) {
      const url = await db.getSignedUrl(item.storage_path);
      if (url) window.open(url, "_blank");
    }
  };

  const download = async (item: VaultItem) => {
    if (!item.storage_path) return;
    const url = await db.getSignedUrl(item.storage_path, { download: true });
    if (url) window.open(url, "_blank");
    setMenuFileId(null);
  };

  const share = async (item: VaultItem) => {
    let url = item.link_url || "";
    if (!url && item.storage_path) url = (await db.getSignedUrl(item.storage_path)) || "";
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      } catch {
        toast("Share link: " + url);
      }
    }
    setMenuFileId(null);
  };

  const doDelete = async (item: VaultItem) => {
    await db.deleteItem(item);
    await reload();
    setMenuFileId(null);
    toast.success("Deleted");
  };

  const toggleStar = async (item: VaultItem) => {
    await db.toggleStar(item.id, !item.is_starred);
    await reload();
  };

  const toggleEncrypt = async (item: VaultItem) => {
    await db.updateItem(item.id, { is_encrypted: !item.is_encrypted });
    await reload();
    setMenuFileId(null);
  };

  const bulkDelete = async () => {
    const targets = files.filter((f) => selectedIds.includes(f.id));
    for (const t of targets) await db.deleteItem(t);
    setSelectedIds([]);
    await reload();
    toast.success("Selected items deleted");
  };

  return (
    <div className="flex flex-col h-full pb-24">
      {/* Filter tabs */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setStarredOnly(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                activeTab === tab.key && !starredOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{filtered.length} items</span>
          {starredOnly && (
            <Badge className="bg-amber-400/15 text-amber-400 border-amber-400/20 text-[10px] flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-amber-400" /> Starred
              <button onClick={() => setStarredOnly(false)}><X className="w-2.5 h-2.5" /></button>
            </Badge>
          )}
          {selectedIds.length > 0 && (
            <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px]">
              {selectedIds.length} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeSort}
            <ChevronDown className="w-3 h-3" />
          </button>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`p-1.5 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showSort && (
        <div className="mx-4 mb-2 rounded-xl bg-card border border-border overflow-hidden">
          {sortOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => { setActiveSort(opt); setShowSort(false); }}
              className="flex items-center justify-between w-full px-4 py-2.5 text-sm hover:bg-secondary"
            >
              <span className={activeSort === opt ? "text-primary font-medium" : "text-foreground"}>{opt}</span>
              {activeSort === opt && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <FileText className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No items yet</p>
          <p className="text-xs text-muted-foreground">Tap the + button to upload files, photos, videos or links.</p>
        </div>
      )}

      {/* File list */}
      <div className="flex-1 overflow-y-auto px-4">
        {view === "list" ? (
          <div className="flex flex-col gap-1.5">
            {filtered.map((file) => {
              const meta = fileIcons[file.kind] || fileIcons.other;
              const isSelected = selectedIds.includes(file.id);
              const thumb = file.storage_path ? thumbs[file.storage_path] : undefined;
              return (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isSelected ? "bg-primary/10 border-primary/30" : "bg-card border-border"
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(file.id); }}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? "bg-primary border-primary" : "border-border"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </button>

                  <button onClick={() => openItem(file)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    {thumb ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={thumb} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                        <meta.icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        {file.is_encrypted && <Lock className="w-3 h-3 text-emerald-400 flex-shrink-0" />}
                        {file.is_starred && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {file.kind === "link" ? "Link" : formatBytes(file.size_bytes)} · {timeAgo(file.created_at)}
                      </p>
                    </div>
                  </button>

                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuFileId(menuFileId === file.id ? null : file.id); }}
                      className="p-1.5 rounded-lg hover:bg-secondary"
                    >
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {menuFileId === file.id && (
                      <div className="absolute right-0 top-8 z-10 w-44 rounded-xl bg-card border border-border shadow-xl overflow-hidden">
                        {file.kind === "link" ? (
                          <button onClick={() => openItem(file)} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-secondary text-foreground">
                            <ExternalLink className="w-4 h-4" /> Open link
                          </button>
                        ) : (
                          <button onClick={() => download(file)} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-secondary text-foreground">
                            <Download className="w-4 h-4" /> Download
                          </button>
                        )}
                        <button onClick={() => share(file)} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-secondary text-foreground">
                          <Share2 className="w-4 h-4" /> Share
                        </button>
                        <button onClick={() => toggleStar(file)} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-secondary text-foreground">
                          <Star className="w-4 h-4" /> {file.is_starred ? "Unstar" : "Star"}
                        </button>
                        {file.kind !== "link" && (
                          <button onClick={() => toggleEncrypt(file)} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-secondary text-foreground">
                            <Lock className="w-4 h-4" /> {file.is_encrypted ? "Remove encryption" : "Encrypt"}
                          </button>
                        )}
                        <button onClick={() => doDelete(file)} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-secondary text-destructive">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((file) => {
              const meta = fileIcons[file.kind] || fileIcons.other;
              const isSelected = selectedIds.includes(file.id);
              const thumb = file.storage_path ? thumbs[file.storage_path] : undefined;
              return (
                <div
                  key={file.id}
                  className={`rounded-2xl border overflow-hidden transition-colors ${
                    isSelected ? "bg-primary/10 border-primary/30" : "bg-card border-border"
                  }`}
                  onClick={() => toggleSelect(file.id)}
                >
                  {thumb ? (
                    <div className="w-full aspect-square relative">
                      <img src={thumb} alt={file.name} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        </div>
                      )}
                      {file.is_encrypted && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center">
                          <Lock className="w-3 h-3 text-emerald-400" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`w-full aspect-square ${meta.bg} flex items-center justify-center`}>
                      <meta.icon className={`w-10 h-10 ${meta.color}`} />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {file.kind === "link" ? "Link" : formatBytes(file.size_bytes)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 mx-4 max-w-md md:mx-auto rounded-2xl bg-card border border-border p-3 flex items-center justify-between shadow-2xl">
          <span className="text-sm text-foreground font-medium">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedIds([])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-sm text-foreground">
              Clear
            </button>
            <button onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/20 text-sm text-destructive">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
