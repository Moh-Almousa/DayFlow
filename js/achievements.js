/* Achievements: everything you completed in a month or a year
   (tasks, focus time, habits, milestones and achieved goals) */

const Achievements = {
  mode: "month",      // month | year
  anchor: null,       // any date inside the selected period (null = today)
  query: "",
  goalFilter: "",
  categoryFilter: "",
  habitFilter: "",    // "" = all habits
  limit: 200,         // how many completed tasks to show before "Show more"
  periodTasks: [],

  anchorDate() {
    return this.anchor || Utils.today();
  },

  range() {
    const d = Utils.parseDate(this.anchorDate());
    if (this.mode === "year") return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` };
    return {
      from: Utils.dateStr(new Date(d.getFullYear(), d.getMonth(), 1)),
      to: Utils.dateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    };
  },

  shift(n) {
    const d = Utils.parseDate(this.anchorDate());
    const next = this.mode === "year" ? new Date(d.getFullYear() + n, 0, 1) : new Date(d.getFullYear(), d.getMonth() + n, 1);
    this.anchor = Utils.dateStr(next);
    this.limit = 200;
  },

  isCurrent() {
    const r = this.range();
    const today = Utils.today();
    return today >= r.from && today <= r.to;
  },

  periodLabel() {
    const { from } = this.range();
    return this.mode === "year"
      ? I18n.formatDate(from, { year: "numeric" })
      : I18n.formatDate(from, { month: "long", year: "numeric" });
  },

  // The day a task counts as achieved (the day you ticked it)
  doneDate(task) {
    return task.completedAt ? Utils.dateStr(new Date(task.completedAt)) : task.date;
  },

  completedTasks(from, to) {
    const key = (x) => this.doneDate(x) + (x.completedAt || "");
    return Store.state.tasks
      .filter((x) => x.completed && this.doneDate(x) >= from && this.doneDate(x) <= to)
      .sort((a, b) => key(b).localeCompare(key(a)));
  },

  // Habits scheduled and done on one day
  habitDay(date, habits) {
    let scheduled = 0;
    let done = 0;
    habits.forEach((h) => {
      if (date < Habits.startDate(h) || !Habits.isScheduled(h, date)) return;
      scheduled++;
      if (Habits.isDone(h, date)) done++;
    });
    return { scheduled, done };
  },

  stats(from, to) {
    const today = Utils.today();
    const end = to < today ? to : today;
    const tasks = this.completedTasks(from, to);

    let habitScheduled = 0;
    let habitDone = 0;
    for (let d = from; d <= end; d = Utils.addDays(d, 1)) {
      const r = this.habitDay(d, Store.state.habits);
      habitDone += r.done;
      habitScheduled += d === today ? r.done : r.scheduled; // today is not over yet
    }

    const inRange = (iso) => { if (!iso) return false; const d = Utils.dateStr(new Date(iso)); return d >= from && d <= to; };
    const milestones = [];
    Store.state.goals.forEach((g) => g.milestones.forEach((m) => {
      if (m.done && inRange(m.doneAt)) milestones.push({ goal: g, milestone: m, date: Utils.dateStr(new Date(m.doneAt)) });
    }));
    milestones.sort((a, b) => b.date.localeCompare(a.date));

    return {
      tasks,
      activeDays: new Set(tasks.map((x) => this.doneDate(x))).size,
      focusMinutes: Focus.minutesBetween(from, to),
      habitRate: Utils.percent(habitDone, habitScheduled),
      habitScheduled,
      milestones,
      achievedGoals: Store.state.goals.filter((g) => inRange(g.achievedAt))
        .sort((a, b) => b.achievedAt.localeCompare(a.achievedAt)),
    };
  },

  /* ---------- Chart: tasks completed per day (month) or per month (year) ---------- */
  renderChart(tasks, from, to) {
    const esc = Utils.esc;
    let buckets = [];
    if (this.mode === "year") {
      const y = from.slice(0, 4);
      buckets = Array.from({ length: 12 }, (_, i) => {
        const first = `${y}-${Utils.pad(i + 1)}-01`;
        return { key: first.slice(0, 7), label: I18n.formatDate(first, { month: "short" }), shortLabel: String(i + 1), tip: I18n.formatDate(first, { month: "long" }), count: 0 };
      });
      tasks.forEach((x) => { const b = buckets[Number(this.doneDate(x).slice(5, 7)) - 1]; if (b) b.count++; });
    } else {
      for (let d = from; d <= to; d = Utils.addDays(d, 1)) {
        const day = Number(d.slice(8));
        buckets.push({ key: d, label: day === 1 || day % 5 === 0 ? String(day) : "", tip: I18n.formatDate(d, { weekday: "long", day: "numeric", month: "short" }), count: 0 });
      }
      const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));
      tasks.forEach((x) => { const b = byKey[this.doneDate(x)]; if (b) b.count++; });
    }
    const max = Math.max(1, ...buckets.map((b) => b.count));
    const today = Utils.today();

    return `
      <div class="bar-chart ach-chart ${this.mode === "month" ? "is-dense" : ""}" style="grid-template-columns:repeat(${buckets.length}, 1fr)" role="img" aria-label="${t("achievements.chartLabel")}">
        ${buckets.map((b) => {
          const tip = t("achievements.chartTip", { period: b.tip, n: b.count });
          const isNow = this.mode === "year" ? today.slice(0, 7) === b.key : today === b.key;
          return `
            <div class="bar-group ${isNow ? "is-today" : ""}" tabindex="0" aria-label="${esc(tip)}">
              <div class="bars"><span class="bar bar-done" style="height:${(b.count / max) * 100}%"></span></div>
              <span class="bar-label">${b.shortLabel ? `<span class="lbl-long">${esc(b.label)}</span><span class="lbl-short">${esc(b.shortLabel)}</span>` : esc(b.label)}</span>
              <span class="bar-tip" role="tooltip">${esc(tip)}</span>
            </div>`;
        }).join("")}
      </div>
      <details class="table-view">
        <summary>${t("weekly.showTable")}</summary>
        <table>
          <thead><tr><th scope="col">${this.mode === "year" ? t("achievements.month") : t("weekly.day")}</th><th scope="col">${t("achievements.tasksCompleted")}</th></tr></thead>
          <tbody>${buckets.filter((b) => b.count).map((b) => `<tr><td>${esc(b.tip)}</td><td>${b.count}</td></tr>`).join("") || `<tr><td colspan="2">—</td></tr>`}</tbody>
        </table>
      </details>`;
  },

  /* ---------- Habit heatmap (one square per day) ---------- */
  renderHeatmap(from, to) {
    const esc = Utils.esc;
    const all = Store.state.habits;
    if (!all.length) return `<p class="muted small">${t("habits.empty")}</p>`;
    const habits = this.habitFilter ? all.filter((h) => h.id === this.habitFilter) : all;
    const today = Utils.today();
    const weeks = [];

    for (let w = Utils.startOfWeek(from); w <= to; w = Utils.addDays(w, 7)) {
      const monthStart = [0, 1, 2, 3, 4, 5, 6].map((i) => Utils.addDays(w, i)).find((d) => d.endsWith("-01") && d >= from && d <= to);
      const label = this.mode === "year" && monthStart ? I18n.formatDate(monthStart, { month: "short" }) : "";
      const cells = [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const d = Utils.addDays(w, i);
        if (d < from || d > to) return `<span class="hm-cell is-out"></span>`;
        if (d > today) return `<span class="hm-cell is-future"></span>`;
        const r = this.habitDay(d, habits);
        const level = r.scheduled ? (r.done ? Math.ceil((r.done / r.scheduled) * 4) : 0) : -1;
        const title = `${I18n.shortDate(d)}: ${r.scheduled ? t("achievements.habitsDoneOf", { done: r.done, total: r.scheduled }) : t("achievements.noHabitsScheduled")}`;
        return `<span class="hm-cell ${level < 0 ? "is-none" : "lv-" + level} ${d === today ? "is-today" : ""}" title="${esc(title)}"></span>`;
      }).join("");
      weeks.push(`<div class="hm-week">${this.mode === "year" ? `<span class="hm-month">${label ? `<span>${esc(label)}</span>` : ""}</span>` : ""}${cells}</div>`);
    }

    const order = [0, 1, 2, 3, 4, 5, 6].map((i) => (i + SITE_CONFIG.weekStartsOn) % 7);
    const dayLabels = `<div class="hm-days">${this.mode === "year" ? '<span class="hm-month"></span>' : ""}${order.map((d, i) => `<span>${i % 2 === 0 ? esc(I18n.weekdayName(d, "narrow")) : ""}</span>`).join("")}</div>`;
    const options = [{ value: "", label: t("achievements.allHabits") }].concat(all.map((h) => ({ value: h.id, label: h.name })));

    return `
      <div class="card-head">
        <h2>${t("achievements.habitsTitle")}</h2>
        <select class="select-sm" data-change="ach-habit" aria-label="${t("nav.habits")}">${UI.options(options, this.habitFilter)}</select>
      </div>
      <div class="hm-scroll">
        <div class="heatmap ${this.mode === "month" ? "is-month" : ""}" role="img" aria-label="${t("achievements.heatmapLabel")}">${dayLabels}${weeks.join("")}</div>
      </div>
      <div class="hm-legend" aria-hidden="true">
        <span>${t("achievements.less")}</span>
        <span class="hm-cell lv-0"></span><span class="hm-cell lv-1"></span><span class="hm-cell lv-2"></span><span class="hm-cell lv-3"></span><span class="hm-cell lv-4"></span>
        <span>${t("achievements.more")}</span>
      </div>`;
  },

  /* ---------- Completed tasks list ---------- */
  filtered() {
    const q = this.query.trim().toLowerCase();
    return this.periodTasks.filter((x) =>
      (!this.goalFilter || x.goalId === this.goalFilter) &&
      (!this.categoryFilter || x.category === this.categoryFilter) &&
      (!q || `${x.title} ${x.description || ""}`.toLowerCase().includes(q)));
  },

  renderList() {
    const esc = Utils.esc;
    const list = this.filtered();
    if (!list.length) return `<p class="muted">${this.periodTasks.length ? t("achievements.noMatch") : t("achievements.noTasks")}</p>`;

    const shown = list.slice(0, this.limit);
    const groups = [];
    shown.forEach((task) => {
      const d = this.doneDate(task);
      const key = this.mode === "year" ? d.slice(0, 7) : d;
      if (!groups.length || groups[groups.length - 1].key !== key) groups.push({ key, items: [] });
      groups[groups.length - 1].items.push(task);
    });

    return `
      <p class="muted small">${t("achievements.showing", { n: shown.length, total: list.length })}</p>
      ${groups.map((g) => `
        <h3 class="ach-group">${esc(this.mode === "year"
          ? I18n.formatDate(g.key + "-01", { month: "long", year: "numeric" })
          : I18n.formatDate(g.key, { weekday: "long", day: "numeric", month: "long" }))}
          <span class="muted small">(${g.items.length})</span></h3>
        <ul class="ach-list">
          ${g.items.map((task) => {
            const cat = I18n.category(task.category);
            const goal = task.goalId ? Goals.get(task.goalId) : null;
            return `
              <li class="ach-item">
                <span class="check check-sm done-mark" aria-hidden="true">${icon("check", 12)}</span>
                <div class="ach-main">
                  <button class="link-btn ach-title" data-action="task-edit" data-id="${task.id}">${esc(task.title)}</button>
                  <div class="task-meta">
                    ${this.mode === "year" ? `<span class="chip">${icon("calendar", 13)}${esc(I18n.shortDate(this.doneDate(task)))}</span>` : ""}
                    <span class="chip"><i class="dot dot-square" style="background:${cat.color}"></i>${esc(I18n.pick(cat.label))}</span>
                    <span class="chip">${icon("clock", 13)}${esc(I18n.duration(task.duration))}</span>
                    ${goal ? `<span class="chip chip-goal" title="${esc(goal.title)}">${icon("goals", 13)}<span class="chip-text">${esc(goal.title)}</span></span>` : ""}
                  </div>
                </div>
              </li>`;
          }).join("")}
        </ul>`).join("")}
      ${list.length > shown.length ? `<button class="btn btn-secondary btn-sm" data-action="ach-more">${t("achievements.showMore")}</button>` : ""}`;
  },

  refreshList() {
    const box = document.getElementById("ach-list");
    if (box) box.innerHTML = this.renderList();
  },

  /* ---------- Page ---------- */
  render() {
    const esc = Utils.esc;
    const { from, to } = this.range();
    const s = this.stats(from, to);
    this.periodTasks = s.tasks;

    const controls = `
      <div class="day-nav">
        <div class="segmented" role="group" aria-label="${t("achievements.period")}">
          ${["month", "year"].map((m) => `<button class="segment-btn ${this.mode === m ? "is-active" : ""}" data-action="ach-mode" data-mode="${m}" aria-pressed="${this.mode === m}">${t(`achievements.${m}`)}</button>`).join("")}
        </div>
        <button class="icon-btn" data-action="ach-prev" aria-label="${t("achievements.previous")}">${icon("chevronLeft")}</button>
        <span class="day-nav-label">${esc(this.periodLabel())}</span>
        <button class="icon-btn" data-action="ach-next" aria-label="${t("achievements.next")}" ${this.isCurrent() ? "disabled" : ""}>${icon("chevronRight")}</button>
        ${!this.isCurrent() ? `<button class="btn btn-ghost btn-sm" data-action="ach-current">${t(this.mode === "year" ? "achievements.thisYear" : "achievements.thisMonth")}</button>` : ""}
      </div>`;

    const goalOptions = [{ value: "", label: t("achievements.allGoals") }].concat(Store.state.goals.map((g) => ({ value: g.id, label: g.title })));
    const catOptions = [{ value: "", label: t("achievements.allCategories") }].concat(SITE_CONFIG.categories.map((c) => ({ value: c.id, label: I18n.pick(c.label) })));

    const goalsCard = `
      <section class="card">
        <h2>${t("achievements.goalsTitle")}</h2>
        ${s.achievedGoals.length ? `
          <ul class="ach-goals">
            ${s.achievedGoals.map((g) => `
              <li><span class="ach-trophy" aria-hidden="true">${icon("trophy", 16)}</span>
                <div><strong>${esc(g.title)}</strong>
                <p class="muted small">${t("goals.achievedOn", { date: esc(I18n.shortDate(Utils.dateStr(new Date(g.achievedAt)))) })}</p></div></li>`).join("")}
          </ul>` : `<p class="muted small">${t("achievements.noGoals")}</p>`}
        <h4>${t("achievements.milestonesTitle", { n: s.milestones.length })}</h4>
        ${s.milestones.length ? `
          <ul class="mini-list">
            ${s.milestones.map((x) => `<li><span>${esc(x.milestone.title)} <span class="muted small">· ${esc(x.goal.title)}</span></span><span class="muted small">${esc(I18n.shortDate(x.date))}</span></li>`).join("")}
          </ul>` : `<p class="muted small">${t("achievements.noMilestones")}</p>`}
      </section>`;

    return UI.pageHeader(t("achievements.title"), t("achievements.subtitle"), controls) + `
      <section class="stats-grid">
        ${UI.stat(t("achievements.tasksCompleted"), String(s.tasks.length))}
        ${UI.stat(t("achievements.activeDays"), String(s.activeDays))}
        ${UI.stat(t("achievements.focusTime"), esc(I18n.duration(s.focusMinutes)))}
        ${UI.stat(t("achievements.habitRate"), s.habitScheduled ? `${s.habitRate}%` : "—")}
        ${UI.stat(t("achievements.milestones"), String(s.milestones.length))}
        ${UI.stat(t("achievements.goalsAchieved"), String(s.achievedGoals.length))}
      </section>

      <div class="two-col">
        <section class="card">
          <h2>${t(this.mode === "year" ? "achievements.perMonth" : "achievements.perDay")}</h2>
          ${s.tasks.length ? this.renderChart(s.tasks, from, to) : `<p class="muted">${t("achievements.noTasks")}</p>`}
        </section>
        ${goalsCard}
      </div>

      <section class="card">${this.renderHeatmap(from, to)}</section>

      <section class="card">
        <h2>${t("achievements.listTitle")}</h2>
        <div class="filter-row">
          <input type="search" id="ach-search" value="${esc(this.query)}" placeholder="${t("achievements.search")}" aria-label="${t("achievements.search")}">
          <select data-change="ach-filter" data-filter="goalFilter" aria-label="${t("task.goal")}">${UI.options(goalOptions, this.goalFilter)}</select>
          <select data-change="ach-filter" data-filter="categoryFilter" aria-label="${t("task.category")}">${UI.options(catOptions, this.categoryFilter)}</select>
        </div>
        <div id="ach-list" aria-live="polite">${this.renderList()}</div>
      </section>`;
  },

  mount() {
    // Scroll the habit calendar so today is visible (useful on phones in year view)
    const scroller = document.querySelector(".hm-scroll");
    const todayCell = scroller && scroller.querySelector(".hm-cell.is-today");
    if (todayCell) {
      const box = scroller.getBoundingClientRect();
      const cell = todayCell.getBoundingClientRect();
      scroller.scrollLeft += cell.left - box.left - box.width / 2;
    }

    const search = document.getElementById("ach-search");
    if (search) {
      search.addEventListener("input", () => {
        this.query = search.value;
        this.limit = 200;
        this.refreshList();
      });
    }
  },
};

Actions.on("ach-mode", (el) => { Achievements.mode = el.dataset.mode; Achievements.limit = 200; App.render(); });
Actions.on("ach-prev", () => { Achievements.shift(-1); App.render(); });
Actions.on("ach-next", () => { Achievements.shift(1); App.render(); });
Actions.on("ach-current", () => { Achievements.anchor = null; Achievements.limit = 200; App.render(); });
Actions.on("ach-habit", (el) => { Achievements.habitFilter = el.value; App.render(); });
Actions.on("ach-filter", (el) => { Achievements[el.dataset.filter] = el.value; Achievements.limit = 200; Achievements.refreshList(); });
Actions.on("ach-more", () => { Achievements.limit += 200; Achievements.refreshList(); });
