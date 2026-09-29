# DayFlow — Personal Daily Planner

مخطط يومي شخصي هادئ: **Goals → Tasks → Daily Planning → Focus → Daily Review → Progress**.

موقع Static بالكامل (HTML + CSS + Vanilla JavaScript). لا Backend، لا Database، لا Build step.
يعمل مباشرة على GitHub Pages، ويدعم **العربية والإنكليزية** مع زر لتبديل اللغة.

📖 **كيف أستخدم التطبيق؟** → [USAGE.md](USAGE.md)  ·  🎨 **كيف أعدّله؟** → [CUSTOMIZE.md](CUSTOMIZE.md)

---

## 1. Project overview

- **Dashboard**: تحية، تاريخ اليوم، نسبة الإنجاز، المهمة الحالية/التالية، Timeline لليوم، أولويات اليوم، عادات اليوم، الأهداف.
- **Today**: مخطط يوم كامل مع التنقل بين الأيام، المهام المتأخرة من أيام سابقة، وتنبيه "يوم غير واقعي" إذا زادت المهام أو الساعات.
- **Goals**: أهداف طويلة المدى مع Milestones و Deadline ونسبة تقدم (تلقائية من المراحل أو يدوية) ومهام مرتبطة، و**سجل تقدم يومي** يظهر كرسم بياني.
- **Habits**: عادات بأيام تكرار، تسجيل يومي، سلسلة الإنجاز (streak) ونسبة الالتزام لآخر 30 يوم.
- **Review**: مراجعة نهاية اليوم (إحصائيات + 3 أسئلة) ونقل المهام غير المنجزة للغد.
- **Weekly**: ملخص الأسبوع + رسم بياني بسيط للمهام لكل يوم + تقدم الأهداف.
- **Achievements**: كل ما أنجزته حسب الشهر أو السنة: ملخص، رسم بياني، تقويم العادات، الأهداف المحققة والمراحل، وقائمة بكل المهام المنجزة مع بحث وفلترة.
- **Focus**: Pomodoro Timer مرتبط بمهمة (Start / Pause / Reset / Finish Task).
- **Settings**: اللغة، Light/Dark/System، الإشعارات، Export/Import/Reset، البيانات التجريبية.

## 2. Features

- إضافة / تعديل / حذف / إنجاز المهام، الأولوية، وقت البداية، المدة، الهدف، التصنيف، التذكير
- نقل المهمة زمنياً (تعديل الوقت/التاريخ، "نقل إلى الغد"، "نقل إلى اليوم" للمتأخرة)
- كشف تداخل المهام في نفس الوقت
- عربي (RTL) / إنكليزي (LTR) مع زر تبديل في القائمة وشريط الهاتف
- Dark mode محفوظ في localStorage
- Export (JSON) و Import و Reset مع نافذة تأكيد
- حماية البيانات: طلب Persistent Storage من المتصفح + تذكير أسبوعي بالنسخ الاحتياطي + الاحتفاظ بنسخة من البيانات إذا تعذرت قراءتها
- الأهداف المحققة تنتقل لقسم خاص بدل حذفها
- Demo data عند أول تشغيل، ويمكن حذفها بزر واحد
- Responsive: Sidebar على الشاشات الكبيرة، شريط سفلي + قائمة جانبية على الهاتف
- Accessibility: Semantic HTML، تنقل بالكيبورد، Focus states، aria labels، Esc لإغلاق النوافذ

## 3. How to run locally

**الطريقة الأسهل:** افتح ملف `index.html` مباشرة في المتصفح (دبل كليك). كل شيء يعمل.

**أو عبر local server** (أقرب لبيئة GitHub Pages):
```bash
cd dayflow
python -m http.server 8000
# ثم افتح http://localhost:8000
```
أو في VS Code: إضافة **Live Server** → Right click على `index.html` → Open with Live Server.

## 4. How to deploy to GitHub Pages

1. أنشئ Repository جديد على GitHub (مثلاً `dayflow`).
2. ارفع محتويات المجلد (يجب أن يكون `index.html` في جذر الـ repo):
   ```bash
   cd dayflow
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/dayflow.git
   git push -u origin main
   ```
3. في GitHub: **Settings → Pages**.
4. في **Build and deployment**: اختر **Source: Deploy from a branch**، ثم **Branch: `main`** والمجلد **`/ (root)`** → Save.
5. بعد دقيقة تقريباً سيظهر الرابط: `https://USERNAME.github.io/dayflow/`

لا تحتاج GitHub Actions ولا base path — كل المسارات في المشروع نسبية (relative).
ملف `.nojekyll` موجود لمنع GitHub من معالجة الملفات بـ Jekyll.

## 5. Where to customize the project

كل التعديلات الشائعة في مكانين:

- `config/site-config.js` → الاسم، اسم المستخدم، الألوان، الخطوط، اللغة الافتراضية، Pomodoro، Categories، Priorities، GitHub URL، إعدادات Dashboard
- `config/texts.js` → كل نصوص الواجهة بالعربية والإنكليزية

التفاصيل خطوة بخطوة في **[CUSTOMIZE.md](CUSTOMIZE.md)**.

## 6. Data storage

- كل البيانات محفوظة في **localStorage** داخل المتصفح تحت مفتاح واحد (`dayflow-data-v1`).
- البيانات **لا تُرسل لأي سيرفر**، ولا تنتقل تلقائياً بين الأجهزة أو المتصفحات.
- مسح بيانات المتصفح (Clear site data) يحذفها → استخدم **Settings → Export data** بشكل دوري.
- للنقل إلى جهاز آخر: Export من الجهاز الأول ثم Import في الثاني.
- التذكيرات تعمل فقط عندما يكون الموقع مفتوحاً في تبويب (لا يوجد Backend لإرسال إشعارات والموقع مغلق).

Data model (في `js/storage.js`):
```
tasks, goals, habits, dailyReviews, focusLog, settings, meta
```

## Project structure

```
dayflow/
├── index.html              الصفحة الوحيدة (تحمّل كل الملفات)
├── README.md
├── USAGE.md                دليل الاستخدام
├── CUSTOMIZE.md            دليل التعديل
├── .nojekyll               لـ GitHub Pages
├── config/
│   ├── site-config.js      ← الإعدادات القابلة للتعديل
│   └── texts.js            ← نصوص الواجهة (ar / en)
├── data/
│   └── demo-data.js        البيانات التجريبية
├── assets/
│   └── favicon.svg
├── css/
│   ├── style.css           التصميم العام
│   └── responsive.css      الهاتف والتابلت
└── js/
    ├── boot.js             تطبيق الألوان/اللغة/الوضع الداكن قبل ظهور الصفحة
    ├── utils.js            دوال التاريخ والوقت
    ├── icons.js            الأيقونات (SVG)
    ├── storage.js          localStorage + Export/Import/Reset + التذكير بالنسخ الاحتياطي
    ├── i18n.js             الترجمة وتبديل اللغة
    ├── ui.js               Modal، Confirm، Toast
    ├── tasks.js            المهام + التذكيرات
    ├── goals.js            الأهداف
    ├── habits.js           العادات
    ├── focus.js            Pomodoro
    ├── review.js           المراجعة اليومية
    ├── weekly.js           النظرة الأسبوعية
    ├── achievements.js     الإنجازات (شهر / سنة)
    ├── dashboard.js        الصفحة الرئيسية
    ├── today.js            مخطط اليوم
    ├── settings.js         الإعدادات
    └── app.js              التنقل بين الصفحات وتشغيل التطبيق
```

## Credits

Icons: [Lucide](https://lucide.dev) (ISC License). Fonts: Inter & IBM Plex Sans Arabic (Google Fonts).
