/**
 * animation_system.js - Engine-registered animation system
 * =========================================================
 * Manages animation clips, controllers (state machines), and per-entity
 * playback instances. Clips are sequences of individual PNG frames.
 *
 * Concepts:
 *   Clip       - A named sequence of frame image paths + timing info
 *   Controller - A state machine mapping (state, direction) → clip
 *   Instance   - Per-entity playback state (current frame, timer, etc.)
 *
 * Engine Events:
 *   animation.clipRegistered   { id, clip }
 *   animation.clipRemoved      { id }
 *   animation.controllerRegistered  { id, controller }
 *   animation.controllerRemoved     { id }
 *   animation.definitionsLoaded {}
 *   animation.definitionsSaved  {}
 *
 * Usage:
 *   const anims = Engine.get('animations');
 *   anims.registerClip('rat_walk_down', {
 *     frames: ['assets/sprites/npc/rat/walk_down_0.png', ...],
 *     frameRate: 8,
 *     loop: true
 *   });
 *   anims.registerController('rat', {
 *     states: {
 *       idle: { down: 'rat_idle_down', up: 'rat_idle_up', ... },
 *       walk: { down: 'rat_walk_down', ... }
 *     },
 *     defaultState: 'idle',
 *     defaultDirection: 'down'
 *   });
 *   const inst = anims.createInstance('rat');
 *   inst.setState('walk');
 *   inst.setDirection('down');
 *   // in update loop:
 *   inst.update(dt);
 *   // in render:
 *   const frame = inst.getCurrentFrame(); // p5.Image or null
 */
(function () {
  'use strict';

  // ── Storage ───────────────────────────────────────────────────────────

  /** @type {Map<string, ClipDef>} */
  const _clips = new Map();

  /** @type {Map<string, ControllerDef>} */
  const _controllers = new Map();

  /** @type {Map<string, p5.Image>} frame path → loaded image */
  const _frameCache = new Map();

  /** @type {Set<string>} paths currently loading */
  const _loadingPaths = new Set();

  // ── Defaults ──────────────────────────────────────────────────────────

  /**
   * @typedef {object} ClipDef
   * @property {string[]} frames   - Array of image paths (individual PNGs)
   * @property {number}   frameRate - Frames per second (default 8)
   * @property {boolean}  loop      - Whether the clip loops (default true)
   * @property {string}   [next]    - Clip ID to play after this one ends (non-loop only)
   */
  const CLIP_DEFAULTS = {
    frames: [],
    frameRate: 8,
    loop: true,
    next: null
  };

  /**
   * @typedef {object} ControllerDef
   * @property {Object<string, Object<string, string>>} states
   *   Map of stateName → { direction → clipId }
   * @property {string} defaultState     - Initial state name
   * @property {string} defaultDirection - Initial direction
   */
  const CONTROLLER_DEFAULTS = {
    states: {},
    defaultState: 'idle',
    defaultDirection: 'down'
  };

  // ── Clip Management ───────────────────────────────────────────────────

  /**
   * Register an animation clip.
   * @param {string} id   - Unique clip identifier
   * @param {object} def  - Clip definition (merged with CLIP_DEFAULTS)
   */
  function registerClip(id, def) {
    const clip = { ...CLIP_DEFAULTS, ...def };
    if (!Array.isArray(clip.frames)) clip.frames = [];
    _clips.set(id, clip);
    Engine.emit('animation.clipRegistered', { id, clip });
  }

  /**
   * Get a clip definition.
   * @param {string} id
   * @returns {ClipDef|undefined}
   */
  function getClip(id) {
    return _clips.get(id);
  }

  /**
   * Remove a clip.
   * @param {string} id
   */
  function removeClip(id) {
    if (_clips.delete(id)) {
      Engine.emit('animation.clipRemoved', { id });
    }
  }

  /**
   * List all clip IDs.
   * @returns {string[]}
   */
  function listClips() {
    return Array.from(_clips.keys());
  }

  // ── Controller Management ─────────────────────────────────────────────

  /**
   * Register an animation controller (state machine).
   * @param {string} id   - Unique controller identifier (usually matches entity type)
   * @param {object} def  - Controller definition
   */
  function registerController(id, def) {
    const ctrl = { ...CONTROLLER_DEFAULTS, ...def };
    _controllers.set(id, ctrl);
    Engine.emit('animation.controllerRegistered', { id, controller: ctrl });
  }

  /**
   * Get a controller definition.
   * @param {string} id
   * @returns {ControllerDef|undefined}
   */
  function getController(id) {
    return _controllers.get(id);
  }

  /**
   * Remove a controller.
   * @param {string} id
   */
  function removeController(id) {
    if (_controllers.delete(id)) {
      Engine.emit('animation.controllerRemoved', { id });
    }
  }

  /**
   * List all controller IDs.
   * @returns {string[]}
   */
  function listControllers() {
    return Array.from(_controllers.keys());
  }

  // ── Frame Loading ─────────────────────────────────────────────────────

  /**
   * Load a single frame image (or return cached).
   * @param {string} framePath
   * @returns {p5.Image|null}
   */
  function loadFrame(framePath) {
    if (_frameCache.has(framePath)) return _frameCache.get(framePath);
    if (_loadingPaths.has(framePath)) return null; // already loading

    _loadingPaths.add(framePath);
    try {
      const img = loadImage(
        framePath,
        () => {
          _loadingPaths.delete(framePath);
        },
        () => {
          console.warn(`[Animations] Failed to load frame: ${framePath}`);
          _loadingPaths.delete(framePath);
          _frameCache.delete(framePath); // allow retry
        }
      );
      _frameCache.set(framePath, img);
      return img;
    } catch (e) {
      console.warn(`[Animations] Error loading frame "${framePath}":`, e);
      _loadingPaths.delete(framePath);
      return null;
    }
  }

  /**
   * Preload all frames for a clip.
   * @param {string} clipId
   */
  function preloadClip(clipId) {
    const clip = _clips.get(clipId);
    if (!clip) return;
    for (const framePath of clip.frames) {
      loadFrame(framePath);
    }
  }

  /**
   * Preload all clips referenced by a controller.
   * @param {string} controllerId
   */
  function preloadController(controllerId) {
    const ctrl = _controllers.get(controllerId);
    if (!ctrl) return;
    for (const stateMap of Object.values(ctrl.states)) {
      for (const clipId of Object.values(stateMap)) {
        preloadClip(clipId);
      }
    }
  }

  /**
   * Get a cached frame image.
   * @param {string} framePath
   * @returns {p5.Image|null}
   */
  function getCachedFrame(framePath) {
    const img = _frameCache.get(framePath);
    return (img && img.width > 0) ? img : null;
  }

  // ── Animation Instance ────────────────────────────────────────────────

  /**
   * Create an animation instance for an entity.
   * @param {string} controllerId - Controller to use
   * @returns {AnimationInstance|null}
   */
  function createInstance(controllerId) {
    const ctrl = _controllers.get(controllerId);
    if (!ctrl) {
      console.warn(`[Animations] Controller "${controllerId}" not found`);
      return null;
    }

    // Preload all frames for this controller
    preloadController(controllerId);

    const instance = {
      controllerId: controllerId,
      state: ctrl.defaultState,
      direction: ctrl.defaultDirection,
      frameIndex: 0,
      timer: 0,
      playing: true,
      finished: false,
      speed: 1.0, // playback speed multiplier

      // ── Instance Methods ──

      /**
       * Set animation state (e.g. 'idle', 'walk', 'attack').
       * Resets frame to 0 if state actually changed.
       */
      setState: function (stateName) {
        if (this.state === stateName) return;
        const c = _controllers.get(this.controllerId);
        if (!c || !c.states[stateName]) {
          console.warn(`[Animations] State "${stateName}" not in controller "${this.controllerId}"`);
          return;
        }
        this.state = stateName;
        this.frameIndex = 0;
        this.timer = 0;
        this.finished = false;
        this.playing = true;
      },

      /**
       * Set facing direction (e.g. 'down', 'up', 'left', 'right').
       * Does NOT reset frame index - smooth direction changes during walk.
       */
      setDirection: function (dir) {
        this.direction = dir;
      },

      /**
       * Advance the animation by dt seconds.
       */
      update: function (dt) {
        if (!this.playing || this.finished) return;

        const clip = this._getCurrentClip();
        if (!clip || clip.frames.length <= 1) return;

        this.timer += dt * this.speed;
        const frameDuration = 1.0 / clip.frameRate;

        while (this.timer >= frameDuration) {
          this.timer -= frameDuration;
          this.frameIndex++;

          if (this.frameIndex >= clip.frames.length) {
            if (clip.loop) {
              this.frameIndex = 0;
            } else {
              this.frameIndex = clip.frames.length - 1;
              this.finished = true;
              this.playing = false;

              // Auto-transition to next clip
              if (clip.next) {
                // Find what state the 'next' clip belongs to
                const c = _controllers.get(this.controllerId);
                if (c) {
                  for (const [sName, sMap] of Object.entries(c.states)) {
                    for (const [dir, cId] of Object.entries(sMap)) {
                      if (cId === clip.next) {
                        this.state = sName;
                        this.direction = dir;
                        this.frameIndex = 0;
                        this.timer = 0;
                        this.finished = false;
                        this.playing = true;
                        return;
                      }
                    }
                  }
                }
              }
              return;
            }
          }
        }
      },

      /**
       * Get the current frame as a p5.Image.
       * @returns {p5.Image|null}
       */
      getCurrentFrame: function () {
        const clip = this._getCurrentClip();
        if (!clip || clip.frames.length === 0) return null;

        const idx = Math.min(this.frameIndex, clip.frames.length - 1);
        const framePath = clip.frames[idx];
        return getCachedFrame(framePath);
      },

      /**
       * Get the current clip definition.
       * @returns {ClipDef|null}
       * @private
       */
      _getCurrentClip: function () {
        const ctrl = _controllers.get(this.controllerId);
        if (!ctrl) return null;
        const stateMap = ctrl.states[this.state];
        if (!stateMap) return null;
        const clipId = stateMap[this.direction] || stateMap[ctrl.defaultDirection];
        if (!clipId) return null;
        return _clips.get(clipId);
      },

      /**
       * Reset playback to start.
       */
      reset: function () {
        this.frameIndex = 0;
        this.timer = 0;
        this.finished = false;
        this.playing = true;
      },

      /**
       * Pause playback.
       */
      pause: function () {
        this.playing = false;
      },

      /**
       * Resume playback.
       */
      play: function () {
        this.playing = true;
        if (this.finished) this.reset();
      },

      /**
       * Get save data for this instance.
       */
      getForSave: function () {
        return {
          controllerId: this.controllerId,
          state: this.state,
          direction: this.direction,
          frameIndex: this.frameIndex,
          speed: this.speed
        };
      }
    };

    return instance;
  }

  /**
   * Restore an animation instance from save data.
   * @param {object} data - Previously saved instance data
   * @returns {AnimationInstance|null}
   */
  function restoreInstance(data) {
    if (!data || !data.controllerId) return null;
    const inst = createInstance(data.controllerId);
    if (!inst) return null;
    if (data.state) inst.state = data.state;
    if (data.direction) inst.direction = data.direction;
    if (data.frameIndex != null) inst.frameIndex = data.frameIndex;
    if (data.speed != null) inst.speed = data.speed;
    return inst;
  }

  // ── Persistence (Load / Save definitions) ─────────────────────────────

  /**
   * Load animation definitions from the server.
   * @returns {Promise<boolean>}
   */
  async function loadDefinitions() {
    try {
      const response = await fetch('/api/animation-definitions');
      if (!response.ok) {
        console.warn('[Animations] Failed to load definitions:', response.statusText);
        return false;
      }
      const data = await response.json();

      // Clear existing
      _clips.clear();
      _controllers.clear();

      // Load clips
      if (data.clips) {
        for (const [id, def] of Object.entries(data.clips)) {
          registerClip(id, def);
        }
      }

      // Load controllers
      if (data.controllers) {
        for (const [id, def] of Object.entries(data.controllers)) {
          registerController(id, def);
        }
      }

      console.log(`[Animations] Loaded ${_clips.size} clips, ${_controllers.size} controllers`);
      Engine.emit('animation.definitionsLoaded', {});
      return true;
    } catch (e) {
      console.warn('[Animations] Error loading definitions:', e);
      return false;
    }
  }

  /**
   * Save animation definitions to the server.
   * @returns {Promise<boolean>}
   */
  async function saveDefinitions() {
    const data = {
      clips: {},
      controllers: {}
    };

    // Serialize clips
    for (const [id, clip] of _clips) {
      data.clips[id] = {
        frames: clip.frames,
        frameRate: clip.frameRate,
        loop: clip.loop
      };
      if (clip.next) data.clips[id].next = clip.next;
    }

    // Serialize controllers
    for (const [id, ctrl] of _controllers) {
      data.controllers[id] = {
        states: ctrl.states,
        defaultState: ctrl.defaultState,
        defaultDirection: ctrl.defaultDirection
      };
    }

    try {
      const response = await fetch('/api/animation-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data, null, 2)
      });
      if (!response.ok) {
        console.warn('[Animations] Failed to save definitions:', response.statusText);
        return false;
      }
      console.log('[Animations] Definitions saved');
      Engine.emit('animation.definitionsSaved', {});
      return true;
    } catch (e) {
      console.warn('[Animations] Error saving definitions:', e);
      return false;
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────

  /**
   * Convert a velocity vector to a 4-direction string.
   * @param {number} vx
   * @param {number} vy
   * @returns {string} 'up'|'down'|'left'|'right'
   */
  function velocityToDirection(vx, vy) {
    if (Math.abs(vx) > Math.abs(vy)) {
      return vx > 0 ? 'right' : 'left';
    }
    return vy > 0 ? 'down' : 'up';
  }

  /**
   * Convert an 8-direction string to a 4-direction string.
   * @param {string} dir8 - 'north','south','east','west','north-east', etc.
   * @returns {string} 'up'|'down'|'left'|'right'
   */
  function direction8to4(dir8) {
    const map = {
      'north': 'up', 'south': 'down', 'east': 'right', 'west': 'left',
      'north-east': 'right', 'north-west': 'left',
      'south-east': 'right', 'south-west': 'left',
      'up': 'up', 'down': 'down', 'left': 'left', 'right': 'right'
    };
    return map[dir8] || 'down';
  }

  // ── Tile Animation Playback ────────────────────────────────────────
  // Lightweight clip-only instances for animated tiles.
  // All tiles of the same type share one playback state (same frame at same time).

  /** @type {Map<string, {clipId:string, frameIndex:number, timer:number}>} tileType → playback state */
  const _tileAnims = new Map();

  /**
   * Register a tile type as animated with a given clip.
   * Called when tile definitions load or when the user assigns a clip in the tile editor.
   * @param {string} tileType
   * @param {string} clipId
   */
  function bindTileAnimation(tileType, clipId) {
    if (!clipId) {
      _tileAnims.delete(tileType);
      return;
    }
    _tileAnims.set(tileType, { clipId, frameIndex: 0, timer: 0 });
    preloadClip(clipId);
  }

  /**
   * Advance all tile animations by dt seconds.
   * Called once per frame from the draw loop.
   * @param {number} dt - seconds
   */
  function updateTileAnimations(dt) {
    for (const [tileType, state] of _tileAnims) {
      const clip = _clips.get(state.clipId);
      if (!clip || clip.frames.length <= 1) continue;

      state.timer += dt;
      const frameDuration = 1.0 / clip.frameRate;

      while (state.timer >= frameDuration) {
        state.timer -= frameDuration;
        state.frameIndex++;
        if (state.frameIndex >= clip.frames.length) {
          state.frameIndex = clip.loop ? 0 : clip.frames.length - 1;
        }
      }
    }
  }

  /**
   * Get the current animation frame image for a tile type.
   * Returns null if the tile type has no animation or frame isn't loaded yet.
   * @param {string} tileType
   * @returns {p5.Image|null}
   */
  function getTileAnimFrame(tileType) {
    const state = _tileAnims.get(tileType);
    if (!state) return null;

    const clip = _clips.get(state.clipId);
    if (!clip || clip.frames.length === 0) return null;

    const idx = Math.min(state.frameIndex, clip.frames.length - 1);
    const framePath = clip.frames[idx];

    // Ensure frame is loaded (lazy-load on first access)
    let img = _frameCache.get(framePath);
    if (!img) {
      loadFrame(framePath);
      return null; // will appear next frame
    }
    return (img.width > 0) ? img : null;
  }

  // ── Debug ─────────────────────────────────────────────────────────────

  function debugStatus() {
    return {
      clips: _clips.size,
      controllers: _controllers.size,
      cachedFrames: _frameCache.size,
      loading: _loadingPaths.size,
      clipList: listClips(),
      controllerList: listControllers()
    };
  }

  // ── Engine Registration ───────────────────────────────────────────────

  // Auto-load definitions when script runs (engine.js doesn't call Engine.init yet)
  if (typeof fetch !== 'undefined') {
    loadDefinitions();
  }

  Engine.register('animations', {
    // Lifecycle
    init: function () {
      loadDefinitions();
    },

    // Clip API
    registerClip,
    getClip,
    removeClip,
    listClips,

    // Controller API
    registerController,
    getController,
    removeController,
    listControllers,

    // Instance API
    createInstance,
    restoreInstance,

    // Frame API
    loadFrame,
    preloadClip,
    preloadController,
    getCachedFrame,

    // Persistence
    loadDefinitions,
    saveDefinitions,

    // Tile Animation API
    bindTileAnimation,
    updateTileAnimations,
    getTileAnimFrame,

    // Utility
    velocityToDirection,
    direction8to4,

    // Debug
    debugStatus
  });

  console.log('[Animations] System registered');

})();
