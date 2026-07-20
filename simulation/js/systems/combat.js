/* ============================================================
 *  combat.js  –  POC Melee combat
 *  ============================================================
 *  Press F to attack. Damage = weapon base + strength bonus.
 *  Checks range against nearby entities. Cooldown between swings.
 *  ============================================================ */
(function () {
  'use strict';

  var ATTACK_RANGE   = 1.5; // meters (1.5 tiles)
  var COOLDOWN       = 0.5; // seconds
  var BASE_DAMAGE    = 5;
  var _cooldownTimer = 0;
  var _attackAnim    = 0;   // simple flash timer

  // Weapon damage lookup
  var _weaponDamage = {
    knife: 10,
    axe:   15,
    rock:  8,
    stick: 6
  };

  function registerWeapon(itemId, dmg) {
    _weaponDamage[itemId] = dmg;
  }

  function getWeaponDamage() {
    var inv = Engine.get('inventory');
    if (!inv) return BASE_DAMAGE;
    var wpn = inv.getEquipped('weapon');
    if (!wpn) return BASE_DAMAGE; // fist damage

    // Check hardcoded lookup first
    if (_weaponDamage[wpn.itemId]) return _weaponDamage[wpn.itemId];

    // Fallback: read from item definition
    var items = Engine.get('items');
    if (items) {
      var def = items.get(wpn.itemId);
      if (def && def.properties && def.properties.damage) {
        _weaponDamage[wpn.itemId] = def.properties.damage; // cache it
        return def.properties.damage;
      }
    }

    return BASE_DAMAGE;
  }

  function attack() {
    if (_cooldownTimer > 0) return false;

    var dmg = getWeaponDamage();

    // Bonus from character system if present
    var charSys = Engine.get('character');
    if (charSys) {
      dmg += Math.floor((charSys.getStat('strength') || 0) * 0.5);
    }

    // Find targets in range
    var targets = findTargetsInRange();
    var hit = false;

    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.health != null) {
        // Use entity system's damage() for proper health tracking
        var entitySys = Engine.get('entities');
        if (entitySys && t.id != null) {
          entitySys.damage(t.id, dmg, 'player');
          var remaining = (t.health && t.health.current != null) ? t.health.current : 0;
          Engine.emit('combat.hit', { target: t, damage: dmg, remaining: remaining });
          if (remaining <= 0) {
            Engine.emit('combat.killed', { target: t, damage: dmg });
          }
        } else {
          // Fallback for non-entity targets (health as number)
          t.health = Math.max(0, t.health - dmg);
          Engine.emit('combat.hit', { target: t, damage: dmg, remaining: t.health });
          if (t.health <= 0) {
            Engine.emit('combat.killed', { target: t, damage: dmg });
          }
        }
        hit = true;
        break; // hit one target per swing
      }
    }

    if (!hit) {
      Engine.emit('combat.miss', { damage: dmg });
    }

    _cooldownTimer = COOLDOWN;
    _attackAnim = 0.15;
    return hit;
  }

  function findTargetsInRange() {
    if (typeof player === 'undefined') return [];
    var results = [];
    var entitySys = Engine.get('entities');

    // Check entity system if available
    if (entitySys && entitySys.getAll) {
      var all = entitySys.getAll();
      for (var i = 0; i < all.length; i++) {
        var e = all[i];
        var dx = (e.x || 0) - player.x;
        var dy = (e.y || 0) - player.y;
        if (Math.sqrt(dx * dx + dy * dy) <= ATTACK_RANGE) {
          results.push(e);
        }
      }
    }

    // Also check global entities array if it exists
    if (typeof entities !== 'undefined' && Array.isArray(entities)) {
      for (var j = 0; j < entities.length; j++) {
        var ent = entities[j];
        if (results.indexOf(ent) !== -1) continue;
        var ex = (ent.x || 0) - player.x;
        var ey = (ent.y || 0) - player.y;
        if (Math.sqrt(ex * ex + ey * ey) <= ATTACK_RANGE) {
          results.push(ent);
        }
      }
    }

    return results;
  }

  function update(dt) {
    if (_cooldownTimer > 0) _cooldownTimer = Math.max(0, _cooldownTimer - dt);
    if (_attackAnim > 0) _attackAnim = Math.max(0, _attackAnim - dt);
  }

  function render() {
    // Simple visual feedback - flash circle around player on attack
    if (_attackAnim > 0 && typeof player !== 'undefined') {
      push();
      noFill();
      stroke(255, 80, 80, map(_attackAnim, 0, 0.15, 0, 200));
      strokeWeight(2);
      var rangeInPx = ATTACK_RANGE * GRID_SIZE;
      ellipse(player.x, player.y, rangeInPx * 2, rangeInPx * 2);
      pop();
    }
  }

  function isOnCooldown() { return _cooldownTimer > 0; }

  // ── Public API ─────────────────────────────────────────────
  var combatSystem = {
    attack: attack,
    update: update,
    render: render,
    getWeaponDamage: getWeaponDamage,
    registerWeapon: registerWeapon,
    isOnCooldown: isOnCooldown,
    ATTACK_RANGE: ATTACK_RANGE
  };

  Engine.register('combat', combatSystem);
  window.combatSystem = combatSystem;
  console.log('[Combat] ✓ Combat system initialized - press F to attack');
})();
