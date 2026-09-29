/* Demo data shown on the first run (so the app doesn't look empty).
   Remove it any time from: Settings → Remove demo data
   To start empty instead: set demo.loadOnFirstRun = false in config/site-config.js */

const DEMO_DATA = {
  build(lang) {
    const L = (en, ar) => (lang === "ar" ? ar : en);
    const today = Utils.today();
    const day = (n) => Utils.addDays(today, n);
    const iso = (dateStr, time = "12:00") => new Date(`${dateStr}T${time}:00`).toISOString();
    const id = () => Utils.uid();

    /* ---------- Goals ---------- */
    const gBackend = id();
    const gEnglish = id();
    const gCoach = id();
    const goals = [
      {
        id: gBackend, demo: true, createdAt: iso(day(-30)),
        title: L("Become a strong Backend Developer", "أن أصبح Backend Developer قوياً"),
        description: L("Django, databases, and shipping real projects", "Django وقواعد البيانات ونشر مشاريع حقيقية"),
        deadline: day(120), autoProgress: true, progress: 0,
        milestones: [
          { id: id(), title: "Advanced Django", done: true, doneAt: iso(day(-12)) },
          { id: id(), title: "PostgreSQL", done: true, doneAt: iso(day(-3)) },
          { id: id(), title: "Docker", done: false, doneAt: null },
          { id: id(), title: "Deployment", done: false, doneAt: null },
        ],
      },
      {
        id: gCoach, demo: true, createdAt: iso(day(-20)),
        title: L("Finish CoachLink project", "إنهاء مشروع CoachLink"),
        description: "",
        deadline: day(45), autoProgress: true, progress: 0,
        milestones: [
          { id: id(), title: L("Auth & roles", "المصادقة والأدوار"), done: true, doneAt: iso(day(-8)) },
          { id: id(), title: L("Booking API", "API الحجوزات"), done: false, doneAt: null },
          { id: id(), title: L("Tests", "الاختبارات"), done: false, doneAt: null },
        ],
      },
      {
        id: gEnglish, demo: true, createdAt: iso(day(-25)),
        title: L("Improve my English", "تحسين لغتي الإنكليزية"),
        description: L("Daily conversation and reading", "محادثة وقراءة يومية"),
        deadline: "", autoProgress: false, progress: 35, milestones: [],
      },
      {
        id: id(), demo: true, createdAt: iso(day(-40)), achievedAt: iso(day(-10), "18:00"),
        title: L("Learn Git & GitHub", "تعلم Git و GitHub"),
        description: "", deadline: day(-7), autoProgress: true, progress: 0,
        milestones: [
          { id: id(), title: L("Basic commands", "الأوامر الأساسية"), done: true, doneAt: iso(day(-25)) },
          { id: id(), title: L("Branches & merge", "Branches و merge"), done: true, doneAt: iso(day(-18)) },
          { id: id(), title: L("Pull requests", "Pull requests"), done: true, doneAt: iso(day(-10)) },
        ],
      },
    ];

    // Progress history for the last 30 days (one value per day)
    goals.forEach((g) => {
      g.history = {};
      const created = Utils.dateStr(new Date(g.createdAt));
      for (let n = 30; n >= 1; n--) {
        const d = day(-n);
        if (d < created) continue;
        if (g.autoProgress && g.milestones.length) {
          const done = g.milestones.filter((m) => m.done && m.doneAt && Utils.dateStr(new Date(m.doneAt)) <= d).length;
          g.history[d] = Utils.percent(done, g.milestones.length);
        } else {
          g.history[d] = Math.round((15 + (g.progress - 15) * ((30 - n) / 30)) / 5) * 5; // gentle climb to the current value
        }
      }
    });

    /* ---------- Tasks ---------- */
    const task = (o) => Object.assign({
      id: id(), demo: true, description: "", startTime: "", duration: 60, priority: "medium",
      category: "work", goalId: null, reminder: null, reminderSent: false,
      completed: false, completedAt: null, postponedFrom: [], createdAt: iso(o.date, "07:00"),
    }, o);

    const tasks = [
      // Today
      task({ date: today, startTime: "08:00", duration: 90, priority: "high", category: "study", goalId: gBackend,
        title: L("Study Django", "دراسة Django"), description: L("Class-based views and permissions", "Class-based views و permissions"),
        completed: true, completedAt: iso(today, "09:25") }),
      task({ date: today, startTime: "10:00", duration: 180, priority: "high", category: "work", goalId: gCoach,
        title: L("Work on CoachLink", "العمل على CoachLink"), description: L("Finish the booking endpoints", "إنهاء endpoints الحجوزات") }),
      task({ date: today, startTime: "13:00", duration: 60, priority: "low", category: "personal", title: L("Lunch", "الغداء") }),
      task({ date: today, startTime: "15:00", duration: 60, priority: "medium", category: "health", title: L("Exercise", "تمارين رياضية") }),
      task({ date: today, startTime: "17:00", duration: 30, priority: "medium", category: "study", title: L("Reading", "قراءة") }),
      task({ date: today, startTime: "20:00", duration: 30, priority: "medium", category: "study", goalId: gEnglish,
        title: L("English conversation practice", "تدريب محادثة إنكليزي"), postponedFrom: [day(-1)] }),
      task({ date: today, priority: "low", category: "other", duration: 15, title: L("Reply to messages", "الرد على الرسائل") }),

      // Tomorrow
      task({ date: day(1), startTime: "09:00", duration: 120, priority: "high", category: "study", goalId: gBackend, title: L("Docker basics", "أساسيات Docker") }),
      task({ date: day(1), startTime: "14:00", duration: 90, priority: "medium", category: "work", goalId: gCoach, title: L("Write API tests", "كتابة اختبارات API") }),

      // Past days (for the weekly overview)
      task({ date: day(-1), startTime: "09:00", duration: 120, priority: "high", category: "study", goalId: gBackend, title: "PostgreSQL indexes", completed: true, completedAt: iso(day(-1), "11:00") }),
      task({ date: day(-1), startTime: "13:00", duration: 90, priority: "medium", category: "work", goalId: gCoach, title: L("Fix login bug", "إصلاح خطأ تسجيل الدخول"), completed: true, completedAt: iso(day(-1), "14:40") }),
      task({ date: day(-1), startTime: "18:00", duration: 60, priority: "low", category: "health", title: L("Walk", "مشي"), completed: true, completedAt: iso(day(-1), "19:00") }),
      task({ date: day(-2), startTime: "10:00", duration: 120, priority: "high", category: "work", goalId: gCoach, title: L("Design database schema", "تصميم مخطط قاعدة البيانات"), completed: true, completedAt: iso(day(-2), "12:10") }),
      task({ date: day(-2), startTime: "16:00", duration: 45, priority: "medium", category: "study", goalId: gEnglish, title: L("Listening practice", "تدريب استماع"), completed: true, completedAt: iso(day(-2), "16:50") }),
      task({ date: day(-3), startTime: "09:00", duration: 90, priority: "medium", category: "study", goalId: gBackend, title: "DRF serializers", completed: true, completedAt: iso(day(-3), "10:30") }),
      task({ date: day(-3), startTime: "15:00", duration: 60, priority: "low", category: "personal", title: L("Plan the week", "تخطيط الأسبوع"), completed: true, completedAt: iso(day(-3), "15:45") }),
      task({ date: day(-4), startTime: "11:00", duration: 60, priority: "medium", category: "work", title: L("Code review", "مراجعة الكود"), completed: true, completedAt: iso(day(-4), "12:00") }),
      task({ date: day(-2), startTime: "19:00", duration: 60, priority: "low", category: "personal", title: L("Clean up desk", "ترتيب المكتب") }),
    ];

    /* ---------- Habits ---------- */
    const logFrom = (pattern) => {
      // pattern: string of 1/0 for the last N days, last char = yesterday
      const log = {};
      [...pattern].reverse().forEach((ch, i) => { if (ch === "1") log[day(-(i + 1))] = true; });
      return log;
    };
    const habits = [
      { id: id(), demo: true, createdAt: iso(day(-21)), name: L("Workout", "تمارين رياضية"), days: [0, 1, 2, 3, 4, 5, 6], log: logFrom("110111101111011110111") },
      { id: id(), demo: true, createdAt: iso(day(-21)), name: L("Read 20 minutes", "قراءة 20 دقيقة"), days: [0, 1, 2, 3, 4, 5, 6], log: Object.assign(logFrom("111011111101111111111"), { [today]: true }) },
      { id: id(), demo: true, createdAt: iso(day(-21)), name: L("Study English", "دراسة الإنكليزية"), days: [0, 1, 2, 3, 4, 6], log: logFrom("101110111011101110111") },
    ];

    /* ---------- Focus sessions & a past review ---------- */
    const focusLog = [
      { id: id(), demo: true, date: today, taskId: tasks[0].id, minutes: 25 },
      { id: id(), demo: true, date: today, taskId: tasks[0].id, minutes: 25 },
      { id: id(), demo: true, date: day(-1), taskId: tasks[9].id, minutes: 50 },
      { id: id(), demo: true, date: day(-1), taskId: tasks[10].id, minutes: 25 },
      { id: id(), demo: true, date: day(-2), taskId: tasks[12].id, minutes: 75 },
      { id: id(), demo: true, date: day(-3), taskId: tasks[14].id, minutes: 50 },
    ];

    const dailyReviews = {
      [day(-1)]: {
        demo: true,
        wentWell: L("Finished the PostgreSQL topic and fixed the login bug.", "أنهيت موضوع PostgreSQL وأصلحت خطأ تسجيل الدخول."),
        gotInWay: L("Too many notifications in the afternoon.", "إشعارات كثيرة بعد الظهر."),
        improve: L("Start deep work earlier and keep the phone away.", "أبدأ العمل العميق أبكر وأبعد الهاتف."),
        savedAt: iso(day(-1), "22:00"),
      },
    };

    return { tasks, goals, habits, focusLog, dailyReviews };
  },
};
