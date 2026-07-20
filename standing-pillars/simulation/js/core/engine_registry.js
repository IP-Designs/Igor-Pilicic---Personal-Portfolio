// ============================================================================
// ENGINE REGISTRY & EVENT BUS
// ============================================================================
// The backbone of the Tiny Humans Engine. Every system registers itself here
// instead of dumping to window.*. Systems communicate through events instead
// of direct cross-file calls.
//
// USAGE FOR SYSTEM AUTHORS:
//   Engine.register('mySystem', { update(dt), render(), onTileChanged(data) });
//   Engine.get('mySystem').doSomething();
//
// USAGE FOR EVENTS:
//   Engine.emit('tile.placed', { x, y, tile });           // fire event
//   Engine.on('tile.placed', (data) => { ... });          // listen
//   Engine.off('tile.placed', handler);                   // unlisten
//
// USAGE FOR MODS:
//   Engine.override('lighting', myCustomLightingSystem);  // replace system
//   Engine.on('entity.killed', (d) => myMod.onKill(d));   // hook events
//
// This file MUST load before all other js files (first <script> after p5.js).
// ============================================================================

(function () {
  'use strict';

  // ── System Registry ─────────────────────────────────────────────────────

  const _systems = new Map();       // name → system object
  const _initOrder = [];            // track registration order for init()
  const _updateSystems = [];        // systems with update(dt)
  const _renderSystems = [];        // systems with render()

  // ── Event Bus ───────────────────────────────────────────────────────────

  const _listeners = new Map();     // eventName → Set<{handler, priority, once}>
  const _eventLog = [];             // recent events (for debug)
  const _EVENT_LOG_MAX = 200;
  let _eventLogging = false;        // toggle with Engine.debug.logEvents(true)

  // ── Public API ──────────────────────────────────────────────────────────

  const Engine = {

    // ── Registry ────────────────────────────────────────────────────────

    /**
     * Register a system by name. If the system has an init() method,
     * it will be called during Engine.init(). Systems with update(dt)
     * and render() are automatically added to the game loop lists.
     *
     * @param {string} name   - Unique system name (e.g. 'lighting', 'tiles')
     * @param {object} system - System object with any combination of:
     *   init()       - called once during Engine.init()
     *   update(dt)   - called every frame with delta time
     *   render()     - called every frame during draw phase
     *   dispose()    - called during Engine.dispose() for cleanup
     */
    register(name, system) {
      if (_systems.has(name)) {
        console.warn(`[Engine] System "${name}" already registered - overriding.`);
        this._untrackSystem(name);
      }
      _systems.set(name, system);
      _initOrder.push(name);

      // Auto-track lifecycle methods
      if (typeof system.update === 'function') {
        _updateSystems.push({ name, system });
      }
      if (typeof system.render === 'function') {
        _renderSystems.push({ name, system });
      }

      Engine.emit('engine.systemRegistered', { name });
    },

    /**
     * Get a registered system by name. Returns undefined if not found.
     * @param {string} name
     * @returns {object|undefined}
     */
    get(name) {
      return _systems.get(name);
    },

    /**
     * Check if a system is registered.
     * @param {string} name
     * @returns {boolean}
     */
    has(name) {
      return _systems.has(name);
    },

    /**
     * Replace a registered system (for mods / overrides).
     * The old system's dispose() is called if it exists.
     * @param {string} name
     * @param {object} newSystem
     */
    override(name, newSystem) {
      const old = _systems.get(name);
      if (old && typeof old.dispose === 'function') {
        old.dispose();
      }
      this._untrackSystem(name);
      _systems.set(name, newSystem);

      if (typeof newSystem.update === 'function') {
        _updateSystems.push({ name, system: newSystem });
      }
      if (typeof newSystem.render === 'function') {
        _renderSystems.push({ name, system: newSystem });
      }

      Engine.emit('engine.systemOverridden', { name, oldSystem: old });
    },

    /**
     * List all registered system names.
     * @returns {string[]}
     */
    list() {
      return Array.from(_systems.keys());
    },

    // ── Event Bus ───────────────────────────────────────────────────────

    /**
     * Subscribe to an event.
     * @param {string} event     - Event name (e.g. 'tile.placed')
     * @param {function} handler - Callback receiving event data
     * @param {object} [opts]    - { priority: number, once: boolean }
     * @returns {function}       - Unsubscribe function
     */
    on(event, handler, opts = {}) {
      if (!_listeners.has(event)) {
        _listeners.set(event, []);
      }
      const entry = {
        handler,
        priority: opts.priority || 0,
        once: opts.once || false
      };
      const list = _listeners.get(event);
      list.push(entry);
      // Sort by priority (higher = runs first)
      list.sort((a, b) => b.priority - a.priority);

      // Return unsubscribe function
      return () => this.off(event, handler);
    },

    /**
     * Subscribe to an event - fires only once, then auto-removes.
     * @param {string} event
     * @param {function} handler
     * @returns {function} unsubscribe
     */
    once(event, handler) {
      return this.on(event, handler, { once: true });
    },

    /**
     * Unsubscribe a handler from an event.
     * @param {string} event
     * @param {function} handler
     */
    off(event, handler) {
      const list = _listeners.get(event);
      if (!list) return;
      const idx = list.findIndex(e => e.handler === handler);
      if (idx !== -1) list.splice(idx, 1);
    },

    /**
     * Emit an event. All subscribed handlers are called synchronously.
     * @param {string} event - Event name
     * @param {*} [data]     - Event payload (any type)
     */
    emit(event, data) {
      if (_eventLogging) {
        _eventLog.push({ event, data, time: performance.now() });
        if (_eventLog.length > _EVENT_LOG_MAX) _eventLog.shift();
      }

      const list = _listeners.get(event);
      if (!list || list.length === 0) return;

      // Iterate a copy so handlers can safely remove themselves
      const snapshot = list.slice();
      for (const entry of snapshot) {
        try {
          entry.handler(data);
        } catch (err) {
          console.error(`[Engine] Error in handler for "${event}":`, err);
        }
        if (entry.once) {
          this.off(event, entry.handler);
        }
      }
    },

    // ── Lifecycle ───────────────────────────────────────────────────────

    /**
     * Initialize all registered systems that have init() methods.
     * Called once from setup().
     */
    init() {
      for (const name of _initOrder) {
        const sys = _systems.get(name);
        if (sys && typeof sys.init === 'function') {
          try {
            sys.init();
          } catch (err) {
            console.error(`[Engine] Failed to init system "${name}":`, err);
          }
        }
      }
      Engine.emit('engine.ready');
    },

    /**
     * Update all registered systems. Called every frame.
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
      for (const { name, system } of _updateSystems) {
        try {
          system.update(dt);
        } catch (err) {
          console.error(`[Engine] Error updating "${name}":`, err);
        }
      }
    },

    /**
     * Render all registered systems. Called every frame during draw.
     */
    render() {
      for (const { name, system } of _renderSystems) {
        try {
          system.render();
        } catch (err) {
          console.error(`[Engine] Error rendering "${name}":`, err);
        }
      }
    },

    /**
     * Dispose all registered systems and clear the registry.
     */
    dispose() {
      for (const [name, sys] of _systems) {
        if (typeof sys.dispose === 'function') {
          try {
            sys.dispose();
          } catch (err) {
            console.error(`[Engine] Error disposing "${name}":`, err);
          }
        }
      }
      _systems.clear();
      _initOrder.length = 0;
      _updateSystems.length = 0;
      _renderSystems.length = 0;
      _listeners.clear();
      _eventLog.length = 0;
    },

    // ── Debug Utilities ─────────────────────────────────────────────────

    debug: {
      /** Toggle event logging on/off */
      logEvents(enabled) {
        _eventLogging = enabled;
        console.log(`[Engine] Event logging ${enabled ? 'ON' : 'OFF'}`);
      },

      /** Get recent event log */
      getEventLog() {
        return _eventLog.slice();
      },

      /** Print all registered systems and their methods */
      systems() {
        console.group('[Engine] Registered Systems');
        for (const [name, sys] of _systems) {
          const methods = Object.getOwnPropertyNames(
            Object.getPrototypeOf(sys) === Object.prototype ? sys : Object.getPrototypeOf(sys)
          ).filter(m => typeof sys[m] === 'function');
          console.log(`  ${name}:`, methods.join(', ') || '(no methods)');
        }
        console.groupEnd();
      },

      /** Print all active event listeners */
      listeners() {
        console.group('[Engine] Event Listeners');
        for (const [event, list] of _listeners) {
          console.log(`  ${event}: ${list.length} handler(s)`);
        }
        console.groupEnd();
      },

      /** Print full status */
      status() {
        console.log(`[Engine] Systems: ${_systems.size}, Events: ${_listeners.size} types, Log: ${_eventLog.length} entries`);
        this.systems();
        this.listeners();
      }
    },

    // ── Internal ────────────────────────────────────────────────────────

    /** @private Remove system from update/render tracking */
    _untrackSystem(name) {
      let idx = _updateSystems.findIndex(e => e.name === name);
      if (idx !== -1) _updateSystems.splice(idx, 1);
      idx = _renderSystems.findIndex(e => e.name === name);
      if (idx !== -1) _renderSystems.splice(idx, 1);
      // Don't remove from _initOrder - it's a historical log
    }
  };

  // ── Expose Globally ───────────────────────────────────────────────────
  // This is the ONE global the engine adds. Everything else goes through it.

  window.Engine = Engine;

  console.log('[Engine] Registry & Event Bus loaded.');

})();
