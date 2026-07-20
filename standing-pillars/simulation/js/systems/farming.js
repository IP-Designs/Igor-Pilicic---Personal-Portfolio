/* ============================================================
 *  farming.js  –  POC Plant seeds → grow → harvest
 *  ============================================================
 *  Place seeds on a farm tile. Growth stages tick with game time.
 *  Harvest puts items into inventory.
 *  ============================================================ */
(function () {
  'use strict';

  // Active crops keyed by "x,y"
  var _crops = {};

  var GROWTH_TIME = 60; // seconds per stage (real-time for POC)
  var STAGES = 3;       // 0=seed, 1=sprout, 2=grown → harvestable

  // Crop definitions: seedItem → { harvestItem, harvestQty, growTime }
  var _cropDefs = {};

  function registerCrop(seedItemId, def) {
    _cropDefs[seedItemId] = Object.assign({
      harvestItem: seedItemId,
      harvestQty: 3,
      growTime: GROWTH_TIME,
      stages: STAGES
    }, def);
  }

  function plant(gridX, gridY, seedItemId) {
    var key = gridX + ',' + gridY;
    if (_crops[key]) {
      Engine.emit('farming.failed', { reason: 'occupied', x: gridX, y: gridY });
      return false;
    }
    var def = _cropDefs[seedItemId];
    if (!def) {
      Engine.emit('farming.failed', { reason: 'not_a_seed', itemId: seedItemId });
      return false;
    }

    // Consume seed from inventory
    var inv = Engine.get('inventory');
    if (inv && !inv.player.hasItem(seedItemId, 1)) {
      Engine.emit('farming.failed', { reason: 'no_seeds' });
      return false;
    }
    if (inv) inv.player.removeItem(seedItemId, 1);

    _crops[key] = {
      seedId: seedItemId,
      x: gridX,
      y: gridY,
      stage: 0,
      timer: 0,
      growTime: def.growTime,
      maxStage: def.stages
    };

    Engine.emit('farming.planted', { x: gridX, y: gridY, seed: seedItemId });
    return true;
  }

  function harvest(gridX, gridY) {
    var key = gridX + ',' + gridY;
    var crop = _crops[key];
    if (!crop) return false;
    if (crop.stage < crop.maxStage) {
      Engine.emit('farming.failed', { reason: 'not_ready', stage: crop.stage, maxStage: crop.maxStage });
      return false;
    }

    var def = _cropDefs[crop.seedId];
    var inv = Engine.get('inventory');
    if (inv) {
      inv.player.addItem(def.harvestItem, def.harvestQty);
    }

    Engine.emit('farming.harvested', { x: gridX, y: gridY, item: def.harvestItem, qty: def.harvestQty });
    delete _crops[key];
    return true;
  }

  function update(dt) {
    var keys = Object.keys(_crops);
    for (var i = 0; i < keys.length; i++) {
      var crop = _crops[keys[i]];
      if (crop.stage >= crop.maxStage) continue;
      crop.timer += dt;
      if (crop.timer >= crop.growTime) {
        crop.timer -= crop.growTime;
        crop.stage++;
        Engine.emit('farming.grew', { x: crop.x, y: crop.y, stage: crop.stage });
      }
    }
  }

  function getCrop(gridX, gridY) {
    return _crops[gridX + ',' + gridY] || null;
  }

  function getAllCrops() {
    return Object.keys(_crops).map(function (k) { return _crops[k]; });
  }

  function getForSave() {
    return JSON.parse(JSON.stringify(_crops));
  }

  function loadFromSave(data) {
    _crops = data ? JSON.parse(JSON.stringify(data)) : {};
  }

  function reset() { _crops = {}; }

  // ── Starter crop definitions ──────────────────────────────
  registerCrop('seeds', { harvestItem: 'berries', harvestQty: 4, growTime: 45, stages: 3 });

  // ── Public API ─────────────────────────────────────────────
  var farmingSystem = {
    plant: plant,
    harvest: harvest,
    update: update,
    getCrop: getCrop,
    getAllCrops: getAllCrops,
    registerCrop: registerCrop,
    getForSave: getForSave,
    loadFromSave: loadFromSave,
    reset: reset
  };

  Engine.register('farming', farmingSystem);
  window.farmingSystem = farmingSystem;
  console.log('[Farming] ✓ Farming system initialized');
})();
