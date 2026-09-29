/* Weekly Overview: a light summary of the week + one simple chart */

const Weekly = {
  weekStart: null, // null = current week

  currentStart() {
    return this.weekStart || Utils.startOfWeek(Utils.today());
  },

  days(start) {
    return [0, 1, 2, 3, 4, 5, 6].map((i) => Utils.addDays(start, i));
  },

  stats(start) {
    const days = this.days(start);
    const end = days[6];
    const today = Utils.today();
    const tasks = Store.state.tasks.filter((x) => x.date >= start && x.date <= end);
    const done = tasks.filter((x) => x.completed);

    let habitScheduled = 0;
    let habitDone = 0;
    days.filter((d) => d <= today).forEach((d) => {
      Habits.scheduledOn(d).forEach((h) => {
        if (d === today && !Habits.isDone(h, d)) return; // today is not over yet
        habitScheduled++;
        if (Habits.isDone(h, d)) habitDone++;
      });
    });

    const postponed = Utils.sum(Store.state.tasks, (x) => x.postponedFrom.filter((d) => d >= start && d <= end).length);

    return {
      days,
      end,
      total: tasks.length,
      done: done.length,
      postponed,
      habitRate: Utils.percent(habitDone, habitScheduled),
      habitScheduled,
      plannedMinutes: Utils.sum(tasks, (x) => Number(x.duration)),
      doneMinutes: Utils.sum(done, (x) => Number(x.duration)),
      focusMinutes: Focus.minutesBetween(start, end),
      perDay: days.map((d) => {
        const list = tasks.filter((x) => x.date === d);
        return { date: d, planned: list.length, done: list.filter((x) => x.completed).length };
      }),
      tasks,
    };
  },

  renderChart(perDay) {
    const esc = Utils.esc;
    const max = Math.max(1, ...perDay.map((d) => d.planned));
    const today = Utils.today();
    return `
      <div class="chart-legend" aria-hidden="true">
        <span><i class="legend-swatch swatch-planned"></i>${t("weekly.planned")}</span>
        <span><i class="legend-swatch swatch-done"></i>${t("weekly.completed")}</span>
      </div>
      <div class="bar-chart" role="img" aria-label="${t("weekly.chartLabel")}">
        ${perDay.map((d) => {
          const tip = t("weekly.tooltip", { day: I18n.formatDate(d.date, { weekday: "long", day: "numeric", month: "short" }), planned: d.planned, done: d.done });
          return `
            <div class="bar-group ${d.date === today ? "is-today" : ""}" tabindex="0" aria-label="${esc(tip)}">
              <div class="bars">
                <span class="bar bar-planned" style="height:${(d.planned / max) * 100}%"></span>
                <span class="bar bar-done" style="height:${(d.done / max) * 100}%"></span>
              </div>
              <span class="bar-label">${esc(I18n.weekdayShort(d.date))}</span>
              <span class="bar-tip" role="tooltip">${esc(tip)}</span>
            </div>`;
        }).join("")}
      </div>
      <details class="table-view">
        <summary>${t("weekly.showTable")}</summary>
        <table>
          <thead><tr><th scope="col">${t("weekly.day")}</th><th scope="col">${t("weekly.planned")}</th><th scope="col">${t("weekly.completed")}</th></tr></thead>
          <tbody>${perDay.map((d) => `<tr><td>${esc(I18n.formatDate(d.date, { weekday: "long", day: "numeric", month: "short" }))}</td><td>${d.planned}</td><td>${d.done}</td></tr>`).join("")}</tbody>
        </table>
      </details>`;
  },

  render() {
    const esc = Utils.esc;
    const start = this.currentStart();
    const s = this.stats(start);
    const isCurrent = start === Utils.startOfWeek(Utils.today());

    const nav = `
      <div class="day-nav">
        <button class="icon-btn" data-action="week-prev" aria-label="${t("weekly.previousWeek")}">${icon("chevronLeft")}</button>
        <span class="day-nav-label">${esc(I18n.shortDate(start))} – ${esc(I18n.shortDate(s.end))}</span>
        <button class="icon-btn" data-action="week-next" aria-label="${t("weekly.nextWeek")}">${icon("chevronRight")}</button>
        ${!isCurrent ? `<button class="btn btn-ghost btn-sm" data-action="week-current">${t("weekly.thisWeek")}</button>` : ""}
      </div>`;

    const goals = Goals.active();
    const goalRows = goals.map((g) => {
      const doneThisWeek = s.tasks.filter((x) => x.goalId === g.id && x.completed).length;
      const pct = Goals.progress(g);
      return `
        <li class="goal-mini">
          <div class="row-between">
            <span class="goal-mini-title">${esc(g.title)}</span>
            <span class="small"><span class="muted">${t("weekly.goalTasksDone", { n: doneThisWeek })}</span> · <strong>${pct}%</strong></span>
          </div>
          ${UI.progressBar(pct)}
        </li>`;
    }).join("");

    return UI.pageHeader(t("weekly.title"), t("weekly.subtitle"), nav) + `
      <section class="stats-grid">
        ${UI.stat(t("weekly.tasksCompleted"), `${s.done} / ${s.total}`)}
        ${UI.stat(t("weekly.tasksPostponed"), String(s.postponed))}
        ${UI.stat(t("weekly.habitRate"), s.habitScheduled ? `${s.habitRate}%` : "—")}
        ${UI.stat(t("weekly.plannedTime"), esc(I18n.duration(s.plannedMinutes)))}
        ${UI.stat(t("weekly.doneTime"), esc(I18n.duration(s.doneMinutes)))}
        ${UI.stat(t("weekly.focusTime"), esc(I18n.duration(s.focusMinutes)))}
      </section>

      <div class="two-col">
        <section class="card">
          <h2>${t("weekly.tasksPerDay")}</h2>
          ${s.total ? this.renderChart(s.perDay) : `<p class="muted">${t("weekly.noTasks")}</p>`}
        </section>
        <section class="card">
          <h2>${t("weekly.goalsProgress")}</h2>
          ${goals.length ? `<ul class="goal-mini-list">${goalRows}</ul>` : UI.emptyState({ iconName: "goals", text: t("goals.empty"), actionLabel: t("goals.addFirst"), action: "goal-add" })}
        </section>
      </div>`;
  },
};

Actions.on("week-prev", () => { Weekly.weekStart = Utils.addDays(Weekly.currentStart(), -7); App.render(); });
Actions.on("week-next", () => { Weekly.weekStart = Utils.addDays(Weekly.currentStart(), 7); App.render(); });
Actions.on("week-current", () => { Weekly.weekStart = null; App.render(); });
