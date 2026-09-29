/* Storage: all data lives in one object saved to localStorage.

   Data model:
   state = {
     version: 1,
     tasks:        [{ id, title, description, date, startTime, duration, priority, category,
                      goalId, reminder, completed, completedAt, postponedFrom: [dates], demo }],
     goals:        [{ id, title, description, deadline, autoProgress, progress,
                      milestones: [{ id, title, done, doneAt }],
                      history: { "YYYY-MM-DD": percent }, achievedAt, createdAt, demo }],
     habits:       [{ id, name, days: [0..6], log: { "YYYY-MM-DD": true }, createdAt, demo }],
     dailyReviews: { "YYYY-MM-DD": { wentWell, gotInWay, improve, savedAt } },
     focusLog:     [{ id, date, taskId, minutes }],
     settings:     { language, theme },
     meta:         { firstUseAt, lastBackupAt, backupSnoozeUntil }
   }
*/

const Store = {
  VERSION: 1,
  state: null,

  emptyState() {
    return {
      version: this.VERSION,
      tasks: [],
      goals: [],
      habits: [],
      dailyReviews: {},
      focusLog: [],
      settings: { language: null, theme: null },
      meta: this.emptyMeta(),
    };
  },

  emptyMeta() {
    return { firstUseAt: new Date().toISOString(), lastBackupAt: null, backupSnoozeUntil: null };
  },

  // Makes sure every field exists (useful after import or an old version)
  normalize(data) {
    const base = this.emptyState();
    const s = Object.assign(base, data || {});
    ["tasks", "goals", "habits", "focusLog"].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    if (!s.dailyReviews || typeof s.dailyReviews !== "object") s.dailyReviews = {};
    s.settings = Object.assign({ language: null, theme: null }, s.settings || {});
    s.meta = Object.assign(this.emptyMeta(), s.meta || {});
    s.tasks.forEach((t) => { if (!Array.isArray(t.postponedFrom)) t.postponedFrom = []; });
    s.goals.forEach((g) => {
      if (!Array.isArray(g.milestones)) g.milestones = [];
      if (!g.history || typeof g.history !== "object") g.history = {};
    });
    s.habits.forEach((h) => {
      if (!Array.isArray(h.days) || !h.days.length) h.days = [0, 1, 2, 3, 4, 5, 6];
      if (!h.log || typeof h.log !== "object") h.log = {};
    });
    s.version = this.VERSION;
    return s;
  },

  load() {
    let raw = null;
    try {
      raw = localStorage.getItem(SITE_CONFIG.storageKey);
    } catch (e) {
      raw = null;
    }
    if (raw) {
      try {
        this.state = this.normalize(JSON.parse(raw));
        return;
      } catch (e) {
        // Never throw away unreadable data: keep a copy so it can be recovered
        console.warn("Saved data could not be read. A copy was kept in localStorage under a key starting with", SITE_CONFIG.storageKey + "-broken-", e);
        try { localStorage.setItem(SITE_CONFIG.storageKey + "-broken-" + Date.now(), raw); } catch (err) { /* storage full */ }
      }
    }
    // First run
    this.state = this.emptyState();
    if (SITE_CONFIG.demo.loadOnFirstRun) this.addDemoData(SITE_CONFIG.language.default);
    this.save();
  },

  save() {
    try {
      localStorage.setItem(SITE_CONFIG.storageKey, JSON.stringify(this.state));
      return true;
    } catch (e) {
      console.error(e);
      if (typeof UI !== "undefined") UI.toast(t("toast.saveFailed"), "danger");
      return false;
    }
  },

  /* ---------- Export / Import ---------- */
  exportFile() {
    this.state.meta.lastBackupAt = new Date().toISOString();
    this.state.meta.backupSnoozeUntil = null;
    this.save();
    const payload = { app: SITE_CONFIG.appName, exportedAt: this.state.meta.lastBackupAt, data: this.state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${SITE_CONFIG.appName.toLowerCase().replace(/\s+/g, "-")}-backup-${Utils.today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // Returns normalized data or throws if the file is not valid
  parseImport(text) {
    const parsed = JSON.parse(text);
    const data = parsed && parsed.data ? parsed.data : parsed;
    const looksValid = data && typeof data === "object" && Array.isArray(data.tasks) && Array.isArray(data.goals) && Array.isArray(data.habits);
    if (!looksValid) throw new Error("invalid");
    return this.normalize(data);
  },

  replaceAll(data) {
    const keepSettings = this.state.settings;
    this.state = this.normalize(data);
    if (!data.settings) this.state.settings = keepSettings;
    this.save();
  },

  /* ---------- Reset & demo data ---------- */
  resetAll() {
    const settings = this.state.settings; // keep language & theme
    const lastBackupAt = this.state.meta.lastBackupAt;
    this.state = this.emptyState();
    this.state.settings = settings;
    this.state.meta.lastBackupAt = lastBackupAt;
    this.save();
  },

  addDemoData(lang) {
    const demo = DEMO_DATA.build(lang);
    this.state.tasks.push(...demo.tasks);
    this.state.goals.push(...demo.goals);
    this.state.habits.push(...demo.habits);
    this.state.focusLog.push(...demo.focusLog);
    Object.assign(this.state.dailyReviews, demo.dailyReviews);
  },

  // Anything the user created (not demo)?
  hasUserData() {
    const s = this.state;
    return [s.tasks, s.goals, s.habits].some((list) => list.some((x) => !x.demo));
  },

  hasDemoData() {
    const s = this.state;
    return [s.tasks, s.goals, s.habits, s.focusLog].some((list) => list.some((x) => x.demo));
  },

  removeDemoData() {
    const s = this.state;
    const demoGoalIds = s.goals.filter((g) => g.demo).map((g) => g.id);
    s.tasks = s.tasks.filter((x) => !x.demo);
    s.goals = s.goals.filter((x) => !x.demo);
    s.habits = s.habits.filter((x) => !x.demo);
    s.focusLog = s.focusLog.filter((x) => !x.demo);
    s.tasks.forEach((task) => { if (demoGoalIds.includes(task.goalId)) task.goalId = null; });
    Object.keys(s.dailyReviews).forEach((d) => { if (s.dailyReviews[d].demo) delete s.dailyReviews[d]; });
    this.save();
  },
};

/* ---------- Backup protection ----------
   1) Asks the browser to keep this site's data (not clear it automatically).
   2) Reminds you to export a backup when the last one is older than SITE_CONFIG.backup.reminderDays. */
const Backup = {
  persisted: null, // true | false | null (not supported)

  cfg() {
    return Object.assign({ reminderDays: 7, requestPersistentStorage: true }, SITE_CONFIG.backup || {});
  },

  async requestPersistence() {
    try {
      if (!navigator.storage || !navigator.storage.persist) { this.persisted = null; return null; }
      this.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist());
    } catch (e) {
      this.persisted = false;
    }
    return this.persisted;
  },

  daysSinceBackup() {
    const last = Store.state.meta.lastBackupAt;
    return last ? Math.floor((Date.now() - Date.parse(last)) / 86400000) : null;
  },

  isDue() {
    const days = this.cfg().reminderDays;
    const m = Store.state.meta;
    if (!days || !Store.hasUserData()) return false;
    if (m.backupSnoozeUntil && Date.now() < Date.parse(m.backupSnoozeUntil)) return false;
    const since = Date.parse(m.lastBackupAt || m.firstUseAt);
    return Date.now() - since >= days * 86400000;
  },

  snooze() {
    Store.state.meta.backupSnoozeUntil = new Date(Date.now() + 86400000).toISOString();
    Store.save();
  },

  // Banner shown on the dashboard when a backup is due
  renderReminder() {
    if (!this.isDue()) return "";
    const days = this.daysSinceBackup();
    const msg = days === null ? t("backup.never") : t("backup.overdue", { n: days });
    return `
      <div class="notice notice-warning backup-notice" role="status">
        ${icon("shield", 16)}
        <span>${msg}</span>
        <div class="btn-row">
          <button class="btn btn-primary btn-sm" data-action="data-export">${icon("download", 16)}<span>${t("backup.exportNow")}</span></button>
          <button class="btn btn-ghost btn-sm" data-action="backup-snooze">${t("backup.later")}</button>
        </div>
      </div>`;
  },
};
