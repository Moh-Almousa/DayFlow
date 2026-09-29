# CUSTOMIZE — دليل التعديل السريع

كل التعديلات الشائعة موجودة في **ملفين فقط**:

| الملف | ماذا فيه |
|---|---|
| `config/site-config.js` | الاسم، المستخدم، الألوان، الخطوط، اللغة الافتراضية، Pomodoro، Categories، الروابط، إعدادات Dashboard |
| `config/texts.js` | كل نصوص الواجهة (أزرار، عناوين، رسائل) بالعربية والإنكليزية |

بعد أي تعديل: احفظ الملف ثم أعد تحميل الصفحة بـ **Ctrl + Shift + R** (أو Cmd + Shift + R على Mac).

> القاعدة الذهبية: عدّل القيمة فقط، ولا تحذف علامات التنصيص `" "` ولا الفاصلة `,` في نهاية السطر.

---

## الأساسيات

### تغيير اسم الموقع
`config/site-config.js` → السطر `appName`
```js
appName: "DayFlow",
```
والشعار الصغير تحت الاسم → `appTagline` (له نسخة `en` ونسخة `ar`).

### تغيير اسم المستخدم (في "صباح الخير، ...")
`config/site-config.js` → السطر `userName`
```js
userName: "Mohammad",
```

### تغيير اللغة الافتراضية
`config/site-config.js` → قسم `2) LANGUAGE` → `default`
```js
default: "ar",   // أو "en"
```
ملاحظة: إذا ضغطت زر تبديل اللغة سابقاً، يتذكر المتصفح اختيارك ويتجاهل هذه القيمة.
لإرجاع الافتراضي: بدّل اللغة من الإعدادات أو امسح بيانات الموقع من المتصفح.

### أرقام عربية (١٢٣) بدل (123)
`config/site-config.js` → `language.available.ar.locale`
```js
locale: "ar-SY",              // أرقام عربية ١٢٣
locale: "ar-SY-u-nu-latn",    // أرقام 123 (الافتراضي)
```

---

## الألوان والمظهر

### تغيير الألوان
`config/site-config.js` → قسم `3) THEME`
- الوضع الفاتح → داخل `light: { ... }`
- الوضع الداكن → داخل `dark: { ... }`

أهم لون هو `primary` (لون الأزرار والروابط). مثال لتغييره إلى أزرق:
```js
primary:     "#2563EB",
primarySoft: "#E8EFFD",   // نسخة فاتحة جداً من نفس اللون
```
غيّر `primary` في `dark` أيضاً (استخدم درجة أفتح لأن الخلفية داكنة).

### الوضع الافتراضي (فاتح / داكن / حسب الجهاز)
`config/site-config.js` → `theme.defaultMode`
```js
defaultMode: "light",   // "light" | "dark" | "system"
```

### استدارة الزوايا
`config/site-config.js` → `theme.radius` و `theme.radiusSmall`

### تغيير الخط
`config/site-config.js` → قسم `4) FONTS`
- `en` → خط الواجهة الإنكليزية
- `ar` → خط الواجهة العربية
- `googleFontsUrl` → رابط Google Fonts (اتركه `""` لاستخدام خطوط الجهاز فقط)

---

## المهام والتخطيط

### تغيير مدة Pomodoro
`config/site-config.js` → قسم `10) POMODORO`
```js
pomodoro: {
  focusMinutes: 25,          // مدة التركيز
  breakMinutes: 5,           // الاستراحة القصيرة
  longBreakMinutes: 15,      // الاستراحة الطويلة
  sessionsBeforeLongBreak: 4,
  playSound: true,           // صوت عند انتهاء الجلسة
},
```

### إضافة Category (تصنيف)
`config/site-config.js` → قسم `8) CATEGORIES` → انسخ سطراً وعدّله:
```js
{ id: "family", label: { en: "Family", ar: "عائلة" }, color: "#DB2777" },
```
- `id` بالإنكليزية وبدون مسافات، ولا تغيّره لاحقاً (المهام القديمة مرتبطة به).
- لحذف تصنيف: احذف سطره (المهام القديمة ستظهر تحت آخر تصنيف في القائمة).

### تغيير أسماء أو ألوان الأولويات
`config/site-config.js` → قسم `9) PRIORITIES` → غيّر `label` و `color` فقط (لا تغيّر `id`).

### خيارات المدة والتذكير في نموذج المهمة
`config/site-config.js`:
- `durationOptions` → قائمة المدد بالدقائق
- `reminderOptions` → التذكير قبل البداية بالدقائق (`0` = عند البداية)
- `taskDefaults` → المدة والأولوية والتصنيف الافتراضي لأي مهمة جديدة

### حدود "اليوم الواقعي" في Dashboard
`config/site-config.js` → قسم `6) DASHBOARD`
```js
maxDailyTasks: 8,     // تنبيه إذا زادت المهام عن هذا العدد
maxPlannedHours: 8,   // تنبيه إذا زاد الوقت المخطط عن هذه الساعات
topPrioritiesCount: 3,
goalsCount: 3,
showGoals: true,
showHabits: true,
```

### مدة "سجل التقدم" في بطاقة الهدف
`config/site-config.js` → قسم `6.1) GOALS`
```js
goals: {
  historyDays: 90,   // عدد الأيام المعروضة في الرسم
},
```
(هذا يغيّر العرض فقط؛ السجل الكامل يبقى محفوظاً.)

### أول يوم في الأسبوع
`config/site-config.js` → `weekStartsOn` (`6` = السبت، `0` = الأحد، `1` = الاثنين)

---

## النصوص والقوائم

### تغيير أي نص في الواجهة
افتح `config/texts.js` واستخدم البحث (Ctrl + F) عن النص الحالي، ثم عدّله.
النص موجود مرتين: مرة في قسم `en` ومرة في قسم `ar`.

مثال: تغيير التحية الصباحية → ابحث عن `greeting`:
```js
morning: "صباح الخير، {name}",
```
الكلمات بين `{ }` مثل `{name}` تُستبدل تلقائياً — لا تحذفها.

### إخفاء صفحة من القائمة أو تغيير ترتيبها
`config/site-config.js` → قسم `5) NAVIGATION`
```js
navigation: ["dashboard", "today", "goals", "habits", "review", "weekly", "achievements", "focus"],
mobileNavigation: ["dashboard", "today", "focus", "habits"],  // الشريط السفلي على الهاتف (4 كحد أقصى)
```

---

## الروابط والـ Footer

### تغيير GitHub URL
`config/site-config.js` → قسم `11) FOOTER & LINKS`
```js
githubUrl: "https://github.com/USERNAME/REPO",
```
اتركه `""` لإخفاء الرابط.

### نص الـ Footer
نفس القسم → `footer.text` (نسخة `en` ونسخة `ar`). لإخفاء الـ Footer: `show: false`.

---

## البيانات

### أن يبدأ التطبيق فارغاً (بدون Demo Data)
`config/site-config.js` → `demo.loadOnFirstRun: false`
(يؤثر فقط على أول تشغيل. إذا كانت البيانات التجريبية ظاهرة الآن: الإعدادات ← حذف البيانات التجريبية.)

### التذكير بالنسخ الاحتياطي وحماية التخزين
`config/site-config.js` → قسم `13) BACKUP`
```js
backup: {
  reminderDays: 7,                // بعد كم يوم بدون تصدير يظهر التذكير (0 = إيقاف التذكير)
  requestPersistentStorage: true, // يطلب من المتصفح عدم حذف البيانات تلقائياً
},
```

### تعديل البيانات التجريبية نفسها
`data/demo-data.js`

### بدء التطبيق من الصفر بدون فقدان البيانات القديمة نهائياً
الإعدادات ← **تصدير البيانات** (نسخة احتياطية JSON) ← **حذف كل البيانات**.
لاسترجاعها: الإعدادات ← **استيراد البيانات**.

---

## أين يوجد كل شيء آخر؟ (للمرجع فقط)

| إذا أردت تعديل... | الملف |
|---|---|
| شكل الصفحة (مسافات، أحجام) | `css/style.css` |
| الشكل على الهاتف | `css/responsive.css` |
| الأيقونات | `js/icons.js` |
| صفحة معينة | `js/dashboard.js`، `js/today.js`، `js/goals.js`، `js/habits.js`، `js/review.js`، `js/weekly.js`، `js/focus.js`، `js/settings.js` |
