// أنواع بيانات VaultPi — مصدر واحد للحقيقة.

export type ItemKind =
  | "photo"
  | "video"
  | "document"
  | "link"
  | "audio"
  | "archive"
  | "other"
  | "note";

export interface VaultItem {
  id: string;
  user_id: string;
  kind: ItemKind;
  name: string;
  folder_id: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number;
  link_url: string | null;
  note_content: string | null;
  thumbnail_path: string | null;
  is_encrypted: boolean;
  is_starred: boolean;
  is_pinned: boolean;
  is_trashed: boolean;
  upload_status: "uploading" | "ready";
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface VaultSettings {
  notifications: boolean;
  autoSync: boolean;
  darkMode: boolean;
  biometric: boolean;
  encryptAll: boolean;
  offlineMode: boolean;
  language: string;
}

export interface DockConfig {
  enabled: boolean;
  side: "left" | "right";
  offset: number; // نسبة مئوية من ارتفاع الشاشة (0-100)
  opacity: number;
  actions: string[]; // upload | note | search | starred | files
}

export interface Profile {
  id: string;
  pi_uid: string;
  username: string;
  credits_balance: number;
  storage_used: number;
  storage_quota: number;
  settings: VaultSettings;
  dock_config: DockConfig;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  parent_id: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  count?: number;
}

export interface Activity {
  id: string;
  action: string;
  detail: string | null;
  item_id: string | null;
  created_at: string;
}

export interface Overview {
  storageUsed: number;
  storageQuota: number;
  total: number;
  counts: Partial<Record<ItemKind, number>>;
  recent: VaultItem[];
}
