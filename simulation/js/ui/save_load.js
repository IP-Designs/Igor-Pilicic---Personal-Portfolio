// ============================================
// SAVE/LOAD SYSTEM
// Handles all localStorage persistence and map management
// ============================================

// Global level scripts container
window.levelScripts = window.levelScripts || {};

/** Return the project-scoped API base for levels, e.g. /api/projects/MyGame/levels */
function _levelApiBase() {
  if (window.activeProject && window.activeProject.folder) {
    return `/api/projects/${encodeURIComponent(window.activeProject.folder)}/levels`;
  }
  return '/api/levels'; // legacy fallback
}

/** Return a project-scoped localStorage key for a map */
function _localStorageKey(mapName) {
  if (window.activeProject && window.activeProject.folder) {
    return `tinyhuman_${window.activeProject.folder}_map_${mapName}`;
  }
  return `tinyhuman_map_${mapName}`; // legacy fallback
}

/** Return the localStorage key prefix for the active project */
function _localStoragePrefix() {
  if (window.activeProject && window.activeProject.folder) {
    return `tinyhuman_${window.activeProject.folder}_map_`;
  }
  return 'tinyhuman_map_';
}

// Load level scripts file for a map (SYNCHRONOUS to avoid race conditions)
function loadLevelScripts(mapName) {
  // Clear previous scripts
  window.levelScripts = {};
  
  // Remove old script tag if exists
  const oldScript = document.getElementById('levelScriptsTag');
  if (oldScript) {
    oldScript.remove();
  }
  
  // Load synchronously via XHR so scripts are available immediately
  const scriptPath = `levels/${mapName}.scripts.js`;
  console.log(`[SCRIPTS] Loading level scripts from: ${scriptPath}`);
  
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', scriptPath, false); // synchronous
    xhr.send();
    
    if (xhr.status === 200 && xhr.responseText) {
      // Execute the script code directly
      const scriptEl = document.createElement('script');
      scriptEl.id = 'levelScriptsTag';
      scriptEl.textContent = xhr.responseText;
      document.head.appendChild(scriptEl);
      
      const count = Object.keys(window.levelScripts).length;
      console.log(`[SCRIPTS] ✓ Loaded ${count} level scripts from ${scriptPath}:`, Object.keys(window.levelScripts));
    } else {
      console.warn(`[SCRIPTS] No scripts file found: ${scriptPath} (status ${xhr.status}) - using built-in handlers only`);
    }
  } catch (e) {
    console.warn(`[SCRIPTS] Could not load scripts file: ${scriptPath} -`, e.message);
  }
}

// Initialize save modal state
if (typeof window.saveModal === 'undefined') {
  window.saveModal = {
    mode: '',
    isOpen: false,
    currentMapName: '',
    selectedMap: '',
    availableMaps: [],
    errorMessage: '',
    successMessage: ''
  };
  console.log('[SAVE_LOAD] window.saveModal initialized');
}

// Open save modal
function openSaveModal(mode) {
  console.log('[SAVE_LOAD] openSaveModal() called with mode:', mode);
  window.saveModal.mode = mode;
  
  if (mode === 'load' || mode === 'delete') {
    loadAvailableMaps();
  }
  
  showSaveLoadModal(mode);
}

// Close save modal
function closeSaveModal() {
  // Don't clear currentMapName - it should persist as the loaded/saved map name
  window.saveModal.selectedMap = '';
  window.saveModal.errorMessage = '';
  window.saveModal.successMessage = '';
  closeModal();
}

// Load available maps from server and localStorage
function loadAvailableMaps() {
  console.log('[SAVE_LOAD] loadAvailableMaps() called');
  window.saveModal.availableMaps = [];
  
  // Load from both sources
  loadAvailableMapsAsync();
}

async function loadAvailableMapsAsync() {
  console.log('[SAVE_LOAD] loadAvailableMapsAsync() - starting');
  const mapSet = new Set();
  let serverMaps = [];
  
  // Get maps from server (source of truth for file-based maps)
  try {
    console.log('[SAVE_LOAD] Attempting to load from server...');
    serverMaps = await loadMapListFromServer();
    serverMaps.forEach(m => mapSet.add(m));
    console.log(`[SAVE_LOAD] Found ${serverMaps.length} maps on server:`, serverMaps);
  } catch (e) {
    console.log('[SAVE_LOAD] Server unavailable:', e.message);
  }
  
  // Clean up stale localStorage entries that no longer exist on the server
  // Only look at keys belonging to the active project
  const lsPrefix = _localStoragePrefix();
  if (serverMaps.length > 0 || serverMaps !== null) {
    const serverSet = new Set(serverMaps);
    for (let key in localStorage) {
      if (key.startsWith(lsPrefix)) {
        let mapName = key.slice(lsPrefix.length);
        if (!serverSet.has(mapName)) {
          console.log('[SAVE_LOAD] Removing stale localStorage entry:', mapName);
          localStorage.removeItem(key);
        } else {
          mapSet.add(mapName);
        }
      }
    }
  }
  
  window.saveModal.availableMaps = Array.from(mapSet).sort();
  console.log('[SAVE_LOAD] Combined available maps:', window.saveModal.availableMaps);
  
  // Update UI if modal is open
  if (typeof updateSaveLoadModalList === 'function') {
    console.log('[SAVE_LOAD] Calling updateSaveLoadModalList()');
    updateSaveLoadModalList();
  } else {
    console.log('[SAVE_LOAD] updateSaveLoadModalList not available');
  }
}

// Validate tile definitions before saving
function validateTileDefinitionsBeforeSave() {
  if (typeof validateTileDefinitions !== 'undefined' && typeof tileSystem !== 'undefined' && tileSystem.definitions) {
    const validation = validateTileDefinitions(tileSystem.definitions);
    if (!validation.isValid) {
      const errorMsg = formatValidationErrors(validation);
      console.warn('⚠️ Tile definitions have errors:\n', errorMsg);
      return { isValid: false, message: errorMsg };
    }
    return { isValid: true };
  }
  return { isValid: true };
}

/**
 * Refresh tile definitions from the authoritative JSON file.
 * Merges fresh flags and properties into the current definitions without
 * losing user-customized tiles from the save. This ensures that
 * newly-added flags (BLOCKS_LIGHT, HAZARD, etc.) are always present
 * even when loading old save files.
 */
async function refreshDefinitionsFromJSON() {
  try {
    const response = await fetch('js/data/tile-definitions.json');
    if (!response.ok) {
      console.warn('[RESTORE] Could not fetch fresh tile-definitions.json');
      return;
    }
    const freshDefs = await response.json();
    
    if (!freshDefs || !freshDefs.categories) {
      console.warn('[RESTORE] Fresh definitions are invalid');
      return;
    }
    
    if (!tileSystem.definitions || !tileSystem.definitions.categories) {
      // No current definitions - just use fresh ones
      tileSystem.definitions = freshDefs;
      console.log('[RESTORE] ✓ Replaced definitions with fresh JSON (no existing definitions)');
      return;
    }
    
    let updatedFlags = 0;
    let addedTiles = 0;
    let addedCategories = 0;
    
    // Merge fresh definitions into current definitions
    for (let categoryName in freshDefs.categories) {
      let freshCategory = freshDefs.categories[categoryName];
      
      if (!tileSystem.definitions.categories[categoryName]) {
        // Category doesn't exist in save - add it
        tileSystem.definitions.categories[categoryName] = freshCategory;
        addedCategories++;
        continue;
      }
      
      let currentCategory = tileSystem.definitions.categories[categoryName];
      if (!currentCategory.tiles) currentCategory.tiles = {};
      
      for (let tileName in freshCategory.tiles) {
        let freshTile = freshCategory.tiles[tileName];
        
        if (!currentCategory.tiles[tileName]) {
          // Tile doesn't exist in save - add it
          currentCategory.tiles[tileName] = freshTile;
          addedTiles++;
          continue;
        }
        
        let currentTile = currentCategory.tiles[tileName];
        
        // Merge flags: union of fresh flags and current flags
        if (freshTile.flags && Array.isArray(freshTile.flags)) {
          if (!currentTile.flags || !Array.isArray(currentTile.flags)) {
            currentTile.flags = [...freshTile.flags];
            updatedFlags++;
          } else {
            // Union: add any flags from fresh that aren't in current
            let before = currentTile.flags.length;
            for (let flag of freshTile.flags) {
              if (!currentTile.flags.includes(flag)) {
                currentTile.flags.push(flag);
              }
            }
            if (currentTile.flags.length > before) updatedFlags++;
          }
        }
        
        // Merge other important properties that may be new
        // (Only if they don't exist in current - don't overwrite user edits)
        let mergeProps = ['layer', 'walkable', 'blocksVision', 'environment', 'biome', 'damage', 'highTraction'];
        for (let prop of mergeProps) {
          if (freshTile[prop] !== undefined && currentTile[prop] === undefined) {
            currentTile[prop] = freshTile[prop];
          }
        }
      }
    }
    
    // Also refresh the placed tiles' baked properties
    if (typeof refreshPlacedTileProperties === 'function') {
      refreshPlacedTileProperties();
    }
    
    // Trigger lighting update so obstacle cache reflects new flags
    if (typeof triggerLightingUpdate === 'function') {
      triggerLightingUpdate();
    }
    
    if (updatedFlags > 0 || addedTiles > 0 || addedCategories > 0) {
      console.log(`[RESTORE] ✓ Merged fresh definitions: ${updatedFlags} flag updates, ${addedTiles} new tiles, ${addedCategories} new categories`);
    } else {
      console.log('[RESTORE] ✓ Definitions are up to date (no merge needed)');
    }
  } catch (error) {
    console.warn('[RESTORE] Error refreshing definitions from JSON:', error.message);
  }
}

// Save current map as JSON file and localStorage
function saveMap(mapName) {
  console.log('💾 saveMap() called with:', mapName);
  
  if (!mapName || mapName.trim() === '') {
    updateModalStatus('Please enter a map name', 'error');
    return false;
  }
  
  mapName = mapName.trim();
  
  try {
    // Run world state validation before saving
    if (typeof SaveValidator !== 'undefined') {
      const validationReport = SaveValidator.validate();
      if (!validationReport.isValid) {
        console.error('❌ World state validation failed! Saving anyway but check console for errors.');
        updateModalStatus('Warning: Validation errors found - check console', 'warning');
      } else if (validationReport.warnings.length > 0) {
        console.warn(`⚠️ ${validationReport.warnings.length} warning(s) found during validation`);
      }
    }
    
    // Validate tile definitions before saving
    const tileValidation = validateTileDefinitionsBeforeSave();
    if (!tileValidation.isValid) {
      console.warn('Tile validation warnings:', tileValidation.message);
      // Don't block save, just warn
    }
    
    // Create map data
    let mapData = {
      name: mapName,
      version: '2.0',
      created: new Date().toISOString(),
      worldWidth: typeof WORLD_WIDTH !== 'undefined' ? WORLD_WIDTH : 60,
      worldHeight: typeof WORLD_HEIGHT !== 'undefined' ? WORLD_HEIGHT : 34,
      tiles: {},
      interactiveTiles: [],
      triggers: [],
      // Tile definitions are stored at project level (tile-definitions.json), not per-map
    };
    
    console.log('📋 Map structure created, starting data collection...');
    
    // Add interactive tiles data with linkIds, activationIds and door states
    if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
      mapData.interactiveTiles = interactiveTiles.map(tile => {
        let data = {
          x: tile.x,
          y: tile.y,
          type: tile.type,
          linkId: tile.linkId || null,
          activationId: tile.activationId || null,
          doorState: isDoorType(tile.type) ? getDoorState(tile.x, tile.y) : null,
          scriptId: tile.scriptId || null,
          scriptPrompt: tile.scriptPrompt || null,
          isLogic: tile.isLogic || false,
          logicType: tile.logicType || null,
          transform: tile.transform || null
        };
        // Save light enabled state
        if (tile.type === 'light' && typeof getLightAt === 'function') {
          let light = getLightAt(tile.x, tile.y);
          if (light) data.lightEnabled = light.enabled !== false;
        }
        return data;
      });
      console.log(`✓ Collected ${mapData.interactiveTiles.length} interactive tiles`);
    }
    
    // Add lighting data if available
    if (typeof lighting !== 'undefined' && lighting) {
      mapData.lighting = {
        enabled: lighting.enabled || false,
        ambientLight: lighting.ambientLight || 0.5,
        ambientColor: lighting.ambientColor || [100, 100, 100],
        roofShadowDarkness: lighting.roofShadowDarkness || 0.7,
        lights: []
      };
      
      if (lighting.lights && Array.isArray(lighting.lights)) {
        mapData.lighting.lights = lighting.lights.map(light => ({
          x: light.x,
          y: light.y,
          intensity: light.intensity || 1.0,
          radius: light.radius || 10,
          falloff: light.falloff || 0.5,
          brightness: light.brightness || 1.0,
          color: Array.isArray(light.color) ? [...light.color] : [255, 255, 255],
          castsShadows: light.castsShadows || false,
          enabled: light.enabled !== false
        }));
        console.log(`✓ Collected ${mapData.lighting.lights.length} lights`);
      }
    }
    
    // Add triggers if available (legacy - triggerRegistry is deprecated)
    if (typeof exportTriggersToJSON === 'function') {
      mapData.triggers = exportTriggersToJSON();
      console.log(`✓ Collected ${mapData.triggers.length} triggers (legacy)`);
    }
    
    // Event tiles are now checked via the unified pipeline (checkAllTileEvents).
    // Still serialize for backward compatibility with older map files.
    if (typeof eventTiles !== 'undefined' && eventTiles.placedEvents) {
      mapData.eventTiles = [];
      for (let key in eventTiles.placedEvents) {
        const ev = eventTiles.placedEvents[key];
        mapData.eventTiles.push({
          x: ev.x,
          y: ev.y,
          type: ev.type,
          state: ev.state || 'default',
          enabled: ev.enabled !== false,
          script: ev.script || null,
          triggers: ev.triggers || null,
          oneTime: ev.oneTime || false,
          cooldownMs: ev.cooldownMs || 0,
          metadata: ev.metadata || {}
        });
      }
      console.log(`✓ Collected ${mapData.eventTiles.length} event tiles (legacy)`);
    }
    
    // Add logic tile states if available
    if (typeof logicTileStates !== 'undefined' && logicTileStates.size > 0) {
      mapData.logicStates = {};
      for (let [key, state] of logicTileStates) {
        mapData.logicStates[key] = state;
      }
      console.log(`✓ Collected ${logicTileStates.size} logic tile states`);
    }
    
    // Add signposts if available
    if (typeof getSignpostsForSave === 'function') {
      mapData.signposts = getSignpostsForSave();
      console.log(`✓ Collected ${mapData.signposts.length} signposts`);
    }
    
    // Add particle emitters if available
    if (typeof getParticleEmitterData === 'function') {
      mapData.particleEmitters = getParticleEmitterData();
      console.log(`✓ Collected ${mapData.particleEmitters.length} particle emitters`);
    }
    
    // Add weather tiles if available
    if (typeof getWeatherTileData === 'function') {
      mapData.weatherTiles = getWeatherTileData();
      console.log(`✓ Collected ${mapData.weatherTiles.length} weather tiles`);
    }

    // Add decorations if available
    if (typeof getDecorationsForSave === 'function') {
      mapData.decorations = getDecorationsForSave();
      console.log(`✓ Collected ${mapData.decorations.length} decorations`);
    }

    // Add entities if available
    if (typeof Engine !== 'undefined' && Engine.has('entities')) {
      mapData.entities = Engine.get('entities').getForSave();
      console.log(`✓ Collected ${mapData.entities.length} entities`);
    }

    // Add world items if available
    if (typeof Engine !== 'undefined' && Engine.has('worldItems')) {
      mapData.worldItems = Engine.get('worldItems').getForSave();
      console.log(`✓ Collected ${mapData.worldItems.length} world items`);
    }

    // Add player inventory if available
    if (typeof Engine !== 'undefined' && Engine.has('inventory')) {
      mapData.inventory = Engine.get('inventory').getForSave();
      console.log(`✓ Collected player inventory (${mapData.inventory.slots.filter(s => s !== null).length} items)`);
    }

    // Add hotbar state if available
    if (typeof Engine !== 'undefined' && Engine.has('hotbar')) {
      mapData.hotbar = Engine.get('hotbar').getForSave();
      console.log(`✓ Collected hotbar state (active slot: ${mapData.hotbar.activeSlot})`);
    }
    
    // Copy all placed tiles - THIS IS CRITICAL
    console.log('🔍 Checking tileSystem.placedTiles...');
    console.log('   typeof tileSystem:', typeof tileSystem);
    console.log('   tileSystem exists:', typeof tileSystem !== 'undefined');
    console.log('   tileSystem.placedTiles exists:', typeof tileSystem !== 'undefined' && !!tileSystem.placedTiles);
    
    if (typeof tileSystem !== 'undefined' && tileSystem.placedTiles) {
      let positionCount = Object.keys(tileSystem.placedTiles).length;
      console.log(`📍 tileSystem.placedTiles has ${positionCount} grid positions`);
      
      let totalTileCount = 0;
      for (let key in tileSystem.placedTiles) {
        mapData.tiles[key] = tileSystem.placedTiles[key];
        let tilesAtPos = tileSystem.placedTiles[key];
        if (Array.isArray(tilesAtPos)) {
          totalTileCount += tilesAtPos.length;
        } else {
          totalTileCount += 1;
        }
      }
      
      console.log(`✓ Collected ${positionCount} positions with ${totalTileCount} total tiles`);
    } else {
      console.warn('⚠️ WARNING: tileSystem or placedTiles is undefined!');
      console.log('   tileSystem:', tileSystem);
    }
    
    // Convert to JSON and save to localStorage
    let dataStr = JSON.stringify(mapData, null, 2);
    
    // Final verification logging
    console.log('✅ FINAL SAVE SUMMARY:');
    console.log(`   📍 Tile Positions: ${Object.keys(mapData.tiles).length}`);
    let finalTotalTiles = 0;
    for (let key in mapData.tiles) {
      let tileArray = mapData.tiles[key];
      if (Array.isArray(tileArray)) {
        finalTotalTiles += tileArray.length;
      } else {
        finalTotalTiles += 1;
      }
    }
    console.log(`   🎨 Total Tiles: ${finalTotalTiles}`);
    console.log(`   🚪 Interactive Tiles: ${mapData.interactiveTiles?.length || 0}`);
    console.log(`   💡 Lights: ${mapData.lighting?.lights?.length || 0}`);
    console.log(`   📦 JSON Size: ${(dataStr.length / 1024).toFixed(2)} KB`);
    console.log('   Sample tiles:', Object.keys(mapData.tiles).slice(0, 3));
    
    // Save to server first (levels/ folder) - primary storage
    saveMapToServer(mapName, mapData).then(success => {
      if (success) {
        // Try localStorage backup only if data is small enough (< 4MB)
        const MAX_LOCALSTORAGE_SIZE = 4 * 1024 * 1024; // 4MB limit
        if (dataStr.length < MAX_LOCALSTORAGE_SIZE) {
          try {
            localStorage.setItem(_localStorageKey(mapName), dataStr);
            console.log(`📦 localStorage backup created (${(dataStr.length / 1024).toFixed(1)} KB)`);
          } catch (e) {
            console.warn('⚠️ localStorage backup skipped (quota exceeded)');
          }
        } else {
          console.log(`⚠️ Map too large for localStorage (${(dataStr.length / 1024 / 1024).toFixed(2)} MB), server-only save`);
        }
        
        updateModalStatus(`Map saved: ${mapName}`, 'success');
        console.log(`📁 Map "${mapName}" saved to levels/ folder`);
      } else {
        // Server failed, try localStorage as fallback
        try {
          localStorage.setItem(_localStorageKey(mapName), dataStr);
          updateModalStatus(`Map saved to localStorage only (server unavailable)`, 'warning');
          console.warn('⚠️ Could not save to server, localStorage backup created');
        } catch (e) {
          updateModalStatus(`Failed to save: Map too large and server unavailable`, 'error');
          console.error('❌ Save failed - server unavailable and localStorage quota exceeded');
        }
      }
      
      setTimeout(() => {
        closeSaveModal();
      }, 1500);
    });
    
    window.saveModal.currentMapName = mapName;
    console.log(`Map "${mapName}" saved with ${Object.keys(mapData.tiles).length} tiles`);
    
    return true;
  } catch (error) {
    updateModalStatus('Failed to save: ' + error.message, 'error');
    console.error('Save error:', error);
    return false;
  }
}

// Save map to server (levels/ folder)
async function saveMapToServer(mapName, mapData) {
  try {
    const response = await fetch(`${_levelApiBase()}/${encodeURIComponent(mapName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapData)
    });
    
    if (!response.ok) {
      console.warn('[SAVE_LOAD] Server save failed:', response.status);
      return false;
    }
    
    const result = await response.json();
    console.log('[SAVE_LOAD] Server save result:', result);
    return result.success;
  } catch (error) {
    console.warn('[SAVE_LOAD] Server save error:', error.message);
    return false;
  }
}

// Load map list from server
async function loadMapListFromServer() {
  const endpoint = _levelApiBase();
  console.log(`[SAVE_LOAD] loadMapListFromServer() - fetching ${endpoint}`);
  try {
    const response = await fetch(endpoint);
    console.log('[SAVE_LOAD] Server response status:', response.status);
    if (!response.ok) {
      console.warn('[SAVE_LOAD] Server returned non-OK status:', response.status);
      return [];
    }
    const data = await response.json();
    console.log('[SAVE_LOAD] Server returned maps:', data.maps);
    return data.maps || [];
  } catch (error) {
    console.warn('[SAVE_LOAD] Could not load map list from server:', error.message);
    return [];
  }
}

// Load map from localStorage
function loadMap(mapName) {
  console.log('[SAVE_LOAD] loadMap() called with mapName:', mapName);
  
  if (!mapName || mapName.trim() === '') {
    console.log('[SAVE_LOAD] ERROR: No map name provided');
    updateModalStatus('Please select a map', 'error');
    return false;
  }
  
  // Try server first, then localStorage
  loadMapData(mapName).then(parsedData => {
    if (!parsedData) {
      console.error(`[SAVE_LOAD] Map not found: ${mapName}`);
      updateModalStatus('Map not found', 'error');
      return;
    }
    
    applyMapData(parsedData, mapName);
  });
  
  return true; // Async operation started
}

// Load map data from server or localStorage
async function loadMapData(mapName) {
  // Try server first
  try {
    const response = await fetch(`${_levelApiBase()}/${encodeURIComponent(mapName)}`);
    if (response.ok) {
      const data = await response.json();
      console.log('[SAVE_LOAD] Map loaded from server');
      return data;
    }
  } catch (error) {
    console.log('[SAVE_LOAD] Server unavailable, trying localStorage');
  }
  
  // Fallback to localStorage
  const localData = localStorage.getItem(_localStorageKey(mapName));
  if (localData) {
    console.log('[SAVE_LOAD] Map loaded from localStorage');
    return JSON.parse(localData);
  }
  
  return null;
}

// ============================================
// RESTORE WORLD FROM DATA - Single canonical function
// Used by applyMapData (UI load), loadDefaultMap (startup), and any future callers.
// Handles ALL subsystems: world size, tiles, interactive tiles, lighting, triggers,
// event tiles, logic states, signposts, particles, weather, tile definitions, player reset.
// Does NOT handle UI (modal status, closeSaveModal, localStorage last_map).
// ============================================
function restoreWorldFromData(parsedData, mapName) {
  console.log('[RESTORE] ✓ Restoring world from data');
  console.log(`[RESTORE]   📍 Tile positions: ${Object.keys(parsedData.tiles || {}).length}`);
  console.log(`[RESTORE]   🚪 Interactive tiles: ${parsedData.interactiveTiles?.length || 0}`);
  console.log(`[RESTORE]   💡 Lights: ${parsedData.lighting?.lights?.length || 0}`);

  // Restore world size from map data (if available)
  if (parsedData.worldWidth && parsedData.worldHeight && typeof resizeWorld === 'function') {
    resizeWorld(parsedData.worldWidth, parsedData.worldHeight);
    console.log(`[RESTORE] ✓ World size restored to ${WORLD_WIDTH}x${WORLD_HEIGHT}`);
  }

  // --- Clear all subsystems ---

  if (typeof clearAllTiles === 'function') {
    clearAllTiles();
  } else if (typeof tileSystem !== 'undefined') {
    tileSystem.placedTiles = {};
    if (typeof invalidateTileDrawCache === 'function') invalidateTileDrawCache();
  }

  if (typeof clearAllLights === 'function') {
    clearAllLights();
  } else if (typeof lighting !== 'undefined') {
    lighting.lights = [];
  }

  // Reset ambient state flags so transitions can re-trigger on new map
  if (typeof lighting !== 'undefined') {
    lighting._isNight = false;
    lighting._isDay = false;
    lighting._nightApplied = false;
  }
  // Reset weather state
  window._rainActive = false;
  // Clear particle weather effects
  if (typeof particleEffects !== 'undefined' && particleEffects.weatherEffects) {
    particleEffects.weatherEffects.rain = false;
    particleEffects.weatherEffects.snow = false;
    particleEffects.weatherEffects.leaves = false;
  }

  if (typeof interactiveTiles !== 'undefined') {
    interactiveTiles = [];
  }

  if (typeof clearAllTriggers === 'function') {
    clearAllTriggers();
  }

  if (typeof eventTiles !== 'undefined' && eventTiles.placedEvents) {
    eventTiles.placedEvents = {};
  }

  if (typeof logicTileStates !== 'undefined') {
    logicTileStates.clear();
  }

  // Clear entities (prevent leaking entities from previous map)
  if (typeof Engine !== 'undefined' && Engine.has('entities')) {
    Engine.get('entities').clearAll();
  }

  // Clear world items
  if (typeof Engine !== 'undefined' && Engine.has('worldItems')) {
    Engine.get('worldItems').clearAll();
  }

  // Clear tile scripts (per-map, not global templates)
  if (typeof tileScripts !== 'undefined' && tileScripts instanceof Map) {
    tileScripts.clear();
  }

  // Clear undo/redo history (don't undo into previous map's state)
  if (typeof clearUndoHistory === 'function') {
    clearUndoHistory();
  }

  // Stop ambient sounds (they'll restart from new map's tiles)
  if (typeof stopAmbientSounds === 'function') {
    stopAmbientSounds();
  }

  // Cancel any in-progress ambient light transition
  if (typeof _ambientTransition !== 'undefined') {
    _ambientTransition = null;
  }

  console.log('[RESTORE] ✓ Cleared all subsystems');

  // --- Load interactive tiles (with linkIds, activationIds, door states, scripts) ---

  if (parsedData.interactiveTiles && Array.isArray(parsedData.interactiveTiles)) {
    let interactiveCount = 0;
    for (let tileData of parsedData.interactiveTiles) {
      if (typeof addInteractiveTile === 'function') {
        addInteractiveTile(tileData.x, tileData.y, tileData.type, tileData.linkId, tileData.activationId, tileData.transform || null);

        if (tileData.doorState && typeof setDoorState === 'function') {
          setDoorState(tileData.x, tileData.y, tileData.doorState);
        }

        // NOTE: Do NOT call placeTile() for interactive tiles here!
        // placeTile() calls addInteractiveTile() internally which would
        // overwrite the tile we just created and lose scriptId/scriptPrompt.

        // Set scriptId AFTER the tile is fully created (no more overwrites)
        if (tileData.scriptId && typeof setInteractiveTileScriptId === 'function') {
          setInteractiveTileScriptId(tileData.x, tileData.y, tileData.scriptId);
        }
        if (tileData.scriptPrompt) {
          const tile = typeof getInteractiveTileAt === 'function' ? getInteractiveTileAt(tileData.x, tileData.y) : null;
          if (tile) tile.scriptPrompt = tileData.scriptPrompt;
        }
        // Restore light enabled state (applied after lighting loads)
        if (tileData.type === 'light' && tileData.lightEnabled === false) {
          // Defer until after lights are loaded
          if (!parsedData._deferredLightStates) parsedData._deferredLightStates = [];
          parsedData._deferredLightStates.push({ x: tileData.x, y: tileData.y, enabled: false });
        }
        interactiveCount++;
      }
    }
    console.log(`[RESTORE] ✓ Loaded ${interactiveCount} interactive tiles`);
  }

  // --- Load tiles ---

  if (parsedData.tiles) {
    let positionCount = Object.keys(parsedData.tiles).length;
    let loadedCount = 0;
    for (let key in parsedData.tiles) {
      let tilesAtKey = parsedData.tiles[key];
      let [x, y] = key.split(',').map(Number);

      if (Array.isArray(tilesAtKey)) {
        for (let tile of tilesAtKey) {
          if (typeof placeTile === 'function') {
            let gs = tile.gridScale || 1;
            placeTile(x, y, tile.type, tile.category, tile.transform, gs);
            if (tile.brightness !== undefined && tile.brightness !== 100) {
              let placed = typeof getTileAt === 'function' ? getTileAt(x, y, true) : null;
              if (placed) { let last = placed[placed.length - 1]; if (last) last.brightness = tile.brightness; }
            }
            loadedCount++;
          }
        }
      } else {
        if (typeof placeTile === 'function') {
          let gs = tilesAtKey.gridScale || 1;
          placeTile(x, y, tilesAtKey.type, tilesAtKey.category, tilesAtKey.transform, gs);
          if (tilesAtKey.brightness !== undefined && tilesAtKey.brightness !== 100) {
            let placed = typeof getTileAt === 'function' ? getTileAt(x, y, true) : null;
            if (placed) { let last = placed[placed.length - 1]; if (last) last.brightness = tilesAtKey.brightness; }
          }
          loadedCount++;
        }
      }
    }
    console.log(`[RESTORE] ✓ Loaded ${loadedCount} tiles from ${positionCount} positions`);
  }

  // --- Load lighting ---

  if (parsedData.lighting && typeof lighting !== 'undefined') {
    let lightCount = 0;
    lighting.enabled = parsedData.lighting.enabled;
    lighting.ambientLight = parsedData.lighting.ambientLight;
    lighting.ambientColor = [...(parsedData.lighting.ambientColor || [100, 100, 100])];
    lighting.roofShadowDarkness = parsedData.lighting.roofShadowDarkness || 0.7;

    if (parsedData.lighting.lights && Array.isArray(parsedData.lighting.lights)) {
      for (let lightData of parsedData.lighting.lights) {
        lighting.lights.push({
          x: lightData.x,
          y: lightData.y,
          intensity: lightData.intensity || 1.0,
          radius: lightData.radius || 10,
          falloff: lightData.falloff || 0.5,
          brightness: lightData.brightness || 1.0,
          color: [...(lightData.color || [255, 255, 255])],
          castsShadows: lightData.castsShadows || false,
          enabled: lightData.enabled !== false,
          id: Date.now() + Math.random()
        });
        lightCount++;
      }
      lighting.needsUpdate = true;
      if (typeof triggerLightingUpdate === 'function') triggerLightingUpdate();
    }
    console.log(`[RESTORE] ✓ Loaded ${lightCount} lights`);
  }

  // Apply deferred light enabled states (from interactive tiles loaded earlier)
  if (parsedData._deferredLightStates && typeof getLightAt === 'function') {
    for (let ls of parsedData._deferredLightStates) {
      let light = getLightAt(ls.x, ls.y);
      if (light) {
        light.enabled = ls.enabled;
        console.log(`[RESTORE]   💡 Light at (${ls.x}, ${ls.y}) set to ${ls.enabled ? 'ON' : 'OFF'}`);
      }
    }
    if (typeof lighting !== 'undefined') lighting.needsUpdate = true;
    if (typeof triggerLightingUpdate === 'function') triggerLightingUpdate();
  }

  // --- Load tile definitions ---
  // Tile definitions live at project level (tile-definitions.json), not per-map.
  // Legacy saves may still include a tileDef snapshot - load it for backward compat,
  // then always refresh from the authoritative JSON file.

  if (parsedData.tileDef && typeof tileSystem !== 'undefined') {
    if (typeof validateTileDefinitions !== 'undefined') {
      const validation = validateTileDefinitions(parsedData.tileDef);
      if (validation.isValid) {
        tileSystem.definitions = parsedData.tileDef;
        console.log(`[RESTORE] ✓ Tile definitions loaded from save (legacy): ${validation.stats.totalTiles} tiles`);
      } else {
        console.warn('[RESTORE] ⚠️ Tile definitions in save are invalid, keeping existing');
      }
    } else {
      tileSystem.definitions = parsedData.tileDef;
    }
  }

  // Always load fresh definitions from project-level tile-definitions.json
  if (typeof refreshDefinitionsFromJSON === 'function') {
    refreshDefinitionsFromJSON();
  }

  // --- Load triggers ---

  // --- Load triggers (legacy - triggerRegistry is deprecated, kept for old map compat) ---
  if (parsedData.triggers && Array.isArray(parsedData.triggers) && typeof loadTriggersFromJSON === 'function') {
    loadTriggersFromJSON(parsedData.triggers);
    console.log(`[RESTORE] ✓ Loaded ${parsedData.triggers.length} triggers (legacy)`);
  }

  // --- Load event tiles (legacy - event checking now via unified pipeline) ---

  if (parsedData.eventTiles && Array.isArray(parsedData.eventTiles)) {
    let eventCount = 0;
    for (let evData of parsedData.eventTiles) {
      if (typeof placeEventTile === 'function') {
        placeEventTile(evData.x, evData.y, evData.type);
        const key = `${evData.x},${evData.y}`;
        if (typeof eventTiles !== 'undefined' && eventTiles.placedEvents && eventTiles.placedEvents[key]) {
          const ev = eventTiles.placedEvents[key];
          ev.state = evData.state || 'default';
          ev.enabled = evData.enabled !== false;
          if (evData.script) {
            if (typeof setEventTileScript === 'function') {
              setEventTileScript(evData.x, evData.y, evData.script);
            } else {
              ev.script = evData.script;
            }
          }
          if (evData.triggers) ev.triggers = evData.triggers;
          ev.oneTime = evData.oneTime || false;
          ev.cooldownMs = evData.cooldownMs || 0;
          if (evData.metadata) ev.metadata = evData.metadata;
        }
        eventCount++;
      }
    }
    console.log(`[RESTORE] ✓ Loaded ${eventCount} event tiles`);
  }

  // --- Load logic tile states ---

  if (parsedData.logicStates && typeof logicTileStates !== 'undefined') {
    for (let key in parsedData.logicStates) {
      logicTileStates.set(key, parsedData.logicStates[key]);
    }
    console.log(`[RESTORE] ✓ Loaded ${Object.keys(parsedData.logicStates).length} logic tile states`);
  }

  // --- Load signposts ---

  if (parsedData.signposts && typeof loadSignposts === 'function') {
    loadSignposts(parsedData.signposts);
    console.log(`[RESTORE] ✓ Loaded ${parsedData.signposts.length} signposts`);
  } else if (typeof clearSignposts === 'function') {
    clearSignposts();
  }

  // --- Load particle emitters ---

  if (parsedData.particleEmitters && typeof loadParticleEmitterData === 'function') {
    loadParticleEmitterData(parsedData.particleEmitters);
    console.log(`[RESTORE] ✓ Loaded ${parsedData.particleEmitters.length} particle emitters`);
  } else if (typeof clearParticleEmitters === 'function') {
    clearParticleEmitters();
  }

  // --- Load weather tiles ---

  if (parsedData.weatherTiles && typeof loadWeatherTileData === 'function') {
    loadWeatherTileData(parsedData.weatherTiles);
    console.log(`[RESTORE] ✓ Loaded ${parsedData.weatherTiles.length} weather tiles`);
  } else if (typeof clearWeatherTiles === 'function') {
    clearWeatherTiles();
  }

  // --- Load decorations ---

  if (typeof loadDecorations === 'function') {
    loadDecorations(parsedData.decorations || []);
  }

  // --- Load level scripts ---

  if (typeof loadLevelScripts === 'function') {
    loadLevelScripts(mapName);
  }

  // --- Reset trigger tracking so scripts fire at spawn position ---
  if (typeof _lastPlayerGrid !== 'undefined') {
    _lastPlayerGrid.x = null;
    _lastPlayerGrid.y = null;
  }

  // --- Reload tile images ---

  if (typeof loadTileImages === 'function') {
    loadTileImages();
  }

  // --- Bind animated tiles from restored definitions ---
  if (typeof bindAllTileAnimations === 'function') {
    bindAllTileAnimations();
  }

  // --- Restore entities from map data ---
  if (parsedData.entities && typeof Engine !== 'undefined' && Engine.has('entities')) {
    Engine.get('entities').loadFromSave(parsedData.entities);
    console.log(`[RESTORE] ✓ Entities restored: ${parsedData.entities.length}`);
  }

  // --- Restore world items from map data ---
  if (parsedData.worldItems && typeof Engine !== 'undefined' && Engine.has('worldItems')) {
    Engine.get('worldItems').loadFromSave(parsedData.worldItems);
    console.log(`[RESTORE] ✓ World items restored: ${parsedData.worldItems.length}`);
  }

  // --- Restore player inventory from map data ---
  if (parsedData.inventory && typeof Engine !== 'undefined' && Engine.has('inventory')) {
    Engine.get('inventory').loadFromSave(parsedData.inventory);
    var slotCount = parsedData.inventory.slots ? parsedData.inventory.slots.filter(function(s) { return s !== null; }).length : 0;
    console.log(`[RESTORE] ✓ Inventory restored: ${slotCount} items`);
  }

  // --- Restore hotbar state from map data ---
  if (parsedData.hotbar && typeof Engine !== 'undefined' && Engine.has('hotbar')) {
    Engine.get('hotbar').loadFromSave(parsedData.hotbar);
    console.log(`[RESTORE] ✓ Hotbar restored (active slot: ${parsedData.hotbar.activeSlot})`);
  }

  // --- Track current map name ---

  if (typeof window.saveModal !== 'undefined') {
    window.saveModal.currentMapName = mapName;
  }

  // --- Reset player to spawn ---

  if (typeof player !== 'undefined') {
    player.spawnX = WORLD_WIDTH / 2;
    player.spawnY = WORLD_HEIGHT / 2;

    if (typeof findPlayerStartPosition === 'function') {
      findPlayerStartPosition();
    }

    // Also honour explicit playerSpawn field (from older saves / demo_level)
    if (parsedData.playerSpawn) {
      player.spawnX = parsedData.playerSpawn.x;
      player.spawnY = parsedData.playerSpawn.y;
    }

    player.x = player.spawnX;
    player.y = player.spawnY;
    player.velocity = { x: 0, y: 0 };
    player.acceleration = { x: 0, y: 0 };
    player.isSitting = false;
    player.sittingTile = null;
    player.isJumping = false;
    console.log(`[RESTORE] ✓ Player positioned at (${player.x}m, ${player.y}m)`);
  }

  console.log('[RESTORE] ✅ WORLD RESTORE COMPLETE');

  // === DIAGNOSTIC: Print full script system state ===
  console.log('%c=== SCRIPT SYSTEM DIAGNOSTIC ===', 'color: #ff0; background: #333; font-size: 14px; padding: 4px 8px;');
  console.log('  window.levelScripts:', Object.keys(window.levelScripts || {}));
  console.log('  interactiveTiles count:', typeof interactiveTiles !== 'undefined' ? interactiveTiles.length : 'UNDEFINED');
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    const scriptTiles = interactiveTiles.filter(t => t && t.type === 'script');
    console.log('  Script tiles:', scriptTiles.length);
    scriptTiles.forEach(t => {
      console.log(`    → (${t.x}, ${t.y}) type="${t.type}" scriptId="${t.scriptId}"`);
    });
  }
  console.log('  _lastPlayerGrid:', typeof _lastPlayerGrid !== 'undefined' ? JSON.stringify(_lastPlayerGrid) : 'UNDEFINED');
  console.log('  Player spawn:', typeof player !== 'undefined' ? `(${player.spawnX}, ${player.spawnY})` : 'NO PLAYER');
  console.log('  Player pos:', typeof player !== 'undefined' ? `(${player.x}, ${player.y})` : 'NO PLAYER');
  console.log('  editMode:', typeof editMode !== 'undefined' ? editMode : 'UNDEFINED');
  console.log('  lighting.enabled:', typeof lighting !== 'undefined' ? lighting.enabled : 'UNDEFINED');
  console.log('  setNightTime available:', typeof setNightTime === 'function');
  console.log('  setWeatherEffect available:', typeof setWeatherEffect === 'function');
  console.log('  resolveScript available:', typeof resolveScript === 'function');
  if (typeof resolveScript === 'function') {
    console.log('  resolveScript("ambient_change"):', resolveScript('ambient_change') ? 'FOUND' : 'NOT FOUND');
    console.log('  resolveScript("weather_change"):', resolveScript('weather_change') ? 'FOUND' : 'NOT FOUND');
    console.log('  resolveScript("player_start"):', resolveScript('player_start') ? 'FOUND' : 'NOT FOUND');
  }
  console.log('%c=== END DIAGNOSTIC ===', 'color: #ff0; background: #333; font-size: 14px; padding: 4px 8px;');

  // --- Force lighting/obstacle cache rebuild after all data is loaded ---
  // This ensures the obstacle cache is built with all tiles present and correct definitions
  if (typeof triggerLightingUpdate === 'function') {
    triggerLightingUpdate();
    console.log('[RESTORE] ✓ Triggered final lighting update');
  }

  // --- Post-load validation ---

  if (typeof SaveValidator !== 'undefined') {
    setTimeout(() => {
      console.log('[RESTORE] Running post-load validation...');
      const validationReport = SaveValidator.validate();
      if (!validationReport.isValid) {
        console.error('[RESTORE] ❌ Post-load validation found errors!');
      } else if (validationReport.warnings.length > 0) {
        console.warn(`[RESTORE] ⚠️ ${validationReport.warnings.length} warning(s)`);
      } else {
        console.log('[RESTORE] ✅ Post-load validation passed');
      }
    }, 100);
  }
}

// Apply loaded map data to the game (UI wrapper around restoreWorldFromData)
function applyMapData(parsedData, mapName) {
  restoreWorldFromData(parsedData, mapName);

  // UI-specific: update modal status and remember last map
  if (typeof updateModalStatus === 'function') {
    updateModalStatus(`Loaded: ${mapName}`, 'success');
  }
  localStorage.setItem('tinyhuman_last_map', mapName);
  console.log(`[SAVE_LOAD] Saved last map name: ${mapName}`);

  setTimeout(() => {
    if (typeof closeSaveModal === 'function') closeSaveModal();
  }, 1000);
}

// Export tile definitions to JSON file
function exportTileDefinitions() {
  try {
    if (typeof tileSystem === 'undefined' || !tileSystem.definitions) {
      alert('No tile definitions to export');
      return false;
    }

    // Validate before export
    if (typeof validateTileDefinitions !== 'undefined') {
      const validation = validateTileDefinitions(tileSystem.definitions);
      if (!validation.isValid) {
        const errorMsg = formatValidationErrors(validation);
        alert('⚠️ Tile definitions have errors:\n' + errorMsg);
        // Still allow export
      }
    }

    const dataStr = JSON.stringify(tileSystem.definitions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tile-definitions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('✓ Tile definitions exported successfully');
    return true;
  } catch (error) {
    alert('Failed to export: ' + error.message);
    console.error('Export error:', error);
    return false;
  }
}

// Import tile definitions from JSON file
function importTileDefinitions(file) {
  if (!file) {
    alert('No file selected');
    return false;
  }

  try {
    const reader = new FileReader();
    
    reader.onload = function(event) {
      try {
        const imported = JSON.parse(event.target.result);
        
        // Validate imported definitions
        if (typeof validateTileDefinitions !== 'undefined') {
          const validation = validateTileDefinitions(imported);
          if (!validation.isValid) {
            const errorMsg = formatValidationErrors(validation);
            alert('❌ Invalid tile definitions:\n' + errorMsg);
            return;
          }
        }
        
        // Use imported definitions
        if (typeof tileSystem !== 'undefined') {
          tileSystem.definitions = imported;
          
          // Reload images
          if (typeof loadTileImages === 'function') {
            loadTileImages();
          }
          
          alert(`✓ Imported ${validation.stats.totalTiles} tiles in ${validation.stats.totalCategories} categories`);
          console.log('✓ Tile definitions imported successfully', validation.stats);
        }
      } catch (parseError) {
        alert('Failed to parse JSON: ' + parseError.message);
        console.error('Parse error:', parseError);
      }
    };
    
    reader.readAsText(file);
    return true;
  } catch (error) {
    alert('Failed to import: ' + error.message);
    console.error('Import error:', error);
    return false;
  }
}

// Delete map
function deleteMap(mapName) {
  console.log('deleteMap() called with:', mapName);
  
  if (!mapName || mapName.trim() === '') {
    updateModalStatus('Please select a map', 'error');
    return false;
  }
  
  try {
    // Delete from localStorage
    localStorage.removeItem(_localStorageKey(mapName));
    
    // Delete from server
    fetch(`${_levelApiBase()}/${encodeURIComponent(mapName)}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log(`Server deleted: ${mapName}`);
        } else {
          console.warn(`Server delete failed for "${mapName}":`, data.error);
        }
      })
      .catch(err => console.warn('Server delete request failed:', err));
    
    updateModalStatus(`Deleted: ${mapName}`, 'success');
    loadAvailableMaps(); // Refresh list
    
    console.log(`Map "${mapName}" deleted`);
    
    setTimeout(() => {
      closeSaveModal();
    }, 1000);
    
    return true;
  } catch (error) {
    updateModalStatus('Failed to delete: ' + error.message, 'error');
    console.error('Delete error:', error);
    return false;
  }
}

// Note: drawSaveModal() has been moved to save_load_ui.js and now uses HTML modal via showSaveLoadModal()
