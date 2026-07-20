// ============================================================================
// DIALOG UI - Conversation System
// ============================================================================
// Renders dialog boxes for NPC/signpost conversations with:
//   • Speaker name + portrait area
//   • Typewriter text reveal effect
//   • Multiple-choice response menu with keyboard navigation
//   • Blocks player movement while active
//   • Fires Engine events on open/close/choice
//
// Usage:
//   showDialog({
//     speaker: 'Old Man',
//     text: 'Beware the cave to the north!',
//     portrait: null,                        // optional p5.Image or path
//     choices: [                             // optional - omit for simple OK
//       { label: 'Tell me more', value: 'more' },
//       { label: 'Goodbye',     value: 'bye'  },
//     ],
//     onChoice: (value) => { ... },          // callback
//     onClose:  () => { ... },               // callback
//   });
//
// Keys (from CONTROLS):
//   DIALOG_ADVANCE  - advance typewriter / confirm choice / close
//   MOVE_UP/DOWN    - navigate choices
//
// This file runs AFTER game_ui.js and engine_registry.js.
// ============================================================================

(function () {
  'use strict';

  // ── Configuration ───────────────────────────────────────────────────────

  const DIALOG_CFG = {
    // Box layout (relative to bottom-center anchor)
    boxWidth:    500,
    boxHeight:   140,
    boxOffsetY:  -20,         // pixels above bottom edge
    boxBg:       [15, 15, 25, 230],
    boxBorder:   [90, 90, 120],
    boxRadius:   8,
    boxPadding:  12,

    // Speaker name
    nameColor:   [255, 220, 80],
    nameFontSize: 14,

    // Body text
    textColor:   [230, 230, 240],
    textFontSize: 13,
    textLineHeight: 18,

    // Typewriter
    charsPerSecond: 40,       // typing speed

    // Portrait (optional left-side image)
    portraitSize: 64,
    portraitGap:  10,

    // Choices
    choiceColor:         [200, 200, 210],
    choiceHighlight:     [255, 220, 80],
    choiceHighlightBg:   [50, 50, 70, 180],
    choiceFontSize:      13,
    choiceMarkerChar:    '▸',

    // Advance indicator
    advanceText: '▼',
    advanceColor: [180, 180, 200],
    advanceBlink: 0.4,       // seconds per blink cycle
  };

  // ── State ───────────────────────────────────────────────────────────────

  let _dialogState = {
    active:       false,
    speaker:      '',
    text:         '',
    portrait:     null,       // p5.Image or null
    choices:      [],         // { label, value }[]
    onChoice:     null,
    onClose:      null,

    // Typewriter
    revealedChars: 0,
    typeTimer:     0,
    fullyRevealed: false,

    // Choice selection
    selectedChoice: 0,

    // Queue for chained dialogs
    queue:        [],
  };

  // Loaded portrait images cache
  const _portraitCache = new Map();

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Show a dialog box. Blocks player movement while active.
   *
   * @param {object} opts
   * @param {string}  opts.speaker   - Speaker name (or '' for narration)
   * @param {string}  opts.text      - Dialog body text
   * @param {*}       [opts.portrait]- Image path (string) or p5.Image, or null
   * @param {Array}   [opts.choices] - Array of { label, value } objects
   * @param {function}[opts.onChoice]- Called with selected choice value
   * @param {function}[opts.onClose] - Called when dialog closes (no choices)
   */
  function showDialog(opts) {
    if (!opts || !opts.text) return;

    // If already in a dialog, queue this one
    if (_dialogState.active) {
      _dialogState.queue.push(opts);
      return;
    }

    _dialogState.active        = true;
    _dialogState.speaker       = opts.speaker || '';
    _dialogState.text          = opts.text;
    _dialogState.choices       = opts.choices || [];
    _dialogState.onChoice      = opts.onChoice || null;
    _dialogState.onClose       = opts.onClose || null;
    _dialogState.revealedChars = 0;
    _dialogState.typeTimer     = 0;
    _dialogState.fullyRevealed = false;
    _dialogState.selectedChoice = 0;

    // Portrait
    _dialogState.portrait = null;
    if (opts.portrait) {
      if (typeof opts.portrait === 'string') {
        // Load from path (cached)
        if (_portraitCache.has(opts.portrait)) {
          _dialogState.portrait = _portraitCache.get(opts.portrait);
        } else if (typeof loadImage === 'function') {
          const img = loadImage(opts.portrait, () => {
            _portraitCache.set(opts.portrait, img);
          });
          _dialogState.portrait = img;
          _portraitCache.set(opts.portrait, img);
        }
      } else {
        _dialogState.portrait = opts.portrait;
      }
    }

    // Freeze player
    if (typeof player !== 'undefined') {
      player.velocity = { x: 0, y: 0 };
    }

    // Emit engine event
    if (typeof Engine !== 'undefined') {
      Engine.emit('dialog.opened', { speaker: _dialogState.speaker });
    }

    console.log(`[Dialog] Opened - speaker: "${_dialogState.speaker}"`);
  }

  /**
   * Queue multiple dialog steps (convenience for multi-line conversations).
   * @param {Array} steps - Array of showDialog option objects
   */
  function showDialogChain(steps) {
    if (!steps || steps.length === 0) return;
    showDialog(steps[0]);
    for (let i = 1; i < steps.length; i++) {
      _dialogState.queue.push(steps[i]);
    }
  }

  /** Close the current dialog. Plays next in queue if any. */
  function closeDialog() {
    if (!_dialogState.active) return;

    const hadChoices = _dialogState.choices.length > 0;
    const cb = hadChoices ? null : _dialogState.onClose;

    _dialogState.active   = false;
    _dialogState.speaker  = '';
    _dialogState.text     = '';
    _dialogState.choices  = [];
    _dialogState.portrait = null;
    _dialogState.onChoice = null;
    _dialogState.onClose  = null;

    if (typeof Engine !== 'undefined') {
      Engine.emit('dialog.closed', {});
    }

    // Fire onClose callback
    if (cb) cb();

    // Play next queued dialog
    if (_dialogState.queue.length > 0) {
      const next = _dialogState.queue.shift();
      showDialog(next);
    } else {
      console.log('[Dialog] Closed');
    }
  }

  /** Is a dialog currently active? */
  function isDialogActive() {
    return _dialogState.active;
  }

  // ── Input Handling ──────────────────────────────────────────────────────

  /**
   * Called from keyPressed() when dialog is active.
   * Returns true if the key was consumed.
   */
  function handleDialogInput() {
    if (!_dialogState.active) return false;

    // Advance / confirm
    if (matchesKey('DIALOG_ADVANCE') || matchesKey('INTERACT') || matchesKey('CONFIRM')) {
      if (!_dialogState.fullyRevealed) {
        // Skip typewriter - reveal all text instantly
        _dialogState.revealedChars = _dialogState.text.length;
        _dialogState.fullyRevealed = true;
      } else if (_dialogState.choices.length > 0) {
        // Confirm selected choice
        const choice = _dialogState.choices[_dialogState.selectedChoice];
        const cb = _dialogState.onChoice;
        if (typeof Engine !== 'undefined') {
          Engine.emit('dialog.choice', { value: choice.value, label: choice.label });
        }
        closeDialog();
        if (cb) cb(choice.value);
      } else {
        // No choices - just close
        closeDialog();
      }
      return true;
    }

    // Navigate choices
    if (_dialogState.choices.length > 0 && _dialogState.fullyRevealed) {
      if (matchesKey('MOVE_UP')) {
        _dialogState.selectedChoice = Math.max(0, _dialogState.selectedChoice - 1);
        return true;
      }
      if (matchesKey('MOVE_DOWN')) {
        _dialogState.selectedChoice = Math.min(
          _dialogState.choices.length - 1,
          _dialogState.selectedChoice + 1
        );
        return true;
      }
    }

    // Escape closes dialog AND clears the queue (fully exit conversation)
    if (matchesKey('ESCAPE')) {
      _dialogState.queue = [];   // discard remaining chain steps
      closeDialog();
      return true;
    }

    // Consume all other keys while dialog is active
    return true;
  }

  // ── Update (Typewriter) ─────────────────────────────────────────────────

  function updateDialog(dt) {
    if (!_dialogState.active) return;

    if (!_dialogState.fullyRevealed) {
      _dialogState.typeTimer += dt;
      const charsToShow = Math.floor(_dialogState.typeTimer * DIALOG_CFG.charsPerSecond);
      if (charsToShow >= _dialogState.text.length) {
        _dialogState.revealedChars = _dialogState.text.length;
        _dialogState.fullyRevealed = true;
      } else {
        _dialogState.revealedChars = charsToShow;
      }
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  function drawDialog() {
    if (!_dialogState.active) return;

    const cfg = DIALOG_CFG;
    const cw = typeof width  !== 'undefined' ? width  : 800;
    const ch = typeof height !== 'undefined' ? height : 600;

    push();
    resetMatrix();

    // ── Dim overlay ─────────────────────────────────────────────────────
    fill(0, 0, 0, 60);
    noStroke();
    rect(0, 0, cw, ch);

    // ── Box position (bottom-center) ────────────────────────────────────
    const bx = (cw - cfg.boxWidth) / 2;
    const by = ch - cfg.boxHeight + cfg.boxOffsetY;

    // Box background
    fill(...cfg.boxBg);
    stroke(...cfg.boxBorder);
    strokeWeight(2);
    rect(bx, by, cfg.boxWidth, cfg.boxHeight, cfg.boxRadius);

    // ── Content area ────────────────────────────────────────────────────
    let contentX = bx + cfg.boxPadding;
    let contentY = by + cfg.boxPadding;
    let contentW = cfg.boxWidth - cfg.boxPadding * 2;

    // Portrait (left side)
    if (_dialogState.portrait) {
      try {
        noTint();
        image(
          _dialogState.portrait,
          contentX, contentY,
          cfg.portraitSize, cfg.portraitSize
        );
        // Border around portrait
        noFill();
        stroke(...cfg.boxBorder);
        strokeWeight(1);
        rect(contentX, contentY, cfg.portraitSize, cfg.portraitSize, 4);
      } catch (e) { /* image not loaded yet */ }

      contentX += cfg.portraitSize + cfg.portraitGap;
      contentW -= cfg.portraitSize + cfg.portraitGap;
    }

    // ── Speaker name ────────────────────────────────────────────────────
    let textY = contentY;
    if (_dialogState.speaker) {
      noStroke();
      fill(...cfg.nameColor);
      textSize(cfg.nameFontSize);
      textFont('Arial, sans-serif');
      textAlign(LEFT, TOP);
      text(_dialogState.speaker, contentX, textY);
      textY += cfg.nameFontSize + 4;
    }

    // ── Body text (typewriter) ──────────────────────────────────────────
    const visibleText = _dialogState.text.substring(0, _dialogState.revealedChars);
    noStroke();
    fill(...cfg.textColor);
    textSize(cfg.textFontSize);
    textFont('Arial, sans-serif');
    textAlign(LEFT, TOP);

    // Calculate available height for text
    const choiceAreaHeight = _dialogState.choices.length > 0
      ? _dialogState.choices.length * (cfg.choiceFontSize + 6) + 8
      : 0;
    const textAreaHeight = cfg.boxHeight - cfg.boxPadding * 2
      - (_dialogState.speaker ? cfg.nameFontSize + 4 : 0)
      - choiceAreaHeight;

    text(visibleText, contentX, textY, contentW, textAreaHeight);

    // ── Choices ──────────────────────────────────────────────────────────
    if (_dialogState.choices.length > 0 && _dialogState.fullyRevealed) {
      const choiceStartY = by + cfg.boxHeight - cfg.boxPadding - choiceAreaHeight;

      for (let i = 0; i < _dialogState.choices.length; i++) {
        const cy = choiceStartY + i * (cfg.choiceFontSize + 6);
        const isSelected = i === _dialogState.selectedChoice;

        // Highlight background
        if (isSelected) {
          fill(...cfg.choiceHighlightBg);
          noStroke();
          rect(contentX - 4, cy - 2, contentW + 8, cfg.choiceFontSize + 6, 3);
        }

        // Choice text
        noStroke();
        fill(...(isSelected ? cfg.choiceHighlight : cfg.choiceColor));
        textSize(cfg.choiceFontSize);
        textAlign(LEFT, TOP);
        const marker = isSelected ? cfg.choiceMarkerChar + ' ' : '  ';
        text(marker + _dialogState.choices[i].label, contentX, cy);
      }
    }

    // ── Advance indicator (blinking ▼) ──────────────────────────────────
    if (_dialogState.fullyRevealed && _dialogState.choices.length === 0) {
      const blinkAlpha = (Math.sin(Date.now() / (cfg.advanceBlink * 1000) * Math.PI) + 1) / 2;
      fill(cfg.advanceColor[0], cfg.advanceColor[1], cfg.advanceColor[2], blinkAlpha * 255);
      noStroke();
      textSize(16);
      textAlign(RIGHT, BOTTOM);
      text(cfg.advanceText, bx + cfg.boxWidth - cfg.boxPadding, by + cfg.boxHeight - cfg.boxPadding);
    }

    pop();
  }

  // ── Integration: Hook into gameUILayer ──────────────────────────────────

  // Wrap gameUILayer.update to include dialog typewriter update
  if (typeof gameUILayer !== 'undefined') {
    const _prevUpdate = gameUILayer.update.bind(gameUILayer);
    gameUILayer.update = function (dt) {
      updateDialog(dt);
      _prevUpdate(dt);
    };
    // NOTE: drawDialog() is called explicitly in engine.js AFTER the hotbar
    // so the conversation box renders on top of all in-game UI.
  }

  // ── Global Exports ──────────────────────────────────────────────────────

  window.showDialog       = showDialog;
  window.showDialogChain  = showDialogChain;
  window.closeDialog      = closeDialog;
  window.isDialogActive   = isDialogActive;
  window.handleDialogInput = handleDialogInput;
  window.updateDialog     = updateDialog;
  window.drawDialog       = drawDialog;

  console.log('[Dialog] ✓ Dialog system loaded - showDialog(), showDialogChain()');

})();
