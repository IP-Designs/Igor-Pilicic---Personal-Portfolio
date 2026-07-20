// Unified Camera System for 2D Game Engine
// Handles both editor and gameplay camera modes with smooth transitions
// Includes editor-specific controls with mouse panning and zooming

// ===== MAIN CAMERA OBJECT =====
let camera = {
  // Position
  x: 0,
  y: 0,
  targetX: 0,
  targetY: 0,
  
  // Zoom
  zoom: 1.0,
  targetZoom: 1.0,
  editorZoom: 0.8,    // Zoom level for editor mode
  gameplayZoom: 3.0,  // Zoom level for gameplay mode - 3x zoom for close-up
  
  // Following system (gameplay mode)
  followPlayer: true,
  followSpeed: 0.08,   // How fast camera follows
  deadzone: 16,        // Pixel radius where camera doesn't move
  
  // World boundaries
  worldWidth: 0,
  worldHeight: 0,
  minX: 0,
  maxX: 0,
  minY: 0,
  maxY: 0,
  
  // Mode tracking
  lastMode: null  // Track last edit mode state to detect transitions
};

// Camera shake state
camera.shakeTimer = 0;
camera.shakeAmount = 0; // meters
camera.shakeStart = 0;

// ===== CAMERA EDITOR STATE =====
let cameraEditor = {
  enabled: true,
  isPanning: false,
  panStartPos: { x: 0, y: 0 },
  cameraStartPos: { x: 0, y: 0 },
  
  // Middle mouse button panning
  isMiddleMousePanning: false,
  
  // Zoom settings
  zoomSpeed: 0.1,
  minZoom: 0.2,
  maxZoom: 4.0,
  zoomSmoothing: 0.15,
  
  // Pan settings
  panSensitivity: 1.0,
  smoothPanning: true,
  
  // State tracking
  lastMouseX: 0,
  lastMouseY: 0,
  wheelDelta: 0,
  
  // Key state tracking
  keys: {
    ctrlPressed: false,
    plusPressed: false,
    minusPressed: false
  }
};

// ===== INITIALIZATION =====
function initCamera() {
  // Set world boundaries in meters (unified coordinate system)
  camera.worldWidth = WORLD_WIDTH;
  camera.worldHeight = WORLD_HEIGHT;
  
  // Calculate optimal editor zoom to fit the world on screen
  let paddingFactor = 0.9;
  let zoomX = (width * paddingFactor) / (camera.worldWidth * GRID_SIZE);
  let zoomY = (height * paddingFactor) / (camera.worldHeight * GRID_SIZE);
  camera.editorZoom = Math.min(zoomX, zoomY);
  
  // Ensure editor zoom is within reasonable bounds
  camera.editorZoom = Math.max(0.3, Math.min(camera.editorZoom, 1.5));
  
  // Start camera at world center
  camera.x = camera.worldWidth / 2;
  camera.y = camera.worldHeight / 2;
  camera.targetX = camera.x;
  camera.targetY = camera.y;
  
  // Set initial zoom for editor mode
  camera.zoom = camera.editorZoom;
  camera.targetZoom = camera.editorZoom;
  
  // Calculate camera bounds
  updateCameraBounds();
  
  console.log(`=== CAMERA INITIALIZATION ===`);
  console.log(`World size: ${camera.worldWidth}m x ${camera.worldHeight}m (${camera.worldWidth * GRID_SIZE}x${camera.worldHeight * GRID_SIZE} pixels)`);
  console.log(`Unified coordinate system: 1 meter = ${GRID_SIZE} pixels`);
  console.log(`Screen size: ${width}x${height} pixels`);
  console.log(`Editor zoom: ${camera.editorZoom.toFixed(3)}x`);
  console.log(`Camera position: (${camera.x}m, ${camera.y}m)`);
  console.log(`Camera bounds: X(${camera.minX.toFixed(1)}m-${camera.maxX.toFixed(1)}m) Y(${camera.minY.toFixed(1)}m-${camera.maxY.toFixed(1)}m)`);
  console.log(`===========================`);
}

function initCameraEditor() {
  console.log("Camera editor initialized");
  if (typeof camera !== 'undefined') {
    camera.followPlayer = false;
  }
}

// ===== CORE CAMERA UPDATE =====
function updateCamera() {
  // Detect mode transitions
  if (camera.lastMode !== editMode) {
    onCameraModeChange(editMode);
    camera.lastMode = editMode;
  }
  
  // Update camera bounds when zoom changes
  if (Math.abs(camera.zoom - camera.targetZoom) > 0.01) {
    updateCameraBounds();
  }
  
  // Handle camera movement based on mode
  if (editMode) {
    updateEditorCamera();
  } else {
    updateGameplayCamera();
  }
  
  // Smoothly interpolate camera toward target
  camera.x += (camera.targetX - camera.x) * 0.1;
  camera.y += (camera.targetY - camera.y) * 0.1;
  
  // Constrain camera to world bounds (but not when actively panning with middle mouse)
  if (!cameraEditor.isMiddleMousePanning) {
    camera.x = Math.max(camera.minX, Math.min(camera.maxX, camera.x));
    camera.y = Math.max(camera.minY, Math.min(camera.maxY, camera.y));
  }
  
  // Update zoom smoothly
  camera.zoom += (camera.targetZoom - camera.zoom) * 0.1;
}

function updateCameraEditor() {
  if (!cameraEditor.enabled || !editMode) {
    if (typeof camera !== 'undefined' && !editMode) {
      camera.followPlayer = true;
    }
    return;
  }
  
  // Disable player following in edit mode
  if (typeof camera !== 'undefined') {
    camera.followPlayer = false;
  }
  
  // Handle panning
  if (cameraEditor.isPanning) {
    updateCameraPanning();
  }
  
  // Handle zoom keys
  handleZoomKeys();
  
  // Handle zoom smoothing
  updateCameraZoom();
}

// ===== CAMERA MODE TRANSITIONS =====
function onCameraModeChange(enteringEditMode) {
  if (enteringEditMode) {
    // Switching to editor mode
    camera.targetZoom = camera.editorZoom;
    camera.followPlayer = false;
    camera.targetX = camera.worldWidth / 2;
    camera.targetY = camera.worldHeight / 2;
    console.log('Camera: Switched to editor mode');
  } else {
    // Switching to gameplay mode
    camera.targetZoom = camera.gameplayZoom;
    camera.followPlayer = true;
    if (typeof player !== 'undefined') {
      camera.targetX = player.x;
      camera.targetY = player.y;
    }
    console.log('Camera: Switched to gameplay mode');
  }
}

// ===== EDITOR MODE CAMERA CONTROLS =====
function updateEditorCamera() {
  // Editor camera movements handled by updateCameraEditor()
}

function updateCameraBounds() {
  let halfScreenWidth = (width / camera.zoom) / (2 * GRID_SIZE);
  let halfScreenHeight = (height / camera.zoom) / (2 * GRID_SIZE);
  
  camera.minX = halfScreenWidth;
  camera.maxX = camera.worldWidth - halfScreenWidth;
  camera.minY = halfScreenHeight;
  camera.maxY = camera.worldHeight - halfScreenHeight;
  
  // In edit mode, allow free panning even if world fits on screen
  if (editMode) {
    // If screen is wider/taller than world, allow some padding for panning
    if (camera.minX > camera.maxX) {
      let center = camera.worldWidth / 2;
      let padding = halfScreenWidth * 0.5; // Allow panning half a screen beyond
      camera.minX = center - padding;
      camera.maxX = center + padding;
    }
    if (camera.minY > camera.maxY) {
      let center = camera.worldHeight / 2;
      let padding = halfScreenHeight * 0.5;
      camera.minY = center - padding;
      camera.maxY = center + padding;
    }
  } else {
    // Game mode: lock to center if world fits on screen
    if (camera.minX > camera.maxX) {
      camera.minX = camera.maxX = camera.worldWidth / 2;
    }
    if (camera.minY > camera.maxY) {
      camera.minY = camera.maxY = camera.worldHeight / 2;
    }
  }
}

function startCameraPanning(mouseX, mouseY) {
  if (!cameraEditor.enabled || !editMode) return false;
  
  cameraEditor.isPanning = true;
  cameraEditor.panStartPos.x = mouseX;
  cameraEditor.panStartPos.y = mouseY;
  cameraEditor.cameraStartPos.x = camera.x;
  cameraEditor.cameraStartPos.y = camera.y;
  
  return true;
}

function updateCameraPanning() {
  if (!cameraEditor.isPanning) return;
  
  // Calculate delta (inverted for natural "drag the view" feel)
  // When you drag down, the view moves up (like dragging a piece of paper)
  let deltaX = (cameraEditor.panStartPos.x - mouseX) * cameraEditor.panSensitivity;
  let deltaY = (cameraEditor.panStartPos.y - mouseY) * cameraEditor.panSensitivity;
  
  // Adjust for zoom level - pan slower when zoomed in, faster when zoomed out
  let zoomAdjustment = 1.0 / camera.zoom;
  deltaX *= zoomAdjustment;
  deltaY *= zoomAdjustment;
  
  // Convert from pixels to meters
  deltaX /= GRID_SIZE;
  deltaY /= GRID_SIZE;
  
  if (cameraEditor.smoothPanning) {
    camera.targetX = cameraEditor.cameraStartPos.x + deltaX;
    camera.targetY = cameraEditor.cameraStartPos.y + deltaY;
    camera.x = lerp(camera.x, camera.targetX, 0.1);
    camera.y = lerp(camera.y, camera.targetY, 0.1);
  } else {
    camera.x = cameraEditor.cameraStartPos.x + deltaX;
    camera.y = cameraEditor.cameraStartPos.y + deltaY;
    camera.targetX = camera.x;
    camera.targetY = camera.y;
  }
}

function stopCameraPanning() {
  if (cameraEditor.isPanning || cameraEditor.isMiddleMousePanning) {
    // Update bounds before clamping
    updateCameraBounds();
    
    // Clamp current position and target to bounds so camera doesn't snap back
    camera.x = Math.max(camera.minX, Math.min(camera.maxX, camera.x));
    camera.y = Math.max(camera.minY, Math.min(camera.maxY, camera.y));
    camera.targetX = camera.x;
    camera.targetY = camera.y;
    
    cameraEditor.isPanning = false;
    cameraEditor.isMiddleMousePanning = false;
  }
}

function handleCameraZoom(delta) {
  if (!cameraEditor.enabled || !editMode) return false;
  
  let zoomFactor = 1.0 + (delta * cameraEditor.zoomSpeed);
  let newZoom = camera.zoom * zoomFactor;
  newZoom = constrain(newZoom, cameraEditor.minZoom, cameraEditor.maxZoom);
  
  camera.zoom = newZoom;
  camera.targetZoom = newZoom;
  
  return true;
}

function updateCameraZoom() {
  if (typeof camera === 'undefined') return;
  camera.zoom = lerp(camera.zoom, camera.targetZoom, cameraEditor.zoomSmoothing);
}

function handleZoomKeys() {
  if (!cameraEditor.enabled || !editMode) return;
  
  if (cameraEditor.keys.plusPressed) {
    handleCameraZoom(1);
    cameraEditor.keys.plusPressed = false;
  }
  
  if (cameraEditor.keys.minusPressed) {
    handleCameraZoom(-1);
    cameraEditor.keys.minusPressed = false;
  }
}

// ===== GAMEPLAY MODE CAMERA CONTROLS =====
function updateGameplayCamera() {
  if (!camera.followPlayer || typeof player === 'undefined') return;
  
  let playerX = player.x;
  let playerY = player.y;
  let cameraScreenX = camera.x;
  let cameraScreenY = camera.y;
  
  let distanceFromCenter = Math.sqrt(
    Math.pow(playerX - cameraScreenX, 2) + 
    Math.pow(playerY - cameraScreenY, 2)
  );
  
  let deadzoneMeters = camera.deadzone / GRID_SIZE;
  
  if (distanceFromCenter > deadzoneMeters) {
    camera.targetX = playerX;
    camera.targetY = playerY;
  }
}

function toggleCameraFollow() {
  camera.followPlayer = !camera.followPlayer;
  console.log(`Camera follow: ${camera.followPlayer ? 'ON' : 'OFF'}`);
}

// ===== CAMERA POSITIONING =====
function centerCameraOnPlayer() {
  if (typeof player !== 'undefined') {
    camera.x = player.x;
    camera.y = player.y;
    camera.targetX = player.x;
    camera.targetY = player.y;
    console.log(`Camera centered on player at (${player.x.toFixed(1)}m, ${player.y.toFixed(1)}m)`);
  }
}

function centerCameraOn(worldX, worldY) {
  camera.x = worldX;
  camera.y = worldY;
  camera.targetX = worldX;
  camera.targetY = worldY;
  console.log(`Camera centered on (${worldX.toFixed(1)}m, ${worldY.toFixed(1)}m)`);
}

function resetCameraToCenter() {
  camera.x = camera.worldWidth / 2;
  camera.y = camera.worldHeight / 2;
  camera.targetX = camera.x;
  camera.targetY = camera.y;
  console.log(`Camera reset to center: (${camera.x.toFixed(1)}m, ${camera.y.toFixed(1)}m)`);
}

function focusCameraOnGrid(gridX, gridY, zoom = null) {
  if (typeof camera === 'undefined') return;
  
  camera.targetX = gridX;
  camera.targetY = gridY;
  
  if (zoom !== null) {
    camera.targetZoom = constrain(zoom, cameraEditor.minZoom, cameraEditor.maxZoom);
  }
}

// ===== COORDINATE CONVERSIONS =====
function worldToScreen(worldX, worldY) {
  return {
    x: (worldX * GRID_SIZE - camera.x * GRID_SIZE) * camera.zoom + width / 2,
    y: (worldY * GRID_SIZE - camera.y * GRID_SIZE) * camera.zoom + height / 2
  };
}

function screenToWorld(screenX, screenY) {
  return {
    x: ((screenX - width / 2) / camera.zoom + camera.x * GRID_SIZE) / GRID_SIZE,
    y: ((screenY - height / 2) / camera.zoom + camera.y * GRID_SIZE) / GRID_SIZE
  };
}

// ===== CAMERA TRANSFORM =====
function applyCameraTransform() {
  // Apply optional camera shake offset (in pixels)
  let shakeOffsetX = 0;
  let shakeOffsetY = 0;
  if (camera.shakeTimer && camera.shakeTimer > 0) {
    // Simple diminishing shake based on remaining time
    let elapsed = millis() - camera.shakeStart;
    let remaining = Math.max(0, camera.shakeTimer - elapsed);
    let t = remaining / camera.shakeTimer;
    let strength = camera.shakeAmount * t; // meters
    // Convert meters to pixels, apply zoom later by multiplying with zoom
    let px = strength * GRID_SIZE;
    shakeOffsetX = (Math.random() * 2 - 1) * px * camera.zoom;
    shakeOffsetY = (Math.random() * 2 - 1) * px * camera.zoom;
    if (remaining <= 0) {
      camera.shakeTimer = 0;
      camera.shakeAmount = 0;
    }
  }

  translate(width / 2 + shakeOffsetX, height / 2 + shakeOffsetY);
  scale(camera.zoom);
  translate(-camera.x * GRID_SIZE, -camera.y * GRID_SIZE);
}

// Trigger a camera shake: amount in meters, duration in ms
camera.shake = function(amountMeters = 0.5, durationMs = 300) {
  camera.shakeAmount = amountMeters;
  camera.shakeTimer = durationMs;
  camera.shakeStart = millis();
  console.log(`Camera shake: ${amountMeters}m for ${durationMs}ms`);
};

// ===== DEBUG VISUALIZATION =====
function drawCameraDebug() {
  if (!editMode) return;
  
  fill(255, 255, 255, 200);
  textAlign(LEFT);
  textSize(12);
  
  let debugY = height - 120;
  text(`Camera: (${camera.x.toFixed(1)}m, ${camera.y.toFixed(1)}m)`, 10, debugY);
  text(`Target: (${camera.targetX.toFixed(1)}m, ${camera.targetY.toFixed(1)}m)`, 10, debugY + 15);
  text(`Zoom: ${camera.zoom.toFixed(2)}x (Target: ${camera.targetZoom.toFixed(2)}x)`, 10, debugY + 30);
  text(`Mode: ${editMode ? 'Editor' : 'Gameplay'} | Follow: ${camera.followPlayer ? 'ON' : 'OFF'}`, 10, debugY + 45);
  text(`Bounds: X(${camera.minX.toFixed(1)}m-${camera.maxX.toFixed(1)}m) Y(${camera.minY.toFixed(1)}m-${camera.maxY.toFixed(1)}m)`, 10, debugY + 60);
}

function drawCameraEditorHUD() {
  if (!cameraEditor.enabled || !editMode) return;
  
  let status = getCameraEditorStatus();
  
  push();
  fill(255, 255, 255, 200);
  textAlign(RIGHT, TOP);
  textSize(12);
  
  let hudX = width - 20;
  let hudY = 60;
  
  text(`Zoom: ${status.zoom.toFixed(2)}x`, hudX, hudY);
  text(`Grid: (${status.gridPosition.x}, ${status.gridPosition.y})`, hudX, hudY + 15);
  
  if (status.isPanning) {
    fill(255, 255, 0);
    text("PANNING", hudX, hudY + 30);
  }
  
  fill(255, 255, 255, 150);
  textSize(10);
  text("CTRL+Right Click: Pan", hudX, hudY + 50);
  text("+/- Keys: Zoom", hudX, hudY + 62);
  text("Space: Reset Camera", hudX, hudY + 74);
  
  pop();
}

// ===== UTILITY FUNCTIONS =====
function getCameraEditorStatus() {
  if (typeof camera === 'undefined') return { zoom: 1, targetZoom: 1, position: {}, gridPosition: {}, isPanning: false };
  
  let gridX = Math.floor(camera.x);
  let gridY = Math.floor(camera.y);
  
  return {
    zoom: camera.zoom,
    targetZoom: camera.targetZoom,
    position: { x: Math.round(camera.x * GRID_SIZE), y: Math.round(camera.y * GRID_SIZE) },
    gridPosition: { x: gridX, y: gridY },
    isPanning: cameraEditor.isPanning,
    followingPlayer: camera.followPlayer
  };
}

function toggleCameraEditorFeature(feature, value = null) {
  switch (feature) {
    case 'smoothPanning':
      cameraEditor.smoothPanning = value !== null ? value : !cameraEditor.smoothPanning;
      console.log(`Camera smooth panning: ${cameraEditor.smoothPanning ? 'ON' : 'OFF'}`);
      break;
    case 'enabled':
      cameraEditor.enabled = value !== null ? value : !cameraEditor.enabled;
      console.log(`Camera editor: ${cameraEditor.enabled ? 'ON' : 'OFF'}`);
      break;
  }
}

function setCameraEditorSensitivity(panSensitivity = null, zoomSpeed = null) {
  if (panSensitivity !== null) {
    cameraEditor.panSensitivity = constrain(panSensitivity, 0.1, 3.0);
    console.log(`Camera pan sensitivity: ${cameraEditor.panSensitivity}`);
  }
  
  if (zoomSpeed !== null) {
    cameraEditor.zoomSpeed = constrain(zoomSpeed, 0.01, 0.5);
    console.log(`Camera zoom speed: ${cameraEditor.zoomSpeed}`);
  }
}

// ===== INPUT HANDLERS =====
function handleCameraEditorMousePressed(mouseButton) {
  if (!cameraEditor.enabled) return false;
  if (mouseButton === RIGHT && cameraEditor.keys.ctrlPressed) {
    return startCameraPanning(mouseX, mouseY);
  }
  return false;
}

function handleCameraEditorMouseReleased() {
  stopCameraPanning();
}

function handleCameraEditorKeyPressed(key, keyCode) {
  if (!cameraEditor.enabled) return false;
  
  if (keyCode === CONTROL) {
    cameraEditor.keys.ctrlPressed = true;
    return true;
  }
  
  if (key === '+' || key === '=') {
    cameraEditor.keys.plusPressed = true;
    return true;
  }
  
  if (key === '-' || key === '_') {
    cameraEditor.keys.minusPressed = true;
    return true;
  }
  
  return false;
}

function handleCameraEditorKeyReleased(key, keyCode) {
  if (!cameraEditor.enabled) return false;
  
  if (keyCode === CONTROL) {
    cameraEditor.keys.ctrlPressed = false;
    return true;
  }
  
  return false;
}

// Get visible viewport in meter coordinates for culling
// Returns { minX, maxX, minY, maxY } with 1 tile buffer for safety
function getVisibleViewport() {
  if (typeof camera === 'undefined') {
    return { minX: 0, maxX: WORLD_WIDTH, minY: 0, maxY: WORLD_HEIGHT };
  }
  
  // Calculate half screen size in meters
  let halfScreenWidth = (width / camera.zoom) / (2 * GRID_SIZE);
  let halfScreenHeight = (height / camera.zoom) / (2 * GRID_SIZE);
  
  // Add 1 tile buffer around edges for safety
  let buffer = 1;
  
  return {
    minX: Math.floor(camera.x - halfScreenWidth) - buffer,
    maxX: Math.ceil(camera.x + halfScreenWidth) + buffer,
    minY: Math.floor(camera.y - halfScreenHeight) - buffer,
    maxY: Math.ceil(camera.y + halfScreenHeight) + buffer
  };
}

// Check if a tile position is within the visible viewport
function isTileVisible(meterX, meterY) {
  let vp = getVisibleViewport();
  return meterX >= vp.minX && meterX <= vp.maxX && 
         meterY >= vp.minY && meterY <= vp.maxY;
}
