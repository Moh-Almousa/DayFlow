/* Goals: long-term goals with milestones and linked tasks */

const Goals = {
  all() {
    return Store.state.goals;
  },

  get(id) {
    return this.all().find((g) => g.id === id);
  },

  // Goals still in progress (not marked as achieved)
  active() {
    return this.all().filter((g) => !g.achievedAt);
  },

  achieved() {
    return this.all().filter((g) => g.achievedAt).sort((a, b) => b.achievedAt.localeCompare(a.achievedAt));
  },

  setAchieved(id, achieved) {
    const goal = this.get(id);
    if (!goal) return;
    goal.achievedAt = achieved ? new Date().toISOString() : null;
    Store.save();
  },

  // Progress in % — from milestones (automatic) or the manual value
  progress(goal) {
    if (goal.autoProgress && goal.milestones.length) {
      return Utils.percent(goal.milestones.filter((m) => m.done).length, goal.milestones.length);
    }
    return Utils.clamp(Number(goal.progress) || 0, 0, 100);
  },

  daysLeft(goal) {
    return goal.deadline ? Utils.daysBetween(Utils.today(), goal.deadline) : null;
  },

  // Goals that moved forward on a given day (a linked task or a milestone was completed)
  progressedOn(date) {
    const ids = new Set();
    Store.state.tasks.forEach((task) => {
      if (task.goalId && task.completed && task.completedAt && Utils.dateStr(new Date(task.completedAt)) === date) ids.add(task.goalId);
    });
    this.all().forEach((g) => {
      if (g.milestones.some((m) => m.done && m.doneAt && Utils.dateStr(new Date(m.doneAt)) === date)) ids.add(g.id);
    });
    return this.all().filter((g) => ids.has(g.id));
  },

  /* ---------- Progress history ----------
     Saves one value per goal per day: goal.history = { "YYYY-MM-DD": 50 }
     Runs automatically every time the app draws a page. */
  snapshotAll() {
    const today = Utils.today();
    let changed = false;
    this.all().forEach((g) => {
      if (!g.history || typeof g.history !== "object") g.history = {};
      if (g.achievedAt) return; // achieved goals keep their history as it was
      const pct = this.progress(g);
      if (g.history[today] !== pct) {
        g.history[today] = pct;
        changed = true;
      }
    });
    if (changed) Store.save();
  },

  historyPoints(goal) {
    const days = (SITE_CONFIG.goals && SITE_CONFIG.goals.historyDays) || 90;
    const from = Utils.addDays(Utils.today(), -(days - 1));
    return Object.keys(goal.history || {})
      .filter((d) => Utils.isValidDate(d) && d >= from)
      .sort()
      .map((d) => ({ date: d, value: Number(goal.history[d]) || 0 }));
  },

  // Line chart of progress over time (inside the goal card)
  renderHistory(goal) {
    const esc = Utils.esc;
    const pts = this.historyPoints(goal);
    const title = `<h4>${t("goals.history")}</h4>`;
    if (pts.length < 2) {
      return `<div class="goal-section">${title}<p class="muted small">${t("goals.historyEmpty")}</p></div>`;
    }

    const W = 300;
    const H = 90;
    const rtl = document.documentElement.dir === "rtl";
    const first = pts[0];
    const last = pts[pts.length - 1];
    const span = Math.max(1, Utils.daysBetween(first.date, last.date));
    const x = (d) => { const r = Utils.daysBetween(first.date, d) / span; return (rtl ? 1 - r : r) * W; };
    const y = (v) => (1 - v / 100) * H;
    const line = pts.map((p) => `${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const data = pts.map((p) => [p.date, p.value, +(x(p.date) / W * 100).toFixed(2), +(y(p.value) / H * 100).toFixed(2)]);
    const change = last.value - first.value;
    const summary = t("goals.historySummary", { start: first.value, from: I18n.shortDate(first.date), end: last.value, to: I18n.shortDate(last.date) });

    return `
      <div class="goal-section">
        <div class="row-between">
          ${title}
          <span class="small ${change > 0 ? "text-success" : "muted"}" title="${esc(summary)}"><bdi dir="ltr">${change > 0 ? "+" : ""}${change}%</bdi></span>
        </div>
        <div class="goal-chart" tabindex="0" role="img" aria-label="${esc(t("goals.history") + ": " + summary)}" data-points='${esc(JSON.stringify(data))}'>
          <div class="goal-chart-plot">
            ${[100, 50, 0].map((v) => `<span class="chart-y-label" style="top:${(y(v) / H) * 100}%"><bdi dir="ltr">${v}%</bdi></span>`).join("")}
            <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              ${[100, 50, 0].map((v) => `<line x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/>`).join("")}
              <polyline points="${line}" class="chart-line"/>
            </svg>
            <span class="chart-dot" style="left:${data[data.length - 1][2]}%;top:${data[data.length - 1][3]}%"></span>
            <span class="chart-cross" hidden></span>
            <span class="chart-dot chart-hover-dot" hidden></span>
            <span class="chart-tip" hidden></span>
          </div>
          <div class="goal-chart-x">
            <span>${esc(I18n.shortDate(first.date))}</span>
            <span>${last.date === Utils.today() ? t("common.today") : esc(I18n.shortDate(last.date))}</span>
          </div>
        </div>
      </div>`;
  },

  // Hover / touch / keyboard tooltip for the history charts
  mount() {
    document.querySelectorAll(".goal-chart").forEach((chart) => {
      const pts = JSON.parse(chart.dataset.points);
      const plot = chart.querySelector(".goal-chart-plot");
      const cross = chart.querySelector(".chart-cross");
      const dot = chart.querySelector(".chart-hover-dot");
      const tip = chart.querySelector(".chart-tip");
      let index = pts.length - 1;

      const show = (i) => {
        index = i;
        const [date, value, xPct, yPct] = pts[i];
        cross.hidden = false;
        dot.hidden = false;
        tip.hidden = false;
        cross.style.left = xPct + "%";
        dot.style.left = xPct + "%";
        dot.style.top = yPct + "%";
        tip.textContent = `${I18n.shortDate(date)} · ${value}%`;
        const w = plot.clientWidth;
        const tw = tip.offsetWidth;
        tip.style.left = Utils.clamp((xPct / 100) * w, tw / 2, w - tw / 2) + "px";
      };
      const hide = () => { cross.hidden = true; dot.hidden = true; tip.hidden = true; };

      plot.addEventListener("pointermove", (e) => {
        const r = plot.getBoundingClientRect();
        const pct = ((e.clientX - r.left) / r.width) * 100;
        let best = 0;
        pts.forEach((p, i) => { if (Math.abs(p[2] - pct) < Math.abs(pts[best][2] - pct)) best = i; });
        show(best);
      });
      plot.addEventListener("pointerleave", hide);
      chart.addEventListener("focus", () => show(index));
      chart.addEventListener("blur", hide);
      chart.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        const forward = (e.key === "ArrowRight") !== (document.documentElement.dir === "rtl");
        show(Utils.clamp(index + (forward ? 1 : -1), 0, pts.length - 1));
      });
    });
  },

  save(id, data) {
    if (id) {
      Object.assign(this.get(id), data);
    } else {
      this.all().push(Object.assign({ id: Utils.uid(), createdAt: new Date().toISOString() }, data));
    }
    Store.save();
  },

  remove(id) {
    Store.state.goals = this.all().filter((g) => g.id !== id);
    Store.state.tasks.forEach((task) => { if (task.goalId === id) task.goalId = null; });
    Store.save();
  },

  toggleMilestone(goalId, milestoneId) {
    const goal = this.get(goalId);
    const m = goal && goal.milestones.find((x) => x.id === milestoneId);
    if (!m) return;
    m.done = !m.done;
    m.doneAt = m.done ? new Date().toISOString() : null;
    Store.save();
  },

  /* ---------- Form ---------- */
  milestoneRow(m = {}) {
    return `
      <div class="ms-edit-row" data-ms-id="${Utils.esc(m.id || "")}" data-done="${m.done ? "1" : ""}" data-done-at="${Utils.esc(m.doneAt || "")}">
        <input type="text" class="ms-input" maxlength="100" value="${Utils.esc(m.title || "")}" aria-label="${t("goals.milestone")}" placeholder="${t("goals.milestonePlaceholder")}">
        <button type="button" class="icon-btn icon-btn-danger ms-remove" aria-label="${t("goals.removeMilestone")}">${icon("x", 16)}</button>
      </div>`;
  },

  openForm(id = null) {
    const goal = id ? this.get(id) : null;
    const v = Object.assign({ title: "", description: "", deadline: "", autoProgress: true, progress: 0, milestones: [] }, goal || {});

    const body = `
      <div class="field">
        <label for="g-title">${t("goals.goalTitle")}</label>
        <input id="g-title" name="title" type="text" maxlength="120" value="${Utils.esc(v.title)}" placeholder="${t("goals.titlePlaceholder")}" autofocus>
        <p class="field-error" id="g-title-error" hidden>${t("goals.titleRequired")}</p>
      </div>
      <div class="field">
        <label for="g-desc">${t("task.description")} <span class="optional">${t("common.optional")}</span></label>
        <textarea id="g-desc" name="description" rows="2">${Utils.esc(v.description)}</textarea>
      </div>
      <div class="field">
        <label for="g-deadline">${t("goals.deadline")} <span class="optional">${t("common.optional")}</span></label>
        <input id="g-deadline" name="deadline" type="date" value="${Utils.esc(v.deadline)}">
      </div>
      <fieldset class="field">
        <legend>${t("goals.milestones")}</legend>
        <div id="ms-list" class="ms-edit-list">${v.milestones.map((m) => this.milestoneRow(m)).join("")}</div>
        <button type="button" class="btn btn-ghost btn-sm" id="ms-add">${icon("plus", 16)}<span>${t("goals.addMilestone")}</span></button>
      </fieldset>
      <fieldset class="field">
        <legend>${t("goals.progress")}</legend>
        <label class="switch-row">
          <input type="checkbox" name="autoProgress" ${v.autoProgress ? "checked" : ""}>
          <span>${t("goals.autoProgress")}</span>
        </label>
        <div class="range-row" id="manual-progress">
          <input type="range" name="progress" min="0" max="100" step="5" value="${Number(v.progress) || 0}" aria-label="${t("goals.progress")}">
          <output id="progress-out">${Number(v.progress) || 0}%</output>
        </div>
      </fieldset>`;

    UI.openModal({
      title: goal ? t("goals.editGoal") : t("goals.newGoal"),
      body,
      footer: `
        <button type="button" class="btn btn-ghost" data-modal-close>${t("common.cancel")}</button>
        <button type="submit" class="btn btn-primary">${goal ? t("common.save") : t("goals.create")}</button>`,
      onMount: (form) => {
        const list = form.querySelector("#ms-list");
        const auto = form.elements.autoProgress;
        const range = form.elements.progress;
        const out = form.querySelector("#progress-out");
        const syncManual = () => { form.querySelector("#manual-progress").hidden = auto.checked; };
        syncManual();
        auto.addEventListener("change", syncManual);
        range.addEventListener("input", () => { out.textContent = range.value + "%"; });
        form.querySelector("#ms-add").addEventListener("click", () => {
          list.insertAdjacentHTML("beforeend", this.milestoneRow());
          list.lastElementChild.querySelector("input").focus();
        });
        list.addEventListener("click", (e) => {
          const btn = e.target.closest(".ms-remove");
          if (btn) btn.closest(".ms-edit-row").remove();
        });
      },
      onSubmit: (form) => {
        const f = form.elements;
        const title = f.title.value.trim();
        if (!title) {
          form.querySelector("#g-title-error").hidden = false;
          f.title.focus();
          return;
        }
        const milestones = [...form.querySelectorAll(".ms-edit-row")]
          .map((row) => ({
            id: row.dataset.msId || Utils.uid(),
            title: row.querySelector("input").value.trim(),
            done: row.dataset.done === "1",
            doneAt: row.dataset.doneAt || null,
          }))
          .filter((m) => m.title);
        this.save(goal ? goal.id : null, {
          title,
          description: f.description.value.trim(),
          deadline: f.deadline.value,
          autoProgress: f.autoProgress.checked,
          progress: Number(f.progress.value),
          milestones,
        });
        UI.closeModal();
        UI.toast(goal ? t("toast.goalUpdated") : t("toast.goalCreated"), "success");
        App.render();
      },
    });
  },

  async confirmDelete(id) {
    const goal = this.get(id);
    if (!goal) return;
    const ok = await UI.confirm({
      title: t("goals.deleteTitle"),
      message: t("goals.deleteMessage", { title: goal.title }),
      confirmText: t("common.delete"),
      danger: true,
    });
    if (!ok) return;
    this.remove(id);
    UI.toast(t("toast.goalDeleted"));
    App.render();
  },

  /* ---------- How a goal looks ---------- */
  deadlineChip(goal) {
    const days = this.daysLeft(goal);
    if (days === null) return "";
    let text;
    let cls = "chip";
    if (days < 0) { text = t("goals.overdueBy", { n: -days }); cls += " chip-danger"; }
    else if (days === 0) { text = t("goals.dueToday"); cls += " chip-warning"; }
    else { text = t("goals.daysLeft", { n: days }); if (days <= 7) cls += " chip-warning"; }
    return `<span class="${cls}" title="${Utils.esc(I18n.longDate(goal.deadline))}">${icon("flag", 13)}${text}</span>`;
  },

  renderCard(goal) {
    const esc = Utils.esc;
    const pct = this.progress(goal);
    const tasks = Tasks.forGoal(goal.id);
    const done = tasks.filter((x) => x.completed).length;
    const upcoming = Tasks.sort(tasks.filter((x) => !x.completed && x.date >= Utils.today()))
      .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

    return `
      <article class="card goal-card">
        <header class="goal-head">
          <div>
            <h3>${esc(goal.title)}</h3>
            ${goal.description ? `<p class="muted">${esc(goal.description)}</p>` : ""}
          </div>
          <div class="goal-actions">
            <button class="icon-btn icon-btn-success" data-action="goal-achieve" data-id="${goal.id}" aria-label="${t("goals.markAchieved")}: ${esc(goal.title)}" title="${t("goals.markAchieved")}">${icon("trophy", 16)}</button>
            <button class="icon-btn" data-action="goal-edit" data-id="${goal.id}" aria-label="${t("common.edit")}: ${esc(goal.title)}" title="${t("common.edit")}">${icon("pencil", 16)}</button>
            <button class="icon-btn icon-btn-danger" data-action="goal-delete" data-id="${goal.id}" aria-label="${t("common.delete")}: ${esc(goal.title)}" title="${t("common.delete")}">${icon("trash", 16)}</button>
          </div>
        </header>

        <div class="goal-progress">
          <div class="row-between">
            <span class="label">${t("goals.progress")}</span>
            <strong>${pct}%</strong>
          </div>
          ${UI.progressBar(pct)}
          <div class="goal-chips">
            ${this.deadlineChip(goal)}
            <span class="chip chip-muted">${goal.autoProgress && goal.milestones.length ? t("goals.autoLabel") : t("goals.manualLabel")}</span>
          </div>
        </div>

        ${this.renderHistory(goal)}

        ${goal.milestones.length ? `
          <div class="goal-section">
            <h4>${t("goals.milestones")}</h4>
            <ul class="milestones">
              ${goal.milestones.map((m) => `
                <li>
                  <button class="milestone ${m.done ? "is-done" : ""}" data-action="milestone-toggle" data-goal="${goal.id}" data-id="${m.id}" aria-pressed="${m.done}">
                    <span class="check check-sm" aria-hidden="true">${icon("check", 12)}</span>
                    <span>${esc(m.title)}</span>
                  </button>
                </li>`).join("")}
            </ul>
          </div>` : ""}

        <div class="goal-section">
          <div class="row-between">
            <h4>${t("goals.linkedTasks")}</h4>
            <span class="muted small">${t("goals.tasksDone", { done, total: tasks.length })}</span>
          </div>
          ${upcoming.length ? `
            <ul class="mini-list">
              ${upcoming.map((task) => `
                <li><button class="link-btn" data-action="task-edit" data-id="${task.id}">${esc(task.title)}</button>
                <span class="muted small">${esc(I18n.shortDate(task.date))}${task.startTime ? " · " + task.startTime : ""}</span></li>`).join("")}
            </ul>` : `<p class="muted small">${t("goals.noUpcomingTasks")}</p>`}
          <button class="btn btn-ghost btn-sm" data-action="task-add" data-goal="${goal.id}">${icon("plus", 16)}<span>${t("goals.addTaskToGoal")}</span></button>
        </div>
      </article>`;
  },

  // Compact version for the dashboard
  renderMini(goal) {
    const pct = this.progress(goal);
    return `
      <li class="goal-mini">
        <div class="row-between">
          <a href="#/goals" class="goal-mini-title">${Utils.esc(goal.title)}</a>
          <span class="small strong">${pct}%</span>
        </div>
        ${UI.progressBar(pct)}
      </li>`;
  },

  /* ---------- Page ---------- */
  // Achieved goals: a compact list under the active goals
  renderAchieved(list) {
    const esc = Utils.esc;
    return `
      <section class="card">
        <h2>${t("goals.achievedSection", { n: list.length })}</h2>
        <ul class="ach-goals">
          ${list.map((g) => `
            <li>
              <span class="ach-trophy" aria-hidden="true">${icon("trophy", 16)}</span>
              <div class="ach-main">
                <strong>${esc(g.title)}</strong>
                <p class="muted small">${t("goals.achievedOn", { date: esc(I18n.shortDate(Utils.dateStr(new Date(g.achievedAt)))) })}
                  · ${this.progress(g)}% · ${t("goals.tasksDone", { done: Tasks.forGoal(g.id).filter((x) => x.completed).length, total: Tasks.forGoal(g.id).length })}</p>
              </div>
              <div class="goal-actions">
                <button class="btn btn-ghost btn-sm" data-action="goal-reopen" data-id="${g.id}">${icon("reset", 14)}<span>${t("goals.reopen")}</span></button>
                <button class="icon-btn icon-btn-danger" data-action="goal-delete" data-id="${g.id}" aria-label="${t("common.delete")}: ${esc(g.title)}" title="${t("common.delete")}">${icon("trash", 16)}</button>
              </div>
            </li>`).join("")}
        </ul>
      </section>`;
  },

  render() {
    const active = this.active();
    const achieved = this.achieved();
    const header = UI.pageHeader(t("goals.title"), t("goals.subtitle"),
      `<button class="btn btn-primary" data-action="goal-add">${icon("plus", 16)}<span>${t("goals.newGoal")}</span></button>`);
    const activeHtml = active.length
      ? `<div class="goal-grid">${active.map((g) => this.renderCard(g)).join("")}</div>`
      : `<section class="card">${UI.emptyState({ iconName: "goals", text: t("goals.empty"), actionLabel: t("goals.addFirst"), action: "goal-add" })}</section>`;
    return header + activeHtml + (achieved.length ? this.renderAchieved(achieved) : "");
  },
};

Actions.on("goal-add", () => Goals.openForm());
Actions.on("goal-edit", (el) => Goals.openForm(el.dataset.id));
Actions.on("goal-delete", (el) => Goals.confirmDelete(el.dataset.id));
Actions.on("goal-achieve", (el) => {
  Goals.setAchieved(el.dataset.id, true);
  UI.toast(t("toast.goalAchieved"), "success");
  App.render();
});
Actions.on("goal-reopen", (el) => {
  Goals.setAchieved(el.dataset.id, false);
  UI.toast(t("toast.goalReopened"));
  App.render();
});
Actions.on("milestone-toggle", (el) => {
  Goals.toggleMilestone(el.dataset.goal, el.dataset.id);
  App.render();
});
