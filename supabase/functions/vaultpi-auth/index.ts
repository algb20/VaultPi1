// ═══════════════════════════════════════════════════════════════════
// VaultPi — دالة الجسر (vaultpi-auth)
// تحوّل رمز دخول Pi Network إلى جلسة Supabase حقيقية.
//   1) تتحقق من رمز Pi عبر https://api.minepi.com/v2/me
//   2) تنشئ/تجد مستخدم Auth مرتبطاً بمعرّف Pi (كلمة سر حتمية لا تُكشف للعميل)
//   3) تنشئ/تحدّث الملف الشخصي (profiles)
//   4) تُسجّل الدخول من الخادم وتُعيد الجلسة للعميل
// بعدها يعمل التطبيق بعميل Supabase مباشر + RLS تماماً مثل دابيا.
//
// verify_jwt = false  (نتحقق من رمز Pi بأنفسنا داخل الدالة)
// ═══════════════════════════════════════════════════════════════════

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-pi-token, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
}

// كلمة سر قوية حتمية مشتقة من معرّف Pi — لا تُخزَّن ولا تُرسَل للعميل أبداً
async function derivePassword(uid: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SERVICE_ROLE),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode("vaultpi:" + uid),
  );
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "Pv1_" + hex;
}

function emailForUid(uid: string): string {
  const safe = uid.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `pi_${safe}@vaultpi.app`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const piToken =
      req.headers.get("x-pi-token") ||
      (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!piToken) return json({ error: "missing_pi_token" }, 401);

    // 1) تحقّق من رمز Pi
    const meRes = await fetch("https://api.minepi.com/v2/me", {
      headers: { Authorization: `Bearer ${piToken}` },
    });
    if (!meRes.ok) return json({ error: "pi_verification_failed" }, 401);
    const me = await meRes.json();
    const uid: string | undefined = me?.uid;
    const username: string = me?.username || "PiUser";
    if (!uid) return json({ error: "pi_no_uid" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });
    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });
    const email = emailForUid(uid);
    const password = await derivePassword(uid);

    // 2) جد الملف الشخصي بمعرّف Pi
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("pi_uid", uid)
      .maybeSingle();

    let userId: string | undefined = existing?.id;

    if (!userId) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { pi_uid: uid, username },
      });
      if (created?.user) {
        userId = created.user.id;
      } else {
        // احتمال: مستخدم Auth موجود لكن profile مفقود — تعافَ بتسجيل الدخول
        const { data: si } = await anon.auth.signInWithPassword({
          email,
          password,
        });
        userId = si?.user?.id;
        if (!userId) {
          return json(
            { error: "user_bootstrap_failed", detail: cErr?.message },
            500,
          );
        }
      }
    }

    // اضمن أن كلمة السر الحتمية والبريد مؤكَّدان (حتى ينجح تسجيل الدخول دائماً)
    await admin.auth.admin.updateUserById(userId!, {
      password,
      email_confirm: true,
    });

    // 3) أنشئ/حدّث الملف الشخصي
    await admin
      .from("profiles")
      .upsert(
        { id: userId!, pi_uid: uid, username },
        { onConflict: "id" },
      );

    // 4) سجّل الدخول من الخادم واحصل على الجلسة
    const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({
      email,
      password,
    });
    if (sErr || !signIn?.session) {
      return json({ error: "signin_failed", detail: sErr?.message }, 500);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId!)
      .single();

    return json({
      session: {
        access_token: signIn.session.access_token,
        refresh_token: signIn.session.refresh_token,
        expires_at: signIn.session.expires_at,
      },
      profile,
    });
  } catch (e) {
    return json({ error: "internal", detail: String(e) }, 500);
  }
});
