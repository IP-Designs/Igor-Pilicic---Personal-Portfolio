// ============================================
// CONTROL SCHEME DEFINITIONS
// Centralized control bindings for consistency across UI, input, and documentation
// ============================================

console.log('[CONTROLS] Loading control scheme definitions...');

const CONTROLS = {
  // ===== UNIVERSAL CONTROLS =====
  ESCAPE: {
    key: 'Escape',
    keyCode: 27,
    description: 'Close modal / Exit selection mode',
    mode: 'both',
    action: 'closeModal'
  },
  
  // ===== GAME MODE CONTROLS =====
  INTERACT: {
    key: 'E',
    description: 'Interact with objects (doors, buttons, triggers)',
    mode: 'game',
    action: 'handleInteraction'
  },
  MOVE_UP: {
    key: 'Arrow Up',
    keyCode: 38,
    description: 'Move player up',
    mode: 'game',
    action: 'movePlayer'
  },
  MOVE_DOWN: {
    key: 'Arrow Down',
    keyCode: 40,
    description: 'Move player down',
    mode: 'game',
    action: 'movePlayer'
  },
  MOVE_LEFT: {
    key: 'Arrow Left',
    keyCode: 37,
    description: 'Move player left',
    mode: 'game',
    action: 'movePlayer'
  },
  MOVE_RIGHT: {
    key: 'Arrow Right',
    keyCode: 39,
    description: 'Move player right',
    mode: 'game',
    action: 'movePlayer'
  },
  JUMP: {
    key: 'Space',
    description: 'Jump (in game mode) / Reset camera (in edit mode)',
    mode: 'both',
    action: 'handleJump'
  },
  
  // ===== EDIT MODE CONTROLS =====
  TOGGLE_GRID: {
    key: 'G',
    description: 'Toggle grid visibility',
    mode: 'edit',
    action: 'toggleGrid'
  },
  TOGGLE_TILE_PANEL: {
    key: 'T',
    description: 'Toggle tile selection panel',
    mode: 'edit',
    action: 'toggleTilePanel'
  },
  ROTATE_TILE: {
    key: 'R',
    description: 'Rotate tile 90° clockwise',
    mode: 'edit',
    action: 'rotateTile'
  },
  RECTANGLE_MODE: {
    key: 'Shift+R',
    description: 'Toggle rectangle placement mode',
    mode: 'edit',
    action: 'toggleRectangleMode'
  },
  FLIP_TILE: {
    key: 'F',
    description: 'Cycle tile flip state (none→H→both→V)',
    mode: 'edit',
    action: 'flipTile'
  },
  SELECT_TOOL: {
    key: 'Q',
    description: 'Switch to selection tool',
    mode: 'edit',
    action: 'selectTool'
  },
  MOVE_TOOL: {
    key: 'M',
    description: 'Switch to move tool',
    mode: 'edit',
    action: 'moveTool'
  },
  TILE_TOOL: {
    key: '1',
    description: 'Switch to tile placement tool',
    mode: 'edit',
    action: 'tileTool'
  },
  CUT_SELECTION: {
    key: 'X',
    description: 'Cut selected tiles',
    mode: 'edit',
    action: 'cutSelection'
  },
  PASTE_SELECTION: {
    key: 'V',
    description: 'Paste cut tiles (legacy - use Ctrl+V)',
    mode: 'edit',
    action: 'pasteSelection'
  },
  COPY_CLIPBOARD: {
    key: 'Ctrl+C',
    description: 'Copy selected tiles to clipboard',
    mode: 'edit',
    action: 'copySelection'
  },
  PASTE_CLIPBOARD: {
    key: 'Ctrl+V',
    description: 'Paste tiles from clipboard at mouse position',
    mode: 'edit',
    action: 'pasteFromClipboard'
  },
  DELETE_TILES: {
    key: 'Delete',
    keyCode: 46,
    description: 'Enter delete mode to remove tiles',
    mode: 'edit',
    action: 'deleteMode'
  },
  FILL_TOOL: {
    key: 'B',
    description: 'Toggle bucket fill tool',
    mode: 'edit',
    action: 'toggleFillTool'
  },
  REPLACE_ALL: {
    key: 'Ctrl+H',
    description: 'Open replace all tiles modal',
    mode: 'edit',
    action: 'openReplaceAllModal'
  },
  
  // ===== PARTICLE EFFECTS =====
  TOGGLE_PARTICLES: {
    key: 'P',
    description: 'Toggle particle effects on/off',
    mode: 'both',
    action: 'toggleParticleEffects'
  },
  
  // ===== SYSTEM CONTROLS =====
  TOGGLE_LIGHTING: {
    key: 'O',
    description: 'Toggle lighting system',
    mode: 'edit',
    action: 'toggleLighting'
  },
  AMBIENT_LIGHT_MENU: {
    key: 'U',
    description: 'Open ambient light settings',
    mode: 'edit',
    action: 'openAmbientLightContext'
  },
  PAN_CAMERA: {
    key: 'Middle Mouse',
    description: 'Hold and drag to pan the editor viewport',
    mode: 'edit',
    action: 'panCamera'
  },
  ZOOM_CAMERA: {
    key: 'Scroll Wheel',
    description: 'Zoom the editor viewport in/out',
    mode: 'edit',
    action: 'zoomCamera'
  },
  TOGGLE_CAMERA_FOLLOW: {
    key: 'C',
    description: 'Toggle camera follow player',
    mode: 'game',
    action: 'toggleCameraFollow'
  },
  RUN: {
    key: 'Shift',
    description: 'Hold to run (1.6x speed)',
    mode: 'game',
    action: 'run'
  },
  
  // ===== UNDO/REDO =====
  TOGGLE_SNAP_GRID: {
    key: 'N',
    description: 'Toggle half-grid snapping (32px ↔ 16px)',
    mode: 'edit',
    action: 'toggleSnapGrid'
  },
  RESET_CAMERA: {
    key: 'Space',
    description: 'Reset camera to center',
    mode: 'edit',
    action: 'resetCameraToCenter'
  },
  WEATHER_MODAL: {
    key: 'U',
    description: 'Open weather & ambient light modal',
    mode: 'edit',
    action: 'toggleWeatherModal'
  },
  UNDO: {
    key: 'Ctrl+Z',
    description: 'Undo last tile action',
    mode: 'edit',
    action: 'undo'
  },
  REDO: {
    key: 'Ctrl+Y',
    description: 'Redo last undone action',
    mode: 'edit',
    action: 'redo'
  },
  REDO_ALT: {
    key: 'Ctrl+Shift+Z',
    description: 'Redo last undone action (alternative)',
    mode: 'edit',
    action: 'redo'
  },
  
  // ===== BRUSH CONTROLS =====
  BRUSH_DECREASE: {
    key: '[',
    description: 'Decrease brush size',
    mode: 'edit',
    action: 'changeBrushRadius'
  },
  BRUSH_INCREASE: {
    key: ']',
    description: 'Increase brush size',
    mode: 'edit',
    action: 'changeBrushRadius'
  },
  
  // ===== Z-LEVEL CONTROLS =====
  Z_LEVEL_UP: {
    key: 'PageUp',
    keyCode: 33,
    description: 'Show more layers (increase Z-level)',
    mode: 'edit',
    action: 'changeZLevel'
  },
  Z_LEVEL_DOWN: {
    key: 'PageDown',
    keyCode: 34,
    description: 'Hide top layers (decrease Z-level)',
    mode: 'edit',
    action: 'changeZLevel'
  },
  
  // ===== MOUSE CONTROLS =====
  EYEDROPPER: {
    key: 'Middle Click',
    description: 'Pick tile from map (without dragging)',
    mode: 'edit',
    action: 'eyedropperPickTile'
  },
  
  // ===== FILL & REPLACE TOOLS =====
  FILL_TOOL: {
    key: 'B',
    description: 'Toggle fill tool (bucket), click to flood-fill',
    mode: 'edit',
    action: 'toggleFillTool'
  },
  REPLACE_ALL: {
    key: 'Ctrl+H',
    description: 'Open Replace All dialog to swap tile types',
    mode: 'edit',
    action: 'openReplaceAllModal'
  },
  EDIT_SIGNPOST: {
    key: 'Shift+Click',
    description: 'Edit signpost text (on signpost tile)',
    mode: 'edit',
    action: 'openSignpostEditor'
  },
  
  // ===== UI CONTROLS =====
  CONFIRM: {
    key: 'Enter',
    keyCode: 13,
    description: 'Confirm action / Interact (alternative)',
    mode: 'both',
    action: 'confirm'
  },
  TOGGLE_HUD: {
    key: 'H',
    description: 'Toggle HUD visibility',
    mode: 'game',
    action: 'toggleHUD'
  },
  DIALOG_ADVANCE: {
    key: 'Space',
    description: 'Advance dialog / confirm choice',
    mode: 'game',
    action: 'dialogAdvance'
  },
  TOGGLE_INVENTORY: {
    key: 'I',
    description: 'Open/close inventory',
    mode: 'game',
    action: 'toggleInventory'
  },
  ATTACK: {
    key: 'F',
    description: 'Melee attack',
    mode: 'game',
    action: 'attack'
  },
  BUILD_MODE: {
    key: 'B',
    description: 'Toggle construction mode',
    mode: 'game',
    action: 'buildMode'
  },
  THROW_ITEM: {
    key: 'T',
    description: 'Throw held item in facing direction',
    mode: 'game',
    action: 'throwItem'
  },
  USE_ITEM: {
    key: 'E',
    description: 'Use/consume active hotbar item',
    mode: 'game',
    action: 'useItem'
  },
  HOTBAR_1: { key: '1', keyCode: 49, description: 'Select hotbar slot 1', mode: 'game', action: 'hotbarSelect' },
  HOTBAR_2: { key: '2', keyCode: 50, description: 'Select hotbar slot 2', mode: 'game', action: 'hotbarSelect' },
  HOTBAR_3: { key: '3', keyCode: 51, description: 'Select hotbar slot 3', mode: 'game', action: 'hotbarSelect' },
  HOTBAR_4: { key: '4', keyCode: 52, description: 'Select hotbar slot 4', mode: 'game', action: 'hotbarSelect' },
  HOTBAR_5: { key: '5', keyCode: 53, description: 'Select hotbar slot 5', mode: 'game', action: 'hotbarSelect' },
  TOGGLE_DEBUG: {
    key: 'F3',
    keyCode: 114,
    description: 'Toggle debug overlay',
    mode: 'both',
    action: 'toggleDebug'
  },
};

// Get all keys used in the game
function getAllControlKeys() {
  return Object.entries(CONTROLS).map(([name, control]) => ({
    name,
    key: control.key,
    keyCode: control.keyCode,
    mode: control.mode
  }));
}

// Get controls for a specific mode
function getControlsForMode(mode) {
  return Object.entries(CONTROLS)
    .filter(([_, control]) => control.mode === mode || control.mode === 'both')
    .map(([name, control]) => ({ name, ...control }));
}

// Generate human-readable control documentation
function generateControlDocumentation() {
  let doc = '# Game Controls\n\n';
  doc += '> **Auto-generated from controls.js** - Do not edit manually!\n\n';
  doc += `> Last updated: ${new Date().toISOString().split('T')[0]}\n\n`;
  
  const modes = ['game', 'edit', 'both'];
  const modeLabels = { 'game': '🎮 Game Mode', 'edit': '🛠️ Edit Mode', 'both': '🔄 Universal (Both Modes)' };
  
  modes.forEach(mode => {
    doc += `## ${modeLabels[mode]}\n\n`;
    doc += '| Key | Action | Description |\n';
    doc += '|-----|--------|-------------|\n';
    
    const controls = Object.entries(CONTROLS)
      .filter(([_, control]) => control.mode === mode)
      .map(([name, control]) => ({ name, ...control }));
    
    controls.forEach(control => {
      doc += `| \`${control.key}\` | ${control.name} | ${control.description} |\n`;
    });
    
    doc += '\n';
  });
  
  // Add quick reference section
  doc += '## 🎯 Quick Reference\n\n';
  doc += '| Action | Key |\n';
  doc += '|--------|-----|\n';
  doc += `| Interact with objects | \`${CONTROLS.INTERACT.key}\` |\n`;
  doc += `| Jump | \`${CONTROLS.JUMP.key}\` |\n`;
  doc += `| Toggle grid | \`${CONTROLS.TOGGLE_GRID.key}\` |\n`;
  doc += `| Rotate tile | \`${CONTROLS.ROTATE_TILE.key}\` |\n`;
  doc += `| Flip tile | \`${CONTROLS.FLIP_TILE.key}\` |\n`;
  doc += `| Delete mode | \`${CONTROLS.DELETE_TILES.key}\` |\n`;
  doc += `| Cancel/Close | \`${CONTROLS.ESCAPE.key}\` |\n`;
  
  return doc;
}

// Download documentation as markdown file (browser)
function downloadControlDocumentation() {
  const doc = generateControlDocumentation();
  const blob = new Blob([doc], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'CONTROLS.md';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.log('[CONTROLS] Downloaded CONTROLS.md');
  return doc;
}

// Print documentation to console
function printControlDocumentation() {
  const doc = generateControlDocumentation();
  console.log(doc);
  console.log('[CONTROLS] Run downloadControlDocumentation() to save as file');
  return doc;
}

// Validate control consistency
function validateControlConsistency() {
  const issues = [];
  const usedKeys = new Map();
  
  Object.entries(CONTROLS).forEach(([name, control]) => {
    // Check for missing properties
    if (!control.key) {
      issues.push(`ERROR: Control "${name}" missing 'key' property`);
    }
    if (!control.description) {
      issues.push(`ERROR: Control "${name}" missing 'description' property`);
    }
    if (!control.mode) {
      issues.push(`ERROR: Control "${name}" missing 'mode' property`);
    }
    if (!control.action) {
      issues.push(`WARN: Control "${name}" missing 'action' property (documentation only)`);
    }
    
    // Check for duplicate key bindings (same key in same mode)
    const keyId = `${control.key}_${control.mode}`;
    if (usedKeys.has(keyId)) {
      const other = usedKeys.get(keyId);
      issues.push(`ERROR: Duplicate key binding - "${control.key}" used by both "${name}" and "${other}" in ${control.mode} mode`);
    }
    usedKeys.set(keyId, name);
  });
  
  return {
    isValid: issues.filter(i => i.startsWith('ERROR')).length === 0,
    issues
  };
}

// ===== HELPER FUNCTIONS FOR UI =====

/**
 * Get the display key for a control action
 * @param {string} action - The action name (e.g., 'INTERACT', 'JUMP')
 * @returns {string} The key to display (e.g., 'E', 'Space')
 */
function getControlKey(action) {
  const control = CONTROLS[action];
  return control ? control.key : action;
}

/**
 * Generate an interaction message for a tile type
 * Uses centralized INTERACT key to ensure consistency
 * @param {string} verb - The action verb (e.g., 'toggle', 'open', 'close')
 * @param {string} objectName - The object being interacted with (e.g., 'door', 'switch')
 * @returns {string} The formatted message (e.g., 'Press E to toggle door')
 */
function getInteractionMessage(verb, objectName) {
  return `Press ${CONTROLS.INTERACT.key} to ${verb} ${objectName}`;
}

/**
 * Generate tooltip hint text using centralized control
 * @param {string} action - The action name from CONTROLS (e.g., 'INTERACT')
 * @param {string} description - What happens when pressed
 * @returns {string} Formatted hint (e.g., 'Press E to interact')
 */
function getControlHint(action, description) {
  const key = getControlKey(action);
  return `Press ${key} to ${description}`;
}

// ===== DATA-DRIVEN KEY MATCHING =====
// Maps CONTROLS key-names that don't correspond to single characters to
// the values p5.js exposes via its global `key` / `keyCode` variables.
const _SPECIAL_KEYS = {
  'Space':     { key: ' ' },
  'Escape':    { key: 'Escape', keyCode: 27 },
  'Enter':     { key: 'Enter',  keyCode: 13 },
  'Delete':    { keyCode: 46 },
  'PageUp':    { keyCode: 33 },
  'PageDown':  { keyCode: 34 },
  'Backspace': { keyCode: 8 },
  'Tab':       { keyCode: 9 },
};

/**
 * Check whether the **current** p5.js key-event matches a named control.
 *
 * Call this inside `keyPressed()` or `keyReleased()` - it reads the p5
 * globals `key`, `keyCode` and `keyIsDown()` that are set automatically
 * by the framework for the active event.
 *
 * Modifier requirements (Ctrl / Shift) are enforced bi-directionally:
 *   • If the binding says "Ctrl+Z", plain "Z" will NOT match.
 *   • If the binding says "Z" (no modifier), "Ctrl+Z" will NOT match.
 *
 * @param {string} controlName  Key in the CONTROLS object, e.g. 'TOGGLE_GRID'
 * @returns {boolean}
 */
function matchesKey(controlName) {
  const control = CONTROLS[controlName];
  if (!control) return false;

  const binding = control.key;

  // --- parse modifier+key  e.g. "Ctrl+Shift+Z" → mods=['Ctrl','Shift'], baseKey='Z' ---
  const parts   = binding.split('+');
  const baseKey  = parts.pop();                       // last segment
  const needsCtrl  = parts.includes('Ctrl');
  const needsShift = parts.includes('Shift');

  // strict modifier matching (both directions)
  if (needsCtrl  !== !!keyIsDown(CONTROL)) return false;
  if (needsShift !== !!keyIsDown(SHIFT))   return false;

  // --- key / keyCode comparison ---

  // 1. Explicit keyCode on the control definition wins
  if (control.keyCode != null) {
    return keyCode === control.keyCode;
  }

  // 2. Special-key name mapping (Space → ' ', Delete → 46, etc.)
  const special = _SPECIAL_KEYS[baseKey];
  if (special) {
    if (special.keyCode != null) return keyCode === special.keyCode;
    if (special.key    != null) return key === special.key;
  }

  // 3. Regular character - case-insensitive
  return key.toLowerCase() === baseKey.toLowerCase();
}

// Expose globally
window.CONTROLS = CONTROLS;
window.getAllControlKeys = getAllControlKeys;
window.getControlsForMode = getControlsForMode;
window.generateControlDocumentation = generateControlDocumentation;
window.validateControlConsistency = validateControlConsistency;
window.getControlKey = getControlKey;
window.getInteractionMessage = getInteractionMessage;
window.getControlHint = getControlHint;
window.matchesKey = matchesKey;

// Run validation on load
console.log('[CONTROLS] Validating control scheme...');
const validation = validateControlConsistency();
if (validation.isValid) {
  console.log('[CONTROLS] ✓ All controls validated successfully');
} else {
  console.warn('[CONTROLS] Issues found:', validation.issues);
  validation.issues.forEach(issue => console.warn(`  ${issue}`));
}

// ===== AUTO-POPULATE CONTROL KEY PLACEHOLDERS IN UI =====
// Call this after DOM is ready to fill in any <span class="control-key-*"> elements
function populateControlKeyPlaceholders() {
  // Map CSS class suffixes to CONTROLS keys
  const classToControl = {
    'interact': 'INTERACT',
    'jump': 'JUMP',
    'escape': 'ESCAPE',
    'confirm': 'CONFIRM',
    'grid': 'TOGGLE_GRID',
    'rotate': 'ROTATE_TILE',
    'flip': 'FLIP_TILE',
    'delete': 'DELETE_TILES'
  };
  
  Object.entries(classToControl).forEach(([suffix, controlName]) => {
    const elements = document.querySelectorAll(`.control-key-${suffix}`);
    const key = CONTROLS[controlName] ? CONTROLS[controlName].key : suffix.toUpperCase();
    elements.forEach(el => {
      el.textContent = key;
    });
  });
  
}

// Auto-run when DOM is ready (if in browser context)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateControlKeyPlaceholders);
  } else {
    // DOM already ready - run after a microtask to ensure all modals are created
    setTimeout(populateControlKeyPlaceholders, 100);
  }
  
  // Debounced observer for dynamically created modals - only re-populate
  // when real UI elements are added, not on every canvas frame
  let _controlsDebounceTimer = null;
  const observer = new MutationObserver((mutations) => {
    // Only trigger for actual HTML element additions (not canvas/text nodes)
    const hasRelevantNode = mutations.some(m =>
      Array.from(m.addedNodes).some(n => n.nodeType === 1 && n.tagName !== 'CANVAS')
    );
    if (!hasRelevantNode) return;
    
    if (_controlsDebounceTimer) clearTimeout(_controlsDebounceTimer);
    _controlsDebounceTimer = setTimeout(populateControlKeyPlaceholders, 300);
  });
  
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

window.populateControlKeyPlaceholders = populateControlKeyPlaceholders;
window.downloadControlDocumentation = downloadControlDocumentation;
window.printControlDocumentation = printControlDocumentation;

console.log('[CONTROLS] ✓ Control system loaded. Use printControlDocumentation() or downloadControlDocumentation() to generate docs.');
