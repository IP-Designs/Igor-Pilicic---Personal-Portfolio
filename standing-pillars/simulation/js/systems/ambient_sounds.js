/**
 * ambient_sounds.js - Ambient tile sound manager
 * ================================================
 * Scans placed tiles for soundAmbient definitions and manages looping
 * spatial audio instances that auto-play when entering play mode.
 *
 * Each unique ambient sound is played once as a looping instance.
 * Per frame, the gain of each instance is adjusted based on the
 * distance from the player to the nearest tile emitting that sound.
 *
 * Also provides editor-mode visualization: draws sound radius circles
 * around tiles that have soundAmbient or soundRadius set.
 */
(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────
  const DEFAULT_SOUND_RADIUS = 8;  // tiles - default audible radius

  // ── State ─────────────────────────────────────────────────────────────

  /**
   * Map of soundId → { instanceId, tiles: [{x, y, radius}...] }
   * Each entry tracks one looping audio instance and all tiles that emit it.
   */
  const _activeAmbients = new Map();

  let _isActive = false;  // true when in play mode and ambient sounds are running

  // ── Scanning ──────────────────────────────────────────────────────────

  /**
   * Scan all placed tiles, find those with soundAmbient, group by sound ID.
   * @returns {Map<string, Array<{x: number, y: number, radius: number}>>}
   */
  function _scanAmbientTiles() {
    const result = new Map();

    if (typeof tileSystem === 'undefined' || !tileSystem.placedTiles) return result;

    for (const key in tileSystem.placedTiles) {
      const tilesAtPos = tileSystem.placedTiles[key];
      const tiles = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];

      for (const tile of tiles) {
        // Look up tile definition to get soundAmbient
        const def = _getTileDef(tile.type);
        if (!def || !def.soundAmbient) continue;

        const soundId = def.soundAmbient;
        const radius  = def.soundRadius || DEFAULT_SOUND_RADIUS;
        const global  = !!def.soundGlobal;

        if (!result.has(soundId)) {
          result.set(soundId, []);
        }
        result.get(soundId).push({
          x: tile.x + 0.5,   // center of tile (meters)
          y: tile.y + 0.5,
          radius,
          global
        });
      }
    }

    return result;
  }

  // ── Play-mode lifecycle ───────────────────────────────────────────────

  /**
   * Start all ambient tile sounds (called when entering play mode).
   */
  function startAmbientSounds() {
    stopAmbientSounds(); // clean slate

    const audio = _getAudio();
    if (!audio) return;

    const soundMap = _scanAmbientTiles();
    if (soundMap.size === 0) return;

    for (const [soundId, tiles] of soundMap) {
      // Play as a looping sound without spatial (we'll manage volume ourselves)
      const instanceId = audio.play(soundId, { loop: true, volume: 0 });
      if (instanceId !== null) {
        _activeAmbients.set(soundId, { instanceId, tiles });
      }
    }

    _isActive = true;
    console.log(`[AmbientSounds] Started ${_activeAmbients.size} ambient sound(s)`);
  }

  /**
   * Stop all ambient tile sounds (called when entering edit mode).
   */
  function stopAmbientSounds() {
    if (_activeAmbients.size === 0) return;

    const audio = _getAudio();
    for (const [, entry] of _activeAmbients) {
      if (audio) {
        audio.stopInstance(entry.instanceId);
      }
    }

    _activeAmbients.clear();
    _isActive = false;
    console.log('[AmbientSounds] Stopped all ambient sounds');
  }

  /**
   * Per-frame update: adjust volume of each ambient instance based on
   * player distance to the nearest tile emitting that sound.
   * Should be called every frame from engine.js draw loop.
   */
  function updateAmbientSounds() {
    if (!_isActive || _activeAmbients.size === 0) return;

    const audio = _getAudio();
    if (!audio) return;

    // Get player position (listener)
    const listener = _getListenerPos();

    for (const [, entry] of _activeAmbients) {
      // Check if any tile for this sound is global
      let hasGlobal = false;
      let minDist = Infinity;
      let maxRadius = DEFAULT_SOUND_RADIUS;

      for (const t of entry.tiles) {
        if (t.global) { hasGlobal = true; break; }
        const dx = listener.x - t.x;
        const dy = listener.y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          maxRadius = t.radius;
        }
      }

      // Global sounds always play at full volume
      let vol = 0;
      if (hasGlobal) {
        vol = 1.0;
      } else if (minDist <= maxRadius) {
        const t = 1 - (minDist / maxRadius);
        vol = t * t;  // quadratic falloff
      }

      // Update gain node directly
      const inst = audio._getInstanceById
        ? audio._getInstanceById(entry.instanceId)
        : null;

      if (inst && inst.gainNode) {
        // Smooth transition to avoid clicks
        inst.gainNode.gain.value = vol;
      }
    }
  }

  // ── Editor visualization ──────────────────────────────────────────────

  /**
   * Draw sound radius circles around tiles with soundAmbient in editor mode.
   * Called from engine.js draw loop, inside camera transform push/pop.
   */
  function drawSoundRadii() {
    if (!window.editMode) return;
    if (typeof tileSystem === 'undefined' || !tileSystem.placedTiles) return;

    push();

    for (const key in tileSystem.placedTiles) {
      const tilesAtPos = tileSystem.placedTiles[key];
      const tiles = Array.isArray(tilesAtPos) ? tilesAtPos : [tilesAtPos];

      for (const tile of tiles) {
        const def = _getTileDef(tile.type);
        if (!def) continue;

        // Draw radius for tiles with soundAmbient
        if (def.soundAmbient) {
          const radius = def.soundRadius || DEFAULT_SOUND_RADIUS;
          const isGlobal = !!def.soundGlobal;
          const cx = (tile.x + 0.5) * GRID_SIZE;
          const cy = (tile.y + 0.5) * GRID_SIZE;

          if (isGlobal) {
            // Global: small diamond marker, no radius circle
            noStroke();
            fill(0, 220, 130, 40);
            ellipse(cx, cy, GRID_SIZE * 1.5, GRID_SIZE * 1.5);
            stroke(0, 220, 130, 120);
            strokeWeight(1.5);
            noFill();
            ellipse(cx, cy, GRID_SIZE * 1.5, GRID_SIZE * 1.5);

            // Globe icon
            noStroke();
            fill(0, 220, 130, 200);
            textAlign(CENTER, CENTER);
            textSize(14);
            text('🌐', cx, cy);
          } else {
            // Spatial: radius circle
            noStroke();
            fill(0, 180, 255, 20);
            ellipse(cx, cy, radius * GRID_SIZE * 2, radius * GRID_SIZE * 2);

            stroke(0, 180, 255, 80);
            strokeWeight(1.5);
            noFill();
            ellipse(cx, cy, radius * GRID_SIZE * 2, radius * GRID_SIZE * 2);

            // Speaker icon
            noStroke();
            fill(0, 180, 255, 180);
            textAlign(CENTER, CENTER);
            textSize(14);
            text('🔊', cx, cy);
          }
        }
      }
    }

    pop();
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  function _getTileDef(tileType) {
    if (typeof getTileDefinition === 'function') {
      return getTileDefinition(tileType);
    }
    // Fallback: manual nested lookup
    if (typeof tileSystem !== 'undefined' && tileSystem.definitions) {
      for (const catName in tileSystem.definitions.categories) {
        const cat = tileSystem.definitions.categories[catName];
        if (cat.tiles && cat.tiles[tileType]) {
          return cat.tiles[tileType];
        }
      }
    }
    return null;
  }

  function _getAudio() {
    if (typeof Engine !== 'undefined' && Engine.has('audio')) {
      return Engine.get('audio');
    }
    return null;
  }

  function _getListenerPos() {
    if (typeof player !== 'undefined') {
      return { x: player.x, y: player.y };
    }
    if (typeof camera !== 'undefined') {
      return { x: camera.x, y: camera.y };
    }
    return { x: 0, y: 0 };
  }

  // ── Expose globally ───────────────────────────────────────────────────

  window.startAmbientSounds  = startAmbientSounds;
  window.stopAmbientSounds   = stopAmbientSounds;
  window.updateAmbientSounds = updateAmbientSounds;
  window.drawSoundRadii      = drawSoundRadii;

})();
