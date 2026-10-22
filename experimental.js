/* Experimental interactions. Keep the original artifacts and page language intact. */
(function () {
  'use strict';
  function initialize() {
    const explorer = document.querySelector('[data-hero-paths]');
    const canvas = document.getElementById('heroScene');
    const tabs = explorer ? Array.from(explorer.querySelectorAll('[role="tab"]')) : [];
    let selected = tabs[0];
    function highlight(tab) {
      if (!canvas || !tab) return;
      canvas.dispatchEvent(new CustomEvent('graphHighlight', {
        detail: { nodeIds: tab.dataset.graphNodes.split(',') }
      }));
    }
    function select(tab, focus) {
      if (!tab) return;
      selected = tab;
      tabs.forEach(item => {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
        item.classList.toggle('is-active', active);
        const panel = document.getElementById(item.getAttribute('aria-controls'));
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
      highlight(tab);
      if (focus) tab.focus();
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('mouseenter', () => highlight(tab));
      tab.addEventListener('mouseleave', () => highlight(selected));
      tab.addEventListener('focus', () => highlight(tab));
      tab.addEventListener('blur', () => highlight(selected));
      tab.addEventListener('keydown', event => {
        let next;
        if (['ArrowRight', 'ArrowDown'].includes(event.key)) next = (index + 1) % tabs.length;
        if (['ArrowLeft', 'ArrowUp'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); select(tabs[next], true); }
      });
    });
    document.addEventListener('heroPathSelect', event => {
      select(tabs.find(tab => tab.dataset.path === event.detail.path), false);
    });
    select(selected, false);

    // Case headers contain a real expand button, separate from their content.
    function setCase(id, open) {
      const block = document.getElementById(id);
      if (!block) return;
      const panel = block.querySelector('.case-detail-panel');
      const button = block.querySelector('[data-case-toggle]');
      block.classList.toggle('expanded', open);
      if (panel) panel.hidden = !open;
      if (button) button.setAttribute('aria-expanded', String(open));
    }
    window.toggleCaseStudy = function (id) {
      const block = document.getElementById(id);
      if (!block) return;
      const open = !block.classList.contains('expanded');
      document.querySelectorAll('[data-case-toggle]').forEach(button => {
        setCase(button.dataset.caseToggle, button.dataset.caseToggle === id && open);
      });
    };
    document.querySelectorAll('[data-case-toggle]').forEach(button => {
      button.addEventListener('click', () => window.toggleCaseStudy(button.dataset.caseToggle));
      const header = button.closest('.case-card-header');
      header.addEventListener('click', event => {
        if (!event.target.closest('button, a, input, summary')) button.click();
      });
    });
    // Capture opens a case before the existing smooth-scroll listener runs.
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.dataset.openCase;
      if (id) setCase(id, true);
      const target = document.getElementById(link.hash.slice(1));
      if (target) {
        if (target.id === 'design-gallery') {
          const galleryToggle = document.getElementById('galleryToggle');
          if (galleryToggle && !galleryToggle.checked) {
            galleryToggle.checked = true;
            galleryToggle.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        let ancestor = target.closest('details');
        while (ancestor) { ancestor.open = true; ancestor = ancestor.parentElement.closest('details'); }
        // Deep links to an old expertise anchor open the retained detail.
        if (['services', 'skills'].includes(target.id)) {
          const details = document.querySelector(target.id === 'services' ? '[data-detail="expertise"]' : '[data-detail="tools"]');
          if (details) details.open = true;
        }
      }
    }, true);
    function openHash() {
      if (['#services', '#skills'].includes(location.hash)) {
        const details = document.querySelector(location.hash === '#services' ? '[data-detail="expertise"]' : '[data-detail="tools"]');
        if (details) details.open = true;
      }
      if (['#cs-rca', '#cs-intelligent-authoring', '#rca-design-decisions'].includes(location.hash)) {
        const id = location.hash === '#cs-intelligent-authoring' ? 'cs-intelligent-authoring' : 'cs-rca';
        setCase(id, true);
        if (location.hash === '#rca-design-decisions') document.getElementById('rca-design-decisions').open = true;
      }
    }
    window.addEventListener('hashchange', openHash);
    openHash();

    document.querySelectorAll('.decision-exhibit').forEach(exhibit => {
      const controls = Array.from(exhibit.querySelectorAll('[data-decision]'));
      function activate(id) {
        controls.forEach(control => {
          const active = control.dataset.decision === id;
          control.classList.toggle('is-active', active);
          control.setAttribute('aria-pressed', String(active));
        });
      }
      controls.forEach(control => {
        control.addEventListener('click', () => activate(control.dataset.decision));
        control.addEventListener('focus', () => activate(control.dataset.decision));
      });
      exhibit.addEventListener('keydown', event => {
        if (event.key === 'Escape' && exhibit.open) {
          event.preventDefault(); exhibit.open = false; exhibit.querySelector('summary').focus();
        }
      });
    });
    document.querySelectorAll('.gallery-item[onclick]').forEach(item => {
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      const caption = item.querySelector('.gallery-caption');
      if (caption) {
        if (!caption.id) caption.id = 'gallery-caption-' + Array.from(document.querySelectorAll('.gallery-item')).indexOf(item);
        item.setAttribute('aria-labelledby', caption.id);
      }
      item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); item.click(); }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})();
