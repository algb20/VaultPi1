"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import * as db from "@/lib/vaultpi/db";
import type { VaultItem } from "@/lib/vaultpi/types";

export function MediaViewer({
  items,
  startIndex,
  onClose,
}: {
  items: VaultItem[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const item = items[index];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setUrl(null);
    if (item?.storage_path) {
      db.getSignedUrl(item.storage_path)
        .then((u) => {
          if (active) {
            setUrl(u);
            setLoading(false);
          }
        })
        .catch(() => active && setLoading(false));
    } else {
      setLoading(false);
    }
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : i));
  const next = () => setIndex((i) => (i < items.length - 1 ? i + 1 : i));

  const download = async () => {
    if (!item?.storage_path) return;
    const u = await db.getSignedUrl(item.storage_path, { download: true });
    if (u) window.open(u, "_blank");
  };
  const share = async () => {
    if (!item?.storage_path) return;
    const u = await db.getSignedUrl(item.storage_path);
    if (!u) return;
    try {
      if ((navigator as any).share) await (navigator as any).share({ title: item.name, url: u });
      else {
        await navigator.clipboard.writeText(u);
        toast.success("Link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={onClose} aria-label="Close">
          <X className="w-6 h-6" />
        </button>
        <span className="text-sm truncate max-w-[55%]">{item.name}</span>
        <div className="flex gap-4">
          <button onClick={share} aria-label="Share">
            <Share2 className="w-5 h-5" />
          </button>
          <button onClick={download} aria-label="Download">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {loading ? (
          <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
        ) : url && item.kind === "video" ? (
          <video src={url} controls autoPlay className="max-h-full max-w-full" />
        ) : url ? (
          <img src={url} alt={item.name} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-white/60 text-sm">Cannot load this item</p>
        )}

        {index > 0 && (
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        {index < items.length - 1 && (
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="text-center text-white/50 text-xs py-2">
        {index + 1} / {items.length}
      </div>
    </div>
  );
}
