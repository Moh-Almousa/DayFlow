/* Tasks: data operations, add/edit form, and how a task looks on screen */

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const Tasks = {
  /* ---------- Data ---------- */
  all() {
    return Store.state.tasks;
  },

  get(id) {
    return this.all().find((x) => x.id === id);
  },

  forDate(date) {
    return this.all().filter((x) => x.date === date);
  },

  // Unfinished tasks from days before today
  overdue() {
    const today = Utils.today();
    return this.all().filter((x) => !x.completed && x.date < today);
  },

  forGoal(goalId) {
    return this.all().filter((x) => x.goalId === goalId);
  },

  endMinutes(task) {
    const start = Utils.timeToMinutes(task.startTime);
    return start == null ? null : start + (Number(task.duration) || 0);
  },

  // Scheduled tasks first (by time), then unscheduled by priority
  sort(list) {
    return [...list].sort((a, b) => {
      const ta = Utils.timeToMinutes(a.startTime);
      const tb = Utils.timeToMinutes(b.startTime);
      if (ta != null && tb != null) return ta - tb;
      if (ta != null) return -1;
      if (tb != null) return 1;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });
  },

  byPriority(list) {
    return [...list].sort((a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      (Utils.timeToMinutes(a.startTime) ?? 9999) - (Utils.timeToMinutes(b.startTime) ?? 9999));
  },

  // Is this task overlapping with another unfinished task on the same day?
  hasOverlap(task) {
    if (!task.startTime || task.completed) return false;
    const s1 = Utils.timeToMinutes(task.startTime);
    const e1 = this.endMinutes(task);
    return this.forDate(task.date).some((o) => {
      if (o.id === task.id || !o.startTime || o.completed) return false;
      const s2 = Utils.timeToMinutes(o.startTime);
      const e2 = this.endMinutes(o);
      return s1 < e2 && s2 < e1;
    });
  },

  daySummary(date) {
    const list = this.forDate(date);
    const done = list.filter((x) => x.completed).length;
    const plannedMinutes = Utils.sum(list, (x) => Number(x.duration));
    const cfg = SITE_CONFIG.dashboard;
    return {
      total: list.length,
      done,
      percent: Utils.percent(done, list.length),
      plannedMinutes,
      tooMany: list.length > cfg.maxDailyTasks,
      tooLong: plannedMinutes > cfg.maxPlannedHours * 60,
    };
  },

  create(data) {
    const task = Object.assign({
      id: Utils.uid(),
      title: "",
      description: "",
      date: Utils.today(),
      startTime: "",
      duration: SITE_CONFIG.taskDefaults.duration,
      priority: SITE_CONFIG.taskDefaults.priority,
      category: SITE_CONFIG.taskDefaults.category,
      goalId: null,
      reminder: null,
      reminderSent: false,
      completed: false,
      completedAt: null,
      postponedFrom: [],
      createdAt: new Date().toISOString(),
    }, data);
    this.all().push(task);
    Store.save();
    return task;
  },

  update(id, changes) {
    const task = this.get(id);
    if (!task) return;
    // Moving an unfinished task to a later day counts as "postponed"
    if (changes.date && changes.date > task.date && !task.completed) task.postponedFrom.push(task.date);
    if (changes.date !== task.date || changes.startTime !== task.startTime || changes.reminder !== task.reminder) {
      task.reminderSent = false;
    }
    Object.assign(task, changes);
    Store.save();
  },

  remove(id) {
    Store.state.tasks = this.all().filter((x) => x.id !== id);
    Store.save();
  },

  setCompleted(id, completed) {
    const task = this.get(id);
    if (!task) return;
    task.completed = completed;
    task.completedAt = completed ? new Date().toISOString() : null;
    Store.save();
  },

  moveTo(id, date) {
    const task = this.get(id);
    if (!task) return;
    if (date > task.date || task.date < Utils.today()) task.postponedFrom.push(task.date);
    task.date = date;
    task.reminderSent = false;
    Store.save();
  },

  postponeToTomorrow(id) {
    const task = this.get(id);
    if (!task) return;
    const from = task.date > Utils.today() ? task.date : Utils.today();
    this.moveTo(id, Utils.addDays(from, 1));
  },

  /* ---------- Add / Edit form ---------- */
  openForm(id = null, defaults = {}) {
    const task = id ? this.get(id) : null;
    const v = Object.assign({
      title: "",
      description: "",
      date: Utils.today(),
      startTime: "",
      duration: SITE_CONFIG.taskDefaults.duration,
      priority: SITE_CONFIG.taskDefaults.priority,
      category: SITE_CONFIG.taskDefaults.category,
      goalId: "",
      reminder: "",
    }, task || defaults);

    const durations = [...new Set([...SITE_CONFIG.durationOptions, Number(v.duration)])].sort((a, b) => a - b);
    const goalOptions = [{ value: "", label: t("task.noGoal") }]
      .concat(Store.state.goals
        .filter((g) => !g.achievedAt || g.id === v.goalId) // achieved goals are hidden unless already linked
        .map((g) => ({ value: g.id, label: g.title })));
    const reminderOptions = [{ value: "", label: t("task.noReminder") }]
      .concat(SITE_CONFIG.reminderOptions.map((m) => ({ value: m, label: m === 0 ? t("task.reminderAtStart") : t("task.reminderBefore", { m }) })));

    const body = `
      <div class="field">
        <label for="f-title">${t("task.title")}</label>
        <input id="f-title" name="title" type="text" required maxlength="140" value="${Utils.esc(v.title)}" placeholder="${t("task.titlePlaceholder")}" autofocus>
        <p class="field-error" id="f-title-error" hidden>${t("task.titleRequired")}</p>
      </div>
      <div class="field">
        <label for="f-desc">${t("task.description")} <span class="optional">${t("common.optional")}</span></label>
        <textarea id="f-desc" name="description" rows="2">${Utils.esc(v.description)}</textarea>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="f-date">${t("task.date")}</label>
          <input id="f-date" name="date" type="date" required value="${Utils.esc(v.date)}">
        </div>
        <div class="field">
          <label for="f-time">${t("task.startTime")} <span class="optional">${t("common.optional")}</span></label>
          <input id="f-time" name="startTime" type="time" value="${Utils.esc(v.startTime)}">
        </div>
        <div class="field">
          <label for="f-duration">${t("task.duration")}</label>
          <select id="f-duration" name="duration">${UI.options(durations.map((m) => ({ value: m, label: I18n.duration(m) })), v.duration)}</select>
        </div>
      </div>
      <fieldset class="field">
        <legend>${t("task.priority")}</legend>
        <div class="segmented">
          ${SITE_CONFIG.priorities.map((p) => `
            <label class="segment">
              <input type="radio" name="priority" value="${p.id}" ${p.id === v.priority ? "checked" : ""}>
              <span><i class="dot" style="background:${p.color}"></i>${Utils.esc(I18n.pick(p.label))}</span>
            </label>`).join("")}
        </div>
      </fieldset>
      <div class="field-row">
        <div class="field">
          <label for="f-category">${t("task.category")}</label>
          <select id="f-category" name="category">${UI.options(SITE_CONFIG.categories.map((c) => ({ value: c.id, label: I18n.pick(c.label) })), v.category)}</select>
        </div>
        <div class="field">
          <label for="f-goal">${t("task.goal")}</label>
          <select id="f-goal" name="goalId">${UI.options(goalOptions, v.goalId || "")}</select>
        </div>
      </div>
      <div class="field">
        <label for="f-reminder">${t("task.reminder")} <span class="optional">${t("common.optional")}</span></label>
        <select id="f-reminder" name="reminder">${UI.options(reminderOptions, v.reminder ?? "")}</select>
        <p class="field-hint">${t("task.reminderHint")}</p>
      </div>`;

    UI.openModal({
      title: task ? t("task.editTitle") : t("task.addTitle"),
      body,
      footer: `
        ${task ? `<button type="button" class="btn btn-ghost-danger me-auto" id="f-delete">${icon("trash", 16)}<span>${t("common.delete")}</span></button>` : ""}
        <button type="button" class="btn btn-ghost" data-modal-close>${t("common.cancel")}</button>
        <button type="submit" class="btn btn-primary">${task ? t("common.save") : t("task.add")}</button>`,
      onMount: (form) => {
        const del = form.querySelector("#f-delete");
        if (del) del.addEventListener("click", () => Tasks.confirmDelete(task.id));
      },
      onSubmit: (form) => {
        const f = form.elements;
        const title = f.title.value.trim();
        if (!title) {
          form.querySelector("#f-title-error").hidden = false;
          f.title.focus();
          return;
        }
        const reminder = f.reminder.value === "" ? null : Number(f.reminder.value);
        const data = {
          title,
          description: f.description.value.trim(),
          date: f.date.value || Utils.today(),
          startTime: f.startTime.value,
          duration: Number(f.duration.value),
          priority: form.querySelector("input[name=priority]:checked").value,
          category: f.category.value,
          goalId: f.goalId.value || null,
          reminder,
        };
        if (task) this.update(task.id, data);
        else this.create(data);
        if (reminder !== null) Reminders.askPermission();
        UI.closeModal();
        UI.toast(task ? t("toast.taskUpdated") : t("toast.taskAdded"), "success");
        App.render();
      },
    });
  },

  async confirmDelete(id) {
    const task = this.get(id);
    if (!task) return;
    const ok = await UI.confirm({
      title: t("task.deleteTitle"),
      message: t("task.deleteMessage", { title: task.title }),
      confirmText: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    this.remove(id);
    UI.toast(t("toast.taskDeleted"));
    App.render();
  },

  /* ---------- How a task looks ---------- */
  timeRange(task) {
    if (!task.startTime) return "";
    return `${task.startTime} – ${Utils.minutesToTime(this.endMinutes(task))}`;
  },

  renderCard(task, { showDate = false, compact = false } = {}) {
    const esc = Utils.esc;
    const priority = I18n.priority(task.priority);
    const category = I18n.category(task.category);
    const goal = task.goalId ? Store.state.goals.find((g) => g.id === task.goalId) : null;
    const overlap = this.hasOverlap(task);
    const title = esc(task.title);

    const meta = [
      showDate ? `<span class="chip">${icon("calendar", 13)}${esc(I18n.shortDate(task.date))}</span>` : "",
      `<span class="chip">${icon("clock", 13)}${esc(I18n.duration(task.duration))}</span>`,
      `<span class="chip"><i class="dot" style="background:${priority.color}"></i>${esc(I18n.pick(priority.label))}</span>`,
      `<span class="chip"><i class="dot dot-square" style="background:${category.color}"></i>${esc(I18n.pick(category.label))}</span>`,
      goal ? `<span class="chip chip-goal" title="${esc(goal.title)}">${icon("goals", 13)}<span class="chip-text">${esc(goal.title)}</span></span>` : "",
      task.reminder !== null && task.reminder !== undefined && task.startTime ? `<span class="chip" title="${t("task.reminder")}">${icon("bell", 13)}</span>` : "",
      task.postponedFrom.length ? `<span class="chip chip-muted">${t("task.postponedTimes", { n: task.postponedFrom.length })}</span>` : "",
      overlap ? `<span class="chip chip-warning">${icon("alert", 13)}${t("task.overlap")}</span>` : "",
    ].join("");

    const canPostpone = !task.completed;
    const isOverdue = !task.completed && task.date < Utils.today();

    return `
      <div class="task ${task.completed ? "is-done" : ""} ${compact ? "task-compact" : ""} priority-${task.priority}" data-id="${task.id}">
        <button class="check" data-action="task-toggle" data-id="${task.id}" aria-pressed="${task.completed}"
          aria-label="${task.completed ? t("task.markUndone") : t("task.markDone")}: ${title}">${icon("check", 14)}</button>
        <div class="task-main">
          <button class="task-title" data-action="task-edit" data-id="${task.id}" aria-label="${t("common.edit")}: ${title}">${title}</button>
          ${task.description && !compact ? `<p class="task-desc">${esc(task.description)}</p>` : ""}
          <div class="task-meta">${meta}</div>
        </div>
        <div class="task-actions">
          ${!task.completed ? `<button class="icon-btn" data-action="task-focus" data-id="${task.id}" title="${t("task.focus")}" aria-label="${t("task.focus")}: ${title}">${icon("focus", 16)}</button>` : ""}
          ${isOverdue ? `<button class="icon-btn" data-action="task-move-today" data-id="${task.id}" title="${t("task.moveToday")}" aria-label="${t("task.moveToday")}: ${title}">${icon("today", 16)}</button>` : ""}
          ${canPostpone && !isOverdue ? `<button class="icon-btn" data-action="task-postpone" data-id="${task.id}" title="${t("task.postpone")}" aria-label="${t("task.postpone")}: ${title}">${icon("arrowRight", 16)}</button>` : ""}
          <button class="icon-btn" data-action="task-edit" data-id="${task.id}" title="${t("common.edit")}" aria-label="${t("common.edit")}: ${title}">${icon("pencil", 16)}</button>
          <button class="icon-btn icon-btn-danger" data-action="task-delete" data-id="${task.id}" title="${t("common.delete")}" aria-label="${t("common.delete")}: ${title}">${icon("trash", 16)}</button>
        </div>
      </div>`;
  },

  // Timeline of scheduled tasks for one day
  renderTimeline(list, date, opts = {}) {
    const scheduled = this.sort(list.filter((x) => x.startTime));
    if (!scheduled.length) return "";
    const isToday = date === Utils.today();
    const now = Utils.nowMinutes();
    return `
      <ol class="timeline">
        ${scheduled.map((task) => {
          const start = Utils.timeToMinutes(task.startTime);
          const end = this.endMinutes(task);
          const isNow = isToday && !task.completed && now >= start && now < end;
          const isPast = isToday && now >= end;
          return `
            <li class="tl-row ${isNow ? "is-now" : ""} ${isPast ? "is-past" : ""} ${task.completed ? "is-done" : ""}">
              <div class="tl-time">
                <span>${task.startTime}</span>
                ${isNow ? `<span class="now-badge">${t("task.now")}</span>` : ""}
              </div>
              <div class="tl-track"><span class="tl-dot"></span></div>
              ${this.renderCard(task, opts)}
            </li>`;
        }).join("")}
      </ol>`;
  },

  renderList(list, opts = {}) {
    if (!list.length) return "";
    return `<ul class="task-list">${list.map((task) => `<li>${this.renderCard(task, opts)}</li>`).join("")}</ul>`;
  },

  // Warning shown when the day is overloaded
  renderRealityCheck(summary) {
    const cfg = SITE_CONFIG.dashboard;
    if (!summary.tooMany && !summary.tooLong) return "";
    const msg = summary.tooLong
      ? t("today.tooLong", { planned: I18n.duration(summary.plannedMinutes), max: cfg.maxPlannedHours })
      : t("today.tooMany", { count: summary.total, max: cfg.maxDailyTasks });
    return `<div class="notice notice-warning" role="note">${icon("alert", 16)}<span>${msg}</span></div>`;
  },
};

/* ---------- Button actions ---------- */
Actions.on("task-add", (el) => {
  const defaults = {};
  if (el.dataset.date) defaults.date = el.dataset.date;
  if (el.dataset.goal) defaults.goalId = el.dataset.goal;
  Tasks.openForm(null, defaults);
});
Actions.on("task-edit", (el) => Tasks.openForm(el.dataset.id));
Actions.on("task-delete", (el) => Tasks.confirmDelete(el.dataset.id));
Actions.on("task-toggle", (el) => {
  const task = Tasks.get(el.dataset.id);
  if (!task) return;
  Tasks.setCompleted(task.id, !task.completed);
  UI.toast(task.completed ? t("toast.taskDone") : t("toast.taskReopened"), task.completed ? "success" : "default");
  App.render();
});
Actions.on("task-postpone", (el) => {
  Tasks.postponeToTomorrow(el.dataset.id);
  UI.toast(t("toast.taskPostponed"));
  App.render();
});
Actions.on("task-move-today", (el) => {
  Tasks.moveTo(el.dataset.id, Utils.today());
  UI.toast(t("toast.taskMovedToday"));
  App.render();
});
Actions.on("task-focus", (el) => {
  Focus.selectTask(el.dataset.id);
  App.go("focus");
});

/* ---------- Reminders (work while the site is open in a tab) ---------- */
const Reminders = {
  start() {
    this.check();
    setInterval(() => this.check(), 30000);
  },

  askPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(() => App.render());
    }
  },

  check() {
    const today = Utils.today();
    const now = Utils.nowMinutes();
    let changed = false;
    Tasks.forDate(today).forEach((task) => {
      if (task.completed || task.reminderSent || task.reminder == null || !task.startTime) return;
      const start = Utils.timeToMinutes(task.startTime);
      const fireAt = start - task.reminder;
      if (now >= fireAt && now < start + 30) {
        task.reminderSent = true;
        changed = true;
        const text = task.reminder === 0
          ? t("reminder.startsNow", { title: task.title })
          : t("reminder.startsIn", { title: task.title, m: Math.max(0, start - now) });
        this.notify(text);
      }
    });
    if (changed) Store.save();
  },

  notify(text) {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(SITE_CONFIG.appName, { body: text });
      } catch (e) { /* some mobile browsers don't allow this */ }
    }
    UI.toast(text, "info");
  },
};
