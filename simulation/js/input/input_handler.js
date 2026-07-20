// ============================================
// INPUT HANDLER
// Manages keyboard and mouse input for both edit and game modes
// ============================================

// Check if any modal dialog is currently open
function isAnyModalOpen() {
  // Check for HTML dialog elements that are open
  const openDialog = document.querySelector('dialog[open]');
  if (openDialog) return true;
  
  // Check known modal state variables
  if (window.saveModal && window.saveModal.isOpen) return true;
  if (typeof interactiveTileLinkModal !== 'undefined' && interactiveTileLinkModal.isOpen) return true;
  if (typeof lightPropertiesModal !== 'undefined' && lightPropertiesModal.isOpen) return true;
  if (typeof ambientLightModal !== 'undefined' && ambientLightModal.isOpen) return true;
  if (typeof weatherModal !== 'undefined' && weatherModal.isOpen) return true;
  // NOTE: Dialog is NOT included here - it has its own dedicated input handler
  // (handleDialogInput) that must run before the modal guard blocks keys.
  if (typeof sceneManager !== 'undefined' && sceneManager.isTransitioning()) return true;
  
  return false;
}

// Check if focus is on a text input element
function isFocusedOnInput() {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable;
}

// Handle keyboard key pressed
function keyPressed() {
  // If focused on an input field, let the browser handle it normally
  if (isFocusedOnInput()) {
    return true; // Allow default browser behavior for typing
  }
  
  // If any modal is open but not focused on input, block game keys
  if (isAnyModalOpen()) {
    return false; // Block the key from doing anything in the game
  }
  
  // Escape cancels paste preview first, then closes modal, then deselects tiles/items
  if (key === 'Escape' || keyCode === 27) {
    if (clipboard.showPreview) {
      clipboard.showPreview = false;
      return;
    }
    if (window.saveModal && window.saveModal.isOpen) {
      closeModal();
      return;
    }
    // Deselect any selected tile or item in editor
    if (window.editMode) {
      // Cancel NPC placing mode
      if (typeof selectionTool !== 'undefined' && selectionTool.mode === 'npc') {
        if (typeof cancelNPCPlacing === 'function') cancelNPCPlacing();
        console.log('[Editor] ESC - cancelled NPC placement');
        return;
      }
      if (typeof editorUI !== 'undefined') {
        editorUI.selectedTile = null;
        editorUI.selectedCategory = null;
      }
      if (typeof tilePanelState !== 'undefined') {
        tilePanelState.selectedTile = null;
        tilePanelState.selectedCategory = null;
      }
      if (typeof itemPanelState !== 'undefined') {
        itemPanelState.selectedItem = null;
      }
      if (typeof selectionTool !== 'undefined') {
        selectionTool.mode = 'tile';
        selectionTool.hasSelection = false;
        selectionTool.selectedTiles = {};
      }
      // Remove highlight from tile/item panel UI
      var allSelected = document.querySelectorAll('.tile-item.selected, .item-panel-item.selected');
      for (var si = 0; si < allSelected.length; si++) {
        allSelected[si].classList.remove('selected');
      }
      if (typeof updateTilePanelInfo === 'function') updateTilePanelInfo();
      if (typeof updateItemPanelInfo === 'function') updateItemPanelInfo();
      console.log('[Editor] ESC - deselected tile/item');
      return;
    }
  }
  
  // Handle delete mode
  if (typeof deleteMode !== 'undefined' && deleteMode.isActive) {
    if (key === 'Escape' || keyCode === 27) {
      if (typeof exitDeleteMode === 'function') {
        exitDeleteMode();
      }
      return;
    }
    
    if (keyCode === ENTER) {
      if (typeof executeDelete === 'function') {
        executeDelete();
      }
      return;
    }
    
    return; // Don't process other keys in delete mode
  }
  
  // Freeze other input when modal is open
  if (window.saveModal && window.saveModal.isOpen) return;
  
  // Handle player movement keys (only in game mode, not during dialog or scene transitions)
  if (typeof updateKeyState === 'function') {
    if (!(typeof isDialogActive === 'function' && isDialogActive()) &&
        !(typeof sceneManager !== 'undefined' && sceneManager.isInputFrozen())) {
      updateKeyState(keyCode, true);
    }
  }
  
  // Block all input during scene transitions
  if (typeof sceneManager !== 'undefined' && sceneManager.isInputFrozen()) {
    return;
  }
  
  // Dialog system consumes keys when active (before normal dispatch)
  if (typeof isDialogActive === 'function' && isDialogActive()) {
    if (typeof handleDialogInput === 'function') {
      handleDialogInput();
    }
    return; // Block all other input while dialog is open
  }
  
  // Handle context UI input first
  if (typeof contextUI !== 'undefined' && contextUI.isOpen && contextUI.type === 'saveload') {
    if (keyCode === BACKSPACE && contextUI.saveLoadControls.mode === 'save') {
      contextUI.saveLoadControls.currentMapName = contextUI.saveLoadControls.currentMapName.slice(0, -1);
      return;
    }
    
    if (key === 'Escape' || keyCode === 27) {
      closeContextUI();
      return;
    }
    
    return; // Don't process other keys when context UI is open
  }
  
  // Handle modal input first
  if (saveModal.isOpen) {
    if (keyCode === ENTER) {
      if (saveModal.mode === 'save') {
        saveMap(saveModal.currentMapName);
      } else if (saveModal.mode === 'load' && saveModal.selectedMap) {
        loadMap(saveModal.selectedMap);
      } else if (saveModal.mode === 'delete' && saveModal.selectedMap) {
        deleteMap(saveModal.selectedMap);
      }
      return; // Don't process other keys when modal is open
    }
    
    if (keyCode === BACKSPACE && saveModal.mode === 'save') {
      saveModal.currentMapName = saveModal.currentMapName.slice(0, -1);
      return;
    }
    
    if (key === 'Escape' || keyCode === 27) {
      closeSaveModal();
      return;
    }
    
    return; // Don't process other keys when modal is open
  }
  
  // ===== DATA-DRIVEN KEY DISPATCH (reads from controls.js) =====

  // Toggle grid visibility
  if (matchesKey('TOGGLE_GRID')) {
    showGrid = !showGrid;
    console.log(`Grid visibility: ${showGrid ? 'ON' : 'OFF'}`);
  }
  
  // Toggle snap grid size (32 ↔ 16) - editor only
  if (matchesKey('TOGGLE_SNAP_GRID')) {
    if (editMode && typeof toggleSnapGrid === 'function') {
      toggleSnapGrid();
    }
  }
  
  // Interaction key - used to interact with nearby tiles when in game mode
  // Also picks up world items if one is nearby
  // Falls back to using active hotbar item
  if (matchesKey('INTERACT')) {
    if (!window.editMode) {
      // Try picking up a world item first
      if (typeof worldItemSystem !== 'undefined' && worldItemSystem.getNearby()) {
        if (worldItemSystem.tryPickup(player.x, player.y)) {
          if (typeof playActionAnimation === 'function') playActionAnimation();
          return; // Consumed by pickup
        }
      }
      // Try NPC interaction (talk to friendly, inspect hostile)
      if (typeof tryInteractNPC === 'function' && tryInteractNPC()) {
        return; // Consumed by NPC dialog
      }
      // Fall back to normal tile interaction
      if (typeof handleInteraction === 'function') {
        var interacted = handleInteraction();
        if (interacted) return;
      }
      // Final fallback: use active hotbar item (if inventory not open)
      if (typeof inventoryUI === 'undefined' || !inventoryUI.isOpen()) {
        if (typeof hotbarSystem !== 'undefined') {
          hotbarSystem.useActiveItem();
        }
      }
    }
  }

  // Throw held item (T key - game mode) - throws from active hotbar slot
  if (matchesKey('THROW_ITEM')) {
    if (!window.editMode) {
      if (typeof hotbarSystem !== 'undefined') {
        if (hotbarSystem.throwActiveItem()) {
          if (typeof playActionAnimation === 'function') playActionAnimation();
        }
      } else if (typeof worldItemSystem !== 'undefined') {
        // Fallback: throw first item from inventory
        var inv = Engine.get('inventory');
        if (inv && inv.player) {
          for (var si = 0; si < inv.player.size; si++) {
            if (inv.player.slots[si]) {
              if (worldItemSystem.throwFromInventory(si, player.x, player.y, player.facing || 'south')) {
                if (typeof playActionAnimation === 'function') playActionAnimation();
              }
              break;
            }
          }
        }
      }
    }
  }
  
  // Toggle camera following (game mode only)
  if (matchesKey('TOGGLE_CAMERA_FOLLOW')) {
    if (!window.editMode && typeof toggleCameraFollow === 'function') {
      toggleCameraFollow();
    }
  }
  
  // SPACE: in edit mode reset camera; in game mode -> jump
  if (matchesKey('RESET_CAMERA')) {
    if (window.editMode && typeof resetCameraToCenter === 'function') {
      resetCameraToCenter();
    }
  }
  if (matchesKey('JUMP')) {
    if (!window.editMode && typeof attemptJump === 'function') {
      attemptJump();
    }
  }
  
  // Toggle lighting system
  if (matchesKey('TOGGLE_LIGHTING')) {
    if (typeof toggleLighting === 'function') {
      toggleLighting();
    }
  }
  
  // Open weather & ambient modal
  if (matchesKey('WEATHER_MODAL')) {
    if (window.editMode && typeof toggleWeatherModal === 'function') {
      toggleWeatherModal();
    }
  }
  
  // Toggle tile panel
  if (matchesKey('TOGGLE_TILE_PANEL')) {
    if (editMode) {
      if (typeof toggleTilePanel === 'function') {
        toggleTilePanel();
      } else {
        editorUI.showTilePanel = !editorUI.showTilePanel;
      }
      console.log(`Tile panel: ${editorUI.showTilePanel ? 'ON' : 'OFF'}`);
    }
  }
  
  // Brush size controls
  if (matchesKey('BRUSH_DECREASE')) {
    if (editMode && typeof changeBrushRadius === 'function') {
      changeBrushRadius(-1);
    }
  }
  if (matchesKey('BRUSH_INCREASE')) {
    if (editMode && typeof changeBrushRadius === 'function') {
      changeBrushRadius(1);
    }
  }
  
  // Rotate tile OR selection OR clipboard preview (check RECTANGLE_MODE first since it needs Shift+R)
  if (matchesKey('RECTANGLE_MODE')) {
    if (window.editMode && !window.saveModal.isOpen && selectionTool.mode === 'tile') {
      placementState.isRectangleMode = !placementState.isRectangleMode;
      console.log(`Rectangle mode: ${placementState.isRectangleMode ? 'ON' : 'OFF'}`);
    }
  } else if (matchesKey('ROTATE_TILE')) {
    if (editMode && !saveModal.isOpen) {
      if (clipboard.showPreview && clipboard.hasTiles) {
        // In paste preview: R rotates the clipboard
        if (typeof rotateClipboard === 'function') {
          rotateClipboard();
        }
      } else if (selectionTool.mode === 'tile') {
        // In tile mode: R rotates the current tile
        tileTransform.rotation = (tileTransform.rotation + 90) % 360;
        console.log(`Tile rotation: ${tileTransform.rotation}°`);
      } else if (selectionTool.hasSelection) {
        // In selection mode: R rotates the selection
        rotateSelection();
      }
    }
  }
  
  // Flip current tile OR selection OR clipboard preview
  if (matchesKey('FLIP_TILE')) {
    if (editMode && !saveModal.isOpen) {
      if (clipboard.showPreview && clipboard.hasTiles) {
        // In paste preview: F flips the clipboard
        if (typeof flipClipboard === 'function') {
          flipClipboard();
        }
      } else if (selectionTool.mode === 'tile') {
        // In tile mode: F cycles flip state for the current tile
        // flipState: 0 = none, 1 = flipX (horizontal), 2 = flipBoth, 3 = flipY (vertical)
        if (typeof tileTransform.flipState === 'undefined') {
          // maintain backward compatibility with boolean `flipped`
          tileTransform.flipState = tileTransform.flipped ? 1 : 0;
        }
        tileTransform.flipState = (tileTransform.flipState + 1) % 4;
        // keep `flipped` boolean for older code paths
        tileTransform.flipped = tileTransform.flipState !== 0;
        let label = ['NONE', 'FLIP_X', 'FLIP_BOTH', 'FLIP_Y'][tileTransform.flipState];
        console.log(`Tile flip state: ${label}`);
      } else if (selectionTool.hasSelection) {
        // In selection mode: F flips the selection
        flipSelection();
      }
    }
  }
  
  // (RECTANGLE_MODE handled above together with ROTATE_TILE)
  
  // Delete: enter delete mode
  if (matchesKey('DELETE_TILES')) {
    if (window.editMode && !window.saveModal.isOpen) {
      // Enter delete mode for tiles
      if (typeof enterDeleteMode === 'function') {
        enterDeleteMode();
      }
    }
  }
  
  // Save/Load via toolbar buttons (removed keyboard shortcuts S/L to avoid accidental modal popups)
  
  // Close modal or exit selection mode
  if (matchesKey('ESCAPE')) {
    if (saveModal.isOpen) {
      closeSaveModal();
    } else if (typeof contextUI !== 'undefined' && contextUI.isOpen) {
      if (typeof closeContextUI === 'function') {
        closeContextUI();
      }
    } else if (window.editMode && selectionTool.mode !== 'tile') {
      selectionTool.mode = 'tile';
      selectionTool.hasSelection = false;
      selectionTool.selectedTiles = {};
      console.log('Exited selection mode');
    }
  }
  
  // Selection tool controls
  if (matchesKey('SELECT_TOOL')) {
    if (editMode && !saveModal.isOpen) {
      selectionTool.mode = 'select';
      console.log('Switched to Selection tool');
    }
  }
  
  if (matchesKey('MOVE_TOOL')) {
    if (editMode && !saveModal.isOpen) {
      selectionTool.mode = 'move';
      console.log('Switched to Move tool');
    }
  }
  
  // Cut selection
  if (matchesKey('CUT_SELECTION')) {
    if (editMode && !saveModal.isOpen && selectionTool.hasSelection) {
      cutSelection();
    }
  }
  
  // Paste selection (legacy key binding - V key without Ctrl)
  if (matchesKey('PASTE_SELECTION')) {
    if (editMode && !saveModal.isOpen && selectionTool.hasSelection && !clipboard.showPreview) {
      pasteSelection();
    }
  }
  
  // Copy to clipboard (Ctrl+C)
  if (matchesKey('COPY_CLIPBOARD')) {
    if (editMode && !saveModal.isOpen && selectionTool.hasSelection) {
      copySelection();
      return; // Prevent default browser copy
    }
  }
  
  // Paste from clipboard (Ctrl+V) - show preview
  if (matchesKey('PASTE_CLIPBOARD')) {
    if (editMode && !saveModal.isOpen && clipboard.hasTiles) {
      clipboard.showPreview = true;
      return; // Prevent default browser paste
    }
  }
  
  // Undo (Ctrl+Z)
  if (matchesKey('UNDO')) {
    if (editMode && !saveModal.isOpen) {
      if (typeof undo === 'function') {
        undo();
      }
      return; // Prevent default browser undo
    }
  }
  
  // Redo (Ctrl+Y or Ctrl+Shift+Z)
  if (matchesKey('REDO')) {
    if (editMode && !saveModal.isOpen) {
      if (typeof redo === 'function') {
        redo();
      }
      return; // Prevent default browser redo
    }
  }
  if (matchesKey('REDO_ALT')) {
    if (editMode && !saveModal.isOpen) {
      if (typeof redo === 'function') {
        redo();
      }
      return; // Prevent default browser redo
    }
  }
  
  // Fill Tool (Bucket)
  if (matchesKey('FILL_TOOL')) {
    if (editMode && !saveModal.isOpen) {
      if (typeof toggleFillTool === 'function') {
        toggleFillTool();
      }
    }
  }
  
  // Toggle Particle Effects
  if (matchesKey('TOGGLE_PARTICLES')) {
    if (typeof toggleParticleEffects === 'function') {
      toggleParticleEffects();
    }
  }
  
  // Replace All (Ctrl+H)
  if (matchesKey('REPLACE_ALL')) {
    if (editMode && !saveModal.isOpen) {
      if (typeof openReplaceAllModal === 'function') {
        openReplaceAllModal();
      }
      return; // Prevent browser find/replace
    }
  }
  
  // Switch back to tile mode
  if (matchesKey('TILE_TOOL')) {
    if (editMode && !saveModal.isOpen) {
      selectionTool.mode = 'tile';
      selectionTool.hasSelection = false;
      selectionTool.selectedTiles = {};
      console.log('Switched to Tile tool');
    }
  }
  
  // Z-Level navigation (Page Up / Page Down)
  if (editMode && !saveModal.isOpen) {
    if (matchesKey('Z_LEVEL_UP')) {
      if (typeof changeZLevel === 'function') {
        changeZLevel(1);
      }
    }
    if (matchesKey('Z_LEVEL_DOWN')) {
      if (typeof changeZLevel === 'function') {
        changeZLevel(-1);
      }
    }
  }
  
  // NOTE: Removed 'C' shortcut for clearing all tiles to prevent accidental data loss.
  
  // Backwards compatibility: Enter to interact
  if (matchesKey('CONFIRM')) {
    if (!editMode && typeof handleInteraction === 'function') {
      handleInteraction();
    }
  }
  
  // Toggle HUD visibility
  if (matchesKey('TOGGLE_HUD')) {
    if (!editMode && typeof toggleHUD === 'function') {
      toggleHUD();
    }
  }

  // Toggle debug panel visibility (F3)
  if (matchesKey('TOGGLE_DEBUG')) {
    if (typeof toggleDebugPanel === 'function') {
      toggleDebugPanel();
    }
  }

  // Hotbar slot selection (1-5 keys)
  if (!editMode && typeof hotbarSystem !== 'undefined') {
    if (matchesKey('HOTBAR_1')) { hotbarSystem.setActiveSlot(0); return; }
    if (matchesKey('HOTBAR_2')) { hotbarSystem.setActiveSlot(1); return; }
    if (matchesKey('HOTBAR_3')) { hotbarSystem.setActiveSlot(2); return; }
    if (matchesKey('HOTBAR_4')) { hotbarSystem.setActiveSlot(3); return; }
    if (matchesKey('HOTBAR_5')) { hotbarSystem.setActiveSlot(4); return; }
  }

  // Toggle inventory (I key)
  if (matchesKey('TOGGLE_INVENTORY')) {
    if (!editMode && typeof inventoryUI !== 'undefined') {
      inventoryUI.toggle();
    }
  }

  // Melee attack (F key)
  if (matchesKey('ATTACK')) {
    if (!editMode && typeof combatSystem !== 'undefined') {
      combatSystem.attack();
    }
  }

  // Toggle build mode (B key)
  if (matchesKey('BUILD_MODE')) {
    if (!editMode && typeof constructionSystem !== 'undefined') {
      constructionSystem.toggle();
    }
  }

  // Inventory navigation when open
  if (!editMode && typeof inventoryUI !== 'undefined' && inventoryUI.isOpen()) {
    inventoryUI.handleInput(keyCode);
  }
}

// Handle key releases
function keyReleased() {
  // Block key releases when modal is open
  if (isAnyModalOpen()) return;
  
  // Handle player movement keys (only in game mode)
  if (typeof updateKeyState === 'function') {
    updateKeyState(keyCode, false);
  }
}

// Handle mouse wheel for zooming in editor mode
function mouseWheel(event) {
  // Only handle in edit mode
  if (!editMode) return;
  
  // Don't zoom when any modal is open
  if (isAnyModalOpen()) return;
  
  // Don't zoom when mouse is over tile panel (HTML panel is 280px wide)
  if (typeof tilePanelState !== 'undefined' && tilePanelState.isOpen && mouseX > width - 280) return;
  // Don't zoom when mouse is over item panel (left side, 320px wide)
  if (typeof itemPanelState !== 'undefined' && itemPanelState.isOpen && mouseX < 320) return;
  
  // Get scroll direction: negative = zoom in, positive = zoom out
  let delta = -event.delta / 100;
  
  // Clamp delta to reasonable range
  delta = constrain(delta, -2, 2);
  
  // Call camera zoom handler
  if (typeof handleCameraZoom === 'function') {
    handleCameraZoom(delta);
    console.log(`Zoom: ${camera.zoom.toFixed(2)}x`);
  }
  
  // Prevent page scrolling
  return false;
}

// Check if the mouse event originated on an HTML UI element (toolbar, panels, modals)
function isMouseOverUI() {
  // elementFromPoint expects viewport coordinates.
  // p5's mouseX/mouseY are relative to the canvas, so offset by canvas position.
  let canvas = document.querySelector('canvas');
  let vpX = mouseX;
  let vpY = mouseY;
  if (canvas) {
    let rect = canvas.getBoundingClientRect();
    vpX = mouseX + rect.left;
    vpY = mouseY + rect.top;
  }
  let el = document.elementFromPoint(vpX, vpY);
  if (!el) return false;
  // Allow clicks on the canvas itself
  if (el.tagName === 'CANVAS') return false;
  // Any other DOM element means we're over UI
  return true;
}

// Handle mouse clicks
function mousePressed() {
  if (!editMode || !initialized) return;
  
  // Ignore clicks that land on HTML UI (toolbar, panels, modals)
  if (isMouseOverUI()) return;
  
  // Freeze ALL input when any modal/dialog is open
  if (isAnyModalOpen()) return;
  
  // Middle mouse button starts camera panning
  if (mouseButton === CENTER) {
    if (typeof startCameraPanning === 'function') {
      startCameraPanning(mouseX, mouseY);
      cameraEditor.isMiddleMousePanning = true;
      cameraEditor.middleMouseStartPos = { x: mouseX, y: mouseY };
      cameraEditor.middleMouseMoved = false;
      console.log('Middle mouse panning started');
    }
    return; // Don't process other actions when starting pan
  }
  
  // Handle paste preview confirmation (click to confirm paste position)
  if (clipboard.showPreview && clipboard.hasTiles) {
    pasteFromClipboard();
    clipboard.showPreview = false;
    return;
  }
  
  // Handle delete mode clicks
  if (typeof deleteMode !== 'undefined' && deleteMode.isActive) {
    let worldPos = screenToWorld(mouseX, mouseY);
    // Align to grid with proper rounding like the selection tool
    let gridX = Math.round(worldPos.x);
    let gridY = Math.round(worldPos.y);
    
    if (gridX >= 0 && gridX < WORLD_WIDTH && 
        gridY >= 0 && gridY < WORLD_HEIGHT) {
      if (typeof hasTileAt === 'function' && hasTileAt(gridX, gridY)) {
        if (typeof toggleTileSelection === 'function') {
          toggleTileSelection(gridX, gridY);
        }
      }
    }
    return;
  }
  
  // Handle context UI clicks first
  if (typeof handleContextUIClick === 'function' && 
      handleContextUIClick(mouseX, mouseY)) {
    return; // Context UI handled the click
  }
  
  // Check Save/Load button click
  if (editMode && mouseX >= 300 && mouseX <= 380 && mouseY >= 145 && mouseY <= 170) {
    if (typeof openSaveLoadContextUI === 'function') {
      openSaveLoadContextUI(340, 170);
    }
    return;
  }
  
  // Note: Tile panel is now HTML-based, no longer needs canvas click detection
  // The panel handles its own clicks via DOM events
  
  // Handle different tool modes
  let gridPos = screenToGrid(mouseX, mouseY);
  
  if (gridPos.x >= 0 && gridPos.x < WORLD_WIDTH && 
      gridPos.y >= 0 && gridPos.y < WORLD_HEIGHT) {
    
    // Check for double-click (erase objects with context menus)
    let currentClickPos = { x: gridPos.x, y: gridPos.y };
    let timeSinceLastClick = millis() - doubleClickTracker.lastClickTime;
    let samePosition = (currentClickPos.x === doubleClickTracker.lastClickPos.x && 
                       currentClickPos.y === doubleClickTracker.lastClickPos.y);
    
    if (samePosition && timeSinceLastClick < doubleClickTracker.doubleClickThreshold && mouseButton === LEFT) {
      // Double-click detected - erase the object
      if (typeof removeLight === 'function') {
        let light = getLightAt(gridPos.x, gridPos.y);
        if (light) {
          removeLight(gridPos.x, gridPos.y);
          removeTile(gridPos.x, gridPos.y);
          console.log(`Double-click: Removed light at (${gridPos.x}m, ${gridPos.y}m)`);
          doubleClickTracker.lastClickTime = 0; // Reset to prevent triple-click
          return;
        }
      }
    }
    
    // Update double-click tracker
    doubleClickTracker.lastClickPos = currentClickPos;
    doubleClickTracker.lastClickTime = millis();
    
    // Handle right-click context menus
    if (mouseButton === RIGHT) {
      // Shift+Right-click: open tile properties / selection brightness modal
      if (keyIsDown(SHIFT)) {
        // If selection tool is active with a selection, open batch brightness modal
        if (selectionTool.hasSelection && typeof openSelectionBrightnessModal === 'function') {
          openSelectionBrightnessModal();
          return;
        }
        // Otherwise open single-tile properties modal
        if (typeof openTilePropertiesModal === 'function' && typeof getTileAt === 'function') {
          let tileAtPos = getTileAt(gridPos.x, gridPos.y);
          if (tileAtPos) {
            openTilePropertiesModal(gridPos.x, gridPos.y);
            return;
          }
        }
      }
      
      // Check for interactive tile context menu (doors, buttons, switches, logic tiles)
      let interactiveTile = typeof getInteractiveTileAt === 'function' ? getInteractiveTileAt(gridPos.x, gridPos.y) : null;
      if (interactiveTile) {
        // Use unified interactive tile link modal for all interactive tiles
        if (typeof openInteractiveTileLinkModal === 'function') {
          openInteractiveTileLinkModal(interactiveTile);
          return;
        }
      }
      
      // Check for light context menu (only when light tile is selected)
      if (editorUI.selectedTile === 'light' && typeof handleLightRightClick === 'function') {
        if (handleLightRightClick(gridPos.x, gridPos.y)) {
          return; // Context menu opened
        }
      }
    }
    // Also allow LEFT-click to edit existing interactive tiles or event tiles (useful for trigger zones)
    if (mouseButton === LEFT) {
      // Shift+Click on signpost to edit text
      if (keyIsDown(SHIFT)) {
        let signpost = typeof getSignpostAt === 'function' ? getSignpostAt(gridPos.x, gridPos.y) : null;
        if (signpost && typeof openSignpostEditor === 'function') {
          openSignpostEditor(gridPos.x, gridPos.y);
          return;
        }
      }
      
      let interactiveTileLeft = typeof getInteractiveTileAt === 'function' ? getInteractiveTileAt(gridPos.x, gridPos.y) : null;
      if (interactiveTileLeft && typeof openInteractiveTileLinkModal === 'function') {
        openInteractiveTileLinkModal(interactiveTileLeft);
        return;
      }

      // Check for event tiles (trigger_zone etc.) and open event modal
      let eventTile = typeof getEventTileAt === 'function' ? getEventTileAt(gridPos.x, gridPos.y) : null;
      if (eventTile && typeof openEventTileModal === 'function') {
        openEventTileModal(eventTile);
        return;
      }

      // Click existing NPC/enemy entity to configure (edit mode)
      if (typeof getEntityAt === 'function') {
        let entityAtClick = getEntityAt(gridPos.x, gridPos.y);
        if (entityAtClick && typeof openNPCConfigModal === 'function') {
          openNPCConfigModal(entityAtClick);
          return;
        }
      }
    }
    
    // Check if we're in tile mode with light selected and there's an existing light
    if (selectionTool.mode === 'tile' && editorUI.selectedTile === 'light' && mouseButton === LEFT) {
      if (typeof getLightAt === 'function') {
        let existingLight = getLightAt(gridPos.x, gridPos.y);
        if (existingLight) {
          // Open context menu for editing instead of removing
          if (typeof openLightContextUI === 'function') {
            openLightContextUI(existingLight, mouseX, mouseY);
            console.log(`Opened light context menu for editing at (${gridPos.x}m, ${gridPos.y}m)`);
            return;
          }
        }
      }
    }
    
    // Check for light context menu on LEFT click (single-click to edit)
    if (mouseButton === LEFT && editorUI.selectedTile !== 'light' && typeof handleLightClick === 'function' && 
        handleLightClick(gridPos.x, gridPos.y, mouseButton)) {
      return; // Light editing handled, don't continue with regular placement
    }
    
    // Freeze tile placement when any context UI is open
    if (typeof contextUI !== 'undefined' && contextUI.isOpen) {
      return; // Don't place tiles when context UI is open
    }
    
    // NPC placement mode - place selected NPC type from NPC panel
    if (selectionTool.mode === 'npc' && typeof npcPanelState !== 'undefined' && npcPanelState.selectedType) {
      if (mouseButton === LEFT) {
        if (typeof handleNPCPlacement === 'function') {
          handleNPCPlacement(gridPos.x, gridPos.y);
        }
      } else if (mouseButton === RIGHT) {
        // Right-click cancels NPC placing
        if (typeof cancelNPCPlacing === 'function') cancelNPCPlacing();
      }
      return;
    }

    if (selectionTool.mode === 'select') {
      startSelection(gridPos);
    } else if (selectionTool.mode === 'move' && selectionTool.hasSelection) {
      startMove(gridPos);
    } else if (selectionTool.mode === 'item') {
      // Item placement mode - place selected item from item panel
      if (typeof itemPanelState !== 'undefined' && itemPanelState.selectedItem) {
        if (mouseButton === LEFT) {
          var worldPos = screenToWorld(mouseX, mouseY);
          if (typeof worldItemSystem !== 'undefined') {
            worldItemSystem.placeItem(itemPanelState.selectedItem, worldPos.x, worldPos.y, 1);
          }
        } else if (mouseButton === RIGHT) {
          // Right-click in item mode: remove world item at position
          var worldPos = screenToWorld(mouseX, mouseY);
          if (typeof worldItemSystem !== 'undefined') {
            worldItemSystem.removeAt(worldPos.x, worldPos.y);
          }
        }
      }
    } else {
      // Check for fill tool first
      if (typeof fillTool !== 'undefined' && fillTool.isActive && typeof handleFillToolClick === 'function') {
        handleFillToolClick(gridPos);
        return;
      }
      // Regular tile placement mode
      startTilePlacement(gridPos);
    }
  }
}

// Start selection
function startSelection(gridPos) {
  selectionTool.isDragging = true;
  selectionTool.startPos = { x: gridPos.x, y: gridPos.y };
  selectionTool.endPos = { x: gridPos.x, y: gridPos.y };
  placementState.isDragging = true; // For preview drawing
  console.log(`Started selection at (${gridPos.x}m, ${gridPos.y}m)`);
}

// Start move operation
function startMove(gridPos) {
  selectionTool.isMoving = true;
  selectionTool.moveStartPos = { x: gridPos.x, y: gridPos.y };
  selectionTool.moveOffset = { x: 0, y: 0 };
  console.log(`Started move at (${gridPos.x}m, ${gridPos.y}m)`);
}

// Start regular tile placement
function startTilePlacement(gridPos) {
  placementState.isDragging = true;
  placementState.startPos = { x: gridPos.x, y: gridPos.y };
  placementState.currentPos = { x: gridPos.x, y: gridPos.y };
  placementState.lastPlacedPos = { x: gridPos.x, y: gridPos.y };
  placementState.draggedTiles.clear();
  
  // Start undo batch for this drag operation
  if (typeof startUndoBatch === 'function') {
    startUndoBatch();
  }
  
  // Place initial tile(s) with brush
  if (mouseButton === LEFT) {
    let diameter = typeof brushRadius !== 'undefined' ? 2 * brushRadius + 1 : 1;
    console.log(`=== TILE PLACEMENT DEBUG ===`);
    console.log(`Mouse clicked at screen: (${mouseX}, ${mouseY})`);
    console.log(`Converted to meter grid: (${gridPos.x}m, ${gridPos.y}m)`);
    console.log(`Brush size: ${diameter}x${diameter}`);
    console.log(`Selected tile: ${editorUI.selectedTile} (${editorUI.selectedCategory})`);
    
    // Use circular brush if available, otherwise single tile
    if (typeof placeTilesInCircle === 'function') {
      placeTilesInCircle(gridPos.x, gridPos.y, editorUI.selectedTile, editorUI.selectedCategory, tileTransform);
    } else {
      placeTile(gridPos.x, gridPos.y, editorUI.selectedTile, editorUI.selectedCategory, tileTransform);
    }
    placementState.draggedTiles.add(`${gridPos.x},${gridPos.y}`);
    console.log(`Started drag placement at (${gridPos.x}m, ${gridPos.y}m)`);
    console.log(`============================`);
  } else if (mouseButton === RIGHT) {
    // Use circular brush for removal too
    if (typeof removeTilesInCircle === 'function') {
      removeTilesInCircle(gridPos.x, gridPos.y);
    } else {
      removeTile(gridPos.x, gridPos.y);
    }
    console.log(`Started drag removal at (${gridPos.x}m, ${gridPos.y}m)`);
  }
}

// Handle mouse drag
function mouseDragged() {
  if (!editMode || !initialized) return;
  
  // Ignore drags that started on HTML UI
  if (isMouseOverUI()) return;
  
  // Freeze ALL input when any modal/dialog is open
  if (isAnyModalOpen()) return;
  
  // Handle middle mouse button camera panning
  if (mouseButton === CENTER && cameraEditor.isMiddleMousePanning) {
    // Mark that we've actually moved (not just clicked)
    if (cameraEditor.middleMouseStartPos) {
      let dx = Math.abs(mouseX - cameraEditor.middleMouseStartPos.x);
      let dy = Math.abs(mouseY - cameraEditor.middleMouseStartPos.y);
      if (dx > 3 || dy > 3) {
        cameraEditor.middleMouseMoved = true;
      }
    }
    if (typeof updateCameraPanning === 'function') {
      updateCameraPanning();
    }
    return; // Don't process other drag actions when panning
  }
  
  // Freeze input when any context UI is open
  if (typeof contextUI !== 'undefined' && contextUI.isOpen) return;
  
  // Skip if dragging over tile panel area
  if (typeof tilePanelState !== 'undefined' && tilePanelState.isOpen && mouseX > width - 280) return;
  // Skip if dragging over item panel area
  if (typeof itemPanelState !== 'undefined' && itemPanelState.isOpen && mouseX < 320) return;
  
  let gridPos = screenToGrid(mouseX, mouseY);
  
  if (gridPos.x >= 0 && gridPos.x < WORLD_WIDTH && 
      gridPos.y >= 0 && gridPos.y < WORLD_HEIGHT) {
    
    if (selectionTool.mode === 'select' && selectionTool.isDragging) {
      // Update selection area
      selectionTool.endPos = { x: gridPos.x, y: gridPos.y };
    } else if (selectionTool.mode === 'move' && selectionTool.isMoving) {
      // Update move offset
      selectionTool.moveOffset.x = gridPos.x - selectionTool.moveStartPos.x;
      selectionTool.moveOffset.y = gridPos.y - selectionTool.moveStartPos.y;
    } else if (placementState.isDragging && selectionTool.mode === 'tile') {
      // Regular tile placement drag
      placementState.currentPos = { x: gridPos.x, y: gridPos.y };
      
      let isRectMode = placementState.isRectangleMode || keyIsDown(SHIFT);
      
      if (!isRectMode) {
        // Line mode - place tiles along the path
        drawLineBetweenPoints(placementState.lastPlacedPos, gridPos);
        placementState.lastPlacedPos = { x: gridPos.x, y: gridPos.y };
      }
    }
  }
}

// Handle mouse release
function mouseReleased() {
  if (!editMode || !initialized) return;
  
  // Freeze ALL input when any modal/dialog is open
  if (isAnyModalOpen()) return;
  
  // Stop middle mouse button camera panning
  if (mouseButton === CENTER && cameraEditor.isMiddleMousePanning) {
    if (typeof stopCameraPanning === 'function') {
      stopCameraPanning();
    }
    
    // If we didn't move, trigger eyedropper
    if (!cameraEditor.middleMouseMoved) {
      eyedropperPickTile();
    } else {
      console.log('Middle mouse panning stopped');
    }
    
    cameraEditor.isMiddleMousePanning = false;
    cameraEditor.middleMouseMoved = false;
    return; // Don't process other actions when stopping pan
  }
  
  // Handle context UI mouse released
  if (typeof handleContextUIMouseReleased === 'function') {
    handleContextUIMouseReleased();
  }
  
  // Finish light editing if active
  if (typeof finishLightEditing === 'function') {
    finishLightEditing();
  }
  
  let gridPos = screenToGrid(mouseX, mouseY);
  
  if (gridPos.x >= 0 && gridPos.x < WORLD_WIDTH && 
      gridPos.y >= 0 && gridPos.y < WORLD_HEIGHT) {
    
    if (selectionTool.mode === 'select' && selectionTool.isDragging) {
      // Complete selection
      finishSelection();
    } else if (selectionTool.mode === 'move' && selectionTool.isMoving) {
      // Complete move
      finishMove();
    } else if (placementState.isDragging && selectionTool.mode === 'tile') {
      // Complete tile placement
      finishTilePlacement(gridPos);
    }
  }
  
  // Reset drag states
  placementState.isDragging = false;
  selectionTool.isDragging = false;
  selectionTool.isMoving = false;
  placementState.draggedTiles.clear();
}

// Finish selection
function finishSelection() {
  let minX = Math.min(selectionTool.startPos.x, selectionTool.endPos.x);
  let maxX = Math.max(selectionTool.startPos.x, selectionTool.endPos.x);
  let minY = Math.min(selectionTool.startPos.y, selectionTool.endPos.y);
  let maxY = Math.max(selectionTool.startPos.y, selectionTool.endPos.y);
  
  let step = typeof getSnapStep === 'function' ? getSnapStep() : 1;
  
  // Collect tiles by scanning placedTiles keys that fall within bounds
  // This works regardless of which grid size tiles were placed on
  selectionTool.selectedTiles = {};
  let count = 0;
  
  if (typeof tileSystem !== 'undefined' && tileSystem.placedTiles) {
    for (let key in tileSystem.placedTiles) {
      let parts = key.split(',').map(Number);
      let tx = parts[0];
      let ty = parts[1];
      if (tx >= minX && tx <= maxX && ty >= minY && ty <= maxY) {
        let tilesAtPos = tileSystem.placedTiles[key];
        let tiles = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];
        for (let i = 0; i < tiles.length; i++) {
          let tile = tiles[i];
          if (!tile) continue;
          let relativeKey = `${tx - minX},${ty - minY},${i}`;
          selectionTool.selectedTiles[relativeKey] = {
            type: tile.type,
            category: tile.category,
            transform: tile.transform || null,
            layer: tile.layer || 0,
            gridScale: tile.gridScale || 1
          };
          count++;
        }
      }
    }
  }
  
  // Also include light tiles in the selection
  if (typeof tileSystem !== 'undefined' && tileSystem.lightTiles) {
    for (let key in tileSystem.lightTiles) {
      let parts = key.split(',').map(Number);
      let tx = parts[0];
      let ty = parts[1];
      if (tx >= minX && tx <= maxX && ty >= minY && ty <= maxY) {
        let tile = tileSystem.lightTiles[key];
        if (!tile) continue;
        let relativeKey = `${tx - minX},${ty - minY},light`;
        selectionTool.selectedTiles[relativeKey] = {
          type: tile.type,
          category: tile.category,
          transform: tile.transform || null,
          layer: 99,
          gridScale: tile.gridScale || 1
        };
        count++;
      }
    }
  }
  
  // Also include interactive tiles (doors, switches, etc.) in the selection
  if (typeof interactiveTiles !== 'undefined' && Array.isArray(interactiveTiles)) {
    let iIdx = 0;
    for (let iTile of interactiveTiles) {
      if (iTile.x >= minX && iTile.x <= maxX && iTile.y >= minY && iTile.y <= maxY) {
        let relativeKey = `${iTile.x - minX},${iTile.y - minY},interactive_${iIdx}`;
        selectionTool.selectedTiles[relativeKey] = {
          type: iTile.type,
          category: 'interactive',
          transform: iTile.transform ? { ...iTile.transform } : null,
          layer: 100,
          gridScale: 1,
          isInteractive: true,
          linkId: iTile.linkId || null,
          activationId: iTile.activationId || null,
          script: iTile.script || null
        };
        count++;
        iIdx++;
      }
    }
  }
  
  // Selection persists even if no regular tiles found - area may contain
  // interactive tiles, lights, decorations, or be used for paste target
  selectionTool.hasSelection = true;
  selectionTool.startPos = { x: minX, y: minY };
  selectionTool.endPos = { x: maxX, y: maxY };
  
  console.log(`Selected ${count} tiles in area (${minX},${minY}) to (${maxX},${maxY})`);
}

// Finish move
function finishMove() {
  if (selectionTool.moveOffset.x !== 0 || selectionTool.moveOffset.y !== 0) {
    let oldMinX = selectionTool.startPos.x;
    let oldMinY = selectionTool.startPos.y;
    let oldMaxX = selectionTool.endPos.x;
    let oldMaxY = selectionTool.endPos.y;
    
    // Apply the move
    let newStartX = oldMinX + selectionTool.moveOffset.x;
    let newStartY = oldMinY + selectionTool.moveOffset.y;
    let width = oldMaxX - oldMinX;
    let height = oldMaxY - oldMinY;
    let newMaxX = newStartX + width;
    let newMaxY = newStartY + height;
    
    // Capture BEFORE snapshot covering both old and new areas
    let undoMinX = Math.min(oldMinX, newStartX);
    let undoMinY = Math.min(oldMinY, newStartY);
    let undoMaxX = Math.max(oldMaxX, newMaxX);
    let undoMaxY = Math.max(oldMaxY, newMaxY);
    
    let beforeSnapshot = null;
    if (typeof captureAreaSnapshot === 'function') {
      beforeSnapshot = captureAreaSnapshot(undoMinX, undoMinY, undoMaxX, undoMaxY);
    }
    
    // Suppress individual tile undo recording
    if (typeof undoRedoSystem !== 'undefined') undoRedoSystem.suppressRecording = true;
    
    // Clear original selection area
    clearSelectionArea();
    
    // Update selection bounds to new location
    selectionTool.startPos = { x: newStartX, y: newStartY };
    selectionTool.endPos = { x: newMaxX, y: newMaxY };
    
    // Place tiles at new location using shared helper
    if (typeof placeSelectedTiles === 'function') {
      placeSelectedTiles();
    }
    
    if (typeof undoRedoSystem !== 'undefined') undoRedoSystem.suppressRecording = false;
    
    // Record area undo
    if (beforeSnapshot && typeof captureAreaSnapshot === 'function' && typeof recordAreaAction === 'function') {
      let afterSnapshot = captureAreaSnapshot(undoMinX, undoMinY, undoMaxX, undoMaxY);
      recordAreaAction(beforeSnapshot, afterSnapshot, 'Move selection');
    }
    
    console.log(`Moved selection to (${newStartX}, ${newStartY})`);
  }
}

// Finish tile placement
function finishTilePlacement(gridPos) {
  placementState.currentPos = { x: gridPos.x, y: gridPos.y };
  
  let isRectMode = placementState.isRectangleMode || keyIsDown(SHIFT);
  
  if (isRectMode) {
    // Rectangle mode - fill the rectangle
    fillRectangle(placementState.startPos, placementState.currentPos);
    console.log(`Placed rectangle from (${placementState.startPos.x}m, ${placementState.startPos.y}m) to (${placementState.currentPos.x}m, ${placementState.currentPos.y}m)`);
  } else {
    // Line mode - draw final line segment if needed
    drawLineBetweenPoints(placementState.lastPlacedPos, gridPos);
    console.log(`Completed line to (${gridPos.x}m, ${gridPos.y}m)`);
  }
  
  // End undo batch for this drag operation
  if (typeof endUndoBatch === 'function') {
    endUndoBatch();
  }
}

// Handle tile panel clicks
function handleTilePanelClick() {
  if (!tileSystem.definitions) return;
  
  let panelX = width - editorUI.panelWidth + 10;
  let y = 50; // Start after title
  
  // Check category clicks
  for (let categoryName in tileSystem.definitions.categories) {
    if (mouseY >= y && mouseY <= y + 20) {
      editorUI.selectedCategory = categoryName;
      console.log('Selected category:', categoryName);
      return;
    }
    y += 20;
    
    // Skip tile area if category is selected
    if (categoryName === editorUI.selectedCategory) {
      let category = tileSystem.definitions.categories[categoryName];
      let tileCount = Object.keys(category.tiles).length;
      let tilesPerRow = Math.floor((editorUI.panelWidth - 30) / 36);
      let rows = Math.ceil(tileCount / tilesPerRow);
      
      // Check tile clicks
      if (mouseY >= y && mouseY <= y + rows * 36) {
        let tileX = panelX + 10;
        let localY = mouseY - y;
        let localX = mouseX - tileX;
        
        if (localX >= 0 && localX < tilesPerRow * 36) {
          let tileIndex = Math.floor(localY / 36) * tilesPerRow + Math.floor(localX / 36);
          let tileTypes = Object.keys(category.tiles);
          
          if (tileIndex < tileTypes.length) {
            editorUI.selectedTile = tileTypes[tileIndex];
            setSelectedTile(editorUI.selectedTile, editorUI.selectedCategory);
            console.log('Selected tile:', editorUI.selectedTile);
          }
        }
      }
      
      y += rows * 36 + 10;
    }
    y += 5;
  }
}

// Draw line between two points using Bresenham's algorithm
// Uses circular brush for each point along the line
function drawLineBetweenPoints(start, end) {
  let linePoints = getLinePoints(start, end);
  
  for (let point of linePoints) {
    let key = `${point.x},${point.y}`;
    if (!placementState.draggedTiles.has(key)) {
      if (mouseButton === LEFT) {
        // Use circular brush if available
        if (typeof placeTilesInCircle === 'function') {
          placeTilesInCircle(point.x, point.y, editorUI.selectedTile, editorUI.selectedCategory, tileTransform);
        } else {
          placeTile(point.x, point.y, editorUI.selectedTile, editorUI.selectedCategory, tileTransform);
        }
      } else if (mouseButton === RIGHT) {
        if (typeof removeTilesInCircle === 'function') {
          removeTilesInCircle(point.x, point.y);
        } else {
          removeTile(point.x, point.y);
        }
      }
      placementState.draggedTiles.add(key);
    }
  }
}

// Fill rectangle between two points (supports fractional grid steps)
function fillRectangle(start, end) {
  let step = typeof getSnapStep === 'function' ? getSnapStep() : 1;
  let minX = Math.min(start.x, end.x);
  let maxX = Math.max(start.x, end.x);
  let minY = Math.min(start.y, end.y);
  let maxY = Math.max(start.y, end.y);
  
  for (let x = minX; x <= maxX + step * 0.1; x += step) {
    let rx = Math.round(x * 2) / 2;
    for (let y = minY; y <= maxY + step * 0.1; y += step) {
      let ry = Math.round(y * 2) / 2;
      if (mouseButton === LEFT) {
        placeTile(rx, ry, editorUI.selectedTile, editorUI.selectedCategory, tileTransform);
      } else if (mouseButton === RIGHT) {
        removeTile(rx, ry);
      }
    }
  }
}

// Get points along a line using Bresenham's algorithm (supports fractional grid steps)
function getLinePoints(start, end) {
  let points = [];
  let step = typeof getSnapStep === 'function' ? getSnapStep() : 1; // 1.0 or 0.5
  
  // Snap start/end to grid
  let x0 = Math.round(start.x / step) * step;
  let y0 = Math.round(start.y / step) * step;
  let x1 = Math.round(end.x / step) * step;
  let y1 = Math.round(end.y / step) * step;
  
  // Fix floating point
  x0 = Math.round(x0 * 2) / 2;
  y0 = Math.round(y0 * 2) / 2;
  x1 = Math.round(x1 * 2) / 2;
  y1 = Math.round(y1 * 2) / 2;
  
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = (x0 < x1) ? step : -step;
  let sy = (y0 < y1) ? step : -step;
  let err = dx - dy;
  
  let maxIterations = Math.ceil((dx + dy) / step) + 2; // safety limit
  let iterations = 0;
  
  while (iterations++ < maxIterations) {
    points.push({ x: Math.round(x0 * 2) / 2, y: Math.round(y0 * 2) / 2 });
    
    if (Math.abs(x0 - x1) < step * 0.5 && Math.abs(y0 - y1) < step * 0.5) break;
    
    let e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
  
  return points;
}

// Eyedropper tool - pick tile from map on middle-click
function eyedropperPickTile() {
  let gridPos = screenToGrid(mouseX, mouseY);
  
  if (gridPos.x < 0 || gridPos.x >= WORLD_WIDTH || 
      gridPos.y < 0 || gridPos.y >= WORLD_HEIGHT) {
    console.log('[Eyedropper] Click outside world bounds');
    return;
  }
  
  // Get all tiles at this position and find one matching current z-level
  let allTiles = getTileAt(gridPos.x, gridPos.y, true);
  
  if (!allTiles || allTiles.length === 0) {
    console.log(`[Eyedropper] No tile at (${gridPos.x}, ${gridPos.y})`);
    return;
  }
  
  // Find tile at current z-level (layer matches currentZLevel)
  // currentZLevel: 0=ground, 1=objects, 2=upper walls, 3=roofs
  let tile = null;
  
  // First try to find exact layer match
  for (let t of allTiles) {
    let tileLayer = t.layer !== undefined ? t.layer : 0;
    if (tileLayer === currentZLevel) {
      tile = t;
      break;
    }
  }
  
  // If no exact match, pick highest visible tile (layer <= currentZLevel)
  if (!tile) {
    for (let i = allTiles.length - 1; i >= 0; i--) {
      let tileLayer = allTiles[i].layer !== undefined ? allTiles[i].layer : 0;
      if (tileLayer <= currentZLevel) {
        tile = allTiles[i];
        break;
      }
    }
  }
  
  if (!tile) {
    console.log(`[Eyedropper] No tile at z-level ${currentZLevel} at (${gridPos.x}, ${gridPos.y})`);
    return;
  }
  
  // Set as selected tile
  editorUI.selectedTile = tile.type;
  editorUI.selectedCategory = tile.category;
  
  // Copy transform if present
  if (tile.transform) {
    tileTransform.rotation = tile.transform.rotation || 0;
    tileTransform.flipState = tile.transform.flipState || 0;
    tileTransform.flipped = tile.transform.flipped || false;
  } else {
    tileTransform.rotation = 0;
    tileTransform.flipState = 0;
    tileTransform.flipped = false;
  }
  
  // Update tile panel selection if function exists
  if (typeof setSelectedTile === 'function') {
    setSelectedTile(tile.type, tile.category);
  }
  
  // Update tile panel UI if open
  if (typeof tilePanelState !== 'undefined' && tilePanelState.isOpen) {
    tilePanelState.selectedTile = tile.type;
    tilePanelState.selectedCategory = tile.category;
    if (typeof updateTilePanelInfo === 'function') {
      updateTilePanelInfo();
    }
  }
  
  console.log(`[Eyedropper] Picked: ${tile.type} (${tile.category}) layer:${tile.layer !== undefined ? tile.layer : 0} rotation:${tileTransform.rotation}° flip:${tileTransform.flipState}`);
}

// Handle text input for modals
function keyTyped() {
  // Handle context UI input first
  if (typeof contextUI !== 'undefined' && contextUI.isOpen && contextUI.type === 'saveload') {
      if (contextUI.saveLoadControls.mode === 'save') {
      // Handle text input for save mode
      if ((key >= ' ' && key <= '~')) {
        contextUI.saveLoadControls.currentMapName += key;
      }
    }
    return;
  }
  
  // Handle old save modal (if still open)
  if (!saveModal.isOpen) return;

  if (saveModal.mode === 'save') {
    // Handle text input for save mode
    if ((key >= ' ' && key <= '~')) {
      saveModal.currentMapName += key;
    }
  } else {
    // Handle number selection for load/delete mode
    let num = parseInt(key);
    if (num >= 1 && num <= saveModal.availableMaps.length) {
      saveModal.selectedMap = saveModal.availableMaps[num - 1];
      console.log('Selected map:', saveModal.selectedMap);
    }
  }
}
