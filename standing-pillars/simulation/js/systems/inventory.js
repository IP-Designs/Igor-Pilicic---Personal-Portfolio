/* ============================================================
 *  inventory.js  –  POC Container logic & player inventory
 *  ============================================================
 *  A Container is a fixed-size array of item stacks (or null).
 *  Player inventory is the default container.
 *  Engine.get('inventory')
 *  ============================================================ */
(function () {
  'use strict';

  // ── Container class ────────────────────────────────────────
  function Container(size, label) {
    this.slots = new Array(size).fill(null); // each slot: { itemId, quantity, condition, data } | null
    this.size  = size;
    this.label = label || 'Container';
  }

  Container.prototype.addItem = function (itemId, qty) {
    qty = qty || 1;
    var items = Engine.get('items');
    var def = items.get(itemId);
    if (!def) return 0;

    var added = 0;

    // 1. Stack into existing partial stacks
    if (def.stackable) {
      for (var i = 0; i < this.size && qty > 0; i++) {
        var s = this.slots[i];
        if (s && s.itemId === itemId && s.quantity < def.maxStack) {
          var space = def.maxStack - s.quantity;
          var take = Math.min(space, qty);
          s.quantity += take;
          qty -= take;
          added += take;
        }
      }
    }

    // 2. Fill empty slots
    while (qty > 0) {
      var empty = this.firstEmpty();
      if (empty === -1) break;
      var stackQty = def.stackable ? Math.min(qty, def.maxStack) : 1;
      this.slots[empty] = items.createStack(itemId, stackQty);
      qty -= stackQty;
      added += stackQty;
    }

    if (added > 0) Engine.emit('inventory.changed', { container: this.label, itemId: itemId, added: added });
    return added;
  };

  Container.prototype.removeItem = function (itemId, qty) {
    qty = qty || 1;
    var removed = 0;
    for (var i = this.size - 1; i >= 0 && qty > 0; i--) {
      var s = this.slots[i];
      if (s && s.itemId === itemId) {
        var take = Math.min(s.quantity, qty);
        s.quantity -= take;
        qty -= take;
        removed += take;
        if (s.quantity <= 0) this.slots[i] = null;
      }
    }
    if (removed > 0) Engine.emit('inventory.changed', { container: this.label, itemId: itemId, removed: removed });
    return removed;
  };

  Container.prototype.hasItem = function (itemId, qty) {
    qty = qty || 1;
    var total = 0;
    for (var i = 0; i < this.size; i++) {
      if (this.slots[i] && this.slots[i].itemId === itemId) total += this.slots[i].quantity;
    }
    return total >= qty;
  };

  Container.prototype.countItem = function (itemId) {
    var total = 0;
    for (var i = 0; i < this.size; i++) {
      if (this.slots[i] && this.slots[i].itemId === itemId) total += this.slots[i].quantity;
    }
    return total;
  };

  Container.prototype.firstEmpty = function () {
    for (var i = 0; i < this.size; i++) { if (!this.slots[i]) return i; }
    return -1;
  };

  Container.prototype.isFull = function () { return this.firstEmpty() === -1; };

  Container.prototype.clear = function () { this.slots.fill(null); };

  Container.prototype.getForSave = function () {
    return this.slots.map(function (s) { return s ? { itemId: s.itemId, quantity: s.quantity, condition: s.condition, data: s.data } : null; });
  };

  Container.prototype.loadFromSave = function (data) {
    if (!Array.isArray(data)) return;
    for (var i = 0; i < this.size; i++) {
      this.slots[i] = (i < data.length && data[i]) ? { itemId: data[i].itemId, quantity: data[i].quantity, condition: data[i].condition || 100, data: data[i].data || {} } : null;
    }
  };

  // ── Equipment slots ────────────────────────────────────────
  var equipment = { head: null, body: null, hands: null, feet: null, weapon: null, offhand: null };

  function equip(slotName, stack) {
    if (!equipment.hasOwnProperty(slotName)) return false;
    var prev = equipment[slotName];
    equipment[slotName] = stack;
    Engine.emit('equipment.changed', { slot: slotName, item: stack, previous: prev });
    return prev; // return unequipped item (or null)
  }

  function unequip(slotName) { return equip(slotName, null); }
  function getEquipped(slotName) { return equipment[slotName]; }
  function getAllEquipped() { return Object.assign({}, equipment); }

  // ── Player inventory (global, survives map changes) ────────
  var playerInventory = new Container(20, 'player');

  // Give starter items for testing
  // (uncomment to auto-give items on load)
  // playerInventory.addItem('knife', 1);
  // playerInventory.addItem('bandage', 3);
  // playerInventory.addItem('water', 2);

  // ── Public API ─────────────────────────────────────────────
  var inventorySystem = {
    Container: Container,
    player: playerInventory,
    equipment: equipment,
    equip: equip,
    unequip: unequip,
    getEquipped: getEquipped,
    getAllEquipped: getAllEquipped,

    getForSave: function () {
      return { slots: playerInventory.getForSave(), equipment: Object.assign({}, equipment) };
    },
    loadFromSave: function (data) {
      if (!data) return;
      if (data.slots) playerInventory.loadFromSave(data.slots);
      if (data.equipment) {
        for (var k in data.equipment) { if (equipment.hasOwnProperty(k)) equipment[k] = data.equipment[k]; }
      }
    }
  };

  Engine.register('inventory', inventorySystem);
  window.inventorySystem = inventorySystem;
  console.log('[Inventory] ✓ Inventory system initialized - ' + playerInventory.size + ' slots');
})();
