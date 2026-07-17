// ═══════════════════════════════════════════════════════════════════
// VaultPi — الترجمة (i18n) — قاموس محلّي آمن للخصوصية.
// يترجم واجهة التطبيق فقط (ليس بيانات المستخدم) — لا اتصال خارجي.
// ═══════════════════════════════════════════════════════════════════

export type LangCode = "en" | "ar";

export const LANGUAGES: { label: string; code: LangCode; rtl?: boolean }[] = [
  { label: "English (US)", code: "en" },
  { label: "العربية", code: "ar", rtl: true },
];

export function labelToCode(label: string): LangCode {
  return LANGUAGES.find((l) => l.label === label)?.code ?? "en";
}

export function isRtl(label: string): boolean {
  return !!LANGUAGES.find((l) => l.label === label)?.rtl;
}

// قاموس عربي — مفاتيح = النص الإنجليزي المعروض (مطابقة تامة بعد trim)
export const AR: Record<string, string> = {
  // العناوين والتبويبات
  "My Files": "ملفاتي",
  "AI Assistant": "المساعد الذكي",
  "Settings": "الإعدادات",
  "Privacy & Recovery": "الخصوصية والاسترجاع",
  "Notes": "المذكرات",
  "Home": "الرئيسية",
  "Files": "الملفات",
  "AI": "الذكاء",
  "Menu": "القائمة",
  "← Back": "← رجوع",

  // إجراءات عامة
  "Upload": "رفع",
  "Sync": "مزامنة",
  "See all": "عرض الكل",
  "New": "جديد",
  "Add": "إضافة",
  "Save": "حفظ",
  "Save changes": "حفظ التغييرات",
  "Saving...": "جارٍ الحفظ...",
  "Cancel": "إلغاء",
  "Delete": "حذف",
  "Share": "مشاركة",
  "Download": "تنزيل",
  "Open link": "فتح الرابط",
  "Manage": "إدارة",
  "Star": "تمييز",
  "Unstar": "إلغاء التمييز",
  "Encrypt": "تشفير",
  "Remove encryption": "إزالة التشفير",
  "Clear": "مسح",
  "None": "بلا",
  "All": "الكل",

  // لوحة التحكم
  "Vault Storage": "مخزن الخزنة",
  "Encrypted": "مشفّر",
  "Categories": "التصنيفات",
  "Photos": "الصور",
  "Videos": "الفيديوهات",
  "Documents": "المستندات",
  "Links": "الروابط",
  "Docs": "مستندات",
  "Other": "أخرى",
  "Recent Files": "أحدث الملفات",
  "No files yet — tap to upload your first item": "لا ملفات بعد — اضغط لرفع أول عنصر",
  "saved · quick memos & ideas": "محفوظة · ملاحظات وأفكار سريعة",
  "Activity": "النشاط",
  "No recent activity.": "لا يوجد نشاط حديث.",
  "Folders": "المجلدات",
  "No folders yet.": "لا توجد مجلدات بعد.",
  "Folder name": "اسم المجلد",
  "Vault synced": "تمت مزامنة الخزنة",
  "Folder created": "تم إنشاء المجلد",
  "File uploaded": "تم رفع ملف",
  "Item deleted": "تم حذف عنصر",
  "Note saved": "تم حفظ المذكرة",
  "Link saved": "تم حفظ الرابط",

  // الملفات
  "items": "عناصر",
  "selected": "محدّد",
  "Starred": "المميّزة",
  "Name": "الاسم",
  "Date": "التاريخ",
  "Size": "الحجم",
  "Type": "النوع",
  "No items yet": "لا عناصر بعد",
  "Tap the + button to upload files, photos, videos or links.":
    "اضغط زر + لرفع ملفات أو صور أو فيديو أو روابط.",
  "Link copied to clipboard": "تم نسخ الرابط",
  "Deleted": "تم الحذف",
  "Selected items deleted": "تم حذف العناصر المحددة",
  "Link": "رابط",

  // نافذة الرفع
  "Upload to Vault": "الرفع إلى الخزنة",
  "Photo": "صورة",
  "Video": "فيديو",
  "Document": "مستند",
  "Title (optional)": "العنوان (اختياري)",
  "Camera": "الكاميرا",
  "Browse": "تصفّح",
  "Encrypt on upload": "التشفير عند الرفع",
  "Mark as AES-256 protected": "وسمها كمحميّة AES-256",
  "Save Link": "حفظ الرابط",
  "Select a type to continue": "اختر نوعاً للمتابعة",
  "Saved Successfully": "تم الحفظ بنجاح",
  "Your item is now securely stored in PiVault": "عنصرك محفوظ الآن بأمان في PiVault",
  "Uploading & securing...": "جارٍ الرفع والتأمين...",
  "Saving link...": "جارٍ حفظ الرابط...",
  "AES-256 encryption applied": "تم تطبيق تشفير AES-256",
  "Stored securely": "مخزّن بأمان",
  "Storage quota exceeded. Free up space or upgrade your plan.":
    "تجاوزت مساحة التخزين. أفرغ مساحة أو رقِّ باقتك.",
  "Upload failed. Please try again.": "فشل الرفع. حاول مجدداً.",
  "Please enter a URL.": "الرجاء إدخال رابط.",
  "Could not save the link. Please try again.": "تعذّر حفظ الرابط. حاول مجدداً.",

  // المذكرات
  "New Note": "مذكرة جديدة",
  "No notes yet": "لا مذكرات بعد",
  "Capture ideas, lists and memos — all encrypted in your vault.":
    "دوّن الأفكار والقوائم والملاحظات — كلها مشفّرة في خزنتك.",
  "Note title": "عنوان المذكرة",
  "Start writing... your notes are encrypted and stored securely in your vault.":
    "ابدأ الكتابة... مذكراتك مشفّرة ومخزّنة بأمان في خزنتك.",
  "Pin": "تثبيت",
  "Unpin": "إلغاء التثبيت",
  "Note deleted": "تم حذف المذكرة",
  "Could not save note": "تعذّر حفظ المذكرة",

  // المساعد الذكي
  "Smart Assistant": "المساعد الذكي",
  "Search across everything in your vault, get instant insights, and organize with smart collections.":
    "ابحث في كل ما بخزنتك، واحصل على رؤى فورية، ونظّم بمجموعات ذكية.",
  "Assistant": "المساعد",
  "Results": "النتائج",
  "Smart Collections": "مجموعات ذكية",
  "Large Files": "ملفات كبيرة",
  "Over 100 MB": "أكبر من 100 ميغابايت",
  "Recently Added": "أُضيفت مؤخراً",
  "Last 7 days": "آخر 7 أيام",
  "AES-256 protected": "محميّة AES-256",
  "Your favourites": "مفضّلاتك",
  "Your Tags": "وسومك",
  "No tags yet. Tags you add to items will appear here.":
    "لا وسوم بعد. ستظهر هنا الوسوم التي تضيفها للعناصر.",

  // الإعدادات
  "plan": "باقة",
  "Security": "الأمان",
  "Biometric Lock": "قفل بيومتري",
  "Require Face ID / fingerprint": "طلب بصمة الوجه / الإصبع",
  "Encrypt All Files": "تشفير كل الملفات",
  "AES-256 encryption by default": "تشفير AES-256 افتراضياً",
  "Change Vault PIN": "تغيير رمز الخزنة",
  "Update your 6-digit vault PIN": "حدّث رمز خزنتك المكوّن من 6 أرقام",
  "Quick Shortcut Dock": "اختصار سريع على الحافة",
  "Floating edge shortcut, drag to reposition": "اختصار عائم على الحافة، اسحبه لتغيير موضعه",
  "Preferences": "التفضيلات",
  "Notifications": "الإشعارات",
  "Upload, sync and security alerts": "تنبيهات الرفع والمزامنة والأمان",
  "Auto Sync": "مزامنة تلقائية",
  "Keep the vault in sync": "إبقاء الخزنة متزامنة",
  "Offline Mode": "وضع دون اتصال",
  "Cache items for offline access": "تخزين العناصر للوصول دون إنترنت",
  "Dark Mode": "الوضع الداكن",
  "Always use dark theme": "استخدم المظهر الداكن دائماً",
  "Language": "اللغة",
  "Change": "تغيير",
  "Backup & Recovery": "النسخ الاحتياطي والاسترجاع",
  "Your files, notes and links are stored encrypted in the cloud and available on any device you sign in with Pi.":
    "ملفاتك ومذكراتك وروابطك مخزّنة مشفّرة في السحابة ومتاحة على أي جهاز تدخل به عبر Pi.",
  "Verify Backup": "التحقق من النسخة",
  "Checking...": "جارٍ التحقق...",
  "Breach Alerts": "تنبيهات الاختراق",
  "Anomaly detection on vault access": "كشف الشذوذ في الوصول للخزنة",
  "Active": "مفعّل",
  "Help & Support": "المساعدة والدعم",
  "Sign Out": "تسجيل الخروج",
  "Pi Network Verified": "موثّق عبر Pi Network",

  // الخصوصية
  "Privacy Status": "حالة الخصوصية",
  "Encryption": "التشفير",
  "Encrypted Items": "العناصر المشفّرة",
  "Pi Identity Protected": "هوية Pi محميّة",
  "Only you, signed in with Pi, can access this vault.":
    "أنت وحدك، بتسجيل دخول Pi، تستطيع الوصول لهذه الخزنة.",
  "Your Data": "بياناتك",
  "Activity Log": "سجل النشاط",
  "Recent": "الأحدث",
  "No activity recorded yet.": "لا نشاط مسجّل بعد.",
  "Encrypted Storage": "تخزين مشفّر",
  "Current Usage": "الاستخدام الحالي",

  // الاختصار العائم
  "Quick Actions": "إجراءات سريعة",
  "No shortcuts — tap the gear to add.": "لا اختصارات — اضغط الترس للإضافة.",
  "Customize": "تخصيص",
  "Shortcuts": "الاختصارات",
  "Side": "الجهة",
  "Opacity": "الشفافية",
  "Hide dock (re-enable in Settings)": "إخفاء الاختصار (يُعاد تفعيله من الإعدادات)",

  // نافذة إدارة العنصر
  "Manage Item": "إدارة العنصر",
  "Folder": "المجلد",
  "Tags": "الوسوم",
  "New tag": "وسم جديد",
  "Saved": "تم الحفظ",

  // شاشة الدخول
  "Pi Network Authentication": "مصادقة Pi Network",
  "Authentication Failed": "فشلت المصادقة",
  "Retry Authentication": "إعادة المحاولة",
  "Initializing Pi Network...": "تهيئة Pi Network...",
  "Authenticating with Pi Network...": "المصادقة مع Pi Network...",
  "Securing your vault...": "تأمين خزنتك...",
  "Loading Pi Network SDK...": "تحميل حزمة Pi Network...",

  // وقت
  "just now": "الآن",
};

export const DICTS: Record<LangCode, Record<string, string>> = { en: {}, ar: AR };
