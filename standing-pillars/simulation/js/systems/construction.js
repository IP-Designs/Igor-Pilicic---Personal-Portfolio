/* ============================================================
 *  construction.js  –  POC Build/remove tiles at runtime
 *  ============================================================
 *  Toggle build mode with B. Click to place, right-click remove.
 *  Consumes items from inventory. Simple tile palette.
 *  ============================================================ */
(function () {
  'use strict';

  var _buildMode   = false;
  var _selectedTile = null;
  var _palette      = [];  // available buildable tiles

  // tile → cost mapping
  var _costs = {};

  function registerBuildable(tileId, tileName, cost) {
    // cost = [{ itemId, qty }]
    _costs[tileId] = { name: tileName, cost: cost };
    _palette.push({ tileId: tileId, name: tileName });
  }

  function toggleBuildMode() {
    _buildMode = !_buildMode;
    if (_buildMode && _palette.length > 0 && !_selectedTile) {
      _selectedTile = _palette[0].tileId;
    }
    Engine.emit('construction.mode', { active: _buildMode, tile: _selectedTile });
  }

  function selectTile(tileId) {
    _selectedTile = tileId;
    Engine.emit('construction.selected', { tile: tileId });
  }

  function canBuild(tileId) {
    var entry = _costs[tileId];
    if (!entry) return false;
    var inv = Engine.get('inventory');
    if (!inv) return false;
    for (var i = 0; i < entry.cost.length; i++) {
      if (!inv.player.hasItem(entry.cost[i].itemId, entry.cost[i].qty)) return false;
    }
    return true;
  }

  function build(gridX, gridY) {
    if (!_buildMode || !_selectedTile) return false;
    if (!canBuild(_selectedTile)) {
      Engine.emit('construction.failed', { reason: 'missing_resources', tile: _selectedTile });
      return false;
    }

    // Consume resources
    var entry = _costs[_selectedTile];
    var inv = Engine.get('inventory');
    for (var i = 0; i < entry.cost.length; i++) {
      inv.player.removeItem(entry.cost[i].itemId, entry.cost[i].qty);
    }

    // Place tile (use existing tile system)
    if (typeof tiles !== 'undefined' && tiles[gridY] && tiles[gridY][gridX] != null) {
      tiles[gridY][gridX] = _selectedTile;
    }

    Engine.emit('construction.built', { tile: _selectedTile, x: gridX, y: gridY });
    return true;
  }

  function demolish(gridX, gridY) {
    if (!_buildMode) return false;
    if (typeof tiles !== 'undefined' && tiles[gridY] && tiles[gridY][gridX] != null) {
      var oldTile = tiles[gridY][gridX];
      tiles[gridY][gridX] = 0; // set to empty
      Engine.emit('construction.demolished', { tile: oldTile, x: gridX, y: gridY });
      return true;
    }
    return false;
  }

  function isInBuildMode() { return _buildMode; }
  function getSelected() { return _selectedTile; }
  function getPalette() { return _palette.slice(); }

  // ── Starter buildable tiles ────────────────────────────────
  registerBuildable(1, 'Wood Floor', [{ itemId: 'plank', qty: 1 }]);
  registerBuildable(2, 'Wood Wall',  [{ itemId: 'plank', qty: 2 }]);
  registerBuildable(3, 'Stone Floor',[{ itemId: 'rock', qty: 2 }]);

  // ── Public API ─────────────────────────────────────────────
  var constructionSystem = {
    toggle: toggleBuildMode,
    build: build,
    demolish: demolish,
    selectTile: selectTile,
    canBuild: canBuild,
    isActive: isInBuildMode,
    getSelected: getSelected,
    getPalette: getPalette,
    registerBuildable: registerBuildable
  };

  Engine.register('construction', constructionSystem);
  window.constructionSystem = constructionSystem;
  console.log('[Construction] ✓ Construction system initialized - press B to build');
})();
