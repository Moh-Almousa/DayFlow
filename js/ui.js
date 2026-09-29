/* Shared UI pieces: actions, modal, confirm dialog, toasts, small render helpers */

/* ---------- Actions ----------
   Buttons in the HTML have data-action="name".
   Each feature file registers what happens: Actions.on("task-add", (el) => {...})
*/
const Actions = {
  handlers: {},
  on(name, fn) {
    this.handlers[name] = fn;
  },
  run(name, el, event) {
    const fn = this.handlers[name];
    if (fn) fn(el, event);
    else console.warn("No handler for action:", name);
  },
};

const UI = {
  lastFocus: null,
  modalOnClose: null,

  /* ---------- Modal ---------- */
  openModal({ title, body, footer = "", onSubmit, onMount, onClose, size = "" }) {
    const root = document.getElementById("modal-root");
    this.lastFocus = document.activeElement;
    this.modalOnClose = onClose || null;
    root.innerHTML = `
      <div class="modal-backdrop" data-modal-close></div>
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <form class="modal-form" id="modal-form" novalidate>
          <header class="modal-header">
            <h2 id="modal-title">${Utils.esc(title)}</h2>
            <button type="button" class="icon-btn" data-modal-close aria-label="${t("common.close")}">${icon("x")}</button>
          </header>
          <div class="modal-body">${body}</div>
          ${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}
        </form>
      </div>`;
    root.hidden = false;
    document.body.classList.add("no-scroll");

    const form = root.querySelector("#modal-form");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (onSubmit) onSubmit(form);
    });
    root.querySelectorAll("[data-modal-close]").forEach((el) => el.addEventListener("click", () => this.closeModal()));
    if (onMount) onMount(form);

    const first = root.querySelector("[autofocus]") || root.querySelector("input, textarea, select, button:not([data-modal-close])");
    if (first) first.focus();
  },

  closeModal() {
    const root = document.getElementById("modal-root");
    if (root.hidden) return;
    root.hidden = true;
    root.innerHTML = "";
    document.body.classList.remove("no-scroll");
    if (this.modalOnClose) this.modalOnClose();
    this.modalOnClose = null;
    if (this.lastFocus && document.contains(this.lastFocus)) this.lastFocus.focus();
  },

  isModalOpen() {
    return !document.getElementById("modal-root").hidden;
  },

  // Keeps keyboard focus inside the modal
  trapFocus(e) {
    const modal = document.querySelector("#modal-root .modal");
    if (!modal) return;
    const items = [...modal.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  },

  /* ---------- Confirm dialog (returns a Promise<boolean>) ---------- */
  confirm({ title, message, confirmText, danger = false }) {
    return new Promise((resolve) => {
      let answered = false;
      this.openModal({
        title,
        size: "modal-sm",
        body: `<p class="confirm-text">${Utils.esc(message)}</p>`,
        footer: `
          <button type="button" class="btn btn-ghost" data-modal-close>${t("common.cancel")}</button>
          <button type="submit" class="btn ${danger ? "btn-danger" : "btn-primary"}">${Utils.esc(confirmText || t("common.confirm"))}</button>`,
        onSubmit: () => { answered = true; this.closeModal(); resolve(true); },
        onClose: () => { if (!answered) resolve(false); },
      });
    });
  },

  /* ---------- Toast messages ---------- */
  toast(message, type = "default") {
    const root = document.getElementById("toast-root");
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.setAttribute("role", "status");
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.classList.add("toast-hide"), 2600);
    setTimeout(() => el.remove(), 3000);
  },

  /* ---------- Small render helpers ---------- */
  emptyState({ iconName, text, actionLabel, action, actionData = "" }) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon(iconName, 22)}</div>
        <p>${Utils.esc(text)}</p>
        ${actionLabel ? `<button class="btn btn-primary" data-action="${action}" ${actionData}>${icon("plus", 16)}<span>${Utils.esc(actionLabel)}</span></button>` : ""}
      </div>`;
  },

  progressBar(percent, variant = "") {
    const p = Utils.clamp(Math.round(percent), 0, 100);
    return `<div class="progress ${variant}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}"><span style="width:${p}%"></span></div>`;
  },

  pageHeader(title, subtitle = "", actions = "") {
    return `
      <header class="page-header">
        <div>
          <h1>${Utils.esc(title)}</h1>
          ${subtitle ? `<p class="page-subtitle">${subtitle}</p>` : ""}
        </div>
        ${actions ? `<div class="page-actions">${actions}</div>` : ""}
      </header>`;
  },

  // Options for <select> elements
  options(list, selected) {
    return list.map(({ value, label }) => `<option value="${Utils.esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${Utils.esc(label)}</option>`).join("");
  },

  // Formats a stat card
  stat(label, value, hint = "") {
    return `
      <div class="stat">
        <span class="stat-label">${Utils.esc(label)}</span>
        <strong class="stat-value">${value}</strong>
        ${hint ? `<span class="stat-hint">${hint}</span>` : ""}
      </div>`;
  },
};
