// ============================================================================
// HUD - Heads-Up Display
// ============================================================================
// Uses the game_ui.js widget system to render in-game HUD elements:
//   • Health bar (bound to healthState)
//   • Position / coordinates display
//   • Status icon row (placeholder for future buffs/debuffs)
//   • Notification toast API (gameUILayer.notify)
//   • Toggle visibility via CONTROLS.TOGGLE_HUD
//
// This file runs AFTER game_ui.js and health.js are loaded.
// ============================================================================

(function () {
  'use strict';

  // ── Configuration ───────────────────────────────────────────────────────

  const HUD_CONFIG = {
    // Health bar
    healthBar: {
      x: 12, y: 12,
      w: 160, h: 18,
      anchor: 'top-left',
      labelSize: 10,
      animSpeed: 6,
    },
    // Coordinates display
    coords: {
      x: 12, y: 36,
      anchor: 'top-left',
      fontSize: 11,
      color: [180, 180, 190],
      shadow: [0, 0, 0, 180],
    },
    // Status row (buffs/debuffs - future)
    statusRow: {
      x: 12, y: 56,
      anchor: 'top-left',
      iconSize: 20,
      gap: 4,
    },
    // Interaction prompt
    prompt: {
      x: 0, y: -50,
      anchor: 'bottom-center',
      fontSize: 14,
      color: [255, 255, 255],
      shadow: [0, 0, 0, 200],
    },
  };

  // ── State ───────────────────────────────────────────────────────────────

  let _hudInitialized = false;
  let _hudVisible = true;
  let _promptText = '';
  let _promptTimer = 0;

  // References to widgets (set during init)
  let _healthBar = null;
  let _healthLabel = null;
  let _coordsText = null;
  let _statusPanel = null;
  let _promptWidget = null;

  // ── Health color function ───────────────────────────────────────────────

  function healthColor(pct) {
    if (pct > 0.5) {
      // Green → Yellow interpolation
      const t = (pct - 0.5) * 2; // 1 at full, 0 at 50%
      return [Math.floor(255 * (1 - t)), Math.floor(200 + 55 * t), 0];
    } else {
      // Yellow → Red interpolation
      const t = pct * 2; // 1 at 50%, 0 at 0%
      return [255, Math.floor(200 * t), 0];
    }
  }

  // ── Initialization ──────────────────────────────────────────────────────

  function initHUD() {
    if (_hudInitialized) return;
    if (typeof gameUILayer === 'undefined') {
      console.warn('[HUD] gameUILayer not ready - deferring init');
      return;
    }

    // ── Health bar panel ────────────────────────────────────────────────
    const hbCfg = HUD_CONFIG.healthBar;

    const healthPanel = new UIPanel({
      id: 'hud-health-panel',
      x: hbCfg.x, y: hbCfg.y,
      w: hbCfg.w + 8, h: hbCfg.h + 20,
      anchor: hbCfg.anchor,
      bg: [20, 20, 30, 180],
      border: [60, 60, 80],
      radius: 6,
      padding: 4,
    });

    // "HP" label
    _healthLabel = new UIText({
      id: 'hud-health-label',
      x: 4, y: 2,
      text: 'HP',
      fontSize: 10,
      color: [160, 160, 180],
    });
    healthPanel.addChild(_healthLabel);

    // Health value text (right-aligned)
    const healthValueText = new UIText({
      id: 'hud-health-value',
      x: hbCfg.w + 4, y: 2,
      text: '',
      fontSize: 10,
      color: [200, 200, 210],
      align: 'RIGHT',
    });
    healthPanel.addChild(healthValueText);

    // The actual bar
    _healthBar = new UIBar({
      id: 'hud-health-bar',
      x: 4, y: 15,
      w: hbCfg.w, h: hbCfg.h,
      fillColor: [0, 220, 0],
      bgColor: [40, 10, 10],
      borderColor: [100, 100, 120],
      animate: true,
      animSpeed: hbCfg.animSpeed,
      colorFn: healthColor,
    });
    healthPanel.addChild(_healthBar);

    gameUILayer.add('hud-health', healthPanel);

    // ── Coordinates text ────────────────────────────────────────────────
    const cCfg = HUD_CONFIG.coords;

    _coordsText = new UIText({
      id: 'hud-coords',
      x: cCfg.x, y: cCfg.y + 30,
      anchor: cCfg.anchor,
      text: '',
      fontSize: cCfg.fontSize,
      color: cCfg.color,
      shadow: cCfg.shadow,
    });
    gameUILayer.add('hud-coords', _coordsText);

    // ── Status row (placeholder panel) ──────────────────────────────────
    const sCfg = HUD_CONFIG.statusRow;

    _statusPanel = new UIPanel({
      id: 'hud-status-row',
      x: sCfg.x, y: sCfg.y + 30,
      w: (sCfg.iconSize + sCfg.gap) * 6, // room for 6 icons
      h: sCfg.iconSize + 4,
      anchor: sCfg.anchor,
      bg: null,
      border: null,
    });
    gameUILayer.add('hud-status', _statusPanel);

    // ── Interaction prompt ──────────────────────────────────────────────
    const pCfg = HUD_CONFIG.prompt;

    _promptWidget = new UIText({
      id: 'hud-prompt',
      x: pCfg.x, y: pCfg.y,
      anchor: pCfg.anchor,
      text: '',
      fontSize: pCfg.fontSize,
      color: pCfg.color,
      shadow: pCfg.shadow,
      align: 'CENTER',
      visible: false,
    });
    gameUILayer.add('hud-prompt', _promptWidget);

    _hudInitialized = true;
    console.log('[HUD] ✓ HUD initialized - health bar, coords, status, prompt');
  }

  // ── Per-Frame Update ────────────────────────────────────────────────────

  function updateHUD() {
    if (!_hudInitialized) {
      initHUD();
      if (!_hudInitialized) return;
    }

    // Skip in edit mode
    if (typeof editMode !== 'undefined' && editMode) return;

    // ── Health bar sync ─────────────────────────────────────────────────
    if (_healthBar && typeof healthState !== 'undefined' && healthState.enabled) {
      _healthBar.setValue(healthState.currentHealth, healthState.maxHealth);
      _healthBar.visible = true;

      // Update value text
      const healthPanel = gameUILayer.get('hud-health');
      if (healthPanel) {
        healthPanel.visible = true;
        const valueText = healthPanel.find('hud-health-value');
        if (valueText) {
          valueText.text = `${Math.ceil(healthState.currentHealth)}/${healthState.maxHealth}`;
        }
      }
    } else if (_healthBar) {
      // Health system disabled - hide health panel
      const healthPanel = gameUILayer.get('hud-health');
      if (healthPanel) healthPanel.visible = false;
    }

    // ── Coordinates ─────────────────────────────────────────────────────
    if (_coordsText && typeof player !== 'undefined') {
      _coordsText.text = `${player.x.toFixed(1)}, ${player.y.toFixed(1)}`;
    }

    // ── Prompt timeout ──────────────────────────────────────────────────
    if (_promptWidget && _promptTimer > 0) {
      _promptTimer -= (typeof deltaTime !== 'undefined' ? deltaTime : 16) / 1000;
      if (_promptTimer <= 0) {
        _promptWidget.visible = false;
        _promptWidget.text = '';
        _promptText = '';
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Show a temporary interaction prompt at the bottom of the screen.
   * @param {string} message - e.g. "Press E to open door"
   * @param {number} [duration=2] - seconds
   */
  function showPrompt(message, duration) {
    if (!_promptWidget) return;
    duration = duration ?? 2;
    _promptWidget.text = message;
    _promptWidget.visible = true;
    _promptText = message;
    _promptTimer = duration;
  }

  /** Hide the interaction prompt immediately. */
  function hidePrompt() {
    if (!_promptWidget) return;
    _promptWidget.text = '';
    _promptWidget.visible = false;
    _promptText = '';
    _promptTimer = 0;
  }

  /** Toggle HUD visibility. */
  function toggleHUD() {
    _hudVisible = !_hudVisible;
    if (typeof gameUILayer !== 'undefined') {
      gameUILayer.visible = _hudVisible;
    }
    console.log(`[HUD] Visibility: ${_hudVisible ? 'ON' : 'OFF'}`);
  }

  /** Check if HUD is visible. */
  function isHUDVisible() {
    return _hudVisible;
  }

  /**
   * Add a status icon to the status row.
   * @param {string} id - unique identifier
   * @param {string} label - short label (1-3 chars)
   * @param {number[]} color - [r, g, b]
   */
  function addStatusIcon(id, label, color) {
    if (!_statusPanel) return;
    const cfg = HUD_CONFIG.statusRow;
    const idx = _statusPanel.children.length;
    const icon = new UIPanel({
      id: `hud-status-${id}`,
      x: idx * (cfg.iconSize + cfg.gap),
      y: 2,
      w: cfg.iconSize,
      h: cfg.iconSize,
      bg: [...color, 180],
      border: [200, 200, 210],
      radius: 3,
    });
    const iconLabel = new UIText({
      x: cfg.iconSize / 2, y: cfg.iconSize / 2,
      text: label,
      fontSize: 9,
      color: [255, 255, 255],
      align: 'CENTER',
      vAlign: 'CENTER',
    });
    icon.addChild(iconLabel);
    _statusPanel.addChild(icon);
  }

  /** Remove a status icon by id. */
  function removeStatusIcon(id) {
    if (!_statusPanel) return;
    _statusPanel.removeChild(`hud-status-${id}`);
    // Reflow remaining icons
    const cfg = HUD_CONFIG.statusRow;
    _statusPanel.children.forEach((child, i) => {
      child.x = i * (cfg.iconSize + cfg.gap);
    });
  }

  // ── Engine Integration ──────────────────────────────────────────────────

  // Hook into the game loop - updateHUD is called each frame from engine.js
  // via the gameUILayer.update() pipeline, but we need our sync logic too.
  // We override gameUILayer.update to call updateHUD first.

  const _origUpdate = (typeof gameUILayer !== 'undefined' && gameUILayer.update)
    ? gameUILayer.update.bind(gameUILayer)
    : null;

  if (typeof gameUILayer !== 'undefined') {
    gameUILayer.update = function (dt) {
      updateHUD();
      if (_origUpdate) _origUpdate(dt);
    };
  }

  // ── Global Exports ──────────────────────────────────────────────────────

  window.initHUD        = initHUD;
  window.updateHUD      = updateHUD;
  window.toggleHUD      = toggleHUD;
  window.isHUDVisible   = isHUDVisible;
  window.showPrompt     = showPrompt;
  window.hidePrompt     = hidePrompt;
  window.addStatusIcon  = addStatusIcon;
  window.removeStatusIcon = removeStatusIcon;

  console.log('[HUD] ✓ HUD module loaded - call initHUD() or wait for first frame');

})();
