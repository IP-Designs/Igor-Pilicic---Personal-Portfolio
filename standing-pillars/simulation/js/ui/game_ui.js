// ============================================================================
// GAME UI FRAMEWORK - Runtime Widget System
// ============================================================================
// Provides screen-space UI widgets for in-game HUD, dialogs, inventory, etc.
// Renders on the p5.js canvas AFTER the world (not affected by camera/zoom).
//
// Architecture:
//   UIWidget (base)  ← UIPanel, UIText, UIBar, UIImage, UISlotGrid
//   UILayer          ← root container holding all top-level widgets
//
// Anchoring:
//   Every widget has an `anchor` property that positions it relative to
//   the canvas: 'top-left', 'top-center', 'top-right', 'center-left',
//   'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'
//
// Usage:
//   const panel = new UIPanel({ x: 10, y: 10, w: 200, h: 60, anchor: 'top-left' });
//   panel.addChild(new UIText({ text: 'Hello', x: 5, y: 5 }));
//   gameUILayer.add('myPanel', panel);
//
// Registered as Engine system 'gameUI' with render() lifecycle.
// ============================================================================

(function () {
  'use strict';

  // ── Anchor Resolution ───────────────────────────────────────────────────

  /**
   * Resolve an anchor keyword to a pixel origin on the canvas.
   * @param {string} anchor - One of 9 anchor points
   * @returns {{ x: number, y: number }}
   */
  function resolveAnchor(anchor) {
    const w = typeof width  !== 'undefined' ? width  : 800;
    const h = typeof height !== 'undefined' ? height : 600;
    switch (anchor) {
      case 'top-left':       return { x: 0,       y: 0 };
      case 'top-center':     return { x: w / 2,   y: 0 };
      case 'top-right':      return { x: w,       y: 0 };
      case 'center-left':    return { x: 0,       y: h / 2 };
      case 'center':         return { x: w / 2,   y: h / 2 };
      case 'center-right':   return { x: w,       y: h / 2 };
      case 'bottom-left':    return { x: 0,       y: h };
      case 'bottom-center':  return { x: w / 2,   y: h };
      case 'bottom-right':   return { x: w,       y: h };
      default:               return { x: 0,       y: 0 };
    }
  }

  // ── UIWidget (Base Class) ───────────────────────────────────────────────

  class UIWidget {
    /**
     * @param {object} opts
     * @param {number}  [opts.x=0]        - X offset from anchor / parent
     * @param {number}  [opts.y=0]        - Y offset from anchor / parent
     * @param {number}  [opts.w=0]        - Width  (0 = auto / unused)
     * @param {number}  [opts.h=0]        - Height (0 = auto / unused)
     * @param {string}  [opts.anchor]     - Anchor point (only for root-level widgets)
     * @param {boolean} [opts.visible=true]
     * @param {number}  [opts.alpha=255]  - Opacity 0–255
     * @param {string}  [opts.id]         - Optional identifier
     */
    constructor(opts = {}) {
      this.x       = opts.x ?? 0;
      this.y       = opts.y ?? 0;
      this.w       = opts.w ?? 0;
      this.h       = opts.h ?? 0;
      this.anchor  = opts.anchor || null;
      this.visible = opts.visible !== false;
      this.alpha   = opts.alpha ?? 255;
      this.id      = opts.id || null;
      this.parent  = null;
      this.children = [];
      this._dirty  = true;
    }

    /** Add a child widget (positioned relative to this widget). */
    addChild(child) {
      child.parent = this;
      this.children.push(child);
      return this;
    }

    /** Remove a child widget by reference or id. */
    removeChild(childOrId) {
      const idx = typeof childOrId === 'string'
        ? this.children.findIndex(c => c.id === childOrId)
        : this.children.indexOf(childOrId);
      if (idx !== -1) {
        this.children[idx].parent = null;
        this.children.splice(idx, 1);
      }
      return this;
    }

    /** Find a descendant by id (depth-first). */
    find(id) {
      if (this.id === id) return this;
      for (const child of this.children) {
        const found = child.find(id);
        if (found) return found;
      }
      return null;
    }

    /** Get absolute screen position (resolves anchor + parent chain). */
    getScreenPos() {
      let ox = this.x;
      let oy = this.y;

      if (this.anchor) {
        const a = resolveAnchor(this.anchor);
        ox += a.x;
        oy += a.y;
      }

      if (this.parent) {
        const pp = this.parent.getScreenPos();
        ox += pp.x;
        oy += pp.y;
      }

      return { x: ox, y: oy };
    }

    /** Check if a screen point is inside this widget's bounding box. */
    containsPoint(sx, sy) {
      const pos = this.getScreenPos();
      return sx >= pos.x && sx <= pos.x + this.w &&
             sy >= pos.y && sy <= pos.y + this.h;
    }

    /**
     * Override in subclasses to draw the widget.
     * Called inside a push()/pop() with translation already applied.
     */
    drawSelf() { /* abstract */ }

    /** Full draw: visibility check, push/translate, drawSelf, children, pop. */
    draw() {
      if (!this.visible || this.alpha <= 0) return;

      push();

      // Resolve position
      let ox = this.x;
      let oy = this.y;
      if (this.anchor && !this.parent) {
        const a = resolveAnchor(this.anchor);
        ox += a.x;
        oy += a.y;
      }
      translate(ox, oy);

      // Apply alpha
      if (this.alpha < 255) {
        drawingContext.globalAlpha = this.alpha / 255;
      }

      this.drawSelf();

      // Draw children
      for (const child of this.children) {
        child.draw();
      }

      pop();
    }

    /** Per-frame update (override in subclasses). */
    update(dt) {
      for (const child of this.children) {
        child.update(dt);
      }
    }
  }

  // ── UIPanel ─────────────────────────────────────────────────────────────

  class UIPanel extends UIWidget {
    /**
     * @param {object} opts - UIWidget opts plus:
     * @param {number[]} [opts.bg=[30,30,40,200]]     - Background RGBA
     * @param {number[]} [opts.border=[100,100,120]]   - Border RGB (null = no border)
     * @param {number}   [opts.borderWeight=1]
     * @param {number}   [opts.radius=4]               - Corner radius
     * @param {number}   [opts.padding=0]               - Inner padding (informational)
     */
    constructor(opts = {}) {
      super(opts);
      this.bg           = opts.bg     ?? [30, 30, 40, 200];
      this.border       = opts.border ?? [100, 100, 120];
      this.borderWeight = opts.borderWeight ?? 1;
      this.radius       = opts.radius ?? 4;
      this.padding      = opts.padding ?? 0;
    }

    drawSelf() {
      // Background
      if (this.bg) {
        fill(...this.bg);
      } else {
        noFill();
      }

      // Border
      if (this.border) {
        stroke(...this.border);
        strokeWeight(this.borderWeight);
      } else {
        noStroke();
      }

      rect(0, 0, this.w, this.h, this.radius);
    }
  }

  // ── UIText ──────────────────────────────────────────────────────────────

  class UIText extends UIWidget {
    /**
     * @param {object} opts - UIWidget opts plus:
     * @param {string}   [opts.text='']
     * @param {number}   [opts.fontSize=14]
     * @param {number[]} [opts.color=[255,255,255]]
     * @param {string}   [opts.align='LEFT']          - LEFT, CENTER, RIGHT
     * @param {string}   [opts.vAlign='TOP']          - TOP, CENTER, BOTTOM (for single-line)
     * @param {string}   [opts.font='Arial, sans-serif']
     * @param {boolean}  [opts.wrap=false]             - Enable word wrapping (needs w > 0)
     * @param {number[]} [opts.shadow]                 - Shadow color RGBA (null = no shadow)
     */
    constructor(opts = {}) {
      super(opts);
      this.text     = opts.text ?? '';
      this.fontSize = opts.fontSize ?? 14;
      this.color    = opts.color ?? [255, 255, 255];
      this.align    = opts.align ?? 'LEFT';
      this.vAlign   = opts.vAlign ?? 'TOP';
      this.font     = opts.font ?? 'Arial, sans-serif';
      this.wrap     = opts.wrap ?? false;
      this.shadow   = opts.shadow ?? null;
    }

    drawSelf() {
      if (!this.text) return;

      noStroke();
      textFont(this.font);
      textSize(this.fontSize);

      const hAlign = this.align === 'CENTER' ? CENTER
                   : this.align === 'RIGHT'  ? RIGHT
                   : LEFT;
      const vAlignP5 = this.vAlign === 'CENTER' ? CENTER
                     : this.vAlign === 'BOTTOM' ? BOTTOM
                     : TOP;
      textAlign(hAlign, vAlignP5);

      // Shadow
      if (this.shadow) {
        fill(...this.shadow);
        if (this.wrap && this.w > 0) {
          text(this.text, 1, 1, this.w, this.h || 9999);
        } else {
          text(this.text, 1, 1);
        }
      }

      // Main text
      fill(...this.color);
      if (this.wrap && this.w > 0) {
        text(this.text, 0, 0, this.w, this.h || 9999);
      } else {
        text(this.text, 0, 0);
      }
    }
  }

  // ── UIBar ───────────────────────────────────────────────────────────────

  class UIBar extends UIWidget {
    /**
     * @param {object} opts - UIWidget opts plus:
     * @param {number}   [opts.value=1]       - Current value 0–1
     * @param {number}   [opts.maxValue=1]     - Max value (for display; fill = value/maxValue)
     * @param {number[]} [opts.fillColor=[0,200,0]]
     * @param {number[]} [opts.bgColor=[50,50,50]]
     * @param {number[]} [opts.borderColor=[150,150,150]]
     * @param {string}   [opts.label]          - Optional text overlay
     * @param {number}   [opts.labelSize=10]
     * @param {boolean}  [opts.animate=true]   - Smooth fill transitions
     * @param {number}   [opts.animSpeed=5]    - Animation lerp speed
     * @param {function} [opts.colorFn]        - (pct) => [r,g,b] dynamic color
     */
    constructor(opts = {}) {
      super(opts);
      this.value       = opts.value ?? 1;
      this.maxValue    = opts.maxValue ?? 1;
      this.fillColor   = opts.fillColor ?? [0, 200, 0];
      this.bgColor     = opts.bgColor ?? [50, 50, 50];
      this.borderColor = opts.borderColor ?? [150, 150, 150];
      this.label       = opts.label ?? null;
      this.labelSize   = opts.labelSize ?? 10;
      this.animate     = opts.animate !== false;
      this.animSpeed   = opts.animSpeed ?? 5;
      this.colorFn     = opts.colorFn ?? null;
      this._displayValue = this.value; // smoothed display
    }

    /** Set value and optionally maxValue. */
    setValue(val, maxVal) {
      this.value = val;
      if (maxVal !== undefined) this.maxValue = maxVal;
    }

    update(dt) {
      // Smooth animation
      if (this.animate) {
        const target = Math.max(0, Math.min(1, this.value / this.maxValue));
        this._displayValue += (target - this._displayValue) * Math.min(1, this.animSpeed * dt);
      } else {
        this._displayValue = Math.max(0, Math.min(1, this.value / this.maxValue));
      }
      super.update(dt);
    }

    drawSelf() {
      const pct = this._displayValue;

      // Background
      fill(...this.bgColor);
      noStroke();
      rect(0, 0, this.w, this.h, 2);

      // Fill
      const fc = this.colorFn ? this.colorFn(pct) : this.fillColor;
      fill(...fc);
      noStroke();
      const fw = Math.max(0, this.w * pct);
      if (fw > 0) {
        rect(0, 0, fw, this.h, 2);
      }

      // Border
      noFill();
      stroke(...this.borderColor);
      strokeWeight(1);
      rect(0, 0, this.w, this.h, 2);

      // Label
      if (this.label) {
        fill(255);
        noStroke();
        textSize(this.labelSize);
        textAlign(CENTER, CENTER);
        textFont('Arial, sans-serif');
        text(this.label, this.w / 2, this.h / 2);
      }
    }
  }

  // ── UIImage ─────────────────────────────────────────────────────────────

  class UIImage extends UIWidget {
    /**
     * @param {object} opts - UIWidget opts plus:
     * @param {string|object} [opts.src]   - Image path or p5.Image
     * @param {number}        [opts.tint]  - Tint color array [r,g,b,a]
     */
    constructor(opts = {}) {
      super(opts);
      this.src     = opts.src ?? null;
      this.tintVal = opts.tint ?? null;
      this._img    = null;
      this._loaded = false;

      // Load image if string path provided
      if (typeof this.src === 'string' && typeof loadImage === 'function') {
        this._img = loadImage(this.src, () => { this._loaded = true; });
      } else if (this.src && typeof this.src === 'object') {
        this._img = this.src;
        this._loaded = true;
      }
    }

    drawSelf() {
      if (!this._loaded || !this._img) return;

      if (this.tintVal) {
        tint(...this.tintVal);
      } else {
        noTint();
      }
      image(this._img, 0, 0, this.w || this._img.width, this.h || this._img.height);
      noTint();
    }
  }

  // ── UISlotGrid ──────────────────────────────────────────────────────────

  class UISlotGrid extends UIWidget {
    /**
     * Grid of slots (for inventory, hotbar, etc.)
     * @param {object} opts - UIWidget opts plus:
     * @param {number} [opts.cols=5]
     * @param {number} [opts.rows=1]
     * @param {number} [opts.slotSize=32]
     * @param {number} [opts.slotGap=2]
     * @param {number[]} [opts.slotBg=[40,40,50]]
     * @param {number[]} [opts.slotBorder=[100,100,120]]
     * @param {number[]} [opts.selectedBorder=[255,220,50]]
     */
    constructor(opts = {}) {
      super(opts);
      this.cols           = opts.cols ?? 5;
      this.rows           = opts.rows ?? 1;
      this.slotSize       = opts.slotSize ?? 32;
      this.slotGap        = opts.slotGap ?? 2;
      this.slotBg         = opts.slotBg ?? [40, 40, 50];
      this.slotBorder     = opts.slotBorder ?? [100, 100, 120];
      this.selectedBorder = opts.selectedBorder ?? [255, 220, 50];
      this.selectedIndex  = -1;
      this.slots          = new Array(this.cols * this.rows).fill(null);

      // Auto-size
      this.w = this.cols * (this.slotSize + this.slotGap) - this.slotGap;
      this.h = this.rows * (this.slotSize + this.slotGap) - this.slotGap;
    }

    /** Set slot content (any object - will be drawn via drawSlotContent if overridden). */
    setSlot(index, content) {
      if (index >= 0 && index < this.slots.length) {
        this.slots[index] = content;
      }
    }

    /** Get slot at screen position, returns index or -1. */
    getSlotAt(sx, sy) {
      const pos = this.getScreenPos();
      const lx = sx - pos.x;
      const ly = sy - pos.y;
      if (lx < 0 || ly < 0 || lx > this.w || ly > this.h) return -1;

      const col = Math.floor(lx / (this.slotSize + this.slotGap));
      const row = Math.floor(ly / (this.slotSize + this.slotGap));
      if (col >= this.cols || row >= this.rows) return -1;

      // Check we're inside the slot, not the gap
      const localX = lx - col * (this.slotSize + this.slotGap);
      const localY = ly - row * (this.slotSize + this.slotGap);
      if (localX > this.slotSize || localY > this.slotSize) return -1;

      return row * this.cols + col;
    }

    drawSelf() {
      for (let row = 0; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const idx = row * this.cols + col;
          const sx = col * (this.slotSize + this.slotGap);
          const sy = row * (this.slotSize + this.slotGap);

          // Slot background
          fill(...this.slotBg);
          const isSelected = idx === this.selectedIndex;
          stroke(...(isSelected ? this.selectedBorder : this.slotBorder));
          strokeWeight(isSelected ? 2 : 1);
          rect(sx, sy, this.slotSize, this.slotSize, 2);

          // Draw slot content (override drawSlotContent for custom rendering)
          if (this.slots[idx]) {
            this.drawSlotContent(idx, sx, sy, this.slotSize);
          }
        }
      }
    }

    /** Override to render slot contents. Default draws text label. */
    drawSlotContent(index, sx, sy, size) {
      const content = this.slots[index];
      if (content && content.label) {
        fill(200);
        noStroke();
        textSize(8);
        textAlign(CENTER, CENTER);
        text(content.label, sx + size / 2, sy + size / 2);
      }
    }
  }

  // ── UINotification (Toast) ──────────────────────────────────────────────

  class UINotification extends UIWidget {
    /**
     * Timed toast message that fades in and out.
     * @param {object} opts - UIWidget opts plus:
     * @param {string}   opts.message
     * @param {number}   [opts.duration=3]     - Seconds before fading out
     * @param {number}   [opts.fadeIn=0.3]     - Fade in duration
     * @param {number}   [opts.fadeOut=0.5]    - Fade out duration
     * @param {number[]} [opts.bg=[20,20,30,220]]
     * @param {number[]} [opts.textColor=[255,255,255]]
     * @param {number}   [opts.fontSize=13]
     */
    constructor(opts = {}) {
      super(opts);
      this.message   = opts.message ?? '';
      this.duration  = opts.duration ?? 3;
      this.fadeIn     = opts.fadeIn ?? 0.3;
      this.fadeOut    = opts.fadeOut ?? 0.5;
      this.bg        = opts.bg ?? [20, 20, 30, 220];
      this.textColor = opts.textColor ?? [255, 255, 255];
      this.fontSize  = opts.fontSize ?? 13;
      this._elapsed  = 0;
      this._done     = false;
      this.w         = opts.w ?? 250;
      this.h         = opts.h ?? 30;
    }

    get isDone() { return this._done; }

    update(dt) {
      this._elapsed += dt;
      const total = this.fadeIn + this.duration + this.fadeOut;
      if (this._elapsed >= total) {
        this._done = true;
        this.alpha = 0;
      } else if (this._elapsed < this.fadeIn) {
        this.alpha = Math.floor(255 * (this._elapsed / this.fadeIn));
      } else if (this._elapsed > this.fadeIn + this.duration) {
        const fadeProgress = (this._elapsed - this.fadeIn - this.duration) / this.fadeOut;
        this.alpha = Math.floor(255 * (1 - fadeProgress));
      } else {
        this.alpha = 255;
      }
      super.update(dt);
    }

    drawSelf() {
      // Background pill
      fill(...this.bg);
      noStroke();
      rect(0, 0, this.w, this.h, this.h / 2);

      // Text
      fill(...this.textColor);
      noStroke();
      textSize(this.fontSize);
      textAlign(CENTER, CENTER);
      textFont('Arial, sans-serif');
      text(this.message, this.w / 2, this.h / 2);
    }
  }

  // ── UILayer (Root Container) ────────────────────────────────────────────

  class UILayer {
    constructor() {
      this._widgets     = new Map();   // name → UIWidget
      this._drawOrder   = [];          // names in draw order
      this._notifications = [];        // active toasts
      this._notifAnchor = 'bottom-center';
      this._notifOffsetY = -80;
      this.visible      = true;
    }

    /** Add a named widget to the layer. */
    add(name, widget) {
      this._widgets.set(name, widget);
      if (!this._drawOrder.includes(name)) {
        this._drawOrder.push(name);
      }
      return this;
    }

    /** Remove a named widget. */
    remove(name) {
      this._widgets.delete(name);
      this._drawOrder = this._drawOrder.filter(n => n !== name);
      return this;
    }

    /** Get a widget by name. */
    get(name) {
      return this._widgets.get(name);
    }

    /** Check if a widget exists. */
    has(name) {
      return this._widgets.has(name);
    }

    /** Show a toast notification. */
    notify(message, opts = {}) {
      const notif = new UINotification({
        message,
        anchor: this._notifAnchor,
        ...opts
      });
      this._notifications.push(notif);
      console.log(`[GameUI] Toast: "${message}"`);
      return notif;
    }

    /** Per-frame update. */
    update(dt) {
      for (const [, widget] of this._widgets) {
        widget.update(dt);
      }

      // Update + prune notifications
      for (let i = this._notifications.length - 1; i >= 0; i--) {
        this._notifications[i].update(dt);
        if (this._notifications[i].isDone) {
          this._notifications.splice(i, 1);
        }
      }
    }

    /** Render all widgets and notifications. */
    render() {
      if (!this.visible) return;

      push();
      // Reset to screen space (no camera transforms)
      resetMatrix();

      for (const name of this._drawOrder) {
        const widget = this._widgets.get(name);
        if (widget) widget.draw();
      }

      // Draw notifications (stacked from bottom)
      if (this._notifications.length > 0) {
        const spacing = 35;
        for (let i = 0; i < this._notifications.length; i++) {
          const n = this._notifications[i];
          // Stack upward from anchor
          n.x = -(n.w / 2);
          n.y = this._notifOffsetY - (this._notifications.length - 1 - i) * spacing;
          n.draw();
        }
      }

      pop();
    }

    /** Hit test - returns the first widget containing the point, or null. */
    hitTest(sx, sy) {
      // Reverse order: topmost widget first
      for (let i = this._drawOrder.length - 1; i >= 0; i--) {
        const widget = this._widgets.get(this._drawOrder[i]);
        if (widget && widget.visible && widget.containsPoint(sx, sy)) {
          return widget;
        }
      }
      return null;
    }
  }

  // ── Singleton Instance ──────────────────────────────────────────────────

  const gameUILayer = new UILayer();

  // ── Engine Registration ─────────────────────────────────────────────────

  if (typeof Engine !== 'undefined' && Engine.register) {
    Engine.register('gameUI', {
      update(dt) { gameUILayer.update(dt); },
      render()   { gameUILayer.render(); }
    });
  }

  // ── Global Exports ──────────────────────────────────────────────────────

  window.UIWidget       = UIWidget;
  window.UIPanel        = UIPanel;
  window.UIText         = UIText;
  window.UIBar          = UIBar;
  window.UIImage        = UIImage;
  window.UISlotGrid     = UISlotGrid;
  window.UINotification = UINotification;
  window.UILayer        = UILayer;
  window.gameUILayer    = gameUILayer;

  console.log('[GameUI] ✓ Widget system loaded - 7 widget types, UILayer ready');

})();
