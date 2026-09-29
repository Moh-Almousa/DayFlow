/* Language handling. All UI texts are in config/texts.js */

const I18n = {
  lang: SITE_CONFIG.language.default,

  init() {
    const saved = Store.state.settings.language;
    this.lang = SITE_CONFIG.language.available[saved] ? saved : SITE_CONFIG.language.default;
    Boot.applyLanguage(this.lang);
  },

  set(lang) {
    if (!SITE_CONFIG.language.available[lang]) return;
    this.lang = lang;
    Store.state.settings.language = lang;
    Store.save();
    Boot.applyLanguage(lang);
  },

  // Switch to the next language in the list
  toggle() {
    const langs = Object.keys(SITE_CONFIG.language.available);
    const next = langs[(langs.indexOf(this.lang) + 1) % langs.length];
    this.set(next);
  },

  nextLanguageInfo() {
    const langs = Object.keys(SITE_CONFIG.language.available);
    const next = langs[(langs.indexOf(this.lang) + 1) % langs.length];
    return SITE_CONFIG.language.available[next];
  },

  locale() {
    return SITE_CONFIG.language.available[this.lang].locale;
  },

  // t("dashboard.title", { name: "Ali" })
  t(key, vars) {
    const find = (lang) => key.split(".").reduce((obj, part) => (obj ? obj[part] : undefined), TEXTS[lang]);
    let text = find(this.lang);
    if (text === undefined) text = find("en");
    if (text === undefined) return key;
    if (vars) {
      Object.keys(vars).forEach((k) => { text = text.split(`{${k}}`).join(vars[k]); });
    }
    return text;
  },

  // Picks the right language from { en: "...", ar: "..." } objects in the config
  pick(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return value[this.lang] ?? value.en ?? Object.values(value)[0] ?? "";
  },

  formatDate(dateStr, options) {
    return new Intl.DateTimeFormat(this.locale(), options).format(Utils.parseDate(dateStr));
  },

  longDate(dateStr) {
    return this.formatDate(dateStr, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  },

  shortDate(dateStr) {
    return this.formatDate(dateStr, { day: "numeric", month: "short" });
  },

  weekdayShort(dateStr) {
    return this.formatDate(dateStr, { weekday: "short" });
  },

  // Weekday name for 0..6 (0 = Sunday)
  weekdayName(index, style = "short") {
    const base = new Date(2024, 0, 7 + index); // 7 Jan 2024 was a Sunday
    return new Intl.DateTimeFormat(this.locale(), { weekday: style }).format(base);
  },

  // 90 -> "1h 30m" / "1س 30د"
  duration(minutes) {
    const m = Math.round(minutes || 0);
    const h = Math.floor(m / 60);
    const rest = m % 60;
    if (h && rest) return t("units.hoursMinutes", { h, m: rest });
    if (h) return t("units.hours", { h });
    return t("units.minutes", { m: rest });
  },

  category(id) {
    return SITE_CONFIG.categories.find((c) => c.id === id) || SITE_CONFIG.categories[SITE_CONFIG.categories.length - 1];
  },

  priority(id) {
    return SITE_CONFIG.priorities.find((p) => p.id === id) || SITE_CONFIG.priorities[1];
  },
};

function t(key, vars) {
  return I18n.t(key, vars);
}
