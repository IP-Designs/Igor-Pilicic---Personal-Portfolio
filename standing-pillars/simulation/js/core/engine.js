// Main game engine with 32x32 grid system
// Integrated with modular tile system

// Global UI Font settings (for consistency across all UI elements)
const UI_FONT_FAMILY = 'Arial, sans-serif';
const UI_FONT_SIZE_LARGE = 16;   // Headers/titles
const UI_FONT_SIZE_NORMAL = 14;  // Main content
const UI_FONT_SIZE_SMALL = 12;   // Secondary content

// Game state
let gameState = 'running';
window.editMode = true;  // Start in edit mode to see the grid
let initialized = false;

// World settings - unified coordinate system
const GRID_SIZE = 32;  // Pixels per meter (scale factor) - NEVER CHANGES
let SNAP_GRID = 32;    // Editor snap grid in pixels: 32 (1m) or 16 (0.5m)
let WORLD_WIDTH = 100.0;   // World width in meters (max 100, adjustable per map)
let WORLD_HEIGHT = 100.0;  // World height in meters (max 100, adjustable per map)
const MAX_WORLD_SIZE = 100;  // Maximum allowed world dimension

// Snap grid helpers
function getSnapStep() { return SNAP_GRID / GRID_SIZE; } // 1.0 or 0.5
function snapToGrid(meterVal) {
  let step = getSnapStep();
  let snapped = Math.floor(meterVal / step) * step;
  // Fix floating point: round to nearest 0.5
  return Math.round(snapped * 2) / 2;
}
function toggleSnapGrid() {
  SNAP_GRID = SNAP_GRID === 32 ? 16 : 32;
  console.log(`Snap grid: ${SNAP_GRID}px (${getSnapStep()}m step)`);
}

// Resize world dimensions (called when creating new map or loading)
function resizeWorld(newWidth, newHeight) {
  // Clamp to valid range
  newWidth = Math.max(5, Math.min(MAX_WORLD_SIZE, Math.floor(newWidth)));
  newHeight = Math.max(5, Math.min(MAX_WORLD_SIZE, Math.floor(newHeight)));
  
  WORLD_WIDTH = newWidth;
  WORLD_HEIGHT = newHeight;
  
  // Reinitialize lighting buffer for new size
  if (typeof initLighting === 'function') {
    initLighting();
  }
  
  // Re-center camera on the new world and recalculate zoom/bounds
  if (typeof camera !== 'undefined') {
    camera.worldWidth = WORLD_WIDTH;
    camera.worldHeight = WORLD_HEIGHT;
    
    // Recalculate optimal editor zoom to fit the new world on screen
    let paddingFactor = 0.9;
    let zoomX = (width * paddingFactor) / (WORLD_WIDTH * GRID_SIZE);
    let zoomY = (height * paddingFactor) / (WORLD_HEIGHT * GRID_SIZE);
    camera.editorZoom = Math.min(zoomX, zoomY);
    camera.editorZoom = Math.max(0.3, Math.min(camera.editorZoom, 1.5));
    
    // Center camera on new world
    camera.x = WORLD_WIDTH / 2;
    camera.y = WORLD_HEIGHT / 2;
    camera.targetX = camera.x;
    camera.targetY = camera.y;
    
    // Apply editor zoom if in edit mode
    if (typeof editMode !== 'undefined' && editMode) {
      camera.zoom = camera.editorZoom;
      camera.targetZoom = camera.editorZoom;
    }
    
    if (typeof updateCameraBounds === 'function') {
      updateCameraBounds();
    }
  }
  
  console.log(`World resized to ${WORLD_WIDTH}x${WORLD_HEIGHT} meters`);
  return { width: WORLD_WIDTH, height: WORLD_HEIGHT };
}

// Visual settings
let showGrid = true;     // Toggle with G key
let brushRadius = 0;     // Circular brush radius: 0=1x1, 1=3x3, 2=5x5 (diameter = 2*radius+1)

// Debug overlay visibility (toggled with F3 or toolbar button)
window.debugVisible = true;

// Editor UI state
let editorUI = {
  selectedCategory: 'TERRAIN',
  selectedTile: 'grass',
  showTilePanel: false,
  panelWidth: 200,
  // Overlay visibility toggles (editor only)
  showLights: true,
  showParticles: true,
  showEvents: true,
  showLogic: true,
  showRoofs: true,
  showSpawns: true,
  showSounds: true
};

// Tile transformation state
let tileTransform = {
  // flipState: 0 = none, 1 = flipX, 2 = flipBoth, 3 = flipY
  flipState: 0,
  flipped: false,
  rotation: 0 // 0, 90, 180, 270 degrees
};

// Advanced placement state
let placementState = {
  isDragging: false,
  isRectangleMode: false,
  startPos: { x: -1, y: -1 },
  currentPos: { x: -1, y: -1 },
  lastPlacedPos: { x: -1, y: -1 },
  draggedTiles: new Set() // Track tiles placed during current drag
};

// Delete mode state
let deleteMode = {
  isActive: false,
  selectedTiles: new Set() // Track tiles selected for deletion
};

// Double-click tracking
let doubleClickTracker = {
  lastClickPos: { x: -1, y: -1 },
  lastClickTime: 0,
  doubleClickThreshold: 300 // milliseconds
};

// Save/Load modal state
window.saveModal = {
  isOpen: false,
  mode: 'save', // 'save', 'load', 'delete'
  currentMapName: '',
  availableMaps: [],
  selectedMap: '',
  errorMessage: '',
  successMessage: '',
  freezesGame: true // Any modal open freezes tile placement
};

// Door state management system
const DOOR_STATES = {
  CLOSED: 'closed',  // Door blocks movement and light
  OPEN: 'open'       // Door allows movement and light
};

// Door registry: maps tile position to its state
const doorRegistry = {};

function getDoorStateKey(x, y) {
  return `${x},${y}`;
}

function setDoorState(x, y, state) {
  const key = getDoorStateKey(x, y);
  doorRegistry[key] = state;
  console.log(`Door at (${x}, ${y}) state set to: ${state}`);
}

function getDoorState(x, y) {
  const key = getDoorStateKey(x, y);
  return doorRegistry[key] || DOOR_STATES.CLOSED; // Default to closed
}

function isDoorOpen(x, y) {
  return getDoorState(x, y) === DOOR_STATES.OPEN;
}

function isDoorClosed(x, y) {
  return getDoorState(x, y) === DOOR_STATES.CLOSED;
}

function toggleDoorState(x, y) {
  const currentState = getDoorState(x, y);
  const newState = currentState === DOOR_STATES.CLOSED ? DOOR_STATES.OPEN : DOOR_STATES.CLOSED;
  setDoorState(x, y, newState);
  return newState;
}

function deleteDoorState(x, y) {
  const key = getDoorStateKey(x, y);
  delete doorRegistry[key];
}

// Selection tool state
let selectionTool = {
  isActive: false,
  mode: 'tile', // 'tile', 'select', 'move'
  hasSelection: false,
  startPos: { x: -1, y: -1 },
  endPos: { x: -1, y: -1 },
  selectedTiles: {}, // Copy of selected tiles
  isDragging: false,
  isMoving: false,
  moveOffset: { x: 0, y: 0 },
  moveStartPos: { x: -1, y: -1 }
};

// Note: Camera system moved to camera.js for modularity

// P5.js setup function

async function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // Set standard font globally
  textFont(UI_FONT_FAMILY);
  
  // Pixel-perfect rendering settings to eliminate gaps between tiles
  noSmooth(); // Disable anti-aliasing for crisp pixel art
  pixelDensity(1); // Ensure consistent pixel density
  
  console.log("Engine initialized - Unified coordinate system ready");
  console.log(`World: ${WORLD_WIDTH}m x ${WORLD_HEIGHT}m (${WORLD_WIDTH * GRID_SIZE} x ${WORLD_HEIGHT * GRID_SIZE} pixels)`);
  console.log(`1 meter = ${GRID_SIZE} pixels | Snap grid: ${SNAP_GRID}px | Player moves smoothly`);
  console.log(`Edit mode starts as: ${editMode}`);
  console.log(`Show grid starts as: ${showGrid}`);
  console.log("Controls: G=grid, E=edit mode, T=tile panel, C=clear, R=rectangle mode");
  console.log("Save/Load: S=save, L=load, DEL=delete maps");
  console.log("Tile Transform: F=cycle flip (NONE→FLIP_X→FLIP_BOTH→FLIP_Y), R=rotate current tile");
  console.log("Selection: Q=select tool, M=move tool, X=cut, V=paste");
  console.log("Lighting: O=toggle lighting, Click lights to edit radius/intensity");
  console.log("Mouse: Click=place, Drag=line, Shift+Drag=rectangle, Right-click=remove");
  
  // Initialize tile system
  await loadTileDefinitions();

  // Load NPC / enemy definitions and register with entity system
  if (typeof loadNPCDefinitions === 'function') {
    await loadNPCDefinitions();
  }
  // Initialize NPC panel UI
  if (typeof initNPCPanel === 'function') {
    initNPCPanel();
  }
  
  // Test unified coordinate system
  if (typeof testUnifiedCoordinateSystem === 'function') {
    testUnifiedCoordinateSystem();
  }
  
  // Test tile coordinate system
  if (typeof testTileCoordinateSystem === 'function') {
    testTileCoordinateSystem();
  }
  
  // Test mouse coordinate system
  if (typeof testMouseCoordinateSystem === 'function') {
    testMouseCoordinateSystem();
  }
  
  // Initialize lighting system
  initLighting();
  
  // Initialize camera system
  initCamera();
  
  // Initialize interactive tiles system
  if (typeof initInteractiveTiles === 'function') {
    initInteractiveTiles();
  }
  
  // Initialize player system
  initPlayer();
  
  // Load player sprite
  if (typeof loadPlayerSprite === 'function') {
    loadPlayerSprite();
  }
  
  // Initialize health system
  if (typeof initializeHealthSystem === 'function') {
    initializeHealthSystem();
    // Set default respawn point to player spawn
    if (typeof player !== 'undefined' && player && typeof setRespawnPoint === 'function') {
      setRespawnPoint(player.x, player.y);
    }
  }
  
  // Initialize save/load UI
  if (typeof initSaveLoadUI === 'function') {
    initSaveLoadUI();
  }
  
  // Initialize toolbar
  if (typeof initToolbar === 'function') {
    initToolbar();
  }
  
  // Initialize logic system
  if (typeof initLogicSystem === 'function') {
    initLogicSystem();
  }
  
  // Initialize script system
  if (typeof initScriptSystem === 'function') {
    initScriptSystem();
  }
  
  initialized = true;
  
  // Set initial selected tile
  setSelectedTile('grass', 'TERRAIN');
  editorUI.selectedTile = 'grass';
  editorUI.selectedCategory = 'TERRAIN';
  
  // Show project manager - user picks a project, then we load its start map
  if (typeof openProjectManager === 'function') {
    openProjectManager().then(({ folder, project }) => {
      if (project.startMap) {
        loadProjectStartMap(folder, project.startMap);
      } else {
        console.log('📋 No start map set - use Level Manager to create one');
      }
    });
  } else {
    // Fallback: load legacy map if project manager not available
    createDemoLevelIfNeeded();
  }
}

/** Load a level from the active project */
async function loadProjectStartMap(folder, mapName) {
  try {
    console.log(`🗺️  Loading start map: ${folder}/${mapName}`);
    const response = await fetch(`/api/projects/${encodeURIComponent(folder)}/levels/${encodeURIComponent(mapName)}`);
    if (!response.ok) {
      console.warn(`⚠️ Start map "${mapName}" not found in project`);
      return;
    }
    const mapData = await response.json();
    if (typeof restoreWorldFromData === 'function') {
      restoreWorldFromData(mapData, mapData.name || mapName);
    }
    if (typeof sceneManager !== 'undefined') {
      sceneManager.setCurrentScene(mapData.name || mapName);
    }
    console.log(`✓ Start map loaded: ${mapName}`);
  } catch (e) {
    console.warn('❌ Error loading start map:', e);
  }
}

// P5.js draw function - main game loop
function draw() {
  // Set standard font for consistency
  textFont('Arial, sans-serif');
  
  // Clear screen with dark background
  background(20, 20, 25); // Darker background to distinguish from world
  
  if (!initialized) {
    // Show loading screen
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text('Loading tiles...', width/2, height/2);
    return;
  }

  // Update lighting system
  updateLighting();
  
  // Update ambient light transitions (night/day etc.)
  if (typeof updateAmbientTransition === 'function') {
    updateAmbientTransition();
  }

  // Update camera system
  updateCamera();

  // Update light editing
  updateLightEditing();

  // Update player system
  handlePlayerMovement();
  updatePlayerEffects();

  // Update ambient tile sounds (spatial volume based on player position)
  if (typeof updateAmbientSounds === 'function' && !editMode) {
    updateAmbientSounds();
  }

  // ── Unified Event Pipeline ──
  // Single per-frame call replaces checkPlayerTriggers + checkPlayerTileScripts.
  // Checks interactive tiles, event tiles, triggerRegistry, and script templates.
  if (typeof checkAllTileEvents === 'function' && !editMode) {
    checkAllTileEvents();
  }

  // Update health system
  if (typeof updateHealthSystem === 'function') {
    updateHealthSystem();
  }

  // Update entity health system (NPCs, destructibles, etc.)
  if (typeof updateEntityHealthSystem === 'function') {
    updateEntityHealthSystem();
  }

  // Update logic system (timers, counters, gates)
  if (typeof updateLogicSystem === 'function') {
    updateLogicSystem();
  }

  // Update script system (onTick handlers for template-based scripts)
  if (typeof updateScriptSystem === 'function') {
    updateScriptSystem();
  }
  
  // Check teleporter collisions
  if (typeof checkTeleporterCollision === 'function') {
    checkTeleporterCollision();
  }

  // Update context UI
  if (typeof updateContextUI === 'function') {
    updateContextUI();
  }

  // Update entity system
  if (typeof updateEntities === 'function') {
    updateEntities();
  }

  // Update particle systems (independent of entities - never chain these through another system)
  if (typeof updateEnvironmentalParticles === 'function') {
    updateEnvironmentalParticles();
  }
  if (typeof updateParticleEffects === 'function') {
    updateParticleEffects();
  }

  // Apply camera transformation for world elements
  push();
  applyCameraTransform();

  // Draw world background (aligned with grid)
  drawWorldBackground();

  // Update tile animations (advance frame timers before drawing)
  if (typeof Engine !== 'undefined' && Engine.has('animations')) {
    Engine.get('animations').updateTileAnimations(deltaTime / 1000);
  }

  // Update scene manager (fade transitions, map loading)
  if (typeof sceneManager !== 'undefined') {
    sceneManager.update(deltaTime / 1000);
  }

  // Update Phase 2 gameplay systems
  var _dt = deltaTime / 1000;
  if (!editMode) {
    if (typeof survivalSystem !== 'undefined')     survivalSystem.update(_dt);
    if (typeof combatSystem !== 'undefined')        combatSystem.update(_dt);
    if (typeof farmingSystem !== 'undefined')        farmingSystem.update(_dt);
    if (typeof hotbarSystem !== 'undefined')         hotbarSystem.update(_dt);
    // Update NPC AI behaviors (chase, wander, attack, flee)
    if (typeof updateNPCs === 'function')            updateNPCs(_dt);
  }

  // Update world items (physics + nearby detection) - runs in both modes
  if (typeof updateWorldItems === 'function') {
    updateWorldItems();
  }

  // Update in-game UI widgets (toast timers, bar animations, etc.)
  if (!editMode && typeof gameUILayer !== 'undefined') {
    gameUILayer.update(deltaTime / 1000);
  }

  // Draw placed tiles
  drawTiles();

  // Draw decorations (native-size images, above tiles, below lighting)
  if (typeof drawDecorations === 'function') {
    drawDecorations();
  }

  // Draw interactive tiles (doors, switches)
  if (typeof drawInteractiveTiles === 'function') {
    drawInteractiveTiles();
  }
  
  // Draw event tiles
  if (typeof drawEventTiles === 'function' && editorUI.showEvents) {
    drawEventTiles();
  }
  
  // Draw player BEFORE lighting so it gets affected by lighting
  drawPlayer();
  
  // Draw player health bar above player
  if (typeof drawPlayerHealthBar === 'function') {
    drawPlayerHealthBar();
  }
  
  // Draw environmental particles (behind entities, affected by lighting)
  if (typeof drawEnvironmentalParticles === 'function') {
    drawEnvironmentalParticles();
  }

  // Draw world-space effect particles (explosions, magic, etc.)
  if (typeof drawParticleEffects === 'function' &&
      (typeof editorUI === 'undefined' || editorUI.showParticles)) {
    drawParticleEffects();
  }

  // Draw entities BEFORE lighting so they get affected by lighting
  if (typeof drawEntities === 'function') {
    drawEntities();
  }

  // Draw NPC interaction prompts ("Press E to talk") - play mode only
  if (!editMode && typeof drawNPCPrompts === 'function') {
    drawNPCPrompts();
  }

  // Draw world items (ground items, thrown items) BEFORE lighting
  if (typeof drawWorldItems === 'function') {
    drawWorldItems();
  }
  
  // Draw lighting overlay
  drawLighting();
  
  // Draw roof tiles AFTER lighting so they're unaffected by lights below
  if (typeof drawRoofTiles === 'function' && editorUI.showRoofs) {
    drawRoofTiles();
  }
  
  // Draw light sources in editor mode
  if (editorUI.showLights) {
    drawLightSources();
  }

  // Draw sound radii in editor mode
  if (editorUI.showSounds && typeof drawSoundRadii === 'function') {
    drawSoundRadii();
  }

  // Draw spawn point indicator in editor mode
  if (editorUI.showSpawns && typeof drawPlayerSpawnPoint === 'function') {
    drawPlayerSpawnPoint();
  }

  // Draw NPC debug info (detection ranges, AI state) - editor mode
  if (editorUI.showSpawns && typeof drawNPCDebug === 'function') {
    drawNPCDebug();
  }
  
  // Draw grid if enabled
  if (showGrid) {
    drawGrid();
  }
  
  // Draw edit mode hover highlight
  if (editMode) {
    drawEditModeIndicator();
  }
  
  pop();
  
  // Draw weather overlay (screen-space particles, above lighting)
  if (typeof drawWeatherOverlay === 'function') {
    drawWeatherOverlay();
  }
  
  // Draw HUD (not affected by camera)
  drawHUD();
  
  // Draw in-game UI layer (screen-space widgets: health bar, toasts, dialogs)
  if (!editMode && typeof gameUILayer !== 'undefined') {
    gameUILayer.render();
  }

  // Draw combat feedback (attack range flash)
  if (!editMode && typeof combatSystem !== 'undefined') {
    combatSystem.render();
  }

  // Draw inventory overlay (on top of game, below modals)
  if (!editMode && typeof inventoryUI !== 'undefined') {
    inventoryUI.render();
  }

  // Draw hotbar (bottom-center, always visible in game mode)
  if (!editMode && typeof hotbarSystem !== 'undefined') {
    hotbarSystem.render();
  }

  // Draw dialog overlay (AFTER hotbar so it renders on top)
  if (!editMode && typeof drawDialog === 'function') {
    drawDialog();
  }
  
  // Draw delete mode UI
  if (typeof drawDeleteModeUI === 'function') {
    drawDeleteModeUI();
  }
  
  // Tile panel is now HTML-based (see tile_panel.js, nested in index.html)
  
  // Save/load modal is now HTML-based (see save_load_ui.js)
  
  // Draw context UI if open
  if (typeof drawContextUI === 'function') {
    drawContextUI();
  }

  // Scene transition fade overlay (renders LAST - on top of everything)
  if (typeof sceneManager !== 'undefined') {
    sceneManager.render();
  }
}

// Draw world background aligned with grid
function drawWorldBackground() {
  push();
  
  // Draw world background rectangle that exactly matches the world bounds (in meters)
  fill(45, 45, 55); // Slightly lighter than canvas background
  stroke(30, 30, 40); // Subtle border
  strokeWeight(2 / camera.zoom); // Scale border with zoom
  rect(0, 0, WORLD_WIDTH * GRID_SIZE, WORLD_HEIGHT * GRID_SIZE);
  
  pop();
}

// Draw the meter grid (and optional sub-grid for 16px snap)
function drawGrid() {
  push();

  let step = getSnapStep(); // 0.5 or 1.0

  // Sub-grid lines (lighter) when SNAP_GRID < GRID_SIZE
  if (SNAP_GRID < GRID_SIZE) {
    stroke(55, 55, 75);
    strokeWeight(0.5 / camera.zoom);
    for (let x = 0; x <= WORLD_WIDTH; x += step) {
      if (x % 1 !== 0) { // only sub-grid lines
        line(x * GRID_SIZE, 0, x * GRID_SIZE, WORLD_HEIGHT * GRID_SIZE);
      }
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += step) {
      if (y % 1 !== 0) {
        line(0, y * GRID_SIZE, WORLD_WIDTH * GRID_SIZE, y * GRID_SIZE);
      }
    }
  }

  // Main grid lines (every 1 meter)
  stroke(80, 80, 100);
  strokeWeight(1 / camera.zoom);

  for (let x = 0; x <= WORLD_WIDTH; x++) {
    line(x * GRID_SIZE, 0, x * GRID_SIZE, WORLD_HEIGHT * GRID_SIZE);
  }

  for (let y = 0; y <= WORLD_HEIGHT; y++) {
    line(0, y * GRID_SIZE, WORLD_WIDTH * GRID_SIZE, y * GRID_SIZE);
  }

  pop();
}

// Draw edit mode indicator and hover highlight
function drawEditModeIndicator() {
  // Draw hover highlight on grid cell
  let gridPos = screenToGrid(mouseX, mouseY);
  
  if (gridPos.x >= 0 && gridPos.x < WORLD_WIDTH && 
      gridPos.y >= 0 && gridPos.y < WORLD_HEIGHT) {
    
    // Convert grid position (meters) to world position (pixels) for drawing
    let worldX = gridPos.x * GRID_SIZE;
    let worldY = gridPos.y * GRID_SIZE;
    
    push();
    
    // Draw selection preview or drag preview
    if (selectionTool.mode === 'select' && placementState.isDragging) {
      drawSelectionPreview();
    } else if (selectionTool.mode === 'move' && selectionTool.isMoving) {
      drawMovePreview();
    } else if (placementState.isDragging && selectionTool.mode === 'tile') {
      drawDragPreview();
    } else {
      // Normal hover highlight
      if (selectionTool.mode === 'select') {
        fill(0, 255, 255, 100); // Cyan for selection tool
        stroke(0, 255, 255, 200);
      } else if (selectionTool.mode === 'move') {
        fill(255, 165, 0, 100); // Orange for move tool
        stroke(255, 165, 0, 200);
      } else {
        fill(255, 255, 0, 100); // Yellow for tile tool
        stroke(255, 255, 0, 200);
      }
      strokeWeight(2);
      rect(worldX, worldY, SNAP_GRID, SNAP_GRID);
      
      // Show preview of selected tile for tile mode
      if (selectionTool.mode === 'tile' && editorUI.selectedTile && tileSystem.loadedImages[editorUI.selectedTile]) {
        // Decoration tiles get a native-size preview with bottom-left anchor
        if (typeof isDecorationTile === 'function' && isDecorationTile(editorUI.selectedTile)) {
          if (typeof drawDecorationPreview === 'function') {
            drawDecorationPreview(gridPos.x, gridPos.y, editorUI.selectedTile);
          }
        } else {
          push();
          tint(255, 150);
          imageMode(CORNER);
          
          // Apply transformations to preview
          translate(worldX + SNAP_GRID/2, worldY + SNAP_GRID/2);
          // Determine preview scale from flipState (backwards-compatible with `flipped`)
          let previewFlip = typeof tileTransform.flipState !== 'undefined' ? tileTransform.flipState : (tileTransform.flipped ? 1 : 0);
          let pScaleX = 1, pScaleY = 1;
          if (previewFlip === 1) { pScaleX = -1; pScaleY = 1; }
          else if (previewFlip === 2) { pScaleX = -1; pScaleY = -1; }
          else if (previewFlip === 3) { pScaleX = 1; pScaleY = -1; }
          scale(pScaleX, pScaleY);
          rotate(radians(tileTransform.rotation));
          translate(-SNAP_GRID/2, -SNAP_GRID/2);
          
          image(tileSystem.loadedImages[editorUI.selectedTile], 0, 0, SNAP_GRID, SNAP_GRID);
          noTint();
          pop();
        }
      }
    }
    
    pop();
  }
  
  // Draw current selection
  if (selectionTool.hasSelection) {
    drawSelection();
  }
  
  // Draw paste preview (yellow overlay when Ctrl+V pressed)
  if (clipboard.showPreview) {
    drawPastePreview();
  }
}

// Draw HUD - updates HTML debug panel only when values change (dirty-flag optimization)
let _hudCache = {};  // stores last innerHTML per element id
let _hudShortcutsSet = false;  // shortcuts are static, set once

function _setHUD(el, html) {
  if (!el) return;
  const id = el.id;
  if (_hudCache[id] !== html) {
    el.innerHTML = html;
    _hudCache[id] = html;
  }
}

function drawHUD() {
  // Draw health UI on canvas if health system is enabled
  if (typeof drawHealthUI === 'function' && healthState && healthState.enabled) {
    push();
    drawHealthUI();
    pop();
  }
  
  // Update HTML debug panel
  const debugPanel = document.getElementById('debugPanel');
  if (!debugPanel) return;

  // Hide/show debug panel based on debugVisible toggle
  if (!window.debugVisible) {
    debugPanel.style.display = 'none';
    return;
  } else {
    debugPanel.style.display = 'block';
  }
  
  const debugSystem = document.getElementById('debugSystem');
  const debugEditSection = document.getElementById('debugEditSection');
  const debugMouse = document.getElementById('debugMouse');
  const debugToolsSection = document.getElementById('debugToolsSection');
  const debugTools = document.getElementById('debugTools');
  const debugMapSection = document.getElementById('debugMapSection');
  const debugMap = document.getElementById('debugMap');
  const debugShortcutsSection = document.getElementById('debugShortcutsSection');
  const debugShortcuts = document.getElementById('debugShortcuts');
  const debugLightingSection = document.getElementById('debugLightingSection');
  const debugLighting = document.getElementById('debugLighting');
  const debugPlayerSection = document.getElementById('debugPlayerSection');
  const debugPlayer = document.getElementById('debugPlayer');
  
  // === SYSTEM STATUS (always shown) ===
  if (debugSystem) {
    let systemHTML = `
      <div class="debug-line">Grid: <span class="debug-value">${showGrid ? 'ON' : 'OFF'}</span> <span class="debug-key">(G)</span></div>
      <div class="debug-line">Edit Mode: <span class="debug-value">${editMode ? 'ON' : 'OFF'}</span> <span class="debug-key">(E)</span></div>
      <div class="debug-line">World: <span class="debug-value">${WORLD_WIDTH}m × ${WORLD_HEIGHT}m</span></div>
      <div class="debug-line">Snap Grid: <span class="debug-value">${SNAP_GRID}px (${getSnapStep()}m)</span> <span class="debug-key">(N)</span></div>
    `;
    if (typeof camera !== 'undefined') {
      systemHTML += `<div class="debug-line">Zoom: <span class="debug-value">${camera.zoom.toFixed(2)}x</span></div>`;
    }
    _setHUD(debugSystem, systemHTML);
  }
  
  if (editMode) {
    // Show edit mode sections, hide play mode sections
    if (debugEditSection) debugEditSection.style.display = 'block';
    if (debugToolsSection) debugToolsSection.style.display = 'block';
    if (debugMapSection) debugMapSection.style.display = 'block';
    if (debugShortcutsSection) debugShortcutsSection.style.display = 'block';
    if (debugLightingSection) debugLightingSection.style.display = typeof lighting !== 'undefined' ? 'block' : 'none';
    if (debugPlayerSection) debugPlayerSection.style.display = 'none';
    
    // === MOUSE & SELECTION ===
    if (debugMouse) {
      let gridPos = screenToGrid(mouseX, mouseY);
      
      // Get friendly display names
      let tileDisplayName = editorUI.selectedTile;
      let categoryDisplayName = editorUI.selectedCategory;
      if (tileSystem.definitions && tileSystem.definitions.categories) {
        let cat = tileSystem.definitions.categories[editorUI.selectedCategory];
        if (cat) {
          categoryDisplayName = cat.displayName || editorUI.selectedCategory;
          if (cat.tiles && cat.tiles[editorUI.selectedTile]) {
            tileDisplayName = cat.tiles[editorUI.selectedTile].displayName || editorUI.selectedTile;
          }
        }
      }
      
      _setHUD(debugMouse, `
        <div class="debug-line">Position: <span class="debug-value">(${gridPos.x.toFixed(1)}m, ${gridPos.y.toFixed(1)}m)</span></div>
        <div class="debug-line">Tile: <span class="debug-value">${tileDisplayName}</span></div>
        <div class="debug-line">Category: <span class="debug-value">${categoryDisplayName}</span></div>
      `);
    }
    
    // === TOOLS & TRANSFORM ===
    if (debugTools) {
      const flipLabels = ['NONE', 'FLIP_X', 'FLIP_BOTH', 'FLIP_Y'];
      let activeFlip = typeof tileTransform.flipState !== 'undefined' ? tileTransform.flipState : (tileTransform.flipped ? 1 : 0);
      let diameter = 2 * brushRadius + 1;
      
      let toolsHTML = `
        <div class="debug-line">Tool: <span class="debug-value">${selectionTool.mode.toUpperCase()}</span></div>
        <div class="debug-line">Transform: <span class="debug-value">${flipLabels[activeFlip]} | ${tileTransform.rotation}°</span></div>
        <div class="debug-line">Brush: <span class="debug-value">${diameter}×${diameter}</span> <span class="debug-key">([ / ])</span></div>
        <div class="debug-line">Panel: <span class="debug-value">${editorUI.showTilePanel ? 'ON' : 'OFF'}</span> <span class="debug-key">(T)</span></div>
      `;
      
      if (typeof currentZLevel !== 'undefined') {
        toolsHTML += `<div class="debug-line">Z-Level: <span class="debug-value">Z${currentZLevel}</span> <span class="debug-key">(PgUp/Dn)</span></div>`;
      }
      
      // Show fill tool status
      if (typeof fillTool !== 'undefined' && fillTool.isActive) {
        toolsHTML += `<div class="debug-line" style="color:#66ff66;">FILL MODE: <span class="debug-value">ON</span> <span class="debug-key">(B)</span></div>`;
      }
      
      if (deleteMode && deleteMode.isActive) {
        toolsHTML += `<div class="debug-line" style="color:#ff6666;">DELETE: <span class="debug-value">${deleteMode.selectedTiles.size} selected</span></div>`;
      }
      
      _setHUD(debugTools, toolsHTML);
    }
    
    // === MAP & CONTROLS ===
    if (debugMap) {
      _setHUD(debugMap, `
        <div class="debug-line">Map: <span class="debug-value">${saveModal.currentMapName || 'Untitled'}</span></div>
      `);
    }
    
    // === SHORTCUTS (static - set once) ===
    if (debugShortcuts && !_hudShortcutsSet) {
      debugShortcuts.innerHTML = `
        <div class="debug-line"><span class="debug-key">G</span>: Grid &nbsp; <span class="debug-key">T</span>: Tiles &nbsp; <span class="debug-key">O</span>: Lighting</div>
        <div class="debug-line"><span class="debug-key">Q</span>: Select &nbsp; <span class="debug-key">M</span>: Move &nbsp; <span class="debug-key">1</span>: Tile</div>
        <div class="debug-line"><span class="debug-key">R</span>: Rotate &nbsp; <span class="debug-key">F</span>: Flip &nbsp; <span class="debug-key">DEL</span>: Delete</div>
        <div class="debug-line"><span class="debug-key">B</span>: Fill &nbsp; <span class="debug-key">Ctrl+H</span>: Replace All</div>
        <div class="debug-line"><span class="debug-key">Ctrl+Z</span>: Undo &nbsp; <span class="debug-key">Ctrl+Y</span>: Redo</div>
        <div class="debug-line"><span class="debug-key">Ctrl+C/V</span>: Copy/Paste &nbsp; <span class="debug-key">X</span>: Cut</div>
        <div class="debug-line"><span class="debug-key">Click</span>: Place &nbsp; <span class="debug-key">RClick</span>: Remove</div>
        <div class="debug-line"><span class="debug-key">MidClick</span>: Eyedropper &nbsp; <span class="debug-key">MidDrag</span>: Pan</div>
        <div class="debug-line"><span class="debug-key">Drag</span>: Line &nbsp; <span class="debug-key">Shift+Drag</span>: Rect</div>
        <div class="debug-line"><span class="debug-key">U</span>: Ambient &nbsp; <span class="debug-key">Shift+Click</span>: Edit Sign</div>
        <div class="debug-line"><span class="debug-key">P</span>: Toggle Particles</div>
      `;
      _hudShortcutsSet = true;
    }
    
    // === LIGHTING ===
    if (debugLighting && typeof lighting !== 'undefined') {
      let lightingHTML = `
        <div class="debug-line">Status: <span class="debug-value">${lighting.enabled ? 'ON' : 'OFF'}</span> <span class="debug-key">(O)</span></div>
        <div class="debug-line">Lights: <span class="debug-value">${lighting.lights.length}</span></div>
      `;
      if (typeof lightEditor !== 'undefined' && lightEditor.selectedLight) {
        lightingHTML += `<div class="debug-line">Editing - R: ${lightEditor.selectedLight.radius.toFixed(1)} I: ${lightEditor.selectedLight.intensity.toFixed(1)}</div>`;
      }
      _setHUD(debugLighting, lightingHTML);
    }
    
  } else {
    // Hide edit mode sections, show play mode sections
    if (debugEditSection) debugEditSection.style.display = 'none';
    if (debugToolsSection) debugToolsSection.style.display = 'none';
    if (debugMapSection) debugMapSection.style.display = 'none';
    if (debugShortcutsSection) debugShortcutsSection.style.display = 'none';
    if (debugLightingSection) debugLightingSection.style.display = 'none';
    if (debugPlayerSection) debugPlayerSection.style.display = 'block';
    
    // === PLAYER STATUS ===
    if (debugPlayer) {
      let playerHTML = '';
      if (typeof player !== 'undefined') {
        playerHTML = `
          <div class="debug-line">Position: <span class="debug-value">(${player.x.toFixed(2)}m, ${player.y.toFixed(2)}m)</span></div>
          <div class="debug-line">Moving: <span class="debug-value">${player.debugInfo?.isMoving || false}</span></div>
          <div class="debug-line">Speed: <span class="debug-value">${player.debugInfo?.velocityMagnitude?.toFixed(3) || '0.000'}m/f</span></div>
        `;
      }
      playerHTML += `
        <div class="debug-line" style="margin-top: 8px;"><span class="debug-key">Arrows</span>: Move &nbsp; <span class="debug-key">Space</span>: Jump</div>
        <div class="debug-line"><span class="debug-key">E/Enter</span>: Interact &nbsp; <span class="debug-key">C</span>: Camera</div>
        <div class="debug-line"><span class="debug-key">G</span>: Grid &nbsp; <span class="debug-key">O</span>: Lighting &nbsp; <span class="debug-key">F3</span>: Debug</div>
      `;
      _setHUD(debugPlayer, playerHTML);
    }
  }
}

// Convert screen coordinates to world coordinates (meters)
function screenToWorld(screenX, screenY) {
  // Convert screen coordinates to world meters using camera transformation
  // This should match the inverse of the camera's worldToScreen function
  return {
    x: (screenX - width / 2) / camera.zoom / GRID_SIZE + camera.x,
    y: (screenY - height / 2) / camera.zoom / GRID_SIZE + camera.y
  };
}

// Convert world coordinates (meters) to screen coordinates
function worldToScreen(worldX, worldY) {
  return {
    x: (worldX - camera.x) * GRID_SIZE * camera.zoom + width / 2,
    y: (worldY - camera.y) * GRID_SIZE * camera.zoom + height / 2
  };
}

// Convert screen coordinates to grid coordinates (snapped to SNAP_GRID for tile placement)
function screenToGrid(screenX, screenY) {
  let worldPos = screenToWorld(screenX, screenY);
  let step = getSnapStep(); // 1.0 or 0.5
  return {
    x: Math.round(Math.floor(worldPos.x / step) * step * 2) / 2,
    y: Math.round(Math.floor(worldPos.y / step) * step * 2) / 2
  };
}

// Change brush radius (delta: +1 to increase, -1 to decrease)
function changeBrushRadius(delta) {
  let newRadius = brushRadius + delta;
  newRadius = Math.max(0, Math.min(4, newRadius)); // Clamp 0-4 (max 9x9 brush)
  if (newRadius !== brushRadius) {
    brushRadius = newRadius;
    let diameter = 2 * brushRadius + 1;
    console.log(`Brush size: ${diameter}x${diameter} (radius ${brushRadius})`);
  }
}

// Place tiles in a circular pattern around center position
// Steps by snap grid size so brush works at both 32px and 16px
function placeTilesInCircle(centerX, centerY, tileType, category, transform) {
  if (brushRadius === 0) {
    // Single tile placement
    placeTile(centerX, centerY, tileType, category, transform);
    return 1;
  }
  
  let step = typeof getSnapStep === 'function' ? getSnapStep() : 1;
  let count = 0;
  let radiusSq = (brushRadius + 0.5) * (brushRadius + 0.5); // Slightly larger for better circle
  
  for (let di = -brushRadius; di <= brushRadius; di++) {
    for (let dj = -brushRadius; dj <= brushRadius; dj++) {
      // Check if within circular radius (in grid-cell units)
      let distSq = di * di + dj * dj;
      if (distSq <= radiusSq) {
        let tx = centerX + di * step;
        let ty = centerY + dj * step;
        // Snap to half-grid for clean coordinates
        tx = Math.round(tx * 2) / 2;
        ty = Math.round(ty * 2) / 2;
        // Bounds check
        if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
          placeTile(tx, ty, tileType, category, transform);
          count++;
        }
      }
    }
  }
  return count;
}

// Remove tiles in a circular pattern around center position
// Steps by snap grid size so brush works at both 32px and 16px
function removeTilesInCircle(centerX, centerY) {
  if (brushRadius === 0) {
    removeTile(centerX, centerY);
    return 1;
  }
  
  let step = typeof getSnapStep === 'function' ? getSnapStep() : 1;
  let count = 0;
  let radiusSq = (brushRadius + 0.5) * (brushRadius + 0.5);
  
  for (let di = -brushRadius; di <= brushRadius; di++) {
    for (let dj = -brushRadius; dj <= brushRadius; dj++) {
      let distSq = di * di + dj * dj;
      if (distSq <= radiusSq) {
        let tx = centerX + di * step;
        let ty = centerY + dj * step;
        tx = Math.round(tx * 2) / 2;
        ty = Math.round(ty * 2) / 2;
        if (tx >= 0 && tx < WORLD_WIDTH && ty >= 0 && ty < WORLD_HEIGHT) {
          removeTile(tx, ty);
          count++;
        }
      }
    }
  }
  return count;
}

// Convert grid coordinates (meters) to world pixel coordinates (for drawing)
function gridToWorld(gridX, gridY) {
  return {
    x: gridX * GRID_SIZE,
    y: gridY * GRID_SIZE
  };
}

// Handle key presses
// Input handlers moved to input_handler.js

// Mouse handlers moved to input_handler.js

// Drawing helpers moved to ui_renderer.js

// Coordinate system tests removed - use console debugging if needed

// Save/Load system moved to save_load.js

// Selection system functions moved to ui_renderer.js

// Handle window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
