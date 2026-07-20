// Player System for 2D Game Engine
// Physics-based movement with simple wall collision

// Player object with physics properties - unified meter coordinate system
let player = {
  // Position (in meters)
  x: 0,
  y: 0,
  
  // Physics (in meters per frame)
  velocity: { x: 0, y: 0 },
  acceleration: { x: 0, y: 0 },
  maxSpeed: 0.06,        // Reduced by 40% from 0.1 (0.06m = 1.92 pixels per frame at 60fps)
  accelerationRate: 0.012,  // Reduced by 40% from 0.02 (Meters per frame squared)
  friction: 0.9,         // Unchanged - unitless friction coefficient
  
  // Visual (in meters)
  size: 0.6,            // Player visual size in meters (0.6m = ~20 pixels)
  collisionSize: 0.4,   // Collision hitbox size (0.4m < 0.5m tile, fits through 16px gaps)
  color: { r: 100, g: 150, b: 255 },
  sprite: null,         // Legacy single sprite (fallback)
  useSprite: true,      // Whether to use sprite or fallback to circle
  
  // Animation system (8-directional)
  facing: 'south',      // Current facing direction
  animState: 'idle',    // 'idle' or 'walk'
  animFrame: 0,         // Current frame index
  animTimer: 0,         // Frame timer (counts up each draw)
  animSpeed: 8,         // Frames between animation advances (lower = faster)
  animRunSpeed: 5,      // Faster animation when running
  
  // Spawn system (in meters)
  spawnX: 30.0,         // Default spawn at world center X (30m = center of 60m world)
  spawnY: 17.0,         // Default spawn at world center Y (17m = center of 34m world)
  
  // Effects
  speedBoost: 1.0,
  speedBoostTimer: 0,
  
  // Health (for HAZARD flag damage)
  health: 100,
  maxHealth: 100,
  
  // Jumping state (top-down 'jump' to bypass one-cell obstacles)
  isJumping: false,
  jumpEndTime: 0,
  jumpDurationMs: 400,
  lastJumpTime: 0,
  jumpCooldownMs: 300,
  
  // Sitting state (player sits on chairs/sofas)
  isSitting: false,
  sittingTile: null,      // Reference to the tile the player is sitting on
  sittingPosition: null,  // Stores { x, y } of the center of the furniture
  
  // Running state
  isRunning: false,
  runSpeedMultiplier: 1.6,  // 60% faster when running
  
  // Debug info
  lastCollision: { x: false, y: false, time: 0 },
  currentTerrain: null,
  debugInfo: {
    gridX: 0,
    gridY: 0,
    velocityMagnitude: 0,
    effectiveSpeed: 0,
    isMoving: false
  }
};

// Default settings (may be overridden by js/data/game_settings.js)
window.gameSettings = window.gameSettings || { jumpPower: 5 }; // 1..10

// Attempt to make the player jump (top-down jump clears blocking tiles for short duration)
function attemptJump() {
  if (window.editMode) return false;
  if (player.isSitting) return false; // Can't jump while sitting
  const now = Date.now();
  if (player.isJumping) return false;
  if (now - player.lastJumpTime < player.jumpCooldownMs) return false;

  // Map jumpPower (1-10) to 1..2 cells jump capability
  const jp = Math.max(1, Math.min(10, (window.gameSettings && window.gameSettings.jumpPower) || 5));
  const jumpCells = 1 + (jp - 1) / 9; // 1.0 .. 2.0

  player.isJumping = true;
  player.jumpEndTime = now + player.jumpDurationMs;
  player.lastJumpTime = now;

  console.log(`Player jumped: ${jumpCells.toFixed(2)} cells (power ${jp}) for ${player.jumpDurationMs}ms`);
  return true;
}

// Attempt to sit on a nearby sittable tile (chair, sofa, etc.)
function attemptSit(tile) {
  if (window.editMode) return false;
  if (player.isSitting) return false;
  if (player.isJumping) return false;
  if (!tile) return false;
  
  // Check if the tile is sittable (property or SITTABLE flag)
  if (typeof getTileDefinition !== 'function') return false;
  const tileDef = getTileDefinition(tile.type);
  if (!tileDef) return false;
  const isSittable = tileDef.sittable || (tileDef.flags && tileDef.flags.includes('SITTABLE'));
  if (!isSittable) return false;
  
  // Store the original position before sitting
  player.sittingPosition = { x: player.x, y: player.y };
  player.sittingTile = tile;
  player.isSitting = true;
  
  // Move player to center of the furniture tile
  // For 32px tiles (gridScale 1): center offset = 0.5m
  // For 16px tiles (gridScale 0.5): center offset = 0.25m
  let centerOffset = (tile.gridScale && tile.gridScale <= 0.5) ? 0.25 : 0.5;
  player.x = tile.x + centerOffset;
  player.y = tile.y + centerOffset;
  
  // Stop all movement
  player.velocity.x = 0;
  player.velocity.y = 0;
  player.acceleration.x = 0;
  player.acceleration.y = 0;
  
  return true;
}

// Stand up from sitting position
function standUp() {
  if (!player.isSitting) return false;
  
  // Move player back to original position before sitting
  if (player.sittingPosition) {
    player.x = player.sittingPosition.x;
    player.y = player.sittingPosition.y;
  }
  
  player.isSitting = false;
  player.sittingTile = null;
  player.sittingPosition = null;
  
  // Set cooldown to prevent immediately sitting again
  lastInteractionTime = millis();
  
  return true;
}

// Toggle sitting state - called when E is pressed near sittable furniture
function toggleSitting(tile) {
  if (player.isSitting) {
    return standUp();
  } else if (tile) {
    return attemptSit(tile);
  }
  return false;
}

// Check if a tile is sittable (uses flag system with legacy fallback)
function isTileSittable(tile) {
  if (!tile) return false;
  // Flag system (authoritative)
  if (typeof tileIsSittable === 'function') return tileIsSittable(tile);
  // Fallback: direct definition check
  if (typeof getTileDefinition !== 'function') return false;
  const tileDef = getTileDefinition(tile.type);
  return tileDef && (tileDef.sittable === true || (tileDef.flags && tileDef.flags.includes('SITTABLE')));
}

// ============================================
// PLAYER ANIMATION SYSTEM
// 8-directional sprites with walk animations
// ============================================

// All 8 directions used by the sprite system
const PLAYER_DIRECTIONS = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];
const WALK_FRAME_COUNT = 6; // frames per direction
const ACTION_FRAME_COUNT = 5; // frames per direction for picking-up animation

// Sprite storage
let playerSprites = {
  idle: {},      // { 'south': p5.Image, 'east': p5.Image, ... }
  walk: {},      // { 'south': [frame0, frame1, ...], 'east': [...], ... }
  action: {},    // { 'south': [frame0, frame1, ...], 'east': [...], ... } - picking-up
  loaded: false
};

// Cache-bust helper for image loading - adds timestamp to prevent browser caching
function getCacheBustedPath(path) {
  const timestamp = new Date().getTime();
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}v=${timestamp}`;
}

// Load all player animation sprites
function loadPlayerSprite() {
  let totalToLoad = PLAYER_DIRECTIONS.length
    + PLAYER_DIRECTIONS.length * WALK_FRAME_COUNT
    + PLAYER_DIRECTIONS.length * ACTION_FRAME_COUNT;
  let loaded = 0;
  let failed = 0;
  
  function onLoad() {
    loaded++;
    if (loaded + failed >= totalToLoad) {
      playerSprites.loaded = (failed < totalToLoad);
      player.useSprite = playerSprites.loaded;
      console.log(`Player sprites: ${loaded} loaded, ${failed} failed`);
    }
  }
  function onFail(path) {
    failed++;
    console.warn(`Failed to load sprite: ${path}`);
    onLoad();
  }
  
  // Load idle rotations: rotations/{direction}.png
  for (let dir of PLAYER_DIRECTIONS) {
    let path = `assets/sprites/rotations/${dir}.png`;
    loadImage(getCacheBustedPath(path),
      (img) => { playerSprites.idle[dir] = img; onLoad(); },
      () => onFail(path)
    );
  }
  
  // Load walk frames: animations/walk/{direction}/frame_00X.png
  for (let dir of PLAYER_DIRECTIONS) {
    playerSprites.walk[dir] = new Array(WALK_FRAME_COUNT);
    for (let f = 0; f < WALK_FRAME_COUNT; f++) {
      let frameStr = String(f).padStart(3, '0');
      let path = `assets/sprites/animations/walk/${dir}/frame_${frameStr}.png`;
      // Use closure to capture dir and f
      ((d, idx) => {
        loadImage(getCacheBustedPath(path),
          (img) => { playerSprites.walk[d][idx] = img; onLoad(); },
          () => onFail(path)
        );
      })(dir, f);
    }
  }
  
  // Load picking-up (action) frames: animations/picking-up/{direction}/frame_00X.png
  for (let dir of PLAYER_DIRECTIONS) {
    playerSprites.action[dir] = new Array(ACTION_FRAME_COUNT);
    for (let f = 0; f < ACTION_FRAME_COUNT; f++) {
      let frameStr = String(f).padStart(3, '0');
      let path = `assets/sprites/animations/picking-up/${dir}/frame_${frameStr}.png`;
      ((d, idx) => {
        loadImage(getCacheBustedPath(path),
          (img) => { playerSprites.action[d][idx] = img; onLoad(); },
          () => onFail(path)
        );
      })(dir, f);
    }
  }
  
  console.log(`Loading ${totalToLoad} player animation frames...`);
}

// Determine 8-way direction from velocity vector
function getDirectionFromVelocity(vx, vy) {
  // Dead zone - too small to be meaningful
  if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001) return null;
  
  // atan2 gives angle in radians; convert to degrees
  // In our coord system: +x = east, +y = south
  let angle = Math.atan2(vy, vx) * (180 / Math.PI);
  // Normalize to 0-360
  if (angle < 0) angle += 360;
  
  // Map angle to 8 directions (each covers 45°, centered on compass direction)
  //   east=0°, south-east=45°, south=90°, south-west=135°,
  //   west=180°, north-west=225°, north=270°, north-east=315°
  if (angle >= 337.5 || angle < 22.5)  return 'east';
  if (angle >= 22.5  && angle < 67.5)  return 'south-east';
  if (angle >= 67.5  && angle < 112.5) return 'south';
  if (angle >= 112.5 && angle < 157.5) return 'south-west';
  if (angle >= 157.5 && angle < 202.5) return 'west';
  if (angle >= 202.5 && angle < 247.5) return 'north-west';
  if (angle >= 247.5 && angle < 292.5) return 'north';
  if (angle >= 292.5 && angle < 337.5) return 'north-east';
  return 'south'; // fallback
}

// Update player animation state (called each frame)
function updatePlayerAnimation() {
  // If an action animation is playing, advance it and block other states
  if (player.animState === 'action') {
    player.animTimer++;
    let frameRate = player.animSpeed; // same cadence as walk
    if (player.animTimer >= frameRate) {
      player.animTimer = 0;
      player.animFrame++;
      if (player.animFrame >= ACTION_FRAME_COUNT) {
        // Action animation finished - return to idle
        player.animState = 'idle';
        player.animFrame = 0;
        player.animTimer = 0;
        if (typeof player._actionCallback === 'function') {
          player._actionCallback();
          player._actionCallback = null;
        }
      }
    }
    return; // Don't update facing or switch to walk during action
  }

  let speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
  let isMoving = speed > 0.003;
  
  if (isMoving) {
    // Update facing direction from velocity
    let dir = getDirectionFromVelocity(player.velocity.x, player.velocity.y);
    if (dir) player.facing = dir;
    
    player.animState = 'walk';
    
    // Advance animation timer
    let frameRate = player.isRunning ? player.animRunSpeed : player.animSpeed;
    player.animTimer++;
    if (player.animTimer >= frameRate) {
      player.animTimer = 0;
      player.animFrame = (player.animFrame + 1) % WALK_FRAME_COUNT;
    }
  } else {
    player.animState = 'idle';
    player.animFrame = 0;
    player.animTimer = 0;
  }
}

// Get the current sprite image to render
function getCurrentPlayerSprite() {
  if (!playerSprites.loaded) return player.sprite; // legacy fallback
  
  let dir = player.facing || 'south';
  
  // Action animation (picking-up)
  if (player.animState === 'action') {
    let frames = playerSprites.action[dir];
    if (frames && frames[player.animFrame]) {
      return frames[player.animFrame];
    }
  }
  
  if (player.animState === 'walk') {
    let frames = playerSprites.walk[dir];
    if (frames && frames[player.animFrame]) {
      return frames[player.animFrame];
    }
  }
  
  // Idle - use rotation sprite
  if (playerSprites.idle[dir]) {
    return playerSprites.idle[dir];
  }
  
  // Final fallback
  return playerSprites.idle['south'] || player.sprite;
}

// Play the picking-up (action) animation once, then return to idle.
// Optional callback fires after the last frame.
function playActionAnimation(callback) {
  if (player.animState === 'action') return; // already playing
  player.animState = 'action';
  player.animFrame = 0;
  player.animTimer = 0;
  player._actionCallback = callback || null;
  // Freeze player movement while action plays
  player.velocity.x = 0;
  player.velocity.y = 0;
  player.acceleration.x = 0;
  player.acceleration.y = 0;
}

// Toggle between sprite and circle rendering (for debugging)
function togglePlayerSprite() {
  player.useSprite = !player.useSprite;
  console.log('Player rendering mode:', player.useSprite ? 'sprite' : 'circle');
}

// Key states for smooth movement
let keyStates = {
  up: false,
  down: false,
  left: false,
  right: false,
  run: false  // Shift key for running
};

// Interaction state
let lastInteractionTime = 0;
let nearbyInteractiveTile = null;

// Initialize player system with meter coordinates
function initPlayer() {
  console.log('Player system initialized - unified meter coordinate system');
  
  // Default spawn at world center
  player.spawnX = WORLD_WIDTH / 2;
  player.spawnY = WORLD_HEIGHT / 2;
  
  // Find player start tile if it exists (overrides default)
  findPlayerStartPosition();
  
  // Set initial position
  player.x = player.spawnX;
  player.y = player.spawnY;
  
  console.log(`Player spawned at (${player.x}m, ${player.y}m) in unified coordinate system`);
}

// Find player_start tile and set spawn position (meter coordinates)
// Checks: 1) visual player_start tiles, 2) interactive/script tiles with scriptId 'player_start'
function findPlayerStartPosition() {
  console.log('[PLAYER] findPlayerStartPosition() called - searching...');

  // 1) Check placed tiles for a player_start tile type
  if (typeof getTileAt === 'function') {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      for (let y = 0; y < WORLD_HEIGHT; y++) {
        const tile = getTileAt(x, y);
        if (tile && tile.type === 'player_start') {
          player.spawnX = x + 0.5;
          player.spawnY = y + 0.5;
          console.log(`[PLAYER] ✓ Found player_start TILE at (${x}, ${y}) → spawn (${player.spawnX}, ${player.spawnY})`);
          return;
        }
      }
    }
  }

  // 2) Check interactive/script tiles for scriptId === 'player_start'
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    console.log(`[PLAYER] Checking ${interactiveTiles.length} interactive tiles for scriptId 'player_start'...`);
    for (let tile of interactiveTiles) {
      if (tile && tile.scriptId === 'player_start') {
        player.spawnX = tile.x + 0.5;
        player.spawnY = tile.y + 0.5;
        console.log(`[PLAYER] ✓ Found player_start SCRIPT tile at (${tile.x}, ${tile.y}) → spawn (${player.spawnX}, ${player.spawnY})`);
        return;
      }
    }
  }

  console.log('[PLAYER] No player_start tile found, using default spawn at world center');
}

// Set player spawn position (meter coordinates)
function setPlayerSpawn(x, y) {
  player.spawnX = x;
  player.spawnY = y;
  console.log(`Player spawn set to (${x}m, ${y}m)`);
}

// Respawn player at spawn point
function respawnPlayer() {
  player.x = player.spawnX;
  player.y = player.spawnY;
  player.velocity.x = 0;
  player.velocity.y = 0;
  player.speedBoost = 1.0;
  player.speedBoostTimer = 0;
  console.log(`Player respawned at (${player.spawnX}m, ${player.spawnY}m)`);
}

// Handle player movement with physics
function handlePlayerMovement() {
  if (editMode) return;
  
  // If player is sitting, don't allow movement
  if (player.isSitting) {
    player.velocity.x = 0;
    player.velocity.y = 0;
    player.acceleration.x = 0;
    player.acceleration.y = 0;
    return;
  }
  
  // Freeze movement while action animation is playing
  if (player.animState === 'action') {
    player.velocity.x = 0;
    player.velocity.y = 0;
    player.acceleration.x = 0;
    player.acceleration.y = 0;
    return;
  }
  
  // Freeze movement while dialog is active
  if (typeof isDialogActive === 'function' && isDialogActive()) {
    player.velocity.x = 0;
    player.velocity.y = 0;
    player.acceleration.x = 0;
    player.acceleration.y = 0;
    return;
  }
  
  // Freeze movement during scene transitions
  if (typeof sceneManager !== 'undefined' && sceneManager.isInputFrozen()) {
    player.velocity.x = 0;
    player.velocity.y = 0;
    player.acceleration.x = 0;
    player.acceleration.y = 0;
    return;
  }
  
  // Reset acceleration
  player.acceleration.x = 0;
  player.acceleration.y = 0;
  
  // Apply acceleration based on key states
  if (keyStates.left) {
    player.acceleration.x = -player.accelerationRate;
  }
  if (keyStates.right) {
    player.acceleration.x = player.accelerationRate;
  }
  if (keyStates.up) {
    player.acceleration.y = -player.accelerationRate;
  }
  if (keyStates.down) {
    player.acceleration.y = player.accelerationRate;
  }
  
  // Apply acceleration to velocity
  player.velocity.x += player.acceleration.x;
  player.velocity.y += player.acceleration.y;
  
  // Get terrain speed modifier and properties based on current tile
  let terrainModifier = getTerrainSpeedModifier();
  let isHighTraction = isOnHighTractionSurface();
  
  // Apply speed boost, terrain modifier, and running multiplier
  let runMultiplier = player.isRunning ? player.runSpeedMultiplier : 1.0;
  let effectiveMaxSpeed = player.maxSpeed * player.speedBoost * terrainModifier * runMultiplier;
  
  // Limit velocity to max speed
  let speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
  if (speed > effectiveMaxSpeed) {
    player.velocity.x = (player.velocity.x / speed) * effectiveMaxSpeed;
    player.velocity.y = (player.velocity.y / speed) * effectiveMaxSpeed;
  }
  
  // Apply terrain-modified friction
  let effectiveFriction;
  if (isHighTraction) {
    // High traction surfaces (asphalt, sidewalk) - immediate stopping
    effectiveFriction = 0.1; // Very low friction coefficient = immediate stop
  } else if (isOnSlipperySurface()) {
    // SLIPPERY flag (ice, oil) - player slides with very little friction
    effectiveFriction = 0.97;
  } else {
    // Regular surfaces - momentum-based friction
    effectiveFriction = player.friction * (0.5 + terrainModifier * 0.5); // Slower terrain = more friction
  }
  
  // Apply friction when no input
  if (player.acceleration.x === 0) {
    player.velocity.x *= effectiveFriction;
  }
  if (player.acceleration.y === 0) {
    player.velocity.y *= effectiveFriction;
  }
  
  // Calculate next position
  let nextX = player.x + player.velocity.x;
  let nextY = player.y + player.velocity.y;
  
  // Simple wall collision check
  let collisionX = false;
  let collisionY = false;
  
  if (!canMoveTo(nextX, player.y)) {
    player.velocity.x = 0;
    nextX = player.x;
    collisionX = true;
  }
  
  if (!canMoveTo(player.x, nextY)) {
    player.velocity.y = 0;
    nextY = player.y;
    collisionY = true;
  }
  
  // Track collision state for debug
  if (collisionX || collisionY) {
    player.lastCollision = { x: collisionX, y: collisionY, time: millis() };
  }
  
  // Simple world boundary collision (meter coordinates)
  let halfSize = (player.collisionSize || player.size) / 2;  // Half collision size in meters
  if (nextX - halfSize < 0 || nextX + halfSize > WORLD_WIDTH) {
    player.velocity.x = 0;
    nextX = player.x;
    player.lastCollision = { x: true, y: false, time: millis() };
  }
  if (nextY - halfSize < 0 || nextY + halfSize > WORLD_HEIGHT) {
    player.velocity.y = 0;
    nextY = player.y;
    player.lastCollision = { x: false, y: true, time: millis() };
  }
  
  // Update position
  player.x = nextX;
  player.y = nextY;

  // End jump when duration elapsed
  if (player.isJumping && Date.now() > player.jumpEndTime) {
    player.isJumping = false;
    console.log('Player jump ended');
  }
  
  // Spawn environmental particles based on movement and terrain
  spawnMovementParticles(terrainModifier);

  // Play walk-over sounds when crossing tile boundaries
  _checkWalkOverSound(nextX, nextY);
  
  // Check for nearby interactive tiles
  updateNearbyInteractions();
  
  // Update debug info
  updatePlayerDebugInfo(terrainModifier);
  
  // Apply tile effects after movement
  applyCurrentTileEffects();
}

// AABB collision check - can player move to this position? (meter coordinates)
// Checks all 0.5m cells overlapping the player's bounding box
// Respects both 32px (1m) and 16px (0.5m) tiles
function canMoveTo(x, y) {
  let hs = (player.collisionSize || player.size) / 2;  // 0.2m for 0.4m collision box
  
  // Check if position is within world bounds (in meters)
  if (x - hs < 0 || x + hs > WORLD_WIDTH || y - hs < 0 || y + hs > WORLD_HEIGHT) {
    return false;
  }
  
  // Helper: check if any tiles at a given key block movement
  function checkTilesBlocking(key) {
    let tiles = typeof tileSystem !== 'undefined' ? tileSystem.placedTiles[key] : null;
    if (!tiles) return false;
    let arr = Array.isArray(tiles) ? tiles : [tiles];
    for (let tile of arr) {
      if (tile.layer !== undefined && tile.layer >= 1) {
        if (typeof tileBlocksMovement === 'function' && tileBlocksMovement(tile)) {
          return true;
        }
      }
    }
    return false;
  }
  
  // Helper: check if a 32px tile at integer key blocks this half-cell
  // Only returns true for tiles with gridScale >= 1 (they span full 1m)
  function check32TileBlocking(intKey) {
    let tiles = typeof tileSystem !== 'undefined' ? tileSystem.placedTiles[intKey] : null;
    if (!tiles) return false;
    let arr = Array.isArray(tiles) ? tiles : [tiles];
    for (let tile of arr) {
      let gs = tile.gridScale || 1;
      if (gs >= 1 && tile.layer !== undefined && tile.layer >= 1) {
        if (typeof tileBlocksMovement === 'function' && tileBlocksMovement(tile)) {
          return true;
        }
      }
    }
    return false;
  }
  
  // Find all 0.5m cells overlapping player's bounding box
  let startCX = Math.floor((x - hs) * 2);
  let endCX = Math.floor((x + hs - 0.001) * 2);
  let startCY = Math.floor((y - hs) * 2);
  let endCY = Math.floor((y + hs - 0.001) * 2);
  
  // Track which integer cells we've already checked
  let checkedInteractive = {};
  let checkedIntKeys = {};
  
  for (let cx = startCX; cx <= endCX; cx++) {
    for (let cy = startCY; cy <= endCY; cy++) {
      let cellX = cx * 0.5;
      let cellY = cy * 0.5;
      let intX = Math.floor(cellX);
      let intY = Math.floor(cellY);
      let intKey = `${intX},${intY}`;
      
      // Check interactive tiles at the integer position (once per integer cell)
      if (!checkedInteractive[intKey]) {
        checkedInteractive[intKey] = true;
        if (typeof isBlockedByInteractiveTile !== 'undefined' && isBlockedByInteractiveTile(intX, intY)) {
          if (player.isJumping) return true;
          return false;
        }
      }
      
      // Check exact half-meter key (catches 16px tiles AND 32px tiles at integer positions)
      let key = `${cellX},${cellY}`;
      if (checkTilesBlocking(key)) {
        if (player.isJumping) return true;
        return false;
      }
      
      // Check parent integer key for 32px tiles that span the full meter
      // A 32px tile at "3,5" covers half-cells (3,5), (3.5,5), (3,5.5), (3.5,5.5)
      if (key !== intKey && !checkedIntKeys[intKey]) {
        checkedIntKeys[intKey] = true;
        if (check32TileBlocking(intKey)) {
          if (player.isJumping) return true;
          return false;
        }
      }
    }
  }
  
  return true; // Position is walkable
}

// Get speed modifier based on current terrain (meter coordinates)
function getTerrainSpeedModifier() {
  // Get current tile under player (in meters)
  let gridX = Math.floor(player.x);
  let gridY = Math.floor(player.y);
  
  // Check bounds
  if (gridX < 0 || gridX >= WORLD_WIDTH || gridY < 0 || gridY >= WORLD_HEIGHT) {
    return 1.0; // Default speed
  }
  
  let tile = getTileAt(gridX, gridY);
  if (tile) {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef && tileDef.speedModifier !== undefined) {
      let modifier = tileDef.speedModifier;
      
      // Apply rain wet slowdown on outdoor tiles
      if (tileDef.wetSlowdown !== undefined && isRaining()) {
        modifier *= tileDef.wetSlowdown;
      }
      
      // SWIMMABLE flag: reduce speed to 50%
      let flags = tileDef.flags || [];
      if (flags.includes('SWIMMABLE')) {
        modifier *= 0.5;
      }
      
      // CLIMBABLE flag: reduce speed to 40%
      if (flags.includes('CLIMBABLE')) {
        modifier *= 0.4;
      }
      
      return modifier;
    }
  }
  
  return 1.0; // Default speed if no tile or no speed modifier
}

/**
 * Check if rain weather effect is currently active
 */
function isRaining() {
  return typeof particleEffects !== 'undefined' 
    && particleEffects.weatherEffects 
    && particleEffects.weatherEffects.rain === true;
}

// Check if current terrain has high traction (immediate stopping)
function isOnHighTractionSurface() {
  // Get current tile under player (in meters)
  let gridX = Math.floor(player.x);
  let gridY = Math.floor(player.y);
  
  // Check bounds
  if (gridX < 0 || gridX >= WORLD_WIDTH || gridY < 0 || gridY >= WORLD_HEIGHT) {
    return false; // Default to no high traction
  }
  
  let tile = getTileAt(gridX, gridY);
  if (tile) {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef && tileDef.highTraction === true) {
      return true;
    }
  }
  
  return false; // Default to no high traction
}

// Check if current tile has SLIPPERY flag (ice, oil surfaces)
function isOnSlipperySurface() {
  let gridX = Math.floor(player.x);
  let gridY = Math.floor(player.y);
  
  if (gridX < 0 || gridX >= WORLD_WIDTH || gridY < 0 || gridY >= WORLD_HEIGHT) {
    return false;
  }
  
  let tile = getTileAt(gridX, gridY);
  if (tile) {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef && tileDef.flags && tileDef.flags.includes('SLIPPERY')) {
      return true;
    }
  }
  
  return false;
}

// Apply effects from current tile (meter coordinates)
function applyCurrentTileEffects() {
  let gridX = Math.floor(player.x);
  let gridY = Math.floor(player.y);
  
  // Check bounds
  if (gridX < 0 || gridX >= WORLD_WIDTH || gridY < 0 || gridY >= WORLD_HEIGHT) {
    return;
  }
  
  let tile = getTileAt(gridX, gridY);
  if (tile) {
    let tileDef = getTileDefinition(tile.type);
    if (tileDef) {
      // Show terrain effect feedback
      showTerrainFeedback(tileDef);
      
      // --- Flag-driven tile effects ---
      let flags = tileDef.flags || [];
      
      // HAZARD: damage player on contact
      if (flags.includes('HAZARD') && !player.isJumping) {
        let dmg = tileDef.damage || 5;
        if (!player._hazardCooldown || Date.now() > player._hazardCooldown) {
          if (typeof player.health === 'number') {
            player.health = Math.max(0, player.health - dmg);
            console.log(`[FLAG] HAZARD tile dealt ${dmg} damage. Health: ${player.health}`);
          }
          player._hazardCooldown = Date.now() + 500; // 0.5s between damage ticks
        }
      }
      
      // SWIMMABLE: slow player + swim visual state
      if (flags.includes('SWIMMABLE')) {
        player._isSwimming = true;
        // Swimming speed penalty applied via getTerrainSpeedModifier fallback
      } else {
        player._isSwimming = false;
      }
      
      // CLIMBABLE: allow vertical movement at reduced speed
      if (flags.includes('CLIMBABLE')) {
        player._isClimbing = true;
      } else {
        player._isClimbing = false;
      }
    }
  }
}

// Show visual feedback for terrain effects
function showTerrainFeedback(tileDef) {
  // Store current terrain for display
  player.currentTerrain = {
    name: tileDef.displayName || 'Unknown',
    speedModifier: tileDef.speedModifier || 1.0
  };
}

// Spawn environmental particles based on player movement
function spawnMovementParticles(terrainModifier) {
  // Only spawn particles if player is moving
  let speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
  if (speed < 0.01) return; // Not moving enough
  
  // Check if environmental particles system is available
  if (typeof spawnEnvironmentalParticles !== 'function') return;
  
  // Get current tile under player
  let gridX = Math.floor(player.x);
  let gridY = Math.floor(player.y);
  
  // Check bounds
  if (gridX < 0 || gridX >= WORLD_WIDTH || gridY < 0 || gridY >= WORLD_HEIGHT) {
    return;
  }
  
  let tile = getTileAt(gridX, gridY);
  if (!tile) return;
  
  // Get terrain particle type
  let terrainType;
  if (typeof getTerrainParticleType === 'function') {
    terrainType = getTerrainParticleType(tile.type);
  } else {
    // Fallback terrain mapping
    terrainType = tile.type.includes('grass') ? 'grass' : 
                  tile.type.includes('dirt') ? 'dirt' :
                  tile.type.includes('sand') ? 'sand' :
                  tile.type.includes('water') ? 'water' :
                  tile.type.includes('stone') ? 'stone' : 'default';
  }
  
  // Calculate particle intensity based on speed and terrain
  let baseIntensity = speed / player.maxSpeed; // 0-1 based on movement speed
  let terrainIntensity = (2.0 - terrainModifier); // More particles on slower terrain
  let intensity = baseIntensity * terrainIntensity * 0.3; // Scale down for reasonable particle count
  
  // Only spawn particles occasionally to avoid overwhelming
  if (random() < intensity * 0.3) { // 30% chance per frame when moving at full speed
    // Calculate movement direction
    let direction = Math.atan2(player.velocity.y, player.velocity.x);
    
    // Convert player position to pixels for particle spawning
    let pixelX = player.x * GRID_SIZE;
    let pixelY = player.y * GRID_SIZE;
    
    // Offset particles to player's feet
    pixelY += (player.size * GRID_SIZE * 0.3); // Spawn at bottom of player
    
    // Spawn particles behind the player (opposite direction of movement)
    let spawnDirection = direction + Math.PI; // Opposite direction
    
    spawnEnvironmentalParticles(pixelX, pixelY, terrainType, intensity, spawnDirection);
  }
}

// Update key states for movement
function updateKeyState(code, pressed) {
  // Handle both keyCode numbers and key name strings
  let keyName = code;
  
  // Convert keyCode numbers to key names if needed
  if (typeof code === 'number') {
    switch(code) {
      case 16: // SHIFT
        keyName = 'Shift';
        break;
      case 37: // LEFT_ARROW
        keyName = 'ArrowLeft';
        break;
      case 38: // UP_ARROW
        keyName = 'ArrowUp';
        break;
      case 39: // RIGHT_ARROW
        keyName = 'ArrowRight';
        break;
      case 40: // DOWN_ARROW
        keyName = 'ArrowDown';
        break;
      default:
        return; // Ignore other keys
    }
  }
  
  switch(keyName) {
    case 'Shift':
      keyStates.run = pressed;
      player.isRunning = pressed;
      break;
    case 'ArrowUp':
      keyStates.up = pressed;
      break;
    case 'ArrowDown':
      keyStates.down = pressed;
      break;
    case 'ArrowLeft':
      keyStates.left = pressed;
      break;
    case 'ArrowRight':
      keyStates.right = pressed;
      break;
  }
  
  // Debug log to verify key input
  if (pressed) {
    console.log(`Key pressed: ${keyName}, keyStates:`, keyStates);
  }
}

// Check for nearby interactive tiles
function updateNearbyInteractions() {
  if (typeof checkForNearbyInteractions !== 'undefined') {
    // Player position is already in meters, no conversion needed
    let gridX = player.x;
    let gridY = player.y;
    nearbyInteractiveTile = checkForNearbyInteractions(gridX, gridY);
  }
}

// Handle interaction with nearby tiles (E key)
function handleInteraction() {
  // Block interactions while an action animation is playing
  if (player.animState === 'action') return false;
  
  // If player is already sitting, stand up (no cooldown for standing)
  if (player.isSitting) {
    if (standUp()) {
      lastInteractionTime = millis();
      return true;
    }
    return false;
  }
  
  // Prevent spam interactions for other actions
  let currentTime = millis();
  if (currentTime - lastInteractionTime < 300) return false; // 300ms cooldown
  
  // Check for signpost interaction first
  if (typeof tryInteractWithSignpost === 'function') {
    if (tryInteractWithSignpost(player.x, player.y)) {
      lastInteractionTime = currentTime;
      return true;
    }
  }
  
  // First, check for nearby sittable furniture
  let sittableTile = findNearbySittableTile();
  if (sittableTile) {
    if (attemptSit(sittableTile)) {
      lastInteractionTime = currentTime;
      return true;
    }
  }
  
  // Then check for interactive tiles (doors, switches, etc.)
  if (!nearbyInteractiveTile) return false;
  
  // Check if tile has activation ID for group activation
  if (nearbyInteractiveTile.activationId !== undefined && nearbyInteractiveTile.activationId !== null) {
    if (typeof activateTileGroup !== 'undefined') {
      console.log(`Activating tile group ${nearbyInteractiveTile.activationId}`);
      playActionAnimation(); // Play picking-up animation
      // Interact with source tile first, then activate the rest of the group (skipping source)
      if (typeof interactWithTile !== 'undefined') {
        interactWithTile(nearbyInteractiveTile);
      }
      activateTileGroup(nearbyInteractiveTile.activationId, nearbyInteractiveTile);
      lastInteractionTime = currentTime;
      return true;
    }
  }
  
  // Fall back to single tile interaction (linkId system)
  if (typeof interactWithTile !== 'undefined') {
    let success = interactWithTile(nearbyInteractiveTile);
    if (success) {
      playActionAnimation(); // Play picking-up animation
      lastInteractionTime = currentTime;
      console.log(`Player interacted with ${nearbyInteractiveTile.type} at (${nearbyInteractiveTile.x}, ${nearbyInteractiveTile.y})`);
    }
    return success;
  }
  
  return false;
}

// Find nearby sittable tiles (chairs, sofas) within interaction range
// Supports both 32px (1m) and 16px (0.5m) grid tiles
function findNearbySittableTile() {
  if (typeof getTileAt !== 'function') return null;
  
  let nearbyTiles = [];
  let step = (typeof getSnapStep === 'function') ? 0.5 : 1; // always search at half-meter resolution
  
  // Search in a 1m radius around player at 0.5m steps (covers both 32px and 16px tiles)
  for (let dx = -1; dx <= 1; dx += step) {
    for (let dy = -1; dy <= 1; dy += step) {
      if (dx === 0 && dy === 0) continue;
      
      // Check at half-meter positions
      let checkX = Math.floor((player.x + dx) / step) * step;
      let checkY = Math.floor((player.y + dy) / step) * step;
      // Fix floating point
      checkX = Math.round(checkX * 2) / 2;
      checkY = Math.round(checkY * 2) / 2;
      
      // Get all tiles at this position
      let tilesAtPos = getTileAt(checkX, checkY, true);
      if (!tilesAtPos) continue;
      
      // Check each layer for sittable tiles
      for (let layerIdx in tilesAtPos) {
        let tile = tilesAtPos[layerIdx];
        if (tile && isTileSittable(tile)) {
          let tileCenterOffset = (tile.gridScale && tile.gridScale <= 0.5) ? 0.25 : 0.5;
          let tileCenterX = tile.x + tileCenterOffset;
          let tileCenterY = tile.y + tileCenterOffset;
          let dist = Math.sqrt((player.x - tileCenterX) ** 2 + (player.y - tileCenterY) ** 2);
          nearbyTiles.push({
            tile: tile,
            distance: dist
          });
        }
      }
    }
  }
  
  // Also check integer grid positions for 32px tiles (ensures backward compat)
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      let checkX = Math.floor(player.x) + dx;
      let checkY = Math.floor(player.y) + dy;
      let tilesAtPos = getTileAt(checkX, checkY, true);
      if (!tilesAtPos) continue;
      for (let layerIdx in tilesAtPos) {
        let tile = tilesAtPos[layerIdx];
        if (tile && isTileSittable(tile)) {
          let dist = Math.sqrt((player.x - tile.x - 0.5) ** 2 + (player.y - tile.y - 0.5) ** 2);
          // Avoid duplicates
          if (!nearbyTiles.some(n => n.tile.x === tile.x && n.tile.y === tile.y && n.tile.type === tile.type)) {
            nearbyTiles.push({ tile: tile, distance: dist });
          }
        }
      }
    }
  }
  
  // Sort by distance and return closest
  nearbyTiles.sort((a, b) => a.distance - b.distance);
  return nearbyTiles.length > 0 ? nearbyTiles[0].tile : null;
}

// Draw player
function drawPlayer() {
  if (editMode) return;
  
  push();
  
  // Convert player meter coordinates to pixel coordinates for drawing
  let playerPixelX = player.x * GRID_SIZE;
  let playerPixelY = player.y * GRID_SIZE;
  let playerPixelSize = player.size * GRID_SIZE;
  
  // Update animation state
  updatePlayerAnimation();
  
  // Draw player sprite if available, otherwise fallback to circle
  let currentSprite = getCurrentPlayerSprite();
  if (player.useSprite && currentSprite) {
    imageMode(CENTER);
    image(currentSprite, playerPixelX, playerPixelY, playerPixelSize, playerPixelSize);
  } else {
    // Fallback: Draw player as blue circle with white border
    let playerColor = [player.color.r, player.color.g, player.color.b];
    
    fill(playerColor[0], playerColor[1], playerColor[2]);
    stroke(255, 255, 255);
    strokeWeight(3);
    ellipse(playerPixelX, playerPixelY, playerPixelSize, playerPixelSize);
    
    // Inner highlight for visibility
    fill(150, 200, 255, 150);
    noStroke();
    ellipse(playerPixelX, playerPixelY, playerPixelSize * 0.6, playerPixelSize * 0.6);
  }
  
  // Show terrain info
  if (player.currentTerrain) {
    let terrain = player.currentTerrain;
    let infoY = playerPixelY + playerPixelSize/2 + 15;
    
    // Terrain name and speed
    if (terrain.speedModifier !== 1.0) {
      stroke(0);
      strokeWeight(1);
      textAlign(CENTER, CENTER);
      textSize(10);
      
      let speedText = '';
      if (terrain.speedModifier > 1.0) {
        speedText = `${terrain.name} (Fast)`;
        fill(100, 255, 100, 200); // Green for fast
      } else if (terrain.speedModifier < 1.0) {
        speedText = `${terrain.name} (Slow)`;
        fill(255, 200, 100, 200); // Orange for slow
      }
      
      if (speedText) {
        text(speedText, playerPixelX, infoY);
      }
    }
  }
  
  // Show interaction prompt if near interactive tile
  if (nearbyInteractiveTile && typeof INTERACTIVE_TYPES !== 'undefined') {
    let interactiveType = INTERACTIVE_TYPES[nearbyInteractiveTile.type];
    if (interactiveType && interactiveType.interactionMessage) {
      stroke(0);
      strokeWeight(2);
      textAlign(CENTER, CENTER);
      textSize(12);
      fill(255, 255, 100, 220); // Yellow interaction text
        // interactionMessage now uses centralized CONTROLS - no replacement needed
        text(interactiveType.interactionMessage, playerPixelX, playerPixelY - playerPixelSize/2 - 25);
    }
  }
  
  // Debug information below player
  drawPlayerDebugInfo();
  
  pop();
}

// Update player effects and timers
function updatePlayerEffects() {
  // Update speed boost timer
  if (player.speedBoostTimer > 0) {
    player.speedBoostTimer -= 1/60;
    if (player.speedBoostTimer <= 0) {
      player.speedBoost = 1.0;
      console.log('Speed boost expired');
    }
  }
  
}

// Draw spawn point indicator (meter coordinates)
function drawPlayerSpawnPoint() {
  if (editMode && player.spawnX !== undefined && player.spawnY !== undefined) {
    push();
    
    // Convert spawn position to pixel coordinates for drawing
    let spawnPixelX = player.spawnX * GRID_SIZE;
    let spawnPixelY = player.spawnY * GRID_SIZE;
    
    // Draw pulsing spawn indicator
    let pulseSize = 8 + sin(frameCount * 0.1) * 3;
    
    // Spawn point marker (bright green)
    fill(0, 255, 0, 150);
    noStroke();
    ellipse(spawnPixelX, spawnPixelY, pulseSize * 2);
    
    // Inner bright core
    fill(255, 255, 255, 200);
    ellipse(spawnPixelX, spawnPixelY, pulseSize);
    
    // Cross marker
    stroke(255);
    strokeWeight(2);
    line(spawnPixelX - 6, spawnPixelY, spawnPixelX + 6, spawnPixelY);
    line(spawnPixelX, spawnPixelY - 6, spawnPixelX, spawnPixelY + 6);
    
    pop();
  }
}

// Update debug information (meter coordinates)
function updatePlayerDebugInfo(terrainModifier) {
  player.debugInfo.gridX = Math.floor(player.x);  // Grid position in meters
  player.debugInfo.gridY = Math.floor(player.y);  // Grid position in meters
  player.debugInfo.velocityMagnitude = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
  player.debugInfo.effectiveSpeed = player.maxSpeed * player.speedBoost * terrainModifier;
  player.debugInfo.isMoving = player.debugInfo.velocityMagnitude > 0.01;  // Adjusted threshold for meter coordinates
}

// Draw debug information below player (meter coordinates)
function drawPlayerDebugInfo() {
  // Only draw when debug overlay is visible
  if (!window.debugVisible) return;

  // Convert player position to pixel coordinates for text placement
  let playerPixelX = player.x * GRID_SIZE;
  let playerPixelY = player.y * GRID_SIZE;
  let playerPixelSize = player.size * GRID_SIZE;
  
  let startY = playerPixelY + playerPixelSize/2 + 30;
  let lineHeight = 12;
  let currentLine = 0;
  
  push();
  textAlign(CENTER, CENTER);
  textSize(9);
  stroke(0);
  strokeWeight(1);
  
  // Position info (show both meter and pixel coordinates)
  fill(255, 255, 255, 220);
  text(`Meter: (${player.x.toFixed(2)}m, ${player.y.toFixed(2)}m)`, playerPixelX, startY + currentLine * lineHeight);
  currentLine++;
  
  // Grid position
  fill(200, 200, 255, 220);
  text(`Grid: (${player.debugInfo.gridX}m, ${player.debugInfo.gridY}m)`, playerPixelX, startY + currentLine * lineHeight);
  currentLine++;
  
  // Velocity info (in meters per frame)
  let velColor = player.debugInfo.isMoving ? [100, 255, 100, 220] : [150, 150, 150, 220];
  fill(velColor[0], velColor[1], velColor[2], velColor[3]);
  text(`Speed: ${player.debugInfo.velocityMagnitude.toFixed(3)}m/${player.debugInfo.effectiveSpeed.toFixed(3)}m`, playerPixelX, startY + currentLine * lineHeight);
  currentLine++;
  
  // Speed boost status
  if (player.speedBoost !== 1.0) {
    fill(100, 255, 255, 220);
    text(`Speed Boost: ${player.speedBoost.toFixed(1)}x`, playerPixelX, startY + currentLine * lineHeight);
    currentLine++;
  }
  
  // Collision info (show for 1 second after collision)
  if (player.lastCollision.time > 0 && millis() - player.lastCollision.time < 1000) {
    let collisionText = 'Collision: ';
    if (player.lastCollision.x && player.lastCollision.y) {
      collisionText += 'X+Y';
    } else if (player.lastCollision.x) {
      collisionText += 'X';
    } else if (player.lastCollision.y) {
      collisionText += 'Y';
    }
    
    fill(255, 150, 150, 220);
    text(collisionText, playerPixelX, startY + currentLine * lineHeight);
    currentLine++;
  }
  
  // Current terrain details
  if (player.currentTerrain) {
    let terrain = player.currentTerrain;
    fill(255, 255, 200, 220);
    text(`Terrain: ${terrain.name}`, playerPixelX, startY + currentLine * lineHeight);
    currentLine++;
    
    if (terrain.speedModifier !== 1.0) {
      fill(200, 255, 200, 220);
      text(`Speed Mod: ${terrain.speedModifier.toFixed(1)}x`, playerPixelX, startY + currentLine * lineHeight);
      currentLine++;
    }
  }
  
  // Movement state
  let moveState = '';
  if (keyStates.up) moveState += '↑';
  if (keyStates.down) moveState += '↓';
  if (keyStates.left) moveState += '←';
  if (keyStates.right) moveState += '→';
  
  if (moveState) {
    fill(100, 200, 255, 220);
    text(`Input: ${moveState}`, playerPixelX, startY + currentLine * lineHeight);
  }
  
  pop();
}

// ── Walk-Over Sound ─────────────────────────────────────────────────────
// Plays the tile definition's soundWalkOver when the player crosses a tile boundary.
// Throttled so it doesn't fire every frame.

let _lastWalkOverTile = null;   // "gridX,gridY"
let _lastWalkOverTime = 0;
const _WALK_OVER_COOLDOWN = 180; // ms between walk-over sounds

function _checkWalkOverSound(px, py) {
  if (typeof playSound !== 'function') return;

  const gx = Math.floor(px);
  const gy = Math.floor(py);
  const key = gx + ',' + gy;

  // Only when player moves to a new tile
  if (key === _lastWalkOverTile) return;
  _lastWalkOverTile = key;

  // Cooldown to prevent rapid-fire
  const now = Date.now();
  if (now - _lastWalkOverTime < _WALK_OVER_COOLDOWN) return;

  // Must be actually moving
  const speed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
  if (speed < 0.01) return;

  // Look up the tile definition
  let tileType = null;
  if (typeof tileSystem !== 'undefined' && typeof tileSystem.getTile === 'function') {
    const tileData = tileSystem.getTile(gx, gy);
    tileType = tileData ? tileData.type : null;
  } else if (typeof getTileAt === 'function') {
    tileType = getTileAt(gx, gy);
  }
  if (!tileType) return;

  let soundId = null;
  if (typeof getTileDefinition === 'function') {
    const def = getTileDefinition(tileType);
    if (def && def.soundWalkOver) {
      soundId = def.soundWalkOver;
    }
  }

  if (soundId) {
    _lastWalkOverTime = now;
    playSound(soundId);
  }
}
