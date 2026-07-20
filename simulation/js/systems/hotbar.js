/* ============================================================
 *  hotbar.js  –  Quick-access slots, item use/consume, equip
 *  ============================================================
 *  5 hotbar slots (keys 1–5) drawn at bottom-center of screen.
 *  Active slot determines what the player uses / throws.
 *
 *  Item Use/Consume:
 *    Press E (USE_ITEM) with active hotbar item → applies effect:
 *      - CONSUMABLE food → restores hunger/thirst + disappears
 *      - MEDICAL items   → heals HP + disappears
 *      - EQUIPPABLE      → equips/unequips to appropriate slot
 *
 *  Item Equip:
 *    Equipping a weapon changes combat damage.
 *    Equipping armor would change defense (future).
 *    Active equip shown with colored border on hotbar.
 *
 *  Engine.register('hotbar', hotbarSystem)
 *  ============================================================ */
(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  var NUM_SLOTS    = 5;
  var SLOT_SIZE    = 44;
  var SLOT_GAP     = 4;
  var BAR_PADDING  = 8;
  var BAR_Y_OFFSET = 10;  // px from bottom
  var KEY_LABELS   = ['1', '2', '3', '4', '5'];

  // ── State ──────────────────────────────────────────────────
  var _activeSlot = 0;         // 0-4
  var _slots = new Array(NUM_SLOTS).fill(null); // inventory slot indices (0..19) or null
  var _useFlash = 0;           // visual feedback timer
  var _equipFlash = 0;         // equip feedback timer

  // ── Initialization ─────────────────────────────────────────
  function init() {
    // Auto-assign first 5 inventory slots to hotbar
    for (var i = 0; i < NUM_SLOTS; i++) {
      _slots[i] = i; // hotbar slot i → inventory slot i
    }
    console.log('[Hotbar] ✓ Initialized with', NUM_SLOTS, 'slots');
  }

  // ── Slot Management ────────────────────────────────────────
  function getActiveSlot() { return _activeSlot; }

  function setActiveSlot(index) {
    if (index < 0 || index >= NUM_SLOTS) return;
    _activeSlot = index;
    Engine.emit('hotbar.slotChanged', { slot: index });
  }

  function getActiveStack() {
    var inv = Engine.get('inventory');
    if (!inv) return null;
    var invSlot = _slots[_activeSlot];
    if (invSlot == null) return null;
    return inv.player.slots[invSlot] || null;
  }

  function getActiveItemDef() {
    var stack = getActiveStack();
    if (!stack) return null;
    var items = Engine.get('items');
    return items ? items.get(stack.itemId) : null;
  }

  // Get the inventory slot index mapped to a hotbar slot
  function getInventorySlotIndex(hotbarSlot) {
    if (hotbarSlot < 0 || hotbarSlot >= NUM_SLOTS) return -1;
    return _slots[hotbarSlot] != null ? _slots[hotbarSlot] : -1;
  }

  // Assign an inventory slot to a hotbar position
  function assignSlot(hotbarSlot, inventorySlot) {
    if (hotbarSlot < 0 || hotbarSlot >= NUM_SLOTS) return;
    _slots[hotbarSlot] = inventorySlot;
  }

  // ── Item Use / Consume ─────────────────────────────────────
  function useActiveItem() {
    var stack = getActiveStack();
    if (!stack) return false;

    var items = Engine.get('items');
    var def = items ? items.get(stack.itemId) : null;
    if (!def) return false;

    // Not usable?
    if (!def.usable) {
      Engine.emit('hotbar.cantUse', { itemId: stack.itemId, reason: 'not usable' });
      return false;
    }

    var consumed = false;

    // ── EQUIPPABLE items → toggle equip ──
    if (def.equippable && def.equipSlot) {
      toggleEquip(stack, def);
      return true;
    }

    // ── MEDICAL items → heal ──
    if (def.flags && def.flags.indexOf('MEDICAL') !== -1) {
      var healAmt = (def.properties && def.properties.healAmount) || 0;
      if (healAmt > 0 && typeof heal === 'function') {
        heal(healAmt);
        Engine.emit('item.healed', { itemId: stack.itemId, amount: healAmt });
        consumed = true;
      }
    }

    // ── FOOD / DRINK → survival stats ──
    if (def.flags && (def.flags.indexOf('FOOD') !== -1 ||
        def.flags.indexOf('DRINK') !== -1 ||
        (def.flags.indexOf('CONSUMABLE') !== -1 && !consumed))) {
      var survival = Engine.get('survival');
      if (survival) {
        survival.consume(stack.itemId);
      }
      // If item has healAmount too (e.g. food that also heals), apply it
      if (!consumed && def.properties && def.properties.healAmount) {
        if (typeof heal === 'function') {
          heal(def.properties.healAmount);
        }
      }
      consumed = true;
    }

    // Fallback: any usable + consumable flag → just consume
    if (!consumed && def.flags && def.flags.indexOf('CONSUMABLE') !== -1) {
      consumed = true;
    }

    if (consumed) {
      // Remove 1 from inventory
      var inv = Engine.get('inventory');
      if (inv) {
        var invSlot = _slots[_activeSlot];
        if (invSlot != null && inv.player.slots[invSlot]) {
          inv.player.slots[invSlot].quantity -= 1;
          if (inv.player.slots[invSlot].quantity <= 0) {
            inv.player.slots[invSlot] = null;
          }
          Engine.emit('inventory.changed', { container: 'player', itemId: stack.itemId, used: 1 });
        }
      }
      _useFlash = 0.3;
      Engine.emit('item.consumed', { itemId: stack.itemId, def: def });

      // Audio feedback
      var audio = Engine.get('audio');
      if (audio) audio.play('ui_confirm');

      // Notification
      if (typeof gameUILayer !== 'undefined' && gameUILayer.notify) {
        gameUILayer.notify('Used ' + def.displayName, 1.5, [100, 255, 100]);
      }

      return true;
    }

    return false;
  }

  // ── Equip / Unequip ────────────────────────────────────────
  function toggleEquip(stack, def) {
    var inv = Engine.get('inventory');
    if (!inv) return;

    var slot = def.equipSlot;
    var current = inv.getEquipped(slot);

    if (current && current.itemId === stack.itemId) {
      // Unequip
      inv.equip(slot, null);
      _equipFlash = 0.3;

      Engine.emit('item.unequipped', { itemId: stack.itemId, slot: slot });

      if (typeof gameUILayer !== 'undefined' && gameUILayer.notify) {
        gameUILayer.notify('Unequipped ' + def.displayName, 1.5, [255, 200, 100]);
      }

      // Re-register weapon damage
      if (slot === 'weapon') {
        _updateWeaponDamage(null);
      }
    } else {
      // Equip - put old item back (if any) by just overwriting slot ref
      inv.equip(slot, { itemId: stack.itemId, quantity: 1, condition: stack.condition || 100, data: stack.data || {} });
      _equipFlash = 0.3;

      Engine.emit('item.equipped', { itemId: stack.itemId, slot: slot, def: def });

      if (typeof gameUILayer !== 'undefined' && gameUILayer.notify) {
        gameUILayer.notify('Equipped ' + def.displayName, 1.5, [100, 200, 255]);
      }

      // Update weapon damage in combat system
      if (slot === 'weapon') {
        _updateWeaponDamage(def);
      }
    }
  }

  function _updateWeaponDamage(def) {
    var combat = Engine.get('combat');
    if (!combat) return;
    if (def && def.properties && def.properties.damage) {
      combat.registerWeapon(def.id, def.properties.damage);
    }
  }

  function isEquipped(itemId) {
    var inv = Engine.get('inventory');
    if (!inv) return false;
    var all = inv.getAllEquipped();
    for (var k in all) {
      if (all[k] && all[k].itemId === itemId) return true;
    }
    return false;
  }

  // ── Throw from active slot ─────────────────────────────────
  function throwActiveItem() {
    if (typeof player === 'undefined') return false;
    var invSlot = _slots[_activeSlot];
    if (invSlot == null) return false;

    var worldItems = Engine.get('worldItems');
    if (!worldItems) return false;

    var facing = player.direction || 'south';
    return worldItems.throwFromInventory(invSlot, player.x, player.y, facing);
  }

  // ── Update ─────────────────────────────────────────────────
  function update(dt) {
    if (_useFlash > 0)   _useFlash   = Math.max(0, _useFlash - dt);
    if (_equipFlash > 0) _equipFlash = Math.max(0, _equipFlash - dt);
  }

  // ── Render ─────────────────────────────────────────────────
  function render() {
    // Only show in game mode
    if (typeof editMode !== 'undefined' && editMode) return;

    var inv = Engine.get('inventory');
    var items = Engine.get('items');
    if (!inv || !items) return;

    var totalW = NUM_SLOTS * (SLOT_SIZE + SLOT_GAP) - SLOT_GAP + BAR_PADDING * 2;
    var totalH = SLOT_SIZE + BAR_PADDING * 2;
    var barX = (width - totalW) / 2;
    var barY = height - totalH - BAR_Y_OFFSET;

    push();
    resetMatrix();

    // Bar background
    fill(20, 20, 25, 200);
    stroke(60, 60, 70);
    strokeWeight(2);
    rect(barX, barY, totalW, totalH, 6);

    for (var i = 0; i < NUM_SLOTS; i++) {
      var sx = barX + BAR_PADDING + i * (SLOT_SIZE + SLOT_GAP);
      var sy = barY + BAR_PADDING;

      var invSlotIdx = _slots[i];
      var stack = (invSlotIdx != null && inv.player.slots[invSlotIdx]) ? inv.player.slots[invSlotIdx] : null;
      var def = stack ? items.get(stack.itemId) : null;

      // Slot background
      if (i === _activeSlot) {
        // Active slot highlight
        if (_useFlash > 0) {
          fill(100, 255, 100, 180); // green flash on use
        } else {
          fill(50, 90, 160, 220);
        }
        stroke(100, 170, 255);
        strokeWeight(2);
      } else {
        fill(40, 40, 45, 200);
        stroke(70, 70, 80);
        strokeWeight(1);
      }
      rect(sx, sy, SLOT_SIZE, SLOT_SIZE, 4);

      // Equipped indicator (colored inner border)
      if (stack && isEquipped(stack.itemId)) {
        noFill();
        stroke(255, 200, 50, 200);
        strokeWeight(2);
        rect(sx + 2, sy + 2, SLOT_SIZE - 4, SLOT_SIZE - 4, 3);
      }

      // Item icon
      if (def) {
        noStroke();
        fill(255);
        textSize(22);
        textAlign(CENTER, CENTER);
        text(def.icon, sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2 - 1);

        // Quantity badge
        if (stack.quantity > 1) {
          fill(0, 0, 0, 180);
          noStroke();
          rect(sx + SLOT_SIZE - 16, sy + SLOT_SIZE - 14, 15, 13, 3);
          fill(255);
          textSize(10);
          textAlign(CENTER, CENTER);
          text(stack.quantity, sx + SLOT_SIZE - 8, sy + SLOT_SIZE - 8);
        }
      }

      // Key label (1-5)
      noStroke();
      fill(160, 160, 170, i === _activeSlot ? 255 : 150);
      textSize(9);
      textAlign(LEFT, TOP);
      text(KEY_LABELS[i], sx + 3, sy + 2);
    }

    // Active item name below bar
    var activeDef = getActiveItemDef();
    if (activeDef) {
      noStroke();
      fill(220, 220, 230);
      textSize(12);
      textAlign(CENTER, TOP);
      var label = activeDef.displayName;
      if (isEquipped(activeDef.id)) {
        label += ' [EQUIPPED]';
      }
      text(label, width / 2, barY + totalH + 4);
    }

    pop();
  }

  // ── Save / Load ────────────────────────────────────────────
  function getForSave() {
    return {
      activeSlot: _activeSlot,
      slots: _slots.slice()
    };
  }

  function loadFromSave(data) {
    if (!data) return;
    if (data.activeSlot != null) _activeSlot = data.activeSlot;
    if (Array.isArray(data.slots)) {
      for (var i = 0; i < NUM_SLOTS; i++) {
        _slots[i] = (i < data.slots.length) ? data.slots[i] : i;
      }
    }
  }

  // Initialize on load
  init();

  // ── Public API ─────────────────────────────────────────────
  var hotbarSystem = {
    update:          update,
    render:          render,
    getActiveSlot:   getActiveSlot,
    setActiveSlot:   setActiveSlot,
    getActiveStack:  getActiveStack,
    getActiveItemDef: getActiveItemDef,
    getInventorySlotIndex: getInventorySlotIndex,
    assignSlot:      assignSlot,
    useActiveItem:   useActiveItem,
    throwActiveItem: throwActiveItem,
    toggleEquip:     toggleEquip,
    isEquipped:      isEquipped,
    getForSave:      getForSave,
    loadFromSave:    loadFromSave,
    NUM_SLOTS:       NUM_SLOTS
  };

  Engine.register('hotbar', hotbarSystem);
  window.hotbarSystem = hotbarSystem;
  console.log('[Hotbar] ✓ Hotbar system loaded - keys 1-5 to select, E to use');
})();
