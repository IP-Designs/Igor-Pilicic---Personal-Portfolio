// Tile Activation System
// Allows tiles to be activated by pressing SPACE
// Any tiles with the same activationId will trigger together

// Track which tiles are activatable
const ACTIVATABLE_TILE_TYPES = {
  // Doors - can be activated
  'door': true,
  'door_closed': true,
  'door_open': true,
  'door_wooden': true,
  'door_wooden_closed': true,
  'door_wooden_open': true,
  'door_metal': true,
  'door_metal_closed': true,
  'door_metal_open': true,
  'door_locked': true,
  
  // Switches/Buttons - can be activated
  'switch': true,
  'switch_on': true,
  'switch_off': true,
  'switch_lever': true,
  'button_red': true,
  'button_blue': true,
  
  // Lights - can be activated
  'light': true,
  
  // Interactive tiles
  'portal': true,
  'teleporter': true,
  'pressure_plate': true,
  'trap': true,
  
  // Logic tiles
  'timer': true,
  'counter': true,
  'and_gate': true,
  'or_gate': true,
  'not_gate': true,
  'toggle': true,
  'relay': true
};

/**
 * Check if a tile type can be activated
 * @param {string} tileType - Type of tile to check
 * @returns {boolean}
 */
function isActivatableTile(tileType) {
  return ACTIVATABLE_TILE_TYPES[tileType] === true;
}

/**
 * Get all tiles with same activation ID
 * @param {number} activationId - ID to search for
 * @returns {array} Array of tiles with matching activation ID
 */
function getTilesByActivationId(activationId) {
  if (!activationId && activationId !== 0) return [];
  
  let matchingTiles = [];
  
  // Check interactive tiles
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    for (let tile of interactiveTiles) {
      if (tile.activationId === activationId) {
        matchingTiles.push(tile);
      }
    }
  }
  
  return matchingTiles;
}

/**
 * Activate all tiles with given activation ID
 * Tiles with the same ID all activate together
 * @param {number} activationId - Activation group ID
 * @param {object} [sourceTile] - The tile that initiated the activation (will be skipped to prevent double-toggle)
 * @returns {number} Number of tiles activated
 */
function activateTileGroup(activationId, sourceTile) {
  if (!activationId && activationId !== 0) return 0;
  
  let tiles = getTilesByActivationId(activationId);
  let activatedCount = 0;
  
  console.log(`Activating tile group ${activationId}: found ${tiles.length} tiles`);
  
  for (let tile of tiles) {
    // Skip the source tile - it was already interacted with directly
    if (sourceTile && tile.x === sourceTile.x && tile.y === sourceTile.y) continue;
    
    if (typeof interactWithTile !== 'undefined' && interactWithTile(tile, true)) {
      activatedCount++;
      console.log(`  ✓ Activated ${tile.type} at (${tile.x}, ${tile.y})`);
    }
  }
  
  console.log(`Total activated: ${activatedCount} tiles`);
  return activatedCount;
}

/**
 * Set activation ID on a tile
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} activationId - ID to set
 * @returns {boolean}
 */
function setTileActivationId(x, y, activationId) {
  if (typeof getInteractiveTileAt === 'undefined') return false;
  
  let tile = getInteractiveTileAt(x, y);
  if (tile) {
    tile.activationId = activationId;
    console.log(`Set activationId ${activationId} on ${tile.type} at (${x}, ${y})`);
    return true;
  }
  return false;
}

/**
 * Get activation ID from a tile
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {number|null} Activation ID or null
 */
function getTileActivationId(x, y) {
  if (typeof getInteractiveTileAt === 'undefined') return null;
  
  let tile = getInteractiveTileAt(x, y);
  if (tile) {
    return tile.activationId || null;
  }
  return null;
}

/**
 * Activate a single tile by position
 * Activates all tiles with the same activation ID
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} Success
 */
function activateTileAt(x, y) {
  if (typeof getInteractiveTileAt === 'undefined') return false;
  
  let tile = getInteractiveTileAt(x, y);
  if (!tile) return false;
  
  console.log(`Attempting to activate ${tile.type} at (${x}, ${y})`);
  
  // If tile has activation ID, activate entire group
  if (tile.activationId !== undefined && tile.activationId !== null) {
    console.log(`Tile has activationId ${tile.activationId}, activating group`);
    activateTileGroup(tile.activationId);
    return true;
  }
  
  // Otherwise activate just this tile
  if (typeof interactWithTile !== 'undefined') {
    return interactWithTile(tile);
  }
  
  return false;
}

/**
 * List all activation groups
 * @returns {object} Map of activationId -> array of tiles
 */
function getActivationGroups() {
  let groups = {};
  
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    for (let tile of interactiveTiles) {
      if (tile.activationId !== undefined && tile.activationId !== null) {
        if (!groups[tile.activationId]) {
          groups[tile.activationId] = [];
        }
        groups[tile.activationId].push({
          type: tile.type,
          x: tile.x,
          y: tile.y
        });
      }
    }
  }
  
  return groups;
}

/**
 * Get debug info about activation system
 * @returns {object}
 */
function getActivationDebugInfo() {
  let groups = getActivationGroups();
  let groupCount = Object.keys(groups).length;
  let totalActivatable = 0;
  let totalWithActivationId = 0;
  
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    for (let tile of interactiveTiles) {
      if (isActivatableTile(tile.type)) {
        totalActivatable++;
        if (tile.activationId !== undefined && tile.activationId !== null) {
          totalWithActivationId++;
        }
      }
    }
  }
  
  return {
    totalActivatable: totalActivatable,
    totalWithActivationId: totalWithActivationId,
    activationGroups: groupCount,
    groups: groups
  };
}

/**
 * Console debug command
 */
function showActivationStatus() {
  const info = getActivationDebugInfo();
  console.log('%c=== ACTIVATION SYSTEM STATUS ===', 'color: #4da6ff; font-weight: bold;');
  console.log(`Total activatable tiles: ${info.totalActivatable}`);
  console.log(`Tiles with activation ID: ${info.totalWithActivationId}`);
  console.log(`Activation groups: ${info.activationGroups}`);
  
  if (info.activationGroups > 0) {
    console.log('%cActivation Groups:', 'font-weight: bold; color: #4da6ff;');
    for (let groupId in info.groups) {
      console.group(`Group ${groupId} (${info.groups[groupId].length} tiles)`);
      info.groups[groupId].forEach(tile => {
        console.log(`  • ${tile.type} at (${tile.x}, ${tile.y})`);
      });
      console.groupEnd();
    }
  }
  
  return info;
}

// Make available in console
console.log('%cTile Activation System Ready', 'color: #4da6ff; font-weight: bold;');
console.log('Available commands:');
console.log('  showActivationStatus() - View all activation groups');
console.log('  getTilesByActivationId(id) - Get tiles in a group');
console.log('  activateTileGroup(id) - Manually activate a group');
console.log('  activateTileAt(x, y) - Activate tile at position');
