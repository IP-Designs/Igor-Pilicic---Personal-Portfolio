// ============================================
// LOGIC SYSTEM - Timers, counters, gates, and signal propagation
// Provides advanced logic tile behaviors
// ============================================

// Logic tile state storage
const logicTileStates = new Map();

// Signal queue for propagation (prevents infinite loops)
let signalQueue = [];
let signalProcessing = false;

// Delta time tracking
let lastLogicUpdate = 0;

/**
 * Initialize logic system
 */
function initLogicSystem() {
  logicTileStates.clear();
  signalQueue = [];
  lastLogicUpdate = Date.now();
  console.log('%c[Logic System] Initialized', 'color: #00ff88; font-weight: bold;');
}

/**
 * Get or create state for a logic tile
 * @param {Object} tile - The tile object
 * @returns {Object} State object for the tile
 */
function getLogicState(tile) {
  const key = `${tile.x},${tile.y}`;
  if (!logicTileStates.has(key)) {
    logicTileStates.set(key, createInitialState(tile));
  }
  return logicTileStates.get(key);
}

/**
 * Create initial state based on tile type
 * @param {Object} tile - The tile object
 * @returns {Object} Initial state
 */
function createInitialState(tile) {
  const def = typeof getTileDefinition === 'function' ? getTileDefinition(tile.type) : null;
  
  switch (tile.logicType || (def && def.logicType)) {
    case 'timer':
      return {
        active: false,
        timeRemaining: 0,
        delay: tile.delay || (def && def.delay) || 1.0,
        pendingSignal: null
      };
    
    case 'counter':
      return {
        count: 0,
        threshold: tile.threshold || (def && def.threshold) || 3,
        resetOnTrigger: tile.resetOnTrigger !== undefined ? tile.resetOnTrigger : 
                       (def && def.resetOnTrigger !== undefined ? def.resetOnTrigger : true),
        triggered: false
      };
    
    case 'and_gate':
      return {
        inputs: {},
        inputCount: tile.inputCount || (def && def.inputCount) || 2,
        output: false
      };
    
    case 'or_gate':
      return {
        inputs: {},
        inputCount: tile.inputCount || (def && def.inputCount) || 2,
        output: false
      };
    
    case 'not_gate':
      return {
        input: false,
        output: true // NOT gate starts with true output when input is false
      };
    
    case 'toggle':
      return {
        state: tile.startState || (def && def.startState) || false
      };
    
    case 'relay':
      return {
        lastSignal: null
      };
    
    case 'teleporter':
      return {
        cooldownRemaining: 0,
        cooldown: tile.cooldown || (def && def.cooldown) || 1.0
      };
    
    default:
      return {};
  }
}

/**
 * Send a signal to a logic tile
 * @param {Object} tile - Target tile
 * @param {string} signal - Signal type: 'activate', 'deactivate', 'toggle'
 * @param {string} inputId - Optional input identifier (for gates)
 */
function sendSignal(tile, signal, inputId = 'default') {
  signalQueue.push({ tile, signal, inputId, timestamp: Date.now() });
  
  if (!signalProcessing) {
    processSignalQueue();
  }
}

/**
 * Process all queued signals
 */
function processSignalQueue() {
  signalProcessing = true;
  let iterations = 0;
  const maxIterations = 100; // Prevent infinite loops
  
  while (signalQueue.length > 0 && iterations < maxIterations) {
    const { tile, signal, inputId } = signalQueue.shift();
    handleSignal(tile, signal, inputId);
    iterations++;
  }
  
  if (iterations >= maxIterations) {
    console.warn('[Logic System] Max iterations reached, possible signal loop');
    signalQueue = [];
  }
  
  signalProcessing = false;
}

/**
 * Handle a signal on a logic tile
 * @param {Object} tile - The tile receiving the signal
 * @param {string} signal - The signal type
 * @param {string} inputId - Input identifier
 */
function handleSignal(tile, signal, inputId) {
  const def = typeof getTileDefinition === 'function' ? getTileDefinition(tile.type) : null;
  const logicType = tile.logicType || (def && def.logicType) || tile.type;
  
  // Check if this is actually a logic tile
  const isLogic = tile.isLogic || (def && def.isLogic) || 
                  ['timer', 'counter', 'and_gate', 'or_gate', 'not_gate', 'toggle', 'relay', 'teleporter'].includes(logicType);
  
  if (!isLogic) {
    // Not a logic tile - interact with it directly (doors, switches, etc.)
    // Use isTriggeredByLink=true to prevent re-propagation loops
    if (signal === 'activate' || signal === 'toggle') {
      if (typeof interactWithTile === 'function') {
        interactWithTile(tile, true);
      }
    }
    return;
  }
  
  const state = getLogicState(tile);
  
  switch (logicType) {
    case 'timer':
      handleTimerSignal(tile, state, signal);
      break;
    
    case 'counter':
      handleCounterSignal(tile, state, signal);
      break;
    
    case 'and_gate':
      handleAndGateSignal(tile, state, signal, inputId);
      break;
    
    case 'or_gate':
      handleOrGateSignal(tile, state, signal, inputId);
      break;
    
    case 'not_gate':
      handleNotGateSignal(tile, state, signal);
      break;
    
    case 'toggle':
      handleToggleSignal(tile, state, signal);
      break;
    
    case 'relay':
      handleRelaySignal(tile, state, signal);
      break;
    
    case 'teleporter':
      handleTeleporterSignal(tile, state, signal);
      break;
  }
}

// ============================================
// TIMER
// ============================================
function handleTimerSignal(tile, state, signal) {
  if (signal === 'activate') {
    state.active = true;
    state.timeRemaining = state.delay;
    state.pendingSignal = 'activate';
    console.log(`[Timer] Started ${state.delay}s delay at (${tile.x}, ${tile.y})`);
  } else if (signal === 'deactivate') {
    state.active = false;
    state.pendingSignal = null;
  }
}

// ============================================
// COUNTER
// ============================================
function handleCounterSignal(tile, state, signal) {
  if (signal === 'activate') {
    state.count++;
    console.log(`[Counter] Count: ${state.count}/${state.threshold} at (${tile.x}, ${tile.y})`);
    
    if (state.count >= state.threshold) {
      state.triggered = true;
      propagateOutput(tile, 'activate');
      
      if (state.resetOnTrigger) {
        state.count = 0;
        state.triggered = false;
      }
    }
  } else if (signal === 'reset') {
    state.count = 0;
    state.triggered = false;
    console.log(`[Counter] Reset at (${tile.x}, ${tile.y})`);
  }
}

// ============================================
// AND GATE
// ============================================
function handleAndGateSignal(tile, state, signal, inputId) {
  if (signal === 'activate') {
    state.inputs[inputId] = true;
  } else if (signal === 'deactivate') {
    state.inputs[inputId] = false;
  }
  
  // Check if all inputs are active
  const activeInputs = Object.values(state.inputs).filter(v => v === true).length;
  const newOutput = activeInputs >= state.inputCount;
  
  if (newOutput !== state.output) {
    state.output = newOutput;
    propagateOutput(tile, newOutput ? 'activate' : 'deactivate');
    console.log(`[AND Gate] Output: ${newOutput} (${activeInputs}/${state.inputCount} inputs) at (${tile.x}, ${tile.y})`);
  }
}

// ============================================
// OR GATE
// ============================================
function handleOrGateSignal(tile, state, signal, inputId) {
  if (signal === 'activate') {
    state.inputs[inputId] = true;
  } else if (signal === 'deactivate') {
    state.inputs[inputId] = false;
  }
  
  // Check if any input is active
  const hasActiveInput = Object.values(state.inputs).some(v => v === true);
  
  if (hasActiveInput !== state.output) {
    state.output = hasActiveInput;
    propagateOutput(tile, hasActiveInput ? 'activate' : 'deactivate');
    console.log(`[OR Gate] Output: ${hasActiveInput} at (${tile.x}, ${tile.y})`);
  }
}

// ============================================
// NOT GATE
// ============================================
function handleNotGateSignal(tile, state, signal) {
  if (signal === 'activate') {
    state.input = true;
    state.output = false;
  } else if (signal === 'deactivate') {
    state.input = false;
    state.output = true;
  }
  
  propagateOutput(tile, state.output ? 'activate' : 'deactivate');
  console.log(`[NOT Gate] Output: ${state.output} at (${tile.x}, ${tile.y})`);
}

// ============================================
// TOGGLE
// ============================================
function handleToggleSignal(tile, state, signal) {
  if (signal === 'activate' || signal === 'toggle') {
    state.state = !state.state;
    propagateOutput(tile, state.state ? 'activate' : 'deactivate');
    console.log(`[Toggle] State: ${state.state} at (${tile.x}, ${tile.y})`);
  }
}

// ============================================
// RELAY
// ============================================
function handleRelaySignal(tile, state, signal) {
  state.lastSignal = signal;
  propagateOutput(tile, signal);
  console.log(`[Relay] Forwarding '${signal}' from (${tile.x}, ${tile.y})`);
}

// ============================================
// TELEPORTER
// ============================================
function handleTeleporterSignal(tile, state, signal) {
  if (signal !== 'activate' && signal !== 'teleport') return;
  
  if (state.cooldownRemaining > 0) {
    console.log(`[Teleporter] On cooldown at (${tile.x}, ${tile.y})`);
    return;
  }
  
  // Find linked teleporter
  if (tile.linkId) {
    const linkedTiles = typeof getInteractiveTilesByLinkId === 'function' 
      ? getInteractiveTilesByLinkId(tile.linkId) 
      : [];
    
    // Find another teleporter with same linkId
    const destination = linkedTiles.find(t => 
      t.type === 'teleporter' && (t.x !== tile.x || t.y !== tile.y)
    );
    
    if (destination) {
      teleportPlayer(destination.x, destination.y);
      state.cooldownRemaining = state.cooldown;
      
      // Set cooldown on destination too
      const destState = getLogicState(destination);
      destState.cooldownRemaining = state.cooldown;
      
      console.log(`[Teleporter] Teleported player to (${destination.x}, ${destination.y})`);
    } else {
      console.log(`[Teleporter] No linked destination for linkId: ${tile.linkId}`);
    }
  }
}

/**
 * Teleport player to position
 * @param {number} x - Grid X
 * @param {number} y - Grid Y
 */
function teleportPlayer(x, y) {
  if (typeof playerX !== 'undefined' && typeof playerY !== 'undefined') {
    const tileSize = typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32;
    window.playerX = x * tileSize + tileSize / 2;
    window.playerY = y * tileSize + tileSize / 2;
    
    // Visual effect
    if (typeof createEntity === 'function') {
      createEntity('particle_burst', playerX, playerY, { color: [150, 0, 255], count: 20 });
    }
  }
}

/**
 * Propagate output signal to linked tiles
 * @param {Object} sourceTile - The tile sending the signal
 * @param {string} signal - The signal to propagate
 */
function propagateOutput(sourceTile, signal) {
  // Propagate to tiles with same activationId
  if (sourceTile.activationId !== undefined && sourceTile.activationId !== null) {
    const linkedTiles = typeof getTilesByActivationId === 'function' 
      ? getTilesByActivationId(sourceTile.activationId) 
      : [];
    
    for (const tile of linkedTiles) {
      if (tile.x !== sourceTile.x || tile.y !== sourceTile.y) {
        sendSignal(tile, signal, `from_${sourceTile.x}_${sourceTile.y}`);
      }
    }
  }
  
  // Propagate to tiles with same linkId
  if (sourceTile.linkId) {
    const linkedTiles = typeof getInteractiveTilesByLinkId === 'function' 
      ? getInteractiveTilesByLinkId(sourceTile.linkId) 
      : [];
    
    for (const tile of linkedTiles) {
      if (tile.x !== sourceTile.x || tile.y !== sourceTile.y) {
        sendSignal(tile, signal, `from_${sourceTile.x}_${sourceTile.y}`);
      }
    }
  }
}

/**
 * Update logic system - call every frame
 * @param {number} deltaTime - Time since last frame in seconds
 */
function updateLogicSystem(deltaTime) {
  if (!deltaTime) {
    const now = Date.now();
    deltaTime = (now - lastLogicUpdate) / 1000;
    lastLogicUpdate = now;
  }
  
  // Update all timer and teleporter cooldowns
  for (const [key, state] of logicTileStates) {
    // Timer updates
    if (state.active && state.timeRemaining > 0) {
      state.timeRemaining -= deltaTime;
      
      if (state.timeRemaining <= 0) {
        state.active = false;
        const [x, y] = key.split(',').map(Number);
        const tile = findLogicTileAt(x, y);
        
        if (tile && state.pendingSignal) {
          console.log(`[Timer] Completed at (${x}, ${y}), propagating signal`);
          propagateOutput(tile, state.pendingSignal);
          state.pendingSignal = null;
        }
      }
    }
    
    // Teleporter cooldown updates
    if (state.cooldownRemaining > 0) {
      state.cooldownRemaining -= deltaTime;
    }
  }
}

/**
 * Find a logic tile at position
 * @param {number} x - Grid X
 * @param {number} y - Grid Y
 * @returns {Object|null} The tile or null
 */
function findLogicTileAt(x, y) {
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    return interactiveTiles.find(t => t.x === x && t.y === y && t.isLogic);
  }
  return null;
}

/**
 * Check if player is on a teleporter and trigger it
 */
function checkTeleporterCollision() {
  if (typeof editMode !== 'undefined' && editMode) return;
  if (typeof playerX === 'undefined' || typeof playerY === 'undefined') return;
  
  const tileSize = typeof GRID_SIZE !== 'undefined' ? GRID_SIZE : 32;
  const gridX = Math.floor(playerX / tileSize);
  const gridY = Math.floor(playerY / tileSize);
  
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    for (const tile of interactiveTiles) {
      if (tile.x === gridX && tile.y === gridY && tile.type === 'teleporter') {
        const state = getLogicState(tile);
        if (state.cooldownRemaining <= 0) {
          sendSignal(tile, 'teleport');
        }
        break;
      }
    }
  }
}

/**
 * Reset all logic states (call when loading a new level)
 */
function resetLogicSystem() {
  logicTileStates.clear();
  signalQueue = [];
  lastLogicUpdate = Date.now();
  console.log('[Logic System] Reset');
}

/**
 * Get debug info about logic system
 */
function getLogicDebugInfo() {
  const info = {
    totalStates: logicTileStates.size,
    activeTimers: 0,
    counters: [],
    gates: []
  };
  
  for (const [key, state] of logicTileStates) {
    if (state.active && state.timeRemaining > 0) {
      info.activeTimers++;
    }
    if (state.count !== undefined) {
      info.counters.push({ key, count: state.count, threshold: state.threshold });
    }
    if (state.output !== undefined) {
      info.gates.push({ key, output: state.output });
    }
  }
  
  return info;
}

/**
 * Console command to show logic status
 */
function showLogicStatus() {
  const info = getLogicDebugInfo();
  console.log('%c=== LOGIC SYSTEM STATUS ===', 'color: #00ff88; font-weight: bold;');
  console.log(`Total state objects: ${info.totalStates}`);
  console.log(`Active timers: ${info.activeTimers}`);
  console.log(`Counters: ${info.counters.length}`);
  console.log(`Gates: ${info.gates.length}`);
  return info;
}

// Export for console
console.log('%c[Logic System] Loaded', 'color: #00ff88; font-weight: bold;');
console.log('Commands: showLogicStatus(), resetLogicSystem()');
