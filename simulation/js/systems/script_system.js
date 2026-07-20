// ============================================
// SCRIPT SYSTEM - Custom behavior scripts for tiles
// Allows tiles to execute JavaScript behaviors
// ============================================

// Script storage: maps tile position to script definitions
const tileScripts = new Map();

// Registered script templates (pre-built behaviors)
const scriptTemplates = {};

// Script execution context (sandboxed variables available to scripts)
const scriptContext = {
  // Game state accessors
  getPlayerPosition: () => ({
    x: typeof playerX !== 'undefined' ? playerX : 0,
    y: typeof playerY !== 'undefined' ? playerY : 0
  }),
  getTileSize: () => typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32,
  isEditMode: () => typeof editMode !== 'undefined' ? editMode : false,
  
  // Tile operations
  activateTile: (x, y) => {
    if (typeof activateTileAt === 'function') {
      activateTileAt(x, y);
    }
  },
  sendSignal: (x, y, signal) => {
    const tile = findTileForScript(x, y);
    if (tile && typeof sendSignal === 'function') {
      sendSignal(tile, signal);
    }
  },
  
  // Player operations
  teleportPlayer: (x, y) => {
    if (typeof teleportPlayer === 'function') {
      teleportPlayer(x, y);
    }
  },
  damagePlayer: (amount) => {
    if (typeof damagePlayer === 'function') {
      damagePlayer(amount);
    }
  },
  healPlayer: (amount) => {
    if (typeof healPlayer === 'function') {
      healPlayer(amount);
    }
  },
  
  // Entity creation
  spawnEntity: (type, x, y, props) => {
    if (typeof createEntity === 'function') {
      return createEntity(type, x, y, props);
    }
    return null;
  },
  
  // Audio (if available)
  playSound: (soundId) => {
    if (typeof playSound === 'function') {
      playSound(soundId);
    }
  },
  
  // Screen effects
  fadeToBlack: (durationSeconds = 1) => {
    if (typeof showScreenOverlay === 'function') {
      showScreenOverlay('black', durationSeconds);
    } else {
      // Fallback: create overlay div
      let overlay = document.getElementById('script-screen-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'script-screen-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:black;opacity:0;pointer-events:none;z-index:9999;transition:opacity 0.3s;';
        document.body.appendChild(overlay);
      }
      overlay.style.opacity = '1';
      setTimeout(() => { overlay.style.opacity = '0'; }, durationSeconds * 1000);
    }
  },
  
  fadeToWhite: (durationSeconds = 0.5) => {
    let overlay = document.getElementById('script-screen-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'script-screen-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0;pointer-events:none;z-index:9999;transition:opacity 0.1s;';
      document.body.appendChild(overlay);
    }
    overlay.style.background = 'white';
    overlay.style.opacity = '1';
    setTimeout(() => { overlay.style.opacity = '0'; }, durationSeconds * 1000);
  },
  
  shakeCamera: (strength = 5, durationMs = 300) => {
    if (typeof shakeCamera === 'function') {
      shakeCamera(strength, durationMs);
    } else {
      // Fallback simple shake
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const originalTransform = canvas.style.transform;
        let start = Date.now();
        const shake = () => {
          const elapsed = Date.now() - start;
          if (elapsed < durationMs) {
            const x = (Math.random() - 0.5) * strength * 2;
            const y = (Math.random() - 0.5) * strength * 2;
            canvas.style.transform = `translate(${x}px, ${y}px)`;
            requestAnimationFrame(shake);
          } else {
            canvas.style.transform = originalTransform;
          }
        };
        shake();
      }
    }
  },
  
  showMessage: (text, durationSeconds = 2) => {
    let msgBox = document.getElementById('script-message-box');
    if (!msgBox) {
      msgBox = document.createElement('div');
      msgBox.id = 'script-message-box';
      msgBox.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:20px 40px;font-size:24px;border-radius:8px;z-index:10000;opacity:0;transition:opacity 0.3s;';
      document.body.appendChild(msgBox);
    }
    msgBox.textContent = text;
    msgBox.style.opacity = '1';
    setTimeout(() => { msgBox.style.opacity = '0'; }, durationSeconds * 1000);
  },
  
  // Door operations by coordinates
  openDoor: (x, y) => {
    if (typeof openDoorAt === 'function') {
      openDoorAt(x, y);
    } else if (typeof interactiveTiles !== 'undefined') {
      const tile = interactiveTiles.find(t => t.x === x && t.y === y);
      if (tile && tile.type.includes('door') && tile.type.includes('closed')) {
        if (typeof toggleInteractiveTile === 'function') toggleInteractiveTile(tile);
      }
    }
  },
  
  closeDoor: (x, y) => {
    if (typeof closeDoorAt === 'function') {
      closeDoorAt(x, y);
    } else if (typeof interactiveTiles !== 'undefined') {
      const tile = interactiveTiles.find(t => t.x === x && t.y === y);
      if (tile && tile.type.includes('door') && tile.type.includes('open')) {
        if (typeof toggleInteractiveTile === 'function') toggleInteractiveTile(tile);
      }
    }
  },
  
  toggleDoor: (x, y) => {
    if (typeof interactiveTiles !== 'undefined') {
      const tile = interactiveTiles.find(t => t.x === x && t.y === y);
      if (tile && tile.type.includes('door')) {
        if (typeof toggleInteractiveTile === 'function') toggleInteractiveTile(tile);
      }
    }
  },
  
  // Door operations by Link ID (aliased as ById for simpler API)
  openDoorByLinkId: (linkId) => {
    if (typeof interactiveTiles !== 'undefined') {
      const tiles = interactiveTiles.filter(t => t.linkId == linkId && t.type.includes('door'));
      tiles.forEach(tile => {
        if (tile.type.includes('closed') && typeof toggleInteractiveTile === 'function') {
          toggleInteractiveTile(tile);
        }
      });
    }
  },
  
  closeDoorByLinkId: (linkId) => {
    if (typeof interactiveTiles !== 'undefined') {
      const tiles = interactiveTiles.filter(t => t.linkId == linkId && t.type.includes('door'));
      tiles.forEach(tile => {
        if (tile.type.includes('open') && typeof toggleInteractiveTile === 'function') {
          toggleInteractiveTile(tile);
        }
      });
    }
  },
  
  toggleDoorByLinkId: (linkId) => {
    if (typeof interactiveTiles !== 'undefined') {
      const tiles = interactiveTiles.filter(t => t.linkId == linkId && t.type.includes('door'));
      tiles.forEach(tile => {
        if (typeof toggleInteractiveTile === 'function') toggleInteractiveTile(tile);
      });
    }
  },
  
  // Simplified ById aliases (what the action builder uses)
  openDoorById: (id) => { scriptContext.openDoorByLinkId(id); },
  closeDoorById: (id) => { scriptContext.closeDoorByLinkId(id); },
  toggleDoorById: (id) => { scriptContext.toggleDoorByLinkId(id); },
  
  // Destroy/remove tiles
  destroyTile: (x, y) => {
    // Remove from tile system
    if (typeof removeTile === 'function') {
      removeTile(x, y);
    }
    // Also remove from interactive tiles
    if (typeof removeInteractiveTile === 'function') {
      removeInteractiveTile(x, y);
    }
    console.log(`[Script] Destroyed tile at (${x}, ${y})`);
  },
  
  destroyTileByLinkId: (linkId) => {
    if (typeof interactiveTiles !== 'undefined') {
      const tilesToDestroy = interactiveTiles.filter(t => t.linkId == linkId);
      tilesToDestroy.forEach(tile => {
        if (typeof removeTile === 'function') removeTile(tile.x, tile.y);
        if (typeof removeInteractiveTile === 'function') removeInteractiveTile(tile.x, tile.y);
      });
      console.log(`[Script] Destroyed ${tilesToDestroy.length} tile(s) with linkId ${linkId}`);
    }
  },
  
  destroyTileById: (id) => { scriptContext.destroyTileByLinkId(id); },
  
  // Activate tile operations
  activateTileByLinkId: (linkId) => {
    if (typeof interactiveTiles !== 'undefined') {
      const tiles = interactiveTiles.filter(t => t.linkId == linkId);
      tiles.forEach(tile => {
        if (typeof interactWithTile === 'function') interactWithTile(tile);
      });
    }
  },
  
  activateTileById: (id) => { scriptContext.activateTileByLinkId(id); },
  
  // Teleport player to a tile by ID
  teleportPlayerToId: (id) => {
    if (typeof interactiveTiles !== 'undefined') {
      const tile = interactiveTiles.find(t => t.linkId == id);
      if (tile) {
        const tileSize = typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32;
        if (typeof playerX !== 'undefined') {
          playerX = tile.x * tileSize + tileSize / 2;
          playerY = tile.y * tileSize + tileSize / 2;
          console.log(`[Script] Teleported player to tile ID ${id} at (${tile.x}, ${tile.y})`);
        }
      } else {
        console.warn(`[Script] No tile found with ID ${id}`);
      }
    }
  },
  
  // Scene / map transitions (routes through SceneManager)
  changeMap: (mapName, spawnX, spawnY, transition) => {
    if (typeof changeScene === 'function') {
      changeScene(mapName, { spawnX: spawnX, spawnY: spawnY, transition: transition || 'fade' });
    } else if (typeof loadMap === 'function') {
      loadMap(mapName);
    } else {
      console.warn('[Script] No map loading function available');
    }
  },
  
  // Logging
  log: (message) => {
    console.log(`[Script] ${message}`);
  },
  
  // Timer utilities
  wait: (seconds) => {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  },
  
  // Random utilities
  random: (min, max) => Math.random() * (max - min) + min,
  randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
  
  // Math utilities
  distance: (x1, y1, x2, y2) => Math.sqrt((x2-x1)**2 + (y2-y1)**2),
  
  // State storage per tile
  state: {},
  
  // === NATIVE ENGINE APIs ===
  // These call real engine functions - no external scripts needed
  
  // Lighting / time-of-day
  setNightTime: (durationMs) => {
    if (typeof setNightTime === 'function') {
      setNightTime(durationMs);
    } else {
      console.warn('[Script] setNightTime not available - lighting.js not loaded');
    }
  },
  
  setDayTime: (durationMs) => {
    if (typeof setDayTime === 'function') {
      setDayTime(durationMs);
    } else {
      console.warn('[Script] setDayTime not available - lighting.js not loaded');
    }
  },
  
  setAmbientTransition: (targetAmbient, targetColor, durationMs) => {
    if (typeof setAmbientTransition === 'function') {
      setAmbientTransition(targetAmbient, targetColor, durationMs);
    }
  },
  
  // Weather
  startRain: () => {
    if (typeof setWeatherEffect === 'function') {
      setWeatherEffect('rain', true);
      console.log('[Script] Rain started');
    } else {
      console.warn('[Script] setWeatherEffect not available - particle_effects.js not loaded');
    }
  },
  
  stopRain: () => {
    if (typeof setWeatherEffect === 'function') {
      setWeatherEffect('rain', false);
      console.log('[Script] Rain stopped');
    }
  },
  
  startSnow: () => {
    if (typeof setWeatherEffect === 'function') {
      setWeatherEffect('snow', true);
      console.log('[Script] Snow started');
    }
  },
  
  stopSnow: () => {
    if (typeof setWeatherEffect === 'function') {
      setWeatherEffect('snow', false);
      console.log('[Script] Snow stopped');
    }
  },
  
  startLeaves: () => {
    if (typeof setWeatherEffect === 'function') {
      setWeatherEffect('leaves', true);
      console.log('[Script] Falling leaves started');
    }
  },
  
  stopLeaves: () => {
    if (typeof setWeatherEffect === 'function') {
      setWeatherEffect('leaves', false);
      console.log('[Script] Falling leaves stopped');
    }
  },
  
  // Particle effects at grid positions
  spawnParticles: (gridX, gridY, preset, count) => {
    if (typeof spawnEffectAtGrid === 'function') {
      spawnEffectAtGrid(gridX, gridY, preset, count);
    }
  }
};

/**
 * Find tile at position for script operations
 */
function findTileForScript(x, y) {
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    return interactiveTiles.find(t => t.x === x && t.y === y);
  }
  return null;
}

/**
 * Initialize script system
 */
function initScriptSystem() {
  tileScripts.clear();
  registerDefaultTemplates();
  console.log('%c[Script System] Initialized', 'color: #ff88ff; font-weight: bold;');
}

/**
 * Register default script templates
 */
function registerDefaultTemplates() {
  // Damage zone - hurts player on enter
  registerScriptTemplate('damage_zone', {
    onPlayerEnter: `
      ctx.damagePlayer(this.damage || 10);
      ctx.log('Player took damage!');
    `,
    config: { damage: 10 }
  });
  
  // Heal zone - heals player on enter
  registerScriptTemplate('heal_zone', {
    onPlayerEnter: `
      ctx.healPlayer(this.healAmount || 25);
      ctx.log('Player healed!');
    `,
    config: { healAmount: 25 }
  });
  
  // Message trigger - shows message on enter
  registerScriptTemplate('message_trigger', {
    onPlayerEnter: `
      ctx.log(this.message || 'Hello!');
      // Could show UI message here
    `,
    config: { message: 'Welcome to this area!' }
  });
  
  // Timed door - opens for X seconds then closes
  registerScriptTemplate('timed_door', {
    onActivate: `
      ctx.activateTile(this.doorX, this.doorY);
      ctx.log('Door opened for ' + this.duration + ' seconds');
      
      setTimeout(() => {
        ctx.activateTile(this.doorX, this.doorY);
        ctx.log('Door closed');
      }, (this.duration || 5) * 1000);
    `,
    config: { doorX: 0, doorY: 0, duration: 5 }
  });
  
  // Spawn trigger - creates entity on activate
  registerScriptTemplate('spawn_trigger', {
    onActivate: `
      ctx.spawnEntity(this.entityType || 'particle_burst', 
        this.spawnX || this.x, 
        this.spawnY || this.y, 
        { color: this.color || [255, 255, 0] });
      ctx.log('Spawned ' + (this.entityType || 'particle_burst'));
    `,
    config: { entityType: 'particle_burst', spawnX: null, spawnY: null, color: [255, 255, 0] }
  });
  
  // Sequence validator - requires activations in order
  registerScriptTemplate('sequence_validator', {
    onActivate: `
      if (!ctx.state.sequence) ctx.state.sequence = [];
      ctx.state.sequence.push(this.sequenceId);
      
      const required = this.requiredSequence || [1, 2, 3];
      const current = ctx.state.sequence.slice(-required.length);
      
      if (JSON.stringify(current) === JSON.stringify(required)) {
        ctx.log('Sequence correct!');
        ctx.activateTile(this.targetX, this.targetY);
        ctx.state.sequence = [];
      } else if (ctx.state.sequence.length >= required.length) {
        ctx.log('Wrong sequence, resetting...');
        ctx.state.sequence = [];
      }
    `,
    config: { sequenceId: 1, requiredSequence: [1, 2, 3], targetX: 0, targetY: 0 }
  });
  
  // Proximity trigger - activates when player is near
  registerScriptTemplate('proximity_trigger', {
    onTick: `
      const player = ctx.getPlayerPosition();
      const tileSize = ctx.getTileSize();
      const tileWorldX = this.x * tileSize + tileSize/2;
      const tileWorldY = this.y * tileSize + tileSize/2;
      const dist = ctx.distance(player.x, player.y, tileWorldX, tileWorldY);
      
      if (dist < (this.range || 64)) {
        if (!ctx.state.playerNear) {
          ctx.state.playerNear = true;
          ctx.activateTile(this.targetX, this.targetY);
          ctx.log('Player entered proximity');
        }
      } else {
        if (ctx.state.playerNear) {
          ctx.state.playerNear = false;
          ctx.log('Player left proximity');
        }
      }
    `,
    config: { range: 64, targetX: 0, targetY: 0 }
  });
}

/**
 * Register a script template
 * @param {string} name - Template name
 * @param {Object} template - Template definition with event handlers and config
 */
function registerScriptTemplate(name, template) {
  scriptTemplates[name] = template;
  console.log(`[Script System] Registered template: ${name}`);
}

/**
 * Get available script templates
 * @returns {string[]} Template names
 */
function getScriptTemplates() {
  return Object.keys(scriptTemplates);
}

/**
 * Apply a script template to a tile
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 * @param {string} templateName - Name of template to apply
 * @param {Object} config - Override config values
 */
function applyScriptTemplate(x, y, templateName, config = {}) {
  const template = scriptTemplates[templateName];
  if (!template) {
    console.error(`[Script System] Template not found: ${templateName}`);
    return false;
  }
  
  const script = {
    template: templateName,
    config: { ...template.config, ...config, x, y },
    handlers: {}
  };
  
  // Copy event handlers
  for (const event of ['onActivate', 'onDeactivate', 'onPlayerEnter', 'onPlayerExit', 'onTick']) {
    if (template[event]) {
      script.handlers[event] = template[event];
    }
  }
  
  const key = `${x},${y}`;
  tileScripts.set(key, script);
  
  // Also store on the tile itself
  const tile = findTileForScript(x, y);
  if (tile) {
    tile.script = script;
  }
  
  console.log(`[Script System] Applied '${templateName}' to tile at (${x}, ${y})`);
  return true;
}

/**
 * Set custom script on a tile
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 * @param {Object} handlers - Event handlers { onActivate, onPlayerEnter, etc. }
 * @param {Object} config - Script configuration
 */
function setTileScript(x, y, handlers, config = {}) {
  const script = {
    template: null,
    config: { ...config, x, y },
    handlers: handlers
  };
  
  const key = `${x},${y}`;
  tileScripts.set(key, script);
  
  // Also store on tile
  const tile = findTileForScript(x, y);
  if (tile) {
    tile.script = script;
  }
  
  console.log(`[Script System] Set custom script on tile at (${x}, ${y})`);
  return true;
}

/**
 * Execute a script event
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 * @param {string} event - Event name (onActivate, onPlayerEnter, onPlayerExit, onTick)
 */
function executeScript(x, y, event) {
  const key = `${x},${y}`;
  const script = tileScripts.get(key);
  
  if (!script || !script.handlers[event]) return;
  
  // Check if this tile has trigger restrictions (from script tiles)
  const tile = findTileForScript(x, y);
  if (tile && tile.triggers) {
    // Map event names to trigger property names
    const triggerMap = {
      'onPlayerEnter': 'onEnter',
      'onPlayerExit': 'onExit',
      'onActivate': 'onActivate',
      'onTick': 'onTick'
    };
    
    const triggerName = triggerMap[event];
    if (triggerName && !tile.triggers[triggerName]) {
      // Trigger is disabled for this event
      return;
    }
  }
  
  try {
    // Create execution context with tile-specific state
    if (!scriptContext.state[key]) {
      scriptContext.state[key] = {};
    }
    
    const ctx = {
      ...scriptContext,
      state: scriptContext.state[key]
    };
    
    // Create function from script string
    const fn = new Function('ctx', 'this', `
      with (this) {
        ${script.handlers[event]}
      }
    `);
    
    // Execute with config as 'this'
    fn.call(script.config, ctx);
    
  } catch (error) {
    console.error(`[Script System] Error executing ${event} at (${x}, ${y}):`, error);
  }
}

/**
 * Trigger onActivate for a tile
 * @param {Object} tile - The tile
 */
function triggerScriptActivate(tile) {
  if (!tile) return;
  executeScript(tile.x, tile.y, 'onActivate');
}

/**
 * Trigger onPlayerEnter for a tile
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 */
function triggerScriptPlayerEnter(x, y) {
  executeScript(x, y, 'onPlayerEnter');
}

/**
 * Trigger onPlayerExit for a tile
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 */
function triggerScriptPlayerExit(x, y) {
  executeScript(x, y, 'onPlayerExit');
}

/**
 * Update all tile scripts with onTick handlers
 * Call every frame
 */
function updateScriptSystem() {
  if (typeof editMode !== 'undefined' && editMode) return;
  
  for (const [key, script] of tileScripts) {
    if (script.handlers.onTick) {
      const [x, y] = key.split(',').map(Number);
      
      // Check if tile has trigger restrictions
      const tile = findTileForScript(x, y);
      if (tile && tile.triggers && !tile.triggers.onTick) {
        continue; // Skip if onTick is disabled
      }
      
      executeScript(x, y, 'onTick');
    }
  }
}

/**
 * Track player position for enter/exit detection
 * DEPRECATED: Player enter/exit is now handled by checkAllTileEvents() in
 * interactive_tiles.js. This function is kept as a no-op for backward compat.
 */
let lastPlayerTileX = -1;
let lastPlayerTileY = -1;

function checkPlayerTileScripts() {
  // No-op - unified pipeline in interactive_tiles.js handles this now
  // via checkAllTileEvents() which calls executeScript(x, y, 'onPlayerEnter/Exit')
}

/**
 * Get script info for a tile
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 * @returns {Object|null} Script info or null
 */
function getTileScriptInfo(x, y) {
  const key = `${x},${y}`;
  return tileScripts.get(key) || null;
}

/**
 * Remove script from a tile
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 */
function removeTileScript(x, y) {
  const key = `${x},${y}`;
  tileScripts.delete(key);
  delete scriptContext.state[key];
  
  const tile = findTileForScript(x, y);
  if (tile) {
    delete tile.script;
  }
  
  console.log(`[Script System] Removed script from tile at (${x}, ${y})`);
}

/**
 * Reset script system (call when loading new level)
 */
function resetScriptSystem() {
  tileScripts.clear();
  scriptContext.state = {};
  lastPlayerTileX = -1;
  lastPlayerTileY = -1;
  console.log('[Script System] Reset');
}

/**
 * Get debug info
 */
function getScriptDebugInfo() {
  return {
    totalScripts: tileScripts.size,
    templates: Object.keys(scriptTemplates),
    tilesWithScripts: Array.from(tileScripts.keys())
  };
}

/**
 * Console command
 */
function showScriptStatus() {
  const info = getScriptDebugInfo();
  console.log('%c=== SCRIPT SYSTEM STATUS ===', 'color: #ff88ff; font-weight: bold;');
  console.log(`Total tile scripts: ${info.totalScripts}`);
  console.log(`Available templates: ${info.templates.join(', ')}`);
  if (info.tilesWithScripts.length > 0) {
    console.log('Tiles with scripts:', info.tilesWithScripts);
  }
  return info;
}

// ============================================
// BUILT-IN SCRIPT HANDLERS (unified from trigger_system.js)
// Native engine scripts that work without external .scripts.js files.
// If window.levelScripts[id] exists, the external script takes priority.
// Otherwise, these built-in handlers execute using native engine APIs.
// ============================================
const _builtInScripts = {
  player_start: function(ctx, tile) {
    ctx.log('Player start position.');
  },
  ambient_change: function(ctx, tile) {
    ctx.log('Switching to night time...');
    ctx.setNightTime(2000);
  },
  weather_change: function(ctx, tile) {
    ctx.log('It starts to rain...');
    ctx.startRain();
  },
  ambient_day: function(ctx, tile) {
    ctx.log('Switching to day time...');
    ctx.setDayTime(2000);
  },
  weather_snow: function(ctx, tile) {
    ctx.log('It starts to snow...');
    ctx.startSnow();
  },
  weather_stop: function(ctx, tile) {
    ctx.log('Weather clears up...');
    ctx.stopRain();
    ctx.stopSnow();
    ctx.stopLeaves();
  },
  damage_zone: function(ctx, tile) {
    ctx.damagePlayer(tile.damage || 10);
    ctx.log('Player took damage!');
  },
  heal_zone: function(ctx, tile) {
    ctx.healPlayer(tile.healAmount || 25);
    ctx.log('Player healed!');
  },
  screen_shake: function(ctx, tile) {
    ctx.shakeCamera(tile.strength || 5, tile.duration || 300);
    ctx.log('Camera shake!');
  },
  show_message: function(ctx, tile) {
    ctx.showMessage(tile.message || tile.scriptPrompt || 'Hello!', tile.duration || 3);
  },
  change_map: function(ctx, tile) {
    const mapName = tile.mapName || tile.scriptPrompt || '';
    if (!mapName) { ctx.log('change_map: no mapName specified'); return; }
    ctx.changeMap(mapName, tile.spawnX, tile.spawnY, tile.transition || 'fade');
  }
};

/**
 * Resolve a script function for a given scriptId.
 * Priority: window.levelScripts[id] > _builtInScripts[id]
 * @param {string} scriptId 
 * @returns {Function|null}
 */
function resolveScript(scriptId) {
  // External scripts take priority
  const ext = window.levelScripts && window.levelScripts[scriptId];
  if (ext && typeof ext === 'function') return ext;
  // Fall back to built-in
  const builtin = _builtInScripts[scriptId];
  if (builtin && typeof builtin === 'function') return builtin;
  return null;
}

// Export for console
console.log('%c[Script System] Loaded', 'color: #ff88ff; font-weight: bold;');
console.log('Commands: showScriptStatus(), getScriptTemplates(), resolveScript(id)');
console.log('Apply script: applyScriptTemplate(x, y, "template_name", {config})');
