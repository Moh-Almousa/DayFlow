/* Settings: language, theme, notifications, and data (export / import / reset) */

const Settings = {
  themeMode() {
    return Store.state.settings.theme || SITE_CONFIG.theme.defaultMode;
  },

  setTheme(mode) {
    Store.state.settings.theme = mode;
    Store.save();
    Boot.applyTheme(mode);
  },

  toggleTheme() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    this.setTheme(isDark ? "light" : "dark");
  },

  notificationStatus() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission; // default | granted | denied
  },

  render() {
    const esc = Utils.esc;
    const langs = SITE_CONFIG.language.available;
    const mode = this.themeMode();
    const notif = this.notificationStatus();
    const s = Store.state;

    return UI.pageHeader(t("settings.title"), t("settings.subtitle")) + `
      <div class="settings-grid">
        <section class="card">
          <h2>${t("settings.appearance")}</h2>
          <div class="setting-row">
            <div><strong>${t("settings.language")}</strong></div>
            <div class="segmented" role="group" aria-label="${t("settings.language")}">
              ${Object.keys(langs).map((code) => `
                <button class="segment-btn ${I18n.lang === code ? "is-active" : ""}" data-action="set-language" data-lang="${code}" aria-pressed="${I18n.lang === code}">${esc(langs[code].label)}</button>`).join("")}
            </div>
          </div>
          <div class="setting-row">
            <div><strong>${t("settings.theme")}</strong></div>
            <div class="segmented" role="group" aria-label="${t("settings.theme")}">
              ${["light", "dark", "system"].map((m) => `
                <button class="segment-btn ${mode === m ? "is-active" : ""}" data-action="set-theme" data-mode="${m}" aria-pressed="${mode === m}">${t(`settings.themes.${m}`)}</button>`).join("")}
            </div>
          </div>
        </section>

        <section class="card">
          <h2>${t("settings.notifications")}</h2>
          <p class="muted small">${t("settings.notificationsHint")}</p>
          <div class="setting-row">
            <span>${t(`settings.notifStatus.${notif}`)}</span>
            ${notif === "default" ? `<button class="btn btn-secondary btn-sm" data-action="enable-notifications">${icon("bell", 16)}<span>${t("settings.enableNotifications")}</span></button>` : ""}
          </div>
        </section>

        <section class="card">
          <h2>${t("settings.data")}</h2>
          <p class="muted small">${t("settings.dataHint")}</p>
          <p class="small">${t("settings.counts", { tasks: s.tasks.length, goals: s.goals.length, habits: s.habits.length, reviews: Object.keys(s.dailyReviews).length })}</p>
          <p class="small">${icon("download", 14)} ${s.meta.lastBackupAt
            ? t("backup.lastBackup", { date: esc(I18n.shortDate(Utils.dateStr(new Date(s.meta.lastBackupAt)))), n: Backup.daysSinceBackup() })
            : t("backup.noBackupYet")}</p>
          <div class="setting-row">
            <span class="small">${icon("shield", 14)} ${t(`backup.persist.${Backup.persisted === true ? "on" : Backup.persisted === false ? "off" : "unsupported"}`)}</span>
            ${Backup.persisted === false ? `<button class="btn btn-ghost btn-sm" data-action="backup-persist">${t("backup.requestPersist")}</button>` : ""}
          </div>
          <div class="btn-row">
            <button class="btn btn-secondary" data-action="data-export">${icon("download", 16)}<span>${t("settings.export")}</span></button>
            <button class="btn btn-secondary" data-action="data-import">${icon("upload", 16)}<span>${t("settings.import")}</span></button>
            <input type="file" id="import-file" accept="application/json,.json" hidden data-change="data-import-file">
          </div>
          <hr>
          <div class="btn-row">
            ${Store.hasDemoData()
              ? `<button class="btn btn-ghost" data-action="demo-remove">${icon("x", 16)}<span>${t("settings.removeDemo")}</span></button>`
              : `<button class="btn btn-ghost" data-action="demo-load">${icon("database", 16)}<span>${t("settings.loadDemo")}</span></button>`}
            <button class="btn btn-danger" data-action="data-reset">${icon("trash", 16)}<span>${t("settings.reset")}</span></button>
          </div>
        </section>

        <section class="card">
          <h2>${t("settings.about")}</h2>
          <p><strong>${esc(SITE_CONFIG.appName)}</strong> <span class="muted small">v${esc(SITE_CONFIG.version)}</span></p>
          <p class="muted small">${esc(I18n.pick(SITE_CONFIG.appTagline))}</p>
          <p class="muted small">${t("settings.customizeHint")}</p>
          ${SITE_CONFIG.footer.githubUrl ? `<a class="btn btn-ghost btn-sm" href="${esc(SITE_CONFIG.footer.githubUrl)}" target="_blank" rel="noopener">${icon("github", 16)}<span>${esc(SITE_CONFIG.footer.githubLabel)}</span></a>` : ""}
        </section>
      </div>`;
  },
};

Actions.on("set-language", (el) => { I18n.set(el.dataset.lang); App.render(); });
Actions.on("toggle-language", () => { I18n.toggle(); App.render(); });
Actions.on("set-theme", (el) => { Settings.setTheme(el.dataset.mode); App.render(); });
Actions.on("toggle-theme", () => { Settings.toggleTheme(); App.render(); });

Actions.on("enable-notifications", () => {
  if (!("Notification" in window)) return;
  Notification.requestPermission().then(() => App.render());
});

Actions.on("data-export", () => {
  Store.exportFile();
  UI.toast(t("toast.exported"), "success");
  App.render();
});

Actions.on("data-import", () => document.getElementById("import-file").click());

Actions.on("data-import-file", (el) => {
  const file = el.files && el.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    let data;
    try {
      data = Store.parseImport(reader.result);
    } catch (e) {
      UI.toast(t("toast.importInvalid"), "danger");
      el.value = "";
      return;
    }
    const ok = await UI.confirm({
      title: t("settings.importTitle"),
      message: t("settings.importMessage", { tasks: data.tasks.length, goals: data.goals.length, habits: data.habits.length }),
      confirmText: t("settings.import"),
    });
    el.value = "";
    if (!ok) return;
    Store.replaceAll(data);
    I18n.init();
    Boot.applyTheme(Settings.themeMode());
    UI.toast(t("toast.imported"), "success");
    App.render();
  };
  reader.readAsText(file);
});

Actions.on("data-reset", async () => {
  const ok = await UI.confirm({
    title: t("settings.resetTitle"),
    message: t("settings.resetMessage"),
    confirmText: t("settings.resetConfirm"),
    danger: true,
  });
  if (!ok) return;
  Focus.selectTask(null);
  Focus.reset();
  Store.resetAll();
  UI.toast(t("toast.reset"));
  App.render();
});

Actions.on("demo-load", () => {
  Store.addDemoData(I18n.lang);
  Store.save();
  UI.toast(t("toast.demoLoaded"), "success");
  App.render();
});

Actions.on("demo-remove", async () => {
  const ok = await UI.confirm({
    title: t("settings.removeDemo"),
    message: t("settings.removeDemoMessage"),
    confirmText: t("settings.removeDemo"),
    danger: true,
  });
  if (!ok) return;
  Store.removeDemoData();
  UI.toast(t("toast.demoRemoved"));
  App.render();
});

Actions.on("backup-snooze", () => {
  Backup.snooze();
  App.render();
});

Actions.on("backup-persist", async () => {
  const ok = await Backup.requestPersistence();
  UI.toast(ok ? t("backup.persist.on") : t("backup.persistDenied"), ok ? "success" : "default");
  App.render();
});
