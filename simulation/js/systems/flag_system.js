// ============================================
// FLAG SYSTEM - Centralized tile flag checking
// Provides consistent flag-based behavior across the engine
// ============================================

// Flag system debug mode - set to true to trace flag checks in console
let _flagSystemDebug = false;

/**
 * Internal helper: check if a tile has a flags array defined (via definition or baked properties).
 * When a flags array exists, the new flag system is authoritative and legacy
 * properties (walkable, blocksVision, category checks) should NOT override it.
 */
function _tileHasFlagsArray(tile) {
  if (!tile) return false;
  // Check baked properties first
  if (tile.properties && Array.isArray(tile.properties.flags) && tile.properties.flags.length >= 0) {
    return true;
  }
  // Check live definition
  if (tile.type && typeof getTileDefinition === 'function') {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef && Array.isArray(tileDef.flags)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a tile has a specific flag
 * Checks BOTH live definition AND baked properties - returns true if EITHER has the flag.
 * This ensures flags work even when definitions are stale (old saves) or when
 * properties were updated but definitions not yet reloaded.
 * @param {Object} tile - The tile object (with properties.flags array)
 * @param {string} flag - The flag to check for
 * @returns {boolean} True if tile has the flag
 */
function tileHasFlag(tile, flag) {
  if (!tile) return false;
  
  let result = false;
  
  // Check live tile definition (authoritative source for flags)
  if (tile.type && typeof getTileDefinition === 'function') {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef && tileDef.flags && Array.isArray(tileDef.flags)) {
      if (tileDef.flags.includes(flag)) {
        result = true;
      }
    }
  }
  
  // ALSO check tile's own baked properties (catches flags from saves/manual edits)
  if (!result && tile.properties && tile.properties.flags && Array.isArray(tile.properties.flags)) {
    if (tile.properties.flags.includes(flag)) {
      result = true;
    }
  }
  
  if (_flagSystemDebug && result) {
    console.log(`[FLAG] tileHasFlag(${tile.type}, '${flag}') = ${result}`);
  }
  
  return result;
}

/**
 * Check if a tile blocks movement (BLOCKS_MOVEMENT flag or legacy walkable=false)
 * When a tile has a flags array, flags are AUTHORITATIVE - legacy properties are ignored.
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile blocks movement
 */
function tileBlocksMovement(tile) {
  if (!tile) return false;
  
  // New flag system
  if (tileHasFlag(tile, 'BLOCKS_MOVEMENT')) {
    return true;
  }
  
  // Legacy: SOLID flag (deprecated, but support for now)
  if (tileHasFlag(tile, 'SOLID')) {
    return true;
  }
  
  // If tile has a flags array (new system), flags are authoritative - skip legacy fallbacks
  if (_tileHasFlagsArray(tile)) {
    return false;
  }
  
  // Legacy fallback (no flags array): walkable property
  if (tile.properties && tile.properties.walkable === false) {
    return true;
  }
  
  // Legacy fallback (no flags array): check tile definition for walkable
  if (tile.type && typeof getTileDefinition === 'function') {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef && tileDef.walkable === false) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a tile blocks light (BLOCKS_LIGHT flag or legacy blocksVision)
 * When a tile has a flags array, flags are AUTHORITATIVE - legacy properties are ignored.
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile blocks light
 */
function tileBlocksLight(tile) {
  if (!tile) return false;
  
  // New flag system
  if (tileHasFlag(tile, 'BLOCKS_LIGHT')) {
    return true;
  }
  
  // If tile has a flags array (new system), flags are authoritative - skip legacy fallbacks
  if (_tileHasFlagsArray(tile)) {
    return false;
  }
  
  // Legacy fallback (no flags array): blocksVision property
  if (tile.properties && tile.properties.blocksVision) {
    return true;
  }
  
  // Legacy fallback (no flags array): OBSTACLES category tiles block light
  if (tile.category === 'OBSTACLES') {
    return true;
  }
  
  return false;
}

/**
 * Check if a tile blocks projectiles (BLOCKS_PROJECTILES flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile blocks projectiles
 */
function tileBlocksProjectiles(tile) {
  if (!tile) return false;
  
  // New flag system
  if (tileHasFlag(tile, 'BLOCKS_PROJECTILES')) {
    return true;
  }
  
  // Fallback: if it blocks movement, it probably blocks projectiles too
  // (except for things like force fields which would have BLOCKS_MOVEMENT but not BLOCKS_PROJECTILES)
  return tileBlocksMovement(tile);
}

/**
 * Check if a tile blocks sound (BLOCKS_SOUND flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile blocks sound
 */
function tileBlocksSound(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'BLOCKS_SOUND');
}

/**
 * Check if a tile is climbable (CLIMBABLE flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile is climbable
 */
function tileIsClimbable(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'CLIMBABLE');
}

/**
 * Check if a tile is swimmable (SWIMMABLE flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile is swimmable water
 */
function tileIsSwimmable(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'SWIMMABLE');
}

/**
 * Check if a tile is slippery (SLIPPERY flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile is slippery (ice, etc.)
 */
function tileIsSlippery(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'SLIPPERY');
}

/**
 * Check if a tile is a hazard (HAZARD flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile damages on contact
 */
function tileIsHazard(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'HAZARD');
}

/**
 * Check if a tile provides cover (COVER flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile provides tactical cover
 */
function tileProvidesCover(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'COVER');
}

/**
 * Check if a tile is openable (OPENABLE flag - doors, chests)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile can be opened/closed
 */
function tileIsOpenable(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'OPENABLE');
}

/**
 * Check if a tile is a container (CONTAINER flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile can hold items
 */
function tileIsContainer(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'CONTAINER');
}

/**
 * Check if a tile is flammable (FLAMMABLE flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile can catch fire
 */
function tileIsFlammable(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'FLAMMABLE');
}

/**
 * Check if a tile is destructible (DESTRUCTIBLE flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile can be destroyed
 */
function tileIsDestructible(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'DESTRUCTIBLE');
}

/**
 * Get friction modifier for a tile (for SLIPPERY tiles)
 * @param {Object} tile - The tile object
 * @returns {number} Friction modifier (1.0 = normal, <1 = slippery)
 */
function getTileFrictionModifier(tile) {
  if (!tile) return 1.0;
  
  // Check for explicit frictionModifier property
  if (tile.properties && typeof tile.properties.frictionModifier === 'number') {
    return tile.properties.frictionModifier;
  }
  
  // Check tile definition
  if (tile.type && typeof getTileDefinition === 'function') {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef && typeof tileDef.frictionModifier === 'number') {
      return tileDef.frictionModifier;
    }
  }
  
  // Default friction based on SLIPPERY flag
  if (tileIsSlippery(tile)) {
    return 0.5; // Default slippery friction
  }
  
  return 1.0; // Normal friction
}

/**
 * Get damage value for hazard tiles
 * @param {Object} tile - The tile object
 * @returns {number} Damage per contact (0 if not a hazard)
 */
function getTileHazardDamage(tile) {
  if (!tile || !tileIsHazard(tile)) return 0;
  
  // Check for explicit damage property
  if (tile.properties && typeof tile.properties.damage === 'number') {
    return tile.properties.damage;
  }
  
  // Check tile definition
  if (tile.type && typeof getTileDefinition === 'function') {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef && typeof tileDef.damage === 'number') {
      return tileDef.damage;
    }
  }
  
  return 5; // Default hazard damage
}

/**
 * Check if a tile blocks rain (BLOCKS_RAIN flag - roofs, awnings)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile blocks rain
 */
function tileBlocksRain(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'BLOCKS_RAIN');
}

/**
 * Check if a tile is invisible during gameplay (INVISIBLE_INGAME flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile should be hidden during gameplay
 */
function tileIsInvisibleInGame(tile) {
  if (!tile) return false;
  return tileHasFlag(tile, 'INVISIBLE_INGAME');
}

/**
 * Check if a tile is sittable (SITTABLE flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if player can sit on this tile
 */
function tileIsSittable(tile) {
  if (!tile) return false;
  if (tileHasFlag(tile, 'SITTABLE')) return true;
  
  // Legacy fallback: sittable property
  if (tile.type && typeof getTileDefinition === 'function') {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef && tileDef.sittable) return true;
  }
  
  return false;
}

/**
 * Check if a tile blocks vision (BLOCKS_VISION flag)
 * @param {Object} tile - The tile object
 * @returns {boolean} True if tile blocks line-of-sight
 */
function tileBlocksVision(tile) {
  if (!tile) return false;
  if (tileHasFlag(tile, 'BLOCKS_VISION')) return true;
  
  // Fallback: blocksVision property
  if (tile.properties && tile.properties.blocksVision) return true;
  
  return false;
}

// ============================================
// FLAG SYSTEM DIAGNOSTICS
// Call window.diagFlags() from the browser console to diagnose flag issues
// ============================================

/**
 * Comprehensive flag system diagnostic - traces the ENTIRE pipeline
 * and reports exactly what works and what doesn't.
 * Call from browser console: diagFlags()
 */
function diagFlags() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     FLAG SYSTEM DIAGNOSTIC REPORT           ║');
  console.log('╚══════════════════════════════════════════════╝');
  
  let issues = [];
  
  // 1. Check if definitions are loaded
  console.log('\n[1] TILE DEFINITIONS');
  if (typeof tileSystem === 'undefined' || !tileSystem.definitions) {
    console.log('  ❌ tileSystem.definitions is NULL - flags cannot work!');
    issues.push('Definitions not loaded');
  } else {
    let categories = Object.keys(tileSystem.definitions.categories);
    console.log('  ✓ Definitions loaded:', categories.length, 'categories');
    
    // Check specific tiles for flags
    let testTiles = ['wall', 'brick_wall', 'grass', 'water', 'lava'];
    for (let tileName of testTiles) {
      let def = typeof getTileDefinition === 'function' ? getTileDefinition(tileName) : null;
      if (def) {
        let flags = def.flags || [];
        console.log(`  ✓ "${tileName}": flags=[${flags.join(', ')}]`);
        if (tileName.includes('wall') && !flags.includes('BLOCKS_MOVEMENT')) {
          console.log(`    ⚠️ Wall tile "${tileName}" is MISSING BLOCKS_MOVEMENT flag!`);
          issues.push(`${tileName} missing BLOCKS_MOVEMENT`);
        }
        if (tileName.includes('wall') && !flags.includes('BLOCKS_LIGHT')) {
          console.log(`    ⚠️ Wall tile "${tileName}" is MISSING BLOCKS_LIGHT flag!`);
          issues.push(`${tileName} missing BLOCKS_LIGHT`);
        }
      } else {
        console.log(`  - "${tileName}": not found in definitions`);
      }
    }
  }
  
  // 2. Check placed tiles
  console.log('\n[2] PLACED TILES');
  if (typeof tileSystem === 'undefined' || !tileSystem.placedTiles) {
    console.log('  ❌ No placed tiles');
    issues.push('No placed tiles');
  } else {
    let totalTiles = 0;
    let tilesWithFlags = 0;
    let blocksMovement = 0;
    let blocksLight = 0;
    let flaggedTileExamples = [];
    
    for (let key in tileSystem.placedTiles) {
      let tilesAtPos = tileSystem.placedTiles[key];
      let arr = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];
      for (let tile of arr) {
        totalTiles++;
        if (tileHasFlag(tile, 'BLOCKS_MOVEMENT')) {
          blocksMovement++;
          if (flaggedTileExamples.length < 3) {
            flaggedTileExamples.push({ key, type: tile.type, layer: tile.layer });
          }
        }
        if (tileHasFlag(tile, 'BLOCKS_LIGHT')) {
          blocksLight++;
        }
        if (tile.properties && tile.properties.flags && tile.properties.flags.length > 0) {
          tilesWithFlags++;
        }
      }
    }
    
    console.log(`  Total placed tiles: ${totalTiles}`);
    console.log(`  Tiles with baked flags: ${tilesWithFlags}`);
    console.log(`  Tiles blocking MOVEMENT: ${blocksMovement}`);
    console.log(`  Tiles blocking LIGHT: ${blocksLight}`);
    if (flaggedTileExamples.length > 0) {
      console.log('  Examples:', flaggedTileExamples.map(e => `${e.type} at ${e.key} (layer ${e.layer})`).join(', '));
    }
    
    if (blocksMovement === 0 && totalTiles > 0) {
      console.log('  ⚠️ No tiles block movement - walls may have incorrect flags');
      issues.push('No tiles block movement');
    }
    if (blocksLight === 0 && totalTiles > 0) {
      console.log('  ⚠️ No tiles block light - shadows will not be cast');
      issues.push('No tiles block light');
    }
  }
  
  // 3. Check lighting system
  console.log('\n[3] LIGHTING SYSTEM');
  if (typeof lighting === 'undefined') {
    console.log('  ❌ Lighting system not available');
    issues.push('Lighting system missing');
  } else {
    console.log(`  Enabled: ${lighting.enabled}`);
    console.log(`  Ambient: ${lighting.ambientLight}`);
    console.log(`  Lights: ${lighting.lights.length}`);
    console.log(`  Obstacle cache dirty: ${lighting.obstacleCacheDirty}`);
    console.log(`  Light layer: ${lighting.lightLayer ? 'created' : 'MISSING'}`);
    
    let shadowLights = lighting.lights.filter(l => l.castsShadows && l.enabled);
    console.log(`  Lights with castsShadows=true: ${shadowLights.length}`);
    
    if (shadowLights.length === 0 && lighting.lights.length > 0) {
      console.log('  ⚠️ No lights cast shadows - BLOCKS_LIGHT has no effect!');
      issues.push('No lights have castsShadows=true');
    }
    
    for (let light of shadowLights) {
      console.log(`    Shadow-casting light at (${light.x.toFixed(1)}, ${light.y.toFixed(1)}), radius=${light.radius}m`);
    }
    
    // Check obstacle cache
    if (lighting.obstacleCache) {
      let blockedCells = 0;
      let cacheW = Math.ceil(WORLD_WIDTH * 2);
      let cacheH = Math.ceil(WORLD_HEIGHT * 2);
      for (let x = 0; x < cacheW; x++) {
        for (let y = 0; y < cacheH; y++) {
          if (lighting.obstacleCache[x] && lighting.obstacleCache[x][y]) {
            blockedCells++;
          }
        }
      }
      console.log(`  Obstacle cache: ${blockedCells} blocked cells`);
      if (blockedCells === 0) {
        console.log('  ⚠️ Obstacle cache is EMPTY - no shadows will be cast!');
        issues.push('Obstacle cache is empty');
      }
    } else {
      console.log('  ⚠️ Obstacle cache not initialized');
      issues.push('Obstacle cache not initialized');
    }
  }
  
  // 4. Check player collision system
  console.log('\n[4] PLAYER COLLISION');
  if (typeof player === 'undefined') {
    console.log('  ❌ Player not initialized');
  } else {
    console.log(`  Position: (${player.x.toFixed(2)}, ${player.y.toFixed(2)})`);
    console.log(`  Health: ${player.health}/${player.maxHealth}`);
    console.log(`  Collision size: ${player.collisionSize || player.size}`);
    console.log(`  Edit mode: ${typeof editMode !== 'undefined' ? editMode : 'unknown'}`);
    
    // Test canMoveTo at a wall position
    let wallPos = null;
    if (typeof tileSystem !== 'undefined' && tileSystem.placedTiles) {
      for (let key in tileSystem.placedTiles) {
        let arr = Array.isArray(tileSystem.placedTiles[key]) ? tileSystem.placedTiles[key] : [tileSystem.placedTiles[key]];
        for (let t of arr) {
          if (t.layer >= 1 && tileBlocksMovement(t)) {
            wallPos = { x: t.x, y: t.y, type: t.type };
            break;
          }
        }
        if (wallPos) break;
      }
    }
    
    if (wallPos) {
      let canMove = typeof canMoveTo === 'function' ? canMoveTo(wallPos.x + 0.5, wallPos.y + 0.5) : 'canMoveTo not found';
      console.log(`  canMoveTo(wall at ${wallPos.x},${wallPos.y} type=${wallPos.type}): ${canMove}`);
      if (canMove === true) {
        console.log('  ⚠️ Player CAN walk through wall - collision NOT working!');
        issues.push('canMoveTo returns true for wall position');
      } else {
        console.log('  ✓ Wall blocks player movement correctly');
      }
    } else {
      console.log('  No blocking wall tiles found to test');
    }
  }
  
  // 5. Check flag function availability
  console.log('\n[5] FLAG FUNCTIONS');
  let funcs = ['tileHasFlag', 'tileBlocksMovement', 'tileBlocksLight', 'tileBlocksProjectiles',
               'tileBlocksSound', 'tileBlocksVision', 'tileIsSlippery', 'tileIsHazard',
               'tileIsSwimmable', 'tileIsClimbable', 'tileIsSittable', 'tileIsInvisibleInGame',
               'tileBlocksRain', 'getTileDefinition', 'canMoveTo'];
  for (let fn of funcs) {
    let available = typeof window[fn] === 'function';
    console.log(`  ${available ? '✓' : '❌'} ${fn}: ${available ? 'available' : 'MISSING'}`);
    if (!available) issues.push(`Function ${fn} not available`);
  }
  
  // Summary
  console.log('\n══════════════════════════════════════════════');
  if (issues.length === 0) {
    console.log('✅ FLAG SYSTEM: ALL CHECKS PASSED');
    console.log('   If flags still seem broken, try:');
    console.log('   1. Toggle edit mode off (E key)');
    console.log('   2. Lower ambient light for better shadow visibility');
    console.log('   3. Check that lights have castsShadows enabled');
  } else {
    console.log(`❌ FLAG SYSTEM: ${issues.length} ISSUE(S) FOUND:`);
    issues.forEach((issue, i) => console.log(`   ${i+1}. ${issue}`));
  }
  console.log('══════════════════════════════════════════════');
  console.log('');
  
  return { issues, passed: issues.length === 0 };
}

// Make diagnostic available globally
window.diagFlags = diagFlags;

// Quick flag test for a specific tile type
window.testTileFlags = function(tileType) {
  let def = typeof getTileDefinition === 'function' ? getTileDefinition(tileType) : null;
  if (!def) {
    console.log(`Tile "${tileType}" not found in definitions`);
    return null;
  }
  console.log(`Tile "${tileType}":`);
  console.log('  Definition flags:', def.flags || 'NONE');
  console.log('  walkable:', def.walkable);
  console.log('  blocksVision:', def.blocksVision);
  console.log('  layer:', def.layer);
  
  // Create a mock tile to test tileHasFlag
  let mockTile = { type: tileType, properties: { ...def } };
  let flagTests = ['BLOCKS_MOVEMENT', 'BLOCKS_LIGHT', 'BLOCKS_PROJECTILES', 'BLOCKS_SOUND',
                   'HAZARD', 'SLIPPERY', 'SWIMMABLE', 'CLIMBABLE', 'SITTABLE', 'BLOCKS_RAIN',
                   'INVISIBLE_INGAME', 'DESTRUCTIBLE', 'FLAMMABLE', 'COVER'];
  console.log('  Flag check results:');
  for (let flag of flagTests) {
    let result = tileHasFlag(mockTile, flag);
    if (result) console.log(`    ✓ ${flag}`);
  }
  return def;
};

// Toggle flag debug logging
window.flagDebug = function(enabled) {
  _flagSystemDebug = enabled !== false;
  console.log(`Flag system debug: ${_flagSystemDebug ? 'ON' : 'OFF'}`);
};

// Log that flag system is loaded
console.log('✓ Flag system loaded - centralized tile flag checking available');
console.log('  → Call diagFlags() in console to diagnose flag issues');
console.log('  → Call testTileFlags("wall") to test a specific tile');
console.log('  → Call flagDebug(true) to enable flag check logging');
