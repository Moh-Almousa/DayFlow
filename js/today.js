/* Today (Day Planner): full plan for one day with navigation between days */

const Today = {
  date: null, // null = today

  currentDate() {
    return this.date || Utils.today();
  },

  render() {
    const esc = Utils.esc;
    const date = this.currentDate();
    const today = Utils.today();
    const list = Tasks.forDate(date);
    const summary = Tasks.daySummary(date);
    const overdue = date === today ? Tasks.sort(Tasks.overdue()) : [];
    const anytime = Tasks.byPriority(list.filter((x) => !x.startTime));

    const title = date === today ? t("today.title")
      : date === Utils.addDays(today, 1) ? t("today.tomorrow")
      : date === Utils.addDays(today, -1) ? t("today.yesterday")
      : t("today.dayPlan");

    const nav = `
      <div class="day-nav">
        <button class="icon-btn" data-action="day-prev" aria-label="${t("common.previousDay")}">${icon("chevronLeft")}</button>
        <input type="date" class="date-input" value="${date}" data-change="day-pick" aria-label="${t("task.date")}">
        <button class="icon-btn" data-action="day-next" aria-label="${t("common.nextDay")}">${icon("chevronRight")}</button>
        ${date !== today ? `<button class="btn btn-ghost btn-sm" data-action="day-today">${t("common.today")}</button>` : ""}
        <button class="btn btn-primary" data-action="task-add" data-date="${date}">${icon("plus", 16)}<span>${t("task.add")}</span></button>
      </div>`;

    const summaryStrip = list.length ? `
      <section class="card summary-strip">
        <span>${t("dashboard.tasksCompleted", { done: summary.done, total: summary.total })}</span>
        ${UI.progressBar(summary.percent, "progress-success")}
        <span class="muted small">${t("dashboard.plannedTime", { time: esc(I18n.duration(summary.plannedMinutes)) })}</span>
      </section>
      ${Tasks.renderRealityCheck(summary)}` : "";

    const overdueSection = overdue.length ? `
      <section class="card card-warning">
        <div class="card-head">
          <h2>${t("today.overdueTitle", { n: overdue.length })}</h2>
          <button class="btn btn-secondary btn-sm" data-action="overdue-all-today">${icon("today", 16)}<span>${t("today.moveAllToday")}</span></button>
        </div>
        ${Tasks.renderList(overdue, { showDate: true, compact: true })}
      </section>` : "";

    const timeline = Tasks.renderTimeline(list, date);
    const content = list.length ? `
      ${timeline ? `<section class="card"><h2>${t("today.schedule")}</h2>${timeline}</section>` : ""}
      ${anytime.length ? `<section class="card"><h2>${t("today.anytime")}</h2><p class="muted small">${t("today.anytimeHint")}</p>${Tasks.renderList(anytime)}</section>` : ""}`
      : `<section class="card">${UI.emptyState({ iconName: "today", text: t("today.empty"), actionLabel: t("today.addFirst"), action: "task-add", actionData: `data-date="${date}"` })}</section>`;

    return UI.pageHeader(title, esc(I18n.longDate(date)), nav) + summaryStrip + overdueSection + content;
  },
};

Actions.on("day-prev", () => { Today.date = Utils.addDays(Today.currentDate(), -1); App.render(); });
Actions.on("day-next", () => { Today.date = Utils.addDays(Today.currentDate(), 1); App.render(); });
Actions.on("day-today", () => { Today.date = null; App.render(); });
Actions.on("day-pick", (el) => {
  if (!Utils.isValidDate(el.value)) return;
  Today.date = el.value === Utils.today() ? null : el.value;
  App.render();
});
Actions.on("overdue-all-today", () => {
  Tasks.overdue().forEach((x) => Tasks.moveTo(x.id, Utils.today()));
  UI.toast(t("toast.taskMovedToday"));
  App.render();
});
