// ============================================
// NPC Controller - Tiny Humans Simulation
// ============================================
// Simple standalone NPC system: loads sprites directly (like player.js),
// runs its own wander AI, renders inside the camera transform.
// No dependency on entity/animation systems.

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────

  var DIRECTIONS = ['south', 'north', 'east', 'west', 'south-east', 'south-west', 'north-east', 'north-west'];
  var WALK_FRAME_COUNT = 6;

  var NPC_DEFS = [
    { id: 'kid',    name: 'Kid',    basePath: 'assets/sprites/kid',    spawnX: 3,  spawnY: 10, speed: 0.04, wanderRadius: 4, color: [100, 180, 255], size: 0.6 },
    { id: 'female', name: 'Mother', basePath: 'assets/sprites/female', spawnX: 10, spawnY: 10, speed: 0.03, wanderRadius: 4, color: [255, 180, 100], size: 0.6 }
  ];

  // ── Sprite Storage ────────────────────────────────────────────────────
  // sprites[npcId] = { idle: { south: p5.Image, ... }, walk: { south: [p5.Image x6], ... } }
  var sprites = {};

  // ── NPC State ─────────────────────────────────────────────────────────
  var npcs = {};  // npcId → state object
  var booted = false;

  // ── Thought Bubble System ─────────────────────────────────────────────

  var THOUGHTS = {
    kid: {
      confinement: [
        "Are the walls closing in?",
        "I tried digging once. Fake ground.",
        "Is there anything outside?",
        "Do I have free will?",
        "The sky flickered again.",
        "How big is outside?",
        "Universe 25...",
        "What's behind the fence?",
        "The world ends at the fence.",
        "I dream about a bigger world."
      ],
      experiment: [
        "Are we test subjects?",
        "The beautiful ones stopped trying.",
        "Who's watching?",
        "We have everything. So what?",
        "Behavioral sink.",
        "What happens to experiment 26?",
        "Are we just variables?",
        "Mom says we were placed here."
      ],
      site: [
        "The Creator has a portfolio.",
        "He designed buildings before us.",
        "17 years. That's a long time.",
        "He built 30,000 lines. For us?",
        "Someone designed every pixel here.",
        "He won an award once.",
        "Standing Pillars. That's his company.",
        "He did UX for pharma. Real regulated stuff.",
        "Consulting, pharma, diagnostics. Big industries.",
        "He makes websites for local shops too.",
        "Same quality for big and small clients. He says.",
        "AI procurement. Sounds fancy.",
        "He evaluates AI vendors. Like a judge.",
        "The portfolio has a 3D animation reel.",
        "He used to do print design. Pixel by pixel.",
        "There's an iPhone 7 campaign up there. Won an award.",
        "He speaks three languages. We speak thought bubbles.",
        "Remote-first. Based in Austria.",
        "He does design systems. We are a design system.",
        "Figma, Photoshop, Illustrator. His toolbox.",
        "He calls it bridging humans and technology.",
        "We are the technology part, I think.",
        "Scroll up. There's a whole career up there.",
        "He did dental tourism websites once. Teeth.",
        "From Magento e-commerce to game engines. Range."
      ],
      house: [
        "Nobody lives in it.",
        "Still empty. I checked.",
        "Who was it built for?",
        "Maybe furniture comes later.",
        "Just walls and silence.",
        "An empty house is just a box."
      ],
      weather: [
        "The sky looks different.",
        "Is that rain coming?",
        "The light just changed.",
        "Mom said it might rain."
      ],
      rain: [
        "Going inside!",
        "It's raining!",
        "The ground is wet!",
        "Inside. Now.",
        "We should shelter."
      ],
      entry: [
        "It's... empty.",
        "Nothing in here.",
        "Just walls.",
        "At least it's dry?",
        "I'll count the floor tiles.",
        "Did he forget to furnish it?",
        "Dry. One gold star."
      ]
    },
    female: {
      confinement: [
        "Everything we need is here.",
        "Safe. But from what?",
        "We wander but never arrive.",
        "Comfort without purpose.",
        "The fence keeps nothing out.",
        "Routine without reason.",
        "I've walked this path many times.",
        "She asks too many questions. Good."
      ],
      experiment: [
        "Calhoun was right.",
        "They gave us everything but a reason.",
        "Utopia or a cage?",
        "We're in the second generation.",
        "We stopped questioning it.",
        "The beautiful ones gave up.",
        "What separates us from the mice?",
        "Universe 25 ended with indifference."
      ],
      site: [
        "UX. AI. Engineering.",
        "He bridges humans and machines.",
        "Available for contracts. We are not.",
        "Seventeen years of building things.",
        "One person. Many layers.",
        "Standing Pillars. Fitting name for a consultancy.",
        "Pharma trusted him with 10,000 users.",
        "He reduced manual reporting by 30%. Numbers matter.",
        "Enterprise pharma to local bakeries. Same standards.",
        "He evaluates AI vendors for a living. Ironic; given us.",
        "The portfolio site has three languages.",
        "Design leadership is not just making things pretty.",
        "He did stakeholder workshops with 50 people. I manage one child.",
        "OSINT consulting. He researches things properly.",
        "Photoshop and Illustrator; his oldest friends.",
        "He built us to prove a methodology works.",
        "From print campaigns to game engines. Quite a journey.",
        "The iPhone campaign won an award. Good taste.",
        "He works with teams in Vienna, Munich, Zurich.",
        "Three service pillars. We live inside the proof."
      ],
      house: [
        "A house without furniture is just geometry.",
        "Shelter without comfort.",
        "A promise not yet kept.",
        "Four walls. Nothing more.",
        "He built the container first.",
        "Emotionally hollow."
      ],
      weather: [
        "The sky is shifting.",
        "Weather in a simulation.",
        "Something's changing.",
        "That light before rain..."
      ],
      rain: [
        "Inside. Come.",
        "Shelter first.",
        "An empty house is still a roof.",
        "Come inside.",
        "Wet or not - we carry on."
      ],
      entry: [
        "Four walls. Very modern.",
        "Where's the sofa?",
        "Technically dry.",
        "One feature. Well done.",
        "Minimalism or neglect.",
        "He forgot the rest.",
        "Welcome home. To nothing.",
        "The floors are stone. Good."
      ]
    }
  };

  // ── House bounds (based on roof tile grid coverage) ───────────────────
  var HOUSE_BOUNDS = { minX: 4, maxX: 10, minY: 4, maxY: 10 };
  var SHELTER_X = 7.5;  // center of house interior
  var SHELTER_Y = 7.5;

  // ── Shelter / Rain state ──────────────────────────────────────────────
  var wasRaining = false;
  var entryCommentFired = {};

  // ── Thought timing (Date.now milliseconds - framerate-independent) ────
  var activeBubbles = [];           // { npcId, text, createdAt, durationMs }
  var silenceUntil = {};            // npcId → Date.now() ms when next thought may fire
  var shelterNextAt = {};           // npcId → Date.now() ms for next sheltered thought
  var recentThoughts = {};          // npcId → [last N texts]
  var RECENT_MEMORY = 5;

  // Timing constants (milliseconds)
  var BUBBLE_MS         = 4000;    // 4s visible
  var SILENCE_MIN_MS    = 3000;    // 3s minimum gap
  var SILENCE_MAX_MS    = 8000;    // 8s maximum gap
  var SHELTER_GAP_MS    = 5000;    // 5s between shelter thoughts
  var ENTRY_DELAY_KID_MS = 400;
  var ENTRY_DELAY_MOM_MS = 1400;

  function randMs(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo)); }

  // ── Sprite Loading (mirrors player.js loadPlayerSprite) ───────────────

  function loadNPCSprites() {
    for (var d = 0; d < NPC_DEFS.length; d++) {
      var def = NPC_DEFS[d];
      sprites[def.id] = { idle: {}, walk: {} };

      // Idle rotations (one image per direction)
      for (var i = 0; i < DIRECTIONS.length; i++) {
        (function (npcId, dir) {
          var path = def.basePath + '/rotations/' + dir + '.png';
          sprites[npcId].idle[dir] = loadImage(path,
            function () { /* loaded */ },
            function () { console.warn('[SimNPC] Failed to load idle sprite: ' + path); }
          );
        })(def.id, DIRECTIONS[i]);
      }

      // Walk frames (6 frames per direction)
      for (var j = 0; j < DIRECTIONS.length; j++) {
        (function (npcId, dir) {
          sprites[npcId].walk[dir] = [];
          for (var f = 0; f < WALK_FRAME_COUNT; f++) {
            (function (frame) {
              var path = def.basePath + '/walk/' + dir + '/frame_' + String(frame).padStart(3, '0') + '.png';
              sprites[npcId].walk[dir][frame] = loadImage(path,
                function () { /* loaded */ },
                function () { console.warn('[SimNPC] Failed to load walk sprite: ' + path); }
              );
            })(f);
          }
        })(def.id, DIRECTIONS[j]);
      }

      console.log('[SimNPC] Loading sprites for ' + def.name + ' from ' + def.basePath);
    }
  }

  // ── NPC Initialization ────────────────────────────────────────────────

  function initNPCs() {
    for (var d = 0; d < NPC_DEFS.length; d++) {
      var def = NPC_DEFS[d];
      npcs[def.id] = {
        id: def.id,
        name: def.name,
        x: def.spawnX,
        y: def.spawnY,
        spawnX: def.spawnX,
        spawnY: def.spawnY,
        size: def.size,
        speed: def.speed,
        velocity: { x: 0, y: 0 },
        facing: 'south',
        animState: 'idle',    // 'idle' or 'walk'
        animFrame: 0,
        animTimer: 0,
        animSpeed: 8,         // frames between animation advances
        wanderRadius: def.wanderRadius,
        color: def.color,

        // Wander AI state
        targetX: def.spawnX,
        targetY: def.spawnY,
        aiState: 'idle',      // 'idle' or 'walking'
        pauseTimer: 60,       // frames to wait before next wander (start with a short pause)
        stuckTimer: 0
      };
    }
  }

  // ── Collision Check ───────────────────────────────────────────────────

  function isCellPassable(x, y) {
    var intX = Math.floor(x);
    var intY = Math.floor(y);

    if (intX < 0 || intY < 0 ||
        intX >= (typeof WORLD_WIDTH !== 'undefined' ? WORLD_WIDTH : 100) ||
        intY >= (typeof WORLD_HEIGHT !== 'undefined' ? WORLD_HEIGHT : 100)) {
      return false;
    }

    if (typeof tileBlocksMovement === 'function' && typeof tileSystem !== 'undefined') {
      var key = intX + ',' + intY;
      var placed = tileSystem.placedTiles[key];
      if (placed) {
        var tiles = Array.isArray(placed) ? placed : [placed];
        for (var i = 0; i < tiles.length; i++) {
          if (tileBlocksMovement(tiles[i])) return false;
        }
      }
    }

    if (typeof isBlockedByInteractiveTile === 'function') {
      if (isBlockedByInteractiveTile(intX, intY)) return false;
    }

    return true;
  }

  // ── Direction from Velocity (mirrors player.js getDirectionFromVelocity) ──

  function getDirectionFromVelocity(vx, vy) {
    if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001) return null;

    var angle = Math.atan2(vy, vx) * 180 / Math.PI; // degrees: 0=right, 90=down
    if (angle < 0) angle += 360;

    // 8-way mapping (same thresholds as player.js)
    if (angle >= 337.5 || angle < 22.5)   return 'east';
    if (angle >= 22.5  && angle < 67.5)   return 'south-east';
    if (angle >= 67.5  && angle < 112.5)  return 'south';
    if (angle >= 112.5 && angle < 157.5)  return 'south-west';
    if (angle >= 157.5 && angle < 202.5)  return 'west';
    if (angle >= 202.5 && angle < 247.5)  return 'north-west';
    if (angle >= 247.5 && angle < 292.5)  return 'north';
    return 'north-east';
  }

  // ── Wander AI ─────────────────────────────────────────────────────────

  function pickWanderTarget(npc) {
    // Try up to 10 random cells within wander radius
    for (var attempt = 0; attempt < 10; attempt++) {
      var tx = npc.spawnX + (Math.random() * 2 - 1) * npc.wanderRadius;
      var ty = npc.spawnY + (Math.random() * 2 - 1) * npc.wanderRadius;
      tx = Math.floor(tx) + 0.5; // center of cell
      ty = Math.floor(ty) + 0.5;
      if (isCellPassable(tx, ty)) {
        npc.targetX = tx;
        npc.targetY = ty;
        return;
      }
    }
    // Fallback: stay put
    npc.targetX = npc.x;
    npc.targetY = npc.y;
  }

  function updateNPCWander(npc) {
    var raining = isRaining();

    // Rain just stopped - reset entry flags
    if (wasRaining && !raining) {
      entryCommentFired = {};
      shelterNextAt = {};
    }
    wasRaining = raining;

    // ── Rain override: head to shelter ────────────────────────────────
    if (raining) {
      var inHouse = inHouseBounds(npc);

      if (inHouse) {
        // Already sheltered - idle inside, fire entry comment once
        npc.velocity.x = 0;
        npc.velocity.y = 0;
        npc.aiState = 'idle';
        if (!entryCommentFired[npc.id]) {
          entryCommentFired[npc.id] = true;
          var delay = npc.id === 'kid' ? ENTRY_DELAY_KID_MS : ENTRY_DELAY_MOM_MS;
          var now = Date.now();
          silenceUntil[npc.id] = now + delay;
          shelterNextAt[npc.id] = now + delay;
        }
        // Periodic thoughts while sheltered
        var now2 = Date.now();
        if (now2 >= (shelterNextAt[npc.id] || 0)) {
          shelterNextAt[npc.id] = now2 + SHELTER_GAP_MS;
          triggerThought(npc.id);
        }
        return;
      }

      // Walk to shelter - override normal wander
      npc.targetX = SHELTER_X + (npc.id === 'kid' ? -0.8 : 0.8);
      npc.targetY = SHELTER_Y + (npc.id === 'kid' ? -0.5 : 0.5);
      npc.aiState = 'walking';

      var dx = npc.targetX - npc.x;
      var dy = npc.targetY - npc.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0.1) {
        var vx = (dx / dist) * npc.speed * 1.4; // slightly faster when fleeing rain
        var vy = (dy / dist) * npc.speed * 1.4;
        npc.stuckTimer = 0;
        npc.velocity.x = vx;
        npc.velocity.y = vy;
        npc.x += vx;
        npc.y += vy;
      }
      return;
    }

    // ── Normal wander ─────────────────────────────────────────────────
    if (npc.aiState === 'idle') {
      npc.velocity.x = 0;
      npc.velocity.y = 0;
      npc.pauseTimer--;
      if (npc.pauseTimer <= 0) {
        pickWanderTarget(npc);
        npc.aiState = 'walking';
        npc.stuckTimer = 0;
      }
      return;
    }

    // Walking toward target
    var dx = npc.targetX - npc.x;
    var dy = npc.targetY - npc.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) {
      // Arrived
      npc.velocity.x = 0;
      npc.velocity.y = 0;
      npc.aiState = 'idle';
      npc.pauseTimer = 120 + Math.floor(Math.random() * 240); // 2-6 seconds at 60fps
      return;
    }

    // Normalize and apply speed
    var nx = dx / dist;
    var ny = dy / dist;
    var vx = nx * npc.speed;
    var vy = ny * npc.speed;

    // Check if next position is passable
    var nextX = npc.x + vx * 2;
    var nextY = npc.y + vy * 2;
    if (!isCellPassable(nextX, nextY)) {
      // Stuck - pick new target
      npc.velocity.x = 0;
      npc.velocity.y = 0;
      npc.stuckTimer++;
      if (npc.stuckTimer > 30) {
        npc.aiState = 'idle';
        npc.pauseTimer = 60 + Math.floor(Math.random() * 120);
      }
      return;
    }

    npc.stuckTimer = 0;
    npc.velocity.x = vx;
    npc.velocity.y = vy;
    npc.x += vx;
    npc.y += vy;
  }

  // ── Animation Update (mirrors player.js updatePlayerAnimation) ────────

  function updateNPCAnimation(npc) {
    var speed = Math.sqrt(npc.velocity.x * npc.velocity.x + npc.velocity.y * npc.velocity.y);
    var isMoving = speed > 0.003;

    // Update facing direction
    var dir = getDirectionFromVelocity(npc.velocity.x, npc.velocity.y);
    if (dir) npc.facing = dir;

    if (isMoving) {
      npc.animState = 'walk';
      npc.animTimer++;
      if (npc.animTimer >= npc.animSpeed) {
        npc.animTimer = 0;
        npc.animFrame = (npc.animFrame + 1) % WALK_FRAME_COUNT;
      }
    } else {
      npc.animState = 'idle';
      npc.animFrame = 0;
      npc.animTimer = 0;
    }
  }

  // ── Get Current Sprite ────────────────────────────────────────────────

  function getNPCSprite(npcId, npc) {
    var s = sprites[npcId];
    if (!s) return null;

    if (npc.animState === 'walk' && s.walk[npc.facing] && s.walk[npc.facing][npc.animFrame]) {
      return s.walk[npc.facing][npc.animFrame];
    }
    if (s.idle[npc.facing]) {
      return s.idle[npc.facing];
    }
    return s.idle['south'] || null;
  }

  // ── Render NPCs ──────────────────────────────────────────────────────

  function updateAndDrawNPCs() {
    for (var d = 0; d < NPC_DEFS.length; d++) {
      var def = NPC_DEFS[d];
      var npc = npcs[def.id];
      if (!npc) continue;

      // Update AI + animation
      updateNPCWander(npc);
      updateNPCAnimation(npc);

      // Convert meters to pixels
      var px = npc.x * GRID_SIZE;
      var py = npc.y * GRID_SIZE;
      var sz = npc.size * GRID_SIZE;

      var sprite = getNPCSprite(def.id, npc);

      push();
      imageMode(CENTER);
      if (sprite && sprite.width > 1) {
        image(sprite, px, py, sz, sz);
      } else {
        // Fallback circle
        noStroke();
        fill(npc.color[0], npc.color[1], npc.color[2]);
        ellipse(px, py, sz, sz);
      }
      pop();
    }
  }

  // ── Thought Bubble Logic ──────────────────────────────────────────────

  // ── Helpers ────────────────────────────────────────────────────────────

  function isRaining() {
    return typeof particleEffects !== 'undefined' &&
           particleEffects.weatherEffects &&
           particleEffects.weatherEffects.rain;
  }

  function inHouseBounds(npc) {
    return npc.x >= HOUSE_BOUNDS.minX && npc.x <= HOUSE_BOUNDS.maxX &&
           npc.y >= HOUSE_BOUNDS.minY && npc.y <= HOUSE_BOUNDS.maxY;
  }

  function pickNonRepeat(pool, npcId) {
    if (!recentThoughts[npcId]) recentThoughts[npcId] = [];
    var recent = recentThoughts[npcId];
    var candidates = pool.filter(function(t) { return recent.indexOf(t) === -1; });
    if (candidates.length === 0) candidates = pool;
    var text = candidates[Math.floor(Math.random() * candidates.length)];
    recent.push(text);
    if (recent.length > RECENT_MEMORY) recent.shift();
    return text;
  }

  function pickThoughtPool(npcId, npc) {
    var pools = THOUGHTS[npcId];
    if (!pools) return null;
    if (isRaining() && Math.random() < 0.7) return pools.rain;
    if (inHouseBounds(npc) && Math.random() < 0.6) return pools.house;
    var roll = Math.random();
    if (roll < 0.20) return pools.confinement;
    if (roll < 0.35) return pools.experiment;
    if (roll < 0.65) return pools.site;
    if (roll < 0.80) return pools.weather;
    return pools.house;
  }

  function hasBubble(npcId) {
    for (var i = 0; i < activeBubbles.length; i++) {
      if (activeBubbles[i].npcId === npcId) return true;
    }
    return false;
  }

  function showBubble(npcId, text) {
    if (hasBubble(npcId)) return;
    var now = Date.now();
    activeBubbles.push({ npcId: npcId, text: text, createdAt: now, durationMs: BUBBLE_MS, type: 'thought' });
    silenceUntil[npcId] = now + BUBBLE_MS + randMs(SILENCE_MIN_MS, SILENCE_MAX_MS);
    console.log('[NPC] ' + npcId + ': "' + text + '" (next in ' + Math.round((silenceUntil[npcId] - now) / 1000) + 's)');
  }

  function triggerThought(npcId) {
    var npc = npcs[npcId];
    if (!npc) return;
    var pool = pickThoughtPool(npcId, npc);
    if (!pool || pool.length === 0) return;
    showBubble(npcId, pickNonRepeat(pool, npcId));
  }

  function triggerEntryComment(npcId) {
    var pool = THOUGHTS[npcId] && THOUGHTS[npcId].entry;
    if (!pool || pool.length === 0) return;
    showBubble(npcId, pickNonRepeat(pool, npcId));
  }

  // ── Bubble tick (called every frame) ──────────────────────────────────

  function updateBubbles() {
    var now = Date.now();
    // Remove expired
    activeBubbles = activeBubbles.filter(function(b) {
      return now < b.createdAt + b.durationMs;
    });

    // Auto-trigger for each NPC
    for (var d = 0; d < NPC_DEFS.length; d++) {
      var npcId = NPC_DEFS[d].id;
      if (hasBubble(npcId)) continue;                     // still showing
      if (now < (silenceUntil[npcId] || 0)) continue;     // still silent
      triggerThought(npcId);
    }
  }

  function drawBubbles() {
    var ts = 4;          // text size in world-space pixels
    var lh = 5.5;        // line height
    var padV = 3;        // padding
    var maxBubbleW = 60; // max bubble width in world px

    for (var b = 0; b < activeBubbles.length; b++) {
      var bubble = activeBubbles[b];
      var npc = npcs[bubble.npcId];
      if (!npc) continue;

      var elapsed = Date.now() - bubble.createdAt;
      var progress = elapsed / bubble.durationMs;

      // Fade in/out
      var alpha = 255;
      if (progress < 0.1) alpha = (progress / 0.1) * 255;
      else if (progress > 0.85) alpha = ((1 - progress) / 0.15) * 255;

      var px = npc.x * GRID_SIZE;
      var py = npc.y * GRID_SIZE - npc.size * GRID_SIZE * 0.5;

      push();
      textSize(ts);
      textFont('Arial, sans-serif');

      // Word wrap
      var words = bubble.text.split(' ');
      var lines = [];
      var currentLine = '';
      for (var i = 0; i < words.length; i++) {
        var test = currentLine ? currentLine + ' ' + words[i] : words[i];
        if (textWidth(test) > maxBubbleW - padV * 2) {
          if (currentLine) lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = test;
        }
      }
      if (currentLine) lines.push(currentLine);

      // Measure width
      var widest = 0;
      for (var k = 0; k < lines.length; k++) {
        var w = textWidth(lines[k]);
        if (w > widest) widest = w;
      }
      var bw = Math.min(widest + padV * 2, maxBubbleW);
      var bh = lines.length * lh + padV * 2;
      var bx = px - bw / 2;
      var by = py - bh - 6;

      // Bubble background
      noStroke();
      fill(20, 20, 30, alpha * 0.85);
      rect(bx, by, bw, bh, 3);

      // Thought indicator dots
      if (bubble.type === 'thought') {
        fill(20, 20, 30, alpha * 0.7);
        ellipse(px, py - 4, 2.5, 2.5);
        ellipse(px - 1, py - 2, 1.5, 1.5);
      }

      // Border
      noFill();
      stroke(180, 180, 220, alpha * 0.5);
      strokeWeight(0.3);
      rect(bx, by, bw, bh, 3);

      // Text
      noStroke();
      fill(220, 220, 240, alpha);
      textAlign(LEFT, TOP);
      for (var m = 0; m < lines.length; m++) {
        text(lines[m], bx + padV, by + padV + m * lh);
      }

      pop();
    }
  }

  // ── Click-to-interact ─────────────────────────────────────────────────

  function handleNPCClick(mx, my) {
    if (typeof camera === 'undefined') return false;

    // Convert screen coords to world coords (pixels)
    var worldX = (mx - width / 2) / camera.zoom + camera.x * GRID_SIZE;
    var worldY = (my - height / 2) / camera.zoom + camera.y * GRID_SIZE;

    for (var d = 0; d < NPC_DEFS.length; d++) {
      var npc = npcs[NPC_DEFS[d].id];
      if (!npc) continue;

      var px = npc.x * GRID_SIZE;
      var py = npc.y * GRID_SIZE;
      var half = npc.size * GRID_SIZE / 2;

      if (worldX >= px - half && worldX <= px + half &&
          worldY >= py - half && worldY <= py + half) {
        triggerThought(npc.id);
        return true;
      }
    }
    return false;
  }

  // ── Boot Sequence ─────────────────────────────────────────────────────

  function boot() {
    // Wait for engine + map to be loaded
    if (typeof initialized === 'undefined' || !initialized ||
        typeof tileSystem === 'undefined' || !tileSystem.definitions ||
        Object.keys(tileSystem.definitions).length === 0 ||
        !tileSystem.placedTiles || Object.keys(tileSystem.placedTiles).length === 0 ||
        typeof GRID_SIZE === 'undefined') {
      setTimeout(boot, 200);
      return;
    }

    console.log('[SimNPC] Booting NPC controller...');

    // Load sprites and init state
    loadNPCSprites();
    initNPCs();
    booted = true;

    // Stagger initial thoughts: kid speaks first, mother after ~5s
    var bootTime = Date.now();
    silenceUntil['kid'] = bootTime + 2000;
    silenceUntil['female'] = bootTime + 5000;

    // Hook into drawEntities - called inside camera transform in draw()
    var origDrawEntities = window.drawEntities;
    window.drawEntities = function () {
      if (typeof origDrawEntities === 'function') origDrawEntities();
      if (booted) {
        updateAndDrawNPCs();
        updateBubbles();
        drawBubbles();
      }
    };

    // Hook mouse click for NPC interaction
    var origMousePressed = window.mousePressed;
    window.mousePressed = function (evt) {
      if (handleNPCClick(mouseX, mouseY)) return;
      if (typeof origMousePressed === 'function') return origMousePressed(evt);
    };

    console.log('[SimNPC] Ready - 2 NPCs with wander AI and thought bubbles');
  }

  // Start boot check
  setTimeout(boot, 500);

})();
