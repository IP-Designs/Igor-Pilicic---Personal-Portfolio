/* Lightweight theme controls; legal documents keep their own static language URLs. */
(function () {
  'use strict';
  var root = document.documentElement;
  var button = document.getElementById('themeToggle');
  var labels = {
    en: { light: 'Switch to light theme', dark: 'Switch to dark theme' },
    hr: { light: 'Uključi svijetlu temu', dark: 'Uključi tamnu temu' },
    de: { light: 'Helles Design aktivieren', dark: 'Dunkles Design aktivieren' }
  };
  function update() {
    var dark = root.getAttribute('data-theme') === 'dark';
    var text = (labels[root.lang] || labels.en)[dark ? 'light' : 'dark'];
    if (button) { button.setAttribute('aria-label', text); button.title = text; }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#000000' : '#f8f6f0';
  }
  if (button) button.addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') !== 'dark';
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) { /* Keep the current page usable without storage. */ }
    update();
  });
  document.querySelectorAll('[data-set-language]').forEach(function (link) {
    link.addEventListener('click', function () {
      try { localStorage.setItem('standing-pillars-lang', link.dataset.setLanguage); } catch (error) { /* URL navigation still works. */ }
    });
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== 'theme') return;
    if (event.newValue === 'light') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', 'dark');
    update();
  });
  document.addEventListener('i18n:changed', update);
  update();
})();
