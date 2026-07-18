"use client";

// ═══════════════════════════════════════════════════════════════════
// VaultPi — طبقة الوصول للبيانات (عميل Supabase مباشر + RLS، مثل دابيا)
// كل الدوال تعمل ضمن جلسة المستخدم؛ RLS يضمن أنه لا يرى إلا بياناته.
// ═══════════════════════════════════════════════════════════════════

import { getSupabase } from "./client";
import { VAULT_BUCKET } from "./config";
import type {
  Activity,
  DockConfig,
  Folder,
  ItemKind,
  Overview,
  Profile,
  Tag,
  VaultItem,
  VaultSettings,
} from "./types";

const sb = () => getSupabase();

async function myId(): Promise<string> {
  const { data } = await sb().auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error("not_authenticated");
  return id;
}

function sanitizeName(name: string): string {
  return (name || "file")
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export function kindFromFile(mime: string, fileName: string): ItemKind {
  const m = (mime || "").toLowerCase();
  const n = (fileName || "").toLowerCase();
  if (m.startsWith("image/")) return "photo";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|flac|aac)$/.test(n)) return "audio";
  if (/\.(zip|rar|7z|tar|gz|bz2)$/.test(n) || m.includes("zip") || m.includes("compressed"))
    return "archive";
  if (
    /\.(pdf|docx?|xlsx?|pptx?|txt|csv|md|rtf|odt|ods|odp)$/.test(n) ||
    m.includes("pdf") ||
    m.includes("word") ||
    m.includes("excel") ||
    m.includes("spreadsheet") ||
    m.includes("presentation") ||
    m.includes("text/")
  )
    return "document";
  return "other";
}

// ── الملف الشخصي ────────────────────────────────────────────────────
export async function getProfile(): Promise<Profile | null> {
  const id = await myId();
  const { data } = await sb().from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function updateSettings(patch: Partial<VaultSettings>): Promise<VaultSettings> {
  const id = await myId();
  const current = await getProfile();
  const merged = { ...(current?.settings ?? {}), ...patch } as VaultSettings;
  const { data, error } = await sb()
    .from("profiles")
    .update({ settings: merged })
    .eq("id", id)
    .select("settings")
    .single();
  if (error) throw error;
  return data!.settings as VaultSettings;
}

export async function updateDock(patch: Partial<DockConfig>): Promise<DockConfig> {
  const id = await myId();
  const current = await getProfile();
  const merged = { ...(current?.dock_config ?? {}), ...patch } as DockConfig;
  const { data, error } = await sb()
    .from("profiles")
    .update({ dock_config: merged })
    .eq("id", id)
    .select("dock_config")
    .single();
  if (error) throw error;
  return data!.dock_config as DockConfig;
}

// ── العناصر (ملفات/صور/فيديو/مستندات/روابط/مذكرات) ─────────────────
export interface ItemFilter {
  kind?: ItemKind | "all";
  folderId?: string | null;
  starred?: boolean;
  trashed?: boolean;
  search?: string;
}

export async function listItems(f: ItemFilter = {}): Promise<VaultItem[]> {
  let q = sb()
    .from("items")
    .select("*")
    .eq("is_trashed", !!f.trashed)
    .eq("upload_status", "ready")
    .order("created_at", { ascending: false });
  if (f.kind && f.kind !== "all") q = q.eq("kind", f.kind);
  if (f.starred) q = q.eq("is_starred", true);
  if (f.folderId) q = q.eq("folder_id", f.folderId);
  if (f.search && f.search.trim()) q = q.ilike("name", `%${f.search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as VaultItem[];
}

export async function createLink(
  name: string,
  url: string,
  folderId?: string | null,
): Promise<VaultItem> {
  const user_id = await myId();
  const { data, error } = await sb()
    .from("items")
    .insert({
      user_id,
      kind: "link",
      name: name?.trim() || url,
      link_url: url,
      folder_id: folderId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  void logActivity("link", data.name, data.id);
  return data as VaultItem;
}

export async function createNote(
  name: string,
  content: string,
  folderId?: string | null,
): Promise<VaultItem> {
  const user_id = await myId();
  const { data, error } = await sb()
    .from("items")
    .insert({
      user_id,
      kind: "note",
      name: name?.trim() || "Untitled note",
      note_content: content,
      folder_id: folderId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  void logActivity("note", data.name, data.id);
  return data as VaultItem;
}

export async function updateItem(
  id: string,
  patch: Partial<
    Pick<
      VaultItem,
      "name" | "note_content" | "folder_id" | "is_starred" | "is_pinned" | "is_trashed" | "is_encrypted"
    >
  >,
): Promise<VaultItem> {
  const { data, error } = await sb().from("items").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as VaultItem;
}

export async function toggleStar(id: string, val: boolean) {
  return updateItem(id, { is_starred: val });
}

export async function trashItem(id: string) {
  return updateItem(id, { is_trashed: true });
}

export async function deleteItem(item: VaultItem): Promise<void> {
  if (item.storage_path) {
    await sb().storage.from(VAULT_BUCKET).remove([item.storage_path]);
  }
  const { error } = await sb().from("items").delete().eq("id", item.id);
  if (error) throw error;
  void logActivity("delete", item.name, null);
}

// رفع ملف حقيقي: صف "uploading" → رفع للتخزين → تعليمه "ready"
export async function uploadFile(
  file: File,
  opts: { folderId?: string | null; encrypt?: boolean; kindOverride?: ItemKind } = {},
): Promise<VaultItem> {
  const user_id = await myId();
  const profile = await getProfile();
  const used = await getStorageUsed();
  if (profile && used + file.size > profile.storage_quota) {
    throw new Error("quota_exceeded");
  }
  const kind = opts.kindOverride ?? kindFromFile(file.type, file.name);

  let folderId = opts.folderId ?? null;
  if (!folderId && (profile?.settings?.autoOrganize ?? true)) {
    try {
      folderId = await ensureFolderByKind(kind);
    } catch {
      /* ignore auto-organize errors */
    }
  }

  const { data: item, error: e1 } = await sb()
    .from("items")
    .insert({
      user_id,
      kind,
      name: file.name,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      is_encrypted: !!opts.encrypt,
      folder_id: folderId,
      upload_status: "uploading",
    })
    .select()
    .single();
  if (e1) throw e1;

  const path = `${user_id}/${item.id}/${sanitizeName(file.name)}`;
  const { error: e2 } = await sb()
    .storage.from(VAULT_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: true });
  if (e2) {
    await sb().from("items").delete().eq("id", item.id);
    throw e2;
  }

  const { data: item2, error: e3 } = await sb()
    .from("items")
    .update({ storage_path: path, upload_status: "ready" })
    .eq("id", item.id)
    .select()
    .single();
  if (e3) throw e3;

  void logActivity("upload", file.name, item.id);
  return item2 as VaultItem;
}

export async function getSignedUrl(
  path: string,
  opts: { download?: boolean; expiresIn?: number } = {},
): Promise<string | null> {
  const { data } = await sb()
    .storage.from(VAULT_BUCKET)
    .createSignedUrl(path, opts.expiresIn ?? 3600, { download: opts.download });
  return data?.signedUrl ?? null;
}

// روابط موقّعة لعدة كائنات دفعة واحدة (لعرض الصور/المصغّرات)
export async function getSignedUrls(paths: string[]): Promise<Record<string, string>> {
  const clean = paths.filter(Boolean);
  if (!clean.length) return {};
  const { data } = await sb().storage.from(VAULT_BUCKET).createSignedUrls(clean, 3600);
  const map: Record<string, string> = {};
  (data ?? []).forEach((d: any) => {
    if (d?.path && d?.signedUrl) map[d.path] = d.signedUrl;
  });
  return map;
}

export async function getStorageUsed(): Promise<number> {
  const { data } = await sb()
    .from("items")
    .select("size_bytes")
    .eq("upload_status", "ready")
    .eq("is_trashed", false);
  return (data ?? []).reduce((s: number, r: any) => s + (r.size_bytes || 0), 0);
}

// ── المجلدات ────────────────────────────────────────────────────────
export async function listFolders(): Promise<Folder[]> {
  const { data } = await sb().from("folders").select("*").order("created_at", { ascending: true });
  return (data ?? []) as Folder[];
}

export async function createFolder(name: string, color = "primary"): Promise<Folder> {
  const user_id = await myId();
  const { data, error } = await sb()
    .from("folders")
    .insert({ user_id, name: name.trim(), color })
    .select()
    .single();
  if (error) throw error;
  void logActivity("folder", name, null);
  return data as Folder;
}

const KIND_FOLDER: Record<string, string> = {
  photo: "Photos",
  video: "Videos",
  document: "Documents",
  audio: "Audio",
  archive: "Archives",
  link: "Links",
  other: "Other",
};

// الترتيب التلقائي: يجد/ينشئ مجلداً حسب نوع الملف
export async function ensureFolderByKind(kind: ItemKind): Promise<string | null> {
  const name = KIND_FOLDER[kind] || "Other";
  const folders = await listFolders();
  const existing = folders.find((f) => f.name === name);
  if (existing) return existing.id;
  const created = await createFolder(name);
  return created.id;
}

export async function deleteFolder(id: string) {
  const { error } = await sb().from("folders").delete().eq("id", id);
  if (error) throw error;
}

// ── الوسوم ──────────────────────────────────────────────────────────
export async function listTags(): Promise<Tag[]> {
  const [{ data: tags }, { data: links }] = await Promise.all([
    sb().from("tags").select("*").order("name", { ascending: true }),
    sb().from("item_tags").select("tag_id"),
  ]);
  const counts: Record<string, number> = {};
  (links ?? []).forEach((l: any) => {
    counts[l.tag_id] = (counts[l.tag_id] || 0) + 1;
  });
  return (tags ?? []).map((t: any) => ({ ...t, count: counts[t.id] || 0 })) as Tag[];
}

export async function createTag(name: string, color = "primary"): Promise<Tag> {
  const user_id = await myId();
  const { data, error } = await sb()
    .from("tags")
    .insert({ user_id, name: name.trim(), color })
    .select()
    .single();
  if (error) throw error;
  return data as Tag;
}

export async function setItemTags(itemId: string, tagIds: string[]) {
  await sb().from("item_tags").delete().eq("item_id", itemId);
  if (tagIds.length) {
    await sb()
      .from("item_tags")
      .insert(tagIds.map((tag_id) => ({ item_id: itemId, tag_id })));
  }
}

export async function getItemTagIds(itemId: string): Promise<string[]> {
  const { data } = await sb().from("item_tags").select("tag_id").eq("item_id", itemId);
  return (data ?? []).map((r: any) => r.tag_id as string);
}

// ── سجل النشاط ──────────────────────────────────────────────────────
export async function logActivity(action: string, detail: string, itemId: string | null) {
  try {
    const user_id = await myId();
    await sb().from("activity_log").insert({ user_id, action, detail, item_id: itemId });
  } catch {
    /* غير حرِج */
  }
}

export async function listActivity(limit = 20): Promise<Activity[]> {
  const { data } = await sb()
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Activity[];
}

// ── ملخّص لوحة التحكم ───────────────────────────────────────────────
export async function getOverview(): Promise<Overview> {
  const profile = await getProfile();
  const { data } = await sb()
    .from("items")
    .select("*")
    .eq("is_trashed", false)
    .eq("upload_status", "ready")
    .order("created_at", { ascending: false });
  const all = (data ?? []) as VaultItem[];
  const counts: Partial<Record<ItemKind, number>> = {};
  let used = 0;
  for (const it of all) {
    counts[it.kind] = (counts[it.kind] || 0) + 1;
    used += it.size_bytes || 0;
  }
  return {
    storageUsed: used,
    storageQuota: profile?.storage_quota ?? 5368709120,
    total: all.length,
    counts,
    recent: all.slice(0, 6),
  };
}

// ── أدوات مساعدة للعرض ──────────────────────────────────────────────
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
}

export function timeAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
