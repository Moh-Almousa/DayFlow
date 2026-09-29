/* Boot: applies colors, fonts, dark mode and language direction
   before the page is drawn (prevents flicker). Values come from config/site-config.js */

const Boot = {
  readSaved() {
    try {
      const raw = localStorage.getItem(SITE_CONFIG.storageKey);
      return raw ? JSON.parse(raw).settings || {} : {};
    } catch (e) {
      return {};
    }
  },

  // Turns theme colors from the config into CSS variables
  injectThemeVariables() {
    const toCss = (colors) => Object.entries(colors)
      .map(([key, value]) => `--${key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${value};`)
      .join("\n  ");
    const t = SITE_CONFIG.theme;
    const css = `
:root {
  --radius: ${t.radius};
  --radius-sm: ${t.radiusSmall};
  ${toCss(t.light)}
}
:root[data-theme="dark"] {
  ${toCss(t.dark)}
}`;
    const style = document.createElement("style");
    style.id = "theme-vars";
    style.textContent = css;
    document.head.appendChild(style);

    if (SITE_CONFIG.fonts.googleFontsUrl) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = SITE_CONFIG.fonts.googleFontsUrl;
      document.head.appendChild(link);
    }
  },

  resolveMode(mode) {
    if (mode === "system") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return mode === "dark" ? "dark" : "light";
  },

  applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", this.resolveMode(mode));
  },

  applyLanguage(lang) {
    const info = SITE_CONFIG.language.available[lang] || SITE_CONFIG.language.available[SITE_CONFIG.language.default];
    const html = document.documentElement;
    html.lang = lang;
    html.dir = info.dir;
    html.style.setProperty("--font", SITE_CONFIG.fonts[lang] || SITE_CONFIG.fonts.en);
  },

  init() {
    const saved = this.readSaved();
    this.injectThemeVariables();
    this.applyTheme(saved.theme || SITE_CONFIG.theme.defaultMode);
    this.applyLanguage(saved.language || SITE_CONFIG.language.default);
    document.title = SITE_CONFIG.appName;
  },
};

Boot.init();
