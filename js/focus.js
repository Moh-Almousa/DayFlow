/* Focus Mode: a simple Pomodoro timer linked to a task.
   Durations come from SITE_CONFIG.pomodoro */

const Focus = {
  taskId: null,
  mode: "focus",          // focus | break | longBreak
  running: false,
  remaining: SITE_CONFIG.pomodoro.focusMinutes * 60, // seconds
  endAt: null,
  sessionsDone: 0,
  timer: null,

  durationFor(mode) {
    const p = SITE_CONFIG.pomodoro;
    const minutes = mode === "focus" ? p.focusMinutes : mode === "longBreak" ? p.longBreakMinutes : p.breakMinutes;
    return minutes * 60;
  },

  selectTask(id) {
    this.taskId = id || null;
  },

  currentTask() {
    return this.taskId ? Tasks.get(this.taskId) : null;
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.endAt = Date.now() + this.remaining * 1000;
    this.timer = setInterval(() => this.tick(), 250);
    this.refresh();
  },

  pause() {
    if (!this.running) return;
    this.remaining = Math.max(0, Math.ceil((this.endAt - Date.now()) / 1000));
    this.running = false;
    clearInterval(this.timer);
    this.refresh();
  },

  reset() {
    this.running = false;
    clearInterval(this.timer);
    this.remaining = this.durationFor(this.mode);
    this.refresh();
  },

  setMode(mode) {
    this.mode = mode;
    this.reset();
  },

  tick() {
    this.remaining = Math.max(0, Math.ceil((this.endAt - Date.now()) / 1000));
    this.updateDisplay();
    if (this.remaining === 0) this.complete();
  },

  // Called when the countdown reaches 00:00
  complete() {
    this.running = false;
    clearInterval(this.timer);
    this.beep();
    if (this.mode === "focus") {
      this.log(SITE_CONFIG.pomodoro.focusMinutes);
      this.sessionsDone++;
      const long = this.sessionsDone % SITE_CONFIG.pomodoro.sessionsBeforeLongBreak === 0;
      this.mode = long ? "longBreak" : "break";
      Reminders.notify(t("focus.sessionDone"));
    } else {
      this.mode = "focus";
      Reminders.notify(t("focus.breakDone"));
    }
    this.remaining = this.durationFor(this.mode);
    this.refresh();
  },

  // Finish Task: saves the focus time so far and marks the task as done
  finishTask() {
    const task = this.currentTask();
    if (!task) return;
    if (this.mode === "focus") {
      const elapsed = this.durationFor("focus") - (this.running ? Math.ceil((this.endAt - Date.now()) / 1000) : this.remaining);
      const minutes = Math.round(elapsed / 60);
      if (minutes >= 1) this.log(minutes);
    }
    Tasks.setCompleted(task.id, true);
    this.taskId = null;
    this.mode = "focus";
    this.reset();
    UI.toast(t("focus.taskFinished", { title: task.title }), "success");
    App.render();
  },

  log(minutes) {
    Store.state.focusLog.push({ id: Utils.uid(), date: Utils.today(), taskId: this.taskId, minutes });
    Store.save();
  },

  minutesOn(date) {
    return Utils.sum(Store.state.focusLog.filter((x) => x.date === date), (x) => x.minutes);
  },

  minutesBetween(from, to) {
    return Utils.sum(Store.state.focusLog.filter((x) => x.date >= from && x.date <= to), (x) => x.minutes);
  },

  beep() {
    if (!SITE_CONFIG.pomodoro.playSound) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      [0, 0.25, 0.5].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.2);
      });
    } catch (e) { /* sound not available */ }
  },

  format(seconds) {
    return `${Utils.pad(Math.floor(seconds / 60))}:${Utils.pad(seconds % 60)}`;
  },

  modeLabel() {
    return t(`focus.mode.${this.mode}`);
  },

  // Updates only the numbers (called 4 times a second)
  updateDisplay() {
    const text = this.format(this.remaining);
    const el = document.getElementById("timer-text");
    if (el) el.textContent = text;
    const ring = document.getElementById("timer-ring");
    if (ring) {
      const total = this.durationFor(this.mode);
      const circumference = 2 * Math.PI * 108;
      ring.style.strokeDashoffset = String(circumference * (this.remaining / total));
    }
    document.title = this.running ? `${text} · ${this.modeLabel()} — ${SITE_CONFIG.appName}` : App.pageTitle();
    App.updateFocusBadge();
  },

  refresh() {
    if (App.route === "focus") App.render();
    else this.updateDisplay();
  },

  /* ---------- Page ---------- */
  render() {
    const esc = Utils.esc;
    const today = Utils.today();
    const candidates = Tasks.sort(Tasks.all().filter((x) => !x.completed && x.date <= today));
    const task = this.currentTask();
    if (task && !candidates.includes(task)) candidates.unshift(task);

    const options = [{ value: "", label: t("focus.noTask") }]
      .concat(candidates.map((x) => ({ value: x.id, label: (x.startTime ? x.startTime + " · " : "") + x.title })));

    const circumference = 2 * Math.PI * 108;
    const offset = circumference * (this.remaining / this.durationFor(this.mode));
    const isBreak = this.mode !== "focus";

    return UI.pageHeader(t("focus.title"), t("focus.subtitle")) + `
      <section class="card focus-card ${isBreak ? "is-break" : ""}">
        <div class="field focus-select">
          <label for="focus-task">${t("focus.chooseTask")}</label>
          <select id="focus-task" data-change="focus-select">${UI.options(options, this.taskId || "")}</select>
        </div>

        <div class="focus-task">
          <h2>${task ? esc(task.title) : t("focus.freeFocus")}</h2>
          ${task && task.description ? `<p class="muted">${esc(task.description)}</p>` : ""}
          ${!task && !candidates.length ? `<p class="muted small">${t("focus.noTasksHint")}</p>` : ""}
        </div>

        <div class="timer" role="timer" aria-live="off">
          <svg viewBox="0 0 240 240" class="timer-svg" aria-hidden="true">
            <circle cx="120" cy="120" r="108" class="timer-track"/>
            <circle cx="120" cy="120" r="108" class="timer-progress" id="timer-ring"
              stroke-dasharray="${circumference}" style="stroke-dashoffset:${offset}"/>
          </svg>
          <div class="timer-center">
            <span class="timer-mode">${this.modeLabel()}</span>
            <span class="timer-text" id="timer-text">${this.format(this.remaining)}</span>
          </div>
        </div>

        <div class="focus-controls">
          ${this.running
            ? `<button class="btn btn-primary btn-lg" data-action="focus-pause">${icon("pause", 18)}<span>${t("focus.pause")}</span></button>`
            : `<button class="btn btn-primary btn-lg" data-action="focus-start">${icon("play", 18)}<span>${this.remaining < this.durationFor(this.mode) ? t("focus.resume") : t("focus.start")}</span></button>`}
          <button class="btn btn-secondary btn-lg" data-action="focus-reset">${icon("reset", 18)}<span>${t("focus.reset")}</span></button>
          <button class="btn btn-success btn-lg" data-action="focus-finish" ${task ? "" : "disabled"}>${icon("check", 18)}<span>${t("focus.finishTask")}</span></button>
        </div>

        <div class="focus-modes" role="group" aria-label="${t("focus.modeLabel")}">
          ${["focus", "break", "longBreak"].map((m) => `
            <button class="pill ${this.mode === m ? "is-active" : ""}" data-action="focus-mode" data-mode="${m}" aria-pressed="${this.mode === m}">
              ${t(`focus.mode.${m}`)} · ${Math.round(this.durationFor(m) / 60)}${t("units.minShort")}
            </button>`).join("")}
        </div>

        <div class="focus-stats">
          ${UI.stat(t("focus.sessionsToday"), String(Store.state.focusLog.filter((x) => x.date === today).length))}
          ${UI.stat(t("focus.focusToday"), esc(I18n.duration(this.minutesOn(today))))}
        </div>
      </section>`;
  },
};

Actions.on("focus-start", () => Focus.start());
Actions.on("focus-pause", () => Focus.pause());
Actions.on("focus-reset", () => Focus.reset());
Actions.on("focus-finish", () => Focus.finishTask());
Actions.on("focus-mode", (el) => Focus.setMode(el.dataset.mode));
Actions.on("focus-select", (el) => {
  Focus.selectTask(el.value);
  App.render();
});
