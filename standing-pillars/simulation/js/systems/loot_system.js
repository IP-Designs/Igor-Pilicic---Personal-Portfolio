/* ============================================================
 *  loot_system.js  –  Entity loot drops on death
 *  ============================================================
 *  Listens for `entity.killed` events and drops world items
 *  based on the entity's lootTable.
 *
 *  lootTable format (in entity-definitions.json):
 *    "lootTable": [
 *      { "itemId": "raw_meat",  "chance": 0.8, "min": 1, "max": 2 },
 *      { "itemId": "bone",      "chance": 0.3, "min": 1, "max": 1 }
 *    ]
 *
 *  Each entry is rolled independently.
 *
 *  Engine.register('loot', lootSystem)
 *  ============================================================ */
(function () {
  'use strict';

  // ── Default loot tables for existing entities ──────────────
  // Will be overridden by entity-definitions.json if they
  // define their own lootTable.  These are sensible defaults.
  var _fallbackTables = {
    // Example: if an entity type 'chicken' dies
    // 'chicken': [
    //   { itemId: 'raw_meat', chance: 1.0, min: 1, max: 2 }
    // ]
  };

  // ── Core Logic ─────────────────────────────────────────────
  function rollLoot(lootTable) {
    if (!lootTable || !lootTable.length) return [];

    var drops = [];
    for (var i = 0; i < lootTable.length; i++) {
      var entry = lootTable[i];
      if (Math.random() <= (entry.chance || 0)) {
        var qty = (entry.min || 1);
        if (entry.max && entry.max > entry.min) {
          qty += Math.floor(Math.random() * (entry.max - entry.min + 1));
        }
        drops.push({ itemId: entry.itemId, quantity: qty });
      }
    }
    return drops;
  }

  function dropItems(drops, worldX, worldY) {
    if (!drops.length) return;
    var worldItems = Engine.get('worldItems');
    var items = Engine.get('items');
    if (!worldItems || !items) return;

    for (var i = 0; i < drops.length; i++) {
      var d = drops[i];
      if (!items.has(d.itemId)) {
        console.warn('[Loot] Unknown item:', d.itemId);
        continue;
      }

      // Scatter items slightly so they don't all stack on the same pixel
      var offsetX = (Math.random() - 0.5) * 24;
      var offsetY = (Math.random() - 0.5) * 24;

      for (var q = 0; q < d.quantity; q++) {
        worldItems.placeItem(
          d.itemId,
          worldX + offsetX + (q * 8),
          worldY + offsetY,
          1 // quantity per drop
        );
      }
    }
  }

  // ── Event Listener ─────────────────────────────────────────
  function onEntityKilled(data) {
    if (!data || !data.entity) return;

    var ent = data.entity;
    var lootTable = ent.lootTable || null;

    // Check typeDef for loot table (entity instances store typeDef ref)
    if (!lootTable && ent.typeDef && ent.typeDef.lootTable) {
      lootTable = ent.typeDef.lootTable;
    }

    // Fallback to defaults based on entity type
    if (!lootTable && ent.type && _fallbackTables[ent.type]) {
      lootTable = _fallbackTables[ent.type];
    }

    if (!lootTable || !lootTable.length) return;

    var drops = rollLoot(lootTable);
    if (drops.length > 0) {
      dropItems(drops, ent.x || 0, ent.y || 0);

      // Notification
      var itemSys = Engine.get('items');
      var names = drops.map(function (d) {
        var def = itemSys ? itemSys.get(d.itemId) : null;
        return (def ? def.displayName : d.itemId) + ' x' + d.quantity;
      });
      if (typeof gameUILayer !== 'undefined' && gameUILayer.notify) {
        gameUILayer.notify('Loot: ' + names.join(', '), 2.5, [255, 220, 80]);
      }

      Engine.emit('loot.dropped', { entity: ent, drops: drops });
      console.log('[Loot] Dropped:', names.join(', '), 'from', ent.type || 'entity');
    }
  }

  // ── Registration ───────────────────────────────────────────
  function init() {
    Engine.on('entity.killed', onEntityKilled);
    console.log('[Loot] ✓ Loot system loaded - entities drop items on death');
  }

  // ── Register fallback table at runtime ─────────────────────
  function registerFallback(entityType, table) {
    _fallbackTables[entityType] = table;
  }

  // Init immediately
  init();

  // ── Public API ─────────────────────────────────────────────
  var lootSystem = {
    rollLoot:         rollLoot,
    dropItems:        dropItems,
    registerFallback: registerFallback
  };

  Engine.register('loot', lootSystem);
  window.lootSystem = lootSystem;
})();
