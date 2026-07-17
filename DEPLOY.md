# نشر PiVault (Deployment Guide)

بعد التعديلات، الدخول والخزنة يعملان بالكامل عبر **Pi SDK + Supabase**، فلا
حاجة لخلفية App Studio. اتبع أحد الخيارين لاستضافة التطبيق على نطاق ثابت.

---

## الخيار A — Netlify (موصى به)

1. ادخل إلى **app.netlify.com** ← **Add new site** ← **Import an existing project**.
2. اختر GitHub ← المستودع **`algb20/VaultPi1`** ← الفرع **`main`**.
3. Netlify يكتشف Next.js تلقائياً. الإعدادات (موجودة في `netlify.toml`):
   - Build command: `pnpm build`
   - سيُضاف Next.js plugin تلقائياً.
4. (اختياري للدفع فقط) في **Site settings ← Environment variables** أضف:
   - `PI_API_KEY` = مفتاح تطبيقك من Pi Developer Portal.
5. اضغط **Deploy**. بعد دقائق ستحصل على رابط مثل `https://vaultpi.netlify.app`.

> مفاتيح Supabase العامة مكتوبة داخل الكود (آمنة)، فلا تحتاج إضافتها.

---

## الخيار B — Vercel

1. ادخل إلى **vercel.com** ← **Add New… ← Project** ← استورد **`algb20/VaultPi1`**.
2. Framework: **Next.js** (يُكتشف تلقائياً)، الفرع **`main`**.
3. اضغط **Deploy**. ستحصل على رابط مثل `https://vaultpi.vercel.app`.

> ملاحظة: دوال الدفع في `netlify/functions` تخص Netlify فقط. الخزنة تعمل على
> Vercel بلا مشاكل (الدفع غير مستخدَم في الواجهة حالياً).

---

## خطوة إلزامية — تسجيل النطاق في Pi Developer Portal

حتى تختفي علامة ⚠️ ويعمل التطبيق داخل Pi Browser بشكل رسمي:

1. افتح **develop.pi** (بوابة مطوّري Pi) ← تطبيقك.
2. في **App URL / Hosting** ضع رابط النشر (مثلاً `https://vaultpi.netlify.app`).
3. Pi سيطلب التحقق من ملكية النطاق عبر ملف التحقق:
   - الملف موجود في `public/validation-key.txt` ويُخدَم تلقائياً على
     `https://<نطاقك>/validation-key.txt`.
   - إن طلبت Pi مفتاحاً مختلفاً، ضعه في `public/validation-key.txt` وأعد النشر.
4. احفظ. الآن افتح التطبيق داخل **Pi Browser** عبر رابط تطبيقك.

---

## بعد النشر
- افتح الرابط داخل **Pi Browser** (وليس متصفح عادي) — سيطلب إذن Pi ثم تدخل الخزنة.
- جرّب: رفع صورة/ملف، حفظ رابط، إنشاء مذكرة، وتحريك الاختصار على الحافة.
- كل شيء يُحفظ فعلياً في مشروع Supabase باسم **VaultPi**.

## استكشاف الأخطاء
- **شاشة "Pi Network Authentication" لا تكتمل خارج Pi Browser:** طبيعي —
  الدخول يعمل فقط داخل Pi Browser.
- **فشل الدخول داخل Pi Browser:** غالباً النطاق غير مسجّل في Pi Portal، أو
  دالة `vaultpi-auth` تحتاج مراجعة السجلّات في Supabase (Functions → Logs).
