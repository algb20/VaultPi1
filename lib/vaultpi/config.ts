// ═══════════════════════════════════════════════════════════════════
// VaultPi — إعداد الاتصال بـ Supabase (مكتوب مباشرة مثل دابيا).
// المفتاح العام (anon/publishable) آمن للنشر في الواجهة.
// ═══════════════════════════════════════════════════════════════════

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://shsuznbuaxkkykvgbklb.supabase.co";

// مفتاح anon العلني (JWT) — متوافق مع كل إصدارات supabase-js
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoc3V6bmJ1YXhra3lrdmdia2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyODQ1OTYsImV4cCI6MjA5OTg2MDU5Nn0.jU4JXkQLDe-kqRZU344-NmVH55fzqEv2uz0iLVtH4eg";

export const VAULT_BUCKET = "vault";

export const fnUrl = (name: string) => `${SUPABASE_URL}/functions/v1/${name}`;
