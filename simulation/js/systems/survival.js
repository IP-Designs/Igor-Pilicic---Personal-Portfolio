/* ============================================================
 *  survival.js  –  POC Hunger / Thirst / Fatigue stats
 *  ============================================================
 *  Three 0-100 stats that tick down over time.
 *  Eating/drinking items restores them.
 *  When any stat hits 0, health drains slowly.
 *  ============================================================ */
(function () {
  'use strict';

  var stats = {
    hunger:  100,
    thirst:  100,
    fatigue: 100
  };

  // Drain rates (points per real second) - tweak later
  var RATES = {
    hunger:  0.15,
    thirst:  0.20,
    fatigue: 0.10
  };

  var HEALTH_DRAIN = 0.5; // HP/s when any stat is 0

  // Item → stat restore mapping
  var _foodMap = {
    berries:     { hunger: 15 },
    meat_cooked: { hunger: 40 },
    meat_raw:    { hunger: 10, thirst: -5 },
    water:       { thirst: 35 },
    bandage:     {},    // no survival effect, just health
    medkit:      {}
  };

  function registerFood(itemId, effects) {
    _foodMap[itemId] = effects;
  }

  function update(dt) {
    // dt in seconds
    stats.hunger  = Math.max(0, stats.hunger  - RATES.hunger  * dt);
    stats.thirst  = Math.max(0, stats.thirst  - RATES.thirst  * dt);
    stats.fatigue = Math.max(0, stats.fatigue - RATES.fatigue * dt);

    // Health drain when starving/dehydrated/exhausted
    if (typeof healthState !== 'undefined' && healthState.enabled) {
      var draining = (stats.hunger <= 0) + (stats.thirst <= 0) + (stats.fatigue <= 0);
      if (draining > 0) {
        var drainAmount = HEALTH_DRAIN * draining * dt;
        if (typeof takeDamage === 'function') {
          takeDamage(drainAmount, 'starvation');
        } else {
          healthState.currentHealth = Math.max(0,
            healthState.currentHealth - drainAmount);
        }
      }
    }
  }

  function consume(itemId) {
    var fx = _foodMap[itemId];
    if (!fx) return false;
    if (fx.hunger)  stats.hunger  = Math.min(100, stats.hunger  + fx.hunger);
    if (fx.thirst)  stats.thirst  = Math.min(100, stats.thirst  + fx.thirst);
    if (fx.fatigue) stats.fatigue = Math.min(100, stats.fatigue + fx.fatigue);
    Engine.emit('survival.consumed', { itemId: itemId, effects: fx, stats: getStats() });
    return true;
  }

  function rest(amount) {
    stats.fatigue = Math.min(100, stats.fatigue + (amount || 30));
    Engine.emit('survival.rested', { fatigue: stats.fatigue });
  }

  function getStats() {
    return { hunger: stats.hunger, thirst: stats.thirst, fatigue: stats.fatigue };
  }

  function getForSave() { return { hunger: stats.hunger, thirst: stats.thirst, fatigue: stats.fatigue }; }

  function loadFromSave(data) {
    if (!data) return;
    stats.hunger  = data.hunger  != null ? data.hunger  : 100;
    stats.thirst  = data.thirst  != null ? data.thirst  : 100;
    stats.fatigue = data.fatigue != null ? data.fatigue : 100;
  }

  function reset() {
    stats.hunger = 100;
    stats.thirst = 100;
    stats.fatigue = 100;
  }

  // Wire item.used events → consume + heal
  Engine.on('item.used', function (e) {
    var itemId = e.stack.itemId;
    var items = Engine.get('items');
    var def = items ? items.get(itemId) : null;

    // Apply survival effects (food/drink)
    if (_foodMap[itemId]) {
      consume(itemId);
    }

    // Apply healing from item definitions (MEDICAL items)
    if (def && def.properties && def.properties.healAmount) {
      if (typeof heal === 'function') {
        heal(def.properties.healAmount);
      }
    }

    // Remove the item from inventory (from specific slot if provided)
    var inv = Engine.get('inventory');
    if (inv) {
      if (e.slot != null && inv.player.slots[e.slot]) {
        inv.player.slots[e.slot].quantity -= 1;
        if (inv.player.slots[e.slot].quantity <= 0) {
          inv.player.slots[e.slot] = null;
        }
      } else {
        inv.player.removeItem(itemId, 1);
      }
      Engine.emit('inventory.changed', { container: 'player', itemId: itemId, used: 1 });
    }
  });

  // ── Public API ─────────────────────────────────────────────
  var survivalSystem = {
    update: update,
    consume: consume,
    rest: rest,
    getStats: getStats,
    registerFood: registerFood,
    getForSave: getForSave,
    loadFromSave: loadFromSave,
    reset: reset,
    stats: stats
  };

  Engine.register('survival', survivalSystem);
  window.survivalSystem = survivalSystem;
  console.log('[Survival] ✓ Survival system initialized - hunger/thirst/fatigue');
})();
