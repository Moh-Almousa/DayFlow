/* Daily Review: end-of-day summary + three reflection questions */

const Review = {
  date: null, // the day being reviewed (null = today)

  currentDate() {
    return this.date || Utils.today();
  },

  stats(date) {
    const tasks = Tasks.forDate(date);
    const habits = Habits.scheduledOn(date);
    return {
      tasksDone: tasks.filter((x) => x.completed).length,
      tasksTotal: tasks.length,
      postponed: Store.state.tasks.filter((x) => x.postponedFrom.includes(date)).length,
      focusMinutes: Focus.minutesOn(date),
      habitsDone: habits.filter((h) => Habits.isDone(h, date)).length,
      habitsTotal: habits.length,
      goals: Goals.progressedOn(date),
      unfinished: tasks.filter((x) => !x.completed),
    };
  },

  save(date, form) {
    const f = form.elements;
    Store.state.dailyReviews[date] = {
      wentWell: f.wentWell.value.trim(),
      gotInWay: f.gotInWay.value.trim(),
      improve: f.improve.value.trim(),
      savedAt: new Date().toISOString(),
    };
    Store.save();
    UI.toast(t("toast.reviewSaved"), "success");
    App.render();
  },

  render() {
    const esc = Utils.esc;
    const date = this.currentDate();
    const today = Utils.today();
    const s = this.stats(date);
    const saved = Store.state.dailyReviews[date] || {};
    const past = Object.keys(Store.state.dailyReviews).filter((d) => d !== date).sort().reverse().slice(0, 7);

    const nav = `
      <div class="day-nav">
        <button class="icon-btn" data-action="review-prev" aria-label="${t("common.previousDay")}">${icon("chevronLeft")}</button>
        <span class="day-nav-label">${esc(I18n.longDate(date))}</span>
        <button class="icon-btn" data-action="review-next" aria-label="${t("common.nextDay")}" ${date >= today ? "disabled" : ""}>${icon("chevronRight")}</button>
        ${date !== today ? `<button class="btn btn-ghost btn-sm" data-action="review-today">${t("common.today")}</button>` : ""}
      </div>`;

    const question = (name, label) => `
      <div class="field">
        <label for="r-${name}">${label}</label>
        <textarea id="r-${name}" name="${name}" rows="3">${esc(saved[name] || "")}</textarea>
      </div>`;

    return UI.pageHeader(t("review.title"), t("review.subtitle"), nav) + `
      <section class="stats-grid">
        ${UI.stat(t("review.tasksCompleted"), `${s.tasksDone} / ${s.tasksTotal}`)}
        ${UI.stat(t("review.tasksPostponed"), String(s.postponed))}
        ${UI.stat(t("review.focusTime"), esc(I18n.duration(s.focusMinutes)))}
        ${UI.stat(t("review.habitsCompleted"), `${s.habitsDone} / ${s.habitsTotal}`)}
        ${UI.stat(t("review.goalsProgressed"), String(s.goals.length),
          s.goals.length ? esc(s.goals.map((g) => g.title).join(t("common.listSeparator"))) : "")}
      </section>

      ${s.unfinished.length ? `
        <section class="card">
          <div class="card-head">
            <h2>${t("review.unfinished", { n: s.unfinished.length })}</h2>
            <button class="btn btn-secondary btn-sm" data-action="review-postpone-all">${icon("arrowRight", 16)}<span>${t("review.moveAllTomorrow")}</span></button>
          </div>
          ${Tasks.renderList(Tasks.sort(s.unfinished), { compact: true })}
        </section>` : ""}

      <section class="card">
        <div class="card-head"><h2>${t("review.reflection")}</h2>
          ${saved.savedAt ? `<span class="muted small">${t("review.savedAt", { time: new Date(saved.savedAt).toLocaleTimeString(I18n.locale(), { hour: "2-digit", minute: "2-digit" }) })}</span>` : ""}
        </div>
        <form id="review-form" class="review-form">
          ${question("wentWell", t("review.wentWell"))}
          ${question("gotInWay", t("review.gotInWay"))}
          ${question("improve", t("review.improve"))}
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${icon("check", 16)}<span>${t("review.save")}</span></button>
          </div>
        </form>
      </section>

      ${past.length ? `
        <section class="card">
          <h2>${t("review.previous")}</h2>
          <ul class="chip-list">
            ${past.map((d) => `<li><button class="pill" data-action="review-open" data-date="${d}">${esc(I18n.shortDate(d))}</button></li>`).join("")}
          </ul>
        </section>` : ""}`;
  },

  // Called after the page is on screen
  mount() {
    const form = document.getElementById("review-form");
    if (form) form.addEventListener("submit", (e) => { e.preventDefault(); this.save(this.currentDate(), form); });
  },
};

Actions.on("review-prev", () => { Review.date = Utils.addDays(Review.currentDate(), -1); App.render(); });
Actions.on("review-next", () => {
  const next = Utils.addDays(Review.currentDate(), 1);
  Review.date = next >= Utils.today() ? null : next;
  App.render();
});
Actions.on("review-today", () => { Review.date = null; App.render(); });
Actions.on("review-open", (el) => { Review.date = el.dataset.date === Utils.today() ? null : el.dataset.date; App.render(); });
Actions.on("review-postpone-all", () => {
  const date = Review.currentDate();
  const target = Utils.addDays(date >= Utils.today() ? date : Utils.today(), 1);
  Tasks.forDate(date).filter((x) => !x.completed).forEach((x) => Tasks.moveTo(x.id, target));
  UI.toast(t("toast.allPostponed"));
  App.render();
});
