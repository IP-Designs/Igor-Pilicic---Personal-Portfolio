// ============================================================================
// ENTITY SYSTEM - Engine.register('entities', ...)
// ============================================================================
// The first system built on the Engine Registry. Manages all game entities:
// NPCs, enemies, items, destructibles, ambient creatures - anything that
// isn't a tile or the player.
//
// DESIGN PRINCIPLES:
// - JSON-driven: entity types are defined in data, not code
// - Component-like: entities have optional capabilities (health, ai, loot)
// - Event-driven: spawns, damage, death all emit Engine events
// - Mod-friendly: Engine.override('entities', ...) replaces the whole system
//
// ENTITY LIFECYCLE:
//   spawn → init → update (per frame) → draw → destroy
//
// USAGE:
//   const id = Engine.get('entities').spawn('rat', 10, 15);
//   Engine.get('entities').damage(id, 25, 'player_attack');
//   Engine.on('entity.killed', (d) => console.log(d.type, 'died'));
//
// ============================================================================

(function () {
  'use strict';

  // ── Entity Type Definitions (JSON-driven) ─────────────────────────────
  // These are the DEFAULT types. Games/mods add more via registerType().
  // Eventually these will live in a JSON file like tile-definitions.json.

  const _typeRegistry = new Map();

  // Default entity type template - every type inherits from this
  const TYPE_DEFAULTS = {
    name: 'Unknown',
    category: 'misc',         // npc, enemy, item, ambient, destructible, ...
    icon: '?',                // Editor icon
    description: '',

    // Visual
    sprite: null,             // path to sprite image (null = use icon)
    color: [200, 200, 200],   // fallback color if no sprite
    width: 1,                 // size in meters
    height: 1,

    // Movement
    speed: 0,                 // meters per second (0 = stationary)
    canMove: false,

    // Health (null = indestructible)
    health: null,             // { max: 100, regen: 0, regenDelay: 3000 }

    // Physics
    blocksMovement: false,
    blocksLight: false,

    // Animation
    animController: null,     // animation controller ID (matches an entry in animation-definitions.json)

    // Behavior
    ai: null,                 // AI behavior key (future: 'patrol', 'chase', 'flee')
    interactable: false,      // can player interact with E key?
    interactAction: null,     // 'talk', 'loot', 'activate', or script name

    // Loot / drops (future)
    lootTable: null,

    // Custom properties (mod-extensible)
    properties: {}
  };

  // ── Entity Instance ───────────────────────────────────────────────────

  let _nextId = 1;

  /**
   * Create a new entity instance from a type definition.
   * @param {string} typeName
   * @param {number} x - Grid X (meters)
   * @param {number} y - Grid Y (meters)
   * @param {object} [overrides] - Per-instance property overrides
   * @returns {object} entity instance
   */
  function createEntity(typeName, x, y, overrides = {}) {
    const typeDef = _typeRegistry.get(typeName);
    if (!typeDef) {
      console.warn(`[Entities] Unknown type: "${typeName}"`);
      return null;
    }

    const entity = {
      // Identity
      id: _nextId++,
      type: typeName,
      typeDef: typeDef,

      // Position (meters)
      x: x,
      y: y,

      // Pixel position (updated each frame)
      px: (x + 0.5) * GRID_SIZE,
      py: (y + 0.5) * GRID_SIZE,

      // Velocity (meters per second)
      vx: 0,
      vy: 0,

      // State
      alive: true,
      active: true,           // inactive entities skip update/draw
      facing: 0,              // direction in radians
      facingDir: 'down',      // 'up','down','left','right'

      // Visual
      sprite: typeDef.sprite ? null : null,  // loaded image reference
      spriteLoaded: false,
      alpha: 1.0,
      flash: 0,               // damage flash timer

      // Health (cloned from type if present)
      health: typeDef.health ? {
        max: typeDef.health.max || 100,
        current: typeDef.health.max || 100,
        regen: typeDef.health.regen || 0,
        regenDelay: typeDef.health.regenDelay || 3000,
        lastDamageTime: 0,
        invincible: false,
        invincibilityDuration: typeDef.health.invincibilityDuration || 500
      } : null,

      // Animation instance (created if type has animController)
      _animInstance: null,

      // AI state (future)
      aiState: null,

      // Per-instance custom data
      data: { ...overrides },

      // Timestamps
      spawnTime: performance.now(),
      lastUpdateTime: 0
    };

    return entity;
  }

  // ── System State ──────────────────────────────────────────────────────

  const _entities = new Map();     // id → entity
  const _spatial = {};             // "x,y" → Set<id>  (spatial lookup)
  const MAX_ENTITIES = 1000;

  // Sprite cache
  const _spriteCache = new Map();  // path → p5.Image

  // ── Spatial Index Helpers ─────────────────────────────────────────────

  function spatialKey(x, y) {
    return `${Math.floor(x)},${Math.floor(y)}`;
  }

  function spatialAdd(entity) {
    const key = spatialKey(entity.x, entity.y);
    if (!_spatial[key]) _spatial[key] = new Set();
    _spatial[key].add(entity.id);
  }

  function spatialRemove(entity) {
    const key = spatialKey(entity.x, entity.y);
    if (_spatial[key]) {
      _spatial[key].delete(entity.id);
      if (_spatial[key].size === 0) delete _spatial[key];
    }
  }

  function spatialMove(entity, oldX, oldY) {
    const oldKey = spatialKey(oldX, oldY);
    if (_spatial[oldKey]) {
      _spatial[oldKey].delete(entity.id);
      if (_spatial[oldKey].size === 0) delete _spatial[oldKey];
    }
    spatialAdd(entity);
  }

  // ── Core Functions ────────────────────────────────────────────────────

  /**
   * Spawn a new entity into the world.
   * @param {string} typeName - Registered type name
   * @param {number} x - Grid X (meters)
   * @param {number} y - Grid Y (meters)
   * @param {object} [overrides] - Per-instance overrides
   * @returns {number|null} Entity ID, or null on failure
   */
  function spawn(typeName, x, y, overrides = {}) {
    if (_entities.size >= MAX_ENTITIES) {
      console.warn(`[Entities] Max entities (${MAX_ENTITIES}) reached.`);
      return null;
    }

    const entity = createEntity(typeName, x, y, overrides);
    if (!entity) return null;

    _entities.set(entity.id, entity);
    spatialAdd(entity);

    // Load sprite if needed
    if (entity.typeDef.sprite && !_spriteCache.has(entity.typeDef.sprite)) {
      loadSprite(entity.typeDef.sprite);
    }

    // Create animation instance if type has an animController
    if (entity.typeDef.animController && Engine.has('animations')) {
      entity._animInstance = Engine.get('animations').createInstance(entity.typeDef.animController);
    }

    Engine.emit('entity.spawned', {
      id: entity.id,
      type: typeName,
      x: x,
      y: y,
      entity: entity
    });

    return entity.id;
  }

  /**
   * Remove an entity from the world.
   * @param {number} id
   * @returns {boolean}
   */
  function despawn(id) {
    const entity = _entities.get(id);
    if (!entity) return false;

    spatialRemove(entity);
    _entities.delete(id);

    Engine.emit('entity.despawned', {
      id: id,
      type: entity.type,
      x: entity.x,
      y: entity.y
    });

    return true;
  }

  /**
   * Apply damage to an entity.
   * @param {number} id
   * @param {number} amount
   * @param {string} [source]
   * @returns {boolean}
   */
  function damage(id, amount, source = 'unknown') {
    const entity = _entities.get(id);
    if (!entity || !entity.alive || !entity.health) return false;
    if (entity.health.invincible) return false;

    const actual = Math.max(0, Math.min(amount, entity.health.current));
    entity.health.current -= actual;
    entity.health.lastDamageTime = performance.now();
    entity.flash = 6; // frames of damage flash

    // Brief invincibility
    entity.health.invincible = true;
    setTimeout(() => {
      if (entity.health) entity.health.invincible = false;
    }, entity.health.invincibilityDuration);

    Engine.emit('entity.damaged', {
      id: id,
      type: entity.type,
      amount: actual,
      source: source,
      healthRemaining: entity.health.current,
      x: entity.x,
      y: entity.y
    });

    if (entity.health.current <= 0) {
      kill(id, source);
    }

    return true;
  }

  /**
   * Heal an entity.
   * @param {number} id
   * @param {number} amount
   * @returns {boolean}
   */
  function heal(id, amount) {
    const entity = _entities.get(id);
    if (!entity || !entity.alive || !entity.health) return false;

    const old = entity.health.current;
    entity.health.current = Math.min(entity.health.max, entity.health.current + amount);
    const actual = entity.health.current - old;

    if (actual > 0) {
      Engine.emit('entity.healed', {
        id: id,
        type: entity.type,
        amount: actual,
        health: entity.health.current,
        x: entity.x,
        y: entity.y
      });
    }

    return true;
  }

  /**
   * Kill an entity.
   * @param {number} id
   * @param {string} [source]
   */
  function kill(id, source = 'unknown') {
    const entity = _entities.get(id);
    if (!entity || !entity.alive) return false;

    entity.alive = false;
    if (entity.health) entity.health.current = 0;

    Engine.emit('entity.killed', {
      id: id,
      type: entity.type,
      source: source,
      x: entity.x,
      y: entity.y,
      entity: entity
    });

    return true;
  }

  // ── Query Functions ───────────────────────────────────────────────────

  /**
   * Get entity by ID.
   * @param {number} id
   * @returns {object|undefined}
   */
  function getById(id) {
    return _entities.get(id);
  }

  /**
   * Get all entities at a grid position.
   * @param {number} x
   * @param {number} y
   * @returns {object[]}
   */
  function getAt(x, y) {
    const key = spatialKey(x, y);
    const ids = _spatial[key];
    if (!ids || ids.size === 0) return [];
    return Array.from(ids).map(id => _entities.get(id)).filter(Boolean);
  }

  /**
   * Get all entities within a radius (meters).
   * @param {number} cx - Center X
   * @param {number} cy - Center Y
   * @param {number} radius - Meters
   * @returns {object[]}
   */
  function getInRadius(cx, cy, radius) {
    const results = [];
    const r2 = radius * radius;
    for (const entity of _entities.values()) {
      const dx = entity.x - cx;
      const dy = entity.y - cy;
      if (dx * dx + dy * dy <= r2) {
        results.push(entity);
      }
    }
    return results;
  }

  /**
   * Get all entities of a specific type.
   * @param {string} typeName
   * @returns {object[]}
   */
  function getByType(typeName) {
    const results = [];
    for (const entity of _entities.values()) {
      if (entity.type === typeName) results.push(entity);
    }
    return results;
  }

  /**
   * Get all entities in a category.
   * @param {string} category
   * @returns {object[]}
   */
  function getByCategory(category) {
    const results = [];
    for (const entity of _entities.values()) {
      if (entity.typeDef.category === category) results.push(entity);
    }
    return results;
  }

  /**
   * Get entity count.
   * @returns {number}
   */
  function count() {
    return _entities.size;
  }

  /**
   * Get all entities as an array.
   * @returns {object[]}
   */
  function getAll() {
    return Array.from(_entities.values());
  }

  /**
   * Check if any entity blocks movement at this position.
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  function blocksMovementAt(x, y) {
    const entities = getAt(x, y);
    return entities.some(e => e.alive && e.typeDef.blocksMovement);
  }

  // ── Type Registry ─────────────────────────────────────────────────────

  /**
   * Register a new entity type definition.
   * @param {string} name - Unique type name (e.g. 'rat', 'chest', 'torch')
   * @param {object} def - Type definition (merged with TYPE_DEFAULTS)
   */
  function registerType(name, def) {
    const merged = { ...TYPE_DEFAULTS, ...def, properties: { ...TYPE_DEFAULTS.properties, ...(def.properties || {}) } };
    _typeRegistry.set(name, merged);
    Engine.emit('entity.typeRegistered', { name, definition: merged });
  }

  /**
   * Get a type definition.
   * @param {string} name
   * @returns {object|undefined}
   */
  function getType(name) {
    return _typeRegistry.get(name);
  }

  /**
   * List all registered type names.
   * @returns {string[]}
   */
  function listTypes() {
    return Array.from(_typeRegistry.keys());
  }

  // ── Sprite Loading ────────────────────────────────────────────────────

  function loadSprite(path) {
    if (_spriteCache.has(path)) return _spriteCache.get(path);
    try {
      const img = loadImage(path,
        () => { console.log(`[Entities] Loaded sprite: ${path}`); },
        () => { console.warn(`[Entities] Failed to load sprite: ${path}`); }
      );
      _spriteCache.set(path, img);
      return img;
    } catch (e) {
      console.warn(`[Entities] Error loading sprite "${path}":`, e);
      return null;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────

  function update(dt) {
    const now = performance.now();

    for (const entity of _entities.values()) {
      if (!entity.active) continue;

      // Damage flash countdown
      if (entity.flash > 0) entity.flash--;

      // Skip dead entities (they stay for death animations, then get cleaned)
      if (!entity.alive) continue;

      // Health regeneration
      if (entity.health && entity.health.regen > 0) {
        if (entity.health.current < entity.health.max) {
          const timeSinceDamage = now - entity.health.lastDamageTime;
          if (timeSinceDamage > entity.health.regenDelay) {
            entity.health.current = Math.min(
              entity.health.max,
              entity.health.current + entity.health.regen * dt
            );
          }
        }
      }

      // Movement (if entity can move - future AI will set vx/vy)
      if (entity.typeDef.canMove && (entity.vx !== 0 || entity.vy !== 0)) {
        const oldX = entity.x;
        const oldY = entity.y;
        entity.x += entity.vx * dt;
        entity.y += entity.vy * dt;

        // Update pixel position
        entity.px = (entity.x + 0.5) * GRID_SIZE;
        entity.py = (entity.y + 0.5) * GRID_SIZE;

        // Update spatial index
        if (Math.floor(oldX) !== Math.floor(entity.x) ||
            Math.floor(oldY) !== Math.floor(entity.y)) {
          spatialMove(entity, oldX, oldY);
        }
      }

      // Animation: advance frame
      if (entity._animInstance) {
        // Sync direction from entity facing
        const anims = Engine.has('animations') ? Engine.get('animations') : null;
        if (anims && (entity.vx !== 0 || entity.vy !== 0)) {
          entity._animInstance.setDirection(anims.velocityToDirection(entity.vx, entity.vy));
          if (entity._animInstance.state !== 'walk' && entity._animInstance._getCurrentClip()) {
            // Switch to walk if available
            const ctrl = anims.getController(entity._animInstance.controllerId);
            if (ctrl && ctrl.states['walk']) {
              entity._animInstance.setState('walk');
            }
          }
        } else if (entity._animInstance.state === 'walk') {
          // Back to idle when stopped
          const ctrl = Engine.has('animations') ? Engine.get('animations').getController(entity._animInstance.controllerId) : null;
          if (ctrl && ctrl.states['idle']) {
            entity._animInstance.setState('idle');
          }
        }
        entity._animInstance.update(dt);
      }

      entity.lastUpdateTime = now;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  function render() {
    // Only render entities visible in viewport
    const vp = typeof getVisibleViewport === 'function' ? getVisibleViewport() : null;

    for (const entity of _entities.values()) {
      if (!entity.active) continue;

      // Viewport culling
      if (vp) {
        if (entity.x < vp.startX - 1 || entity.x > vp.endX + 1 ||
            entity.y < vp.startY - 1 || entity.y > vp.endY + 1) {
          continue;
        }
      }

      const px = entity.px;
      const py = entity.py;
      const w = entity.typeDef.width * GRID_SIZE;
      const h = entity.typeDef.height * GRID_SIZE;

      push();

      // Damage flash
      if (entity.flash > 0 && entity.flash % 2 === 0) {
        tint(255, 100, 100);
      }

      // Death fade
      if (!entity.alive) {
        const fadeAlpha = Math.max(0, entity.alpha - 0.02);
        entity.alpha = fadeAlpha;
        if (fadeAlpha <= 0) {
          pop();
          // Clean up fully faded dead entities
          despawn(entity.id);
          continue;
        }
      }

      // Draw sprite or fallback
      // Priority: animation frame > static sprite > fallback
      let drawnFromAnim = false;
      if (entity._animInstance) {
        const animFrame = entity._animInstance.getCurrentFrame();
        if (animFrame && animFrame.width > 0) {
          if (!entity.alive) tint(255, entity.alpha * 255);
          image(animFrame, px - w / 2, py - h / 2, w, h);
          drawnFromAnim = true;
        }
      }

      const spritePath = entity.typeDef.sprite;
      const cachedSprite = spritePath ? _spriteCache.get(spritePath) : null;

      if (!drawnFromAnim && cachedSprite && cachedSprite.width > 0) {
        // Static sprite rendering
        if (!entity.alive) tint(255, entity.alpha * 255);
        image(cachedSprite, px - w / 2, py - h / 2, w, h);
      } else if (!drawnFromAnim) {
        // Fallback: colored rectangle + icon
        const c = entity.typeDef.color;
        const a = entity.alive ? 200 : entity.alpha * 200;
        fill(c[0], c[1], c[2], a);
        noStroke();
        rectMode(CENTER);
        rect(px, py, w * 0.8, h * 0.8, 4);

        // Icon
        fill(255, 255, 255, a);
        textAlign(CENTER, CENTER);
        textSize(Math.min(w, h) * 0.5);
        text(entity.typeDef.icon, px, py);
      }

      noTint();

      // Health bar (only in game mode, only if damaged)
      if (entity.health && entity.alive && !editMode) {
        if (entity.health.current < entity.health.max) {
          drawHealthBar(entity, px, py, w);
        }
      }

      // Editor indicator
      if (editMode) {
        drawEditorIndicator(entity, px, py, w, h);
      }

      pop();
    }
  }

  function drawHealthBar(entity, px, py, w) {
    const barW = w * 0.8;
    const barH = 4;
    const barY = py - entity.typeDef.height * GRID_SIZE / 2 - 8;
    const pct = entity.health.current / entity.health.max;

    // Background
    fill(40, 40, 40, 180);
    noStroke();
    rect(px - barW / 2, barY, barW, barH);

    // Health fill
    if (pct > 0.5) fill(0, 220, 0, 200);
    else if (pct > 0.25) fill(255, 165, 0, 200);
    else fill(220, 0, 0, 200);
    rect(px - barW / 2, barY, barW * pct, barH);

    // Border
    noFill();
    stroke(180, 180, 180, 150);
    strokeWeight(0.5);
    rect(px - barW / 2, barY, barW, barH);
  }

  function drawEditorIndicator(entity, px, py, w, h) {
    // Dashed outline
    stroke(0, 200, 255, 150);
    strokeWeight(1);
    noFill();
    rect(px - w / 2, py - h / 2, w, h);

    // Type label
    fill(0, 200, 255, 200);
    noStroke();
    textAlign(CENTER, TOP);
    textSize(9);
    text(entity.type, px, py + h / 2 + 2);
  }

  // ── Save / Load ───────────────────────────────────────────────────────

  function getForSave() {
    const data = [];
    for (const entity of _entities.values()) {
      const entry = {
        type: entity.type,
        x: entity.x,
        y: entity.y,
        alive: entity.alive,
        health: entity.health ? {
          current: entity.health.current,
          max: entity.health.max
        } : null,
        data: entity.data
      };

      // Save animation state if present
      if (entity._animInstance) {
        entry.anim = entity._animInstance.getForSave();
      }

      data.push(entry);
    }
    return data;
  }

  function loadFromSave(data) {
    clearAll();
    if (!Array.isArray(data)) return;
    for (const entry of data) {
      if (!_typeRegistry.has(entry.type)) {
        console.warn(`[Entities] Skipping unknown type "${entry.type}" during load.`);
        continue;
      }
      const id = spawn(entry.type, entry.x, entry.y, entry.data || {});
      if (id && entry.health) {
        const entity = _entities.get(id);
        if (entity && entity.health) {
          entity.health.current = entry.health.current;
          entity.health.max = entry.health.max;
        }
      }
      if (id && entry.alive === false) {
        const entity = _entities.get(id);
        if (entity) entity.alive = false;
      }
      // Restore animation state if saved
      if (id && entry.anim && Engine.has('animations')) {
        const entity = _entities.get(id);
        if (entity) {
          entity._animInstance = Engine.get('animations').restoreInstance(entry.anim);
        }
      }
    }
    console.log(`[Entities] Loaded ${_entities.size} entities from save.`);
  }

  // ── Clear ─────────────────────────────────────────────────────────────

  function clearAll() {
    _entities.clear();
    for (const key in _spatial) delete _spatial[key];
    _nextId = 1;
    Engine.emit('entities.cleared');
  }

  // ── Bridge: Keep Legacy Globals Working ───────────────────────────────
  // These window functions keep existing code (tiles.js, interactive_tiles.js,
  // save_load.js) working without modification. They forward to the new system.

  window.addEntity = function (type, gridX, gridY, properties) {
    return spawn(type, gridX, gridY, properties);
  };

  window.removeEntity = function (gridX, gridY) {
    const entities = getAt(gridX, gridY);
    let removed = false;
    for (const entity of entities) {
      despawn(entity.id);
      removed = true;
    }
    return removed;
  };

  window.getEntityAt = function (gridX, gridY) {
    const entities = getAt(gridX, gridY);
    return entities.length > 0 ? entities[0] : null;
  };

  window.removeAllEntities = function () {
    clearAll();
  };

  window.updateEntities = function () {
    // dt in seconds - approximate from frame rate
    const dt = typeof deltaTime !== 'undefined' ? deltaTime / 1000 : 1 / 60;
    update(dt);
    // NOTE: Particle/weather updates are called directly by engine.js - never chain them here.
  };

  window.drawEntities = function () {
    // NOTE: Particle/weather draws are called directly by engine.js - never chain them here.
    render();
  };

  window.getEntityData = function () {
    return getForSave();
  };

  window.loadEntityData = function (data) {
    // Handle both old format (object keyed by "x,y") and new format (array)
    if (data && !Array.isArray(data)) {
      // Old format: { "10,15": { type, gridX, gridY, properties } }
      const arr = [];
      for (const key in data) {
        const d = data[key];
        arr.push({
          type: d.type,
          x: d.gridX !== undefined ? d.gridX : d.x,
          y: d.gridY !== undefined ? d.gridY : d.y,
          data: d.properties || {},
          alive: true
        });
      }
      loadFromSave(arr);
    } else {
      loadFromSave(data);
    }
  };

  window.initEntitySystem = function () {
    clearAll();
  };

  // ── Register Default Entity Types ─────────────────────────────────────
  // Migrate the old SPARKLE type so existing maps still work.

  registerType('SPARKLE', {
    name: 'Sparkle Effect',
    category: 'effects',
    icon: '✨',
    color: [255, 255, 200],
    width: 1,
    height: 1,
    speed: 0,
    canMove: false,
    health: null,
    blocksMovement: false,
    description: 'Ambient sparkle particle effect'
  });

  // ── Register With Engine ──────────────────────────────────────────────

  const entitySystem = {
    // Lifecycle
    init: function () {
      clearAll();
      console.log('[Entities] System initialized.');
    },
    update: update,
    render: render,
    dispose: function () {
      clearAll();
      _typeRegistry.clear();
      _spriteCache.clear();
    },

    // Public API
    spawn,
    despawn,
    damage,
    heal,
    kill,

    // Queries
    getById,
    getAt,
    getInRadius,
    getByType,
    getByCategory,
    getAll,
    count,
    blocksMovementAt,

    // Type management
    registerType,
    getType,
    listTypes,

    // Save/Load
    getForSave,
    loadFromSave,
    clearAll
  };

  Engine.register('entities', entitySystem);

  console.log('[Entities] Entity System loaded - registered with Engine.');

})();
