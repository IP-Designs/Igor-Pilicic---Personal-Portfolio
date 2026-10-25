/* Defer portfolio media without changing the visitor's selected gallery state. */
(function () {
  'use strict';

  function isNear(element, margin) {
    var rect = element.getBoundingClientRect();
    return rect.bottom >= -margin && rect.top <= window.innerHeight + margin;
  }

  function onceNear(element, callback) {
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          observer.disconnect();
          callback();
        }
      }, { rootMargin: '600px 0px' });
      observer.observe(element);
    } else {
      function check() {
        if (!isNear(element, 600)) return;
        window.removeEventListener('scroll', check);
        window.removeEventListener('resize', check);
        callback();
      }
      window.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', check);
      check();
    }
  }

  // The global loader covers page readiness, not off-screen simulation assets.
  var loader = document.getElementById('site-loader');
  var bar = document.getElementById('loader-bar');
  if (loader) {
    var finished = false;
    if (bar) bar.style.width = '25%';
    function finishLoading() {
      if (finished) return;
      finished = true;
      if (bar) bar.style.width = '100%';
      window.setTimeout(function () {
        loader.classList.add('done');
        window.setTimeout(function () { loader.style.display = 'none'; }, 700);
      }, 120);
    }
    function pageReady() {
      if (finished) return;
      if (bar) bar.style.width = '65%';
      window.requestAnimationFrame(function () {
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(finishLoading, finishLoading);
        } else finishLoading();
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pageReady, { once: true });
    else pageReady();
    window.setTimeout(finishLoading, 1200);
  }

  var gallery = document.getElementById('design-gallery');
  var toggle = document.getElementById('galleryToggle');
  var video = document.getElementById('galleryVideo');
  if (gallery && toggle && video) {
    var nearGallery = false;
    var galleryVisible = false;
    var galleryLoaded = false;
    var descWrap = gallery.querySelector('.gallery-desc-wrap');
    var descBtn = gallery.querySelector('.gallery-desc-toggle');

    function loadGallery() {
      if (galleryLoaded) return;
      galleryLoaded = true;
      video.querySelectorAll('source[data-src]').forEach(function (source) {
        source.src = source.dataset.src;
      });
      video.preload = 'auto';
      video.load();
    }
    function updatePlayback() {
      if (toggle.checked && (nearGallery || galleryVisible)) loadGallery();
      if (toggle.checked && galleryVisible && !document.hidden) {
        var promise = video.play();
        if (promise && promise.catch) promise.catch(function () { /* The poster remains visible if autoplay is blocked. */ });
      } else video.pause();
    }
    function updateGallery() {
      video.classList.toggle('active', toggle.checked);
      gallery.classList.toggle('gallery-active', toggle.checked);
      if (descWrap) descWrap.classList.remove('expanded');
      if (descBtn) { descBtn.classList.remove('expanded'); descBtn.setAttribute('aria-expanded', 'false'); }
      updatePlayback();
    }
    toggle.addEventListener('change', updateGallery);
    updateGallery();
    onceNear(gallery, function () { nearGallery = true; updatePlayback(); });
    if ('IntersectionObserver' in window) {
      var visibilityObserver = new IntersectionObserver(function (entries) {
        galleryVisible = entries.some(function (entry) { return entry.isIntersecting; });
        updatePlayback();
      });
      visibilityObserver.observe(gallery);
    } else {
      function updateVisibility() { galleryVisible = isNear(gallery, 0); updatePlayback(); }
      window.addEventListener('scroll', updateVisibility, { passive: true });
      window.addEventListener('resize', updateVisibility);
      updateVisibility();
    }
    document.addEventListener('visibilitychange', updatePlayback);
    if (descBtn && descWrap) descBtn.addEventListener('click', function () {
      var open = descWrap.classList.toggle('expanded');
      descBtn.classList.toggle('expanded', open);
      descBtn.setAttribute('aria-expanded', String(open));
    });
    window.addEventListener('scroll', function () {
      var rect = gallery.getBoundingClientRect();
      var progress = 1 - (rect.top + rect.height) / (window.innerHeight + rect.height);
      gallery.style.setProperty('--glare-x', (Math.max(0, Math.min(1, progress)) * 450) + '%');
    }, { passive: true });
  }

  var simulation = document.getElementById('simulation-demo');
  var iframe = document.getElementById('sim-iframe');
  if (simulation && iframe && iframe.dataset.src) {
    var simulationStarted = false;
    var base = new URL(iframe.dataset.src, document.baseURI);
    base.searchParams.delete('lang');
    function simulationURL(lang) {
      var url = new URL(base.href);
      url.searchParams.set('lang', lang);
      return url.href;
    }
    var pendingURL = simulationURL(document.documentElement.lang || 'en');
    function navigateSimulation() {
      if (iframe.getAttribute('src') === pendingURL) return;
      iframe.parentElement.classList.add('is-deferred');
      iframe.parentElement.setAttribute('aria-busy', 'true');
      iframe.src = pendingURL;
    }
    iframe.addEventListener('load', function () {
      if (!simulationStarted || !iframe.hasAttribute('src')) return;
      iframe.parentElement.classList.remove('is-deferred');
      iframe.parentElement.setAttribute('aria-busy', 'false');
      try { iframe.contentWindow.postMessage('unlockAudio', window.location.origin); } catch (error) { /* Optional audio. */ }
    });
    document.addEventListener('i18n:changed', function (event) {
      var lang = event.detail && event.detail.lang;
      if (!lang) return;
      pendingURL = simulationURL(lang);
      iframe.dataset.src = pendingURL;
      if (simulationStarted) navigateSimulation();
    });
    onceNear(simulation, function () {
      simulationStarted = true;
      navigateSimulation();
    });
  }
})();
