/* ============================================================
 *  scene_manager.js  –  Scene / Map transition manager
 *  ============================================================
 *  Manages map transitions with state caching and visual fades.
 *
 *  Public API (also available via Engine.get('scenes')):
 *    changeScene(mapName, opts)   – transition to another map
 *    getCurrentScene()            – name of the active map
 *    hasVisited(mapName)          – has a cached snapshot?
 *    clearCache(mapName?)         – drop one or all cached maps
 *    isTransitioning()            – true during a scene change
 *    snapshotCurrentMap()         – capture live state to object
 *
 *  Engine events emitted:
 *    scene.beforeLeave   { from, to }
 *    scene.afterArrive   { from, to, cached }
 *    scene.transitionStart { from, to, transition }
 *    scene.transitionEnd   { from, to }
 *  ============================================================ */

(function () {
  'use strict';

  // ── Map cache ──────────────────────────────────────────────
  const _cache = new Map();       // mapName → { mapData, timestamp }
  let   _currentScene = '';       // name of the loaded map
  let   _previousScene = '';      // last map we left

  // ── Transition state machine ───────────────────────────────
  //  States:  idle → fadeOut → loading → fadeIn → idle
  const TRANSITION = {
    IDLE:     'idle',
    FADE_OUT: 'fadeOut',
    LOADING:  'loading',
    FADE_IN:  'fadeIn'
  };

  let _state        = TRANSITION.IDLE;
  let _fadeAlpha     = 0;          // 0 = transparent, 1 = opaque
  let _fadeDuration  = 0.4;       // seconds per fade half
  let _fadeColor     = [0, 0, 0]; // RGB
  let _fadeTimer     = 0;
  let _pendingLoad   = null;      // { mapName, opts, resolve }
  let _inputFrozen   = false;

  // ── Configuration ──────────────────────────────────────────
  const DEFAULT_OPTS = {
    spawnX:      undefined,   // player x on arrival (meters)
    spawnY:      undefined,   // player y on arrival (meters)
    transition:  'fade',      // 'fade' | 'cut' | 'none'
    fadeDuration: 0.4,        // seconds (per half, total = 2×)
    fadeColor:   [0, 0, 0],   // RGB
    cacheSource: true,        // cache the map we're leaving?
    fromServer:  true         // load target from server (vs cache only)
  };

  // ── Snapshot: capture live world state ─────────────────────
  //  Mirrors saveMap()'s data-gathering WITHOUT server I/O.
  //  Returns a plain object identical in shape to a saved map.

  function snapshotCurrentMap () {
    const data = {
      name:        _currentScene,
      version:     '2.0',
      created:     new Date().toISOString(),
      worldWidth:  typeof WORLD_WIDTH  !== 'undefined' ? WORLD_WIDTH  : 60,
      worldHeight: typeof WORLD_HEIGHT !== 'undefined' ? WORLD_HEIGHT : 34,
      tiles:       {},
      interactiveTiles: [],
      triggers:    []
      // Tile definitions live at project level, not per-map snapshot
    };

    // Placed tiles
    if (typeof tileSystem !== 'undefined' && tileSystem.placedTiles) {
      for (const key in tileSystem.placedTiles) {
        data.tiles[key] = tileSystem.placedTiles[key];
      }
    }

    // Interactive tiles (doors, switches, scripts)
    if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
      data.interactiveTiles = interactiveTiles.map(function (t) {
        return {
          x: t.x, y: t.y, type: t.type,
          linkId:       t.linkId       || null,
          activationId: t.activationId || null,
          doorState:    (typeof isDoorType === 'function' && isDoorType(t.type) &&
                         typeof getDoorState === 'function') ? getDoorState(t.x, t.y) : null,
          scriptId:     t.scriptId     || null,
          scriptPrompt: t.scriptPrompt || null,
          isLogic:      t.isLogic      || false,
          logicType:    t.logicType    || null
        };
      });
    }

    // Lighting
    if (typeof lighting !== 'undefined' && lighting) {
      data.lighting = {
        enabled:           lighting.enabled          || false,
        ambientLight:      lighting.ambientLight     || 0.5,
        ambientColor:      lighting.ambientColor ? [...lighting.ambientColor] : [100, 100, 100],
        roofShadowDarkness: lighting.roofShadowDarkness || 0.7,
        lights: []
      };
      if (lighting.lights && Array.isArray(lighting.lights)) {
        data.lighting.lights = lighting.lights.map(function (l) {
          return {
            x: l.x, y: l.y,
            intensity:    l.intensity    || 1.0,
            radius:       l.radius       || 10,
            falloff:      l.falloff      || 0.5,
            brightness:   l.brightness   || 1.0,
            color:        Array.isArray(l.color) ? [...l.color] : [255, 255, 255],
            castsShadows: l.castsShadows || false,
            enabled:      l.enabled !== false
          };
        });
      }
    }

    // Triggers
    if (typeof exportTriggersToJSON === 'function') {
      data.triggers = exportTriggersToJSON();
    }

    // Event tiles
    if (typeof eventTiles !== 'undefined' && eventTiles.placedEvents) {
      data.eventTiles = [];
      for (const key in eventTiles.placedEvents) {
        const ev = eventTiles.placedEvents[key];
        data.eventTiles.push({
          x: ev.x, y: ev.y, type: ev.type,
          state:      ev.state      || 'default',
          enabled:    ev.enabled !== false,
          script:     ev.script     || null,
          triggers:   ev.triggers   || null,
          oneTime:    ev.oneTime    || false,
          cooldownMs: ev.cooldownMs || 0,
          metadata:   ev.metadata   || {}
        });
      }
    }

    // Logic tile states
    if (typeof logicTileStates !== 'undefined' && logicTileStates.size > 0) {
      data.logicStates = {};
      for (const [key, val] of logicTileStates) {
        data.logicStates[key] = val;
      }
    }

    // Signposts, particles, weather, decorations
    if (typeof getSignpostsForSave      === 'function') data.signposts        = getSignpostsForSave();
    if (typeof getParticleEmitterData   === 'function') data.particleEmitters = getParticleEmitterData();
    if (typeof getWeatherTileData       === 'function') data.weatherTiles     = getWeatherTileData();
    if (typeof getDecorationsForSave    === 'function') data.decorations      = getDecorationsForSave();

    // Entities (via Engine-registered entity system)
    if (Engine.has('entities')) {
      data.entities = Engine.get('entities').getForSave();
    }

    // Player spawn
    if (typeof player !== 'undefined') {
      data.playerSpawn = {
        x: player.spawnX || player.x,
        y: player.spawnY || player.y
      };
      // Also store player's actual position so we can restore it on return
      data._playerPos = { x: player.x, y: player.y };
    }

    return data;
  }

  // ── Cache helpers ──────────────────────────────────────────

  function cacheMap (mapName, mapData) {
    _cache.set(mapName, {
      mapData:   mapData,
      timestamp: Date.now()
    });
    console.log('[SceneManager] Cached map:', mapName);
  }

  function getCached (mapName) {
    const entry = _cache.get(mapName);
    return entry ? entry.mapData : null;
  }

  // ── Freeze / unfreeze player input ─────────────────────────

  function freezeInput () {
    _inputFrozen = true;
    if (typeof player !== 'undefined') {
      player.velocity     = { x: 0, y: 0 };
      player.acceleration = { x: 0, y: 0 };
    }
  }

  function unfreezeInput () {
    _inputFrozen = false;
  }

  // ── Core load routine ──────────────────────────────────────
  //  Fetches map data (cache → server → localStorage) then
  //  calls restoreWorldFromData + entity restore.

  async function loadScene (mapName, opts) {
    let mapData = null;
    const wasCached = _cache.has(mapName);

    // 1. Check cache first
    if (wasCached) {
      mapData = getCached(mapName);
      console.log('[SceneManager] Restoring cached map:', mapName);
    }

    // 2. If not cached, fetch from server / localStorage
    if (!mapData && opts.fromServer !== false) {
      if (typeof loadMapData === 'function') {
        mapData = await loadMapData(mapName);
      } else {
        // Manual fetch fallback - use project-scoped API if available
        try {
          const base = (typeof _levelApiBase === 'function') ? _levelApiBase() : '/api/levels';
          const resp = await fetch(base + '/' + encodeURIComponent(mapName));
          if (resp.ok) mapData = await resp.json();
        } catch (e) { /* fall through */ }
      }
    }

    if (!mapData) {
      console.error('[SceneManager] Map not found:', mapName);
      unfreezeInput();
      _state = TRANSITION.IDLE;
      return false;
    }

    // 3. Clear undo/redo stack (don't undo into the previous map)
    //    (restoreWorldFromData now also does this, but belt-and-suspenders)
    if (typeof undoStack !== 'undefined' && Array.isArray(undoStack)) undoStack.length = 0;
    if (typeof redoStack !== 'undefined' && Array.isArray(redoStack)) redoStack.length = 0;

    // 4. Restore world via canonical function
    //    (this now handles: entities, tileScripts, undo, ambients, _ambientTransition)
    if (typeof restoreWorldFromData === 'function') {
      restoreWorldFromData(mapData, mapName);
    }

    // 5. Restore entities from cached data (if not already handled by restoreWorldFromData)
    //    restoreWorldFromData now loads entities if mapData.entities exists, so this is
    //    only needed if entities were cached but not in the map JSON
    // (handled by restoreWorldFromData)

    // 6. Override player position if spawn point specified
    if (typeof player !== 'undefined') {
      if (opts.spawnX !== undefined && opts.spawnY !== undefined) {
        player.x = opts.spawnX;
        player.y = opts.spawnY;
      } else if (wasCached && mapData._playerPos) {
        // Returning to a cached map: put player where they left off
        player.x = mapData._playerPos.x;
        player.y = mapData._playerPos.y;
      }
      player.velocity     = { x: 0, y: 0 };
      player.acceleration = { x: 0, y: 0 };
    }

    // 9. Update tracking
    _previousScene = _currentScene;
    _currentScene  = mapName;
    if (typeof window.saveModal !== 'undefined') {
      window.saveModal.currentMapName = mapName;
    }

    return wasCached;
  }

  // ── changeScene - public entry point ───────────────────────
  //  Returns a Promise that resolves when the transition is done.

  function changeScene (mapName, opts) {
    if (!mapName) {
      console.warn('[SceneManager] changeScene called without a map name');
      return Promise.resolve(false);
    }
    if (_state !== TRANSITION.IDLE) {
      console.warn('[SceneManager] Transition already in progress');
      return Promise.resolve(false);
    }

    opts = Object.assign({}, DEFAULT_OPTS, opts || {});

    // Normalize map name
    mapName = mapName.trim();

    // Same map? Only reposition player
    if (mapName === _currentScene) {
      if (opts.spawnX !== undefined && opts.spawnY !== undefined && typeof player !== 'undefined') {
        player.x = opts.spawnX;
        player.y = opts.spawnY;
        player.velocity     = { x: 0, y: 0 };
        player.acceleration = { x: 0, y: 0 };
      }
      return Promise.resolve(true);
    }

    Engine.emit('scene.transitionStart', {
      from:       _currentScene,
      to:         mapName,
      transition: opts.transition
    });

    // ── CUT / NONE: instant swap ─────────────────────────────
    if (opts.transition === 'cut' || opts.transition === 'none') {
      return _executeInstantTransition(mapName, opts);
    }

    // ── FADE: animated transition ────────────────────────────
    return _executeFadeTransition(mapName, opts);
  }

  // ── Instant transition (no fade) ───────────────────────────

  async function _executeInstantTransition (mapName, opts) {
    freezeInput();

    // Snapshot & cache outgoing map
    if (opts.cacheSource && _currentScene) {
      Engine.emit('scene.beforeLeave', { from: _currentScene, to: mapName });
      const snapshot = snapshotCurrentMap();
      cacheMap(_currentScene, snapshot);
    }

    const cached = await loadScene(mapName, opts);

    Engine.emit('scene.afterArrive',   { from: _previousScene, to: mapName, cached: cached });
    Engine.emit('scene.transitionEnd', { from: _previousScene, to: mapName });

    unfreezeInput();
    return true;
  }

  // ── Fade transition ────────────────────────────────────────

  function _executeFadeTransition (mapName, opts) {
    return new Promise(function (resolve) {
      _fadeDuration = opts.fadeDuration || 0.4;
      _fadeColor    = opts.fadeColor    || [0, 0, 0];
      _fadeTimer    = 0;
      _fadeAlpha    = 0;

      freezeInput();

      // Start fade-out
      _state = TRANSITION.FADE_OUT;
      _pendingLoad = { mapName: mapName, opts: opts, resolve: resolve };
    });
  }

  // ── Update - called each frame from Engine lifecycle ───────
  //  Drives the fade timer and triggers load at the midpoint.

  function update (dt) {
    if (_state === TRANSITION.IDLE) return;

    _fadeTimer += dt;

    switch (_state) {

      // ── FADE OUT: screen going dark ──────────────────────
      case TRANSITION.FADE_OUT:
        _fadeAlpha = Math.min(1, _fadeTimer / _fadeDuration);
        if (_fadeAlpha >= 1) {
          _fadeAlpha = 1;
          _state     = TRANSITION.LOADING;
          _fadeTimer = 0;

          // Snapshot outgoing map while screen is black
          var pl = _pendingLoad;
          if (pl.opts.cacheSource && _currentScene) {
            Engine.emit('scene.beforeLeave', { from: _currentScene, to: pl.mapName });
            var snapshot = snapshotCurrentMap();
            cacheMap(_currentScene, snapshot);
          }

          // Load the new map (async)
          loadScene(pl.mapName, pl.opts).then(function (cached) {
            Engine.emit('scene.afterArrive', {
              from:   _previousScene,
              to:     pl.mapName,
              cached: cached
            });

            // Begin fade-in
            _state     = TRANSITION.FADE_IN;
            _fadeTimer = 0;
          }).catch(function (err) {
            console.error('[SceneManager] Load failed:', err);
            _state = TRANSITION.IDLE;
            _fadeAlpha = 0;
            unfreezeInput();
            if (pl.resolve) pl.resolve(false);
            _pendingLoad = null;
          });
        }
        break;

      // ── LOADING: screen is fully black, waiting for load ─
      case TRANSITION.LOADING:
        _fadeAlpha = 1; // stay opaque
        break;

      // ── FADE IN: screen clearing ─────────────────────────
      case TRANSITION.FADE_IN:
        _fadeAlpha = Math.max(0, 1 - (_fadeTimer / _fadeDuration));
        if (_fadeAlpha <= 0) {
          _fadeAlpha = 0;
          _state     = TRANSITION.IDLE;
          unfreezeInput();

          Engine.emit('scene.transitionEnd', {
            from: _previousScene,
            to:   _currentScene
          });

          if (_pendingLoad && _pendingLoad.resolve) {
            _pendingLoad.resolve(true);
          }
          _pendingLoad = null;
        }
        break;
    }
  }

  // ── Render - draw the fade overlay on top of everything ────
  //  Should be called LAST in the draw pipeline.

  function render () {
    if (_fadeAlpha <= 0) return;

    push();
    resetMatrix();
    noStroke();
    fill(_fadeColor[0], _fadeColor[1], _fadeColor[2], _fadeAlpha * 255);
    rect(0, 0, width, height);
    pop();
  }

  // ── Input query - other systems check this ─────────────────

  function isInputFrozen () {
    return _inputFrozen;
  }

  function isTransitioning () {
    return _state !== TRANSITION.IDLE;
  }

  // ── Public API ─────────────────────────────────────────────

  const sceneManager = {
    // Lifecycle (called by Engine)
    update: update,
    render: render,

    // Main API
    changeScene:        changeScene,
    snapshotCurrentMap: snapshotCurrentMap,
    getCurrentScene:    function () { return _currentScene; },
    getPreviousScene:   function () { return _previousScene; },
    setCurrentScene:    function (name) { _currentScene = name; },  // for initial load

    // Cache management
    hasVisited:  function (mapName) { return _cache.has(mapName); },
    getCached:   getCached,
    clearCache:  function (mapName) {
      if (mapName) {
        _cache.delete(mapName);
      } else {
        _cache.clear();
      }
    },
    getCacheSize: function () { return _cache.size; },
    getCacheKeys: function () { return Array.from(_cache.keys()); },

    // State queries
    isTransitioning: isTransitioning,
    isInputFrozen:   isInputFrozen,

    // Constants
    TRANSITION: TRANSITION
  };

  // Register with Engine
  Engine.register('scenes', sceneManager);

  // Global export for script tags
  window.sceneManager = sceneManager;
  window.changeScene  = changeScene;

  console.log('[SceneManager] ✓ Scene manager initialized');

})();
