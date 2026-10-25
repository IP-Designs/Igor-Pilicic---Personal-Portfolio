/* Keep the single 404 document usable at missing URLs at any directory depth. */
(function () {
  'use strict';
  var languageLabels = { en: 'Page language', hr: 'Jezik stranice', de: 'Seitensprache' };
  function update(lang) {
    if (!['en', 'hr', 'de'].includes(lang)) lang = 'en';
    var home = lang === 'en' ? '/' : '/' + lang + '/';
    var destinations = { home: home, work: home + '#case-studies', privacy: home + 'privacy.html', imprint: home + 'imprint.html' };
    document.querySelectorAll('[data-error-link]').forEach(function (link) {
      link.setAttribute('href', destinations[link.dataset.errorLink]);
    });
    document.querySelectorAll('[data-set-language]').forEach(function (link) {
      if (link.dataset.setLanguage === lang) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    var navigation = document.getElementById('error-language-nav');
    if (navigation) navigation.setAttribute('aria-label', languageLabels[lang]);
    if (typeof I18n !== 'undefined') {
      var title = I18n.t('notFound.title');
      if (title !== 'notFound.title') document.title = title;
    }
  }
  document.addEventListener('i18n:changed', function (event) { update(event.detail && event.detail.lang); });
  update(document.documentElement.lang);
})();
