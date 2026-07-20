/* ============================================================
 *  crafting.js  –  POC Recipe registry + basic crafting
 *  ============================================================
 *  Recipes are simple {id, inputs:[{itemId,qty}], output:{itemId,qty}, time}
 *  craft(recipeId) checks player inventory, consumes, produces.
 *  ============================================================ */
(function () {
  'use strict';

  var _recipes = {};

  function register(def) {
    if (!def.id || !def.inputs || !def.output) {
      console.warn('[Crafting] Invalid recipe', def);
      return;
    }
    _recipes[def.id] = Object.assign({
      name: def.id,
      time: 0,         // seconds (0 = instant)
      station: null     // null = hand-craft
    }, def);
  }

  function canCraft(recipeId) {
    var r = _recipes[recipeId];
    if (!r) return false;
    var inv = Engine.get('inventory');
    for (var i = 0; i < r.inputs.length; i++) {
      if (!inv.player.hasItem(r.inputs[i].itemId, r.inputs[i].qty)) return false;
    }
    return true;
  }

  function craft(recipeId) {
    var r = _recipes[recipeId];
    if (!r) { console.warn('[Crafting] Unknown recipe', recipeId); return false; }
    if (!canCraft(recipeId)) { Engine.emit('craft.failed', { recipe: recipeId, reason: 'missing_items' }); return false; }

    var inv = Engine.get('inventory');
    // Consume inputs
    for (var i = 0; i < r.inputs.length; i++) {
      inv.player.removeItem(r.inputs[i].itemId, r.inputs[i].qty);
    }
    // Produce output
    var added = inv.player.addItem(r.output.itemId, r.output.qty || 1);
    if (!added) {
      // Inventory full - refund inputs
      for (var j = 0; j < r.inputs.length; j++) {
        inv.player.addItem(r.inputs[j].itemId, r.inputs[j].qty);
      }
      Engine.emit('craft.failed', { recipe: recipeId, reason: 'inventory_full' });
      return false;
    }

    Engine.emit('craft.success', { recipe: recipeId, output: r.output });
    return true;
  }

  function getRecipe(id) { return _recipes[id] || null; }
  function listRecipes() { return Object.keys(_recipes).map(function (k) { return _recipes[k]; }); }
  function listAvailable() { return listRecipes().filter(function (r) { return canCraft(r.id); }); }

  // ── Starter recipes ───────────────────────────────────────
  register({ id: 'bandage',      name: 'Bandage',       inputs: [{ itemId: 'cloth', qty: 2 }],                          output: { itemId: 'bandage', qty: 1 } });
  register({ id: 'plank',        name: 'Wood Plank',    inputs: [{ itemId: 'stick', qty: 3 }],                          output: { itemId: 'plank', qty: 1 } });
  register({ id: 'cooked_meat',  name: 'Cooked Meat',   inputs: [{ itemId: 'meat_raw', qty: 1 }],                       output: { itemId: 'meat_cooked', qty: 1 }, station: 'campfire' });
  register({ id: 'axe',          name: 'Stone Axe',     inputs: [{ itemId: 'rock', qty: 2 }, { itemId: 'stick', qty: 1 }], output: { itemId: 'axe', qty: 1 } });
  register({ id: 'knife',        name: 'Stone Knife',   inputs: [{ itemId: 'rock', qty: 1 }, { itemId: 'stick', qty: 1 }], output: { itemId: 'knife', qty: 1 } });
  register({ id: 'torch',        name: 'Torch',         inputs: [{ itemId: 'stick', qty: 1 }, { itemId: 'cloth', qty: 1 }], output: { itemId: 'flashlight', qty: 1 } });

  // ── Public API ─────────────────────────────────────────────
  var craftingSystem = {
    register: register,
    canCraft: canCraft,
    craft: craft,
    getRecipe: getRecipe,
    listRecipes: listRecipes,
    listAvailable: listAvailable
  };

  Engine.register('crafting', craftingSystem);
  window.craftingSystem = craftingSystem;
  console.log('[Crafting] ✓ Crafting system initialized - ' + listRecipes().length + ' recipes');
})();
