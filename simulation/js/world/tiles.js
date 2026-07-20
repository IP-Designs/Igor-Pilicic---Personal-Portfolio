// Tile system - loads definitions and manages tile placement
// Unified coordinate system: Uses meter coordinates (gridX, gridY)
// Each meter = 32 pixels. SNAP_GRID (32 or 16) controls editor placement resolution.
// At SNAP_GRID=16, tiles snap to 0.5m increments and render at 16px.

// Tile system state
let tileSystem = {
  definitions: null,
  loadedImages: {},
  placedTiles: {}, // Format: "x,y": {type: "grass", category: "TERRAIN", ...} - coordinates in meters
  lightTiles: {},  // Separate storage for light tiles that layer on top
  decorations: [], // Free-positioned decorations rendered at native image size
  decorationNextId: 1, // Auto-incrementing ID for decorations
  selectedTile: 'grass',
  selectedCategory: 'TERRAIN'
};

// Cached sorted tile list for drawTiles() - avoids O(n log n) sort every frame
let _tileDrawCache = {
  dirty: true,          // true = needs rebuild
  sorted: [],           // [{tile, layer, key}, ...] sorted by layer
  lastZLevel: -1        // track z-level changes
};

function invalidateTileDrawCache() {
  _tileDrawCache.dirty = true;
}

// Roof occlusion system - hides roofs when player is underneath
let roofOcclusion = {
  hiddenRoofTiles: new Set(),  // Set of "x,y" keys for tiles to hide
  lastPlayerPos: null,         // Cache last player position to avoid recalc
  enabled: true                // Toggle for roof hiding
};

// Z-Level state (CDDA-style vertical layers)
let currentZLevel = 3;  // Start at top Z-level (see all layers)
const MIN_Z_LEVEL = 0;
const MAX_Z_LEVEL = 3;

// Change Z-level (delta: +1 for up, -1 for down)
function changeZLevel(delta) {
  let newLevel = currentZLevel + delta;
  newLevel = Math.max(MIN_Z_LEVEL, Math.min(MAX_Z_LEVEL, newLevel));
  if (newLevel !== currentZLevel) {
    currentZLevel = newLevel;
    console.log(`Z-Level changed to: ${currentZLevel}`);
    
    // Auto-select appropriate category for z-level
    if (typeof editorUI !== 'undefined') {
      if (currentZLevel === 3) {
        // On roof layer, auto-select ROOFS category
        editorUI.selectedCategory = 'ROOFS';
        // Select first roof tile if available
        if (tileSystem.definitions && tileSystem.definitions.categories.ROOFS) {
          let firstTile = Object.keys(tileSystem.definitions.categories.ROOFS.tiles)[0];
          if (firstTile) {
            editorUI.selectedTile = firstTile;
            if (typeof setSelectedTile === 'function') {
              setSelectedTile(firstTile, 'ROOFS');
            }
          }
        }
      } else if (editorUI.selectedCategory === 'ROOFS') {
        // Leaving roof layer with ROOFS selected - switch to TERRAIN
        editorUI.selectedCategory = 'TERRAIN';
        editorUI.selectedTile = 'grass';
        if (typeof setSelectedTile === 'function') {
          setSelectedTile('grass', 'TERRAIN');
        }
      }
    }
  }
}

// Check if a layer is visible based on current Z-level
// Layers at or below current Z-level are visible
function isLayerVisible(layer) {
  return layer <= currentZLevel;
}

// Check if a tile at position is a roof tile (layer 3)
function isRoofTile(x, y) {
  let key = `${x},${y}`;
  let tilesAtPos = tileSystem.placedTiles[key];
  if (!tilesAtPos) return false;
  
  let tiles = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];
  for (let tile of tiles) {
    if ((tile.layer || 0) >= 3) return true;
  }
  return false;
}

// Flood-fill to find all connected roof tiles starting from a position
function getConnectedRoofTiles(startX, startY) {
  let connected = new Set();
  let queue = [[startX, startY]];
  let visited = new Set();
  
  while (queue.length > 0) {
    let [x, y] = queue.shift();
    let key = `${x},${y}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    if (!isRoofTile(x, y)) continue;
    
    connected.add(key);
    
    // Check 4-directional neighbors (can change to 8 for diagonal connection)
    queue.push([x + 1, y]);
    queue.push([x - 1, y]);
    queue.push([x, y + 1]);
    queue.push([x, y - 1]);
  }
  
  return connected;
}

// Update roof occlusion based on player position
function updateRoofOcclusion() {
  if (!roofOcclusion.enabled) {
    roofOcclusion.hiddenRoofTiles.clear();
    return;
  }
  
  // Only update in game mode (not edit mode)
  if (typeof editMode !== 'undefined' && editMode) {
    roofOcclusion.hiddenRoofTiles.clear();
    return;
  }
  
  // Get player position
  if (typeof player === 'undefined') return;
  
  let playerX = Math.floor(player.x);
  let playerY = Math.floor(player.y);
  
  // Optimization: only recalculate if player moved to a different tile
  let posKey = `${playerX},${playerY}`;
  if (roofOcclusion.lastPlayerPos === posKey) return;
  roofOcclusion.lastPlayerPos = posKey;
  
  // Clear previous hidden tiles
  roofOcclusion.hiddenRoofTiles.clear();
  
  // Check if player is under a roof tile
  if (isRoofTile(playerX, playerY)) {
    // Get all connected roof tiles and hide them
    let connectedRoof = getConnectedRoofTiles(playerX, playerY);
    roofOcclusion.hiddenRoofTiles = connectedRoof;
  }
}

// Check if a specific tile should be hidden due to roof occlusion
function isRoofHidden(x, y) {
  return roofOcclusion.hiddenRoofTiles.has(`${x},${y}`);
}

// Load tile definitions
async function loadTileDefinitions() {
  try {
    const response = await fetch('js/data/tile-definitions.json');
    tileSystem.definitions = await response.json();
    console.log('Tile definitions loaded:', Object.keys(tileSystem.definitions.categories).length, 'categories');
    
    // Start loading tile images
    loadTileImages();

    // Bind any animationClip properties to the animation system
    bindAllTileAnimations();
    
    return true;
  } catch (error) {
    console.error('Failed to load tile definitions:', error);
    createFallbackDefinitions();
    return false;
  }
}

// Create fallback tile definitions if JSON fails to load
function createFallbackDefinitions() {
  console.log('Using fallback tile definitions');
  tileSystem.definitions = {
    categories: {
      TERRAIN: {
        displayName: "Terrain",
        tiles: {
          grass: { displayName: "Grass", color: [100, 200, 100], walkable: true },
          dirt: { displayName: "Dirt", color: [139, 90, 50], walkable: true },
          stone: { displayName: "Stone", color: [120, 120, 120], walkable: true },
          water: { displayName: "Water", color: [64, 164, 223], walkable: false }
        }
      },
      OBSTACLES: {
        displayName: "Obstacles", 
        tiles: {
          wall: { displayName: "Wall", color: [80, 80, 80], walkable: false }
        }
      }
    },
    defaultTile: 'grass',
    tileSize: typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32
  };
}

// Cache-bust helper for image loading - adds timestamp to prevent browser caching
function getCacheBustedPath(path) {
  const timestamp = new Date().getTime();
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${timestamp}`;
}

// Load tile images
function loadTileImages() {
  if (!tileSystem.definitions) return;
  
  for (let categoryName in tileSystem.definitions.categories) {
    let category = tileSystem.definitions.categories[categoryName];
    
    for (let tileType in category.tiles) {
      let tile = category.tiles[tileType];
      
      if (tile.imagePath) {
        // Try to load the image, fall back to colored square if it fails
        loadImage(getCacheBustedPath(tile.imagePath), 
          (img) => {
            tileSystem.loadedImages[tileType] = img;
            console.log(`Loaded image for ${tileType}`);
          },
          () => {
            // Create colored placeholder if image fails to load
            tileSystem.loadedImages[tileType] = createTileColorPlaceholder(tile.color);
            console.log(`Created color placeholder for ${tileType}`);
          }
        );
        
        // Load additional state images for interactive tiles
        if (tile.imagePathOpen) {
          let openType = tileType + '_open';
          loadImage(getCacheBustedPath(tile.imagePathOpen), 
            (img) => {
              tileSystem.loadedImages[openType] = img;
              console.log(`Loaded open state image for ${openType}`);
            },
            () => {
              tileSystem.loadedImages[openType] = createTileColorPlaceholder(tile.color);
              console.log(`Created open state placeholder for ${openType}`);
            }
          );
        }
        
        if (tile.imagePathActive) {
          let activeType = tileType + '_on';
          loadImage(getCacheBustedPath(tile.imagePathActive), 
            (img) => {
              tileSystem.loadedImages[activeType] = img;
              console.log(`Loaded active state image for ${activeType}`);
            },
            () => {
              tileSystem.loadedImages[activeType] = createTileColorPlaceholder(tile.color);
              console.log(`Created active state placeholder for ${activeType}`);
            }
          );
        }
      } else {
        // Special handling for specific tile types that should use custom rendering
        if (tileType === 'light') {
          // Don't create a placeholder for light tiles - let them use fallback circle rendering
          console.log(`Light tile will use custom circle rendering`);
        } else {
          // Create colored placeholder for other tiles
          tileSystem.loadedImages[tileType] = createTileColorPlaceholder(tile.color);
        }
      }
    }
  }
  
  // Load specific door and switch state images
  const stateImages = {
    'door_closed': 'assets/tiles/door_closed.png',
    'door_open': 'assets/tiles/door_open.png',
    'door_wooden_closed': 'assets/tiles/door_wooden_closed.png',
    'door_wooden_open': 'assets/tiles/door_wooden_open.png',
    'door_metal_closed': 'assets/tiles/door_metal_closed.png',
    'door_metal_open': 'assets/tiles/door_metal_open.png',
    'switch_off': 'assets/tiles/switch_off.png',
    'switch_on': 'assets/tiles/switch_on.png'
  };
  
  for (let stateName in stateImages) {
    loadImage(getCacheBustedPath(stateImages[stateName]),
      (img) => {
        tileSystem.loadedImages[stateName] = img;
        console.log(`Loaded state image for ${stateName}`);
      },
      () => {
        tileSystem.loadedImages[stateName] = createTileColorPlaceholder([128, 128, 128]);
        console.log(`Created state placeholder for ${stateName}`);
      }
    );
  }
}

// Create a colored placeholder tile image
function createTileColorPlaceholder(color) {
  let sz = typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32;
  let img = createGraphics(sz, sz);
  img.fill(color[0], color[1], color[2]);
  img.noStroke();
  img.rect(0, 0, sz, sz);
  
  // Add subtle border
  img.stroke(0, 0, 0, 100);
  img.strokeWeight(1);
  img.noFill();
  img.rect(0, 0, sz, sz);
  
  return img;
}

// ── Tile Animation Binding ──────────────────────────────────────────
// Scans all tile definitions for animationClip property and binds them
// to the animation system. Called on tile definitions load and when
// animation definitions finish loading (whichever comes second).

function bindAllTileAnimations() {
  if (!tileSystem.definitions) return;
  if (typeof Engine === 'undefined' || !Engine.has('animations')) return;

  const anims = Engine.get('animations');
  let count = 0;

  for (let catName in tileSystem.definitions.categories) {
    let cat = tileSystem.definitions.categories[catName];
    for (let tileType in cat.tiles) {
      let tile = cat.tiles[tileType];
      if (tile.animationClip) {
        anims.bindTileAnimation(tileType, tile.animationClip);
        count++;
      }
    }
  }

  if (count > 0) {
    console.log(`[Tiles] Bound ${count} animated tile(s) to animation clips`);
  }
}

// Also bind when animation definitions finish loading (may happen after tile defs)
if (typeof Engine !== 'undefined') {
  Engine.on('animation.definitionsLoaded', bindAllTileAnimations);
}

// ============================================
// DECORATION LAYER SYSTEM
// Free-positioned images at native resolution.
// Anchor: bottom-left corner sits on the clicked grid cell.
// No collision - use invisible-wall tiles for blocking.
// ============================================

// Check if a tile type is a decoration (native-size rendering)
// A tile is a decoration if it has isDecoration:true OR belongs to the DECORATIONS category
function isDecorationTile(tileType, category) {
  if (!tileType) return false;
  let cat = category || findTileCategory(tileType);
  // Any tile in the DECORATIONS category is automatically a decoration
  if (cat === 'DECORATIONS') return true;
  let props = getTileProperties(tileType, cat);
  return !!(props && props.isDecoration);
}

// Place a decoration at grid position (bottom-left anchor)
function placeDecoration(meterX, meterY, tileType, category, transform) {
  let step = typeof getSnapStep === 'function' ? getSnapStep() : 1;
  meterX = Math.floor(meterX / step) * step;
  meterY = Math.floor(meterY / step) * step;
  meterX = Math.round(meterX * 2) / 2;
  meterY = Math.round(meterY * 2) / 2;

  let img = tileSystem.loadedImages[tileType];
  // Native pixel dimensions of the source image
  let imgW = img ? img.width : GRID_SIZE;
  let imgH = img ? img.height : GRID_SIZE;

  let dec = {
    id: tileSystem.decorationNextId++,
    x: meterX,
    y: meterY,
    type: tileType,
    category: category || findTileCategory(tileType) || 'DECORATIONS',
    transform: transform ? {
      flipState: typeof transform.flipState !== 'undefined' ? transform.flipState : (transform.flipped ? 1 : 0),
      rotation: transform.rotation || 0
    } : { flipState: 0, rotation: 0 },
    imgWidth: imgW,
    imgHeight: imgH
  };
  tileSystem.decorations.push(dec);
  console.log(`Placed decoration "${tileType}" at (${meterX}, ${meterY}), native ${imgW}×${imgH}px, id=${dec.id}`);
  return dec;
}

// Remove decoration(s) whose image covers a given grid position
function removeDecorationAt(meterX, meterY) {
  // Iterate from top (last placed) to bottom so the topmost is removed first
  for (let i = tileSystem.decorations.length - 1; i >= 0; i--) {
    let dec = tileSystem.decorations[i];
    // Bottom-left anchor: image spans from
    //   left  = dec.x
    //   right = dec.x + imgWidth / GRID_SIZE
    //   bottom = dec.y + 1   (bottom of the anchor cell)
    //   top    = dec.y + 1 - imgHeight / GRID_SIZE
    let spanW = dec.imgWidth / GRID_SIZE;
    let spanH = dec.imgHeight / GRID_SIZE;
    let left = dec.x;
    let right = dec.x + spanW;
    let bottom = dec.y + 1; // bottom of anchor cell
    let top = bottom - spanH;

    if (meterX >= left && meterX < right && meterY >= top && meterY < bottom) {
      tileSystem.decorations.splice(i, 1);
      console.log(`Removed decoration id=${dec.id} "${dec.type}"`);
      return true;
    }
  }
  return false;
}

// Get decoration data array for saving
function getDecorationsForSave() {
  return tileSystem.decorations.map(d => ({
    x: d.x, y: d.y, type: d.type, category: d.category,
    transform: d.transform,
    imgWidth: d.imgWidth, imgHeight: d.imgHeight
  }));
}

// Load decorations from save data
function loadDecorations(arr) {
  tileSystem.decorations = [];
  if (!arr || !Array.isArray(arr)) return;
  for (let d of arr) {
    let img = tileSystem.loadedImages[d.type];
    tileSystem.decorations.push({
      id: tileSystem.decorationNextId++,
      x: d.x,
      y: d.y,
      type: d.type,
      category: d.category || 'DECORATIONS',
      transform: d.transform || { flipState: 0, rotation: 0 },
      imgWidth: img ? img.width : (d.imgWidth || GRID_SIZE),
      imgHeight: img ? img.height : (d.imgHeight || GRID_SIZE)
    });
  }
  console.log(`[DECORATIONS] Loaded ${tileSystem.decorations.length} decorations`);
}

// Draw all decorations (called from engine draw pipeline)
function drawDecorations() {
  if (tileSystem.decorations.length === 0) return;
  let viewport = typeof getVisibleViewport === 'function' ? getVisibleViewport() : null;

  for (let dec of tileSystem.decorations) {
    // Check for animated decoration frame first, fall back to static image
    let animFrame = null;
    if (typeof Engine !== 'undefined' && Engine.has('animations')) {
      animFrame = Engine.get('animations').getTileAnimFrame(dec.type);
    }
    let img = animFrame || tileSystem.loadedImages[dec.type];
    if (!img) continue;

    let imgW = dec.imgWidth;
    let imgH = dec.imgHeight;
    let spanW = imgW / GRID_SIZE; // width in meters
    let spanH = imgH / GRID_SIZE; // height in meters

    // Bottom-left anchor: pixel position
    //   anchorPixelX = dec.x * GRID_SIZE
    //   anchorPixelY = (dec.y + 1) * GRID_SIZE  (bottom of anchor cell)
    //   drawY = anchorPixelY - imgH  (image extends upward)
    let drawX = dec.x * GRID_SIZE;
    let drawY = (dec.y + 1) * GRID_SIZE - imgH;

    // Viewport culling (in meters)
    if (viewport) {
      let left = dec.x;
      let right = dec.x + spanW;
      let top = dec.y + 1 - spanH;
      let bottom = dec.y + 1;
      if (right < viewport.minX || left > viewport.maxX ||
          bottom < viewport.minY || top > viewport.maxY) continue;
    }

    let t = dec.transform;
    if (t && (t.flipState || t.rotation)) {
      push();
      translate(drawX + imgW / 2, drawY + imgH / 2);
      if (t.rotation) rotate(radians(t.rotation));
      let sx = 1, sy = 1;
      if (t.flipState === 1) sx = -1;
      else if (t.flipState === 2) { sx = -1; sy = -1; }
      else if (t.flipState === 3) sy = -1;
      scale(sx, sy);
      imageMode(CENTER);
      image(img, 0, 0, imgW, imgH);
      pop();
    } else {
      imageMode(CORNER);
      image(img, drawX, drawY, imgW, imgH);
    }
  }
}

// Draw decoration placement preview (ghost image at cursor)
function drawDecorationPreview(gridX, gridY, tileType) {
  let img = tileSystem.loadedImages[tileType];
  if (!img) return;

  let imgW = img.width;
  let imgH = img.height;
  let drawX = gridX * GRID_SIZE;
  let drawY = (gridY + 1) * GRID_SIZE - imgH;

  push();
  tint(255, 100); // semi-transparent ghost

  let t = typeof tileTransform !== 'undefined' ? tileTransform : null;
  if (t && ((t.flipState && t.flipState !== 0) || t.rotation)) {
    translate(drawX + imgW / 2, drawY + imgH / 2);
    if (t.rotation) rotate(radians(t.rotation));
    let sx = 1, sy = 1;
    if (t.flipState === 1) sx = -1;
    else if (t.flipState === 2) { sx = -1; sy = -1; }
    else if (t.flipState === 3) sy = -1;
    scale(sx, sy);
    imageMode(CENTER);
    image(img, 0, 0, imgW, imgH);
  } else {
    imageMode(CORNER);
    image(img, drawX, drawY, imgW, imgH);
  }

  noTint();
  // Anchor cell highlight
  noFill();
  stroke(0, 255, 0, 180);
  strokeWeight(2);
  rect(gridX * GRID_SIZE, gridY * GRID_SIZE, SNAP_GRID, SNAP_GRID);
  pop();
}

// Place a tile at meter coordinates (snapped to current SNAP_GRID)
function placeTile(meterX, meterY, tileType, category = null, transform = null, gridScaleOverride = null, tileGridScale = null) {
  // Snap coordinates to grid
  let step = gridScaleOverride || (typeof getSnapStep === 'function' ? getSnapStep() : 1);
  meterX = Math.floor(meterX / step) * step;
  meterY = Math.floor(meterY / step) * step;
  // Fix floating point
  meterX = Math.round(meterX * 2) / 2;
  meterY = Math.round(meterY * 2) / 2;
  
  // Capture old state for undo BEFORE any modifications
  let oldTileState = null;
  if (typeof getTileStateForUndo === 'function') {
    oldTileState = getTileStateForUndo(meterX, meterY);
  }
  
  // Auto-detect category if not provided
  if (!category) {
    category = findTileCategory(tileType);
  }
  
  if (!category) {
    console.error('Unknown tile type:', tileType);
    return false;
  }
  
  // Check if this is a light tile
  let tileProps = getTileProperties(tileType, category);
  if (tileProps && tileProps.isLight) {
    // Handle light placement - lights are layered on top, don't replace underlying tiles
    if (typeof addLight === 'function') {
      // Remove existing light at this position
      if (typeof removeLight === 'function') {
        removeLight(meterX, meterY);
      }
      
      // Add new light with tile properties
      addLight(meterX, meterY, tileProps.lightProperties);
    }
    
    // Store light tile separately for rendering on top
    let key = `${meterX},${meterY}`;
    if (!tileSystem.lightTiles) {
      tileSystem.lightTiles = {};
    }
    
    tileSystem.lightTiles[key] = {
      type: tileType,
      category: category,
      x: meterX,
      y: meterY,
      properties: tileProps,
      transform: transform ? {
        // Store flipState (0..3) for richer flip options, keep `flipped` for compatibility
        flipState: typeof transform.flipState !== 'undefined' ? transform.flipState : (transform.flipped ? 1 : 0),
        flipped: (typeof transform.flipState !== 'undefined' ? transform.flipState : (transform.flipped ? 1 : 0)) !== 0,
        rotation: transform.rotation
      } : null
    };
    
    // Record undo for light tile placement
    if (typeof recordTileAction === 'function') {
      recordTileAction('place', meterX, meterY, oldTileState, tileSystem.lightTiles[key]);
    }
    
    // Also register as interactive tile for linkId/activationId support
    if (typeof addInteractiveTile === 'function') {
      addInteractiveTile(meterX, meterY, 'light');
    }
    
    console.log(`Placed light tile at (${meterX}m, ${meterY}m) on top of existing tiles`);
    return true; // Don't continue to regular tile placement
  }
  
  // Check if this is an interactive tile (door, switch, script, logic)
  if (tileType === 'door' || tileType === 'door_wooden' || tileType === 'door_metal' || tileType === 'door_brick_wall' || tileType === 'switch' || tileType === 'script' || (tileProps && tileProps.isInteractive)) {
    if (typeof addInteractiveTile === 'function') {
      // Convert tile type to interactive type
      let interactiveType;
      if (tileType === 'door') {
        interactiveType = 'door_closed'; // Start doors as closed
      } else if (tileType === 'door_wooden') {
        interactiveType = 'door_wooden_closed'; // Start wooden doors as closed
      } else if (tileType === 'door_metal') {
        interactiveType = 'door_metal_closed'; // Start metal doors as closed
      } else if (tileType === 'door_brick_wall') {
        interactiveType = 'door_closed_wall_brick'; // Start brick wall doors as closed
      } else if (tileType === 'switch') {
        interactiveType = 'switch_off'; // Start switches as off
      } else {
        interactiveType = tileType; // Use tile type directly (script, logic tiles, etc.)
      }
      
      // Pass transform for rotation/flip support
      let tileXform = transform ? {
        flipState: typeof transform.flipState !== 'undefined' ? transform.flipState : (transform.flipped ? 1 : 0),
        flipped: (typeof transform.flipState !== 'undefined' ? transform.flipState : (transform.flipped ? 1 : 0)) !== 0,
        rotation: transform.rotation || 0
      } : null;
      addInteractiveTile(meterX, meterY, interactiveType, null, null, tileXform);
    }
    
    // Record undo for interactive tile placement
    if (typeof recordTileAction === 'function') {
      recordTileAction('place', meterX, meterY, oldTileState, { type: interactiveType, x: meterX, y: meterY, isInteractive: true, transform: tileXform });
    }
    
    // Don't add interactive tiles to the regular tile system - they're handled separately
    console.log(`Placed ${tileType} at (${meterX}m, ${meterY}m) with transform:`, transform);
    return true;
  }
  
  // Check if this is a decoration tile (native-size rendering)
  // Auto-detects by isDecoration flag OR by DECORATIONS category
  if ((tileProps && tileProps.isDecoration) || category === 'DECORATIONS') {
    placeDecoration(meterX, meterY, tileType, category, transform || tileTransform);
    return true;
  }

  // Check if this is a signpost tile
  if (tileProps && tileProps.isSignpost) {
    // Add a signpost at this position with default text
    if (typeof addSignpost === 'function') {
      addSignpost(meterX, meterY, 'Click to edit this sign...', 'Sign');
    }
    // Continue to place the visual tile as well
  }
  
  // Check if this is a particle emitter tile
  if (tileProps && tileProps.isParticleEmitter) {
    if (typeof addParticleEmitter === 'function') {
      // Remove existing emitter at this position
      if (typeof removeParticleEmitter === 'function') {
        removeParticleEmitter(meterX, meterY);
      }
      
      // Add new emitter with tile properties
      let emitterType = tileProps.particleType || 'sparkle';
      let emitterRate = tileProps.particleRate || 0.1;
      addParticleEmitter(meterX, meterY, emitterType, emitterRate);
    }
    // Continue to place the visual tile as well (for editor visibility)
  }
  
  // Check if this is a weather tile
  if (tileProps && tileProps.isWeatherTile) {
    if (typeof addWeatherTile === 'function') {
      // Remove existing weather tile at this position
      if (typeof removeWeatherTile === 'function') {
        removeWeatherTile(meterX, meterY);
      }
      
      // Add weather tile - immediately triggers weather effect
      let weatherType = tileProps.weatherType || 'rain';
      addWeatherTile(meterX, meterY, weatherType, {
        intensity: tileProps.weatherIntensity || 1.0
      });
    }
    // Continue to place the visual tile as well (for editor visibility)
  }
  
  // Check if this is an entity tile (sparkles, effects)
  if (tileProps && tileProps.isEntity) {
    if (typeof addEntity === 'function') {
      // Remove existing entity at this position
      if (typeof removeEntity === 'function') {
        removeEntity(meterX, meterY);
      }
      
      // Add new entity with tile properties
      let entityProperties = {
        particleCount: 8,
        spawnRadius: 1.0,
        color: tileProps.color || [255, 255, 200]
      };
      
      addEntity(tileProps.entityType, meterX, meterY, entityProperties);
    }
    
    // Record undo for entity tile placement
    if (typeof recordTileAction === 'function') {
      recordTileAction('place', meterX, meterY, oldTileState, { type: tileType, x: meterX, y: meterY, isEntity: true, entityType: tileProps.entityType });
    }
    
    console.log(`Placed ${tileProps.entityType} entity at (${meterX}m, ${meterY}m)`);
    return true; // Don't continue to regular tile placement
  }
  
  // Check if this is an event tile
  if (tileProps && tileProps.isEvent) {
    if (typeof placeEventTile === 'function') {
      // Remove existing event tile at this position
      if (typeof removeEventTile === 'function') {
        removeEventTile(meterX, meterY);
      }
      
      // Add new event tile with properties
      placeEventTile(meterX, meterY, tileProps.eventType, {
        ...tileProps,
        aiTag: `${tileProps.eventType}_${meterX}_${meterY}`,
        description: tileProps.description || '',
        walkable: tileProps.walkable !== false
      });
    }
    
    // Record undo for event tile placement
    if (typeof recordTileAction === 'function') {
      recordTileAction('place', meterX, meterY, oldTileState, { type: tileProps.eventType, x: meterX, y: meterY, isEvent: true });
    }
    
    console.log(`Placed ${tileProps.eventType} event tile at (${meterX}m, ${meterY}m)`);
    return true; // Don't continue to regular tile placement
  }
  
  let key = `${meterX},${meterY}`;
  
  // Get tile properties to determine layer
  let layer = 0;
  if (tileProps && tileProps.layer !== undefined) {
    layer = tileProps.layer;
  }
  
  // Initialize tile array if it doesn't exist
  if (!tileSystem.placedTiles[key]) {
    tileSystem.placedTiles[key] = [];
  }
  
  // Check if we're replacing an existing tile on this layer or adding a new one
  let existingIndex = -1;
  for (let i = 0; i < tileSystem.placedTiles[key].length; i++) {
    if (tileSystem.placedTiles[key][i].properties && tileSystem.placedTiles[key][i].properties.layer === layer) {
      existingIndex = i;
      break;
    }
  }
  
  // Create the tile object
  let newTile = {
    type: tileType,
    category: category,
    x: meterX,      // Meter coordinates (integer or 0.5-step)
    y: meterY,      // Meter coordinates (integer or 0.5-step)
    gridScale: tileGridScale || step, // 1.0 = 32px tile, 0.5 = 16px tile
    properties: tileProps,
    layer: layer,   // Store layer for easy access
    brightness: 100, // Per-tile shadow/brightness: 0 (fully dark) to 100 (normal)
    transform: transform ? {
      flipState: typeof transform.flipState !== 'undefined' ? transform.flipState : (transform.flipped ? 1 : 0),
      flipped: (typeof transform.flipState !== 'undefined' ? transform.flipState : (transform.flipped ? 1 : 0)) !== 0,
      rotation: transform.rotation
    } : { flipState: 0, flipped: false, rotation: 0 }
  };
  
  // Replace on existing layer or add new layer
  if (existingIndex >= 0) {
    tileSystem.placedTiles[key][existingIndex] = newTile;
  } else {
    tileSystem.placedTiles[key].push(newTile);
    // Sort by layer for consistent rendering order
    tileSystem.placedTiles[key].sort((a, b) => (a.layer || 0) - (b.layer || 0));
  }
  
  // Trigger lighting update if this tile blocks light OR is a roof tile (layer 3+)
  let needsLightingUpdate = false;
  if (typeof tileBlocksLight === 'function' && tileBlocksLight(newTile)) {
    needsLightingUpdate = true;
  }
  // Roof tiles (layer 3+) need lighting update for roof shadows
  if (layer >= 3) {
    needsLightingUpdate = true;
  }
  
  if (needsLightingUpdate && typeof triggerLightingUpdate === 'function') {
    triggerLightingUpdate();
  }
  
  // Record action for undo/redo
  if (typeof recordTileAction === 'function') {
    recordTileAction('place', meterX, meterY, oldTileState, newTile);
  }
  
  invalidateTileDrawCache();
  console.log(`Placed ${tileType} at (${meterX}m, ${meterY}m) with transform:`, transform);
  return true;
}

// Remove a tile at meter coordinates
function removeTile(meterX, meterY, gridScaleOverride) {
  // Snap to grid (use override for cross-grid operations like selection clear)
  let step = gridScaleOverride || (typeof getSnapStep === 'function' ? getSnapStep() : 1);
  meterX = Math.floor(meterX / step) * step;
  meterY = Math.floor(meterY / step) * step;
  meterX = Math.round(meterX * 2) / 2;
  meterY = Math.round(meterY * 2) / 2;
  
  // Capture old state for undo BEFORE any modifications
  let oldTileState = null;
  if (typeof getTileStateForUndo === 'function') {
    oldTileState = getTileStateForUndo(meterX, meterY);
  }
  
  let key = `${meterX},${meterY}`;
  let removed = false;
  
  // Clean up door state if exists
  if (typeof deleteDoorState === 'function') {
    deleteDoorState(meterX, meterY);
  }
  
  // Check if there's a light tile to remove
  if (tileSystem.lightTiles && tileSystem.lightTiles[key]) {
    // Remove the light source
    if (typeof removeLight === 'function') {
      removeLight(meterX, meterY);
    }
    
    delete tileSystem.lightTiles[key];
    console.log(`Removed light tile at (${meterX}m, ${meterY}m)`);
    removed = true;
  }
  
  // Check if there's an entity to remove
  if (typeof removeEntity === 'function') {
    if (removeEntity(meterX, meterY)) {
      console.log(`Removed entity at (${meterX}m, ${meterY}m)`);
      removed = true;
    }
  }
  
  // Check if there's a particle emitter to remove
  if (typeof removeParticleEmitter === 'function') {
    if (removeParticleEmitter(meterX, meterY)) {
      console.log(`Removed particle emitter at (${meterX}m, ${meterY}m)`);
      removed = true;
    }
  }
  
  // Check if there's a weather tile to remove
  if (typeof removeWeatherTile === 'function') {
    if (removeWeatherTile(meterX, meterY)) {
      console.log(`Removed weather tile at (${meterX}m, ${meterY}m)`);
      removed = true;
    }
  }

  // Check if there's a decoration to remove (topmost first)
  if (typeof removeDecorationAt === 'function') {
    if (removeDecorationAt(meterX, meterY)) {
      removed = true;
    }
  }
  
  // Check if there's an event tile to remove
  if (typeof removeEventTile === 'function') {
    if (removeEventTile(meterX, meterY)) {
      console.log(`Removed event tile at (${meterX}m, ${meterY}m)`);
      removed = true;
    }
  }
  
  // Check if there's a regular tile(s) to remove
  if (tileSystem.placedTiles[key]) {
    let tilesAtPos = tileSystem.placedTiles[key];
    let tileToRemove = null;
    
    if (Array.isArray(tilesAtPos)) {
      // Multi-layer: remove only the topmost tile
      if (tilesAtPos.length > 0) {
        tileToRemove = tilesAtPos.pop();
        
        // If no more tiles at this position, delete the key
        if (tilesAtPos.length === 0) {
          delete tileSystem.placedTiles[key];
        }
      }
    } else {
      // Single tile (backward compatibility): remove it
      tileToRemove = tilesAtPos;
      delete tileSystem.placedTiles[key];
    }
    
    if (tileToRemove) {
      let tile = tileToRemove;
      
      // Check if this is a light tile and remove the light
      if (tile.properties && tile.properties.isLight) {
        if (typeof removeLight === 'function') {
          removeLight(meterX, meterY);
        }
      }
      
      // Trigger lighting update if removed tile blocks light OR is a roof tile (layer 3+)
      let needsLightingUpdate = false;
      if (typeof tileBlocksLight === 'function' && tileBlocksLight(tile)) {
        needsLightingUpdate = true;
      }
      // Roof tiles (layer 3+) need lighting update for roof shadows
      if ((tile.layer || 0) >= 3) {
        needsLightingUpdate = true;
      }
      
      if (needsLightingUpdate && typeof triggerLightingUpdate === 'function') {
        triggerLightingUpdate();
      }
      
      console.log(`Removed tile ${tile.type} at layer ${tile.layer || 0} (${meterX}m, ${meterY}m). Remaining tiles at position: ${Array.isArray(tileSystem.placedTiles[key]) ? tileSystem.placedTiles[key].length : 0}`);
      removed = true;
    }
  }
  
  // Always check for interactive tiles (doors/switches might only exist as interactive tiles)
  if (typeof removeInteractiveTile === 'function') {
    if (removeInteractiveTile(meterX, meterY)) {
      console.log(`Removed interactive tile at (${meterX}m, ${meterY}m)`);
      removed = true;
    }
  }
  
  // Record action for undo/redo (only if we actually removed something)
  if (removed && typeof recordTileAction === 'function' && oldTileState) {
    recordTileAction('remove', meterX, meterY, oldTileState, null);
  }
  
  if (removed) invalidateTileDrawCache();
  
  return removed;
}

// Get tile at meter coordinates (returns topmost tile for backward compatibility, or array of all tiles)
function getTileAt(meterX, meterY, returnAll = false) {
  // Snap to current grid
  let step = typeof getSnapStep === 'function' ? getSnapStep() : 1;
  meterX = Math.floor(meterX / step) * step;
  meterY = Math.floor(meterY / step) * step;
  meterX = Math.round(meterX * 2) / 2;
  meterY = Math.round(meterY * 2) / 2;
  
  let key = `${meterX},${meterY}`;
  let tilesAtPos = tileSystem.placedTiles[key];
  
  if (!tilesAtPos) return null;
  
  // If returnAll is true, return all tiles at this position
  if (returnAll) {
    return Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];
  }
  
  // Otherwise return the topmost tile (last in array = highest layer)
  if (Array.isArray(tilesAtPos)) {
    return tilesAtPos[tilesAtPos.length - 1];
  }
  
  return tilesAtPos;
}

// Find which category a tile type belongs to
function findTileCategory(tileType) {
  if (!tileSystem.definitions) return null;
  
  for (let categoryName in tileSystem.definitions.categories) {
    let category = tileSystem.definitions.categories[categoryName];
    if (category.tiles[tileType]) {
      return categoryName;
    }
  }
  return null;
}

// Get tile properties
function getTileProperties(tileType, category) {
  if (!tileSystem.definitions) return {};
  
  let categoryData = tileSystem.definitions.categories[category];
  if (!categoryData || !categoryData.tiles[tileType]) return {};
  
  return { ...categoryData.tiles[tileType] };
}

// Get tile definition (helper function for player collision)
function getTileDefinition(tileType) {
  if (!tileSystem.definitions) return null;
  
  // Search through all categories to find the tile type
  for (let categoryName in tileSystem.definitions.categories) {
    let category = tileSystem.definitions.categories[categoryName];
    if (category.tiles[tileType]) {
      return category.tiles[tileType];
    }
  }
  return null;
}

// Check if a tile is walkable
function isTileWalkable(meterX, meterY) {
  let tile = getTileAt(meterX, meterY);
  if (!tile) return true; // Empty tiles are walkable
  
  return tile.properties.walkable !== false;
}

// Get movement speed modifier for a tile
function getTileSpeedModifier(meterX, meterY) {
  let tile = getTileAt(meterX, meterY);
  if (!tile) return 1.0;
  
  return tile.properties.speedModifier || 1.0;
}

// Draw all placed tiles with proper Z-order (terrain first, then obstacles)
// Note: Roof tiles (layer 3+) are drawn separately AFTER lighting via drawRoofTiles()
function drawTiles() {
  // Update roof occlusion before drawing
  updateRoofOcclusion();
  
  // Z-level change invalidates cache (layer visibility changed)
  if (_tileDrawCache.lastZLevel !== currentZLevel) {
    _tileDrawCache.dirty = true;
    _tileDrawCache.lastZLevel = currentZLevel;
  }
  
  // Rebuild sorted tile list only when dirty (tiles placed/removed/z-level changed)
  if (_tileDrawCache.dirty) {
    let sorted = [];
    for (let key in tileSystem.placedTiles) {
      let tilesAtPosition = tileSystem.placedTiles[key];
      
      // Handle both old single-tile format and new array format
      if (Array.isArray(tilesAtPosition)) {
        for (let tile of tilesAtPosition) {
          let layer = tile.layer || 0;
          
          // Skip roof tiles - they're drawn after lighting
          if (layer >= 3) continue;
          
          // Only add if layer is visible
          if (isLayerVisible(layer)) {
            sorted.push({ tile: tile, layer: layer });
          }
        }
      } else {
        // Old format: single tile (backward compatibility)
        if (isLayerVisible(0)) {
          sorted.push({ tile: tilesAtPosition, layer: 0 });
        }
      }
    }
    
    // Sort by layer (lower numbers render first, behind others)
    sorted.sort((a, b) => a.layer - b.layer);
    
    _tileDrawCache.sorted = sorted;
    _tileDrawCache.dirty = false;
  }
  
  // Get visible viewport for culling (cheap per-frame check)
  let viewport = typeof getVisibleViewport === 'function' ? getVisibleViewport() : null;
  
  // Draw tiles in layer order, culling off-screen tiles
  for (let item of _tileDrawCache.sorted) {
    let tile = item.tile;
    if (viewport && (tile.x < viewport.minX || tile.x > viewport.maxX ||
                    tile.y < viewport.minY || tile.y > viewport.maxY)) {
      continue;
    }
    // Skip INVISIBLE_INGAME tiles during gameplay (still visible in edit mode)
    if (!window.editMode && tileHasFlag(tile, 'INVISIBLE_INGAME')) {
      continue;
    }
    // Skip overlay tiles hidden by editor visibility toggles
    if (typeof editorUI !== 'undefined') {
      let cat = tile.category || findTileCategory(tile.type);
      if (cat === 'PARTICLES' && !editorUI.showParticles) continue;
      if (cat === 'LOGIC' && !editorUI.showLogic) continue;
      if (cat === 'SPECIAL' && !editorUI.showSpawns) continue;
      if (cat === 'EVENTS' && !editorUI.showEvents) continue;
    }
    drawTile(tile.x, tile.y, tile.type, tile.transform, tile.gridScale || 1);
  }
  
  // Draw light tiles on top of everything else (editor only)
  if (editMode && tileSystem.lightTiles && (typeof editorUI === 'undefined' || editorUI.showLights)) {
    for (let key in tileSystem.lightTiles) {
      let lightTile = tileSystem.lightTiles[key];
      drawTile(lightTile.x, lightTile.y, lightTile.type, lightTile.transform, lightTile.gridScale || 1);
    }
  }
}

// Draw roof tiles AFTER lighting - they use ambient sky light only
function drawRoofTiles() {
  // Early exit: no roof tiles visible when z-level < 3
  if (currentZLevel < 3) return;
  
  // Get visible viewport for culling
  let viewport = typeof getVisibleViewport === 'function' ? getVisibleViewport() : null;
  
  // Compute ambient darkening ONCE (shared by all roof tiles)
  let roofAmbientR = 255, roofAmbientG = 255, roofAmbientB = 255;
  let needsOverlay = false;
  if (typeof lighting !== 'undefined' && lighting.enabled) {
    let ab = lighting.ambientLight;
    roofAmbientR = Math.round(lighting.ambientColor[0] * ab);
    roofAmbientG = Math.round(lighting.ambientColor[1] * ab);
    roofAmbientB = Math.round(lighting.ambientColor[2] * ab);
    needsOverlay = (roofAmbientR < 255 || roofAmbientG < 255 || roofAmbientB < 255);
  }
  
  // Single-pass: draw tiles and collect positions needing darkening overlay.
  // NEVER use tint() - it's extremely slow in p5.js 2D canvas mode because
  // every image() call creates a temporary canvas for per-pixel multiplication.
  // Instead, we draw tiles normally then apply MULTIPLY rects (same technique
  // as the lighting layer, proven fast).
  let overlayTiles = null;
  if (needsOverlay) overlayTiles = [];
  
  for (let key in tileSystem.placedTiles) {
    let tilesAtPosition = tileSystem.placedTiles[key];
    let tiles = Array.isArray(tilesAtPosition) ? tilesAtPosition : [tilesAtPosition];
    
    for (let tile of tiles) {
      let layer = tile.layer || 0;
      if (layer < 3) continue;
      if (!isLayerVisible(layer)) continue;
      if (isRoofHidden(tile.x, tile.y)) continue;
      
      // Viewport culling
      if (viewport && (tile.x < viewport.minX || tile.x > viewport.maxX ||
                      tile.y < viewport.minY || tile.y > viewport.maxY)) {
        continue;
      }
      
      // Draw tile normally - no tint, full speed
      drawTile(tile.x, tile.y, tile.type, tile.transform, tile.gridScale || 1);
      
      // Track for overlay if ambient darkening or custom brightness needed
      if (needsOverlay || (tile.brightness !== undefined && tile.brightness < 100)) {
        if (!overlayTiles) overlayTiles = [];
        overlayTiles.push(tile);
      }
    }
  }
  
  // Apply ambient + per-tile brightness as MULTIPLY rects OVER the roof tiles.
  // This replaces tint() entirely - rect() with MULTIPLY blend is fast because
  // it's a simple fill operation, not per-pixel image manipulation.
  if (overlayTiles && overlayTiles.length > 0) {
    push();
    blendMode(MULTIPLY);
    noStroke();
    
    for (let tile of overlayTiles) {
      let brightness = tile.brightness !== undefined ? tile.brightness : 100;
      let bMul = Math.max(0, brightness) / 100;
      let r = Math.round(roofAmbientR * bMul);
      let g = Math.round(roofAmbientG * bMul);
      let b = Math.round(roofAmbientB * bMul);
      
      // Only draw overlay if it actually darkens (skip pure white)
      if (r < 255 || g < 255 || b < 255) {
        fill(r, g, b);
        let tileRenderSize = (tile.gridScale || 1) * GRID_SIZE;
        rect(tile.x * GRID_SIZE, tile.y * GRID_SIZE, tileRenderSize, tileRenderSize);
      }
    }
    
    pop();
  }
}

// Draw a single tile at meter coordinates
function drawTile(meterX, meterY, tileType, transform = null, gridScale = 1) {
  // Convert meter coordinates to world pixel coordinates for drawing
  let worldX = meterX * GRID_SIZE;
  let worldY = meterY * GRID_SIZE;
  let renderSize = gridScale * GRID_SIZE; // 16 or 32
  
  // Check for animated tile frame first, fall back to static image
  let animFrame = null;
  if (typeof Engine !== 'undefined' && Engine.has('animations')) {
    animFrame = Engine.get('animations').getTileAnimFrame(tileType);
  }
  let img = animFrame || tileSystem.loadedImages[tileType];
  
  if (img) {
    imageMode(CORNER);
    
    // Draw with slight overlap to ensure seamless tile connections
    let tileSize = renderSize + 1; // Add 1 pixel overlap
    let offsetX = worldX - 0.5; // Slight offset to center the overlap
    let offsetY = worldY - 0.5;
    
    // Apply transformations if specified
    if (transform && ((typeof transform.flipState !== 'undefined' && transform.flipState !== 0) || transform.flipped || transform.rotation !== 0)) {
      push();
      translate(worldX + renderSize/2, worldY + renderSize/2);

      if (transform.rotation !== 0) {
        rotate(radians(transform.rotation));
      }

      // Determine flip state (0..3)
      let flipState = typeof transform.flipState !== 'undefined' ? transform.flipState : (transform.flipped ? 1 : 0);
      let scaleX = 1, scaleY = 1;
      // States: 0 = none, 1 = flipX (horizontal), 2 = flipBoth, 3 = flipY (vertical)
      if (flipState === 1) { scaleX = -1; scaleY = 1; }
      else if (flipState === 2) { scaleX = -1; scaleY = -1; }
      else if (flipState === 3) { scaleX = 1; scaleY = -1; }

      scale(scaleX, scaleY);

      imageMode(CENTER);
      image(img, 0, 0, tileSize, tileSize);
      pop();
    } else {
      image(img, offsetX, offsetY, tileSize, tileSize);
    }
  } else {
    // Fallback to colored rectangle or special shapes
    let properties = getTileProperties(tileType, findTileCategory(tileType));
    
    // Skip invisible tiles in game mode
    if (properties.isInvisible && !window.editMode) {
      return; // Don't draw in game mode
    }
    
    if (properties.color) {
      push();
      
      // Special rendering for specific tile types
      if (tileType === 'light') {
        // Skip light tiles if toggled off
        if (typeof editorUI !== 'undefined' && !editorUI.showLights) { pop(); return; }
        // Draw light as a simple yellow circle
        fill(255, 255, 0);
        stroke(255, 255, 255, 200);
        strokeWeight(2);
        ellipse(worldX + renderSize/2, worldY + renderSize/2, renderSize * 0.6, renderSize * 0.6);
      } else if (tileType === 'player_start' || tileType === 'spawn') {
        // Skip spawn tiles if toggled off
        if (typeof editorUI !== 'undefined' && !editorUI.showSpawns) { pop(); return; }
        // Draw player start as a colored square with symbol
        fill(properties.color[0], properties.color[1], properties.color[2]);
        stroke(0, 0, 0, 150);
        strokeWeight(2);
        rect(worldX, worldY, renderSize, renderSize);
        
        // Draw "P" for player
        fill(0, 0, 0);
        textAlign(CENTER, CENTER);
        textSize(renderSize / 2);
        text('P', worldX + renderSize/2, worldY + renderSize/2);
      } else if (properties.isInvisible) {
        // Draw invisible blockers with semi-transparent color and X pattern (editor only)
        let pad = renderSize * 0.0625; // scale padding proportionally
        fill(properties.color[0], properties.color[1], properties.color[2], 100);
        stroke(properties.color[0], properties.color[1], properties.color[2], 200);
        strokeWeight(2);
        rect(worldX + pad, worldY + pad, renderSize - pad*2, renderSize - pad*2);
        
        // Draw X pattern to indicate blocker
        line(worldX + pad, worldY + pad, worldX + renderSize - pad, worldY + renderSize - pad);
        line(worldX + renderSize - pad, worldY + pad, worldX + pad, worldY + renderSize - pad);
      } else {
        // Default colored rectangle
        fill(properties.color[0], properties.color[1], properties.color[2]);
        noStroke();
        rect(worldX, worldY, renderSize, renderSize);
      }
      
      pop();
    }
  }
}

// Get all available tile types for a category
function getTileTypesInCategory(categoryName) {
  if (!tileSystem.definitions) return [];
  
  let category = tileSystem.definitions.categories[categoryName];
  if (!category) return [];
  
  return Object.keys(category.tiles);
}

// Get all categories
function getAllCategories() {
  if (!tileSystem.definitions) return [];
  return Object.keys(tileSystem.definitions.categories);
}

// Set selected tile for placement
function setSelectedTile(tileType, category = null) {
  if (!category) {
    category = findTileCategory(tileType);
  }
  
  if (category) {
    tileSystem.selectedTile = tileType;
    tileSystem.selectedCategory = category;
    console.log(`Selected tile: ${tileType} (${category})`);
  }
}

// Get currently selected tile
function getSelectedTile() {
  return {
    type: tileSystem.selectedTile,
    category: tileSystem.selectedCategory
  };
}

// Clear all tiles
function clearAllTiles() {
  tileSystem.placedTiles = {};
  
  // Clear light tiles separately 
  if (tileSystem.lightTiles) {
    tileSystem.lightTiles = {};
  }

  // Clear decorations
  tileSystem.decorations = [];
  tileSystem.decorationNextId = 1;
  
  invalidateTileDrawCache();
  
  // Also clear all lights
  if (typeof clearAllLights === 'function') {
    clearAllLights();
  }
  
  console.log('All tiles, lights, and decorations cleared');
}

// Export map data
function exportTileData() {
  return {
    tiles: tileSystem.placedTiles,
    selectedTile: tileSystem.selectedTile,
    selectedCategory: tileSystem.selectedCategory
  };
}

// Import map data
function importTileData(data) {
  if (data.tiles) {
    tileSystem.placedTiles = data.tiles;
    invalidateTileDrawCache();
  }
  if (data.selectedTile) {
    tileSystem.selectedTile = data.selectedTile;
  }
  if (data.selectedCategory) {
    tileSystem.selectedCategory = data.selectedCategory;
  }
  console.log('Tile data imported');
}

// Debug: Test tile coordinate system
function testTileCoordinateSystem() {
  console.log('=== TILE COORDINATE SYSTEM TEST ===');
  console.log('Unified system: 1 meter = 32 pixels');
  console.log('World size: 60m x 34m (1920x1088 pixels)');
  
  // Test tile placement at integer meter coordinates
  console.log('Testing tile placement at (5m, 5m):');
  placeTile(5.7, 5.3, 'grass', 'TERRAIN'); // Should snap to (5, 5)
  
  let testTile = getTileAt(5, 5);
  if (testTile) {
    console.log(`✓ Tile found at (${testTile.x}m, ${testTile.y}m) - snapped correctly`);
    console.log(`✓ World pixel position: (${testTile.x * GRID_SIZE}, ${testTile.y * GRID_SIZE})`);
  } else {
    console.log('✗ Tile placement failed');
  }
  
  console.log('=================================');
}
