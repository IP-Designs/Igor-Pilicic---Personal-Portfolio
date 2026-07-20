/* ============================================
   Standing Pillars - Internationalization (i18n)
   ============================================

   Architecture:
   - JSON-based translations in /lang/
   - Browser language detection without third-party geolocation
   - localStorage for user preference
   - data-i18n attributes for translatable content

   Usage:
   <span data-i18n="nav.about">About</span>
   <span data-i18n="footer.copyright" data-i18n-params='{"year": "2024"}'>© 2024</span>

   ============================================ */

const I18n = (function() {
  'use strict';

  // Configuration
  const CONFIG = {
    defaultLang: 'en',
    supportedLangs: ['en', 'de', 'hr'],
    langPath: (function() {
      const s = document.querySelector('script[src*="i18n.js"]');
      return (s && s.getAttribute('data-lang-path')) || 'lang/';
    })(),
    storageKey: 'standing-pillars-lang'
  };

  let currentLang = CONFIG.defaultLang;
  let translations = {};
  let isInitialized = false;

  // --- Private Methods ---

  /**
   * Get nested object value by dot notation
   * e.g., getNestedValue(obj, 'nav.about') -> obj.nav.about
   */
  function getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr && curr[key], obj);
  }

  /**
   * Replace {placeholder} tokens in string
   */
  function interpolate(str, params) {
    if (!params) return str;
    return str.replace(/\{(\w+)\}/g, (match, key) => params[key] || match);
  }

  /**
   * Detect language from browser settings
   * Maps: de/de-AT/de-CH/de-DE -> de
   *       hr/sr/bs/cnr (ex-Yugoslavia Balkans) -> hr
   *       everything else -> en (or null to fall through)
   */
  function getBrowserLang() {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0].toLowerCase();

    // Direct match
    if (CONFIG.supportedLangs.includes(langCode)) return langCode;

    // Balkan languages -> Croatian
    const balkanCodes = ['sr', 'bs', 'cnr'];
    if (balkanCodes.includes(langCode)) return 'hr';

    return null;
  }

  /**
   * Get language from URL parameter (?lang=de)
   */
  function getUrlLang() {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get('lang');
    return CONFIG.supportedLangs.includes(lang) ? lang : null;
  }

  /**
   * Get language from URL path (e.g. /de/index.html -> de, /hr/ -> hr)
   */
  function getPathLang() {
    const path = window.location.pathname;
    for (const lang of CONFIG.supportedLangs) {
      if (lang !== CONFIG.defaultLang && path.includes('/' + lang + '/')) {
        return lang;
      }
    }
    return null;
  }

  /**
   * Get stored language preference
   */
  function getStoredLang() {
    try {
      const stored = localStorage.getItem(CONFIG.storageKey);
      return CONFIG.supportedLangs.includes(stored) ? stored : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Store language preference
   */
  function storeLang(lang) {
    try {
      localStorage.setItem(CONFIG.storageKey, lang);
    } catch (e) {
      // localStorage not available
    }
  }

  /**
   * Load translation file
   */
  async function loadTranslations(lang) {
    try {
      const response = await fetch(`${CONFIG.langPath}${lang}.json`);
      if (!response.ok) throw new Error(`Failed to load ${lang}.json`);
      return await response.json();
    } catch (e) {
      console.warn(`I18n: Could not load translations for "${lang}"`, e);
      return null;
    }
  }

  /**
   * Apply translations to all data-i18n elements
   */
  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = getNestedValue(translations, key);

      if (translated) {
        // Check for interpolation params
        const paramsAttr = el.getAttribute('data-i18n-params');
        const params = paramsAttr ? JSON.parse(paramsAttr) : null;

        // Check if it's an attribute translation (data-i18n-attr="placeholder")
        const attr = el.getAttribute('data-i18n-attr');

        if (attr) {
          el.setAttribute(attr, interpolate(translated, params));
        } else if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = interpolate(translated, params);
        } else {
          el.textContent = interpolate(translated, params);
        }
      }
    });

    // Update html lang attribute
    document.documentElement.lang = currentLang;

    // Dispatch event for custom handlers
    document.dispatchEvent(new CustomEvent('i18n:changed', {
      detail: { lang: currentLang }
    }));
  }

  /**
   * Update language switcher UI
   */
  function updateSwitcher() {
    const switchers = document.querySelectorAll('.lang-switcher');
    switchers.forEach(switcher => {
      const buttons = switcher.querySelectorAll('[data-lang]');
      buttons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLang);
      });
    });
  }

  /**
   * Update service page links based on current language
   * Links with data-lang-href="services/ux-design/" get prefixed with lang path
   */
  function updateServiceLinks() {
    document.querySelectorAll('[data-lang-href]').forEach(el => {
      const basePath = el.getAttribute('data-lang-href');
      if (currentLang === CONFIG.defaultLang) {
        el.setAttribute('href', '/' + basePath);
      } else {
        el.setAttribute('href', '/' + currentLang + '/' + basePath);
      }
    });
  }

  // --- Public API ---

  return {
    /**
     * Initialize i18n system
     * Detection priority: URL param > URL path > localStorage > browser language > default
     */
    async init(options = {}) {
      if (isInitialized) return;

      // Merge options with config
      Object.assign(CONFIG, options);

      // Determine language (priority order)
      // URL path (/de/, /hr/) takes precedence over stored preference
      let detectedLang = getUrlLang() || getPathLang() || getStoredLang();

      if (!detectedLang) detectedLang = getBrowserLang();

      currentLang = detectedLang || CONFIG.defaultLang;

      // Load translations
      translations = await loadTranslations(currentLang) || {};

      // Store the visitor's language preference locally.
      storeLang(currentLang);

      // Apply to DOM
      applyTranslations();
      updateServiceLinks();
      updateSwitcher();

      // Set up language switcher listeners
      document.querySelectorAll('[data-lang]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.setLang(btn.getAttribute('data-lang'));
        });
      });

      isInitialized = true;
      console.log(`I18n: Initialized with "${currentLang}"`);
    },

    /**
     * Change language
     */
    async setLang(lang) {
      if (!CONFIG.supportedLangs.includes(lang)) {
        console.warn(`I18n: Unsupported language "${lang}"`);
        return;
      }

      if (lang === currentLang) return;

      const newTranslations = await loadTranslations(lang);
      if (!newTranslations) return;

      currentLang = lang;
      translations = newTranslations;

      storeLang(lang);
      applyTranslations();
      updateServiceLinks();
      updateSwitcher();
    },

    /**
     * Get current language
     */
    getLang() {
      return currentLang;
    },

    /**
     * Get translation by key
     */
    t(key, params) {
      const value = getNestedValue(translations, key);
      if (!value) return key; // Return key as fallback
      return interpolate(value, params);
    },

    /**
     * Get all supported languages
     */
    getSupportedLangs() {
      return [...CONFIG.supportedLangs];
    }
  };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  I18n.init();
});
