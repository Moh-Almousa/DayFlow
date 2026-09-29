/* Small helpers: dates, ids, escaping */

const Utils = {
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // Escape user text before putting it into HTML
  esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  pad(n) {
    return String(n).padStart(2, "0");
  },

  // Date -> "YYYY-MM-DD" (local time)
  dateStr(d) {
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  },

  today() {
    return this.dateStr(new Date());
  },

  // "YYYY-MM-DD" -> Date at local midnight
  parseDate(str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  },

  addDays(str, n) {
    const d = this.parseDate(str);
    d.setDate(d.getDate() + n);
    return this.dateStr(d);
  },

  daysBetween(fromStr, toStr) {
    return Math.round((this.parseDate(toStr) - this.parseDate(fromStr)) / 86400000);
  },

  weekday(str) {
    return this.parseDate(str).getDay(); // 0 = Sunday
  },

  startOfWeek(str) {
    const diff = (this.weekday(str) - SITE_CONFIG.weekStartsOn + 7) % 7;
    return this.addDays(str, -diff);
  },

  isValidDate(str) {
    return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str);
  },

  // "08:30" -> 510
  timeToMinutes(time) {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  },

  // 510 -> "08:30"
  minutesToTime(total) {
    const t = ((total % 1440) + 1440) % 1440;
    return `${this.pad(Math.floor(t / 60))}:${this.pad(t % 60)}`;
  },

  nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  },

  percent(part, total) {
    return total > 0 ? Math.round((part / total) * 100) : 0;
  },

  clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  },

  sum(list, fn) {
    return list.reduce((acc, item) => acc + (fn(item) || 0), 0);
  },
};
