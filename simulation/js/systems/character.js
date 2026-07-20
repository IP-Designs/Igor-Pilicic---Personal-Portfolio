/* ============================================================
 *  character.js  –  POC XP, Levels & Stats
 *  ============================================================
 *  Gain XP → level up → stat bonuses.
 *  Stats: strength, agility, endurance, intellect.
 *  Other systems read stats via getStat().
 *  ============================================================ */
(function () {
  'use strict';

  var _xp    = 0;
  var _level = 1;
  var _stats = { strength: 1, agility: 1, endurance: 1, intellect: 1 };
  var _statPoints = 0;  // unspent points from leveling

  function xpForLevel(lvl) {
    return Math.floor(80 * Math.pow(lvl, 1.5)); // 80, 226, 415, 640 ...
  }

  function addXP(amount) {
    _xp += amount;
    var needed = xpForLevel(_level);
    while (_xp >= needed) {
      _xp -= needed;
      _level++;
      _statPoints += 2;
      Engine.emit('character.levelup', { level: _level, statPoints: _statPoints });
      needed = xpForLevel(_level);
    }
    Engine.emit('character.xp', { xp: _xp, level: _level, needed: xpForLevel(_level) });
  }

  function spendPoint(statName) {
    if (_statPoints <= 0) return false;
    if (_stats[statName] == null) return false;
    _stats[statName]++;
    _statPoints--;
    Engine.emit('character.statChanged', { stat: statName, value: _stats[statName], remaining: _statPoints });
    return true;
  }

  function getStat(name) { return _stats[name] || 0; }
  function getLevel() { return _level; }
  function getXP() { return _xp; }
  function getXPNeeded() { return xpForLevel(_level); }
  function getStatPoints() { return _statPoints; }
  function getAllStats() { return { strength: _stats.strength, agility: _stats.agility, endurance: _stats.endurance, intellect: _stats.intellect }; }

  function getForSave() {
    return { xp: _xp, level: _level, stats: Object.assign({}, _stats), statPoints: _statPoints };
  }

  function loadFromSave(data) {
    if (!data) return;
    _xp = data.xp || 0;
    _level = data.level || 1;
    _statPoints = data.statPoints || 0;
    if (data.stats) {
      _stats.strength  = data.stats.strength  || 1;
      _stats.agility   = data.stats.agility   || 1;
      _stats.endurance = data.stats.endurance || 1;
      _stats.intellect = data.stats.intellect || 1;
    }
  }

  function reset() {
    _xp = 0; _level = 1; _statPoints = 0;
    _stats = { strength: 1, agility: 1, endurance: 1, intellect: 1 };
  }

  // Grant XP on kill
  Engine.on('combat.killed', function (e) {
    addXP(e.target.xpReward || 10);
  });

  // ── Public API ─────────────────────────────────────────────
  var characterSystem = {
    addXP: addXP,
    spendPoint: spendPoint,
    getStat: getStat,
    getLevel: getLevel,
    getXP: getXP,
    getXPNeeded: getXPNeeded,
    getStatPoints: getStatPoints,
    getAllStats: getAllStats,
    getForSave: getForSave,
    loadFromSave: loadFromSave,
    reset: reset
  };

  Engine.register('character', characterSystem);
  window.characterSystem = characterSystem;
  console.log('[Character] ✓ Character system initialized - Level ' + _level);
})();
