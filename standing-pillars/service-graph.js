// ============================================
// Service Graph - Focused branch from Standing Pillars core
// Lightweight subset of hero-scene.js for service pages
// Usage: <canvas id="serviceGraph" data-service="ux-design|ai-procurement|local-business">
// ============================================

(function () {
  const canvas = document.getElementById('serviceGraph');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const service = canvas.dataset.service;
  const lang = document.documentElement.lang || 'en';

  // --- Colors ---
  const ACCENT = { r: 46, g: 125, b: 156 };
  const GREEN  = { r: 22, g: 163, b: 74 };
  const WHITE  = { r: 255, g: 255, b: 255 };

  // --- Localized labels per language ---
  const LABELS = {
    de: {
      'Standing Pillars': 'Standing Pillars',
      'Design': 'Design',
      'UX/UI': 'UX/UI',
      'Figma': 'Figma',
      'User Research': 'Nutzerforschung',
      'Stakeholder Sessions': 'Stakeholder-Sitzungen',
      'Team Workshops': 'Team-Workshops',
      'FigJam': 'FigJam',
      'Atomic Design': 'Atomic Design',
      'Adobe Suite': 'Adobe Suite',
      'Branding': 'Branding',
      'Web Design': 'Webdesign',
      'Evaluate': 'Bewerten',
      'OSINT': 'OSINT',
      'RFP/RFI': 'RFP/RFI',
      'AI Governance': 'KI-Governance',
      'Due Diligence': 'Due Diligence',
      'Business Analysis': 'Geschaftsanalyse',
      'Recommendations': 'Empfehlungen',
      'Scorecards': 'Scorecards',
      'GDPR': 'DSGVO',
      'GxP': 'GxP',
      'Prompt Eng.': 'Prompt Eng.',
      'Local Business': 'Lokale Unternehmen',
      'Local SEO': 'Lokales SEO',
      'HTML/CSS': 'HTML/CSS',
      'JavaScript': 'JavaScript',
      'WordPress': 'WordPress',
    },
    hr: {
      'Standing Pillars': 'Standing Pillars',
      'Design': 'Dizajn',
      'UX/UI': 'UX/UI',
      'Figma': 'Figma',
      'User Research': 'Istrazivanje korisnika',
      'Stakeholder Sessions': 'Radionice s dionicima',
      'Team Workshops': 'Timske radionice',
      'FigJam': 'FigJam',
      'Atomic Design': 'Atomic Design',
      'Adobe Suite': 'Adobe Suite',
      'Branding': 'Branding',
      'Web Design': 'Web dizajn',
      'Evaluate': 'Evaluacija',
      'OSINT': 'OSINT',
      'RFP/RFI': 'RFP/RFI',
      'AI Governance': 'AI upravljanje',
      'Due Diligence': 'Due Diligence',
      'Business Analysis': 'Poslovna analiza',
      'Recommendations': 'Preporuke',
      'Scorecards': 'Scorecards',
      'GDPR': 'GDPR',
      'GxP': 'GxP',
      'Prompt Eng.': 'Prompt Eng.',
      'Local Business': 'Lokalne tvrtke',
      'Local SEO': 'Lokalni SEO',
      'HTML/CSS': 'HTML/CSS',
      'JavaScript': 'JavaScript',
      'WordPress': 'WordPress',
    }
  };

  function localize(label) {
    if (lang === 'en' || !LABELS[lang]) return label;
    return LABELS[lang][label] || label;
  }

  // --- Service configs: nodes laid out left-to-right ---
  // x: 0 = core (left), spreading right; y: vertical spread
  const CONFIGS = {
    'ux-design': {
      nodes: [
        { id: 'core',     label: 'Standing Pillars', x: 0,   y: 0,   z: 0,   size: 30, color: ACCENT, tier: 'core' },
        { id: 'design',   label: 'Design',           x: 130, y: -6,  z: 25,  size: 14, color: GREEN, tier: 'primary' },
        { id: 'ux',       label: 'UX/UI',            x: 260, y: -55, z: 15,  size: 8,  color: GREEN, tier: 'secondary' },
        { id: 'figma',    label: 'Figma',            x: 260, y: 35,  z: -8,  size: 7,  color: GREEN, tier: 'secondary' },
        { id: 'research', label: 'User Research',    x: 250, y: -18, z: 40,  size: 7,  color: GREEN, tier: 'secondary' },
        { id: 'stakeholder', label: 'Stakeholder Sessions', x: 250, y: 72, z: 8, size: 6, color: GREEN, tier: 'secondary' },
        { id: 'workshops', label: 'Team Workshops',  x: 360, y: 78,  z: -15, size: 5, color: GREEN, tier: 'tertiary' },
        { id: 'figjam',   label: 'FigJam',           x: 360, y: 48,  z: 8,   size: 5,  color: GREEN, tier: 'tertiary' },
        { id: 'atomic',   label: 'Atomic Design',    x: 370, y: -68, z: -15, size: 5, color: GREEN, tier: 'tertiary' },
        { id: 'adobe',    label: 'Adobe Suite',      x: 370, y: 24,  z: -25, size: 5,  color: GREEN, tier: 'tertiary' },
        { id: 'brand',    label: 'Branding',         x: 260, y: -90, z: -15, size: 6, color: GREEN, tier: 'secondary' },
        { id: 'web',      label: 'Web Design',       x: 360, y: -30, z: 25,  size: 6,  color: GREEN, tier: 'tertiary' },
      ],
      edges: [
        { from: 'core', to: 'design' },
        { from: 'design', to: 'ux' },
        { from: 'design', to: 'figma' },
        { from: 'design', to: 'research' },
        { from: 'design', to: 'stakeholder' },
        { from: 'stakeholder', to: 'workshops' },
        { from: 'figma', to: 'figjam' },
        { from: 'figma', to: 'adobe' },
        { from: 'ux', to: 'atomic' },
        { from: 'design', to: 'brand' },
        { from: 'ux', to: 'web' },
      ]
    },
    'ai-procurement': {
      nodes: [
        { id: 'core',     label: 'Standing Pillars', x: 0,   y: 0,   z: 0,   size: 30, color: ACCENT, tier: 'core' },
        { id: 'evaluate', label: 'Evaluate',         x: 130, y: -6,  z: 15,  size: 14, color: GREEN, tier: 'primary' },
        { id: 'osint',    label: 'OSINT',            x: 260, y: -50, z: -15, size: 8,  color: GREEN, tier: 'secondary' },
        { id: 'rfp',      label: 'RFP/RFI',          x: 250, y: 12,  z: 25,  size: 7,  color: GREEN, tier: 'secondary' },
        { id: 'ai',       label: 'AI Governance',    x: 260, y: 60,  z: -8,  size: 7,  color: GREEN, tier: 'secondary' },
        { id: 'duedil',   label: 'Due Diligence',    x: 250, y: -18, z: 30,  size: 7,  color: GREEN, tier: 'secondary' },
        { id: 'bizanalysis', label: 'Business Analysis', x: 260, y: 90, z: 8, size: 6, color: GREEN, tier: 'secondary' },
        { id: 'stakeholder', label: 'Stakeholder Sessions', x: 130, y: 60, z: -25, size: 6, color: GREEN, tier: 'secondary' },
        { id: 'workshops', label: 'Team Workshops',  x: 130, y: -60, z: 8,  size: 5, color: GREEN, tier: 'tertiary' },
        { id: 'recommend', label: 'Recommendations',  x: 370, y: 36,  z: -15, size: 5,  color: GREEN, tier: 'tertiary' },
        { id: 'scores',   label: 'Scorecards',       x: 370, y: -60, z: 8,  size: 5,  color: GREEN, tier: 'tertiary' },
        { id: 'gdpr',     label: 'GDPR',             x: 360, y: 18,  z: -25, size: 5,  color: GREEN, tier: 'tertiary' },
        { id: 'gxp',      label: 'GxP',              x: 360, y: -24, z: 15,  size: 6,  color: GREEN, tier: 'secondary' },
        { id: 'prompt',   label: 'Prompt Eng.',      x: 370, y: 78,  z: -15, size: 5,  color: GREEN, tier: 'tertiary' },
      ],
      edges: [
        { from: 'core', to: 'evaluate' },
        { from: 'core', to: 'stakeholder' },
        { from: 'core', to: 'workshops' },
        { from: 'evaluate', to: 'osint' },
        { from: 'evaluate', to: 'rfp' },
        { from: 'evaluate', to: 'ai' },
        { from: 'evaluate', to: 'gxp' },
        { from: 'evaluate', to: 'duedil' },
        { from: 'evaluate', to: 'bizanalysis' },
        { from: 'osint', to: 'scores' },
        { from: 'rfp', to: 'gdpr' },
        { from: 'ai', to: 'prompt' },
        { from: 'duedil', to: 'recommend' },
      ]
    },
    'local-business': {
      nodes: [
        { id: 'core',   label: 'Standing Pillars', x: 0,   y: 0,   z: 0,   size: 30, color: ACCENT, tier: 'core' },
        { id: 'local',  label: 'Local Business',   x: 130, y: -6,  z: 15,  size: 14, color: GREEN, tier: 'primary' },
        { id: 'web',    label: 'Web Design',       x: 260, y: -50, z: -8,  size: 7,  color: GREEN, tier: 'secondary' },
        { id: 'brand',  label: 'Branding',         x: 260, y: 12,  z: 25,  size: 7,  color: GREEN, tier: 'secondary' },
        { id: 'seo',    label: 'Local SEO',        x: 260, y: 60,  z: -15, size: 6,  color: GREEN, tier: 'secondary' },
        { id: 'bizanalysis', label: 'Business Analysis', x: 250, y: -18, z: 30, size: 6, color: GREEN, tier: 'secondary' },
        { id: 'stakeholder', label: 'Stakeholder Sessions', x: 130, y: 60, z: -15, size: 6, color: GREEN, tier: 'secondary' },
        { id: 'workshops', label: 'Team Workshops', x: 130, y: -55, z: 8,  size: 5, color: GREEN, tier: 'tertiary' },
        { id: 'recommend', label: 'Recommendations', x: 370, y: -12, z: -8, size: 5, color: GREEN, tier: 'tertiary' },
        { id: 'html',   label: 'HTML/CSS',         x: 370, y: -60, z: 8,   size: 5,  color: GREEN, tier: 'tertiary' },
        { id: 'js',     label: 'JavaScript',       x: 370, y: -30, z: -15, size: 5,  color: GREEN, tier: 'tertiary' },
        { id: 'wp',     label: 'WordPress',        x: 370, y: 36,  z: 15,  size: 5,  color: GREEN, tier: 'tertiary' },
      ],
      edges: [
        { from: 'core', to: 'local' },
        { from: 'core', to: 'stakeholder' },
        { from: 'core', to: 'workshops' },
        { from: 'local', to: 'web' },
        { from: 'local', to: 'brand' },
        { from: 'local', to: 'seo' },
        { from: 'local', to: 'bizanalysis' },
        { from: 'bizanalysis', to: 'recommend' },
        { from: 'web', to: 'html' },
        { from: 'web', to: 'js' },
        { from: 'web', to: 'wp' },
      ]
    }
  };

  const config = CONFIGS[service];
  if (!config) return;

  const nodes = config.nodes;
  const edges = config.edges;
  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);

  // --- Sizing ---
  const PERSPECTIVE = 500;
  let W, H, CX, CY, scaleFactor;

  // Pre-compute node x-range midpoint for centering
  var _minX = Infinity, _maxX = -Infinity;
  nodes.forEach(function (n) { if (n.x < _minX) _minX = n.x; if (n.x > _maxX) _maxX = n.x; });
  var _midX = (_minX + _maxX) / 2;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = W * (260 / 500);  // maintain aspect ratio like hero
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scaleFactor = W / 620;
    CX = W / 2 - _midX * scaleFactor;
    CY = H / 2;
  }

  resize();
  window.addEventListener('resize', resize);

  // --- Particles ---
  const particles = [];
  const MAX_PARTICLES = 20;

  function spawnParticle() {
    if (particles.length >= MAX_PARTICLES) return;
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const from = nodeMap[edge.from];
    const to = nodeMap[edge.to];
    if (!from || !to) return;
    particles.push({
      fromNode: from, toNode: to,
      t: 0, speed: 0.003 + Math.random() * 0.004,
      size: 1 + Math.random() * 1.2,
      color: from.color
    });
  }

  // --- Projection (left-to-right layout) ---
  function project(x, y, z, rotY, rotX) {
    const sx0 = x * scaleFactor;
    const sy0 = y * scaleFactor;
    const sz0 = z * scaleFactor;
    let x1 = sx0 * Math.cos(rotY) - sz0 * Math.sin(rotY);
    let z1 = sx0 * Math.sin(rotY) + sz0 * Math.cos(rotY);
    let y1 = sy0 * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = sy0 * Math.sin(rotX) + z1 * Math.cos(rotX);
    const scale = PERSPECTIVE / (PERSPECTIVE + z2);
    return { sx: CX + x1 * scale, sy: CY + y1 * scale, scale: scale * scaleFactor, z: z2 };
  }

  function rgba(c, a) { return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')'; }

  // --- Drawing ---
  function drawEdge(p1, p2, alpha) {
    const mx = (p1.sx + p2.sx) / 2 + (p1.sy - p2.sy) * 0.08;
    const my = (p1.sy + p2.sy) / 2 + (p2.sx - p1.sx) * 0.08;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.quadraticCurveTo(mx, my, p2.sx, p2.sy);
    ctx.strokeStyle = rgba(GREEN, alpha);
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function drawNode(n, p) {
    const r = n.size * p.scale;
    const baseAlpha = n.tier === 'tertiary' ? 0.4 : n.tier === 'secondary' ? 0.6 : 0.9;

    // Glow
    const glowR = r * 2.2;
    const grd = ctx.createRadialGradient(p.sx, p.sy, r * 0.3, p.sx, p.sy, glowR);
    grd.addColorStop(0, rgba(n.color, baseAlpha * 0.25));
    grd.addColorStop(1, rgba(n.color, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Dot
    ctx.fillStyle = rgba(n.color, baseAlpha);
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Center bright
    ctx.fillStyle = rgba(WHITE, baseAlpha * 0.6);
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Label
    var labelAlpha = n.tier === 'core' ? 0.9 : n.tier === 'primary' ? 0.7 : 0.45;
    var fontSize = n.tier === 'core' ? 12 : n.tier === 'primary' ? 10 : 8.5;
    ctx.font = (n.tier === 'core' || n.tier === 'primary' ? '600 ' : '400 ') + (fontSize * p.scale) + 'px Inter, sans-serif';
    ctx.fillStyle = rgba(WHITE, labelAlpha);
    ctx.textAlign = 'center';
    ctx.fillText(localize(n.label), p.sx, p.sy + r + 11 * p.scale);
  }

  // --- Render loop ---
  var time = 0;

  function render() {
    time++;
    ctx.clearRect(0, 0, W, H);

    // Gentle auto-rotate
    var rotY = Math.sin(time * 0.0004) * 0.08;
    var rotX = Math.cos(time * 0.0005) * 0.04;
    var pulse = 1 + Math.sin(time * 0.0008) * 0.015;

    if (Math.random() < 0.08) spawnParticle();

    // Project
    var projected = nodes.map(function (n) {
      var p = project(n.x * pulse, n.y * pulse, n.z * pulse, rotY, rotX);
      p.node = n;
      return p;
    });

    var projMap = {};
    projected.forEach(function (p) { projMap[p.node.id] = p; });

    // Edges
    edges.forEach(function (edge) {
      var p1 = projMap[edge.from];
      var p2 = projMap[edge.to];
      if (p1 && p2) drawEdge(p1, p2, 0.18);
    });

    // Particles
    for (var i = particles.length - 1; i >= 0; i--) {
      var fp = particles[i];
      fp.t += fp.speed;
      if (fp.t >= 1) { particles.splice(i, 1); continue; }
      var from = projMap[fp.fromNode.id];
      var to = projMap[fp.toNode.id];
      if (!from || !to) { particles.splice(i, 1); continue; }

      var t = fp.t;
      var mx = (from.sx + to.sx) / 2 + (from.sy - to.sy) * 0.08;
      var my = (from.sy + to.sy) / 2 + (to.sx - from.sx) * 0.08;
      var u = 1 - t;
      var px = u * u * from.sx + 2 * u * t * mx + t * t * to.sx;
      var py = u * u * from.sy + 2 * u * t * my + t * t * to.sy;

      var fadeIn = Math.min(1, t / 0.15);
      var fadeOut = Math.min(1, (1 - t) / 0.15);
      var alpha = fadeIn * fadeOut * 0.6;

      var grd = ctx.createRadialGradient(px, py, 0, px, py, fp.size * 3);
      grd.addColorStop(0, rgba(fp.color, alpha * 0.3));
      grd.addColorStop(1, rgba(fp.color, 0));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, fp.size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = rgba(WHITE, alpha);
      ctx.beginPath();
      ctx.arc(px, py, fp.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nodes (depth sorted)
    projected.sort(function (a, b) { return b.z - a.z; });
    projected.forEach(function (p) { drawNode(p.node, p); });

    requestAnimationFrame(render);
  }

  // --- i18n support ---
  var i18nMap = {
    design: 'design', evaluate: 'evaluate', build: 'build', local: 'localBusiness',
    research: 'userResearch', atomic: 'atomicDesign', scores: 'scorecards',
    ai: 'aiGovernance', prompt: 'promptEng', web: 'webDesign', brand: 'branding',
    seo: 'localSeo'
  };

  document.addEventListener('i18n:changed', function () {
    if (typeof I18n !== 'undefined') {
      var graph = I18n.t('heroGraph');
      if (graph && typeof graph === 'object') {
        nodes.forEach(function (n) {
          if (i18nMap[n.id] && graph[i18nMap[n.id]]) {
            n.label = graph[i18nMap[n.id]];
          }
        });
      }
    }
  });

  render();
})();
