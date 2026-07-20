// Lighting system for the game engine
// Handles light sources, shadow casting, and light rendering
// OPTIMIZED: Includes obstacle caching, dirty region tracking, and spatial indexing

// Lighting system state
let lighting = {
  enabled: true,
  lights: [],           // Array of light entities
  ambientLight: 0.3,    // Global ambient light level (0.0 - 1.0) - increased from 0.1
  ambientColor: [200, 220, 255], // Ambient light color (sky blue)
  roofShadowDarkness: 0.7, // How much darker areas under roofs are (0 = no shadow, 1 = pitch black)
  maxLights: 50,        // Maximum number of lights
  shadowQuality: 128,   // Number of rays for shadow casting (higher = smoother)
  lightLayer: null,     // Graphics layer for lighting
  needsUpdate: true,    // Flag to update lighting
  
  // Optimization: Obstacle cache
  obstacleCache: null,  // 2D boolean array for blocked cells
  obstacleCacheDirty: true, // Flag to rebuild obstacle cache
  
  // Optimization: Dirty region tracking
  dirtyLights: new Set(), // Light IDs that need re-rendering
  fullUpdateRequired: true, // Force full scene re-render
  
  // Optimization: Performance metrics
  lastRenderTime: 0,
  renderCount: 0
};

// ============================================
// NATIVE AMBIENT TRANSITION API
// Smooth transitions for day/night and custom ambient states
// ============================================

// Active ambient transition (null when idle)
let _ambientTransition = null;

/**
 * Smoothly transition to night time
 * @param {number} durationMs - Transition duration in milliseconds (default 2000)
 */
function setNightTime(durationMs = 2000) {
  if (lighting._isNight) {
    console.log('[LIGHTING] Already night time');
    return;
  }
  lighting._isNight = true;
  lighting._isDay = false;
  console.log('[LIGHTING] Transitioning to night...');
  _startAmbientTransition(0.08, [30, 30, 80], durationMs, 'Night time activated.');
}

/**
 * Smoothly transition to day time
 * @param {number} durationMs - Transition duration in milliseconds (default 2000)
 */
function setDayTime(durationMs = 2000) {
  if (lighting._isDay) {
    console.log('[LIGHTING] Already day time');
    return;
  }
  lighting._isDay = true;
  lighting._isNight = false;
  console.log('[LIGHTING] Transitioning to day...');
  _startAmbientTransition(0.3, [200, 220, 255], durationMs, 'Day time activated.');
}

/**
 * Smoothly transition ambient light to target values
 * @param {number} targetAmbient - Target ambientLight value (0.0-1.0)
 * @param {number[]} targetColor - Target ambientColor [r, g, b]
 * @param {number} durationMs - Duration in milliseconds
 * @param {string} logMsg - Message to log on completion
 */
function setAmbientTransition(targetAmbient, targetColor, durationMs = 2000, logMsg = '') {
  _startAmbientTransition(targetAmbient, targetColor, durationMs, logMsg);
}

// Internal: start a smooth ambient transition
function _startAmbientTransition(targetAmbient, targetColor, durationMs, logMsg) {
  _ambientTransition = {
    startAmbient: lighting.ambientLight,
    startColor: [...lighting.ambientColor],
    targetAmbient: targetAmbient,
    targetColor: targetColor,
    startTime: Date.now(),
    duration: durationMs,
    logMsg: logMsg
  };
}

// Called every frame to update ambient transitions
function updateAmbientTransition() {
  if (!_ambientTransition) return;
  
  const t = Math.min((Date.now() - _ambientTransition.startTime) / _ambientTransition.duration, 1);
  const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
  
  lighting.ambientLight = _ambientTransition.startAmbient + 
    (_ambientTransition.targetAmbient - _ambientTransition.startAmbient) * ease;
  lighting.ambientColor = [
    Math.round(_ambientTransition.startColor[0] + (_ambientTransition.targetColor[0] - _ambientTransition.startColor[0]) * ease),
    Math.round(_ambientTransition.startColor[1] + (_ambientTransition.targetColor[1] - _ambientTransition.startColor[1]) * ease),
    Math.round(_ambientTransition.startColor[2] + (_ambientTransition.targetColor[2] - _ambientTransition.startColor[2]) * ease)
  ];
  lighting.needsUpdate = true;
  lighting.fullUpdateRequired = true;
  
  if (t >= 1) {
    if (_ambientTransition.logMsg) {
      console.log(`[LIGHTING] ${_ambientTransition.logMsg}`);
    }
    _ambientTransition = null;
  }
}

// Light editing state
let lightEditor = {
  selectedLight: null,
  isEditing: false,
  dragStartPos: { x: 0, y: 0 },
  originalRadius: 0,
  originalIntensity: 0
};

// Initialize lighting system
function initLighting() {
  // Create graphics layer for lighting - must cover the full world
  let bufferWidth = WORLD_WIDTH * GRID_SIZE;
  let bufferHeight = WORLD_HEIGHT * GRID_SIZE;
  
  lighting.lightLayer = createGraphics(bufferWidth, bufferHeight);
  lighting.needsUpdate = true;
  lighting.fullUpdateRequired = true;
  
  // Store buffer size for later use
  lighting.bufferWidth = bufferWidth;
  lighting.bufferHeight = bufferHeight;
  
  // Initialize obstacle cache
  initObstacleCache();
  
  console.log("Lighting system initialized with unified meter coordinate system");
  console.log(`Light layer size: ${lighting.lightLayer.width}x${lighting.lightLayer.height} pixels (full world)`);
  console.log("Optimization: Obstacle caching enabled");
}

// Initialize the obstacle cache grid (half-meter resolution: 2x cells per meter)
function initObstacleCache() {
  let cacheW = Math.ceil(WORLD_WIDTH * 2);
  let cacheH = Math.ceil(WORLD_HEIGHT * 2);
  lighting.obstacleCache = new Array(cacheW);
  for (let x = 0; x < cacheW; x++) {
    lighting.obstacleCache[x] = new Array(cacheH).fill(false);
  }
  lighting.obstacleCacheDirty = true;
}

// Rebuild the obstacle cache from current tile data (half-meter resolution)
function rebuildObstacleCache() {
  if (!lighting.obstacleCache) {
    initObstacleCache();
  }
  
  let startTime = performance.now();
  let blockedCount = 0;
  let cacheW = Math.ceil(WORLD_WIDTH * 2);
  let cacheH = Math.ceil(WORLD_HEIGHT * 2);
  
  // Reset all cells to unblocked
  for (let x = 0; x < cacheW; x++) {
    for (let y = 0; y < cacheH; y++) {
      lighting.obstacleCache[x][y] = false;
    }
  }
  
  // Scan all placed tiles for blockers
  let totalTilesScanned = 0;
  let flagSystemUsed = typeof tileBlocksLight === 'function';
  
  if (typeof tileSystem !== 'undefined' && tileSystem.placedTiles) {
    for (let key in tileSystem.placedTiles) {
      let [rawX, rawY] = key.split(',').map(Number);
      let tilesAtPos = tileSystem.placedTiles[key];
      
      let tiles = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];
      
      let blocks = false;
      for (let tile of tiles) {
        totalTilesScanned++;
        try {
          if (flagSystemUsed ? tileBlocksLight(tile) : 
              (tile && tile.properties && tile.properties.blocksVision)) {
            blocks = true;
            break;
          }
        } catch (e) {
          console.error(`[LIGHTING] Error checking tileBlocksLight at ${key}:`, e.message);
        }
      }
      
      if (blocks) {
        // Determine how many cache cells this tile occupies
        let gs = (tiles[0] && tiles[0].gridScale) || 1; // 1.0 or 0.5
        if (gs <= 0.5) {
          // 16px tile: occupies 1 cache cell
          let cx = Math.round(rawX * 2);
          let cy = Math.round(rawY * 2);
          if (cx >= 0 && cx < cacheW && cy >= 0 && cy < cacheH) {
            lighting.obstacleCache[cx][cy] = true;
            blockedCount++;
          }
        } else {
          // 32px tile: occupies 4 cache cells (2x2)
          let bx = Math.floor(rawX) * 2;
          let by = Math.floor(rawY) * 2;
          for (let ox = 0; ox < 2; ox++) {
            for (let oy = 0; oy < 2; oy++) {
              let cx = bx + ox;
              let cy = by + oy;
              if (cx >= 0 && cx < cacheW && cy >= 0 && cy < cacheH) {
                lighting.obstacleCache[cx][cy] = true;
              }
            }
          }
          blockedCount++;
        }
      }
    }
  }
  
  // Scan interactive tiles - use blocksLight property from INTERACTIVE_TYPES (same pattern as isBlocking/canWalkThrough for movement)
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    for (let tile of interactiveTiles) {
      if (tile && tile.x >= 0 && tile.x < WORLD_WIDTH && tile.y >= 0 && tile.y < WORLD_HEIGHT) {
        let typeInfo = (typeof INTERACTIVE_TYPES !== 'undefined') ? INTERACTIVE_TYPES[tile.type] : null;
        if (typeInfo && typeInfo.blocksLight) {
          // Doors are 1m - fill 2x2 cache cells
          let bx = Math.floor(tile.x) * 2;
          let by = Math.floor(tile.y) * 2;
          for (let ox = 0; ox < 2; ox++) {
            for (let oy = 0; oy < 2; oy++) {
              let cx = bx + ox;
              let cy = by + oy;
              if (cx >= 0 && cx < cacheW && cy >= 0 && cy < cacheH) {
                lighting.obstacleCache[cx][cy] = true;
              }
            }
          }
          blockedCount++;
        }
      }
    }
  }
  
  lighting.obstacleCacheDirty = false;
  
  let elapsed = performance.now() - startTime;
  console.log(`[LIGHTING] Obstacle cache rebuilt (0.5m res): ${blockedCount} blocking tiles, ${totalTilesScanned} scanned, flagSystem=${flagSystemUsed}, ${elapsed.toFixed(2)}ms`);
}

// Invalidate obstacle cache at specific position
function invalidateObstacleCacheAt(gridX, gridY) {
  lighting.obstacleCacheDirty = true;
  
  // Mark lights that might be affected by this change
  for (let light of lighting.lights) {
    let dx = Math.abs(light.x - gridX);
    let dy = Math.abs(light.y - gridY);
    let dist = Math.sqrt(dx * dx + dy * dy);
    
    // If change is within light radius, mark it dirty
    if (dist <= light.radius + 1) {
      lighting.dirtyLights.add(light.id);
    }
  }
  
  lighting.needsUpdate = true;
}

// Add a light source at grid position
// Add a new light source at grid position (meter coordinates)
function addLight(gridX, gridY, properties = {}) {
  // Default light properties (positions in meters, radius in meters)
  // Center the light in the middle of the grid cell
  let defaultProps = {
    x: gridX + 0.5,     // Position in meters (center of cell)
    y: gridY + 0.5,     // Position in meters (center of cell)
    intensity: 1.0,
    radius: 5.0,  // Radius in meters
    falloff: 0.8,        // Falloff factor (0.0 = no falloff, 1.0 = sharp falloff)
    brightness: 1.0,     // Brightness multiplier (0.0 = dark, 2.0 = very bright)
    color: [255, 255, 200],
    castsShadows: true,
    enabled: true
  };
  
  // Merge with provided properties
  let lightProps = Object.assign(defaultProps, properties);
  
  // Create light entity
  let light = {
    id: Date.now() + Math.random(), // Unique ID
    ...lightProps
  };
  
  lighting.lights.push(light);
  lighting.needsUpdate = true;
  lighting.fullUpdateRequired = true; // New light requires full update
  lighting.dirtyLights.add(light.id);
  
  console.log(`Added light at (${lightProps.x}m, ${lightProps.y}m) with radius ${lightProps.radius}, falloff ${lightProps.falloff}`);
  return light;
}

// Remove light at grid position
function removeLight(gridX, gridY) {
  let lightIndex = lighting.lights.findIndex(light => {
    // Reverse the +0.5 centering offset to get original grid coordinate
    let lx = Math.round((light.x - 0.5) * 2) / 2;
    let ly = Math.round((light.y - 0.5) * 2) / 2;
    return lx === gridX && ly === gridY;
  });
  
  if (lightIndex !== -1) {
    let removedLight = lighting.lights[lightIndex];
    lighting.dirtyLights.delete(removedLight.id);
    lighting.lights.splice(lightIndex, 1);
    lighting.needsUpdate = true;
    lighting.fullUpdateRequired = true; // Removing light requires full update
    console.log(`Removed light at (${gridX}m, ${gridY}m)`);
    return true;
  }
  
  return false;
}

// Get light at grid position
function getLightAt(gridX, gridY) {
  return lighting.lights.find(light => {
    // Reverse the +0.5 centering offset to get original grid coordinate
    let lx = Math.round((light.x - 0.5) * 2) / 2;
    let ly = Math.round((light.y - 0.5) * 2) / 2;
    return lx === gridX && ly === gridY;
  });
}

// Update lighting system
function updateLighting() {
  if (!lighting.enabled || !lighting.lightLayer) return;
  
  // Rebuild obstacle cache if dirty
  if (lighting.obstacleCacheDirty) {
    rebuildObstacleCache();
  }
  
  if (lighting.needsUpdate) {
    let startTime = performance.now();
    renderLighting();
    lighting.lastRenderTime = performance.now() - startTime;
    lighting.renderCount++;
    
    // Log performance periodically
    if (lighting.renderCount % 100 === 0 && lighting.lastRenderTime > 10) {
      console.log(`[LIGHTING] Render #${lighting.renderCount}: ${lighting.lastRenderTime.toFixed(2)}ms`);
    }
    
    lighting.needsUpdate = false;
    lighting.fullUpdateRequired = false;
    lighting.dirtyLights.clear();
  }
}

// Trigger lighting update for dynamic shadow recalculation
// Called whenever obstacles are placed/removed or doors open/close
function triggerLightingUpdate() {
  lighting.needsUpdate = true;
  lighting.fullUpdateRequired = true;
  lighting.obstacleCacheDirty = true;
}

// Render all lighting to the light layer
function renderLighting() {
  if (!lighting.lightLayer) return;
  
  // Clear the light layer completely
  lighting.lightLayer.clear();
  
  // Use ambient light directly as brightness level (not inverted)
  // High ambientLight = bright scene, Low ambientLight = dark scene
  let ambientBrightness = lighting.ambientLight;
  
  // Apply ambient color with brightness level
  let ambientR = lighting.ambientColor[0] * ambientBrightness;
  let ambientG = lighting.ambientColor[1] * ambientBrightness;
  let ambientB = lighting.ambientColor[2] * ambientBrightness;
  
  // Set background to ambient lighting level
  lighting.lightLayer.background(ambientR, ambientG, ambientB, 255);
  
  // Apply roof shadows FIRST (darkens ambient under roofs)
  // Then lights ADD on top, illuminating the dark areas
  renderRoofShadows();
  
  // Apply per-tile brightness/shadow adjustments (darkens tiles with brightness < 100)
  renderTileBrightness();
  
  // Get visible viewport for culling lights
  let viewport = typeof getVisibleViewport === 'function' ? getVisibleViewport() : null;
  
  // Render only visible lights (ADD blend will brighten roof shadow areas)
  for (let light of lighting.lights) {
    if (!light.enabled) continue;
    
    // Skip lights far outside viewport (with radius buffer)
    if (viewport) {
      let buffer = light.radius + 5; // Extra buffer for light reach
      if (light.x + buffer < viewport.minX || light.x - buffer > viewport.maxX ||
          light.y + buffer < viewport.minY || light.y - buffer > viewport.maxY) {
        continue;
      }
    }
    
    renderLight(light);
  }
}

// Render shadows for areas under roof tiles
function renderRoofShadows() {
  if (!lighting.lightLayer) return;
  if (lighting.roofShadowDarkness <= 0) return;
  
  // Use MULTIPLY blend mode to properly darken the lit areas under roofs
  lighting.lightLayer.blendMode(MULTIPLY);
  
  // Calculate shadow color: 1.0 = no change, 0.0 = pitch black
  // roofShadowDarkness of 0.7 means we want 30% brightness (1.0 - 0.7 = 0.3)
  let shadowMultiplier = 1.0 - lighting.roofShadowDarkness;
  let shadowValue = Math.floor(shadowMultiplier * 255);
  
  lighting.lightLayer.noStroke();
  lighting.lightLayer.fill(shadowValue, shadowValue, shadowValue, 255);
  
  // Scan ALL placed tiles for roof tiles (layer 3+)
  // No viewport culling - render shadows for all roofs since lighting layer covers full world
  if (typeof tileSystem !== 'undefined' && tileSystem.placedTiles) {
    for (let key in tileSystem.placedTiles) {
      let tilesAtPos = tileSystem.placedTiles[key];
      let tiles = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];
      
      for (let tile of tiles) {
        let layer = tile.layer || 0;
        if (layer >= 3) {
          // This is a roof tile - draw shadow at this position
          let pixelX = tile.x * GRID_SIZE;
          let pixelY = tile.y * GRID_SIZE;
          lighting.lightLayer.rect(pixelX, pixelY, GRID_SIZE, GRID_SIZE);
        }
      }
    }
  }
  
  // Reset blend mode back to normal
  lighting.lightLayer.blendMode(BLEND);
}

// Render per-tile brightness adjustments into the lighting layer
// Tiles with brightness < 100 get darkening rectangles drawn via MULTIPLY blend
// This reuses the same pattern as renderRoofShadows() for consistency and performance
function renderTileBrightness() {
  if (!lighting.lightLayer) return;
  if (typeof tileSystem === 'undefined' || !tileSystem.placedTiles) return;
  
  lighting.lightLayer.blendMode(MULTIPLY);
  lighting.lightLayer.noStroke();
  
  for (let key in tileSystem.placedTiles) {
    let tilesAtPos = tileSystem.placedTiles[key];
    let tiles = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];
    
    for (let tile of tiles) {
      let brightness = tile.brightness;
      if (brightness === undefined || brightness >= 100) continue;
      
      // Skip roof tiles (layer 3+) - they're drawn AFTER the lighting overlay
      // so the lighting layer MULTIPLY blend won't affect them.
      // Roof brightness is handled directly in drawRoofTiles() via tint().
      let layer = tile.layer || 0;
      if (layer >= 3) continue;
      
      // Skip layer 0-2 tiles at positions covered by a roof tile.
      // Those areas already have roof shadow + light sources controlling
      // their darkness; per-tile brightness must not interfere.
      if (typeof isRoofTile === 'function' && isRoofTile(tile.x, tile.y)) continue;
      
      // brightness 0-100 maps to shadow multiplier 0.0-1.0
      // MULTIPLY blend: 255 = no change, 0 = black
      let shadowValue = Math.floor(Math.max(0, brightness) / 100 * 255);
      
      let pixelX = tile.x * GRID_SIZE;
      let pixelY = tile.y * GRID_SIZE;
      lighting.lightLayer.fill(shadowValue, shadowValue, shadowValue, 255);
      lighting.lightLayer.rect(pixelX, pixelY, GRID_SIZE, GRID_SIZE);
    }
  }
  
  // Also handle light tiles
  if (tileSystem.lightTiles) {
    for (let key in tileSystem.lightTiles) {
      let tile = tileSystem.lightTiles[key];
      let brightness = tile.brightness;
      if (brightness === undefined || brightness >= 100) continue;
      
      let shadowValue = Math.floor(Math.max(0, brightness) / 100 * 255);
      let pixelX = tile.x * GRID_SIZE;
      let pixelY = tile.y * GRID_SIZE;
      lighting.lightLayer.fill(shadowValue, shadowValue, shadowValue, 255);
      lighting.lightLayer.rect(pixelX, pixelY, GRID_SIZE, GRID_SIZE);
    }
  }
  
  lighting.lightLayer.blendMode(BLEND);
}

// Render a single light with shadows
function renderLight(light) {
  if (!lighting.lightLayer) return;
  
  // Ensure falloff property exists (for backwards compatibility)
  if (light.falloff === undefined) {
    light.falloff = 0.8;
  }
  
  // Convert light meter coordinates to lighting layer pixel coordinates
  // The lighting layer should match the world pixel space
  let lightPixelX = light.x * GRID_SIZE;
  let lightPixelY = light.y * GRID_SIZE;
  let radiusPixels = light.radius * GRID_SIZE;
  
  // Set blend mode for additive lighting
  lighting.lightLayer.blendMode(ADD);
  
  if (light.castsShadows) {
    // Cast shadows using ray casting
    renderLightWithShadows(light, lightPixelX, lightPixelY, radiusPixels);
  } else {
    // Simple circular light without shadows
    renderSimpleLight(light, lightPixelX, lightPixelY, radiusPixels);
  }
  
  lighting.lightLayer.blendMode(BLEND);
}

// Render light with shadow casting
// OPTIMIZED: Adaptive ray count based on light radius
function renderLightWithShadows(light, centerX, centerY, radius) {
  // Adaptive ray count: smaller lights need fewer rays
  let baseRayCount = lighting.shadowQuality;
  let radiusMeters = light.radius;
  
  // Scale ray count by radius (smaller lights = fewer rays, but minimum 64 for smooth edges)
  let adaptiveRayCount = Math.max(64, Math.floor(baseRayCount * Math.min(1, radiusMeters / 5)));
  let rayCount = adaptiveRayCount;
  let angleStep = TWO_PI / rayCount;
  
  // More falloff steps for smoother gradients
  let falloffSteps = radiusMeters < 3 ? 15 : 20;
  
  for (let step = falloffSteps; step >= 1; step--) {
    let normalizedDistance = step / falloffSteps;
    
    // Apply falloff curve
    let falloffCurve = 1.0 - Math.pow(normalizedDistance, 1.0 + light.falloff * 2.0);
    let brightness = light.brightness || 1.0; // Default to 1.0 if not set
    let alpha = falloffCurve * light.intensity * brightness * 255;
    let currentRadius = normalizedDistance * radius;
    
    if (alpha <= 2) continue; // Skip nearly invisible layers
    
    lighting.lightLayer.fill(light.color[0], light.color[1], light.color[2], alpha);
    lighting.lightLayer.noStroke();
    
    // Cast rays for this layer
    lighting.lightLayer.beginShape();
    lighting.lightLayer.vertex(centerX, centerY);
    
    for (let i = 0; i <= rayCount; i++) {
      let angle = i * angleStep;
      let rayEnd = castRay(centerX, centerY, angle, currentRadius);
      lighting.lightLayer.vertex(rayEnd.x, rayEnd.y);
    }
    
    lighting.lightLayer.endShape(CLOSE);
  }
}

// Render simple circular light
// OPTIMIZED: Fewer gradient steps for small lights
function renderSimpleLight(light, centerX, centerY, radius) {
  // Fewer steps for smaller lights
  let radiusMeters = light.radius;
  let steps = radiusMeters < 3 ? 12 : 20;
  
  for (let i = steps; i >= 0; i--) {
    let normalizedDistance = i / steps;
    
    // Apply falloff curve - same formula as shadow casting
    let falloffCurve = 1.0 - Math.pow(normalizedDistance, 1.0 + light.falloff * 2.0);
    let brightness = light.brightness || 1.0; // Default to 1.0 if not set
    let alpha = falloffCurve * light.intensity * brightness * 255;
    let currentRadius = normalizedDistance * radius;
    
    if (alpha <= 2) continue; // Skip nearly invisible layers
    
    lighting.lightLayer.fill(light.color[0], light.color[1], light.color[2], alpha);
    lighting.lightLayer.noStroke();
    lighting.lightLayer.ellipse(centerX, centerY, currentRadius * 2);
  }
}

// Cast a ray from light source to detect shadows
// Uses DDA ray-grid intersection at half-meter (16px) resolution
function castRay(startX, startY, angle, maxDistance) {
  let dx = cos(angle);
  let dy = sin(angle);
  
  // Half-cell size in pixels (16px)
  let HALF_CELL = GRID_SIZE / 2;
  
  // Starting grid position in half-meter units
  let gridX = Math.floor(startX / HALF_CELL);
  let gridY = Math.floor(startY / HALF_CELL);
  
  // Direction of stepping through grid
  let stepX = dx > 0 ? 1 : -1;
  let stepY = dy > 0 ? 1 : -1;
  
  // Distance to next grid line in each direction (half-cell boundaries)
  let tMaxX, tMaxY;
  let tDeltaX, tDeltaY;
  
  if (Math.abs(dx) < 0.0001) {
    tMaxX = Infinity;
    tDeltaX = Infinity;
  } else {
    let nextX = dx > 0 ? (gridX + 1) * HALF_CELL : gridX * HALF_CELL;
    tMaxX = (nextX - startX) / dx;
    tDeltaX = HALF_CELL / Math.abs(dx);
  }
  
  if (Math.abs(dy) < 0.0001) {
    tMaxY = Infinity;
    tDeltaY = Infinity;
  } else {
    let nextY = dy > 0 ? (gridY + 1) * HALF_CELL : gridY * HALF_CELL;
    tMaxY = (nextY - startY) / dy;
    tDeltaY = HALF_CELL / Math.abs(dy);
  }
  
  // DDA algorithm - step through half-meter grid cells
  let iterations = 0;
  let maxIterations = Math.ceil(maxDistance / HALF_CELL) * 2 + 10;
  
  while (iterations < maxIterations) {
    iterations++;
    
    // Step to next grid cell
    let hitEdge;
    let t;
    
    if (tMaxX < tMaxY) {
      t = tMaxX;
      if (t > maxDistance) break;
      tMaxX += tDeltaX;
      gridX += stepX;
      hitEdge = 'vertical';
    } else {
      t = tMaxY;
      if (t > maxDistance) break;
      tMaxY += tDeltaY;
      gridY += stepY;
      hitEdge = 'horizontal';
    }
    
    // Check if new cell is blocked (gridX/gridY are half-meter indices)
    if (isPositionBlocked(gridX, gridY)) {
      // Calculate exact intersection with half-cell edge
      let hitX, hitY;
      
      if (hitEdge === 'vertical') {
        // Hit vertical edge (left or right side of half-cell)
        hitX = dx > 0 ? gridX * HALF_CELL : (gridX + 1) * HALF_CELL;
        hitY = startY + dy * t;
      } else {
        // Hit horizontal edge (top or bottom of half-cell)
        hitX = startX + dx * t;
        hitY = dy > 0 ? gridY * HALF_CELL : (gridY + 1) * HALF_CELL;
      }
      
      return { x: hitX, y: hitY };
    }
  }
  
  // Ray reached maximum distance
  return {
    x: startX + dx * maxDistance,
    y: startY + dy * maxDistance
  };
}

// Check if a grid position blocks light (half-meter grid coordinates)
// gridX/gridY are in half-meter units (cache indices)
// OPTIMIZED: Uses obstacle cache instead of live tile lookups
function isPositionBlocked(gridX, gridY) {
  let cacheW = Math.ceil(WORLD_WIDTH * 2);
  let cacheH = Math.ceil(WORLD_HEIGHT * 2);
  
  // Check bounds using half-meter cache dimensions
  if (gridX < 0 || gridX >= cacheW || gridY < 0 || gridY >= cacheH) {
    return true;
  }
  
  // Use cached obstacle data for fast lookup
  if (lighting.obstacleCache && lighting.obstacleCache[gridX]) {
    return lighting.obstacleCache[gridX][gridY] || false;
  }
  
  // Fallback to live lookup if cache not available
  // Convert half-meter grid position back to meter coords for tile lookup
  let meterX = gridX * 0.5;
  let meterY = gridY * 0.5;
  if (typeof getTileAt === 'function') {
    let tile = getTileAt(meterX, meterY);
    if (typeof tileBlocksLight === 'function' ? tileBlocksLight(tile) : 
        (tile && tile.properties && tile.properties.blocksVision)) {
      return true;
    }
  }
  
  return false;
}

// Draw lighting overlay
function drawLighting() {
  if (!lighting.enabled || !lighting.lightLayer) return;
  
  push();
  
  // Apply lighting layer with multiply blend mode for darkness
  blendMode(MULTIPLY);
  
  // Since camera transform is already applied, we need to draw the lighting layer
  // at world origin (0,0) in world coordinates, which maps to meter position (0,0)
  // The lighting layer covers the full world from (0,0) to (WORLD_WIDTH, WORLD_HEIGHT) in meters
  // Convert world origin from meters to pixels: (0,0) meters = (0,0) pixels
  image(lighting.lightLayer, 0, 0);
  
  pop();
  blendMode(BLEND);
}

// Draw light sources in editor mode
function drawLightSources() {
  if (!editMode) return;
  
  push();
  
  for (let light of lighting.lights) {
    // Light position is already centered (gridX + 0.5, gridY + 0.5),
    // so worldX/worldY are already at cell center - no need for extra offset
    let worldX = light.x * GRID_SIZE;
    let worldY = light.y * GRID_SIZE;
    
    // Draw light source indicator at the centered position
    fill(light.color[0], light.color[1], light.color[2], 150);
    stroke(255, 255, 255, 200);
    strokeWeight(2);
    ellipse(worldX, worldY, 16);
    
    // Draw radius indicator if selected
    if (lightEditor.selectedLight === light) {
      noFill();
      stroke(light.color[0], light.color[1], light.color[2], 100);
      strokeWeight(2);
      ellipse(worldX, worldY, light.radius * GRID_SIZE * 2);
      
      // Draw intensity indicator
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(10);
      text(`${light.intensity.toFixed(1)}`, worldX, worldY + 12);
    }
  }
  
  pop();
}

// Handle light editing
function handleLightClick(gridX, gridY, mouseButton) {
  if (!editMode) return false;
  
  let light = getLightAt(gridX, gridY);
  
  if (light && mouseButton === LEFT) {
    // Start editing light
    lightEditor.selectedLight = light;
    lightEditor.isEditing = true;
    lightEditor.dragStartPos = { x: mouseX, y: mouseY };
    lightEditor.originalRadius = light.radius;
    lightEditor.originalIntensity = light.intensity;
    console.log(`Started editing light at (${gridX}, ${gridY})`);
    return true;
  }
  
  return false;
}

// Update light editing
function updateLightEditing() {
  if (!lightEditor.isEditing || !lightEditor.selectedLight) return;
  
  let light = lightEditor.selectedLight;
  let dragDistance = dist(mouseX, mouseY, lightEditor.dragStartPos.x, lightEditor.dragStartPos.y);
  
  // Adjust radius based on horizontal drag
  let deltaX = mouseX - lightEditor.dragStartPos.x;
  let newRadius = lightEditor.originalRadius + (deltaX / GRID_SIZE) * 0.5;
  light.radius = constrain(newRadius, 0.5, 15.0);
  
  // Adjust intensity based on vertical drag
  let deltaY = mouseY - lightEditor.dragStartPos.y;
  let newIntensity = lightEditor.originalIntensity - (deltaY / 50);
  light.intensity = constrain(newIntensity, 0.1, 2.0);
  
  lighting.needsUpdate = true;
}

// Finish light editing
function finishLightEditing() {
  if (lightEditor.isEditing) {
    console.log(`Finished editing light - Radius: ${lightEditor.selectedLight.radius.toFixed(1)}, Intensity: ${lightEditor.selectedLight.intensity.toFixed(1)}`);
    lightEditor.isEditing = false;
    lightEditor.selectedLight = null;
  }
}

// Toggle lighting system
function toggleLighting() {
  lighting.enabled = !lighting.enabled;
  console.log(`Lighting system: ${lighting.enabled ? 'ON' : 'OFF'}`);
}

// Clear all lights
function clearAllLights() {
  lighting.lights = [];
  lighting.dirtyLights.clear();
  lighting.needsUpdate = true;
  lighting.fullUpdateRequired = true;
  console.log("All lights cleared");
}

// Get lighting performance stats
function getLightingStats() {
  return {
    lightCount: lighting.lights.length,
    lastRenderTime: lighting.lastRenderTime.toFixed(2) + 'ms',
    renderCount: lighting.renderCount,
    obstaclesCached: !lighting.obstacleCacheDirty,
    dirtyLights: lighting.dirtyLights.size
  };
}

// DEBUG FUNCTION - call from console
function debugObstacleCache() {
  let count = 0;
  let blockedCells = [];
  let cacheW = Math.ceil(WORLD_WIDTH * 2);
  let cacheH = Math.ceil(WORLD_HEIGHT * 2);
  for (let x = 0; x < cacheW; x++) {
    for (let y = 0; y < cacheH; y++) {
      if (lighting.obstacleCache && lighting.obstacleCache[x] && lighting.obstacleCache[x][y]) {
        count++;
        blockedCells.push(`(${x*0.5},${y*0.5})`);
      }
    }
  }
  console.log('Total blocked cells: ' + count);
  console.log('Blocked positions: ' + blockedCells.join(', '));
  console.log('Cache dirty flag: ' + lighting.obstacleCacheDirty);
  console.log('Lights count: ' + lighting.lights.length);
  
  // Check if any tiles have blocksVision
  if (typeof tileSystem !== 'undefined' && tileSystem.placedTiles) {
    let tilesWithBlocksVision = 0;
    for (let key in tileSystem.placedTiles) {
      let tilesAtPos = tileSystem.placedTiles[key];
      let tiles = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];
      for (let tile of tiles) {
        if (tile && tile.properties && tile.properties.blocksVision) {
          tilesWithBlocksVision++;
          console.log(`Tile at ${key}: type=${tile.type}, blocksVision=${tile.properties.blocksVision}`);
        }
      }
    }
    console.log('Total tiles with blocksVision: ' + tilesWithBlocksVision);
  }
  
  return count;
}

// DEBUG: Force rebuild and test shadow casting
function debugShadowTest() {
  console.log('=== SHADOW DEBUG TEST ===');
  
  // Force rebuild obstacle cache
  lighting.obstacleCacheDirty = true;
  rebuildObstacleCache();
  
  // Check if lights exist
  console.log('Active lights:', lighting.lights.length);
  for (let light of lighting.lights) {
    console.log(`  Light at (${light.x.toFixed(2)}m, ${light.y.toFixed(2)}m), radius=${light.radius}m, castsShadows=${light.castsShadows}`);
    
    // Test casting a few rays from this light
    if (light.castsShadows) {
      let lightPixelX = light.x * GRID_SIZE;
      let lightPixelY = light.y * GRID_SIZE;
      let radiusPixels = light.radius * GRID_SIZE;
      
      console.log(`  Testing rays from pixel (${lightPixelX}, ${lightPixelY}), radius=${radiusPixels}px`);
      
      // Test 8 directions
      for (let i = 0; i < 8; i++) {
        let angle = (i / 8) * TWO_PI;
        let result = castRay(lightPixelX, lightPixelY, angle, radiusPixels);
        let hitDistance = Math.sqrt((result.x - lightPixelX) ** 2 + (result.y - lightPixelY) ** 2);
        let hitSomething = hitDistance < radiusPixels * 0.99;
        
        console.log(`    Ray ${i} (angle ${(angle * 180 / Math.PI).toFixed(0)}°): ` +
                    `ended at (${result.x.toFixed(1)}, ${result.y.toFixed(1)}), ` +
                    `dist=${hitDistance.toFixed(1)}px, hit=${hitSomething}`);
      }
    }
  }
  
  // Force full re-render
  lighting.needsUpdate = true;
  lighting.fullUpdateRequired = true;
  
  console.log('Shadow test complete - check console for blocked cells');
  return debugObstacleCache();
}

// DEBUG: Check if a specific grid position is blocked (meter coordinates)
// Converts to half-meter cache indices internally
function debugCheckBlocked(gridX, gridY) {
  let cx = Math.floor(gridX * 2);
  let cy = Math.floor(gridY * 2);
  console.log(`Checking blocked status at (${gridX}, ${gridY}) -> cache[${cx}][${cy}]:`);
  console.log(`  obstacleCache[${cx}][${cy}] = ${lighting.obstacleCache?.[cx]?.[cy]}`);
  console.log(`  isPositionBlocked(${cx}, ${cy}) = ${isPositionBlocked(cx, cy)}`);
  
  // Check what tile is there
  if (typeof tileSystem !== 'undefined' && tileSystem.placedTiles) {
    let key = `${gridX},${gridY}`;
    let tilesAtPos = tileSystem.placedTiles[key];
    if (tilesAtPos) {
      let tiles = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];
      console.log(`  Tiles at position:`, tiles.map(t => ({type: t.type, blocksVision: t.properties?.blocksVision})));
    } else {
      console.log(`  No tiles at position`);
    }
  }
  
  return isPositionBlocked(cx, cy);
}
