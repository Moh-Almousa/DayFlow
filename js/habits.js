/* Habits: simple daily/weekly habits with streaks and commitment rate */

const Habits = {
  all() {
    return Store.state.habits;
  },

  get(id) {
    return this.all().find((h) => h.id === id);
  },

  isScheduled(habit, date) {
    return habit.days.includes(Utils.weekday(date));
  },

  isDone(habit, date) {
    return !!habit.log[date];
  },

  // First day we count from (creation date or the oldest check-in)
  startDate(habit) {
    const created = habit.createdAt ? Utils.dateStr(new Date(habit.createdAt)) : Utils.today();
    const logged = Object.keys(habit.log).sort()[0];
    return logged && logged < created ? logged : created;
  },

  // Current streak: scheduled days completed in a row (today doesn't break it until the day is over)
  streak(habit) {
    const start = this.startDate(habit);
    let date = Utils.today();
    if (this.isScheduled(habit, date) && !this.isDone(habit, date)) date = Utils.addDays(date, -1);
    let count = 0;
    for (let i = 0; i < 400 && date >= start; i++) {
      if (this.isScheduled(habit, date)) {
        if (this.isDone(habit, date)) count++;
        else break;
      }
      date = Utils.addDays(date, -1);
    }
    return count;
  },

  // Commitment rate over a period (default: last 30 days)
  rate(habit, from = Utils.addDays(Utils.today(), -29), to = Utils.today()) {
    const start = this.startDate(habit) > from ? this.startDate(habit) : from;
    let scheduled = 0;
    let done = 0;
    for (let d = start; d <= to; d = Utils.addDays(d, 1)) {
      if (!this.isScheduled(habit, d)) continue;
      const isOpenToday = d === Utils.today() && !this.isDone(habit, d);
      if (isOpenToday) continue;
      scheduled++;
      if (this.isDone(habit, d)) done++;
    }
    return { scheduled, done, percent: Utils.percent(done, scheduled) };
  },

  scheduledOn(date) {
    return this.all().filter((h) => this.isScheduled(h, date));
  },

  toggle(id, date) {
    const habit = this.get(id);
    if (!habit || date > Utils.today()) return;
    if (habit.log[date]) delete habit.log[date];
    else habit.log[date] = true;
    Store.save();
  },

  frequencyLabel(habit) {
    if (habit.days.length === 7) return t("habits.everyDay");
    return [...habit.days].sort((a, b) => ((a - SITE_CONFIG.weekStartsOn + 7) % 7) - ((b - SITE_CONFIG.weekStartsOn + 7) % 7))
      .map((d) => I18n.weekdayName(d)).join(" · ");
  },

  /* ---------- Form ---------- */
  openForm(id = null) {
    const habit = id ? this.get(id) : null;
    const v = Object.assign({ name: "", days: [0, 1, 2, 3, 4, 5, 6] }, habit || {});
    const order = [0, 1, 2, 3, 4, 5, 6].map((i) => (i + SITE_CONFIG.weekStartsOn) % 7);

    const body = `
      <div class="field">
        <label for="h-name">${t("habits.name")}</label>
        <input id="h-name" name="name" type="text" maxlength="80" value="${Utils.esc(v.name)}" placeholder="${t("habits.namePlaceholder")}" autofocus>
        <p class="field-error" id="h-name-error" hidden>${t("habits.nameRequired")}</p>
      </div>
      <fieldset class="field">
        <legend>${t("habits.frequency")}</legend>
        <div class="day-picker">
          ${order.map((d) => `
            <label class="day-chip">
              <input type="checkbox" name="days" value="${d}" ${v.days.includes(d) ? "checked" : ""}>
              <span>${I18n.weekdayName(d)}</span>
            </label>`).join("")}
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="h-all">${t("habits.selectAll")}</button>
        <p class="field-error" id="h-days-error" hidden>${t("habits.daysRequired")}</p>
      </fieldset>`;

    UI.openModal({
      title: habit ? t("habits.editHabit") : t("habits.newHabit"),
      body,
      footer: `
        <button type="button" class="btn btn-ghost" data-modal-close>${t("common.cancel")}</button>
        <button type="submit" class="btn btn-primary">${habit ? t("common.save") : t("habits.create")}</button>`,
      onMount: (form) => {
        form.querySelector("#h-all").addEventListener("click", () => {
          form.querySelectorAll("input[name=days]").forEach((c) => { c.checked = true; });
        });
      },
      onSubmit: (form) => {
        const name = form.elements.name.value.trim();
        const days = [...form.querySelectorAll("input[name=days]:checked")].map((c) => Number(c.value));
        form.querySelector("#h-name-error").hidden = !!name;
        form.querySelector("#h-days-error").hidden = days.length > 0;
        if (!name || !days.length) return;
        if (habit) Object.assign(habit, { name, days });
        else this.all().push({ id: Utils.uid(), name, days, log: {}, createdAt: new Date().toISOString() });
        Store.save();
        UI.closeModal();
        UI.toast(habit ? t("toast.habitUpdated") : t("toast.habitCreated"), "success");
        App.render();
      },
    });
  },

  async confirmDelete(id) {
    const habit = this.get(id);
    if (!habit) return;
    const ok = await UI.confirm({
      title: t("habits.deleteTitle"),
      message: t("habits.deleteMessage", { name: habit.name }),
      confirmText: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    Store.state.habits = this.all().filter((h) => h.id !== id);
    Store.save();
    UI.toast(t("toast.habitDeleted"));
    App.render();
  },

  /* ---------- How a habit looks ---------- */
  dayButton(habit, date, withLabel = true) {
    const scheduled = this.isScheduled(habit, date);
    const done = this.isDone(habit, date);
    const label = `${Utils.esc(habit.name)} — ${Utils.esc(I18n.longDate(date))}`;
    const isToday = date === Utils.today();
    return `
      <div class="habit-day ${isToday ? "is-today" : ""}">
        ${withLabel ? `<span class="habit-day-label">${Utils.esc(I18n.weekdayShort(date))}</span>` : ""}
        <button class="habit-dot ${done ? "is-done" : ""} ${scheduled ? "" : "is-off"}" data-action="habit-toggle" data-id="${habit.id}" data-date="${date}"
          aria-pressed="${done}" aria-label="${label}" title="${label}">${done ? icon("check", 14) : ""}</button>
      </div>`;
  },

  renderCard(habit) {
    const today = Utils.today();
    const days = [6, 5, 4, 3, 2, 1, 0].map((n) => Utils.addDays(today, -n));
    const streak = this.streak(habit);
    const rate = this.rate(habit);
    return `
      <article class="card habit-card">
        <div class="habit-head">
          <div>
            <h3>${Utils.esc(habit.name)}</h3>
            <p class="muted small">${Utils.esc(this.frequencyLabel(habit))}</p>
          </div>
          <div class="goal-actions">
            <button class="icon-btn" data-action="habit-edit" data-id="${habit.id}" aria-label="${t("common.edit")}: ${Utils.esc(habit.name)}" title="${t("common.edit")}">${icon("pencil", 16)}</button>
            <button class="icon-btn icon-btn-danger" data-action="habit-delete" data-id="${habit.id}" aria-label="${t("common.delete")}: ${Utils.esc(habit.name)}" title="${t("common.delete")}">${icon("trash", 16)}</button>
          </div>
        </div>
        <div class="habit-week">${days.map((d) => this.dayButton(habit, d)).join("")}</div>
        <div class="habit-stats">
          <span class="chip ${streak ? "chip-success" : "chip-muted"}">${icon("flame", 13)}${t("habits.streak", { n: streak })}</span>
          <span class="chip chip-muted">${t("habits.rate", { p: rate.percent })}</span>
        </div>
      </article>`;
  },

  // Today's checklist for the dashboard
  renderTodayList() {
    const today = Utils.today();
    const list = this.scheduledOn(today);
    if (!list.length) return `<p class="muted small">${t("habits.noneToday")}</p>`;
    return `
      <ul class="habit-today-list">
        ${list.map((h) => {
          const done = this.isDone(h, today);
          return `
            <li>
              <button class="habit-row ${done ? "is-done" : ""}" data-action="habit-toggle" data-id="${h.id}" data-date="${today}" aria-pressed="${done}">
                <span class="check check-sm" aria-hidden="true">${icon("check", 12)}</span>
                <span class="habit-row-name">${Utils.esc(h.name)}</span>
                <span class="muted small">${icon("flame", 13)} ${this.streak(h)}</span>
              </button>
            </li>`;
        }).join("")}
      </ul>`;
  },

  /* ---------- Page ---------- */
  render() {
    const habits = this.all();
    const header = UI.pageHeader(t("habits.title"), t("habits.subtitle"),
      `<button class="btn btn-primary" data-action="habit-add">${icon("plus", 16)}<span>${t("habits.newHabit")}</span></button>`);
    if (!habits.length) {
      return header + `<section class="card">${UI.emptyState({ iconName: "habits", text: t("habits.empty"), actionLabel: t("habits.addFirst"), action: "habit-add" })}</section>`;
    }
    const today = Utils.today();
    const scheduled = this.scheduledOn(today);
    const doneToday = scheduled.filter((h) => this.isDone(h, today)).length;
    return header + `
      <section class="card summary-strip">
        <span>${t("habits.todaySummary", { done: doneToday, total: scheduled.length })}</span>
        ${UI.progressBar(Utils.percent(doneToday, scheduled.length), "progress-success")}
      </section>
      <div class="habit-grid">${habits.map((h) => this.renderCard(h)).join("")}</div>`;
  },
};

Actions.on("habit-add", () => Habits.openForm());
Actions.on("habit-edit", (el) => Habits.openForm(el.dataset.id));
Actions.on("habit-delete", (el) => Habits.confirmDelete(el.dataset.id));
Actions.on("habit-toggle", (el) => {
  Habits.toggle(el.dataset.id, el.dataset.date);
  App.render();
});
