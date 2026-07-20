// ============================================
// DEMO LEVEL GENERATOR
// Loads default map from levels folder or creates demo level
// ============================================

// Create a demo level if no maps exist
function createDemoLevelIfNeeded() {
  // Start with empty map - user can load maps via Load button
  console.log('[DEMO_LEVEL] Starting with empty map. Use Load button (L) to load a map.');
  return;
  
  /* DISABLED - Uncomment to auto-load map1 on startup:
  loadDefaultMap().then(loaded => {
    if (loaded) {
      console.log('[DEMO_LEVEL] Default map loaded from server');
      return;
    }
    
    // Check if any maps exist in localStorage
    let hasMaps = false;
    for (let key in localStorage) {
      if (key.startsWith('tinyhuman_map_')) {
        hasMaps = true;
        break;
      }
    }
    
    if (hasMaps) {
      console.log('[DEMO_LEVEL] Maps exist in localStorage');
      return;
    }
    
    console.log('[DEMO_LEVEL] No maps found, creating demo level');
    createMinimalDemoLevel();
  });
  */
}

// Load default map from server
async function loadDefaultMap(mapName = 'map1') {
  try {
    const base = (typeof _levelApiBase === 'function') ? _levelApiBase() : '/api/levels';
    const response = await fetch(`${base}/${encodeURIComponent(mapName)}`);
    if (!response.ok) {
      console.log(`[DEMO_LEVEL] Map "${mapName}" not found on server`);
      return false;
    }
    
    const mapData = await response.json();
    console.log(`[DEMO_LEVEL] Loading "${mapName}" from server`);
    
    // Use the single canonical restore function (defined in save_load.js)
    if (typeof restoreWorldFromData === 'function') {
      restoreWorldFromData(mapData, mapData.name || mapName);
    } else {
      console.error('[DEMO_LEVEL] restoreWorldFromData not available - save_load.js must load first');
    }
    return true;
  } catch (error) {
    console.log('[DEMO_LEVEL] Server unavailable:', error.message);
    return false;
  }
}

// Apply loaded map data - thin wrapper kept for backwards compatibility
function applyDefaultMapData(parsedData) {
  if (typeof restoreWorldFromData === 'function') {
    restoreWorldFromData(parsedData, parsedData.name || 'map1');
  } else {
    console.error('[DEMO_LEVEL] restoreWorldFromData not available - save_load.js must load first');
  }
}

// Create minimal demo level (fallback)
function createMinimalDemoLevel() {
  // Create demo level data
  let demoData = {
    name: 'Demo Level',
    version: '1.1',
    created: new Date().toISOString(),
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    tiles: {},
    lighting: {
      enabled: true,
      ambientLight: 0.4,
      ambientColor: [200, 220, 255],
      lights: []
    },
    entities: []
  };
  
  // Create a grass floor
  for (let x = 0; x < WORLD_WIDTH; x++) {
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      let key = `${x},${y}`;
      demoData.tiles[key] = {
        x: x,
        y: y,
        type: 'grass',
        category: 'TERRAIN',
        transform: { flipped: false, rotation: 0 }
      };
    }
  }
  
  // ===== TERRAIN SECTION (Row 8) =====
  // Stone, Sand, Dirt, Asphalt, Snow
  demoData.tiles['5,8'] = { x: 5, y: 8, type: 'stone', category: 'TERRAIN', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['8,8'] = { x: 8, y: 8, type: 'sand', category: 'TERRAIN', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['11,8'] = { x: 11, y: 8, type: 'dirt', category: 'TERRAIN', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['14,8'] = { x: 14, y: 8, type: 'asphalt', category: 'TERRAIN', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['17,8'] = { x: 17, y: 8, type: 'snow', category: 'TERRAIN', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['20,8'] = { x: 20, y: 8, type: 'water', category: 'TERRAIN', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['23,8'] = { x: 23, y: 8, type: 'lava', category: 'TERRAIN', transform: { flipped: false, rotation: 0 } };
  
  // ===== STRUCTURES SECTION (Row 11) =====
  // Door, Portal, Teleporter, Fence, Building
  demoData.tiles['5,11'] = { x: 5, y: 11, type: 'door', category: 'STRUCTURES', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['8,11'] = { x: 8, y: 11, type: 'portal', category: 'STRUCTURES', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['11,11'] = { x: 11, y: 11, type: 'teleporter', category: 'STRUCTURES', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['14,11'] = { x: 14, y: 11, type: 'fence', category: 'STRUCTURES', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['17,11'] = { x: 17, y: 11, type: 'building', category: 'STRUCTURES', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['20,11'] = { x: 20, y: 11, type: 'brick_wall', category: 'STRUCTURES', transform: { flipped: false, rotation: 0 } };
  
  // ===== OBSTACLES SECTION (Row 14) =====
  // Wall, Tree, Rock
  demoData.tiles['5,14'] = { x: 5, y: 14, type: 'wall', category: 'OBSTACLES', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['8,14'] = { x: 8, y: 14, type: 'tree', category: 'OBSTACLES', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['11,14'] = { x: 11, y: 14, type: 'rock', category: 'OBSTACLES', transform: { flipped: false, rotation: 0 } };
  
  // ===== INTERACTIVE SECTION (Row 17) =====
  // Chest, Switch, Sign, Trap
  demoData.tiles['5,17'] = { x: 5, y: 17, type: 'chest', category: 'INTERACTIVE', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['8,17'] = { x: 8, y: 17, type: 'switch', category: 'INTERACTIVE', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['11,17'] = { x: 11, y: 17, type: 'sign', category: 'INTERACTIVE', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['14,17'] = { x: 14, y: 17, type: 'trap', category: 'INTERACTIVE', transform: { flipped: false, rotation: 0 } };
  
  // ===== SPECIAL SECTION (Row 20) =====
  // Spawn, Goal, Exit, Checkpoint
  demoData.tiles['5,20'] = { x: 5, y: 20, type: 'spawn', category: 'SPECIAL', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['8,20'] = { x: 8, y: 20, type: 'goal', category: 'SPECIAL', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['11,20'] = { x: 11, y: 20, type: 'exit', category: 'SPECIAL', transform: { flipped: false, rotation: 0 } };
  demoData.tiles['14,20'] = { x: 14, y: 20, type: 'checkpoint', category: 'SPECIAL', transform: { flipped: false, rotation: 0 } };
  
  // ===== BORDER WALLS =====
  // Create simple border
  for (let x = 2; x < WORLD_WIDTH - 2; x++) {
    demoData.tiles[`${x},2`] = { x: x, y: 2, type: 'wall', category: 'OBSTACLES', transform: { flipped: false, rotation: 0 } };
    demoData.tiles[`${x},${WORLD_HEIGHT - 3}`] = { x: x, y: WORLD_HEIGHT - 3, type: 'wall', category: 'OBSTACLES', transform: { flipped: false, rotation: 0 } };
  }
  
  for (let y = 2; y < WORLD_HEIGHT - 2; y++) {
    demoData.tiles[`2,${y}`] = { x: 2, y: y, type: 'wall', category: 'OBSTACLES', transform: { flipped: false, rotation: 0 } };
    demoData.tiles[`${WORLD_WIDTH - 3},${y}`] = { x: WORLD_WIDTH - 3, y: y, type: 'wall', category: 'OBSTACLES', transform: { flipped: false, rotation: 0 } };
  }
  
  // Add some lights
  demoData.lighting.lights.push({
    x: 5,
    y: 8,
    intensity: 1.2,
    radius: 6,
    falloff: 1.5,
    brightness: 1.0,
    color: [255, 255, 200],
    castsShadows: true,
    enabled: true
  });
  
  demoData.lighting.lights.push({
    x: WORLD_WIDTH - 5,
    y: WORLD_HEIGHT - 5,
    intensity: 1.0,
    radius: 5,
    falloff: 1.5,
    brightness: 1.0,
    color: [200, 220, 255],
    castsShadows: true,
    enabled: true
  });
  
  // Save to localStorage
  try {
    localStorage.setItem('tinyhuman_map_Demo Level', JSON.stringify(demoData));
    console.log('Demo level created with all tile types!');
    console.log('TERRAIN: Stone, Sand, Dirt, Asphalt, Snow, Water, Lava');
    console.log('STRUCTURES: Door, Portal, Teleporter, Fence, Building, Brick Wall');
    console.log('OBSTACLES: Wall, Tree, Rock');
    console.log('INTERACTIVE: Chest, Switch, Sign, Trap');
    console.log('SPECIAL: Spawn, Goal, Exit, Checkpoint');
  } catch (error) {
    console.error('Failed to create demo level:', error);
  }
}
