// ============================================
// TRIGGER SYSTEM - LEGACY COMPATIBILITY SHIM
// ============================================
// Event checking is now handled by the unified pipeline in
// interactive_tiles.js (checkAllTileEvents).
// resolveScript and _builtInScripts now live in script_system.js.
// This file keeps triggerRegistry + action executors for backward
// compatibility. New features should use interactive tiles + scriptId.
// ============================================

// Trigger registry - all triggers on current map
let triggerRegistry = {};
let triggerIdCounter = 0;

// Debug control for triggers
let triggerDebug = false;
function setTriggerDebug(enabled) {
  triggerDebug = !!enabled;
  console.log('[TRIGGER] Debug:', triggerDebug);
}

// Trigger state tracking
let triggeredStates = {}; // Track which triggers have fired (for one-time triggers)

console.log('[TRIGGER] Legacy compatibility shim loaded - event checking now in checkAllTileEvents()');

// Register a trigger
function registerTrigger(config) {
  const triggerId = config.id || `trigger_${triggerIdCounter++}`;
  
  const triggerData = {
    id: triggerId,
    position: config.position || { x: 0, y: 0 },
    tileType: config.tileType || 'trigger_zone',
    type: config.type || 'toggle_door', // Action type
    target: config.target || null, // Target entity/door/etc
    enabled: config.enabled !== false,
    oneTime: config.oneTime !== false, // Only trigger once?
    delay: config.delay || 0, // Milliseconds delay before executing
    cooldown: config.cooldown || 0, // Milliseconds before can trigger again
    lastTriggeredTime: 0,
    hasTriggered: false,
    parameters: config.parameters || {} // Extra data (e.g., damage amount, entity type)
  };
  
  triggerRegistry[triggerId] = triggerData;
  
  console.log(`[TRIGGER] registerTrigger() - Registered trigger: ${triggerId} at (${triggerData.position.x}, ${triggerData.position.y}). Action: ${triggerData.type}`);
  
  return triggerId;
}

// Fire a trigger
function fireTrigger(triggerId) {
  const trigger = triggerRegistry[triggerId];
  
  if (!trigger) {
    console.warn(`[TRIGGER] fireTrigger() - Trigger ${triggerId} not found`);
    return false;
  }
  
  if (!trigger.enabled) {
    console.log(`[TRIGGER] fireTrigger() - Trigger ${triggerId} is disabled`);
    return false;
  }
  
  // Check one-time constraint
  if (trigger.oneTime && trigger.hasTriggered) {
    console.log(`[TRIGGER] fireTrigger() - Trigger ${triggerId} already fired (one-time)`);
    return false;
  }
  
  // Check cooldown
  if (trigger.cooldown > 0) {
    const timeSinceLastTrigger = Date.now() - trigger.lastTriggeredTime;
    if (timeSinceLastTrigger < trigger.cooldown) {
      console.log(`[TRIGGER] fireTrigger() - Trigger ${triggerId} in cooldown (${trigger.cooldown}ms)`);
      return false;
    }
  }
  
  // Execute with delay if specified
  if (trigger.delay > 0) {
    setTimeout(() => {
      executeTriggerAction(trigger);
    }, trigger.delay);
  } else {
    executeTriggerAction(trigger);
  }
  
  trigger.lastTriggeredTime = Date.now();
  trigger.hasTriggered = true;
  
  console.log(`[TRIGGER] fireTrigger() - Fired trigger ${triggerId}. Action: ${trigger.type}`);
  
  return true;
}

// Execute trigger action
function executeTriggerAction(trigger) {
  console.log(`[TRIGGER] executeTriggerAction() - Executing ${trigger.type} on target ${trigger.target}`);
  
  switch (trigger.type) {
    case 'toggle_door':
      executeTrigger_ToggleDoor(trigger);
      break;
      
    case 'open_door':
      executeTrigger_OpenDoor(trigger);
      break;
      
    case 'close_door':
      executeTrigger_CloseDoor(trigger);
      break;
      
    case 'damage_entity':
      executeTrigger_DamageEntity(trigger);
      break;
      
    case 'kill_entity':
      executeTrigger_KillEntity(trigger);
      break;
      
    case 'heal_entity':
      executeTrigger_HealEntity(trigger);
      break;
      
    case 'spawn_entity':
      executeTrigger_SpawnEntity(trigger);
      break;
      
    case 'teleport_player':
      executeTrigger_TeleportPlayer(trigger);
      break;
      
    case 'set_checkpoint':
      executeTrigger_SetCheckpoint(trigger);
      break;
      
    case 'win_level':
      executeTrigger_WinLevel(trigger);
      break;
      
    case 'toggle_switch':
      executeTrigger_ToggleSwitch(trigger);
      break;
      
    case 'change_map':
      executeTrigger_ChangeMap(trigger);
      break;
      
    default:
      console.warn(`[TRIGGER] executeTriggerAction() - Unknown trigger type: ${trigger.type}`);
  }
}

// Trigger action: Toggle door
function executeTrigger_ToggleDoor(trigger) {
  if (!trigger.target) return;
  
  const x = trigger.parameters.x;
  const y = trigger.parameters.y;
  
  if (typeof toggleDoorState === 'function') {
    const newState = toggleDoorState(x, y);
    console.log(`[TRIGGER] Toggle door at (${x}, ${y}) to: ${newState}`);
  }
}

// Trigger action: Open door
function executeTrigger_OpenDoor(trigger) {
  if (!trigger.target) return;
  
  const x = trigger.parameters.x;
  const y = trigger.parameters.y;
  
  if (typeof setDoorState === 'function') {
    setDoorState(x, y, 'open');
    console.log(`[TRIGGER] Door at (${x}, ${y}) opened`);
  }
}

// Trigger action: Close door
function executeTrigger_CloseDoor(trigger) {
  if (!trigger.target) return;
  
  const x = trigger.parameters.x;
  const y = trigger.parameters.y;
  
  if (typeof setDoorState === 'function') {
    setDoorState(x, y, 'closed');
    console.log(`[TRIGGER] Door at (${x}, ${y}) closed`);
  }
}

// Trigger action: Damage entity
function executeTrigger_DamageEntity(trigger) {
  if (!trigger.target) return;
  
  const amount = trigger.parameters.amount || 10;
  
  if (typeof damageEntity === 'function') {
    damageEntity(trigger.target, amount, trigger.id);
    console.log(`[TRIGGER] Entity ${trigger.target} damaged for ${amount}HP`);
  }
}

// Trigger action: Kill entity
function executeTrigger_KillEntity(trigger) {
  if (!trigger.target) return;
  
  if (typeof killEntity === 'function') {
    killEntity(trigger.target, trigger.id);
    console.log(`[TRIGGER] Entity ${trigger.target} killed`);
  }
}

// Trigger action: Heal entity
function executeTrigger_HealEntity(trigger) {
  if (!trigger.target) return;
  
  const amount = trigger.parameters.amount || 10;
  
  if (typeof healEntity === 'function') {
    healEntity(trigger.target, amount);
    console.log(`[TRIGGER] Entity ${trigger.target} healed for ${amount}HP`);
  }
}

// Trigger action: Spawn entity (placeholder)
function executeTrigger_SpawnEntity(trigger) {
  console.log(`[TRIGGER] SpawnEntity action: ${trigger.target} at (${trigger.parameters.x}, ${trigger.parameters.y})`);
  // TODO: Implement entity spawning
}

// Trigger action: Teleport player
function executeTrigger_TeleportPlayer(trigger) {
  const x = trigger.parameters.x;
  const y = trigger.parameters.y;
  
  if (typeof player !== 'undefined' && player) {
    player.x = x;
    player.y = y;
    player.vx = 0;
    player.vy = 0;
    console.log(`[TRIGGER] Player teleported to (${x}, ${y})`);
  }
}

// Trigger action: Set checkpoint
function executeTrigger_SetCheckpoint(trigger) {
  const x = trigger.parameters.x || trigger.position.x;
  const y = trigger.parameters.y || trigger.position.y;
  
  if (typeof setRespawnPoint === 'function') {
    setRespawnPoint(x, y);
    console.log(`[TRIGGER] Checkpoint set at (${x}, ${y})`);
  }
}

// Trigger action: Win level
function executeTrigger_WinLevel(trigger) {
  console.log('[TRIGGER] WIN LEVEL triggered!');
  gameState = 'won';
  if (typeof updateGameStatus === 'function') {
    updateGameStatus('LEVEL COMPLETE!', 'success');
  }
}

// Trigger action: Toggle switch
function executeTrigger_ToggleSwitch(trigger) {
  console.log(`[TRIGGER] Switch ${trigger.target} toggled`);
  // TODO: Implement switch toggling logic
}

// Trigger action: Change map (load a different level)
// Routes through SceneManager for proper fade transitions and state caching.
function executeTrigger_ChangeMap(trigger) {
  const mapName = trigger.parameters.mapName || trigger.target;
  const spawnX = trigger.parameters.spawnX;
  const spawnY = trigger.parameters.spawnY;
  const transition = trigger.parameters.transition || 'fade';
  const fadeDuration = trigger.parameters.fadeDuration || 0.4;
  
  if (!mapName) {
    console.warn('[TRIGGER] ChangeMap: No map name specified');
    return;
  }
  
  console.log(`[TRIGGER] Changing to map: ${mapName}`);
  
  // Use SceneManager if available (proper transitions + state caching)
  if (typeof changeScene === 'function') {
    changeScene(mapName, {
      spawnX: spawnX,
      spawnY: spawnY,
      transition: transition,
      fadeDuration: fadeDuration
    });
    return;
  }
  
  // Fallback: raw loadMap (legacy, no caching or transitions)
  if (typeof loadMap === 'function') {
    loadMap(mapName);
    if (spawnX !== undefined && spawnY !== undefined) {
      setTimeout(function () {
        if (typeof player !== 'undefined' && player) {
          player.x = spawnX;
          player.y = spawnY;
          player.velocity = { x: 0, y: 0 };
          player.acceleration = { x: 0, y: 0 };
          console.log('[TRIGGER] Player spawned at (' + spawnX + ', ' + spawnY + ') on new map');
        }
      }, 100);
    }
  } else {
    console.warn('[TRIGGER] ChangeMap: No map loading function available');
  }
}

// ── Built-in scripts & resolveScript have moved to script_system.js ──
// The functions are still globally available since script_system.js loads
// before trigger_system.js is typically used. These comments mark the move.

// ── checkPlayerTriggers: LEGACY SHIM ──
// All event checking is now handled by checkAllTileEvents() in interactive_tiles.js.
// This function delegates to it for backward compatibility (engine.js calls it).
let _lastPlayerGrid = { x: null, y: null }; // kept for compat, no longer used internally

function checkPlayerTriggers() {
  // Delegate to the unified event pipeline
  if (typeof checkAllTileEvents === 'function') {
    checkAllTileEvents();
  }
}

// Get all triggers
function getAllTriggers() {
  return triggerRegistry;
}

// Get trigger by ID
function getTrigger(triggerId) {
  return triggerRegistry[triggerId];
}

// Update trigger
function updateTrigger(triggerId, config) {
  if (!triggerRegistry[triggerId]) return false;
  
  const trigger = triggerRegistry[triggerId];
  Object.assign(trigger, config);
  
  console.log(`[TRIGGER] updateTrigger() - Updated trigger ${triggerId}`);
  
  return true;
}

// Delete trigger
function deleteTrigger(triggerId) {
  if (triggerRegistry[triggerId]) {
    delete triggerRegistry[triggerId];
    console.log(`[TRIGGER] deleteTrigger() - Deleted trigger ${triggerId}`);
    return true;
  }
  return false;
}

// Reset all triggers (for level restart)
function resetAllTriggers() {
  for (let triggerId in triggerRegistry) {
    triggerRegistry[triggerId].hasTriggered = false;
    triggerRegistry[triggerId].lastTriggeredTime = 0;
  }
  console.log('[TRIGGER] resetAllTriggers() - All triggers reset');
}

// Clear all triggers
function clearAllTriggers() {
  triggerRegistry = {};
  triggerIdCounter = 0;
  console.log('[TRIGGER] clearAllTriggers() - All triggers cleared');
}

// Load triggers from JSON
function loadTriggersFromJSON(triggersData) {
  clearAllTriggers();
  
  if (!triggersData || !Array.isArray(triggersData)) {
    console.log('[TRIGGER] loadTriggersFromJSON() - No triggers to load');
    return;
  }
  
  for (let triggerData of triggersData) {
    registerTrigger(triggerData);
  }
  
  console.log(`[TRIGGER] loadTriggersFromJSON() - Loaded ${triggersData.length} triggers`);
}

// Export triggers to JSON
function exportTriggersToJSON() {
  const triggerArray = [];
  
  for (let triggerId in triggerRegistry) {
    const trigger = triggerRegistry[triggerId];
    triggerArray.push({
      id: trigger.id,
      position: trigger.position,
      tileType: trigger.tileType,
      type: trigger.type,
      target: trigger.target,
      enabled: trigger.enabled,
      oneTime: trigger.oneTime,
      delay: trigger.delay,
      cooldown: trigger.cooldown,
      parameters: trigger.parameters
    });
  }
  
  console.log(`[TRIGGER] exportTriggersToJSON() - Exported ${triggerArray.length} triggers`);
  
  return triggerArray;
}

// Get trigger debug info
function getTriggerDebugInfo() {
  const info = {
    totalTriggers: Object.keys(triggerRegistry).length,
    triggers: []
  };
  
  for (let triggerId in triggerRegistry) {
    const trigger = triggerRegistry[triggerId];
    info.triggers.push({
      id: trigger.id,
      position: trigger.position,
      type: trigger.type,
      target: trigger.target,
      enabled: trigger.enabled,
      hasTriggered: trigger.hasTriggered,
      lastTriggeredTime: trigger.lastTriggeredTime
    });
  }
  
  return info;
}

console.log('[TRIGGER] Legacy trigger system loaded - event checking now in checkAllTileEvents()');

// Expose debug helpers globally for quick console use
if (typeof window !== 'undefined') {
  try {
    window.setTriggerDebug = setTriggerDebug;
    // If engine exposes showDebugMarker, ensure it's accessible
    if (typeof showDebugMarker === 'function') window.showDebugMarker = showDebugMarker;
  } catch (e) {
    console.warn('Unable to attach trigger debug helpers to window:', e);
  }
}
