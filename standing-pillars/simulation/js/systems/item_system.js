/* ============================================================
 *  item_system.js  –  JSON-driven item definitions & registry
 *  ============================================================
 *  Loads items from item-definitions.json (via server API).
 *  All Phase 2 systems read from Engine.get('items').
 *  ============================================================ */
(function () {
  'use strict';

  var _items = {};        // id → itemDef (flat lookup)
  var _definitions = null; // raw JSON { categories: { ... } }
  var _loaded = false;

  // ── Register a single item (internal) ─────────────────────
  function _registerFromDef(id, def) {
    _items[id] = Object.freeze({
      id:          id,
      displayName: def.displayName || id,
      name:        def.displayName || id,  // alias for compat
      category:    def.category || 'MISC',
      icon:        def.icon || '📦',
      spritePath:  def.spritePath || null,
      weight:      def.weight != null ? def.weight : 0.5,
      stackable:   def.stackable !== false,
      maxStack:    def.maxStack || 99,
      usable:      !!def.usable,
      equippable:  !!def.equippable,
      equipSlot:   def.equipSlot || null,
      description: def.description || '',
      properties:  def.properties || {},
      flags:       def.flags || []
    });
  }

  // ── Load definitions from server/file ─────────────────────
  function loadFromJSON(json) {
    _items = {};
    _definitions = json;
    if (!json || !json.categories) {
      console.warn('[Items] Invalid definitions - no categories');
      return;
    }
    var catNames = Object.keys(json.categories);
    for (var c = 0; c < catNames.length; c++) {
      var catName = catNames[c];
      var cat = json.categories[catName];
      if (!cat.items) continue;
      var itemIds = Object.keys(cat.items);
      for (var i = 0; i < itemIds.length; i++) {
        var def = cat.items[itemIds[i]];
        def.category = catName; // ensure category is set
        _registerFromDef(itemIds[i], def);
      }
    }
    _loaded = true;
    console.log('[Items] Loaded', Object.keys(_items).length, 'items from', catNames.length, 'categories');
    Engine.emit('items.loaded', { count: Object.keys(_items).length });
  }

  function fetchDefinitions(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/item-definitions', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var json = JSON.parse(xhr.responseText);
          loadFromJSON(json);
          if (callback) callback(null, json);
        } catch (e) {
          console.error('[Items] Failed to parse definitions:', e);
          if (callback) callback(e);
        }
      } else {
        // Fallback: try loading the JSON file directly
        fetchDefinitionsFallback(callback);
      }
    };
    xhr.onerror = function () {
      fetchDefinitionsFallback(callback);
    };
    xhr.send();
  }

  function fetchDefinitionsFallback(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'js/data/item-definitions.json', true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var json = JSON.parse(xhr.responseText);
          loadFromJSON(json);
          if (callback) callback(null, json);
        } catch (e) {
          console.error('[Items] Fallback parse failed:', e);
          if (callback) callback(e);
        }
      } else {
        console.error('[Items] Could not load definitions');
        if (callback) callback(new Error('Failed to fetch'));
      }
    };
    xhr.onerror = function () {
      console.error('[Items] Network error loading definitions');
      if (callback) callback(new Error('Network error'));
    };
    xhr.send();
  }

  // ── Accessors ─────────────────────────────────────────────
  function get(id) { return _items[id] || null; }
  function has(id) { return !!_items[id]; }
  function list() { return Object.keys(_items).map(function (k) { return _items[k]; }); }
  function listByCategory(cat) { return list().filter(function (i) { return i.category === cat; }); }
  function getDefinitions() { return _definitions; }
  function isLoaded() { return _loaded; }
  function getCategories() {
    if (!_definitions || !_definitions.categories) return [];
    return Object.keys(_definitions.categories);
  }

  // Create a runtime item stack (instance, not definition)
  function createStack(itemId, qty) {
    if (!_items[itemId]) { console.warn('[Items] Unknown:', itemId); return null; }
    var def = _items[itemId];
    return { itemId: itemId, quantity: Math.min(qty || 1, def.maxStack), condition: 100, data: {} };
  }

  // Register an item at runtime (for mods / dynamically generated items)
  function register(def) {
    if (!def || !def.id) { console.warn('[Items] Missing id'); return; }
    _registerFromDef(def.id, def);
  }

  // ── Auto-load on init ─────────────────────────────────────
  // Try to load immediately; if server isn't ready yet, engine.js will retry
  fetchDefinitions();

  // ── Public API ─────────────────────────────────────────────
  var itemSystem = {
    get: get,
    has: has,
    list: list,
    listByCategory: listByCategory,
    createStack: createStack,
    register: register,
    loadFromJSON: loadFromJSON,
    fetchDefinitions: fetchDefinitions,
    getDefinitions: getDefinitions,
    getCategories: getCategories,
    isLoaded: isLoaded
  };

  Engine.register('items', itemSystem);
  window.itemSystem = itemSystem;
  console.log('[Items] ✓ Item system initialized');
})();
