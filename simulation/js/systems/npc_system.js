// ============================================
// NPC SYSTEM
// AI behavior layer on top of the entity system
// Handles: wander, chase, flee, patrol, attack, dialog interaction
// ============================================

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────

  const NPC_INTERACT_RANGE = 1.8;   // meters - how close player must be to talk
  const FLEE_HP_RATIO = 0.25;       // flee when HP below 25%
  const MAX_CHASE_DIST = 15;        // give up chasing beyond this (meters)
  const WANDER_STEP_TIME = 0.4;     // seconds between wander direction picks
  const ATTACK_FLASH_FRAMES = 8;    // visual feedback when NPC attacks

  // AI states
  const AI = {
    IDLE:    'idle',
    WANDER:  'wander',
    CHASE:   'chase',
    ATTACK:  'attack',
    FLEE:    'flee',
    RETURN:  'return',   // returning to spawn after losing target
    DEAD:    'dead'
  };

  // ── NPC runtime state (keyed by entity id) ────────

  const _npcState = new Map();   // entityId → { aiState, spawnX, spawnY, ... }

  // ── Helpers ────────────────────────────────────────

  function dist2D(ax, ay, bx, by) {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /** Check if a grid cell is passable for an NPC */
  function isCellPassable(x, y) {
    const intX = Math.floor(x);
    const intY = Math.floor(y);

    // World bounds
    if (intX < 0 || intY < 0 ||
        intX >= (typeof WORLD_WIDTH !== 'undefined' ? WORLD_WIDTH : 100) ||
        intY >= (typeof WORLD_HEIGHT !== 'undefined' ? WORLD_HEIGHT : 100)) {
      return false;
    }

    // Tile collision
    if (typeof tileBlocksMovement === 'function') {
      const key = `${intX},${intY}`;
      const placed = typeof tileSystem !== 'undefined' ? tileSystem.placedTiles[key] : null;
      if (placed) {
        const tiles = Array.isArray(placed) ? placed : [placed];
        for (const t of tiles) {
          if (tileBlocksMovement(t)) return false;
        }
      }
    }

    // Interactive tile (closed door etc.)
    if (typeof isBlockedByInteractiveTile === 'function') {
      if (isBlockedByInteractiveTile(intX, intY)) return false;
    }

    return true;
  }

  /** Steer entity toward (tx, ty) at its type speed. Returns true if moving. */
  function steerToward(entity, tx, ty, dt) {
    const dx = tx - entity.x;
    const dy = ty - entity.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.05) { entity.vx = 0; entity.vy = 0; return false; }

    const speed = (entity.typeDef.speed || 1) * 0.06; // match player scale (m/frame)
    const nx = dx / d;
    const ny = dy / d;

    // Check if the next cell in that direction is passable
    const nextX = entity.x + nx * speed * 2;
    const nextY = entity.y + ny * speed * 2;
    if (!isCellPassable(nextX, nextY)) {
      entity.vx = 0;
      entity.vy = 0;
      return false;
    }

    entity.vx = nx * speed;
    entity.vy = ny * speed;
    return true;
  }

  /** Clamp entity position inside world bounds (call after entity system physics) */
  function clampEntityToWorld(entity) {
    const maxX = (typeof WORLD_WIDTH  !== 'undefined' ? WORLD_WIDTH  : 100) - 0.5;
    const maxY = (typeof WORLD_HEIGHT !== 'undefined' ? WORLD_HEIGHT : 100) - 0.5;
    entity.x = clamp(entity.x, 0.5, maxX);
    entity.y = clamp(entity.y, 0.5, maxY);
  }

  function stopEntity(entity) {
    entity.vx = 0;
    entity.vy = 0;
  }

  // ── State initialisation for an NPC ────────────────

  function initNPCState(entity) {
    if (_npcState.has(entity.id)) return _npcState.get(entity.id);

    const props = entity.typeDef.properties || {};
    const s = {
      aiState: AI.IDLE,
      spawnX: entity.x,
      spawnY: entity.y,
      faction: props.faction || 'neutral',
      detectionRange: props.detectionRange || 0,
      attackDamage: props.attackDamage || 0,
      attackRange: props.attackRange || 1.0,
      attackCooldown: props.attackCooldown || 1.0,
      attackTimer: 0,
      wanderRadius: props.wanderRadius || 4,
      wanderPause: props.wanderPause || [2, 5],
      wanderTarget: null,
      wanderTimer: 0,
      dialog: (entity.data && entity.data.dialog) || props.dialog || null,
      patrolPath: (entity.data && entity.data.patrol) || [],
      patrolIndex: 0,
      lastDamageSource: null,
      // Return behavior
      returnTimer: 0
    };

    _npcState.set(entity.id, s);
    return s;
  }

  // ── AI update per entity ──────────────────────────

  function updateNPC(entity, state, dt) {
    if (!entity.alive) {
      state.aiState = AI.DEAD;
      stopEntity(entity);
      return;
    }

    const px = typeof player !== 'undefined' ? player.x : -999;
    const py = typeof player !== 'undefined' ? player.y : -999;
    const distToPlayer = dist2D(entity.x, entity.y, px, py);
    const distToSpawn = dist2D(entity.x, entity.y, state.spawnX, state.spawnY);

    // Tick attack cooldown
    if (state.attackTimer > 0) state.attackTimer -= dt;

    // Flee check - any faction flees at low HP (except hostile with no flee)
    const hpRatio = entity.health ? (entity.health.current / entity.health.max) : 1;
    if (hpRatio <= FLEE_HP_RATIO && state.faction !== 'hostile') {
      state.aiState = AI.FLEE;
    }

    switch (state.aiState) {

      // ── IDLE: stand still, scan for threats ────────
      case AI.IDLE:
        stopEntity(entity);
        // Hostile NPCs that detect player → chase
        if (state.faction === 'hostile' && state.detectionRange > 0 && distToPlayer <= state.detectionRange) {
          state.aiState = AI.CHASE;
          break;
        }
        // Wander-capable NPCs occasionally start wandering
        if (entity.typeDef.ai === 'wander' || entity.typeDef.ai === 'patrol') {
          state.wanderTimer -= dt;
          if (state.wanderTimer <= 0) {
            state.aiState = AI.WANDER;
            state.wanderTarget = pickWanderTarget(state);
            state.wanderTimer = randomRange(state.wanderPause[0], state.wanderPause[1]);
          }
        }
        break;

      // ── WANDER: move to a random nearby point, then idle ──
      case AI.WANDER:
        // Check for threats while wandering
        if (state.faction === 'hostile' && state.detectionRange > 0 && distToPlayer <= state.detectionRange) {
          state.aiState = AI.CHASE;
          break;
        }

        if (!state.wanderTarget) {
          state.aiState = AI.IDLE;
          state.wanderTimer = randomRange(state.wanderPause[0], state.wanderPause[1]);
          break;
        }

        const atTarget = dist2D(entity.x, entity.y, state.wanderTarget.x, state.wanderTarget.y) < 0.3;
        if (atTarget) {
          stopEntity(entity);
          state.wanderTarget = null;
          state.aiState = AI.IDLE;
          state.wanderTimer = randomRange(state.wanderPause[0], state.wanderPause[1]);
        } else {
          if (!steerToward(entity, state.wanderTarget.x, state.wanderTarget.y, dt)) {
            // Stuck - pick new target next time
            state.wanderTarget = null;
            state.aiState = AI.IDLE;
            state.wanderTimer = 0.5;
          }
        }
        break;

      // ── CHASE: pursue the player ──────────────────
      case AI.CHASE:
        if (distToPlayer > MAX_CHASE_DIST || distToPlayer > state.detectionRange * 2) {
          state.aiState = AI.RETURN;
          break;
        }
        if (distToPlayer <= state.attackRange) {
          state.aiState = AI.ATTACK;
          break;
        }
        steerToward(entity, px, py, dt);
        break;

      // ── ATTACK: hit the player, then re-evaluate ──
      case AI.ATTACK:
        stopEntity(entity);
        if (distToPlayer > state.attackRange * 1.5) {
          state.aiState = AI.CHASE;
          break;
        }
        if (state.attackTimer <= 0 && state.attackDamage > 0) {
          performNPCAttack(entity, state);
          state.attackTimer = state.attackCooldown;
        }
        break;

      // ── FLEE: run away from last damage source or player ──
      case AI.FLEE:
        // Run away from player
        const fleeX = entity.x + (entity.x - px);
        const fleeY = entity.y + (entity.y - py);
        if (!steerToward(entity, fleeX, fleeY, dt)) {
          // Stuck fleeing - just stop
          stopEntity(entity);
        }
        // Recover if healed above threshold
        if (hpRatio > FLEE_HP_RATIO * 2) {
          state.aiState = AI.RETURN;
        }
        break;

      // ── RETURN: go back to spawn point ────────────
      case AI.RETURN:
        if (distToSpawn < 1.0) {
          state.aiState = AI.IDLE;
          state.wanderTimer = randomRange(state.wanderPause[0], state.wanderPause[1]);
          stopEntity(entity);
          break;
        }
        // Re-detect player while returning
        if (state.faction === 'hostile' && state.detectionRange > 0 && distToPlayer <= state.detectionRange) {
          state.aiState = AI.CHASE;
          break;
        }
        steerToward(entity, state.spawnX, state.spawnY, dt);
        break;

      case AI.DEAD:
        stopEntity(entity);
        break;
    }
  }

  // ── NPC attack ────────────────────────────────────

  function performNPCAttack(entity, state) {
    if (typeof player === 'undefined') return;

    const dmg = state.attackDamage;
    if (dmg <= 0) return;

    // Apply damage to player
    if (typeof player.health !== 'undefined') {
      player.health -= dmg;
      if (player.health < 0) player.health = 0;

      // Flash feedback
      entity.flash = ATTACK_FLASH_FRAMES;

      // Audio feedback
      if (typeof playSound === 'function') {
        playSound('hit');
      }

      // Emit event
      if (typeof Engine !== 'undefined') {
        Engine.emit('npc.attackedPlayer', {
          entityId: entity.id,
          type: entity.type,
          damage: dmg,
          playerHealth: player.health
        });
      }

      console.log(`[NPC] ${entity.typeDef.name} hit player for ${dmg} dmg (HP: ${player.health})`);
    }
  }

  // ── Wander target picking ─────────────────────────

  function pickWanderTarget(state) {
    const r = state.wanderRadius;
    const maxX = (typeof WORLD_WIDTH  !== 'undefined' ? WORLD_WIDTH  : 100) - 1;
    const maxY = (typeof WORLD_HEIGHT !== 'undefined' ? WORLD_HEIGHT : 100) - 1;
    for (let attempt = 0; attempt < 8; attempt++) {
      const tx = clamp(state.spawnX + (Math.random() * 2 - 1) * r, 0.5, maxX - 0.5);
      const ty = clamp(state.spawnY + (Math.random() * 2 - 1) * r, 0.5, maxY - 0.5);
      if (isCellPassable(tx, ty)) {
        return { x: tx, y: ty };
      }
    }
    return null; // no passable spot found
  }

  function randomRange(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  // ── NPC interaction (E key) ───────────────────────

  /** Try to interact with the nearest NPC. Returns true if consumed. */
  function tryInteractNPC() {
    if (typeof player === 'undefined') return false;
    const entitySys = typeof Engine !== 'undefined' ? Engine.get('entities') : null;
    if (!entitySys) return false;

    // Find nearest interactable NPC in range
    const nearby = entitySys.getInRadius(player.x, player.y, NPC_INTERACT_RANGE);
    let best = null;
    let bestDist = Infinity;

    for (const ent of nearby) {
      if (!ent.alive || !ent.typeDef.interactable) continue;
      const d = dist2D(player.x, player.y, ent.x, ent.y);
      if (d < bestDist) {
        bestDist = d;
        best = ent;
      }
    }

    if (!best) return false;

    const state = _npcState.get(best.id);
    const dialog = (state && state.dialog) || (best.data && best.data.dialog) || null;

    if (dialog && dialog.length > 0) {
      // Face toward player
      best.facing = Math.atan2(player.y - best.y, player.x - best.x);

      if (typeof showDialogChain === 'function') {
        showDialogChain(dialog);
      } else if (typeof showDialog === 'function') {
        showDialog(dialog[0]);
      }

      if (typeof Engine !== 'undefined') {
        Engine.emit('npc.interacted', { entityId: best.id, type: best.type });
      }
      return true;
    }

    return false;
  }

  // ── Proximity prompt (show "Press E to talk") ─────

  function getNearbyInteractableNPC() {
    if (typeof player === 'undefined') return null;
    const entitySys = typeof Engine !== 'undefined' ? Engine.get('entities') : null;
    if (!entitySys) return null;

    const nearby = entitySys.getInRadius(player.x, player.y, NPC_INTERACT_RANGE);
    let best = null;
    let bestDist = Infinity;

    for (const ent of nearby) {
      if (!ent.alive || !ent.typeDef.interactable) continue;
      const d = dist2D(player.x, player.y, ent.x, ent.y);
      if (d < bestDist) {
        bestDist = d;
        best = ent;
      }
    }
    return best;
  }

  /** Draw the "Press E to talk" prompt above the nearest NPC */
  function drawNPCPrompts() {
    if (typeof editMode !== 'undefined' && editMode) return;
    const npc = getNearbyInteractableNPC();
    if (!npc) return;

    const px = npc.x * (typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32);
    const py = npc.y * (typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32);
    const gs = typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32;

    push();
    textAlign(CENTER, BOTTOM);
    textSize(11);
    fill(255, 255, 255, 200);
    stroke(0, 0, 0, 150);
    strokeWeight(2);
    text(`Press E to ${npc.typeDef.interactAction || 'interact'}`, px, py - gs * 0.6);
    pop();
  }

  // ── Draw AI debug info in editor mode ─────────────

  function drawNPCDebug() {
    if (typeof editMode === 'undefined' || !editMode) return;
    if (typeof editorUI !== 'undefined' && !editorUI.showSpawns) return;

    const gs = typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32;

    push();
    for (const [id, state] of _npcState) {
      const entitySys = typeof Engine !== 'undefined' ? Engine.get('entities') : null;
      if (!entitySys) continue;
      const ent = entitySys.getById(id);
      if (!ent) continue;

      const px = ent.x * gs;
      const py = ent.y * gs;

      // Detection range circle
      if (state.detectionRange > 0) {
        noFill();
        stroke(255, 100, 100, 60);
        strokeWeight(1);
        ellipse(px, py, state.detectionRange * gs * 2);
      }

      // AI state label
      fill(255, 255, 100, 200);
      noStroke();
      textAlign(CENTER, TOP);
      textSize(9);
      text(state.aiState.toUpperCase(), px, py + gs * 0.5);

      // Spawn tether line
      if (state.aiState === AI.RETURN || state.aiState === AI.WANDER) {
        stroke(100, 255, 100, 40);
        strokeWeight(1);
        line(px, py, state.spawnX * gs, state.spawnY * gs);
      }
    }
    pop();
  }

  // ── Play-mode snapshot / restore ──────────────────

  let _entitySnapshot = null;   // saved entity positions when entering play mode
  let _playerSnapshot = null;   // saved player position when entering play mode

  /** Save entity + player positions before play mode starts */
  function snapshotForPlayMode() {
    const entitySys = typeof Engine !== 'undefined' ? Engine.get('entities') : null;
    if (entitySys) {
      _entitySnapshot = entitySys.getForSave();
    }
    if (typeof player !== 'undefined') {
      _playerSnapshot = {
        x: player.x, y: player.y,
        health: player.health,
        maxHealth: player.maxHealth
      };
    }
    console.log('[NPC] Snapshot saved for play mode');
  }

  /** Restore entity + player positions when returning to editor */
  function restoreFromPlayMode() {
    // Stop all entity movement first
    const entitySys = typeof Engine !== 'undefined' ? Engine.get('entities') : null;
    if (entitySys && _entitySnapshot) {
      entitySys.loadFromSave(_entitySnapshot);
      _entitySnapshot = null;
    }
    // Clear NPC AI state so it re-initialises cleanly
    clearNPCState();
    // Restore player
    if (typeof player !== 'undefined' && _playerSnapshot) {
      player.x = _playerSnapshot.x;
      player.y = _playerSnapshot.y;
      player.health = _playerSnapshot.health;
      player.maxHealth = _playerSnapshot.maxHealth;
      player.vx = 0;
      player.vy = 0;
      _playerSnapshot = null;
    }
    console.log('[NPC] Restored editor state from snapshot');
  }

  // ── Main update - called each frame ───────────────

  function updateNPCs(dt) {
    // dt comes in as seconds
    const entitySys = typeof Engine !== 'undefined' ? Engine.get('entities') : null;
    if (!entitySys) return;

    const all = entitySys.getAll();
    for (const entity of all) {
      // Only update entities that have NPC-style AI
      if (!entity.typeDef.ai) continue;

      const state = initNPCState(entity);
      updateNPC(entity, state, dt);
      // Keep NPC inside world bounds after movement
      clampEntityToWorld(entity);
    }
  }

  // ── Load NPC definitions from JSON ────────────────

  async function loadNPCDefinitions() {
    try {
      const res = await fetch('/js/data/npc-definitions.json');
      if (!res.ok) {
        console.warn('[NPC] Could not load npc-definitions.json:', res.status);
        return;
      }
      const data = await res.json();
      const entitySys = typeof Engine !== 'undefined' ? Engine.get('entities') : null;
      if (!entitySys) {
        console.warn('[NPC] Entity system not available - cannot register NPC types');
        return;
      }

      let count = 0;
      for (const [key, def] of Object.entries(data.types || {})) {
        entitySys.registerType(key, def);
        count++;
      }
      console.log(`[NPC] ✓ Registered ${count} NPC/enemy types from npc-definitions.json`);
    } catch (e) {
      console.warn('[NPC] Error loading NPC definitions:', e.message);
    }
  }

  // ── Cleanup on map change ─────────────────────────

  function clearNPCState() {
    _npcState.clear();
  }

  // Listen for map clear events
  if (typeof Engine !== 'undefined') {
    Engine.on('entities.cleared', clearNPCState);
  }

  // ── Public API + Engine registration ──────────────

  const npcSystem = {
    update: updateNPCs,
    drawPrompts: drawNPCPrompts,
    drawDebug: drawNPCDebug,
    tryInteract: tryInteractNPC,
    getNearby: getNearbyInteractableNPC,
    loadDefinitions: loadNPCDefinitions,
    clearState: clearNPCState,
    snapshotForPlayMode: snapshotForPlayMode,
    restoreFromPlayMode: restoreFromPlayMode,
    getState: (entityId) => _npcState.get(entityId),
    getAllStates: () => _npcState
  };

  // Window globals
  window.npcSystem = npcSystem;
  window.updateNPCs = updateNPCs;
  window.drawNPCPrompts = drawNPCPrompts;
  window.drawNPCDebug = drawNPCDebug;
  window.tryInteractNPC = tryInteractNPC;
  window.loadNPCDefinitions = loadNPCDefinitions;
  window.snapshotForPlayMode = snapshotForPlayMode;
  window.restoreFromPlayMode = restoreFromPlayMode;

  // Engine registry
  if (typeof Engine !== 'undefined' && Engine.register) {
    Engine.register('npcSystem', npcSystem);
  }

  console.log('[NPC] NPC system loaded');
})();
