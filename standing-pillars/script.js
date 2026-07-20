/* ============================================
   Igor Pilicic - Portfolio Site
   JavaScript Interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Dark mode toggle ---
  const themeToggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme');
  if (saved !== 'light') document.documentElement.setAttribute('data-theme', 'dark');

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
    });
  }

  // --- Navbar scroll effect ---
  const navbar = document.getElementById('navbar');
  const handleScroll = () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // --- Mobile nav toggle ---
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.classList.toggle('active');
  });

  // Close mobile nav on link click (skip dropdown toggle)
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (link.classList.contains('nav-dropdown-toggle')) return;
      navLinks.classList.remove('open');
      navToggle.classList.remove('active');
    });
  });

  // --- Services dropdown ---
  document.querySelectorAll('.nav-dropdown').forEach(dd => {
    const toggle = dd.querySelector('.nav-dropdown-toggle');
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Close other dropdowns
      document.querySelectorAll('.nav-dropdown.open').forEach(other => {
        if (other !== dd) other.classList.remove('open');
      });
      dd.classList.toggle('open');
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown')) {
      document.querySelectorAll('.nav-dropdown.open').forEach(dd => {
        dd.classList.remove('open');
      });
    }
  });

  // Close dropdown on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.nav-dropdown.open').forEach(dd => {
        dd.classList.remove('open');
      });
    }
  });

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      if (anchor.classList.contains('nav-dropdown-toggle')) return;
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // --- Hero tag → knowledge graph bridge ---
  const heroCanvas = document.getElementById('heroScene');

  if (heroCanvas) {
    document.querySelectorAll('.hero-tags .tag[data-graph-nodes]').forEach(tag => {
      tag.addEventListener('mouseenter', () => {
        const ids = tag.dataset.graphNodes.split(',').map(s => s.trim());
        heroCanvas.dispatchEvent(new CustomEvent('graphHighlight', {
          detail: { nodeIds: ids }
        }));
      });
      tag.addEventListener('mouseleave', () => {
        heroCanvas.dispatchEvent(new CustomEvent('graphHighlight', {
          detail: { nodeIds: null }
        }));
      });
    });
  }

  // --- Mycelium vine glow on follow-up pill hover / long-press ---
  const vine = document.querySelector('.mycelium-vine');
  if (vine) {
    const pills = document.querySelectorAll('.section-followup');
    let longPressTimer = null;

    pills.forEach(pill => {
      // Desktop hover
      pill.addEventListener('mouseenter', () => vine.classList.add('vine-glow'));
      pill.addEventListener('mouseleave', () => vine.classList.remove('vine-glow'));
      // Mobile long-press
      pill.addEventListener('touchstart', () => {
        longPressTimer = setTimeout(() => vine.classList.add('vine-glow'), 300);
      }, { passive: true });
      pill.addEventListener('touchend', () => {
        clearTimeout(longPressTimer);
        vine.classList.remove('vine-glow');
      });
    });
  }

  // --- Scroll-triggered fade-in animations ---
  const animateElements = document.querySelectorAll(
    '.stat-card, .service-pillar, .timeline-item, .skill-category, .case-card, .case-study-block, .edu-card, .contact-item, .practice-node, .why-card, .mission-statement, .research-condition, .phase-card, .research-reference, .prediction-card, .armillaria-intro'
  );

  animateElements.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  animateElements.forEach(el => observer.observe(el));



  // --- Active nav link highlighting ---
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-links a:not(.nav-cta)');

  const highlightNav = () => {
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        navItems.forEach(item => {
          item.style.color = '';
          if (item.getAttribute('href') === '#' + id) {
            item.style.color = 'var(--accent)';
          }
        });
      }
    });
  };

  window.addEventListener('scroll', highlightNav, { passive: true });

  // --- Contact form handler (Formspree) ---
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const btn = contactForm.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Sending...';
      btn.disabled = true;

      fetch('https://formspree.io/f/xwvdpljy', {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { 'Accept': 'application/json' }
      })
      .then(function(response) {
        if (response.ok) {
          btn.textContent = 'Message Sent! ✓';
          btn.style.background = 'var(--accent)';
          btn.style.borderColor = 'var(--accent)';
          contactForm.reset();
          setTimeout(function() {
            btn.textContent = originalText;
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.disabled = false;
          }, 3000);
        } else {
          throw new Error('Form submission failed');
        }
      })
      .catch(function() {
        btn.textContent = 'Error - try again';
        btn.style.background = '#c0392b';
        btn.disabled = false;
        setTimeout(function() {
          btn.textContent = originalText;
          btn.style.background = '';
        }, 3000);
      });
    });
  }

  // --- Staggered animation for timeline items ---
  const timelineItems = document.querySelectorAll('.timeline-item');
  timelineItems.forEach((item, index) => {
    item.style.transitionDelay = `${index * 0.08}s`;
  });

  // --- Staggered animation for case cards ---
  const caseCards = document.querySelectorAll('.case-card');
  caseCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
  });

  // --- Staggered animation for stat cards ---
  const statCards = document.querySelectorAll('.stat-card');
  statCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 0.1}s`;
  });

  // --- Create lightbox overlay ---
  const lightboxOverlay = document.createElement('div');
  lightboxOverlay.className = 'lightbox-overlay';
  lightboxOverlay.innerHTML = `
    <div class="lightbox-content">
      <button class="lightbox-close" aria-label="Close">&times;</button>
      <img src="" alt="">
      <p class="lightbox-caption"></p>
    </div>
  `;
  document.body.appendChild(lightboxOverlay);

  lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay || e.target.classList.contains('lightbox-close')) {
      lightboxOverlay.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxOverlay.classList.contains('active')) {
      lightboxOverlay.classList.remove('active');
    }
  });

  // --- Handle broken gallery images gracefully ---
  document.querySelectorAll('.gallery-item img').forEach(img => {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const placeholder = document.createElement('div');
      placeholder.style.cssText = 'height:180px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a2d47,#3d4f6f);color:rgba(255,255,255,0.6);font-size:0.85rem;font-weight:500;padding:16px;text-align:center;';
      placeholder.textContent = img.alt || 'Image placeholder';
      img.parentNode.insertBefore(placeholder, img);
    });
  });

});

/* --- Case Study expand/collapse (global scope for onclick) --- */
function toggleCaseStudy(id) {
  const block = document.getElementById(id);
  if (!block) return;

  const isExpanded = block.classList.contains('expanded');

  // Collapse all others
  document.querySelectorAll('.case-study-block.expanded').forEach(el => {
    if (el.id !== id) el.classList.remove('expanded');
  });

  // Toggle this one
  block.classList.toggle('expanded');

  // Scroll into view if expanding
  if (!isExpanded) {
    setTimeout(() => {
      block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}

/* --- Graphic Design Gallery toggle --- */
(function() {
  var toggle = document.getElementById('galleryToggle');
  var video = document.getElementById('galleryVideo');
  var gallery = document.getElementById('design-gallery');
  var descWrap = gallery ? gallery.querySelector('.gallery-desc-wrap') : null;
  var descBtn = gallery ? gallery.querySelector('.gallery-desc-toggle') : null;

  if (toggle && video && gallery) {
    toggle.addEventListener('change', function() {
      if (this.checked) {
        video.classList.add('active');
        video.play();
        gallery.classList.add('gallery-active');
        if (descWrap) descWrap.classList.remove('expanded');
        if (descBtn) { descBtn.classList.remove('expanded'); descBtn.setAttribute('aria-expanded', 'false'); }
      } else {
        video.classList.remove('active');
        video.pause();
        gallery.classList.remove('gallery-active');
        if (descWrap) descWrap.classList.remove('expanded');
        if (descBtn) { descBtn.classList.remove('expanded'); descBtn.setAttribute('aria-expanded', 'false'); }
      }
    });
  }

  if (descBtn && descWrap) {
    descBtn.addEventListener('click', function() {
      var open = descWrap.classList.toggle('expanded');
      descBtn.classList.toggle('expanded', open);
      descBtn.setAttribute('aria-expanded', String(open));
    });
  }

  /* Glass glare effect - moves on X axis with scroll */
  if (gallery) {
    window.addEventListener('scroll', function() {
      var rect = gallery.getBoundingClientRect();
      var vh = window.innerHeight;
      var progress = 1 - (rect.top + rect.height) / (vh + rect.height);
      progress = Math.max(0, Math.min(1, progress));
      gallery.style.setProperty('--glare-x', (progress * 450) + '%');
    }, { passive: true });
  }
})();

/* --- 3D Motion Gallery play/pause --- */
(function() {
  var wrap = document.getElementById('motion-3d');
  if (!wrap) return;
  var video = wrap.querySelector('.motion-gallery-video');
  var btn = wrap.querySelector('.motion-play-btn');
  var descWrap = wrap.querySelector('.motion-desc-wrap');
  var descBtn = wrap.querySelector('.motion-desc-toggle');
  if (!video || !btn) return;

  var iconPlay = btn.querySelector('.icon-play');
  var iconStop = btn.querySelector('.icon-stop');
  var label = btn.querySelector('.motion-play-label');

  function setPlaying(playing) {
    if (playing) {
      video.classList.add('active');
      video.play();
      wrap.classList.add('motion-active');
      if (iconPlay) iconPlay.style.display = 'none';
      if (iconStop) iconStop.style.display = '';
      if (label) label.textContent = 'Stop';
      if (descWrap) descWrap.classList.remove('expanded');
      if (descBtn) { descBtn.classList.remove('expanded'); descBtn.setAttribute('aria-expanded', 'false'); }
    } else {
      video.pause();
      video.classList.remove('active');
      wrap.classList.remove('motion-active');
      if (iconPlay) iconPlay.style.display = '';
      if (iconStop) iconStop.style.display = 'none';
      if (label) label.textContent = 'Play';
      if (descWrap) descWrap.classList.remove('expanded');
      if (descBtn) { descBtn.classList.remove('expanded'); descBtn.setAttribute('aria-expanded', 'false'); }
    }
  }

  if (descBtn && descWrap) {
    descBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var open = descWrap.classList.toggle('expanded');
      descBtn.classList.toggle('expanded', open);
      descBtn.setAttribute('aria-expanded', String(open));
    });
  }

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    setPlaying(video.paused);
  });

  wrap.addEventListener('click', function(e) {
    if (e.target.closest('.motion-play-btn')) return;
    setPlaying(video.paused);
  });

  /* Autoplay on scroll-into-view (respects reduced-motion) */
  var userPaused = false;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  btn.addEventListener('click', function() {
    userPaused = video.paused ? false : true;
  });
  wrap.addEventListener('click', function(e) {
    if (!e.target.closest('.motion-play-btn')) {
      userPaused = video.paused ? false : true;
    }
  });

  if (!reducedMotion && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && !userPaused) {
          setPlaying(true);
        } else if (!entry.isIntersecting && !userPaused) {
          setPlaying(false);
        }
      });
    }, { threshold: 0.3 });
    observer.observe(wrap);
  }

  /* Glass glare effect */
  window.addEventListener('scroll', function() {
    var rect = wrap.getBoundingClientRect();
    var vh = window.innerHeight;
    var progress = 1 - (rect.top + rect.height) / (vh + rect.height);
    progress = Math.max(0, Math.min(1, progress));
    wrap.style.setProperty('--glare-x', (progress * 450) + '%');
  }, { passive: true });
})();



/* --- Lightbox for gallery images (global scope for onclick) --- */
function openLightbox(galleryItem) {
  const overlay = document.querySelector('.lightbox-overlay');
  if (!overlay) return;

  const img = galleryItem.querySelector('img');
  const caption = galleryItem.querySelector('.gallery-caption');
  if (!img) return;

  const lightboxImg = overlay.querySelector('.lightbox-content img');
  const lightboxCaption = overlay.querySelector('.lightbox-caption');

  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightboxCaption.textContent = caption ? caption.textContent : '';

  overlay.classList.add('active');
}

/* --- GDPR Consent Popup --- */
(function() {
  var overlay = document.getElementById('gdprOverlay');
  if (!overlay) return;

  var consent = localStorage.getItem('gdpr-consent');

  // Already answered - hide popup, load analytics if accepted
  if (consent) {
    overlay.remove();
    if (consent === 'accepted') loadAnalytics();
    return;
  }

  document.getElementById('gdprAccept').addEventListener('click', function() {
    localStorage.setItem('gdpr-consent', 'accepted');
    dismiss();
    loadAnalytics();
  });

  document.getElementById('gdprDecline').addEventListener('click', function() {
    localStorage.setItem('gdpr-consent', 'declined');
    dismiss();
  });

  function dismiss() {
    overlay.classList.add('hidden');
    setTimeout(function() { overlay.remove(); }, 300);
  }

  function loadAnalytics() {
    // TODO: Replace GA_MEASUREMENT_ID with your actual Google Analytics ID
    // var script = document.createElement('script');
    // script.async = true;
    // script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
    // document.head.appendChild(script);
    // script.onload = function() {
    //   window.dataLayer = window.dataLayer || [];
    //   function gtag(){ dataLayer.push(arguments); }
    //   gtag('js', new Date());
    //   gtag('config', 'GA_MEASUREMENT_ID');
    // };
  }
})();

/* --- Privacy link language routing --- */
document.addEventListener('i18n:changed', function(e) {
  var lang = e.detail && e.detail.lang;
  if (!lang) return;
  var base = window.location.pathname.replace(/\/(de|hr)\/.*/, '/').replace(/\/[^/]*$/, '/');
  var paths = { en: base + 'privacy.html', de: base + 'de/privacy.html', hr: base + 'hr/privacy.html' };
  var href = paths[lang] || paths.en;
  document.querySelectorAll('.privacy-link').forEach(function(a) {
    a.setAttribute('href', href);
  });
});

/* --- Engine Progress Ring Animation --- */
(function() {
  var ring = document.querySelector('.progress-ring');
  if (!ring) return;
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        ring.classList.add('animated');
        observer.unobserve(ring);
      }
    });
  }, { threshold: 0.5 });
  observer.observe(ring);
})();
