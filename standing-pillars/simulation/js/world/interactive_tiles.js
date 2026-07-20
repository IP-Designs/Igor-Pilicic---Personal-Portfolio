// Interactive tiles system - handles doors, switches, and other interactive elements

// Interactive tiles array - stores state for interactive tiles
let interactiveTiles = [];

// Helper function for collision detection
function checkCollisionWithObject(x, y, objX, objY, objWidth, objHeight) {
  return x >= objX && x < objX + objWidth && y >= objY && y < objY + objHeight;
}

// Helper to get interaction message using centralized controls
// Falls back to 'E' if CONTROLS not loaded yet
function _getInteractKey() {
  return (typeof CONTROLS !== 'undefined' && CONTROLS.INTERACT) ? CONTROLS.INTERACT.key : 'E';
}

// Interactive tile types and their behavior
// Messages are generated dynamically using centralized CONTROLS
const INTERACTIVE_TYPES = {
  'door': {
    isDoor: true,
    get interactionMessage() { return `Press ${_getInteractKey()} to toggle door`; },
    width: 1,
    height: 1
  },
  'door_closed': {
    canWalkThrough: false,
    blocksLight: true,
    toggleTo: 'door_open',
    get interactionMessage() { return `Press ${_getInteractKey()} to open door`; },
    width: 1,
    height: 1,
    isBlocking: true
  },
  'door_open': {
    canWalkThrough: true,
    blocksLight: false,
    toggleTo: 'door_closed',
    get interactionMessage() { return `Press ${_getInteractKey()} to close door`; },
    width: 1,
    height: 1,
    isBlocking: false
  },
  'door_wooden': {
    isDoor: true,
    get interactionMessage() { return `Press ${_getInteractKey()} to toggle wooden door`; },
    width: 1,
    height: 1
  },
  'door_wooden_closed': {
    canWalkThrough: false,
    blocksLight: true,
    toggleTo: 'door_wooden_open',
    get interactionMessage() { return `Press ${_getInteractKey()} to open wooden door`; },
    width: 1,
    height: 1,
    isBlocking: true
  },
  'door_wooden_open': {
    canWalkThrough: true,
    blocksLight: false,
    toggleTo: 'door_wooden_closed',
    get interactionMessage() { return `Press ${_getInteractKey()} to close wooden door`; },
    width: 1,
    height: 1,
    isBlocking: false
  },
  'door_metal': {
    isDoor: true,
    get interactionMessage() { return `Press ${_getInteractKey()} to toggle metal door`; },
    width: 1,
    height: 1
  },
  'door_metal_closed': {
    canWalkThrough: false,
    blocksLight: true,
    toggleTo: 'door_metal_open',
    get interactionMessage() { return `Press ${_getInteractKey()} to open metal door`; },
    width: 1,
    height: 1,
    isBlocking: true
  },
  'door_metal_open': {
    canWalkThrough: true,
    blocksLight: false,
    toggleTo: 'door_metal_closed',
    get interactionMessage() { return `Press ${_getInteractKey()} to close metal door`; },
    width: 1,
    height: 1,
    isBlocking: false
  },
  'door_brick_wall': {
    isDoor: true,
    get interactionMessage() { return `Press ${_getInteractKey()} to toggle brick wall door`; },
    width: 1,
    height: 1
  },
  'door_closed_wall_brick': {
    canWalkThrough: false,
    blocksLight: true,
    toggleTo: 'door_opened_wall_brick',
    get interactionMessage() { return `Press ${_getInteractKey()} to open brick wall door`; },
    width: 1,
    height: 1,
    isBlocking: true
  },
  'door_opened_wall_brick': {
    canWalkThrough: true,
    blocksLight: false,
    toggleTo: 'door_closed_wall_brick',
    get interactionMessage() { return `Press ${_getInteractKey()} to close brick wall door`; },
    width: 1,
    height: 1,
    isBlocking: false
  },
  'switch_off': {
    canWalkThrough: true,
    blocksLight: false,
    toggleTo: 'switch_on',
    get interactionMessage() { return `Press ${_getInteractKey()} to turn on switch`; },
    triggersLights: true,
    width: 1,
    height: 1
  },
  'switch_on': {
    canWalkThrough: true,
    blocksLight: false,
    toggleTo: 'switch_off',
    get interactionMessage() { return `Press ${_getInteractKey()} to turn off switch`; },
    triggersLights: true,
    width: 1,
    height: 1
  },
  // Logic tiles
  'timer': {
    canWalkThrough: true,
    blocksLight: false,
    isLogic: true,
    logicType: 'timer',
    get interactionMessage() { return `Timer - delays signal`; },
    width: 1,
    height: 1
  },
  'counter': {
    canWalkThrough: true,
    blocksLight: false,
    isLogic: true,
    logicType: 'counter',
    get interactionMessage() { return `Counter - counts activations`; },
    width: 1,
    height: 1
  },
  'and_gate': {
    canWalkThrough: true,
    blocksLight: false,
    isLogic: true,
    logicType: 'and_gate',
    get interactionMessage() { return `AND Gate - outputs when all inputs active`; },
    width: 1,
    height: 1
  },
  'or_gate': {
    canWalkThrough: true,
    blocksLight: false,
    isLogic: true,
    logicType: 'or_gate',
    get interactionMessage() { return `OR Gate - outputs when any input active`; },
    width: 1,
    height: 1
  },
  'not_gate': {
    canWalkThrough: true,
    blocksLight: false,
    isLogic: true,
    logicType: 'not_gate',
    get interactionMessage() { return `NOT Gate - inverts input`; },
    width: 1,
    height: 1
  },
  'toggle': {
    canWalkThrough: true,
    blocksLight: false,
    isLogic: true,
    logicType: 'toggle',
    get interactionMessage() { return `Toggle - alternates on/off`; },
    width: 1,
    height: 1
  },
  'relay': {
    canWalkThrough: true,
    blocksLight: false,
    isLogic: true,
    logicType: 'relay',
    get interactionMessage() { return `Relay - passes signal to outputs`; },
    width: 1,
    height: 1
  },
  'teleporter': {
    canWalkThrough: true,
    blocksLight: false,
    isLogic: true,
    logicType: 'teleporter',
    get interactionMessage() { return `Teleporter - link to destination`; },
    width: 1,
    height: 1
  },
  // Script tile - custom JavaScript behaviors
  'script': {
    canWalkThrough: true,
    blocksLight: false,
    isScript: true,
    get interactionMessage() { return `Script Tile`; },
    width: 1,
    height: 1
  },
  // Light tile - toggleable light source
  'light': {
    canWalkThrough: true,
    blocksLight: false,
    isLight: true,
    get interactionMessage() { return `Press ${_getInteractKey()} to toggle light`; },
    width: 1,
    height: 1
  }
};

// Add interactive tile (called when placing from editor)
function addInteractiveTile(x, y, type, linkId = null, activationId = null, transform = null) {
  // Remove any existing interactive tile at this position
  removeInteractiveTile(x, y);
  
  // Get type info
  const typeInfo = INTERACTIVE_TYPES[type] || {};
  
  // Add new interactive tile
  let interactiveTile = {
    x: x,
    y: y,
    type: type,
    size: typeof SNAP_GRID !== 'undefined' ? SNAP_GRID : 32,
    linkId: linkId,  // Link ID for connecting buttons to doors, etc.
    activationId: activationId,  // Activation ID for grouping tiles to activate together
    isLogic: typeInfo.isLogic || false,
    logicType: typeInfo.logicType || null,
    transform: transform || null  // Rotation/flip support
  };

  // Script tiles use scriptId - actual code lives in {mapname}.scripts.js
  interactiveTile.scriptId = null;
  
  interactiveTiles.push(interactiveTile);
  
  // Initialize door state if this is a door type
  if (isDoorType(type)) {
    const initialState = type.includes('open') ? DOOR_STATES.OPEN : DOOR_STATES.CLOSED;
    setDoorState(x, y, initialState);
  }
  
  // Initialize logic tile state
  if (interactiveTile.isLogic && typeof getLogicState === 'function') {
    getLogicState(interactiveTile);
  }
  
  console.log(`Added interactive tile: ${type} at (${x}, ${y}) with linkId: ${linkId}, activationId: ${activationId}. Total interactive tiles: ${interactiveTiles.length}`);
  
  return interactiveTile;
}

// Set a scriptId on interactive tile at position
// The actual script code lives in levels/{mapname}.scripts.js
function setInteractiveTileScriptId(x, y, scriptId) {
  let tile = getInteractiveTileAt(x, y);
  if (tile) {
    tile.scriptId = scriptId || null;
    console.log(`Set scriptId on interactive tile at (${x},${y}):`, tile.scriptId);
    return true;
  }
  return false;
}

// Legacy function for backwards compatibility
function setInteractiveTileScript(x, y, scriptText, triggers = null) {
  // Convert old script to scriptId if it looks like a reference
  let tile = getInteractiveTileAt(x, y);
  if (tile) {
    // If scriptText is short and has no spaces, treat as scriptId
    if (scriptText && scriptText.length < 50 && !/\s/.test(scriptText)) {
      tile.scriptId = scriptText;
    }
    if (triggers) {
      tile.triggers = triggers;
    }
    return true;
  }
  return false;
}

// Check if a tile type is a door
function isDoorType(type) {
  return type && (type.includes('door') || type === 'door');
}

// Get the door base type (door, door_wooden, door_metal)
function getDoorBaseType(type) {
  if (type.includes('wooden')) return 'door_wooden';
  if (type.includes('metal')) return 'door_metal';
  if (type.includes('brick_wall') || type.includes('wall_brick')) return 'door_brick_wall';
  return 'door';
}

// Remove interactive tile at position
function removeInteractiveTile(x, y) {
  let index = interactiveTiles.findIndex(tile => tile.x === x && tile.y === y);
  if (index !== -1) {
    let removedTile = interactiveTiles.splice(index, 1)[0];
    
    // Clean up door state if this was a door
    if (isDoorType(removedTile.type)) {
      deleteDoorState(x, y);
    }
    
    console.log(`Removed interactive tile: ${removedTile.type} from (${x}, ${y})`);
    return true;
  }
  return false;
}

// Get interactive tile at position
function getInteractiveTileAt(x, y) {
  return interactiveTiles.find(tile => tile.x === x && tile.y === y);
}

// Set link ID on interactive tile
function setInteractiveTileLinkId(x, y, linkId) {
  let tile = getInteractiveTileAt(x, y);
  if (tile) {
    tile.linkId = linkId;
    console.log(`Set linkId ${linkId} on ${tile.type} at (${x}, ${y})`);
    return true;
  }
  return false;
}

// Get all interactive tiles with a specific link ID
function getInteractiveTilesByLinkId(linkId) {
  return interactiveTiles.filter(tile => tile.linkId === linkId);
}

// Check if position is blocked by interactive tile
function isBlockedByInteractiveTile(x, y) {
  for (let tile of interactiveTiles) {
    if (INTERACTIVE_TYPES[tile.type]) {
      let typeInfo = INTERACTIVE_TYPES[tile.type];
      
      // Simple check: if player is on the same grid position as the tile
      if (tile.x === x && tile.y === y) {
        // For doors, check the door state system
        if (isDoorType(tile.type)) {
          const isOpen = isDoorOpen(tile.x, tile.y);
          return !isOpen;
        }
        
        // For non-door interactive tiles, use the existing logic
        let blocked = typeInfo.isBlocking !== undefined ? typeInfo.isBlocking : !typeInfo.canWalkThrough;
        return blocked;
      }
    }
  }
  return false;
}

// Check for nearby interactive tiles that player can interact with
function checkForNearbyInteractions(playerX, playerY) {
  let nearbyTiles = [];
  
  // Check in a small radius around player
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      let checkX = Math.floor(playerX) + dx;
      let checkY = Math.floor(playerY) + dy;
      let tile = getInteractiveTileAt(checkX, checkY);
      
      if (tile && INTERACTIVE_TYPES[tile.type]) {
        nearbyTiles.push({
          tile: tile,
          distance: abs(playerX - tile.x) + abs(playerY - tile.y)
        });
      }
    }
  }
  
  // Sort by distance and return closest
  nearbyTiles.sort((a, b) => a.distance - b.distance);
  return nearbyTiles.length > 0 ? nearbyTiles[0].tile : null;
}

// Handle interaction with tile (when player presses E or tile is triggered)
function interactWithTile(tile, isTriggeredByLink = false) {
  if (!tile || !INTERACTIVE_TYPES[tile.type]) return false;
  
  let typeInfo = INTERACTIVE_TYPES[tile.type];
  
  // Handle logic tiles - route to logic system
  if (typeInfo.isLogic || tile.isLogic) {
    if (typeof sendSignal === 'function') {
      sendSignal(tile, 'activate');
      console.log(`Logic tile ${tile.type} at (${tile.x}, ${tile.y}) activated`);
      
      // Trigger script if attached
      if (typeof triggerScriptActivate === 'function') {
        triggerScriptActivate(tile);
      }
      
      return true;
    }
    return false;
  }
  
  // Handle doors - use the state system
  if (isDoorType(tile.type)) {
    // Toggle the door state
    const newState = toggleDoorState(tile.x, tile.y);
    console.log(`${tile.type} at (${tile.x}, ${tile.y}) toggled to: ${newState}`);

    // Play sound assigned to this tile type
    _playTileSound(tile);
    
    // Update lighting when door state changes
    if (typeof triggerLightingUpdate === 'function') {
      triggerLightingUpdate();
      console.log('Lighting update triggered due to door state change');
    }
    
    // IMPORTANT: Only trigger linked tiles if this is a DIRECT player interaction
    // If this is already being triggered by a link, don't trigger again (prevent loops)
    if (!isTriggeredByLink && tile.linkId !== null && tile.linkId !== undefined) {
      triggerLinkedTiles(tile.linkId);
    }
    
    return true;
  }
  
  // Handle light tiles - toggle light on/off
  if (typeInfo.isLight || tile.type === 'light') {
    if (typeof getLightAt === 'function') {
      let light = getLightAt(tile.x, tile.y);
      if (light) {
        light.enabled = !light.enabled;
        console.log(`Light at (${tile.x}, ${tile.y}) toggled to: ${light.enabled ? 'ON' : 'OFF'}`);
        
        if (typeof lighting !== 'undefined') {
          lighting.needsUpdate = true;
        }
        if (typeof triggerLightingUpdate === 'function') {
          triggerLightingUpdate();
        }
      }
    }
    
    // Trigger linked tiles if direct interaction
    if (!isTriggeredByLink && tile.linkId !== null && tile.linkId !== undefined) {
      triggerLinkedTiles(tile.linkId);
    }
    
    return true;
  }
  
  // Handle non-door interactive tiles (switches, buttons, etc.)
  if (typeInfo.toggleTo) {
    console.log(`Toggling ${tile.type} to ${typeInfo.toggleTo}`);

    // Play sound assigned to this tile type (before type changes)
    _playTileSound(tile);

    tile.type = typeInfo.toggleTo;
    
    // Handle special behaviors
    if (typeInfo.triggersLights) {
      toggleNearbyLights(tile.x, tile.y);
    }
    
    // IMPORTANT: Only trigger linked tiles if this is a DIRECT player interaction
    // Buttons trigger doors/other tiles; doors don't trigger further when triggered
    if (!isTriggeredByLink && tile.linkId !== null && tile.linkId !== undefined) {
      triggerLinkedTiles(tile.linkId);
    }
    
    // If tile has an attached script, execute it via scriptContext
    if (tile.script) {
      try {
        // Use scriptContext from script_system.js if available
        const ctx = (typeof scriptContext !== 'undefined') 
          ? scriptContext 
          : (window.sdk && typeof window.sdk.makeRuntimeApi === 'function')
            ? window.sdk.makeRuntimeApi({ tile: tile })
            : {
              openDoor: (tx, ty) => { if (typeof setDoorState === 'function') setDoorState(tx, ty, DOOR_STATES.OPEN); },
              closeDoor: (tx, ty) => { if (typeof setDoorState === 'function') setDoorState(tx, ty, DOOR_STATES.CLOSED); },
              toggleDoor: (tx, ty) => { if (typeof toggleDoorState === 'function') toggleDoorState(tx, ty); },
              shakeCamera: (meters = 0.5, duration = 300) => { if (typeof camera !== 'undefined' && typeof camera.shake === 'function') camera.shake(meters, duration); },
              showScreenBlur: (durationMs = 5000, maxAlpha = 0.6) => { if (typeof showScreenBlur === 'function') showScreenBlur(durationMs, maxAlpha); },
              spawnEntity: (type, x, y) => { if (typeof addEntity === 'function') addEntity(type, x, y); },
              playSound: (name) => { if (typeof playSound === 'function') playSound(name); },
              log: (...a) => console.log('[script]', ...a)
            };

        // Prefer precompiled function if available
        if (tile._scriptFn && typeof tile._scriptFn === 'function') {
          tile._scriptFn(ctx, tile);
          console.log(`Executed compiled script for tile at (${tile.x},${tile.y})`);
        } else {
          try {
            tile._scriptFn = new Function('ctx', 'tile', tile.script);
            tile._scriptFn(ctx, tile);
            console.log(`Compiled & executed script for tile at (${tile.x},${tile.y})`);
          } catch (e) {
            tile._scriptFn = null;
            console.error('Error compiling/executing tile script:', e);
            console.error('Script content:', tile.script);
          }
        }
      } catch (e) {
        console.error('Error executing tile script:', e);
      }
    }

    return true;
  }
  
  return false;
}

// Trigger all tiles linked with the same linkId
function triggerLinkedTiles(linkId) {
  console.log(`🔗 Triggering all tiles linked with ID: ${linkId}`);
  let triggeredCount = 0;
  
  for (let linkedTile of interactiveTiles) {
    // Skip the original tile, trigger all others with same linkId
    if (linkedTile.linkId === linkId) {
      console.log(`  → Triggering ${linkedTile.type} at (${linkedTile.x}, ${linkedTile.y})`);
      // Pass true to indicate this is a triggered interaction (not direct player action)
      if (interactWithTile(linkedTile, true)) {
        triggeredCount++;
      }
    }
  }
  
  console.log(`✓ Triggered ${triggeredCount} linked tiles`);
}

// Toggle nearby lights when switch is activated
function toggleNearbyLights(switchX, switchY) {
  // Find and toggle lights within range
  if (typeof lighting === 'undefined' || !lighting.lights) {
    console.warn(`toggleNearbyLights: Lighting system not available`);
    return;
  }
  
  let toggledCount = 0;
  for (let light of lighting.lights) {
    if (light && light.x !== undefined && light.y !== undefined) {
      let distance = Math.abs(light.x - switchX) + Math.abs(light.y - switchY);
      if (distance <= 5) { // Toggle lights within 5 tiles
        light.enabled = !light.enabled;
        toggledCount++;
        console.log(`Switch at (${switchX}, ${switchY}) toggled light at (${light.x}, ${light.y}) to: ${light.enabled}`);
      }
    }
  }
  
  if (toggledCount > 0) {
    lighting.needsUpdate = true;
    console.log(`Toggled ${toggledCount} nearby lights`);
  }
}

// Draw interactive tiles
function drawInteractiveTiles() {
  // Get visible viewport for culling (performance optimization)
  let viewport = typeof getVisibleViewport === 'function' ? getVisibleViewport() : null;
  
  for (let tile of interactiveTiles) {
    // Skip tiles outside viewport
    if (viewport && (tile.x < viewport.minX || tile.x > viewport.maxX ||
                    tile.y < viewport.minY || tile.y > viewport.maxY)) {
      continue;
    }
    
    // Skip logic/script tiles if toggled off in editor
    if (typeof editorUI !== 'undefined') {
      let typeInfo = INTERACTIVE_TYPES[tile.type];
      if (typeInfo && (typeInfo.isLogic || typeInfo.isScript) && !editorUI.showLogic) {
        continue;
      }
    }
    
    push();
    
    // For doors, determine the visual based on state
    let displayType = tile.type;
    if (isDoorType(tile.type)) {
      const isOpen = isDoorOpen(tile.x, tile.y);
      
      // Get base door type (door, door_wooden, door_metal)
      const baseType = getDoorBaseType(tile.type);
      
      // Construct the correct visual type based on state
      if (baseType === 'door_wooden') {
        displayType = isOpen ? 'door_wooden_open' : 'door_wooden_closed';
      } else if (baseType === 'door_metal') {
        displayType = isOpen ? 'door_metal_open' : 'door_metal_closed';
      } else if (baseType === 'door_brick_wall') {
        displayType = isOpen ? 'door_opened_wall_brick' : 'door_closed_wall_brick';
      } else {
        displayType = isOpen ? 'door_open' : 'door_closed';
      }
    }
    
    // Get the image for this tile type from the tile system
    let img = null;
    if (typeof tileSystem !== 'undefined' && tileSystem.loadedImages) {
      // Try to get the specific state image first
      img = tileSystem.loadedImages[displayType];
      
      // If not found, try the base type (door, switch)
      if (!img) {
        let baseType = displayType.includes('door') ? 'door' : 
                      displayType.includes('switch') ? 'switch' : displayType;
        img = tileSystem.loadedImages[baseType];
      }
    }
    
    if (img) {
      let t = tile.transform;
      if (t && (t.flipState || t.rotation)) {
        let cx = tile.x * tile.size + tile.size / 2;
        let cy = tile.y * tile.size + tile.size / 2;
        translate(cx, cy);
        if (t.rotation) rotate(radians(t.rotation));
        let sx = 1, sy = 1;
        if (t.flipState === 1) sx = -1;
        else if (t.flipState === 2) { sx = -1; sy = -1; }
        else if (t.flipState === 3) sy = -1;
        scale(sx, sy);
        imageMode(CENTER);
        image(img, 0, 0, tile.size, tile.size);
      } else {
        imageMode(CORNER);
        image(img, tile.x * tile.size, tile.y * tile.size, tile.size, tile.size);
      }
    } else {
      // Fallback: draw colored rectangle with border
      stroke(255);
      strokeWeight(2);
      
      if (tile.type.includes('door')) {
        // Determine if door is open based on state
        const isOpen = isDoorOpen(tile.x, tile.y);
        fill(isOpen ? color(139, 69, 19) : color(101, 67, 33)); // Lighter when open
      } else if (tile.type.includes('switch')) {
        fill(tile.type.includes('on') ? color(0, 255, 0) : color(128, 128, 128)); // Green on, Gray off
      } else {
        fill(120); // Default gray
      }
      
      rect(tile.x * tile.size, tile.y * tile.size, tile.size, tile.size);
    }
    
    pop();
  }
}

// Check if interactive tile blocks light
function interactiveTileBlocksLight(x, y) {
  let tile = getInteractiveTileAt(x, y);
  if (tile && INTERACTIVE_TYPES[tile.type]) {
    // For doors, check the door state
    if (isDoorType(tile.type)) {
      const isClosed = isDoorClosed(tile.x, tile.y);
      return isClosed; // Closed doors block light, open doors don't
    }
    
    // For other tiles, use their static blocksLight property
    return INTERACTIVE_TYPES[tile.type].blocksLight;
  }
  return false;
}

// Initialize interactive tiles system
function initInteractiveTiles() {
  console.log("Interactive tiles system initialized");
}

// ── Tile Sound Playback ─────────────────────────────────────────────────
// Looks up the tile definition's soundInteract field and plays it.
// Falls back to procedural presets for common tile types if no sound assigned.

function _playTileSound(tile) {
  if (typeof playSound !== 'function') return;

  // Look up the tile definition for a user-assigned sound
  let soundId = null;
  if (typeof getTileDefinition === 'function') {
    const def = getTileDefinition(tile.type);
    if (def && def.soundInteract) {
      soundId = def.soundInteract;
    }
  }

  // Fallback: auto-play procedural presets for common interactive types
  if (!soundId) {
    if (isDoorType(tile.type)) {
      // Check if the door just opened or closed
      const closed = isDoorClosed(tile.x, tile.y);
      soundId = closed ? 'door_close' : 'door_open';
    } else if (tile.type && tile.type.includes('switch')) {
      soundId = 'switch_on';
    } else if (tile.type && tile.type.includes('button')) {
      soundId = 'click';
    }
  }

  if (soundId) {
    playSound(soundId, { x: tile.x * 32 + 16, y: tile.y * 32 + 16 });
  }
}

// ══════════════════════════════════════════════════════════════════════════
// UNIFIED EVENT PIPELINE - single per-frame entry point
// Replaces the old split between trigger_system.checkPlayerTriggers(),
// script_system.checkPlayerTileScripts(), and event_tiles checks.
// ══════════════════════════════════════════════════════════════════════════

// Track last player grid to detect entering a new tile cell
let _lastEventGridX = null;
let _lastEventGridY = null;

/**
 * Single per-frame function that checks ALL tile-based events at the player position.
 * Handles: interactive tiles (scriptId, triggers), event tiles (legacy), trigger registry (legacy).
 * Called once per frame from engine.js - replaces checkPlayerTriggers + checkPlayerTileScripts.
 */
function checkAllTileEvents() {
  if (typeof player === 'undefined' || !player) return;
  if (typeof editMode !== 'undefined' && editMode) {
    // Reset grid tracking when in edit mode so events fire when play resumes
    _lastEventGridX = null;
    _lastEventGridY = null;
    return;
  }

  const gridX = Math.floor(player.x);
  const gridY = Math.floor(player.y);

  // Only fire when player enters a NEW grid cell
  if (_lastEventGridX === gridX && _lastEventGridY === gridY) return;

  const prevX = _lastEventGridX;
  const prevY = _lastEventGridY;
  _lastEventGridX = gridX;
  _lastEventGridY = gridY;

  // ── 1. Fire onPlayerExit for the previous cell ──
  if (prevX !== null && prevY !== null) {
    if (typeof executeScript === 'function') {
      executeScript(prevX, prevY, 'onPlayerExit');
    }
  }

  // ── 2. Check interactive tiles at this position ──
  for (let tile of interactiveTiles) {
    if (!tile || tile.x !== gridX || tile.y !== gridY) continue;

    // Script tiles with scriptId → resolve & execute
    if (tile.scriptId) {
      _executeResolvedScript(tile);
    }

    // Script templates attached via script_system
    if (typeof executeScript === 'function') {
      executeScript(tile.x, tile.y, 'onPlayerEnter');
    }
  }

  // ── 3. Legacy: check event tiles (eventTiles.placedEvents) ──
  if (typeof eventTiles !== 'undefined' && eventTiles.placedEvents) {
    const key = `${gridX},${gridY}`;
    const ev = eventTiles.placedEvents[key];
    if (ev && ev.enabled) {
      // Cooldown check
      if (ev.cooldownMs && ev._lastFired && (Date.now() - ev._lastFired < ev.cooldownMs)) {
        // Still in cooldown
      } else if (ev.oneTime && ev._hasFired) {
        // Already fired (one-time)
      } else {
        if (ev.scriptId) {
          _executeResolvedScript(ev);
        }
        ev._lastFired = Date.now();
        ev._hasFired = true;
      }
    }
  }

  // ── 4. Legacy: check triggerRegistry entries ──
  if (typeof triggerRegistry !== 'undefined') {
    for (let triggerId in triggerRegistry) {
      const trigger = triggerRegistry[triggerId];
      if (!trigger || !trigger.enabled) continue;
      const tx = Math.floor(trigger.position.x);
      const ty = Math.floor(trigger.position.y);
      if (tx === gridX && ty === gridY) {
        if (typeof fireTrigger === 'function') {
          fireTrigger(triggerId);
        }
      }
    }
  }
}

/**
 * Resolve and execute a script by its scriptId on a tile/event.
 * Uses resolveScript from script_system.js (builtins + external level scripts).
 */
function _executeResolvedScript(tileOrEvent) {
  const scriptId = tileOrEvent.scriptId;
  if (!scriptId) return;

  try {
    const scriptFn = (typeof resolveScript === 'function')
      ? resolveScript(scriptId)
      : (window.levelScripts && window.levelScripts[scriptId]);

    if (scriptFn && typeof scriptFn === 'function') {
      const ctx = (typeof scriptContext !== 'undefined')
        ? scriptContext
        : { log: (...a) => console.log('[script]', ...a) };
      scriptFn(ctx, tileOrEvent);
    }
  } catch (e) {
    console.error(`[EVENT] Error executing script "${scriptId}" at (${tileOrEvent.x},${tileOrEvent.y}):`, e);
  }
}
