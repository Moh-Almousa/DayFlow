/* App: page routing (#/page), layout (sidebar, mobile nav), and startup */

// All pages. The order in the menu comes from SITE_CONFIG.navigation
const PAGES = {
  dashboard: { icon: "dashboard", render: () => Dashboard.render() },
  today:     { icon: "today",     render: () => Today.render() },
  goals:     { icon: "goals",     render: () => Goals.render(), mount: () => Goals.mount() },
  habits:    { icon: "habits",    render: () => Habits.render() },
  review:    { icon: "review",    render: () => Review.render(), mount: () => Review.mount() },
  weekly:    { icon: "weekly",    render: () => Weekly.render() },
  achievements: { icon: "trophy", render: () => Achievements.render(), mount: () => Achievements.mount() },
  focus:     { icon: "focus",     render: () => Focus.render() },
  settings:  { icon: "settings",  render: () => Settings.render() },
};

const App = {
  route: "dashboard",

  init() {
    Store.load();
    I18n.init();
    Boot.applyTheme(Settings.themeMode());
    this.bindEvents();
    this.onRouteChange();
    Reminders.start();

    // Ask the browser not to clear this site's data automatically
    if (Backup.cfg().requestPersistentStorage) {
      Backup.requestPersistence().then(() => { if (this.route === "settings") this.render(); });
    }

    // Refresh "now" marker on the timeline every minute
    setInterval(() => {
      const typing = document.activeElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName);
      if (["dashboard", "today"].includes(this.route) && !UI.isModalOpen() && !typing) this.render();
    }, 60000);

    // Follow the system theme when "system" is selected
    if (window.matchMedia) {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (Settings.themeMode() === "system") { Boot.applyTheme("system"); this.renderChrome(); }
      });
    }
  },

  enabledPages() {
    return SITE_CONFIG.navigation.filter((name) => PAGES[name]);
  },

  onRouteChange() {
    const name = (location.hash.replace(/^#\/?/, "").split("?")[0] || "dashboard");
    const valid = name === "settings" || this.enabledPages().includes(name);
    const changed = this.route !== name;
    this.route = valid ? name : "dashboard";
    this.closeDrawer();
    this.render();
    if (changed) {
      window.scrollTo(0, 0);
      document.getElementById("main").focus({ preventScroll: true });
    }
  },

  go(name) {
    if (location.hash === `#/${name}`) this.render();
    else location.hash = `#/${name}`;
  },

  pageTitle() {
    return `${t(`nav.${this.route}`)} — ${SITE_CONFIG.appName}`;
  },

  render() {
    // Remember which button had keyboard focus, so we can put it back after re-drawing
    const active = document.activeElement;
    const focusKey = active && active.dataset && active.dataset.action
      ? `[data-action="${active.dataset.action}"]${active.dataset.id ? `[data-id="${active.dataset.id}"]` : ""}${active.dataset.date ? `[data-date="${active.dataset.date}"]` : ""}`
      : null;

    Goals.snapshotAll(); // keeps today's goal progress in the history
    this.renderChrome();
    const page = PAGES[this.route];
    document.getElementById("main").innerHTML = `<div class="page page-${this.route}">${page.render()}</div>`;
    if (page.mount) page.mount();
    document.title = Focus.running ? document.title : this.pageTitle();
    this.updateFocusBadge();

    if (focusKey && !UI.isModalOpen()) {
      const again = document.querySelector(focusKey);
      if (again) again.focus({ preventScroll: true });
    }
  },

  /* ---------- Layout: sidebar, top bar, bottom nav ---------- */
  navLink(name, extraClass = "") {
    const active = this.route === name;
    return `
      <a href="#/${name}" class="nav-link ${extraClass} ${active ? "is-active" : ""}" ${active ? 'aria-current="page"' : ""}>
        ${icon(PAGES[name].icon, 18)}
        <span class="nav-label">${t(`nav.${name}`)}</span>
        ${name === "focus" ? '<span class="focus-badge" data-focus-badge hidden></span>' : ""}
      </a>`;
  },

  toolButtons() {
    const next = I18n.nextLanguageInfo();
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    return `
      <button class="tool-btn" data-action="toggle-language" aria-label="${t("common.switchLanguage")}: ${Utils.esc(next.label)}" title="${Utils.esc(next.label)}">
        ${icon("language", 16)}<span>${Utils.esc(next.short)}</span>
      </button>
      <button class="tool-btn" data-action="toggle-theme" aria-label="${isDark ? t("common.lightMode") : t("common.darkMode")}" title="${isDark ? t("common.lightMode") : t("common.darkMode")}">
        ${icon(isDark ? "sun" : "moon", 16)}
      </button>`;
  },

  brand() {
    return `
      <a href="#/dashboard" class="brand" aria-label="${Utils.esc(SITE_CONFIG.appName)}">
        <span class="brand-mark" aria-hidden="true">${icon("check", 16)}</span>
        <span class="brand-text">
          <strong>${Utils.esc(SITE_CONFIG.appName)}</strong>
          <small>${Utils.esc(I18n.pick(SITE_CONFIG.appTagline))}</small>
        </span>
      </a>`;
  },

  renderChrome() {
    const f = SITE_CONFIG.footer;
    document.getElementById("skip-link").textContent = t("common.skipToContent");

    document.getElementById("sidebar").innerHTML = `
      <div class="sidebar-top">
        ${this.brand()}
        <button class="icon-btn drawer-close" data-action="close-drawer" aria-label="${t("common.close")}">${icon("x")}</button>
      </div>
      <nav aria-label="${t("common.mainNav")}">
        <ul class="nav-list">${this.enabledPages().map((n) => `<li>${this.navLink(n)}</li>`).join("")}</ul>
      </nav>
      <div class="sidebar-bottom">
        ${this.navLink("settings")}
        <div class="sidebar-tools">${this.toolButtons()}</div>
        ${f.show ? `
          <footer class="sidebar-footer">
            <p>${Utils.esc(I18n.pick(f.text))}</p>
            ${f.githubUrl ? `<a href="${Utils.esc(f.githubUrl)}" target="_blank" rel="noopener">${icon("github", 14)}<span>${Utils.esc(f.githubLabel)}</span></a>` : ""}
          </footer>` : ""}
      </div>`;

    document.getElementById("topbar").innerHTML = `
      ${this.brand()}
      <div class="topbar-tools">${this.toolButtons()}</div>`;

    const mobile = SITE_CONFIG.mobileNavigation.filter((n) => PAGES[n]).slice(0, 4);
    document.getElementById("bottom-nav").innerHTML = `
      ${mobile.map((n) => this.navLink(n, "bottom-link")).join("")}
      <button class="nav-link bottom-link" data-action="open-drawer" aria-label="${t("common.more")}" aria-expanded="false" aria-controls="sidebar">
        ${icon("menu", 18)}<span class="nav-label">${t("common.more")}</span>
      </button>`;
    document.getElementById("bottom-nav").setAttribute("aria-label", t("common.mobileNav"));
  },

  // Shows the running timer next to "Focus" in the menu
  updateFocusBadge() {
    document.querySelectorAll("[data-focus-badge]").forEach((el) => {
      el.hidden = !Focus.running;
      el.textContent = Focus.running ? Focus.format(Focus.remaining) : "";
    });
  },

  openDrawer() {
    document.body.classList.add("drawer-open");
    document.getElementById("drawer-backdrop").hidden = false;
    const first = document.querySelector("#sidebar .nav-link");
    if (first) first.focus();
  },

  closeDrawer() {
    document.body.classList.remove("drawer-open");
    document.getElementById("drawer-backdrop").hidden = true;
  },

  /* ---------- Events: one listener for all buttons ---------- */
  bindEvents() {
    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-action]");
      if (!el || el.disabled) return;
      e.preventDefault();
      Actions.run(el.dataset.action, el, e);
    });

    document.addEventListener("change", (e) => {
      const el = e.target.closest("[data-change]");
      if (el) Actions.run(el.dataset.change, el, e);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (UI.isModalOpen()) UI.closeModal();
        else this.closeDrawer();
      }
      if (e.key === "Tab" && UI.isModalOpen()) UI.trapFocus(e);
    });

    window.addEventListener("hashchange", () => this.onRouteChange());
    document.getElementById("drawer-backdrop").addEventListener("click", () => this.closeDrawer());
  },
};

Actions.on("open-drawer", () => App.openDrawer());
Actions.on("close-drawer", () => App.closeDrawer());

document.addEventListener("DOMContentLoaded", () => App.init());
