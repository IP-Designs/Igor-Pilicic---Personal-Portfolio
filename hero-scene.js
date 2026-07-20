// ============================================
// Hero Scene - Mycelial Knowledge Network
// Interactive 3D node graph with nutrient-flow particles
// Represents Standing Pillars' connected practice
// ============================================

(function () {
  const canvas = document.getElementById('heroScene');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const dpr = window.devicePixelRatio || 1;

  // Dynamic sizing - match CSS display size
  let W, H, CX, CY, scaleFactor;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.width * (520 / 624); // maintain aspect ratio
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CX = W / 2;
    CY = H / 2;
    scaleFactor = W / 740; // scale node positions relative to design size (padded for edge nodes)
  }

  resize();
  window.addEventListener('resize', resize);

  // --- Configuration ---
  const PERSPECTIVE = 600;
  const ACCENT = { r: 30, g: 100, b: 140 };      // darker accent for light bg
  const ACCENT_L = { r: 46, g: 125, b: 156 };     // --accent
  const GREEN = { r: 22, g: 163, b: 74 };          // darker green for light bg
  const WHITE = { r: 255, g: 255, b: 255 };
  const DARK = { r: 15, g: 27, b: 45 };            // navy for text on light bg

  // Mouse state
  let mouseX = 0;
  let mouseY = 0;
  let mouseOver = false;
  let hoveredNode = null;
  let time = 0;

  // --- Node definitions ---
  const nodes = [
    // Core
    { id: 'core',    label: 'Standing Pillars',         x: 0,    y: 0,    z: 0,   size: 22, color: ACCENT_L, tier: 'core' },
    // Primary pillars
    { id: 'design',  label: 'Design',             x: -150, y: -80,  z: 60,  size: 16, color: ACCENT,   tier: 'primary' },
    { id: 'evaluate',label: 'Evaluate',            x: 30,   y: -120, z: -40, size: 16, color: ACCENT,   tier: 'primary' },
    { id: 'build',   label: 'Build',              x: 160,  y: -50,  z: 30,  size: 16, color: ACCENT,   tier: 'primary' },
    { id: 'local',   label: 'Local Business',     x: -20,  y: 110,  z: -20, size: 14, color: GREEN,    tier: 'primary' },
    // Secondary - Design cluster
    { id: 'ux',      label: 'UX/UI',              x: -190, y: -160, z: 90,  size: 8,  color: ACCENT,   tier: 'secondary' },
    { id: 'figma',   label: 'Figma',              x: -220, y: -50,  z: 40,  size: 7,  color: ACCENT,   tier: 'secondary' },
    { id: 'research',label: 'User Research',       x: -120, y: -170, z: 20,  size: 7,  color: ACCENT,   tier: 'secondary' },
    { id: 'figjam', label: 'FigJam',              x: -250, y: -120, z: 70,  size: 5,  color: ACCENT,   tier: 'tertiary' },
    { id: 'adobe',  label: 'Adobe Suite',         x: -260, y: -20,  z: 10,  size: 5,  color: ACCENT,   tier: 'tertiary' },
    { id: '3dsmax', label: '3ds Max',             x: -240, y: -160, z: -20, size: 5,  color: ACCENT,   tier: 'tertiary' },
    { id: 'miro',   label: 'Miro',                x: -180, y: -10,  z: 100, size: 5,  color: ACCENT,   tier: 'tertiary' },
    { id: 'atomic',  label: 'Atomic Design',      x: -170, y: -130, z: -40, size: 5,  color: ACCENT,   tier: 'tertiary' },
    // Secondary - Evaluate cluster
    { id: 'osint',   label: 'OSINT',              x: 80,   y: -190, z: -80, size: 8,  color: ACCENT,   tier: 'secondary' },
    { id: 'rfp',     label: 'RFP/RFI',            x: -30,  y: -195, z: -10, size: 7,  color: ACCENT,   tier: 'secondary' },
    { id: 'gxp',     label: 'GxP',                x: 100,  y: -150, z: 20,  size: 7,  color: ACCENT,   tier: 'secondary' },
    { id: 'gdpr',   label: 'GDPR',                x: -10,  y: -230, z: -60, size: 5,  color: ACCENT,   tier: 'tertiary' },
    { id: 'scores', label: 'Scorecards',          x: 130,  y: -210, z: -50, size: 5,  color: ACCENT,   tier: 'tertiary' },
    { id: 'conflu', label: 'Confluence',           x: 60,   y: -230, z: 10,  size: 5,  color: ACCENT,   tier: 'tertiary' },
    { id: 'lucid',  label: 'Lucidchart',          x: -60,  y: -225, z: -90, size: 5,  color: ACCENT,   tier: 'tertiary' },
    // Secondary - Build cluster
    { id: 'engine',  label: 'Tiny Humans',        x: 200,  y: -120, z: 70,  size: 8,  color: ACCENT,   tier: 'secondary' },
    { id: 'ai',      label: 'AI Governance',       x: 190,  y: 20,   z: -30, size: 7,  color: ACCENT,   tier: 'secondary' },
    { id: 'js',      label: 'JavaScript',          x: 210,  y: -30,  z: 100, size: 6,  color: ACCENT,   tier: 'secondary' },
    { id: 'html',   label: 'HTML/CSS',            x: 240,  y: -70,  z: 120, size: 5,  color: ACCENT,   tier: 'tertiary' },
    { id: 'sql',    label: 'SQL',                  x: 230,  y: 50,   z: 60,  size: 5,  color: ACCENT,   tier: 'tertiary' },
    { id: 'prompt', label: 'Prompt Eng.',          x: 240,  y: -10,  z: -70, size: 5,  color: ACCENT,   tier: 'tertiary' },
    // Secondary - Local cluster
    { id: 'web',     label: 'Web Design',          x: -100, y: 150,  z: 40,  size: 7,  color: GREEN,    tier: 'secondary' },
    { id: 'brand',   label: 'Branding',            x: 60,   y: 165,  z: -50, size: 7,  color: GREEN,    tier: 'secondary' },
    { id: 'seo',     label: 'Local SEO',           x: -50,  y: 175,  z: -80, size: 6,  color: GREEN,    tier: 'secondary' },
    { id: 'wp',     label: 'WordPress',            x: -130, y: 190,  z: 20,  size: 5,  color: GREEN,    tier: 'tertiary' },
    { id: 'magento',label: 'Magento',              x: 30,   y: 205,  z: -30, size: 5,  color: GREEN,    tier: 'tertiary' },
    // Tertiary - collaboration
    { id: 'jira',   label: 'Jira',                 x: -80,  y: 50,   z: -110, size: 5, color: ACCENT,   tier: 'tertiary' },
    { id: 'trello', label: 'Trello',               x: -110, y: 80,   z: -80,  size: 5, color: ACCENT,   tier: 'tertiary' },
    // Tertiary - atmosphere
    { id: 'pharma',  label: 'Pharma',             x: -60,  y: -40,  z: -100, size: 6, color: ACCENT,   tier: 'tertiary' },
    { id: 'roche',   label: 'Roche',              x: -140, y: 30,   z: -60,  size: 5, color: ACCENT,   tier: 'tertiary' },
    { id: 'acc',     label: 'Accenture',          x: 120,  y: 60,   z: -90,  size: 5, color: ACCENT,   tier: 'tertiary' },
    { id: 'armil',   label: 'Armillaria',         x: 40,   y: 60,   z: 80,   size: 6, color: GREEN,    tier: 'tertiary' },
  ];

  // --- i18n label mapping (node id → heroGraph translation key) ---
  const i18nMap = {
    design: 'design', evaluate: 'evaluate', build: 'build', local: 'localBusiness',
    research: 'userResearch', atomic: 'atomicDesign', scores: 'scorecards',
    ai: 'aiGovernance', prompt: 'promptEng', web: 'webDesign', brand: 'branding',
    seo: 'localSeo', pharma: 'pharma'
  };

  // Update labels when language changes
  document.addEventListener('i18n:changed', () => {
    if (typeof I18n !== 'undefined') {
      const graph = I18n.t('heroGraph');
      if (graph && typeof graph === 'object') {
        nodes.forEach(n => {
          if (i18nMap[n.id] && graph[i18nMap[n.id]]) {
            n.label = graph[i18nMap[n.id]];
          }
        });
      }
    }
  });

  // --- Edges (connections) with flow direction ---
  const edges = [
    // Core to pillars
    { from: 'core', to: 'design' },
    { from: 'core', to: 'evaluate' },
    { from: 'core', to: 'build' },
    { from: 'core', to: 'local' },
    // Pillar interconnections (the practice loop)
    { from: 'design',   to: 'evaluate', label: 'informs' },
    { from: 'evaluate', to: 'build',    label: 'governs' },
    { from: 'build',    to: 'design',   label: 'sharpens' },
    // Design satellites
    { from: 'design', to: 'ux' },
    { from: 'design', to: 'figma' },
    { from: 'design', to: 'research' },
    { from: 'figma',  to: 'figjam' },
    { from: 'figma',  to: 'adobe' },
    { from: 'design', to: '3dsmax' },
    { from: 'design', to: 'miro' },
    { from: 'ux',     to: 'atomic' },
    // Evaluate satellites
    { from: 'evaluate', to: 'osint' },
    { from: 'evaluate', to: 'rfp' },
    { from: 'evaluate', to: 'gxp' },
    { from: 'rfp',      to: 'gdpr' },
    { from: 'osint',    to: 'scores' },
    { from: 'evaluate', to: 'conflu' },
    { from: 'rfp',      to: 'lucid' },
    // Build satellites
    { from: 'build', to: 'engine' },
    { from: 'build', to: 'ai' },
    { from: 'build', to: 'js' },
    { from: 'js',    to: 'html' },
    { from: 'build', to: 'sql' },
    { from: 'ai',    to: 'prompt' },
    // Local satellites
    { from: 'local', to: 'web' },
    { from: 'local', to: 'brand' },
    { from: 'local', to: 'seo' },
    { from: 'web',   to: 'wp' },
    { from: 'local', to: 'magento' },
    // Collaboration - connected to core
    { from: 'core',   to: 'jira' },
    { from: 'core',   to: 'trello' },
    // Tertiary
    { from: 'core',     to: 'pharma' },
    { from: 'design',   to: 'roche' },
    { from: 'evaluate', to: 'acc' },
    { from: 'build',    to: 'armil' },
  ];

  // Node map for quick lookup
  const nodeMap = {};
  nodes.forEach(n => nodeMap[n.id] = n);

  // --- Particles (nutrient flow) ---
  const flowParticles = [];
  const MAX_PARTICLES = 80;

  function spawnFlowParticle() {
    if (flowParticles.length >= MAX_PARTICLES) return;
    const edge = edges[Math.floor(Math.random() * edges.length)];
    const from = nodeMap[edge.from];
    const to = nodeMap[edge.to];
    if (!from || !to) return;
    const c = (from.color.g > 150) ? GREEN : ACCENT_L;
    flowParticles.push({
      fromNode: from,
      toNode: to,
      t: 0,
      speed: 0.003 + Math.random() * 0.004,
      size: 1.2 + Math.random() * 1.5,
      color: c,
    });
  }

  // --- 3D projection ---
  function project(x, y, z, rotY, rotX) {
    // Scale positions to current canvas size
    const sx0 = x * scaleFactor;
    const sy0 = y * scaleFactor;
    const sz0 = z * scaleFactor;
    // Rotate Y
    let x1 = sx0 * Math.cos(rotY) - sz0 * Math.sin(rotY);
    let z1 = sx0 * Math.sin(rotY) + sz0 * Math.cos(rotY);
    // Rotate X
    let y1 = sy0 * Math.cos(rotX) - z1 * Math.sin(rotX);
    let z2 = sy0 * Math.sin(rotX) + z1 * Math.cos(rotX);
    // Perspective
    const scale = PERSPECTIVE / (PERSPECTIVE + z2);
    return {
      sx: CX + x1 * scale,
      sy: CY + y1 * scale,
      scale: scale * scaleFactor,
      z: z2
    };
  }

  // --- Drawing helpers ---
  function rgba(c, a) {
    return `rgba(${c.r},${c.g},${c.b},${a})`;
  }

  function drawConnection(p1, p2, alpha, width) {
    // Organic curve - offset midpoint slightly
    const mx = (p1.sx + p2.sx) / 2 + (p1.sy - p2.sy) * 0.08;
    const my = (p1.sy + p2.sy) / 2 + (p2.sx - p1.sx) * 0.08;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    ctx.quadraticCurveTo(mx, my, p2.sx, p2.sy);
    ctx.strokeStyle = rgba(ACCENT, alpha);
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function drawNode(n, p, isHovered) {
    const r = n.size * p.scale;
    const baseAlpha = n.tier === 'tertiary' ? 0.35 : n.tier === 'secondary' ? 0.55 : 0.85;
    const alpha = isHovered ? 1 : baseAlpha;

    // Outer glow
    const glowR = r * (isHovered ? 3.5 : 2.2);
    const grd = ctx.createRadialGradient(p.sx, p.sy, r * 0.3, p.sx, p.sy, glowR);
    grd.addColorStop(0, rgba(n.color, alpha * 0.25));
    grd.addColorStop(1, rgba(n.color, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Core dot
    ctx.fillStyle = rgba(n.color, alpha);
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
    ctx.fill();

    // Bright center
    ctx.fillStyle = rgba(WHITE, alpha * 0.6);
    ctx.beginPath();
    ctx.arc(p.sx, p.sy, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Label
    const labelAlpha = isHovered ? 1 : (n.tier === 'core' ? 0.9 : n.tier === 'primary' ? 0.7 : 0.35);
    const fontSize = n.tier === 'core' ? 13 : n.tier === 'primary' ? 11 : 9;
    ctx.font = `${n.tier === 'core' || n.tier === 'primary' ? '600' : '400'} ${fontSize * p.scale}px Inter, sans-serif`;
    const labelColor = document.documentElement.getAttribute('data-theme') === 'dark' ? WHITE : DARK;
    ctx.fillStyle = rgba(labelColor, labelAlpha);
    ctx.textAlign = 'center';
    ctx.fillText(n.label, p.sx, p.sy + r + 12 * p.scale);
  }

  // --- Mouse handling ---
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    mouseOver = true;
  });

  canvas.addEventListener('mouseleave', () => {
    mouseOver = false;
  });

  canvas.addEventListener('click', () => {
    if (!hoveredNode) return;
    const sectionMap = {
      'armil': '#research'
    };
    const target = sectionMap[hoveredNode.id];
    if (target) {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // --- External highlight via custom event (tag hover → graph branch pulse) ---
  let externalHighlightIds = null; // Set of node IDs or null
  canvas.addEventListener('graphHighlight', (e) => {
    if (e.detail && e.detail.nodeIds && e.detail.nodeIds.length) {
      externalHighlightIds = new Set(e.detail.nodeIds);
    } else {
      externalHighlightIds = null;
    }
  });

  // Set cursor style
  canvas.style.cursor = 'default';

  // --- Breathing pulse ---
  function breathe(t) {
    return 1 + Math.sin(t * 0.0008) * 0.02;
  }

  // --- Main render loop ---
  function render() {
    time++;
    ctx.clearRect(0, 0, W, H);

    // Camera rotation from mouse (subtle parallax)
    const targetRotY = mouseOver ? (mouseX - CX) / W * 0.35 : Math.sin(time * 0.0004) * 0.12;
    const targetRotX = mouseOver ? (mouseY - CY) / H * 0.2 : Math.cos(time * 0.0005) * 0.06;
    // Smooth interpolation
    const rotY = targetRotY;
    const rotX = targetRotX;

    const pulse = breathe(time);

    // Spawn particles
    if (Math.random() < 0.15) spawnFlowParticle();

    // Project all nodes
    const projected = nodes.map(n => {
      const p = project(n.x * pulse, n.y * pulse, n.z * pulse, rotY, rotX);
      p.node = n;
      return p;
    });

    // Find hovered node
    hoveredNode = null;
    if (mouseOver) {
      let closestDist = 30;
      for (const p of projected) {
        const dx = p.sx - mouseX;
        const dy = p.sy - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = p.node.size * p.scale + 8;
        if (dist < hitRadius && dist < closestDist) {
          closestDist = dist;
          hoveredNode = p.node;
        }
      }
    }
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';

    // Build projected lookup
    const projMap = {};
    projected.forEach(p => projMap[p.node.id] = p);

    // Connected set (for hover highlighting)
    const connectedIds = new Set();
    const connectedEdges = new Set();
    // Use mouse-hovered node or externally triggered branch (from tag hover)
    const activeNode = hoveredNode || null;
    const activeBranch = !hoveredNode && externalHighlightIds ? externalHighlightIds : null;
    if (activeNode) {
      connectedIds.add(activeNode.id);
      edges.forEach((e, i) => {
        if (e.from === activeNode.id || e.to === activeNode.id) {
          connectedIds.add(e.from);
          connectedIds.add(e.to);
          connectedEdges.add(i);
        }
      });
    } else if (activeBranch) {
      activeBranch.forEach(id => connectedIds.add(id));
      edges.forEach((e, i) => {
        if (activeBranch.has(e.from) && activeBranch.has(e.to)) {
          connectedEdges.add(i);
        }
      });
    }
    const hasHighlight = activeNode || activeBranch;

    // --- Draw edges ---
    edges.forEach((edge, i) => {
      const p1 = projMap[edge.from];
      const p2 = projMap[edge.to];
      if (!p1 || !p2) return;
      const highlighted = connectedEdges.has(i);
      const alpha = highlighted ? 0.5 : (hasHighlight ? 0.06 : 0.15);
      const width = highlighted ? 1.8 : 0.7;
      drawConnection(p1, p2, alpha, width);
    });

    // --- Draw flow particles ---
    for (let i = flowParticles.length - 1; i >= 0; i--) {
      const fp = flowParticles[i];
      fp.t += fp.speed;
      if (fp.t >= 1) { flowParticles.splice(i, 1); continue; }

      const from = projMap[fp.fromNode.id];
      const to = projMap[fp.toNode.id];
      if (!from || !to) { flowParticles.splice(i, 1); continue; }

      // Lerp along the curved path
      const t = fp.t;
      const mx = (from.sx + to.sx) / 2 + (from.sy - to.sy) * 0.08;
      const my = (from.sy + to.sy) / 2 + (to.sx - from.sx) * 0.08;
      // Quadratic bezier interpolation
      const u = 1 - t;
      const px = u * u * from.sx + 2 * u * t * mx + t * t * to.sx;
      const py = u * u * from.sy + 2 * u * t * my + t * t * to.sy;

      const fadeIn = Math.min(1, t / 0.15);
      const fadeOut = Math.min(1, (1 - t) / 0.15);
      const alpha = fadeIn * fadeOut * 0.7;

      // Glow
      const grd = ctx.createRadialGradient(px, py, 0, px, py, fp.size * 4);
      grd.addColorStop(0, rgba(fp.color, alpha * 0.3));
      grd.addColorStop(1, rgba(fp.color, 0));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(px, py, fp.size * 4, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = rgba(WHITE, alpha);
      ctx.beginPath();
      ctx.arc(px, py, fp.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Draw nodes (sorted by depth, far first) ---
    projected.sort((a, b) => b.z - a.z);
    for (const p of projected) {
      const isHovered = connectedIds.has(p.node.id);
      const dimmed = hasHighlight && !connectedIds.has(p.node.id);

      if (dimmed) {
        ctx.globalAlpha = 0.25;
      }
      drawNode(p.node, p, isHovered);
      ctx.globalAlpha = 1;
    }

    // --- Tooltip for hovered node (mouse only, not branch highlight) ---
    if (hoveredNode) {
      const hp = projMap[hoveredNode.id];
      const tipKeyMap = {
        'core': 'tipCore', 'design': 'tipDesign', 'evaluate': 'tipEvaluate',
        'build': 'tipBuild', 'local': 'tipLocal', 'ux': 'tipUx',
        'figma': 'tipFigma', 'research': 'tipResearch', 'figjam': 'tipFigjam',
        'adobe': 'tipAdobe', '3dsmax': 'tip3dsmax', 'miro': 'tipMiro',
        'atomic': 'tipAtomic', 'osint': 'tipOsint', 'rfp': 'tipRfp',
        'gxp': 'tipGxp', 'gdpr': 'tipGdpr', 'scores': 'tipScores',
        'conflu': 'tipConflu', 'lucid': 'tipLucid', 'engine': 'tipEngine',
        'ai': 'tipAi', 'js': 'tipJs', 'html': 'tipHtml',
        'sql': 'tipSql', 'prompt': 'tipPrompt', 'web': 'tipWeb',
        'brand': 'tipBrand', 'seo': 'tipSeo', 'wp': 'tipWp',
        'magento': 'tipMagento', 'jira': 'tipJira', 'trello': 'tipTrello',
        'pharma': 'tipPharma', 'roche': 'tipRoche', 'acc': 'tipAcc',
        'armil': 'tipArmil',
      };
      const tipKey = tipKeyMap[hoveredNode.id];
      const tip = tipKey && typeof I18n !== 'undefined' ? I18n.t('heroGraph.' + tipKey) : null;
      if (tip && hp) {
        const fontSize = 10;
        ctx.font = `400 ${fontSize}px Inter, sans-serif`;
        const tw = ctx.measureText(tip).width;
        const tx = hp.sx - tw / 2 - 8;
        const ty = hp.sy - hoveredNode.size * hp.scale - 24;
        // Background
        ctx.fillStyle = 'rgba(15, 27, 45, 0.92)';
        ctx.beginPath();
        ctx.roundRect(tx, ty - fontSize + 1, tw + 16, fontSize + 10, 4);
        ctx.fill();
        // Text
        ctx.fillStyle = rgba(WHITE, 0.95);
        ctx.textAlign = 'left';
        ctx.fillText(tip, tx + 8, ty + 4);
      }
    }

    requestAnimationFrame(render);
  }

  render();
})();
