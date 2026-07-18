"use client";

// مزوّد بيانات الخزنة — يحمّل عناصر/مجلدات/وسوم/نشاط المستخدم مرة واحدة
// ويشاركها مع كل الشاشات، مع reload() بعد أي تعديل.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as db from "@/lib/vaultpi/db";
import { getSupabase } from "@/lib/vaultpi/client";
import { usePiAuth } from "@/contexts/pi-auth-context";
import type { Activity, Folder, Profile, Tag, VaultItem } from "@/lib/vaultpi/types";

interface VaultContextType {
  loading: boolean;
  items: VaultItem[]; // كل العناصر الجاهزة غير المحذوفة (بما فيها المذكرات)
  files: VaultItem[]; // العناصر ما عدا المذكرات
  notes: VaultItem[]; // المذكرات فقط
  folders: Folder[];
  tags: Tag[];
  activity: Activity[];
  profile: Profile | null;
  storageUsed: number;
  storageQuota: number;
  reload: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export function VaultProvider({ children }: { children: ReactNode }) {
  const { profile: authProfile } = usePiAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const reload = useCallback(async () => {
    try {
      const [it, fo, tg, ac, pr] = await Promise.all([
        db.listItems({ kind: "all" }),
        db.listFolders(),
        db.listTags(),
        db.listActivity(25),
        db.getProfile(),
      ]);
      setItems(it);
      setFolders(fo);
      setTags(tg);
      setActivity(ac);
      setProfile(pr);
    } catch (e) {
      console.error("vault reload failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // المزامنة التلقائية: تحديث عند العودة للتطبيق + بث لحظي من Supabase Realtime
  useEffect(() => {
    const sb = getSupabase();
    let channel: ReturnType<typeof sb.channel> | null = null;

    const onVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    sb.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id;
      if (!uid) return;
      channel = sb
        .channel("vault-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "items", filter: `user_id=eq.${uid}` },
          () => void reload(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "folders", filter: `user_id=eq.${uid}` },
          () => void reload(),
        )
        .subscribe();
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (channel) sb.removeChannel(channel);
    };
  }, [reload]);

  const files = items.filter((i) => i.kind !== "note");
  const notes = items.filter((i) => i.kind === "note");
  const storageUsed = files.reduce((s, i) => s + (i.size_bytes || 0), 0);
  const storageQuota = (profile ?? authProfile)?.storage_quota ?? 5368709120;

  return (
    <VaultContext.Provider
      value={{
        loading,
        items,
        files,
        notes,
        folders,
        tags,
        activity,
        profile: profile ?? authProfile,
        storageUsed,
        storageQuota,
        reload,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const c = useContext(VaultContext);
  if (!c) throw new Error("useVault must be used within a VaultProvider");
  return c;
}
