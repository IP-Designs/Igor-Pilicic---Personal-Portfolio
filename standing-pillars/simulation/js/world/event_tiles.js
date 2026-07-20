// ============================================
// Event Tiles System - LEGACY COMPATIBILITY SHIM
// ============================================
// Event checking is now handled by the unified pipeline in interactive_tiles.js
// (checkAllTileEvents). This file keeps the data store and drawing functions
// for backward compatibility with existing saved maps.
// New features should use interactive tiles + scriptId instead.
// ============================================

// Event tile system state
let eventTiles = {
  definitions: {},      // Event tile definitions
  placedEvents: {},     // Placed event tiles on the map
  activeEvents: [],     // Currently active/triggered events
  eventCounter: 0       // Unique ID counter for events
};

// Event tile definitions
eventTiles.definitions = {
  // Basic trigger tiles
  'trigger_zone': {
    name: 'Trigger Zone',
    category: 'EVENT',
    description: 'Invisible trigger activated when player enters',
    color: [255, 255, 0, 100], // Yellow transparent
    visible: false,  // Invisible in game, visible in editor
    shape: 'rectangle',
    aiTags: ['trigger', 'zone', 'player_enter']
  },
  
  'pressure_plate': {
    name: 'Pressure Plate',
    category: 'EVENT', 
    description: 'Activates when player steps on it',
    color: [150, 150, 150],
    visible: true,
    shape: 'circle',
    aiTags: ['trigger', 'step_on', 'mechanical']
  },
  
  'switch_lever': {
    name: 'Switch Lever',
    category: 'EVENT',
    description: 'Toggle switch activated by player interaction',
    color: [0, 255, 0],
    visible: true,
    shape: 'rectangle',
    states: ['off', 'on'],
    aiTags: ['switch', 'toggle', 'interact', 'door_controller']
  },
  
  'button_red': {
    name: 'Red Button',
    category: 'EVENT',
    description: 'Red button for activation events',
    color: [255, 0, 0],
    visible: true,
    shape: 'circle',
    aiTags: ['button', 'trigger', 'interact', 'red']
  },
  
  'button_blue': {
    name: 'Blue Button', 
    category: 'EVENT',
    description: 'Blue button for activation events',
    color: [0, 0, 255],
    visible: true,
    shape: 'circle',
    aiTags: ['button', 'trigger', 'interact', 'blue']
  }
};

// Place an event tile on the map
function placeEventTile(x, y, eventType) {
  // Check if event type is defined - if not, skip (might be handled by another system like interactive_tiles)
  if (!eventTiles.definitions[eventType]) {
    console.log(`Event type "${eventType}" not in eventTiles.definitions - may be handled by interactive_tiles system`);
    return null;
  }
  
  let eventId = `event_${eventTiles.eventCounter++}`;
  let eventData = {
    id: eventId,
    type: eventType,
    x: x,
    y: y,
    state: eventTiles.definitions[eventType].states ? eventTiles.definitions[eventType].states[0] : 'default',
    enabled: true,
    script: null,  // AI-generated script will go here
    metadata: {
      created: new Date().toISOString(),
      aiTags: eventTiles.definitions[eventType].aiTags || []
    }
  };
  
  let key = `${x},${y}`;
  eventTiles.placedEvents[key] = eventData;
  
  console.log(`Placed event tile: ${eventType} at (${x}, ${y}) with ID: ${eventId}`);
  return eventData;
}

// Remove an event tile from the map
function removeEventTile(x, y) {
  let key = `${x},${y}`;
  if (eventTiles.placedEvents[key]) {
    let eventData = eventTiles.placedEvents[key];
    delete eventTiles.placedEvents[key];
    console.log(`Removed event tile: ${eventData.type} at (${x}, ${y})`);
    return true;
  }
  return false;
}

// Get event tile at position
function getEventTileAt(x, y) {
  let key = `${x},${y}`;
  return eventTiles.placedEvents[key] || null;
}

// Set a script on an event tile at position
function setEventTileScript(x, y, scriptText) {
  let key = `${x},${y}`;
  let ev = eventTiles.placedEvents[key];
  if (!ev) return false;
  ev.script = scriptText || null;
  if (ev.script) {
    try {
      // Show a short preview of the script for debugging
      const preview = ev.script.length > 200 ? ev.script.slice(0,200) + '…' : ev.script;
      console.log(`Compiling script for event tile ${ev.type} at (${x},${y}) - preview:`, preview);
      ev._scriptFn = new Function('ctx', 'tile', ev.script);
      console.log(`Compiled script for event tile ${ev.type} at (${x},${y})`);
    } catch (e) {
      ev._scriptFn = null;
      console.error(`Error compiling script for event tile ${ev.type} at (${x},${y}):`, e);
      // Log the full script to help debugging when syntax errors occur
      console.error('Script content:', ev.script);
    }
  } else {
    ev._scriptFn = null;
  }
  console.log(`Set script on event tile ${ev.type} at (${x},${y}):`, !!ev.script);
  return true;
}

// Open modal to edit event tile (script, properties)
function openEventTileModal(ev) {
  if (!ev) return;

  // Create modal if doesn't exist
  let modal = document.getElementById('eventTileModal');
  if (!modal) {
    modal = document.createElement('dialog');
    modal.id = 'eventTileModal';
    modal.innerHTML = `
      <article class="modal-content">
        <h3 class="modal-title">Configure Event Tile</h3>
        <p class="modal-description">Event: <strong id="eventTileType"></strong> at (<span id="eventTileX"></span>, <span id="eventTileY"></span>)</p>
        <div class="modal-form-group">
          <label class="modal-label">Script (JS):</label>
          <textarea id="eventTileScriptInput" class="modal-textarea" rows="10" style="width:100%" placeholder="// Example: api.showScreenBlur(5000);"></textarea>
        </div>
        <footer class="modal-footer">
          <button id="eventClearBtn" class="modal-btn modal-btn-danger">Clear</button>
          <button id="eventSaveBtn" class="modal-btn modal-btn-primary">Save</button>
          <button id="eventCloseBtn" class="modal-btn modal-btn-secondary">Cancel</button>
        </footer>
      </article>
    `;
    document.body.appendChild(modal);

    // Track where mousedown started to prevent closing modal when selecting text
    let mouseDownTarget = null;

    modal.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      mouseDownTarget = e.target;
    });
    modal.addEventListener('mousemove', (e) => e.stopPropagation());
    modal.addEventListener('mouseup', (e) => e.stopPropagation());
    modal.addEventListener('click', (e) => {
      e.stopPropagation();
      // Only close if BOTH mousedown and click were on the backdrop
      if (e.target === modal && mouseDownTarget === modal) {
        closeEventTileModal();
      }
      mouseDownTarget = null;
    });

    modal.querySelector('#eventSaveBtn').addEventListener('click', saveEventTileSettings);
    modal.querySelector('#eventClearBtn').addEventListener('click', clearEventTileSettings);
    modal.querySelector('#eventCloseBtn').addEventListener('click', closeEventTileModal);
  }

  document.getElementById('eventTileType').textContent = ev.type;
  document.getElementById('eventTileX').textContent = ev.x;
  document.getElementById('eventTileY').textContent = ev.y;
  document.getElementById('eventTileScriptInput').value = ev.script || '';

  modal.showModal();
  // store current event on modal element for save/clear
  modal._currentEventKey = `${ev.x},${ev.y}`;
}

function saveEventTileSettings() {
  let modal = document.getElementById('eventTileModal');
  if (!modal) return;
  let key = modal._currentEventKey;
  if (!key) return;
  let [x, y] = key.split(',').map(Number);
  let scriptText = (document.getElementById('eventTileScriptInput') || {}).value || '';
  setEventTileScript(x, y, scriptText.trim() === '' ? null : scriptText);
  closeEventTileModal();
}

function clearEventTileSettings() {
  let modal = document.getElementById('eventTileModal');
  if (!modal) return;
  let key = modal._currentEventKey;
  if (!key) return;
  let [x, y] = key.split(',').map(Number);
  setEventTileScript(x, y, null);
  closeEventTileModal();
}

function closeEventTileModal() {
  let modal = document.getElementById('eventTileModal');
  if (modal) modal.close();
}

// Get all event tiles of a specific type
function getEventTilesByType(eventType) {
  let results = [];
  for (let key in eventTiles.placedEvents) {
    let event = eventTiles.placedEvents[key];
    if (event.type === eventType) {
      results.push(event);
    }
  }
  return results;
}

// Get event tiles by AI tag
function getEventTilesByTag(tag) {
  let results = [];
  for (let key in eventTiles.placedEvents) {
    let event = eventTiles.placedEvents[key];
    if (event.metadata.aiTags.includes(tag)) {
      results.push(event);
    }
  }
  return results;
}

// Draw event tiles (for editor and game)
function drawEventTiles() {
  push();
  
  // Get visible viewport for culling (performance optimization)
  let viewport = typeof getVisibleViewport === 'function' ? getVisibleViewport() : null;
  
  for (let key in eventTiles.placedEvents) {
    let event = eventTiles.placedEvents[key];
    let definition = eventTiles.definitions[event.type];
    
    if (!definition) continue;
    
    // Skip invisible tiles in game mode (but show in editor)
    if (!definition.visible && !editMode) continue;
    
    // Skip tiles outside viewport
    if (viewport && (event.x < viewport.minX || event.x > viewport.maxX ||
                    event.y < viewport.minY || event.y > viewport.maxY)) {
      continue;
    }
    
    // Convert grid coordinates (meters) to world pixel coordinates
    let worldX = event.x * GRID_SIZE;
    let worldY = event.y * GRID_SIZE;
    let tileSize = (event.gridScale || 1) * GRID_SIZE;
    
    // Set transparency for invisible tiles in editor
    let alpha = definition.visible ? 255 : (editMode ? 100 : 0);
    
    fill(definition.color[0], definition.color[1], definition.color[2], alpha);
    stroke(255, 255, 255, alpha);
    strokeWeight(editMode ? 2 : 1);
    
    // Draw based on shape
    switch (definition.shape) {
      case 'circle':
        ellipse(worldX + tileSize/2, worldY + tileSize/2, tileSize * 0.8);
        break;
      case 'rectangle':
        rect(worldX + tileSize*0.1, worldY + tileSize*0.1, tileSize*0.8, tileSize*0.8, 4);
        break;
      case 'star':
        drawStarP5(worldX + tileSize/2, worldY + tileSize/2, tileSize*0.3, tileSize*0.15, 5);
        break;
      case 'cross':
        drawCross(worldX + tileSize/2, worldY + tileSize/2, tileSize*0.6);
        break;
    }
    
    // Draw event ID in editor mode
    if (editMode) {
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(8);
      text(event.id.split('_')[1], worldX + tileSize/2, worldY + tileSize - 10);
    }
  }
  
  pop();
}

// Helper function to draw a star shape (p5.js version)
function drawStarP5(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
  console.log('[EVENT_TILES] drawStarP5() - Drew star at:', x, y);
}

// Helper function to draw a cross shape (p5.js version)
function drawCross(x, y, size) {
  let halfSize = size / 2;
  let thickness = size / 6;
  
  // Vertical bar
  rect(x - thickness/2, y - halfSize, thickness, size);
  // Horizontal bar  
  rect(x - halfSize, y - thickness/2, size, thickness);
  
  console.log('[EVENT_TILES] drawCross() - Drew cross at:', x, y);
}

// Clear all event tiles
function clearAllEventTiles() {
  eventTiles.placedEvents = {};
  eventTiles.activeEvents = [];
  console.log('Cleared all event tiles');
}

// Export event data for saving
function getEventTileData() {
  return {
    placedEvents: eventTiles.placedEvents,
    eventCounter: eventTiles.eventCounter
  };
}

// Import event data from loading
function loadEventTileData(data) {
  if (data.placedEvents) {
    eventTiles.placedEvents = data.placedEvents;
  }
  if (data.eventCounter) {
    eventTiles.eventCounter = data.eventCounter;
  }
  console.log(`Loaded ${Object.keys(eventTiles.placedEvents).length} event tiles`);
}

console.log('[EVENT_TILES] Legacy compatibility shim loaded - event checking now in checkAllTileEvents()');
