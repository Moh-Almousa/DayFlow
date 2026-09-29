/* Dashboard: answers "What should I do today?" */

const Dashboard = {
  greeting() {
    const h = new Date().getHours();
    const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
    return t(`dashboard.greeting.${part}`, { name: SITE_CONFIG.userName });
  },

  // The task happening now, or the next one
  upNext(list) {
    const now = Utils.nowMinutes();
    const open = Tasks.sort(list.filter((x) => !x.completed));
    const current = open.find((x) => x.startTime && now >= Utils.timeToMinutes(x.startTime) && now < Tasks.endMinutes(x));
    if (current) return { task: current, isNow: true };
    const next = open.find((x) => x.startTime && Utils.timeToMinutes(x.startTime) > now)
      || Tasks.byPriority(open)[0];
    return next ? { task: next, isNow: false } : null;
  },

  render() {
    const esc = Utils.esc;
    const today = Utils.today();
    const list = Tasks.forDate(today);
    const summary = Tasks.daySummary(today);
    const overdue = Tasks.overdue();
    const next = this.upNext(list);
    const cfg = SITE_CONFIG.dashboard;
    const priorities = Tasks.byPriority(list.filter((x) => !x.completed)).slice(0, cfg.topPrioritiesCount);
    const anytime = Tasks.byPriority(list.filter((x) => !x.startTime));

    const header = UI.pageHeader(this.greeting(), esc(I18n.longDate(today)),
      `<button class="btn btn-primary" data-action="task-add" data-date="${today}">${icon("plus", 16)}<span>${t("task.add")}</span></button>`);

    const progressCard = `
      <section class="card progress-card" aria-labelledby="progress-title">
        <div class="row-between">
          <h2 id="progress-title">${t("dashboard.dailyProgress")}</h2>
          <span class="big-number">${summary.percent}%</span>
        </div>
        ${UI.progressBar(summary.percent, "progress-success progress-lg")}
        <div class="row-between small muted">
          <span>${t("dashboard.tasksCompleted", { done: summary.done, total: summary.total })}</span>
          <span>${t("dashboard.plannedTime", { time: esc(I18n.duration(summary.plannedMinutes)) })}</span>
        </div>
        ${Tasks.renderRealityCheck(summary)}
      </section>`;

    const nextCard = `
      <section class="card next-card" aria-labelledby="next-title">
        <h2 id="next-title">${next && next.isNow ? t("dashboard.rightNow") : t("dashboard.upNext")}</h2>
        ${next ? `
          <p class="next-title">${esc(next.task.title)}</p>
          <p class="muted small">${next.task.startTime ? esc(Tasks.timeRange(next.task)) : t("dashboard.anytime")} · ${esc(I18n.duration(next.task.duration))}</p>
          <div class="btn-row">
            <button class="btn btn-primary btn-sm" data-action="task-focus" data-id="${next.task.id}">${icon("focus", 16)}<span>${t("task.focus")}</span></button>
            <button class="btn btn-secondary btn-sm" data-action="task-toggle" data-id="${next.task.id}">${icon("check", 16)}<span>${t("task.markDone")}</span></button>
          </div>` : `<p class="muted">${summary.total ? t("dashboard.allDone") : t("dashboard.nothingPlanned")}</p>`}
      </section>`;

    const overdueNotice = overdue.length ? `
      <div class="notice notice-info">
        ${icon("info", 16)}
        <span>${t("dashboard.overdue", { n: overdue.length })}</span>
        <a href="#/today" class="link-btn">${t("dashboard.review")}</a>
      </div>` : "";

    const plan = list.length ? `
      ${Tasks.renderTimeline(list, today, { compact: true })}
      ${anytime.length ? `<h3 class="subhead">${t("today.anytime")}</h3>${Tasks.renderList(anytime, { compact: true })}` : ""}`
      : UI.emptyState({ iconName: "today", text: t("today.empty"), actionLabel: t("today.addFirst"), action: "task-add", actionData: `data-date="${today}"` });

    const priorityList = priorities.length
      ? `<ol class="priority-list">${priorities.map((x) => {
          const p = I18n.priority(x.priority);
          return `<li><i class="dot" style="background:${p.color}" title="${esc(I18n.pick(p.label))}"></i>
            <button class="link-btn" data-action="task-edit" data-id="${x.id}">${esc(x.title)}</button>
            ${x.startTime ? `<span class="muted small">${x.startTime}</span>` : ""}</li>`;
        }).join("")}</ol>`
      : `<p class="muted small">${summary.total ? t("dashboard.allDone") : t("dashboard.noPriorities")}</p>`;

    const goals = Goals.active().slice(0, cfg.goalsCount);
    const goalsCard = cfg.showGoals ? `
      <section class="card">
        <div class="card-head"><h2>${t("nav.goals")}</h2><a href="#/goals" class="link-btn small">${t("common.viewAll")}</a></div>
        ${goals.length ? `<ul class="goal-mini-list">${goals.map((g) => Goals.renderMini(g)).join("")}</ul>`
          : `<p class="muted small">${t("goals.empty")}</p><button class="btn btn-ghost btn-sm" data-action="goal-add">${icon("plus", 16)}<span>${t("goals.addFirst")}</span></button>`}
      </section>` : "";

    const habitsCard = cfg.showHabits ? `
      <section class="card">
        <div class="card-head"><h2>${t("dashboard.habitsToday")}</h2><a href="#/habits" class="link-btn small">${t("common.viewAll")}</a></div>
        ${Store.state.habits.length ? Habits.renderTodayList()
          : `<p class="muted small">${t("habits.empty")}</p><button class="btn btn-ghost btn-sm" data-action="habit-add">${icon("plus", 16)}<span>${t("habits.addFirst")}</span></button>`}
      </section>` : "";

    return `
      ${header}
      ${Backup.renderReminder()}
      <div class="top-grid">${progressCard}${nextCard}</div>
      ${overdueNotice}
      <div class="dash-grid">
        <section class="card plan-card" aria-labelledby="plan-title">
          <div class="card-head">
            <h2 id="plan-title">${t("dashboard.todaysPlan")}</h2>
            <a href="#/today" class="link-btn small">${t("dashboard.openDay")}</a>
          </div>
          ${plan}
        </section>
        <div class="side-stack">
          <section class="card">
            <h2>${t("dashboard.topPriorities")}</h2>
            ${priorityList}
          </section>
          ${habitsCard}
          ${goalsCard}
        </div>
      </div>`;
  },
};
