/* ============================================================
 *  world_items.js  –  Items placed in the game world
 *  ============================================================
 *  Manages items that exist on the map: placed by editor, dropped
 *  by player, or spawned by game logic.  Players can pick up
 *  items with E and throw held items with T.
 *
 *  Engine.register('worldItems', worldItemSystem)
 *  ============================================================ */
(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────
  var _items = [];        // Array of WorldItem objects
  var _nextId = 1;
  var _spriteCache = {};  // spritePath → p5 Image
  var _pickupRange = 1.2; // meters - how close to pick up
  var _nearbyItem = null; // closest item in range (for prompt)

  // Physics
  var _gravity    = 0.0015;   // m/frame² (gentle)
  var _friction   = 0.92;     // velocity decay per frame
  var _throwSpeed = 0.12;     // m/frame initial speed
  var _bounceDecay = 0.4;     // velocity kept after bounce

  // Visual
  var _bobAmplitude = 2;   // pixels
  var _bobSpeed     = 0.04; // radians/frame
  var _shadowAlpha  = 60;

  // ── WorldItem factory ──────────────────────────────────────
  function _createWorldItem(itemId, x, y, quantity, vx, vy) {
    var items = Engine.get('items');
    var def = items ? items.get(itemId) : null;
    if (!def) {
      console.warn('[WorldItems] Unknown item:', itemId);
      return null;
    }

    var wi = {
      id:       _nextId++,
      itemId:   itemId,
      x:        x,           // meters (world space)
      y:        y,
      quantity: quantity || 1,
      vx:       vx || 0,     // meters/frame
      vy:       vy || 0,
      grounded: (vx === 0 && vy === 0) ? true : false,
      sprite:   null,
      bobTimer: Math.random() * Math.PI * 2,  // random phase
      flashTimer: 0,   // pickup flash feedback
      def:      def
    };

    // Load sprite if available
    if (def.spritePath && !_spriteCache[def.spritePath]) {
      _spriteCache[def.spritePath] = loadImage(def.spritePath,
        function () { /* loaded */ },
        function () { _spriteCache[def.spritePath] = null; }
      );
    }
    if (def.spritePath) wi.sprite = _spriteCache[def.spritePath];

    return wi;
  }

  // ── Place/Spawn ────────────────────────────────────────────
  function placeItem(itemId, x, y, quantity) {
    var wi = _createWorldItem(itemId, x, y, quantity, 0, 0);
    if (!wi) return null;
    wi.grounded = true;
    _items.push(wi);
    Engine.emit('worldItem.placed', { id: wi.id, itemId: itemId, x: x, y: y });
    console.log('[WorldItems] Placed', itemId, 'at', x.toFixed(1), y.toFixed(1));
    return wi;
  }

  function dropItem(itemId, x, y, quantity) {
    // Drop with small random scatter
    var angle = Math.random() * Math.PI * 2;
    var speed = 0.02 + Math.random() * 0.03;
    var wi = _createWorldItem(itemId, x, y, quantity, Math.cos(angle) * speed, Math.sin(angle) * speed);
    if (!wi) return null;
    _items.push(wi);
    Engine.emit('worldItem.dropped', { id: wi.id, itemId: itemId, x: x, y: y });
    return wi;
  }

  function throwItem(itemId, x, y, quantity, dirX, dirY) {
    var len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len === 0) { dirX = 0; dirY = 1; len = 1; }
    var vx = (dirX / len) * _throwSpeed;
    var vy = (dirY / len) * _throwSpeed;
    var wi = _createWorldItem(itemId, x, y, quantity, vx, vy);
    if (!wi) return null;
    _items.push(wi);
    Engine.emit('worldItem.thrown', { id: wi.id, itemId: itemId, x: x, y: y });
    console.log('[WorldItems] Thrown', itemId, 'dir', dirX.toFixed(2), dirY.toFixed(2));
    return wi;
  }

  function removeItem(id) {
    for (var i = _items.length - 1; i >= 0; i--) {
      if (_items[i].id === id) {
        _items.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  // ── Pickup ─────────────────────────────────────────────────
  function getNearbyItem(px, py) {
    var closest = null;
    var closestDist = _pickupRange;
    for (var i = 0; i < _items.length; i++) {
      var wi = _items[i];
      var dx = wi.x - px;
      var dy = wi.y - py;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = wi;
      }
    }
    return closest;
  }

  function tryPickup(px, py) {
    var wi = getNearbyItem(px, py);
    if (!wi) return false;

    var inv = Engine.get('inventory');
    if (!inv || !inv.player) return false;

    var added = inv.player.addItem(wi.itemId, wi.quantity);
    if (added <= 0) {
      console.log('[WorldItems] Inventory full, cannot pick up', wi.itemId);
      return false;
    }

    // Remove from world
    Engine.emit('worldItem.pickedUp', { id: wi.id, itemId: wi.itemId, quantity: added, x: wi.x, y: wi.y });
    removeItem(wi.id);
    console.log('[WorldItems] Picked up', wi.itemId, 'x' + added);
    return true;
  }

  // ── Throw from inventory ───────────────────────────────────
  function throwFromInventory(slotIndex, px, py, facingDir) {
    var inv = Engine.get('inventory');
    if (!inv || !inv.player) return false;

    var slot = inv.player.slots[slotIndex];
    if (!slot) return false;

    var itemId = slot.itemId;
    // Remove 1 from inventory
    var removed = inv.player.removeItem(itemId, 1);
    if (removed <= 0) return false;

    // Direction from player facing
    var dirs = { north: { x: 0, y: -1 }, south: { x: 0, y: 1 },
                 east: { x: 1, y: 0 }, west: { x: -1, y: 0 } };
    var d = dirs[facingDir] || dirs.south;

    // Spawn slightly in front of player
    var spawnX = px + d.x * 0.5;
    var spawnY = py + d.y * 0.5;

    throwItem(itemId, spawnX, spawnY, 1, d.x, d.y);
    return true;
  }

  // ── Physics update ─────────────────────────────────────────
  function update() {
    for (var i = _items.length - 1; i >= 0; i--) {
      var wi = _items[i];

      // Bob animation (only when grounded)
      if (wi.grounded) {
        wi.bobTimer += _bobSpeed;
        continue;
      }

      // Apply velocity
      wi.x += wi.vx;
      wi.y += wi.vy;

      // Friction
      wi.vx *= _friction;
      wi.vy *= _friction;

      // Check if tile blocks movement (bounce off walls)
      if (typeof tileSystem !== 'undefined' && typeof tileBlocksMovement === 'function') {
        var gx = Math.floor(wi.x);
        var gy = Math.floor(wi.y);
        if (tileBlocksMovement(gx, gy)) {
          wi.vx *= -_bounceDecay;
          wi.vy *= -_bounceDecay;
          wi.x += wi.vx * 2; // push back
          wi.y += wi.vy * 2;
        }
      }

      // World bounds
      if (typeof WORLD_WIDTH !== 'undefined') {
        wi.x = Math.max(0, Math.min(WORLD_WIDTH, wi.x));
        wi.y = Math.max(0, Math.min(WORLD_HEIGHT, wi.y));
      }

      // Come to rest
      if (Math.abs(wi.vx) < 0.001 && Math.abs(wi.vy) < 0.001) {
        wi.vx = 0;
        wi.vy = 0;
        wi.grounded = true;
      }
    }

    // Update nearby detection (game mode only)
    if (!window.editMode && typeof player !== 'undefined') {
      _nearbyItem = getNearbyItem(player.x, player.y);
    } else {
      _nearbyItem = null;
    }
  }

  // ── Render ─────────────────────────────────────────────────
  function render() {
    if (_items.length === 0) return;
    var gs = typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32;

    for (var i = 0; i < _items.length; i++) {
      var wi = _items[i];
      var sx = wi.x * gs;  // world→pixel (camera transform applied by engine)
      var sy = wi.y * gs;

      var bobOffset = 0;
      if (wi.grounded) {
        bobOffset = Math.sin(wi.bobTimer) * _bobAmplitude;
      }

      var itemSize = gs * 0.6; // 60% of a tile

      // Shadow
      push();
      noStroke();
      fill(0, 0, 0, _shadowAlpha);
      ellipse(sx, sy + itemSize * 0.1, itemSize * 0.7, itemSize * 0.2);
      pop();

      // Item visual
      push();
      translate(sx, sy - bobOffset);

      // Highlight if nearby (game mode)
      if (_nearbyItem && _nearbyItem.id === wi.id && !window.editMode) {
        // Glow outline
        noFill();
        stroke(255, 255, 100, 150);
        strokeWeight(2);
        ellipse(0, 0, itemSize + 6, itemSize + 6);
        noStroke();
      }

      // Draw sprite or icon
      var spriteImg = wi.sprite || (wi.def.spritePath ? _spriteCache[wi.def.spritePath] : null);
      if (spriteImg && spriteImg.width > 0) {
        imageMode(CENTER);
        image(spriteImg, 0, 0, itemSize, itemSize);
      } else {
        // Emoji fallback - draw icon text
        textAlign(CENTER, CENTER);
        textSize(itemSize * 0.7);
        text(wi.def.icon || '📦', 0, 0);
      }

      // Quantity badge
      if (wi.quantity > 1) {
        fill(0, 0, 0, 180);
        noStroke();
        var badgeW = 14;
        var badgeH = 12;
        rect(itemSize * 0.15, -itemSize * 0.35, badgeW, badgeH, 3);
        fill(255);
        textSize(9);
        textAlign(CENTER, CENTER);
        text(wi.quantity, itemSize * 0.15 + badgeW / 2, -itemSize * 0.35 + badgeH / 2);
      }

      pop();
    }

    // Pickup prompt (game mode)
    if (_nearbyItem && !window.editMode) {
      _drawPickupPrompt(_nearbyItem);
    }

    // Editor mode: show item placement preview
    if (window.editMode) {
      _drawEditorPreview();
    }
  }

  function _drawPickupPrompt(wi) {
    var gs = typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32;
    var sx = wi.x * gs;
    var sy = wi.y * gs;

    push();
    textAlign(CENTER, CENTER);
    textSize(11);
    fill(255, 255, 255, 220);
    stroke(0, 0, 0, 150);
    strokeWeight(2);
    var label = '[E] Pick up ' + (wi.def.displayName || wi.itemId);
    if (wi.quantity > 1) label += ' x' + wi.quantity;
    text(label, sx, sy - 28);
    pop();
  }

  function _drawEditorPreview() {
    // Draw a ghost preview of the selected item at mouse cursor
    if (typeof itemPanelState === 'undefined' || !itemPanelState.isOpen || !itemPanelState.selectedItem) return;
    if (typeof selectionTool !== 'undefined' && selectionTool.mode !== 'item') return;

    var items = Engine.get('items');
    if (!items) return;
    var def = items.get(itemPanelState.selectedItem);
    if (!def) return;

    var gs = typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32;
    // Convert mouse to world position
    if (typeof screenToWorld !== 'function') return;
    var world = screenToWorld(mouseX, mouseY);
    var sx = world.x * gs;
    var sy = world.y * gs;
    var itemSize = gs * 0.6;

    push();
    tint(255, 150);  // semi-transparent

    var spriteImg = def.spritePath ? _spriteCache[def.spritePath] : null;
    if (spriteImg && spriteImg.width > 0) {
      imageMode(CENTER);
      image(spriteImg, sx, sy, itemSize, itemSize);
    } else {
      textAlign(CENTER, CENTER);
      textSize(itemSize * 0.7);
      fill(255, 255, 255, 150);
      text(def.icon || '📦', sx, sy);
    }

    noTint();
    pop();
  }

  // ── Accessors ──────────────────────────────────────────────
  function getAll() { return _items; }
  function getById(id) {
    for (var i = 0; i < _items.length; i++) {
      if (_items[i].id === id) return _items[i];
    }
    return null;
  }
  function getAt(x, y, radius) {
    radius = radius || 0.5;
    var results = [];
    for (var i = 0; i < _items.length; i++) {
      var dx = _items[i].x - x;
      var dy = _items[i].y - y;
      if (Math.sqrt(dx * dx + dy * dy) < radius) results.push(_items[i]);
    }
    return results;
  }
  function getNearby() { return _nearbyItem; }
  function count() { return _items.length; }

  // ── Save / Load ────────────────────────────────────────────
  function getForSave() {
    return _items.map(function (wi) {
      return {
        itemId:   wi.itemId,
        x:        wi.x,
        y:        wi.y,
        quantity: wi.quantity
      };
    });
  }

  function loadFromSave(data) {
    clearAll();
    if (!Array.isArray(data)) return;
    for (var i = 0; i < data.length; i++) {
      var d = data[i];
      placeItem(d.itemId, d.x, d.y, d.quantity);
    }
    console.log('[WorldItems] Loaded', _items.length, 'items from save');
  }

  function clearAll() {
    _items = [];
    _nextId = 1;
    _nearbyItem = null;
  }

  // ── Editor: remove item at position ────────────────────────
  function removeAt(x, y) {
    var closest = null;
    var closestDist = 0.8; // 0.8m tolerance for editor click
    for (var i = 0; i < _items.length; i++) {
      var dx = _items[i].x - x;
      var dy = _items[i].y - y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = _items[i];
      }
    }
    if (closest) {
      Engine.emit('worldItem.removed', { id: closest.id, itemId: closest.itemId, x: closest.x, y: closest.y });
      removeItem(closest.id);
      return true;
    }
    return false;
  }

  // ── Public API ─────────────────────────────────────────────
  var worldItemSystem = {
    update:      update,
    render:      render,
    placeItem:   placeItem,
    dropItem:    dropItem,
    throwItem:   throwItem,
    removeItem:  removeItem,
    removeAt:    removeAt,
    tryPickup:   tryPickup,
    throwFromInventory: throwFromInventory,
    getNearbyItem: getNearbyItem,
    getNearby:   getNearby,
    getAll:      getAll,
    getById:     getById,
    getAt:       getAt,
    count:       count,
    getForSave:  getForSave,
    loadFromSave: loadFromSave,
    clearAll:    clearAll
  };

  Engine.register('worldItems', worldItemSystem);
  window.worldItemSystem = worldItemSystem;

  // Legacy-style global helpers
  window.placeWorldItem   = placeItem;
  window.dropWorldItem    = dropItem;
  window.throwWorldItem   = throwItem;
  window.removeWorldItem  = removeItem;
  window.drawWorldItems   = render;
  window.updateWorldItems = update;

  console.log('[WorldItems] ✓ World item system initialized');
})();
